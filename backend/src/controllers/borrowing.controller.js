const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");
const {
  toBigInt,
  safeJson,
  getScopedLabId,
  ensureKepalaLabAccess,
  generateCode,
} = require("../utils/apiHelpers");

const allowedKeperluan = ["praktikum", "penelitian", "tugas_akhir", "pengujian", "proyek", "lainnya"];
const allowedBorrowingStatus = ["menunggu", "disetujui", "ditolak", "dipinjam", "pengembalian_diajukan", "selesai", "terlambat"];

const borrowingInclude = {
  users_borrowings_dosen_idTousers: {
    select: { id: true, name: true, email: true, role: true },
  },
  users_borrowings_mahasiswa_idTousers: {
    select: { id: true, name: true, email: true, role: true, nomor_induk: true },
  },
  users_borrowings_disetujui_olehTousers: {
    select: { id: true, name: true, email: true, role: true },
  },
  laboratories: true,
  borrowing_details: {
    include: {
      equipments: true,
    },
  },
};

const buildBorrowingWhere = async (req, extra = {}) => {
  const where = { ...extra };

  if (req.user.role === "dosen") {
    where.dosen_id = BigInt(req.user.id);
    where.mahasiswa_id = null;
    return where;
  }

  if (req.user.role === "mahasiswa") {
    where.mahasiswa_id = BigInt(req.user.id);
    return where;
  }

  if (req.user.role === "kepala_lab") {
    const labId = await getScopedLabId(req);
    where.lab_id = labId || BigInt(0);
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { mahasiswa_id: null },
          {
            mahasiswa_id: { not: null },
            dosen_approval_status: "disetujui",
          },
        ],
      },
    ];
  }

  return where;
};

const getAllBorrowings = async (req, res) => {
  try {
    const { status, lab_id, start_date, end_date } = req.query;
    const extra = {};

    if (status) extra.status = status;
    if (lab_id && req.user.role === "admin_jurusan") extra.lab_id = BigInt(lab_id);
    if (start_date || end_date) {
      extra.tanggal_pinjam = {};
      if (start_date) extra.tanggal_pinjam.gte = new Date(start_date);
      if (end_date) extra.tanggal_pinjam.lte = new Date(end_date);
    }

    const borrowings = await prisma.borrowings.findMany({
      where: await buildBorrowingWhere(req, extra),
      include: borrowingInclude,
      orderBy: { created_at: "desc" },
    });

    return successResponse(res, "Data peminjaman berhasil diambil", safeJson(borrowings));
  } catch (error) {
    console.error("Get borrowings error:", error);
    return errorResponse(res, "Gagal mengambil data peminjaman", 500, error.message);
  }
};

const getBorrowingById = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID peminjaman tidak valid", 400);

    const borrowing = await prisma.borrowings.findFirst({
      where: await buildBorrowingWhere(req, { id }),
      include: borrowingInclude,
    });

    if (!borrowing) return errorResponse(res, "Peminjaman tidak ditemukan", 404);

    return successResponse(res, "Detail peminjaman berhasil diambil", safeJson(borrowing));
  } catch (error) {
    console.error("Get borrowing by id error:", error);
    return errorResponse(res, "Gagal mengambil detail peminjaman", 500, error.message);
  }
};

const createBorrowing = async (req, res) => {
  try {
    const {
      equipment_ids,
      tanggal_pinjam,
      tanggal_kembali_rencana,
      keperluan,
      nama_kegiatan,
      catatan_pengajuan,
      dosen_id,
    } = req.body;

    if (!Array.isArray(equipment_ids) || equipment_ids.length < 1) {
      return errorResponse(res, "equipment_ids wajib berupa array dan minimal berisi 1 alat", 400);
    }

    if (!tanggal_pinjam || !tanggal_kembali_rencana) {
      return errorResponse(res, "tanggal_pinjam dan tanggal_kembali_rencana wajib diisi", 400);
    }

    const tanggalPinjam = new Date(tanggal_pinjam);
    const tanggalKembaliRencana = new Date(tanggal_kembali_rencana);

    if (!Number.isFinite(tanggalPinjam.getTime()) || !Number.isFinite(tanggalKembaliRencana.getTime())) {
      return errorResponse(res, "Format tanggal tidak valid", 400);
    }

    if (tanggalKembaliRencana < tanggalPinjam) {
      return errorResponse(res, "tanggal_kembali_rencana tidak boleh lebih kecil dari tanggal_pinjam", 400);
    }

    if (!keperluan || !allowedKeperluan.includes(keperluan)) {
      return errorResponse(res, "Keperluan tidak valid", 400);
    }

    if (!nama_kegiatan) {
      return errorResponse(res, "nama_kegiatan wajib diisi", 400);
    }

    let responsibleDosenId = BigInt(req.user.id);
    let mahasiswaId = null;
    let dosenApprovalStatus = "not_required";

    if (req.user.role === "mahasiswa") {
      responsibleDosenId = toBigInt(dosen_id);
      mahasiswaId = BigInt(req.user.id);
      dosenApprovalStatus = "menunggu";

      if (!responsibleDosenId) {
        return errorResponse(res, "Mahasiswa wajib memilih dosen penanggung jawab", 400);
      }

      const responsibleDosen = await prisma.users.findUnique({
        where: { id: responsibleDosenId },
      });

      if (
        !responsibleDosen ||
        responsibleDosen.role !== "dosen" ||
        responsibleDosen.status !== "aktif"
      ) {
        return errorResponse(res, "Dosen penanggung jawab tidak valid atau tidak aktif", 400);
      }
    }

    const ids = equipment_ids.map(toBigInt);
    if (ids.some((id) => !id)) return errorResponse(res, "equipment_ids berisi ID tidak valid", 400);

    const equipments = await prisma.equipments.findMany({
      where: { id: { in: ids } },
    });

    if (equipments.length !== ids.length) {
      return errorResponse(res, "Satu atau lebih alat tidak ditemukan", 404);
    }

    const labIds = [...new Set(equipments.map((item) => item.lab_id.toString()))];
    if (labIds.length !== 1) {
      return errorResponse(res, "Semua alat dalam satu pengajuan harus berasal dari laboratorium yang sama", 400);
    }

    const unavailable = equipments.find(
      (item) => item.status !== "tersedia" || item.kondisi !== "baik"
    );

    if (unavailable) {
      return errorResponse(
        res,
        `Alat ${unavailable.nama_alat} tidak dapat dipinjam karena status/kondisinya tidak memenuhi syarat`,
        400
      );
    }

    const borrowing = await prisma.$transaction(async (tx) => {
      const created = await tx.borrowings.create({
        data: {
          kode_peminjaman: generateCode("PJM"),
          dosen_id: responsibleDosenId,
          mahasiswa_id: mahasiswaId,
          lab_id: equipments[0].lab_id,
          tanggal_pinjam: tanggalPinjam,
          tanggal_kembali_rencana: tanggalKembaliRencana,
          keperluan,
          nama_kegiatan,
          status: "menunggu",
          dosen_approval_status: dosenApprovalStatus,
          catatan_pengajuan: catatan_pengajuan || null,
          borrowing_details: {
            create: equipments.map((equipment) => ({
              equipment_id: equipment.id,
              kondisi_sebelum: equipment.kondisi,
            })),
          },
        },
      });

      return tx.borrowings.findUnique({
        where: { id: created.id },
        include: borrowingInclude,
      });
    });

    return successResponse(res, "Pengajuan peminjaman berhasil dibuat", safeJson(borrowing), 201);
  } catch (error) {
    console.error("Create borrowing error:", error);
    return errorResponse(res, "Gagal membuat pengajuan peminjaman", 500, error.message);
  }
};

const approveBorrowing = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID peminjaman tidak valid", 400);

    const existing = await prisma.borrowings.findUnique({
      where: { id },
      include: { borrowing_details: true },
    });

    if (!existing) return errorResponse(res, "Peminjaman tidak ditemukan", 404);
    if (existing.status !== "menunggu") {
      return errorResponse(res, "Peminjaman hanya bisa disetujui saat status menunggu", 400);
    }
    if (existing.mahasiswa_id && existing.dosen_approval_status !== "disetujui") {
      return errorResponse(res, "Pengajuan mahasiswa harus disetujui dosen terlebih dahulu", 400);
    }

    const access = await ensureKepalaLabAccess(req, existing.lab_id);
    if (!access.allowed) return errorResponse(res, access.message, 403);

    const borrowing = await prisma.$transaction(async (tx) => {
      const equipmentIds = existing.borrowing_details.map((detail) => detail.equipment_id);
      const equipments = await tx.equipments.findMany({ where: { id: { in: equipmentIds } } });

      const unavailable = equipments.find(
        (item) => item.status !== "tersedia" || item.kondisi !== "baik"
      );
      if (unavailable) {
        throw new Error(`Alat ${unavailable.nama_alat} sudah tidak tersedia untuk dipinjam`);
      }

      await tx.equipments.updateMany({
        where: { id: { in: equipmentIds } },
        data: { status: "dipinjam" },
      });

      await tx.borrowings.update({
        where: { id },
        data: {
          status: allowedBorrowingStatus.includes("dipinjam") ? "dipinjam" : "disetujui",
          disetujui_oleh: BigInt(req.user.id),
          tanggal_disetujui: new Date(),
          catatan_persetujuan: req.body.catatan_persetujuan || null,
        },
      });

      return tx.borrowings.findUnique({ where: { id }, include: borrowingInclude });
    });

    return successResponse(res, "Peminjaman berhasil disetujui", safeJson(borrowing));
  } catch (error) {
    console.error("Approve borrowing error:", error);
    return errorResponse(res, error.message || "Gagal menyetujui peminjaman", 500, error.message);
  }
};

const rejectBorrowing = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    const { alasan_penolakan } = req.body;

    if (!id) return errorResponse(res, "ID peminjaman tidak valid", 400);
    if (!alasan_penolakan) return errorResponse(res, "alasan_penolakan wajib diisi", 400);

    const existing = await prisma.borrowings.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, "Peminjaman tidak ditemukan", 404);
    if (existing.status !== "menunggu") {
      return errorResponse(res, "Peminjaman hanya bisa ditolak saat status menunggu", 400);
    }
    if (existing.mahasiswa_id && existing.dosen_approval_status !== "disetujui") {
      return errorResponse(res, "Pengajuan mahasiswa harus disetujui dosen terlebih dahulu", 400);
    }

    const access = await ensureKepalaLabAccess(req, existing.lab_id);
    if (!access.allowed) return errorResponse(res, access.message, 403);

    const borrowing = await prisma.$transaction(async (tx) => {
      await tx.borrowings.update({
        where: { id },
        data: {
          status: "ditolak",
          disetujui_oleh: BigInt(req.user.id),
          tanggal_disetujui: new Date(),
          alasan_penolakan,
        },
      });

      return tx.borrowings.findUnique({ where: { id }, include: borrowingInclude });
    });

    return successResponse(res, "Peminjaman berhasil ditolak", safeJson(borrowing));
  } catch (error) {
    console.error("Reject borrowing error:", error);
    return errorResponse(res, "Gagal menolak peminjaman", 500, error.message);
  }
};

const getDosenApprovals = async (req, res) => {
  try {
    const borrowings = await prisma.borrowings.findMany({
      where: {
        dosen_id: BigInt(req.user.id),
        mahasiswa_id: { not: null },
      },
      include: borrowingInclude,
      orderBy: { created_at: "desc" },
    });

    return successResponse(res, "Data approval dosen berhasil diambil", safeJson(borrowings));
  } catch (error) {
    console.error("Get dosen approvals error:", error);
    return errorResponse(res, "Gagal mengambil data approval dosen", 500, error.message);
  }
};

const approveDosen = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID peminjaman tidak valid", 400);

    const existing = await prisma.borrowings.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, "Peminjaman tidak ditemukan", 404);
    if (existing.dosen_id.toString() !== req.user.id.toString()) {
      return errorResponse(res, "Dosen hanya boleh menyetujui pengajuan yang ditujukan kepadanya", 403);
    }
    if (!existing.mahasiswa_id) {
      return errorResponse(res, "Approval dosen hanya berlaku untuk pengajuan mahasiswa", 400);
    }
    if (existing.dosen_approval_status !== "menunggu") {
      return errorResponse(res, "Pengajuan hanya bisa disetujui saat status approval dosen menunggu", 400);
    }

    const borrowing = await prisma.borrowings.update({
      where: { id },
      data: {
        dosen_approval_status: "disetujui",
        dosen_approved_at: new Date(),
        dosen_approval_note: req.body.dosen_approval_note || req.body.catatan || null,
      },
      include: borrowingInclude,
    });

    return successResponse(res, "Pengajuan mahasiswa berhasil disetujui dosen", safeJson(borrowing));
  } catch (error) {
    console.error("Approve dosen error:", error);
    return errorResponse(res, "Gagal menyetujui pengajuan mahasiswa", 500, error.message);
  }
};

const rejectDosen = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID peminjaman tidak valid", 400);

    const existing = await prisma.borrowings.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, "Peminjaman tidak ditemukan", 404);
    if (existing.dosen_id.toString() !== req.user.id.toString()) {
      return errorResponse(res, "Dosen hanya boleh menolak pengajuan yang ditujukan kepadanya", 403);
    }
    if (!existing.mahasiswa_id) {
      return errorResponse(res, "Approval dosen hanya berlaku untuk pengajuan mahasiswa", 400);
    }
    if (existing.dosen_approval_status !== "menunggu") {
      return errorResponse(res, "Pengajuan hanya bisa ditolak saat status approval dosen menunggu", 400);
    }

    const borrowing = await prisma.borrowings.update({
      where: { id },
      data: {
        dosen_approval_status: "ditolak",
        dosen_approved_at: new Date(),
        dosen_approval_note: req.body.dosen_approval_note || req.body.alasan || req.body.catatan || null,
        status: "ditolak",
      },
      include: borrowingInclude,
    });

    return successResponse(res, "Pengajuan mahasiswa berhasil ditolak dosen", safeJson(borrowing));
  } catch (error) {
    console.error("Reject dosen error:", error);
    return errorResponse(res, "Gagal menolak pengajuan mahasiswa", 500, error.message);
  }
};

module.exports = {
  getAllBorrowings,
  getBorrowingById,
  createBorrowing,
  approveBorrowing,
  rejectBorrowing,
  getDosenApprovals,
  approveDosen,
  rejectDosen,
};

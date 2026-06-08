const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");
const {
  toBigInt,
  safeJson,
  getScopedLabId,
  ensureKepalaLabAccess,
  generateCode,
} = require("../utils/apiHelpers");

const allowedReturnStatus = ["menunggu_verifikasi", "diterima", "diterima_dengan_catatan", "ditolak"];
const allowedKondisi = ["baik", "rusak_ringan", "rusak_berat", "hilang"];
const allowedStatusAkhir = ["tersedia", "dipinjam", "dalam_perawatan", "tidak_aktif"];

const returnInclude = {
  borrowings: {
    include: {
      laboratories: true,
      users_borrowings_dosen_idTousers: {
        select: { id: true, name: true, email: true, role: true },
      },
      users_borrowings_mahasiswa_idTousers: {
        select: { id: true, name: true, email: true, role: true, nomor_induk: true },
      },
      borrowing_details: {
        include: { equipments: true },
      },
    },
  },
  users_returns_diajukan_olehTousers: {
    select: { id: true, name: true, email: true, role: true },
  },
  users_returns_diverifikasi_olehTousers: {
    select: { id: true, name: true, email: true, role: true },
  },
  return_details: {
    include: { equipments: true },
  },
};

const buildReturnWhere = async (req, extra = {}) => {
  const where = { ...extra };

  if (req.user.role === "dosen") {
    where.diajukan_oleh = BigInt(req.user.id);
    return where;
  }

  if (req.user.role === "mahasiswa") {
    where.borrowings = { mahasiswa_id: BigInt(req.user.id) };
    return where;
  }

  if (req.user.role === "kepala_lab") {
    const labId = await getScopedLabId(req);
    where.borrowings = { lab_id: labId || BigInt(0) };
  }

  return where;
};

const validateFinalStatus = (kondisi, status) => {
  if (kondisi === "baik") return status === "tersedia";
  if (kondisi === "rusak_ringan") return status === "dalam_perawatan";
  if (kondisi === "rusak_berat") return ["dalam_perawatan", "tidak_aktif"].includes(status);
  if (kondisi === "hilang") return status === "tidak_aktif";
  return false;
};

const getAllReturns = async (req, res) => {
  try {
    const { status_pengembalian, start_date, end_date } = req.query;
    const extra = {};

    if (status_pengembalian) extra.status_pengembalian = status_pengembalian;
    if (start_date || end_date) {
      extra.tanggal_pengembalian = {};
      if (start_date) extra.tanggal_pengembalian.gte = new Date(start_date);
      if (end_date) extra.tanggal_pengembalian.lte = new Date(end_date);
    }

    const returns = await prisma.returns.findMany({
      where: await buildReturnWhere(req, extra),
      include: returnInclude,
      orderBy: { created_at: "desc" },
    });

    return successResponse(res, "Data pengembalian berhasil diambil", safeJson(returns));
  } catch (error) {
    console.error("Get returns error:", error);
    return errorResponse(res, "Gagal mengambil data pengembalian", 500, error.message);
  }
};

const getReturnById = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID pengembalian tidak valid", 400);

    const returnData = await prisma.returns.findFirst({
      where: await buildReturnWhere(req, { id }),
      include: returnInclude,
    });

    if (!returnData) return errorResponse(res, "Pengembalian tidak ditemukan", 404);

    return successResponse(res, "Detail pengembalian berhasil diambil", safeJson(returnData));
  } catch (error) {
    console.error("Get return by id error:", error);
    return errorResponse(res, "Gagal mengambil detail pengembalian", 500, error.message);
  }
};

const createReturn = async (req, res) => {
  try {
    const { borrowing_id, tanggal_pengembalian, catatan_pengembalian } = req.body;
    const borrowingId = toBigInt(borrowing_id);

    if (!borrowingId) return errorResponse(res, "borrowing_id wajib diisi dan valid", 400);
    if (!tanggal_pengembalian) return errorResponse(res, "tanggal_pengembalian wajib diisi", 400);

    const tanggalPengembalian = new Date(tanggal_pengembalian);
    if (!Number.isFinite(tanggalPengembalian.getTime())) {
      return errorResponse(res, "Format tanggal_pengembalian tidak valid", 400);
    }

    const borrowing = await prisma.borrowings.findUnique({
      where: { id: borrowingId },
      include: { returns: true },
    });

    if (!borrowing) return errorResponse(res, "Peminjaman tidak ditemukan", 404);
    if (
      req.user.role === "dosen" &&
      borrowing.dosen_id.toString() !== req.user.id.toString()
    ) {
      return errorResponse(res, "Dosen hanya dapat mengajukan pengembalian untuk peminjamannya sendiri", 403);
    }
    if (
      req.user.role === "mahasiswa" &&
      (!borrowing.mahasiswa_id || borrowing.mahasiswa_id.toString() !== req.user.id.toString())
    ) {
      return errorResponse(res, "Mahasiswa hanya dapat mengajukan pengembalian untuk peminjamannya sendiri", 403);
    }
    if (borrowing.status !== "dipinjam") {
      return errorResponse(res, "Pengembalian hanya bisa diajukan jika peminjaman sedang dipinjam", 400);
    }
    if (borrowing.returns) {
      return errorResponse(res, "Pengembalian untuk peminjaman ini sudah pernah diajukan", 409);
    }

    const returnData = await prisma.$transaction(async (tx) => {
      const created = await tx.returns.create({
        data: {
          kode_pengembalian: generateCode("KMB"),
          borrowing_id: borrowingId,
          diajukan_oleh: BigInt(req.user.id),
          tanggal_pengembalian: tanggalPengembalian,
          status_pengembalian: "menunggu_verifikasi",
          catatan_pengembalian: catatan_pengembalian || null,
        },
      });

      await tx.borrowings.update({
        where: { id: borrowingId },
        data: { status: "pengembalian_diajukan" },
      });

      return tx.returns.findUnique({ where: { id: created.id }, include: returnInclude });
    });

    return successResponse(res, "Pengajuan pengembalian berhasil dibuat", safeJson(returnData), 201);
  } catch (error) {
    console.error("Create return error:", error);
    return errorResponse(res, "Gagal membuat pengajuan pengembalian", 500, error.message);
  }
};

const verifyReturn = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    const { status_pengembalian, catatan_pengembalian, details } = req.body;

    if (!id) return errorResponse(res, "ID pengembalian tidak valid", 400);
    if (!["diterima", "diterima_dengan_catatan"].includes(status_pengembalian)) {
      return errorResponse(res, "status_pengembalian harus diterima atau diterima_dengan_catatan", 400);
    }
    if (!Array.isArray(details) || details.length < 1) {
      return errorResponse(res, "details wajib berupa array dan minimal berisi 1 alat", 400);
    }

    const returnData = await prisma.returns.findUnique({
      where: { id },
      include: {
        borrowings: { include: { borrowing_details: true } },
        return_details: true,
      },
    });

    if (!returnData) return errorResponse(res, "Pengembalian tidak ditemukan", 404);
    if (!allowedReturnStatus.includes(returnData.status_pengembalian)) {
      return errorResponse(res, "Status pengembalian tidak valid", 400);
    }
    if (returnData.status_pengembalian !== "menunggu_verifikasi") {
      return errorResponse(res, "Pengembalian sudah diverifikasi", 400);
    }

    const access = await ensureKepalaLabAccess(req, returnData.borrowings.lab_id);
    if (!access.allowed) return errorResponse(res, access.message, 403);

    const borrowedEquipmentIds = returnData.borrowings.borrowing_details.map((detail) =>
      detail.equipment_id.toString()
    );
    const detailEquipmentIds = details.map((detail) => String(detail.equipment_id));

    const missing = borrowedEquipmentIds.find((equipmentId) => !detailEquipmentIds.includes(equipmentId));
    if (missing) return errorResponse(res, "Semua alat yang dipinjam wajib ada di details", 400);

    for (const detail of details) {
      if (!borrowedEquipmentIds.includes(String(detail.equipment_id))) {
        return errorResponse(res, "details berisi alat yang bukan bagian dari peminjaman", 400);
      }
      if (!allowedKondisi.includes(detail.kondisi_sesudah)) {
        return errorResponse(res, "kondisi_sesudah tidak valid", 400);
      }
      if (!allowedStatusAkhir.includes(detail.status_akhir_alat)) {
        return errorResponse(res, "status_akhir_alat tidak valid", 400);
      }
      if (!validateFinalStatus(detail.kondisi_sesudah, detail.status_akhir_alat)) {
        return errorResponse(res, "Kombinasi kondisi_sesudah dan status_akhir_alat tidak valid", 400);
      }
    }

    const verified = await prisma.$transaction(async (tx) => {
      for (const detail of details) {
        const equipmentId = BigInt(detail.equipment_id);
        const borrowingDetail = returnData.borrowings.borrowing_details.find(
          (item) => item.equipment_id.toString() === equipmentId.toString()
        );

        await tx.return_details.upsert({
          where: {
            return_id_equipment_id: {
              return_id: id,
              equipment_id: equipmentId,
            },
          },
          update: {
            kondisi_sesudah: detail.kondisi_sesudah,
            status_akhir_alat: detail.status_akhir_alat,
            catatan: detail.catatan || null,
          },
          create: {
            return_id: id,
            equipment_id: equipmentId,
            kondisi_sebelum: borrowingDetail.kondisi_sebelum,
            kondisi_sesudah: detail.kondisi_sesudah,
            status_akhir_alat: detail.status_akhir_alat,
            catatan: detail.catatan || null,
          },
        });

        await tx.borrowing_details.update({
          where: {
            borrowing_id_equipment_id: {
              borrowing_id: returnData.borrowing_id,
              equipment_id: equipmentId,
            },
          },
          data: { kondisi_sesudah: detail.kondisi_sesudah },
        });

        await tx.equipments.update({
          where: { id: equipmentId },
          data: {
            kondisi: detail.kondisi_sesudah,
            status: detail.status_akhir_alat,
          },
        });
      }

      await tx.borrowings.update({
        where: { id: returnData.borrowing_id },
        data: {
          status: "selesai",
          tanggal_kembali_aktual: returnData.tanggal_pengembalian,
        },
      });

      await tx.returns.update({
        where: { id },
        data: {
          status_pengembalian,
          diverifikasi_oleh: BigInt(req.user.id),
          tanggal_verifikasi: new Date(),
          catatan_pengembalian: catatan_pengembalian || returnData.catatan_pengembalian,
        },
      });

      return tx.returns.findUnique({ where: { id }, include: returnInclude });
    });

    return successResponse(res, "Pengembalian berhasil diverifikasi", safeJson(verified));
  } catch (error) {
    console.error("Verify return error:", error);
    return errorResponse(res, "Gagal memverifikasi pengembalian", 500, error.message);
  }
};

module.exports = {
  getAllReturns,
  getReturnById,
  createReturn,
  verifyReturn,
};

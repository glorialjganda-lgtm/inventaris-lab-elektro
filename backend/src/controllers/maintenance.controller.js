const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");
const {
  toBigInt,
  safeJson,
  getScopedLabId,
  ensureKepalaLabAccess,
  generateCode,
} = require("../utils/apiHelpers");

const allowedJenis = ["rutin", "perbaikan", "kalibrasi", "penggantian_komponen", "pemeriksaan_keamanan"];
const allowedStatus = ["proses", "selesai", "gagal"];
const allowedEquipmentStatus = ["tersedia", "dalam_perawatan", "tidak_aktif"];

const includeMaintenance = {
  equipments: true,
  laboratories: true,
  users: {
    select: { id: true, name: true, email: true, role: true },
  },
};

const buildMaintenanceWhere = async (req, extra = {}) => {
  const where = { ...extra };

  if (req.user.role === "kepala_lab") {
    const labId = await getScopedLabId(req);
    where.lab_id = labId || BigInt(0);
  }

  return where;
};

const getAllMaintenances = async (req, res) => {
  try {
    const { lab_id, equipment_id, status, start_date, end_date } = req.query;
    const extra = {};

    if (lab_id && req.user.role === "admin_jurusan") extra.lab_id = BigInt(lab_id);
    if (equipment_id) extra.equipment_id = BigInt(equipment_id);
    if (status) extra.status = status;
    if (start_date || end_date) {
      extra.tanggal_perawatan = {};
      if (start_date) extra.tanggal_perawatan.gte = new Date(start_date);
      if (end_date) extra.tanggal_perawatan.lte = new Date(end_date);
    }

    const maintenances = await prisma.maintenances.findMany({
      where: await buildMaintenanceWhere(req, extra),
      include: includeMaintenance,
      orderBy: { created_at: "desc" },
    });

    return successResponse(res, "Data perawatan berhasil diambil", safeJson(maintenances));
  } catch (error) {
    console.error("Get maintenances error:", error);
    return errorResponse(res, "Gagal mengambil data perawatan", 500, error.message);
  }
};

const getMaintenanceById = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID perawatan tidak valid", 400);

    const maintenance = await prisma.maintenances.findFirst({
      where: await buildMaintenanceWhere(req, { id }),
      include: includeMaintenance,
    });

    if (!maintenance) return errorResponse(res, "Perawatan tidak ditemukan", 404);

    return successResponse(res, "Detail perawatan berhasil diambil", safeJson(maintenance));
  } catch (error) {
    console.error("Get maintenance by id error:", error);
    return errorResponse(res, "Gagal mengambil detail perawatan", 500, error.message);
  }
};

const createMaintenance = async (req, res) => {
  try {
    const {
      equipment_id,
      tanggal_perawatan,
      jenis_perawatan,
      deskripsi_masalah,
      tindakan,
      biaya = 0,
      status = "proses",
      catatan,
    } = req.body;

    const equipmentId = toBigInt(equipment_id);
    if (!equipmentId) return errorResponse(res, "equipment_id wajib diisi dan valid", 400);
    if (!tanggal_perawatan) return errorResponse(res, "tanggal_perawatan wajib diisi", 400);
    if (!allowedJenis.includes(jenis_perawatan)) return errorResponse(res, "jenis_perawatan tidak valid", 400);
    if (!allowedStatus.includes(status)) return errorResponse(res, "status perawatan tidak valid", 400);

    const equipment = await prisma.equipments.findUnique({ where: { id: equipmentId } });
    if (!equipment) return errorResponse(res, "Peralatan tidak ditemukan", 404);

    const access = await ensureKepalaLabAccess(req, equipment.lab_id);
    if (!access.allowed) return errorResponse(res, access.message, 403);

    const maintenance = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenances.create({
        data: {
          kode_perawatan: generateCode("PRW"),
          equipment_id: equipment.id,
          lab_id: equipment.lab_id,
          tanggal_perawatan: new Date(tanggal_perawatan),
          jenis_perawatan,
          deskripsi_masalah: deskripsi_masalah || null,
          tindakan: tindakan || null,
          penanggung_jawab_id: BigInt(req.user.id),
          biaya: Number(biaya),
          status,
          catatan: catatan || null,
        },
      });

      if (status === "proses") {
        await tx.equipments.update({
          where: { id: equipment.id },
          data: { status: "dalam_perawatan" },
        });
      }

      return tx.maintenances.findUnique({ where: { id: created.id }, include: includeMaintenance });
    });

    return successResponse(res, "Perawatan berhasil ditambahkan", safeJson(maintenance), 201);
  } catch (error) {
    console.error("Create maintenance error:", error);
    return errorResponse(res, "Gagal menambahkan perawatan", 500, error.message);
  }
};

const updateMaintenance = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID perawatan tidak valid", 400);

    const existing = await prisma.maintenances.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, "Perawatan tidak ditemukan", 404);

    const access = await ensureKepalaLabAccess(req, existing.lab_id);
    if (!access.allowed) return errorResponse(res, access.message, 403);

    const {
      tanggal_perawatan,
      jenis_perawatan,
      deskripsi_masalah,
      tindakan,
      biaya,
      status,
      status_akhir_alat,
      catatan,
    } = req.body;

    if (jenis_perawatan && !allowedJenis.includes(jenis_perawatan)) {
      return errorResponse(res, "jenis_perawatan tidak valid", 400);
    }
    if (status && !allowedStatus.includes(status)) {
      return errorResponse(res, "status perawatan tidak valid", 400);
    }
    if (status_akhir_alat && !allowedEquipmentStatus.includes(status_akhir_alat)) {
      return errorResponse(res, "status_akhir_alat tidak valid", 400);
    }
    if (status === "selesai" && !status_akhir_alat) {
      return errorResponse(res, "status_akhir_alat wajib diisi saat perawatan selesai", 400);
    }

    const maintenance = await prisma.$transaction(async (tx) => {
      await tx.maintenances.update({
        where: { id },
        data: {
          tanggal_perawatan: tanggal_perawatan ? new Date(tanggal_perawatan) : existing.tanggal_perawatan,
          jenis_perawatan: jenis_perawatan ?? existing.jenis_perawatan,
          deskripsi_masalah: deskripsi_masalah ?? existing.deskripsi_masalah,
          tindakan: tindakan ?? existing.tindakan,
          biaya: biaya !== undefined ? Number(biaya) : existing.biaya,
          status: status ?? existing.status,
          catatan: catatan ?? existing.catatan,
        },
      });

      if (status === "proses") {
        await tx.equipments.update({
          where: { id: existing.equipment_id },
          data: { status: "dalam_perawatan" },
        });
      }

      if (status === "selesai") {
        await tx.equipments.update({
          where: { id: existing.equipment_id },
          data: { status: status_akhir_alat },
        });
      }

      return tx.maintenances.findUnique({ where: { id }, include: includeMaintenance });
    });

    return successResponse(res, "Perawatan berhasil diperbarui", safeJson(maintenance));
  } catch (error) {
    console.error("Update maintenance error:", error);
    return errorResponse(res, "Gagal memperbarui perawatan", 500, error.message);
  }
};

const deleteMaintenance = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID perawatan tidak valid", 400);

    const existing = await prisma.maintenances.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, "Perawatan tidak ditemukan", 404);

    const access = await ensureKepalaLabAccess(req, existing.lab_id);
    if (!access.allowed) return errorResponse(res, access.message, 403);

    const maintenance = await prisma.maintenances.update({
      where: { id },
      data: { status: "gagal" },
      include: includeMaintenance,
    });

    return successResponse(res, "Perawatan berhasil ditandai gagal tanpa menghapus histori", safeJson(maintenance));
  } catch (error) {
    console.error("Delete maintenance error:", error);
    return errorResponse(res, "Gagal mengubah status perawatan", 500, error.message);
  }
};

module.exports = {
  getAllMaintenances,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
};

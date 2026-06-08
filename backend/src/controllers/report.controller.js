const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");
const { safeJson, getScopedLabId } = require("../utils/apiHelpers");

const addDateFilter = (where, field, startDate, endDate) => {
  if (startDate || endDate) {
    where[field] = {};
    if (startDate) where[field].gte = new Date(startDate);
    if (endDate) where[field].lte = new Date(endDate);
  }
};

const applyLabScope = async (req, where) => {
  if (req.user.role === "kepala_lab") {
    const labId = await getScopedLabId(req);
    where.lab_id = labId || BigInt(0);
    return;
  }

  if (req.query.lab_id) {
    where.lab_id = BigInt(req.query.lab_id);
  }
};

const countBy = (items, field, value) => items.filter((item) => item[field] === value).length;

const inventoryReport = async (req, res) => {
  try {
    const { category_id, kondisi, status } = req.query;
    const where = {};

    await applyLabScope(req, where);
    if (category_id) where.category_id = BigInt(category_id);
    if (kondisi) where.kondisi = kondisi;
    if (status) where.status = status;

    const data = await prisma.equipments.findMany({
      where,
      include: { laboratories: true, categories: true },
      orderBy: { created_at: "desc" },
    });

    return successResponse(res, "Laporan inventaris berhasil diambil", safeJson({
      summary: {
        total_alat: data.length,
        total_tersedia: countBy(data, "status", "tersedia"),
        total_dipinjam: countBy(data, "status", "dipinjam"),
        total_dalam_perawatan: countBy(data, "status", "dalam_perawatan"),
        total_tidak_aktif: countBy(data, "status", "tidak_aktif"),
        total_rusak_ringan: countBy(data, "kondisi", "rusak_ringan"),
        total_rusak_berat: countBy(data, "kondisi", "rusak_berat"),
      },
      data,
    }));
  } catch (error) {
    console.error("Inventory report error:", error);
    return errorResponse(res, "Gagal mengambil laporan inventaris", 500, error.message);
  }
};

const borrowingReport = async (req, res) => {
  try {
    const { status, start_date, end_date } = req.query;
    const where = {};

    await applyLabScope(req, where);
    if (status) where.status = status;
    addDateFilter(where, "tanggal_pinjam", start_date, end_date);

    const data = await prisma.borrowings.findMany({
      where,
      include: {
        laboratories: true,
        users_borrowings_dosen_idTousers: {
          select: { id: true, name: true, email: true, role: true },
        },
        borrowing_details: { include: { equipments: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return successResponse(res, "Laporan peminjaman berhasil diambil", safeJson({
      summary: {
        total_peminjaman: data.length,
        menunggu: countBy(data, "status", "menunggu"),
        dipinjam: countBy(data, "status", "dipinjam"),
        selesai: countBy(data, "status", "selesai"),
        ditolak: countBy(data, "status", "ditolak"),
      },
      data,
    }));
  } catch (error) {
    console.error("Borrowing report error:", error);
    return errorResponse(res, "Gagal mengambil laporan peminjaman", 500, error.message);
  }
};

const maintenanceReport = async (req, res) => {
  try {
    const { status, start_date, end_date } = req.query;
    const where = {};

    await applyLabScope(req, where);
    if (status) where.status = status;
    addDateFilter(where, "tanggal_perawatan", start_date, end_date);

    const data = await prisma.maintenances.findMany({
      where,
      include: { equipments: true, laboratories: true },
      orderBy: { created_at: "desc" },
    });

    return successResponse(res, "Laporan perawatan berhasil diambil", safeJson({
      summary: {
        total_perawatan: data.length,
        proses: countBy(data, "status", "proses"),
        selesai: countBy(data, "status", "selesai"),
        gagal: countBy(data, "status", "gagal"),
      },
      data,
    }));
  } catch (error) {
    console.error("Maintenance report error:", error);
    return errorResponse(res, "Gagal mengambil laporan perawatan", 500, error.message);
  }
};

const stockReport = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};

    await applyLabScope(req, where);
    if (status) where.status = status;

    const data = await prisma.consumable_stocks.findMany({
      where,
      include: { laboratories: true },
      orderBy: { created_at: "desc" },
    });

    return successResponse(res, "Laporan stok berhasil diambil", safeJson({
      summary: {
        total_item: data.length,
        aman: countBy(data, "status", "aman"),
        menipis: countBy(data, "status", "menipis"),
        habis: countBy(data, "status", "habis"),
      },
      data,
    }));
  } catch (error) {
    console.error("Stock report error:", error);
    return errorResponse(res, "Gagal mengambil laporan stok", 500, error.message);
  }
};

module.exports = {
  inventoryReport,
  borrowingReport,
  maintenanceReport,
  stockReport,
};

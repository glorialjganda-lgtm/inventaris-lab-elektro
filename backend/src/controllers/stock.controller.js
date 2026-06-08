const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");
const {
  toBigInt,
  safeJson,
  getScopedLabId,
  ensureKepalaLabAccess,
  calculateStockStatus,
} = require("../utils/apiHelpers");

const allowedTransactionTypes = ["masuk", "keluar", "penyesuaian"];

const stockInclude = {
  laboratories: true,
};

const transactionInclude = {
  users: {
    select: { id: true, name: true, email: true, role: true },
  },
};

const buildStockWhere = async (req, extra = {}) => {
  const where = { ...extra };

  if (req.user.role === "kepala_lab") {
    const labId = await getScopedLabId(req);
    where.lab_id = labId || BigInt(0);
  }

  return where;
};

const getAllStocks = async (req, res) => {
  try {
    const { lab_id, status, search } = req.query;
    const extra = {};

    if (lab_id && req.user.role === "admin_jurusan") extra.lab_id = BigInt(lab_id);
    if (status) extra.status = status;
    if (search) {
      extra.OR = [
        { nama_barang: { contains: search } },
        { kategori: { contains: search } },
        { lokasi: { contains: search } },
      ];
    }

    const stocks = await prisma.consumable_stocks.findMany({
      where: await buildStockWhere(req, extra),
      include: stockInclude,
      orderBy: { created_at: "desc" },
    });

    return successResponse(res, "Data stok berhasil diambil", safeJson(stocks));
  } catch (error) {
    console.error("Get stocks error:", error);
    return errorResponse(res, "Gagal mengambil data stok", 500, error.message);
  }
};

const getStockById = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID stok tidak valid", 400);

    const stock = await prisma.consumable_stocks.findFirst({
      where: await buildStockWhere(req, { id }),
      include: stockInclude,
    });

    if (!stock) return errorResponse(res, "Stok tidak ditemukan", 404);

    return successResponse(res, "Detail stok berhasil diambil", safeJson(stock));
  } catch (error) {
    console.error("Get stock by id error:", error);
    return errorResponse(res, "Gagal mengambil detail stok", 500, error.message);
  }
};

const createStock = async (req, res) => {
  try {
    const {
      lab_id,
      nama_barang,
      kategori,
      jumlah = 0,
      satuan = "pcs",
      stok_minimum = 0,
      lokasi,
    } = req.body;

    const labId = toBigInt(lab_id);
    if (!labId) return errorResponse(res, "lab_id wajib diisi dan valid", 400);
    if (!nama_barang) return errorResponse(res, "nama_barang wajib diisi", 400);
    if (Number(jumlah) < 0) return errorResponse(res, "jumlah tidak boleh negatif", 400);
    if (Number(stok_minimum) < 0) return errorResponse(res, "stok_minimum tidak boleh negatif", 400);

    const access = await ensureKepalaLabAccess(req, labId);
    if (!access.allowed) return errorResponse(res, access.message, 403);

    const lab = await prisma.laboratories.findUnique({ where: { id: labId } });
    if (!lab) return errorResponse(res, "Laboratorium tidak ditemukan", 404);

    const stock = await prisma.consumable_stocks.create({
      data: {
        lab_id: labId,
        nama_barang,
        kategori: kategori || null,
        jumlah: Number(jumlah),
        satuan,
        stok_minimum: Number(stok_minimum),
        lokasi: lokasi || null,
        status: calculateStockStatus(jumlah, stok_minimum),
      },
      include: stockInclude,
    });

    return successResponse(res, "Stok berhasil ditambahkan", safeJson(stock), 201);
  } catch (error) {
    console.error("Create stock error:", error);
    return errorResponse(res, "Gagal menambahkan stok", 500, error.message);
  }
};

const updateStock = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID stok tidak valid", 400);

    const existing = await prisma.consumable_stocks.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, "Stok tidak ditemukan", 404);

    const access = await ensureKepalaLabAccess(req, existing.lab_id);
    if (!access.allowed) return errorResponse(res, access.message, 403);

    const { nama_barang, kategori, jumlah, satuan, stok_minimum, lokasi } = req.body;
    const finalJumlah = jumlah !== undefined ? Number(jumlah) : existing.jumlah;
    const finalMinimum = stok_minimum !== undefined ? Number(stok_minimum) : existing.stok_minimum;

    if (finalJumlah < 0) return errorResponse(res, "jumlah tidak boleh negatif", 400);
    if (finalMinimum < 0) return errorResponse(res, "stok_minimum tidak boleh negatif", 400);

    const stock = await prisma.consumable_stocks.update({
      where: { id },
      data: {
        nama_barang: nama_barang ?? existing.nama_barang,
        kategori: kategori ?? existing.kategori,
        jumlah: finalJumlah,
        satuan: satuan ?? existing.satuan,
        stok_minimum: finalMinimum,
        lokasi: lokasi ?? existing.lokasi,
        status: calculateStockStatus(finalJumlah, finalMinimum),
      },
      include: stockInclude,
    });

    return successResponse(res, "Stok berhasil diperbarui", safeJson(stock));
  } catch (error) {
    console.error("Update stock error:", error);
    return errorResponse(res, "Gagal memperbarui stok", 500, error.message);
  }
};

const deleteStock = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID stok tidak valid", 400);

    const existing = await prisma.consumable_stocks.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, "Stok tidak ditemukan", 404);

    const access = await ensureKepalaLabAccess(req, existing.lab_id);
    if (!access.allowed) return errorResponse(res, access.message, 403);

    const stock = await prisma.consumable_stocks.update({
      where: { id },
      data: {
        jumlah: 0,
        status: "habis",
      },
      include: stockInclude,
    });

    return successResponse(res, "Stok berhasil dikosongkan tanpa menghapus histori transaksi", safeJson(stock));
  } catch (error) {
    console.error("Delete stock error:", error);
    return errorResponse(res, "Gagal menghapus stok", 500, error.message);
  }
};

const getStockTransactions = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    if (!id) return errorResponse(res, "ID stok tidak valid", 400);

    const stock = await prisma.consumable_stocks.findFirst({
      where: await buildStockWhere(req, { id }),
    });
    if (!stock) return errorResponse(res, "Stok tidak ditemukan", 404);

    const transactions = await prisma.stock_transactions.findMany({
      where: { stock_id: id },
      include: transactionInclude,
      orderBy: { tanggal: "desc" },
    });

    return successResponse(res, "Transaksi stok berhasil diambil", safeJson(transactions));
  } catch (error) {
    console.error("Get stock transactions error:", error);
    return errorResponse(res, "Gagal mengambil transaksi stok", 500, error.message);
  }
};

const createStockTransaction = async (req, res) => {
  try {
    const id = toBigInt(req.params.id);
    const { tipe_transaksi, jumlah, keterangan } = req.body;

    if (!id) return errorResponse(res, "ID stok tidak valid", 400);
    if (!allowedTransactionTypes.includes(tipe_transaksi)) {
      return errorResponse(res, "tipe_transaksi tidak valid", 400);
    }
    if (jumlah === undefined || Number(jumlah) < 0) {
      return errorResponse(res, "jumlah wajib diisi dan tidak boleh negatif", 400);
    }

    const existing = await prisma.consumable_stocks.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, "Stok tidak ditemukan", 404);

    const access = await ensureKepalaLabAccess(req, existing.lab_id);
    if (!access.allowed) return errorResponse(res, access.message, 403);

    const total = Number(jumlah);
    let stokSesudah = existing.jumlah;

    if (tipe_transaksi === "masuk") stokSesudah = existing.jumlah + total;
    if (tipe_transaksi === "keluar") stokSesudah = existing.jumlah - total;
    if (tipe_transaksi === "penyesuaian") stokSesudah = total;

    if (stokSesudah < 0) {
      return errorResponse(res, "Transaksi keluar tidak boleh membuat stok negatif", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedStock = await tx.consumable_stocks.update({
        where: { id },
        data: {
          jumlah: stokSesudah,
          status: calculateStockStatus(stokSesudah, existing.stok_minimum),
        },
      });

      const transaction = await tx.stock_transactions.create({
        data: {
          stock_id: id,
          tipe_transaksi,
          jumlah: total,
          stok_sebelum: existing.jumlah,
          stok_sesudah: stokSesudah,
          keterangan: keterangan || null,
          user_id: BigInt(req.user.id),
        },
        include: transactionInclude,
      });

      return { stock: updatedStock, transaction };
    });

    return successResponse(res, "Transaksi stok berhasil dibuat", safeJson(result), 201);
  } catch (error) {
    console.error("Create stock transaction error:", error);
    return errorResponse(res, "Gagal membuat transaksi stok", 500, error.message);
  }
};

module.exports = {
  getAllStocks,
  getStockById,
  createStock,
  updateStock,
  deleteStock,
  getStockTransactions,
  createStockTransaction,
};

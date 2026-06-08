const prisma = require("../config/prisma");

const toBigInt = (value) => {
  try {
    if (value === undefined || value === null || value === "") return null;
    return BigInt(value);
  } catch (error) {
    return null;
  }
};

const safeJson = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(safeJson);
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if (typeof value.toNumber === "function") return value.toNumber();

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, safeJson(item)])
    );
  }
  return value;
};

const getCurrentUser = (req) => {
  const id = toBigInt(req.user && req.user.id);
  if (!id) return null;
  return prisma.users.findUnique({ where: { id } });
};

const getScopedLabId = async (req) => {
  if (req.user.role === "admin_jurusan") return null;

  const user = await getCurrentUser(req);
  return user && user.lab_id ? user.lab_id : null;
};

const ensureKepalaLabAccess = async (req, labId) => {
  if (req.user.role === "admin_jurusan") return { allowed: true };

  if (req.user.role !== "kepala_lab") {
    return { allowed: false, message: "Anda tidak memiliki akses ke fitur ini" };
  }

  const user = await getCurrentUser(req);

  if (!user || !user.lab_id) {
    return {
      allowed: false,
      message: "Akun kepala lab belum terhubung dengan laboratorium",
    };
  }

  if (user.lab_id.toString() !== labId.toString()) {
    return {
      allowed: false,
      message: "Kepala Lab hanya boleh mengelola data laboratoriumnya sendiri",
    };
  }

  return { allowed: true };
};

const generateCode = (prefix) => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${date}-${Date.now().toString().slice(-6)}${random}`;
};

const calculateStockStatus = (jumlah, stokMinimum) => {
  const total = Number(jumlah);
  const minimum = Number(stokMinimum);

  if (total <= 0) return "habis";
  if (total <= minimum) return "menipis";
  return "aman";
};

module.exports = {
  toBigInt,
  safeJson,
  getCurrentUser,
  getScopedLabId,
  ensureKepalaLabAccess,
  generateCode,
  calculateStockStatus,
};

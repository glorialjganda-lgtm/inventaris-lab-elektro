const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

const sanitizeUser = (user) => {
  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    nomor_induk: user.nomor_induk,
    no_hp: user.no_hp,
    lab_id: user.lab_id ? user.lab_id.toString() : null,
    status: user.status,
  };
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, "Email dan password wajib diisi", 400);
    }

    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse(res, "Email atau password salah", 401);
    }

    if (user.status !== "aktif") {
      return errorResponse(res, "Akun tidak aktif. Silakan hubungi Admin Jurusan.", 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return errorResponse(res, "Email atau password salah", 401);
    }

    const token = jwt.sign(
      {
        id: user.id.toString(),
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    return successResponse(res, "Login berhasil", {
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, "Terjadi kesalahan saat login", 500, error.message);
  }
};

const me = async (req, res) => {
  try {
    const userId = BigInt(req.user.id);

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    let laboratory = null;

    if (user.lab_id) {
      const lab = await prisma.laboratories.findUnique({
        where: { id: user.lab_id },
      });

      if (lab) {
        laboratory = {
          id: lab.id.toString(),
          kode_lab: lab.kode_lab,
          nama_lab: lab.nama_lab,
          lokasi: lab.lokasi,
          status: lab.status,
        };
      }
    }

    return successResponse(res, "Data user berhasil diambil", {
      user: sanitizeUser(user),
      laboratory,
    });
  } catch (error) {
    console.error("Me error:", error);
    return errorResponse(res, "Terjadi kesalahan saat mengambil data user", 500, error.message);
  }
};

module.exports = {
  login,
  me,
};
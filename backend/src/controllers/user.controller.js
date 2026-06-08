const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

const allowedRoles = ["admin_jurusan", "kepala_lab", "dosen", "mahasiswa"];
const allowedStatus = ["aktif", "nonaktif"];

const formatUser = (user, laboratory = null) => {
  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    nomor_induk: user.nomor_induk,
    no_hp: user.no_hp,
    lab_id: user.lab_id ? user.lab_id.toString() : null,
    status: user.status,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
    laboratory,
  };
};

const getAllUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { nomor_induk: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const users = await prisma.users.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
    });

    const labIds = users
      .filter((user) => user.lab_id)
      .map((user) => user.lab_id);

    const laboratories = labIds.length
      ? await prisma.laboratories.findMany({
          where: {
            id: {
              in: labIds,
            },
          },
        })
      : [];

    const labMap = new Map(
      laboratories.map((lab) => [
        lab.id.toString(),
        {
          id: lab.id.toString(),
          kode_lab: lab.kode_lab,
          nama_lab: lab.nama_lab,
          lokasi: lab.lokasi,
          status: lab.status,
        },
      ])
    );

    const data = users.map((user) =>
      formatUser(user, user.lab_id ? labMap.get(user.lab_id.toString()) || null : null)
    );

    return successResponse(res, "Data user berhasil diambil", data);
  } catch (error) {
    console.error("Get all users error:", error);
    return errorResponse(res, "Gagal mengambil data user", 500, error.message);
  }
};

const getActiveDosenOptions = async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      where: {
        role: "dosen",
        status: "aktif",
      },
      select: {
        id: true,
        name: true,
        email: true,
        nomor_induk: true,
        role: true,
        status: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const data = users.map((user) => ({
      ...user,
      id: user.id.toString(),
    }));

    return successResponse(res, "Data dosen aktif berhasil diambil", data);
  } catch (error) {
    console.error("Get active dosen options error:", error);
    return errorResponse(res, "Gagal mengambil daftar dosen aktif", 500, error.message);
  }
};

const getUserById = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const user = await prisma.users.findUnique({
      where: { id },
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

    return successResponse(res, "Detail user berhasil diambil", formatUser(user, laboratory));
  } catch (error) {
    console.error("Get user by id error:", error);
    return errorResponse(res, "Gagal mengambil detail user", 500, error.message);
  }
};

const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      nomor_induk,
      no_hp,
      lab_id,
      status = "aktif",
    } = req.body;

    if (!name || !email || !password || !role) {
      return errorResponse(res, "Nama, email, password, dan role wajib diisi", 400);
    }

    if (!allowedRoles.includes(role)) {
      return errorResponse(res, "Role tidak valid", 400);
    }

    if (!allowedStatus.includes(status)) {
      return errorResponse(res, "Status tidak valid", 400);
    }

    if (role === "kepala_lab" && !lab_id) {
      return errorResponse(res, "Kepala Lab wajib memiliki lab_id", 400);
    }

    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse(res, "Email sudah digunakan", 409);
    }

    let parsedLabId = null;

    if (lab_id) {
      parsedLabId = BigInt(lab_id);

      const lab = await prisma.laboratories.findUnique({
        where: { id: parsedLabId },
      });

      if (!lab) {
        return errorResponse(res, "Laboratorium tidak ditemukan", 404);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.users.create({
      data: {
        name,
        email,
        password_hash: hashedPassword,
        role,
        nomor_induk: nomor_induk || null,
        no_hp: no_hp || null,
        lab_id: parsedLabId,
        status,
      },
    });

    if (role === "kepala_lab" && parsedLabId) {
      await prisma.laboratories.update({
        where: { id: parsedLabId },
        data: {
          kepala_lab_id: user.id,
        },
      });
    }

    return successResponse(res, "User berhasil ditambahkan", formatUser(user), 201);
  } catch (error) {
    console.error("Create user error:", error);
    return errorResponse(res, "Gagal menambahkan user", 500, error.message);
  }
};

const updateUser = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const {
      name,
      email,
      password,
      role,
      nomor_induk,
      no_hp,
      lab_id,
      status,
    } = req.body;

    const existingUser = await prisma.users.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    if (role && !allowedRoles.includes(role)) {
      return errorResponse(res, "Role tidak valid", 400);
    }

    if (status && !allowedStatus.includes(status)) {
      return errorResponse(res, "Status tidak valid", 400);
    }

    if (email && email !== existingUser.email) {
      const emailUsed = await prisma.users.findUnique({
        where: { email },
      });

      if (emailUsed) {
        return errorResponse(res, "Email sudah digunakan oleh user lain", 409);
      }
    }

    const finalRole = role || existingUser.role;

    let parsedLabId = existingUser.lab_id;

    if (lab_id !== undefined) {
      parsedLabId = lab_id ? BigInt(lab_id) : null;

      if (parsedLabId) {
        const lab = await prisma.laboratories.findUnique({
          where: { id: parsedLabId },
        });

        if (!lab) {
          return errorResponse(res, "Laboratorium tidak ditemukan", 404);
        }
      }
    }

    if (finalRole === "kepala_lab" && !parsedLabId) {
      return errorResponse(res, "Kepala Lab wajib memiliki lab_id", 400);
    }

    const data = {
      name: name ?? existingUser.name,
      email: email ?? existingUser.email,
      role: finalRole,
      nomor_induk: nomor_induk ?? existingUser.nomor_induk,
      no_hp: no_hp ?? existingUser.no_hp,
      lab_id: finalRole === "kepala_lab" ? parsedLabId : null,
      status: status ?? existingUser.status,
    };

    if (password) {
      data.password_hash = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.users.update({
      where: { id },
      data,
    });

    if (existingUser.lab_id && existingUser.role === "kepala_lab") {
      await prisma.laboratories.updateMany({
        where: {
          kepala_lab_id: existingUser.id,
        },
        data: {
          kepala_lab_id: null,
        },
      });
    }

    if (updatedUser.role === "kepala_lab" && updatedUser.lab_id) {
      await prisma.laboratories.update({
        where: { id: updatedUser.lab_id },
        data: {
          kepala_lab_id: updatedUser.id,
        },
      });
    }

    return successResponse(res, "User berhasil diperbarui", formatUser(updatedUser));
  } catch (error) {
    console.error("Update user error:", error);
    return errorResponse(res, "Gagal memperbarui user", 500, error.message);
  }
};

const deleteUser = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const existingUser = await prisma.users.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    if (req.user.id === id.toString()) {
      return errorResponse(res, "Anda tidak dapat menonaktifkan akun sendiri", 400);
    }

    const updatedUser = await prisma.users.update({
      where: { id },
      data: {
        status: "nonaktif",
      },
    });

    return successResponse(res, "User berhasil dinonaktifkan", formatUser(updatedUser));
  } catch (error) {
    console.error("Delete user error:", error);
    return errorResponse(res, "Gagal menonaktifkan user", 500, error.message);
  }
};

module.exports = {
  getAllUsers,
  getActiveDosenOptions,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};

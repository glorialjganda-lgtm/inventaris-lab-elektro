const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

const allowedStatus = ["aktif", "nonaktif"];

const formatCategory = (category, totalEquipments = 0) => {
  return {
    id: category.id.toString(),
    kode_kategori: category.kode_kategori,
    nama_kategori: category.nama_kategori,
    deskripsi: category.deskripsi,
    total_equipments: totalEquipments,
    status: category.status,
    created_at: category.created_at,
    updated_at: category.updated_at,
  };
};

const getAllCategories = async (req, res) => {
  try {
    const { search, status } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { kode_kategori: { contains: search } },
        { nama_kategori: { contains: search } },
        { deskripsi: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const categories = await prisma.categories.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
    });

    const data = await Promise.all(
      categories.map(async (category) => {
        const totalEquipments = await prisma.equipments.count({
          where: {
            category_id: category.id,
          },
        });

        return formatCategory(category, totalEquipments);
      })
    );

    return successResponse(res, "Data kategori berhasil diambil", data);
  } catch (error) {
    console.error("Get all categories error:", error);
    return errorResponse(res, "Gagal mengambil data kategori", 500, error.message);
  }
};

const getCategoryById = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const category = await prisma.categories.findUnique({
      where: { id },
    });

    if (!category) {
      return errorResponse(res, "Kategori tidak ditemukan", 404);
    }

    const totalEquipments = await prisma.equipments.count({
      where: {
        category_id: category.id,
      },
    });

    return successResponse(
      res,
      "Detail kategori berhasil diambil",
      formatCategory(category, totalEquipments)
    );
  } catch (error) {
    console.error("Get category by id error:", error);
    return errorResponse(res, "Gagal mengambil detail kategori", 500, error.message);
  }
};

const createCategory = async (req, res) => {
  try {
    const {
      kode_kategori,
      nama_kategori,
      deskripsi,
      status = "aktif",
    } = req.body;

    if (!kode_kategori || !nama_kategori) {
      return errorResponse(res, "Kode kategori dan nama kategori wajib diisi", 400);
    }

    if (!allowedStatus.includes(status)) {
      return errorResponse(res, "Status tidak valid", 400);
    }

    const existingCode = await prisma.categories.findUnique({
      where: {
        kode_kategori,
      },
    });

    if (existingCode) {
      return errorResponse(res, "Kode kategori sudah digunakan", 409);
    }

    const category = await prisma.categories.create({
      data: {
        kode_kategori,
        nama_kategori,
        deskripsi: deskripsi || null,
        status,
      },
    });

    return successResponse(
      res,
      "Kategori berhasil ditambahkan",
      formatCategory(category),
      201
    );
  } catch (error) {
    console.error("Create category error:", error);
    return errorResponse(res, "Gagal menambahkan kategori", 500, error.message);
  }
};

const updateCategory = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const {
      kode_kategori,
      nama_kategori,
      deskripsi,
      status,
    } = req.body;

    const existingCategory = await prisma.categories.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return errorResponse(res, "Kategori tidak ditemukan", 404);
    }

    if (status && !allowedStatus.includes(status)) {
      return errorResponse(res, "Status tidak valid", 400);
    }

    if (kode_kategori && kode_kategori !== existingCategory.kode_kategori) {
      const codeUsed = await prisma.categories.findUnique({
        where: {
          kode_kategori,
        },
      });

      if (codeUsed) {
        return errorResponse(res, "Kode kategori sudah digunakan oleh kategori lain", 409);
      }
    }

    const updatedCategory = await prisma.categories.update({
      where: { id },
      data: {
        kode_kategori: kode_kategori ?? existingCategory.kode_kategori,
        nama_kategori: nama_kategori ?? existingCategory.nama_kategori,
        deskripsi: deskripsi ?? existingCategory.deskripsi,
        status: status ?? existingCategory.status,
      },
    });

    const totalEquipments = await prisma.equipments.count({
      where: {
        category_id: updatedCategory.id,
      },
    });

    return successResponse(
      res,
      "Kategori berhasil diperbarui",
      formatCategory(updatedCategory, totalEquipments)
    );
  } catch (error) {
    console.error("Update category error:", error);
    return errorResponse(res, "Gagal memperbarui kategori", 500, error.message);
  }
};

const deleteCategory = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const existingCategory = await prisma.categories.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return errorResponse(res, "Kategori tidak ditemukan", 404);
    }

    const totalEquipments = await prisma.equipments.count({
      where: {
        category_id: id,
      },
    });

    if (totalEquipments > 0) {
      return errorResponse(
        res,
        "Kategori tidak dapat dinonaktifkan karena masih digunakan oleh data peralatan",
        400
      );
    }

    const updatedCategory = await prisma.categories.update({
      where: { id },
      data: {
        status: "nonaktif",
      },
    });

    return successResponse(
      res,
      "Kategori berhasil dinonaktifkan",
      formatCategory(updatedCategory, totalEquipments)
    );
  } catch (error) {
    console.error("Delete category error:", error);
    return errorResponse(res, "Gagal menonaktifkan kategori", 500, error.message);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

const allowedKondisi = ["baik", "rusak_ringan", "rusak_berat", "hilang"];
const allowedStatus = ["tersedia", "dipinjam", "dalam_perawatan", "tidak_aktif"];

const formatLaboratory = (lab) => {
  if (!lab) return null;

  return {
    id: lab.id.toString(),
    kode_lab: lab.kode_lab,
    nama_lab: lab.nama_lab,
    lokasi: lab.lokasi,
    status: lab.status,
  };
};

const formatCategory = (category) => {
  if (!category) return null;

  return {
    id: category.id.toString(),
    kode_kategori: category.kode_kategori,
    nama_kategori: category.nama_kategori,
    status: category.status,
  };
};

const formatEquipment = (equipment, laboratory = null, category = null) => {
  return {
    id: equipment.id.toString(),
    kode_inventaris: equipment.kode_inventaris,
    kode_alat: equipment.kode_inventaris,
    nama_alat: equipment.nama_alat,
    lab_id: equipment.lab_id ? equipment.lab_id.toString() : null,
    category_id: equipment.category_id ? equipment.category_id.toString() : null,
    laboratory: formatLaboratory(laboratory),
    category: formatCategory(category),
    merek: equipment.merek,
    merk: equipment.merek,
    model: equipment.model,
    nomor_seri: equipment.nomor_seri,
    serial_number: equipment.nomor_seri,
    tahun_pengadaan: equipment.tahun_pengadaan,
    sumber_dana: equipment.sumber_dana,
    harga: equipment.harga ? Number(equipment.harga) : 0,
    kondisi: equipment.kondisi,
    status_ketersediaan: equipment.status,
    lokasi_detail: equipment.lokasi_detail,
    penanggung_jawab_id: equipment.penanggung_jawab_id
      ? equipment.penanggung_jawab_id.toString()
      : null,
    foto: equipment.foto,
    foto_url: equipment.foto,
    dokumen: equipment.dokumen,
    keterangan: equipment.keterangan,
    deskripsi: equipment.keterangan,
    status: equipment.status,
    created_at: equipment.created_at,
    updated_at: equipment.updated_at,
  };
};

const getCurrentUser = async (req) => {
  return prisma.users.findUnique({
    where: {
      id: BigInt(req.user.id),
    },
  });
};

const ensureCanManageLab = async (req, labId) => {
  if (req.user.role === "admin_jurusan") {
    return { allowed: true };
  }

  if (req.user.role !== "kepala_lab") {
    return {
      allowed: false,
      message: "Anda tidak memiliki akses untuk mengelola data peralatan",
    };
  }

  const currentUser = await getCurrentUser(req);

  if (!currentUser || !currentUser.lab_id) {
    return {
      allowed: false,
      message: "Akun kepala lab belum terhubung dengan laboratorium",
    };
  }

  if (currentUser.lab_id.toString() !== labId.toString()) {
    return {
      allowed: false,
      message: "Kepala Lab hanya boleh mengelola peralatan pada laboratoriumnya sendiri",
    };
  }

  return { allowed: true };
};

const getAllEquipments = async (req, res) => {
  try {
    const {
      search,
      lab_id,
      category_id,
      kondisi,
      status,
    } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { kode_inventaris: { contains: search } },
        { nama_alat: { contains: search } },
        { merek: { contains: search } },
        { model: { contains: search } },
        { nomor_seri: { contains: search } },
        { lokasi_detail: { contains: search } },
      ];
    }

    if (lab_id) {
      where.lab_id = BigInt(lab_id);
    }

    if (category_id) {
      where.category_id = BigInt(category_id);
    }

    if (kondisi) {
      where.kondisi = kondisi;
    }

    if (status) {
      where.status = status;
    }

    const equipments = await prisma.equipments.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
    });

    const labIds = [
      ...new Set(
        equipments
          .filter((item) => item.lab_id)
          .map((item) => item.lab_id.toString())
      ),
    ];

    const categoryIds = [
      ...new Set(
        equipments
          .filter((item) => item.category_id)
          .map((item) => item.category_id.toString())
      ),
    ];

    const laboratories = labIds.length
      ? await prisma.laboratories.findMany({
          where: {
            id: {
              in: labIds.map((id) => BigInt(id)),
            },
          },
        })
      : [];

    const categories = categoryIds.length
      ? await prisma.categories.findMany({
          where: {
            id: {
              in: categoryIds.map((id) => BigInt(id)),
            },
          },
        })
      : [];

    const labMap = new Map(laboratories.map((lab) => [lab.id.toString(), lab]));
    const categoryMap = new Map(categories.map((category) => [category.id.toString(), category]));

    const data = equipments.map((equipment) => {
      const laboratory = equipment.lab_id
        ? labMap.get(equipment.lab_id.toString())
        : null;

      const category = equipment.category_id
        ? categoryMap.get(equipment.category_id.toString())
        : null;

      return formatEquipment(equipment, laboratory, category);
    });

    return successResponse(res, "Data peralatan berhasil diambil", data);
  } catch (error) {
    console.error("Get all equipments error:", error);
    return errorResponse(res, "Gagal mengambil data peralatan", 500, error.message);
  }
};

const getEquipmentById = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const equipment = await prisma.equipments.findUnique({
      where: { id },
    });

    if (!equipment) {
      return errorResponse(res, "Peralatan tidak ditemukan", 404);
    }

    const laboratory = equipment.lab_id
      ? await prisma.laboratories.findUnique({
          where: { id: equipment.lab_id },
        })
      : null;

    const category = equipment.category_id
      ? await prisma.categories.findUnique({
          where: { id: equipment.category_id },
        })
      : null;

    return successResponse(
      res,
      "Detail peralatan berhasil diambil",
      formatEquipment(equipment, laboratory, category)
    );
  } catch (error) {
    console.error("Get equipment by id error:", error);
    return errorResponse(res, "Gagal mengambil detail peralatan", 500, error.message);
  }
};

const createEquipment = async (req, res) => {
  try {
    const {
      kode_inventaris,
      kode_alat,
      nama_alat,
      lab_id,
      category_id,
      merek,
      merk,
      model,
      nomor_seri,
      serial_number,
      tahun_pengadaan,
      sumber_dana,
      harga = 0,
      kondisi = "baik",
      lokasi_detail,
      foto,
      foto_url,
      dokumen,
      keterangan,
      deskripsi,
      penanggung_jawab_id,
      status = "tersedia",
    } = req.body;

    const finalKodeInventaris = kode_inventaris || kode_alat;
    const finalMerek = merek ?? merk;
    const finalNomorSeri = nomor_seri ?? serial_number;
    const finalFoto = foto ?? foto_url;
    const finalKeterangan = keterangan ?? deskripsi;

    if (!finalKodeInventaris || !nama_alat || !lab_id || !category_id) {
      return errorResponse(
        res,
        "Kode inventaris, nama alat, lab_id, dan category_id wajib diisi",
        400
      );
    }

    if (!allowedKondisi.includes(kondisi)) {
      return errorResponse(res, "Kondisi alat tidak valid", 400);
    }

    if (!allowedStatus.includes(status)) {
      return errorResponse(res, "Status data tidak valid", 400);
    }

    const parsedLabId = BigInt(lab_id);
    const parsedCategoryId = BigInt(category_id);

    const access = await ensureCanManageLab(req, parsedLabId);

    if (!access.allowed) {
      return errorResponse(res, access.message, 403);
    }

    const lab = await prisma.laboratories.findUnique({
      where: { id: parsedLabId },
    });

    if (!lab) {
      return errorResponse(res, "Laboratorium tidak ditemukan", 404);
    }

    const category = await prisma.categories.findUnique({
      where: { id: parsedCategoryId },
    });

    if (!category) {
      return errorResponse(res, "Kategori tidak ditemukan", 404);
    }

    const existingCode = await prisma.equipments.findUnique({
      where: { kode_inventaris: finalKodeInventaris },
    });

    if (existingCode) {
      return errorResponse(res, "Kode alat sudah digunakan", 409);
    }

    if (finalNomorSeri) {
      const existingSerial = await prisma.equipments.findFirst({
        where: { nomor_seri: finalNomorSeri },
      });

      if (existingSerial) {
        return errorResponse(res, "Serial number sudah digunakan", 409);
      }
    }

    const equipment = await prisma.equipments.create({
      data: {
        kode_inventaris: finalKodeInventaris,
        nama_alat,
        lab_id: parsedLabId,
        category_id: parsedCategoryId,
        merek: finalMerek || null,
        model: model || null,
        nomor_seri: finalNomorSeri || null,
        tahun_pengadaan: tahun_pengadaan ? Number(tahun_pengadaan) : null,
        sumber_dana: sumber_dana || null,
        harga: Number(harga),
        kondisi,
        status,
        lokasi_detail: lokasi_detail || null,
        penanggung_jawab_id: penanggung_jawab_id ? BigInt(penanggung_jawab_id) : null,
        foto: finalFoto || null,
        dokumen: dokumen || null,
        keterangan: finalKeterangan || null,
      },
    });

    return successResponse(
      res,
      "Peralatan berhasil ditambahkan",
      formatEquipment(equipment, lab, category),
      201
    );
  } catch (error) {
    console.error("Create equipment error:", error);
    return errorResponse(res, "Gagal menambahkan peralatan", 500, error.message);
  }
};

const updateEquipment = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const existingEquipment = await prisma.equipments.findUnique({
      where: { id },
    });

    if (!existingEquipment) {
      return errorResponse(res, "Peralatan tidak ditemukan", 404);
    }

    const currentAccess = await ensureCanManageLab(req, existingEquipment.lab_id);

    if (!currentAccess.allowed) {
      return errorResponse(res, currentAccess.message, 403);
    }

    const {
      kode_inventaris,
      kode_alat,
      nama_alat,
      lab_id,
      category_id,
      merek,
      merk,
      model,
      nomor_seri,
      serial_number,
      tahun_pengadaan,
      sumber_dana,
      harga,
      kondisi,
      lokasi_detail,
      foto,
      foto_url,
      dokumen,
      keterangan,
      deskripsi,
      penanggung_jawab_id,
      status,
    } = req.body;

    const finalKodeInventaris = kode_inventaris ?? kode_alat;
    const finalMerek = merek ?? merk;
    const finalNomorSeri = nomor_seri ?? serial_number;
    const finalFoto = foto ?? foto_url;
    const finalKeterangan = keterangan ?? deskripsi;

    if (kondisi && !allowedKondisi.includes(kondisi)) {
      return errorResponse(res, "Kondisi alat tidak valid", 400);
    }

    if (status && !allowedStatus.includes(status)) {
      return errorResponse(res, "Status data tidak valid", 400);
    }

    if (finalKodeInventaris && finalKodeInventaris !== existingEquipment.kode_inventaris) {
      const codeUsed = await prisma.equipments.findUnique({
        where: { kode_inventaris: finalKodeInventaris },
      });

      if (codeUsed) {
        return errorResponse(res, "Kode alat sudah digunakan oleh alat lain", 409);
      }
    }

    if (finalNomorSeri && finalNomorSeri !== existingEquipment.nomor_seri) {
      const serialUsed = await prisma.equipments.findFirst({
        where: { nomor_seri: finalNomorSeri },
      });

      if (serialUsed) {
        return errorResponse(res, "Serial number sudah digunakan oleh alat lain", 409);
      }
    }

    let parsedLabId = existingEquipment.lab_id;

    if (lab_id !== undefined) {
      parsedLabId = BigInt(lab_id);

      const newLabAccess = await ensureCanManageLab(req, parsedLabId);

      if (!newLabAccess.allowed) {
        return errorResponse(res, newLabAccess.message, 403);
      }

      const lab = await prisma.laboratories.findUnique({
        where: { id: parsedLabId },
      });

      if (!lab) {
        return errorResponse(res, "Laboratorium tidak ditemukan", 404);
      }
    }

    let parsedCategoryId = existingEquipment.category_id;

    if (category_id !== undefined) {
      parsedCategoryId = BigInt(category_id);

      const category = await prisma.categories.findUnique({
        where: { id: parsedCategoryId },
      });

      if (!category) {
        return errorResponse(res, "Kategori tidak ditemukan", 404);
      }
    }

    const finalKondisi = kondisi ?? existingEquipment.kondisi;

    const updatedEquipment = await prisma.equipments.update({
      where: { id },
      data: {
        kode_inventaris: finalKodeInventaris ?? existingEquipment.kode_inventaris,
        nama_alat: nama_alat ?? existingEquipment.nama_alat,
        lab_id: parsedLabId,
        category_id: parsedCategoryId,
        merek: finalMerek ?? existingEquipment.merek,
        model: model ?? existingEquipment.model,
        nomor_seri: finalNomorSeri ?? existingEquipment.nomor_seri,
        tahun_pengadaan:
          tahun_pengadaan !== undefined
            ? Number(tahun_pengadaan)
            : existingEquipment.tahun_pengadaan,
        sumber_dana: sumber_dana ?? existingEquipment.sumber_dana,
        harga: harga !== undefined ? Number(harga) : existingEquipment.harga,
        kondisi: finalKondisi,
        lokasi_detail: lokasi_detail ?? existingEquipment.lokasi_detail,
        penanggung_jawab_id:
          penanggung_jawab_id !== undefined
            ? penanggung_jawab_id
              ? BigInt(penanggung_jawab_id)
              : null
            : existingEquipment.penanggung_jawab_id,
        foto: finalFoto ?? existingEquipment.foto,
        dokumen: dokumen ?? existingEquipment.dokumen,
        keterangan: finalKeterangan ?? existingEquipment.keterangan,
        status: status ?? existingEquipment.status,
      },
    });

    const laboratory = await prisma.laboratories.findUnique({
      where: { id: updatedEquipment.lab_id },
    });

    const category = await prisma.categories.findUnique({
      where: { id: updatedEquipment.category_id },
    });

    return successResponse(
      res,
      "Peralatan berhasil diperbarui",
      formatEquipment(updatedEquipment, laboratory, category)
    );
  } catch (error) {
    console.error("Update equipment error:", error);
    return errorResponse(res, "Gagal memperbarui peralatan", 500, error.message);
  }
};

const deleteEquipment = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const existingEquipment = await prisma.equipments.findUnique({
      where: { id },
    });

    if (!existingEquipment) {
      return errorResponse(res, "Peralatan tidak ditemukan", 404);
    }

    const access = await ensureCanManageLab(req, existingEquipment.lab_id);

    if (!access.allowed) {
      return errorResponse(res, access.message, 403);
    }

    const updatedEquipment = await prisma.equipments.update({
      where: { id },
      data: {
        status: "tidak_aktif",
      },
    });

    return successResponse(
      res,
      "Peralatan berhasil dinonaktifkan",
      formatEquipment(updatedEquipment)
    );
  } catch (error) {
    console.error("Delete equipment error:", error);
    return errorResponse(res, "Gagal menonaktifkan peralatan", 500, error.message);
  }
};

module.exports = {
  getAllEquipments,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
};

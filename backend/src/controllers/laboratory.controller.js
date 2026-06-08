const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

const allowedStatus = ["aktif", "nonaktif"];

const formatHead = (user) => {
  if (!user) return null;

  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    nomor_induk: user.nomor_induk,
    no_hp: user.no_hp,
    status: user.status,
  };
};

const formatLaboratory = (lab, kepalaLab = null, totalEquipments = 0) => {
  const kepalaLabNama = lab.kepala_lab_nama || kepalaLab?.name || null;

  return {
    id: lab.id.toString(),
    kode_lab: lab.kode_lab,
    nama_lab: lab.nama_lab,
    lokasi: lab.lokasi,
    deskripsi: lab.deskripsi,
    kepala_lab_id: lab.kepala_lab_id ? lab.kepala_lab_id.toString() : null,
    kepala_lab_nama: kepalaLabNama,
    nama_kepala_lab: kepalaLabNama,
    kepala_lab_name: kepalaLabNama,
    kepala_lab: formatHead(kepalaLab),
    total_equipments: totalEquipments,
    status: lab.status,
    created_at: lab.created_at,
    updated_at: lab.updated_at,
  };
};

const getAllLaboratories = async (req, res) => {
  try {
    const { search, status } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { kode_lab: { contains: search } },
        { nama_lab: { contains: search } },
        { lokasi: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const laboratories = await prisma.laboratories.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
    });

    const kepalaLabIds = laboratories
      .filter((lab) => lab.kepala_lab_id)
      .map((lab) => lab.kepala_lab_id);

    const kepalaLabs = kepalaLabIds.length
      ? await prisma.users.findMany({
          where: {
            id: {
              in: kepalaLabIds,
            },
          },
        })
      : [];

    const kepalaLabMap = new Map(
      kepalaLabs.map((user) => [user.id.toString(), user])
    );

    const data = await Promise.all(
      laboratories.map(async (lab) => {
        const totalEquipments = await prisma.equipments.count({
          where: {
            lab_id: lab.id,
          },
        });

        const kepalaLab = lab.kepala_lab_id
          ? kepalaLabMap.get(lab.kepala_lab_id.toString())
          : null;

        return formatLaboratory(lab, kepalaLab, totalEquipments);
      })
    );

    return successResponse(res, "Data laboratorium berhasil diambil", data);
  } catch (error) {
    console.error("Get all laboratories error:", error);
    return errorResponse(res, "Gagal mengambil data laboratorium", 500, error.message);
  }
};

const getLaboratoryById = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const lab = await prisma.laboratories.findUnique({
      where: { id },
    });

    if (!lab) {
      return errorResponse(res, "Laboratorium tidak ditemukan", 404);
    }

    let kepalaLab = null;

    if (lab.kepala_lab_id) {
      kepalaLab = await prisma.users.findUnique({
        where: {
          id: lab.kepala_lab_id,
        },
      });
    }

    const totalEquipments = await prisma.equipments.count({
      where: {
        lab_id: lab.id,
      },
    });

    return successResponse(
      res,
      "Detail laboratorium berhasil diambil",
      formatLaboratory(lab, kepalaLab, totalEquipments)
    );
  } catch (error) {
    console.error("Get laboratory by id error:", error);
    return errorResponse(res, "Gagal mengambil detail laboratorium", 500, error.message);
  }
};

const createLaboratory = async (req, res) => {
  try {
    const {
      kode_lab,
      nama_lab,
      lokasi,
      deskripsi,
      kepala_lab_nama,
      nama_kepala_lab,
      kepala_lab_name,
      head_name,
      kepala_lab_id,
      status = "aktif",
    } = req.body;

    if (!kode_lab || !nama_lab) {
      return errorResponse(res, "Kode lab dan nama lab wajib diisi", 400);
    }

    if (!allowedStatus.includes(status)) {
      return errorResponse(res, "Status tidak valid", 400);
    }

    const existingCode = await prisma.laboratories.findUnique({
      where: {
        kode_lab,
      },
    });

    if (existingCode) {
      return errorResponse(res, "Kode lab sudah digunakan", 409);
    }

    let parsedKepalaLabId = null;

    if (kepala_lab_id) {
      parsedKepalaLabId = BigInt(kepala_lab_id);

      const kepalaLab = await prisma.users.findUnique({
        where: {
          id: parsedKepalaLabId,
        },
      });

      if (!kepalaLab) {
        return errorResponse(res, "Kepala lab tidak ditemukan", 404);
      }

      if (kepalaLab.role !== "kepala_lab") {
        return errorResponse(res, "User yang dipilih bukan role kepala_lab", 400);
      }

      if (kepalaLab.status !== "aktif") {
        return errorResponse(res, "Kepala lab yang dipilih tidak aktif", 400);
      }

      const alreadyAssigned = await prisma.laboratories.findFirst({
        where: {
          kepala_lab_id: parsedKepalaLabId,
        },
      });

      if (alreadyAssigned) {
        return errorResponse(res, "Kepala lab tersebut sudah menangani laboratorium lain", 409);
      }
    }

    const lab = await prisma.$transaction(async (tx) => {
      const newLab = await tx.laboratories.create({
        data: {
          kode_lab,
          nama_lab,
          lokasi: lokasi || null,
          deskripsi: deskripsi || null,
          kepala_lab_nama: kepala_lab_nama || nama_kepala_lab || kepala_lab_name || head_name || null,
          kepala_lab_id: parsedKepalaLabId,
          status,
        },
      });

      if (parsedKepalaLabId) {
        await tx.users.update({
          where: {
            id: parsedKepalaLabId,
          },
          data: {
            lab_id: newLab.id,
          },
        });
      }

      return newLab;
    });

    return successResponse(
      res,
      "Laboratorium berhasil ditambahkan",
      formatLaboratory(lab),
      201
    );
  } catch (error) {
    console.error("Create laboratory error:", error);
    return errorResponse(res, "Gagal menambahkan laboratorium", 500, error.message);
  }
};

const updateLaboratory = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const {
      kode_lab,
      nama_lab,
      lokasi,
      deskripsi,
      kepala_lab_nama,
      nama_kepala_lab,
      kepala_lab_name,
      head_name,
      kepala_lab_id,
      status,
    } = req.body;

    const existingLab = await prisma.laboratories.findUnique({
      where: { id },
    });

    if (!existingLab) {
      return errorResponse(res, "Laboratorium tidak ditemukan", 404);
    }

    if (status && !allowedStatus.includes(status)) {
      return errorResponse(res, "Status tidak valid", 400);
    }

    if (kode_lab && kode_lab !== existingLab.kode_lab) {
      const codeUsed = await prisma.laboratories.findUnique({
        where: {
          kode_lab,
        },
      });

      if (codeUsed) {
        return errorResponse(res, "Kode lab sudah digunakan oleh laboratorium lain", 409);
      }
    }

    let parsedKepalaLabId = existingLab.kepala_lab_id;
    const isKepalaLabChanged = kepala_lab_id !== undefined;

    if (isKepalaLabChanged) {
      parsedKepalaLabId = kepala_lab_id ? BigInt(kepala_lab_id) : null;

      if (parsedKepalaLabId) {
        const kepalaLab = await prisma.users.findUnique({
          where: {
            id: parsedKepalaLabId,
          },
        });

        if (!kepalaLab) {
          return errorResponse(res, "Kepala lab tidak ditemukan", 404);
        }

        if (kepalaLab.role !== "kepala_lab") {
          return errorResponse(res, "User yang dipilih bukan role kepala_lab", 400);
        }

        if (kepalaLab.status !== "aktif") {
          return errorResponse(res, "Kepala lab yang dipilih tidak aktif", 400);
        }

        const alreadyAssigned = await prisma.laboratories.findFirst({
          where: {
            kepala_lab_id: parsedKepalaLabId,
            NOT: {
              id,
            },
          },
        });

        if (alreadyAssigned) {
          return errorResponse(res, "Kepala lab tersebut sudah menangani laboratorium lain", 409);
        }
      }
    }

    const updatedLab = await prisma.$transaction(async (tx) => {
      const lab = await tx.laboratories.update({
        where: { id },
        data: {
          kode_lab: kode_lab ?? existingLab.kode_lab,
          nama_lab: nama_lab ?? existingLab.nama_lab,
          lokasi: lokasi ?? existingLab.lokasi,
          deskripsi: deskripsi ?? existingLab.deskripsi,
          kepala_lab_nama:
            kepala_lab_nama !== undefined
              ? kepala_lab_nama || null
              : nama_kepala_lab !== undefined
                ? nama_kepala_lab || null
                : kepala_lab_name !== undefined
                  ? kepala_lab_name || null
                  : head_name !== undefined
                    ? head_name || null
                    : existingLab.kepala_lab_nama,
          kepala_lab_id: parsedKepalaLabId,
          status: status ?? existingLab.status,
        },
      });

      if (isKepalaLabChanged) {
        if (existingLab.kepala_lab_id) {
          await tx.users.updateMany({
            where: {
              id: existingLab.kepala_lab_id,
              lab_id: existingLab.id,
            },
            data: {
              lab_id: null,
            },
          });
        }

        if (parsedKepalaLabId) {
          await tx.users.update({
            where: {
              id: parsedKepalaLabId,
            },
            data: {
              lab_id: lab.id,
            },
          });
        }
      }

      return lab;
    });

    let kepalaLab = null;

    if (updatedLab.kepala_lab_id) {
      kepalaLab = await prisma.users.findUnique({
        where: {
          id: updatedLab.kepala_lab_id,
        },
      });
    }

    const totalEquipments = await prisma.equipments.count({
      where: {
        lab_id: updatedLab.id,
      },
    });

    return successResponse(
      res,
      "Laboratorium berhasil diperbarui",
      formatLaboratory(updatedLab, kepalaLab, totalEquipments)
    );
  } catch (error) {
    console.error("Update laboratory error:", error);
    return errorResponse(res, "Gagal memperbarui laboratorium", 500, error.message);
  }
};

const deleteLaboratory = async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    const existingLab = await prisma.laboratories.findUnique({
      where: { id },
    });

    if (!existingLab) {
      return errorResponse(res, "Laboratorium tidak ditemukan", 404);
    }

    const updatedLab = await prisma.laboratories.update({
      where: { id },
      data: {
        status: "nonaktif",
      },
    });

    return successResponse(
      res,
      "Laboratorium berhasil dinonaktifkan",
      formatLaboratory(updatedLab)
    );
  } catch (error) {
    console.error("Delete laboratory error:", error);
    return errorResponse(res, "Gagal menonaktifkan laboratorium", 500, error.message);
  }
};

module.exports = {
  getAllLaboratories,
  getLaboratoryById,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
};

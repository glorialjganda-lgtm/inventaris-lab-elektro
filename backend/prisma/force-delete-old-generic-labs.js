const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TARGET_CODES = ["LAB-MSL", "LAB-TLK"];

const stringify = (value) =>
  JSON.stringify(
    value,
    (_key, item) => (typeof item === "bigint" ? item.toString() : item),
    2
  );

const uniqueBigInts = (values) => {
  const seen = new Set();
  const result = [];

  for (const value of values.filter((item) => item !== null && item !== undefined)) {
    const key = value.toString();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }

  return result;
};

const countByLab = async (lab) => {
  const where = { lab_id: lab.id };
  const equipmentIds = (
    await prisma.equipments.findMany({
      where,
      select: { id: true },
    })
  ).map((item) => item.id);

  const borrowingIds = (
    await prisma.borrowings.findMany({
      where,
      select: { id: true },
    })
  ).map((item) => item.id);

  const returns = borrowingIds.length
    ? await prisma.returns.count({
        where: {
          borrowing_id: {
            in: borrowingIds,
          },
        },
      })
    : 0;

  const returnDetails = equipmentIds.length
    ? await prisma.return_details.count({
        where: {
          equipment_id: {
            in: equipmentIds,
          },
        },
      })
    : 0;

  const borrowingDetails = equipmentIds.length
    ? await prisma.borrowing_details.count({
        where: {
          equipment_id: {
            in: equipmentIds,
          },
        },
      })
    : 0;

  const [equipments, users, stocks, maintenances, borrowings] =
    await Promise.all([
      prisma.equipments.count({ where }),
      prisma.users.count({ where }),
      prisma.consumable_stocks.count({ where }),
      prisma.maintenances.count({
        where: {
          OR: [
            { lab_id: lab.id },
            equipmentIds.length
              ? {
                  equipment_id: {
                    in: equipmentIds,
                  },
                }
              : { id: BigInt(0) },
          ],
        },
      }),
      prisma.borrowings.count({ where }),
    ]);

  return {
    id: lab.id,
    kode_lab: lab.kode_lab,
    nama_lab: lab.nama_lab,
    kepala_lab_nama: lab.kepala_lab_nama,
    counts: {
      equipments,
      users,
      stocks,
      maintenances,
      borrowings,
      returns,
      borrowingDetails,
      returnDetails,
    },
  };
};

const getDeletePlan = async (tx, labs) => {
  const labIds = labs.map((lab) => lab.id);
  const kepalaLabIds = uniqueBigInts(labs.map((lab) => lab.kepala_lab_id));

  const equipments = await tx.equipments.findMany({
    where: {
      lab_id: {
        in: labIds,
      },
    },
    select: { id: true },
  });
  const equipmentIds = equipments.map((item) => item.id);

  const stocks = await tx.consumable_stocks.findMany({
    where: {
      lab_id: {
        in: labIds,
      },
    },
    select: { id: true },
  });
  const stockIds = stocks.map((item) => item.id);

  const directBorrowings = await tx.borrowings.findMany({
    where: {
      lab_id: {
        in: labIds,
      },
    },
    select: { id: true },
  });

  const borrowingDetailsForEquipments = equipmentIds.length
    ? await tx.borrowing_details.findMany({
        where: {
          equipment_id: {
            in: equipmentIds,
          },
        },
        select: { borrowing_id: true },
      })
    : [];

  const borrowingIds = uniqueBigInts([
    ...directBorrowings.map((item) => item.id),
    ...borrowingDetailsForEquipments.map((item) => item.borrowing_id),
  ]);

  const returns = borrowingIds.length
    ? await tx.returns.findMany({
        where: {
          borrowing_id: {
            in: borrowingIds,
          },
        },
        select: { id: true },
      })
    : [];
  const returnIds = returns.map((item) => item.id);

  const oldUsers = await tx.users.findMany({
    where: {
      role: "kepala_lab",
      OR: [
        {
          lab_id: {
            in: labIds,
          },
        },
        kepalaLabIds.length
          ? {
              id: {
                in: kepalaLabIds,
              },
            }
          : { id: BigInt(0) },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      lab_id: true,
    },
  });
  const oldUserIds = oldUsers.map((item) => item.id);

  const requiredUserRefs = oldUserIds.length
    ? {
        borrowingsAsDosen: await tx.borrowings.count({
          where: { dosen_id: { in: oldUserIds } },
        }),
        returnsSubmitted: await tx.returns.count({
          where: { diajukan_oleh: { in: oldUserIds } },
        }),
      }
    : { borrowingsAsDosen: 0, returnsSubmitted: 0 };

  return {
    labIds,
    equipmentIds,
    stockIds,
    borrowingIds,
    returnIds,
    oldUsers,
    oldUserIds,
    requiredUserRefs,
  };
};

async function main() {
  const labs = await prisma.laboratories.findMany({
    where: {
      kode_lab: {
        in: TARGET_CODES,
      },
    },
    orderBy: {
      kode_lab: "asc",
    },
  });

  if (!labs.length) {
    console.log("Tidak ada LAB-MSL atau LAB-TLK yang perlu dihapus.");
    const remaining = await prisma.laboratories.count();
    console.log(`Jumlah laboratorium tersisa: ${remaining}`);
    return;
  }

  const before = [];
  for (const lab of labs) {
    before.push(await countByLab(lab));
  }

  console.log("Ringkasan sebelum force delete:");
  console.log(stringify(before));

  const result = await prisma.$transaction(async (tx) => {
    const plan = await getDeletePlan(tx, labs);

    if (
      plan.requiredUserRefs.borrowingsAsDosen > 0 ||
      plan.requiredUserRefs.returnsSubmitted > 0
    ) {
      throw new Error(
        `User kepala lab generik masih dipakai pada relasi wajib: ${stringify(
          plan.requiredUserRefs
        )}`
      );
    }

    const deleted = {
      returnDetails: 0,
      returns: 0,
      borrowingDetails: 0,
      borrowings: 0,
      maintenances: 0,
      stockTransactions: 0,
      stocks: 0,
      equipments: 0,
      oldUsers: 0,
      laboratories: 0,
      nullableUserReferencesCleared: {
        laboratories: 0,
        equipments: 0,
        maintenances: 0,
        borrowings: 0,
        returns: 0,
        stockTransactions: 0,
        activityLogs: 0,
      },
    };

    if (plan.oldUserIds.length) {
      deleted.nullableUserReferencesCleared.laboratories = (
        await tx.laboratories.updateMany({
          where: {
            kepala_lab_id: {
              in: plan.oldUserIds,
            },
          },
          data: { kepala_lab_id: null },
        })
      ).count;

      deleted.nullableUserReferencesCleared.equipments = (
        await tx.equipments.updateMany({
          where: {
            penanggung_jawab_id: {
              in: plan.oldUserIds,
            },
          },
          data: { penanggung_jawab_id: null },
        })
      ).count;

      deleted.nullableUserReferencesCleared.maintenances = (
        await tx.maintenances.updateMany({
          where: {
            penanggung_jawab_id: {
              in: plan.oldUserIds,
            },
          },
          data: { penanggung_jawab_id: null },
        })
      ).count;

      const borrowingsApprovedByOldUsers = await tx.borrowings.updateMany({
        where: {
          disetujui_oleh: {
            in: plan.oldUserIds,
          },
        },
        data: {
          disetujui_oleh: null,
        },
      });

      const borrowingsSubmittedByOldUsers = await tx.borrowings.updateMany({
        where: {
          mahasiswa_id: {
            in: plan.oldUserIds,
          },
        },
        data: {
          mahasiswa_id: null,
        },
      });

      deleted.nullableUserReferencesCleared.borrowings =
        borrowingsApprovedByOldUsers.count + borrowingsSubmittedByOldUsers.count;

      deleted.nullableUserReferencesCleared.returns = (
        await tx.returns.updateMany({
          where: {
            diverifikasi_oleh: {
              in: plan.oldUserIds,
            },
          },
          data: { diverifikasi_oleh: null },
        })
      ).count;

      deleted.nullableUserReferencesCleared.stockTransactions = (
        await tx.stock_transactions.updateMany({
          where: {
            user_id: {
              in: plan.oldUserIds,
            },
          },
          data: { user_id: null },
        })
      ).count;

      deleted.nullableUserReferencesCleared.activityLogs = (
        await tx.activity_logs.updateMany({
          where: {
            user_id: {
              in: plan.oldUserIds,
            },
          },
          data: { user_id: null },
        })
      ).count;
    }

    if (plan.returnIds.length || plan.equipmentIds.length) {
      deleted.returnDetails = (
        await tx.return_details.deleteMany({
          where: {
            OR: [
              plan.returnIds.length
                ? {
                    return_id: {
                      in: plan.returnIds,
                    },
                  }
                : { id: BigInt(0) },
              plan.equipmentIds.length
                ? {
                    equipment_id: {
                      in: plan.equipmentIds,
                    },
                  }
                : { id: BigInt(0) },
            ],
          },
        })
      ).count;
    }

    if (plan.returnIds.length) {
      deleted.returns = (
        await tx.returns.deleteMany({
          where: {
            id: {
              in: plan.returnIds,
            },
          },
        })
      ).count;
    }

    if (plan.borrowingIds.length || plan.equipmentIds.length) {
      deleted.borrowingDetails = (
        await tx.borrowing_details.deleteMany({
          where: {
            OR: [
              plan.borrowingIds.length
                ? {
                    borrowing_id: {
                      in: plan.borrowingIds,
                    },
                  }
                : { id: BigInt(0) },
              plan.equipmentIds.length
                ? {
                    equipment_id: {
                      in: plan.equipmentIds,
                    },
                  }
                : { id: BigInt(0) },
            ],
          },
        })
      ).count;
    }

    if (plan.borrowingIds.length) {
      deleted.borrowings = (
        await tx.borrowings.deleteMany({
          where: {
            id: {
              in: plan.borrowingIds,
            },
          },
        })
      ).count;
    }

    if (plan.labIds.length || plan.equipmentIds.length) {
      deleted.maintenances = (
        await tx.maintenances.deleteMany({
          where: {
            OR: [
              {
                lab_id: {
                  in: plan.labIds,
                },
              },
              plan.equipmentIds.length
                ? {
                    equipment_id: {
                      in: plan.equipmentIds,
                    },
                  }
                : { id: BigInt(0) },
            ],
          },
        })
      ).count;
    }

    if (plan.stockIds.length) {
      deleted.stockTransactions = (
        await tx.stock_transactions.deleteMany({
          where: {
            stock_id: {
              in: plan.stockIds,
            },
          },
        })
      ).count;

      deleted.stocks = (
        await tx.consumable_stocks.deleteMany({
          where: {
            id: {
              in: plan.stockIds,
            },
          },
        })
      ).count;
    }

    if (plan.equipmentIds.length) {
      deleted.equipments = (
        await tx.equipments.deleteMany({
          where: {
            id: {
              in: plan.equipmentIds,
            },
          },
        })
      ).count;
    }

    if (plan.oldUserIds.length) {
      deleted.oldUsers = (
        await tx.users.deleteMany({
          where: {
            id: {
              in: plan.oldUserIds,
            },
            role: "kepala_lab",
          },
        })
      ).count;
    }

    deleted.laboratories = (
      await tx.laboratories.deleteMany({
        where: {
          id: {
            in: plan.labIds,
          },
          kode_lab: {
            in: TARGET_CODES,
          },
        },
      })
    ).count;

    const remainingLabs = await tx.laboratories.count();
    const remainingTargets = await tx.laboratories.findMany({
      where: {
        kode_lab: {
          in: TARGET_CODES,
        },
      },
      select: {
        kode_lab: true,
      },
    });

    return {
      deleted,
      remainingLabs,
      remainingTargets: remainingTargets.map((lab) => lab.kode_lab),
      oldUsers: plan.oldUsers,
    };
  });

  console.log("Ringkasan setelah force delete:");
  console.log(stringify(result));

  for (const code of TARGET_CODES) {
    const stillExists = result.remainingTargets.includes(code);
    console.log(`${code}: ${stillExists ? "masih ada" : "berhasil dihapus"}`);
  }
}

main()
  .catch((error) => {
    console.error("Force delete laboratorium lama/generik gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

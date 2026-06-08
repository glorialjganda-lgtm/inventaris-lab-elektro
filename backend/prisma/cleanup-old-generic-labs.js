const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TARGET_CODES = ["LAB-MSL", "LAB-TLK"];

const stringify = (value) =>
  JSON.stringify(
    value,
    (_key, item) => (typeof item === "bigint" ? item.toString() : item),
    2
  );

const getRelationSummary = async (labId) => {
  const where = { lab_id: labId };

  const [
    equipments,
    users,
    stocks,
    borrowings,
    maintenances,
    equipmentSamples,
    userSamples,
    stockSamples,
    borrowingSamples,
    maintenanceSamples,
  ] = await Promise.all([
    prisma.equipments.count({ where }),
    prisma.users.count({ where }),
    prisma.consumable_stocks.count({ where }),
    prisma.borrowings.count({ where }),
    prisma.maintenances.count({ where }),
    prisma.equipments.findMany({
      where,
      select: {
        id: true,
        kode_inventaris: true,
        nama_alat: true,
        status: true,
      },
      take: 5,
    }),
    prisma.users.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
      take: 5,
    }),
    prisma.consumable_stocks.findMany({
      where,
      select: {
        id: true,
        nama_barang: true,
        jumlah: true,
        status: true,
      },
      take: 5,
    }),
    prisma.borrowings.findMany({
      where,
      select: {
        id: true,
        kode_peminjaman: true,
        status: true,
      },
      take: 5,
    }),
    prisma.maintenances.findMany({
      where,
      select: {
        id: true,
        kode_perawatan: true,
        status: true,
      },
      take: 5,
    }),
  ]);

  return {
    counts: {
      equipments,
      users,
      stocks,
      borrowings,
      maintenances,
    },
    samples: {
      equipments: equipmentSamples,
      users: userSamples,
      stocks: stockSamples,
      borrowings: borrowingSamples,
      maintenances: maintenanceSamples,
    },
  };
};

const hasRelations = (counts) =>
  Object.values(counts).some((count) => count > 0);

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
    return;
  }

  const blocked = [];
  const deletable = [];

  for (const lab of labs) {
    const relationSummary = await getRelationSummary(lab.id);
    const summary = {
      lab: {
        id: lab.id,
        kode_lab: lab.kode_lab,
        nama_lab: lab.nama_lab,
        kepala_lab_nama: lab.kepala_lab_nama,
        kepala_lab_id: lab.kepala_lab_id,
        status: lab.status,
      },
      ...relationSummary,
    };

    console.log(`Ringkasan ${lab.kode_lab}:`);
    console.log(stringify(summary));

    if (hasRelations(relationSummary.counts)) {
      blocked.push(summary);
    } else {
      deletable.push(lab);
    }
  }

  if (blocked.length) {
    console.log("Cleanup dihentikan. Ada laboratorium yang masih memiliki relasi.");
    console.log(stringify(blocked));
    process.exitCode = 1;
    return;
  }

  for (const lab of deletable) {
    await prisma.laboratories.delete({
      where: {
        id: lab.id,
      },
    });
    console.log(`Deleted: ${lab.kode_lab} | ${lab.nama_lab}`);
  }
}

main()
  .catch((error) => {
    console.error("Cleanup laboratorium lama/generik gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

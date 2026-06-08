const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const officialLaboratories = [
  {
    kode_lab: "LAB-TMIL",
    nama_lab: "Laboratorium Teknologi Mekanik dan Instalasi Listrik",
    kepala_lab_nama: "Doostenreyk N. Kantohe, SST., MT",
    aliases: [
      { kode_lab: "LAB-INS" },
      { nama_lab: "Laboratorium Instalasi Listrik" },
    ],
  },
  {
    kode_lab: "LAB-PDE",
    nama_lab: "Laboratorium Pengukuran dan Dasar Elektronika",
    kepala_lab_nama: "Sonny R. Kasenda, ST., MT",
    aliases: [
      { kode_lab: "LAB-ELD" },
      { nama_lab: "Laboratorium Elektronika Dasar" },
    ],
  },
  {
    kode_lab: "LAB-MR",
    nama_lab: "Laboratorium M&R Elektro",
    kepala_lab_nama: "Herry Setiawan Langi, SST., MT",
    aliases: [
      { nama_lab: "Laboratorium M&R Elektro" },
    ],
  },
  {
    kode_lab: "LAB-KEDP",
    nama_lab: "Laboratorium Konversi Energi, Distribusi dan Proteksi",
    kepala_lab_nama: "Leony Ariesta Wenno, ST., M.Eng",
    aliases: [
      { kode_lab: "LAB-STG" },
      { nama_lab: "Laboratorium Sistem Tenaga" },
    ],
  },
  {
    kode_lab: "LAB-OTO",
    nama_lab: "Laboratorium Otomasi",
    kepala_lab_nama: "Yoice Rita Putung, SST., MT",
    aliases: [
      { kode_lab: "LAB-KDL" },
      { nama_lab: "Laboratorium Kendali" },
    ],
  },
  {
    kode_lab: "LAB-EDMED",
    nama_lab: "Laboratorium Elektronika Digital, Mikroprosessor dan Elektronika Daya",
    kepala_lab_nama: "Ronny Evert Katuk, SST., MT",
    aliases: [],
  },
  {
    kode_lab: "LAB-MRAI",
    nama_lab: "Laboratorium Mikrokontroler, Robotik, dan Artificial Intelegence",
    kepala_lab_nama: "Ali Akbar Steven Ramschie, SST., MT",
    aliases: [],
  },
  {
    kode_lab: "LAB-MMGK",
    nama_lab: "Laboratorium Multimedia dan Grafika Komputer",
    kepala_lab_nama: "Marike Amelia Silvia Kondoj, SST., MT",
    aliases: [],
  },
  {
    kode_lab: "LAB-RPL",
    nama_lab: "Laboratorium Rekayasa Perangkat Lunak",
    kepala_lab_nama: "Ottopianus Mellolo, S.Si., MT",
    aliases: [],
  },
  {
    kode_lab: "LAB-DKAP",
    nama_lab: "Laboratorium Dasar Komputer, Algoritma dan Pemrograman",
    kepala_lab_nama: "Venny Vita Ponggawa, SST., MT",
    aliases: [],
  },
  {
    kode_lab: "LAB-JKKJ",
    nama_lab: "Laboratorium Jaringan Komputer, dan Keamanan Jaringan",
    kepala_lab_nama: "Fitria Claudya Lahinta, SST., MT",
    aliases: [
      { kode_lab: "LAB-KOMJAR" },
      { nama_lab: "Laboratorium Komputer dan Jaringan" },
    ],
  },
];

const findExistingLab = async (lab) => {
  const byCode = await prisma.laboratories.findUnique({
    where: { kode_lab: lab.kode_lab },
  });
  if (byCode) return byCode;

  const aliasFilters = lab.aliases.map((alias) => {
    if (alias.kode_lab) return { kode_lab: alias.kode_lab };
    return { nama_lab: alias.nama_lab };
  });

  if (!aliasFilters.length) return null;

  return prisma.laboratories.findFirst({
    where: { OR: aliasFilters },
  });
};

async function main() {
  const results = [];

  for (const lab of officialLaboratories) {
    const existingLab = await findExistingLab(lab);
    const data = {
      kode_lab: lab.kode_lab,
      nama_lab: lab.nama_lab,
      kepala_lab_nama: lab.kepala_lab_nama,
      lokasi: existingLab?.lokasi || "-",
      deskripsi: existingLab?.deskripsi || `${lab.nama_lab}.`,
      status: "aktif",
    };

    const savedLab = existingLab
      ? await prisma.laboratories.update({
          where: { id: existingLab.id },
          data,
        })
      : await prisma.laboratories.create({
          data,
        });

    results.push({
      kode_lab: savedLab.kode_lab,
      nama_lab: savedLab.nama_lab,
      kepala_lab_nama: savedLab.kepala_lab_nama,
      action: existingLab ? "updated" : "created",
    });
  }

  console.log("Patch laboratorium resmi selesai:");
  for (const result of results) {
    console.log(
      `- ${result.action}: ${result.kode_lab} | ${result.nama_lab} | ${result.kepala_lab_nama}`
    );
  }
}

main()
  .catch((error) => {
    console.error("Patch laboratorium resmi gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

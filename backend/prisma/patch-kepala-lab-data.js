const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const herryUser = {
  name: "Herry Setiawan Langi, SST., MT.",
  email: "herry.mr@elektro.test",
  nomor_induk: "KLAB-MR",
  role: "kepala_lab",
  status: "aktif",
};

const mrLab = {
  kode_lab: "LAB-MR",
  nama_lab: "Laboratorium M&R Elektro",
  lokasi: "-",
  deskripsi: "Laboratorium M&R Elektro.",
  status: "aktif",
};

async function main() {
  const passwordHash = await bcrypt.hash("password", 12);

  const kepalaLab = await prisma.users.upsert({
    where: { email: herryUser.email },
    update: {
      name: herryUser.name,
      nomor_induk: herryUser.nomor_induk,
      role: herryUser.role,
      status: herryUser.status,
    },
    create: {
      ...herryUser,
      password_hash: passwordHash,
    },
  });

  const existingLab =
    (await prisma.laboratories.findUnique({
      where: { kode_lab: mrLab.kode_lab },
    })) ||
    (await prisma.laboratories.findFirst({
      where: { nama_lab: mrLab.nama_lab },
    }));

  const lab = existingLab
    ? await prisma.laboratories.update({
        where: { id: existingLab.id },
        data: {
          ...mrLab,
          kepala_lab_id: kepalaLab.id,
        },
      })
    : await prisma.laboratories.create({
        data: {
          ...mrLab,
          kepala_lab_id: kepalaLab.id,
        },
      });

  await prisma.users.update({
    where: { id: kepalaLab.id },
    data: { lab_id: lab.id },
  });

  await prisma.users.updateMany({
    where: {
      id: { not: kepalaLab.id },
      lab_id: lab.id,
      role: "kepala_lab",
    },
    data: { lab_id: null },
  });

  console.log("Patch kepala lab selesai:");
  console.log(`- ${lab.nama_lab} (${lab.kode_lab})`);
  console.log(`- Kepala Lab: ${kepalaLab.name}`);
  console.log(`- Email login sementara: ${kepalaLab.email}`);
  console.log(`- Nomor induk sementara: ${kepalaLab.nomor_induk || "-"}`);
}

main()
  .catch((error) => {
    console.error("Patch kepala lab gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

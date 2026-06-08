export const formatRole = (role) => {
  const labels = {
    admin_jurusan: "Admin Jurusan",
    kepala_lab: "Kepala Lab",
    dosen: "Dosen",
    mahasiswa: "Mahasiswa",
  };

  return labels[role] || role || "-";
};

export const formatDate = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
};

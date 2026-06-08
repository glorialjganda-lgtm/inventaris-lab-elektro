export const getArrayData = (response) => {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== "object") return [];

  const data = response.data;
  const candidates = [
    data,
    data?.data,
    data?.items,
    data?.borrowings,
    data?.equipments,
    data?.returns,
    response.items,
    response.borrowings,
    response.equipments,
    response.returns,
  ];

  return candidates.find(Array.isArray) || [];
};

export const getEquipmentCode = (equipment) =>
  equipment?.kode_inventaris ||
  equipment?.kode_alat ||
  equipment?.kode ||
  equipment?.id ||
  "-";

export const getEquipmentName = (equipment) => equipment?.nama_alat || equipment?.nama || "-";
export const getEquipmentLab = (equipment) => equipment?.laboratories || equipment?.laboratory || equipment?.lab || null;
export const getEquipmentCategory = (equipment) => equipment?.categories || equipment?.category || equipment?.kategori || null;
export const getLabName = (item) => item?.nama_lab || getEquipmentLab(item)?.nama_lab || item?.laboratories?.nama_lab || item?.laboratory?.nama_lab || "-";
export const getCategoryName = (item) => item?.nama_kategori || getEquipmentCategory(item)?.nama_kategori || item?.categories?.nama_kategori || item?.category?.nama_kategori || "-";

export const getBorrowing = (item) => item?.borrowings || item?.borrowing || null;
export const getBorrowingCode = (borrowing) => getBorrowing(borrowing)?.kode_peminjaman || borrowing?.kode_peminjaman || borrowing?.kode || borrowing?.id || "-";
export const getReturnCode = (returnData) => returnData?.kode_pengembalian || returnData?.kode || returnData?.id || "-";

export const getDosen = (item) =>
  getBorrowing(item)?.users_borrowings_dosen_idTousers ||
  item?.users_borrowings_dosen_idTousers ||
  item?.dosen ||
  item?.lecturer ||
  item?.user ||
  null;

export const getMahasiswa = (item) =>
  getBorrowing(item)?.users_borrowings_mahasiswa_idTousers ||
  item?.users_borrowings_mahasiswa_idTousers ||
  item?.mahasiswa ||
  item?.student ||
  null;

export const getUserName = (item) => {
  const user = getMahasiswa(item) || getDosen(item) || item?.user || item;
  return user?.name || user?.nama || user?.email || "-";
};

export const getBorrowingItems = (borrowing) => {
  const source =
    borrowing?.details ||
    borrowing?.borrowing_details ||
    borrowing?.borrowingDetails ||
    borrowing?.items ||
    borrowing?.equipments ||
    getBorrowing(borrowing)?.borrowing_details ||
    [];
  return Array.isArray(source) ? source : [];
};

export const getReturnStatus = (returnData) => returnData?.status_pengembalian || returnData?.status || "";

export const formatStatusLabel = (status) => {
  if (!status) return "-";
  const labels = {
    admin_jurusan: "Admin Jurusan",
    kepala_lab: "Kepala Lab",
    dosen: "Dosen",
    mahasiswa: "Mahasiswa",
    aktif: "Aktif",
    nonaktif: "Nonaktif",
    tersedia: "Tersedia",
    dipinjam: "Dipinjam",
    dalam_perawatan: "Dalam Perawatan",
    tidak_aktif: "Tidak Aktif",
    baik: "Baik",
    rusak_ringan: "Rusak Ringan",
    rusak_berat: "Rusak Berat",
    hilang: "Hilang",
    not_required: "Tidak Diperlukan",
    menunggu: "Menunggu",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
    pengembalian_diajukan: "Pengembalian Diajukan",
    selesai: "Selesai",
    terlambat: "Terlambat",
    menunggu_verifikasi: "Menunggu Verifikasi",
    diterima: "Diterima",
    diterima_dengan_catatan: "Diterima Dengan Catatan",
    praktikum: "Praktikum",
    penelitian: "Penelitian",
    tugas_akhir: "Tugas Akhir",
    pengujian: "Pengujian",
    proyek: "Proyek",
    lainnya: "Lainnya",
  };
  return labels[status] || String(status).replaceAll("_", " ");
};

export const getStatusBadgeVariant = (status) => {
  const value = String(status || "").toLowerCase();
  if (["tersedia", "selesai", "diterima", "aktif"].includes(value)) return "success";
  if (["dipinjam", "disetujui"].includes(value)) return "info";
  if (["menunggu", "menunggu_verifikasi", "pengembalian_diajukan", "diterima_dengan_catatan"].includes(value)) return "warning";
  if (["ditolak", "terlambat", "tidak_aktif", "rusak_berat", "hilang", "nonaktif"].includes(value)) return "danger";
  return "neutral";
};

export const getDosenApprovalLabel = (borrowing) => {
  const approval = borrowing?.dosen_approval_status;
  if (approval === "menunggu") return "Menunggu Persetujuan Dosen";
  if (approval === "disetujui" && borrowing?.status === "menunggu") return "Menunggu Validasi Kepala Lab";
  if (approval === "ditolak") return "Ditolak Dosen";
  return formatStatusLabel(borrowing?.status);
};

export const isEquipmentAvailable = (equipment) => String(equipment?.status || equipment?.status_ketersediaan || "").toLowerCase() === "tersedia";
export const isGoodCondition = (equipment) => !equipment?.kondisi || String(equipment.kondisi).toLowerCase() === "baik";
export const isBorrowingReturnable = (borrowing) => String(borrowing?.status || "").toLowerCase() === "dipinjam";

export const pickArray = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const candidates = [
    payload.data,
    payload.data?.items,
    payload.data?.borrowings,
    payload.data?.equipments,
    payload.data?.returns,
    payload.items,
    payload.borrowings,
    payload.equipments,
    payload.returns,
  ];

  for (const key of keys) candidates.push(payload[key], payload.data?.[key]);
  return candidates.find(Array.isArray) || [];
};

export const normalizeRole = (role) => String(role || "").trim().toLowerCase();
export const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

export const getEquipmentCode = (equipment) =>
  equipment?.kode_inventaris ||
  equipment?.kode_alat ||
  equipment?.kode_barang ||
  equipment?.kode_equipment ||
  equipment?.kode ||
  equipment?.nomor_inventaris ||
  "-";

export const getEquipmentName = (equipment) => equipment?.nama_alat || equipment?.nama || "-";
export const getEquipmentLab = (equipment) => equipment?.laboratory || equipment?.laboratories || equipment?.lab || null;
export const getEquipmentCategory = (equipment) => equipment?.category || equipment?.categories || equipment?.kategori || null;
export const getLabName = (item) => item?.nama_lab || getEquipmentLab(item)?.nama_lab || item?.laboratory?.nama_lab || item?.laboratories?.nama_lab || "-";
export const getCategoryName = (item) => item?.nama_kategori || getEquipmentCategory(item)?.nama_kategori || item?.category?.nama_kategori || item?.categories?.nama_kategori || "-";

export const getBorrowing = (item) => item?.borrowings || item?.borrowing || null;
export const getBorrowingCode = (item) => getBorrowing(item)?.kode_peminjaman || item?.kode_peminjaman || item?.kode || item?.id || "-";
export const getBorrower = (item) =>
  getBorrowing(item)?.users_borrowings_dosen_idTousers ||
  item?.users_borrowings_dosen_idTousers ||
  item?.user ||
  item?.dosen ||
  item?.borrower ||
  item?.users_returns_diajukan_olehTousers ||
  null;
export const getBorrowingLab = (item) => getBorrowing(item)?.laboratories || item?.laboratories || item?.laboratory || item?.lab || null;
export const getBorrowingDetails = (item) =>
  item?.borrowing_details ||
  item?.details ||
  item?.items ||
  item?.borrowingDetails ||
  getBorrowing(item)?.borrowing_details ||
  [];

export const getReturnCode = (item) => item?.kode_pengembalian || item?.kode || item?.id || "-";
export const getReturnStatus = (item) => item?.status_pengembalian || item?.status || "";
export const getReturnDetails = (item) => item?.return_details || item?.details || item?.items || [];

export const formatStatusLabel = (value) => {
  if (!value) return "-";
  const labels = {
    admin_jurusan: "Admin Jurusan",
    kepala_lab: "Kepala Lab",
    dosen: "Dosen",
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
    menunggu: "Menunggu",
    pending: "Pending",
    diajukan: "Diajukan",
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
  return labels[value] || String(value).replaceAll("_", " ");
};

export const statusVariant = (status) => {
  const value = normalizeStatus(status);
  if (["tersedia", "selesai", "diterima", "aktif"].includes(value)) return "success";
  if (["dipinjam", "disetujui"].includes(value)) return "info";
  if (["menunggu", "pending", "diajukan", "menunggu_verifikasi", "pengembalian_diajukan", "diterima_dengan_catatan"].includes(value)) return "warning";
  if (["tidak_aktif", "ditolak", "terlambat", "rusak_berat", "hilang", "nonaktif"].includes(value)) return "danger";
  return "neutral";
};

export const isEquipmentAvailable = (equipment) => normalizeStatus(equipment?.status || equipment?.status_ketersediaan) === "tersedia";
export const isGoodCondition = (equipment) => !equipment?.kondisi || normalizeStatus(equipment.kondisi) === "baik";
export const canReturnBorrowing = (borrowing) => normalizeStatus(borrowing?.status) === "dipinjam";

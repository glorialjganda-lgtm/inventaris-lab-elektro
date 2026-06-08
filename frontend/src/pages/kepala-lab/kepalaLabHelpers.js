export const readValue = (item, keys, fallback = "-") => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

export const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const formatNumber = (value) => new Intl.NumberFormat("id-ID").format(safeNumber(value));

export const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
};

export const formatLabel = (value) => {
  if (!value) return "-";
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
    menunggu: "Menunggu",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
    pengembalian_diajukan: "Pengembalian Diajukan",
    selesai: "Selesai",
    terlambat: "Terlambat",
    menunggu_verifikasi: "Menunggu Verifikasi",
    diterima: "Diterima",
    diterima_dengan_catatan: "Diterima Dengan Catatan",
    proses: "Proses",
    gagal: "Gagal",
    rutin: "Rutin",
    perbaikan: "Perbaikan",
    kalibrasi: "Kalibrasi",
    penggantian_komponen: "Penggantian Komponen",
    pemeriksaan_keamanan: "Pemeriksaan Keamanan",
    aman: "Aman",
    menipis: "Menipis",
    habis: "Habis",
    praktikum: "Praktikum",
    penelitian: "Penelitian",
    tugas_akhir: "Tugas Akhir",
    pengujian: "Pengujian",
    proyek: "Proyek",
    lainnya: "Lainnya",
    not_required: "Tidak Diperlukan",
  };
  return labels[value] || String(value).replaceAll("_", " ");
};

export const statusVariant = (status) => {
  if (["tersedia", "selesai", "diterima", "aman", "aktif"].includes(status)) return "success";
  if (["dipinjam", "disetujui"].includes(status)) return "info";
  if (["dalam_perawatan", "menunggu", "menunggu_verifikasi", "pengembalian_diajukan", "proses", "menipis"].includes(status)) return "warning";
  if (["tidak_aktif", "ditolak", "terlambat", "gagal", "habis", "nonaktif"].includes(status)) return "danger";
  if (status === "diterima_dengan_catatan") return "warning";
  return "neutral";
};

export const getEquipmentCode = (equipment) =>
  readValue(equipment, ["kode_inventaris", "kode_alat", "kode_barang", "kode_equipment", "kode", "nomor_inventaris"]);

export const getEquipmentLab = (equipment) => equipment?.laboratory || equipment?.laboratories || equipment?.lab || null;
export const getEquipmentCategory = (equipment) => equipment?.category || equipment?.categories || equipment?.kategori || null;
export const getLabName = (item) => item?.nama_lab || item?.laboratory?.nama_lab || item?.laboratories?.nama_lab || item?.lab?.nama_lab || "-";
export const getCategoryName = (item) => item?.nama_kategori || item?.category?.nama_kategori || item?.categories?.nama_kategori || item?.kategori?.nama_kategori || "-";

export const getBorrowing = (item) => item?.borrowings || item?.borrowing || null;
export const getBorrowingCode = (item) => getBorrowing(item)?.kode_peminjaman || item?.kode_peminjaman || item?.borrowing_id || item?.kode || item?.id || "-";
export const getBorrower = (item) =>
  getBorrowing(item)?.users_borrowings_dosen_idTousers ||
  item?.users_borrowings_dosen_idTousers ||
  item?.user ||
  item?.dosen ||
  item?.borrower ||
  item?.users_returns_diajukan_olehTousers ||
  null;
export const getMahasiswa = (item) =>
  getBorrowing(item)?.users_borrowings_mahasiswa_idTousers ||
  item?.users_borrowings_mahasiswa_idTousers ||
  item?.mahasiswa ||
  item?.student ||
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

export const getMaintenanceCode = (item) => item?.kode_perawatan || item?.kode || item?.id || "-";
export const getMaintenanceEquipment = (item) => item?.equipments || item?.equipment || item?.alat || null;
export const getMaintenanceLab = (item) => item?.laboratories || item?.laboratory || item?.lab || getEquipmentLab(getMaintenanceEquipment(item)) || null;
export const getMaintenanceUser = (item) => item?.users || item?.user || item?.penanggung_jawab || null;

export const getStockCode = (stock) => {
  if (stock?.kode_stok) return stock.kode_stok;
  if (stock?.id === undefined || stock?.id === null || stock.id === "") return "STK-000";
  const numericId = Number(stock.id);
  if (!Number.isFinite(numericId)) return "STK-000";
  return `STK-${String(numericId).padStart(3, "0")}`;
};

export const getStockLab = (stock) => stock?.laboratories || stock?.laboratory || stock?.lab || null;
export const getStockMinimum = (stock) => stock?.stok_minimum ?? stock?.minimum ?? 0;

export const isSameLab = (itemLabId, userLabId) => {
  if (!userLabId) return true;
  if (!itemLabId) return true;
  return String(itemLabId) === String(userLabId);
};

export const filterByLab = (items, userLabId, getLabId) => {
  if (!userLabId) return items;
  return items.filter((item) => isSameLab(getLabId(item), userLabId));
};

export const defaultFinalStatus = (condition) => {
  if (condition === "baik") return "tersedia";
  if (condition === "hilang") return "tidak_aktif";
  return "dalam_perawatan";
};

export const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const normalizeReport = (payload) => {
  if (Array.isArray(payload)) return { items: payload, summary: {} };
  if (!payload || typeof payload !== "object") return { items: [], summary: {} };

  const data = payload.data;
  const items =
    (Array.isArray(payload.items) && payload.items) ||
    (Array.isArray(payload.report) && payload.report) ||
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.report) && data.report) ||
    [];

  return { items, summary: payload.summary || data?.summary || {} };
};

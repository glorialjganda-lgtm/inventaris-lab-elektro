import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";
import { formatDate } from "../../utils/formatters.js";

const tabs = [
  { key: "inventory", label: "Inventaris" },
  { key: "borrowings", label: "Peminjaman" },
  { key: "maintenances", label: "Perawatan" },
  { key: "stocks", label: "Stok Komponen" },
];

const inventoryStatusOptions = ["tersedia", "dipinjam", "dalam_perawatan", "tidak_aktif"];
const borrowingStatusOptions = ["menunggu", "disetujui", "ditolak", "dipinjam", "pengembalian_diajukan", "selesai", "terlambat"];
const maintenanceStatusOptions = ["proses", "selesai", "gagal"];
const stockStatusOptions = ["aman", "menipis", "habis"];

const emptyReports = {
  inventory: { items: [], summary: {}, error: "" },
  borrowings: { items: [], summary: {}, error: "" },
  maintenances: { items: [], summary: {}, error: "" },
  stocks: { items: [], summary: {}, error: "" },
};

const readValue = (item, keys, fallback = "-") => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  return [];
};

const normalizeReport = (payload) => {
  if (Array.isArray(payload)) return { items: payload, summary: {} };
  if (!payload || typeof payload !== "object") return { items: [], summary: {} };

  const data = payload.data;
  const items =
    asArray(payload.items).length ? payload.items :
    asArray(payload.report).length ? payload.report :
    asArray(data).length ? data :
    asArray(data?.items).length ? data.items :
    asArray(data?.report).length ? data.report :
    [];

  return {
    items,
    summary: payload.summary || data?.summary || {},
  };
};

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const countBy = (items, getter, value) => items.filter((item) => getter(item) === value).length;

const getStockCode = (stock) => {
  if (stock?.kode_stok) return stock.kode_stok;
  if (stock?.id === undefined || stock?.id === null || stock.id === "") return "STK-000";
  const numericId = Number(stock.id);
  if (!Number.isFinite(numericId)) return "STK-000";
  return `STK-${String(numericId).padStart(3, "0")}`;
};

const formatLabel = (value) => {
  if (!value) return "-";
  const labels = {
    tersedia: "Tersedia",
    dipinjam: "Dipinjam",
    dalam_perawatan: "Dalam Perawatan",
    tidak_aktif: "Tidak Aktif",
    menunggu: "Menunggu",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
    pengembalian_diajukan: "Pengembalian Diajukan",
    selesai: "Selesai",
    terlambat: "Terlambat",
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
    baik: "Baik",
    rusak_ringan: "Rusak Ringan",
    rusak_berat: "Rusak Berat",
    hilang: "Hilang",
  };
  return labels[value] || String(value).replaceAll("_", " ");
};

const statusVariant = (status) => {
  if (["tersedia", "selesai", "aman"].includes(status)) return "success";
  if (["dipinjam", "disetujui"].includes(status)) return "info";
  if (["dalam_perawatan", "menunggu", "pengembalian_diajukan", "proses", "menipis"].includes(status)) return "warning";
  if (["tidak_aktif", "ditolak", "terlambat", "gagal", "habis"].includes(status)) return "danger";
  return "neutral";
};

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatNumber = (value) => new Intl.NumberFormat("id-ID").format(safeNumber(value));

const getInventoryCode = (item) => readValue(item, ["kode_inventaris", "kode_alat", "kode", "id"]);
const getInventoryName = (item) => readValue(item, ["nama_alat", "nama"]);
const getInventoryLab = (item) => item?.laboratories?.nama_lab || item?.laboratory?.nama_lab || item?.lab?.nama_lab || item?.nama_lab || "-";
const getInventoryCategory = (item) =>
  item?.categories?.nama_kategori || item?.category?.nama_kategori || item?.kategori?.nama_kategori || item?.nama_kategori || "-";

const getBorrowingCode = (item) => readValue(item, ["kode_peminjaman", "kode", "id"]);
const getBorrower = (item) =>
  item?.users_borrowings_dosen_idTousers?.name || item?.user?.name || item?.dosen?.name || item?.borrower?.name || "-";
const getBorrowingLab = (item) => item?.laboratories?.nama_lab || item?.laboratory?.nama_lab || item?.lab?.nama_lab || "-";

const getMaintenanceCode = (item) => readValue(item, ["kode_perawatan", "kode", "id"]);
const getMaintenanceEquipment = (item) => item?.equipments || item?.equipment || item?.alat || null;
const getMaintenanceEquipmentName = (item) => getMaintenanceEquipment(item)?.nama_alat || item?.nama_alat || "-";
const getMaintenanceLab = (item) =>
  getMaintenanceEquipment(item)?.laboratory?.nama_lab ||
  item?.laboratories?.nama_lab ||
  item?.laboratory?.nama_lab ||
  item?.lab?.nama_lab ||
  "-";
const getMaintenanceTechnician = (item) => item?.teknisi || item?.users?.name || item?.user?.name || item?.penanggung_jawab?.name || "-";

const getStockName = (item) => readValue(item, ["nama_barang", "nama_stok", "nama"]);
const getStockLab = (item) => item?.laboratories?.nama_lab || item?.laboratory?.nama_lab || item?.lab?.nama_lab || item?.nama_lab || "-";
const getStockMinimum = (item) => item?.stok_minimum ?? item?.minimum ?? 0;

const AdminReportsPage = () => {
  const [reports, setReports] = useState(emptyReports);
  const [activeTab, setActiveTab] = useState("inventory");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadReports = async () => {
    setLoading(true);
    const endpoints = [
      ["inventory", "/reports/inventory"],
      ["borrowings", "/reports/borrowings"],
      ["maintenances", "/reports/maintenances"],
      ["stocks", "/reports/stocks"],
    ];

    const results = await Promise.all(
      endpoints.map(async ([key, endpoint]) => {
        try {
          const payload = await get(endpoint);
          return [key, { ...normalizeReport(payload), error: "" }];
        } catch (err) {
          return [key, { items: [], summary: {}, error: err.message }];
        }
      })
    );

    setReports(Object.fromEntries(results));
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const activeItems = reports[activeTab]?.items || [];
  const activeError = reports[activeTab]?.error || "";

  const summaryCards = useMemo(() => {
    const inventory = reports.inventory;
    const borrowings = reports.borrowings;
    const stocks = reports.stocks;
    const inventoryItems = inventory.items || [];
    const borrowingItems = borrowings.items || [];
    const stockItems = stocks.items || [];

    return [
      {
        label: "Total Alat",
        value: inventory.summary.total_alat ?? inventoryItems.length,
      },
      {
        label: "Alat Tersedia",
        value: inventory.summary.total_tersedia ?? countBy(inventoryItems, (item) => item.status, "tersedia"),
      },
      {
        label: "Alat Dipinjam",
        value: inventory.summary.total_dipinjam ?? countBy(inventoryItems, (item) => item.status, "dipinjam"),
      },
      {
        label: "Dalam Perawatan",
        value: inventory.summary.total_dalam_perawatan ?? countBy(inventoryItems, (item) => item.status, "dalam_perawatan"),
      },
      {
        label: "Stok Menipis/Habis",
        value:
          safeNumber(stocks.summary.menipis) +
          safeNumber(stocks.summary.habis) ||
          countBy(stockItems, (item) => item.status, "menipis") + countBy(stockItems, (item) => item.status, "habis"),
      },
      {
        label: "Total Peminjaman",
        value: borrowings.summary.total_peminjaman ?? borrowingItems.length,
      },
    ];
  }, [reports]);

  const tabConfig = useMemo(() => {
    const configs = {
      inventory: {
        placeholder: "Cari alat, kode inventaris, lab, atau kategori...",
        statuses: inventoryStatusOptions,
        searchText: (item) => [getInventoryCode(item), getInventoryName(item), getInventoryLab(item), getInventoryCategory(item)],
        status: (item) => item.status,
        empty: "Belum ada data laporan inventaris.",
        columns: [
          { key: "no", label: "No", render: (_, index) => index + 1 },
          { key: "kode", label: "Kode Inventaris", render: (row) => getInventoryCode(row) },
          { key: "nama", label: "Nama Alat", render: (row) => getInventoryName(row) },
          { key: "lab", label: "Laboratorium", render: (row) => getInventoryLab(row) },
          { key: "kategori", label: "Kategori", render: (row) => getInventoryCategory(row) },
          { key: "kondisi", label: "Kondisi", render: (row) => formatLabel(row.kondisi) },
          { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge> },
          { key: "tahun", label: "Tahun Pengadaan", render: (row) => row.tahun_pengadaan || "-" },
        ],
      },
      borrowings: {
        placeholder: "Cari kode peminjaman, dosen, atau keperluan...",
        statuses: borrowingStatusOptions,
        searchText: (item) => [getBorrowingCode(item), getBorrower(item), getBorrowingLab(item), item.keperluan],
        status: (item) => item.status,
        empty: "Belum ada data laporan peminjaman.",
        columns: [
          { key: "no", label: "No", render: (_, index) => index + 1 },
          { key: "kode", label: "Kode Peminjaman", render: (row) => getBorrowingCode(row) },
          { key: "dosen", label: "Dosen", render: (row) => getBorrower(row) },
          { key: "lab", label: "Laboratorium", render: (row) => getBorrowingLab(row) },
          { key: "tanggal_pinjam", label: "Tanggal Pinjam", render: (row) => formatDate(row.tanggal_pinjam) },
          { key: "tanggal_kembali", label: "Tanggal Kembali Rencana", render: (row) => formatDate(row.tanggal_kembali_rencana) },
          { key: "keperluan", label: "Keperluan", render: (row) => formatLabel(row.keperluan) },
          { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge> },
        ],
      },
      maintenances: {
        placeholder: "Cari alat, kode perawatan, teknisi, atau tindakan...",
        statuses: maintenanceStatusOptions,
        searchText: (item) => [
          getMaintenanceCode(item),
          getMaintenanceEquipmentName(item),
          getMaintenanceEquipment(item)?.kode_inventaris,
          getMaintenanceTechnician(item),
          item.tindakan,
          item.deskripsi_masalah,
        ],
        status: (item) => item.status,
        empty: "Belum ada data laporan perawatan.",
        columns: [
          { key: "no", label: "No", render: (_, index) => index + 1 },
          { key: "kode", label: "Kode Perawatan", render: (row) => getMaintenanceCode(row) },
          { key: "alat", label: "Alat", render: (row) => getMaintenanceEquipmentName(row) },
          { key: "lab", label: "Laboratorium", render: (row) => getMaintenanceLab(row) },
          { key: "tanggal", label: "Tanggal Perawatan", render: (row) => formatDate(row.tanggal_perawatan) },
          { key: "jenis", label: "Jenis Perawatan", render: (row) => formatLabel(row.jenis_perawatan) },
          { key: "teknisi", label: "Teknisi", render: (row) => getMaintenanceTechnician(row) },
          { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge> },
          { key: "biaya", label: "Biaya", render: (row) => formatCurrency(row.biaya) },
        ],
      },
      stocks: {
        placeholder: "Cari nama barang, kode stok, lab, atau lokasi...",
        statuses: stockStatusOptions,
        searchText: (item) => [getStockCode(item), getStockName(item), getStockLab(item), item.lokasi],
        status: (item) => item.status,
        empty: "Belum ada data laporan stok.",
        columns: [
          { key: "no", label: "No", render: (_, index) => index + 1 },
          { key: "kode", label: "Kode Stok", render: (row) => <span className="stock-code">{getStockCode(row)}</span> },
          { key: "nama", label: "Nama Barang", render: (row) => getStockName(row) },
          { key: "lab", label: "Laboratorium", render: (row) => getStockLab(row) },
          { key: "satuan", label: "Satuan", render: (row) => row.satuan || "-" },
          { key: "jumlah", label: "Jumlah", render: (row) => formatNumber(row.jumlah) },
          { key: "minimum", label: "Minimum", render: (row) => formatNumber(getStockMinimum(row)) },
          { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge> },
          { key: "lokasi", label: "Lokasi", render: (row) => row.lokasi || "-" },
        ],
      },
    };

    return configs[activeTab];
  }, [activeTab]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return activeItems.filter((item) => {
      const matchesSearch =
        !keyword ||
        tabConfig.searchText(item)
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesStatus = !statusFilter || tabConfig.status(item) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activeItems, search, statusFilter, tabConfig]);

  const changeTab = (key) => {
    setActiveTab(key);
    setSearch("");
    setStatusFilter("");
  };

  const handlePrint = () => {
    window.print();
  };

  const allErrors = Object.values(reports).filter((report) => report.error);

  return (
    <DashboardLayout title="Laporan Sistem Inventaris">
      <section className="page-header reports-page">
        <div>
          <span className="eyebrow">LAPORAN</span>
          <h2>Laporan Sistem Inventaris</h2>
          <p>Pantau rekap inventaris, peminjaman, perawatan, dan stok laboratorium.</p>
        </div>
        <div className="action-buttons">
          <button type="button" className="button secondary" onClick={loadReports} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="button primary print-button" onClick={handlePrint}>
            Cetak Laporan
          </button>
        </div>
      </section>

      {allErrors.length ? (
        <div className="alert danger">
          Sebagian endpoint laporan gagal dimuat. Tab yang berhasil tetap dapat dilihat.
        </div>
      ) : null}

      <div className="report-print-area">
        <section className="report-summary-grid">
          {summaryCards.map((card) => (
            <Card className="stat-card" key={card.label}>
              <span>{card.label}</span>
              <strong>{formatNumber(card.value)}</strong>
            </Card>
          ))}
        </section>

        <Card className="report-section">
          <div className="report-tabs">
            {tabs.map((tab) => (
              <button
                type="button"
                className={activeTab === tab.key ? "active" : ""}
                onClick={() => changeTab(tab.key)}
                key={tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeError ? <ErrorState message={activeError} onRetry={loadReports} /> : null}

          {!activeError ? (
            <>
              <div className="toolbar report-toolbar">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tabConfig.placeholder} />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">Semua Status</option>
                  {tabConfig.statuses.map((status) => (
                    <option value={status} key={status}>{formatLabel(status)}</option>
                  ))}
                </select>
              </div>

              <DataTable
                columns={tabConfig.columns}
                data={filteredItems}
                loading={loading}
                emptyTitle="Belum ada data"
                emptyMessage={activeItems.length ? "Tidak ada data yang sesuai filter." : tabConfig.empty}
              />
            </>
          ) : null}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminReportsPage;

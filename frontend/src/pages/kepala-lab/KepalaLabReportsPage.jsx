import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";
import { formatDate } from "../../utils/formatters.js";
import {
  formatCurrency,
  formatLabel,
  formatNumber,
  getBorrower,
  getBorrowingCode,
  getBorrowingLab,
  getCategoryName,
  getEquipmentCategory,
  getEquipmentCode,
  getEquipmentLab,
  getLabName,
  getMaintenanceCode,
  getMaintenanceEquipment,
  getMaintenanceLab,
  getMaintenanceUser,
  getStockCode,
  getStockLab,
  getStockMinimum,
  normalizeReport,
  safeNumber,
  statusVariant,
} from "./kepalaLabHelpers.js";

const tabs = [
  ["inventory", "Inventaris"],
  ["borrowings", "Peminjaman"],
  ["maintenances", "Perawatan"],
  ["stocks", "Stok Komponen"],
];

const emptyReports = {
  inventory: { items: [], summary: {}, error: "" },
  borrowings: { items: [], summary: {}, error: "" },
  maintenances: { items: [], summary: {}, error: "" },
  stocks: { items: [], summary: {}, error: "" },
};

const statusOptions = {
  inventory: ["tersedia", "dipinjam", "dalam_perawatan", "tidak_aktif"],
  borrowings: ["menunggu", "disetujui", "ditolak", "dipinjam", "pengembalian_diajukan", "selesai", "terlambat"],
  maintenances: ["proses", "selesai", "gagal"],
  stocks: ["aman", "menipis", "habis"],
};

const KepalaLabReportsPage = () => {
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

  const summaryCards = useMemo(() => {
    const inventoryItems = reports.inventory.items;
    const borrowingItems = reports.borrowings.items;
    const maintenanceItems = reports.maintenances.items;
    const stockItems = reports.stocks.items;
    return [
      ["Total Alat Lab", reports.inventory.summary.total_alat ?? inventoryItems.length],
      ["Alat Tersedia", reports.inventory.summary.total_tersedia ?? inventoryItems.filter((item) => item.status === "tersedia").length],
      ["Peminjaman Menunggu", reports.borrowings.summary.menunggu ?? borrowingItems.filter((item) => item.status === "menunggu").length],
      ["Peminjaman Selesai", reports.borrowings.summary.selesai ?? borrowingItems.filter((item) => item.status === "selesai").length],
      ["Perawatan Proses", reports.maintenances.summary.proses ?? maintenanceItems.filter((item) => item.status === "proses").length],
      [
        "Stok Menipis/Habis",
        safeNumber(reports.stocks.summary.menipis) + safeNumber(reports.stocks.summary.habis) ||
          stockItems.filter((item) => ["menipis", "habis"].includes(item.status)).length,
      ],
    ];
  }, [reports]);

  const tabConfig = useMemo(() => {
    const configs = {
      inventory: {
        placeholder: "Cari alat, kode inventaris, lab, atau kategori...",
        searchText: (item) => [getEquipmentCode(item), item.nama_alat, getLabName(getEquipmentLab(item)), getCategoryName(getEquipmentCategory(item))],
        status: (item) => item.status,
        empty: "Belum ada laporan inventaris.",
        columns: [
          { key: "no", label: "No", render: (_, index) => index + 1 },
          { key: "kode", label: "Kode Inventaris", render: (row) => getEquipmentCode(row) },
          { key: "nama", label: "Nama Alat", render: (row) => row.nama_alat || row.nama || "-" },
          { key: "lab", label: "Laboratorium", render: (row) => getLabName(getEquipmentLab(row)) },
          { key: "kategori", label: "Kategori", render: (row) => getCategoryName(getEquipmentCategory(row)) },
          { key: "kondisi", label: "Kondisi", render: (row) => formatLabel(row.kondisi) },
          { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge> },
          { key: "tahun", label: "Tahun Pengadaan", render: (row) => row.tahun_pengadaan || "-" },
        ],
      },
      borrowings: {
        placeholder: "Cari kode peminjaman, dosen, atau keperluan...",
        searchText: (item) => [getBorrowingCode(item), getBorrower(item)?.name, item.keperluan],
        status: (item) => item.status,
        empty: "Belum ada laporan peminjaman.",
        columns: [
          { key: "no", label: "No", render: (_, index) => index + 1 },
          { key: "kode", label: "Kode Peminjaman", render: (row) => getBorrowingCode(row) },
          { key: "dosen", label: "Dosen", render: (row) => getBorrower(row)?.name || "-" },
          { key: "lab", label: "Laboratorium", render: (row) => getBorrowingLab(row)?.nama_lab || "-" },
          { key: "pinjam", label: "Tanggal Pinjam", render: (row) => formatDate(row.tanggal_pinjam) },
          { key: "kembali", label: "Tanggal Kembali Rencana", render: (row) => formatDate(row.tanggal_kembali_rencana) },
          { key: "keperluan", label: "Keperluan", render: (row) => formatLabel(row.keperluan) },
          { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge> },
        ],
      },
      maintenances: {
        placeholder: "Cari alat, kode perawatan, teknisi, atau tindakan...",
        searchText: (item) => [getMaintenanceCode(item), getMaintenanceEquipment(item)?.nama_alat, getMaintenanceUser(item)?.name, item.tindakan, item.deskripsi_masalah],
        status: (item) => item.status,
        empty: "Belum ada laporan perawatan.",
        columns: [
          { key: "no", label: "No", render: (_, index) => index + 1 },
          { key: "kode", label: "Kode Perawatan", render: (row) => getMaintenanceCode(row) },
          { key: "alat", label: "Alat", render: (row) => getMaintenanceEquipment(row)?.nama_alat || "-" },
          { key: "lab", label: "Laboratorium", render: (row) => getMaintenanceLab(row)?.nama_lab || "-" },
          { key: "tanggal", label: "Tanggal Perawatan", render: (row) => formatDate(row.tanggal_perawatan) },
          { key: "jenis", label: "Jenis Perawatan", render: (row) => formatLabel(row.jenis_perawatan) },
          { key: "teknisi", label: "Teknisi", render: (row) => getMaintenanceUser(row)?.name || "-" },
          { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge> },
          { key: "biaya", label: "Biaya", render: (row) => formatCurrency(row.biaya) },
        ],
      },
      stocks: {
        placeholder: "Cari nama barang, kode stok, lab, atau lokasi...",
        searchText: (item) => [getStockCode(item), item.nama_barang, getStockLab(item)?.nama_lab, item.lokasi],
        status: (item) => item.status,
        empty: "Belum ada laporan stok.",
        columns: [
          { key: "no", label: "No", render: (_, index) => index + 1 },
          { key: "kode", label: "Kode Stok", render: (row) => <span className="stock-code">{getStockCode(row)}</span> },
          { key: "nama", label: "Nama Barang", render: (row) => row.nama_barang || row.nama_stok || row.nama || "-" },
          { key: "lab", label: "Laboratorium", render: (row) => getStockLab(row)?.nama_lab || "-" },
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

  const activeItems = reports[activeTab]?.items || [];
  const activeError = reports[activeTab]?.error || "";
  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return activeItems.filter((item) => {
      const matchesSearch =
        !keyword ||
        tabConfig.searchText(item)
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      return matchesSearch && (!statusFilter || tabConfig.status(item) === statusFilter);
    });
  }, [activeItems, search, statusFilter, tabConfig]);

  const changeTab = (key) => {
    setActiveTab(key);
    setSearch("");
    setStatusFilter("");
  };

  return (
    <DashboardLayout title="Laporan Laboratorium">
      <section className="page-header reports-page">
        <div>
          <span className="eyebrow">LAPORAN LAB</span>
          <h2>Laporan Laboratorium</h2>
          <p>Ringkasan inventaris, peminjaman, perawatan, dan stok pada laboratorium Anda.</p>
          <p className="muted">Laporan kepala lab bersifat read-only dan dapat dicetak.</p>
        </div>
        <div className="action-buttons">
          <button type="button" className="button secondary" onClick={loadReports} disabled={loading}>Refresh</button>
          <button type="button" className="button primary print-button" onClick={() => window.print()}>Cetak Laporan</button>
        </div>
      </section>

      {Object.values(reports).some((report) => report.error) ? <div className="alert danger">Sebagian endpoint laporan gagal dimuat.</div> : null}

      <div className="report-print-area">
        <section className="report-summary-grid">
          {summaryCards.map(([label, value]) => (
            <Card className="stat-card" key={label}>
              <span>{label}</span>
              <strong>{formatNumber(value)}</strong>
            </Card>
          ))}
        </section>

        <Card className="report-section">
          <div className="report-tabs">
            {tabs.map(([key, label]) => (
              <button type="button" className={activeTab === key ? "active" : ""} onClick={() => changeTab(key)} key={key}>
                {label}
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
                  {statusOptions[activeTab].map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}
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

export default KepalaLabReportsPage;

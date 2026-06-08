import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";
import { filterByLab, formatNumber, getEquipmentLab, getReturnStatus, getStockMinimum, safeNumber } from "./kepalaLabHelpers.js";

const quickLinks = [
  ["Inventaris Lab", "/kepala-lab/equipments"],
  ["Validasi Peminjaman", "/kepala-lab/borrowings"],
  ["Verifikasi Pengembalian", "/kepala-lab/returns"],
  ["Perawatan", "/kepala-lab/maintenances"],
  ["Stok Komponen", "/kepala-lab/stocks"],
  ["Laporan Lab", "/kepala-lab/reports"],
];

const KepalaLabDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalAlat: 0,
    tersedia: 0,
    peminjamanMenunggu: 0,
    pengembalianMenunggu: 0,
    perawatanProses: 0,
    stokPerluPerhatian: 0,
  });
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const [meResult, summaryResult, equipmentsResult, borrowingsResult, returnsResult, maintenancesResult, stocksResult] =
        await Promise.allSettled([
          get("/auth/me"),
          get("/dashboard/summary"),
          get("/equipments"),
          get("/borrowings"),
          get("/returns"),
          get("/maintenances"),
          get("/stocks"),
        ]);

      if (!active) return;

      const me = meResult.status === "fulfilled" ? meResult.value : null;
      const userLabId = me?.user?.lab_id || me?.laboratory?.id || null;
      const equipmentsRaw = equipmentsResult.status === "fulfilled" && Array.isArray(equipmentsResult.value) ? equipmentsResult.value : [];
      const equipments = filterByLab(equipmentsRaw, userLabId, (item) => item.lab_id || getEquipmentLab(item)?.id);
      const borrowings = borrowingsResult.status === "fulfilled" && Array.isArray(borrowingsResult.value) ? borrowingsResult.value : [];
      const returns = returnsResult.status === "fulfilled" && Array.isArray(returnsResult.value) ? returnsResult.value : [];
      const maintenances = maintenancesResult.status === "fulfilled" && Array.isArray(maintenancesResult.value) ? maintenancesResult.value : [];
      const stocks = stocksResult.status === "fulfilled" && Array.isArray(stocksResult.value) ? stocksResult.value : [];
      const summary = summaryResult.status === "fulfilled" ? summaryResult.value : {};

      setProfile(me);
      setStats({
        totalAlat: summary?.totalEquipments ?? equipments.length,
        tersedia: equipments.filter((item) => item.status === "tersedia").length,
        peminjamanMenunggu: borrowings.filter((item) => item.status === "menunggu").length,
        pengembalianMenunggu: returns.filter((item) => getReturnStatus(item) === "menunggu_verifikasi").length,
        perawatanProses: maintenances.filter((item) => item.status === "proses").length,
        stokPerluPerhatian: stocks.filter((item) => ["menipis", "habis"].includes(item.status) || safeNumber(item.jumlah) <= safeNumber(getStockMinimum(item))).length,
      });
      setWarnings(
        [meResult, summaryResult, equipmentsResult, borrowingsResult, returnsResult, maintenancesResult, stocksResult]
          .filter((result) => result.status === "rejected")
          .map((result) => result.reason?.message || "Sebagian data gagal dimuat.")
      );
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const systemStatuses = useMemo(
    () => [
      ["Backend terhubung", warnings.length ? "warning" : "success"],
      ["Akses kepala lab aktif", profile?.user?.role === "kepala_lab" ? "success" : "warning"],
      ["Data dibatasi sesuai laboratorium", profile?.laboratory ? "success" : "warning"],
    ],
    [profile, warnings.length]
  );

  return (
    <DashboardLayout title="Dashboard Kepala Laboratorium">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">KEPALA LAB</span>
          <h2>Dashboard Kepala Laboratorium</h2>
          <p>Kelola inventaris dan aktivitas laboratorium Anda.</p>
          <p className="muted">
            {profile?.user?.name || "Nama kepala lab belum dimuat"}
            {profile?.laboratory?.nama_lab ? ` - ${profile.laboratory.nama_lab}` : ""}
          </p>
        </div>
        <Badge variant="info">Area Lab</Badge>
      </section>

      {warnings.length ? <div className="alert danger">{warnings[0]}</div> : null}

      <section className="stat-grid">
        <Card className="stat-card"><span>Total Alat Lab</span><strong>{formatNumber(stats.totalAlat)}</strong></Card>
        <Card className="stat-card"><span>Alat Tersedia</span><strong>{formatNumber(stats.tersedia)}</strong></Card>
        <Card className="stat-card"><span>Peminjaman Menunggu</span><strong>{formatNumber(stats.peminjamanMenunggu)}</strong></Card>
        <Card className="stat-card"><span>Pengembalian Menunggu</span><strong>{formatNumber(stats.pengembalianMenunggu)}</strong></Card>
        <Card className="stat-card"><span>Perawatan Proses</span><strong>{formatNumber(stats.perawatanProses)}</strong></Card>
        <Card className="stat-card"><span>Stok Menipis/Habis</span><strong>{formatNumber(stats.stokPerluPerhatian)}</strong></Card>
      </section>

      <section className="dashboard-two-column">
        <Card title="Akses Cepat">
          <div className="quick-grid">
            {quickLinks.map(([label, path]) => (
              <Link to={path} key={path}>{label}</Link>
            ))}
          </div>
        </Card>
        <Card title="Status Sistem">
          <div className="status-list">
            {systemStatuses.map(([label, variant]) => (
              <span key={label}>
                <Badge variant={variant}>{variant === "success" ? "Aktif" : "Perlu Cek"}</Badge>
                {label}
              </span>
            ))}
          </div>
        </Card>
      </section>
    </DashboardLayout>
  );
};

export default KepalaLabDashboard;

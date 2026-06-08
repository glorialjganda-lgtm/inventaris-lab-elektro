import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";

const initialStats = {
  totalUser: 0,
  totalLaboratorium: 0,
  totalKategori: 0,
  totalAlat: 0,
  totalStok: 0,
  backend: "Memeriksa",
};

const readSummaryValue = (summary, keys) => {
  for (const key of keys) {
    if (typeof summary?.[key] === "number") return summary[key];
    if (typeof summary?.[key] === "string" && summary[key].trim() !== "") {
      const value = Number(summary[key]);
      if (Number.isFinite(value)) return value;
    }
  }

  return 0;
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      const [summaryResult, inventoryResult, stocksResult] = await Promise.allSettled([
        get("/dashboard/summary"),
        get("/reports/inventory"),
        get("/stocks"),
      ]);

      if (!active) return;

      const summary = summaryResult.status === "fulfilled" ? summaryResult.value : {};
      const inventory = inventoryResult.status === "fulfilled" ? inventoryResult.value : {};
      const stocks = stocksResult.status === "fulfilled" ? stocksResult.value : [];
      const inventorySummary = inventory?.summary || {};
      const stockList = Array.isArray(stocks) ? stocks : stocks?.data || [];

      setStats({
        totalUser: readSummaryValue(summary, ["totalUsers", "total_users"]),
        totalLaboratorium: readSummaryValue(summary, ["totalLabs", "total_labs", "totalLaboratories"]),
        totalKategori: readSummaryValue(summary, ["totalCategories", "total_categories"]),
        totalAlat: readSummaryValue(summary, ["totalEquipments", "total_equipments"]) || inventorySummary.total_alat || 0,
        totalStok: readSummaryValue(summary, ["totalStocks", "total_stocks"]) || stockList.length || 0,
        backend: summaryResult.status === "fulfilled" ? "Terhubung" : "Tidak Terhubung",
      });
    };

    loadStats();

    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardLayout title="Dashboard Admin Jurusan">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">Admin Jurusan</span>
          <h2>Dashboard Admin Jurusan</h2>
          <p>Pantau ringkasan inventaris dan aktivitas laboratorium Teknik Elektro.</p>
        </div>
        <Badge variant={stats.backend === "Terhubung" ? "success" : "warning"}>
          Backend {stats.backend}
        </Badge>
      </section>

      <section className="stat-grid">
        <Card className="stat-card"><span>Total User</span><strong>{stats.totalUser}</strong></Card>
        <Card className="stat-card"><span>Total Laboratorium</span><strong>{stats.totalLaboratorium}</strong></Card>
        <Card className="stat-card"><span>Total Kategori</span><strong>{stats.totalKategori}</strong></Card>
        <Card className="stat-card"><span>Total Alat</span><strong>{stats.totalAlat}</strong></Card>
        <Card className="stat-card"><span>Total Stok</span><strong>{stats.totalStok}</strong></Card>
        <Card className="stat-card"><span>Status Backend</span><strong>{stats.backend}</strong></Card>
      </section>

      <section className="dashboard-two-column">
        <Card title="Akses Cepat">
          <div className="quick-grid">
            <Link to="/admin/users">Kelola Pengguna</Link>
            <Link to="/admin/laboratories">Data Laboratorium</Link>
            <Link to="/admin/categories">Data Kategori</Link>
            <Link to="/admin/profile">Profil Admin</Link>
          </div>
        </Card>
        <Card title="Status Sistem">
          <div className="status-list">
            <span>
              <Badge variant={stats.backend === "Terhubung" ? "success" : "warning"}>
                {stats.backend === "Terhubung" ? "Aktif" : "Cek"}
              </Badge>
              Backend {stats.backend.toLowerCase()}
            </span>
            <span><Badge variant="info">Siap</Badge> Login role aktif</span>
            <span><Badge variant="neutral">API</Badge> Endpoint siap digunakan</span>
          </div>
        </Card>
      </section>
    </DashboardLayout>
  );
};

export default AdminDashboard;

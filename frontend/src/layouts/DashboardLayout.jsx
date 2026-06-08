import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../services/authService.js";
import { getUser } from "../utils/auth.js";
import { formatRole } from "../utils/formatters.js";

const menus = {
  admin_jurusan: [
    ["Dashboard", "/admin/dashboard"],
    ["Pengguna", "/admin/users"],
    ["Laboratorium", "/admin/laboratories"],
    ["Kategori", "/admin/categories"],
    ["Inventaris", "/admin/equipments"],
    ["Peminjaman", "/admin/borrowings"],
    ["Pengembalian", "/admin/returns"],
    ["Perawatan", "/admin/maintenances"],
    ["Stok Komponen", "/admin/stocks"],
    ["Laporan", "/admin/reports"],
    ["Profil", "/admin/profile"],
  ],
  kepala_lab: [
    ["Dashboard", "/kepala-lab/dashboard"],
    ["Inventaris Lab", "/kepala-lab/equipments"],
    ["Validasi Peminjaman", "/kepala-lab/borrowings"],
    ["Verifikasi Pengembalian", "/kepala-lab/returns"],
    ["Perawatan", "/kepala-lab/maintenances"],
    ["Stok Komponen", "/kepala-lab/stocks"],
    ["Laporan Lab", "/kepala-lab/reports"],
    ["Profil", "/kepala-lab/profile"],
  ],
  dosen: [
    ["Dashboard", "/dosen/dashboard"],
    ["Alat Tersedia", "/dosen/equipments"],
    ["Ajukan Peminjaman", "/dosen/borrowings/create"],
    ["Status Peminjaman", "/dosen/borrowings/status"],
    ["Persetujuan Mahasiswa", "/dosen/student-approvals"],
    ["Riwayat", "/dosen/history"],
    ["Profil", "/dosen/profile"],
  ],
  mahasiswa: [
    ["Dashboard", "/mahasiswa/dashboard"],
    ["Alat Tersedia", "/mahasiswa/equipments"],
    ["Ajukan Peminjaman", "/mahasiswa/borrowings/create"],
    ["Status Peminjaman", "/mahasiswa/borrowings/status"],
    ["Riwayat", "/mahasiswa/history"],
    ["Profil", "/mahasiswa/profile"],
  ],
};

const DashboardLayout = ({ title, children }) => {
  const navigate = useNavigate();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuItems = useMemo(() => menus[user?.role] || [], [user?.role]);
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    []
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-shell">
      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Tutup menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">IE</span>
          <div>
            <strong>Inventaris Lab</strong>
            <small>Teknik Elektro</small>
          </div>
        </div>

        <div className="sidebar-context">
          <span>Role aktif</span>
          <strong>{formatRole(user?.role)}</strong>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(([label, path]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setSidebarOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <button
            className="icon-button sidebar-toggle"
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label="Toggle menu"
          >
            Menu
          </button>
          <div className="topbar-title">
            <h1>{title}</h1>
            <p>{today} • Sistem Inventaris Laboratorium</p>
          </div>
          <div className="topbar-user">
            <div className="user-chip">
              <span>{user?.name || "User"}</span>
              <small>{formatRole(user?.role)}</small>
            </div>
            <button type="button" className="button danger small" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;

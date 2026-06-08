import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";
import {
  getArrayData,
  isBorrowingReturnable,
  isEquipmentAvailable,
  isGoodCondition,
} from "./mahasiswaHelpers.js";

const MahasiswaDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    alatTersedia: 0,
    totalPengajuan: 0,
    menungguDosen: 0,
    menungguKepalaLab: 0,
    dipinjam: 0,
    selesai: 0,
  });

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const [meResult, equipmentsResult, borrowingsResult] = await Promise.allSettled([
        get("/auth/me"),
        get("/equipments"),
        get("/borrowings"),
      ]);

      if (!active) return;

      const equipments = equipmentsResult.status === "fulfilled" ? getArrayData(equipmentsResult.value) : [];
      const borrowings = borrowingsResult.status === "fulfilled" ? getArrayData(borrowingsResult.value) : [];

      setProfile(meResult.status === "fulfilled" ? meResult.value : null);
      setStats({
        alatTersedia: equipments.filter((item) => isEquipmentAvailable(item) && isGoodCondition(item)).length,
        totalPengajuan: borrowings.length,
        menungguDosen: borrowings.filter((item) => item.dosen_approval_status === "menunggu").length,
        menungguKepalaLab: borrowings.filter((item) => item.dosen_approval_status === "disetujui" && item.status === "menunggu").length,
        dipinjam: borrowings.filter(isBorrowingReturnable).length,
        selesai: borrowings.filter((item) => item.status === "selesai").length,
      });
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardLayout title="Dashboard Mahasiswa">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">MAHASISWA</span>
          <h2>Dashboard Mahasiswa</h2>
          <p>Ajukan peminjaman alat laboratorium melalui dosen penanggung jawab.</p>
          <p className="muted">Selamat datang, {profile?.user?.name || "Mahasiswa"}</p>
        </div>
        <Badge variant="info">MAHASISWA</Badge>
      </section>

      <section className="stat-grid">
        <Card className="stat-card"><span>Alat Tersedia</span><strong>{stats.alatTersedia}</strong></Card>
        <Card className="stat-card"><span>Total Pengajuan Saya</span><strong>{stats.totalPengajuan}</strong></Card>
        <Card className="stat-card"><span>Menunggu Persetujuan Dosen</span><strong>{stats.menungguDosen}</strong></Card>
        <Card className="stat-card"><span>Menunggu Validasi Kepala Lab</span><strong>{stats.menungguKepalaLab}</strong></Card>
        <Card className="stat-card"><span>Sedang Dipinjam</span><strong>{stats.dipinjam}</strong></Card>
        <Card className="stat-card"><span>Selesai</span><strong>{stats.selesai}</strong></Card>
      </section>

      <section className="dashboard-two-column">
        <Card title="Akses Cepat">
          <div className="quick-grid">
            <Link to="/mahasiswa/equipments">Lihat Alat Tersedia</Link>
            <Link to="/mahasiswa/borrowings/create">Ajukan Peminjaman</Link>
            <Link to="/mahasiswa/borrowings/status">Status Peminjaman</Link>
            <Link to="/mahasiswa/history">Riwayat</Link>
          </div>
        </Card>

        <Card title="Alur Peminjaman">
          <div className="flow-note">
            Mahasiswa mengajukan peminjaman - Dosen menyetujui - Kepala Lab memvalidasi - Alat digunakan - Pengembalian diverifikasi.
          </div>
        </Card>
      </section>
    </DashboardLayout>
  );
};

export default MahasiswaDashboard;

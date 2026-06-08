import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";
import { canReturnBorrowing, isEquipmentAvailable, isGoodCondition, pickArray } from "./dosenHelpers.js";

const DosenDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    alatTersedia: 0,
    totalPengajuan: 0,
    menunggu: 0,
    dipinjam: 0,
    selesai: 0,
    pengajuanMahasiswaMenunggu: 0,
  });

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const [meResult, equipmentsResult, borrowingsResult, returnsResult, studentApprovalsResult] = await Promise.allSettled([
        get("/auth/me"),
        get("/equipments"),
        get("/borrowings"),
        get("/returns"),
        get("/borrowings/dosen-approvals"),
      ]);

      if (!active) return;

      const me = meResult.status === "fulfilled" ? meResult.value : null;
      const equipments = equipmentsResult.status === "fulfilled" ? pickArray(equipmentsResult.value, ["equipments"]) : [];
      const borrowings = borrowingsResult.status === "fulfilled" ? pickArray(borrowingsResult.value, ["borrowings"]) : [];
      const returns = returnsResult.status === "fulfilled" ? pickArray(returnsResult.value, ["returns"]) : [];
      const studentApprovals = studentApprovalsResult.status === "fulfilled" ? pickArray(studentApprovalsResult.value, ["borrowings"]) : [];

      setProfile(me);
      setStats({
        alatTersedia: equipments.filter((item) => isEquipmentAvailable(item) && isGoodCondition(item)).length,
        totalPengajuan: borrowings.length,
        menunggu: borrowings.filter((item) => item.status === "menunggu").length,
        dipinjam: borrowings.filter(canReturnBorrowing).length,
        selesai: borrowings.filter((item) => item.status === "selesai").length,
        pengembalian: returns.length,
        pengajuanMahasiswaMenunggu: studentApprovals.filter((item) => item.dosen_approval_status === "menunggu").length,
      });
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardLayout title="Dashboard Dosen">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">Dosen</span>
          <h2>Dashboard Dosen</h2>
          <p>Ajukan peminjaman alat laboratorium dan pantau status pengajuan Anda.</p>
          <p className="muted">Selamat datang, {profile?.user?.name || "Dosen"}</p>
          <p className="muted">Ajukan peminjaman, divalidasi kepala lab/admin, gunakan alat, ajukan pengembalian, lalu diverifikasi.</p>
        </div>
        <Badge variant="success">Siap Mengajukan</Badge>
      </section>

      <section className="stat-grid">
        <Card className="stat-card"><span>Alat Tersedia</span><strong>{stats.alatTersedia}</strong></Card>
        <Card className="stat-card"><span>Total Pengajuan</span><strong>{stats.totalPengajuan}</strong></Card>
        <Card className="stat-card"><span>Menunggu</span><strong>{stats.menunggu}</strong></Card>
        <Card className="stat-card"><span>Dipinjam</span><strong>{stats.dipinjam}</strong></Card>
        <Card className="stat-card"><span>Selesai</span><strong>{stats.selesai}</strong></Card>
        <Card className="stat-card"><span>Pengajuan Mahasiswa Menunggu</span><strong>{stats.pengajuanMahasiswaMenunggu}</strong></Card>
      </section>

      <Card title="Akses Cepat">
        <div className="quick-grid">
          <Link to="/dosen/equipments">Lihat Alat Tersedia</Link>
          <Link to="/dosen/borrowings/create">Ajukan Peminjaman</Link>
          <Link to="/dosen/borrowings/status">Status Peminjaman</Link>
          <Link to="/dosen/student-approvals">Persetujuan Mahasiswa</Link>
          <Link to="/dosen/history">Riwayat</Link>
        </div>
      </Card>
    </DashboardLayout>
  );
};

export default DosenDashboard;

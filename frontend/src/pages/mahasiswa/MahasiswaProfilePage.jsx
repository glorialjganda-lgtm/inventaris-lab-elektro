import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";
import { formatStatusLabel, getStatusBadgeVariant } from "./mahasiswaHelpers.js";

const MahasiswaProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      setProfile(await get("/auth/me"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const user = profile?.user || {};

  return (
    <DashboardLayout title="Profil Mahasiswa">
      <section className="page-header">
        <div>
          <span className="eyebrow">PROFIL</span>
          <h2>Profil Mahasiswa</h2>
          <p>Informasi akun mahasiswa.</p>
          <p className="muted">Perubahan data akun dilakukan oleh Admin Jurusan.</p>
        </div>
      </section>

      {error ? <ErrorState message={error} onRetry={loadProfile} /> : null}
      {!error ? (
        <Card title="Informasi Akun">
          {loading ? (
            <div className="state-box"><span className="spinner" /><p>Memuat data...</p></div>
          ) : (
            <div className="detail-grid">
              <span><b>Nama</b>{user.name || "-"}</span>
              <span><b>Email</b>{user.email || "-"}</span>
              <span><b>Role</b><Badge variant="info">{formatStatusLabel(user.role)}</Badge></span>
              <span><b>NIM / Nomor Induk</b>{user.nomor_induk || "-"}</span>
              <span><b>No HP</b>{user.no_hp || "-"}</span>
              <span><b>Status Akun</b><Badge variant={getStatusBadgeVariant(user.status)}>{formatStatusLabel(user.status)}</Badge></span>
            </div>
          )}
        </Card>
      ) : null}
    </DashboardLayout>
  );
};

export default MahasiswaProfilePage;

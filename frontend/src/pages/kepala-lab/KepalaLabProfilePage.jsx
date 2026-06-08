import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";
import { formatLabel, statusVariant } from "./kepalaLabHelpers.js";

const KepalaLabProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await get("/auth/me");
      setProfile(data);
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
  const lab = profile?.laboratory || null;

  return (
    <DashboardLayout title="Profil Kepala Lab">
      <section className="page-header">
        <div>
          <span className="eyebrow">PROFIL</span>
          <h2>Profil Kepala Laboratorium</h2>
          <p>Informasi akun dan laboratorium yang terhubung.</p>
          <p className="muted">Profil kepala lab bersifat read-only untuk informasi akun dan lab.</p>
        </div>
      </section>

      {error ? <ErrorState message={error} onRetry={loadProfile} /> : null}
      {!error ? (
        <section className="dashboard-two-column">
          <Card title="Informasi Akun">
            {loading ? (
              <div className="state-box"><span className="spinner" /><p>Memuat data...</p></div>
            ) : (
              <div className="detail-grid">
                <span><b>Nama</b>{user.name || "-"}</span>
                <span><b>Email</b>{user.email || "-"}</span>
                <span><b>Role</b><Badge variant="info">{formatLabel(user.role)}</Badge></span>
                <span><b>Nomor Induk</b>{user.nomor_induk || "-"}</span>
                <span><b>No HP</b>{user.no_hp || "-"}</span>
                <span><b>Status</b><Badge variant={statusVariant(user.status)}>{formatLabel(user.status)}</Badge></span>
              </div>
            )}
          </Card>
          <Card title="Informasi Laboratorium">
            {loading ? (
              <div className="state-box"><span className="spinner" /><p>Memuat data...</p></div>
            ) : lab ? (
              <div className="detail-grid">
                <span><b>Laboratorium</b>{lab.nama_lab || "-"}</span>
                <span><b>Kode Lab</b>{lab.kode_lab || "-"}</span>
                <span><b>Lokasi Lab</b>{lab.lokasi || "-"}</span>
                <span><b>Status Lab</b><Badge variant={statusVariant(lab.status)}>{formatLabel(lab.status)}</Badge></span>
                <span className="detail-span"><b>Deskripsi Lab</b>{lab.deskripsi || "-"}</span>
              </div>
            ) : (
              <div className="state-box">
                <h3>Belum terhubung dengan laboratorium.</h3>
                <p>Data laboratorium akan tampil setelah akun dihubungkan dengan lab.</p>
              </div>
            )}
          </Card>
        </section>
      ) : null}
    </DashboardLayout>
  );
};

export default KepalaLabProfilePage;

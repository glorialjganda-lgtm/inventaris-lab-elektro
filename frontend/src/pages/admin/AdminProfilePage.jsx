import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import Loading from "../../components/common/Loading.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";
import { formatRole } from "../../utils/formatters.js";

const AdminProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await get("/auth/me");
      setProfile(data?.user || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <DashboardLayout title="Profil Admin">
      <section className="page-header">
        <div>
          <span className="eyebrow">Akun</span>
          <h2>Profil Admin</h2>
          <p>Informasi akun admin jurusan yang sedang login.</p>
        </div>
      </section>

      {loading ? <Loading /> : null}
      {error ? <ErrorState message={error} onRetry={loadProfile} /> : null}
      {!loading && !error && profile ? (
        <Card title="Informasi Akun">
          <div className="detail-grid profile-grid">
            <span><b>Nama</b>{profile.name || "-"}</span>
            <span><b>Email</b>{profile.email || "-"}</span>
            <span><b>Role</b><Badge variant="danger">{formatRole(profile.role)}</Badge></span>
            <span><b>Nomor Induk</b>{profile.nomor_induk || "-"}</span>
            <span><b>No HP</b>{profile.no_hp || "-"}</span>
            <span><b>Status</b><Badge variant={profile.status === "aktif" ? "success" : "neutral"}>{profile.status}</Badge></span>
          </div>
        </Card>
      ) : null}
    </DashboardLayout>
  );
};

export default AdminProfilePage;

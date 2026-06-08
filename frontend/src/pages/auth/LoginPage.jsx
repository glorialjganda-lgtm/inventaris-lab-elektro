import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import authService from "../../services/authService.js";
import { getDashboardPathByRole, getUser, isAuthenticated } from "../../utils/auth.js";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to={getDashboardPathByRole(getUser()?.role)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const data = await authService.login(email, password);
      navigate(getDashboardPathByRole(data.user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <section className="login-brand">
        <Link to="/" className="auth-back">Kembali ke Beranda</Link>
        <span className="login-badge">Inventaris Lab Elektro</span>
        <h1>Masuk ke Sistem Inventaris Laboratorium</h1>
        <p>
          Akses dashboard sesuai peran untuk mengelola inventaris, peminjaman,
          pengembalian, perawatan, stok, dan laporan.
        </p>
        <ul className="login-points">
          <li>Akses berbasis role</li>
          <li>Data inventaris terpusat</li>
          <li>Alur peminjaman terdokumentasi</li>
        </ul>
      </section>

      <section className="login-card">
        <div className="login-card-heading">
          <span className="brand-mark">IE</span>
          <div>
            <h2>Login</h2>
            <p>Akses hanya untuk pengguna resmi. Akun dikelola oleh Admin Jurusan.</p>
            <p className="muted">Akun mahasiswa dibuat dan dikelola oleh Admin Jurusan.</p>
          </div>
        </div>

        {error ? <div className="alert danger">{error}</div> : null}

        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@elektro.test"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Masukkan password"
              required
            />
          </label>
          <button type="submit" className="button primary full" disabled={loading}>
            {loading ? "Memproses..." : "Login"}
          </button>
        </form>
      </section>
    </AuthLayout>
  );
};

export default LoginPage;

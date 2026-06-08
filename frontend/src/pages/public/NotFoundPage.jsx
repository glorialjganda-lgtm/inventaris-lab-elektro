import { Link } from "react-router-dom";
import { getDashboardPathByRole, getUser, isAuthenticated } from "../../utils/auth.js";

const NotFoundPage = () => {
  const target = isAuthenticated() ? getDashboardPathByRole(getUser()?.role) : "/";

  return (
    <main className="center-page">
      <section className="message-card">
        <span className="status-code">404</span>
        <h1>Halaman Tidak Ditemukan</h1>
        <p>Halaman yang Anda buka tidak tersedia.</p>
        <Link to={target} className="button primary">
          {isAuthenticated() ? "Kembali ke Dashboard" : "Kembali ke Beranda"}
        </Link>
      </section>
    </main>
  );
};

export default NotFoundPage;

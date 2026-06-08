import { Link } from "react-router-dom";
import { getDashboardPathByRole, getUser, isAuthenticated } from "../../utils/auth.js";

const UnauthorizedPage = () => {
  const target = isAuthenticated() ? getDashboardPathByRole(getUser()?.role) : "/login";

  return (
    <main className="center-page">
      <section className="message-card">
        <span className="status-code">403</span>
        <h1>Akses Ditolak</h1>
        <p>Anda tidak memiliki izin untuk membuka halaman ini.</p>
        <Link to={target} className="button primary">
          {isAuthenticated() ? "Kembali ke Dashboard" : "Ke Login"}
        </Link>
      </section>
    </main>
  );
};

export default UnauthorizedPage;

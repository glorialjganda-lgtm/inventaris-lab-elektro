import { Link } from "react-router-dom";
import Button from "../../components/ui/Button.jsx";

const features = [
  ["▦", "Manajemen Laboratorium", "Kelola data lab, lokasi, dan penanggung jawab secara terpusat."],
  ["⚙", "Inventaris Alat", "Catat alat, kondisi, status, kategori, dan lokasi detailnya."],
  ["⇄", "Peminjaman Dosen", "Pengajuan peminjaman alat terdokumentasi dari awal."],
  ["✓", "Validasi Kepala Lab", "Validasi aktivitas lab sesuai kewenangan peran."],
  ["↩", "Pengembalian Alat", "Catat kondisi alat saat kembali dan tindak lanjutnya."],
  ["◇", "Perawatan Alat", "Pantau perawatan, perbaikan, kalibrasi, dan histori alat."],
  ["▤", "Stok Komponen", "Kelola stok bahan habis pakai dan transaksi keluar masuk."],
  ["◷", "Laporan", "Lihat ringkasan inventaris, peminjaman, perawatan, dan stok."],
];

const flows = [
  ["Dosen memilih alat", "Dosen melihat alat yang tersedia dan layak dipinjam."],
  ["Dosen mengajukan peminjaman", "Detail kegiatan dan tanggal penggunaan dicatat."],
  ["Kepala Lab/Admin memvalidasi", "Pengajuan disetujui atau ditolak sesuai kondisi alat."],
  ["Alat digunakan", "Status alat berubah dan aktivitas terekam di sistem."],
  ["Dosen mengajukan pengembalian", "Pengembalian diajukan setelah alat selesai digunakan."],
  ["Kepala Lab/Admin memverifikasi", "Kondisi akhir alat diperiksa dan status diperbarui."],
];

const roles = [
  ["Admin Jurusan", "Mengelola user, lab, kategori, inventaris, laporan seluruh jurusan."],
  ["Kepala Lab", "Mengelola inventaris dan validasi aktivitas pada laboratoriumnya."],
  ["Dosen", "Melihat alat, mengajukan peminjaman, dan mengajukan pengembalian."],
  ["Mahasiswa", "Mahasiswa dapat melihat alat tersedia, mengajukan peminjaman melalui dosen penanggung jawab, memantau status, dan mengajukan pengembalian."],
];

const LandingPage = () => {
  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="landing-page">
      <header className="public-navbar">
        <Link to="/" className="public-logo">
          <span className="public-logo-mark">IE</span>
          <span>
            Inventaris Lab Elektro
            <small>Teknik Elektro</small>
          </span>
        </Link>
        <nav>
          <button type="button" className="nav-section-link" onClick={() => scrollToSection("beranda")}>Beranda</button>
          <button type="button" className="nav-section-link" onClick={() => scrollToSection("fitur")}>Fitur</button>
          <button type="button" className="nav-section-link" onClick={() => scrollToSection("role")}>Role</button>
          <button type="button" className="nav-section-link" onClick={() => scrollToSection("alur-sistem")}>Alur Sistem</button>
          <Link to="/login" className="nav-login">Login</Link>
        </nav>
      </header>

      <main>
        <section id="beranda" className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">Sistem Terdistribusi Laboratorium</span>
            <h1>Kelola Inventaris Laboratorium Teknik Elektro dengan Lebih Tertib</h1>
            <p>
              Sistem ini membantu jurusan mengelola alat laboratorium, peminjaman dosen,
              pengembalian, perawatan, stok komponen, dan laporan secara terintegrasi.
            </p>
            <div className="hero-actions">
              <Link to="/login">
                <Button>Masuk ke Sistem</Button>
              </Link>
              <button type="button" className="button secondary" onClick={() => scrollToSection("fitur")}>Lihat Fitur</button>
            </div>
            <div className="hero-stats">
              <span>Multi Lab</span>
              <span>Role Based Access</span>
              <span>Peminjaman Terdokumentasi</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="dashboard-mockup">
              <div className="mockup-top">
                <div>
                  <strong>Dashboard Inventaris</strong>
                  <small>Monitoring Laboratorium</small>
                </div>
                <span className="mockup-pill">Online</span>
              </div>
              <div className="mockup-stats">
                <div><strong>128</strong><span>Alat</span></div>
                <div><strong>12</strong><span>Lab</span></div>
                <div><strong>34</strong><span>Pinjam</span></div>
              </div>
              <div className="mockup-body">
                <div className="mockup-bars">
                  <span style={{ height: "46%" }} />
                  <span style={{ height: "72%" }} />
                  <span style={{ height: "58%" }} />
                  <span style={{ height: "88%" }} />
                </div>
                <div className="mockup-list">
                  <span><b>Tersedia</b><em>Oscilloscope</em></span>
                  <span><b>Dipinjam</b><em>Function Generator</em></span>
                  <span><b>Perawatan</b><em>Power Supply</em></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="section">
          <div className="section-heading">
            <span className="eyebrow">Fitur</span>
            <h2>Fitur utama sistem inventaris</h2>
          </div>
          <div className="feature-grid">
            {features.map(([icon, title, description]) => (
              <article className="feature-card" key={title}>
                <span className="feature-icon">{icon}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="role" className="section role-section">
          <div className="section-heading">
            <span className="eyebrow">Role Sistem</span>
            <h2>Akses sistem berdasarkan peran</h2>
          </div>
          <div className="role-grid">
            {roles.map(([title, description]) => (
              <article className="role-card" key={title}>
                <span>{title.slice(0, 1)}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="alur-sistem" className="section flow-section">
          <div className="section-heading">
            <span className="eyebrow">Alur Sistem</span>
            <h2>Proses peminjaman dibuat jelas dari awal sampai akhir</h2>
          </div>
          <div className="flow-list">
            {flows.map(([title, description], index) => (
              <article className="flow-item" key={title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-section">
          <h2>Siap mengelola inventaris laboratorium dengan lebih rapi?</h2>
          <Link to="/login">
            <Button>Login Sekarang</Button>
          </Link>
        </section>
      </main>

      <footer className="public-footer">
        <strong>Inventaris Lab Elektro</strong>
        <span>Jurusan Teknik Elektro</span>
        <span>Teknologi Web</span>
        <span>Sistem Informasi Inventaris Laboratorium</span>
      </footer>
    </div>
  );
};

export default LandingPage;

const EmptyState = ({ title = "Data kosong", description = "Belum ada data untuk ditampilkan." }) => (
  <div className="state-box">
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

export default EmptyState;

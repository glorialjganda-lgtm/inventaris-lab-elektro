const ErrorState = ({ message = "Terjadi kesalahan.", onRetry }) => (
  <div className="state-box error">
    <h3>Gagal memuat</h3>
    <p>{message}</p>
    {onRetry ? (
      <button type="button" className="button primary" onClick={onRetry}>
        Coba Lagi
      </button>
    ) : null}
  </div>
);

export default ErrorState;

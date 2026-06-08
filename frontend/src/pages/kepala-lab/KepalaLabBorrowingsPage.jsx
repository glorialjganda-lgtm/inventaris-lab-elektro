import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get, put } from "../../services/api.js";
import { formatDate } from "../../utils/formatters.js";
import {
  formatLabel,
  getBorrower,
  getBorrowingCode,
  getBorrowingDetails,
  getBorrowingLab,
  getEquipmentCode,
  getMahasiswa,
  statusVariant,
} from "./kepalaLabHelpers.js";

const statusOptions = ["menunggu", "disetujui", "ditolak", "dipinjam", "pengembalian_diajukan", "selesai", "terlambat"];
const canValidateBorrowing = (item) => item?.status === "menunggu";

const KepalaLabBorrowingsPage = () => {
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await get("/borrowings");
      setBorrowings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredBorrowings = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return borrowings.filter((item) => {
      const borrower = getBorrower(item);
      const matchesSearch =
        !keyword ||
        [getBorrowingCode(item), borrower?.name, item.nama_kegiatan, item.keperluan]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      return matchesSearch && (!statusFilter || item.status === statusFilter);
    });
  }, [borrowings, search, statusFilter]);

  const hasPendingBorrowing = useMemo(() => borrowings.some(canValidateBorrowing), [borrowings]);

  const openDetail = async (item) => {
    setError("");
    try {
      const detail = await get(`/borrowings/${item.id}`);
      setSelectedBorrowing(detail || item);
      setModalMode("detail");
    } catch (err) {
      setError(err.message);
    }
  };

  const openApprove = (item) => {
    setSelectedBorrowing(item);
    setModalMode("approve");
    setError("");
  };

  const openReject = (item) => {
    setSelectedBorrowing(item);
    setRejectReason("");
    setModalMode("reject");
    setError("");
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setSelectedBorrowing(null);
    setRejectReason("");
  };

  const handleApprove = async () => {
    if (!selectedBorrowing) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await put(`/borrowings/${selectedBorrowing.id}/approve`, {});
      setNotice("Peminjaman berhasil disetujui.");
      setModalMode(null);
      setSelectedBorrowing(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (event) => {
    event.preventDefault();
    if (!selectedBorrowing) return;
    if (!rejectReason.trim()) {
      setError("Alasan penolakan wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await put(`/borrowings/${selectedBorrowing.id}/reject`, { alasan_penolakan: rejectReason.trim() });
      setNotice("Peminjaman berhasil ditolak.");
      setModalMode(null);
      setSelectedBorrowing(null);
      setRejectReason("");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "no", label: "No", render: (_, index) => index + 1 },
    { key: "kode", label: "Kode Peminjaman", render: (row) => getBorrowingCode(row) },
    { key: "dosen", label: "Dosen", render: (row) => getBorrower(row)?.name || "-" },
    { key: "pinjam", label: "Tanggal Pinjam", render: (row) => formatDate(row.tanggal_pinjam) },
    { key: "kembali", label: "Tanggal Kembali Rencana", render: (row) => formatDate(row.tanggal_kembali_rencana) },
    { key: "keperluan", label: "Keperluan", render: (row) => formatLabel(row.keperluan) },
    { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge> },
  ];

  return (
    <DashboardLayout title="Validasi Peminjaman">
      <section className="page-header">
        <div>
          <span className="eyebrow">PEMINJAMAN</span>
          <h2>Validasi Peminjaman</h2>
          <p>Validasi pengajuan peminjaman alat pada laboratorium Anda.</p>
          <p className="muted">Kepala lab hanya dapat memvalidasi pengajuan peminjaman pada laboratorium yang menjadi tanggung jawabnya.</p>
        </div>
      </section>
      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode ? <ErrorState message={error} onRetry={loadData} /> : null}
      <Card>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode peminjaman, dosen, kegiatan, atau keperluan..." />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Semua Status</option>
            {statusOptions.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}
          </select>
          <button type="button" className="button secondary" onClick={loadData}>Refresh</button>
        </div>
        <div className="alert info">
          Tombol validasi hanya muncul pada data yang masih berstatus menunggu. Data yang sudah selesai hanya dapat dilihat melalui tombol Detail.
        </div>
        <div className="alert info">
          Pengajuan mahasiswa hanya muncul setelah disetujui oleh dosen penanggung jawab.
        </div>
        {!loading && borrowings.length && !hasPendingBorrowing ? (
          <div className="alert warning">
            Tidak ada pengajuan yang perlu divalidasi saat ini. Data yang sudah selesai hanya dapat dilihat detailnya.
          </div>
        ) : null}
        <DataTable
          columns={columns}
          data={filteredBorrowings}
          loading={loading}
          emptyTitle="Belum ada data peminjaman"
          emptyMessage={borrowings.length ? "Tidak ada peminjaman yang sesuai filter." : "Pengajuan peminjaman lab akan tampil di sini."}
          actions={(row) => (
            <div className="action-buttons">
              {canValidateBorrowing(row) ? (
                <>
                  <button type="button" className="button success small" onClick={() => openApprove(row)}>Setujui</button>
                  <button type="button" className="button danger small" onClick={() => openReject(row)}>Tolak</button>
                </>
              ) : null}
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>Detail</button>
            </div>
          )}
        />
      </Card>

      <Modal open={modalMode === "detail"} title="Detail Peminjaman" onClose={closeModal}>
        {selectedBorrowing ? (
          <div className="detail-section">
            <div className="detail-grid">
              <span><b>Kode Peminjaman</b>{getBorrowingCode(selectedBorrowing)}</span>
              <span><b>Mahasiswa Pengaju</b>{getMahasiswa(selectedBorrowing)?.name || "-"}</span>
              <span><b>NIM / Nomor Induk Mahasiswa</b>{getMahasiswa(selectedBorrowing)?.nomor_induk || "-"}</span>
              <span><b>Dosen Penanggung Jawab</b>{getBorrower(selectedBorrowing)?.name || "-"}</span>
              <span><b>Email Dosen</b>{getBorrower(selectedBorrowing)?.email || "-"}</span>
              <span><b>Laboratorium</b>{getBorrowingLab(selectedBorrowing)?.nama_lab || "-"}</span>
              <span><b>Tanggal Pinjam</b>{formatDate(selectedBorrowing.tanggal_pinjam)}</span>
              <span><b>Tanggal Kembali Rencana</b>{formatDate(selectedBorrowing.tanggal_kembali_rencana)}</span>
              <span><b>Keperluan</b>{formatLabel(selectedBorrowing.keperluan)}</span>
              <span><b>Status</b><Badge variant={statusVariant(selectedBorrowing.status)}>{formatLabel(selectedBorrowing.status)}</Badge></span>
              <span><b>Status Persetujuan Dosen</b><Badge variant={statusVariant(selectedBorrowing.dosen_approval_status)}>{formatLabel(selectedBorrowing.dosen_approval_status)}</Badge></span>
              <span><b>Tanggal Persetujuan Dosen</b>{formatDate(selectedBorrowing.dosen_approved_at)}</span>
              <span className="detail-span"><b>Nama Kegiatan</b>{selectedBorrowing.nama_kegiatan || "-"}</span>
              <span className="detail-span"><b>Catatan Pengajuan</b>{selectedBorrowing.catatan_pengajuan || "-"}</span>
              <span className="detail-span"><b>Catatan Dosen</b>{selectedBorrowing.dosen_approval_note || "-"}</span>
              <span className="detail-span"><b>Alasan Penolakan</b>{selectedBorrowing.alasan_penolakan || "-"}</span>
            </div>
            <h3 className="detail-title">Daftar Alat</h3>
            <div className="item-list">
              {getBorrowingDetails(selectedBorrowing).length ? getBorrowingDetails(selectedBorrowing).map((detail, index) => {
                const equipment = detail.equipments || detail.equipment || detail;
                return (
                  <div className="item-card" key={detail.id || equipment.id || index}>
                    <strong>{getEquipmentCode(equipment)} - {equipment.nama_alat || "-"}</strong>
                    <span>Kondisi sebelum: {formatLabel(detail.kondisi_sebelum)}</span>
                    <span>Status item: {formatLabel(detail.status || equipment.status)}</span>
                  </div>
                );
              }) : <p className="muted">Belum ada data alat.</p>}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={modalMode === "approve"} title="Setujui Peminjaman" onClose={closeModal}>
        {error && modalMode === "approve" ? <div className="alert danger">{error}</div> : null}
        <div className="confirm-content approval-box">
          <p>Apakah Anda yakin ingin menyetujui peminjaman ini?</p>
          <strong>{getBorrowingCode(selectedBorrowing)}</strong>
          <span>Dosen: {getBorrower(selectedBorrowing)?.name || "-"}</span>
          <div className="item-list">
            {getBorrowingDetails(selectedBorrowing).length ? getBorrowingDetails(selectedBorrowing).map((detail, index) => {
              const equipment = detail.equipments || detail.equipment || detail;
              return (
                <div className="item-card" key={detail.id || equipment.id || index}>
                  <strong>{getEquipmentCode(equipment)} - {equipment.nama_alat || "-"}</strong>
                </div>
              );
            }) : <p className="muted">Belum ada data alat.</p>}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
          <button type="button" className="button success" onClick={handleApprove} disabled={submitting}>{submitting ? "Memproses..." : "Ya, Setujui"}</button>
        </div>
      </Modal>

      <Modal open={modalMode === "reject"} title="Tolak Peminjaman" onClose={closeModal}>
        {error && modalMode === "reject" ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid reject-box" onSubmit={handleReject}>
          <div className="detail-span confirm-content">
            <strong>{getBorrowingCode(selectedBorrowing)}</strong>
            <span>Dosen: {getBorrower(selectedBorrowing)?.name || "-"}</span>
          </div>
          <label className="form-span">
            Alasan Penolakan
            <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
            <button type="submit" className="button danger" disabled={submitting}>{submitting ? "Memproses..." : "Ya, Tolak"}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default KepalaLabBorrowingsPage;

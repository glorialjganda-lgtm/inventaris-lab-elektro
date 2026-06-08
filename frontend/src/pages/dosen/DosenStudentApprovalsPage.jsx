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
  formatStatusLabel,
  getArrayData,
  getBorrowingCode,
  getBorrowingItems,
  getDosen,
  getEquipmentCode,
  getEquipmentName,
  getMahasiswa,
  getStatusBadgeVariant,
} from "../mahasiswa/mahasiswaHelpers.js";

const approvalFilters = [
  ["", "Semua Status"],
  ["menunggu", "Menunggu"],
  ["disetujui", "Disetujui"],
  ["ditolak", "Ditolak"],
];

const DosenStudentApprovalsPage = () => {
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  const [approvalNote, setApprovalNote] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      setBorrowings(getArrayData(await get("/borrowings/dosen-approvals")));
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
      const mahasiswa = getMahasiswa(item);
      const matchesSearch =
        !keyword ||
        [getBorrowingCode(item), mahasiswa?.name, mahasiswa?.nomor_induk, item.nama_kegiatan, item.keperluan]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      return matchesSearch && (!approvalFilter || item.dosen_approval_status === approvalFilter);
    });
  }, [borrowings, search, approvalFilter]);

  const openDetail = async (item) => {
    setError("");
    try {
      setSelectedBorrowing((await get(`/borrowings/${item.id}`)) || item);
      setModalMode("detail");
    } catch (err) {
      setError(err.message);
    }
  };

  const openDecision = (mode, item) => {
    setSelectedBorrowing(item);
    setApprovalNote("");
    setError("");
    setModalMode(mode);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setSelectedBorrowing(null);
    setApprovalNote("");
  };

  const handleApprove = async () => {
    if (!selectedBorrowing) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await put(`/borrowings/${selectedBorrowing.id}/approve-dosen`, {
        dosen_approval_note: approvalNote.trim() || null,
      });
      setNotice("Pengajuan mahasiswa berhasil disetujui.");
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (event) => {
    event.preventDefault();
    if (!approvalNote.trim()) {
      setError("Alasan penolakan wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await put(`/borrowings/${selectedBorrowing.id}/reject-dosen`, {
        dosen_approval_note: approvalNote.trim(),
      });
      setNotice("Pengajuan mahasiswa berhasil ditolak.");
      closeModal();
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
    { key: "mahasiswa", label: "Mahasiswa", render: (row) => getMahasiswa(row)?.name || "-" },
    { key: "nim", label: "NIM", render: (row) => getMahasiswa(row)?.nomor_induk || "-" },
    { key: "pinjam", label: "Tanggal Pinjam", render: (row) => formatDate(row.tanggal_pinjam) },
    { key: "kembali", label: "Tanggal Kembali", render: (row) => formatDate(row.tanggal_kembali_rencana) },
    { key: "kegiatan", label: "Kegiatan", render: (row) => row.nama_kegiatan || "-" },
    { key: "keperluan", label: "Keperluan", render: (row) => formatStatusLabel(row.keperluan) },
    { key: "status", label: "Status Persetujuan", render: (row) => <Badge variant={getStatusBadgeVariant(row.dosen_approval_status)}>{formatStatusLabel(row.dosen_approval_status)}</Badge> },
  ];

  return (
    <DashboardLayout title="Persetujuan Mahasiswa">
      <section className="page-header">
        <div>
          <span className="eyebrow">PERSETUJUAN MAHASISWA</span>
          <h2>Persetujuan Mahasiswa</h2>
          <p>Setujui atau tolak pengajuan mahasiswa yang memilih Anda sebagai dosen penanggung jawab.</p>
        </div>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode, mahasiswa, NIM, kegiatan, atau keperluan..." />
          <select value={approvalFilter} onChange={(event) => setApprovalFilter(event.target.value)}>
            {approvalFilters.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
          <button type="button" className="button secondary" onClick={loadData}>Refresh</button>
        </div>
        <DataTable
          columns={columns}
          data={filteredBorrowings}
          loading={loading}
          emptyTitle="Belum ada pengajuan mahasiswa"
          emptyMessage={borrowings.length ? "Tidak ada pengajuan yang sesuai filter." : "Pengajuan mahasiswa akan tampil di sini."}
          actions={(row) => (
            <div className="action-buttons">
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>Detail</button>
              {row.dosen_approval_status === "menunggu" ? (
                <>
                  <button type="button" className="button success small" onClick={() => openDecision("approve", row)}>Setujui</button>
                  <button type="button" className="button danger small" onClick={() => openDecision("reject", row)}>Tolak</button>
                </>
              ) : null}
            </div>
          )}
        />
      </Card>

      <Modal open={modalMode === "detail"} title="Detail Pengajuan Mahasiswa" onClose={closeModal}>
        {selectedBorrowing ? (
          <div className="detail-section">
            <div className="detail-grid">
              <span><b>Kode Peminjaman</b>{getBorrowingCode(selectedBorrowing)}</span>
              <span><b>Mahasiswa</b>{getMahasiswa(selectedBorrowing)?.name || "-"}</span>
              <span><b>NIM</b>{getMahasiswa(selectedBorrowing)?.nomor_induk || "-"}</span>
              <span><b>Dosen Penanggung Jawab</b>{getDosen(selectedBorrowing)?.name || "-"}</span>
              <span><b>Tanggal Pinjam</b>{formatDate(selectedBorrowing.tanggal_pinjam)}</span>
              <span><b>Tanggal Kembali</b>{formatDate(selectedBorrowing.tanggal_kembali_rencana)}</span>
              <span><b>Keperluan</b>{formatStatusLabel(selectedBorrowing.keperluan)}</span>
              <span><b>Status Persetujuan</b><Badge variant={getStatusBadgeVariant(selectedBorrowing.dosen_approval_status)}>{formatStatusLabel(selectedBorrowing.dosen_approval_status)}</Badge></span>
              <span className="detail-span"><b>Nama Kegiatan</b>{selectedBorrowing.nama_kegiatan || "-"}</span>
              <span className="detail-span"><b>Catatan Pengajuan</b>{selectedBorrowing.catatan_pengajuan || "-"}</span>
              <span className="detail-span"><b>Catatan Dosen</b>{selectedBorrowing.dosen_approval_note || "-"}</span>
            </div>
            <h3 className="detail-title">Daftar Alat</h3>
            <div className="item-list">
              {getBorrowingItems(selectedBorrowing).length ? getBorrowingItems(selectedBorrowing).map((detail, index) => {
                const equipment = detail.equipments || detail.equipment || detail;
                return (
                  <div className="item-card" key={detail.id || equipment.id || index}>
                    <strong>{getEquipmentCode(equipment)} - {getEquipmentName(equipment)}</strong>
                    <span>Kondisi sebelum: {formatStatusLabel(detail.kondisi_sebelum)}</span>
                  </div>
                );
              }) : <p className="muted">Belum ada data alat.</p>}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={modalMode === "approve"} title="Setujui Pengajuan Mahasiswa" onClose={closeModal}>
        {error && modalMode === "approve" ? <div className="alert danger">{error}</div> : null}
        <div className="confirm-content approval-box">
          <p>Pengajuan akan diteruskan ke Kepala Lab untuk validasi peminjaman.</p>
          <strong>{getBorrowingCode(selectedBorrowing)}</strong>
          <span>Mahasiswa: {getMahasiswa(selectedBorrowing)?.name || "-"}</span>
          <label>
            Catatan Dosen (opsional)
            <textarea value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} />
          </label>
        </div>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
          <button type="button" className="button success" onClick={handleApprove} disabled={submitting}>{submitting ? "Memproses..." : "Ya Setujui"}</button>
        </div>
      </Modal>

      <Modal open={modalMode === "reject"} title="Tolak Pengajuan Mahasiswa" onClose={closeModal}>
        {error && modalMode === "reject" ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid reject-box" onSubmit={handleReject}>
          <div className="detail-span confirm-content">
            <strong>{getBorrowingCode(selectedBorrowing)}</strong>
            <span>Mahasiswa: {getMahasiswa(selectedBorrowing)?.name || "-"}</span>
          </div>
          <label className="form-span">
            Alasan Penolakan
            <textarea value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
            <button type="submit" className="button danger" disabled={submitting}>{submitting ? "Memproses..." : "Ya Tolak"}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default DosenStudentApprovalsPage;

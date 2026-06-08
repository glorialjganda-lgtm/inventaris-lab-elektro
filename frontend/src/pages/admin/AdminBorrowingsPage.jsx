import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get, put } from "../../services/api.js";
import { formatDate } from "../../utils/formatters.js";

const statusOptions = [
  "menunggu",
  "disetujui",
  "ditolak",
  "dipinjam",
  "pengembalian_diajukan",
  "selesai",
  "terlambat",
];

const getEquipmentCode = (equipment) =>
  equipment?.kode_inventaris ||
  equipment?.kode_alat ||
  equipment?.kode_barang ||
  equipment?.kode_equipment ||
  equipment?.kode ||
  equipment?.nomor_inventaris ||
  "-";

const formatLabel = (value) => {
  if (!value) return "-";
  const labels = {
    menunggu: "Menunggu",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
    dipinjam: "Dipinjam",
    pengembalian_diajukan: "Pengembalian Diajukan",
    selesai: "Selesai",
    terlambat: "Terlambat",
    praktikum: "Praktikum",
    penelitian: "Penelitian",
    tugas_akhir: "Tugas Akhir",
    pengujian: "Pengujian",
    proyek: "Proyek",
    lainnya: "Lainnya",
    baik: "Baik",
    rusak_ringan: "Rusak Ringan",
    rusak_berat: "Rusak Berat",
    hilang: "Hilang",
  };
  return labels[value] || String(value).replaceAll("_", " ");
};

const statusVariant = (status) => {
  if (status === "menunggu" || status === "pengembalian_diajukan") return "warning";
  if (status === "disetujui" || status === "dipinjam") return "info";
  if (status === "selesai") return "success";
  if (status === "ditolak" || status === "terlambat") return "danger";
  return "neutral";
};

const getBorrowingCode = (borrowing) => borrowing?.kode_peminjaman || borrowing?.kode || borrowing?.id || "-";
const getBorrower = (borrowing) =>
  borrowing?.user ||
  borrowing?.dosen ||
  borrowing?.borrower ||
  borrowing?.users_borrowings_dosen_idTousers ||
  null;
const getLab = (borrowing) => borrowing?.laboratory || borrowing?.lab || borrowing?.laboratories || null;
const getDetails = (borrowing) =>
  borrowing?.details ||
  borrowing?.borrowing_details ||
  borrowing?.items ||
  borrowing?.equipments ||
  borrowing?.borrowingDetails ||
  [];

const AdminBorrowingsPage = () => {
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
    return borrowings.filter((borrowing) => {
      const borrower = getBorrower(borrowing);
      const matchesSearch =
        !keyword ||
        [
          getBorrowingCode(borrowing),
          borrower?.name,
          borrowing.nama_kegiatan,
          borrowing.keperluan,
          getLab(borrowing)?.nama_lab,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesStatus = !statusFilter || borrowing.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [borrowings, search, statusFilter]);

  const openDetail = async (borrowing) => {
    setError("");
    try {
      const detail = await get(`/borrowings/${borrowing.id}`);
      setSelectedBorrowing(detail || borrowing);
      setModalMode("detail");
    } catch (err) {
      setError(err.message);
    }
  };

  const openApprove = (borrowing) => {
    setSelectedBorrowing(borrowing);
    setModalMode("approve");
    setError("");
  };

  const openReject = (borrowing) => {
    setSelectedBorrowing(borrowing);
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
    if (!rejectReason.trim()) {
      setError("Alasan penolakan wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await put(`/borrowings/${selectedBorrowing.id}/reject`, {
        alasan_penolakan: rejectReason.trim(),
      });
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
    { key: "kode_peminjaman", label: "Kode Peminjaman", render: (row) => getBorrowingCode(row) },
    { key: "dosen", label: "Dosen", render: (row) => getBorrower(row)?.name || "-" },
    { key: "lab", label: "Laboratorium", render: (row) => getLab(row)?.nama_lab || "-" },
    { key: "tanggal_pinjam", label: "Tanggal Pinjam", render: (row) => formatDate(row.tanggal_pinjam) },
    {
      key: "tanggal_kembali_rencana",
      label: "Tanggal Kembali Rencana",
      render: (row) => formatDate(row.tanggal_kembali_rencana),
    },
    { key: "keperluan", label: "Keperluan", render: (row) => formatLabel(row.keperluan) },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge>,
    },
  ];

  return (
    <DashboardLayout title="Validasi Peminjaman">
      <section className="page-header">
        <div>
          <span className="eyebrow">PEMINJAMAN</span>
          <h2>Validasi Peminjaman</h2>
          <p>Kelola dan validasi pengajuan peminjaman alat laboratorium.</p>
        </div>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, dosen, kegiatan, atau keperluan..."
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Semua Status</option>
            {statusOptions.map((status) => (
              <option value={status} key={status}>{formatLabel(status)}</option>
            ))}
          </select>
          <button type="button" className="button secondary" onClick={loadData}>Refresh</button>
        </div>

        <DataTable
          columns={columns}
          data={filteredBorrowings}
          loading={loading}
          emptyMessage="Tidak ada peminjaman yang sesuai filter."
          actions={(row) => (
            <div className="action-buttons">
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>
                Detail
              </button>
              {row.status === "menunggu" ? (
                <>
                  <button type="button" className="button success small" onClick={() => openApprove(row)}>
                    Approve
                  </button>
                  <button type="button" className="button danger small" onClick={() => openReject(row)}>
                    Reject
                  </button>
                </>
              ) : null}
            </div>
          )}
        />
      </Card>

      <Modal open={modalMode === "detail"} title="Detail Peminjaman" onClose={closeModal}>
        {selectedBorrowing ? (
          <div className="detail-section">
            <div className="detail-grid">
              <span><b>Kode Peminjaman</b>{getBorrowingCode(selectedBorrowing)}</span>
              <span><b>Dosen</b>{getBorrower(selectedBorrowing)?.name || "-"}</span>
              <span><b>Email Dosen</b>{getBorrower(selectedBorrowing)?.email || "-"}</span>
              <span><b>Laboratorium</b>{getLab(selectedBorrowing)?.nama_lab || "-"}</span>
              <span><b>Tanggal Pinjam</b>{formatDate(selectedBorrowing.tanggal_pinjam)}</span>
              <span><b>Tanggal Kembali Rencana</b>{formatDate(selectedBorrowing.tanggal_kembali_rencana)}</span>
              <span><b>Keperluan</b>{formatLabel(selectedBorrowing.keperluan)}</span>
              <span><b>Status</b><Badge variant={statusVariant(selectedBorrowing.status)}>{formatLabel(selectedBorrowing.status)}</Badge></span>
              <span className="detail-span"><b>Nama Kegiatan</b>{selectedBorrowing.nama_kegiatan || "-"}</span>
              <span className="detail-span"><b>Catatan Pengajuan</b>{selectedBorrowing.catatan_pengajuan || "-"}</span>
              <span className="detail-span"><b>Alasan Penolakan</b>{selectedBorrowing.alasan_penolakan || "-"}</span>
            </div>
            <h3 className="detail-title">Daftar Alat</h3>
            <div className="item-list">
              {getDetails(selectedBorrowing).length ? getDetails(selectedBorrowing).map((detail, index) => {
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
          <strong>{getBorrowingCode(selectedBorrowing)} - {getBorrower(selectedBorrowing)?.name || "-"}</strong>
        </div>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
          <button type="button" className="button success" onClick={handleApprove} disabled={submitting}>
            {submitting ? "Memproses..." : "Ya, Setujui"}
          </button>
        </div>
      </Modal>

      <Modal open={modalMode === "reject"} title="Tolak Peminjaman" onClose={closeModal}>
        {error && modalMode === "reject" ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid reject-box" onSubmit={handleReject}>
          <label className="form-span">
            Alasan Penolakan
            <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
            <button type="submit" className="button danger" disabled={submitting}>
              {submitting ? "Memproses..." : "Tolak Peminjaman"}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default AdminBorrowingsPage;

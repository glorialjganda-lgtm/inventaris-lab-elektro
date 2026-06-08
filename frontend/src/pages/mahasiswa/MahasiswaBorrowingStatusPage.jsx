import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get, post } from "../../services/api.js";
import { formatDate } from "../../utils/formatters.js";
import {
  formatStatusLabel,
  getArrayData,
  getBorrowingCode,
  getBorrowingItems,
  getDosen,
  getDosenApprovalLabel,
  getEquipmentCode,
  getEquipmentName,
  getMahasiswa,
  getStatusBadgeVariant,
  isBorrowingReturnable,
} from "./mahasiswaHelpers.js";

const statusFilters = [
  ["", "Semua Status"],
  ["menunggu_dosen", "Menunggu Persetujuan Dosen"],
  ["menunggu_kepala_lab", "Menunggu Validasi Kepala Lab"],
  ["dipinjam", "Disetujui / Dipinjam"],
  ["ditolak", "Ditolak"],
  ["selesai", "Selesai"],
];

const MahasiswaBorrowingStatusPage = () => {
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  const [returnForm, setReturnForm] = useState({
    tanggal_pengembalian: "",
    catatan_pengembalian: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      setBorrowings(getArrayData(await get("/borrowings")));
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
      const label = getDosenApprovalLabel(item);
      const dosen = getDosen(item);
      const matchesSearch =
        !keyword ||
        [getBorrowingCode(item), dosen?.name, item.nama_kegiatan, item.keperluan, label]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "menunggu_dosen" && item.dosen_approval_status === "menunggu") ||
        (statusFilter === "menunggu_kepala_lab" && item.dosen_approval_status === "disetujui" && item.status === "menunggu") ||
        (statusFilter === "dipinjam" && ["disetujui", "dipinjam"].includes(item.status)) ||
        (statusFilter === "ditolak" && (item.status === "ditolak" || item.dosen_approval_status === "ditolak")) ||
        (statusFilter === "selesai" && item.status === "selesai");

      return matchesSearch && matchesStatus;
    });
  }, [borrowings, search, statusFilter]);

  const openDetail = async (item) => {
    setError("");
    try {
      setSelectedBorrowing((await get(`/borrowings/${item.id}`)) || item);
      setModalMode("detail");
    } catch (err) {
      setError(err.message);
    }
  };

  const openReturn = async (item) => {
    setError("");
    try {
      setSelectedBorrowing((await get(`/borrowings/${item.id}`)) || item);
      setReturnForm({
        tanggal_pengembalian: new Date().toISOString().slice(0, 10),
        catatan_pengembalian: "",
      });
      setModalMode("return");
    } catch (err) {
      setError(err.message);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setSelectedBorrowing(null);
    setReturnForm({ tanggal_pengembalian: "", catatan_pengembalian: "" });
  };

  const handleReturn = async (event) => {
    event.preventDefault();
    if (!returnForm.tanggal_pengembalian) {
      setError("Tanggal pengembalian wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await post("/returns", {
        borrowing_id: selectedBorrowing.id,
        tanggal_pengembalian: returnForm.tanggal_pengembalian,
        catatan_pengembalian: returnForm.catatan_pengembalian.trim() || null,
      });
      setNotice("Pengajuan pengembalian berhasil dikirim.");
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
    { key: "dosen", label: "Dosen Penanggung Jawab", render: (row) => getDosen(row)?.name || "-" },
    { key: "pinjam", label: "Tanggal Pinjam", render: (row) => formatDate(row.tanggal_pinjam) },
    { key: "kembali", label: "Tanggal Kembali", render: (row) => formatDate(row.tanggal_kembali_rencana) },
    { key: "keperluan", label: "Keperluan", render: (row) => formatStatusLabel(row.keperluan) },
    { key: "status", label: "Status Alur", render: (row) => <Badge variant={getStatusBadgeVariant(row.dosen_approval_status === "ditolak" ? "ditolak" : row.status)}>{getDosenApprovalLabel(row)}</Badge> },
  ];

  return (
    <DashboardLayout title="Status Peminjaman">
      <section className="page-header">
        <div>
          <span className="eyebrow">STATUS</span>
          <h2>Status Peminjaman</h2>
          <p>Pantau pengajuan peminjaman, persetujuan dosen, validasi kepala lab, dan pengembalian.</p>
        </div>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode, dosen, kegiatan, keperluan, atau status..." />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusFilters.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
          <button type="button" className="button secondary" onClick={loadData}>Refresh</button>
        </div>
        <DataTable
          columns={columns}
          data={filteredBorrowings}
          loading={loading}
          emptyTitle="Belum ada peminjaman"
          emptyMessage={borrowings.length ? "Tidak ada peminjaman yang sesuai filter." : "Pengajuan peminjaman Anda akan tampil di sini."}
          actions={(row) => (
            <div className="action-buttons">
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>Detail</button>
              {isBorrowingReturnable(row) ? (
                <button type="button" className="button success small" onClick={() => openReturn(row)}>Ajukan Pengembalian</button>
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
              <span><b>Mahasiswa</b>{getMahasiswa(selectedBorrowing)?.name || "-"}</span>
              <span><b>NIM</b>{getMahasiswa(selectedBorrowing)?.nomor_induk || "-"}</span>
              <span><b>Dosen Penanggung Jawab</b>{getDosen(selectedBorrowing)?.name || "-"}</span>
              <span><b>Status Persetujuan Dosen</b><Badge variant={getStatusBadgeVariant(selectedBorrowing.dosen_approval_status)}>{formatStatusLabel(selectedBorrowing.dosen_approval_status)}</Badge></span>
              <span><b>Status Peminjaman</b><Badge variant={getStatusBadgeVariant(selectedBorrowing.status)}>{formatStatusLabel(selectedBorrowing.status)}</Badge></span>
              <span><b>Tanggal Pinjam</b>{formatDate(selectedBorrowing.tanggal_pinjam)}</span>
              <span><b>Tanggal Kembali Rencana</b>{formatDate(selectedBorrowing.tanggal_kembali_rencana)}</span>
              <span><b>Keperluan</b>{formatStatusLabel(selectedBorrowing.keperluan)}</span>
              <span className="detail-span"><b>Nama Kegiatan</b>{selectedBorrowing.nama_kegiatan || "-"}</span>
              <span className="detail-span"><b>Catatan Pengajuan</b>{selectedBorrowing.catatan_pengajuan || "-"}</span>
              <span className="detail-span"><b>Catatan Dosen</b>{selectedBorrowing.dosen_approval_note || "-"}</span>
              <span className="detail-span"><b>Alasan Penolakan</b>{selectedBorrowing.alasan_penolakan || "-"}</span>
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

      <Modal open={modalMode === "return"} title="Ajukan Pengembalian" onClose={closeModal}>
        {error && modalMode === "return" ? <div className="alert danger">{error}</div> : null}
        {selectedBorrowing ? (
          <form className="form-grid" onSubmit={handleReturn}>
            <div className="detail-span item-card">
              <strong>{getBorrowingCode(selectedBorrowing)}</strong>
              <span>Kondisi akhir alat akan diperiksa oleh kepala lab/admin saat verifikasi.</span>
            </div>
            <label>Tanggal Pengembalian<input type="date" value={returnForm.tanggal_pengembalian} onChange={(event) => setReturnForm((current) => ({ ...current, tanggal_pengembalian: event.target.value }))} /></label>
            <label className="form-span">Catatan Pengembalian<textarea value={returnForm.catatan_pengembalian} onChange={(event) => setReturnForm((current) => ({ ...current, catatan_pengembalian: event.target.value }))} /></label>
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
              <button type="submit" className="button primary" disabled={submitting}>{submitting ? "Mengirim..." : "Ajukan Pengembalian"}</button>
            </div>
          </form>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
};

export default MahasiswaBorrowingStatusPage;

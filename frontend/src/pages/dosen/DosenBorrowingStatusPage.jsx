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
  canReturnBorrowing,
  formatStatusLabel,
  getBorrower,
  getBorrowingCode,
  getBorrowingDetails,
  getBorrowingLab,
  getEquipmentCode,
  getEquipmentName,
  pickArray,
  statusVariant,
} from "./dosenHelpers.js";

const statusFilters = [
  ["", "Semua Status"],
  ["menunggu", "Menunggu"],
  ["aktif", "Disetujui/Dipinjam"],
  ["ditolak", "Ditolak"],
  ["selesai", "Selesai"],
];

const DosenBorrowingStatusPage = () => {
  const [profile, setProfile] = useState(null);
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
      const [me, borrowingData] = await Promise.all([get("/auth/me"), get("/borrowings")]);
      setProfile(me);
      setBorrowings(pickArray(borrowingData, ["borrowings"]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const myBorrowings = useMemo(() => {
    const userId = profile?.user?.id;
    if (!userId) return borrowings;
    return borrowings.filter((item) => {
      const borrower = getBorrower(item);
      return !borrower?.id || String(borrower.id) === String(userId);
    });
  }, [borrowings, profile]);

  const filteredBorrowings = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return myBorrowings.filter((item) => {
      const status = item.status || "";
      const matchesSearch =
        !keyword ||
        [getBorrowingCode(item), item.nama_kegiatan, item.keperluan, status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "aktif" ? ["disetujui", "dipinjam"].includes(status) : status === statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [myBorrowings, search, statusFilter]);

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

  const openReturn = async (item) => {
    setError("");
    try {
      const detail = await get(`/borrowings/${item.id}`);
      setSelectedBorrowing(detail || item);
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
    { key: "pinjam", label: "Tanggal Pinjam", render: (row) => formatDate(row.tanggal_pinjam) },
    { key: "kembali", label: "Tanggal Kembali Rencana", render: (row) => formatDate(row.tanggal_kembali_rencana) },
    { key: "keperluan", label: "Keperluan", render: (row) => formatStatusLabel(row.keperluan) },
    { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatStatusLabel(row.status)}</Badge> },
  ];

  return (
    <DashboardLayout title="Status Peminjaman">
      <section className="page-header">
        <div>
          <span className="eyebrow">STATUS</span>
          <h2>Status Peminjaman</h2>
          <p>Pantau pengajuan peminjaman dan ajukan pengembalian setelah alat dipinjam.</p>
        </div>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode, kegiatan, keperluan, atau status..." />
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
          emptyMessage={myBorrowings.length ? "Tidak ada peminjaman yang sesuai filter." : "Pengajuan peminjaman Anda akan tampil di sini."}
          actions={(row) => (
            <div className="action-buttons">
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>Detail</button>
              {canReturnBorrowing(row) ? (
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
              <span><b>Dosen</b>{getBorrower(selectedBorrowing)?.name || profile?.user?.name || "-"}</span>
              <span><b>Email</b>{getBorrower(selectedBorrowing)?.email || profile?.user?.email || "-"}</span>
              <span><b>Laboratorium</b>{getBorrowingLab(selectedBorrowing)?.nama_lab || "-"}</span>
              <span><b>Tanggal Pinjam</b>{formatDate(selectedBorrowing.tanggal_pinjam)}</span>
              <span><b>Tanggal Kembali Rencana</b>{formatDate(selectedBorrowing.tanggal_kembali_rencana)}</span>
              <span><b>Keperluan</b>{formatStatusLabel(selectedBorrowing.keperluan)}</span>
              <span><b>Status</b><Badge variant={statusVariant(selectedBorrowing.status)}>{formatStatusLabel(selectedBorrowing.status)}</Badge></span>
              <span className="detail-span"><b>Nama Kegiatan</b>{selectedBorrowing.nama_kegiatan || "-"}</span>
              <span className="detail-span"><b>Catatan</b>{selectedBorrowing.catatan_pengajuan || "-"}</span>
              <span className="detail-span"><b>Alasan Penolakan</b>{selectedBorrowing.alasan_penolakan || "-"}</span>
            </div>
            <h3 className="detail-title">Daftar Alat</h3>
            <div className="item-list">
              {getBorrowingDetails(selectedBorrowing).length ? getBorrowingDetails(selectedBorrowing).map((detail, index) => {
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
              <span>Pengembalian diverifikasi oleh kepala lab atau admin jurusan.</span>
            </div>
            <div className="detail-span item-list">
              {getBorrowingDetails(selectedBorrowing).map((detail, index) => {
                const equipment = detail.equipments || detail.equipment || detail;
                return <div className="item-card" key={detail.id || equipment.id || index}><strong>{getEquipmentCode(equipment)} - {getEquipmentName(equipment)}</strong></div>;
              })}
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

export default DosenBorrowingStatusPage;

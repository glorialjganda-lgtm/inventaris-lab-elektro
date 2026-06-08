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
  defaultFinalStatus,
  formatLabel,
  getBorrower,
  getBorrowing,
  getBorrowingCode,
  getBorrowingDetails,
  getEquipmentCode,
  getReturnCode,
  getReturnDetails,
  getReturnStatus,
  statusVariant,
} from "./kepalaLabHelpers.js";

const statusOptions = ["menunggu_verifikasi", "diterima", "diterima_dengan_catatan", "ditolak"];
const verifyStatusOptions = ["diterima", "diterima_dengan_catatan"];
const kondisiOptions = ["baik", "rusak_ringan", "rusak_berat", "hilang"];
const statusAkhirOptions = ["tersedia", "dalam_perawatan", "tidak_aktif"];
const canVerifyReturn = (item) => getReturnStatus(item) === "menunggu_verifikasi";

const KepalaLabReturnsPage = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    status_pengembalian: "diterima",
    catatan_pengembalian: "",
    details: [],
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await get("/returns");
      setReturns(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredReturns = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return returns.filter((item) => {
      const borrower = getBorrower(item);
      const matchesSearch =
        !keyword ||
        [getReturnCode(item), getBorrowingCode(item), borrower?.name, item.catatan_pengembalian]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      return matchesSearch && (!statusFilter || getReturnStatus(item) === statusFilter);
    });
  }, [returns, search, statusFilter]);

  const hasPendingReturn = useMemo(() => returns.some(canVerifyReturn), [returns]);

  const buildVerifyDetails = (item) => {
    const existingDetails = getReturnDetails(item);
    const source = existingDetails.length ? existingDetails : getBorrowingDetails(item);
    return source.map((detail) => {
      const equipment = detail.equipments || detail.equipment || detail;
      const kondisi = detail.kondisi_sesudah || detail.kondisi_sebelum || "baik";
      return {
        equipment_id: detail.equipment_id || equipment.id,
        equipment,
        kondisi_sesudah: kondisi,
        status_akhir_alat: detail.status_akhir_alat || defaultFinalStatus(kondisi),
        catatan: detail.catatan || "",
      };
    });
  };

  const openDetail = async (item) => {
    setError("");
    try {
      const detail = await get(`/returns/${item.id}`);
      setSelectedReturn(detail || item);
      setModalMode("detail");
    } catch (err) {
      setError(err.message);
    }
  };

  const openVerify = async (item) => {
    setError("");
    try {
      const detail = await get(`/returns/${item.id}`);
      const data = detail || item;
      setSelectedReturn(data);
      setVerifyForm({
        status_pengembalian: "diterima",
        catatan_pengembalian: data.catatan_pengembalian || "",
        details: buildVerifyDetails(data),
      });
      setModalMode("verify");
    } catch (err) {
      setError(err.message);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setSelectedReturn(null);
    setVerifyForm({ status_pengembalian: "diterima", catatan_pengembalian: "", details: [] });
  };

  const updateDetail = (index, field, value) => {
    setVerifyForm((current) => ({
      ...current,
      details: current.details.map((detail, detailIndex) => {
        if (detailIndex !== index) return detail;
        const next = { ...detail, [field]: value };
        if (field === "kondisi_sesudah") next.status_akhir_alat = defaultFinalStatus(value);
        return next;
      }),
    }));
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!verifyForm.details.length) {
      setError("Detail alat pengembalian wajib tersedia.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await put(`/returns/${selectedReturn.id}/verify`, {
        status_pengembalian: verifyForm.status_pengembalian,
        catatan_pengembalian: verifyForm.catatan_pengembalian.trim() || null,
        details: verifyForm.details.map((detail) => ({
          equipment_id: detail.equipment_id,
          kondisi_sesudah: detail.kondisi_sesudah,
          status_akhir_alat: detail.status_akhir_alat,
          catatan: detail.catatan?.trim() || null,
        })),
      });
      setNotice("Pengembalian berhasil diverifikasi.");
      setModalMode(null);
      setSelectedReturn(null);
      setVerifyForm({ status_pengembalian: "diterima", catatan_pengembalian: "", details: [] });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "no", label: "No", render: (_, index) => index + 1 },
    { key: "kode", label: "Kode Pengembalian", render: (row) => getReturnCode(row) },
    { key: "peminjaman", label: "Kode Peminjaman", render: (row) => getBorrowingCode(row) },
    { key: "dosen", label: "Dosen", render: (row) => getBorrower(row)?.name || "-" },
    { key: "tanggal", label: "Tanggal Pengembalian", render: (row) => formatDate(row.tanggal_pengembalian) },
    { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(getReturnStatus(row))}>{formatLabel(getReturnStatus(row))}</Badge> },
    { key: "catatan", label: "Catatan", render: (row) => row.catatan_pengembalian || "-" },
  ];

  return (
    <DashboardLayout title="Verifikasi Pengembalian">
      <section className="page-header">
        <div>
          <span className="eyebrow">PENGEMBALIAN</span>
          <h2>Verifikasi Pengembalian</h2>
          <p>Periksa pengembalian alat yang diajukan untuk laboratorium Anda.</p>
          <p className="muted">Kepala lab memverifikasi pengembalian alat pada laboratorium yang menjadi tanggung jawabnya.</p>
        </div>
      </section>
      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode pengembalian, kode peminjaman, dosen, atau catatan..." />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Semua Status</option>
            {statusOptions.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}
          </select>
          <button type="button" className="button secondary" onClick={loadData}>Refresh</button>
        </div>
        <div className="alert info">
          Tombol validasi hanya muncul pada data yang masih berstatus menunggu. Data yang sudah selesai hanya dapat dilihat melalui tombol Detail.
        </div>
        {!loading && returns.length && !hasPendingReturn ? (
          <div className="alert warning">
            Tidak ada pengembalian yang perlu diverifikasi saat ini. Data yang sudah diverifikasi hanya dapat dilihat detailnya.
          </div>
        ) : null}
        <DataTable
          columns={columns}
          data={filteredReturns}
          loading={loading}
          emptyTitle="Belum ada data pengembalian"
          emptyMessage={returns.length ? "Tidak ada pengembalian yang sesuai filter." : "Pengajuan pengembalian lab akan tampil di sini."}
          actions={(row) => (
            <div className="action-buttons">
              {canVerifyReturn(row) ? (
                <button type="button" className="button success small" onClick={() => openVerify(row)}>Verifikasi</button>
              ) : null}
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>Detail</button>
            </div>
          )}
        />
      </Card>

      <Modal open={modalMode === "detail"} title="Detail Pengembalian" onClose={closeModal}>
        {selectedReturn ? (
          <div className="detail-section">
            <div className="detail-grid">
              <span><b>Kode Pengembalian</b>{getReturnCode(selectedReturn)}</span>
              <span><b>Kode Peminjaman</b>{getBorrowingCode(selectedReturn)}</span>
              <span><b>Dosen</b>{getBorrower(selectedReturn)?.name || "-"}</span>
              <span><b>Tanggal Pengembalian</b>{formatDate(selectedReturn.tanggal_pengembalian)}</span>
              <span><b>Status Pengembalian</b><Badge variant={statusVariant(getReturnStatus(selectedReturn))}>{formatLabel(getReturnStatus(selectedReturn))}</Badge></span>
              <span className="detail-span"><b>Catatan Pengembalian</b>{selectedReturn.catatan_pengembalian || "-"}</span>
            </div>
            <h3 className="detail-title">Daftar Alat Dikembalikan</h3>
            <div className="item-list">
              {(getReturnDetails(selectedReturn).length ? getReturnDetails(selectedReturn) : getBorrowingDetails(selectedReturn)).map((detail, index) => {
                const equipment = detail.equipments || detail.equipment || detail;
                return (
                  <div className="item-card" key={detail.id || equipment.id || index}>
                    <strong>{getEquipmentCode(equipment)} - {equipment.nama_alat || "-"}</strong>
                    <span>Kondisi sebelum: {formatLabel(detail.kondisi_sebelum)}</span>
                    <span>Kondisi sesudah: {formatLabel(detail.kondisi_sesudah)}</span>
                    <span>Status akhir alat: {formatLabel(detail.status_akhir_alat)}</span>
                    <span>Catatan item: {detail.catatan || "-"}</span>
                  </div>
                );
              })}
              {!getReturnDetails(selectedReturn).length && !getBorrowingDetails(selectedReturn).length ? <p className="muted">Belum ada data alat.</p> : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={modalMode === "verify"} title="Verifikasi Pengembalian" onClose={closeModal}>
        {error && modalMode === "verify" ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid verify-form" onSubmit={handleVerify}>
          <div className="detail-span detail-grid">
            <span><b>Kode Pengembalian</b>{getReturnCode(selectedReturn)}</span>
            <span><b>Kode Peminjaman</b>{getBorrowingCode(selectedReturn)}</span>
            <span><b>Dosen</b>{getBorrower(selectedReturn)?.name || "-"}</span>
          </div>
          <label>
            Status Pengembalian
            <select value={verifyForm.status_pengembalian} onChange={(event) => setVerifyForm((current) => ({ ...current, status_pengembalian: event.target.value }))}>
              {verifyStatusOptions.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}
            </select>
          </label>
          <label className="form-span">
            Catatan Verifikasi
            <textarea value={verifyForm.catatan_pengembalian} onChange={(event) => setVerifyForm((current) => ({ ...current, catatan_pengembalian: event.target.value }))} />
          </label>
          <div className="detail-span item-list">
            <h3 className="detail-title">Daftar Alat</h3>
            {verifyForm.details.map((detail, index) => (
              <div className="item-card verify-item" key={detail.equipment_id || index}>
                <strong>{getEquipmentCode(detail.equipment)} - {detail.equipment?.nama_alat || "-"}</strong>
                <label>
                  Kondisi Sesudah
                  <select value={detail.kondisi_sesudah} onChange={(event) => updateDetail(index, "kondisi_sesudah", event.target.value)}>
                    {kondisiOptions.map((value) => <option value={value} key={value}>{formatLabel(value)}</option>)}
                  </select>
                </label>
                <label>
                  Status Akhir Alat
                  <select value={detail.status_akhir_alat} onChange={(event) => updateDetail(index, "status_akhir_alat", event.target.value)}>
                    {statusAkhirOptions.map((value) => <option value={value} key={value}>{formatLabel(value)}</option>)}
                  </select>
                </label>
                <label>
                  Catatan Item
                  <input value={detail.catatan} onChange={(event) => updateDetail(index, "catatan", event.target.value)} />
                </label>
              </div>
            ))}
            {!verifyForm.details.length ? <p className="muted">Belum ada data alat.</p> : null}
          </div>
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
            <button type="submit" className="button success" disabled={submitting}>{submitting ? "Memproses..." : "Simpan Verifikasi"}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default KepalaLabReturnsPage;

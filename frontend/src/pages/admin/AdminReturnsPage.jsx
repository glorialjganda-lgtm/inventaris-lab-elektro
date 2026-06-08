import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get, put } from "../../services/api.js";
import { formatDate } from "../../utils/formatters.js";

const statusOptions = ["menunggu_verifikasi", "diterima", "diterima_dengan_catatan", "selesai", "bermasalah"];
const verifyStatusOptions = ["diterima", "diterima_dengan_catatan"];
const kondisiOptions = ["baik", "rusak_ringan", "rusak_berat", "hilang"];
const statusAkhirOptions = ["tersedia", "dalam_perawatan", "tidak_aktif"];

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
    menunggu_verifikasi: "Menunggu Verifikasi",
    diverifikasi: "Diverifikasi",
    selesai: "Selesai",
    diterima: "Diterima",
    diterima_dengan_catatan: "Diterima Dengan Catatan",
    bermasalah: "Bermasalah",
    baik: "Baik",
    rusak_ringan: "Rusak Ringan",
    rusak_berat: "Rusak Berat",
    hilang: "Hilang",
    tersedia: "Tersedia",
    dalam_perawatan: "Dalam Perawatan",
    tidak_aktif: "Tidak Aktif",
  };
  return labels[value] || String(value).replaceAll("_", " ");
};

const statusVariant = (status) => {
  if (["selesai", "diverifikasi", "diterima"].includes(status)) return "success";
  if (["menunggu_verifikasi", "diterima_dengan_catatan"].includes(status)) return "warning";
  if (status === "bermasalah" || status === "ditolak") return "danger";
  return "neutral";
};

const getReturnCode = (item) => item?.kode_pengembalian || item?.kode || item?.id || "-";
const getBorrowing = (item) => item?.borrowing || item?.borrowings || null;
const getBorrowingCode = (item) => getBorrowing(item)?.kode_peminjaman || item?.borrowing_id || "-";
const getBorrower = (item) =>
  getBorrowing(item)?.users_borrowings_dosen_idTousers ||
  getBorrowing(item)?.user ||
  item?.user ||
  item?.dosen ||
  item?.users_returns_diajukan_olehTousers ||
  null;
const getStatus = (item) => item?.status || item?.status_pengembalian || "";
const getDetails = (item) =>
  item?.details ||
  item?.return_details ||
  item?.items ||
  item?.returnDetails ||
  getBorrowing(item)?.borrowing_details ||
  [];

const defaultFinalStatus = (kondisi) => {
  if (kondisi === "baik") return "tersedia";
  if (kondisi === "hilang") return "tidak_aktif";
  return "dalam_perawatan";
};

const AdminReturnsPage = () => {
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
        [getReturnCode(item), getBorrowingCode(item), borrower?.name, item.catatan_pengembalian, item.catatan]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesStatus = !statusFilter || getStatus(item) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [returns, search, statusFilter]);

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

  const buildVerifyDetails = (item) => {
    const existingDetails = item.return_details || item.details || [];
    const source = existingDetails.length ? existingDetails : getBorrowing(item)?.borrowing_details || [];
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
    setVerifyForm((current) => {
      const details = current.details.map((detail, detailIndex) => {
        if (detailIndex !== index) return detail;
        const next = { ...detail, [field]: value };
        if (field === "kondisi_sesudah") next.status_akhir_alat = defaultFinalStatus(value);
        return next;
      });
      return { ...current, details };
    });
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
    { key: "kode_pengembalian", label: "Kode Pengembalian", render: (row) => getReturnCode(row) },
    { key: "kode_peminjaman", label: "Kode Peminjaman", render: (row) => getBorrowingCode(row) },
    { key: "dosen", label: "Dosen", render: (row) => getBorrower(row)?.name || "-" },
    { key: "tanggal_pengembalian", label: "Tanggal Pengembalian", render: (row) => formatDate(row.tanggal_pengembalian) },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge variant={statusVariant(getStatus(row))}>{formatLabel(getStatus(row))}</Badge>,
    },
    { key: "catatan", label: "Catatan", render: (row) => row.catatan_pengembalian || row.catatan || "-" },
  ];

  return (
    <DashboardLayout title="Verifikasi Pengembalian">
      <section className="page-header">
        <div>
          <span className="eyebrow">PENGEMBALIAN</span>
          <h2>Verifikasi Pengembalian</h2>
          <p>Periksa dan verifikasi pengembalian alat laboratorium.</p>
        </div>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, dosen, atau catatan pengembalian..."
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
          data={filteredReturns}
          loading={loading}
          emptyMessage="Tidak ada pengembalian yang sesuai filter."
          actions={(row) => (
            <div className="action-buttons">
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>
                Detail
              </button>
              {getStatus(row) === "menunggu_verifikasi" ? (
                <button type="button" className="button success small" onClick={() => openVerify(row)}>
                  Verifikasi
                </button>
              ) : null}
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
              <span><b>Status Pengembalian</b><Badge variant={statusVariant(getStatus(selectedReturn))}>{formatLabel(getStatus(selectedReturn))}</Badge></span>
              <span className="detail-span"><b>Catatan Pengembalian</b>{selectedReturn.catatan_pengembalian || "-"}</span>
            </div>
            <h3 className="detail-title">Daftar Alat Dikembalikan</h3>
            <div className="item-list">
              {getDetails(selectedReturn).length ? getDetails(selectedReturn).map((detail, index) => {
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
              }) : <p className="muted">Belum ada data alat.</p>}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={modalMode === "verify"} title="Verifikasi Pengembalian" onClose={closeModal}>
        {error && modalMode === "verify" ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid verify-form" onSubmit={handleVerify}>
          <label>
            Status Pengembalian
            <select
              value={verifyForm.status_pengembalian}
              onChange={(event) => setVerifyForm((current) => ({ ...current, status_pengembalian: event.target.value }))}
            >
              {verifyStatusOptions.map((status) => (
                <option value={status} key={status}>{formatLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="form-span">
            Catatan Pengembalian
            <textarea
              value={verifyForm.catatan_pengembalian}
              onChange={(event) => setVerifyForm((current) => ({ ...current, catatan_pengembalian: event.target.value }))}
            />
          </label>
          <div className="detail-span item-list">
            {verifyForm.details.map((detail, index) => (
              <div className="item-card verify-item" key={detail.equipment_id || index}>
                <strong>{getEquipmentCode(detail.equipment)} - {detail.equipment?.nama_alat || "-"}</strong>
                <label>
                  Kondisi Sesudah
                  <select value={detail.kondisi_sesudah} onChange={(event) => updateDetail(index, "kondisi_sesudah", event.target.value)}>
                    {kondisiOptions.map((kondisi) => (
                      <option value={kondisi} key={kondisi}>{formatLabel(kondisi)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status Akhir Alat
                  <select value={detail.status_akhir_alat} onChange={(event) => updateDetail(index, "status_akhir_alat", event.target.value)}>
                    {statusAkhirOptions.map((status) => (
                      <option value={status} key={status}>{formatLabel(status)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Catatan Item
                  <input value={detail.catatan} onChange={(event) => updateDetail(index, "catatan", event.target.value)} />
                </label>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
            <button type="submit" className="button success" disabled={submitting}>
              {submitting ? "Memproses..." : "Verifikasi"}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default AdminReturnsPage;

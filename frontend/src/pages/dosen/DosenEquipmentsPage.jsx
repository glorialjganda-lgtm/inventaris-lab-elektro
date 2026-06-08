import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get, post } from "../../services/api.js";
import {
  formatStatusLabel,
  getCategoryName,
  getEquipmentCategory,
  getEquipmentCode,
  getEquipmentLab,
  getEquipmentName,
  getLabName,
  isEquipmentAvailable,
  isGoodCondition,
  pickArray,
  statusVariant,
} from "./dosenHelpers.js";

const emptyForm = {
  tanggal_pinjam: "",
  tanggal_kembali_rencana: "",
  keperluan: "",
  nama_kegiatan: "",
  catatan_pengajuan: "",
};

const keperluanOptions = ["praktikum", "penelitian", "tugas_akhir", "pengujian", "proyek", "lainnya"];
const kondisiOptions = ["baik", "rusak_ringan", "rusak_berat", "hilang"];
const statusOptions = ["tersedia", "dipinjam", "dalam_perawatan", "tidak_aktif"];

const DosenEquipmentsPage = () => {
  const navigate = useNavigate();
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [labFilter, setLabFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [kondisiFilter, setKondisiFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("tersedia");
  const [modalMode, setModalMode] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await get("/equipments");
      setEquipments(pickArray(data, ["equipments"]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const labs = useMemo(() => {
    const map = new Map();
    equipments.forEach((item) => {
      const lab = getEquipmentLab(item);
      if (lab?.id) map.set(String(lab.id), lab.nama_lab || "-");
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [equipments]);

  const categories = useMemo(() => {
    const map = new Map();
    equipments.forEach((item) => {
      const category = getEquipmentCategory(item);
      if (category?.id) map.set(String(category.id), category.nama_kategori || "-");
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [equipments]);

  const filteredEquipments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return equipments.filter((item) => {
      const lab = getEquipmentLab(item);
      const category = getEquipmentCategory(item);
      const status = item.status || item.status_ketersediaan;
      const matchesSearch =
        !keyword ||
        [getEquipmentCode(item), getEquipmentName(item), lab?.nama_lab, category?.nama_kategori, item.merek || item.merk, item.model]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      return (
        matchesSearch &&
        (!labFilter || String(item.lab_id || lab?.id) === String(labFilter)) &&
        (!categoryFilter || String(item.category_id || category?.id) === String(categoryFilter)) &&
        (!kondisiFilter || item.kondisi === kondisiFilter) &&
        (!statusFilter || status === statusFilter)
      );
    });
  }, [equipments, search, labFilter, categoryFilter, kondisiFilter, statusFilter]);

  const openDetail = async (item) => {
    setError("");
    try {
      const detail = await get(`/equipments/${item.id}`);
      setSelectedEquipment(detail || item);
      setModalMode("detail");
    } catch (err) {
      setError(err.message);
    }
  };

  const openBorrowing = (item) => {
    setSelectedEquipment(item);
    setForm(emptyForm);
    setError("");
    setModalMode("borrow");
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setSelectedEquipment(null);
    setForm(emptyForm);
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const validateForm = () => {
    if (!selectedEquipment?.id) return "Alat wajib dipilih.";
    if (!form.tanggal_pinjam) return "Tanggal pinjam wajib diisi.";
    if (!form.tanggal_kembali_rencana) return "Tanggal kembali rencana wajib diisi.";
    if (form.tanggal_kembali_rencana < form.tanggal_pinjam) return "Tanggal kembali tidak boleh sebelum tanggal pinjam.";
    if (!form.keperluan) return "Keperluan wajib dipilih.";
    if (!form.nama_kegiatan.trim()) return "Nama kegiatan wajib diisi.";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await post("/borrowings", {
        equipment_ids: [selectedEquipment.id],
        tanggal_pinjam: form.tanggal_pinjam,
        tanggal_kembali_rencana: form.tanggal_kembali_rencana,
        keperluan: form.keperluan,
        nama_kegiatan: form.nama_kegiatan.trim(),
        catatan_pengajuan: form.catatan_pengajuan.trim() || null,
      });
      setNotice("Pengajuan peminjaman berhasil dikirim. Silakan pantau status pada menu Status Peminjaman.");
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
    { key: "kode", label: "Kode Inventaris", render: (row) => getEquipmentCode(row) },
    { key: "nama", label: "Nama Alat", render: (row) => getEquipmentName(row) },
    { key: "lab", label: "Laboratorium", render: (row) => getLabName(getEquipmentLab(row)) },
    { key: "kategori", label: "Kategori", render: (row) => getCategoryName(getEquipmentCategory(row)) },
    { key: "merek", label: "Merek/Model", render: (row) => [row.merek || row.merk, row.model].filter(Boolean).join(" / ") || "-" },
    { key: "kondisi", label: "Kondisi", render: (row) => <Badge variant={statusVariant(row.kondisi)}>{formatStatusLabel(row.kondisi)}</Badge> },
    { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status || row.status_ketersediaan)}>{formatStatusLabel(row.status || row.status_ketersediaan)}</Badge> },
    { key: "lokasi", label: "Lokasi Detail", render: (row) => row.lokasi_detail || "-" },
  ];

  return (
    <DashboardLayout title="Alat Tersedia">
      <section className="page-header">
        <div>
          <span className="eyebrow">ALAT TERSEDIA</span>
          <h2>Daftar Alat Laboratorium</h2>
          <p>Pilih alat yang tersedia dan ajukan peminjaman untuk kegiatan akademik.</p>
        </div>
        <button type="button" className="button primary" onClick={() => navigate("/dosen/borrowings/create")}>Ajukan Multi Alat</button>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode, nama alat, lab, kategori, merek, atau model..." />
          <select value={labFilter} onChange={(event) => setLabFilter(event.target.value)}>
            <option value="">Semua Lab</option>
            {labs.map((lab) => <option value={lab.id} key={lab.id}>{lab.name}</option>)}
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">Semua Kategori</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
          </select>
          <select value={kondisiFilter} onChange={(event) => setKondisiFilter(event.target.value)}>
            <option value="">Semua Kondisi</option>
            {kondisiOptions.map((value) => <option value={value} key={value}>{formatStatusLabel(value)}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Semua Status</option>
            {statusOptions.map((value) => <option value={value} key={value}>{formatStatusLabel(value)}</option>)}
          </select>
          <button type="button" className="button secondary" onClick={loadData}>Refresh</button>
        </div>
        <DataTable
          columns={columns}
          data={filteredEquipments}
          loading={loading}
          emptyTitle="Belum ada alat tersedia"
          emptyMessage={equipments.length ? "Tidak ada alat yang sesuai filter." : "Data alat akan tampil di sini."}
          actions={(row) => (
            <div className="action-buttons">
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>Detail</button>
              {isEquipmentAvailable(row) && isGoodCondition(row) ? (
                <button type="button" className="button success small" onClick={() => openBorrowing(row)}>Ajukan Pinjam</button>
              ) : null}
            </div>
          )}
        />
      </Card>

      <Modal open={modalMode === "detail"} title="Detail Alat" onClose={closeModal}>
        {selectedEquipment ? (
          <div className="detail-grid">
            <span><b>Kode Inventaris</b>{getEquipmentCode(selectedEquipment)}</span>
            <span><b>Nama Alat</b>{getEquipmentName(selectedEquipment)}</span>
            <span><b>Laboratorium</b>{getLabName(getEquipmentLab(selectedEquipment))}</span>
            <span><b>Kategori</b>{getCategoryName(getEquipmentCategory(selectedEquipment))}</span>
            <span><b>Merek</b>{selectedEquipment.merek || selectedEquipment.merk || "-"}</span>
            <span><b>Model</b>{selectedEquipment.model || "-"}</span>
            <span><b>Kondisi</b><Badge variant={statusVariant(selectedEquipment.kondisi)}>{formatStatusLabel(selectedEquipment.kondisi)}</Badge></span>
            <span><b>Status</b><Badge variant={statusVariant(selectedEquipment.status || selectedEquipment.status_ketersediaan)}>{formatStatusLabel(selectedEquipment.status || selectedEquipment.status_ketersediaan)}</Badge></span>
            <span className="detail-span"><b>Lokasi Detail</b>{selectedEquipment.lokasi_detail || "-"}</span>
            <span className="detail-span"><b>Keterangan</b>{selectedEquipment.keterangan || selectedEquipment.deskripsi || "-"}</span>
          </div>
        ) : null}
      </Modal>

      <Modal open={modalMode === "borrow"} title="Ajukan Peminjaman" onClose={closeModal}>
        {error && modalMode === "borrow" ? <div className="alert danger">{error}</div> : null}
        {selectedEquipment ? (
          <form className="form-grid" onSubmit={handleSubmit}>
            <span className="detail-span item-card">
              <strong>{getEquipmentCode(selectedEquipment)} - {getEquipmentName(selectedEquipment)}</strong>
              <span>{getLabName(getEquipmentLab(selectedEquipment))}</span>
            </span>
            <label>Tanggal Pinjam<input type="date" value={form.tanggal_pinjam} onChange={(event) => updateForm("tanggal_pinjam", event.target.value)} /></label>
            <label>Tanggal Kembali Rencana<input type="date" value={form.tanggal_kembali_rencana} onChange={(event) => updateForm("tanggal_kembali_rencana", event.target.value)} /></label>
            <label className="form-span">Nama Kegiatan<input value={form.nama_kegiatan} onChange={(event) => updateForm("nama_kegiatan", event.target.value)} /></label>
            <label>
              Keperluan
              <select value={form.keperluan} onChange={(event) => updateForm("keperluan", event.target.value)}>
                <option value="">Pilih keperluan</option>
                {keperluanOptions.map((value) => <option value={value} key={value}>{formatStatusLabel(value)}</option>)}
              </select>
            </label>
            <label className="form-span">Catatan Pengajuan<textarea value={form.catatan_pengajuan} onChange={(event) => updateForm("catatan_pengajuan", event.target.value)} /></label>
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
              <button type="submit" className="button primary" disabled={submitting}>{submitting ? "Mengirim..." : "Ajukan Peminjaman"}</button>
            </div>
          </form>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
};

export default DosenEquipmentsPage;

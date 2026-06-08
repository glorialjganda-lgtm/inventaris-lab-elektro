import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
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

const keperluanOptions = ["praktikum", "penelitian", "tugas_akhir", "pengujian", "proyek", "lainnya"];
const emptyForm = {
  tanggal_pinjam: "",
  tanggal_kembali_rencana: "",
  keperluan: "",
  nama_kegiatan: "",
  catatan_pengajuan: "",
};

const DosenBorrowingCreatePage = () => {
  const navigate = useNavigate();
  const [equipments, setEquipments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

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

  const availableEquipments = useMemo(
    () => equipments.filter((item) => isEquipmentAvailable(item) && isGoodCondition(item)),
    [equipments]
  );

  const filteredEquipments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return availableEquipments.filter((item) => {
      if (!keyword) return true;
      return [getEquipmentCode(item), getEquipmentName(item), getLabName(getEquipmentLab(item)), getCategoryName(getEquipmentCategory(item))]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [availableEquipments, search]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const toggleEquipment = (id) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const validateForm = () => {
    if (!selectedIds.length) return "Minimal satu alat wajib dipilih.";
    if (!form.tanggal_pinjam) return "Tanggal pinjam wajib diisi.";
    if (!form.tanggal_kembali_rencana) return "Tanggal kembali wajib diisi.";
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
        equipment_ids: selectedIds,
        tanggal_pinjam: form.tanggal_pinjam,
        tanggal_kembali_rencana: form.tanggal_kembali_rencana,
        keperluan: form.keperluan,
        nama_kegiatan: form.nama_kegiatan.trim(),
        catatan_pengajuan: form.catatan_pengajuan.trim() || null,
      });
      setNotice("Pengajuan peminjaman berhasil dikirim.");
      setSelectedIds([]);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "pilih", label: "Pilih", render: (row) => <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleEquipment(row.id)} /> },
    { key: "kode", label: "Kode Inventaris", render: (row) => getEquipmentCode(row) },
    { key: "nama", label: "Nama Alat", render: (row) => getEquipmentName(row) },
    { key: "lab", label: "Laboratorium", render: (row) => getLabName(getEquipmentLab(row)) },
    { key: "kategori", label: "Kategori", render: (row) => getCategoryName(getEquipmentCategory(row)) },
    { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status || row.status_ketersediaan)}>{formatStatusLabel(row.status || row.status_ketersediaan)}</Badge> },
  ];

  return (
    <DashboardLayout title="Ajukan Peminjaman">
      <section className="page-header">
        <div>
          <span className="eyebrow">PEMINJAMAN</span>
          <h2>Ajukan Peminjaman</h2>
          <p>Pilih satu atau lebih alat tersedia. Endpoint backend saat ini mendukung beberapa alat dalam satu pengajuan.</p>
        </div>
      </section>

      {notice ? <div className="alert success">{notice} <button type="button" className="button secondary small" onClick={() => navigate("/dosen/borrowings/status")}>Lihat Status</button></div> : null}
      {error && !submitting ? <div className="alert danger">{error}</div> : null}
      {error && loading ? <ErrorState message={error} onRetry={loadData} /> : null}

      <section className="dashboard-two-column">
        <Card title="Daftar Alat Tersedia">
          <div className="toolbar">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode, nama alat, lab, atau kategori..." />
            <button type="button" className="button secondary" onClick={loadData}>Refresh</button>
          </div>
          <DataTable
            columns={columns}
            data={filteredEquipments}
            loading={loading}
            emptyTitle="Tidak ada alat tersedia"
            emptyMessage={equipments.length ? "Tidak ada alat tersedia yang sesuai pencarian." : "Data alat akan tampil di sini."}
          />
        </Card>

        <Card title="Form Pengajuan">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="detail-span item-card">
              <strong>{selectedIds.length} alat dipilih</strong>
              <span>Semua alat dalam satu pengajuan harus berasal dari laboratorium yang sama.</span>
            </div>
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
              <button type="button" className="button secondary" onClick={() => navigate("/dosen/equipments")}>Batal</button>
              <button type="submit" className="button primary" disabled={submitting}>{submitting ? "Mengirim..." : "Ajukan Peminjaman"}</button>
            </div>
          </form>
        </Card>
      </section>
    </DashboardLayout>
  );
};

export default DosenBorrowingCreatePage;

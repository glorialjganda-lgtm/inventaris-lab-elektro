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
  getArrayData,
  getCategoryName,
  getEquipmentCategory,
  getEquipmentCode,
  getEquipmentLab,
  getEquipmentName,
  getLabName,
  getStatusBadgeVariant,
  isEquipmentAvailable,
  isGoodCondition,
} from "./mahasiswaHelpers.js";

const STORAGE_KEY = "mahasiswa_selected_equipments";
const keperluanOptions = ["praktikum", "penelitian", "tugas_akhir", "pengujian", "proyek", "lainnya"];
const emptyForm = {
  dosen_id: "",
  tanggal_pinjam: "",
  tanggal_kembali_rencana: "",
  keperluan: "",
  nama_kegiatan: "",
  catatan_pengajuan: "",
};

const readStoredIds = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids = JSON.parse(raw || "[]");
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch (error) {
    return [];
  }
};

const MahasiswaBorrowingCreatePage = () => {
  const navigate = useNavigate();
  const [equipments, setEquipments] = useState([]);
  const [dosenOptions, setDosenOptions] = useState([]);
  const [selectedIds, setSelectedIds] = useState(readStoredIds);
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
      const [equipmentData, userData] = await Promise.all([
        get("/equipments"),
        get("/users/dosen-options"),
      ]);
      setEquipments(getArrayData(equipmentData));
      setDosenOptions(getArrayData(userData).filter((user) => user.role === "dosen" && user.status === "aktif"));
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

  const selectedEquipments = useMemo(
    () => availableEquipments.filter((item) => selectedIds.includes(String(item.id))),
    [availableEquipments, selectedIds]
  );

  const toggleEquipment = (id) => {
    setSelectedIds((current) => {
      const value = String(id);
      return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    });
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const validateForm = () => {
    if (!selectedIds.length) return "Minimal satu alat wajib dipilih.";
    if (!form.dosen_id) return "Dosen penanggung jawab wajib dipilih.";
    if (!form.tanggal_pinjam) return "Tanggal pinjam wajib diisi.";
    if (!form.tanggal_kembali_rencana) return "Tanggal kembali wajib diisi.";
    if (form.tanggal_kembali_rencana < form.tanggal_pinjam) return "Tanggal kembali tidak boleh sebelum tanggal pinjam.";
    if (!form.keperluan) return "Keperluan wajib dipilih.";
    if (!form.nama_kegiatan.trim()) return "Nama kegiatan wajib diisi.";

    const labIds = [...new Set(selectedEquipments.map((item) => String(item.lab_id || getEquipmentLab(item)?.id || "")))].filter(Boolean);
    if (labIds.length > 1) return "Pengajuan multi alat harus berasal dari laboratorium yang sama.";
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
        dosen_id: form.dosen_id,
        tanggal_pinjam: form.tanggal_pinjam,
        tanggal_kembali_rencana: form.tanggal_kembali_rencana,
        keperluan: form.keperluan,
        nama_kegiatan: form.nama_kegiatan.trim(),
        catatan_pengajuan: form.catatan_pengajuan.trim() || null,
      });
      localStorage.removeItem(STORAGE_KEY);
      setNotice("Pengajuan berhasil dikirim ke dosen penanggung jawab.");
      navigate("/mahasiswa/borrowings/status");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "pilih", label: "Pilih", render: (row) => <input type="checkbox" checked={selectedIds.includes(String(row.id))} onChange={() => toggleEquipment(row.id)} /> },
    { key: "kode", label: "Kode Inventaris", render: (row) => getEquipmentCode(row) },
    { key: "nama", label: "Nama Alat", render: (row) => getEquipmentName(row) },
    { key: "lab", label: "Laboratorium", render: (row) => getLabName(getEquipmentLab(row)) },
    { key: "kategori", label: "Kategori", render: (row) => getCategoryName(getEquipmentCategory(row)) },
    { key: "status", label: "Status", render: (row) => <Badge variant={getStatusBadgeVariant(row.status || row.status_ketersediaan)}>{formatStatusLabel(row.status || row.status_ketersediaan)}</Badge> },
  ];

  return (
    <DashboardLayout title="Ajukan Peminjaman">
      <section className="page-header">
        <div>
          <span className="eyebrow">PEMINJAMAN MAHASISWA</span>
          <h2>Ajukan Peminjaman</h2>
          <p>Pengajuan mahasiswa dikirim terlebih dahulu ke dosen penanggung jawab, lalu diteruskan ke Kepala Lab setelah disetujui.</p>
        </div>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !loading ? <div className="alert danger">{error}</div> : null}
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
            <div className="detail-span flow-note">
              Pengajuan mahasiswa akan dikirim terlebih dahulu ke dosen penanggung jawab. Setelah disetujui dosen, pengajuan akan diteruskan ke Kepala Lab.
            </div>
            <div className="detail-span item-list selected-equipment-list">
              <strong>{selectedIds.length} alat dipilih</strong>
              {selectedEquipments.map((item) => (
                <div className="item-card" key={item.id}>
                  <strong>{getEquipmentCode(item)} - {getEquipmentName(item)}</strong>
                  <span>{getLabName(getEquipmentLab(item))}</span>
                </div>
              ))}
            </div>
            <label className="form-span">
              Dosen Penanggung Jawab
              <select value={form.dosen_id} onChange={(event) => updateForm("dosen_id", event.target.value)}>
                <option value="">Pilih dosen aktif</option>
                {dosenOptions.map((dosen) => <option value={dosen.id} key={dosen.id}>{dosen.name} - {dosen.email}</option>)}
              </select>
            </label>
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
              <button type="button" className="button secondary" onClick={() => navigate("/mahasiswa/equipments")} disabled={submitting}>Batal</button>
              <button type="submit" className="button primary" disabled={submitting}>{submitting ? "Mengirim..." : "Ajukan Peminjaman"}</button>
            </div>
          </form>
        </Card>
      </section>
    </DashboardLayout>
  );
};

export default MahasiswaBorrowingCreatePage;

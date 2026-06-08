import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { del, get, post, put } from "../../services/api.js";
import { formatDate } from "../../utils/formatters.js";
import {
  filterByLab,
  formatCurrency,
  formatLabel,
  getEquipmentCode,
  getEquipmentLab,
  getMaintenanceCode,
  getMaintenanceEquipment,
  getMaintenanceLab,
  getMaintenanceUser,
  statusVariant,
  toDateInput,
} from "./kepalaLabHelpers.js";

const emptyForm = {
  equipment_id: "",
  jenis_perawatan: "rutin",
  tanggal_perawatan: "",
  teknisi: "",
  biaya: "",
  status: "proses",
  status_akhir_alat: "tersedia",
  deskripsi_masalah: "",
  tindakan: "",
  catatan: "",
};

const jenisOptions = ["rutin", "perbaikan", "kalibrasi", "penggantian_komponen", "pemeriksaan_keamanan"];
const statusOptions = ["proses", "selesai", "gagal"];
const statusAkhirOptions = ["tersedia", "dalam_perawatan", "tidak_aktif"];
const canChangeMaintenance = (item) => item?.status === "proses";

const KepalaLabMaintenancesPage = () => {
  const [maintenances, setMaintenances] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [me, maintenanceData, equipmentData] = await Promise.all([get("/auth/me"), get("/maintenances"), get("/equipments")]);
      const userLabId = me?.user?.lab_id || me?.laboratory?.id || null;
      setMaintenances(Array.isArray(maintenanceData) ? maintenanceData : []);
      setEquipments(filterByLab(Array.isArray(equipmentData) ? equipmentData : [], userLabId, (item) => item.lab_id || getEquipmentLab(item)?.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMaintenances = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return maintenances.filter((item) => {
      const equipment = getMaintenanceEquipment(item);
      const user = getMaintenanceUser(item);
      const matchesSearch =
        !keyword ||
        [getMaintenanceCode(item), equipment?.nama_alat, getEquipmentCode(equipment), user?.name, item.tindakan, item.deskripsi_masalah]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      return matchesSearch && (!statusFilter || item.status === statusFilter);
    });
  }, [maintenances, search, statusFilter]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const fillForm = (data) => {
    setForm({
      equipment_id: data.equipment_id || getMaintenanceEquipment(data)?.id || "",
      jenis_perawatan: data.jenis_perawatan || "rutin",
      tanggal_perawatan: toDateInput(data.tanggal_perawatan),
      teknisi: getMaintenanceUser(data)?.name || "",
      biaya: data.biaya ?? "",
      status: data.status || "proses",
      status_akhir_alat: getMaintenanceEquipment(data)?.status || "tersedia",
      deskripsi_masalah: data.deskripsi_masalah || "",
      tindakan: data.tindakan || "",
      catatan: data.catatan || "",
    });
  };

  const openCreate = () => {
    setSelectedMaintenance(null);
    setForm(emptyForm);
    setError("");
    setModalMode("create");
  };

  const openEdit = async (item) => {
    if (!canChangeMaintenance(item)) {
      setError("Perawatan yang sudah selesai atau gagal hanya dapat dilihat detailnya.");
      return;
    }
    setError("");
    try {
      const detail = await get(`/maintenances/${item.id}`);
      setSelectedMaintenance(detail || item);
      fillForm(detail || item);
      setModalMode("edit");
    } catch (err) {
      setError(err.message);
    }
  };

  const openDetail = async (item) => {
    setError("");
    try {
      const detail = await get(`/maintenances/${item.id}`);
      setSelectedMaintenance(detail || item);
      setModalMode("detail");
    } catch (err) {
      setError(err.message);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setSelectedMaintenance(null);
    setForm(emptyForm);
  };

  const validateForm = () => {
    if (!form.equipment_id) return "Alat wajib dipilih.";
    if (!form.jenis_perawatan) return "Jenis perawatan wajib dipilih.";
    if (!form.tanggal_perawatan) return "Tanggal perawatan wajib diisi.";
    if (!form.status) return "Status wajib dipilih.";
    if (form.biaya !== "" && (!Number.isFinite(Number(form.biaya)) || Number(form.biaya) < 0)) return "Biaya harus berupa angka dan tidak boleh negatif.";
    if (form.status === "selesai" && !form.status_akhir_alat) return "Status akhir alat wajib dipilih saat perawatan selesai.";
    return "";
  };

  const buildPayload = () => {
    const payload = {
      equipment_id: form.equipment_id,
      jenis_perawatan: form.jenis_perawatan,
      tanggal_perawatan: form.tanggal_perawatan,
      biaya: form.biaya === "" ? 0 : Number(form.biaya),
      status: form.status,
      deskripsi_masalah: form.deskripsi_masalah.trim() || null,
      tindakan: form.tindakan.trim() || null,
      catatan: form.catatan.trim() || null,
    };
    if (form.status === "selesai") payload.status_akhir_alat = form.status_akhir_alat;
    return payload;
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
      if (modalMode === "edit" && selectedMaintenance) {
        await put(`/maintenances/${selectedMaintenance.id}`, buildPayload());
        setNotice("Perawatan berhasil diperbarui.");
      } else {
        await post("/maintenances", buildPayload());
        setNotice("Perawatan berhasil ditambahkan.");
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkFailed = async () => {
    if (!canChangeMaintenance(confirmTarget)) {
      setError("Perawatan yang sudah selesai atau gagal hanya dapat dilihat detailnya.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await del(`/maintenances/${confirmTarget.id}`);
      setNotice("Perawatan berhasil ditandai gagal.");
      setConfirmTarget(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "no", label: "No", render: (_, index) => index + 1 },
    { key: "kode", label: "Kode Perawatan", render: (row) => getMaintenanceCode(row) },
    { key: "alat", label: "Alat", render: (row) => getMaintenanceEquipment(row)?.nama_alat || "-" },
    { key: "tanggal", label: "Tanggal Perawatan", render: (row) => formatDate(row.tanggal_perawatan) },
    { key: "jenis", label: "Jenis Perawatan", render: (row) => formatLabel(row.jenis_perawatan) },
    { key: "teknisi", label: "Teknisi", render: (row) => getMaintenanceUser(row)?.name || "-" },
    { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge> },
    { key: "biaya", label: "Biaya", render: (row) => formatCurrency(row.biaya) },
  ];

  return (
    <DashboardLayout title="Perawatan">
      <section className="page-header">
        <div>
          <span className="eyebrow">PERAWATAN</span>
          <h2>Perawatan Alat Lab</h2>
          <p>Kelola jadwal dan riwayat perawatan alat pada laboratorium Anda.</p>
          <p className="muted">Kepala lab dapat menambah perawatan, mengubah data selama masih proses, melihat detail, dan menandai gagal tanpa menghapus histori.</p>
        </div>
        <button type="button" className="button primary" onClick={openCreate}>Tambah Perawatan</button>
      </section>
      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode && !confirmTarget ? <ErrorState message={error} onRetry={loadData} /> : null}
      <Card>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode, alat, teknisi, atau tindakan..." />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Semua Status</option>
            {statusOptions.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}
          </select>
          <button type="button" className="button secondary" onClick={loadData}>Refresh</button>
        </div>
        <DataTable
          columns={columns}
          data={filteredMaintenances}
          loading={loading}
          emptyTitle="Belum ada data perawatan"
          emptyMessage={maintenances.length ? "Tidak ada perawatan yang sesuai filter." : "Data perawatan alat lab akan tampil di sini."}
          actions={(row) => (
            <div className="action-buttons">
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>Detail</button>
              {canChangeMaintenance(row) ? (
                <>
                  <button type="button" className="button secondary small" onClick={() => openEdit(row)}>Edit</button>
                  <button type="button" className="button danger small" onClick={() => setConfirmTarget(row)}>Gagal</button>
                </>
              ) : null}
            </div>
          )}
        />
      </Card>

      <Modal open={modalMode === "create" || modalMode === "edit"} title={modalMode === "edit" ? "Edit Perawatan" : "Tambah Perawatan"} onClose={closeModal}>
        {error && modalMode !== "detail" ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Alat
            <select value={form.equipment_id} onChange={(event) => updateForm("equipment_id", event.target.value)}>
              <option value="">Pilih alat</option>
              {equipments.map((equipment) => <option value={equipment.id} key={equipment.id}>{getEquipmentCode(equipment)} - {equipment.nama_alat || "-"}</option>)}
            </select>
          </label>
          <label>
            Jenis Perawatan
            <select value={form.jenis_perawatan} onChange={(event) => updateForm("jenis_perawatan", event.target.value)}>
              {jenisOptions.map((jenis) => <option value={jenis} key={jenis}>{formatLabel(jenis)}</option>)}
            </select>
          </label>
          <label>Tanggal Perawatan<input type="date" value={form.tanggal_perawatan} onChange={(event) => updateForm("tanggal_perawatan", event.target.value)} /></label>
          <label>Teknisi<input value={form.teknisi} onChange={(event) => updateForm("teknisi", event.target.value)} placeholder="Opsional" /></label>
          <label>Biaya<input type="number" min="0" value={form.biaya} onChange={(event) => updateForm("biaya", event.target.value)} /></label>
          <label>
            Status
            <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
              {statusOptions.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}
            </select>
          </label>
          {form.status === "selesai" ? (
            <label>
              Status Akhir Alat
              <select value={form.status_akhir_alat} onChange={(event) => updateForm("status_akhir_alat", event.target.value)}>
                {statusAkhirOptions.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}
              </select>
            </label>
          ) : null}
          <label className="form-span">Deskripsi Masalah<textarea value={form.deskripsi_masalah} onChange={(event) => updateForm("deskripsi_masalah", event.target.value)} /></label>
          <label className="form-span">Tindakan<textarea value={form.tindakan} onChange={(event) => updateForm("tindakan", event.target.value)} /></label>
          <label className="form-span">Catatan<textarea value={form.catatan} onChange={(event) => updateForm("catatan", event.target.value)} /></label>
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
            <button type="submit" className="button primary" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={modalMode === "detail"} title="Detail Perawatan" onClose={closeModal}>
        {selectedMaintenance ? (
          <div className="detail-grid">
            <span><b>Kode Perawatan</b>{getMaintenanceCode(selectedMaintenance)}</span>
            <span><b>Alat</b>{getMaintenanceEquipment(selectedMaintenance)?.nama_alat || "-"}</span>
            <span><b>Laboratorium</b>{getMaintenanceLab(selectedMaintenance)?.nama_lab || "-"}</span>
            <span><b>Tanggal Perawatan</b>{formatDate(selectedMaintenance.tanggal_perawatan)}</span>
            <span><b>Jenis Perawatan</b>{formatLabel(selectedMaintenance.jenis_perawatan)}</span>
            <span><b>Teknisi</b>{getMaintenanceUser(selectedMaintenance)?.name || "-"}</span>
            <span><b>Status</b><Badge variant={statusVariant(selectedMaintenance.status)}>{formatLabel(selectedMaintenance.status)}</Badge></span>
            <span><b>Biaya</b><em className="price-text">{formatCurrency(selectedMaintenance.biaya)}</em></span>
            <span className="detail-span"><b>Deskripsi Masalah</b>{selectedMaintenance.deskripsi_masalah || "-"}</span>
            <span className="detail-span"><b>Tindakan</b>{selectedMaintenance.tindakan || "-"}</span>
            <span className="detail-span"><b>Catatan</b>{selectedMaintenance.catatan || "-"}</span>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(confirmTarget)} title="Tandai Perawatan Gagal" onClose={() => (!submitting ? setConfirmTarget(null) : null)}>
        {error && confirmTarget ? <div className="alert danger">{error}</div> : null}
        <div className="confirm-content">
          <p>Perawatan ini akan ditandai gagal tanpa menghapus histori.</p>
          <strong>{getMaintenanceCode(confirmTarget)} - {getMaintenanceEquipment(confirmTarget)?.nama_alat || "-"}</strong>
        </div>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={() => setConfirmTarget(null)} disabled={submitting}>Batal</button>
          <button type="button" className="button danger" onClick={handleMarkFailed} disabled={submitting}>{submitting ? "Memproses..." : "Ya, Gagal"}</button>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default KepalaLabMaintenancesPage;

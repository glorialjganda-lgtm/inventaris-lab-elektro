import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { del, get, post, put } from "../../services/api.js";
import { formatDate } from "../../utils/formatters.js";

const emptyForm = {
  kode_inventaris: "",
  nama_alat: "",
  lab_id: "",
  category_id: "",
  merek: "",
  model: "",
  nomor_seri: "",
  tahun_pengadaan: "",
  sumber_dana: "",
  harga: "",
  kondisi: "baik",
  status: "tersedia",
  lokasi_detail: "",
  keterangan: "",
};

const kondisiOptions = ["baik", "rusak_ringan", "rusak_berat", "hilang"];
const statusOptions = ["tersedia", "dipinjam", "dalam_perawatan", "tidak_aktif"];

const readValue = (item, keys, fallback = "-") => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const getEquipmentCode = (equipment) =>
  readValue(equipment, [
    "kode_inventaris",
    "kode_alat",
    "kode_barang",
    "kode_equipment",
    "kode",
    "nomor_inventaris",
  ]);
const getBrand = (equipment) => readValue(equipment, ["merek", "merk"], "");
const getSerial = (equipment) => readValue(equipment, ["nomor_seri", "serial_number"], "");
const getStatus = (equipment) => readValue(equipment, ["status", "status_ketersediaan"], "");
const getDescription = (equipment) => readValue(equipment, ["keterangan", "deskripsi"], "");
const getPhoto = (equipment) => readValue(equipment, ["foto", "foto_url"], "");

const getLabName = (equipment) =>
  equipment?.laboratory?.nama_lab || equipment?.lab?.nama_lab || "-";

const getCategoryName = (equipment) => equipment?.category?.nama_kategori || "-";

const formatLabel = (value) => {
  if (!value) return "-";
  const labels = {
    baik: "Baik",
    rusak_ringan: "Rusak Ringan",
    rusak_berat: "Rusak Berat",
    hilang: "Hilang",
    tersedia: "Tersedia",
    dipinjam: "Dipinjam",
    dalam_perawatan: "Dalam Perawatan",
    maintenance: "Dalam Perawatan",
    tidak_aktif: "Tidak Aktif",
    tidak_tersedia: "Tidak Aktif",
    nonaktif: "Tidak Aktif",
  };
  return labels[value] || value.replaceAll("_", " ");
};

const kondisiVariant = (kondisi) => {
  if (kondisi === "baik") return "success";
  if (kondisi === "rusak_ringan") return "warning";
  return "danger";
};

const statusVariant = (status) => {
  if (status === "tersedia") return "success";
  if (status === "dipinjam") return "info";
  if (status === "dalam_perawatan" || status === "maintenance") return "warning";
  return "neutral";
};

const isInactive = (equipment) => {
  const status = getStatus(equipment);
  return status === "tidak_aktif" || status === "tidak_tersedia" || status === "nonaktif";
};

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
};

const buildModelText = (equipment) => {
  const parts = [getBrand(equipment), equipment.model].filter(Boolean);
  return parts.length ? parts.join(" / ") : "-";
};

const AdminEquipmentsPage = () => {
  const [equipments, setEquipments] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [labFilter, setLabFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [kondisiFilter, setKondisiFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [equipmentData, labData, categoryData] = await Promise.all([
        get("/equipments"),
        get("/laboratories"),
        get("/categories"),
      ]);
      setEquipments(Array.isArray(equipmentData) ? equipmentData : []);
      setLaboratories(Array.isArray(labData) ? labData : []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEquipments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return equipments.filter((equipment) => {
      const matchesSearch =
        !keyword ||
        [
          getEquipmentCode(equipment),
          equipment.nama_alat,
          getBrand(equipment),
          equipment.model,
          getSerial(equipment),
          getLabName(equipment),
          getCategoryName(equipment),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      const matchesLab = !labFilter || equipment.lab_id === labFilter;
      const matchesCategory = !categoryFilter || equipment.category_id === categoryFilter;
      const matchesKondisi = !kondisiFilter || equipment.kondisi === kondisiFilter;
      const matchesStatus = !statusFilter || getStatus(equipment) === statusFilter;

      return matchesSearch && matchesLab && matchesCategory && matchesKondisi && matchesStatus;
    });
  }, [equipments, search, labFilter, categoryFilter, kondisiFilter, statusFilter]);

  const openCreate = () => {
    setSelectedEquipment(null);
    setForm(emptyForm);
    setModalMode("create");
    setError("");
  };

  const fillForm = (data) => {
    setForm({
      kode_inventaris: getEquipmentCode(data) === "-" ? "" : getEquipmentCode(data),
      nama_alat: data.nama_alat || "",
      lab_id: data.lab_id || "",
      category_id: data.category_id || "",
      merek: getBrand(data),
      model: data.model || "",
      nomor_seri: getSerial(data),
      tahun_pengadaan: data.tahun_pengadaan || "",
      sumber_dana: data.sumber_dana || "",
      harga: data.harga ?? "",
      kondisi: data.kondisi || "baik",
      status: getStatus(data) || "tersedia",
      lokasi_detail: data.lokasi_detail || "",
      keterangan: getDescription(data),
    });
  };

  const openEdit = async (equipment) => {
    setError("");
    try {
      const detail = await get(`/equipments/${equipment.id}`);
      const data = detail || equipment;
      setSelectedEquipment(data);
      fillForm(data);
      setModalMode("edit");
    } catch (err) {
      setError(err.message);
    }
  };

  const openDetail = async (equipment) => {
    setError("");
    try {
      const detail = await get(`/equipments/${equipment.id}`);
      setSelectedEquipment(detail || equipment);
      setModalMode("detail");
    } catch (err) {
      setError(err.message);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setSelectedEquipment(null);
    setForm(emptyForm);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    if (!form.kode_inventaris.trim()) return "Kode inventaris wajib diisi.";
    if (!form.nama_alat.trim()) return "Nama alat wajib diisi.";
    if (!form.lab_id) return "Laboratorium wajib dipilih.";
    if (!form.category_id) return "Kategori wajib dipilih.";
    if (!form.kondisi) return "Kondisi wajib dipilih.";
    if (!form.status) return "Status wajib dipilih.";
    if (form.tahun_pengadaan && !Number.isFinite(Number(form.tahun_pengadaan))) {
      return "Tahun pengadaan harus berupa angka.";
    }
    if (form.harga && !Number.isFinite(Number(form.harga))) {
      return "Harga harus berupa angka.";
    }
    return "";
  };

  const buildPayload = () => ({
    kode_inventaris: form.kode_inventaris.trim(),
    nama_alat: form.nama_alat.trim(),
    lab_id: form.lab_id,
    category_id: form.category_id,
    merek: form.merek.trim() || null,
    model: form.model.trim() || null,
    nomor_seri: form.nomor_seri.trim() || null,
    tahun_pengadaan: form.tahun_pengadaan ? Number(form.tahun_pengadaan) : null,
    sumber_dana: form.sumber_dana.trim() || null,
    harga: form.harga ? Number(form.harga) : 0,
    kondisi: form.kondisi,
    status: form.status,
    lokasi_detail: form.lokasi_detail.trim() || null,
    keterangan: form.keterangan.trim() || null,
  });

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
      const payload = buildPayload();
      if (modalMode === "edit" && selectedEquipment) {
        await put(`/equipments/${selectedEquipment.id}`, payload);
        setNotice("Alat berhasil diperbarui.");
      } else {
        await post("/equipments", payload);
        setNotice("Alat berhasil ditambahkan.");
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const requestDeactivate = (equipment) => {
    if (isInactive(equipment)) return;
    setError("");
    setConfirmTarget(equipment);
  };

  const handleDeactivate = async () => {
    if (!confirmTarget || isInactive(confirmTarget)) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await del(`/equipments/${confirmTarget.id}`);
      setNotice("Alat berhasil dinonaktifkan.");
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
    { key: "kode_inventaris", label: "Kode Inventaris", render: (row) => getEquipmentCode(row) },
    { key: "nama_alat", label: "Nama Alat", render: (row) => row.nama_alat || "-" },
    { key: "laboratory", label: "Laboratorium", render: (row) => getLabName(row) },
    { key: "category", label: "Kategori", render: (row) => getCategoryName(row) },
    { key: "merek_model", label: "Merek/Model", render: (row) => buildModelText(row) },
    { key: "tahun_pengadaan", label: "Tahun", render: (row) => row.tahun_pengadaan || "-" },
    {
      key: "kondisi",
      label: "Kondisi",
      render: (row) => <Badge variant={kondisiVariant(row.kondisi)}>{formatLabel(row.kondisi)}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge variant={statusVariant(getStatus(row))}>{formatLabel(getStatus(row))}</Badge>,
    },
  ];

  return (
    <DashboardLayout title="Manajemen Inventaris">
      <section className="page-header equipment-page">
        <div>
          <span className="eyebrow">INVENTARIS</span>
          <h2>Manajemen Inventaris</h2>
          <p>Kelola data peralatan laboratorium Teknik Elektro.</p>
        </div>
        <Button onClick={openCreate}>Tambah Alat</Button>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode && !confirmTarget ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar equipment-toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, nama alat, merek, model, nomor seri..."
          />
          <select value={labFilter} onChange={(event) => setLabFilter(event.target.value)}>
            <option value="">Semua Laboratorium</option>
            {laboratories.map((lab) => (
              <option value={lab.id} key={lab.id}>{lab.nama_lab}</option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">Semua Kategori</option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>{category.nama_kategori}</option>
            ))}
          </select>
          <select value={kondisiFilter} onChange={(event) => setKondisiFilter(event.target.value)}>
            <option value="">Semua Kondisi</option>
            {kondisiOptions.map((kondisi) => (
              <option value={kondisi} key={kondisi}>{formatLabel(kondisi)}</option>
            ))}
          </select>
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
          data={filteredEquipments}
          loading={loading}
          emptyMessage="Tidak ada alat yang sesuai filter."
          actions={(row) => (
            <div className="action-buttons">
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>
                Detail
              </button>
              <button type="button" className="button secondary small" onClick={() => openEdit(row)}>
                Edit
              </button>
              <button
                type="button"
                className="button danger small"
                onClick={() => requestDeactivate(row)}
                disabled={submitting || isInactive(row)}
              >
                {isInactive(row) ? "Sudah Nonaktif" : "Nonaktifkan"}
              </button>
            </div>
          )}
        />
      </Card>

      <Modal
        open={modalMode === "create" || modalMode === "edit"}
        title={modalMode === "edit" ? "Edit Alat" : "Tambah Alat"}
        onClose={closeModal}
      >
        {error && modalMode !== "detail" ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid equipment-form" onSubmit={handleSubmit}>
          <label>
            Kode Inventaris
            <input value={form.kode_inventaris} onChange={(event) => updateForm("kode_inventaris", event.target.value)} />
          </label>
          <label>
            Nama Alat
            <input value={form.nama_alat} onChange={(event) => updateForm("nama_alat", event.target.value)} />
          </label>
          <label>
            Laboratorium
            <select value={form.lab_id} onChange={(event) => updateForm("lab_id", event.target.value)}>
              <option value="">Pilih laboratorium</option>
              {laboratories.map((lab) => (
                <option value={lab.id} key={lab.id}>{lab.nama_lab}</option>
              ))}
            </select>
          </label>
          <label>
            Kategori
            <select value={form.category_id} onChange={(event) => updateForm("category_id", event.target.value)}>
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>{category.nama_kategori}</option>
              ))}
            </select>
          </label>
          <label>
            Merek
            <input value={form.merek} onChange={(event) => updateForm("merek", event.target.value)} />
          </label>
          <label>
            Model
            <input value={form.model} onChange={(event) => updateForm("model", event.target.value)} />
          </label>
          <label>
            Nomor Seri
            <input value={form.nomor_seri} onChange={(event) => updateForm("nomor_seri", event.target.value)} />
          </label>
          <label>
            Tahun Pengadaan
            <input type="number" value={form.tahun_pengadaan} onChange={(event) => updateForm("tahun_pengadaan", event.target.value)} />
          </label>
          <label>
            Sumber Dana
            <input value={form.sumber_dana} onChange={(event) => updateForm("sumber_dana", event.target.value)} />
          </label>
          <label>
            Harga
            <input type="number" value={form.harga} onChange={(event) => updateForm("harga", event.target.value)} />
          </label>
          <label>
            Kondisi
            <select value={form.kondisi} onChange={(event) => updateForm("kondisi", event.target.value)}>
              {kondisiOptions.map((kondisi) => (
                <option value={kondisi} key={kondisi}>{formatLabel(kondisi)}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
              {statusOptions.map((status) => (
                <option value={status} key={status}>{formatLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="form-span">
            Lokasi Detail
            <input value={form.lokasi_detail} onChange={(event) => updateForm("lokasi_detail", event.target.value)} />
          </label>
          <label className="form-span">
            Keterangan
            <textarea value={form.keterangan} onChange={(event) => updateForm("keterangan", event.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="button primary" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={modalMode === "detail"} title="Detail Alat" onClose={closeModal}>
        {selectedEquipment ? (
          <div className="detail-grid equipment-detail">
            <span><b>Kode Inventaris</b>{getEquipmentCode(selectedEquipment)}</span>
            <span><b>Nama Alat</b>{selectedEquipment.nama_alat || "-"}</span>
            <span><b>Laboratorium</b>{getLabName(selectedEquipment)}</span>
            <span><b>Kategori</b>{getCategoryName(selectedEquipment)}</span>
            <span><b>Merek</b>{getBrand(selectedEquipment) || "-"}</span>
            <span><b>Model</b>{selectedEquipment.model || "-"}</span>
            <span><b>Nomor Seri</b>{getSerial(selectedEquipment) || "-"}</span>
            <span><b>Tahun Pengadaan</b>{selectedEquipment.tahun_pengadaan || "-"}</span>
            <span><b>Sumber Dana</b>{selectedEquipment.sumber_dana || "-"}</span>
            <span><b>Harga</b><em className="price-text">{formatCurrency(selectedEquipment.harga)}</em></span>
            <span><b>Kondisi</b><Badge variant={kondisiVariant(selectedEquipment.kondisi)}>{formatLabel(selectedEquipment.kondisi)}</Badge></span>
            <span><b>Status</b><Badge variant={statusVariant(getStatus(selectedEquipment))}>{formatLabel(getStatus(selectedEquipment))}</Badge></span>
            <span><b>Lokasi Detail</b>{selectedEquipment.lokasi_detail || "-"}</span>
            <span><b>Penanggung Jawab</b>{selectedEquipment.penanggung_jawab?.name || selectedEquipment.user?.name || "-"}</span>
            <span className="detail-span"><b>Keterangan</b>{getDescription(selectedEquipment) || "-"}</span>
            <span><b>Tanggal Dibuat</b>{formatDate(selectedEquipment.created_at)}</span>
            <span>
              <b>Foto</b>
              {getPhoto(selectedEquipment) ? (
                <a className="detail-link" href={getPhoto(selectedEquipment)} target="_blank" rel="noreferrer">Lihat Foto</a>
              ) : "-"}
            </span>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(confirmTarget)}
        title="Konfirmasi Nonaktifkan"
        onClose={() => (!submitting ? setConfirmTarget(null) : null)}
      >
        {error && confirmTarget ? <div className="alert danger">{error}</div> : null}
        <div className="confirm-content">
          <p>Apakah Anda yakin ingin menonaktifkan alat ini?</p>
          <strong>{confirmTarget?.nama_alat || "-"} ({getEquipmentCode(confirmTarget)})</strong>
        </div>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={() => setConfirmTarget(null)} disabled={submitting}>
            Batal
          </button>
          <button type="button" className="button danger" onClick={handleDeactivate} disabled={submitting}>
            {submitting ? "Memproses..." : "Ya, Nonaktifkan"}
          </button>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default AdminEquipmentsPage;

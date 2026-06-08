import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { del, get, post, put } from "../../services/api.js";

const emptyForm = {
  kode_lab: "",
  nama_lab: "",
  lokasi: "",
  deskripsi: "",
  kepala_lab_nama: "",
  status: "aktif",
};

const statusOptions = ["aktif", "nonaktif"];
const statusVariant = (status) => (status === "aktif" ? "success" : "neutral");
const getKepalaLab = (lab) =>
  lab?.kepala_lab ||
  lab?.head ||
  lab?.user ||
  lab?.kepalaLab ||
  null;
const getKepalaLabName = (lab) =>
  lab?.kepala_lab_nama ||
  lab?.nama_kepala_lab ||
  lab?.kepala_lab_name ||
  lab?.head_name ||
  getKepalaLab(lab)?.name ||
  "Belum diisi";

const AdminLaboratoriesPage = () => {
  const [laboratories, setLaboratories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedLab, setSelectedLab] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const labData = await get("/laboratories");
      setLaboratories(Array.isArray(labData) ? labData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLabs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return laboratories.filter((lab) => {
      const matchesSearch =
        !keyword ||
        [lab.kode_lab, lab.nama_lab, lab.lokasi, getKepalaLabName(lab)]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesStatus = !statusFilter || lab.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [laboratories, search, statusFilter]);

  const openCreate = () => {
    setSelectedLab(null);
    setForm(emptyForm);
    setModalMode("create");
    setError("");
  };

  const openEdit = async (lab) => {
    setError("");
    try {
      const detail = await get(`/laboratories/${lab.id}`);
      const data = detail || lab;
      setSelectedLab(data);
      setForm({
        kode_lab: data.kode_lab || "",
        nama_lab: data.nama_lab || "",
        lokasi: data.lokasi || "",
        deskripsi: data.deskripsi || "",
        kepala_lab_nama: getKepalaLabName(data) === "Belum diisi" ? "" : getKepalaLabName(data),
        status: data.status || "aktif",
      });
      setModalMode("edit");
    } catch (err) {
      setError(err.message);
    }
  };

  const openDetail = async (lab) => {
    setError("");
    try {
      const detail = await get(`/laboratories/${lab.id}`);
      setSelectedLab(detail || lab);
      setModalMode("detail");
    } catch (err) {
      setError(err.message);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setSelectedLab(null);
    setForm(emptyForm);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    if (!form.kode_lab.trim()) return "Kode lab wajib diisi.";
    if (!form.nama_lab.trim()) return "Nama lab wajib diisi.";
    return "";
  };

  const buildPayload = () => ({
    kode_lab: form.kode_lab.trim(),
    nama_lab: form.nama_lab.trim(),
    lokasi: form.lokasi.trim() || null,
    deskripsi: form.deskripsi.trim() || null,
    kepala_lab_nama: form.kepala_lab_nama.trim() || null,
    status: form.status,
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
      if (modalMode === "edit" && selectedLab) {
        await put(`/laboratories/${selectedLab.id}`, buildPayload());
        setNotice("Laboratorium berhasil diperbarui.");
      } else {
        await post("/laboratories", buildPayload());
        setNotice("Laboratorium berhasil ditambahkan.");
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const requestDeactivate = (lab) => {
    if (lab.status !== "aktif") return;
    setError("");
    setConfirmTarget(lab);
  };

  const handleDeactivate = async () => {
    if (!confirmTarget || confirmTarget.status !== "aktif") return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await del(`/laboratories/${confirmTarget.id}`);
      setNotice("Laboratorium berhasil dinonaktifkan.");
      setConfirmTarget(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "kode_lab", label: "Kode Lab" },
    { key: "nama_lab", label: "Nama Lab" },
    { key: "lokasi", label: "Lokasi", render: (row) => row.lokasi || "-" },
    {
      key: "kepala_lab",
      label: "Kepala Lab",
      render: (row) => getKepalaLabName(row),
    },
    { key: "total_equipments", label: "Total Alat", render: (row) => row.total_equipments ?? 0 },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
    },
  ];

  return (
    <DashboardLayout title="Manajemen Laboratorium">
      <section className="page-header">
        <div>
          <span className="eyebrow">Data Master</span>
          <h2>Manajemen Laboratorium</h2>
          <p>Kelola data laboratorium Teknik Elektro.</p>
        </div>
        <Button onClick={openCreate}>Tambah Laboratorium</Button>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode && !confirmTarget ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode lab, nama lab, lokasi..."
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Semua Status</option>
            {statusOptions.map((status) => (
              <option value={status} key={status}>{status}</option>
            ))}
          </select>
          <button type="button" className="button secondary" onClick={loadData}>Refresh</button>
        </div>

        <DataTable
          columns={columns}
          data={filteredLabs}
          loading={loading}
          emptyMessage="Tidak ada laboratorium yang sesuai filter."
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
                disabled={submitting || row.status !== "aktif"}
              >
                {row.status === "aktif" ? "Nonaktifkan" : "Sudah Nonaktif"}
              </button>
            </div>
          )}
        />
      </Card>

      <Modal
        open={modalMode === "create" || modalMode === "edit"}
        title={modalMode === "edit" ? "Edit Laboratorium" : "Tambah Laboratorium"}
        onClose={closeModal}
      >
        {error && modalMode !== "detail" ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Kode Lab
            <input value={form.kode_lab} onChange={(event) => updateForm("kode_lab", event.target.value)} />
          </label>
          <label>
            Nama Lab
            <input value={form.nama_lab} onChange={(event) => updateForm("nama_lab", event.target.value)} />
          </label>
          <label>
            Lokasi
            <input value={form.lokasi} onChange={(event) => updateForm("lokasi", event.target.value)} />
          </label>
          <label>
            Kepala Lab
            <input
              value={form.kepala_lab_nama}
              onChange={(event) => updateForm("kepala_lab_nama", event.target.value)}
              placeholder="Masukkan nama kepala lab"
            />
          </label>
          <label className="form-span">
            Deskripsi
            <textarea value={form.deskripsi} onChange={(event) => updateForm("deskripsi", event.target.value)} />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
              {statusOptions.map((status) => (
                <option value={status} key={status}>{status}</option>
              ))}
            </select>
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

      <Modal open={modalMode === "detail"} title="Detail Laboratorium" onClose={closeModal}>
        {selectedLab ? (
          <div className="detail-grid">
            <span><b>Kode Lab</b>{selectedLab.kode_lab}</span>
            <span><b>Nama Lab</b>{selectedLab.nama_lab}</span>
            <span><b>Lokasi</b>{selectedLab.lokasi || "-"}</span>
            <span><b>Kepala Lab</b>{getKepalaLabName(selectedLab)}</span>
            <span><b>Total Alat</b>{selectedLab.total_equipments ?? 0}</span>
            <span><b>Status</b><Badge variant={statusVariant(selectedLab.status)}>{selectedLab.status}</Badge></span>
            <span className="detail-span"><b>Deskripsi</b>{selectedLab.deskripsi || "-"}</span>
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
          <p>Apakah Anda yakin ingin menonaktifkan data ini?</p>
          <strong>{confirmTarget?.nama_lab || "-"}</strong>
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

export default AdminLaboratoriesPage;

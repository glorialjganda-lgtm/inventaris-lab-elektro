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
  kode_kategori: "",
  nama_kategori: "",
  deskripsi: "",
  status: "aktif",
};

const statusOptions = ["aktif", "nonaktif"];
const statusVariant = (status) => (status === "aktif" ? "success" : "neutral");

const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await get("/categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesSearch =
        !keyword ||
        [category.kode_kategori, category.nama_kategori, category.deskripsi]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesStatus = !statusFilter || category.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  const openCreate = () => {
    setSelectedCategory(null);
    setForm(emptyForm);
    setModalMode("create");
    setError("");
  };

  const openEdit = async (category) => {
    setError("");
    try {
      const detail = await get(`/categories/${category.id}`);
      const data = detail || category;
      setSelectedCategory(data);
      setForm({
        kode_kategori: data.kode_kategori || "",
        nama_kategori: data.nama_kategori || "",
        deskripsi: data.deskripsi || "",
        status: data.status || "aktif",
      });
      setModalMode("edit");
    } catch (err) {
      setError(err.message);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setSelectedCategory(null);
    setForm(emptyForm);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    if (!form.kode_kategori.trim()) return "Kode kategori wajib diisi.";
    if (!form.nama_kategori.trim()) return "Nama kategori wajib diisi.";
    return "";
  };

  const buildPayload = () => ({
    kode_kategori: form.kode_kategori.trim(),
    nama_kategori: form.nama_kategori.trim(),
    deskripsi: form.deskripsi.trim() || null,
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
      if (modalMode === "edit" && selectedCategory) {
        await put(`/categories/${selectedCategory.id}`, buildPayload());
        setNotice("Kategori berhasil diperbarui.");
      } else {
        await post("/categories", buildPayload());
        setNotice("Kategori berhasil ditambahkan.");
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const requestDeactivate = (category) => {
    if (category.status !== "aktif") return;
    setError("");
    setConfirmTarget(category);
  };

  const handleDeactivate = async () => {
    if (!confirmTarget || confirmTarget.status !== "aktif") return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await del(`/categories/${confirmTarget.id}`);
      setNotice("Kategori berhasil dinonaktifkan.");
      setConfirmTarget(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: "kode_kategori",
      label: "Kode",
      render: (row) => (
        <div className="cell-stack">
          <span>{row.kode_kategori}</span>
          {row.kode_kategori?.startsWith("SMOKE-") ? <Badge variant="warning">Data Test</Badge> : null}
        </div>
      ),
    },
    { key: "nama_kategori", label: "Nama Kategori" },
    { key: "deskripsi", label: "Deskripsi", render: (row) => row.deskripsi || "-" },
    { key: "total_equipments", label: "Total Alat", render: (row) => row.total_equipments ?? 0 },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
    },
  ];

  return (
    <DashboardLayout title="Manajemen Kategori">
      <section className="page-header">
        <div>
          <span className="eyebrow">Data Master</span>
          <h2>Manajemen Kategori</h2>
          <p>Kelola kategori peralatan laboratorium.</p>
        </div>
        <Button onClick={openCreate}>Tambah Kategori</Button>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode && !confirmTarget ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, nama, deskripsi..."
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
          data={filteredCategories}
          loading={loading}
          emptyMessage="Tidak ada kategori yang sesuai filter."
          actions={(row) => (
            <div className="action-buttons">
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
        open={Boolean(modalMode)}
        title={modalMode === "edit" ? "Edit Kategori" : "Tambah Kategori"}
        onClose={closeModal}
      >
        {error && modalMode ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Kode Kategori
            <input value={form.kode_kategori} onChange={(event) => updateForm("kode_kategori", event.target.value)} />
          </label>
          <label>
            Nama Kategori
            <input value={form.nama_kategori} onChange={(event) => updateForm("nama_kategori", event.target.value)} />
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

      <Modal
        open={Boolean(confirmTarget)}
        title="Konfirmasi Nonaktifkan"
        onClose={() => (!submitting ? setConfirmTarget(null) : null)}
      >
        {error && confirmTarget ? <div className="alert danger">{error}</div> : null}
        <div className="confirm-content">
          <p>Apakah Anda yakin ingin menonaktifkan data ini?</p>
          <strong>{confirmTarget?.nama_kategori || "-"}</strong>
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

export default AdminCategoriesPage;

import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { del, get, post, put } from "../../services/api.js";
import { formatRole } from "../../utils/formatters.js";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "dosen",
  nomor_induk: "",
  no_hp: "",
  lab_id: "",
  status: "aktif",
};

const roleOptions = ["admin_jurusan", "kepala_lab", "dosen", "mahasiswa"];
const statusOptions = ["aktif", "nonaktif"];

const statusVariant = (status) => (status === "aktif" ? "success" : "neutral");
const roleVariant = (role) => {
  if (role === "admin_jurusan") return "danger";
  if (role === "kepala_lab") return "info";
  if (role === "mahasiswa") return "warning";
  return "success";
};

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const kepalaLabOptions = useMemo(
    () => laboratories.filter((lab) => lab.status === "aktif"),
    [laboratories]
  );

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [userData, labData] = await Promise.all([get("/users"), get("/laboratories")]);
      setUsers(Array.isArray(userData) ? userData : []);
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

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !keyword ||
        [user.name, user.email, user.nomor_induk]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const openCreate = () => {
    setSelectedUser(null);
    setForm(emptyForm);
    setModalMode("create");
    setError("");
  };

  const openEdit = async (user) => {
    setError("");
    try {
      const detail = await get(`/users/${user.id}`);
      const data = detail || user;
      setSelectedUser(data);
      setForm({
        name: data.name || "",
        email: data.email || "",
        password: "",
        role: data.role || "dosen",
        nomor_induk: data.nomor_induk || "",
        no_hp: data.no_hp || "",
        lab_id: data.lab_id || "",
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
    setSelectedUser(null);
    setForm(emptyForm);
  };

  const updateForm = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "role" && value !== "kepala_lab") next.lab_id = "";
      return next;
    });
  };

  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      nomor_induk: form.nomor_induk.trim() || null,
      no_hp: form.no_hp.trim() || null,
      status: form.status,
    };

    if (modalMode === "create" || form.password.trim()) {
      payload.password = form.password.trim();
    }

    if (form.role === "kepala_lab") {
      payload.lab_id = form.lab_id;
    } else if (modalMode === "edit") {
      payload.lab_id = null;
    }

    return payload;
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Nama wajib diisi.";
    if (!form.email.trim()) return "Email wajib diisi.";
    if (modalMode === "create" && !form.password.trim()) return "Password wajib diisi saat tambah user.";
    if (!form.role) return "Role wajib dipilih.";
    if (form.role === "kepala_lab" && !form.lab_id) return "Kepala lab wajib memilih laboratorium.";
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
      const payload = buildPayload();
      if (modalMode === "edit" && selectedUser) {
        await put(`/users/${selectedUser.id}`, payload);
        setNotice("User berhasil diperbarui.");
      } else {
        await post("/users", payload);
        setNotice("User berhasil ditambahkan.");
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const requestDeactivate = (user) => {
    if (user.status !== "aktif") return;
    setError("");
    setConfirmTarget(user);
  };

  const handleDeactivate = async () => {
    if (!confirmTarget || confirmTarget.status !== "aktif") return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await del(`/users/${confirmTarget.id}`);
      setNotice("User berhasil dinonaktifkan.");
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
    { key: "name", label: "Nama" },
    { key: "email", label: "Email" },
    {
      key: "role",
      label: "Role",
      render: (row) => <Badge variant={roleVariant(row.role)}>{formatRole(row.role)}</Badge>,
    },
    { key: "nomor_induk", label: "Nomor Induk", render: (row) => row.nomor_induk || "-" },
    { key: "no_hp", label: "No HP", render: (row) => row.no_hp || "-" },
    {
      key: "lab",
      label: "Lab",
      render: (row) => row.laboratory?.nama_lab || "-",
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
    },
  ];

  return (
    <DashboardLayout title="Manajemen Pengguna">
      <section className="page-header">
        <div>
          <span className="eyebrow">Data Master</span>
          <h2>Manajemen Pengguna</h2>
          <p>Kelola akun admin jurusan, kepala lab, dosen, dan mahasiswa.</p>
        </div>
        <Button onClick={openCreate}>Tambah User</Button>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode && !confirmTarget ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, email, nomor induk..."
          />
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">Semua Role</option>
            {roleOptions.map((role) => (
              <option value={role} key={role}>{formatRole(role)}</option>
            ))}
          </select>
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
          data={filteredUsers}
          loading={loading}
          emptyMessage="Tidak ada user yang sesuai filter."
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
        title={modalMode === "edit" ? "Edit User" : "Tambah User"}
        onClose={closeModal}
      >
        {error && modalMode ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Nama
            <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
          </label>
          <label>
            Password {modalMode === "edit" ? "(opsional)" : ""}
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateForm("password", event.target.value)}
            />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(event) => updateForm("role", event.target.value)}>
              {roleOptions.map((role) => (
                <option value={role} key={role}>{formatRole(role)}</option>
              ))}
            </select>
          </label>
          <label>
            {form.role === "mahasiswa" ? "NIM / Nomor Induk" : "Nomor Induk"}
            <input value={form.nomor_induk} onChange={(event) => updateForm("nomor_induk", event.target.value)} />
          </label>
          <label>
            No HP
            <input value={form.no_hp} onChange={(event) => updateForm("no_hp", event.target.value)} />
          </label>
          {form.role === "kepala_lab" ? (
            <label>
              Laboratorium
              <select value={form.lab_id} onChange={(event) => updateForm("lab_id", event.target.value)}>
                <option value="">Pilih laboratorium</option>
                {kepalaLabOptions.map((lab) => (
                  <option value={lab.id} key={lab.id}>{lab.nama_lab}</option>
                ))}
              </select>
            </label>
          ) : null}
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
          <strong>{confirmTarget?.name || "-"}</strong>
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

export default AdminUsersPage;

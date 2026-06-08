import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";
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

const kondisiOptions = ["baik", "rusak_ringan", "rusak_berat", "hilang"];
const statusOptions = ["tersedia", "dipinjam", "dalam_perawatan", "tidak_aktif"];
const STORAGE_KEY = "mahasiswa_selected_equipments";

const MahasiswaEquipmentsPage = () => {
  const navigate = useNavigate();
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [labFilter, setLabFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [kondisiFilter, setKondisiFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("tersedia");
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      setEquipments(getArrayData(await get("/equipments")));
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
        [getEquipmentCode(item), getEquipmentName(item), lab?.nama_lab, category?.nama_kategori, item.merek || item.merk, item.model, item.lokasi_detail]
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
      setSelectedEquipment((await get(`/equipments/${item.id}`)) || item);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBorrow = (item) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([String(item.id)]));
    setNotice(`${getEquipmentName(item)} dipilih untuk pengajuan peminjaman.`);
    navigate("/mahasiswa/borrowings/create");
  };

  const columns = [
    { key: "no", label: "No", render: (_, index) => index + 1 },
    { key: "kode", label: "Kode Inventaris", render: (row) => getEquipmentCode(row) },
    { key: "nama", label: "Nama Alat", render: (row) => getEquipmentName(row) },
    { key: "lab", label: "Laboratorium", render: (row) => getLabName(getEquipmentLab(row)) },
    { key: "kategori", label: "Kategori", render: (row) => getCategoryName(getEquipmentCategory(row)) },
    { key: "merek", label: "Merek/Model", render: (row) => [row.merek || row.merk, row.model].filter(Boolean).join(" / ") || "-" },
    { key: "kondisi", label: "Kondisi", render: (row) => <Badge variant={getStatusBadgeVariant(row.kondisi)}>{formatStatusLabel(row.kondisi)}</Badge> },
    { key: "status", label: "Status", render: (row) => <Badge variant={getStatusBadgeVariant(row.status || row.status_ketersediaan)}>{formatStatusLabel(row.status || row.status_ketersediaan)}</Badge> },
    { key: "lokasi", label: "Lokasi", render: (row) => row.lokasi_detail || "-" },
  ];

  return (
    <DashboardLayout title="Alat Tersedia">
      <section className="page-header">
        <div>
          <span className="eyebrow">ALAT TERSEDIA</span>
          <h2>Daftar Alat Laboratorium</h2>
          <p>Lihat alat yang tersedia lalu ajukan peminjaman melalui dosen penanggung jawab.</p>
        </div>
        <button type="button" className="button primary" onClick={() => navigate("/mahasiswa/borrowings/create")}>Ajukan Multi Alat</button>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !selectedEquipment ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode, nama, lab, kategori, merek, model, atau lokasi..." />
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
                <button type="button" className="button success small" onClick={() => handleBorrow(row)}>Ajukan Pinjam</button>
              ) : null}
            </div>
          )}
        />
      </Card>

      <Modal open={Boolean(selectedEquipment)} title="Detail Alat" onClose={() => setSelectedEquipment(null)}>
        {selectedEquipment ? (
          <div className="detail-grid">
            <span><b>Kode Inventaris</b>{getEquipmentCode(selectedEquipment)}</span>
            <span><b>Nama Alat</b>{getEquipmentName(selectedEquipment)}</span>
            <span><b>Laboratorium</b>{getLabName(getEquipmentLab(selectedEquipment))}</span>
            <span><b>Kategori</b>{getCategoryName(getEquipmentCategory(selectedEquipment))}</span>
            <span><b>Merek</b>{selectedEquipment.merek || selectedEquipment.merk || "-"}</span>
            <span><b>Model</b>{selectedEquipment.model || "-"}</span>
            <span><b>Kondisi</b><Badge variant={getStatusBadgeVariant(selectedEquipment.kondisi)}>{formatStatusLabel(selectedEquipment.kondisi)}</Badge></span>
            <span><b>Status</b><Badge variant={getStatusBadgeVariant(selectedEquipment.status || selectedEquipment.status_ketersediaan)}>{formatStatusLabel(selectedEquipment.status || selectedEquipment.status_ketersediaan)}</Badge></span>
            <span className="detail-span"><b>Lokasi</b>{selectedEquipment.lokasi_detail || "-"}</span>
            <span className="detail-span"><b>Keterangan</b>{selectedEquipment.keterangan || selectedEquipment.deskripsi || "-"}</span>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
};

export default MahasiswaEquipmentsPage;

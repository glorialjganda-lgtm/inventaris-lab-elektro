import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";
import {
  filterByLab,
  formatCurrency,
  formatLabel,
  getCategoryName,
  getEquipmentCategory,
  getEquipmentCode,
  getEquipmentLab,
  getLabName,
  statusVariant,
} from "./kepalaLabHelpers.js";

const kondisiOptions = ["baik", "rusak_ringan", "rusak_berat", "hilang"];
const statusOptions = ["tersedia", "dipinjam", "dalam_perawatan", "tidak_aktif"];

const KepalaLabEquipmentsPage = () => {
  const [profile, setProfile] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [kondisiFilter, setKondisiFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [me, equipmentData] = await Promise.all([get("/auth/me"), get("/equipments")]);
      const userLabId = me?.user?.lab_id || me?.laboratory?.id || null;
      setProfile(me);
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
      const matchesSearch =
        !keyword ||
        [getEquipmentCode(item), item.nama_alat, item.merek || item.merk, item.model, item.lokasi_detail]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesCategory = !categoryFilter || String(item.category_id || getEquipmentCategory(item)?.id) === String(categoryFilter);
      const matchesKondisi = !kondisiFilter || item.kondisi === kondisiFilter;
      const matchesStatus = !statusFilter || item.status === statusFilter || item.status_ketersediaan === statusFilter;
      return matchesSearch && matchesCategory && matchesKondisi && matchesStatus;
    });
  }, [equipments, search, categoryFilter, kondisiFilter, statusFilter]);

  const openDetail = async (equipment) => {
    setError("");
    try {
      const detail = await get(`/equipments/${equipment.id}`);
      setSelectedEquipment(detail || equipment);
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = [
    { key: "no", label: "No", render: (_, index) => index + 1 },
    { key: "kode", label: "Kode Inventaris", render: (row) => getEquipmentCode(row) },
    { key: "nama", label: "Nama Alat", render: (row) => row.nama_alat || "-" },
    { key: "kategori", label: "Kategori", render: (row) => getCategoryName(getEquipmentCategory(row)) },
    { key: "merek", label: "Merek/Model", render: (row) => [row.merek || row.merk, row.model].filter(Boolean).join(" / ") || "-" },
    { key: "tahun", label: "Tahun", render: (row) => row.tahun_pengadaan || "-" },
    { key: "kondisi", label: "Kondisi", render: (row) => <Badge variant={statusVariant(row.kondisi)}>{formatLabel(row.kondisi)}</Badge> },
    { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status || row.status_ketersediaan)}>{formatLabel(row.status || row.status_ketersediaan)}</Badge> },
    { key: "lokasi", label: "Lokasi Detail", render: (row) => row.lokasi_detail || "-" },
  ];

  return (
    <DashboardLayout title="Inventaris Lab">
      <section className="page-header">
        <div>
          <span className="eyebrow">INVENTARIS LAB</span>
          <h2>Inventaris Laboratorium</h2>
          <p>Daftar alat pada {profile?.laboratory?.nama_lab || "laboratorium Anda"}.</p>
          <p className="muted">Data inventaris utama dikelola admin jurusan. Kepala lab dapat melihat detail alat pada laboratoriumnya.</p>
        </div>
      </section>

      {error && !selectedEquipment ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode, nama alat, merek, model, atau lokasi..." />
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">Semua Kategori</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
          </select>
          <select value={kondisiFilter} onChange={(event) => setKondisiFilter(event.target.value)}>
            <option value="">Semua Kondisi</option>
            {kondisiOptions.map((value) => <option value={value} key={value}>{formatLabel(value)}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Semua Status</option>
            {statusOptions.map((value) => <option value={value} key={value}>{formatLabel(value)}</option>)}
          </select>
          <button type="button" className="button secondary" onClick={loadData}>Refresh</button>
        </div>
        <DataTable
          columns={columns}
          data={filteredEquipments}
          loading={loading}
          emptyTitle="Belum ada data inventaris"
          emptyMessage={equipments.length ? "Tidak ada alat yang sesuai filter." : "Data alat laboratorium akan tampil di sini."}
          actions={(row) => (
            <button type="button" className="button secondary small" onClick={() => openDetail(row)}>Detail</button>
          )}
        />
      </Card>

      <Modal open={Boolean(selectedEquipment)} title="Detail Alat" onClose={() => setSelectedEquipment(null)}>
        {error && selectedEquipment ? <div className="alert danger">{error}</div> : null}
        {selectedEquipment ? (
          <div className="detail-grid">
            <span><b>Kode Inventaris</b>{getEquipmentCode(selectedEquipment)}</span>
            <span><b>Nama Alat</b>{selectedEquipment.nama_alat || "-"}</span>
            <span><b>Laboratorium</b>{getLabName(getEquipmentLab(selectedEquipment))}</span>
            <span><b>Kategori</b>{getCategoryName(getEquipmentCategory(selectedEquipment))}</span>
            <span><b>Merek</b>{selectedEquipment.merek || selectedEquipment.merk || "-"}</span>
            <span><b>Model</b>{selectedEquipment.model || "-"}</span>
            <span><b>Nomor Seri</b>{selectedEquipment.nomor_seri || selectedEquipment.serial_number || "-"}</span>
            <span><b>Tahun Pengadaan</b>{selectedEquipment.tahun_pengadaan || "-"}</span>
            <span><b>Sumber Dana</b>{selectedEquipment.sumber_dana || "-"}</span>
            <span><b>Harga</b><em className="price-text">{formatCurrency(selectedEquipment.harga)}</em></span>
            <span><b>Kondisi</b><Badge variant={statusVariant(selectedEquipment.kondisi)}>{formatLabel(selectedEquipment.kondisi)}</Badge></span>
            <span><b>Status</b><Badge variant={statusVariant(selectedEquipment.status || selectedEquipment.status_ketersediaan)}>{formatLabel(selectedEquipment.status || selectedEquipment.status_ketersediaan)}</Badge></span>
            <span><b>Lokasi Detail</b>{selectedEquipment.lokasi_detail || "-"}</span>
            <span><b>Penanggung Jawab</b>{selectedEquipment.penanggung_jawab?.name || selectedEquipment.user?.name || "-"}</span>
            <span className="detail-span"><b>Keterangan</b>{selectedEquipment.keterangan || selectedEquipment.deskripsi || "-"}</span>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
};

export default KepalaLabEquipmentsPage;

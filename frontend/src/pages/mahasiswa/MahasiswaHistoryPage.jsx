import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get } from "../../services/api.js";
import { formatDate } from "../../utils/formatters.js";
import {
  formatStatusLabel,
  getArrayData,
  getBorrowingCode,
  getBorrowingItems,
  getDosen,
  getEquipmentCode,
  getEquipmentName,
  getReturnCode,
  getReturnStatus,
  getStatusBadgeVariant,
} from "./mahasiswaHelpers.js";

const MahasiswaHistoryPage = () => {
  const [borrowings, setBorrowings] = useState([]);
  const [returns, setReturns] = useState([]);
  const [activeTab, setActiveTab] = useState("borrowings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [borrowingData, returnData] = await Promise.all([get("/borrowings"), get("/returns")]);
      setBorrowings(getArrayData(borrowingData));
      setReturns(getArrayData(returnData));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDetail = async (type, item) => {
    setError("");
    try {
      setSelectedItem((await get(type === "returns" ? `/returns/${item.id}` : `/borrowings/${item.id}`)) || item);
      setModalMode(type);
    } catch (err) {
      setError(err.message);
    }
  };

  const borrowingColumns = [
    { key: "no", label: "No", render: (_, index) => index + 1 },
    { key: "kode", label: "Kode Peminjaman", render: (row) => getBorrowingCode(row) },
    { key: "dosen", label: "Dosen Penanggung Jawab", render: (row) => getDosen(row)?.name || "-" },
    { key: "pinjam", label: "Tanggal Pinjam", render: (row) => formatDate(row.tanggal_pinjam) },
    { key: "kembali", label: "Tanggal Kembali", render: (row) => formatDate(row.tanggal_kembali_rencana) },
    { key: "status", label: "Status", render: (row) => <Badge variant={getStatusBadgeVariant(row.status)}>{formatStatusLabel(row.status)}</Badge> },
  ];

  const returnColumns = [
    { key: "no", label: "No", render: (_, index) => index + 1 },
    { key: "kode", label: "Kode Pengembalian", render: (row) => getReturnCode(row) },
    { key: "peminjaman", label: "Kode Peminjaman", render: (row) => getBorrowingCode(row) },
    { key: "tanggal", label: "Tanggal Pengembalian", render: (row) => formatDate(row.tanggal_pengembalian) },
    { key: "status", label: "Status", render: (row) => <Badge variant={getStatusBadgeVariant(getReturnStatus(row))}>{formatStatusLabel(getReturnStatus(row))}</Badge> },
    { key: "catatan", label: "Catatan", render: (row) => row.catatan_pengembalian || "-" },
  ];

  return (
    <DashboardLayout title="Riwayat">
      <section className="page-header">
        <div>
          <span className="eyebrow">RIWAYAT</span>
          <h2>Riwayat Mahasiswa</h2>
          <p>Lihat riwayat peminjaman dan pengembalian Anda.</p>
        </div>
      </section>

      {error && !modalMode ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="report-tabs">
          <button type="button" className={activeTab === "borrowings" ? "active" : ""} onClick={() => setActiveTab("borrowings")}>Riwayat Peminjaman</button>
          <button type="button" className={activeTab === "returns" ? "active" : ""} onClick={() => setActiveTab("returns")}>Riwayat Pengembalian</button>
        </div>
        {activeTab === "borrowings" ? (
          <DataTable
            columns={borrowingColumns}
            data={borrowings}
            loading={loading}
            emptyTitle="Belum ada riwayat peminjaman"
            emptyMessage="Riwayat peminjaman Anda akan tampil di sini."
            actions={(row) => <button type="button" className="button secondary small" onClick={() => openDetail("borrowings", row)}>Detail</button>}
          />
        ) : (
          <DataTable
            columns={returnColumns}
            data={returns}
            loading={loading}
            emptyTitle="Belum ada riwayat pengembalian"
            emptyMessage="Riwayat pengembalian Anda akan tampil di sini."
            actions={(row) => <button type="button" className="button secondary small" onClick={() => openDetail("returns", row)}>Detail</button>}
          />
        )}
      </Card>

      <Modal open={modalMode === "borrowings"} title="Detail Peminjaman" onClose={() => setModalMode(null)}>
        {selectedItem ? (
          <div className="detail-section">
            <div className="detail-grid">
              <span><b>Kode Peminjaman</b>{getBorrowingCode(selectedItem)}</span>
              <span><b>Dosen Penanggung Jawab</b>{getDosen(selectedItem)?.name || "-"}</span>
              <span><b>Tanggal Pinjam</b>{formatDate(selectedItem.tanggal_pinjam)}</span>
              <span><b>Tanggal Kembali Rencana</b>{formatDate(selectedItem.tanggal_kembali_rencana)}</span>
              <span><b>Status</b><Badge variant={getStatusBadgeVariant(selectedItem.status)}>{formatStatusLabel(selectedItem.status)}</Badge></span>
              <span><b>Keperluan</b>{formatStatusLabel(selectedItem.keperluan)}</span>
              <span className="detail-span"><b>Nama Kegiatan</b>{selectedItem.nama_kegiatan || "-"}</span>
              <span className="detail-span"><b>Catatan</b>{selectedItem.catatan_pengajuan || "-"}</span>
            </div>
            <h3 className="detail-title">Daftar Alat</h3>
            <div className="item-list">
              {getBorrowingItems(selectedItem).length ? getBorrowingItems(selectedItem).map((detail, index) => {
                const equipment = detail.equipments || detail.equipment || detail;
                return <div className="item-card" key={detail.id || equipment.id || index}><strong>{getEquipmentCode(equipment)} - {getEquipmentName(equipment)}</strong></div>;
              }) : <p className="muted">Belum ada data alat.</p>}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={modalMode === "returns"} title="Detail Pengembalian" onClose={() => setModalMode(null)}>
        {selectedItem ? (
          <div className="detail-grid">
            <span><b>Kode Pengembalian</b>{getReturnCode(selectedItem)}</span>
            <span><b>Kode Peminjaman</b>{getBorrowingCode(selectedItem)}</span>
            <span><b>Tanggal Pengembalian</b>{formatDate(selectedItem.tanggal_pengembalian)}</span>
            <span><b>Status</b><Badge variant={getStatusBadgeVariant(getReturnStatus(selectedItem))}>{formatStatusLabel(getReturnStatus(selectedItem))}</Badge></span>
            <span className="detail-span"><b>Catatan</b>{selectedItem.catatan_pengembalian || "-"}</span>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
};

export default MahasiswaHistoryPage;

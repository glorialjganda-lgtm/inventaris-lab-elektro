import { useEffect, useMemo, useState } from "react";
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
  getBorrower,
  getBorrowingCode,
  getBorrowingDetails,
  getEquipmentCode,
  getEquipmentName,
  getReturnCode,
  getReturnDetails,
  getReturnStatus,
  pickArray,
  statusVariant,
} from "./dosenHelpers.js";

const DosenHistoryPage = () => {
  const [profile, setProfile] = useState(null);
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
      const [me, borrowingData, returnData] = await Promise.all([get("/auth/me"), get("/borrowings"), get("/returns")]);
      setProfile(me);
      setBorrowings(pickArray(borrowingData, ["borrowings"]));
      setReturns(pickArray(returnData, ["returns"]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const userId = profile?.user?.id;
  const myBorrowings = useMemo(() => borrowings.filter((item) => {
    const borrower = getBorrower(item);
    return !userId || !borrower?.id || String(borrower.id) === String(userId);
  }), [borrowings, userId]);

  const myReturns = useMemo(() => returns.filter((item) => {
    const borrower = getBorrower(item);
    return !userId || !borrower?.id || String(borrower.id) === String(userId);
  }), [returns, userId]);

  const openDetail = async (type, item) => {
    setError("");
    try {
      const detail = await get(type === "returns" ? `/returns/${item.id}` : `/borrowings/${item.id}`);
      setSelectedItem(detail || item);
      setModalMode(type);
    } catch (err) {
      setError(err.message);
    }
  };

  const borrowingColumns = [
    { key: "no", label: "No", render: (_, index) => index + 1 },
    { key: "kode", label: "Kode Peminjaman", render: (row) => getBorrowingCode(row) },
    { key: "pinjam", label: "Tanggal Pinjam", render: (row) => formatDate(row.tanggal_pinjam) },
    { key: "kembali", label: "Tanggal Kembali Rencana", render: (row) => formatDate(row.tanggal_kembali_rencana) },
    { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatStatusLabel(row.status)}</Badge> },
    { key: "keperluan", label: "Keperluan", render: (row) => formatStatusLabel(row.keperluan) },
  ];

  const returnColumns = [
    { key: "no", label: "No", render: (_, index) => index + 1 },
    { key: "kode", label: "Kode Pengembalian", render: (row) => getReturnCode(row) },
    { key: "peminjaman", label: "Kode Peminjaman", render: (row) => getBorrowingCode(row) },
    { key: "tanggal", label: "Tanggal Pengembalian", render: (row) => formatDate(row.tanggal_pengembalian) },
    { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(getReturnStatus(row))}>{formatStatusLabel(getReturnStatus(row))}</Badge> },
    { key: "catatan", label: "Catatan", render: (row) => row.catatan_pengembalian || "-" },
  ];

  return (
    <DashboardLayout title="Riwayat">
      <section className="page-header">
        <div>
          <span className="eyebrow">RIWAYAT</span>
          <h2>Riwayat Dosen</h2>
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
            data={myBorrowings}
            loading={loading}
            emptyTitle="Belum ada riwayat peminjaman"
            emptyMessage="Riwayat peminjaman Anda akan tampil di sini."
            actions={(row) => <button type="button" className="button secondary small" onClick={() => openDetail("borrowings", row)}>Detail</button>}
          />
        ) : (
          <DataTable
            columns={returnColumns}
            data={myReturns}
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
              <span><b>Tanggal Pinjam</b>{formatDate(selectedItem.tanggal_pinjam)}</span>
              <span><b>Tanggal Kembali Rencana</b>{formatDate(selectedItem.tanggal_kembali_rencana)}</span>
              <span><b>Keperluan</b>{formatStatusLabel(selectedItem.keperluan)}</span>
              <span><b>Status</b><Badge variant={statusVariant(selectedItem.status)}>{formatStatusLabel(selectedItem.status)}</Badge></span>
              <span className="detail-span"><b>Nama Kegiatan</b>{selectedItem.nama_kegiatan || "-"}</span>
              <span className="detail-span"><b>Catatan</b>{selectedItem.catatan_pengajuan || "-"}</span>
            </div>
            <h3 className="detail-title">Daftar Alat</h3>
            <div className="item-list">
              {getBorrowingDetails(selectedItem).length ? getBorrowingDetails(selectedItem).map((detail, index) => {
                const equipment = detail.equipments || detail.equipment || detail;
                return <div className="item-card" key={detail.id || equipment.id || index}><strong>{getEquipmentCode(equipment)} - {getEquipmentName(equipment)}</strong></div>;
              }) : <p className="muted">Belum ada data alat.</p>}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={modalMode === "returns"} title="Detail Pengembalian" onClose={() => setModalMode(null)}>
        {selectedItem ? (
          <div className="detail-section">
            <div className="detail-grid">
              <span><b>Kode Pengembalian</b>{getReturnCode(selectedItem)}</span>
              <span><b>Kode Peminjaman</b>{getBorrowingCode(selectedItem)}</span>
              <span><b>Tanggal Pengembalian</b>{formatDate(selectedItem.tanggal_pengembalian)}</span>
              <span><b>Status</b><Badge variant={statusVariant(getReturnStatus(selectedItem))}>{formatStatusLabel(getReturnStatus(selectedItem))}</Badge></span>
              <span className="detail-span"><b>Catatan</b>{selectedItem.catatan_pengembalian || "-"}</span>
            </div>
            <h3 className="detail-title">Daftar Alat</h3>
            <div className="item-list">
              {(getReturnDetails(selectedItem).length ? getReturnDetails(selectedItem) : getBorrowingDetails(selectedItem)).map((detail, index) => {
                const equipment = detail.equipments || detail.equipment || detail;
                return <div className="item-card" key={detail.id || equipment.id || index}><strong>{getEquipmentCode(equipment)} - {getEquipmentName(equipment)}</strong></div>;
              })}
              {!getReturnDetails(selectedItem).length && !getBorrowingDetails(selectedItem).length ? <p className="muted">Belum ada data alat.</p> : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
};

export default DosenHistoryPage;

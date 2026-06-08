import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { get, post, put } from "../../services/api.js";
import { formatDate } from "../../utils/formatters.js";
import { formatLabel, formatNumber, getStockCode, getStockLab, getStockMinimum, safeNumber, statusVariant } from "./kepalaLabHelpers.js";

const emptyForm = {
  nama_barang: "",
  lab_id: "",
  kategori: "",
  satuan: "pcs",
  jumlah: "",
  stok_minimum: "",
  lokasi: "",
};

const emptyTransactionForm = {
  tipe_transaksi: "masuk",
  jumlah: "",
  keterangan: "",
};

const statusOptions = ["aman", "menipis", "habis"];
const transactionTypes = ["masuk", "keluar"];

const KepalaLabStocksPage = () => {
  const [profile, setProfile] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [me, stockData] = await Promise.all([get("/auth/me"), get("/stocks")]);
      setProfile(me);
      setStocks(Array.isArray(stockData) ? stockData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStocks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return stocks.filter((stock) => {
      const matchesSearch =
        !keyword ||
        [getStockCode(stock), stock.nama_barang, stock.kategori, stock.lokasi]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      return matchesSearch && (!statusFilter || stock.status === statusFilter);
    });
  }, [stocks, search, statusFilter]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateTransactionForm = (field, value) => setTransactionForm((current) => ({ ...current, [field]: value }));

  const fillForm = (stock) => {
    setForm({
      nama_barang: stock.nama_barang || "",
      lab_id: stock.lab_id || getStockLab(stock)?.id || profile?.user?.lab_id || "",
      kategori: stock.kategori || "",
      satuan: stock.satuan || "pcs",
      jumlah: stock.jumlah ?? "",
      stok_minimum: getStockMinimum(stock) ?? "",
      lokasi: stock.lokasi || "",
    });
  };

  const openCreate = () => {
    setSelectedStock(null);
    setForm({ ...emptyForm, lab_id: profile?.user?.lab_id || profile?.laboratory?.id || "" });
    setError("");
    setModalMode("create");
  };

  const openEdit = async (stock) => {
    setError("");
    try {
      const detail = await get(`/stocks/${stock.id}`);
      const data = detail || stock;
      setSelectedStock(data);
      fillForm(data);
      setModalMode("edit");
    } catch (err) {
      setError(err.message);
    }
  };

  const openDetail = async (stock) => {
    setError("");
    setTransactionLoading(true);
    try {
      const [detail, transactionData] = await Promise.all([
        get(`/stocks/${stock.id}`),
        get(`/stocks/${stock.id}/transactions`).catch(() => []),
      ]);
      setSelectedStock(detail || stock);
      setTransactions(Array.isArray(transactionData) ? transactionData : []);
      setModalMode("detail");
    } catch (err) {
      setError(err.message);
    } finally {
      setTransactionLoading(false);
    }
  };

  const openTransaction = async (stock) => {
    setError("");
    setSelectedStock(stock);
    setTransactionForm(emptyTransactionForm);
    setTransactions([]);
    setTransactionLoading(true);
    setModalMode("transaction");
    try {
      const transactionData = await get(`/stocks/${stock.id}/transactions`);
      setTransactions(Array.isArray(transactionData) ? transactionData : []);
    } catch (err) {
      setTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setSelectedStock(null);
    setForm(emptyForm);
    setTransactionForm(emptyTransactionForm);
    setTransactions([]);
  };

  const validateForm = () => {
    if (!form.nama_barang.trim()) return "Nama barang wajib diisi.";
    if (!form.lab_id) return "Laboratorium akun belum tersedia.";
    if (!form.satuan.trim()) return "Satuan wajib diisi.";
    if (form.jumlah === "" || !Number.isFinite(Number(form.jumlah)) || Number(form.jumlah) < 0) return "Jumlah wajib angka dan tidak boleh negatif.";
    if (form.stok_minimum === "" || !Number.isFinite(Number(form.stok_minimum)) || Number(form.stok_minimum) < 0) return "Minimum stok wajib angka dan tidak boleh negatif.";
    return "";
  };

  const buildPayload = () => ({
    lab_id: form.lab_id,
    nama_barang: form.nama_barang.trim(),
    kategori: form.kategori.trim() || null,
    satuan: form.satuan.trim(),
    jumlah: Number(form.jumlah),
    stok_minimum: Number(form.stok_minimum),
    lokasi: form.lokasi.trim() || null,
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
      if (modalMode === "edit" && selectedStock) {
        await put(`/stocks/${selectedStock.id}`, buildPayload());
        setNotice("Stok berhasil diperbarui.");
      } else {
        await post("/stocks", buildPayload());
        setNotice("Stok berhasil ditambahkan.");
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const validateTransaction = () => {
    const total = Number(transactionForm.jumlah);
    if (!transactionForm.tipe_transaksi) return "Tipe transaksi wajib dipilih.";
    if (!Number.isFinite(total) || total <= 0) return "Jumlah transaksi wajib angka dan lebih dari 0.";
    if (transactionForm.tipe_transaksi === "keluar" && selectedStock && total > safeNumber(selectedStock.jumlah)) {
      return "Jumlah keluar tidak boleh lebih besar dari stok saat ini.";
    }
    return "";
  };

  const handleTransaction = async (event) => {
    event.preventDefault();
    const validation = validateTransaction();
    if (validation) {
      setError(validation);
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await post(`/stocks/${selectedStock.id}/transactions`, {
        tipe_transaksi: transactionForm.tipe_transaksi,
        jumlah: Number(transactionForm.jumlah),
        keterangan: transactionForm.keterangan.trim() || null,
      });
      setNotice("Transaksi stok berhasil disimpan.");
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "no", label: "No", render: (_, index) => index + 1 },
    { key: "kode", label: "Kode Stok", render: (row) => <span className="stock-code">{getStockCode(row)}</span> },
    { key: "nama", label: "Nama Barang", render: (row) => row.nama_barang || "-" },
    { key: "satuan", label: "Satuan", render: (row) => row.satuan || "-" },
    { key: "jumlah", label: "Jumlah", render: (row) => formatNumber(row.jumlah) },
    { key: "minimum", label: "Minimum", render: (row) => formatNumber(getStockMinimum(row)) },
    { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge> },
    { key: "lokasi", label: "Lokasi", render: (row) => row.lokasi || "-" },
  ];

  return (
    <DashboardLayout title="Stok Komponen">
      <section className="page-header">
        <div>
          <span className="eyebrow">STOK KOMPONEN</span>
          <h2>Stok Komponen Lab</h2>
          <p>Kelola barang habis pakai dan transaksi stok laboratorium Anda.</p>
          <p className="muted">Kepala lab dapat menambah, mengedit, melihat detail, serta mencatat transaksi masuk atau keluar tanpa menghapus histori stok.</p>
        </div>
        <button type="button" className="button primary" onClick={openCreate}>Tambah Stok</button>
      </section>
      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode ? <ErrorState message={error} onRetry={loadData} /> : null}
      <Card>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama barang, kode stok, atau lokasi..." />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Semua Status</option>
            {statusOptions.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}
          </select>
          <button type="button" className="button secondary" onClick={loadData}>Refresh</button>
        </div>
        <DataTable
          columns={columns}
          data={filteredStocks}
          loading={loading}
          emptyTitle="Belum ada data stok"
          emptyMessage={stocks.length ? "Tidak ada stok yang sesuai filter." : "Data stok komponen lab akan tampil di sini."}
          actions={(row) => (
            <div className="action-buttons">
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>Detail</button>
              <button type="button" className="button secondary small" onClick={() => openEdit(row)}>Edit</button>
              <button type="button" className="button success small" onClick={() => openTransaction(row)}>Transaksi</button>
            </div>
          )}
        />
      </Card>

      <Modal open={modalMode === "create" || modalMode === "edit"} title={modalMode === "edit" ? "Edit Stok" : "Tambah Stok"} onClose={closeModal}>
        {error && (modalMode === "create" || modalMode === "edit") ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>Nama Barang<input value={form.nama_barang} onChange={(event) => updateForm("nama_barang", event.target.value)} /></label>
          <label>Laboratorium<input value={profile?.laboratory?.nama_lab || "Laboratorium akun"} disabled /></label>
          <label>Kategori<input value={form.kategori} onChange={(event) => updateForm("kategori", event.target.value)} /></label>
          <label>Satuan<input value={form.satuan} onChange={(event) => updateForm("satuan", event.target.value)} /></label>
          <label>Jumlah<input type="number" min="0" value={form.jumlah} onChange={(event) => updateForm("jumlah", event.target.value)} /></label>
          <label>Minimum<input type="number" min="0" value={form.stok_minimum} onChange={(event) => updateForm("stok_minimum", event.target.value)} /></label>
          <label className="form-span">Lokasi<input value={form.lokasi} onChange={(event) => updateForm("lokasi", event.target.value)} /></label>
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
            <button type="submit" className="button primary" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={modalMode === "detail"} title="Detail Stok" onClose={closeModal}>
        {selectedStock ? (
          <div className="detail-section">
            <div className="detail-grid">
              <span><b>Kode Stok</b><em className="stock-code">{getStockCode(selectedStock)}</em></span>
              <span><b>Nama Barang</b>{selectedStock.nama_barang || "-"}</span>
              <span><b>Laboratorium</b>{getStockLab(selectedStock)?.nama_lab || profile?.laboratory?.nama_lab || "-"}</span>
              <span><b>Kategori</b>{selectedStock.kategori || "-"}</span>
              <span><b>Satuan</b>{selectedStock.satuan || "-"}</span>
              <span><b>Jumlah</b>{formatNumber(selectedStock.jumlah)}</span>
              <span><b>Minimum</b>{formatNumber(getStockMinimum(selectedStock))}</span>
              <span><b>Status</b><Badge variant={statusVariant(selectedStock.status)}>{formatLabel(selectedStock.status)}</Badge></span>
              <span className="detail-span"><b>Lokasi</b>{selectedStock.lokasi || "-"}</span>
            </div>
            <h3 className="detail-title">Riwayat Transaksi</h3>
            <div className="item-list">
              {transactionLoading ? <p className="muted">Memuat riwayat transaksi...</p> : null}
              {!transactionLoading && transactions.length ? transactions.map((transaction) => (
                <div className="item-card" key={transaction.id}>
                  <strong>{formatLabel(transaction.tipe_transaksi)} - {formatNumber(transaction.jumlah)} {selectedStock.satuan || ""}</strong>
                  <span>Stok: {formatNumber(transaction.stok_sebelum)} ke {formatNumber(transaction.stok_sesudah)}</span>
                  <span>Tanggal: {formatDate(transaction.tanggal || transaction.created_at)}</span>
                  <span>Oleh: {transaction.users?.name || "-"}</span>
                  <span>Keterangan: {transaction.keterangan || "-"}</span>
                </div>
              )) : null}
              {!transactionLoading && !transactions.length ? <p className="muted">Belum ada riwayat transaksi.</p> : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={modalMode === "transaction"} title="Transaksi Stok" onClose={closeModal}>
        {error && modalMode === "transaction" ? <div className="alert danger">{error}</div> : null}
        {selectedStock ? (
          <form className="form-grid" onSubmit={handleTransaction}>
            <span className="detail-span item-card">
              <strong>{getStockCode(selectedStock)} - {selectedStock.nama_barang || "-"}</strong>
              <span>Stok saat ini: {formatNumber(selectedStock.jumlah)} {selectedStock.satuan || ""}</span>
            </span>
            <label>
              Tipe Transaksi
              <select value={transactionForm.tipe_transaksi} onChange={(event) => updateTransactionForm("tipe_transaksi", event.target.value)}>
                {transactionTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}
              </select>
            </label>
            <label>Jumlah<input type="number" min="1" value={transactionForm.jumlah} onChange={(event) => updateTransactionForm("jumlah", event.target.value)} /></label>
            <label className="form-span">Keterangan<textarea value={transactionForm.keterangan} onChange={(event) => updateTransactionForm("keterangan", event.target.value)} /></label>
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>Batal</button>
              <button type="submit" className="button primary" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan Transaksi"}</button>
            </div>
          </form>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
};

export default KepalaLabStocksPage;

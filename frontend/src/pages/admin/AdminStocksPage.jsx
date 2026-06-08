import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import DataTable from "../../components/table/DataTable.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import DashboardLayout from "../../layouts/DashboardLayout.jsx";
import { del, get, post, put } from "../../services/api.js";
import { formatDate } from "../../utils/formatters.js";

const emptyForm = {
  nama_barang: "",
  lab_id: "",
  kategori: "",
  satuan: "pcs",
  jumlah: "",
  stok_minimum: "",
  status: "aman",
  lokasi: "",
  keterangan: "",
};

const emptyTransactionForm = {
  tipe_transaksi: "masuk",
  jumlah: "",
  keterangan: "",
};

const statusOptions = ["aman", "menipis", "habis"];
const transactionTypes = ["masuk", "keluar"];

const readValue = (item, keys, fallback = "-") => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const getStockCode = (stock) => {
  if (stock?.kode_stok) return stock.kode_stok;
  if (stock?.id === undefined || stock?.id === null || stock.id === "") return "STK-000";
  const numericId = Number(stock.id);
  if (!Number.isFinite(numericId)) return "STK-000";
  return `STK-${String(numericId).padStart(3, "0")}`;
};
const getLab = (stock) => stock?.laboratories || stock?.laboratory || stock?.lab || null;
const getMinimum = (stock) => stock?.stok_minimum ?? stock?.minimum ?? 0;
const isTestStock = (stock) =>
  String(stock?.nama_barang || "").toLowerCase().includes("smoke") ||
  String(stock?.kategori || "").toLowerCase().includes("smoke test");

const formatLabel = (value) => {
  if (!value) return "-";
  const labels = {
    aman: "Aman",
    menipis: "Menipis",
    habis: "Habis",
    masuk: "Masuk",
    keluar: "Keluar",
    penyesuaian: "Penyesuaian",
  };
  return labels[value] || String(value).replaceAll("_", " ");
};

const statusVariant = (status) => {
  if (status === "aman") return "success";
  if (status === "menipis") return "warning";
  if (status === "habis") return "danger";
  return "neutral";
};

const transactionVariant = (type) => {
  if (type === "masuk") return "success";
  if (type === "keluar") return "danger";
  return "info";
};

const formatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("id-ID").format(number);
};

const AdminStocksPage = () => {
  const [stocks, setStocks] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [labFilter, setLabFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [stockData, labData] = await Promise.all([get("/stocks"), get("/laboratories")]);
      setStocks(Array.isArray(stockData) ? stockData : []);
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

  const filteredStocks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return stocks.filter((stock) => {
      const matchesSearch =
        !keyword ||
        [getStockCode(stock), stock.nama_barang, stock.kategori, getLab(stock)?.nama_lab, stock.satuan, stock.lokasi]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesLab = !labFilter || String(stock.lab_id) === String(labFilter);
      const matchesStatus = !statusFilter || stock.status === statusFilter;
      return matchesSearch && matchesLab && matchesStatus;
    });
  }, [stocks, search, labFilter, statusFilter]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateTransactionForm = (field, value) => {
    setTransactionForm((current) => ({ ...current, [field]: value }));
  };

  const fillForm = (stock) => {
    setForm({
      nama_barang: stock.nama_barang || "",
      lab_id: stock.lab_id || "",
      kategori: stock.kategori || "",
      satuan: stock.satuan || "pcs",
      jumlah: stock.jumlah ?? "",
      stok_minimum: getMinimum(stock) ?? "",
      status: stock.status || "aman",
      lokasi: stock.lokasi || "",
      keterangan: stock.keterangan || "",
    });
  };

  const openCreate = () => {
    setSelectedStock(null);
    setForm(emptyForm);
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
    if (!form.lab_id) return "Laboratorium wajib dipilih.";
    if (!form.satuan.trim()) return "Satuan wajib diisi.";
    if (form.jumlah === "" || !Number.isFinite(Number(form.jumlah)) || Number(form.jumlah) < 0) {
      return "Jumlah wajib angka dan tidak boleh negatif.";
    }
    if (form.stok_minimum === "" || !Number.isFinite(Number(form.stok_minimum)) || Number(form.stok_minimum) < 0) {
      return "Minimum stok wajib angka dan tidak boleh negatif.";
    }
    if (!form.status) return "Status wajib dipilih.";
    return "";
  };

  const buildPayload = () => ({
    nama_barang: form.nama_barang.trim(),
    lab_id: form.lab_id,
    kategori: form.kategori.trim() || null,
    satuan: form.satuan.trim(),
    jumlah: Number(form.jumlah),
    stok_minimum: Number(form.stok_minimum),
    status: form.status,
    lokasi: form.lokasi.trim() || null,
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
      if (modalMode === "edit" && selectedStock) {
        await put(`/stocks/${selectedStock.id}`, payload);
        setNotice("Stok berhasil diperbarui.");
      } else {
        await post("/stocks", payload);
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
    if (transactionForm.tipe_transaksi === "keluar" && selectedStock && total > Number(selectedStock.jumlah || 0)) {
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

  const requestDelete = (stock) => {
    setError("");
    setConfirmTarget(stock);
  };

  const handleDelete = async () => {
    if (!confirmTarget) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await del(`/stocks/${confirmTarget.id}`);
      setNotice("Stok berhasil dikosongkan.");
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
    { key: "kode_stok", label: "Kode Stok", render: (row) => <span className="stock-code">{getStockCode(row)}</span> },
    {
      key: "nama_barang",
      label: "Nama Barang",
      render: (row) => (
        <span className="cell-stack">
          <span>{row.nama_barang || "-"}</span>
          {isTestStock(row) ? <span className="test-data-badge">Data Test</span> : null}
        </span>
      ),
    },
    { key: "laboratorium", label: "Laboratorium", render: (row) => getLab(row)?.nama_lab || "-" },
    { key: "satuan", label: "Satuan", render: (row) => row.satuan || "-" },
    { key: "jumlah", label: "Jumlah", render: (row) => formatNumber(row.jumlah) },
    { key: "minimum", label: "Minimum", render: (row) => formatNumber(getMinimum(row)) },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge variant={statusVariant(row.status)}>{formatLabel(row.status)}</Badge>,
    },
    { key: "lokasi", label: "Lokasi", render: (row) => row.lokasi || "-" },
  ];

  return (
    <DashboardLayout title="Manajemen Stok Komponen">
      <section className="page-header">
        <div>
          <span className="eyebrow">STOK KOMPONEN</span>
          <h2>Manajemen Stok Komponen</h2>
          <p>Kelola stok komponen, minimum stok, dan transaksi masuk keluar.</p>
        </div>
        <button type="button" className="button primary" onClick={openCreate}>
          Tambah Stok
        </button>
      </section>

      {notice ? <div className="alert success">{notice}</div> : null}
      {error && !modalMode && !confirmTarget ? <ErrorState message={error} onRetry={loadData} /> : null}

      <Card>
        <div className="toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, nama barang, kategori, laboratorium, atau lokasi..."
          />
          <select value={labFilter} onChange={(event) => setLabFilter(event.target.value)}>
            <option value="">Semua Laboratorium</option>
            {laboratories.map((lab) => (
              <option value={lab.id} key={lab.id}>{lab.nama_lab}</option>
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
          data={filteredStocks}
          loading={loading}
          emptyTitle={stocks.length ? "Belum ada data" : "Belum ada data stok"}
          emptyMessage={
            stocks.length
              ? "Tidak ada stok yang sesuai filter."
              : "Data stok komponen akan muncul setelah admin menambahkan barang habis pakai atau komponen laboratorium."
          }
          actions={(row) => (
            <div className="action-buttons">
              <button type="button" className="button secondary small" onClick={() => openDetail(row)}>
                Detail
              </button>
              <button type="button" className="button secondary small" onClick={() => openEdit(row)}>
                Edit
              </button>
              <button type="button" className="button success small" onClick={() => openTransaction(row)}>
                Transaksi
              </button>
              <button type="button" className="button danger small" onClick={() => requestDelete(row)} disabled={submitting}>
                Kosongkan
              </button>
            </div>
          )}
        />
      </Card>

      <Modal
        open={modalMode === "create" || modalMode === "edit"}
        title={modalMode === "edit" ? "Edit Stok" : "Tambah Stok"}
        onClose={closeModal}
      >
        {error && (modalMode === "create" || modalMode === "edit") ? <div className="alert danger">{error}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Nama Barang
            <input value={form.nama_barang} onChange={(event) => updateForm("nama_barang", event.target.value)} />
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
            <input value={form.kategori} onChange={(event) => updateForm("kategori", event.target.value)} />
          </label>
          <label>
            Satuan
            <input value={form.satuan} onChange={(event) => updateForm("satuan", event.target.value)} />
          </label>
          <label>
            Jumlah
            <input type="number" min="0" value={form.jumlah} onChange={(event) => updateForm("jumlah", event.target.value)} />
          </label>
          <label>
            Minimum
            <input type="number" min="0" value={form.stok_minimum} onChange={(event) => updateForm("stok_minimum", event.target.value)} />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
              {statusOptions.map((status) => (
                <option value={status} key={status}>{formatLabel(status)}</option>
              ))}
            </select>
          </label>
          <label>
            Lokasi
            <input value={form.lokasi} onChange={(event) => updateForm("lokasi", event.target.value)} />
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

      <Modal open={modalMode === "detail"} title="Detail Stok Komponen" onClose={closeModal}>
        {selectedStock ? (
          <div className="detail-section">
            <div className="detail-grid">
              <span><b>Kode Stok</b><em className="stock-code">{getStockCode(selectedStock)}</em></span>
              <span>
                <b>Nama Barang</b>
                {selectedStock.nama_barang || "-"}
                {isTestStock(selectedStock) ? <em className="test-data-badge">Data Test</em> : null}
              </span>
              <span><b>Laboratorium</b>{getLab(selectedStock)?.nama_lab || "-"}</span>
              <span><b>Kategori</b>{selectedStock.kategori || "-"}</span>
              <span><b>Satuan</b>{selectedStock.satuan || "-"}</span>
              <span><b>Jumlah</b>{formatNumber(selectedStock.jumlah)}</span>
              <span><b>Minimum</b>{formatNumber(getMinimum(selectedStock))}</span>
              <span><b>Status</b><Badge variant={statusVariant(selectedStock.status)}>{formatLabel(selectedStock.status)}</Badge></span>
              <span className="detail-span"><b>Lokasi</b>{selectedStock.lokasi || "-"}</span>
            </div>
            <h3 className="detail-title">Riwayat Transaksi</h3>
            <div className="item-list">
              {transactionLoading ? <p className="muted">Memuat riwayat transaksi...</p> : null}
              {!transactionLoading && transactions.length ? transactions.map((transaction) => (
                <div className="item-card" key={transaction.id}>
                  <strong>
                    <Badge variant={transactionVariant(transaction.tipe_transaksi)}>{formatLabel(transaction.tipe_transaksi)}</Badge>
                    {" "}
                    {formatNumber(transaction.jumlah)} {selectedStock.satuan || ""}
                  </strong>
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
              <select
                value={transactionForm.tipe_transaksi}
                onChange={(event) => updateTransactionForm("tipe_transaksi", event.target.value)}
              >
                {transactionTypes.map((type) => (
                  <option value={type} key={type}>{formatLabel(type)}</option>
                ))}
              </select>
            </label>
            <label>
              Jumlah
              <input
                type="number"
                min="1"
                value={transactionForm.jumlah}
                onChange={(event) => updateTransactionForm("jumlah", event.target.value)}
              />
            </label>
            <label className="form-span">
              Keterangan
              <textarea
                value={transactionForm.keterangan}
                onChange={(event) => updateTransactionForm("keterangan", event.target.value)}
              />
            </label>
            <div className="detail-span item-list">
              <h3 className="detail-title">Riwayat Transaksi</h3>
              {transactionLoading ? <p className="muted">Memuat riwayat transaksi...</p> : null}
              {!transactionLoading && transactions.length ? transactions.map((transaction) => (
                <div className="item-card" key={transaction.id}>
                  <strong>{formatLabel(transaction.tipe_transaksi)} - {formatNumber(transaction.jumlah)}</strong>
                  <span>Stok: {formatNumber(transaction.stok_sebelum)} ke {formatNumber(transaction.stok_sesudah)}</span>
                  <span>{formatDate(transaction.tanggal || transaction.created_at)}</span>
                </div>
              )) : null}
              {!transactionLoading && !transactions.length ? <p className="muted">Belum ada riwayat transaksi.</p> : null}
            </div>
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={closeModal} disabled={submitting}>
                Batal
              </button>
              <button type="submit" className="button primary" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(confirmTarget)}
        title="Kosongkan Stok"
        onClose={() => (!submitting ? setConfirmTarget(null) : null)}
      >
        {error && confirmTarget ? <div className="alert danger">{error}</div> : null}
        <div className="confirm-content">
          <p>Stok akan diubah menjadi habis tanpa menghapus histori transaksi.</p>
          <strong>{confirmTarget?.nama_barang || "-"} ({getStockCode(confirmTarget)})</strong>
        </div>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={() => setConfirmTarget(null)} disabled={submitting}>
            Batal
          </button>
          <button type="button" className="button danger" onClick={handleDelete} disabled={submitting}>
            {submitting ? "Memproses..." : "Ya, Kosongkan"}
          </button>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default AdminStocksPage;

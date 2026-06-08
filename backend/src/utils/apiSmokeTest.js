const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

const results = {
  pass: 0,
  fail: 0,
  skip: 0,
};

const logPass = (name) => {
  results.pass += 1;
  console.log(`PASS - ${name}`);
};

const logFail = (name, message) => {
  results.fail += 1;
  console.log(`FAIL - ${name} - ${message}`);
};

const logSkip = (name, reason) => {
  results.skip += 1;
  console.log(`SKIP - ${name} - ${reason}`);
};

const request = async (method, path, token, body) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = { message: "Response bukan JSON" };
  }

  return { response, payload };
};

const runTest = async (name, fn) => {
  try {
    await fn();
    logPass(name);
  } catch (error) {
    logFail(name, error.message);
  }
};

const expectStatus = async (name, method, path, token, expectedStatus, body) => {
  await runTest(name, async () => {
    const { response, payload } = await request(method, path, token, body);
    if (response.status !== expectedStatus) {
      throw new Error(`Expected ${expectedStatus}, got ${response.status}: ${payload.message || response.statusText}`);
    }
  });
};

const expectOk = async (name, method, path, token, body) => {
  await runTest(name, async () => {
    const { response, payload } = await request(method, path, token, body);
    if (!response.ok) {
      throw new Error(`${response.status}: ${payload.message || response.statusText}`);
    }
  });
};

const login = async (name, email, password) => {
  const { response, payload } = await request("POST", "/api/auth/login", null, { email, password });
  if (!response.ok || !payload.data || !payload.data.token) {
    throw new Error(`${name} login gagal: ${payload.message || response.statusText}`);
  }
  logPass(`Login ${name}`);
  return payload.data.token;
};

const getData = async (path, token) => {
  const { response, payload } = await request("GET", path, token);
  if (!response.ok) {
    throw new Error(`${response.status}: ${payload.message || response.statusText}`);
  }
  return payload.data;
};

const main = async () => {
  try {
    await request("GET", "/api/health");
  } catch (error) {
    console.log(`Backend belum dapat diakses di ${BASE_URL}. Jalankan npm run dev terlebih dahulu.`);
    process.exit(1);
  }

  let adminToken;
  let kepalaLabToken;
  let dosenToken;

  try {
    adminToken = await login("admin", "admin@elektro.test", "password");
    kepalaLabToken = await login("kepala lab", "kepala.eld@elektro.test", "password");
    dosenToken = await login("dosen", "rina@elektro.test", "password");
  } catch (error) {
    logFail("Login role wajib", error.message);
    console.log(`Summary: PASS ${results.pass}, FAIL ${results.fail}, SKIP ${results.skip}`);
    process.exit(1);
  }

  await expectOk("GET /api/health", "GET", "/api/health");
  await expectOk("GET /api/dashboard/summary", "GET", "/api/dashboard/summary");
  await expectOk("GET /api/auth/me admin", "GET", "/api/auth/me", adminToken);
  await expectOk("GET /api/users admin", "GET", "/api/users", adminToken);
  await expectOk("GET /api/laboratories admin", "GET", "/api/laboratories", adminToken);
  await expectOk("GET /api/categories admin", "GET", "/api/categories", adminToken);
  await expectOk("GET /api/equipments admin", "GET", "/api/equipments", adminToken);
  await expectOk("GET /api/equipments dosen", "GET", "/api/equipments", dosenToken);
  await expectOk("GET /api/borrowings admin", "GET", "/api/borrowings", adminToken);
  await expectOk("GET /api/returns admin", "GET", "/api/returns", adminToken);
  await expectOk("GET /api/maintenances admin", "GET", "/api/maintenances", adminToken);
  await expectOk("GET /api/stocks admin", "GET", "/api/stocks", adminToken);
  await expectOk("GET /api/reports/inventory admin", "GET", "/api/reports/inventory", adminToken);
  await expectOk("GET /api/reports/borrowings admin", "GET", "/api/reports/borrowings", adminToken);
  await expectOk("GET /api/reports/maintenances admin", "GET", "/api/reports/maintenances", adminToken);
  await expectOk("GET /api/reports/stocks admin", "GET", "/api/reports/stocks", adminToken);

  await expectStatus("GET /api/users dosen harus 403", "GET", "/api/users", dosenToken, 403);
  await expectStatus("POST /api/categories dosen harus 403", "POST", "/api/categories", dosenToken, 403, {});
  await expectStatus("POST /api/stocks dosen harus 403", "POST", "/api/stocks", dosenToken, 403, {});
  await expectStatus("GET /api/reports/inventory dosen harus 403", "GET", "/api/reports/inventory", dosenToken, 403);

  const timestamp = Date.now();

  await runTest("Buat kategori dummy", async () => {
    const { response, payload } = await request("POST", "/api/categories", adminToken, {
      kode_kategori: `SMOKE-${timestamp}`,
      nama_kategori: `Kategori Smoke ${timestamp}`,
      deskripsi: "Data dummy smoke test",
    });
    if (!response.ok && response.status !== 409) {
      throw new Error(`${response.status}: ${payload.message || response.statusText}`);
    }
  });

  let labId = null;
  await runTest("Ambil lab untuk stok dummy", async () => {
    const labs = await getData("/api/laboratories", adminToken);
    if (!Array.isArray(labs) || labs.length < 1) {
      throw new Error("Tidak ada laboratorium tersedia");
    }
    labId = labs[0].id;
  });

  let stockId = null;
  if (labId) {
    await runTest("Buat stok dummy", async () => {
      const { response, payload } = await request("POST", "/api/stocks", adminToken, {
        lab_id: labId,
        nama_barang: `Stok Smoke ${timestamp}`,
        kategori: "Smoke Test",
        jumlah: 10,
        satuan: "pcs",
        stok_minimum: 2,
        lokasi: "Rak Smoke",
      });
      if (!response.ok) throw new Error(`${response.status}: ${payload.message || response.statusText}`);
      stockId = payload.data.id;
    });
  } else {
    logSkip("Buat stok dummy", "Tidak ada lab");
  }

  if (stockId) {
    await expectOk("Buat transaksi stok masuk", "POST", `/api/stocks/${stockId}/transactions`, adminToken, {
      tipe_transaksi: "masuk",
      jumlah: 5,
      keterangan: "Smoke test",
    });
  } else {
    logSkip("Buat transaksi stok masuk", "Stok dummy tidak dibuat");
  }

  await runTest("Flow peminjaman dan pengembalian jika ada alat tersedia", async () => {
    const equipments = await getData("/api/equipments", adminToken);
    const equipment = Array.isArray(equipments)
      ? equipments.find((item) => item.status === "tersedia" && item.kondisi === "baik")
      : null;

    if (!equipment) {
      logSkip("Flow peminjaman", "Tidak ada equipment dengan status tersedia dan kondisi baik");
      return;
    }

    const borrowingRes = await request("POST", "/api/borrowings", dosenToken, {
      equipment_ids: [equipment.id],
      tanggal_pinjam: "2026-06-05",
      tanggal_kembali_rencana: "2026-06-07",
      keperluan: "praktikum",
      nama_kegiatan: `Smoke Test ${timestamp}`,
      catatan_pengajuan: "Pengajuan otomatis smoke test",
    });
    if (!borrowingRes.response.ok) {
      throw new Error(`Create borrowing ${borrowingRes.response.status}: ${borrowingRes.payload.message}`);
    }

    const borrowingId = borrowingRes.payload.data.id;

    const approveRes = await request("PUT", `/api/borrowings/${borrowingId}/approve`, adminToken, {
      catatan_persetujuan: "Disetujui smoke test",
    });
    if (!approveRes.response.ok) {
      throw new Error(`Approve borrowing ${approveRes.response.status}: ${approveRes.payload.message}`);
    }

    const returnRes = await request("POST", "/api/returns", dosenToken, {
      borrowing_id: borrowingId,
      tanggal_pengembalian: "2026-06-07",
      catatan_pengembalian: "Dikembalikan smoke test",
    });
    if (!returnRes.response.ok) {
      throw new Error(`Create return ${returnRes.response.status}: ${returnRes.payload.message}`);
    }

    const returnId = returnRes.payload.data.id;
    const borrowingDetails = approveRes.payload.data.borrowing_details || [];
    const verifyDetails = borrowingDetails.map((detail) => ({
      equipment_id: detail.equipment_id,
      kondisi_sesudah: "baik",
      status_akhir_alat: "tersedia",
      catatan: "Alat baik saat smoke test",
    }));

    const verifyRes = await request("PUT", `/api/returns/${returnId}/verify`, adminToken, {
      status_pengembalian: "diterima",
      catatan_pengembalian: "Semua alat kembali dengan baik",
      details: verifyDetails,
    });
    if (!verifyRes.response.ok) {
      throw new Error(`Verify return ${verifyRes.response.status}: ${verifyRes.payload.message}`);
    }
  });

  console.log(`Summary: PASS ${results.pass}, FAIL ${results.fail}, SKIP ${results.skip}`);
  process.exit(results.fail > 0 ? 1 : 0);
};

main();

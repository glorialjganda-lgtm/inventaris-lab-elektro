const express = require("express");
const prisma = require("../config/prisma");

const router = express.Router();

router.get("/summary", async (req, res) => {
  try {
    const totalUsers = await prisma.users.count();
    const totalLabs = await prisma.laboratories.count();
    const totalCategories = await prisma.categories.count();
    const totalEquipments = await prisma.equipments.count();
    const totalStocks = await prisma.consumable_stocks.count();

    res.json({
      status: "success",
      message: "Ringkasan dashboard berhasil diambil",
      data: {
        totalUsers,
        totalLabs,
        totalCategories,
        totalEquipments,
        totalStocks,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    res.status(500).json({
      status: "error",
      message: "Gagal mengambil ringkasan dashboard",
      error: error.message,
    });
  }
});

module.exports = router;
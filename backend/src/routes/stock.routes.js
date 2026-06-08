const express = require("express");
const {
  getAllStocks,
  getStockById,
  createStock,
  updateStock,
  deleteStock,
  getStockTransactions,
  createStockTransaction,
} = require("../controllers/stock.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin_jurusan", "kepala_lab"));

router.get("/", getAllStocks);
router.get("/:id", getStockById);
router.post("/", createStock);
router.put("/:id", updateStock);
router.delete("/:id", deleteStock);
router.get("/:id/transactions", getStockTransactions);
router.post("/:id/transactions", createStockTransaction);

module.exports = router;

const express = require("express");
const {
  inventoryReport,
  borrowingReport,
  maintenanceReport,
  stockReport,
} = require("../controllers/report.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin_jurusan", "kepala_lab"));

router.get("/inventory", inventoryReport);
router.get("/borrowings", borrowingReport);
router.get("/maintenances", maintenanceReport);
router.get("/stocks", stockReport);

module.exports = router;

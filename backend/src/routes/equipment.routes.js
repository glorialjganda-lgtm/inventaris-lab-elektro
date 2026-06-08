const express = require("express");

const {
  getAllEquipments,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} = require("../controllers/equipment.controller");

const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authenticate, getAllEquipments);
router.get("/:id", authenticate, getEquipmentById);

router.post(
  "/",
  authenticate,
  authorizeRoles("admin_jurusan", "kepala_lab"),
  createEquipment
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin_jurusan", "kepala_lab"),
  updateEquipment
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin_jurusan", "kepala_lab"),
  deleteEquipment
);

module.exports = router;
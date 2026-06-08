const express = require("express");

const {
  getAllLaboratories,
  getLaboratoryById,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
} = require("../controllers/laboratory.controller");

const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authenticate, getAllLaboratories);
router.get("/:id", authenticate, getLaboratoryById);

router.post(
  "/",
  authenticate,
  authorizeRoles("admin_jurusan"),
  createLaboratory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin_jurusan"),
  updateLaboratory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin_jurusan"),
  deleteLaboratory
);

module.exports = router;
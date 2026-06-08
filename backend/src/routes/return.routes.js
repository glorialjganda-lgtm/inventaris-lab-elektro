const express = require("express");
const {
  getAllReturns,
  getReturnById,
  createReturn,
  verifyReturn,
} = require("../controllers/return.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authenticate, getAllReturns);
router.get("/:id", authenticate, getReturnById);
router.post("/", authenticate, authorizeRoles("dosen", "mahasiswa"), createReturn);

router.put(
  "/:id/verify",
  authenticate,
  authorizeRoles("admin_jurusan", "kepala_lab"),
  verifyReturn
);

module.exports = router;

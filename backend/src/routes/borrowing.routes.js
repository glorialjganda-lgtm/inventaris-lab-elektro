const express = require("express");
const {
  getAllBorrowings,
  getBorrowingById,
  createBorrowing,
  approveBorrowing,
  rejectBorrowing,
  getDosenApprovals,
  approveDosen,
  rejectDosen,
} = require("../controllers/borrowing.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authenticate, getAllBorrowings);
router.get(
  "/dosen-approvals",
  authenticate,
  authorizeRoles("dosen"),
  getDosenApprovals
);
router.get("/:id", authenticate, getBorrowingById);

router.post("/", authenticate, authorizeRoles("dosen", "mahasiswa"), createBorrowing);

router.put(
  "/:id/approve-dosen",
  authenticate,
  authorizeRoles("dosen"),
  approveDosen
);

router.put(
  "/:id/reject-dosen",
  authenticate,
  authorizeRoles("dosen"),
  rejectDosen
);

router.put(
  "/:id/approve",
  authenticate,
  authorizeRoles("admin_jurusan", "kepala_lab"),
  approveBorrowing
);

router.put(
  "/:id/reject",
  authenticate,
  authorizeRoles("admin_jurusan", "kepala_lab"),
  rejectBorrowing
);

module.exports = router;

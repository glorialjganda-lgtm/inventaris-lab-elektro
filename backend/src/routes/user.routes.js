const express = require("express");
const {
  getAllUsers,
  getActiveDosenOptions,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/user.controller");

const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get(
  "/dosen-options",
  authorizeRoles("mahasiswa", "admin_jurusan", "dosen"),
  getActiveDosenOptions
);

router.use(authorizeRoles("admin_jurusan"));
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;

const express = require("express");

const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");

const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authenticate, getAllCategories);
router.get("/:id", authenticate, getCategoryById);

router.post(
  "/",
  authenticate,
  authorizeRoles("admin_jurusan"),
  createCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin_jurusan"),
  updateCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin_jurusan"),
  deleteCategory
);

module.exports = router;
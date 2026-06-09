const express = require("express");
const cors = require("cors");
require("dotenv").config();

const dashboardRoutes = require("./routes/dashboard.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const laboratoryRoutes = require("./routes/laboratory.routes");
const categoryRoutes = require("./routes/category.routes");
const equipmentRoutes = require("./routes/equipment.routes");
const borrowingRoutes = require("./routes/borrowing.routes");
const returnRoutes = require("./routes/return.routes");
const maintenanceRoutes = require("./routes/maintenance.routes");
const stockRoutes = require("./routes/stock.routes");
const reportRoutes = require("./routes/report.routes");

const app = express();

const localOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const frontendOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];
const allowedOrigins =
  process.env.NODE_ENV === "production" && frontendOrigins.length > 0
    ? frontendOrigins
    : [...localOrigins, ...frontendOrigins];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin tidak diizinkan oleh CORS"));
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "API Sistem Inventaris Laboratorium Teknik Elektro berjalan",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "Backend aktif dan siap digunakan",
  });
});

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/laboratories", laboratoryRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/equipments", equipmentRoutes);
app.use("/api/borrowings", borrowingRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/maintenances", maintenanceRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/reports", reportRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

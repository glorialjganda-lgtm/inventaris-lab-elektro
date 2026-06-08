import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./layouts/ProtectedRoute.jsx";
import LandingPage from "./pages/public/LandingPage.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import UnauthorizedPage from "./pages/public/UnauthorizedPage.jsx";
import NotFoundPage from "./pages/public/NotFoundPage.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminUsersPage from "./pages/admin/AdminUsersPage.jsx";
import AdminLaboratoriesPage from "./pages/admin/AdminLaboratoriesPage.jsx";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage.jsx";
import AdminEquipmentsPage from "./pages/admin/AdminEquipmentsPage.jsx";
import AdminBorrowingsPage from "./pages/admin/AdminBorrowingsPage.jsx";
import AdminReturnsPage from "./pages/admin/AdminReturnsPage.jsx";
import AdminMaintenancesPage from "./pages/admin/AdminMaintenancesPage.jsx";
import AdminStocksPage from "./pages/admin/AdminStocksPage.jsx";
import AdminReportsPage from "./pages/admin/AdminReportsPage.jsx";
import AdminProfilePage from "./pages/admin/AdminProfilePage.jsx";
import KepalaLabDashboard from "./pages/kepala-lab/KepalaLabDashboard.jsx";
import KepalaLabEquipmentsPage from "./pages/kepala-lab/KepalaLabEquipmentsPage.jsx";
import KepalaLabBorrowingsPage from "./pages/kepala-lab/KepalaLabBorrowingsPage.jsx";
import KepalaLabReturnsPage from "./pages/kepala-lab/KepalaLabReturnsPage.jsx";
import KepalaLabMaintenancesPage from "./pages/kepala-lab/KepalaLabMaintenancesPage.jsx";
import KepalaLabStocksPage from "./pages/kepala-lab/KepalaLabStocksPage.jsx";
import KepalaLabReportsPage from "./pages/kepala-lab/KepalaLabReportsPage.jsx";
import KepalaLabProfilePage from "./pages/kepala-lab/KepalaLabProfilePage.jsx";
import DosenDashboard from "./pages/dosen/DosenDashboard.jsx";
import DosenEquipmentsPage from "./pages/dosen/DosenEquipmentsPage.jsx";
import DosenBorrowingCreatePage from "./pages/dosen/DosenBorrowingCreatePage.jsx";
import DosenBorrowingStatusPage from "./pages/dosen/DosenBorrowingStatusPage.jsx";
import DosenHistoryPage from "./pages/dosen/DosenHistoryPage.jsx";
import DosenProfilePage from "./pages/dosen/DosenProfilePage.jsx";
import DosenStudentApprovalsPage from "./pages/dosen/DosenStudentApprovalsPage.jsx";
import MahasiswaDashboard from "./pages/mahasiswa/MahasiswaDashboard.jsx";
import MahasiswaEquipmentsPage from "./pages/mahasiswa/MahasiswaEquipmentsPage.jsx";
import MahasiswaBorrowingCreatePage from "./pages/mahasiswa/MahasiswaBorrowingCreatePage.jsx";
import MahasiswaBorrowingStatusPage from "./pages/mahasiswa/MahasiswaBorrowingStatusPage.jsx";
import MahasiswaHistoryPage from "./pages/mahasiswa/MahasiswaHistoryPage.jsx";
import MahasiswaProfilePage from "./pages/mahasiswa/MahasiswaProfilePage.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/not-found" element={<NotFoundPage />} />

      <Route element={<ProtectedRoute allowedRoles={["admin_jurusan"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/laboratories" element={<AdminLaboratoriesPage />} />
        <Route path="/admin/categories" element={<AdminCategoriesPage />} />
        <Route path="/admin/equipments" element={<AdminEquipmentsPage />} />
        <Route path="/admin/borrowings" element={<AdminBorrowingsPage />} />
        <Route path="/admin/returns" element={<AdminReturnsPage />} />
        <Route path="/admin/maintenances" element={<AdminMaintenancesPage />} />
        <Route path="/admin/stocks" element={<AdminStocksPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["kepala_lab"]} />}>
        <Route path="/kepala-lab/dashboard" element={<KepalaLabDashboard />} />
        <Route path="/kepala-lab/equipments" element={<KepalaLabEquipmentsPage />} />
        <Route path="/kepala-lab/borrowings" element={<KepalaLabBorrowingsPage />} />
        <Route path="/kepala-lab/returns" element={<KepalaLabReturnsPage />} />
        <Route path="/kepala-lab/maintenances" element={<KepalaLabMaintenancesPage />} />
        <Route path="/kepala-lab/stocks" element={<KepalaLabStocksPage />} />
        <Route path="/kepala-lab/reports" element={<KepalaLabReportsPage />} />
        <Route path="/kepala-lab/profile" element={<KepalaLabProfilePage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["dosen"]} />}>
        <Route path="/dosen/dashboard" element={<DosenDashboard />} />
        <Route path="/dosen/equipments" element={<DosenEquipmentsPage />} />
        <Route path="/dosen/borrowings/create" element={<DosenBorrowingCreatePage />} />
        <Route path="/dosen/borrowings/status" element={<DosenBorrowingStatusPage />} />
        <Route path="/dosen/student-approvals" element={<DosenStudentApprovalsPage />} />
        <Route path="/dosen/history" element={<DosenHistoryPage />} />
        <Route path="/dosen/profile" element={<DosenProfilePage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["mahasiswa"]} />}>
        <Route path="/mahasiswa/dashboard" element={<MahasiswaDashboard />} />
        <Route path="/mahasiswa/equipments" element={<MahasiswaEquipmentsPage />} />
        <Route path="/mahasiswa/borrowings/create" element={<MahasiswaBorrowingCreatePage />} />
        <Route path="/mahasiswa/borrowings/status" element={<MahasiswaBorrowingStatusPage />} />
        <Route path="/mahasiswa/history" element={<MahasiswaHistoryPage />} />
        <Route path="/mahasiswa/profile" element={<MahasiswaProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  );
};

export default App;

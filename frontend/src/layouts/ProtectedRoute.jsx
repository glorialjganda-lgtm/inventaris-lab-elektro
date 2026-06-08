import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getUser, isAuthenticated } from "../utils/auth.js";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const location = useLocation();
  const user = getUser();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

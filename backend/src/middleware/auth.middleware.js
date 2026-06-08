const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/response");

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return errorResponse(res, "Token tidak ditemukan. Silakan login terlebih dahulu.", 401);
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return errorResponse(res, "Format token tidak valid", 401);
    }

    const token = parts[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return errorResponse(res, "Token tidak valid atau sudah kedaluwarsa", 401);
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "User belum terautentikasi", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, "Anda tidak memiliki akses ke fitur ini", 403);
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles,
};
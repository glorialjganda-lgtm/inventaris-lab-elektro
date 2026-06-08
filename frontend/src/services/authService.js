import { get, post } from "./api.js";
import { logout as clearAuth, saveAuth } from "../utils/auth.js";

export const login = async (email, password) => {
  const data = await post("/auth/login", { email, password });
  saveAuth(data.token, data.user);
  return data;
};

export const getMe = () => get("/auth/me");

export const logout = () => {
  clearAuth();
};

export default {
  login,
  getMe,
  logout,
};

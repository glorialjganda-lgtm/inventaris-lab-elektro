import { getToken } from "../utils/auth.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const OFFLINE_MESSAGE =
  "Backend tidak terhubung. Pastikan server backend berjalan di http://localhost:5000";

const buildHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseResponse = async (response) => {
  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || "Request gagal diproses");
  }

  return payload?.data ?? payload;
};

const request = async (method, endpoint, data) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: buildHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return parseResponse(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(OFFLINE_MESSAGE);
    }

    throw error;
  }
};

export const get = (endpoint) => request("GET", endpoint);
export const post = (endpoint, data) => request("POST", endpoint, data);
export const put = (endpoint, data) => request("PUT", endpoint, data);
export const del = (endpoint) => request("DELETE", endpoint);

export default {
  get,
  post,
  put,
  del,
};

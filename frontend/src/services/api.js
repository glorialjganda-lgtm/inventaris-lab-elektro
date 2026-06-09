import { getToken } from "../utils/auth.js";

const LOCAL_API_BASE_URL = "http://localhost:5000/api";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? LOCAL_API_BASE_URL : "");

if (!API_BASE_URL) {
  console.error("VITE_API_BASE_URL belum diset untuk build production.");
}

const OFFLINE_MESSAGE =
  "Backend tidak terhubung. Pastikan server backend berjalan dan VITE_API_BASE_URL sudah benar.";

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
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL belum diset.");
  }

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

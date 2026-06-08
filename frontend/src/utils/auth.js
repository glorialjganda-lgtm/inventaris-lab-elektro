const TOKEN_KEY = "token";
const USER_KEY = "user";

export const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    return null;
  }
};

export const isAuthenticated = () => Boolean(getToken() && getUser());

export const hasRole = (role) => getUser()?.role === role;

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getDashboardPathByRole = (role) => {
  const paths = {
    admin_jurusan: "/admin/dashboard",
    kepala_lab: "/kepala-lab/dashboard",
    dosen: "/dosen/dashboard",
    mahasiswa: "/mahasiswa/dashboard",
  };

  return paths[role] || "/";
};

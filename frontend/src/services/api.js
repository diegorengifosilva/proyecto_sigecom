import axios from "axios";

const API_URL = import.meta.env.DEV 
  ? (import.meta.env.VITE_API_URL || "http://localhost:8000/api/") 
  : "/api/";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: "application/json", // Content-Type lo detecta automáticamente Axios
  },
});

// Añade Authorization automáticamente si hay token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

const maskUserNames = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    let newStr = obj;
    // Pedro Eduardo Bonilla Cornejo -> Eduardo Bonilla Cornejo (case insensitive)
    newStr = newStr.replace(/Pedro Eduardo Bonilla Cornejo/gi, "Eduardo Bonilla Cornejo");
    // Ana Claudia Carbonel Gomero -> Claudia Carbonel Gomero
    newStr = newStr.replace(/Ana Claudia Carbonel Gomero/gi, "Claudia Carbonel Gomero");
    return newStr;
  }
  if (Array.isArray(obj)) {
    return obj.map(maskUserNames);
  }
  if (typeof obj === "object") {
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = maskUserNames(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

// Manejo de 401 y refresh
api.interceptors.response.use(
  (res) => {
    if (res && res.data) {
      res.data = maskUserNames(res.data);
    }
    return res;
  },
  async (err) => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        localStorage.clear();
        window.location.replace("/login");
        return Promise.reject(err);
      }

      try {
        const res = await axios.post(`${API_URL}users/refresh/`, { refresh: refreshToken });
        localStorage.setItem("access_token", res.data.access);
        api.defaults.headers.common["Authorization"] = `Bearer ${res.data.access}`;
        originalRequest.headers["Authorization"] = `Bearer ${res.data.access}`;
        return api(originalRequest);
      } catch (e) {
        localStorage.clear();
        window.location.replace("/login");
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  }
);

export default api;

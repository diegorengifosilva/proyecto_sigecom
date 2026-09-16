import axios from "axios";

const ensureTrailingSlash = (url) => (url.endsWith("/") ? url : `${url}/`);

/**
 * En HTTPS público nunca se debe llamar a http://IP:8000: el navegador
 * bloquea mixed content y el login parece fallar. Caddy ya proxea /api al backend.
 */
export const resolveApiUrl = () => {
  const fallback = "/api/";
  const envUrl = import.meta.env.VITE_API_URL || fallback;

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    if (String(envUrl).startsWith("http://")) {
      return fallback;
    }
  }

  if (import.meta.env.DEV) {
    return ensureTrailingSlash(envUrl);
  }

  return fallback;
};

export const API_URL = resolveApiUrl();

if (typeof window !== "undefined") {
  console.log("[SIGECOM adjunto] api.js cargado", {
    API_URL,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    DEV: import.meta.env.DEV,
    pagina: window.location.href,
  });
}

/** Convierte una URL absoluta o /api/... a path relativo al cliente Axios. */
export function toApiRequestPath(src) {
  if (!src) return "";
  let path = String(src).trim();
  try {
    if (/^https?:\/\//i.test(path)) {
      const u = new URL(path);
      path = `${u.pathname}${u.search}`;
    }
  } catch {
    /* keep path */
  }
  path = path.replace(/^\/api\/?/i, "");
  return path.replace(/^\//, "");
}

export function reportUrl(path) {
  const relative = toApiRequestPath(path);
  const base = (API_URL || "/api/").replace(/\/+$/, "");
  return `${base}/${relative}`;
}

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
    if (res && res.data && !(res.data instanceof Blob) && res.config.responseType !== 'blob') {
      res.data = maskUserNames(res.data);
    }
    return res;
  },
  async (err) => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.responseType === "blob") {
        return Promise.reject(err);
      }
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

async function blobErrorMessage(blob, fallback) {
  const type = String(blob?.type || "").toLowerCase();
  if (!type.includes("json") && !type.includes("text/html") && !type.includes("text/plain")) {
    return null;
  }
  try {
    const text = await blob.text();
    if (type.includes("text/html") || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) {
      return "El servidor devolvió la página web (index.html) en vez del archivo. Reinicie Waitress y recargue con Ctrl+F5.";
    }
    try {
      const data = JSON.parse(text);
      return data.error || data.detail || fallback;
    } catch {
      return fallback;
    }
  } catch {
    return fallback;
  }
}

/** Descarga un adjunto autenticado (Excel/PDF/etc.) sin abrir otra pestaña a /api. */
export async function downloadAttachment(path, filename = "archivo") {
  const relative = toApiRequestPath(path);
  const fullUrl = `${(API_URL || "/api/").replace(/\/+$/, "")}/${relative}`;
  console.log("[SIGECOM adjunto] downloadAttachment()", {
    path,
    relative,
    filename,
    API_URL,
    fullUrl,
    pagina: typeof window !== "undefined" ? window.location.href : null,
  });
  try {
    const res = await api.get(relative, { responseType: "blob" });
    console.log("[SIGECOM adjunto] respuesta blob", {
      status: res.status,
      type: res.data?.type,
      size: res.data?.size,
      contentDisposition: res.headers?.["content-disposition"],
    });
    const errMsg = await blobErrorMessage(res.data, "No se pudo descargar el archivo");
    if (errMsg) {
      console.error("[SIGECOM adjunto] el blob no es un archivo", errMsg, res.data?.type);
      throw new Error(errMsg);
    }
    const objectUrl = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (err) {
    console.error("[SIGECOM adjunto] fallo axios/red", {
      message: err?.message,
      code: err?.code,
      status: err?.response?.status,
      axiosUrl: `${err?.config?.baseURL || ""}${err?.config?.url || ""}`,
      err,
    });
    throw err;
  }
}

/** Abre PDF/Word/HTML de reportes sin pasar por el service worker (blob). */
export async function openReport(path) {
  try {
    const relative = toApiRequestPath(path);
    const res = await api.get(relative, {
      responseType: "blob",
      headers: {
        Accept:
          "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/html,*/*",
      },
    });
    const errMsg = await blobErrorMessage(res.data, "No se pudo abrir el documento");
    if (errMsg) {
      throw new Error(errMsg);
    }
    const objectUrl = URL.createObjectURL(res.data);
    const opened = window.open(objectUrl, "_blank", "noopener");
    if (!opened) {
      const a = document.createElement("a");
      a.href = objectUrl;
      a.target = "_blank";
      a.rel = "noopener";
      const disposition = res.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      if (match) a.download = decodeURIComponent(match[1]);
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(objectUrl), 120000);
  } catch (err) {
    console.error("No se pudo abrir el reporte", err);
  }
}

export default api;

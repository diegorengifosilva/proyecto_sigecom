// src/services/documentoService.js
import axios from "axios";

/* 🔹 Obtener token CSRF de cookies */
const getCSRFToken = () => {
  const match = document.cookie.match(/csrftoken=([\w-]+)/);
  return match ? match[1] : null;
};

/* 🌐 Cliente Axios con URL dinámica y soporte CORS + credenciales */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/api/caja_chica/documentos",
  timeout: 60000,
  headers: {
    Accept: "application/json",
  },
  withCredentials: true,
});

/* 🔹 Interceptor para enviar CSRF en métodos que lo requieren */
api.interceptors.request.use((config) => {
  if (["post", "put", "patch", "delete"].includes(config.method)) {
    config.headers["X-CSRFToken"] = getCSRFToken();
  }
  return config;
});

/* 🔄 Manejo centralizado de errores */
const manejarError = (error, mensajeDefault) => {
  console.error("❌ Error en servicio documentos:", error);

  if (error.response) {
    console.error("📡 Respuesta backend:", error.response.data);
    throw new Error(error.response.data.error || mensajeDefault);
  } else if (error.request) {
    console.error("📡 Sin respuesta del servidor:", error.request);
    throw new Error("No hay respuesta del servidor. Revisa tu conexión.");
  } else {
    throw new Error(mensajeDefault);
  }
};

/* ========== 🧩 SERVICIO DE DOCUMENTOS OCR Y GASTOS ========== */

/**
 * Procesa un documento (imagen/PDF) con OCR en el backend.
 * @param {FormData} formData
 */
export const procesarDocumentoOCR = async (formData) => {
  try {
    for (let pair of formData.entries()) {
      console.log("📤 Enviando:", pair[0], pair[1]);
    }

    const response = await api.post("/procesar/", formData);

    const resultados = response.data?.resultado || [];
    console.log("✅ OCR recibido:", resultados);

    if (resultados.length === 0) {
      console.warn("⚠️ No se detectaron datos en el OCR");
      return null;
    }

    return resultados.map((r) => r.datos_detectados || {});
  } catch (error) {
    manejarError(
      error,
      "No se pudo procesar el documento. Intenta nuevamente con otra imagen o revisa tu conexión."
    );
  }
};

/**
 * Guarda un documento de gasto procesado (pos-OCR) en el backend.
 * @param {FormData} formData
 */
export const guardarDocumentoGasto = async (formData) => {
  try {
    const response = await api.post("/guardar/", formData);
    console.log("✅ Documento guardado:", response.data);
    return response.data;
  } catch (error) {
    manejarError(
      error,
      "Error al guardar el documento. Verifica los datos e intenta nuevamente."
    );
  }
};

/**
 * Obtiene todos los documentos vinculados a una solicitud
 * @param {number|string} solicitudId
 */
export const obtenerDocumentosPorSolicitud = async (solicitudId) => {
  try {
    const response = await api.get(`/solicitud/${solicitudId}/`, {
      timeout: 30000,
    });
    console.log(`📥 Documentos de solicitud ${solicitudId}:`, response.data);
    return response.data;
  } catch (error) {
    manejarError(
      error,
      "No se pudieron cargar los documentos de la solicitud."
    );
  }
};

/**
 * Test rápido de OCR (debug)
 */
export const testOCR = async () => {
  try {
    const response = await api.get("/test-ocr/");
    console.log("🧪 Test OCR:", response.data);
    return response.data;
  } catch (error) {
    manejarError(error, "No se pudo ejecutar el test de OCR.");
  }
};

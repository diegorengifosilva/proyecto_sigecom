/* ===========================================================
   DASHBOARD 1 — ESTADO DE ENVÍO
   =========================================================== */

// Clases de Tailwind por código
export const ENVIO_STATE_CLASSES = {
  0: "bg-red-200 text-red-800",      // Rojo
  1: "bg-yellow-200 text-yellow-800", // Amarillo
  2: "bg-sky-200 text-sky-800",      // Celeste
  3: "bg-green-200 text-green-800",  // Verde
};

// Colores HEX por código
export const ENVIO_STATE_COLORS = {
  0: "#ff0505", // Rojo
  1: "#fce005", // Amarillo
  2: "#0ea5e9", // Celeste
  3: "#22c55e", // Verde
};

// Traducción código → nombre legible
export const ENVIO_STATE_MAP = {
  0: "Rojo",
  1: "Amarillo",
  2: "Celeste",
  3: "Verde",
};

export const envioMap = {
  0: "Pendiente de Envío para Revisión",
  1: "Pendiente de Envío para Aprobación",
  2: "Pendiente de Envío para Cliente",
  3: "Enviado al Cliente",
};

// Helpers
export function getEnvioNombre(code) {
  if (code === null || code === undefined) return "Sin estado";
  return ENVIO_STATE_MAP[code] || "Desconocido";
}

export function getEnvioColor(code) {
  return ENVIO_STATE_COLORS[code] || "#d1d5db"; // gris por defecto
}

export function getEnvioClass(code) {
  return ENVIO_STATE_CLASSES[code] || "bg-gray-200 text-gray-800";
}

export const getEnvioLabel = (envio) =>
  envioMap[envio] || "Sin estado";

/* ===========================================================
   DASHBOARD 2 — OPORTUNIDADES
   =========================================================== */

export const OPORTUNDAD_STATE_CLASSES = {
  0: "bg-red-200 text-red-800",
  1: "bg-yellow-200 text-yellow-800",
  2: "bg-sky-200 text-sky-800",
  3: "bg-green-200 text-green-800",
};

export const OPORTUNDAD_STATE_COLORS = {
  0: "#ff0505",
  1: "#fce005",
  2: "#0ea5e9",
  3: "#22c55e",
};

export const OPORTUNDAD_STATE_MAP = {
  0: "Pendiente",
  1: "No Cotizado",
  2: "Rechazado",
  3: "Enviado",
};

// Helpers
export function getOportunidadNombre(code) {
  if (code === null || code === undefined) return "Sin estado";
  return OPORTUNDAD_STATE_CLASSES[code] || "Desconocido";
}

export function getOportunidadColor(code) {
  return OPORTUNDAD_STATE_COLORS[code] || "#d1d5db";
}

export function getOportunidadClass(code) {
  return OPORTUNDAD_STATE_MAP[code] || "bg-gray-200 text-gray-800";
}

/* ===========================================================
   DASHBOARD 2 — PROBABILIDAD
   =========================================================== */

export const PROB_STATE_CLASSES = {
  0: "bg-red-200 text-red-800",
  1: "bg-yellow-200 text-yellow-800",
  2: "bg-sky-200 text-sky-800",
  3: "bg-green-200 text-green-800",
};

export const PROB_STATE_COLORS = {
  0: "#ff0505",
  1: "#fce005",
  2: "#0ea5e9",
  3: "#22c55e",
};

export const PROB_STATE_MAP = {
  0: "Bajo",
  1: "Media",
  2: "Alta",
  3: "Muy Alta",
};

// Helpers
export function getProbNombre(code) {
  if (code === null || code === undefined) return "Sin estado";
  return PROB_STATE_MAP[code] || "Desconocido";
}

export function getProbColor(code) {
  return PROB_STATE_COLORS[code] || "#d1d5db";
}

export function getProbClass(code) {
  return PROB_STATE_CLASSES[code] || "bg-gray-200 text-gray-800";
}

/* ===========================================================
   DASHBOARD 3 — ESTADO
   =========================================================== */
// Clases de Tailwind por código
export const ESTADO_STATE_CLASSES = {
  0: "bg-red-200 text-red-800",      // Rojo
  1: "bg-green-200 text-green-800", // Verde
};

// Colores HEX por código
export const ESTADO_STATE_COLORS = {
  0: "#ff0505", // Rojo
  1: "#22c55e", // Verde
};

// Traducción código → nombre legible
export const ESTADO_STATE_MAP = {
  0: "Rojo",
  1: "Verde",
};

// Helpers
export function getEstadoNombre(code) {
  if (code === null || code === undefined) return "Sin estado";
  return ESTADO_STATE_MAP[code] || "Desconocido";
}

export function getEstadoColor(code) {
  return ESTADO_STATE_COLORS[code] || "#d1d5db"; // gris por defecto
}

export function getEstadoClass(code) {
  return ESTADO_STATE_CLASSES[code] || "bg-gray-200 text-gray-800";
}

/* ===========================================================
   CAJA CHICA - ESTADOS Y TIPOS
   =========================================================== */

export const STATE_CLASSES = {
  "Pendiente de Envío": "bg-orange-200 text-orange-800",
  "Pendiente para Atención": "bg-yellow-200 text-yellow-800",
  "Atendido, Pendiente de Liquidación": "bg-sky-200 text-sky-800",
  "Liquidación enviada para Aprobación": "bg-green-200 text-green-800",
  "Liquidación Aprobada": "bg-gray-800 text-white",
  "Rechazado": "bg-red-200 text-red-800",
};

export const STATE_COLORS = {
  "Pendiente de Envío": "#f97316",
  "Pendiente para Atención": "#ffef00",
  "Atendido, Pendiente de Liquidación": "#0ea5e9",
  "Liquidación enviada para Aprobación": "#22c55e",
  "Liquidación Aprobada": "#0f172a",
  "Rechazado": "#ef4444",
};

export const TIPO_SOLICITUD_CLASSES = {
  "Viáticos": "bg-blue-500 text-white",
  "Movilidad": "bg-emerald-500 text-white",
  "Compras": "bg-purple-500 text-white",
  "Otros gastos": "bg-yellow-100 text-yellow-800",
};

export const TYPE_COLORS = {
  "Viáticos": "#0218db",
  "Movilidad": "#059669",
  "Compras": "#7c3aed",
  "Otros gastos": "#eab308"
};
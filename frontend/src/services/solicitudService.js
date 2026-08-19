// src/services/solicitudService.js

import api from "./api"; // Usa tu instancia de Axios

export const crearSolicitud = async (formData) => {
  const response = await api.post("/caja_chica/solicitudes/guardar-solicitud/", formData);
  return response.data;
};
import api from "../services/api";

export const crearCotizacion = async (payload) => {
  try {
    const { data } = await api.post("cotizaciones/guardar/", payload);
    return data; // ✅ éxito
  } catch (err) {
    if (err.response) {
      console.error("❌ Error al guardar cotización:", err.response.status);
      console.error("💬 Mensaje del backend:", JSON.stringify(err.response.data));
      throw err.response.data;
    } else {
      console.error("❌ Error desconocido:", err);
      throw err;
    }
  }
};
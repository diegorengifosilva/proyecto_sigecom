import api from './api';

const BASE = '/proyectos-ev/evaluaciones';

const evaluacionesService = {
  // Escenarios
  listarEscenarios: () => api.get(`${BASE}/escenarios/`),
  crearEscenario: (data) => api.post(`${BASE}/escenarios/`, data),
  actualizarEscenario: (id, data) => api.put(`${BASE}/escenarios/${id}/`, data),
  eliminarEscenario: (id) => api.delete(`${BASE}/escenarios/${id}/`),
  marcarPredeterminado: (id) => api.post(`${BASE}/escenarios/${id}/marcar-predeterminado/`),

  // Alternativas
  listarAlternativas: () => api.get(`${BASE}/alternativas/`),
  crearAlternativa: (data) => api.post(`${BASE}/alternativas/`, data),
  actualizarAlternativa: (id, data) => api.put(`${BASE}/alternativas/${id}/`, data),
  eliminarAlternativa: (id) => api.delete(`${BASE}/alternativas/${id}/`),
  recalcularAlternativa: (id, payload = {}) =>
    api.post(`${BASE}/alternativas/${id}/calcular-metricas/`, payload),

  // Evaluaciones
  listarEvaluaciones: (params = {}) => api.get(`${BASE}/evaluaciones/`, { params }),
  crearEvaluacion: (data) => api.post(`${BASE}/evaluaciones/`, data),
  actualizarEvaluacion: (id, data) => api.patch(`${BASE}/evaluaciones/${id}/`, data),
  eliminarEvaluacion: (id) => api.delete(`${BASE}/evaluaciones/${id}/`),
  obtenerEvaluacion: (id) => api.get(`${BASE}/evaluaciones/${id}/`),
  ejecutarEvaluacion: (id, data) => api.post(`${BASE}/evaluaciones/${id}/ejecutar/`, data),
  obtenerResultados: (id) => api.get(`${BASE}/evaluaciones/${id}/resultados/`),
};

export default evaluacionesService;



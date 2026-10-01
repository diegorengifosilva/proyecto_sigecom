/**
 * Servicio API para Proyectos
 * Gestión de proyectos principales
 */

import api from './api';

const proyectosService = {
  /**
   * Listar todos los proyectos del usuario autenticado
   */
  listar: () =>
    api.get('/proyectos-ev/proyectos/'),

  /**
   * Obtener detalle de un proyecto específico
   */
  obtener: (id) =>
    api.get(`/proyectos-ev/proyectos/${id}/`),

  /**
   * Crear nuevo proyecto
   */
  crear: (data) =>
    api.post('/proyectos-ev/proyectos/', data),

  /**
   * Actualizar proyecto existente
   */
  actualizar: (id, data) =>
    api.put(`/proyectos-ev/proyectos/${id}/`, data),

  /**
   * Actualización parcial de proyecto
   */
  actualizarParcial: (id, data) =>
    api.patch(`/proyectos-ev/proyectos/${id}/`, data),

  /**
   * Eliminar proyecto
   */
  eliminar: (id) =>
    api.delete(`/proyectos-ev/proyectos/${id}/`),

  /**
   * Obtener dashboard del proyecto con métricas
   */
  obtenerDashboard: (id) =>
    api.get(`/proyectos-ev/${id}/proyectos/`),

  /**
   * Obtener curvas S del proyecto
   */
  obtenerCurvas: (id) =>
    api.get(`/proyectos-ev/${id}/curvas/`),

  /**
   * Analizar proyecto con IA generativa (Gemini)
   */
  analizarIA: (id) =>
    api.post(`/proyectos-ev/proyectos/${id}/analizar-ia/`),
};

export default proyectosService;



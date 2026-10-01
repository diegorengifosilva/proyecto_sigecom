/**
 * Servicio API para Notas
 * Gestión de notas y comentarios del proyecto
 */

import api from './api';

const notasService = {
  /**
   * Listar todas las notas de un proyecto
   */
  listar: (proyectoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/notas/`),

  /**
   * Obtener detalle de una nota específica
   */
  obtener: (proyectoId, notaId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/notas/${notaId}/`),

  /**
   * Crear nueva nota
   */
  crear: (proyectoId, data) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/notas/`, data),

  /**
   * Actualizar nota existente
   */
  actualizar: (proyectoId, notaId, data) =>
    api.put(`/proyectos-ev/proyectos/${proyectoId}/notas/${notaId}/`, data),

  /**
   * Actualización parcial de nota
   */
  actualizarParcial: (proyectoId, notaId, data) =>
    api.patch(`/proyectos-ev/proyectos/${proyectoId}/notas/${notaId}/`, data),

  /**
   * Eliminar nota
   */
  eliminar: (proyectoId, notaId) =>
    api.delete(`/proyectos-ev/proyectos/${proyectoId}/notas/${notaId}/`),
};

export default notasService;



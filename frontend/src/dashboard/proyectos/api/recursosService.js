/**
 * Servicio API para Recursos del Proyecto
 * Gestión de recursos humanos y materiales, y sus asignaciones a tareas
 */

import api from './api';

const recursosService = {
  // ===== RECURSOS =====

  /**
   * Listar todos los recursos de un proyecto
   */
  listar: (proyectoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/recursos/`),

  /**
   * Obtener detalle de un recurso específico
   */
  obtener: (proyectoId, recursoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/recursos/${recursoId}/`),

  /**
   * Crear nuevo recurso
   */
  crear: (proyectoId, data) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/recursos/`, data),

  /**
   * Actualizar recurso existente
   */
  actualizar: (proyectoId, recursoId, data) =>
    api.put(`/proyectos-ev/proyectos/${proyectoId}/recursos/${recursoId}/`, data),

  /**
   * Actualización parcial de recurso
   */
  actualizarParcial: (proyectoId, recursoId, data) =>
    api.patch(`/proyectos-ev/proyectos/${proyectoId}/recursos/${recursoId}/`, data),

  /**
   * Eliminar recurso
   */
  eliminar: (proyectoId, recursoId) =>
    api.delete(`/proyectos-ev/proyectos/${proyectoId}/recursos/${recursoId}/`),

  // ===== ASIGNACIONES =====

  /**
   * Listar todas las asignaciones de recursos de un proyecto
   */
  listarAsignaciones: (proyectoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/asignaciones/`),

  /**
   * Obtener detalle de una asignación específica
   */
  obtenerAsignacion: (proyectoId, asignacionId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/asignaciones/${asignacionId}/`),

  /**
   * Crear nueva asignación de recurso a tarea
   */
  crearAsignacion: (proyectoId, data) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/asignaciones/`, data),

  /**
   * Actualizar asignación existente
   */
  actualizarAsignacion: (proyectoId, asignacionId, data) =>
    api.put(`/proyectos-ev/proyectos/${proyectoId}/asignaciones/${asignacionId}/`, data),

  /**
   * Actualización parcial de asignación
   */
  actualizarAsignacionParcial: (proyectoId, asignacionId, data) =>
    api.patch(`/proyectos-ev/proyectos/${proyectoId}/asignaciones/${asignacionId}/`, data),

  /**
   * Eliminar asignación
   */
  eliminarAsignacion: (proyectoId, asignacionId) =>
    api.delete(`/proyectos-ev/proyectos/${proyectoId}/asignaciones/${asignacionId}/`),
};

export default recursosService;



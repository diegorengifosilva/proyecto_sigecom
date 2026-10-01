/**
 * Servicio API para Comunicaciones
 * Gestión de comunicaciones del proyecto (reuniones, correos, informes)
 */

import api from './api';

const comunicacionesService = {
  /**
   * Listar todas las comunicaciones de un proyecto
   */
  listar: (proyectoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/comunicaciones/`),

  /**
   * Obtener detalle de una comunicación específica
   */
  obtener: (proyectoId, comunicacionId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/comunicaciones/${comunicacionId}/`),

  /**
   * Crear nueva comunicación
   */
  crear: (proyectoId, data) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/comunicaciones/`, data),

  /**
   * Actualizar comunicación existente
   */
  actualizar: (proyectoId, comunicacionId, data) =>
    api.put(`/proyectos-ev/proyectos/${proyectoId}/comunicaciones/${comunicacionId}/`, data),

  /**
   * Actualización parcial de comunicación
   */
  actualizarParcial: (proyectoId, comunicacionId, data) =>
    api.patch(`/proyectos-ev/proyectos/${proyectoId}/comunicaciones/${comunicacionId}/`, data),

  /**
   * Eliminar comunicación
   */
  eliminar: (proyectoId, comunicacionId) =>
    api.delete(`/proyectos-ev/proyectos/${proyectoId}/comunicaciones/${comunicacionId}/`),
};

export default comunicacionesService;



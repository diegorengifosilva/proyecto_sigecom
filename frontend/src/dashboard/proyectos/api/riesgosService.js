/**
 * Servicio API para Riesgos
 * Gestión de riesgos del proyecto con matriz PxI
 */

import api from './api';

const riesgosService = {
  /**
   * Listar todos los riesgos de un proyecto
   */
  listar: (proyectoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/riesgos/`),

  /**
   * Obtener detalle de un riesgo específico
   */
  obtener: (proyectoId, riesgoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/riesgos/${riesgoId}/`),

  /**
   * Crear nuevo riesgo
   */
  crear: (proyectoId, data) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/riesgos/`, data),

  /**
   * Actualizar riesgo existente
   */
  actualizar: (proyectoId, riesgoId, data) =>
    api.put(`/proyectos-ev/proyectos/${proyectoId}/riesgos/${riesgoId}/`, data),

  /**
   * Actualización parcial de riesgo
   */
  actualizarParcial: (proyectoId, riesgoId, data) =>
    api.patch(`/proyectos-ev/proyectos/${proyectoId}/riesgos/${riesgoId}/`, data),

  /**
   * Eliminar riesgo
   */
  eliminar: (proyectoId, riesgoId) =>
    api.delete(`/proyectos-ev/proyectos/${proyectoId}/riesgos/${riesgoId}/`),
};

export default riesgosService;



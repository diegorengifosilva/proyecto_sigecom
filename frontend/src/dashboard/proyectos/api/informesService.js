/**
 * Servicio API para Informes Ejecutivos
 * Gestión de generación y descarga de informes
 */

import api from './api';

const informesService = {
  /**
   * Listar informes de un proyecto
   */
  listar: (proyectoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/informes/`),

  /**
   * Obtener detalle de un informe específico
   */
  obtener: (proyectoId, informeId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/informes/${informeId}/`),

  /**
   * Generar nuevo informe
   */
  generar: (proyectoId, data) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/informes/`, data),

  /**
   * Eliminar informe
   */
  eliminar: (proyectoId, informeId) =>
    api.delete(`/proyectos-ev/proyectos/${proyectoId}/informes/${informeId}/`),

  /**
   * Descargar archivo de informe
   */
  descargar: (proyectoId, informeId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/informes/${informeId}/descargar/`, {
      responseType: 'blob'
    }),
};

export default informesService;



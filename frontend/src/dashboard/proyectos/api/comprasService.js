/**
 * Servicio API para Compras y Contratos
 * Gestión de órdenes de compra, contratos y adquisiciones
 */

import api from './api';

const comprasService = {
  /**
   * Listar todas las compras de un proyecto
   */
  listar: (proyectoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/compras/`),

  /**
   * Obtener detalle de una compra específica
   */
  obtener: (proyectoId, compraId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/compras/${compraId}/`),

  /**
   * Crear nueva compra
   */
  crear: (proyectoId, data) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/compras/`, data),

  /**
   * Actualizar compra existente
   */
  actualizar: (proyectoId, compraId, data) =>
    api.put(`/proyectos-ev/proyectos/${proyectoId}/compras/${compraId}/`, data),

  /**
   * Actualización parcial de compra
   */
  actualizarParcial: (proyectoId, compraId, data) =>
    api.patch(`/proyectos-ev/proyectos/${proyectoId}/compras/${compraId}/`, data),

  /**
   * Eliminar compra
   */
  eliminar: (proyectoId, compraId) =>
    api.delete(`/proyectos-ev/proyectos/${proyectoId}/compras/${compraId}/`),
};

export default comprasService;



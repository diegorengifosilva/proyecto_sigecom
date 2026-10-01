/**
 * Servicio API para Gestión de Calidad
 * Gestión de checklists de calidad y sus ítems
 */

import api from './api';

const calidadService = {
  // ===== CHECKLISTS =====

  /**
   * Listar todos los checklists de un proyecto
   */
  listar: (proyectoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/checklists/`),

  /**
   * Obtener detalle de un checklist específico
   */
  obtener: (proyectoId, checklistId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/checklists/${checklistId}/`),

  /**
   * Crear nuevo checklist
   */
  crear: (proyectoId, data) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/checklists/`, data),

  /**
   * Actualizar checklist existente
   */
  actualizar: (proyectoId, checklistId, data) =>
    api.put(`/proyectos-ev/proyectos/${proyectoId}/checklists/${checklistId}/`, data),

  /**
   * Actualización parcial de checklist
   */
  actualizarParcial: (proyectoId, checklistId, data) =>
    api.patch(`/proyectos-ev/proyectos/${proyectoId}/checklists/${checklistId}/`, data),

  /**
   * Eliminar checklist
   */
  eliminar: (proyectoId, checklistId) =>
    api.delete(`/proyectos-ev/proyectos/${proyectoId}/checklists/${checklistId}/`),

  // ===== ITEMS DE CHECKLIST =====

  /**
   * Listar todos los ítems de un checklist
   */
  listarItems: (proyectoId, checklistId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/checklists/${checklistId}/items/`),

  /**
   * Obtener detalle de un ítem específico
   */
  obtenerItem: (proyectoId, checklistId, itemId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/checklists/${checklistId}/items/${itemId}/`),

  /**
   * Crear nuevo ítem en checklist
   */
  crearItem: (proyectoId, checklistId, data) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/checklists/${checklistId}/items/`, data),

  /**
   * Actualizar ítem existente
   */
  actualizarItem: (proyectoId, checklistId, itemId, data) =>
    api.put(`/proyectos-ev/proyectos/${proyectoId}/checklists/${checklistId}/items/${itemId}/`, data),

  /**
   * Actualización parcial de ítem
   */
  actualizarItemParcial: (proyectoId, checklistId, itemId, data) =>
    api.patch(`/proyectos-ev/proyectos/${proyectoId}/checklists/${checklistId}/items/${itemId}/`, data),

  /**
   * Eliminar ítem
   */
  eliminarItem: (proyectoId, checklistId, itemId) =>
    api.delete(`/proyectos-ev/proyectos/${proyectoId}/checklists/${checklistId}/items/${itemId}/`),
};

export default calidadService;



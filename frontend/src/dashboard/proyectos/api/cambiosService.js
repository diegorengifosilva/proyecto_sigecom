/**
 * Servicio API para Control de Cambios
 * Gestión de solicitudes de cambio con flujo de aprobación
 */

import api from './api';

const cambiosService = {
  /**
   * Listar todos los cambios de un proyecto
   */
  listar: (proyectoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/cambios/`),

  /**
   * Obtener detalle de un cambio específico
   */
  obtener: (proyectoId, cambioId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/cambios/${cambioId}/`),

  /**
   * Crear nueva solicitud de cambio
   */
  crear: (proyectoId, data) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/cambios/`, data),

  /**
   * Actualizar cambio existente
   */
  actualizar: (proyectoId, cambioId, data) =>
    api.put(`/proyectos-ev/proyectos/${proyectoId}/cambios/${cambioId}/`, data),

  /**
   * Actualización parcial de cambio
   */
  actualizarParcial: (proyectoId, cambioId, data) =>
    api.patch(`/proyectos-ev/proyectos/${proyectoId}/cambios/${cambioId}/`, data),

  /**
   * Eliminar cambio
   */
  eliminar: (proyectoId, cambioId) =>
    api.delete(`/proyectos-ev/proyectos/${proyectoId}/cambios/${cambioId}/`),
};

export default cambiosService;



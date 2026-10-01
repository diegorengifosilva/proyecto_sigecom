/**
 * Servicio API para Tareas Operativas de Equipo (TareaEv)
 * Permite monitorear la ejecución de tareas por responsable.
 */

import api from './api';

const tareasService = {
  /**
   * Listar todas las tareas visibles para el usuario autenticado.
   * Opcionalmente se puede pasar params (proyecto, estado, responsable)
   */
  listar: (params = {}) =>
    api.get('/proyectos-ev/tareas-ev/', { params }),

  crear: (data) =>
    api.post('/proyectos-ev/tareas-ev/', data),

  actualizar: (tareaId, data) =>
    api.put(`/proyectos-ev/tareas-ev/${tareaId}/`, data),

  eliminar: (tareaId) =>
    api.delete(`/proyectos-ev/tareas-ev/${tareaId}/`),
};

export default tareasService;



/**
 * Servicio API para Cronogramas EDT/Gantt
 * Maneja versiones de cronogramas y tareas
 */

import api from './api';

const cronogramasService = {
  // ========== Versiones de Cronograma ==========

  /**
   * Listar todas las versiones de cronograma de un proyecto
   */
  listarPorProyecto: (proyectoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/cronogramas/`),

  /**
   * Obtener detalle de una versión específica
   */
  obtener: (proyectoId, versionId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/cronogramas/${versionId}/`),

  /**
   * Crear nueva versión de cronograma
   */
  crear: (proyectoId, data) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/cronogramas/`, data),

  /**
   * Actualizar versión existente
   */
  actualizar: (proyectoId, versionId, data) =>
    api.put(`/proyectos-ev/proyectos/${proyectoId}/cronogramas/${versionId}/`, data),

  /**
   * Eliminar versión de cronograma
   */
  eliminar: (proyectoId, versionId) =>
    api.delete(`/proyectos-ev/proyectos/${proyectoId}/cronogramas/${versionId}/`),

  /**
   * Recalcular cronograma (algoritmo de programación)
   */
  calcular: (proyectoId, versionId) =>
    api.post(`/proyectos-ev/proyectos/${proyectoId}/cronogramas/${versionId}/calcular/`),

  /**
   * Exportar a MS Project XML
   */
  exportarMSP: (proyectoId, versionId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/cronogramas/${versionId}/export_msp/`, {
      responseType: 'blob'
    }),

  /**
   * Exportar a Excel
   */
  exportarXLSX: (proyectoId, versionId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/cronogramas/${versionId}/export_xlsx/`, {
      responseType: 'blob'
    }),

  /**
   * Descargar plantilla Excel vacía
   */
  descargarPlantilla: (proyectoId) =>
    api.get(`/proyectos-ev/proyectos/${proyectoId}/cronogramas/plantilla_excel/`, {
      responseType: 'blob'
    }),

  /**
   * Importar cronograma desde Excel
   */
  importarExcel: (proyectoId, file, nombre = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (nombre) formData.append('nombre', nombre);

    return api.post(`/proyectos-ev/proyectos/${proyectoId}/cronogramas/importar_excel/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // ========== Tareas ==========

  /**
   * Listar tareas de una versión
   */
  listarTareas: (versionId) =>
    api.get(`/proyectos-ev/tareas/?version_id=${versionId}`),

  /**
   * Crear tarea
   */
  crearTarea: (data) =>
    api.post(`/proyectos-ev/tareas/`, data),

  /**
   * Actualizar tarea
   */
  actualizarTarea: (tareaId, data) =>
    api.put(`/proyectos-ev/tareas/${tareaId}/`, data),

  /**
   * Eliminar tarea
   */
  eliminarTarea: (tareaId) =>
    api.delete(`/proyectos-ev/tareas/${tareaId}/`),
};

export default cronogramasService;



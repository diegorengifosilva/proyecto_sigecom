/**
 * Servicio API para Documentos
 * Upload y gestión de archivos del proyecto
 */

import api from './api';

const documentosService = {
  /**
   * Listar documentos de un proyecto
   */
  listar: (proyectoId) =>
    api.get(`/proyectos-ev/documentos/?proyecto_id=${proyectoId}`),

  /**
   * Obtener detalle de un documento
   */
  obtener: (docId) =>
    api.get(`/proyectos-ev/documentos/${docId}/`),

  /**
   * Subir nuevo documento/archivo
   * @param {number} proyectoId - ID del proyecto
   * @param {FormData} formData - Debe contener 'archivo', 'nombre', 'proyecto'
   */
  subir: (proyectoId, formData) => {
    // Asegurar que el proyecto esté en el FormData
    if (!formData.has('proyecto')) {
      formData.append('proyecto', proyectoId);
    }

    return api.post('/proyectos-ev/documentos/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * Actualizar información del documento (no el archivo)
   */
  actualizar: (docId, data) =>
    api.patch(`/proyectos-ev/documentos/${docId}/`, data),

  /**
   * Eliminar documento
   */
  eliminar: (docId) =>
    api.delete(`/proyectos-ev/documentos/${docId}/`),
};

export default documentosService;



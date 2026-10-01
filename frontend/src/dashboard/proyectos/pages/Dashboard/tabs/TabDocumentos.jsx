// src/pages/Dashboard/tabs/TabDocumentos.jsx
import React, { useState, useEffect } from 'react';
import { documentosService } from '../../../api';

const TIPOS_DOC = ['acta', 'informe', 'plan', 'especificacion', 'contrato', 'manual', 'otro'];

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-PE');
  } catch {
    return '—';
  }
};

export default function TabDocumentos({ proyecto }) {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    nombre: '',
    tipo: 'informe',
    descripcion: '',
    archivo: null,
  });

  const cargarDocumentos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await documentosService.listar(proyecto.id);
      setDocumentos(response.data);
    } catch (err) {
      console.error('Error cargando documentos:', err);
      setError('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proyecto?.id) {
      cargarDocumentos();
    }
  }, [proyecto?.id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm({
        ...uploadForm,
        archivo: file,
        nombre: uploadForm.nombre || file.name,
      });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.archivo) {
      setError('Por favor seleccione un archivo');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('archivo', uploadForm.archivo);
      formData.append('nombre', uploadForm.nombre);
      formData.append('tipo', uploadForm.tipo);
      formData.append('descripcion', uploadForm.descripcion);
      formData.append('proyecto', proyecto.id);

      await documentosService.subir(proyecto.id, formData);
      await cargarDocumentos();

      // Reset form
      setUploadForm({
        nombre: '',
        tipo: 'informe',
        descripcion: '',
        archivo: null,
      });
      // Reset file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Error subiendo documento:', err);
      setError('Error al subir documento: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleEliminar = async (docId) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    try {
      await documentosService.eliminar(docId);
      await cargarDocumentos();
    } catch (err) {
      console.error('Error eliminando documento:', err);
      setError('Error al eliminar documento');
    }
  };

  const handleDescargar = (doc) => {
    if (doc.archivo_url) {
      window.open(doc.archivo_url, '_blank');
    }
  };

  if (loading) {
    return <div className="p-4">Cargando documentos...</div>;
  }

  return (
    <div className="project-documents-tab space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="project-documents-heading flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Gestión de Documentos</h2>
        <span>{documentos.length} documento{documentos.length === 1 ? '' : 's'}</span>
      </div>

      {/* Upload Form */}
      <div className="project-documents-upload rounded-xl border p-4 bg-gray-50">
        <div className="project-documents-card-title">
          <div>
            <h3 className="font-semibold">Subir nuevo documento</h3>
            <p>Adjunte archivos de respaldo, control o entrega del proyecto.</p>
          </div>
        </div>
        <form onSubmit={handleUpload}>
          <div className="project-documents-fields">
            <label>
              <span>Nombre del documento</span>
            <input
              placeholder="Ej. Informe de avance mensual"
              value={uploadForm.nombre}
              onChange={(e) => setUploadForm({ ...uploadForm, nombre: e.target.value })}
              required
            />
            </label>
            <label>
              <span>Tipo de documento</span>
            <select
              value={uploadForm.tipo}
              onChange={(e) => setUploadForm({ ...uploadForm, tipo: e.target.value })}
            >
              {TIPOS_DOC.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            </label>
          </div>

          <label className="project-documents-description">
            <span>Descripción</span>
            <textarea placeholder="Detalle breve del contenido o propósito del archivo" rows="2" value={uploadForm.descripcion} onChange={(e) => setUploadForm({ ...uploadForm, descripcion: e.target.value })}/>
          </label>

          <div className="project-documents-file-row">
            <input
              id="file-upload"
              type="file"
              className="project-documents-file-input"
              onChange={handleFileChange}
              required
            />
            <label htmlFor="file-upload" className="project-documents-file-picker">
              <span className="project-documents-file-action">Seleccionar archivo</span>
              <span className="project-documents-file-name">{uploadForm.archivo ? uploadForm.archivo.name : 'Ningún archivo seleccionado'}</span>
            </label>
            <button
              type="submit"
              disabled={uploading || !uploadForm.archivo}
              className={`project-documents-submit ${
                uploading || !uploadForm.archivo
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploading ? 'Subiendo...' : 'Subir'}
            </button>
          </div>

          {uploadForm.archivo && (
            <div className="text-xs text-gray-600">
              Archivo seleccionado: <span className="font-medium">{uploadForm.archivo.name}</span>
              {' '}({formatBytes(uploadForm.archivo.size)})
            </div>
          )}
        </form>
      </div>

      {/* Documents List */}
      <div className="project-documents-list rounded-xl border p-4">
        <div className="project-documents-card-title">
          <div>
            <h3 className="font-semibold">Documentos del proyecto</h3>
            <p>Repositorio de archivos vinculados a este proyecto.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-right">Tamaño</th>
                <th className="px-3 py-2 text-left">Subido por</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <tr key={doc.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{doc.nombre}</td>
                  <td className="px-3 py-2 capitalize">{doc.tipo}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate">
                    {doc.descripcion || '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {formatBytes(doc.tamano_bytes)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {doc.subido_por_nombre || '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">{fmtDate(doc.fecha_subida)}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleDescargar(doc)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                      title="Descargar"
                    >
                      ⬇ Descargar
                    </button>
                    <button
                      onClick={() => handleEliminar(doc.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {!documentos.length && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    No hay documentos subidos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {documentos.length > 0 && (
        <div className="rounded-xl border p-4 bg-blue-50">
          <div className="text-sm text-gray-700">
            <strong>{documentos.length}</strong> documento(s) ·
            Tamaño total: <strong>{formatBytes(documentos.reduce((sum, d) => sum + (d.tamano_bytes || 0), 0))}</strong>
          </div>
        </div>
      )}
    </div>
  );
}





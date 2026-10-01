// src/pages/Dashboard/tabs/TabCambios.jsx
import React, { useState, useEffect } from 'react';
import { cambiosService } from '../../../api';

const TIPOS = ['alcance', 'cronograma', 'costo', 'calidad', 'otro'];
const PRIORIDADES = ['baja', 'media', 'alta', 'critica'];
const ESTADOS = ['solicitado', 'en_revision', 'aprobado', 'rechazado', 'implementado'];

const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(-2)}`;
};

export default function TabCambios({ proyecto }) {
  const [cambios, setCambios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const [form, setForm] = useState({
    numero: '',
    titulo: '',
    descripcion: '',
    tipo: 'alcance',
    prioridad: 'media',
    solicitante: '',
    impacto_alcance: '',
    impacto_cronograma: '',
    impacto_costo: '',
    impacto_calidad: '',
    estado: 'solicitado',
    aprobador: '',
    fecha_aprobacion: '',
    justificacion_decision: '',
    fecha_implementacion: '',
    responsable_implementacion: '',
    notas_implementacion: '',
  });

  const cargarCambios = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await cambiosService.listar(proyecto.id);
      setCambios(response.data);
    } catch (err) {
      console.error('Error cargando cambios:', err);
      setError('Error al cargar cambios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proyecto?.id) {
      cargarCambios();
    }
  }, [proyecto?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await cambiosService.actualizar(proyecto.id, editando.id, form);
      } else {
        await cambiosService.crear(proyecto.id, form);
      }
      await cargarCambios();
      resetForm();
    } catch (err) {
      console.error('Error guardando cambio:', err);
      setError('Error al guardar cambio');
    }
  };

  const handleEliminar = async (cambioId) => {
    if (!window.confirm('¿Eliminar esta solicitud de cambio?')) return;
    try {
      await cambiosService.eliminar(proyecto.id, cambioId);
      await cargarCambios();
    } catch (err) {
      console.error('Error eliminando cambio:', err);
      setError('Error al eliminar cambio');
    }
  };

  const handleEditar = (cambio) => {
    setEditando(cambio);
    setForm({
      numero: cambio.numero || '',
      titulo: cambio.titulo || '',
      descripcion: cambio.descripcion || '',
      tipo: cambio.tipo || 'alcance',
      prioridad: cambio.prioridad || 'media',
      solicitante: cambio.solicitante || '',
      impacto_alcance: cambio.impacto_alcance || '',
      impacto_cronograma: cambio.impacto_cronograma || '',
      impacto_costo: cambio.impacto_costo || '',
      impacto_calidad: cambio.impacto_calidad || '',
      estado: cambio.estado || 'solicitado',
      aprobador: cambio.aprobador || '',
      fecha_aprobacion: cambio.fecha_aprobacion || '',
      justificacion_decision: cambio.justificacion_decision || '',
      fecha_implementacion: cambio.fecha_implementacion || '',
      responsable_implementacion: cambio.responsable_implementacion || '',
      notas_implementacion: cambio.notas_implementacion || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      numero: '',
      titulo: '',
      descripcion: '',
      tipo: 'alcance',
      prioridad: 'media',
      solicitante: '',
      impacto_alcance: '',
      impacto_cronograma: '',
      impacto_costo: '',
      impacto_calidad: '',
      estado: 'solicitado',
      aprobador: '',
      fecha_aprobacion: '',
      justificacion_decision: '',
      fecha_implementacion: '',
      responsable_implementacion: '',
      notas_implementacion: '',
    });
    setEditando(null);
    setShowForm(false);
  };

  const getEstadoBadge = (estado) => {
    const colors = {
      solicitado: 'bg-blue-100 text-blue-800',
      en_revision: 'bg-yellow-100 text-yellow-800',
      aprobado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800',
      implementado: 'bg-gray-100 text-gray-800',
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-4">Cargando cambios...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Control de Cambios</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          {showForm ? 'Cancelar' : '+ Nueva Solicitud'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-4 bg-gray-50">
          <h3 className="font-semibold mb-3">
            {editando ? 'Editar Cambio' : 'Nueva Solicitud de Cambio'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Número"
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                required
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Título"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                required
              />
            </div>

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Descripción"
              rows="3"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>

              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>

              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Solicitante"
                value={form.solicitante}
                onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Impactos</label>
              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Impacto en Alcance"
                rows="2"
                value={form.impacto_alcance}
                onChange={(e) => setForm({ ...form, impacto_alcance: e.target.value })}
              />
              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Impacto en Cronograma"
                rows="2"
                value={form.impacto_cronograma}
                onChange={(e) => setForm({ ...form, impacto_cronograma: e.target.value })}
              />
              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Impacto en Costo"
                rows="2"
                value={form.impacto_costo}
                onChange={(e) => setForm({ ...form, impacto_costo: e.target.value })}
              />
              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Impacto en Calidad"
                rows="2"
                value={form.impacto_calidad}
                onChange={(e) => setForm({ ...form, impacto_calidad: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Aprobación</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  className="border rounded px-3 py-2 text-sm"
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e.replace(/_/g, ' ').charAt(0).toUpperCase() + e.slice(1).replace(/_/g, ' ')}</option>
                  ))}
                </select>

                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Aprobador"
                  value={form.aprobador}
                  onChange={(e) => setForm({ ...form, aprobador: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fecha Aprobación</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    type="date"
                    value={form.fecha_aprobacion}
                    onChange={(e) => setForm({ ...form, fecha_aprobacion: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fecha Implementación</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    type="date"
                    value={form.fecha_implementacion}
                    onChange={(e) => setForm({ ...form, fecha_implementacion: e.target.value })}
                  />
                </div>
              </div>

              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Justificación de Decisión"
                rows="2"
                value={form.justificacion_decision}
                onChange={(e) => setForm({ ...form, justificacion_decision: e.target.value })}
              />

              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Responsable Implementación"
                value={form.responsable_implementacion}
                onChange={(e) => setForm({ ...form, responsable_implementacion: e.target.value })}
              />

              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Notas de Implementación"
                rows="2"
                value={form.notas_implementacion}
                onChange={(e) => setForm({ ...form, notas_implementacion: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                {editando ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border p-4">
        <h3 className="font-semibold mb-3">Solicitudes de Cambio</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Número</th>
                <th className="px-3 py-2 text-left">Título</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Prioridad</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Solicitante</th>
                <th className="px-3 py-2 text-left">Fecha Sol.</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cambios.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{c.numero}</td>
                  <td className="px-3 py-2">{c.titulo}</td>
                  <td className="px-3 py-2 capitalize">{c.tipo}</td>
                  <td className="px-3 py-2 capitalize">{c.prioridad}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${getEstadoBadge(c.estado)}`}>
                      {c.estado.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2">{c.solicitante || '—'}</td>
                  <td className="px-3 py-2">{fmtDate(c.fecha_solicitud)}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleEditar(c)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(c.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {!cambios.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                    No hay solicitudes de cambio registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}





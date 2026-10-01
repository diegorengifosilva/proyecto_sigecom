// src/pages/Dashboard/tabs/TabComunicaciones.jsx
import React, { useState, useEffect } from 'react';
import { comunicacionesService } from '../../../api';

const TIPOS = ['reunion', 'correo', 'informe', 'presentacion', 'otro'];
const ESTADOS = ['planificada', 'realizada', 'cancelada', 'pospuesta'];

const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(-2)}`;
};

export default function TabComunicaciones({ proyecto }) {
  const [comunicaciones, setComunicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const [form, setForm] = useState({
    tipo: 'reunion',
    titulo: '',
    descripcion: '',
    emisor: '',
    destinatarios: '',
    fecha_planificada: '',
    fecha_realizada: '',
    estado: 'planificada',
    agenda: '',
    acuerdos: '',
    siguiente_pasos: '',
  });

  const cargarComunicaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await comunicacionesService.listar(proyecto.id);
      setComunicaciones(response.data);
    } catch (err) {
      console.error('Error cargando comunicaciones:', err);
      setError('Error al cargar comunicaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proyecto?.id) {
      cargarComunicaciones();
    }
  }, [proyecto?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await comunicacionesService.actualizar(proyecto.id, editando.id, form);
      } else {
        await comunicacionesService.crear(proyecto.id, form);
      }
      await cargarComunicaciones();
      resetForm();
    } catch (err) {
      console.error('Error guardando comunicación:', err);
      setError('Error al guardar comunicación');
    }
  };

  const handleEliminar = async (comunicacionId) => {
    if (!window.confirm('¿Eliminar esta comunicación?')) return;
    try {
      await comunicacionesService.eliminar(proyecto.id, comunicacionId);
      await cargarComunicaciones();
    } catch (err) {
      console.error('Error eliminando comunicación:', err);
      setError('Error al eliminar comunicación');
    }
  };

  const handleEditar = (com) => {
    setEditando(com);
    setForm({
      tipo: com.tipo || 'reunion',
      titulo: com.titulo || '',
      descripcion: com.descripcion || '',
      emisor: com.emisor || '',
      destinatarios: com.destinatarios || '',
      fecha_planificada: com.fecha_planificada || '',
      fecha_realizada: com.fecha_realizada || '',
      estado: com.estado || 'planificada',
      agenda: com.agenda || '',
      acuerdos: com.acuerdos || '',
      siguiente_pasos: com.siguiente_pasos || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      tipo: 'reunion',
      titulo: '',
      descripcion: '',
      emisor: '',
      destinatarios: '',
      fecha_planificada: '',
      fecha_realizada: '',
      estado: 'planificada',
      agenda: '',
      acuerdos: '',
      siguiente_pasos: '',
    });
    setEditando(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="p-4">Cargando comunicaciones...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Plan de Comunicaciones</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          {showForm ? 'Cancelar' : '+ Nueva Comunicación'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-4 bg-gray-50">
          <h3 className="font-semibold mb-3">
            {editando ? 'Editar Comunicación' : 'Nueva Comunicación'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>

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
              rows="2"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Emisor"
                value={form.emisor}
                onChange={(e) => setForm({ ...form, emisor: e.target.value })}
              />

              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Destinatarios (separados por coma)"
                value={form.destinatarios}
                onChange={(e) => setForm({ ...form, destinatarios: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fecha Planificada</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  type="date"
                  value={form.fecha_planificada}
                  onChange={(e) => setForm({ ...form, fecha_planificada: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Fecha Realizada</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  type="date"
                  value={form.fecha_realizada}
                  onChange={(e) => setForm({ ...form, fecha_realizada: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Estado</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Agenda"
              rows="2"
              value={form.agenda}
              onChange={(e) => setForm({ ...form, agenda: e.target.value })}
            />

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Acuerdos"
              rows="2"
              value={form.acuerdos}
              onChange={(e) => setForm({ ...form, acuerdos: e.target.value })}
            />

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Siguientes Pasos"
              rows="2"
              value={form.siguiente_pasos}
              onChange={(e) => setForm({ ...form, siguiente_pasos: e.target.value })}
            />

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
        <h3 className="font-semibold mb-3">Registro de Comunicaciones</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Título</th>
                <th className="px-3 py-2 text-left">Emisor</th>
                <th className="px-3 py-2 text-left">Destinatarios</th>
                <th className="px-3 py-2 text-left">Fecha Plan.</th>
                <th className="px-3 py-2 text-left">Fecha Real.</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {comunicaciones.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 capitalize">{c.tipo}</td>
                  <td className="px-3 py-2">{c.titulo}</td>
                  <td className="px-3 py-2">{c.emisor || '—'}</td>
                  <td className="px-3 py-2 text-xs">{c.destinatarios || '—'}</td>
                  <td className="px-3 py-2">{fmtDate(c.fecha_planificada)}</td>
                  <td className="px-3 py-2">{fmtDate(c.fecha_realizada)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      c.estado === 'realizada' ? 'bg-green-100 text-green-800' :
                      c.estado === 'planificada' ? 'bg-blue-100 text-blue-800' :
                      c.estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {c.estado}
                    </span>
                  </td>
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
              {!comunicaciones.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                    No hay comunicaciones registradas.
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





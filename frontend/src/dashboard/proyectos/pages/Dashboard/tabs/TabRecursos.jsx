// src/pages/Dashboard/tabs/TabRecursos.jsx
import React, { useState, useEffect } from 'react';
import { recursosService } from '../../../api';

const TIPOS_RECURSO = ['humano', 'material', 'equipo', 'otro'];
const ROLES = ['Gerente', 'Ingeniero', 'Desarrollador', 'Analista', 'Diseñador', 'Tester', 'Otro'];
const ESTADOS = ['disponible', 'asignado', 'no_disponible'];

export default function TabRecursos({ proyecto }) {
  const [recursos, setRecursos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAsigForm, setShowAsigForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    rol: ROLES[0],
    tipo: 'humano',
    porcentaje_dedicacion: '100',
    costo_hora: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'disponible',
    habilidades: '',
    notas: '',
  });

  const [asigForm, setAsigForm] = useState({
    recurso: '',
    tarea: '',
    horas_estimadas: '',
    horas_reales: '',
  });

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recRes, asigRes] = await Promise.all([
        recursosService.listar(proyecto.id),
        recursosService.listarAsignaciones(proyecto.id),
      ]);
      setRecursos(recRes.data);
      setAsignaciones(asigRes.data);
    } catch (err) {
      console.error('Error cargando recursos:', err);
      setError('Error al cargar recursos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proyecto?.id) {
      cargarDatos();
    }
  }, [proyecto?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await recursosService.actualizar(proyecto.id, editando.id, form);
      } else {
        await recursosService.crear(proyecto.id, form);
      }
      await cargarDatos();
      resetForm();
    } catch (err) {
      console.error('Error guardando recurso:', err);
      setError('Error al guardar recurso');
    }
  };

  const handleEliminar = async (recursoId) => {
    if (!window.confirm('¿Eliminar este recurso?')) return;
    try {
      await recursosService.eliminar(proyecto.id, recursoId);
      await cargarDatos();
    } catch (err) {
      console.error('Error eliminando recurso:', err);
      setError('Error al eliminar recurso');
    }
  };

  const handleEditar = (recurso) => {
    setEditando(recurso);
    setForm({
      nombre: recurso.nombre || '',
      email: recurso.email || '',
      telefono: recurso.telefono || '',
      rol: recurso.rol || ROLES[0],
      tipo: recurso.tipo || 'humano',
      porcentaje_dedicacion: recurso.porcentaje_dedicacion || '100',
      costo_hora: recurso.costo_hora || '',
      fecha_inicio: recurso.fecha_inicio || '',
      fecha_fin: recurso.fecha_fin || '',
      estado: recurso.estado || 'disponible',
      habilidades: recurso.habilidades || '',
      notas: recurso.notas || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      nombre: '',
      email: '',
      telefono: '',
      rol: ROLES[0],
      tipo: 'humano',
      porcentaje_dedicacion: '100',
      costo_hora: '',
      fecha_inicio: '',
      fecha_fin: '',
      estado: 'disponible',
      habilidades: '',
      notas: '',
    });
    setEditando(null);
    setShowForm(false);
  };

  const handleAsigSubmit = async (e) => {
    e.preventDefault();
    try {
      await recursosService.crearAsignacion(proyecto.id, asigForm);
      await cargarDatos();
      setAsigForm({ recurso: '', tarea: '', horas_estimadas: '', horas_reales: '' });
      setShowAsigForm(false);
    } catch (err) {
      console.error('Error guardando asignación:', err);
      setError('Error al guardar asignación');
    }
  };

  const handleEliminarAsig = async (asigId) => {
    if (!window.confirm('¿Eliminar esta asignación?')) return;
    try {
      await recursosService.eliminarAsignacion(proyecto.id, asigId);
      await cargarDatos();
    } catch (err) {
      console.error('Error eliminando asignación:', err);
      setError('Error al eliminar asignación');
    }
  };

  if (loading) {
    return <div className="p-4">Cargando recursos...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Recursos */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Recursos del Proyecto</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            {showForm ? 'Cancelar' : '+ Nuevo Recurso'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 mb-4 p-4 bg-gray-50 rounded">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Teléfono"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                {TIPOS_RECURSO.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>

              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="% Dedicación"
                type="number"
                min="0"
                max="100"
                value={form.porcentaje_dedicacion}
                onChange={(e) => setForm({ ...form, porcentaje_dedicacion: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Costo/Hora"
                type="number"
                step="0.01"
                value={form.costo_hora}
                onChange={(e) => setForm({ ...form, costo_hora: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                type="date"
                placeholder="Fecha Inicio"
                value={form.fecha_inicio}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                type="date"
                placeholder="Fecha Fin"
                value={form.fecha_fin}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
              />
            </div>

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Habilidades"
              rows="2"
              value={form.habilidades}
              onChange={(e) => setForm({ ...form, habilidades: e.target.value })}
            />

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Notas"
              rows="2"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
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
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Rol</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-center">Dedicación</th>
                <th className="px-3 py-2 text-right">Costo/H</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recursos.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{r.nombre}</td>
                  <td className="px-3 py-2">{r.rol}</td>
                  <td className="px-3 py-2 capitalize">{r.tipo}</td>
                  <td className="px-3 py-2 text-center">{r.porcentaje_dedicacion}%</td>
                  <td className="px-3 py-2 text-right">{r.costo_hora || '—'}</td>
                  <td className="px-3 py-2 capitalize">{r.estado.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleEditar(r)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(r.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {!recursos.length && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    No hay recursos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asignaciones */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Asignaciones a Tareas</h2>
          <button
            onClick={() => setShowAsigForm(!showAsigForm)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            {showAsigForm ? 'Cancelar' : '+ Nueva Asignación'}
          </button>
        </div>

        {showAsigForm && (
          <form onSubmit={handleAsigSubmit} className="space-y-3 mb-4 p-4 bg-gray-50 rounded">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                className="border rounded px-3 py-2 text-sm"
                value={asigForm.recurso}
                onChange={(e) => setAsigForm({ ...asigForm, recurso: e.target.value })}
                required
              >
                <option value="">Seleccionar Recurso</option>
                {recursos.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>

              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="ID Tarea"
                type="number"
                value={asigForm.tarea}
                onChange={(e) => setAsigForm({ ...asigForm, tarea: e.target.value })}
                required
              />

              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Horas Estimadas"
                type="number"
                step="0.1"
                value={asigForm.horas_estimadas}
                onChange={(e) => setAsigForm({ ...asigForm, horas_estimadas: e.target.value })}
              />

              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Horas Reales"
                type="number"
                step="0.1"
                value={asigForm.horas_reales}
                onChange={(e) => setAsigForm({ ...asigForm, horas_reales: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Asignar
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Recurso</th>
                <th className="px-3 py-2 text-left">Tarea</th>
                <th className="px-3 py-2 text-right">Hrs Estimadas</th>
                <th className="px-3 py-2 text-right">Hrs Reales</th>
                <th className="px-3 py-2 text-left">Fecha Asignación</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{a.recurso_nombre || `ID: ${a.recurso}`}</td>
                  <td className="px-3 py-2">{a.tarea_nombre || `ID: ${a.tarea}`}</td>
                  <td className="px-3 py-2 text-right">{a.horas_estimadas || '—'}</td>
                  <td className="px-3 py-2 text-right">{a.horas_reales || '—'}</td>
                  <td className="px-3 py-2">{a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleEliminarAsig(a.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {!asignaciones.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    No hay asignaciones registradas.
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





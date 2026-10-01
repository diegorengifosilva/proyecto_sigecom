// src/pages/Dashboard/tabs/TabCalidad.jsx
import React, { useState, useEffect } from 'react';
import { calidadService } from '../../../api';

const TIPOS_CHECKLIST = ['entregable', 'proceso', 'auditoria', 'revision', 'otro'];
const ESTADOS_ITEM = ['pendiente', 'en_proceso', 'completado', 'no_aplica'];

export default function TabCalidad({ proyecto }) {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [verItems, setVerItems] = useState(null);

  const [form, setForm] = useState({
    nombre: '',
    tipo: 'entregable',
    descripcion: '',
    creado_por: '',
  });

  const [itemForm, setItemForm] = useState({
    orden: '1',
    descripcion: '',
    criterio_aceptacion: '',
    estado: 'pendiente',
    responsable: '',
    fecha_verificacion: '',
    observaciones: '',
  });

  const cargarChecklists = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await calidadService.listar(proyecto.id);
      setChecklists(response.data);
    } catch (err) {
      console.error('Error cargando checklists:', err);
      setError('Error al cargar checklists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proyecto?.id) {
      cargarChecklists();
    }
  }, [proyecto?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await calidadService.actualizar(proyecto.id, editando.id, form);
      } else {
        await calidadService.crear(proyecto.id, form);
      }
      await cargarChecklists();
      resetForm();
    } catch (err) {
      console.error('Error guardando checklist:', err);
      setError('Error al guardar checklist');
    }
  };

  const handleEliminar = async (checklistId) => {
    if (!window.confirm('¿Eliminar este checklist?')) return;
    try {
      await calidadService.eliminar(proyecto.id, checklistId);
      await cargarChecklists();
    } catch (err) {
      console.error('Error eliminando checklist:', err);
      setError('Error al eliminar checklist');
    }
  };

  const handleEditar = (checklist) => {
    setEditando(checklist);
    setForm({
      nombre: checklist.nombre || '',
      tipo: checklist.tipo || 'entregable',
      descripcion: checklist.descripcion || '',
      creado_por: checklist.creado_por || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      nombre: '',
      tipo: 'entregable',
      descripcion: '',
      creado_por: '',
    });
    setEditando(null);
    setShowForm(false);
  };

  const handleItemSubmit = async (e, checklistId) => {
    e.preventDefault();
    try {
      await calidadService.crearItem(proyecto.id, checklistId, itemForm);
      await cargarChecklists();
      setItemForm({
        orden: '1',
        descripcion: '',
        criterio_aceptacion: '',
        estado: 'pendiente',
        responsable: '',
        fecha_verificacion: '',
        observaciones: '',
      });
    } catch (err) {
      console.error('Error guardando item:', err);
      setError('Error al guardar item');
    }
  };

  const handleEliminarItem = async (checklistId, itemId) => {
    if (!window.confirm('¿Eliminar este ítem?')) return;
    try {
      await calidadService.eliminarItem(proyecto.id, checklistId, itemId);
      await cargarChecklists();
    } catch (err) {
      console.error('Error eliminando item:', err);
      setError('Error al eliminar item');
    }
  };

  const calcularProgreso = (checklist) => {
    if (!checklist.items || checklist.items.length === 0) return 0;
    const completados = checklist.items.filter(i => i.estado === 'completado').length;
    return Math.round((completados / checklist.items.length) * 100);
  };

  if (loading) {
    return <div className="p-4">Cargando checklists...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Gestión de Calidad</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Checklist'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-4 bg-gray-50">
          <h3 className="font-semibold mb-3">
            {editando ? 'Editar Checklist' : 'Nuevo Checklist'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                {TIPOS_CHECKLIST.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Descripción"
              rows="2"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />

            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Creado por"
              value={form.creado_por}
              onChange={(e) => setForm({ ...form, creado_por: e.target.value })}
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

      <div className="space-y-4">
        {checklists.map((checklist) => {
          const progreso = calcularProgreso(checklist);
          const mostrarItems = verItems === checklist.id;

          return (
            <div key={checklist.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{checklist.nombre}</h3>
                  <p className="text-sm text-gray-600">{checklist.descripcion}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Tipo: {checklist.tipo}</span>
                    <span>Items: {checklist.items?.length || 0}</span>
                    <span>Progreso: {progreso}%</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setVerItems(mostrarItems ? null : checklist.id)}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    {mostrarItems ? 'Ocultar' : 'Ver Items'}
                  </button>
                  <button
                    onClick={() => handleEditar(checklist)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(checklist.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {mostrarItems && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium mb-3">Items del Checklist</h4>

                  <form onSubmit={(e) => handleItemSubmit(e, checklist.id)} className="mb-4 p-3 bg-gray-50 rounded space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                      <input
                        className="border rounded px-2 py-1 text-sm"
                        placeholder="Orden"
                        type="number"
                        value={itemForm.orden}
                        onChange={(e) => setItemForm({ ...itemForm, orden: e.target.value })}
                        required
                      />
                      <input
                        className="border rounded px-2 py-1 text-sm md:col-span-2"
                        placeholder="Descripción"
                        value={itemForm.descripcion}
                        onChange={(e) => setItemForm({ ...itemForm, descripcion: e.target.value })}
                        required
                      />
                      <input
                        className="border rounded px-2 py-1 text-sm md:col-span-2"
                        placeholder="Criterio Aceptación"
                        value={itemForm.criterio_aceptacion}
                        onChange={(e) => setItemForm({ ...itemForm, criterio_aceptacion: e.target.value })}
                      />
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={itemForm.estado}
                        onChange={(e) => setItemForm({ ...itemForm, estado: e.target.value })}
                      >
                        {ESTADOS_ITEM.map((e) => (
                          <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        className="border rounded px-2 py-1 text-sm"
                        placeholder="Responsable"
                        value={itemForm.responsable}
                        onChange={(e) => setItemForm({ ...itemForm, responsable: e.target.value })}
                      />
                      <input
                        className="border rounded px-2 py-1 text-sm"
                        type="date"
                        placeholder="Fecha Verificación"
                        value={itemForm.fecha_verificacion}
                        onChange={(e) => setItemForm({ ...itemForm, fecha_verificacion: e.target.value })}
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        + Agregar Item
                      </button>
                    </div>
                  </form>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left w-16">#</th>
                          <th className="px-3 py-2 text-left">Descripción</th>
                          <th className="px-3 py-2 text-left">Criterio</th>
                          <th className="px-3 py-2 text-left">Estado</th>
                          <th className="px-3 py-2 text-left">Responsable</th>
                          <th className="px-3 py-2 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(checklist.items || []).map((item) => (
                          <tr key={item.id} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2">{item.orden}</td>
                            <td className="px-3 py-2">{item.descripcion}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{item.criterio_aceptacion || '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-block px-2 py-1 rounded text-xs ${
                                item.estado === 'completado' ? 'bg-green-100 text-green-800' :
                                item.estado === 'en_proceso' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.estado.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-2">{item.responsable || '—'}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => handleEliminarItem(checklist.id, item.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(!checklist.items || checklist.items.length === 0) && (
                          <tr>
                            <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                              No hay ítems en este checklist.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!checklists.length && (
          <div className="rounded-xl border p-6 text-center text-gray-500">
            No hay checklists de calidad registrados.
          </div>
        )}
      </div>
    </div>
  );
}





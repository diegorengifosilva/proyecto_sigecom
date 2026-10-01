// src/pages/Dashboard/components/NotasWidget.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { notasService } from '../../../api';

// Debe coincidir con las choices del backend (models.Nota.CATEGORIAS)
const CATEGORIAS = ['general', 'reunion', 'decision', 'problema', 'pendiente', 'otro'];

export default function NotasWidget({ proyectoId }) {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const usuario = useMemo(() => {
    try {
      const stored = localStorage.getItem("usuario_pm");
      if (!stored) return null;
      const u = JSON.parse(stored);
      return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || null;
    } catch {
      return null;
    }
  }, []);

  const [form, setForm] = useState({
    titulo: '',
    contenido: '',
    categoria: 'general',
    es_importante: false,
    autor: '',
  });

  useEffect(() => {
    if (usuario) {
      setForm((prev) => ({ ...prev, autor: prev.autor || usuario }));
    }
  }, [usuario]);

  const cargarNotas = async () => {
    if (!proyectoId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await notasService.listar(proyectoId);
      setNotas(response.data);
    } catch (err) {
      console.error('Error cargando notas:', err);
      setError('Error al cargar notas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNotas();
  }, [proyectoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await notasService.actualizar(proyectoId, editando.id, { ...form, autor: form.autor || usuario || 'Anónimo' });
      } else {
        await notasService.crear(proyectoId, { ...form, autor: form.autor || usuario || 'Anónimo' });
      }
      await cargarNotas();
      resetForm();
    } catch (err) {
      console.error('Error guardando nota:', err);
      const detail = err?.response?.data;
      const msg = typeof detail === 'string' ? detail : 'Error al guardar nota';
      setError(msg);
    }
  };

  const handleEliminar = async (notaId) => {
    if (!window.confirm('¿Eliminar esta nota?')) return;
    try {
      await notasService.eliminar(proyectoId, notaId);
      await cargarNotas();
    } catch (err) {
      console.error('Error eliminando nota:', err);
      setError('Error al eliminar nota');
    }
  };

  const handleEditar = (nota) => {
    setEditando(nota);
    setForm({
      titulo: nota.titulo || '',
      contenido: nota.contenido || '',
      categoria: nota.categoria || 'general',
      es_importante: nota.es_importante || false,
      autor: nota.autor || usuario || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      titulo: '',
      contenido: '',
      categoria: 'general',
      es_importante: false,
      autor: usuario || '',
    });
    setEditando(null);
    setShowForm(false);
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-PE');
    } catch {
      return '—';
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Cargando notas...</div>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Notas del Proyecto</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
        >
          {showForm ? 'Cancelar' : '+ Nota'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-3 bg-gray-50 rounded space-y-2">
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="Título"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            required
          />
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="Contenido"
            rows="3"
            value={form.contenido}
            onChange={(e) => setForm({ ...form, contenido: e.target.value })}
            required
          />
          <div className="flex gap-2">
            <select
              className="border rounded px-2 py-1 text-xs flex-1"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <input
              className="border rounded px-2 py-1 text-xs flex-1"
              placeholder="Autor"
              value={form.autor}
              onChange={(e) => setForm({ ...form, autor: e.target.value })}
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={form.es_importante}
                onChange={(e) => setForm({ ...form, es_importante: e.target.checked })}
              />
              Importante
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
            >
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1 border rounded hover:bg-gray-50 text-xs"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notas.map((nota) => (
          <div
            key={nota.id}
            className={`p-3 rounded border ${
              nota.es_importante ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-800">{nota.titulo}</h4>
                <p className="text-xs text-gray-600 mt-1">{nota.contenido}</p>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => handleEditar(nota)}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(nota.id)}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  Eliminar
                </button>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="capitalize">{nota.categoria}</span>
              <span>{nota.autor || 'Anónimo'}</span>
              <span>{fmtDate(nota.fecha_creacion)}</span>
            </div>
          </div>
        ))}
        {!notas.length && (
          <div className="text-center py-6 text-xs text-gray-500">
            No hay notas. Agrega una nota rápida.
          </div>
        )}
      </div>
    </div>
  );
}





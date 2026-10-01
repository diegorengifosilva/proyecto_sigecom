// src/pages/Dashboard/tabs/TabRiesgos.jsx
import React, { useState, useEffect } from 'react';
import { riesgosService } from '../../../api';

const PROBABILIDADES = [
  { value: 1, label: 'Muy Baja' },
  { value: 2, label: 'Baja' },
  { value: 3, label: 'Media' },
  { value: 4, label: 'Alta' },
  { value: 5, label: 'Muy Alta' },
];

const IMPACTOS = [
  { value: 1, label: 'Muy Bajo' },
  { value: 2, label: 'Bajo' },
  { value: 3, label: 'Medio' },
  { value: 4, label: 'Alto' },
  { value: 5, label: 'Muy Alto' },
];

const CATEGORIAS = [
  'Técnico', 'Financiero', 'Organizacional', 'Externo', 'Regulatorio', 'Otro'
];

const ESTADOS = [
  { value: 'identificado', label: 'Identificado' },
  { value: 'en_monitoreo', label: 'En Monitoreo' },
  { value: 'mitigado', label: 'Mitigado' },
  { value: 'materializado', label: 'Materializado' },
  { value: 'cerrado', label: 'Cerrado' },
];

const ESTRATEGIAS = [
  'Evitar', 'Transferir', 'Mitigar', 'Aceptar'
];

// Helper: calcular nivel de riesgo basado en exposición (P x I)
const getNivelRiesgo = (exposicion) => {
  if (exposicion <= 4) return { label: 'Bajo', color: 'bg-green-100 text-green-800' };
  if (exposicion <= 9) return { label: 'Medio', color: 'bg-yellow-100 text-yellow-800' };
  if (exposicion <= 16) return { label: 'Alto', color: 'bg-orange-100 text-orange-800' };
  return { label: 'Crítico', color: 'bg-red-100 text-red-800' };
};

export default function TabRiesgos({ proyecto }) {
  const [riesgos, setRiesgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  // Form state
  const [form, setForm] = useState({
    codigo: '',
    titulo: '',
    descripcion: '',
    categoria: CATEGORIAS[0],
    probabilidad: 3,
    impacto: 3,
    estado: 'identificado',
    responsable: '',
    fecha_identificacion: new Date().toISOString().split('T')[0],
    fecha_revision: '',
    estrategia_respuesta: ESTRATEGIAS[0],
    plan_mitigacion: '',
    plan_contingencia: '',
  });

  // Cargar riesgos
  const cargarRiesgos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await riesgosService.listar(proyecto.id);
      setRiesgos(response.data);
    } catch (err) {
      console.error('Error cargando riesgos:', err);
      setError('Error al cargar riesgos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proyecto?.id) {
      cargarRiesgos();
    }
  }, [proyecto?.id]);

  // Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await riesgosService.actualizar(proyecto.id, editando.id, form);
      } else {
        await riesgosService.crear(proyecto.id, form);
      }
      await cargarRiesgos();
      resetForm();
    } catch (err) {
      console.error('Error guardando riesgo:', err);
      setError('Error al guardar riesgo');
    }
  };

  const handleEliminar = async (riesgoId) => {
    if (!window.confirm('¿Eliminar este riesgo?')) return;
    try {
      await riesgosService.eliminar(proyecto.id, riesgoId);
      await cargarRiesgos();
    } catch (err) {
      console.error('Error eliminando riesgo:', err);
      setError('Error al eliminar riesgo');
    }
  };

  const handleEditar = (riesgo) => {
    setEditando(riesgo);
    setForm({
      codigo: riesgo.codigo || '',
      titulo: riesgo.titulo || '',
      descripcion: riesgo.descripcion || '',
      categoria: riesgo.categoria || CATEGORIAS[0],
      probabilidad: riesgo.probabilidad || 3,
      impacto: riesgo.impacto || 3,
      estado: riesgo.estado || 'identificado',
      responsable: riesgo.responsable || '',
      fecha_identificacion: riesgo.fecha_identificacion || '',
      fecha_revision: riesgo.fecha_revision || '',
      estrategia_respuesta: riesgo.estrategia_respuesta || ESTRATEGIAS[0],
      plan_mitigacion: riesgo.plan_mitigacion || '',
      plan_contingencia: riesgo.plan_contingencia || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      codigo: '',
      titulo: '',
      descripcion: '',
      categoria: CATEGORIAS[0],
      probabilidad: 3,
      impacto: 3,
      estado: 'identificado',
      responsable: '',
      fecha_identificacion: new Date().toISOString().split('T')[0],
      fecha_revision: '',
      estrategia_respuesta: ESTRATEGIAS[0],
      plan_mitigacion: '',
      plan_contingencia: '',
    });
    setEditando(null);
    setShowForm(false);
  };

  // Matriz PxI
  const matrizData = () => {
    const matriz = Array(5).fill(null).map(() => Array(5).fill([]));
    riesgos.forEach(r => {
      const p = (r.probabilidad || 3) - 1;
      const i = (r.impacto || 3) - 1;
      if (p >= 0 && p < 5 && i >= 0 && i < 5) {
        matriz[4 - p][i] = [...matriz[4 - p][i], r];
      }
    });
    return matriz;
  };

  const getCellColor = (p, i) => {
    const exposicion = (5 - p) * (i + 1);
    if (exposicion <= 4) return 'bg-green-50 hover:bg-green-100';
    if (exposicion <= 9) return 'bg-yellow-50 hover:bg-yellow-100';
    if (exposicion <= 16) return 'bg-orange-50 hover:bg-orange-100';
    return 'bg-red-50 hover:bg-red-100';
  };

  if (loading) {
    return <div className="p-4">Cargando riesgos...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Gestión de Riesgos</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Riesgo'}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="rounded-xl border p-4 bg-gray-50">
          <h3 className="font-semibold mb-3">
            {editando ? 'Editar Riesgo' : 'Nuevo Riesgo'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Código"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
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
              rows="2"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.probabilidad}
                onChange={(e) => setForm({ ...form, probabilidad: parseInt(e.target.value) })}
              >
                {PROBABILIDADES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>

              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.impacto}
                onChange={(e) => setForm({ ...form, impacto: parseInt(e.target.value) })}
              >
                {IMPACTOS.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>

              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Responsable"
                value={form.responsable}
                onChange={(e) => setForm({ ...form, responsable: e.target.value })}
              />

              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.estrategia_respuesta}
                onChange={(e) => setForm({ ...form, estrategia_respuesta: e.target.value })}
              >
                {ESTRATEGIAS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fecha Identificación</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  type="date"
                  value={form.fecha_identificacion}
                  onChange={(e) => setForm({ ...form, fecha_identificacion: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fecha Revisión</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  type="date"
                  value={form.fecha_revision}
                  onChange={(e) => setForm({ ...form, fecha_revision: e.target.value })}
                />
              </div>
            </div>

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Plan de Mitigación"
              rows="2"
              value={form.plan_mitigacion}
              onChange={(e) => setForm({ ...form, plan_mitigacion: e.target.value })}
            />

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Plan de Contingencia"
              rows="2"
              value={form.plan_contingencia}
              onChange={(e) => setForm({ ...form, plan_contingencia: e.target.value })}
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

      {/* Matriz PxI */}
      <div className="rounded-xl border p-4">
        <h3 className="font-semibold mb-3">Matriz Probabilidad x Impacto</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-100 w-24">P / I</th>
                {IMPACTOS.map((i) => (
                  <th key={i.value} className="border p-2 bg-gray-100">{i.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrizData().map((fila, pIdx) => (
                <tr key={pIdx}>
                  <td className="border p-2 bg-gray-100 font-medium text-center">
                    {PROBABILIDADES[4 - pIdx].label}
                  </td>
                  {fila.map((celda, iIdx) => (
                    <td
                      key={iIdx}
                      className={`border p-2 ${getCellColor(pIdx, iIdx)} align-top`}
                    >
                      {celda.length > 0 && (
                        <div className="space-y-1">
                          {celda.map((r) => {
                            const nivel = getNivelRiesgo(r.exposicion);
                            return (
                              <div
                                key={r.id}
                                className="text-xs p-1 bg-white rounded shadow-sm cursor-pointer hover:shadow"
                                onClick={() => handleEditar(r)}
                                title={r.descripcion}
                              >
                                <div className="font-medium">{r.codigo}</div>
                                <div className="text-gray-600 truncate">{r.titulo}</div>
                                <div className={`inline-block px-1 rounded text-xs mt-1 ${nivel.color}`}>
                                  {nivel.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de Riesgos */}
      <div className="rounded-xl border p-4">
        <h3 className="font-semibold mb-3">Listado de Riesgos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Título</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                <th className="px-3 py-2 text-center">P</th>
                <th className="px-3 py-2 text-center">I</th>
                <th className="px-3 py-2 text-left">Nivel</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Responsable</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {riesgos.map((r) => {
                const nivel = getNivelRiesgo(r.exposicion);
                return (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{r.codigo}</td>
                    <td className="px-3 py-2">{r.titulo}</td>
                    <td className="px-3 py-2">{r.categoria}</td>
                    <td className="px-3 py-2 text-center">{r.probabilidad}</td>
                    <td className="px-3 py-2 text-center">{r.impacto}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${nivel.color}`}>
                        {nivel.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">{ESTADOS.find(e => e.value === r.estado)?.label || r.estado}</td>
                    <td className="px-3 py-2">{r.responsable || '—'}</td>
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
                );
              })}
              {!riesgos.length && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                    No hay riesgos registrados.
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





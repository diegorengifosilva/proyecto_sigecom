import React, { useEffect, useMemo, useState } from "react";
import { tareasService } from "../../../api";
import { matchesSearch } from "../../../../../utils/search";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente", color: "bg-gray-200 text-gray-800" },
  { value: "en_progreso", label: "En progreso", color: "bg-blue-100 text-blue-700" },
  { value: "finalizada", label: "Finalizada", color: "bg-green-100 text-green-700" },
  { value: "atrasada", label: "Atrasada", color: "bg-red-100 text-red-700" },
];

const emptyForm = {
  titulo: "",
  descripcion: "",
  responsable: "",
  fecha_inicio: "",
  fecha_fin: "",
  duracion: 0,
  peso: 5,
  estado: "pendiente",
  avance_real: 0,
};

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString("es-PE") : "—");

export default function TabTareas({ proyecto }) {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ estado: "todos", responsable: "todos", search: "" });
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTareas = async () => {
    if (!proyecto?.id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await tareasService.listar();
      const list = response.data?.filter((task) => task.proyecto === proyecto.id) || [];
      setTareas(list);
    } catch (err) {
      setError("No se pudieron cargar las tareas del equipo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTareas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyecto?.id]);

  const responsables = useMemo(() => {
    const names = new Set();
    tareas.forEach((task) => {
      if (task.responsable) names.add(task.responsable);
    });
    return Array.from(names);
  }, [tareas]);

  const filtered = useMemo(() => {
    const today = new Date();
    return tareas.map((task) => {
      const dueDate = new Date(task.fecha_fin);
      const isLate =
        task.estado !== "finalizada" &&
        task.estado !== "atrasada" &&
        task.fecha_fin &&
        dueDate < today;
      return { ...task, isLate };
    }).filter((task) => {
      if (filters.estado !== "todos" && task.estado !== filters.estado) return false;
      if (filters.responsable !== "todos" && task.responsable !== filters.responsable) return false;
      if (!matchesSearch(filters.search, task.titulo, task.responsable, task.descripcion, task.estado)) return false;
      return true;
    });
  }, [tareas, filters]);

  const stats = useMemo(() => {
    const total = tareas.length;
    const completadas = tareas.filter((t) => t.estado === "finalizada").length;
    const enProgreso = tareas.filter((t) => t.estado === "en_progreso").length;
    const atrasadas = tareas.filter(
      (t) =>
        t.estado === "atrasada" ||
        (t.estado !== "finalizada" && t.fecha_fin && new Date(t.fecha_fin) < new Date())
    ).length;
    return { total, completadas, enProgreso, atrasadas };
  }, [tareas]);

  const handleFormChange = (field, value) => {
    let nextValue = value;
    if (field === "peso" || field === "avance_real") {
      nextValue = Number(value);
    }
    if (field === "fecha_inicio" || field === "fecha_fin") {
      const other = field === "fecha_inicio" ? form.fecha_fin : form.fecha_inicio;
      if (other) {
        const start = new Date(field === "fecha_inicio" ? value : other);
        const end = new Date(field === "fecha_fin" ? value : other);
        if (!Number.isNaN(start) && !Number.isNaN(end)) {
          const dias = Math.max(1, Math.round((end - start) / 86400000));
          setForm((prev) => ({ ...prev, duracion: dias, [field]: nextValue }));
          return;
        }
      }
    }
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!proyecto?.id) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        proyecto: proyecto.id,
        duracion: form.duracion || 0,
        peso: form.peso || 0,
        avance_real: form.avance_real || 0,
      };
      await tareasService.crear(payload);
      setForm(emptyForm);
      setShowForm(false);
      fetchTareas();
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo registrar la tarea.");
    } finally {
      setSaving(false);
    }
  };

  const handleEstadoQuick = async (tarea, nuevoEstado) => {
    try {
      await tareasService.actualizar(tarea.id, { ...tarea, estado: nuevoEstado });
      fetchTareas();
    } catch (err) {
      setError("No se pudo actualizar el estado de la tarea.");
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 border border-red-200 bg-red-50 text-sm text-red-700 rounded">
          {error}
          <button onClick={() => setError(null)} className="ml-3 underline">
            Cerrar
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500 uppercase">Total tareas</div>
          <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-xl border p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500 uppercase">En progreso</div>
          <div className="text-2xl font-semibold text-blue-600">{stats.enProgreso}</div>
        </div>
        <div className="rounded-xl border p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500 uppercase">Finalizadas</div>
          <div className="text-2xl font-semibold text-green-600">{stats.completadas}</div>
        </div>
        <div className="rounded-xl border p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500 uppercase">Atrasadas</div>
          <div className="text-2xl font-semibold text-red-600">{stats.atrasadas}</div>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="font-semibold text-gray-800">Panel de tareas</div>
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            {showForm ? "Cancelar" : "+ Nueva tarea"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Título</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.titulo}
                  onChange={(e) => handleFormChange("titulo", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Responsable</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.responsable}
                  onChange={(e) => handleFormChange("responsable", e.target.value)}
                  placeholder="Nombre del responsable"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Descripción</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={2}
                value={form.descripcion}
                onChange={(e) => handleFormChange("descripcion", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500">Inicio</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={form.fecha_inicio}
                  onChange={(e) => handleFormChange("fecha_inicio", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Fin</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={form.fecha_fin}
                  onChange={(e) => handleFormChange("fecha_fin", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Duración (días)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border rounded px-3 py-2"
                  value={form.duracion}
                  onChange={(e) => handleFormChange("duracion", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">% peso</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full border rounded px-3 py-2"
                  value={form.peso}
                  onChange={(e) => handleFormChange("peso", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500">Estado</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.estado}
                  onChange={(e) => handleFormChange("estado", e.target.value)}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">% avance real</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full border rounded px-3 py-2"
                  value={form.avance_real}
                  onChange={(e) => handleFormChange("avance_real", Number(e.target.value))}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
            >
              {saving ? "Guardando..." : "Guardar tarea"}
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="search"
            placeholder="Buscar por nombre o responsable..."
            className="corporate-search-input flex-1"
            style={{ minWidth: "200px" }}
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filters.responsable}
            onChange={(e) => setFilters((prev) => ({ ...prev, responsable: e.target.value }))}
          >
            <option value="todos">Todos los responsables</option>
            {responsables.map((responsable) => (
              <option key={responsable} value={responsable}>
                {responsable}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filters.estado}
            onChange={(e) => setFilters((prev) => ({ ...prev, estado: e.target.value }))}
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado.value} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Tarea</th>
                <th className="px-3 py-2">Responsable</th>
                <th className="px-3 py-2">Inicio</th>
                <th className="px-3 py-2">Fin</th>
                <th className="px-3 py-2 text-center">Estado</th>
                <th className="px-3 py-2 text-center">% Avance</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const estadoCfg = ESTADOS.find((e) => e.value === task.estado) || ESTADOS[0];
                return (
                  <tr key={task.id} className={`border-b ${task.isLate ? "bg-red-50" : ""}`}>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-900">{task.titulo}</div>
                      {task.descripcion && <div className="text-xs text-gray-500">{task.descripcion}</div>}
                    </td>
                    <td className="px-3 py-2 text-center">{task.responsable || "—"}</td>
                    <td className="px-3 py-2 text-center">{formatDate(task.fecha_inicio)}</td>
                    <td className="px-3 py-2 text-center">{formatDate(task.fecha_fin)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex ${estadoCfg.color}`}>
                        {estadoCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">{Math.round(task.avance_real || 0)}%</td>
                    <td className="px-3 py-2 text-center">
                      <div className="inline-flex gap-1 flex-wrap justify-center">
                        {ESTADOS.filter((opt) => opt.value !== task.estado).map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleEstadoQuick(task, opt.value)}
                            className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-6">
                    {loading ? "Cargando tareas..." : "No hay tareas registradas con los filtros actuales."}
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





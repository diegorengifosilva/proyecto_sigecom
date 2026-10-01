import React, { useEffect, useMemo, useState } from "react";
import { evaluacionesService } from "../../../api";

const emptyForm = {
  nombre: "",
  descripcion: "",
  peso_roi: 0.25,
  peso_vpn: 0.25,
  peso_impacto: 0.2,
  peso_urgencia: 0.15,
  peso_riesgo: 0.15,
  tasa_descuento: 0.1,
  tolerancia_costo: 5,
  incertidumbre: 0.15,
};

const weightFields = ["peso_roi", "peso_vpn", "peso_impacto", "peso_urgencia", "peso_riesgo"];

export default function EvaluacionesEscenarios() {
  const [escenarios, setEscenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const totalPeso = useMemo(
    () => weightFields.reduce((acc, field) => acc + Number(form[field] || 0), 0),
    [form]
  );

  useEffect(() => {
    cargarEscenarios();
  }, []);

  const cargarEscenarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await evaluacionesService.listarEscenarios();
      const data = response?.data;
      setEscenarios(Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []));
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudieron cargar los escenarios");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      peso_roi: Number(form.peso_roi),
      peso_vpn: Number(form.peso_vpn),
      peso_impacto: Number(form.peso_impacto),
      peso_urgencia: Number(form.peso_urgencia),
      peso_riesgo: Number(form.peso_riesgo),
      tasa_descuento: Number(form.tasa_descuento),
      tolerancia_costo: Number(form.tolerancia_costo),
      incertidumbre: Number(form.incertidumbre),
    };

    try {
      if (editingId) {
        await evaluacionesService.actualizarEscenario(editingId, payload);
      } else {
        await evaluacionesService.crearEscenario(payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      cargarEscenarios();
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo guardar el escenario");
    }
  };

  const handleEdit = (escenario) => {
    setForm({
      nombre: escenario.nombre,
      descripcion: escenario.descripcion || "",
      peso_roi: Number(escenario.peso_roi),
      peso_vpn: Number(escenario.peso_vpn),
      peso_impacto: Number(escenario.peso_impacto),
      peso_urgencia: Number(escenario.peso_urgencia),
      peso_riesgo: Number(escenario.peso_riesgo),
      tasa_descuento: Number(escenario.tasa_descuento),
      tolerancia_costo: Number(escenario.tolerancia_costo),
      incertidumbre: Number(escenario.incertidumbre),
    });
    setEditingId(escenario.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("?Eliminar escenario?")) return;
    try {
      await evaluacionesService.eliminarEscenario(id);
      if (editingId === id) {
        setForm(emptyForm);
        setEditingId(null);
      }
      cargarEscenarios();
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo eliminar el escenario");
    }
  };

  const marcarDefault = async (id) => {
    try {
      await evaluacionesService.marcarPredeterminado(id);
      cargarEscenarios();
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo marcar como predeterminado");
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Escenarios de evaluacion</h1>
          <p className="text-sm text-gray-600">
            Define los pesos y parametros que usaran las evaluaciones estrategicas. Esto es independiente del analisis
            de riesgos operativo.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
          <button className="ml-3 underline" onClick={() => setError(null)}>
            Cerrar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-gray-800">{editingId ? "Editar escenario" : "Nuevo escenario"}</h2>
          <div>
            <label className="text-sm text-gray-600">Nombre</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Descripcion</label>
            <textarea
              className="mt-1 w-full border rounded px-3 py-2"
              rows={2}
              value={form.descripcion}
              onChange={(e) => handleChange("descripcion", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {weightFields.map((field) => (
              <div key={field}>
                <label className="text-xs text-gray-500 uppercase tracking-wide">{field.replace("peso_", "Peso ")}</label>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full border rounded px-2 py-1"
                  value={form[field]}
                  onChange={(e) => handleChange(field, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500">
            Peso total:{" "}
            <span className={totalPeso.toFixed(2) === "1.00" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
              {totalPeso.toFixed(2)}
            </span>{" "}
            (ideal = 1.00)
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Tasa descuento</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border rounded px-2 py-1"
                value={form.tasa_descuento}
                onChange={(e) => handleChange("tasa_descuento", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Tolerancia costo</label>
              <input
                type="number"
                min="1"
                max="10"
                className="mt-1 w-full border rounded px-2 py-1"
                value={form.tolerancia_costo}
                onChange={(e) => handleChange("tolerancia_costo", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Incertidumbre</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border rounded px-2 py-1"
                value={form.incertidumbre}
                onChange={(e) => handleChange("incertidumbre", e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded"
              disabled={totalPeso <= 0 || Math.abs(totalPeso - 1) > 0.15}
            >
              {editingId ? "Actualizar" : "Crear"}
            </button>
            {editingId && (
              <button
                type="button"
                className="px-3 py-2 border rounded"
                onClick={() => {
                  setForm(emptyForm);
                  setEditingId(null);
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="p-4 text-gray-500">Cargando escenarios...</div>
          ) : (!Array.isArray(escenarios) || escenarios.length === 0) ? (
            <div className="p-4 text-gray-500 border rounded bg-white">No hay escenarios configurados.</div>
          ) : (
            (Array.isArray(escenarios) ? escenarios : []).map((esc) => (
              <div key={esc.id} className="bg-white border rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{esc.nombre}</p>
                    <p className="text-sm text-gray-500">{esc.descripcion || "Sin descripcion"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-blue-600 font-semibold" onClick={() => handleEdit(esc)}>
                      Editar
                    </button>
                    <button className="text-red-600 font-semibold" onClick={() => handleDelete(esc.id)}>
                      Eliminar
                    </button>
                    <button className="text-sm px-3 py-1 border rounded" onClick={() => marcarDefault(esc.id)}>
                      {esc.es_predeterminado ? "Predeterminado" : "Marcar default"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
                  {weightFields.map((field) => (
                    <div key={`${esc.id}-${field}`}>
                      <span className="text-xs uppercase text-gray-500">{field.replace("peso_", "Peso ")}</span>
                      <p className="font-semibold">{Number(esc[field]).toFixed(2)}</p>
                    </div>
                  ))}
                  <div>
                    <span className="text-xs uppercase text-gray-500">Tasa descuento</span>
                    <p className="font-semibold">{Number(esc.tasa_descuento).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase text-gray-500">Incertidumbre</span>
                    <p className="font-semibold">{Number(esc.incertidumbre).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase text-gray-500">Tolerancia costo</span>
                    <p className="font-semibold">{esc.tolerancia_costo}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}





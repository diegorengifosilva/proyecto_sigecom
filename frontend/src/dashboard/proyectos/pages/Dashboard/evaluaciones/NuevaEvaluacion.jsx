import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { evaluacionesService, proyectosService } from "../../../api";

const defaultEvalForm = {
  nombre: "",
  descripcion: "",
  escenario: "",
  proyecto_asociado: "",
  alternativas: [],
};

const defaultExecForm = {
  metodos: ["ponderado", "monte_carlo", "ia_generativa"],
  iteraciones_monte_carlo: 1000,
  recalcular_metricas: true,
};

const defaultAltForm = {
  nombre: "",
  codigo: "",
  descripcion: "",
  inversion_inicial: "",
  flujos_futuros: "",
  tasa_retorno_esperada: 0.12,
  impacto_estrategico: 7,
  urgencia: 5,
  nivel_riesgo: 4,
  complejidad_tecnica: 5,
  alineamiento_estrategico: 7,
  ventajas: "",
  desventajas: "",
};

const statusStyles = {
  borrador: "bg-gray-100 text-gray-700",
  en_proceso: "bg-yellow-100 text-yellow-800",
  completada: "bg-green-100 text-green-700",
};

export default function NuevaEvaluacion() {
  const navigate = useNavigate();
  const [escenarios, setEscenarios] = useState([]);
  const [alternativas, setAlternativas] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [form, setForm] = useState(defaultEvalForm);
  const [execForm, setExecForm] = useState(defaultExecForm);
  const [altForm, setAltForm] = useState(defaultAltForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evaluacion, setEvaluacion] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [guardandoAlt, setGuardandoAlt] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [escRes, altRes, projRes] = await Promise.all([
          evaluacionesService.listarEscenarios(),
          evaluacionesService.listarAlternativas(),
          proyectosService.listar(),
        ]);
        setEscenarios(Array.isArray(escRes?.data) ? escRes.data : (Array.isArray(escRes?.data?.results) ? escRes.data.results : []));
        setAlternativas(Array.isArray(altRes?.data) ? altRes.data : (Array.isArray(altRes?.data?.results) ? altRes.data.results : []));
        setProyectos(Array.isArray(projRes?.data) ? projRes.data : (Array.isArray(projRes?.data?.results) ? projRes.data.results : []));
      } catch (err) {
        setError(err.response?.data?.detail || "No se pudo cargar la informacion inicial");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleEvalChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAltToggle = (id) => {
    setForm((prev) => {
      const selected = prev.alternativas.includes(id)
        ? prev.alternativas.filter((altId) => altId !== id)
        : [...prev.alternativas, id];
      return { ...prev, alternativas: selected };
    });
  };

  const crearEvaluacion = async (e) => {
    e.preventDefault();
    if (form.alternativas.length === 0) {
      setError("Selecciona al menos una alternativa");
      return;
    }

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      escenario: form.escenario,
      alternativas: form.alternativas,
      proyecto_asociado: form.proyecto_asociado || null,
      estado: "borrador",
    };

    try {
      const response = await evaluacionesService.crearEvaluacion(payload);
      setEvaluacion(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo crear la evaluacion");
    }
  };

  const ejecutarEvaluacion = async () => {
    if (!evaluacion) return;
    try {
      await evaluacionesService.ejecutarEvaluacion(evaluacion.id, execForm);
      const refreshed = await evaluacionesService.obtenerEvaluacion(evaluacion.id);
      setEvaluacion(refreshed.data);
      setResultados(refreshed.data.resultados || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo ejecutar la evaluacion");
    }
  };

  const crearAlternativa = async (e) => {
    e.preventDefault();
    setGuardandoAlt(true);
    try {
      const payload = {
        nombre: altForm.nombre,
        codigo: altForm.codigo,
        descripcion: altForm.descripcion,
        inversion_inicial: Number(altForm.inversion_inicial),
        flujos_futuros: altForm.flujos_futuros
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => Number(value)),
        tasa_retorno_esperada: Number(altForm.tasa_retorno_esperada),
        impacto_estrategico: Number(altForm.impacto_estrategico),
        urgencia: Number(altForm.urgencia),
        nivel_riesgo: Number(altForm.nivel_riesgo),
        complejidad_tecnica: Number(altForm.complejidad_tecnica),
        alineamiento_estrategico: Number(altForm.alineamiento_estrategico),
        ventajas: altForm.ventajas
          ? altForm.ventajas.split("\n").map((line) => line.trim()).filter(Boolean)
          : [],
        desventajas: altForm.desventajas
          ? altForm.desventajas.split("\n").map((line) => line.trim()).filter(Boolean)
          : [],
      };

      const response = await evaluacionesService.crearAlternativa(payload);
      setAlternativas((prev) => [response.data, ...prev]);
      setAltForm(defaultAltForm);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo crear la alternativa");
    } finally {
      setGuardandoAlt(false);
    }
  };

  const resumenResultados = useMemo(() => {
    const agrupado = {};
    resultados.forEach((res) => {
      agrupado[res.metodo] = agrupado[res.metodo] ? [...agrupado[res.metodo], res] : [res];
    });
    return agrupado;
  }, [resultados]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva evaluacion estrategica</h1>
          <p className="text-sm text-gray-600">
            Configura el escenario, selecciona alternativas y ejecuta los metodos disponibles (Monte Carlo, IA, etc.).
          </p>
        </div>
        <button className="text-sm text-blue-600 underline" onClick={() => navigate("/proyectos/evaluaciones/historial")}>
          Historial de evaluaciones
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Cargando catalogos...</div>
      ) : (
        <React.Fragment>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
              <button className="ml-3 underline" onClick={() => setError(null)}>
                Cerrar
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <form onSubmit={crearEvaluacion} className="bg-white border rounded-lg shadow-sm p-4 space-y-3">
              <h2 className="font-semibold text-gray-800">1. Datos generales</h2>
              <div>
                <label className="text-sm text-gray-600">Nombre</label>
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={form.nombre}
                  onChange={(e) => handleEvalChange("nombre", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Descripcion</label>
                <textarea
                  className="mt-1 w-full border rounded px-3 py-2"
                  rows={2}
                  value={form.descripcion}
                  onChange={(e) => handleEvalChange("descripcion", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Escenario</label>
                <select
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={form.escenario}
                  onChange={(e) => handleEvalChange("escenario", e.target.value)}
                  required
                >
                  <option value="">Selecciona escenario</option>
                  {escenarios.map((esc) => (
                    <option key={esc.id} value={esc.id}>
                      {esc.nombre} {esc.es_predeterminado ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Proyecto asociado (opcional)</label>
                <select
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={form.proyecto_asociado}
                  onChange={(e) => handleEvalChange("proyecto_asociado", e.target.value)}
                >
                  <option value="">Sin asociacion</option>
                  {proyectos.map((proyecto) => (
                    <option key={proyecto.id} value={proyecto.id}>
                      {proyecto.codigo} - {proyecto.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Alternativas disponibles</label>
                <div className="mt-2 max-h-48 overflow-auto border rounded p-2 space-y-1">
                  {alternativas.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay alternativas registradas.</p>
                  ) : (
                    alternativas.map((alt) => (
                      <label key={alt.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.alternativas.includes(alt.id)}
                          onChange={() => handleAltToggle(alt.id)}
                        />
                        <span>
                          {alt.codigo} - {alt.nombre}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white rounded py-2">
                {evaluacion ? "Actualizar seleccion" : "Crear evaluacion"}
              </button>
            </form>

            <form onSubmit={crearAlternativa} className="bg-white border rounded-lg shadow-sm p-4 space-y-3">
              <h2 className="font-semibold text-gray-800">2. Registrar alternativa rapida</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Nombre</label>
                  <input
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={altForm.nombre}
                    onChange={(e) => setAltForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Codigo</label>
                  <input
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={altForm.codigo}
                    onChange={(e) => setAltForm((prev) => ({ ...prev, codigo: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Inversion inicial</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded px-2 py-1"
                  value={altForm.inversion_inicial}
                  onChange={(e) => setAltForm((prev) => ({ ...prev, inversion_inicial: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Flujos futuros (coma)</label>
                <input
                  className="mt-1 w-full border rounded px-2 py-1"
                  value={altForm.flujos_futuros}
                  onChange={(e) => setAltForm((prev) => ({ ...prev, flujos_futuros: e.target.value }))}
                  placeholder="10000,12000,15000"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Impacto estrategico</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={altForm.impacto_estrategico}
                    onChange={(e) => setAltForm((prev) => ({ ...prev, impacto_estrategico: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Riesgo</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={altForm.nivel_riesgo}
                    onChange={(e) => setAltForm((prev) => ({ ...prev, nivel_riesgo: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Ventajas (una por linea)</label>
                <textarea
                  className="mt-1 w-full border rounded px-2 py-1"
                  rows={2}
                  value={altForm.ventajas}
                  onChange={(e) => setAltForm((prev) => ({ ...prev, ventajas: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Desventajas (una por linea)</label>
                <textarea
                  className="mt-1 w-full border rounded px-2 py-1"
                  rows={2}
                  value={altForm.desventajas}
                  onChange={(e) => setAltForm((prev) => ({ ...prev, desventajas: e.target.value }))}
                />
              </div>
              <button type="submit" className="w-full border rounded py-2" disabled={guardandoAlt}>
                {guardandoAlt ? "Guardando..." : "Guardar alternativa"}
              </button>
            </form>

            <div className="bg-white border rounded-lg shadow-sm p-4 space-y-3">
              <h2 className="font-semibold text-gray-800">3. Ejecucion</h2>
              {evaluacion ? (
                <React.Fragment>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Estado actual</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[evaluacion.estado] || ""}`}>
                        {evaluacion.estado}
                      </span>
                    </div>
                    <button className="text-sm text-blue-600" onClick={() => ejecutarEvaluacion()}>
                      Ejecutar metodos
                    </button>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Metodos</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {["ponderado", "vpn", "monte_carlo", "random_forest", "ia_generativa"].map((metodo) => (
                        <label key={metodo} className="text-sm text-gray-700 flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={execForm.metodos.includes(metodo)}
                            onChange={(e) => {
                              setExecForm((prev) => ({
                                ...prev,
                                metodos: e.target.checked
                                  ? [...prev.metodos, metodo]
                                  : prev.metodos.filter((m) => m !== metodo),
                              }));
                            }}
                          />
                          <span className="capitalize">{metodo.replaceAll("_", " ")}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-600">Iteraciones Monte Carlo</label>
                      <input
                        type="number"
                        min={100}
                        className="mt-1 w-full border rounded px-2 py-1"
                        value={execForm.iteraciones_monte_carlo}
                        onChange={(e) =>
                          setExecForm((prev) => ({
                            ...prev,
                            iteraciones_monte_carlo: Number(e.target.value) || 1000,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        checked={execForm.recalcular_metricas}
                        onChange={(e) =>
                          setExecForm((prev) => ({
                            ...prev,
                            recalcular_metricas: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm text-gray-700">Recalcular métricas base</span>
                    </div>
                  </div>
                </React.Fragment>
              ) : (
                <p className="text-sm text-gray-500">
                  Primero crea la evaluación y agrega alternativas para habilitar la ejecución.
                </p>
              )}
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}





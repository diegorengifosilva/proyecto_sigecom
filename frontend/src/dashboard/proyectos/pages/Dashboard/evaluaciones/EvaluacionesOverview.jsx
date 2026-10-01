import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { evaluacionesService } from "../../../api";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const statusColors = {
  borrador: "bg-gray-100 text-gray-700",
  en_proceso: "bg-yellow-100 text-yellow-800",
  completada: "bg-green-100 text-green-700",
  aprobada: "bg-blue-100 text-blue-700",
  rechazada: "bg-red-100 text-red-700",
};

export default function EvaluacionesOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [escenarios, setEscenarios] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [alternativas, setAlternativas] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [escRes, evalRes, altRes] = await Promise.all([
          evaluacionesService.listarEscenarios(),
          evaluacionesService.listarEvaluaciones({ ordering: "-fecha_creacion", limit: 20 }),
          evaluacionesService.listarAlternativas(),
        ]);
        setEscenarios(Array.isArray(escRes?.data) ? escRes.data : (Array.isArray(escRes?.data?.results) ? escRes.data.results : []));
        setEvaluaciones(Array.isArray(evalRes?.data) ? evalRes.data : (Array.isArray(evalRes?.data?.results) ? evalRes.data.results : []));
        setAlternativas(Array.isArray(altRes?.data) ? altRes.data : (Array.isArray(altRes?.data?.results) ? altRes.data.results : []));
      } catch (err) {
        setError(err.response?.data?.detail || "No se pudieron cargar las evaluaciones");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const resumen = useMemo(() => {
    const list = Array.isArray(evaluaciones) ? evaluaciones : [];
    const total = list.length;
    const completadas = list.filter((ev) => ev?.estado === "completada").length;
    const enProceso = list.filter((ev) => ev?.estado === "en_proceso").length;
    const pendientesIA = list.filter((ev) => !ev?.conclusion_ia).length;
    return { total, completadas, enProceso, pendientesIA };
  }, [evaluaciones]);

  const ultimas = (Array.isArray(evaluaciones) ? evaluaciones : []).slice(0, 5);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Evaluaciones estrategicas</h1>
          <p className="text-sm text-gray-600">
            Analiza alternativas con metodos financieros, simulaciones y IA. Manten este flujo separado de la gestion
            de riesgos operativos del proyecto.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
            onClick={() => navigate("/proyectos/evaluaciones/nueva")}
          >
            + Nueva evaluacion
          </button>
          <button
            className="px-4 py-2 border rounded-md text-gray-700"
            onClick={() => navigate("/proyectos/evaluaciones/escenarios")}
          >
            Configurar escenarios
          </button>
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

      {loading ? (
        <div className="p-6 text-center text-gray-500">Cargando informacion...</div>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-gray-500 tracking-wide">Evaluaciones registradas</p>
              <p className="text-3xl font-semibold text-gray-900">{resumen.total}</p>
              <p className="text-sm text-gray-500">Incluye borradores y completadas</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-gray-500 tracking-wide">Completadas</p>
              <p className="text-3xl font-semibold text-green-600">{resumen.completadas}</p>
              <p className="text-sm text-gray-500">Listas para comite</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-gray-500 tracking-wide">En proceso</p>
              <p className="text-3xl font-semibold text-yellow-500">{resumen.enProceso}</p>
              <p className="text-sm text-gray-500">Requieren metodos o IA</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-gray-500 tracking-wide">Pendientes de IA</p>
              <p className="text-3xl font-semibold text-blue-600">{resumen.pendientesIA}</p>
              <p className="text-sm text-gray-500">Sin conclusion generada</p>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">Ultimas evaluaciones</h2>
                <button
                  className="text-sm text-blue-600 font-semibold"
                  onClick={() => navigate("/proyectos/evaluaciones/historial")}
                >
                  Ver historial
                </button>
              </div>
              {ultimas.length === 0 ? (
                <p className="text-sm text-gray-500">Aun no registras evaluaciones.</p>
              ) : (
                <div className="space-y-3">
                  {ultimas.map((eva) => (
                    <div
                      key={eva.id}
                      className="border rounded-lg p-3 hover:border-blue-300 transition cursor-pointer"
                      onClick={() => navigate(`/proyectos/evaluaciones/historial`, { state: { focusId: eva.id } })}
                    >
                      <div className="flex justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{eva.nombre}</p>
                          <p className="text-xs text-gray-500">
                            Escenario: {eva.escenario_nombre || eva.escenario}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            statusColors[eva.estado] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {eva.estado}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-4">
                        <span>Creada: {formatDate(eva.fecha_creacion)}</span>
                        <span>Alternativas: {eva.numero_alternativas}</span>
                        {eva.alternativa_recomendada_nombre && (
                          <span>Recomendada: {eva.alternativa_recomendada_nombre}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border rounded-lg shadow-sm p-4 space-y-4">
              <h2 className="font-semibold text-gray-800">Resumen de escenarios y alternativas</h2>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-gray-600">Escenarios configurados</p>
                  <p className="text-2xl font-semibold text-gray-900">{Array.isArray(escenarios) ? escenarios.length : 0}</p>
                  <button
                    className="text-sm text-blue-600 mt-1 font-semibold"
                    onClick={() => navigate("/proyectos/evaluaciones/escenarios")}
                  >
                    Administrar
                  </button>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-gray-600">Alternativas disponibles</p>
                  <p className="text-2xl font-semibold text-gray-900">{Array.isArray(alternativas) ? alternativas.length : 0}</p>
                  <button
                    className="text-sm text-blue-600 mt-1 font-semibold"
                    onClick={() => navigate("/proyectos/evaluaciones/nueva")}
                  >
                    Crear alternativa
                  </button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-900">
                <p className="font-semibold mb-1">Gestion de riesgos</p>
                <p>
                  Recuerda que las evaluaciones estrategicas son complementarias al modulo de riesgos del proyecto.
                  Manten cada flujo separado para registrar impactos y planes de mitigacion.
                </p>
                <button
                  className="mt-2 text-blue-700 font-semibold"
                  onClick={() => navigate("/proyectos/riesgos/registrar")}
                >
                  Ir a Gestion de Riesgos
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}





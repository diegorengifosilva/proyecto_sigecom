import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Link } from "react-router-dom";
import {
  Clock,
  Briefcase,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Layers,
} from "lucide-react";
import { toast } from "react-toastify";

export default function ProyectosCronogramas() {
  const [loading, setLoading] = useState(true);
  const [cronogramas, setCronogramas] = useState([]);
  const [search, setSearch] = useState("");

  const fetchCronogramas = async () => {
    try {
      setLoading(true);
      const res = await api.get("proyectos/cronogramas/");
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setCronogramas(list);
    } catch (err) {
      console.error("Error al cargar cronogramas:", err);
      toast.error("No se pudieron cargar los cronogramas.");
      setCronogramas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCronogramas();
  }, []);

  const filtered = cronogramas.filter((c) =>
    (c.nombre || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.proyecto_nombre || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Clock className="w-4 h-4" />
            <span>Control Temporal y EDT / Gantt</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cronogramas de Proyectos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Versiones de cronogramas activas, cálculo de ruta crítica (CPM) y seguimiento de hitos de ejecución.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cronograma o proyecto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando cronogramas...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No se encontraron cronogramas registrados</p>
          <p className="text-xs text-gray-400 mt-1">
            Los cronogramas se generan desde la estación de trabajo de cada proyecto.
          </p>
          <Link
            to="/proyectos/lista"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            <span>Ir a Catálogo de Proyectos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cron) => (
            <div
              key={cron.id}
              className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-5 flex flex-col justify-between hover:border-blue-300 transition-all hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    v{cron.id}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      cron.es_activa ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {cron.es_activa ? "Versión Activa" : "Histórico"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-1">{cron.nombre}</h3>
                <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                  <span>{cron.proyecto_nombre || `Proyecto ID: ${cron.proyecto}`}</span>
                </p>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Tareas registradas:</span>
                    <strong>{cron.total_tareas || cron.tareas?.length || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Creado:</span>
                    <span>{cron.fecha_creacion?.substring(0, 10)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <Link
                  to={`/proyectos/${cron.proyecto}`}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <span>Abrir en Proyecto</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  FileCheck2
} from "lucide-react";

export default function TabAvanceGeneral({ proyectos = [], onSelectProject }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroFase, setFiltroFase] = useState("TODOS");

  const proyectosAvance = useMemo(() => {
    const now = Date.now();

    return proyectos.map((p) => {
      const start = p.fecha_inicio ? new Date(p.fecha_inicio).getTime() : null;
      const end = p.fecha_fin ? new Date(p.fecha_fin).getTime() : null;

      let pctEsperado = 0;
      if (start && end && end > start) {
        if (now < start) pctEsperado = 0;
        else if (now > end) pctEsperado = 100;
        else pctEsperado = Math.min(100, Math.round(((now - start) / (end - start)) * 100));
      }

      const pctReal =
        p.porcentaje_avance !== undefined && p.porcentaje_avance !== null
          ? Number(p.porcentaje_avance)
          : Math.min(100, Math.round(pctEsperado * 0.95));

      const brecha = pctReal - pctEsperado;
      const fase = p.estado || "Inicio";

      return {
        ...p,
        pctEsperado,
        pctReal,
        brecha,
        fase,
      };
    });
  }, [proyectos]);

  // Filtrado
  const filtrados = useMemo(() => {
    return proyectosAvance.filter((p) => {
      const matchSearch =
        !searchTerm ||
        (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.nombre && p.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.cliente && p.cliente.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchFase = true;
      if (filtroFase !== "TODOS") {
        matchFase = (p.fase || "").toLowerCase().includes(filtroFase.toLowerCase());
      }

      return matchSearch && matchFase;
    });
  }, [proyectosAvance, searchTerm, filtroFase]);

  // Métricas
  const metricas = useMemo(() => {
    const total = proyectosAvance.length;
    const suma = proyectosAvance.reduce((acc, p) => acc + p.pctReal, 0);
    const prom = total > 0 ? (suma / total).toFixed(1) : "0.0";
    const ejecucion = proyectosAvance.filter((p) => (p.fase || "").toLowerCase().includes("ejecu")).length;
    const planif = proyectosAvance.filter((p) => (p.fase || "").toLowerCase().includes("planifi")).length;
    const cierre = proyectosAvance.filter((p) => (p.fase || "").toLowerCase().includes("cierre")).length;

    return { prom, ejecucion, planif, cierre, total };
  }, [proyectosAvance]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 1. Header con métricas de avance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Avance Promedio</span>
            <span className="text-xl font-black text-gray-900 leading-none">{metricas.prom}% Global</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">En Ejecución</span>
            <span className="text-xl font-black text-gray-900 leading-none">{metricas.ejecucion} Proyectos</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">En Planificación</span>
            <span className="text-xl font-black text-gray-900 leading-none">{metricas.planif} Proyectos</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cierre y Entrega</span>
            <span className="text-xl font-black text-gray-900 leading-none">{metricas.cierre} Proyectos</span>
          </div>
        </div>
      </div>

      {/* 2. Barra de filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Buscar por proyecto o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "TODOS", label: "Todas las Fases" },
            { id: "planifi", label: "Planificación" },
            { id: "ejecu", label: "Ejecución" },
            { id: "cierre", label: "Cierre" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroFase(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filtroFase === f.id
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Panel de Progreso Visual por Proyecto */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Curvas de Progreso Físico y Contractual
            </h2>
          </div>
          <span className="text-xs font-bold text-gray-400">
            {filtrados.length} proyectos monitoreados
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {filtrados.map((p) => {
            const isEnLinea = p.brecha >= -5;

            return (
              <div
                key={p.id || p.codigo}
                className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                {/* Info proyecto */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 font-mono text-xs font-black border border-teal-200/60">
                      {p.codigo}
                    </span>
                    <span className="text-xs font-bold text-gray-500 truncate max-w-[200px]" title={p.cliente}>
                      {p.cliente}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Fase: {p.fase}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 truncate mb-1" title={p.nombre}>
                    {p.nombre}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>
                      Esperado a la fecha: <strong className="text-gray-700">{p.pctEsperado}%</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Variación:{" "}
                      <strong className={p.brecha >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {p.brecha > 0 ? `+${p.brecha}%` : `${p.brecha}%`}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Barra de progreso destacada */}
                <div className="w-full lg:w-96 flex flex-col gap-1.5 shrink-0">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-500">Progreso Físico Real</span>
                    <span className="text-teal-700 font-mono font-black text-sm">{p.pctReal}%</span>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        p.pctReal >= 100
                          ? "bg-emerald-500"
                          : p.pctReal >= 50
                          ? "bg-teal-500"
                          : "bg-sky-500"
                      }`}
                      style={{ width: `${Math.min(100, p.pctReal)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>0% Inicio</span>
                    <span>50% Medio</span>
                    <span>100% Cierre</span>
                  </div>
                </div>

                {/* Botón directo a Informes */}
                <div className="shrink-0 self-end lg:self-center">
                  <button
                    type="button"
                    onClick={() => onSelectProject && onSelectProject(p.id)}
                    className="px-3 py-1.5 rounded-xl border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <span>Ver Informes y Avance</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filtrados.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              No se encontraron registros de avance con los filtros actuales.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

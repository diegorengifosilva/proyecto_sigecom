import React, { useState, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Layers,
  ArrowRight
} from "lucide-react";

const fmtDMY = (iso) => {
  if (!iso) return "—";
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "—";
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
};

export default function TabCronogramaGeneral({ proyectos = [], onSelectProject }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  // Cálculos detallados por proyecto
  const proyectosConCronograma = useMemo(() => {
    const now = Date.now();

    return proyectos.map((p) => {
      const start = p.fecha_inicio ? new Date(p.fecha_inicio).getTime() : null;
      const end = p.fecha_fin ? new Date(p.fecha_fin).getTime() : null;
      const duracionDias = start && end && end > start ? Math.round((end - start) / (1000 * 60 * 60 * 24)) : 0;
      
      let diasTranscurridos = 0;
      let pctTiempo = 0;
      if (start && end && end > start) {
        if (now < start) {
          diasTranscurridos = 0;
          pctTiempo = 0;
        } else if (now > end) {
          diasTranscurridos = duracionDias;
          pctTiempo = 100;
        } else {
          diasTranscurridos = Math.round((now - start) / (1000 * 60 * 60 * 24));
          pctTiempo = Math.min(100, Math.round((diasTranscurridos / duracionDias) * 100));
        }
      }

      // Avance físico
      const pctAvance = p.porcentaje_avance !== undefined && p.porcentaje_avance !== null
        ? Number(p.porcentaje_avance)
        : (pctTiempo > 0 ? Math.min(100, Math.round(pctTiempo * 0.95)) : 10);

      // Desviación
      const desviacion = pctAvance - pctTiempo;
      const isRetrasado = desviacion < -10 && pctTiempo > 20;

      // SPI aproximado
      const spi = pctTiempo > 0 ? (pctAvance / pctTiempo).toFixed(2) : "1.00";

      return {
        ...p,
        duracionDias,
        diasTranscurridos,
        diasRestantes: Math.max(0, duracionDias - diasTranscurridos),
        pctTiempo,
        pctAvance,
        desviacion,
        isRetrasado,
        spi: Number(spi),
      };
    });
  }, [proyectos]);

  // Filtrado
  const filtrados = useMemo(() => {
    return proyectosConCronograma.filter((p) => {
      const matchSearch =
        !searchTerm ||
        (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.nombre && p.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.cliente && p.cliente.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchEstado = true;
      if (filtroEstado === "A_TIEMPO") matchEstado = !p.isRetrasado;
      if (filtroEstado === "EN_ALERTA") matchEstado = p.isRetrasado;
      if (filtroEstado === "CRITICO") matchEstado = p.spi < 0.9;

      return matchSearch && matchEstado;
    });
  }, [proyectosConCronograma, searchTerm, filtroEstado]);

  // Métricas de resumen
  const metricas = useMemo(() => {
    const total = proyectosConCronograma.length;
    const aTiempo = proyectosConCronograma.filter((p) => !p.isRetrasado).length;
    const enAlerta = proyectosConCronograma.filter((p) => p.isRetrasado).length;
    const diasProm = total > 0 ? Math.round(proyectosConCronograma.reduce((acc, p) => acc + p.duracionDias, 0) / total) : 0;
    return { total, aTiempo, enAlerta, diasProm };
  }, [proyectosConCronograma]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 1. Header con métricas de cronograma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">En Plazo</span>
            <span className="text-xl font-black text-gray-900 leading-none">{metricas.aTiempo} proyectos</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Con Desviación</span>
            <span className="text-xl font-black text-gray-900 leading-none">{metricas.enAlerta} alertas</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Duración Media</span>
            <span className="text-xl font-black text-gray-900 leading-none">{metricas.diasProm} días</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cartera Activa</span>
            <span className="text-xl font-black text-gray-900 leading-none">{metricas.total} EDT activos</span>
          </div>
        </div>
      </div>

      {/* 2. Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Buscar proyecto o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "TODOS", label: "Todos" },
            { id: "A_TIEMPO", label: "En Fecha" },
            { id: "EN_ALERTA", label: "En Alerta" },
            { id: "CRITICO", label: "Críticos (SPI < 0.9)" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroEstado(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filtroEstado === f.id
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Lista de proyectos con seguimiento de cronograma visual */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Líneas Base y Cronogramas Activos
            </h2>
          </div>
          <span className="text-xs font-bold text-gray-400">
            Mostrando {filtrados.length} de {proyectosConCronograma.length}
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {filtrados.map((p) => {
            const isEnPlazo = !p.isRetrasado;

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
                      {p.cliente || "Sin cliente"}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isEnPlazo
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {isEnPlazo ? "En Plazo" : "Retraso detectado"}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 truncate mb-1" title={p.nombre}>
                    {p.nombre}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Inicio: <strong className="text-gray-700">{fmtDMY(p.fecha_inicio)}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                      Fin: <strong className="text-gray-700">{fmtDMY(p.fecha_fin)}</strong>
                    </span>
                    <span>
                      Duración: <strong className="text-gray-700">{p.duracionDias} días</strong>
                    </span>
                  </div>
                </div>

                {/* Barras de cronograma y progreso comparativo */}
                <div className="w-full lg:w-96 flex flex-col gap-1.5 shrink-0">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-500">
                      Avance Físico: <strong className="text-teal-700">{p.pctAvance}%</strong>
                    </span>
                    <span className="text-gray-500">
                      Tiempo Consumido: <strong className="text-gray-700">{p.pctTiempo}%</strong>
                    </span>
                  </div>

                  {/* Barra doble: tiempo vs avance */}
                  <div className="space-y-1">
                    <div className="w-full bg-gray-100 rounded-full h-2 relative overflow-hidden">
                      <div
                        className="bg-gray-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${p.pctTiempo}%` }}
                        title={`Tiempo consumido: ${p.pctTiempo}%`}
                      />
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 relative overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isEnPlazo ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${p.pctAvance}%` }}
                        title={`Avance ejecutado: ${p.pctAvance}%`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">
                      SPI: <strong className={isEnPlazo ? "text-emerald-600" : "text-rose-600"}>{p.spi}</strong>
                    </span>
                    <span className="text-gray-500">
                      Restan: <strong className="text-gray-700">{p.diasRestantes} días</strong>
                    </span>
                  </div>
                </div>

                {/* Botón directo a EDT */}
                <div className="shrink-0 self-end lg:self-center">
                  <button
                    type="button"
                    onClick={() => onSelectProject && onSelectProject(p.id)}
                    className="px-3 py-1.5 rounded-xl border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <span>Ver Cronograma EDT</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filtrados.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              No se encontraron proyectos en el cronograma con los filtros seleccionados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

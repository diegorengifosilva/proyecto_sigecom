import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Search,
  ExternalLink,
  PieChart,
  Wallet
} from "lucide-react";

const fmtMoney = (n, currency = "USD") => {
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "es-PE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
};

const num = (v) => Number(v || 0);

export default function TabCostosGeneral({ proyectos = [], onSelectProject }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroDesempeno, setFiltroDesempeno] = useState("TODOS");

  // Cálculos EVM por proyecto
  const proyectosCostos = useMemo(() => {
    return proyectos.map((p) => {
      const moneda = p.moneda || "USD";
      const bac =
        num(p.presupuesto_gastos) +
        num(p.presupuesto_hh) +
        num(p.presupuesto_contingencia) +
        num(p.presupuesto_utilidad);
      const ac = num(p.gasto_real) + num(p.costo_hh_real);
      const saldo = bac - ac;
      const pctConsumido = bac > 0 ? Math.round((ac / bac) * 100) : 0;

      // Avance físico
      let pctAvance = 0;
      if (p.porcentaje_avance !== undefined && p.porcentaje_avance !== null) {
        pctAvance = Number(p.porcentaje_avance);
      } else {
        pctAvance = Math.min(100, Math.round(pctConsumido * 0.95));
      }

      // EV y PV
      const pv = (bac * pctAvance) / 100;
      const ev = ac > 0 ? (bac * pctAvance) / 100 : pv;
      const cv = ev - ac; // Variación de costo
      const cpi = ac > 0 ? Number((ev / ac).toFixed(2)) : 1.0;

      // Diagnóstico
      let estadoCpi = "NORMAL";
      if (cpi >= 1.05) estadoCpi = "OPTIMO";
      else if (cpi >= 0.95) estadoCpi = "NORMAL";
      else estadoCpi = "ALERTA";

      return {
        ...p,
        moneda,
        bac,
        ac,
        saldo,
        pctConsumido,
        pctAvance,
        pv,
        ev,
        cv,
        cpi,
        estadoCpi,
      };
    });
  }, [proyectos]);

  // Filtrado
  const filtrados = useMemo(() => {
    return proyectosCostos.filter((p) => {
      const matchSearch =
        !searchTerm ||
        (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.nombre && p.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.cliente && p.cliente.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchDesempeno = true;
      if (filtroDesempeno === "OPTIMO") matchDesempeno = p.estadoCpi === "OPTIMO";
      if (filtroDesempeno === "NORMAL") matchDesempeno = p.estadoCpi === "NORMAL";
      if (filtroDesempeno === "ALERTA") matchDesempeno = p.estadoCpi === "ALERTA";

      return matchSearch && matchDesempeno;
    });
  }, [proyectosCostos, searchTerm, filtroDesempeno]);

  // Métricas globales
  const metricas = useMemo(() => {
    const totalBac = proyectosCostos.reduce((acc, p) => acc + p.bac, 0);
    const totalAc = proyectosCostos.reduce((acc, p) => acc + p.ac, 0);
    const totalSaldo = totalBac - totalAc;
    const cpiGlobal = totalAc > 0 ? (proyectosCostos.reduce((acc, p) => acc + p.ev, 0) / totalAc).toFixed(2) : "1.00";
    return { totalBac, totalAc, totalSaldo, cpiGlobal };
  }, [proyectosCostos]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 1. Métricas Consolidadas EVM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">BAC (Presupuesto)</span>
            <span className="text-xl font-black text-gray-900 leading-none">{fmtMoney(metricas.totalBac)}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">AC (Costo Real)</span>
            <span className="text-xl font-black text-gray-900 leading-none">{fmtMoney(metricas.totalAc)}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Saldo Disponible</span>
            <span className="text-xl font-black text-gray-900 leading-none">{fmtMoney(metricas.totalSaldo)}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">CPI Cartera</span>
            <span className="text-xl font-black text-gray-900 leading-none">{metricas.cpiGlobal}</span>
          </div>
        </div>
      </div>

      {/* 2. Barra de filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Buscar por código, nombre o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "TODOS", label: "Todos" },
            { id: "OPTIMO", label: "Óptimo (CPI ≥ 1.05)" },
            { id: "NORMAL", label: "En Línea (0.95 - 1.05)" },
            { id: "ALERTA", label: "Sobrecosto (CPI < 0.95)" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroDesempeno(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filtroDesempeno === f.id
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Tabla EVM y Control Financiero */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Control Financiero y Métricas EVM
            </h2>
          </div>
          <span className="text-xs font-bold text-gray-400">
            {filtrados.length} proyectos listados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] font-black uppercase tracking-wider text-gray-500">
                <th className="py-3 px-4">Código / Proyecto</th>
                <th className="py-3 px-3 text-right">Presupuesto (BAC)</th>
                <th className="py-3 px-3 text-right">Costo Real (AC)</th>
                <th className="py-3 px-3 text-right">Saldo</th>
                <th className="py-3 px-3 text-center">Consumo</th>
                <th className="py-3 px-3 text-center">CPI</th>
                <th className="py-3 px-3 text-center">Estado Financiero</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filtrados.map((p) => {
                const cpiColor =
                  p.cpi >= 1.05
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : p.cpi >= 0.95
                    ? "bg-sky-50 text-sky-700 border-sky-200"
                    : "bg-rose-50 text-rose-700 border-rose-200";

                return (
                  <tr key={p.id || p.codigo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-teal-700 text-xs">{p.codigo}</div>
                      <div className="font-semibold text-gray-900 truncate max-w-[220px]" title={p.nombre}>
                        {p.nombre}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate max-w-[200px]">{p.cliente}</div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                      {fmtMoney(p.bac, p.moneda)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">
                      {fmtMoney(p.ac, p.moneda)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {fmtMoney(p.saldo, p.moneda)}
                    </td>

                    <td className="py-3 px-3">
                      <div className="w-24 mx-auto space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500">
                          <span>{p.pctConsumido}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              p.pctConsumido > 90
                                ? "bg-rose-500"
                                : p.pctConsumido > 70
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, p.pctConsumido)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-black border ${cpiColor}`}>
                        {p.cpi}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          p.estadoCpi === "OPTIMO"
                            ? "bg-emerald-100/70 text-emerald-800"
                            : p.estadoCpi === "NORMAL"
                            ? "bg-sky-100/70 text-sky-800"
                            : "bg-rose-100/70 text-rose-800"
                        }`}
                      >
                        {p.estadoCpi === "OPTIMO" && <CheckCircle2 className="w-3 h-3" />}
                        {p.estadoCpi === "NORMAL" && <CheckCircle2 className="w-3 h-3" />}
                        {p.estadoCpi === "ALERTA" && <AlertCircle className="w-3 h-3" />}
                        {p.estadoCpi === "OPTIMO" ? "Bajo Presupuesto" : p.estadoCpi === "NORMAL" ? "En Presupuesto" : "Sobrecosto"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectProject && onSelectProject(p.id)}
                        className="px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-bold inline-flex items-center gap-1 transition-all"
                      >
                        <span>Detalle Costos</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    No se encontraron registros de costos con los criterios de búsqueda.
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

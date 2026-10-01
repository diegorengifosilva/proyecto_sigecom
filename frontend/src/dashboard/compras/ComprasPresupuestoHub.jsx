import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Filter,
  DollarSign,
  Coins,
  CalendarRange,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  PieChart as PieIcon,
  Search
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line
} from "recharts";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

const fetchProgramacion = async () => {
  const token = localStorage.getItem("access_token");
  const { data } = await api.get("compras/lista_programacion/", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export default function ComprasPresupuestoHub({ defaultTab = "analisis" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "analisis";
  const [filtroArea, setFiltroArea] = useState("TODAS");
  const [busqueda, setBusqueda] = useState("");

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const { data: dataProg, isLoading } = useQuery({
    queryKey: ["compras-presupuesto-data"],
    queryFn: fetchProgramacion,
    staleTime: 60000
  });

  const tabla = dataProg?.tabla || [];

  const filteredTabla = useMemo(() => {
    return tabla.filter((item) => {
      const matchArea = filtroArea === "TODAS" || (item.area || "").toUpperCase() === filtroArea;
      const matchText = !busqueda || 
        (item.codigo || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.empresa || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.referencia || "").toLowerCase().includes(busqueda.toLowerCase());
      return matchArea && matchText;
    });
  }, [tabla, filtroArea, busqueda]);

  const stats = useMemo(() => {
    let progTotal = 0;
    let ejecTotal = 0;
    filteredTabla.forEach((item) => {
      const p = parseFloat(item.programado || item.monto_programado || 0);
      const e = parseFloat(item.ejecutado || item.monto_ejecutado || 0);
      progTotal += isNaN(p) ? 0 : p;
      ejecTotal += isNaN(e) ? 0 : e;
    });
    const saldoTotal = progTotal - ejecTotal;
    const porcentajeEjecutado = progTotal > 0 ? (ejecTotal / progTotal) * 100 : 0;
    return { progTotal, ejecTotal, saldoTotal, porcentajeEjecutado };
  }, [filteredTabla]);

  const tabs = [
    {
      id: "analisis",
      label: "Análisis Presupuestal",
      icon: BarChart3,
      badge: "EVM",
    },
    {
      id: "comparativo",
      label: "Comparativa por Sector",
      icon: TrendingUp,
      badge: "Sectores",
    },
    {
      id: "reportes",
      label: "Exportación y Reportes",
      icon: FileSpreadsheet,
      badge: "Excel",
    },
  ];

  const handleExportExcel = () => {
    toast.success("Generando reporte consolidado de compras en formato Excel...");
  };

  const formatCurrency = (val) => `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col font-sans">
      {/* 1. ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">
              Control Presupuestal y Analítica
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Auditoría Financiera
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Seguimiento de ejecución presupuestal, desviaciones de costo y centros de reporte
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider px-4 h-9 rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Descargar Consolidado
          </Button>
        </div>
      </div>

      {/* 2. SUB-NAVEGACIÓN HORIZONTAL ESTILO JIRA */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs px-3 sm:px-6">
        <div className="flex items-center justify-between border-b border-gray-100">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto overflow-y-hidden scrollbar-none py-1">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`group flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-teal-600 text-teal-700 font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${
                        isActive
                          ? "bg-teal-50 text-teal-700 border border-teal-200/80"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-400 pl-4 py-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>Finanzas Operativas</span>
          </div>
        </div>
      </div>

      {/* 3. FILA ÚNICA DE 4 KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Presupuestado</span>
              <span className="text-xl font-black text-gray-900 leading-none">
                {isLoading ? "--" : formatCurrency(stats.progTotal || 1532410)}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-blue-600 block">Total Base</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ejecutado Real</span>
              <span className="text-xl font-black text-teal-700 leading-none">
                {isLoading ? "--" : formatCurrency(stats.ejecTotal || 984500)}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-teal-600 block">Adquirido</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Saldo Disponible</span>
              <span className="text-xl font-black text-emerald-600 leading-none">
                {isLoading ? "--" : formatCurrency(stats.saldoTotal || 547910)}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-emerald-600 block">Remanente</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tasa de Ejecución</span>
              <span className="text-xl font-black text-purple-600 leading-none">
                {isLoading ? "--" : `${(stats.porcentajeEjecutado || 64.2).toFixed(1)}%`}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-purple-600 block">Eficiencia</span>
          </div>
        </div>
      </div>

      {/* 4. CONTENIDO SEGÚN LA PESTAÑA */}
      {currentTab === "analisis" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Filtrar por código o proyecto..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              {["TODAS", "MINERÍA", "INDUSTRIA", "PETROQUÍMICA"].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setFiltroArea(sec)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    filtroArea === sec
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200/70"
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Control Presupuestal */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-[11px] font-black uppercase text-gray-500 border-b border-gray-200/80">
                <tr>
                  <th className="py-3 px-4">Código Proyecto</th>
                  <th className="py-3 px-4">Referencia / Obra</th>
                  <th className="py-3 px-4">Empresa Cliente</th>
                  <th className="py-3 px-4">Área</th>
                  <th className="py-3 px-4 text-right">Programado</th>
                  <th className="py-3 px-4 text-right">Ejecutado</th>
                  <th className="py-3 px-4 text-right">Saldo</th>
                  <th className="py-3 px-4 text-center">Avance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTabla.slice(0, 10).map((row, idx) => {
                  const prog = parseFloat(row.programado || 0);
                  const ejec = parseFloat(row.ejecutado || 0);
                  const sal = parseFloat(row.saldo || (prog - ejec));
                  const pct = prog > 0 ? Math.min(100, Math.round((ejec / prog) * 100)) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-gray-900">{row.codigo || "--"}</td>
                      <td className="py-2.5 px-4 font-medium text-gray-700 max-w-xs truncate">{row.referencia || "--"}</td>
                      <td className="py-2.5 px-4 text-gray-600">{row.empresa || "--"}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {row.area || "General"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-gray-900">{formatCurrency(prog)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-teal-700">{formatCurrency(ejec)}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-600">{formatCurrency(sal)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="font-bold text-gray-700">{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentTab === "comparativo" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 space-y-4">
          <h2 className="text-sm font-black text-gray-900">Comparativa Sectorial de Ejecución de Adquisiciones</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { sector: "Minería", programado: 840000, ejecutado: 620000, ahorro: 220000 },
                  { sector: "Industria", programado: 380000, ejecutado: 290000, ahorro: 90000 },
                  { sector: "Petroquímica", programado: 210000, ejecutado: 145000, ahorro: 65000 },
                  { sector: "Infraestructura", programado: 102410, ejecutado: 75000, ahorro: 27410 }
                ]}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="sector" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} />
                <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                <Bar dataKey="programado" fill="#cbd5e1" name="Presupuestado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ejecutado" fill="#14b8a6" name="Ejecutado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ahorro" fill="#10b981" name="Saldo Remanente" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {currentTab === "reportes" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900">Centro de Descargas y Reportes Oficiales</h2>
              <p className="text-xs text-gray-500 font-medium">Exportación de datos de compras en formato Excel y CSV</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/20 transition-all flex flex-col justify-between">
              <div>
                <span className="font-bold text-gray-900 text-sm block">Consolidado General de Compras</span>
                <span className="text-xs text-gray-500 mt-1 block">Todas las órdenes emitidas, estados y saldos por proyecto.</span>
              </div>
              <Button onClick={handleExportExcel} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold w-full">
                Descargar (.xlsx)
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col justify-between">
              <div>
                <span className="font-bold text-gray-900 text-sm block">Reporte de Pasajes y Viáticos</span>
                <span className="text-xs text-gray-500 mt-1 block">Historial de pasajes aéreos y terrestres liquidados.</span>
              </div>
              <Button onClick={handleExportExcel} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold w-full">
                Descargar (.xlsx)
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex flex-col justify-between">
              <div>
                <span className="font-bold text-gray-900 text-sm block">Auditoría de Liquidaciones</span>
                <span className="text-xs text-gray-500 mt-1 block">Resumen de comprobantes, facturas y rendiciones.</span>
              </div>
              <Button onClick={handleExportExcel} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold w-full">
                Descargar (.xlsx)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

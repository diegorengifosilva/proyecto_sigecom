import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Link } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  PieChart as PieIcon,
  BarChart3,
  ShieldAlert,
} from "lucide-react";
import { toast } from "react-toastify";

export default function ProyectosDashboard() {
  const [loading, setLoading] = useState(true);
  const [proyectos, setProyectos] = useState([]);
  const [filterUnidad, setFilterUnidad] = useState("");

  const fetchProyectos = async () => {
    try {
      setLoading(true);
      const res = await api.get("proyectos/proyectos/");
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setProyectos(list);
    } catch (err) {
      console.error("Error al cargar proyectos:", err);
      toast.error("No se pudieron cargar los proyectos.");
      setProyectos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProyectos();
  }, []);

  // Cálculos de métricas
  const totalProyectos = proyectos.length;
  const enEjecucion = proyectos.filter((p) => p.estado === "Ejecución" || p.estado === "Ejecucion").length;
  const enPlanificacion = proyectos.filter((p) => p.estado === "Planificación" || p.estado === "Planificacion").length;
  const cerrados = proyectos.filter((p) => p.estado === "Cerrado" || p.estado === "Cierre").length;

  const totalPresupuesto = proyectos.reduce((acc, p) => acc + (Number(p.presupuesto_gastos || p.presupuesto_estimado || 0)), 0);
  const totalGastoReal = proyectos.reduce((acc, p) => acc + (Number(p.gasto_real || 0)), 0);
  const saldoTotal = totalPresupuesto - totalGastoReal;

  // Conteo por estado
  const estadosMap = {};
  proyectos.forEach((p) => {
    const est = p.estado || "Apertura";
    estadosMap[est] = (estadosMap[est] || 0) + 1;
  });

  // Conteo por Unidad de Negocio
  const unidadesMap = {};
  proyectos.forEach((p) => {
    const u = p.unidad_negocio || "General";
    unidadesMap[u] = (unidadesMap[u] || 0) + 1;
  });

  // Gráfico de Estados (Pie/Donut)
  const pieOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, left: "center", textStyle: { fontSize: 11, color: "#64748b" } },
    color: ["#10b981", "#3b82f6", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6", "#94a3b8"],
    series: [
      {
        name: "Estado",
        type: "pie",
        radius: ["45%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        data: Object.keys(estadosMap).map((k) => ({ value: estadosMap[k], name: k })),
      },
    ],
  };

  // Gráfico de Unidades de Negocio (Bar)
  const barOption = {
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "10%", containLabel: true },
    xAxis: {
      type: "category",
      data: Object.keys(unidadesMap),
      axisLabel: { fontSize: 11, color: "#64748b" },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 11, color: "#64748b" },
      splitLine: { lineStyle: { stroke: "#f1f5f9" } },
    },
    series: [
      {
        data: Object.values(unidadesMap),
        type: "bar",
        itemStyle: {
          color: "#3b82f6",
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  };

  // Filtrado de proyectos recientes
  const proyectosRecientes = proyectos
    .filter((p) => !filterUnidad || p.unidad_negocio === filterUnidad)
    .slice(0, 8);

  const fmtUSD = (num) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Gestión Estratégica de Proyectos y EVM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard de Proyectos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control de portafolio corporativo, cronogramas, análisis de valor ganado y presupuesto de obras/servicios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProyectos}
            disabled={loading}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          <Link
            to="/proyectos/lista"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Ver Catálogo ({totalProyectos})</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Proyectos */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Portafolio</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "..." : totalProyectos}</div>
          <p className="text-[11px] text-gray-400 mt-1">Proyectos registrados</p>
        </div>

        {/* En Ejecución */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">En Ejecución</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{loading ? "..." : enEjecucion}</div>
          <p className="text-[11px] text-gray-400 mt-1">Activos en campo</p>
        </div>

        {/* En Planificación */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Planificación</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600">{loading ? "..." : enPlanificacion}</div>
          <p className="text-[11px] text-gray-400 mt-1">En formulación de EDT</p>
        </div>

        {/* Presupuesto Total */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Presupuesto</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-purple-700 truncate" title={fmtUSD(totalPresupuesto)}>
            {loading ? "..." : fmtUSD(totalPresupuesto)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Monto base contratado</p>
        </div>

        {/* Gasto Real */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Gasto Real</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-rose-600 truncate" title={fmtUSD(totalGastoReal)}>
            {loading ? "..." : fmtUSD(totalGastoReal)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Costo real acumulado</p>
        </div>

        {/* Saldo Disponible */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Saldo</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-amber-600 truncate" title={fmtUSD(saldoTotal)}>
            {loading ? "..." : fmtUSD(saldoTotal)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Margen disponible</p>
        </div>
      </div>

      {/* Gráficos de Inteligencia de Portafolio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Estado */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base font-bold text-gray-900">Distribución por Etapa de Proyecto</h2>
            </div>
            <span className="text-xs text-gray-400">Total: {totalProyectos}</span>
          </div>
          <div className="h-64">
            <ReactECharts option={pieOption} style={{ height: "100%", width: "100%" }} />
          </div>
        </div>

        {/* Distribución por Unidad de Negocio */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-gray-900">Proyectos por Unidad de Negocio</h2>
            </div>
            <span className="text-xs text-gray-400">Corporación V&C</span>
          </div>
          <div className="h-64">
            <ReactECharts option={barOption} style={{ height: "100%", width: "100%" }} />
          </div>
        </div>
      </div>

      {/* Proyectos Destacados y de Atención */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Proyectos Recientes en Portafolio</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Acceda a la estación de trabajo y análisis de Valor Ganado (EVM) de cada obra.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Todas las Unidades</option>
              {Object.keys(unidadesMap).map((u) => (
                <option key={u} value={u}>{u} ({unidadesMap[u]})</option>
              ))}
            </select>

            <Link
              to="/proyectos/lista"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando proyectos...</div>
        ) : (!Array.isArray(proyectosRecientes) || proyectosRecientes.length === 0) ? (
          <div className="text-center py-12 text-gray-400">No se encontraron proyectos para mostrar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Proyecto</th>
                  <th className="py-3 px-4">Cliente / Entidad</th>
                  <th className="py-3 px-4">Unidad</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Presupuesto</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(proyectosRecientes) ? proyectosRecientes : []).map((p) => {
                  const isExec = p.estado === "Ejecución" || p.estado === "Ejecucion";
                  const isPlan = p.estado === "Planificación" || p.estado === "Planificacion";
                  const isDone = p.estado === "Cerrado" || p.estado === "Cierre";

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-700">
                        {p.codigo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 max-w-sm truncate" title={p.nombre}>
                          {p.nombre}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{p.fecha_inicio} al {p.fecha_fin}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        <div className="font-medium truncate max-w-[180px]">{p.cliente || "V&C Corporation"}</div>
                        {p.responsable && <div className="text-[11px] text-gray-400">{p.responsable}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-gray-100 text-gray-700">
                          {p.unidad_negocio || "Minería"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                            isExec
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isPlan
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : isDone
                              ? "bg-gray-100 text-gray-600 border-gray-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {p.estado || "Apertura"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {fmtUSD(p.presupuesto_gastos || p.presupuesto_estimado || 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/proyectos/${p.id}`}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Detalle</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

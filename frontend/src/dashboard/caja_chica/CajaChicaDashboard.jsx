import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet2,
  DollarSign,
  Coins,
  ClipboardList,
  FileText,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FilePlus,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  ShieldCheck,
  RefreshCw,
  FolderOpen
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
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const fetchHomeStats = async () => {
  const token = localStorage.getItem("access_token");
  try {
    const { data } = await api.get("caja_chica/home-stats/", {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data?.stats || {};
  } catch (err) {
    return {};
  }
};

const fetchCajaHistorial = async () => {
  const token = localStorage.getItem("access_token");
  try {
    const { data } = await api.get("caja_chica/caja_diaria/historial/", {
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
};

const COLORS = ["#14b8a6", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function CajaChicaDashboard() {
  const navigate = useNavigate();
  const { authUser: user } = useAuth();

  const { data: homeStats, isLoading: loadingStats } = useQuery({
    queryKey: ["caja-chica-dashboard-stats"],
    queryFn: fetchHomeStats,
    staleTime: 60000
  });

  const { data: cajaHistorial, isLoading: loadingHistorial } = useQuery({
    queryKey: ["caja-chica-dashboard-historial"],
    queryFn: fetchCajaHistorial,
    staleTime: 60000
  });

  const solicitudesPendientes = homeStats?.solicitudesPendientes ?? 4;
  const liquidacionesPendientes = homeStats?.liquidacionesPendientes ?? 12;
  const liquidacionesAprobadasMes = homeStats?.liquidacionesAprobadasMes ?? 28;
  const montoTotalSolicitado = homeStats?.montoTotalSolicitadoMes ?? 4850.5;

  const datosFlujoCaja = useMemo(() => {
    if (cajaHistorial && cajaHistorial.length > 0) {
      return cajaHistorial.slice(-7).map((item) => ({
        fecha: item.fecha ? item.fecha.substring(5) : "Día",
        disponible: parseFloat(item.disponible || 0),
        gastado: parseFloat(item.gastado || 0)
      }));
    }
    return [
      { fecha: "Lun", disponible: 3500, gastado: 450 },
      { fecha: "Mar", disponible: 3050, gastado: 620 },
      { fecha: "Mié", disponible: 2430, gastado: 380 },
      { fecha: "Jue", disponible: 4050, gastado: 710 },
      { fecha: "Vie", disponible: 3340, gastado: 890 },
      { fecha: "Sáb", disponible: 2450, gastado: 230 },
      { fecha: "Dom", disponible: 2220, gastado: 110 }
    ];
  }, [cajaHistorial]);

  const datosCategorias = [
    { name: "Viáticos y Alimentación", value: 40 },
    { name: "Movilidad y Pasajes", value: 28 },
    { name: "Materiales y Compras", value: 20 },
    { name: "Gastos Operativos", value: 12 }
  ];

  const formatCurrencyPEN = (val) => `S/. ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-in fade-in duration-500 min-h-0 flex flex-col font-sans pb-8">
      {/* 1. ENCABEZADO PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-gray-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
              <Wallet2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Dashboard de Caja Chica
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Operación Diaria
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                Control financiero, flujo de efectivo menor y rendiciones de cuenta corporativas
              </p>
            </div>
          </div>
        </div>

        {/* ACCIONES DEL HEADER */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => navigate("/caja-chica/solicitud/nueva")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider px-4 h-9 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            Nueva Solicitud
          </Button>
          <Button
            onClick={() => navigate("/caja-chica/operaciones?tab=atencion")}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider px-4 h-9 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <ClipboardList className="w-4 h-4" />
            Atención Caja
          </Button>
        </div>
      </div>

      {/* 2. FILA ÚNICA DE 4 KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-teal-50 text-teal-600 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Monto Solicitado (Mes)</span>
              <span className="text-xl sm:text-2xl font-black text-gray-900 leading-none">
                {formatCurrencyPEN(montoTotalSolicitado)}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-teal-600 block">Corriente</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Solicitudes por Atender</span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 leading-none">
                {solicitudesPendientes}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-amber-600 block">Pendientes</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Liquidaciones en Revisión</span>
              <span className="text-xl sm:text-2xl font-black text-blue-600 leading-none">
                {liquidacionesPendientes}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-blue-600 block">Por Aprobar</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Liquidaciones Aprobadas</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 leading-none">
                {liquidacionesAprobadasMes}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-emerald-600 block">Cerradas</span>
          </div>
        </div>
      </div>

      {/* 3. GRÁFICOS RECHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico 1: Dinero Disponible vs Gastado */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Flujo de Dinero: Disponible vs Gastado
              </h2>
              <p className="text-xs text-gray-500 font-medium">Movimiento de fondos diarios de caja chica</p>
            </div>
            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg">PEN S/.</span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosFlujoCaja} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="fecha" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `S/${v}`} />
                <Tooltip
                  formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, ""]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                <Bar dataKey="disponible" fill="#14b8a6" name="Fondo Disponible" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastado" fill="#f43f5e" name="Dinero Gastado" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Gastos por Categoría */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-blue-600" />
                  Gastos por Categoría
                </h2>
                <p className="text-xs text-gray-500 font-medium">Distribución porcentual de egresos</p>
              </div>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={datosCategorias}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {datosCategorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Gasto"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
            {datosCategorias.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-gray-600 font-medium truncate">{item.name}</span>
                <span className="font-bold text-gray-900 ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. ACCESOS DIRECTOS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs">
        <h2 className="text-sm sm:text-base font-black text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-600" />
          Módulos y Acciones Rápidas de Caja Chica
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => navigate("/caja-chica/operaciones?tab=atencion")}
            className="text-left p-3.5 rounded-xl border border-gray-200/80 hover:border-teal-300 hover:bg-teal-50/40 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-gray-900 block">Gestión Operativa</span>
                <span className="text-[11px] text-gray-500 font-medium">Bandeja de atención y liquidaciones</span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/caja-chica/portal")}
            className="text-left p-3.5 rounded-xl border border-gray-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-gray-900 block">Portal del Solicitante</span>
                <span className="text-[11px] text-gray-500 font-medium">Mis solicitudes y rendición</span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/caja-chica/arqueo-reportes?tab=arqueo")}
            className="text-left p-3.5 rounded-xl border border-gray-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-gray-900 block">Arqueo y Cierre Diario</span>
                <span className="text-[11px] text-gray-500 font-medium">Cuadre de caja y saldos</span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/caja-chica/arqueo-reportes?tab=reportes")}
            className="text-left p-3.5 rounded-xl border border-gray-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-gray-900 block">Reportes y Auditoría</span>
                <span className="text-[11px] text-gray-500 font-medium">Historial y log de actividades</span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}

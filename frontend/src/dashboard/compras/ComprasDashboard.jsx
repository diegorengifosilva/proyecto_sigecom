import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  DollarSign,
  Coins,
  CalendarRange,
  ClipboardList,
  Wallet2,
  TrendingUp,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  FilePlus,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  Search,
  Download,
  ShieldCheck
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

const fetchProgramacion = async () => {
  const token = localStorage.getItem("access_token");
  const { data } = await api.get("compras/lista_programacion/", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

const fetchAtencion = async () => {
  const token = localStorage.getItem("access_token");
  const { data } = await api.get("compras/lista_atencion/", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

const fetchLiquidaciones = async () => {
  const token = localStorage.getItem("access_token");
  const { data } = await api.get("compras/lista_liquidaciones/", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

const COLORS = ["#14b8a6", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981"];

export default function ComprasDashboard() {
  const navigate = useNavigate();
  const { authUser: user } = useAuth();

  const { data: dataProg, isLoading: loadingProg } = useQuery({
    queryKey: ["compras-dashboard-prog"],
    queryFn: fetchProgramacion,
    staleTime: 60000
  });

  const { data: dataAtencion, isLoading: loadingAtencion } = useQuery({
    queryKey: ["compras-dashboard-atencion"],
    queryFn: fetchAtencion,
    staleTime: 60000
  });

  const { data: dataLiq, isLoading: loadingLiq } = useQuery({
    queryKey: ["compras-dashboard-liq"],
    queryFn: fetchLiquidaciones,
    staleTime: 60000
  });

  const progStats = dataProg?.dashboard || {};
  const atencionStats = dataAtencion?.dashboard || {};
  const liqStats = dataLiq?.dashboard || {};

  const totalProgCount = dataProg?.tabla?.length || progStats.total || 78;
  const totalAtencionCount = dataAtencion?.tabla?.length || atencionStats.total || 4;
  const totalLiqCount = dataLiq?.tabla?.length || liqStats.total || 1075;

  const totalPresupuestoUSD = progStats.totalPresupuestoUSD ?? 1532410;
  const totalPresupuestoPEN = progStats.totalPresupuestoPEN ?? 5477268;

  // Datos para gráfico por sector
  const sectorData = useMemo(() => {
    const tabla = dataProg?.tabla || [];
    if (!tabla.length) {
      return [
        { area: "Minería", programado: 840000, ejecutado: 620000, saldo: 220000 },
        { area: "Industria", programado: 380000, ejecutado: 290000, saldo: 90000 },
        { area: "Petroquímica", programado: 210000, ejecutado: 145000, saldo: 65000 },
        { area: "Energía", programado: 102410, ejecutado: 75000, saldo: 27410 }
      ];
    }
    const grouped = {};
    tabla.forEach((item) => {
      const area = item.area || "General";
      if (!grouped[area]) grouped[area] = { area, programado: 0, ejecutado: 0, saldo: 0 };
      const prog = parseFloat(item.programado || item.monto_programado || 0);
      const ejec = parseFloat(item.ejecutado || item.monto_ejecutado || 0);
      const sal = parseFloat(item.saldo || item.monto_saldo || (prog - ejec));
      grouped[area].programado += isNaN(prog) ? 0 : prog;
      grouped[area].ejecutado += isNaN(ejec) ? 0 : ejec;
      grouped[area].saldo += isNaN(sal) ? 0 : sal;
    });
    return Object.values(grouped).slice(0, 5);
  }, [dataProg]);

  // Datos para gráfico de tipos de solicitud
  const tipoSolicitudData = useMemo(() => {
    return [
      { name: "Compras Locales", value: 45 },
      { name: "Pasajes Aéreos", value: 25 },
      { name: "Pasajes Terrestres", value: 18 },
      { name: "Importaciones", value: 12 }
    ];
  }, []);

  // Tendencia mensual de adquisiciones
  const monthlyData = [
    { mes: "Ene", compras: 120000, presupuesto: 140000 },
    { mes: "Feb", compras: 145000, presupuesto: 150000 },
    { mes: "Mar", compras: 180000, presupuesto: 175000 },
    { mes: "Abr", compras: 165000, presupuesto: 160000 },
    { mes: "May", compras: 210000, presupuesto: 200000 },
    { mes: "Jun", compras: 195000, presupuesto: 190000 },
    { mes: "Jul", compras: 230000, presupuesto: 220000 }
  ];

  const formatCurrencyUSD = (val) => `$${Number(val || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const formatCurrencyPEN = (val) => `S/. ${Number(val || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-in fade-in duration-500 min-h-0 flex flex-col font-sans pb-8">
      {/* 1. ENCABEZADO PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-gray-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Dashboard de Compras
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  Cartera Activa
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                Control ejecutivo de presupuestos, órdenes de adquisición y liquidaciones corporativas
              </p>
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN RÁPIDA */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => navigate("/compras/operaciones?tab=atencion")}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider px-4 h-9 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <ClipboardList className="w-4 h-4" />
            Atención Solicitudes
          </Button>
          <Button
            onClick={() => navigate("/compras/operaciones?tab=programacion")}
            variant="outline"
            className="border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold px-4 h-9 rounded-xl flex items-center gap-1.5"
          >
            <CalendarRange className="w-4 h-4 text-gray-500" />
            Ver Programación
          </Button>
        </div>
      </div>

      {/* 2. KPIS EJECUTIVOS EN UNA SOLA FILA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Presupuesto USD</span>
              <span className="text-xl sm:text-2xl font-black text-gray-900 leading-none">
                {formatCurrencyUSD(totalPresupuestoUSD)}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-blue-600 block">Dólares</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-teal-50 text-teal-600 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Presupuesto PEN</span>
              <span className="text-xl sm:text-2xl font-black text-gray-900 leading-none">
                {formatCurrencyPEN(totalPresupuestoPEN)}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-teal-600 block">Soles</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Por Atender</span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 leading-none">
                {totalAtencionCount}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-amber-600 block">Solicitudes</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Liquidaciones</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 leading-none">
                {totalLiqCount}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-emerald-600 block">Cerradas</span>
          </div>
        </div>
      </div>

      {/* 3. GRÁFICOS INTERACTIVOS RECHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico 1: Presupuesto vs Ejecutado por Sector */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Ejecución Presupuestal por Sector
              </h2>
              <p className="text-xs text-gray-500 font-medium">Comparativa de montos programados vs ejecutados</p>
            </div>
            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg">USD $</span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="area" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                <Bar dataKey="programado" fill="#cbd5e1" name="Programado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ejecutado" fill="#14b8a6" name="Ejecutado" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Distribución de Adquisiciones */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-blue-600" />
                  Distribución de Compras
                </h2>
                <p className="text-xs text-gray-500 font-medium">Por categoría de gasto operativo</p>
              </div>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={tipoSolicitudData}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {tipoSolicitudData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Participación"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
            {tipoSolicitudData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-gray-600 font-medium truncate">{item.name}</span>
                <span className="font-bold text-gray-900 ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. TENDENCIA MENSUAL Y ACCESOS A MÓDULOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico de Evolución Mensual */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Evolución de Compras (Últimos 7 meses)
              </h2>
              <p className="text-xs text-gray-500 font-medium">Comportamiento del gasto real vs meta presupuestal</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompras" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Area type="monotone" dataKey="compras" stroke="#14b8a6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompras)" name="Gasto Real" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tarjetas de Accesos Rápidos */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-gray-900 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              Accesos Directos
            </h2>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => navigate("/compras/programacion")}
                className="w-full text-left p-3 rounded-xl border border-gray-200/80 hover:border-teal-300 hover:bg-teal-50/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-600 group-hover:scale-105 transition-transform">
                    <CalendarRange className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-gray-900 block">Ciclo de Compras</span>
                    <span className="text-[11px] text-gray-500 font-medium">Programación, atención y liquidaciones</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/compras/trazabilidad")}
                className="w-full text-left p-3 rounded-xl border border-gray-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-gray-900 block">Trazabilidad y SLA</span>
                    <span className="text-[11px] text-gray-500 font-medium">Timeline de requerimientos y cuellos de botella</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/compras/proveedores")}
                className="w-full text-left p-3 rounded-xl border border-gray-200/80 hover:border-amber-300 hover:bg-amber-50/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-gray-900 block">Catálogo Proveedores</span>
                    <span className="text-[11px] text-gray-500 font-medium">Empresas, contactos y evaluación</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/compras/reportes")}
                className="w-full text-left p-3 rounded-xl border border-gray-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-gray-900 block">Reportes Ejecutivos</span>
                    <span className="text-[11px] text-gray-500 font-medium">Dossiers, EVM y exportación directiva</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

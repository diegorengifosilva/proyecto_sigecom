import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Search,
  FilePlus,
  ArrowUpRight,
  RefreshCw,
  Coins,
  DollarSign,
  Briefcase,
  ShieldCheck
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import TablaProgramacion from "../compras/tablas/TablaProgramacion";

const MESES = [
  { value: "%", label: "Todos los Meses" },
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const ANIOS = [
  new Date().getFullYear(),
  new Date().getFullYear() - 1,
  new Date().getFullYear() - 2,
  new Date().getFullYear() - 3,
  new Date().getFullYear() - 4
];

const fetchPlanInversionData = async ({ queryKey }) => {
  const [_, anno, mes] = queryKey;
  const token = localStorage.getItem("access_token");
  const params = {};
  if (anno && anno !== "%") params.anno = anno;
  if (mes && mes !== "%") params.mes = mes;

  const { data } = await api.get("compras/lista_plan_inversion/", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};

export default function PlanInversionAnual() {
  const navigate = useNavigate();
  const { authUser: user } = useAuth();
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedAnno, setSelectedAnno] = useState(new Date().getFullYear());
  const [selectedMes, setSelectedMes] = useState("%");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch, selectedAnno, selectedMes]);

  const { data: dataPlan, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-plan-inversion-anual", selectedAnno, selectedMes],
    queryFn: fetchPlanInversionData,
    staleTime: 30000,
    keepPreviousData: true
  });

  const rawList = dataPlan?.tabla || [];

  // Filtrado local por búsqueda
  const filteredData = useMemo(() => {
    const search = globalSearch.toLowerCase().trim();
    if (!search) return rawList;

    return rawList.filter((item) => {
      const cod = (item.codigo || "").toLowerCase();
      const ref = (item.referencia || "").toLowerCase();
      const emp = (item.empresa || "").toLowerCase();
      const area = (item.area || "").toLowerCase();
      const tipo = (item.tipo || "").toLowerCase();

      return (
        cod.includes(search) ||
        ref.includes(search) ||
        emp.includes(search) ||
        area.includes(search) ||
        tipo.includes(search)
      );
    });
  }, [rawList, globalSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  // KPIs calculados
  const stats = useMemo(() => {
    const list = filteredData;
    const totalCount = list.length;
    const totalProgramado = list.reduce((sum, item) => sum + (parseFloat(item.programado) || 0), 0);
    const totalEjecutado = list.reduce((sum, item) => sum + (parseFloat(item.ejecutado) || 0), 0);
    const totalSaldo = list.reduce((sum, item) => sum + Math.max(0, (parseFloat(item.saldo) || 0)), 0);
    const totalPEN = totalProgramado * 3.75; // Tipo cambio referencial

    return {
      totalCount,
      totalProgramado,
      totalEjecutado,
      totalSaldo,
      totalPEN
    };
  }, [filteredData]);

  const formatCurrency = (val) => {
    return `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPEN = (val) => {
    return `S/. ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleNuevoPlan = () => {
    toast.info("Módulo de Administración de Plan de Inversión Anual para TI. Configuración de nuevo flujo en desarrollo.");
  };

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col">
      {/* 1. ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">
              Plan de Inversión Anual
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/60 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Módulo TI / SuperAdmin
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestión y administración independiente del Plan de Inversión Anual previo a compras.
          </p>
        </div>

        {/* ACCIONES DEL HEADER */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            onClick={handleNuevoPlan}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider px-5 h-9 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <FilePlus size={15} />
            Nuevo Plan
          </Button>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors border border-gray-200 bg-white"
            title="Refrescar"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 2. TARJETAS KPI DE RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* KPI 1: Total Planes */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
              Planes Registrados
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-[950] text-gray-950 tracking-tight leading-none">
            {stats.totalCount}
          </h3>
          <div className="mt-2 text-[10px] font-bold text-gray-400">
            Período Año {selectedAnno}
          </div>
        </div>

        {/* KPI 2: Presupuesto Programado */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
              Presupuesto Total
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-[950] text-emerald-700 tracking-tight leading-none">
            {formatCurrency(stats.totalProgramado)}
          </h3>
          <div className="mt-2 text-[10px] font-bold text-gray-400">
            Equiv. aprox: {formatPEN(stats.totalPEN)}
          </div>
        </div>

        {/* KPI 3: Total Ejecutado */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
              Monto Ejecutado
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-[950] text-sky-700 tracking-tight leading-none">
            {formatCurrency(stats.totalEjecutado)}
          </h3>
          <div className="mt-2 text-[10px] font-bold text-gray-400">
            {stats.totalProgramado > 0
              ? `${((stats.totalEjecutado / stats.totalProgramado) * 100).toFixed(1)}% ejecutado`
              : "0% ejecutado"}
          </div>
        </div>

        {/* KPI 4: Saldo Disponible */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
              Saldo Disponible
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-[950] text-amber-700 tracking-tight leading-none">
            {formatCurrency(stats.totalSaldo)}
          </h3>
          <div className="mt-2 text-[10px] font-bold text-gray-400">
            Remanente presupuestal
          </div>
        </div>
      </div>

      {/* 3. BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Input de Búsqueda */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, referencia, empresa, área o tipo..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Selectores Año y Mes */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Año */}
          <select
            value={selectedAnno}
            onChange={(e) => setSelectedAnno(e.target.value)}
            className="text-xs bg-gray-50/70 border border-gray-200 rounded-xl px-3 py-1.5 font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            {ANIOS.map((y) => (
              <option key={y} value={y}>
                Año {y}
              </option>
            ))}
          </select>

          {/* Mes */}
          <select
            value={selectedMes}
            onChange={(e) => setSelectedMes(e.target.value)}
            className="text-xs bg-gray-50/70 border border-gray-200 rounded-xl px-3 py-1.5 font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            {MESES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. TABLA PLAN INVERSIÓN ANUAL */}
      <div className="flex-1 flex flex-col min-h-[420px]">
        <TablaProgramacion
          data={filteredData}
          isLoading={isLoading}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRowClick={(row) => {
            navigate(`/plan-inversion-anual/${row.id_registro}`);
          }}
        />
      </div>
    </div>
  );
}

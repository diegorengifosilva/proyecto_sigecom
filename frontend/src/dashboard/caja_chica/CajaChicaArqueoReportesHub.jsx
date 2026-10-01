import React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Coins,
  History,
  BarChart3,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
import ArqueoCaja from "./caja_chica/CajaChica";
import RegistroActividades from "./registro_actividades/RegistroActividades";
import Reportes from "./reportes/Reportes";

export default function CajaChicaArqueoReportesHub({ defaultTab = "arqueo" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "arqueo";

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const tabs = [
    {
      id: "arqueo",
      label: "Arqueo y Cierre Diario",
      icon: Coins,
      badge: "Cuadre",
    },
    {
      id: "actividades",
      label: "Auditoría de Actividades",
      icon: History,
      badge: "Logs",
    },
    {
      id: "reportes",
      label: "Reportes Financieros",
      icon: BarChart3,
      badge: "Estadísticas",
    },
  ];

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col font-sans">
      {/* 1. ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">
              Arqueo, Auditoría y Reportes de Caja
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Control Contable
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Cierre diario de fondos en efectivo, trazabilidad forense y analítica de gastos
          </p>
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
            <span>Auditoría Interna</span>
          </div>
        </div>
      </div>

      {/* 3. FILA ÚNICA DE 4 KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Estado Arqueo</span>
              <span className="text-xl font-black text-gray-900 leading-none">Cuadrado</span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-teal-600 block">Saldo Real</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Diferencia</span>
              <span className="text-xl font-black text-emerald-600 leading-none">S/. 0.00</span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-emerald-600 block">Exactitud</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Eventos Auditados</span>
              <span className="text-xl font-black text-blue-600 leading-none">100% Logs</span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-blue-600 block">Trazabilidad</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tendencia Gasto</span>
              <span className="text-xl font-black text-purple-600 leading-none">Estable</span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-purple-600 block">Presupuestal</span>
          </div>
        </div>
      </div>

      {/* 4. CONTENIDO DINÁMICO */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-3 sm:p-5">
        {currentTab === "arqueo" && <ArqueoCaja />}
        {currentTab === "actividades" && <RegistroActividades />}
        {currentTab === "reportes" && <Reportes />}
      </div>
    </div>
  );
}

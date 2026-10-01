import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  BarChart2,
  PlusCircle,
  History,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import EvaluacionesOverview from "./evaluaciones/EvaluacionesOverview";
import NuevaEvaluacion from "./evaluaciones/NuevaEvaluacion";
import HistorialEvaluaciones from "./evaluaciones/HistorialEvaluaciones";
import EvaluacionesEscenarios from "./evaluaciones/EvaluacionesEscenarios";

export default function Evaluaciones({ defaultTab = "panel" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "panel";

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const tabs = [
    {
      id: "panel",
      label: "Panel Evaluaciones",
      icon: BarChart2,
      badge: "Resumen",
    },
    {
      id: "nueva",
      label: "Nueva Evaluación",
      icon: PlusCircle,
      badge: "Simulador",
    },
    {
      id: "historial",
      label: "Historial",
      icon: History,
      badge: "Registros",
    },
    {
      id: "escenarios",
      label: "Escenarios",
      icon: SlidersHorizontal,
      badge: "Políticas",
    },
  ];

  return (
    <div className="space-y-4 font-sans p-1 sm:p-2">
      {/* 1. HEADER CORPORATIVO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Evaluaciones Estratégicas
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Modelos Financieros & IA
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Análisis cuantitativo de alternativas, simulación Monte Carlo y recomendaciones estratégicas.
          </p>
        </div>

        {/* ACCIONES DEL HEADER */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => handleTabChange("nueva")}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider px-4 h-9 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <PlusCircle size={15} />
            Nueva Evaluación
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors border border-gray-200 bg-white shadow-sm"
            title="Refrescar vista"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVEGACIÓN HORIZONTAL ESTILO JIRA (SIN SCROLL VERTICAL) */}
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
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10.5px] font-black px-2 py-0.5 rounded-full transition-colors ${
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
            <span>Módulo de Decisión</span>
          </div>
        </div>
      </div>

      {/* 3. VISTA DEL SUBMÓDULO ACTIVO */}
      <div className="animate-in fade-in duration-200">
        {currentTab === "panel" && <EvaluacionesOverview />}
        {currentTab === "nueva" && <NuevaEvaluacion />}
        {currentTab === "historial" && <HistorialEvaluaciones />}
        {currentTab === "escenarios" && <EvaluacionesEscenarios />}
      </div>
    </div>
  );
}

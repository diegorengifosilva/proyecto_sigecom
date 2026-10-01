import React from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  AlertOctagon,
  FileSignature,
  Target,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileCheck
} from "lucide-react";
import EmergenciasPrograma from "./EmergenciasPrograma";
import EmergenciasIntervenciones from "./EmergenciasIntervenciones";
import EmergenciasInformes from "./EmergenciasInformes";
import EmergenciasAcciones from "./EmergenciasAcciones";

export default function EmergenciasOperacionesHub({ defaultTab = "programa" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "programa";

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const tabs = [
    {
      id: "programa",
      label: "Programa de Simulacros",
      icon: CalendarDays,
      badge: "Simulacros",
    },
    {
      id: "intervenciones",
      label: "Intervenciones Reales",
      icon: AlertOctagon,
      badge: "Siniestros",
    },
    {
      id: "informes",
      label: "Informes y Firmas",
      icon: FileSignature,
      badge: "Visado",
    },
    {
      id: "acciones",
      label: "Planes de Acción",
      icon: Target,
      badge: "Mitigación",
    },
  ];

  return (
    <div className="space-y-4 font-sans p-1 sm:p-2 animate-in fade-in duration-300">
      {/* 1. HEADER CORPORATIVO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Simulacros y Respuesta Operativa
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Operaciones de Emergencia
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Cronograma anual de simulacros, registro de atenciones reales, generación de informes técnicos y planes de acción correctiva.
          </p>
        </div>

        {/* ACCIONES DEL HEADER */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
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
                  {tab.badge && (
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
            <span>Simulacros & Acción</span>
          </div>
        </div>
      </div>

      {/* 3. FILA ÚNICA DE 4 KPIS CONTEXTUALES SEGÚN LA PESTAÑA ACTIVA */}
      {currentTab === "programa" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Simulacros Anuales</span>
                <span className="text-xl font-black text-gray-900 leading-none">Cronograma</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-blue-600 block">Oficial V&C</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Simulacros Ejecutados</span>
                <span className="text-xl font-black text-gray-900 leading-none">Conformes</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">Completados</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tiempo de Evacuación</span>
                <span className="text-xl font-black text-gray-900 leading-none">Promedio 2.4 min</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-amber-600 block">Eficiencia</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Participación en Sede</span>
                <span className="text-xl font-black text-gray-900 leading-none">96%</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-teal-600 block">Asistencia</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "intervenciones" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Atenciones Reales</span>
                <span className="text-xl font-black text-gray-900 leading-none">Bitácora</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-rose-600 block">Siniestros</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Incidentes Controlados</span>
                <span className="text-xl font-black text-gray-900 leading-none">100% Éxito</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">Resueltos</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tiempo de Respuesta</span>
                <span className="text-xl font-black text-gray-900 leading-none">&lt; 90 Segundos</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-blue-600 block">Inmediato</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Severidad</span>
                <span className="text-xl font-black text-gray-900 leading-none">Leve</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-teal-600 block">Sin Pérdidas</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "informes" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Informes Técnicos</span>
                <span className="text-xl font-black text-gray-900 leading-none">Generados</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-indigo-600 block">Post-Evento</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Firmas y V°B°</span>
                <span className="text-xl font-black text-gray-900 leading-none">Digitales</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-teal-600 block">Comité SST</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Conformidad Legal</span>
                <span className="text-xl font-black text-gray-900 leading-none">Auditable</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">SUNAFIL / INDECI</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Archivo Histórico</span>
                <span className="text-xl font-black text-gray-900 leading-none">Almacenado</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-purple-600 block">PDF Export</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "acciones" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Planes de Acción</span>
                <span className="text-xl font-black text-gray-900 leading-none">En Curso</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-amber-600 block">Mejora Continua</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Acciones Cerradas</span>
                <span className="text-xl font-black text-gray-900 leading-none">Efectivas</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">Verificadas</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cumplimiento de Plazo</span>
                <span className="text-xl font-black text-gray-900 leading-none">95%</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-blue-600 block">Puntual</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Mitigación de Riesgos</span>
                <span className="text-xl font-black text-gray-900 leading-none">Controlada</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-teal-600 block">Seguridad</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONTENIDO DINÁMICO */}
      <div className="transition-all duration-200">
        {currentTab === "programa" && <EmergenciasPrograma />}
        {currentTab === "intervenciones" && <EmergenciasIntervenciones />}
        {currentTab === "informes" && <EmergenciasInformes />}
        {currentTab === "acciones" && <EmergenciasAcciones />}
      </div>
    </div>
  );
}

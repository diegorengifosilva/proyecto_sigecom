import React from "react";
import { useSearchParams } from "react-router-dom";
import {
  UserCheck,
  Award,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Clock,
  Users,
  Briefcase,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import InduccionesHseq from "./InduccionesHseq";
import MatrizCompetencias from "./MatrizCompetencias";
import CertificacionesTar from "./CertificacionesTar";

export default function InduccionCompetenciasHub({ defaultTab = "inducciones" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "inducciones";

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const tabs = [
    {
      id: "inducciones",
      label: "Inducción y Reinducción",
      icon: UserCheck,
      badge: "Ingreso",
    },
    {
      id: "competencias",
      label: "Matriz de Competencias",
      icon: Award,
      badge: "Perfiles",
    },
    {
      id: "certificaciones",
      label: "Certificaciones TAR",
      icon: ShieldAlert,
      badge: "Alto Riesgo",
    },
  ];

  return (
    <div className="space-y-4 font-sans p-1 sm:p-2 animate-in fade-in duration-300">
      {/* 1. HEADER CORPORATIVO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Inducción y Competencias
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Acreditación HSEQ
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Acreditación de ingreso, perfiles de competencias por puesto y certificaciones para Trabajos de Alto Riesgo.
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
            <span>Acreditación Técnica</span>
          </div>
        </div>
      </div>

      {/* 3. FILA ÚNICA DE 4 KPIS CONTEXTUALES SEGÚN LA PESTAÑA ACTIVA */}
      {currentTab === "inducciones" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Inducciones</span>
                <span className="text-xl font-black text-gray-900 leading-none">General / Específica</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-teal-600 block">Ingreso</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Acreditados</span>
                <span className="text-xl font-black text-gray-900 leading-none">Aptos</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">Habilitados</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Reinducción Anual</span>
                <span className="text-xl font-black text-gray-900 leading-none">Vigente</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-amber-600 block">Periódica</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Formatos Firmados</span>
                <span className="text-xl font-black text-gray-900 leading-none">Conforme</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-blue-600 block">Legal</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "competencias" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Puestos y Perfiles</span>
                <span className="text-xl font-black text-gray-900 leading-none">Definidos</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-indigo-600 block">Catálogo</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Competencias Clave</span>
                <span className="text-xl font-black text-gray-900 leading-none">Matriz</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-purple-600 block">Requeridas</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cobertura Perfil</span>
                <span className="text-xl font-black text-gray-900 leading-none">Óptima</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">Cumplimiento</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Personal Mapeado</span>
                <span className="text-xl font-black text-gray-900 leading-none">Operativo</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-blue-600 block">Técnico</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "certificaciones" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Certificados TAR</span>
                <span className="text-xl font-black text-gray-900 leading-none">Activos</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-rose-600 block">Alto Riesgo</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Trabajos en Altura</span>
                <span className="text-xl font-black text-gray-900 leading-none">Vigente</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">Acreditado</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Por Vencer (30d)</span>
                <span className="text-xl font-black text-gray-900 leading-none">Alerta</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-amber-600 block">Renovación</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Espacios Confinados</span>
                <span className="text-xl font-black text-gray-900 leading-none">Especialistas</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-indigo-600 block">Seguridad</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONTENIDO DINÁMICO */}
      <div className="transition-all duration-200">
        {currentTab === "inducciones" && <InduccionesHseq />}
        {currentTab === "competencias" && <MatrizCompetencias />}
        {currentTab === "certificaciones" && <CertificacionesTar />}
      </div>
    </div>
  );
}

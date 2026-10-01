import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  AlertTriangle,
  PlusCircle,
  Compass,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Search,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Layers,
} from "lucide-react";

// Datos de demostración de riesgos para la cartera
const RIESGOS_INICIALES = [
  {
    id: "RSK-001",
    titulo: "Retraso en entrega de transformadores 10kV por proveedor externo",
    proyecto: "PRY-COT-TEST-001",
    cliente: "Minera Las Bambas S.A.",
    categoria: "Logístico",
    probabilidad: 4,
    impacto: 4,
    severidad: 16,
    nivel: "CRITICO",
    estado: "EN_MITIGACION",
    costoEstimado: 18500,
    responsable: "Ing. Carlos Mendoza",
    plan: "Activación de penalidades contractuales y búsqueda de stock local de respaldo.",
    fechaLimite: "2026-10-15",
  },
  {
    id: "RSK-002",
    titulo: "Variación de tipo de cambio USD/PEN impactando insumos importados",
    proyecto: "231027A-MDZ-V-2023000030",
    cliente: "MONDELEZ PERU S.A.",
    categoria: "Financiero",
    probabilidad: 3,
    impacto: 4,
    severidad: 12,
    nivel: "ALTO",
    estado: "EN_MITIGACION",
    costoEstimado: 12000,
    responsable: "Lic. Diana Paredes",
    plan: "Cierre de contratos forward de divisas y renegociación de precios unitarios.",
    fechaLimite: "2026-10-30",
  },
  {
    id: "RSK-003",
    titulo: "Permisos ambientales pendientes para tendido en subestación",
    proyecto: "184163A-SPCC-V-2018000155",
    cliente: "SOUTHERN PERU COPPER CORP.",
    categoria: "HSEQ / Legal",
    probabilidad: 2,
    impacto: 5,
    severidad: 10,
    nivel: "ALTO",
    estado: "IDENTIFICADO",
    costoEstimado: 9500,
    responsable: "Ing. Jorge Salinas",
    plan: "Reunión de seguimiento con la autoridad sectorial y mesa técnica de soporte.",
    fechaLimite: "2026-11-10",
  },
  {
    id: "RSK-004",
    titulo: "Falta de cuadrilla certificada para pruebas de relés digitales",
    proyecto: "264011A-VALP-S-2026000033",
    cliente: "Valero Peru S.A.C",
    categoria: "Técnico",
    probabilidad: 3,
    impacto: 3,
    severidad: 9,
    nivel: "MEDIO",
    estado: "EN_MITIGACION",
    costoEstimado: 5400,
    responsable: "Ing. Marco Rivas",
    plan: "Convenio de capacitación acelerada y homologación con fabricante Allen Bradley.",
    fechaLimite: "2026-10-25",
  },
  {
    id: "RSK-005",
    titulo: "Interferencias con ductos de agua no mapeados en planos civiles",
    proyecto: "152221A-GLORIA-V-2014001351",
    cliente: "GLORIA S.A",
    categoria: "Técnico",
    probabilidad: 2,
    impacto: 3,
    severidad: 6,
    nivel: "MEDIO",
    estado: "CONTROLADO",
    costoEstimado: 3200,
    responsable: "Ing. Patricia Soto",
    plan: "Escaneo con georradar antes de excavaciones principales.",
    fechaLimite: "2026-11-05",
  },
];

const getNivelBadge = (nivel) => {
  switch (nivel) {
    case "CRITICO":
      return "bg-red-50 text-red-700 border-red-200";
    case "ALTO":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "MEDIO":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
};

export default function GestionRiesgos({ defaultTab = "panel" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "panel";

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const [riesgos, setRiesgos] = useState(RIESGOS_INICIALES);
  const [filtroNivel, setFiltroNivel] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");

  // Nuevo formulario de registro
  const [nuevoRiesgo, setNuevoRiesgo] = useState({
    titulo: "",
    proyecto: "PRY-COT-TEST-001",
    cliente: "Minera Las Bambas S.A.",
    categoria: "Técnico",
    probabilidad: 3,
    impacto: 3,
    responsable: "",
    costoEstimado: 5000,
    plan: "",
    fechaLimite: "",
  });

  const [guardadoExito, setGuardadoExito] = useState(false);

  const tabs = [
    {
      id: "panel",
      label: "Panel de Riesgos",
      icon: ShieldAlert,
      badge: `${riesgos.length} Activos`,
    },
    {
      id: "registrar",
      label: "Registrar Riesgos",
      icon: PlusCircle,
      badge: "Formulario",
    },
    {
      id: "impacto",
      label: "Análisis de Impacto",
      icon: Compass,
      badge: "Simulación PxI",
    },
  ];

  // Cálculos consolidados
  const metricas = useMemo(() => {
    const total = riesgos.length;
    const criticos = riesgos.filter((r) => r.nivel === "CRITICO" || r.severidad >= 15).length;
    const altos = riesgos.filter((r) => r.nivel === "ALTO").length;
    const mitigacion = riesgos.filter((r) => r.estado === "EN_MITIGACION").length;
    const costoTotal = riesgos.reduce((acc, r) => acc + (r.costoEstimado || 0), 0);
    return { total, criticos, altos, mitigacion, costoTotal };
  }, [riesgos]);

  const riesgosFiltrados = useMemo(() => {
    return riesgos.filter((r) => {
      const matchNivel = filtroNivel === "TODOS" || r.nivel === filtroNivel;
      const matchSearch =
        !busqueda ||
        r.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.proyecto.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.cliente.toLowerCase().includes(busqueda.toLowerCase());
      return matchNivel && matchSearch;
    });
  }, [riesgos, filtroNivel, busqueda]);

  const handleCrearRiesgo = (e) => {
    e.preventDefault();
    const p = Number(nuevoRiesgo.probabilidad);
    const i = Number(nuevoRiesgo.impacto);
    const sev = p * i;
    let nivel = "BAJO";
    if (sev >= 15) nivel = "CRITICO";
    else if (sev >= 10) nivel = "ALTO";
    else if (sev >= 6) nivel = "MEDIO";

    const nuevo = {
      id: `RSK-${String(riesgos.length + 1).padStart(3, "0")}`,
      ...nuevoRiesgo,
      probabilidad: p,
      impacto: i,
      severidad: sev,
      nivel,
      estado: "EN_MITIGACION",
      costoEstimado: Number(nuevoRiesgo.costoEstimado || 0),
    };

    setRiesgos((prev) => [nuevo, ...prev]);
    setGuardadoExito(true);
    setTimeout(() => {
      setGuardadoExito(false);
      handleTabChange("panel");
    }, 1200);
  };

  return (
    <div className="space-y-4 font-sans p-1 sm:p-2">
      {/* 1. HEADER CORPORATIVO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Gestión de Riesgos
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Matriz PxI & Mitigación
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitoreo preventivo de contingencias, matriz de severidad y planes de respuesta en cartera.
          </p>
        </div>

        {/* ACCIONES DEL HEADER */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => handleTabChange("registrar")}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider px-4 h-9 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <PlusCircle size={15} />
            Registrar Riesgo
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors border border-gray-200 bg-white shadow-sm"
            title="Refrescar lista"
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
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Control de Exposición</span>
          </div>
        </div>
      </div>

      {/* 3. VISTAS CONTEXTUALES */}
      {currentTab === "panel" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Fila única de 4 KPIs contextuales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Riesgos</span>
                  <span className="text-xl font-black text-gray-900 leading-none">{metricas.total} identificados</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-red-600 block">Críticos: {metricas.criticos}</span>
                <span className="text-amber-600 block">Altos: {metricas.altos}</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Exposición Financiera</span>
                  <span className="text-xl font-black text-gray-900 leading-none">${metricas.costoTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-emerald-600 block">Contingencia activa</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">En Mitigación</span>
                  <span className="text-xl font-black text-gray-900 leading-none">{metricas.mitigacion} con plan</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-teal-600 block">Monitoreo activo</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Nivel de Tolerancia</span>
                  <span className="text-xl font-black text-gray-900 leading-none">92% Seguro</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-sky-600 block">Bajo umbral PMO</span>
              </div>
            </div>
          </div>

          {/* Filtros y búsqueda */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Buscar por título, proyecto o cliente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "TODOS", label: "Todos los Riesgos" },
                { id: "CRITICO", label: "Críticos (15-25)" },
                { id: "ALTO", label: "Altos (10-14)" },
                { id: "MEDIO", label: "Medios (6-9)" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroNivel(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    filtroNivel === f.id
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200/70"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Riesgos */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Código / Proyecto</th>
                    <th className="py-3 px-4">Descripción del Riesgo</th>
                    <th className="py-3 px-4 text-center">PxI (Severidad)</th>
                    <th className="py-3 px-4">Plan de Mitigación</th>
                    <th className="py-3 px-4">Responsable</th>
                    <th className="py-3 px-4 text-right">Exposición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {riesgosFiltrados.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-teal-700 block">{r.id}</span>
                        <span className="text-[11px] font-bold text-gray-800 block truncate max-w-[160px]">{r.proyecto}</span>
                        <span className="text-[10px] text-gray-400 block truncate max-w-[160px]">{r.cliente}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900 block max-w-md">{r.titulo}</span>
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                          {r.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black border ${getNivelBadge(r.nivel)}`}>
                          {r.severidad} ({r.nivel})
                        </span>
                        <span className="text-[9.5px] text-gray-400 block mt-0.5">P:{r.probabilidad} × I:{r.impacto}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-gray-600 line-clamp-2 text-[11px]">{r.plan}</p>
                        <span className="text-[9.5px] font-semibold text-teal-600 block mt-0.5">Límite: {r.fechaLimite}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-medium">
                        {r.responsable}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-gray-900">
                        ${r.costoEstimado.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {currentTab === "registrar" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="max-w-2xl mx-auto space-y-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Alta de Nuevo Riesgo de Cartera</h2>
              <p className="text-xs text-gray-500">
                Registra la amenaza potencial, clasifícala con la matriz de probabilidad/impacto y define el plan de contingencia.
              </p>
            </div>

            {guardadoExito && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ¡Riesgo registrado y clasificado exitosamente en la matriz! Redirigiendo...
              </div>
            )}

            <form onSubmit={handleCrearRiesgo} className="space-y-4 text-xs font-semibold text-gray-700">
              <div>
                <label className="block mb-1 font-bold text-gray-800">Título descriptivo del riesgo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Retraso en entrega de transformadores 10kV..."
                  value={nuevoRiesgo.titulo}
                  onChange={(e) => setNuevoRiesgo({ ...nuevoRiesgo, titulo: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-gray-800">Proyecto Asociado *</label>
                  <select
                    value={nuevoRiesgo.proyecto}
                    onChange={(e) => setNuevoRiesgo({ ...nuevoRiesgo, proyecto: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="PRY-COT-TEST-001">PRY-COT-TEST-001 (Las Bambas)</option>
                    <option value="231027A-MDZ-V-2023000030">231027A-MDZ (Mondelez)</option>
                    <option value="184163A-SPCC-V-2018000155">184163A-SPCC (Southern Peru)</option>
                    <option value="264011A-VALP-S-2026000033">264011A-VALP (Valero)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-bold text-gray-800">Categoría *</label>
                  <select
                    value={nuevoRiesgo.categoria}
                    onChange={(e) => setNuevoRiesgo({ ...nuevoRiesgo, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="Técnico">Técnico / Ingeniería</option>
                    <option value="Logístico">Logístico / Proveedores</option>
                    <option value="Financiero">Financiero / Costos</option>
                    <option value="HSEQ / Legal">HSEQ / Normativo / Legal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <div>
                  <label className="block mb-1 font-bold text-gray-800">Probabilidad (1 - 5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={nuevoRiesgo.probabilidad}
                    onChange={(e) => setNuevoRiesgo({ ...nuevoRiesgo, probabilidad: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-gray-800">Impacto (1 - 5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={nuevoRiesgo.impacto}
                    onChange={(e) => setNuevoRiesgo({ ...nuevoRiesgo, impacto: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-gray-800">Score PxI</label>
                  <div className="py-1.5 text-center font-black text-sm text-teal-700 bg-white border border-teal-200 rounded-lg">
                    {Number(nuevoRiesgo.probabilidad) * Number(nuevoRiesgo.impacto)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-800">Plan de Mitigación / Respuesta *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Detalla las acciones concretas para mitigar o neutralizar el impacto..."
                  value={nuevoRiesgo.plan}
                  onChange={(e) => setNuevoRiesgo({ ...nuevoRiesgo, plan: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-gray-800">Responsable</label>
                  <input
                    type="text"
                    placeholder="Ing. Responsable"
                    value={nuevoRiesgo.responsable}
                    onChange={(e) => setNuevoRiesgo({ ...nuevoRiesgo, responsable: e.target.value })}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-gray-800">Costo Contingencia ($)</label>
                  <input
                    type="number"
                    value={nuevoRiesgo.costoEstimado}
                    onChange={(e) => setNuevoRiesgo({ ...nuevoRiesgo, costoEstimado: e.target.value })}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-gray-800">Fecha Límite</label>
                  <input
                    type="date"
                    value={nuevoRiesgo.fechaLimite}
                    onChange={(e) => setNuevoRiesgo({ ...nuevoRiesgo, fechaLimite: e.target.value })}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => handleTabChange("panel")}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black shadow-md transition-all active:scale-[0.98]"
                >
                  Guardar Riesgo en Cartera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentTab === "impacto" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <h3 className="font-extrabold text-sm text-gray-900 mb-2">Simulación de Contingencia y Stress Testing</h3>
              <p className="text-xs text-gray-500 mb-4">
                Distribución probabilística del impacto financiero sobre el presupuesto base de la cartera (BAC).
              </p>
              <div className="grid grid-cols-3 gap-3 text-center mb-6">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Escenario P50</span>
                  <span className="text-lg font-black text-gray-900">$22,400</span>
                  <span className="text-[9.5px] text-gray-500 block">Impacto probable</span>
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">Escenario P80</span>
                  <span className="text-lg font-black text-gray-900">$48,500</span>
                  <span className="text-[9.5px] text-gray-500 block">Contingencia recomendada</span>
                </div>
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl">
                  <span className="text-[10px] font-bold text-red-700 uppercase block">Escenario P95</span>
                  <span className="text-lg font-black text-gray-900">$74,800</span>
                  <span className="text-[9.5px] text-gray-500 block">Peor caso estresado</span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-2">
                <div className="flex justify-between items-center font-bold">
                  <span>Margen de Contingencia Disponible:</span>
                  <span className="text-emerald-600 font-extrabold">$150,000</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-2 rounded-full" style={{ width: "32%" }} />
                </div>
                <p className="text-[11px] text-gray-500">
                  La cartera cuenta con un 68% de colchón de contingencia no comprometido frente al escenario P80.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 mb-2">Matriz PxI Consolidada</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Concentración de eventos por cuadrante de severidad.
                </p>
                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-red-50 text-red-800 border border-red-100">
                    <span>Críticos (15-25):</span>
                    <span className="font-black text-sm">2 riesgos</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-100">
                    <span>Altos (10-14):</span>
                    <span className="font-black text-sm">3 riesgos</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-100">
                    <span>Medios (6-9):</span>
                    <span className="font-black text-sm">4 riesgos</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                    <span>Bajos (1-5):</span>
                    <span className="font-black text-sm">3 riesgos</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTabChange("panel")}
                className="mt-4 w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 text-xs flex items-center justify-center gap-1.5"
              >
                Ver todos en el panel
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

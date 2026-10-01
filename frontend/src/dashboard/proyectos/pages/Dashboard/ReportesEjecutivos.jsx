import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText,
  FolderKanban,
  BarChart3,
  Download,
  FileDown,
  Printer,
  CheckCircle2,
  Calendar,
  Building2,
  TrendingUp,
  RefreshCw,
  Search,
  ExternalLink,
  Layers,
  ArrowUpRight,
} from "lucide-react";

const REPORTES_DEMO = [
  {
    id: "REP-2026-091",
    titulo: "Informe Ejecutivo Mensual de Cartera",
    proyecto: "Consolidado de Cartera",
    cliente: "Directorio V&C Corporation",
    tipo: "Comité de Dirección",
    fecha: "2026-09-28",
    formato: "PDF",
    autor: "Diego Alexis Rengifo Silva",
    paginas: 18,
    estado: "APROBADO",
  },
  {
    id: "REP-2026-088",
    titulo: "Reporte Flash Semanal - Hitos y EVM",
    proyecto: "PRY-COT-TEST-001",
    cliente: "Minera Las Bambas S.A.",
    tipo: "Flash Semanal",
    fecha: "2026-09-26",
    formato: "PDF",
    autor: "Ing. Carlos Mendoza",
    paginas: 6,
    estado: "EMITIDO",
  },
  {
    id: "REP-2026-082",
    titulo: "Análisis de Curva S y Desvío Presupuestal",
    proyecto: "231027A-MDZ-V-2023000030",
    cliente: "MONDELEZ PERU S.A.",
    tipo: "Informe de Costos",
    fecha: "2026-09-24",
    formato: "WORD",
    autor: "Lic. Diana Paredes",
    paginas: 12,
    estado: "EN_REVISION",
  },
  {
    id: "REP-2026-079",
    titulo: "Dossier de Calidad y Cierre Contractual",
    proyecto: "184163A-SPCC-V-2018000155",
    cliente: "SOUTHERN PERU COPPER CORP.",
    tipo: "Acta de Cierre",
    fecha: "2026-09-20",
    formato: "PDF",
    autor: "Ing. Jorge Salinas",
    paginas: 34,
    estado: "APROBADO",
  },
  {
    id: "REP-2026-075",
    titulo: "Auditoría de HH y Seguridad en Parada de Planta",
    proyecto: "264011A-VALP-S-2026000033",
    cliente: "Valero Peru S.A.C",
    tipo: "HSEQ / Operaciones",
    fecha: "2026-09-15",
    formato: "PDF",
    autor: "Ing. Marco Rivas",
    paginas: 14,
    estado: "EMITIDO",
  },
];

export default function ReportesEjecutivos({ defaultTab = "centro" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "centro";

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const [busqueda, setBusqueda] = useState("");
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState("PRY-COT-TEST-001");
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("directorio");

  const tabs = [
    {
      id: "centro",
      label: "Centro de Reportes",
      icon: FileText,
      badge: "28 Emitidos",
    },
    {
      id: "proyecto",
      label: "Por Proyecto",
      icon: FolderKanban,
      badge: "Individual",
    },
    {
      id: "comparativo",
      label: "Comparativo",
      icon: BarChart3,
      badge: "Portafolio",
    },
    {
      id: "exportar",
      label: "Generar PDF/Word",
      icon: Download,
      badge: "Exportador",
    },
  ];

  const reportesFiltrados = useMemo(() => {
    return REPORTES_DEMO.filter((r) => {
      return (
        !busqueda ||
        r.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.proyecto.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.tipo.toLowerCase().includes(busqueda.toLowerCase())
      );
    });
  }, [busqueda]);

  const handleDescargarSimulada = (reporteId) => {
    window.print();
  };

  return (
    <div className="space-y-4 font-sans p-1 sm:p-2">
      {/* 1. HEADER CORPORATIVO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Reportes Ejecutivos
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Informes Corporativos & PMO
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Generación de dossiers ejecutivos, minutas de comités y reportes comparativos de cartera.
          </p>
        </div>

        {/* ACCIONES DEL HEADER */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => handleTabChange("exportar")}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider px-4 h-9 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <Download size={15} />
            Exportar Informe
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
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Documentación Oficial</span>
          </div>
        </div>
      </div>

      {/* 3. VISTAS CONTEXTUALES */}
      {currentTab === "centro" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Fila única de 4 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Emitidos este Mes</span>
                  <span className="text-xl font-black text-gray-900 leading-none">28 informes</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-emerald-600 block">4 de directorio</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cobertura de Cartera</span>
                  <span className="text-xl font-black text-gray-900 leading-none">98% al día</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-emerald-600 block">Sin demoras</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Actas y Minutas</span>
                  <span className="text-xl font-black text-gray-900 leading-none">15 formalizadas</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-purple-600 block">Firmas validadas</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Plantillas PMO</span>
                  <span className="text-xl font-black text-gray-900 leading-none">6 estandarizadas</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-teal-600 block">Formatos PDF/Word</span>
              </div>
            </div>
          </div>

          {/* Barra de búsqueda */}
          <div className="flex justify-between items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
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

            <button
              type="button"
              onClick={() => handleTabChange("exportar")}
              className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 text-xs flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5 text-teal-600" />
              <span>Nueva Exportación</span>
            </button>
          </div>

          {/* Tabla de Reportes */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Código / Proyecto</th>
                    <th className="py-3 px-4">Título del Informe</th>
                    <th className="py-3 px-4">Tipo / Formato</th>
                    <th className="py-3 px-4">Autor / Responsable</th>
                    <th className="py-3 px-4">Fecha Emisión</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportesFiltrados.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-blue-700 block">{rep.id}</span>
                        <span className="text-[11px] font-bold text-gray-800 block truncate max-w-[150px]">{rep.proyecto}</span>
                        <span className="text-[10px] text-gray-400 block truncate max-w-[150px]">{rep.cliente}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900 max-w-sm">
                        {rep.titulo}
                        <div className="text-[10px] text-gray-400 mt-0.5">{rep.paginas} páginas • Estado: {rep.estado}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {rep.tipo}
                        </span>
                        <span className="text-[9.5px] font-black text-blue-600 block mt-0.5">{rep.formato}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-medium">
                        {rep.autor}
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-medium">
                        {rep.fecha}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDescargarSimulada(rep.id)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-gray-200 rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1 transition-all"
                          title="Descargar o imprimir reporte"
                        >
                          <Download size={13} className="text-teal-600" />
                          <span>Descargar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {currentTab === "proyecto" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">Dossier Ejecutivo Individual por Proyecto</h3>
                <p className="text-xs text-gray-500">Selecciona el proyecto para previsualizar el informe consolidado.</p>
              </div>
              <select
                value={proyectoSeleccionado}
                onChange={(e) => setProyectoSeleccionado(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
              >
                <option value="PRY-COT-TEST-001">PRY-COT-TEST-001 (Las Bambas)</option>
                <option value="231027A-MDZ-V-2023000030">231027A-MDZ (Mondelez)</option>
                <option value="184163A-SPCC-V-2018000155">184163A-SPCC (Southern Peru)</option>
                <option value="264011A-VALP-S-2026000033">264011A-VALP (Valero)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Avance Físico</span>
                <span className="text-lg font-black text-teal-700">95.0%</span>
                <span className="text-[10px] text-gray-500 block">Conforme a línea base</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Desempeño SPI / CPI</span>
                <span className="text-lg font-black text-emerald-700">1.00 / 1.02</span>
                <span className="text-[10px] text-gray-500 block">En presupuesto y tiempo</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Horas Hombre (HH)</span>
                <span className="text-lg font-black text-blue-700">1,420 HH</span>
                <span className="text-[10px] text-gray-500 block">Cero accidentes incapacitantes</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
              >
                <Printer size={14} />
                Generar Informe Ejecutivo PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {currentTab === "comparativo" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
            <h3 className="font-extrabold text-sm text-gray-900 mb-1">Ranking Comparativo de Desempeño de la Cartera</h3>
            <p className="text-xs text-gray-500 mb-4">
              Comparativa matricial de cumplimiento de plazo, rentabilidad proyectada y varianza de costo.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Proyecto</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3 text-center">Avance</th>
                    <th className="py-2.5 px-3 text-center">SPI</th>
                    <th className="py-2.5 px-3 text-center">CPI</th>
                    <th className="py-2.5 px-3 text-right">Rentabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                  <tr className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-extrabold text-teal-700">PRY-COT-TEST-001</td>
                    <td className="py-2.5 px-3">Minera Las Bambas S.A.</td>
                    <td className="py-2.5 px-3 text-center"><span className="text-emerald-700 font-black">95%</span></td>
                    <td className="py-2.5 px-3 text-center">1.00</td>
                    <td className="py-2.5 px-3 text-center">1.02</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-black">+18.5%</td>
                  </tr>
                  <tr className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-extrabold text-teal-700">231027A-MDZ-V</td>
                    <td className="py-2.5 px-3">MONDELEZ PERU S.A.</td>
                    <td className="py-2.5 px-3 text-center"><span className="text-emerald-700 font-black">95%</span></td>
                    <td className="py-2.5 px-3 text-center">0.98</td>
                    <td className="py-2.5 px-3 text-center">1.00</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-black">+15.2%</td>
                  </tr>
                  <tr className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-extrabold text-teal-700">184163A-SPCC-V</td>
                    <td className="py-2.5 px-3">SOUTHERN PERU COPPER</td>
                    <td className="py-2.5 px-3 text-center"><span className="text-emerald-700 font-black">95%</span></td>
                    <td className="py-2.5 px-3 text-center">0.95</td>
                    <td className="py-2.5 px-3 text-center">0.97</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-black">+12.8%</td>
                  </tr>
                  <tr className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-extrabold text-teal-700">264011A-VALP-S</td>
                    <td className="py-2.5 px-3">Valero Peru S.A.C</td>
                    <td className="py-2.5 px-3 text-center"><span className="text-emerald-700 font-black">95%</span></td>
                    <td className="py-2.5 px-3 text-center">0.95</td>
                    <td className="py-2.5 px-3 text-center">1.01</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-black">+14.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {currentTab === "exportar" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="max-w-2xl mx-auto space-y-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Centro de Generación de Documentos Formales</h2>
              <p className="text-xs text-gray-500">
                Selecciona la plantilla oficial corporativa para compilar y descargar minutas, dossieres o reportes de estado.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-gray-800">1. Seleccionar Plantilla Corporativa</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "directorio", label: "Informe de Directorio", desc: "Resumen ejecutivo con gráficos de EVM y avance" },
                  { id: "flash", label: "Reporte Flash Semanal", desc: "Monitoreo operativo de hitos y ruta crítica" },
                  { id: "cierre", label: "Acta de Cierre / Culpabilidad", desc: "Dossier formal de entrega y liquidación de contrato" },
                ].map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => setPlantillaSeleccionada(pl.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      plantillaSeleccionada === pl.id
                        ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <span className="font-extrabold text-gray-900 block">{pl.label}</span>
                    <span className="text-[10px] text-gray-500 mt-1 block">{pl.desc}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <label className="block font-bold text-gray-800 mb-1">2. Alcance del Reporte</label>
                <select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white text-xs">
                  <option value="todos">Toda la Cartera Activa (1,716 proyectos)</option>
                  <option value="prioritarios">Proyectos Prioritarios / Estratégicos</option>
                  <option value="riesgo">Proyectos en Alerta o con Desviación</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="block font-bold text-gray-800 mb-1">3. Formato de Salida</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 flex-1">
                    <input type="radio" name="formato" defaultChecked />
                    <span className="font-bold text-gray-800">Formato PDF Oficial (.pdf)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 flex-1">
                    <input type="radio" name="formato" />
                    <span className="font-bold text-gray-800">Documento Editable (.docx)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black shadow-md flex items-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Download size={15} />
                  Generar y Descargar Documento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

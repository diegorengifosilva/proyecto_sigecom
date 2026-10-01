import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  ShieldCheck,
  DollarSign,
  Coins,
  FileSpreadsheet
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

const REPORTES_COMPRAS_DEMO = [
  {
    id: "REP-CMP-2026-001",
    titulo: "Dossier Consolidado Mensual de Adquisiciones",
    proyecto: "Cartera General de Proyectos",
    cliente: "Directorio V&C Corporation",
    tipo: "Comité de Dirección",
    fecha: "2026-09-28",
    formato: "PDF",
    autor: "Diego Alexis Rengifo Silva",
    paginas: 24,
    estado: "APROBADO",
  },
  {
    id: "REP-CMP-2026-002",
    titulo: "Auditoría de Compras de Alto Valor (> $10,000 USD)",
    proyecto: "262129A-SPCC-P - SPCC Suministro Control",
    cliente: "SOUTHERN PERU COPPER CORPORATION",
    tipo: "Auditoría Especial",
    fecha: "2026-09-26",
    formato: "PDF",
    autor: "Lic. Compras y Logística",
    paginas: 8,
    estado: "EMITIDO",
  },
  {
    id: "REP-CMP-2026-003",
    titulo: "Balance de Rendición de Pasajes y Viáticos Operativos",
    proyecto: "Consolidado Minería e Industria",
    cliente: "Operaciones Mineras",
    tipo: "Control Financiero",
    fecha: "2026-09-25",
    formato: "WORD",
    autor: "Coordinación Administrativa",
    paginas: 14,
    estado: "EN_REVISION",
  },
  {
    id: "REP-CMP-2026-004",
    titulo: "Análisis de Curva de Gasto y Desvío Presupuestal de Suministros",
    proyecto: "262137A-ANGQ-V - Anglo American Quellaveco",
    cliente: "ANGLO AMERICAN QUELLAVECO S.A.",
    tipo: "EVM Adquisiciones",
    fecha: "2026-09-22",
    formato: "PDF",
    autor: "Jefatura de Finanzas y Costos",
    paginas: 16,
    estado: "APROBADO",
  },
  {
    id: "REP-CMP-2026-005",
    titulo: "Cierre Trimestral de Liquidaciones y Descargo Tributario",
    proyecto: "Todos los Centros de Costo",
    cliente: "Auditoría Tributaria SUNAT",
    tipo: "Tributario / Contable",
    fecha: "2026-09-18",
    formato: "EXCEL",
    autor: "Contabilidad Central",
    paginas: 32,
    estado: "APROBADO",
  }
];

const fetchProgramacion = async () => {
  const token = localStorage.getItem("access_token");
  const { data } = await api.get("compras/lista_programacion/", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export default function ComprasReportesEjecutivosHub({ defaultTab = "centro" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "centro";

  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const { data: dataProg } = useQuery({
    queryKey: ["compras-reportes-prog"],
    queryFn: fetchProgramacion,
    staleTime: 60000
  });

  const tablaProg = dataProg?.tabla || [];

  const reportesFiltrados = useMemo(() => {
    return REPORTES_COMPRAS_DEMO.filter((r) => {
      const matchTipo = filtroTipo === "TODOS" || r.tipo === filtroTipo;
      const matchEstado = filtroEstado === "TODOS" || r.estado === filtroEstado;
      const matchText =
        !busqueda ||
        r.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.proyecto.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.id.toLowerCase().includes(busqueda.toLowerCase());
      return matchTipo && matchEstado && matchText;
    });
  }, [filtroTipo, filtroEstado, busqueda]);

  const tabs = [
    {
      id: "centro",
      label: "Centro de Reportes Gerenciales",
      icon: FileText,
      badge: `${REPORTES_COMPRAS_DEMO.length}`,
    },
    {
      id: "proyecto",
      label: "Análisis de Costos por Proyecto",
      icon: FolderKanban,
      badge: "EVM",
    },
    {
      id: "comparativo",
      label: "Comparativa Sectorial y Tendencia",
      icon: BarChart3,
      badge: "Sectores",
    },
    {
      id: "exportar",
      label: "Generar Informes Oficiales",
      icon: Download,
      badge: "PDF / Word",
    },
  ];

  const handleDescargar = (rep, formato) => {
    toast.success(`Descargando "${rep.titulo}" en formato ${formato}...`);
  };

  const handleGenerarNuevo = (tipo) => {
    toast.info(`Generando nuevo informe ejecutivo: ${tipo}. Estará disponible en unos instantes.`);
  };

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col font-sans">
      {/* 1. ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">
              Reportes Ejecutivos de Compras
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Nivel Directivo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Dossiers consolidados, evaluación de costos EVM y exportación formal para la toma de decisiones
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            onClick={() => handleGenerarNuevo("Dossier Mensual")}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider px-4 h-9 rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Generar Dossier
          </Button>
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
            <span>Inteligencia de Negocio</span>
          </div>
        </div>
      </div>

      {/* 3. FILA ÚNICA DE 4 KPIS CONTEXTUALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Informes Emitidos</span>
              <span className="text-xl font-black text-gray-900 leading-none">
                {REPORTES_COMPRAS_DEMO.length}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-teal-600 block">Dossiers</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cartera Auditada</span>
              <span className="text-xl font-black text-blue-600 leading-none">$1.53M</span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-blue-600 block">USD</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Aprobación Directiva</span>
              <span className="text-xl font-black text-emerald-600 leading-none">100%</span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-emerald-600 block">Conforme</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Eficiencia Ahorro</span>
              <span className="text-xl font-black text-purple-600 leading-none">+8.4%</span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-purple-600 block">vs Meta</span>
          </div>
        </div>
      </div>

      {/* 4. CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
      {currentTab === "centro" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar informe, proyecto o cliente..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-hidden font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              {["TODOS", "Comité de Dirección", "Auditoría Especial", "EVM Adquisiciones"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFiltroTipo(t)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    filtroTipo === t
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200/70"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Reportes Ejecutivos */}
          <div className="space-y-3">
            {reportesFiltrados.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-xl border border-gray-200/80 hover:border-teal-300 hover:bg-slate-50/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-gray-900">{rep.titulo}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        {rep.formato}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {rep.estado}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      {rep.proyecto} • Cliente: <strong>{rep.cliente}</strong>
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1 font-medium">
                      <span>Código: {rep.id}</span>
                      <span>•</span>
                      <span>Fecha: {rep.fecha}</span>
                      <span>•</span>
                      <span>{rep.paginas} Páginas</span>
                      <span>•</span>
                      <span>Autor: {rep.autor}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    onClick={() => handleDescargar(rep, "PDF")}
                    variant="outline"
                    className="border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold px-3 h-8 rounded-lg flex items-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5 text-rose-600" />
                    PDF
                  </Button>
                  <Button
                    onClick={() => handleDescargar(rep, "Word")}
                    variant="outline"
                    className="border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold px-3 h-8 rounded-lg flex items-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5 text-blue-600" />
                    Word
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentTab === "proyecto" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-gray-900">Análisis EVM de Adquisiciones por Proyecto</h2>
              <p className="text-xs text-gray-500 font-medium">Evaluación presupuestal del gasto ejecutado vs base programada</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-[11px] font-black uppercase text-gray-500 border-b border-gray-200/80">
                <tr>
                  <th className="py-3 px-4">Código Proyecto</th>
                  <th className="py-3 px-4">Referencia / Obra</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4 text-right">Presupuestado</th>
                  <th className="py-3 px-4 text-right">Ejecutado</th>
                  <th className="py-3 px-4 text-right">Saldo</th>
                  <th className="py-3 px-4 text-center">Desvío</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tablaProg.slice(0, 10).map((row, idx) => {
                  const prog = parseFloat(row.programado || 0);
                  const ejec = parseFloat(row.ejecutado || 0);
                  const sal = parseFloat(row.saldo || (prog - ejec));
                  const pct = prog > 0 ? Math.round((ejec / prog) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-gray-900">{row.codigo || "--"}</td>
                      <td className="py-2.5 px-4 font-medium text-gray-700 max-w-xs truncate">{row.referencia || "--"}</td>
                      <td className="py-2.5 px-4 text-gray-600">{row.empresa || "--"}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-gray-900">
                        ${prog.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-teal-700">
                        ${ejec.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                        ${sal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pct > 100 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {pct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDescargar({ titulo: `Informe Costos ${row.codigo}` }, "PDF")}
                          className="text-teal-600 hover:text-teal-800 font-bold text-[11px] underline cursor-pointer"
                        >
                          Generar Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentTab === "comparativo" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 space-y-4">
          <h2 className="text-sm font-black text-gray-900">Distribución y Comparativa Sectorial</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { sector: "Minería", programado: 840000, ejecutado: 620000, saldo: 220000 },
                  { sector: "Industria", programado: 380000, ejecutado: 290000, saldo: 90000 },
                  { sector: "Petroquímica", programado: 210000, ejecutado: 145000, saldo: 65000 },
                  { sector: "Energía", programado: 102410, ejecutado: 75000, saldo: 27410 }
                ]}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="sector" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} />
                <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                <Bar dataKey="programado" fill="#cbd5e1" name="Base Programada" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ejecutado" fill="#14b8a6" name="Gasto Ejecutado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saldo" fill="#10b981" name="Remanente" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {currentTab === "exportar" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900">Generador de Informes Ejecutivos Oficiales</h2>
              <p className="text-xs text-gray-500 font-medium">Exportación con membrete institucional V&C Corporation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/20 transition-all flex flex-col justify-between">
              <div>
                <span className="font-bold text-gray-900 text-sm block">Informe Ejecutivo Mensual</span>
                <span className="text-xs text-gray-500 mt-1 block">Consolidado general de adquisiciones, órdenes de compra y estado de liquidaciones.</span>
              </div>
              <Button
                onClick={() => handleDescargar({ titulo: "Informe Ejecutivo Mensual" }, "PDF")}
                className="mt-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold w-full"
              >
                Generar PDF Directivo
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col justify-between">
              <div>
                <span className="font-bold text-gray-900 text-sm block">Reporte de Desviación Presupuestal</span>
                <span className="text-xs text-gray-500 mt-1 block">Análisis de sobrecostos, ahorros y saldos por frente de trabajo u obra.</span>
              </div>
              <Button
                onClick={() => handleDescargar({ titulo: "Reporte Desviación Presupuestal" }, "Excel")}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold w-full"
              >
                Generar Excel (.xlsx)
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/20 transition-all flex flex-col justify-between">
              <div>
                <span className="font-bold text-gray-900 text-sm block">Dossier de Auditoría de Compras</span>
                <span className="text-xs text-gray-500 mt-1 block">Relación de facturas, sustentos fiscales y rendiciones cerradas.</span>
              </div>
              <Button
                onClick={() => handleDescargar({ titulo: "Dossier Auditoría Compras" }, "Word")}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold w-full"
              >
                Generar Word (.docx)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

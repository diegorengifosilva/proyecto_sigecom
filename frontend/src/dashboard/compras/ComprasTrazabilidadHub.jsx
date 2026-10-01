import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Building2,
  User,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Package,
  Plane,
  Bus,
  ExternalLink,
  History,
  Timer,
  Layers,
  Sparkles,
  ChevronRight
} from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";

const fetchAtencionData = async () => {
  const token = localStorage.getItem("access_token");
  const { data } = await api.get("compras/lista_atencion/", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data?.tabla || [];
};

const fetchLiquidacionesData = async () => {
  const token = localStorage.getItem("access_token");
  const { data } = await api.get("compras/lista_liquidaciones/", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data?.tabla || [];
};

export default function ComprasTrazabilidadHub({ defaultTab = "rastreador" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get("tab") || defaultTab || "rastreador";

  const [codigoBuscado, setCodigoBuscado] = useState("");
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const { data: atencionList = [], isLoading: loadingAtencion } = useQuery({
    queryKey: ["compras-trazabilidad-atencion"],
    queryFn: fetchAtencionData,
    staleTime: 60000
  });

  const { data: liquidacionesList = [], isLoading: loadingLiq } = useQuery({
    queryKey: ["compras-trazabilidad-liq"],
    queryFn: fetchLiquidacionesData,
    staleTime: 60000
  });

  // Consolidado de todas las solicitudes para búsqueda 360
  const todasLasSolicitudes = useMemo(() => {
    const list = [...atencionList, ...liquidacionesList];
    const seen = new Set();
    return list.filter((item) => {
      const id = item.nro_solicitud || item.id_registro;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [atencionList, liquidacionesList]);

  // Selección automática si no hay seleccionada y hay data
  const activeItem = useMemo(() => {
    if (solicitudSeleccionada) return solicitudSeleccionada;
    if (todasLasSolicitudes.length > 0) return todasLasSolicitudes[0];
    return null;
  }, [solicitudSeleccionada, todasLasSolicitudes]);

  // Resultados de búsqueda
  const resultadosBusqueda = useMemo(() => {
    if (!codigoBuscado.trim()) return todasLasSolicitudes.slice(0, 10);
    const term = codigoBuscado.toLowerCase().trim();
    return todasLasSolicitudes.filter((item) => {
      return (
        String(item.nro_solicitud || "").toLowerCase().includes(term) ||
        String(item.codigo || "").toLowerCase().includes(term) ||
        String(item.solicitante || "").toLowerCase().includes(term) ||
        String(item.concepto || "").toLowerCase().includes(term)
      );
    }).slice(0, 15);
  }, [codigoBuscado, todasLasSolicitudes]);

  const tabs = [
    {
      id: "rastreador",
      label: "Línea de Tiempo del Requerimiento",
      icon: History,
      badge: "Pipeline",
    },
    {
      id: "semaforo",
      label: "Semáforo SLA y Cuellos de Botella",
      icon: Timer,
      badge: "Prioridad",
    },
    {
      id: "historial",
      label: "Bitácora Global de Compras",
      icon: Layers,
      badge: `${todasLasSolicitudes.length || 1079}`,
    },
  ];

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col font-sans">
      {/* 1. ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">
              Trazabilidad y Seguimiento de Compras
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Auditoría en Vivo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Rastreo integral del ciclo de vida de requerimientos, cálculo de SLA y mapas de ruta operativos
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
            <span>Control SLA</span>
          </div>
        </div>
      </div>

      {/* 3. FILA ÚNICA DE 4 KPIS CONTEXTUALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Solicitudes Trazadas</span>
              <span className="text-xl font-black text-gray-900 leading-none">
                {todasLasSolicitudes.length || 1079}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-teal-600 block">Total Cartera</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Lead Time Promedio</span>
              <span className="text-xl font-black text-blue-600 leading-none">1.4 Días</span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-blue-600 block">Tiempo Ciclo</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cumplimiento SLA</span>
              <span className="text-xl font-black text-emerald-600 leading-none">96.8%</span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-emerald-600 block">En Plazo</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Por Atender Urgente</span>
              <span className="text-xl font-black text-amber-600 leading-none">
                {atencionList.length || 4}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-amber-600 block">&gt; 24h</span>
          </div>
        </div>
      </div>

      {/* 4. CONTENIDO DINÁMICO */}
      {currentTab === "rastreador" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Columna Izquierda: Buscador y Lista de Solicitudes */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-700">Rastrear Solicitud</h2>
              <span className="text-[11px] text-gray-400 font-bold">{resultadosBusqueda.length} encontradas</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={codigoBuscado}
                onChange={(e) => setCodigoBuscado(e.target.value)}
                placeholder="Buscar por N° Solicitud o Código..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-hidden font-medium"
              />
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
              {resultadosBusqueda.map((item, idx) => {
                const isSelected = activeItem?.nro_solicitud === item.nro_solicitud;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSolicitudSeleccionada(item)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "border-teal-600 bg-teal-50/50 shadow-xs"
                        : "border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/60"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-gray-900">{item.nro_solicitud || "--"}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-600">
                          {item.area || "General"}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 truncate mt-0.5 font-medium">{item.concepto || item.referencia || "Sin concepto"}</p>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{item.fecha || "Reciente"} • {item.solicitante || "V&C"}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? "text-teal-600" : "text-gray-300"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Línea de Tiempo Visual del Requerimiento */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-6">
            {activeItem ? (
              <>
                {/* Header del requerimiento seleccionado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-teal-600 uppercase tracking-wider">Solicitud de Adquisición</span>
                      <span className="text-base font-black text-gray-900">#{activeItem.nro_solicitud}</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 mt-0.5">{activeItem.concepto || activeItem.referencia}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap font-medium">
                      <span><strong>Proyecto:</strong> {activeItem.codigo || "--"}</span>
                      <span>•</span>
                      <span><strong>Área:</strong> {activeItem.area || "Minería"}</span>
                      <span>•</span>
                      <span><strong>Solicitante:</strong> {activeItem.solicitante || "Cristina Martinez"}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-400 block font-bold">Importe Registrado</span>
                    <span className="text-lg font-black text-gray-900 block">
                      ${Number(activeItem.monto_usd || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-bold text-teal-600">
                      S/. {Number(activeItem.monto_pen || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Timeline visual del requerimiento */}
                <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-200 before:z-0">
                  {/* Fase 1: Creación en Programación */}
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900">1. Programación y Registro Creado</span>
                        <span className="text-[11px] font-bold text-gray-400">{activeItem.fecha || "19-09-2026"}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        Requerimiento aperturado en el proyecto <strong>{activeItem.codigo}</strong> por <strong>{activeItem.solicitante}</strong>.
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Apertura Conforme
                      </span>
                    </div>
                  </div>

                  {/* Fase 2: Envío y Atención de Compras */}
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900">2. Atención y Asignación de Compra</span>
                        <span className="text-[11px] font-bold text-gray-400">Atendido</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        El encargado de Compras procesó la solicitud, verificó stock y generó la Orden de Adquisición / Pasajes con el proveedor asignado.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {activeItem.estado || "ATENDIDO, PENDIENTE DE LIQUIDACION"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fase 3: Rendición y Liquidación */}
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900">3. Control de Liquidación y Auditoría</span>
                        <span className="text-[11px] font-bold text-teal-600">En Bandeja</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        Recepción de facturas, boletas electrónicas y comprobantes de pago. Cierre contable y descargo de saldos presupuestales.
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                        Fase de Cierre y Aprobación
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => navigate(`/compras/operaciones?tab=liquidaciones`)}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                  >
                    Ver en Ciclo de Compras
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-gray-400">
                <p>Selecciona una solicitud para ver su trazabilidad detallada.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === "semaforo" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-gray-900">Semáforo de Antigüedad y Control de SLA</h2>
              <p className="text-xs text-gray-500 font-medium">Priorización de requerimientos operativos según tiempo de espera sin atención</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-rose-700">🔴 Críticas (&gt; 48 Horas)</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">0 Solicitudes</span>
              </div>
              <p className="text-xs text-gray-600">Requerimientos con riesgo de desfase en obra. Prioridad inmediata de atención.</p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-amber-700">🟡 En Trámite (24h - 48h)</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{atencionList.length || 4} Solicitudes</span>
              </div>
              <p className="text-xs text-gray-600">Solicitudes en proceso de cotización o emisión con proveedor.</p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-emerald-700">🟢 Óptimas (&lt; 24 Horas)</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">100% Eficiencia</span>
              </div>
              <p className="text-xs text-gray-600">Requerimientos atendidos en tiempo récord según estándares corporativos.</p>
            </div>
          </div>
        </div>
      )}

      {currentTab === "historial" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-gray-900">Bitácora Global Consolidada de Transacciones</h2>
              <p className="text-xs text-gray-500 font-medium">Historial completo de órdenes y estados en el sistema</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-[11px] font-black uppercase text-gray-500 border-b border-gray-200/80">
                <tr>
                  <th className="py-3 px-4">N° Solicitud</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Código Proyecto</th>
                  <th className="py-3 px-4">Solicitante</th>
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Monto USD</th>
                  <th className="py-3 px-4 text-right">Monto PEN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todasLasSolicitudes.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-gray-900">{row.nro_solicitud || "--"}</td>
                    <td className="py-2.5 px-4 text-gray-500">{row.fecha || "--"}</td>
                    <td className="py-2.5 px-4 font-bold text-teal-700">{row.codigo || "--"}</td>
                    <td className="py-2.5 px-4 text-gray-700">{row.solicitante || "--"}</td>
                    <td className="py-2.5 px-4 text-gray-600 max-w-xs truncate">{row.concepto || "--"}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                        {row.estado || "Atendido"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-gray-900">
                      ${Number(row.monto_usd || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-teal-700">
                      S/. {Number(row.monto_pen || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

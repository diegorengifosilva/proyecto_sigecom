// frontend/src/dashboard/aprobacion_cotizacion/AprobacionCotizacion.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { BriefcaseBusiness, FilePlus, Eye, TrendingUp, DollarSign, BarChart3, Filter, Loader, PieChart, Calculator, FileSpreadsheet, Wallet2, Landmark, Scale, Coins, User, MoreHorizontal, ClipboardCheck, LayoutDashboard, History, Globe, ListTodo, Layout, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Table from "@/components/ui/table";
import KpiCard from "@/components/ui/KpiCard";
import FilterCard from "@/components/ui/FilterCard";
import { motion, useScroll, useTransform } from "framer-motion";
import { getEnvioColor, getEnvioNombre, ENVIO_STATE_COLORS } from "@/components/ui/colors";
import AprobacionCotizacionModal from "../aprobacion_cotizacion/AprobacionCotizacionModal";
import { useNavigate } from "react-router-dom";
import CotizacionNuevaModal from "../aprobacion_cotizacion/CotizacionNuevaModal";
import TablaCoti from "../../components/TablaCoti";
import TablaHistorial from "../../components/TablaHistorial";
import KpisCotizaciones from "../../components/KpisCotizaciones";

const fetchCotizacionesAprobacion = async ({ queryKey }) => {
  const [_key, params] = queryKey;

  const token = localStorage.getItem("access_token");

  const usuarioRes = await api.get("users/usuario-actual/", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const nombUsuario = usuarioRes.data?.usuario;

  const { data } = await api.get(
    "cotizaciones/lista_cotizaciones/",
    {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        ...params,
        usuario: nombUsuario,
      },
    }
  );

  const tabla = Array.isArray(data?.tabla) ? data.tabla : [];

  const dataLimpia = tabla
    .filter(i => i.regus?.trim().toUpperCase() === nombUsuario?.trim().toUpperCase())

  return {
    cotizaciones: dataLimpia,
    stats: data.dashboard || {},
  };
};

export default function Cotizaciones() {
  const { authUser: user, logout } = useAuth();
  const [filtro, setFiltro] = useState("Todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const navigate = useNavigate();
  const [openNueva, setOpenNueva] = useState(false);
  const [annoActual, setAnnoActual] = useState(new Date().getFullYear()); // año actual por defecto
  const [processingFilters, setProcessingFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({
    anno: new Date().getFullYear(), // año actual
    mes: "%",                        // todos los meses por defecto
    cliente: "%",                    // todos los clientes
    estado: "%",                     // todos los estados
    area: "%",                        // todas las áreas
    envio: "%",                       // todos los envíos
    num_reg: "",                      // opcional: número de registro específico
    campo: "",                        // campo específico para búsqueda flexible
    valor: "",                        // valor para el campo específico
    generalCampo: "",                 // búsqueda general tipo CAJA CHICA
    generalValor: "",                 // valor de búsqueda general
    index: 1,                         // página actual si implementas paginación
    num_regs: 10,                     // cantidad de registros por página
  });
  const [clientesMap, setClientesMap] = useState({});
  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["cotizaciones", currentFilters],
    queryFn: fetchCotizacionesAprobacion,
    keepPreviousData: true,
  });
  const cotizaciones = data?.cotizaciones || [];
  const stats = data?.stats || {};

  const { scrollY } = useScroll();
  const shadowOpacity = useTransform(scrollY, [0, 50], [0, 0.25]);
  const blurValue = useTransform(scrollY, [0, 100], [4, 8]);

  const [tabActiva, setTabActiva] = useState("cotizaciones");

  // Efecto scroll flotante
  useEffect(() => {
    const onScroll = () => {
      shadowOpacity.set(Math.min(window.scrollY / 150, 0.2));
      blurValue.set(Math.min(window.scrollY / 100, 8));
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [shadowOpacity, blurValue]);

  const cotizacionesFiltradas = cotizaciones
    .filter((c) => {
      const pasaEstado = filtro === "Todos" || c.estado_nombre === filtro;
      const pasaFecha =
        (!fechaInicio || new Date(c.cotif) >= new Date(fechaInicio)) &&
        (!fechaFin || new Date(c.cotif) <= new Date(fechaFin));
      return pasaEstado && pasaFecha;
    })
    .sort((a, b) => new Date(b.cotif) - new Date(a.cotif));

  // Mapeo  de Clientes
  useEffect(() => {
    const fetchClientes = async () => {
      const res = await api.get("/core/clientes/");
      const map = {};
      res.data.forEach(c => {
        map[c.codigo] = c.nombre;
      });
      setClientesMap(map);
    };

    fetchClientes();
  }, []);

  // =========
  // REPORTE
  // =========
  const windowsOpen = (url, alto = 980, ancho = 600) => {
    const left = (screen.width - alto) / 2;
    const top = (screen.height - ancho) / 2;

    const specs = `resizable=yes,location=1,status=1,scrollbars=yes,width=${alto},height=${ancho},top=${top},left=${left}`;

    const popup = window.open(url, "reporte", specs);
    if (popup) popup.focus();
  };

  // ----------------------------------------------------
  // 📊 Reporte Cotizaciones por Área (Dashboard)
  // ----------------------------------------------------
  const handleReport = (filters) => {
    if (!filters) return;

    const params = {
      anno: filters.anio || annoActual,
      mes: filters.mes || "%",
      estado: filters.estado || "%",
    };

    const API_URL = import.meta.env.VITE_API_URL;
    const query = new URLSearchParams(params).toString();

    windowsOpen(
      `${API_URL}/cotizaciones/reportes/reporte_cotizaciones_dashboard_html/?${query}`,
      980,
      600
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col bg-gray-50 font-sans"
    >
      <div className="flex-1 flex flex-col">

        {/* HEADER ESTILO ERP COMPACTO */}
        <motion.div
          style={{
            boxShadow: shadowOpacity.get() > 0 ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
            backdropFilter: `blur(${blurValue.get()}px)`,
          }}
          className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 pt-4 flex flex-col gap-1"
        >

          {/* TOP */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            {/* IZQUIERDA */}
            <div className="flex-1 min-w-0">

              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                <span className="hover:text-cyan-600 cursor-pointer transition-colors">Comercial</span>
                <span>/</span>
                <span>Cotizaciones</span>
              </nav>

              {/* Título */}
              <div className="flex items-center gap-2">
                <div className="bg-cyan-600/10 text-cyan-700 w-7 h-7 rounded-md flex items-center justify-center shrink-0">
                  <BriefcaseBusiness className="w-4 h-4" />
                </div>

                <h1 className="text-lg font-semibold text-slate-800 tracking-tight truncate">
                  Cotizaciones
                </h1>
              </div>
            </div>


            {/* ACCIONES DINÁMICAS */}
            <div className="flex items-center gap-2">

              <Button
                onClick={() => setOpenNueva(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium px-4 h-8 rounded-md flex items-center gap-2 shadow-sm transition"
              >
                <FilePlus size={14} />
                Nueva
              </Button>

              <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* SUBNAV ESTILO JIRA */}
          <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar">
            {[
              { id: "resumen", label: "Resumen", icon: <Globe size={16} /> },
              { id: "cotizaciones", label: "Cotizaciones", icon: <ListTodo size={16} /> },
              { id: "tablero", label: "Tablero", icon: <Layout size={16} /> },
              /* { id: "historial", label: "Historial", icon: <History size={16} /> },*/
            ].map((tab) => {
              const isActive = tabActiva === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`group relative flex items-center gap-2 px-3 pb-3 text-sm font-medium transition-all outline-none ${isActive
                    ? "text-cyan-600"
                    : "text-slate-600 hover:bg-slate-50 rounded-t-sm"
                    }`}
                >
                  {/* Icono con color dinámico */}
                  <span className={`${isActive ? "text-cyan-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                    {tab.icon}
                  </span>

                  <span>{tab.label}</span>

                  {/* Indicador Activo (Línea azul de Jira) */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[3px] bg-cyan-600 rounded-t-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                </button>
              );
            })}

            {/* Botón "+" de Jira para añadir más tabs */}
            <button className="p-1.5 mb-2 ml-1 text-slate-500 hover:bg-slate-100 rounded transition-colors">
              <Plus size={18} />
            </button>
          </div>
        </motion.div>

        {/* CONTENIDO DINÁMICO */}
        <div className="p-6 flex flex-col flex-1 gap-6">
          {tabActiva === "resumen" && (
            <KpisCotizaciones
              stats={stats}
              isFetching={isFetching}
            />
          )}

          {tabActiva === "cotizaciones" && (
            <TablaCoti
              data={cotizacionesFiltradas}
              clientesMap={clientesMap}
              isFetching={isFetching}
              onRowClick={(c) => {
                setCotizacionSeleccionada(c);
                setDetalleOpen(true);
              }}
              getEnvioColor={getEnvioColor}
              getEnvioNombre={getEnvioNombre}

              // 1. Cálculo de filtros activos para el Badge del botón
              activeFiltersCount={Object.values(currentFilters).filter(v => v !== "%" && v !== "" && v !== annoActual).length}

              // 2. Acción de limpiar
              onClearFilters={() => setCurrentFilters({
                anno: new Date().getFullYear(),
                mes: "%", cliente: "%", estado: "%", area: "%", envio: "%",
                campo: "", valor: "", generalCampo: "", generalValor: "",
                index: 1, num_regs: 10
              })}

              // 3. El componente inyectado (Desnudado para el Popover)
              filterComponent={
                <FilterCard
                  dashboard="cotizaciones"
                  className="w-full"
                  compact
                  processing={processingFilters}
                  onReport={handleReport}
                  onProcess={async (filters, event) => {
                    if (event) event.preventDefault();
                    setProcessingFilters(true);
                    try {
                      const params = {
                        anno: filters.anio || annoActual,
                        mes: filters.mes || "%",
                        cliente: filters.cliente || "%",
                        estado: filters.estado || "%",
                        area: filters.area || "%",
                        envio: filters.envio || "%",
                        ...(filters.campo && filters.valor
                          ? {
                            campo: filters.campo,
                            valor: filters.valor,
                          }
                          : {}),
                        ...(filters.fechaInicio ? { fechaInicio: filters.fechaInicio } : {}),
                        ...(filters.fechaFin ? { fechaFin: filters.fechaFin } : {}),
                      };

                      setCurrentFilters(params); // 🔥 esto dispara el refetch automático
                    } finally {
                      setProcessingFilters(false);
                    }
                  }}
                />
              }
            />
          )}

          {tabActiva === "historial" && <TablaHistorial />}
        </div>

        {/* SECCIÓN KPIs - V&C BUSINESS INTELLIGENCE */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-10 w-full">
          {isFetching && (
            <div className="absolute inset-0 z-20 bg-white/40 backdrop-blur-[2px] rounded-[2.5rem] flex items-center justify-center">
              <Loader className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          )}

          {[
            {
              label: "Total Cotizaciones",
              value: stats.total || cotizaciones.length,
              icon: FileSpreadsheet, // Más específico para documentos
              category: "Cantidad",
              unit: "Cotizaciones",
              bg: "bg-blue-50",
              text: "text-blue-700",
              border: "border-blue-100",
              iconBg: "bg-blue-100/60",
            },
            {
              label: "Monto Total S/.",
              value: stats.montoTotalSoles || 0,
              icon: Wallet2, // Icono de billetera/capital
              category: "Ingresos PEN",
              unit: "Soles",
              bg: "bg-emerald-50",
              text: "text-emerald-700",
              border: "border-emerald-100",
              iconBg: "bg-emerald-100/60",
            },
            {
              label: "Monto Total $",
              value: stats.montoTotalDolares || 0,
              icon: Landmark, // Icono de tesorería/divisas
              category: "Ingresos USD",
              unit: "Dólares",
              bg: "bg-violet-50",
              text: "text-violet-700",
              border: "border-violet-100",
              iconBg: "bg-violet-100/60",
            },
            {
              label: "Promedio S/.",
              value: stats.promedioSoles || 0,
              icon: Scale, // Icono de equilibrio/promedio
              category: "Ratio PEN",
              unit: "Soles",
              bg: "bg-rose-50",
              text: "text-rose-700",
              border: "border-rose-100",
              iconBg: "bg-rose-100/60",
            },
            {
              label: "Promedio $",
              value: stats.promedioDolares || 0,
              icon: Coins, // Icono de monedas
              category: "Ratio USD",
              unit: "Dólares",
              bg: "bg-amber-50",
              text: "text-amber-700",
              border: "border-amber-100",
              iconBg: "bg-amber-100/60",
            },
          ].map((kpi, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className={`
                relative overflow-hidden p-6
                rounded-[2.2rem] border shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]
                flex flex-col justify-between min-h-[150px]
                ${kpi.bg} ${kpi.border} transition-all duration-300
              `}
            >
              {/* HEADER DEL KPI: Icono y Categoría Dinámica */}
              <div className="flex justify-between items-start relative z-10">
                <div className={`p-3 rounded-2xl ${kpi.iconBg} shadow-sm`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.text}`} strokeWidth={2.5} />
                </div>
                <div className={`px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${kpi.border} bg-white/50 ${kpi.text}`}>
                  {kpi.category}
                </div>
              </div>

              {/* CUERPO DEL KPI: Valor y Etiqueta */}
              <div className="mt-3 relative z-10">
                <p className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${kpi.text}`}>
                  {kpi.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className={`text-3xl font-[950] tracking-tighter leading-none ${kpi.text}`}>
                    {typeof kpi.value === 'number'
                      ? kpi.value.toLocaleString('es-PE', { minimumFractionDigits: kpi.label.includes('Promedio') ? 2 : 0 })
                      : kpi.value}
                  </h3>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${kpi.text} opacity-40`}>
                    {kpi.unit}
                  </span>
                </div>
              </div>

              {/* DECORACIÓN FONDO: Micro-patrón de seguridad */}
              <div className={`absolute -right-2 -bottom-2 opacity-[0.08] ${kpi.text}`}>
                <kpi.icon className="w-24 h-24 rotate-[15deg]" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* FILTROS */}
        <div className="w-full mb-4">
          <FilterCard
            dashboard="cotizaciones"
            className="w-full"
            compact
            processing={processingFilters}
            onReport={handleReport}
            onProcess={async (filters, event) => {
              if (event) event.preventDefault();
              setProcessingFilters(true);
              try {
                const params = {
                  anno: filters.anio || annoActual,
                  mes: filters.mes || "%",
                  cliente: filters.cliente || "%",
                  estado: filters.estado || "%",
                  area: filters.area || "%",
                  envio: filters.envio || "%",
                  ...(filters.campo && filters.valor
                    ? {
                      campo: filters.campo,
                      valor: filters.valor,
                    }
                    : {}),
                  ...(filters.fechaInicio ? { fechaInicio: filters.fechaInicio } : {}),
                  ...(filters.fechaFin ? { fechaFin: filters.fechaFin } : {}),
                };

                setCurrentFilters(params); // 🔥 esto dispara el refetch automático
              } finally {
                setProcessingFilters(false);
              }
            }}
          />
        </div>

        {/* TABLA DE COTIZACIONES - V&C ENTERPRISE DEFINITIVE */}
        <div className="hidden md:block w-full flex-1 overflow-auto relative rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          {isFetching && (
            <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[2px] flex items-center justify-center transition-all">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Loader className="w-10 h-10 animate-spin text-teal-600" />
                  <div className="absolute inset-0 rounded-full border-4 border-teal-100 opacity-20"></div>
                </div>
                <span className="text-[10px] font-[900] text-slate-500 uppercase tracking-[0.25em] animate-pulse">
                  Sincronizando Datos
                </span>
              </div>
            </div>
          )}

          <Table
            /* CABECERAS: Estilo "High-Contrast Enterprise" */
            headers={[
              "Fecha",
              "Cotización",
              "Referencia",
              "Cliente / Representante",
              "Área",
              "Estado",
              "Importe",
              "",
              ""
            ].map(h => (
              <span className="text-sm font-[950] uppercase tracking-[0.2em] text-slate-800 text-center block">
                {h}
              </span>
            ))}

            data={cotizacionesFiltradas}

            /* 👉 CLICK EN TODA LA FILA */
            onRowClick={(c) => {
              setCotizacionSeleccionada(c);
              setDetalleOpen(true);
            }}

            renderRow={(c) => [
              // 1. FECHA
              <span className="text-xs font-semibold text-slate-800 tabular-nums text-left leading-none">
                {c.fecha}
              </span>,

              // 2. COTIZACIÓN
              <span className="text-xs font-semibold text-slate-800 text-left tracking-tight uppercase leading-none">
                {c.numero}
              </span>,

              // 3. REFERENCIA
              <span
                className="text-xs text-slate-800 font-semibold text-left truncate max-w-[400px] block leading-none"
                title={c.referencia}
              >
                {c.referencia || "—"}
              </span>,

              // 4. CLIENTE / REPRESENTANTE
              <div className="flex flex-col py-1 max-w-[300px] text-left leading-tight">
                <span className="text-xs font-semibold text-slate-800 uppercase tracking-tight">
                  {clientesMap[c.cliente_codigo] ?? "No Identificado"}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-teal-400" />
                  <span className="text-[9px] font-bold text-teal-600/80 uppercase tracking-wide">
                    {c.cliente_nombre || "Sin asignar"}
                  </span>
                </div>
              </div>,

              // 5. ÁREA
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-tight text-left bg-slate-50 px-2 py-[2px] rounded-md border border-slate-100">
                {c.area_nombre}
              </span>,

              // 6. ESTADO
              <span className="text-xs font-semibold uppercase tracking-wide text-left text-slate-800 leading-none">
                {c.estado_nombre}
              </span>,

              // 7. IMPORTE
              <div className="text-left py-1">
                <span className="text-xs font-bold text-slate-800 tabular-nums">
                  {c.tot_c}
                </span>
              </div>,

              // 8. BOTÓN — evita doble trigger
              <div className="flex justify-start">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCotizacionSeleccionada(c);
                      setDetalleOpen(true);
                    }}
                    className="h-7 w-7 p-0 rounded-2xl bg-white hover:bg-teal-50 text-slate-400 hover:text-teal-600 border border-transparent hover:border-teal-100 transition-all shadow-none hover:shadow-sm"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>,

              // 9. ENVÍO
              <div className="flex items-center justify-start">
                <div
                  className="w-3.5 h-3.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] border border-white ring-1 ring-slate-200"
                  style={{ backgroundColor: getEnvioColor(c.envio) }}
                  title={getEnvioNombre(c.envio)}
                />
              </div>,
            ]}
          />
        </div>

        {/* CARDS MOBILE */}
        <div className="flex flex-col gap-3 md:hidden">
          {cotizacionesFiltradas.map(c => (
            <motion.div
              key={c.numero}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200"
              onClick={() => { setCotizacionSeleccionada(c); setDetalleOpen(true); }}
            >
              <div className="font-semibold text-[clamp(0.9rem,2vw,1.1rem)]">{c.numero}</div>
              <div className="mt-2 flex flex-col gap-1 text-gray-600 text-[clamp(0.65rem,1.5vw,0.85rem)]">
                <div className="flex justify-between"><span>Fecha:</span><span>{c.fecha}</span></div>
                <div className="flex justify-between"><span>Referencia:</span><span>{c.referencia}</span></div>
                <div className="flex justify-between"><span>Cliente:</span><span>{c.cliente_nombre}</span></div>
                <div className="flex justify-between"><span>Área:</span><span>{c.area_nombre}</span></div>
                <div className="flex justify-between"><span>Estado:</span><span>{c.estado_nombre}</span></div>
                <div className="flex justify-between"><span>Importe:</span><span>{c.tot_c}</span></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* LEYENDA DE ESTADOS */}
        <div className="
          flex flex-wrap 
          justify-center md:justify-start 
          items-center 
          gap-3 md:gap-4 
          p-3 
          mt-4 
          rounded-xl 
          border border-gray-200 
          bg-white 
          shadow-sm 
          w-full
        ">
          {[
            { label: "Pendiente de Envio para Revision", color: ENVIO_STATE_COLORS["0"] },
            { label: "Pendiente de Envio para Aprobacion", color: ENVIO_STATE_COLORS["1"] },
            { label: "Pendiente de Envio para Cliente", color: ENVIO_STATE_COLORS["2"] },
            { label: "Enviado al Cliente", color: ENVIO_STATE_COLORS["3"] },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2 min-w-[120px] md:min-w-[140px]">
              <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: color }}></span>
              <span className="text-gray-600 truncate text-xs md:text-[clamp(0.65rem, 1vw, 1rem)]">{label}</span>
            </div>
          ))}
        </div>

        {/* MODAL */}
        <CotizacionNuevaModal
          open={openNueva}
          onClose={() => setOpenNueva(false)}
          modo="C"
          tipo="N"
          dashboard="C"
        />

        {cotizacionSeleccionada && (
          <AprobacionCotizacionModal
            key={cotizacionSeleccionada.num_reg}
            open={detalleOpen}
            onClose={() => setDetalleOpen(false)}
            cotizacion={cotizacionSeleccionada}
            modo="C"
            tipo="V"
            dashboard="C"
          />
        )}
      </div>
    </motion.div>
  );
}

// frontend/src/dashboard/aprobacion_cotizacion/AprobacionCotizacion.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { BriefcaseBusiness, FilePlus, Eye, TrendingUp, DollarSign, BarChart3, Filter, Loader, Calculator, FileSpreadsheet, Wallet2, Landmark, Scale, Coins, User, MoreHorizontal, ClipboardCheck, LayoutDashboard, History, Globe, ListTodo, Layout, Plus, ArrowUpRight, Cpu, Award, FileText, FolderCheck, CalendarRange, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Table from "@/components/ui/table";
import KpiCard from "@/components/ui/KpiCard";
import FilterCard from "@/components/ui/FilterCard";
import { motion, useScroll, useTransform } from "framer-motion";
import { getEnvioColor, getEnvioNombre, ENVIO_STATE_COLORS } from "@/components/ui/colors";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import DashboardBoard from "../../board/DashboardBoard";
import TablaCoti from "../../../components/TablaCoti";
import TablaHistorial from "../../../components/TablaHistorial";
import KpisCotizaciones from "../../../components/KpisCotizaciones";
import ResumenDashboard from "./ResumenDashboard";
import RendimientoDashboard from "./rendimiento/RendimientoDashboard";
import AnalisisComercial from "./analisis/AnalisisDashboard";
import GraficoDinamico from "./analisis/GraficoDinamico";
import AutomatizacionDashboard from "./automatizacion/AutomatizacionDashboard";
import KpisResumen from "./resumen/KpisResumen";
import KpisLogistica from "./resumen/KpisLogistica";
import VcAiInsights from "./resumen/VcAiInsights";
import { FilterDropdown, ERPButton } from "@/components/ui/ERPComponents";

export default function CotizacionesHome() {
  const { authUser: user, logout } = useAuth();
  const activeModule = "comercial";
  const [cotizaciones, setCotizaciones] = useState([]);
  const [viewScope, setViewScope] = useState("global");
  const [stats, setStats] = useState({});
  const [filtro, setFiltro] = useState("Todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [clientes, setClientes] = useState([]);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const navigate = useNavigate();
  const [openNueva, setOpenNueva] = useState(false);
  const [annoActual, setAnnoActual] = useState(new Date().getFullYear()); // año actual por defecto
  const [processingFilters, setProcessingFilters] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
    num_regs: 10000,                     // cantidad de registros por página
  });
  const [clientesMap, setClientesMap] = useState({});
  const {
    data: queryData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["cotizaciones", currentFilters, viewScope],
    queryFn: () => fetchCotizaciones({ ...currentFilters, personal: viewScope === "personal" }),
    keepPreviousData: true,
    staleTime: 60 * 1000, // Cache de 1 minuto para cotizaciones filtradas
    cacheTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (queryData) {
      setCotizaciones(queryData.cotizaciones || []);
      setStats(queryData.stats || {});
    }
  }, [queryData]);

  const {
    data: cotizacionesAnualData,
  } = useQuery({
    queryKey: ["cotizacionesAnual", currentFilters.anno, viewScope],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("access_token");
        const { data: resData } = await api.get("cotizaciones/lista_cotizaciones/", {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            anno: currentFilters.anno,
            mes: "%",
            personal: viewScope === "personal",
            incluir_oportunidades: true,
            num_regs: 10000
          }
        });
        const list = resData.tabla || resData.results || [];
        const cleaned = list.map(item => ({
          ...item,
          id_registro: item.id_registro || item.num_reg,
          codigo: item.codigo || "",
          fecha: item.fecha || item.cotif,
          cliente: item.cliente_nombre || item.cliente || "-",
          comercial_nombre: item.comercial_nombre || "-",
          comercial_dni: item.comercial_dni || "",
          id_comercial: item.id_comercial || null,
          visita_tecnica: item.visita_tecnica || null,
          fecha_limite: item.fecha_limite || null,
          estado_nombre: item.estado?.trim() || "-",
        }));
        return {
          cotizaciones: cleaned,
          alertas: resData.alertas_agendadas || []
        };
      } catch (e) {
        console.error(e);
        return { cotizaciones: [], alertas: [] };
      }
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // Cache de 5 minutos para cotizaciones anuales
    cacheTime: 10 * 60 * 1000
  });

  const {
    data: aperturasAnualData,
  } = useQuery({
    queryKey: ["aperturasAnual", currentFilters.anno],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("access_token");
        const { data: resData } = await api.get("cotizaciones/lista_aperturas/", {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            anno: currentFilters.anno,
            mes: "%",
            num_regs: 10000
          }
        });
        return resData.tabla || resData.results || [];
      } catch (e) {
        console.error("Error cargando aperturas:", e);
        return [];
      }
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // Cache de 5 minutos para aperturas anuales
    cacheTime: 10 * 60 * 1000
  });

  const {
    data: resumenComercialData,
    isLoading: isLoadingResumen,
    isFetching: isFetchingResumen,
  } = useQuery({
    queryKey: ["resumenComercial", currentFilters.anno, currentFilters.mes, viewScope],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("access_token");
        const { data } = await api.get("dashboard/resumen_comercial/", {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            anno: currentFilters.anno,
            mes: currentFilters.mes,
            personal: viewScope === "personal" ? "true" : "false"
          }
        });
        return data;
      } catch (err) {
        console.error("Error cargando datos consolidados del dashboard:", err);
        return null;
      }
    },
    keepPreviousData: true,
    staleTime: 60 * 1000, // Cache de 1 minuto para KPIs y tendencias dinámicas
    cacheTime: 5 * 60 * 1000
  });

  const { scrollY } = useScroll();
  const shadowOpacity = useTransform(scrollY, [0, 50], [0, 0.25]);
  const blurValue = useTransform(scrollY, [0, 100], [4, 8]);

  const [tabActiva, setTabActiva] = useState("resumen");
  const [areas, setAreas] = useState([]);

  // Fetch cotizaciones con filtro por año actual
  const fetchCotizaciones = useCallback(async (params = { anno: annoActual }) => {
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await api.get("cotizaciones/lista_cotizaciones/", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const tabla = Array.isArray(data?.tabla) ? data.tabla : [];
      const dashboard = data?.dashboard || {};

      const dataLimpia = tabla.map((item) => ({
        ...item,
        cliente: item.cliente_nombre || item.cliente || "-",
        area: item.area_nombre || item.area || "-",
        estado: item.estado_nombre || item.estado || "-",
      }));

      dataLimpia.sort((a, b) => {
        const fechaA = a.fecha ? new Date(a.fecha) : new Date(0);
        const fechaB = b.fecha ? new Date(b.fecha) : new Date(0);
        if (fechaB - fechaA !== 0) return fechaB - fechaA;
        return (b.numero || "").localeCompare(a.numero || "");
      });

      setCotizaciones(dataLimpia);
      setStats(dashboard);
      return { cotizaciones: dataLimpia, stats: dashboard };
    } catch (e) {
      console.error("Error cargando cotizaciones:", e);
      if (e?.response?.status === 401) logout();
      toast.error("Error cargando las cotizaciones.");
      return { cotizaciones: [], stats: {} };
    }
  }, [annoActual, logout]);

  // ==========================
  // CARGAR AREAS
  // ==========================
  useEffect(() => {
    if (!open) return;

    api.get("users/areas/")
      .then(res => setAreas(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAreas([]));
  }, [open]);

  // ===========
  // CLIENTES
  // ===========
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await api.get("/core/clientes/");
        const data = Array.isArray(res.data) ? res.data : [];
        setClientes(data);
        
        const map = {};
        data.forEach(c => {
          map[c.codigo] = c.nombre;
        });
        setClientesMap(map);
      } catch (err) {
        console.error("Error cargando clientes", err);
      }
    };
    fetchClientes();
  }, []);

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

  // Aplicamos el filtro de año, mes y alcance personal
  const cotizacionesFiltradasPorFecha = cotizaciones.filter(c => {
    const fecha = new Date(c.fecha || c.cotif);
    const pasaAnno = !currentFilters.anno || fecha.getFullYear() === Number(currentFilters.anno);
    const pasaMes = currentFilters.mes === "%" || (fecha.getMonth() + 1 === Number(currentFilters.mes));
    
    let pasaAlcance = true;
    if (viewScope === "personal" && user) {
      const userId = user.id_usuario || user.id || user.dni;
      const cUserId = c.id_comercial;
      pasaAlcance = String(cUserId) === String(userId) || 
                    String(c.comercial_dni) === String(user.dni) || 
                    (c.comercial_nombre && user.nombre_completo && c.comercial_nombre.trim().toLowerCase() === user.nombre_completo.trim().toLowerCase());
    }
    return pasaAnno && pasaMes && pasaAlcance;
  });

  const todasCotizacionesFiltradasPorAlcance = useMemo(() => {
    return cotizacionesAnualData?.cotizaciones || [];
  }, [cotizacionesAnualData]);

  const todasAlertasFiltradasPorAlcance = useMemo(() => {
    const list = cotizacionesAnualData?.alertas || [];
    return list.filter(al => {
      let pasaAlcance = true;
      if (viewScope === "personal" && user) {
        const userId = user.id_usuario || user.id || user.dni;
        const cUserId = al.id_comercial;
        pasaAlcance = String(cUserId) === String(userId) || 
                      String(al.id_comercial) === String(user.dni) || 
                      (al.comercial_nombre && user.nombre_completo && al.comercial_nombre.trim().toLowerCase() === user.nombre_completo.trim().toLowerCase());
      }
      return pasaAlcance;
    });
  }, [cotizacionesAnualData, viewScope, user]);

  const todasAperturasFiltradasPorAlcance = useMemo(() => {
    const list = aperturasAnualData || [];
    return list.filter(ap => {
      let pasaAlcance = true;
      if (viewScope === "personal" && user) {
        const userId = user.id_usuario || user.id || user.dni;
        const cUserId = ap.id_comercial;
        pasaAlcance = String(cUserId) === String(userId) || 
                      String(ap.id_registro?.comercial_dni) === String(user.dni) ||
                      (ap.id_registro?.comercial_nombre && user.nombre_completo && ap.id_registro.comercial_nombre.trim().toLowerCase() === user.nombre_completo.trim().toLowerCase());
      }
      return pasaAlcance;
    });
  }, [aperturasAnualData, viewScope, user]);

  const totalFiltrado = cotizacionesFiltradasPorFecha.length;

  const vendedoresCount = useMemo(() => {
    const list = Array.isArray(cotizacionesFiltradasPorFecha) ? cotizacionesFiltradasPorFecha : [];
    const set = new Set(list.map(c => (c.comercial_nombre || "").trim().toUpperCase()).filter(Boolean));
    return set.size;
  }, [cotizacionesFiltradasPorFecha]);

  // Agrupamos por cliente solo con las cotizaciones filtradas
  const clientesAgregados = Object.values(
    cotizacionesFiltradasPorFecha.reduce((acc, c) => {
      const key = c.cliente_codigo || "-";
      if (!acc[key]) {
        acc[key] = {
          cliente_codigo: key,
          cantidad: 0,
          totalSoles: 0,
          totalDolares: 0,
          porcentaje: 0, // inicializamos
        };
      }

      acc[key].cantidad += 1;

      if (c.tmone === "S" || !c.tmone) acc[key].totalSoles += Number(c.tot_c || 0);
      if (c.tmone === "D") acc[key].totalDolares += Number(c.tot_c || 0);

      return acc;
    }, {})
  ).map(c => ({
    ...c,
    porcentaje: totalFiltrado ? ((c.cantidad / totalFiltrado) * 100).toFixed(2) : 0
  }));

  const cotizacionesPorArea = Object.values(
    cotizacionesFiltradasPorFecha.reduce((acc, c) => {
      const key = c.area_nombre || "-";
      if (!acc[key]) acc[key] = { area: key, cantidad: 0 };
      acc[key].cantidad += 1;
      return acc;
    }, {})
  );

  const COLORS = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff8042",
    "#8dd1e1", "#a4de6c", "#d0ed57", "#ffc0cb",
  ];

  const TIPOS_COLORS = {
    P: "#8884d8", // Proyectos
    V: "#82ca9d", // Ventas
    S: "#ffc658", // Servicios
  };

  const tiposData = ["P", "V", "S"].map((t) => {
    const count = cotizacionesFiltradasPorFecha.filter(c => c.cotit === t).length;
    return {
      tipo: t,
      cantidad: count,
    };
  });

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

  const exportarReporte = async (tipo) => {
    try {
      const token = localStorage.getItem("access_token");
      const url = tipo === "mensual" 
        ? `dashboard/exportar/mensual/?anno=${currentFilters.anno}&mes=${currentFilters.mes}`
        : `dashboard/exportar/anual/?anno=${currentFilters.anno}`;

      toast.info("Generando reporte Excel...");
      
      const response = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      const filename = tipo === "mensual" 
        ? `SGC.REG-004 Seguimiento de OC ${currentFilters.anno || new Date().getFullYear()}.xlsx` 
        : `reporte_anual_${currentFilters.anno || new Date().getFullYear()}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("¡Reporte descargado con éxito!");
    } catch (err) {
      console.error("Error exportando reporte", err);
      toast.error("Ocurrió un error al generar el reporte Excel.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col bg-slate-50/30 font-sans"
    >
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Ocultar elementos de navegación y acción no imprimibles */
          aside, nav, header, button, .no-print, .select-none, [role="tablist"] {
            display: none !important;
          }
          /* Estirar y forzar visibilidad en todos los niveles del DOM */
          body, html, #root, .h-screen, .w-screen, .overflow-hidden, .overflow-auto, main, .flex-1, .min-h-screen {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
          }
          .p-6 {
            padding: 0 !important;
          }
          .grid-cols-12 {
            display: flex !important;
            flex-direction: column !important;
            gap: 1.5rem !important;
          }
          .col-span-12, .lg:col-span-8, .xl:col-span-9, .lg:col-span-4, .xl:col-span-3 {
            width: 100% !important;
            max-width: 100% !important;
          }
          /* Mantener integridad de las secciones y gráficos */
          section, .bg-white {
            page-break-inside: avoid !important;
            margin-bottom: 2rem !important;
          }
          /* Asegurar que Recharts se dibuje al 100% en PDF */
          .recharts-responsive-container {
            width: 100% !important;
            height: 250px !important;
          }
        }
      `}} />
      <div className="w-full space-y-5 md:space-y-6 flex flex-col p-6 w-full animate-in fade-in duration-500">
        
        {/* HEADER BLOCK */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Título y Selector de Alcance */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">
                Inteligencia Comercial
              </h1>
              {(isFetching || isFetchingResumen) && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 uppercase tracking-widest animate-pulse bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  <Loader size={12} className="animate-spin text-indigo-600" />
                  Cargando...
                </span>
              )}
            </div>
            
            {/* Toggle de Alcance de Datos (Personal vs Global) */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 select-none">
              <button
                onClick={() => setViewScope("global")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  viewScope === "global"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Globe size={11} />
                Todo el Equipo
              </button>
              <button
                onClick={() => setViewScope("personal")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  viewScope === "personal"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <User size={11} />
                Mis Indicadores
              </button>
            </div>
          </div>

          {/* ACCIONES DINÁMICAS */}
          <div className="flex items-center gap-2 select-none">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm text-slate-600 transition-colors"
              title="Exportar Reporte Ejecutivo PDF"
            >
              <Printer size={12} className="text-slate-500" />
              Reporte PDF
            </button>

            <div className="shrink-0">
              <FilterDropdown
                icon="Calendar"
                value={currentFilters.anno === "%" ? "TODOS" : String(currentFilters.anno)}
                onSelect={(val) => {
                  setCurrentFilters(prev => ({ ...prev, anno: val === "%" ? "%" : Number(val) }));
                }}
                options={Array.from({ length: new Date().getFullYear() - 2011 + 1 }, (_, i) => {
                  const y = String(2011 + i);
                  return { v: y, n: y };
                }).reverse()}
                onToggle={setIsDropdownOpen}
                showSearch={true}
                gridLayout={true}
              />
            </div>

            <div className="shrink-0">
              <FilterDropdown
                icon="CalendarDays"
                value={currentFilters.mes === "%" ? "TODOS" : [
                  { v: "%", n: "TODOS" },
                  { v: "1", n: "ENERO" },
                  { v: "2", n: "FEBRERO" },
                  { v: "3", n: "MARZO" },
                  { v: "4", n: "ABRIL" },
                  { v: "5", n: "MAYO" },
                  { v: "6", n: "JUNIO" },
                  { v: "7", n: "JULIO" },
                  { v: "8", n: "AGOSTO" },
                  { v: "9", n: "SETIEMBRE" },
                  { v: "10", n: "OCTUBRE" },
                  { v: "11", n: "NOVIEMBRE" },
                  { v: "12", n: "DICIEMBRE" }
                ].find(m => m.v === currentFilters.mes)?.n}
                onSelect={(val) => {
                  setCurrentFilters(prev => ({ ...prev, mes: val }));
                }}
                options={[
                  { v: "%", n: "TODOS" },
                  { v: "1", n: "ENERO" },
                  { v: "2", n: "FEBRERO" },
                  { v: "3", n: "MARZO" },
                  { v: "4", n: "ABRIL" },
                  { v: "5", n: "MAYO" },
                  { v: "6", n: "JUNIO" },
                  { v: "7", n: "JULIO" },
                  { v: "8", n: "AGOSTO" },
                  { v: "9", n: "SETIEMBRE" },
                  { v: "10", n: "OCTUBRE" },
                  { v: "11", n: "NOVIEMBRE" },
                  { v: "12", n: "DICIEMBRE" }
                ]}
                onToggle={setIsDropdownOpen}
                showSearch={true}
                gridLayout={true}
              />
            </div>

            <ERPButton
              onClick={() => exportarReporte("mensual")}
              variant="outline"
              icon={<FileSpreadsheet size={14} />}
              className="h-8 py-0 px-3 text-[10px] uppercase tracking-widest text-[#1F4E78] border-[#1F4E78]/30 hover:bg-[#1F4E78]/5 gap-1 flex items-center"
            >
              Exportar Avance
            </ERPButton>
          </div>
        </div>

        {/* KPIs MULTIMODULARES DE NEGOCIO REALES */}
        {activeModule === "comercial" ? (
          <KpisResumen 
            anno={currentFilters.anno} 
            mes={currentFilters.mes} 
            viewScope={viewScope} 
            data={resumenComercialData?.kpis}
            loading={isLoadingResumen}
          />
        ) : (
          <KpisLogistica anno={currentFilters.anno} mes={currentFilters.mes} />
        )}

        {/* COMPONENTE DE INTELIGENCIA PREDICTIVA "V&C AI" */}
        <VcAiInsights activeModule={activeModule} anno={currentFilters.anno} mes={currentFilters.mes} cotizaciones={cotizacionesFiltradasPorFecha} />

        {/* DISTRIBUCIÓN EN DOS COLUMNAS (ESTILO COTIZACION DETALLE) */}
        <div className="grid grid-cols-12 gap-6 w-full">
          
          {/* COLUMNA PRINCIPAL (IZQUIERDA - 8/12 en lg, 9/12 en xl) */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6 flex flex-col min-w-0">
            
             {/* SECCIÓN 1: RESUMEN EJECUTIVO (OBJETIVOS / METAS SEMÁFORO) */}
            <div id="dashboard-resumen" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 scroll-mt-6">
              <ResumenDashboard 
                module={activeModule}
                anno={currentFilters.anno} 
                mes={currentFilters.mes} 
                cotizaciones={cotizacionesFiltradasPorFecha}
                todasCotizaciones={todasCotizacionesFiltradasPorAlcance}
                aperturas={todasAperturasFiltradasPorAlcance}
                alertas={todasAlertasFiltradasPorAlcance}
                viewScope={viewScope}
                resumenData={resumenComercialData}
                loading={isLoadingResumen}
              />
            </div>

            {/* SECCIÓN 2: RENDIMIENTO / LEADERBOARD / SIMULADOR */}
            <div id="dashboard-rendimiento" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 scroll-mt-6">
              <RendimientoDashboard 
                module={activeModule}
                anno={currentFilters.anno} 
                mes={currentFilters.mes} 
                cotizaciones={cotizacionesFiltradasPorFecha} 
                viewScope={viewScope}
              />
            </div>

            {/* SECCIÓN 3: PIVOT CONSTRUCTOR Y GRÁFICOS */}
            <div id="dashboard-analisis" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 scroll-mt-6">
              <AnalisisComercial 
                module={activeModule}
                cotizaciones={cotizacionesFiltradasPorFecha} 
                anno={currentFilters.anno} 
                mes={currentFilters.mes} 
                viewScope={viewScope}
              />
            </div>

          </div>

          {/* COLUMNA LATERAL / SIDEBAR (DERECHA - 4/12 en lg, 3/12 en xl) */}
          <div id="dashboard-automatizacion" className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6 flex flex-col scroll-mt-6">
            <AutomatizacionDashboard 
              module={activeModule}
              anno={currentFilters.anno} 
              mes={currentFilters.mes} 
            />
          </div>

        </div>

      </div>
    </motion.div>
  );
}

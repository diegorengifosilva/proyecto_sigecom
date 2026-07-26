// frontend/src/dashboard/aprobacion_cotizacion/AprobacionCotizacion.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { BriefcaseBusiness, FilePlus, Eye, TrendingUp, DollarSign, BarChart3, Filter, Loader, Calculator, FileSpreadsheet, Wallet2, Landmark, Scale, Coins, User, MoreHorizontal, ClipboardCheck, LayoutDashboard, History, Globe, ListTodo, Layout, Plus, ArrowUpRight, Cpu, Award, FileText, FolderCheck, CalendarRange } from "lucide-react";

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
import JarvisInsights from "./resumen/JarvisInsights";
import { FilterDropdown, ERPButton } from "@/components/ui/ERPComponents";

export default function CotizacionesHome() {
  const { authUser: user, logout } = useAuth();
  const activeModule = "comercial";
  const [cotizaciones, setCotizaciones] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
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
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["cotizaciones", currentFilters],
    queryFn: () => fetchCotizaciones(currentFilters),
    keepPreviousData: true,
  });
  const { scrollY } = useScroll();
  const shadowOpacity = useTransform(scrollY, [0, 50], [0, 0.25]);
  const blurValue = useTransform(scrollY, [0, 100], [4, 8]);

  const [tabActiva, setTabActiva] = useState("resumen");
  const [areas, setAreas] = useState([]);

  // Fetch cotizaciones con filtro por año actual
  const fetchCotizaciones = useCallback(async (params = { anno: annoActual }) => {
    setLoading(true);
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
        cliente: item.cliente?.trim() || "-",
        area: item.area?.trim() || "-",
        estado: item.estado?.trim() || "-",
      }));

      dataLimpia.sort((a, b) => {
        const fechaA = a.fecha ? new Date(a.fecha) : new Date(0);
        const fechaB = b.fecha ? new Date(b.fecha) : new Date(0);
        if (fechaB - fechaA !== 0) return fechaB - fechaA;
        return (b.numero || "").localeCompare(a.numero || "");
      });

      setCotizaciones(dataLimpia);
      setStats(dashboard);
      return dataLimpia;
    } catch (e) {
      console.error("Error cargando cotizaciones:", e);
      if (e?.response?.status === 401) logout();
      toast.error("Error cargando las cotizaciones.");
      return [];
    } finally {
      setLoading(false);
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
      const res = await api.get("/core/clientes/");
      setClientes(res.data);
    };
    fetchClientes();
  }, []);

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

  // Aplicamos el filtro de año y mes
  const cotizacionesFiltradasPorFecha = cotizaciones.filter(c => {
    const fecha = new Date(c.fecha || c.cotif);
    const pasaAnno = !currentFilters.anno || fecha.getFullYear() === Number(currentFilters.anno);
    const pasaMes = currentFilters.mes === "%" || (fecha.getMonth() + 1 === Number(currentFilters.mes));
    return pasaAnno && pasaMes;
  });

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

  if (loading) return <div className="p-6 space-y-6">Cargando cotizaciones...</div>;

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
      className="min-h-screen w-full flex flex-col bg-slate-50/30 font-sans"
    >
      <div className="w-full space-y-5 md:space-y-6 flex flex-col p-6 w-full animate-in fade-in duration-500">
        
        {/* HEADER BLOCK */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* IZQUIERDA */}
          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              <span className="hover:text-indigo-600 cursor-pointer transition-colors">Dashboard</span>
              <span>/</span>
              <span>Comercial</span>
            </nav>

            {/* Título */}
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600/10 text-indigo-700 w-7 h-7 rounded-md flex items-center justify-center shrink-0">
                <BriefcaseBusiness className="w-4 h-4" />
              </div>
              <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">
                Inteligencia Comercial
              </h1>
            </div>
          </div>

          {/* ACCIONES DINÁMICAS */}
          <div className="flex items-center gap-2">
            <div className="shrink-0">
              <FilterDropdown
                icon="Calendar"
                value={currentFilters.anno === "%" ? "TODOS" : String(currentFilters.anno)}
                onSelect={(val) => {
                  setCurrentFilters(prev => ({ ...prev, anno: val === "%" ? "%" : Number(val) }));
                }}
                options={[
                  { v: "2024", n: "2024" },
                  { v: "2025", n: "2025" },
                  { v: "2026", n: "2026" },
                  { v: "2027", n: "2027" },
                  { v: "2028", n: "2028" }
                ]}
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
              onClick={() => setOpenNueva(true)}
              variant="primary"
              icon={<FilePlus size={14} />}
              className="h-8 py-0 px-3 text-[10px] uppercase tracking-widest"
            >
              Nueva
            </ERPButton>

            <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* KPIs MULTIMODULARES DE NEGOCIO REALES */}
        {activeModule === "comercial" ? (
          <KpisResumen anno={currentFilters.anno} mes={currentFilters.mes} />
        ) : (
          <KpisLogistica anno={currentFilters.anno} mes={currentFilters.mes} />
        )}

        {/* COMPONENTE DE INTELIGENCIA PREDICTIVA "JARVIS INSIGHTS" */}
        <JarvisInsights activeModule={activeModule} anno={currentFilters.anno} mes={currentFilters.mes} />

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
              />
            </div>

            {/* SECCIÓN 2: RENDIMIENTO / LEADERBOARD / SIMULADOR */}
            <div id="dashboard-rendimiento" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 scroll-mt-6">
              <RendimientoDashboard 
                module={activeModule}
                anno={currentFilters.anno} 
                mes={currentFilters.mes} 
                cotizaciones={cotizacionesFiltradasPorFecha} 
              />
            </div>

            {/* SECCIÓN 3: PIVOT CONSTRUCTOR Y GRÁFICOS */}
            <div id="dashboard-analisis" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 scroll-mt-6">
              <AnalisisComercial 
                module={activeModule}
                cotizaciones={cotizacionesFiltradasPorFecha} 
                anno={currentFilters.anno} 
                mes={currentFilters.mes} 
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

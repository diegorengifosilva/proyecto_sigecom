// frontend/src/dashboard/aprobacion_cotizacion/AprobacionCotizacion.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { BriefcaseBusiness, FilePlus, Eye, TrendingUp, DollarSign, BarChart3, Filter, Loader, Calculator, FileSpreadsheet, Wallet2, Landmark, Scale, Coins, User, MoreHorizontal, ClipboardCheck, LayoutDashboard, History, Globe, ListTodo, Layout, Plus } from "lucide-react";

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

export default function CotizacionesHome() {
  const { authUser: user, logout } = useAuth();
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
      const { data } = await api.get("cotizaciones/aprobacion_cotizacion", {
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
    } catch (e) {
      console.error("Error cargando cotizaciones:", e);
      if (e?.response?.status === 401) logout();
      toast.error("Error cargando las cotizaciones.");
    } finally {
      setLoading(false);
    }
  }, [annoActual, logout]);

  // Obtener año actual desde la API cont_cias
  const fetchAnnoActual = async () => {
    try {
      const res = await api.get("cont_cias/001/"); // endpoint que devuelve cont_cias.cod=001
      if (res.data?.anno) setAnnoActual(res.data.anno);
      fetchCotizaciones(res.data?.anno);
    } catch (err) {
      console.warn("No se pudo obtener año actual, se usa el año del sistema", err);
      fetchCotizaciones(annoActual);
    }
  };

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

  useEffect(() => {
    if (!user) return;
    fetchAnnoActual();
  }, [user]);

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
      className="min-h-screen w-full flex flex-col bg-white font-sans"
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
                  Dashboard
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
              { id: "rendimiento", label: "Rendimiento", icon: <ListTodo size={16} /> },
              { id: "analisis", label: "Análisis", icon: <Layout size={16} /> },
              { id: "automatizacion", label: "Automatización", icon: <History size={16} /> },
              /* { id: "historial", label: "Historial", icon: <History size={16} /> }, */
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
            <>
              <ResumenDashboard />
            </>
          )}

          {tabActiva === "rendimiento" && <RendimientoDashboard />}

          {tabActiva === "analisis" && (
            <>
              <AnalisisComercial />
              <GraficoDinamico
                data={data}
                dimension="area"
                metrica="monto_total"
                tipoDato="comparacion"
                titulo="Ventas por área"
              />
            </>
          )}

          {tabActiva === "historial" && <TablaHistorial />}
        </div>

        {/* PIZARRA DINÁMICA */}
        {/*<DashboardBoard module="cotizaciones" /> */}
      </div>
    </motion.div>
  );
}

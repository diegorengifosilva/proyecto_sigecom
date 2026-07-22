import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, Filter, MoreHorizontal, LayoutDashboard, ClipboardCheck, TrendingUp, FolderCheck, CalendarRange, ArrowUpRight, X, Trash2, Brush, Pin, PinOff, ExternalLink, Copy, Mail, GitBranch, ShieldCheck, FileDown } from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { ERPTable, StatusBadge, ERPButton, ERPInput, FilterDropdown } from "@/components/ui/ERPComponents";
import CotizacionNuevaModal from "../../modal/CotizacionNuevaModal";
import { formatDate } from "@/utils/formatters";
import TablaCotizaciones from "./tablas/TablaCotizaciones";
import TablaOportunidades from "./tablas/TablaOportunidades";
import TablaApertura from "./tablas/TablaAperturas";
import ActionMenu from "@/components/ui/ActionMenu";
import { toast } from "../../utils/toast";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const getSessionValue = (key, defaultValue) => {
  try {
    const val = sessionStorage.getItem(key);
    if (val === null) return defaultValue;
    return JSON.parse(val);
  } catch (e) {
    console.error("Error reading sessionStorage key:", key, e);
    return defaultValue;
  }
};

const fetchCotizaciones = async ({ queryKey }) => {
  const [
    _key, anno, mes, probabilidad, comercialSearch, tecnicoSearch, envioFilter,
    suministrosValor, suministrosUnidad, serviciosValor, serviciosUnidad, ofertaValor, ofertaUnidad,
    annoDesde, annoHasta, mesDesde, mesHasta
  ] = queryKey;
  const token = localStorage.getItem("access_token");

  const { data } = await api.get("cotizaciones/lista_cotizaciones/", {
    params: {
      anno,
      mes,
      probabilidad,
      comercial_search: comercialSearch,
      tecnico_search: tecnicoSearch,
      envio: envioFilter,
      suministros_val: suministrosValor,
      suministros_uni: suministrosUnidad,
      servicios_val: serviciosValor,
      servicios_uni: serviciosUnidad,
      oferta_val: ofertaValor,
      oferta_uni: ofertaUnidad,
      anno_desde: annoDesde,
      anno_hasta: annoHasta,
      mes_desde: mesDesde,
      mes_hasta: mesHasta
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    tabla: Array.isArray(data?.tabla) ? data.tabla : [],
    dashboard: data?.dashboard || {}
  };
};

const fetchOportunidades = async ({ queryKey }) => {
  const [
    _key, anno, mes, comercialSearch, estadoOportunidad,
    annoDesde, annoHasta, mesDesde, mesHasta
  ] = queryKey;
  const token = localStorage.getItem("access_token");

  const { data } = await api.get("cotizaciones/lista_oportunidades/", {
    params: {
      anno,
      mes,
      comercial_search: comercialSearch,
      estado_oportunidad: estadoOportunidad, // 1, 2, 3, 4 o '%'
      anno_desde: annoDesde,
      anno_hasta: annoHasta,
      mes_desde: mesDesde,
      mes_hasta: mesHasta
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    tabla: Array.isArray(data?.tabla) ? data.tabla : [],
    dashboard: data?.dashboard || {}
  };
};

const fetchAperturas = async ({ queryKey }) => {
  const [
    _key, anno, mes, estadoOrden, prio, plazoValor, plazoUnidad,
    annoDesde, annoHasta, mesDesde, mesHasta
  ] = queryKey;
  
  const token = localStorage.getItem("access_token");

  const { data } = await api.get("cotizaciones/lista_aperturas/", {
    params: {
      anno,
      mes,
      cliente: "%",              // Forzado a traer todos por defecto
      estado_orden: estadoOrden,
      prio,
      envio: "%",                // Forzado por defecto
      plazo_val: plazoValor,
      plazo_uni: plazoUnidad,
      // Los campos de búsqueda vacíos para que el backend use sus defaults
      campo: "",                 
      valor: "",
      anno_desde: annoDesde,
      anno_hasta: annoHasta,
      mes_desde: mesDesde,
      mes_hasta: mesHasta                  
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    tabla: Array.isArray(data?.tabla) ? data.tabla : [],
    dashboard: data?.dashboard || {}
  };
};

const fetchPeriodos = async () => {
  const token = localStorage.getItem("access_token");
  const { data } = await api.get("cotizaciones/periodos/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export default function Comercial({ defaultTab = "cotizaciones" }) {
  const navigate = useNavigate();
  const { authUser: user } = useAuth();
  const [currentTab, setCurrentTab] = useState(defaultTab);

  useEffect(() => {
    setCurrentTab(defaultTab);
  }, [defaultTab]);

  // ESTADOS DE FILTROS
  const getInitialTabFilters = (tabName) => {
    if (tabName === "cotizaciones") {
      return {
        globalSearch: getSessionValue("comercial_filter_globalSearch", ""),
        selectedAnno: getSessionValue("comercial_filter_selectedAnno", new Date().getFullYear()),
        selectedMes: getSessionValue("comercial_filter_selectedMes", "%"),
        statusFilter: getSessionValue("comercial_filter_statusFilter", "TODAS"),
        envioFilter: getSessionValue("comercial_filter_envioFilter", "%"),
        probabilidadFilter: getSessionValue("comercial_filter_probabilidadFilter", "%"),
        responsableTipo: getSessionValue("comercial_filter_responsableTipo", "COMERCIAL"),
        comercialSearch: getSessionValue("comercial_filter_comercialSearch", "%"),
        tecnicoSearch: getSessionValue("comercial_filter_tecnicoSearch", "%"),
        inputBusqueda: getSessionValue("comercial_filter_inputBusqueda", ""),
        responsableNombre: getSessionValue("comercial_filter_responsableNombre", "%"),
        suministrosValor: getSessionValue("comercial_filter_suministrosValor", ""),
        suministrosUnidad: getSessionValue("comercial_filter_suministrosUnidad", "D"),
        serviciosValor: getSessionValue("comercial_filter_serviciosValor", ""),
        serviciosUnidad: getSessionValue("comercial_filter_serviciosUnidad", "D"),
        ofertaValor: getSessionValue("comercial_filter_ofertaValor", ""),
        ofertaUnidad: getSessionValue("comercial_filter_ofertaUnidad", "D"),
        activeFilterTab: getSessionValue("comercial_filter_activeFilterTab", "RANGO"),
        annoDesde: getSessionValue("comercial_filter_annoDesde", ""),
        annoHasta: getSessionValue("comercial_filter_annoHasta", ""),
        mesDesde: getSessionValue("comercial_filter_mesDesde", ""),
        mesHasta: getSessionValue("comercial_filter_mesHasta", ""),
        estadoOportunidad: getSessionValue("comercial_filter_estadoOportunidad", "%"),
        estadoOrdenFilter: getSessionValue("comercial_filter_estadoOrdenFilter", "%"),
        prioFilter: getSessionValue("comercial_filter_prioFilter", "%"),
        plazoValor: getSessionValue("comercial_filter_plazoValor", ""),
        plazoUnidad: getSessionValue("comercial_filter_plazoUnidad", "D")
      };
    }
    return {
      globalSearch: "",
      selectedAnno: new Date().getFullYear(),
      selectedMes: "%",
      statusFilter: "TODAS",
      envioFilter: "%",
      probabilidadFilter: "%",
      responsableTipo: "COMERCIAL",
      comercialSearch: "%",
      tecnicoSearch: "%",
      inputBusqueda: "",
      responsableNombre: "%",
      suministrosValor: "",
      suministrosUnidad: "D",
      serviciosValor: "",
      serviciosUnidad: "D",
      ofertaValor: "",
      ofertaUnidad: "D",
      activeFilterTab: "RANGO",
      annoDesde: "",
      annoHasta: "",
      mesDesde: "",
      mesHasta: "",
      estadoOportunidad: "%",
      estadoOrdenFilter: "%",
      prioFilter: "%",
      plazoValor: "",
      plazoUnidad: "D"
    };
  };

  const [tabFilters, setTabFilters] = useState(() => {
    const saved = getSessionValue("comercial_tab_filters", null);
    if (saved) return saved;
    return {
      cotizaciones: getInitialTabFilters("cotizaciones"),
      oportunidades: getInitialTabFilters("oportunidades"),
      aperturas: getInitialTabFilters("aperturas"),
      programacion: getInitialTabFilters("programacion")
    };
  });

  const currentFilters = tabFilters[currentTab] || getInitialTabFilters(currentTab);

  const updateFilter = (key, value) => {
    setTabFilters(prev => {
      const currentVal = prev[currentTab]?.[key];
      const nextVal = typeof value === 'function' ? value(currentVal) : value;
      const updated = {
        ...prev,
        [currentTab]: {
          ...(prev[currentTab] || getInitialTabFilters(currentTab)),
          [key]: nextVal
        }
      };
      sessionStorage.setItem("comercial_tab_filters", JSON.stringify(updated));
      return updated;
    });
  };

  const resetFilters = () => {
    setTabFilters(prev => {
      const updated = {
        ...prev,
        [currentTab]: getInitialTabFilters(currentTab)
      };
      sessionStorage.setItem("comercial_tab_filters", JSON.stringify(updated));
      return updated;
    });
  };

  const globalSearch = currentFilters.globalSearch;
  const setGlobalSearch = (val) => updateFilter("globalSearch", val);

  const statusFilter = currentFilters.statusFilter;
  const setStatusFilter = (val) => updateFilter("statusFilter", val);

  const selectedAnno = currentFilters.selectedAnno;
  const setSelectedAnno = (val) => updateFilter("selectedAnno", val);

  const selectedMes = currentFilters.selectedMes;
  const setSelectedMes = (val) => updateFilter("selectedMes", val);

  const envioFilter = currentFilters.envioFilter;
  const setEnvioFilter = (val) => updateFilter("envioFilter", val);

  const probabilidadFilter = currentFilters.probabilidadFilter;
  const setProbabilidadFilter = (val) => updateFilter("probabilidadFilter", val);

  const responsableTipo = currentFilters.responsableTipo;
  const setResponsableTipo = (val) => updateFilter("responsableTipo", val);

  const comercialSearch = currentFilters.comercialSearch;
  const setComercialSearch = (val) => updateFilter("comercialSearch", val);

  const tecnicoSearch = currentFilters.tecnicoSearch;
  const setTecnicoSearch = (val) => updateFilter("tecnicoSearch", val);

  const inputBusqueda = currentFilters.inputBusqueda;
  const setInputBusqueda = (val) => updateFilter("inputBusqueda", val);

  const responsableNombre = currentFilters.responsableNombre;
  const setResponsableNombre = (val) => updateFilter("responsableNombre", val);

  const suministrosValor = currentFilters.suministrosValor;
  const setSuministrosValor = (val) => updateFilter("suministrosValor", val);

  const suministrosUnidad = currentFilters.suministrosUnidad;
  const setSuministrosUnidad = (val) => updateFilter("suministrosUnidad", val);

  const serviciosValor = currentFilters.serviciosValor;
  const setServiciosValor = (val) => updateFilter("serviciosValor", val);

  const serviciosUnidad = currentFilters.serviciosUnidad;
  const setServiciosUnidad = (val) => updateFilter("serviciosUnidad", val);

  const ofertaValor = currentFilters.ofertaValor;
  const setOfertaValor = (val) => updateFilter("ofertaValor", val);

  const ofertaUnidad = currentFilters.ofertaUnidad;
  const setOfertaUnidad = (val) => updateFilter("ofertaUnidad", val);

  const activeFilterTab = currentFilters.activeFilterTab;
  const setActiveFilterTab = (val) => updateFilter("activeFilterTab", val);

  const annoDesde = currentFilters.annoDesde;
  const setAnnoDesde = (val) => updateFilter("annoDesde", val);

  const annoHasta = currentFilters.annoHasta;
  const setAnnoHasta = (val) => updateFilter("annoHasta", val);

  const mesDesde = currentFilters.mesDesde;
  const setMesDesde = (val) => updateFilter("mesDesde", val);

  const mesHasta = currentFilters.mesHasta;
  const setMesHasta = (val) => updateFilter("mesHasta", val);

  const estadoOportunidad = currentFilters.estadoOportunidad;
  const setEstadoOportunidad = (val) => updateFilter("estadoOportunidad", val);

  const estadoOrdenFilter = currentFilters.estadoOrdenFilter;
  const setEstadoOrdenFilter = (val) => updateFilter("estadoOrdenFilter", val);

  const prioFilter = currentFilters.prioFilter;
  const setPrioFilter = (val) => updateFilter("prioFilter", val);

  const plazoValor = currentFilters.plazoValor;
  const setPlazoValor = (val) => updateFilter("plazoValor", val);

  const plazoUnidad = currentFilters.plazoUnidad;
  const setPlazoUnidad = (val) => updateFilter("plazoUnidad", val);

  const [showNewModal, setShowNewModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const filterPanelRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ESTADOS Y EFECTOS PARA REPORTE DASHBOARD EN MODAL
  const [reporteDashboardOpen, setReporteDashboardOpen] = useState(false);
  const [reporteHeight, setReporteHeight] = useState(null);
  const [reporteLoading, setReporteLoading] = useState(true);
  const [reporteUrl, setReporteUrl] = useState("");

  // Resetear estados al abrir/cerrar modal de reporte
  useEffect(() => {
    if (!reporteDashboardOpen) {
      setReporteHeight(null);
      setReporteLoading(true);
    } else {
      setReporteLoading(true);
      setReporteHeight(null);
    }
  }, [reporteDashboardOpen]);

  // Escuchar mensaje de altura de los reportes y cierre
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data) {
        if (e.data.type === 'set-iframe-height') {
          const h = Number(e.data.height);
          if (h > 0) {
            setReporteHeight(h);
            setReporteLoading(false);
          }
        } else if (e.data.type === 'close-report-modal') {
          setReporteDashboardOpen(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Cerrar reporte al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setReporteDashboardOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fallback de carga por seguridad (1.5 segundos)
  useEffect(() => {
    if (reporteDashboardOpen) {
      const timer = setTimeout(() => {
        setReporteLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [reporteDashboardOpen]);

  // QUERY PARA OBTENER LOS PERIODOS REGISTRADOS DINÁMICAMENTE
  const { data: dataPeriodos } = useQuery({
    queryKey: ["periodos"],
    queryFn: fetchPeriodos,
  });

  // Sorting state - Default by date descending
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });

  const queryClient = useQueryClient();
  const [reporteTitle, setReporteTitle] = useState("Reporte de Cotizaciones");
  const [reporteActiveId, setReporteActiveId] = useState(null);
  const [isPdfReport, setIsPdfReport] = useState(false);

  // Pinned items state and toggle are defined below where queries are loaded.

  // Context Menu State
  const [contextMenuPos, setContextMenuPos] = useState(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuItem, setContextMenuItem] = useState(null);

  const handleRowContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuItem(item);
    setContextMenuOpen(true);
  };

  const handleGenerarCopia = async (item) => {
    try {
      const token = localStorage.getItem("access_token");
      toast.info("Generando copia...");
      const res = await api.post(
        `cotizaciones/${item.id_registro}/generar-copia/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data && res.data.ok) {
        const { id_registro_nuevo } = res.data.data;
        toast.success("Copia de cotización generada exitosamente");
        queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
        queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
        queryClient.invalidateQueries({ queryKey: ["aperturas"] });
        navigate(`/sigecom/comercial/cotizaciones/${id_registro_nuevo}`);
      } else {
        toast.error("No se pudo generar la copia");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Error al generar la copia");
    }
  };

  const handleNuevaVersion = async (item) => {
    try {
      const token = localStorage.getItem("access_token");
      toast.info("Generando nueva versión...");
      const res = await api.post(
        `cotizaciones/nueva-version/${item.id_registro}/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data && res.data.ok) {
        const { id_registro_nuevo, codigo_nuevo } = res.data.data;
        toast.success(`Versión ${codigo_nuevo} creada exitosamente`);
        queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
        queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
        queryClient.invalidateQueries({ queryKey: ["aperturas"] });
        navigate(`/sigecom/comercial/cotizaciones/${id_registro_nuevo}`);
      } else {
        toast.error("No se pudo crear la nueva versión");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Error al crear la nueva versión");
    }
  };

  const handleEnviarCotizacion = async (item) => {
    try {
      const token = localStorage.getItem("access_token");
      toast.info("Enviando cotización...");
      const res = await api.patch(
        `cotizaciones/enviar-aprobacion/${item.id_registro}/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(res.data?.message || "Cotización enviada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Error al enviar la cotización");
    }
  };

  const handlePasarAApertura = async (item) => {
    try {
      const token = localStorage.getItem("access_token");
      toast.info("Procesando transición...");
      await api.post(
        `cotizaciones/${item.id_registro}/pasar-a-apertura/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("La cotización ha pasado a estado Apertura", "Transición Exitosa");
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["aperturas"] });
      navigate(`/sigecom/comercial/aperturas/${item.id_registro}`, { replace: true });
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Error al realizar la transición";
      toast.error(errMsg, "Error de Transición");
    }
  };

  const handlePasarACotizacion = async (item) => {
    try {
      const token = localStorage.getItem("access_token");
      toast.info("Procesando transición...");
      await api.post(
        `cotizaciones/${item.id_registro}/pasar-a-cotizacion/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("La oportunidad ha pasado a estado Cotización", "Transición Exitosa");
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      navigate(`/sigecom/comercial/cotizaciones/${item.id_registro}`, { replace: true });
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Error al realizar la transición";
      toast.error(errMsg, "Error de Transición");
    }
  };

  const handleEliminarCotizacion = async (item) => {
    try {
      const token = localStorage.getItem("access_token");
      toast.info("Eliminando cotización...");
      await api.delete(
        `cotizaciones/eliminar/${item.id_registro}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("La cotización ha sido eliminada del sistema");
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      queryClient.invalidateQueries({ queryKey: ["aperturas"] });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Error al eliminar la cotización");
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(() => getSessionValue("comercial_filter_currentPage", 1));
  const [currentPageOportunidades, setCurrentPageOportunidades] = useState(() => getSessionValue("comercial_filter_currentPageOportunidades", 1));
  const [pageSize, setPageSize] = useState(10);

  // 1. QUERY DE COTIZACIONES (Existente)
  const { 
    data: dataCotizaciones, 
    isLoading: isLoadingCotizaciones 
  } = useQuery({
    queryKey: [
      "cotizaciones", selectedAnno, selectedMes, probabilidadFilter, comercialSearch, tecnicoSearch, envioFilter,
      suministrosValor, suministrosUnidad, serviciosValor, serviciosUnidad, ofertaValor, ofertaUnidad,
      annoDesde, annoHasta, mesDesde, mesHasta
    ],
    queryFn: fetchCotizaciones,
  });

  // 2. NUEVA QUERY DE OPORTUNIDADES

  const { 
    data: dataOportunidades, 
    isLoading: isLoadingOportunidades 
  } = useQuery({
    queryKey: ["oportunidades", selectedAnno, selectedMes, comercialSearch, estadoOportunidad, annoDesde, annoHasta, mesDesde, mesHasta],
    queryFn: fetchOportunidades,
  });

  // 3. APERTURAS
  const [currentPageApertura, setCurrentPageApertura] = useState(() => getSessionValue("comercial_filter_currentPageApertura", 1));

  // Sincronización automática de filtros y paginación con sessionStorage
  useEffect(() => {
    sessionStorage.setItem("comercial_filter_currentTab", JSON.stringify(currentTab));
    sessionStorage.setItem("comercial_filter_currentPage", JSON.stringify(currentPage));
    sessionStorage.setItem("comercial_filter_currentPageOportunidades", JSON.stringify(currentPageOportunidades));
    sessionStorage.setItem("comercial_filter_currentPageApertura", JSON.stringify(currentPageApertura));
  }, [
    currentTab, currentPage, currentPageOportunidades, currentPageApertura
  ]);

  const hasAnyActiveFilterOrSearch = useMemo(() => {
    return (
      globalSearch !== "" ||
      statusFilter !== "TODAS" ||
      selectedAnno !== new Date().getFullYear() ||
      selectedMes !== "%" ||
      envioFilter !== "%" ||
      probabilidadFilter !== "%" ||
      responsableTipo !== "COMERCIAL" ||
      comercialSearch !== "%" ||
      tecnicoSearch !== "%" ||
      responsableNombre !== "%" ||
      suministrosValor !== "" ||
      serviciosValor !== "" ||
      ofertaValor !== "" ||
      annoDesde !== "" ||
      annoHasta !== "" ||
      mesDesde !== "" ||
      mesHasta !== "" ||
      estadoOportunidad !== "%" ||
      estadoOrdenFilter !== "%" ||
      prioFilter !== "%" ||
      plazoValor !== ""
    );
  }, [
    globalSearch, statusFilter, selectedAnno, selectedMes, envioFilter,
    probabilidadFilter, responsableTipo, comercialSearch, tecnicoSearch,
    responsableNombre, suministrosValor, serviciosValor, ofertaValor,
    annoDesde, annoHasta, mesDesde, mesHasta, estadoOportunidad,
    estadoOrdenFilter, prioFilter, plazoValor
  ]);

  const handleClearAllFilters = () => {
    setGlobalSearch("");
    setStatusFilter("TODAS");
    setSelectedAnno(new Date().getFullYear());
    setSelectedMes("%");
    setEnvioFilter("%");
    setProbabilidadFilter("%");
    setResponsableTipo("COMERCIAL");
    setComercialSearch("%");
    setTecnicoSearch("%");
    setInputBusqueda("");
    setResponsableNombre("%");
    setSuministrosValor("");
    setSuministrosUnidad("D");
    setServiciosValor("");
    setServiciosUnidad("D");
    setOfertaValor("");
    setOfertaUnidad("D");
    setActiveFilterTab("RANGO");
    setAnnoDesde("");
    setAnnoHasta("");
    setMesDesde("");
    setMesHasta("");
    setCurrentPage(1);
    setCurrentPageOportunidades(1);
    setEstadoOportunidad("%");
    setCurrentPageApertura(1);
    setEstadoOrdenFilter("%");
    setPrioFilter("%");
    setPlazoValor("");
    setPlazoUnidad("D");

    const keysToClear = [
      "comercial_filter_globalSearch",
      "comercial_filter_statusFilter",
      "comercial_filter_selectedAnno",
      "comercial_filter_selectedMes",
      "comercial_filter_envioFilter",
      "comercial_filter_probabilidadFilter",
      "comercial_filter_responsableTipo",
      "comercial_filter_comercialSearch",
      "comercial_filter_tecnicoSearch",
      "comercial_filter_inputBusqueda",
      "comercial_filter_responsableNombre",
      "comercial_filter_suministrosValor",
      "comercial_filter_suministrosUnidad",
      "comercial_filter_serviciosValor",
      "comercial_filter_serviciosUnidad",
      "comercial_filter_ofertaValor",
      "comercial_filter_ofertaUnidad",
      "comercial_filter_activeFilterTab",
      "comercial_filter_annoDesde",
      "comercial_filter_annoHasta",
      "comercial_filter_mesDesde",
      "comercial_filter_mesHasta",
      "comercial_filter_currentPage",
      "comercial_filter_currentPageOportunidades",
      "comercial_filter_estadoOportunidad",
      "comercial_filter_currentPageApertura",
      "comercial_filter_estadoOrdenFilter",
      "comercial_filter_prioFilter",
      "comercial_filter_plazoValor",
      "comercial_filter_plazoUnidad"
    ];
    keysToClear.forEach(key => sessionStorage.removeItem(key));
  };

  // ── QUERY DE APERTURAS ADMINISTRATIVAS SIMPLIFICADA ──
  const { 
    data: dataAperturas, 
    isLoading: isLoadingAperturas 
  } = useQuery({
    queryKey: [
      "aperturas", 
      selectedAnno,       // Sincronizado con el dashboard superior
      selectedMes,        // Sincronizado con el dashboard superior
      estadoOrdenFilter,  // Caerá exactamente en estadoOrden en el fetch
      prioFilter,         // Caerá exactamente en prio en el fetch
      plazoValor,         // Caerá exactamente en plazoValor en el fetch
      plazoUnidad,        // Caerá exactamente en plazoUnidad en el fetch
      annoDesde,
      annoHasta,
      mesDesde,
      mesHasta
    ],
    queryFn: fetchAperturas,
    keepPreviousData: true,
  });

  const cotizaciones = dataCotizaciones?.tabla || [];
  const oportunidades = dataOportunidades?.tabla || [];
  const backendStats = (currentTab === "cotizaciones" ? dataCotizaciones?.dashboard : dataOportunidades?.dashboard) || {};
  const isLoading = currentTab === "cotizaciones" ? isLoadingCotizaciones : isLoadingOportunidades;

  // Pinned items computed dynamically from database data
  const pinnedIds = useMemo(() => {
    const ids = new Set();
    if (dataCotizaciones?.tabla) {
      dataCotizaciones.tabla.forEach(item => {
        if (item.fijar === 1) ids.add(item.id_registro);
      });
    }
    if (dataOportunidades?.tabla) {
      dataOportunidades.tabla.forEach(item => {
        if (item.fijar === 1) ids.add(item.id_registro);
      });
    }
    if (dataAperturas?.tabla) {
      dataAperturas.tabla.forEach(item => {
        if (item.id_registro?.fijar === 1 || item.fijar === 1) ids.add(item.cotizacion_id);
      });
    }
    return ids;
  }, [dataCotizaciones, dataOportunidades, dataAperturas]);

  const togglePin = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.post(
        `cotizaciones/${id}/toggle-fijar/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && res.data.ok) {
        if (res.data.fijar === 1) {
          toast.success("Fijado al inicio de la lista");
        } else {
          toast.info("Desfijado de la lista");
        }
        queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
        queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
        queryClient.invalidateQueries({ queryKey: ["aperturas"] });
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Error al cambiar estado de fijado");
    }
  };

  // Dynamic PageSize based on screen height
  useEffect(() => {
    const calculatePageSize = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      
      if (vw < 768) {
        setPageSize(6); // Cantidad fija óptima para scroll en celulares
        return;
      }
      
      const rowHeight = 50;     // Altura de fila de tabla compacta
      // Altura acumulada de cabeceras, KPIs, filtros, paddings y footer.
      // Se adapta dinámicamente si es un monitor (vh grande) o una laptop (vh < 850)
      // para optimizar el espacio sin dejar áreas blancas o desbordar la ventana.
      const chromeHeight = vh < 850 ? 340 : 435;
      
      const availableHeight = vh - chromeHeight;
      const computedRows = Math.floor(availableHeight / rowHeight);
      
      // Limitar el tamaño de página a un rango seguro (mínimo 5, máximo 25)
      const finalPageSize = Math.max(Math.min(computedRows, 25), 5);
      setPageSize(finalPageSize);
    };

    calculatePageSize();
    window.addEventListener('resize', calculatePageSize);
    return () => window.removeEventListener('resize', calculatePageSize);
  }, []);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredData = useMemo(() => {
    let result = cotizaciones.filter((item) => {
      const searchLower = globalSearch.toLowerCase().trim();
      const formattedTotal = Number(item.total_cotizacion || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      const formattedDate = formatDate(item.fecha);
      const formattedEnvio = item.estado_envio === 2 ? "enviado" : "pendiente";

      const matchesSearch =
        !searchLower ||
        item.num_reg?.toString().includes(searchLower) ||
        item.codigo?.toLowerCase().includes(searchLower) ||
        item.cliente?.toLowerCase().includes(searchLower) ||
        item.cliente_nombre?.toLowerCase().includes(searchLower) ||
        item.referencia?.toLowerCase().includes(searchLower) ||
        item.representante_nombre?.toLowerCase().includes(searchLower) ||
        item.area_nombre?.toLowerCase().includes(searchLower) ||
        item.estado_nombre?.toLowerCase().includes(searchLower) ||
        formattedEnvio.includes(searchLower) ||
        formattedDate.includes(searchLower) ||
        item.total_cotizacion?.toString().includes(searchLower) ||
        formattedTotal.includes(searchLower);

      const matchesStatus = statusFilter === "TODAS" ||
        item.estado_nombre?.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sorting (pinned items always first)
    result.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id_registro);
      const bPinned = pinnedIds.has(b.id_registro);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortConfig.key) {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return result;
  }, [cotizaciones, globalSearch, statusFilter, sortConfig, pinnedIds]);

  const filteredOportunidades = useMemo(() => {
    const searchLower = globalSearch.toLowerCase().trim();
    const MAPPING_ESTADOS = { 1: "pendiente", 2: "no cotizado", 3: "rechazado", 4: "cotizado" };
    const filtered = oportunidades.filter((item) => {
      const statusText = MAPPING_ESTADOS[item.estado_oportunidad] || "pendiente";
      return (
        !searchLower ||
        item.id_registro?.toString().includes(searchLower) ||
        item.codigo?.toLowerCase().includes(searchLower) ||
        item.cliente_nombre?.toLowerCase().includes(searchLower) ||
        item.representante_nombre?.toLowerCase().includes(searchLower) ||
        item.referencia?.toLowerCase().includes(searchLower) ||
        formatDate(item.recepcion_solicitud).includes(searchLower) ||
        (item.visita_tecnica && formatDate(item.visita_tecnica).includes(searchLower)) ||
        (item.fecha_limite && formatDate(item.fecha_limite).includes(searchLower)) ||
        (item.emision_cotizacion && formatDate(item.emision_cotizacion).includes(searchLower)) ||
        statusText.includes(searchLower) ||
        item.comentario?.toLowerCase().includes(searchLower)
      );
    });

    return filtered.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id_registro);
      const bPinned = pinnedIds.has(b.id_registro);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [oportunidades, globalSearch, pinnedIds]);

  const filteredAperturas = useMemo(() => {
    const searchLower = globalSearch.toLowerCase().trim();
    const filtered = (dataAperturas?.tabla || []).filter((item) => {
      const codigo = item.cotizacion_codigo || item.id_registro?.codigo || "";
      const referencia = item.cotizacion_referencia || item.id_registro?.referencia || "";
      const area = item.id_registro?.area_nombre || "";
      const formattedTotal = Number(item.total_orden || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      return (
        !searchLower ||
        item.cotizacion_id?.toString().includes(searchLower) ||
        codigo.toLowerCase().includes(searchLower) ||
        item.numero_orden?.toLowerCase().includes(searchLower) ||
        item.cliente_nombre?.toLowerCase().includes(searchLower) ||
        referencia.toLowerCase().includes(searchLower) ||
        area.toLowerCase().includes(searchLower) ||
        formatDate(item.fecha_orden).includes(searchLower) ||
        item.total_orden?.toString().includes(searchLower) ||
        formattedTotal.includes(searchLower)
      );
    });

    return filtered.sort((a, b) => {
      const aPinned = pinnedIds.has(a.cotizacion_id);
      const bPinned = pinnedIds.has(b.cotizacion_id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [dataAperturas?.tabla, globalSearch, pinnedIds]);

  const stats = useMemo(() => {
    return {
      total: filteredData.length,
      adjudicadas: filteredData.filter(c => c.estado_nombre?.includes('ADJUDICADA')).length,
      pendientes: filteredData.filter(c => c.estado_nombre?.includes('PENDIENTE')).length,
    };
  }, [filteredData]);

  const recordCount = useMemo(() => {
    if (currentTab === "cotizaciones") return filteredData.length;
    if (currentTab === "oportunidades") return filteredOportunidades.length;
    if (currentTab === "aperturas") return filteredAperturas.length;
    return 0;
  }, [currentTab, filteredData.length, filteredOportunidades.length, filteredAperturas.length]);

  const recordTypeLabel = useMemo(() => {
    if (currentTab === "cotizaciones") return "Cotizaciones";
    if (currentTab === "oportunidades") return "Oportunidades";
    if (currentTab === "aperturas") return "Aperturas";
    return "Registros";
  }, [currentTab]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const isMountedRef = useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    setCurrentPage(1); // Reset to page 1 on filter/search change
    setCurrentPageOportunidades(1);
    setCurrentPageApertura(1);
  }, [globalSearch, statusFilter, estadoOportunidad]);

  const headers = [
    { label: "Código", key: "codigo", className: "w-[12%]" },
    { label: "Descripción", key: "referencia", className: "w-[25%]" },
    { label: "Cliente", key: "cliente_nombre", className: "w-[20%]" },
    { label: "Área", key: "area_nombre", className: "w-[10%]" },
    { label: "Estado", key: "estado_nombre", className: "w-[10%]" },
    { label: "Envío", key: "envio", className: "w-[8%]" },
    { label: "Fecha", key: "fecha", className: "w-[5%]" },
    { label: "Monto($)", key: "total_cotizacion", className: "w-[10%]" }
  ];

  // Lógica para cerrar el panel al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target)) {
        setShowAdvancedFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calcular filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedAnno !== "%") count++;
    if (selectedMes !== "%") count++;
    if (envioFilter !== "%") count++;
    if (probabilidadFilter !== "%") count++;
    if (comercialSearch !== "%") count++;
    if (tecnicoSearch !== "%") count++;
    if (suministrosValor !== "") count++;
    if (serviciosValor !== "") count++;
    if (ofertaValor !== "") count++;
    if (annoDesde || mesDesde || annoHasta || mesHasta) count++;
    return count;
  }, [selectedAnno, selectedMes, envioFilter, probabilidadFilter, comercialSearch, tecnicoSearch, suministrosValor, serviciosValor, ofertaValor, annoDesde, mesDesde, annoHasta, mesHasta]);

  const hasAnyActiveFilter = useMemo(() => {
    return (
      selectedAnno !== "%" ||
      selectedMes !== "%" ||
      envioFilter !== "%" ||
      probabilidadFilter !== "%" ||
      comercialSearch !== "%" ||
      tecnicoSearch !== "%" ||
      suministrosValor !== "" ||
      serviciosValor !== "" ||
      ofertaValor !== "" ||
      !!annoDesde ||
      !!mesDesde ||
      !!annoHasta ||
      !!mesHasta
    );
  }, [selectedAnno, selectedMes, envioFilter, probabilidadFilter, comercialSearch, tecnicoSearch, suministrosValor, serviciosValor, ofertaValor, annoDesde, mesDesde, annoHasta, mesHasta]);

  // ========
  // FECHAS
  // ========
  // Generar años para filtro dinámicamente
  const yearsOptions = useMemo(() => {
    const list = [{ v: "%", n: "TODOS" }];
    if (dataPeriodos?.anos) {
      dataPeriodos.anos.forEach(yr => {
        list.push({ v: yr.toString(), n: yr.toString() });
      });
    } else {
      const currentYear = new Date().getFullYear();
      for (let i = 0; i <= currentYear - 2011; i++) {
        const yr = (currentYear - i).toString();
        list.push({ v: yr, n: yr });
      }
    }
    return list;
  }, [dataPeriodos]);

  const monthsOptions = useMemo(() => {
    const monthsMap = {
      1: "ENERO", 2: "FEBRERO", 3: "MARZO", 4: "ABRIL", 5: "MAYO", 6: "JUNIO",
      7: "JULIO", 8: "AGOSTO", 9: "SETIEMBRE", 10: "OCTUBRE", 11: "NOVIEMBRE", 12: "DICIEMBRE"
    };
    const list = [{ v: "%", n: "TODOS" }];
    if (dataPeriodos?.meses) {
      dataPeriodos.meses.forEach(m => {
        list.push({ v: m.toString(), n: monthsMap[m] || `MES ${m}` });
      });
    } else {
      Object.keys(monthsMap).forEach(m => {
        list.push({ v: m, n: monthsMap[m] });
      });
    }
    return list;
  }, [dataPeriodos]);

  // Opciones para rangos (sin "TODOS")
  const rangeYearsOptions = useMemo(() => {
    if (dataPeriodos?.anos) {
      return dataPeriodos.anos.map(yr => ({ v: yr.toString(), n: yr.toString() }));
    }
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 2011 + 1 }, (_, i) => ({
      v: (currentYear - i).toString(),
      n: (currentYear - i).toString()
    }));
  }, [dataPeriodos]);

  const rangeMonthsOptions = useMemo(() => {
    const monthsMap = {
      1: "ENERO", 2: "FEBRERO", 3: "MARZO", 4: "ABRIL", 5: "MAYO", 6: "JUNIO",
      7: "JULIO", 8: "AGOSTO", 9: "SETIEMBRE", 10: "OCTUBRE", 11: "NOVIEMBRE", 12: "DICIEMBRE"
    };
    if (dataPeriodos?.meses) {
      return dataPeriodos.meses.map(m => ({ v: m.toString(), n: monthsMap[m] || `MES ${m}` }));
    }
    return Object.keys(monthsMap).map(m => ({ v: m, n: monthsMap[m] }));
  }, [dataPeriodos]);

  const [searchYear, setSearchYear] = useState("");
  const [searchMonth, setSearchMonth] = useState("");

  // Filtrar años según lo que se escribe
  const filteredYears = yearsOptions.filter(opt =>
    opt.n.toLowerCase().includes(searchYear.toLowerCase())
  );

  // Filtrar meses según lo que se escribe
  const filteredMonths = monthsOptions.filter(opt =>
    opt.n.toLowerCase().includes(searchMonth.toLowerCase())
  );

  // ==============
  // PROBABILIDAD
  // ==============
  const opcionesProbabilidad = [
    { id: "0", n: "BAJA", desc: "Menos del 25%", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    { id: "1", n: "MEDIA", desc: "Entre 25% y 50%", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    { id: "2", n: "ALTA", desc: "Entre 50% y 75%", bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
    { id: "3", n: "MUY ALTA", desc: "Entre 75% y 100%", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  ];

  // ==============
  // RESPONSABLES
  // ==============
  // Extraer listas únicas de comerciales y técnicos presentes en los datos
  const listaResponsablesUnicos = useMemo(() => {
    const registros = cotizaciones;
    const mapa = new Map();

    registros.forEach(item => {
      if (responsableTipo === "COMERCIAL" && item.comercial_nombre && item.comercial_nombre !== "Por asignar") {
        if (!mapa.has(item.comercial_nombre)) {
          mapa.set(item.comercial_nombre, {
            nombre: item.comercial_nombre,
            correo: item.comercial_correo,
            movil: item.comercial_movil_corp || item.comercial_movil_pers || "S/N"
          });
        }
      } else if (responsableTipo === "TECNICO" && item.tecnico_nombre && item.tecnico_nombre !== "Por asignar") {
        if (!mapa.has(item.tecnico_nombre)) {
          mapa.set(item.tecnico_nombre, {
            nombre: item.tecnico_nombre,
            correo: item.tecnico_correo,
            movil: item.tecnico_movil_corp || item.tecnico_movil_pers || "S/N"
          });
        }
      }
    });

    let resultado = Array.from(mapa.values());

    // Si el usuario está escribiendo en el buscador, filtramos la lista desplegada
    if (inputBusqueda.trim() !== "") {
      resultado = resultado.filter(r =>
        r.nombre.toLowerCase().includes(inputBusqueda.toLowerCase())
      );
    }

    return resultado;
  }, [cotizaciones, responsableTipo, inputBusqueda]);

  // Obtener iniciales para el avatar visual
  const getIniciales = (nombre) => {
    if (!nombre) return "??";
    const partes = nombre.split(" ").filter(p => p);
    if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
    return partes[0] ? partes[0][0].toUpperCase() : "??";
  };

  const handleOpenReport = () => {
    const params = new URLSearchParams();
    params.append("tipo_reporte", currentTab);
    
    // Add all active dashboard filters
    if (selectedAnno !== "%") params.append("anno", selectedAnno);
    if (selectedMes !== "%") params.append("mes", selectedMes);
    
    // Range filters
    if (annoDesde) params.append("anno_desde", annoDesde);
    if (annoHasta) params.append("anno_hasta", annoHasta);
    if (mesDesde) params.append("mes_desde", mesDesde);
    if (mesHasta) params.append("mes_hasta", mesHasta);
    
    // Global search and field if active
    if (globalSearch) {
      params.append("campo", "all");
      params.append("valor", globalSearch);
    }
    
    if (currentTab === "cotizaciones") {
      if (envioFilter !== "%") params.append("envio", envioFilter);
      if (probabilidadFilter !== "%") params.append("probabilidad", probabilidadFilter);
      if (comercialSearch !== "%") params.append("comercial_search", comercialSearch);
      if (tecnicoSearch !== "%") params.append("tecnico_search", tecnicoSearch);
      if (statusFilter !== "TODAS") params.append("estado", statusFilter);
    } else if (currentTab === "oportunidades") {
      if (comercialSearch !== "%") params.append("comercial_search", comercialSearch);
      if (estadoOportunidad !== "%") params.append("estado_oportunidad", estadoOportunidad);
    } else if (currentTab === "aperturas") {
      if (envioFilter !== "%") params.append("envio", envioFilter);
      if (estadoOrdenFilter !== "%") params.append("estado_orden", estadoOrdenFilter);
      if (prioFilter !== "%") params.append("prio", prioFilter);
      if (plazoValor) {
        params.append("plazo_val", plazoValor);
        params.append("plazo_uni", plazoUnidad);
      }
    }
    
    const API_URL = import.meta.env.VITE_API_URL || "";
    const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
    const reportUrl = `${baseUrl}/cotizaciones/reportes/reporte_cotizaciones_dashboard_html/?${params.toString()}`;
    
    setReporteUrl(reportUrl);
    setReporteDashboardOpen(true);
  };

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col">
      {/* Header Section */}
      <div className="flex flex-row justify-between items-center gap-2">
        <div>
          <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">Módulo Comercial</h1>
          <p className="text-[10px] md:text-sm text-gray-500 font-medium">
            <span className="hidden sm:inline">{recordCount} {recordTypeLabel} encontradas</span>
            <span className="inline sm:hidden">{recordCount} registros</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ERPButton
            onClick={handleOpenReport}
            variant="outline"
            icon={<FileText className="h-3.5 w-3.5" />}
            className="px-2.5 py-1.5 text-xs rounded-xl md:px-4 md:py-2 md:text-sm md:rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50/50 bg-white"
          >
            <span>Reporte</span>
          </ERPButton>
          <ERPButton
            onClick={() => setShowNewModal(true)}
            icon={<Plus className="h-3.5 w-3.5" />}
            className="px-2.5 py-1.5 text-xs rounded-xl md:px-4 md:py-2 md:text-sm md:rounded-lg"
          >
            <span className="hidden sm:inline">Nueva Cotización</span>
            <span className="inline sm:hidden">Nueva</span>
          </ERPButton>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3.5">

        {/* 1. OPORTUNIDADES */}
        <button
          type="button"
          onClick={() => navigate("/sigecom/comercial/oportunidades")}
          className={`w-full text-left bg-white p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98] ${currentTab === "oportunidades"
              ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-md"
              : "border-gray-100 hover:border-indigo-300 hover:shadow-md"
            }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
              Oportunidades
            </span>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className={`w-3.5 h-3.5 text-gray-300 transition-all duration-300 group-hover:text-indigo-400 ${currentTab === "oportunidades" && "text-indigo-500 translate-x-0.5 -translate-y-0.5"}`} />
              <div className={`p-1.5 rounded-lg transition-all duration-300 ${currentTab === "oportunidades" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"}`}>
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">
              {isLoadingOportunidades ? (
                <div className="h-7 w-16 bg-gray-100 animate-pulse rounded-lg" />
              ) : (
                `${dataOportunidades?.dashboard?.total || 0}`
              )}
            </h3>
          </div>

          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[10px] font-bold tracking-tight">
            <div className="flex flex-col">
              <span className="text-gray-900 font-black">
                ${Number(0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="text-right bg-indigo-50/70 text-indigo-700 px-2 py-0.5 rounded-lg flex flex-col items-end">
              <span className="text-[8px] font-black uppercase tracking-wider leading-none mb-0.5">Este Mes</span>
              <span className="font-black text-[10px]">
                {dataOportunidades?.dashboard?.esteMes || 0} • ${Number(0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </button>

        {/* 2. COTIZACIONES */}
        <button
          type="button"
          onClick={() => navigate("/sigecom/comercial/cotizaciones")}
          className={`w-full text-left bg-white p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98] ${currentTab === "cotizaciones"
              ? "border-blue-500 ring-2 ring-blue-500/10 shadow-md"
              : "border-gray-100 hover:border-blue-300 hover:shadow-md"
            }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
              Cotizaciones
            </span>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className={`w-3.5 h-3.5 text-gray-300 transition-all duration-300 group-hover:text-blue-400 ${currentTab === "cotizaciones" && "text-blue-500 translate-x-0.5 -translate-y-0.5"}`} />
              <div className={`p-1.5 rounded-lg transition-all duration-300 ${currentTab === "cotizaciones" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"}`}>
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">
              {isLoadingCotizaciones ? (
                <div className="h-7 w-16 bg-gray-100 animate-pulse rounded-lg" />
              ) : (
                `${dataCotizaciones?.dashboard?.total || 0}`
              )}
            </h3>
          </div>

          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[10px] font-bold tracking-tight">
            <div className="flex flex-col">
              <span className="text-gray-900 font-black">
                ${Number(dataCotizaciones?.dashboard?.montoTotalDolares || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="text-right bg-blue-50/70 text-blue-700 px-2 py-0.5 rounded-lg flex flex-col items-end">
              <span className="text-[8px] font-black uppercase tracking-wider leading-none mb-0.5">Este Mes</span>
              <span className="font-black text-[10px]">
                {dataCotizaciones?.dashboard?.esteMes || 0} • ${Number(dataCotizaciones?.dashboard?.montoTotalDolares || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </button>

        {/* 3. APERTURAS */}
        <button
          type="button"
          onClick={() => navigate("/sigecom/comercial/aperturas")}
          className={`w-full text-left bg-white p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98] ${
            currentTab === "aperturas"
              ? "border-amber-500 ring-2 ring-amber-500/10 shadow-md"
              : "border-gray-100 hover:border-amber-300 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
              Aperturas
            </span>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className={`w-3.5 h-3.5 text-gray-300 transition-all duration-300 group-hover:text-amber-400 ${currentTab === "aperturas" && "text-amber-500 translate-x-0.5 -translate-y-0.5"}`} />
              <div className={`p-1.5 rounded-lg transition-all duration-300 ${currentTab === "aperturas" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"}`}>
                <FolderCheck className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">
              {isLoadingAperturas ? (
                <div className="h-7 w-16 bg-gray-100 animate-pulse rounded-lg" />
              ) : (
                `${dataAperturas?.dashboard?.total || 0}`
              )}
            </h3>
          </div>

          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[10px] font-bold tracking-tight">
            <div className="flex flex-col">
              <span className="text-gray-900 font-black">
                ${Number(dataAperturas?.dashboard?.montoTotalDolares || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="text-right bg-amber-50/70 text-amber-700 px-2 py-0.5 rounded-lg flex flex-col items-end">
              <span className="text-[8px] font-black uppercase tracking-wider leading-none mb-0.5">Este Mes</span>
              <span className="font-black text-[10px]">
                {dataAperturas?.dashboard?.esteMes || 0} • ${Number(dataAperturas?.dashboard?.montoTotalDolares || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </button>

        {/* 4. PROGRAMACIÓN */}
        <button
          type="button"
          onClick={() => navigate("/sigecom/comercial/programacion")}
          className={`w-full text-left bg-white p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98] ${currentTab === "programacion"
              ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-md"
              : "border-gray-100 hover:border-emerald-300 hover:shadow-md"
            }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
              Programación
            </span>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className={`w-3.5 h-3.5 text-gray-300 transition-all duration-300 group-hover:text-emerald-400 ${currentTab === "programacion" && "text-emerald-500 translate-x-0.5 -translate-y-0.5"}`} />
              <div className={`p-1.5 rounded-lg transition-all duration-300 ${currentTab === "programacion" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"}`}>
                <CalendarRange className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">
              {false ? (
                <div className="h-7 w-16 bg-gray-100 animate-pulse rounded-lg" />
              ) : (
                `0`
              )}
            </h3>
          </div>

          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[10px] font-bold tracking-tight">
            <div className="flex flex-col">
              <span className="text-gray-900 font-black">
                ${Number(0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="text-right bg-emerald-50/70 text-emerald-700 px-2 py-0.5 rounded-lg flex flex-col items-end">
              <span className="text-[8px] font-black uppercase tracking-wider leading-none mb-0.5">Este Mes</span>
              <span className="font-black text-[10px]">
                0 • ${Number(0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-3 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">

        <div className="flex flex-row items-center gap-2 w-full lg:max-w-3xl flex-wrap sm:flex-nowrap">
          {/* 1. Buscador Global */}
          <ERPInput
            placeholder="Buscar en la tabla..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="w-full sm:w-72 md:w-80 flex-1 sm:flex-initial"
          />

          {/* 2. Filtro Año (Sin label) */}
          <div className="shrink-0">
            <FilterDropdown
              icon="Calendar"
              value={selectedAnno === "%" ? "TODOS" : selectedAnno}
              onSelect={(val) => setSelectedAnno(prev => String(prev) === String(val) ? "%" : val)}
              options={yearsOptions}
              onToggle={setIsDropdownOpen}
              showSearch={true}
              gridLayout={true}
            />
          </div>

          {/* 3. Filtro Mes (Sin label) */}
          <div className="shrink-0">
            <FilterDropdown
              icon="CalendarDays"
              value={selectedMes === "%" ? "TODOS" : monthsOptions.find(m => m.v === selectedMes)?.n}
              onSelect={(val) => setSelectedMes(prev => String(prev) === String(val) ? "%" : val)}
              options={monthsOptions}
              onToggle={setIsDropdownOpen}
              showSearch={true}
              gridLayout={true}
            />
          </div>

          {/* 4. BOTÓN DE FILTROS ESPECIALES */}
          <div className="relative shrink-0" ref={filterPanelRef}>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[11px] font-black transition-all uppercase shadow-sm ${showAdvancedFilters
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300"
                }`}
            >
              <Filter className={`h-3.5 w-3.5 ${showAdvancedFilters ? "text-indigo-600" : "text-gray-400"}`} />
              <span>Filtros</span>

              {/* Contador Dinámico: Solo brilla si hay filtros activos */}
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center bg-indigo-600 text-white h-4 w-4 rounded-full text-[9px] ml-1 animate-in zoom-in">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* PANEL DESPLEGABLE */}
            {showAdvancedFilters && (
              <div className="absolute left-0 mt-2 w-[500px] bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] p-0 animate-in fade-in zoom-in duration-200 origin-top-left overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex justify-between items-center shrink-0">
                  <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Filtros Avanzados</h4>
                  <button
                    onClick={resetFilters}
                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 uppercase"
                  >
                    Limpiar
                  </button>
                </div>

                <div className="flex-1 flex min-h-0">
                  {/* Panel Izquierdo: Categorías */}
                  <div className="w-[160px] border-r border-gray-100 bg-gray-50/50 flex flex-col p-1.5 gap-1 shrink-0">
                    {[
                      { id: "RANGO", label: "Rango Operativo" },
                      { id: "ESTADO", label: "Estado de Envío" },
                      { id: "PROBABILIDAD", label: "Probabilidad" },
                      { id: "RESPONSABLE", label: "Responsable" },
                      { id: "TIEMPOS", label: "Tiempos" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveFilterTab(tab.id)}
                        className={`text-left px-3 py-2 rounded-lg text-[10px] font-black transition-all uppercase ${activeFilterTab === tab.id
                            ? "bg-white text-indigo-600 shadow-sm border border-gray-100 font-black"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Panel Derecho: Contenido */}
                  <div className={`flex-1 p-4 transition-all duration-300 ${isDropdownOpen ? 'pb-60' : ''}`}>

                    {/* ESTADO */}
                    {activeFilterTab === "ESTADO" && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: "1", n: "PENDIENTE", desc: "Pendiente de envío al cliente", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
                            { id: "2", n: "ENVIADO", desc: "Enviado formalmente al cliente", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
                          ].map((opt) => {
                            const isSelected = envioFilter === opt.id;

                            return (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  // Si ya está seleccionado, mandamos "%" (limpiar), si no, el ID
                                  setEnvioFilter(isSelected ? "%" : opt.id);
                                }}
                                className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${isSelected
                                    ? `${opt.bg} ${opt.text} border-transparent ring-2 ring-indigo-500/20 shadow-sm`
                                    : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 text-gray-500'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  {/* Indicador Circular Animado */}
                                  <div className={`w-2 h-2 rounded-full shadow-sm transition-all duration-300 ${isSelected ? `${opt.dot} scale-125` : 'bg-gray-300 group-hover:bg-gray-400'
                                    }`} />

                                  <div className="flex flex-col text-left">
                                    <span className={`text-[10px] font-black tracking-wide uppercase transition-colors ${isSelected ? opt.text : 'text-gray-600 group-hover:text-indigo-600'
                                      }`}>
                                      {opt.n}
                                    </span>
                                    <span className="text-[8px] font-bold opacity-60 uppercase tracking-tight">
                                      {opt.desc}
                                    </span>
                                  </div>
                                </div>

                                {/* Check visual minimalista */}
                                <div className={`flex items-center justify-center w-5 h-5 rounded-lg transition-all duration-300 ${isSelected ? 'bg-white/50 shadow-inner scale-100 opacity-100' : 'scale-50 opacity-0'
                                  }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* PROBABILIDAD */}
                    {activeFilterTab === "PROBABILIDAD" && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                        <div className="grid grid-cols-1 gap-2">
                          {opcionesProbabilidad.map((opt) => {
                            const isSelected = probabilidadFilter === opt.id;

                            return (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  // Si ya está seleccionado, mandamos "%" (limpiar), si no, el ID
                                  setProbabilidadFilter(isSelected ? "%" : opt.id);
                                }}
                                className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${isSelected
                                    ? `${opt.bg} ${opt.text} border-transparent ring-2 ring-indigo-500/20 shadow-sm`
                                    : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 text-gray-500'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  {/* Indicador Circular Animado */}
                                  <div className={`w-2 h-2 rounded-full shadow-sm transition-all duration-300 ${isSelected ? `${opt.dot} scale-125` : 'bg-gray-300 group-hover:bg-gray-400'
                                    }`} />

                                  <div className="flex flex-col text-left">
                                    <span className={`text-[10px] font-black tracking-wide uppercase transition-colors ${isSelected ? opt.text : 'text-gray-600 group-hover:text-indigo-600'
                                      }`}>
                                      {opt.n}
                                    </span>
                                    <span className="text-[8px] font-bold opacity-60 uppercase tracking-tight">
                                      {opt.desc}
                                    </span>
                                  </div>
                                </div>

                                {/* Check visual minimalista */}
                                <div className={`flex items-center justify-center w-5 h-5 rounded-lg transition-all duration-300 ${isSelected ? 'bg-white/50 shadow-inner scale-100 opacity-100' : 'scale-50 opacity-0'
                                  }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* RESPONSABLE */}
                    {activeFilterTab === "RESPONSABLE" && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                        {/* Segmented Control (Switch) */}
                        <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/40">
                          <button
                            onClick={() => {
                              setResponsableTipo("COMERCIAL");
                              setInputBusqueda("");
                            }}
                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${responsableTipo === "COMERCIAL"
                                ? "bg-white text-indigo-600 shadow-sm"
                                : "text-gray-400 hover:text-gray-600"
                              }`}
                          >
                            Área Comercial
                          </button>
                          <button
                            onClick={() => {
                              setResponsableTipo("TECNICO");
                              setInputBusqueda("");
                            }}
                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${responsableTipo === "TECNICO"
                                ? "bg-white text-indigo-600 shadow-sm"
                                : "text-gray-400 hover:text-gray-600"
                              }`}
                          >
                            Área Técnica
                          </button>
                        </div>

                        {/* Buscador inteligente */}
                        <div className="relative">
                          <ERPInput
                            placeholder={`Buscar ${responsableTipo.toLowerCase()}...`}
                            className="h-9 pl-8 text-[10px] font-medium rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-500/20"
                            value={inputBusqueda}
                            onChange={(e) => {
                              const val = e.target.value;
                              setInputBusqueda(val);
                              // Si borra el buscador por completo, limpiamos el filtro en la API automáticamente
                              if (val.trim() === "") {
                                if (responsableTipo === "COMERCIAL") setComercialSearch("%");
                                else setTecnicoSearch("%");
                              }
                            }}
                            onKeyDown={(e) => {
                              // Al presionar Enter, ejecutamos la búsqueda directa en el Backend
                              if (e.key === 'Enter') {
                                if (responsableTipo === "COMERCIAL") setComercialSearch(inputBusqueda || "%");
                                else setTecnicoSearch(inputBusqueda || "%");
                              }
                            }}
                          />
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                          {inputBusqueda && (
                            <button
                              onClick={() => {
                                setInputBusqueda("");
                                if (responsableTipo === "COMERCIAL") setComercialSearch("%");
                                else setTecnicoSearch("%");
                              }}
                              className="absolute right-2.5 top-2.5 text-[9px] font-bold text-gray-400 hover:text-gray-600 uppercase"
                            >
                              Limpiar
                            </button>
                          )}
                        </div>

                        {/* Listado de Tarjetas de Usuarios de Acceso Rápido */}
                        <div className="max-h-[220px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                          {listaResponsablesUnicos.map((persona) => {
                            const filterActivo = responsableTipo === "COMERCIAL" ? comercialSearch : tecnicoSearch;
                            const isSelected = filterActivo === persona.nombre;

                            return (
                              <button
                                key={persona.nombre}
                                onClick={() => {
                                  // Lógica Toggle inteligente: si ya está seleccionado se limpia (%)
                                  if (responsableTipo === "COMERCIAL") {
                                    setComercialSearch(isSelected ? "%" : persona.nombre);
                                    setInputBusqueda(isSelected ? "" : persona.nombre);
                                  } else {
                                    setTecnicoSearch(isSelected ? "%" : persona.nombre);
                                    setInputBusqueda(isSelected ? "" : persona.nombre);
                                  }
                                }}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all duration-200 ${isSelected
                                    ? "bg-indigo-50/60 border-indigo-200 ring-1 ring-indigo-500/10"
                                    : "bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50/50"
                                  }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Avatar con Iniciales */}
                                  <div className={`w-7 h-7 flex items-center justify-center rounded-lg font-black text-[9px] tracking-tighter shrink-0 transition-colors ${isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                                    }`}>
                                    {getIniciales(persona.nombre)}
                                  </div>

                                  {/* Datos de la Persona */}
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-[10px] font-black truncate uppercase ${isSelected ? "text-indigo-900" : "text-gray-700"}`}>
                                      {persona.nombre}
                                    </span>
                                    <span className="text-[8px] font-bold text-gray-400 truncate tracking-tight lowercase">
                                      {persona.correo || "sin correo institucional"}
                                    </span>
                                  </div>
                                </div>

                                {/* Teléfono o Badge indicador */}
                                <div className="text-right hidden sm:block shrink-0 pl-2">
                                  <span className={`text-[8px] font-black block tracking-tight ${isSelected ? "text-indigo-600" : "text-gray-500"}`}>
                                    {persona.movil}
                                  </span>
                                  <span className="text-[7px] font-medium text-gray-400 uppercase tracking-tighter block">
                                    Móvil
                                  </span>
                                </div>
                              </button>
                            );
                          })}

                          {/* Mensaje de feedback si la lista está vacía */}
                          {listaResponsablesUnicos.length === 0 && (
                            <div className="p-4 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                                {inputBusqueda ? "No hay coincidencias" : `No hay ${responsableTipo.toLowerCase()}es en este mes`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TIEMPOS Y VALIDEZ */}
                    {activeFilterTab === "TIEMPOS" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="space-y-3">
                          {/* SUMINISTROS */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 ml-1 tracking-widest uppercase block">
                              Entrega Suministros
                            </span>
                            <div className="flex items-center gap-1.5 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100">
                              <div className="w-24 shrink-0">
                                <ERPInput
                                  placeholder="Cant."
                                  type="number"
                                  value={suministrosValor}
                                  onChange={(e) => setSuministrosValor(e.target.value)}
                                  className="h-8 w-full bg-white text-[11px] font-bold px-2 rounded-lg"
                                />
                              </div>
                              {/* Segmented Control Horizontal en la misma línea */}
                              <div className="flex-1 grid grid-cols-3 gap-0.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200/40">
                                {[
                                  { code: "D", sing: "Día", plur: "Días" },
                                  { code: "S", sing: "Semana", plur: "Semanas" },
                                  { code: "M", sing: "Mes", plur: "Meses" }
                                ].map((u) => {
                                  const isSelected = suministrosUnidad === u.code;
                                  const label = Number(suministrosValor) === 1 ? u.sing : u.plur;
                                  return (
                                    <button
                                      key={u.code}
                                      type="button"
                                      onClick={() => setSuministrosUnidad(u.code)}
                                      className={`py-1 text-[8.5px] font-black uppercase tracking-tight rounded-md transition-all duration-150 ${isSelected
                                          ? "bg-white text-indigo-600 shadow-sm border border-gray-200/50"
                                          : "text-gray-500 hover:text-gray-900"
                                        }`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* SERVICIOS */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 ml-1 tracking-widest uppercase block">
                              Entrega Servicios
                            </span>
                            <div className="flex items-center gap-1.5 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100">
                              <div className="w-24 shrink-0">
                                <ERPInput
                                  placeholder="Cant."
                                  type="number"
                                  value={serviciosValor}
                                  onChange={(e) => setServiciosValor(e.target.value)}
                                  className="h-8 w-full bg-white text-[11px] font-bold px-2 rounded-lg"
                                />
                              </div>
                              {/* Segmented Control Horizontal en la misma línea */}
                              <div className="flex-1 grid grid-cols-3 gap-0.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200/40">
                                {[
                                  { code: "D", sing: "Día", plur: "Días" },
                                  { code: "S", sing: "Semana", plur: "Semanas" },
                                  { code: "M", sing: "Mes", plur: "Meses" }
                                ].map((u) => {
                                  const isSelected = serviciosUnidad === u.code;
                                  const label = Number(serviciosValor) === 1 ? u.sing : u.plur;
                                  return (
                                    <button
                                      key={u.code}
                                      type="button"
                                      onClick={() => setServiciosUnidad(u.code)}
                                      className={`py-1 text-[8.5px] font-black uppercase tracking-tight rounded-md transition-all duration-150 ${isSelected
                                          ? "bg-white text-indigo-600 shadow-sm border border-gray-200/50"
                                          : "text-gray-500 hover:text-gray-900"
                                        }`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* OFERTA */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 ml-1 tracking-widest uppercase block">
                              Validez Oferta
                            </span>
                            <div className="flex items-center gap-1.5 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100">
                              <div className="w-24 shrink-0">
                                <ERPInput
                                  placeholder="Cant."
                                  type="number"
                                  value={ofertaValor}
                                  onChange={(e) => setOfertaValor(e.target.value)}
                                  className="h-8 w-full bg-white text-[11px] font-bold px-2 rounded-lg"
                                />
                              </div>
                              {/* Segmented Control Horizontal en la misma línea */}
                              <div className="flex-1 grid grid-cols-3 gap-0.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200/40">
                                {[
                                  { code: "D", sing: "Día", plur: "Días" },
                                  { code: "S", sing: "Semana", plur: "Semanas" },
                                  { code: "M", sing: "Mes", plur: "Meses" }
                                ].map((u) => {
                                  const isSelected = ofertaUnidad === u.code;
                                  const label = Number(ofertaValor) === 1 ? u.sing : u.plur;
                                  return (
                                    <button
                                      key={u.code}
                                      type="button"
                                      onClick={() => setOfertaUnidad(u.code)}
                                      className={`py-1 text-[8.5px] font-black uppercase tracking-tight rounded-md transition-all duration-150 ${isSelected
                                          ? "bg-white text-indigo-600 shadow-sm border border-gray-200/50"
                                          : "text-gray-500 hover:text-gray-900"
                                        }`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RANGO OPERATIVO */}
                    {activeFilterTab === "RANGO" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Desde */}
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-400 tracking-widest uppercase block">Desde</span>
                            <div className="flex flex-col gap-2">
                              <FilterDropdown
                                label="Año"
                                icon="Calendar"
                                value={annoDesde ? annoDesde : "Seleccionar"}
                                onSelect={(val) => setAnnoDesde(prev => String(prev) === String(val) ? "" : val)}
                                options={rangeYearsOptions}
                                onToggle={setIsDropdownOpen}
                                showSearch={true}
                                gridLayout={true}
                              />
                              <FilterDropdown
                                label="Mes"
                                icon="CalendarDays"
                                value={mesDesde ? rangeMonthsOptions.find(m => m.v === mesDesde)?.n || "Seleccionar" : "Seleccionar"}
                                onSelect={(val) => setMesDesde(prev => String(prev) === String(val) ? "" : val)}
                                options={rangeMonthsOptions}
                                onToggle={setIsDropdownOpen}
                                showSearch={true}
                                gridLayout={true}
                              />
                            </div>
                          </div>

                          {/* Hasta */}
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-400 tracking-widest uppercase block">Hasta</span>
                            <div className="flex flex-col gap-2">
                              <FilterDropdown
                                label="Año"
                                icon="Calendar"
                                value={annoHasta ? annoHasta : "Seleccionar"}
                                onSelect={(val) => setAnnoHasta(prev => String(prev) === String(val) ? "" : val)}
                                options={rangeYearsOptions}
                                onToggle={setIsDropdownOpen}
                                showSearch={true}
                                gridLayout={true}
                              />
                              <FilterDropdown
                                label="Mes"
                                icon="CalendarDays"
                                value={mesHasta ? rangeMonthsOptions.find(m => m.v === mesHasta)?.n || "Seleccionar" : "Seleccionar"}
                                onSelect={(val) => setMesHasta(prev => String(prev) === String(val) ? "" : val)}
                                options={rangeMonthsOptions}
                                onToggle={setIsDropdownOpen}
                                showSearch={true}
                                gridLayout={true}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. BOTÓN DE LIMPIAR TODO (ROJO MINIMALISTA A LA DERECHA DE FILTROS) */}
          {hasAnyActiveFilterOrSearch && (
            <button
              onClick={handleClearAllFilters}
              className="flex items-center justify-center px-3.5 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl transition-all shadow-sm shrink-0 animate-in zoom-in"
              title="Limpiar todos los filtros"
            >
              <Brush className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 3. Filtros de Estado */}
        <div className="flex items-center space-x-0.5 overflow-x-auto w-full lg:w-auto no-scrollbar pb-1 lg:pb-0 justify-end">
          {currentTab === "oportunidades" ? (
            [
              { label: "PENDIENTE", value: "1" },
              { label: "NO COTIZADO", value: "2" },
              { label: "RECHAZADO", value: "3" },
              { label: "COTIZADO", value: "4" }
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setEstadoOportunidad(prev => prev === opt.value ? "%" : opt.value)}
                className={`whitespace-nowrap px-3 py-1.5 text-[9px] font-black rounded-xl transition-all ${estadoOportunidad === opt.value
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                {opt.label}
              </button>
            ))
          ) : (
            [
              "PENDIENTE", "EN SEGUIMIENTO",
              "ADJUDICADO", "POSTERGADA", "PERDIDA", "ANULADO"
            ].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(prev => prev === status ? "TODAS" : status)}
                className={`whitespace-nowrap px-3 py-1.5 text-[9px] font-black rounded-xl transition-all ${statusFilter === status
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                {status}
              </button>
            ))
          )}
        </div>
      </div>

      {/* CONTENEDOR DINÁMICO DE TABLAS */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {currentTab === "cotizaciones" && (
          <TablaCotizaciones
            data={filteredData}
            isLoading={isLoading}
            headers={headers}
            sortConfig={sortConfig}
            onSort={handleSort}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onRowClick={(id) => navigate(`/sigecom/comercial/cotizaciones/${id}`)}
            onRowContextMenu={handleRowContextMenu}
            pinnedIds={pinnedIds}
          />
        )}

        {currentTab === "oportunidades" && (
          <TablaOportunidades
            data={filteredOportunidades}
            isLoading={isLoadingOportunidades}
            currentPage={currentPageOportunidades}
            pageSize={pageSize}
            onPageChange={setCurrentPageOportunidades}
            onRowClick={(id) => navigate(`/sigecom/comercial/oportunidades/${id}`)}
            onRowContextMenu={handleRowContextMenu}
            pinnedIds={pinnedIds}
          />
        )}

        {currentTab === "aperturas" && (
          <TablaApertura
            data={filteredAperturas}
            isLoading={isLoadingAperturas}
            currentPage={currentPageApertura}
            pageSize={pageSize}
            onPageChange={setCurrentPageApertura}
            onRowClick={(cotizacionId) => navigate(`/sigecom/comercial/aperturas/${cotizacionId}`)}
            onRowContextMenu={handleRowContextMenu}
            pinnedIds={pinnedIds}
          />
        )}

        {currentTab === "programacion" && (
          <div className="p-8 text-center text-xs font-bold text-gray-400 uppercase">
            Tabla de Programación de Servicios
          </div>
        )}
      </div>

      {/* Modals */}
      <CotizacionNuevaModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        modo="A"
        tipo="N"
        dashboard="C"
      />

      {/* MODAL DE PREVISUALIZACIÓN DE REPORTE DASHBOARD */}
      {reporteDashboardOpen && createPortal(
        <div 
          onClick={() => setReporteDashboardOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-[10000] flex items-center justify-center p-4 transition-all"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 transition-all duration-300"
            style={{
              height: isPdfReport ? '88vh' : (reporteHeight ? `${Math.min(window.innerHeight * 0.88, reporteHeight + 140)}px` : '350px')
            }}
          >
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">
                  {reporteTitle}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {isPdfReport && (
                  <>
                    <button
                      onClick={() => {
                        const cleanBaseURL = api.defaults.baseURL.endsWith('/') ? api.defaults.baseURL.slice(0, -1) : api.defaults.baseURL;
                        window.open(`${cleanBaseURL}/cotizaciones/${reporteActiveId}/pdf/`, '_blank');
                      }}
                      className="flex items-center px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-black text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-sm transition-all uppercase group"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                      Descargar PDF
                    </button>

                    <button
                      onClick={() => {
                        const cleanBaseURL = api.defaults.baseURL.endsWith('/') ? api.defaults.baseURL.slice(0, -1) : api.defaults.baseURL;
                        window.open(`${cleanBaseURL}/cotizaciones/cotizacion/word/${reporteActiveId}/`, '_blank');
                      }}
                      className="flex items-center px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[10px] font-black text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:shadow-sm transition-all uppercase group"
                    >
                      <FileDown className="h-3.5 w-3.5 mr-1.5 text-blue-600 group-hover:scale-110 transition-transform" />
                      Descargar Word
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setReporteDashboardOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600 bg-slate-100 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Cuerpo del Modal con Iframe */}
            <div 
              className="flex-1 bg-slate-50 p-4 overflow-hidden relative flex items-center justify-center"
              onMouseEnter={(e) => {
                const iframe = e.currentTarget.querySelector('iframe');
                if (iframe) {
                  try {
                    iframe.focus();
                    iframe.contentWindow?.focus();
                  } catch (err) {
                    console.error("Error focusing iframe on hover:", err);
                  }
                }
              }}
            >
              {reporteLoading && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Preparando reporte...</span>
                </div>
              )}
              <iframe 
                src={reporteUrl}
                className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-sm"
                title="Reporte Cotizaciones Dashboard"
                scrolling={isPdfReport ? "auto" : (reporteHeight && (reporteHeight + 140 < window.innerHeight * 0.88) ? "no" : "auto")}
                style={{ overflow: isPdfReport ? "auto" : (reporteHeight && (reporteHeight + 140 < window.innerHeight * 0.88) ? 'hidden' : 'auto') }}
                onLoad={(e) => {
                  const iframe = e.target;
                  setTimeout(() => {
                    try {
                      iframe.focus();
                      iframe.contentWindow?.focus();
                    } catch (err) {
                      console.error("Error focusing iframe on load:", err);
                    }
                  }, 50);
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Context Menu for right-click on Table Rows */}
      {contextMenuOpen && contextMenuPos && contextMenuItem && (
        <div
          style={{
            position: "fixed",
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            width: 1,
            height: 1,
            pointerEvents: "none",
            zIndex: 9999
          }}
        >
          <ActionMenu
            open={contextMenuOpen}
            onOpenChange={setContextMenuOpen}
            title="Opciones de Registro"
            align="start"
            customTrigger={<div className="w-0 h-0" />}
            options={
              currentTab === "cotizaciones"
                ? [
                    {
                      label: pinnedIds.has(contextMenuItem.id_registro) ? "Desfijar de la lista" : "Fijar al inicio",
                      icon: pinnedIds.has(contextMenuItem.id_registro) ? PinOff : Pin,
                      onClick: () => togglePin(contextMenuItem.id_registro)
                    },
                    {
                      label: "Nueva Versión",
                      icon: GitBranch,
                      onClick: () => handleNuevaVersion(contextMenuItem)
                    },
                    {
                      label: "Generar Copia",
                      icon: Copy,
                      onClick: () => handleGenerarCopia(contextMenuItem)
                    },
                    {
                      label: "Enviar Cotización",
                      icon: Mail,
                      disabled: contextMenuItem.estado_envio === 2,
                      onClick: () => handleEnviarCotizacion(contextMenuItem)
                    },
                    {
                      label: "Pasar a Apertura",
                      icon: ShieldCheck,
                      onClick: () => handlePasarAApertura(contextMenuItem)
                    },

                    {
                      label: "Reporte",
                      icon: FileText,
                      hasSubmenu: true,
                      submenuContent: (
                        <>
                          <DropdownMenu.Item
                            onSelect={(e) => e.preventDefault()}
                            className="flex items-center gap-1 px-2 py-2 text-[11px] font-bold uppercase tracking-tight rounded-xl cursor-pointer outline-none transition-all text-slate-600 hover:bg-slate-50 hover:text-indigo-600 select-none"
                            onClick={() => {
                              const cleanBaseURL = api.defaults.baseURL.endsWith('/') ? api.defaults.baseURL.slice(0, -1) : api.defaults.baseURL;
                              setReporteActiveId(contextMenuItem.id_registro);
                              setIsPdfReport(false);
                              setReporteTitle("Reporte Detallado");
                              setReporteUrl(`${cleanBaseURL}/cotizaciones/reporte-detallado/${contextMenuItem.id_registro}/`);
                              setReporteDashboardOpen(true);
                              setContextMenuOpen(false);
                            }}
                          >
                            <FileText className="w-4 h-4 opacity-70 text-indigo-600" />
                            <span>Reporte Detallado</span>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onSelect={(e) => e.preventDefault()}
                            className="flex items-center gap-1 px-2 py-2 text-[11px] font-bold uppercase tracking-tight rounded-xl cursor-pointer outline-none transition-all text-slate-600 hover:bg-slate-50 hover:text-indigo-600 select-none"
                            onClick={() => {
                              const cleanBaseURL = api.defaults.baseURL.endsWith('/') ? api.defaults.baseURL.slice(0, -1) : api.defaults.baseURL;
                              setReporteActiveId(contextMenuItem.id_registro);
                              setIsPdfReport(false);
                              setReporteTitle("Reporte Resumen");
                              setReporteUrl(`${cleanBaseURL}/cotizaciones/reporte-resumen/${contextMenuItem.id_registro}/`);
                              setReporteDashboardOpen(true);
                              setContextMenuOpen(false);
                            }}
                          >
                            <FileText className="w-4 h-4 opacity-70 text-amber-600" />
                            <span>Reporte Resumen</span>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onSelect={(e) => e.preventDefault()}
                            className="flex items-center gap-1 px-2 py-2 text-[11px] font-bold uppercase tracking-tight rounded-xl cursor-pointer outline-none transition-all text-slate-600 hover:bg-slate-50 hover:text-indigo-600 select-none"
                            onClick={() => {
                              const cleanBaseURL = api.defaults.baseURL.endsWith('/') ? api.defaults.baseURL.slice(0, -1) : api.defaults.baseURL;
                              setReporteActiveId(contextMenuItem.id_registro);
                              setIsPdfReport(true);
                              setReporteTitle("Previsualización de Propuesta Económica");
                              setReporteUrl(`${cleanBaseURL}/cotizaciones/${contextMenuItem.id_registro}/pdf-preview/`);
                              setReporteDashboardOpen(true);
                              setContextMenuOpen(false);
                            }}
                          >
                            <FileText className="w-4 h-4 opacity-70 text-slate-500" />
                            <span>Reporte PDF / Word</span>
                          </DropdownMenu.Item>
                        </>
                      )
                    },
                    {
                      label: "Borrar",
                      icon: Trash2,
                      className: "text-red-600 hover:bg-red-50 hover:text-red-700",
                      onClick: () => handleEliminarCotizacion(contextMenuItem)
                    }
                  ]
                : currentTab === "oportunidades"
                ? [
                    {
                      label: pinnedIds.has(contextMenuItem.id_registro) ? "Desfijar de la lista" : "Fijar al inicio",
                      icon: pinnedIds.has(contextMenuItem.id_registro) ? PinOff : Pin,
                      onClick: () => togglePin(contextMenuItem.id_registro)
                    },
                    {
                      label: "Nueva Versión",
                      icon: GitBranch,
                      onClick: () => handleNuevaVersion(contextMenuItem)
                    },
                    {
                      label: "Generar Copia",
                      icon: Copy,
                      onClick: () => handleGenerarCopia(contextMenuItem)
                    },
                    {
                      label: "Pasar a Cotización",
                      icon: ArrowUpRight,
                      onClick: () => handlePasarACotizacion(contextMenuItem)
                    },
                    {
                      label: "Eliminar",
                      icon: Trash2,
                      className: "text-red-600 hover:bg-red-50 hover:text-red-700",
                      onClick: () => handleEliminarCotizacion(contextMenuItem)
                    }
                  ]
                : [
                    {
                      label: pinnedIds.has(
                        currentTab === "aperturas" 
                          ? contextMenuItem.cotizacion_id 
                          : contextMenuItem.id_registro
                      ) ? "Desfijar de la lista" : "Fijar al inicio",
                      icon: pinnedIds.has(
                        currentTab === "aperturas" 
                          ? contextMenuItem.cotizacion_id 
                          : contextMenuItem.id_registro
                      ) ? PinOff : Pin,
                      onClick: () => {
                        const targetId = currentTab === "aperturas" 
                          ? contextMenuItem.cotizacion_id 
                          : contextMenuItem.id_registro;
                        togglePin(targetId);
                      }
                    },
                    {
                      label: "Copiar Código",
                      icon: Copy,
                      onClick: () => {
                        const code = contextMenuItem.codigo || contextMenuItem.cotizacion_codigo || contextMenuItem.numero_orden || "";
                        if (code) {
                          navigator.clipboard.writeText(code);
                          toast.success(`Código "${code}" copiado`);
                        }
                      }
                    },
                    {
                      label: "Copiar Cliente",
                      icon: ClipboardCheck,
                      onClick: () => {
                        const client = contextMenuItem.cliente_nombre || "";
                        if (client) {
                          navigator.clipboard.writeText(client);
                          toast.success("Nombre del cliente copiado");
                        }
                      }
                    }
                  ]
            }
          />
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  FileText,
  CheckCircle2,
  Wallet2,
  PackageCheck,
  ArrowUpRight,
  Search,
  FilePlus,
  MoreHorizontal,
  RefreshCw,
  Loader,
  ChevronDown,
  DollarSign,
  Coins,
  Clock,
  ShieldCheck,
  TrendingUp,
  Truck
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { ERPInput } from "@/components/ui/ERPComponents";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

// TABLAS IMPORTADAS
import TablaAtencionSolicitud from "./tablas/TablaAtencionSolicitud";
import TablaLiquidaciones from "./tablas/TablaLiquidaciones";
import TablaAprobacionLiquidaciones from "./tablas/TablaAprobacionLiquidaciones";
import TablaCajaChica from "./tablas/TablaCajaChica";
import TablaGuiasSalida from "./tablas/TablaGuiasSalida";
import AperturaCajaModal from "./caja_chica/AperturaCajaModal";

// Helper para construir params
const buildQueryParams = (anno, mes) => {
  const params = {};
  if (anno !== undefined && anno !== null) params.anno = anno;
  if (mes !== undefined && mes !== null) params.mes = mes;
  return params;
};

// FUNCIONES DE FETCHING CON REACT QUERY
const fetchDashboardResumen = async ({ queryKey }) => {
  const [_, anno, mes] = queryKey;
  const token = localStorage.getItem("access_token");
  const params = buildQueryParams(anno, mes);

  const { data } = await api.get("caja_chica/dashboard_resumen/", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data?.stats || {};
};

const fetchAtencionData = async ({ queryKey }) => {
  const [_, anno, mes] = queryKey;
  const token = localStorage.getItem("access_token");
  const params = buildQueryParams(anno, mes);

  const { data } = await api.get("caja_chica/lista_atencion/", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};

const fetchLiquidacionesData = async ({ queryKey }) => {
  const [_, anno, mes] = queryKey;
  const token = localStorage.getItem("access_token");
  const params = buildQueryParams(anno, mes);

  const { data } = await api.get("caja_chica/lista_liquidaciones/", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};

const fetchAprobacionesData = async ({ queryKey }) => {
  const [_, anno, mes] = queryKey;
  const token = localStorage.getItem("access_token");
  const params = buildQueryParams(anno, mes);

  const { data } = await api.get("caja_chica/lista_aprobaciones/", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};

const fetchCajaChicaData = async ({ queryKey }) => {
  const [_, anno, mes] = queryKey;
  const token = localStorage.getItem("access_token");
  const params = buildQueryParams(anno, mes);

  const { data } = await api.get("caja_chica/lista_caja_chica/", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};

const fetchGuiasData = async ({ queryKey }) => {
  const [_, anno, mes] = queryKey;
  const token = localStorage.getItem("access_token");
  const params = buildQueryParams(anno, mes);

  const { data } = await api.get("caja_chica/lista_guias_salida/", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};

export default function CajaChica({ defaultTab = "atencion" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser: user } = useAuth();
  const [currentTab, setCurrentTab] = useState(defaultTab);
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedAnno, setSelectedAnno] = useState(new Date().getFullYear());
  const [selectedMes, setSelectedMes] = useState("%");
  const [currentPage, setCurrentPage] = useState(1);
  const [aperturaModalOpen, setAperturaModalOpen] = useState(false);

  // PAGINACIÓN RESPONSIVA DINÁMICA (Cero scroll vertical)
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const calculatePageSize = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      if (vw < 768) {
        setPageSize(6);
        return;
      }

      const rowHeight = 42;
      const chromeHeight = vh < 850 ? 370 : 455;
      const availableHeight = Math.max(160, vh - chromeHeight);
      const computedRows = Math.floor(availableHeight / rowHeight);

      const finalPageSize = Math.max(Math.min(computedRows, 25), 5);
      setPageSize(finalPageSize);
    };

    calculatePageSize();
    window.addEventListener("resize", calculatePageSize);
    return () => window.removeEventListener("resize", calculatePageSize);
  }, []);

  // ACCIÓN PRINCIPAL DE FLUJO: ATENDER SOLICITUD
  const handleAtender = async (item) => {
    const targetId = item.id_registro_directo || (String(item.id_registro).includes("_") ? item.id_registro.split("_")[1] : item.id_registro);
    const nro = item.nro_solicitud || targetId;
    if (!window.confirm(`¿Confirmar atención de la Solicitud #${nro}? Pasará al estado ATENDIDO, PENDIENTE DE LIQUIDACIÓN.`)) {
      return;
    }

    try {
      await api.patch(`/caja_chica/solicitudes_caja_chica/${targetId}/`, {
        id_estado: 2
      });
      toast.success(`Solicitud #${nro} atendida con éxito. Ha pasado a Liquidaciones.`);
      queryClient.invalidateQueries(["caja-chica-atencion"]);
      queryClient.invalidateQueries(["caja-chica-liquidaciones"]);
      queryClient.invalidateQueries(["caja-chica-resumen"]);
    } catch (err) {
      console.error("Error al atender solicitud:", err);
      toast.error(err.response?.data?.error || "Error al atender la solicitud");
    }
  };

  // Sincronizar pestaña si cambia la prop defaultTab
  useEffect(() => {
    setCurrentTab(defaultTab);
    sessionStorage.setItem("caja_chica_active_tab", defaultTab);
  }, [defaultTab]);

  // Reset pagination al cambiar filtros o pestaña
  useEffect(() => {
    setCurrentPage(1);
  }, [currentTab, globalSearch, selectedAnno, selectedMes]);

  // QUERY: Resumen global para las 5 tarjetas KPI
  const { data: statsGlobal = {}, isLoading: isLoadingStats, isFetching: isFetchingStats } = useQuery({
    queryKey: ["caja-chica-resumen", selectedAnno, selectedMes],
    queryFn: fetchDashboardResumen,
    staleTime: 30000,
    keepPreviousData: true
  });

  // QUERIES POR SUBMÓDULO
  const { data: dataAtencion, isLoading: isLoadingAtencion, isFetching: isFetchingAtencion } = useQuery({
    queryKey: ["caja-chica-atencion", selectedAnno, selectedMes],
    queryFn: fetchAtencionData,
    staleTime: 30000,
    enabled: currentTab === "atencion",
    keepPreviousData: true
  });

  const { data: dataLiquidaciones, isLoading: isLoadingLiq, isFetching: isFetchingLiq } = useQuery({
    queryKey: ["caja-chica-liquidaciones", selectedAnno, selectedMes],
    queryFn: fetchLiquidacionesData,
    staleTime: 30000,
    enabled: currentTab === "liquidaciones",
    keepPreviousData: true
  });

  const { data: dataAprobaciones, isLoading: isLoadingAprob, isFetching: isFetchingAprob } = useQuery({
    queryKey: ["caja-chica-aprobacion", selectedAnno, selectedMes],
    queryFn: fetchAprobacionesData,
    staleTime: 30000,
    enabled: currentTab === "aprobacion",
    keepPreviousData: true
  });

  const { data: dataCajaChica, isLoading: isLoadingCaja, isFetching: isFetchingCaja } = useQuery({
    queryKey: ["caja-chica-general", selectedAnno, selectedMes],
    queryFn: fetchCajaChicaData,
    staleTime: 30000,
    enabled: currentTab === "caja_chica",
    keepPreviousData: true
  });

  const { data: dataGuias, isLoading: isLoadingGuias, isFetching: isFetchingGuias } = useQuery({
    queryKey: ["caja-chica-guias", selectedAnno, selectedMes],
    queryFn: fetchGuiasData,
    staleTime: 30000,
    enabled: currentTab === "guias_salida",
    keepPreviousData: true
  });

  const isFetching = isFetchingStats || isFetchingAtencion || isFetchingLiq || isFetchingAprob || isFetchingCaja || isFetchingGuias;

  // Data activa
  const activeData = useMemo(() => {
    if (currentTab === "atencion") return dataAtencion?.tabla || [];
    if (currentTab === "liquidaciones") return dataLiquidaciones?.tabla || [];
    if (currentTab === "aprobacion") return dataAprobaciones?.tabla || [];
    if (currentTab === "caja_chica") return dataCajaChica?.tabla || [];
    if (currentTab === "guias_salida") return dataGuias?.tabla || [];
    return [];
  }, [currentTab, dataAtencion, dataLiquidaciones, dataAprobaciones, dataCajaChica, dataGuias]);

  // Filtrado local por búsqueda
  const filteredData = useMemo(() => {
    let result = activeData;

    const search = globalSearch.toLowerCase().trim();
    if (!search) return result;

    return result.filter((item) => {
      const regId = (item.id_registro_directo || (item.id_registro && String(item.id_registro).includes('_') ? item.id_registro.split('_')[1] : item.id_registro) || "").toString().toLowerCase();
      const nro = (item.nro_solicitud || item.registro || "").toString().toLowerCase();
      const cod = (item.codigo || item.referencia || "").toLowerCase();
      const conc = (item.concepto || "").toLowerCase();
      const nom = (item.nombre || item.solicitante_nombre || item.solicitante || item.encargado || "").toLowerCase();
      const area = (item.area || item.origen || item.destino || "").toLowerCase();
      const tipo = (item.tipo || item.operacion || "").toLowerCase();
      const estado = (item.estado_nombre || "").toLowerCase();

      return (
        regId.includes(search) ||
        nro.includes(search) ||
        cod.includes(search) ||
        conc.includes(search) ||
        nom.includes(search) ||
        area.includes(search) ||
        tipo.includes(search) ||
        estado.includes(search)
      );
    });
  }, [activeData, globalSearch]);

  const activeFilteredStats = useMemo(() => {
    if (!globalSearch) return null;
    const total = filteredData.length;
    const montoTotalSoles = filteredData.reduce((sum, item) => sum + (parseFloat(item.monto_pen) || 0), 0);
    const montoTotalDolares = filteredData.reduce((sum, item) => sum + (parseFloat(item.monto_usd) || 0), 0);
    return {
      count: total,
      montoTotalSoles,
      montoTotalDolares
    };
  }, [filteredData, globalSearch]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  const TAB_LABELS = {
    atencion: "ATENCION",
    liquidaciones: "LIQUIDACIONES",
    aprobacion: "APROBACION",
    caja_chica: "CAJA CHICA",
    guias_salida: "GUIA SALIDA",
  };

  const handleTabChange = (tabKey) => {
    setCurrentTab(tabKey);
    sessionStorage.setItem("caja_chica_active_tab", tabKey);
    navigate(`/caja-chica/${tabKey}`);
  };

  const handleRowClick = (item) => {
    if (currentTab === "guias_salida") {
      const regId = item.id_registro || item.registro;
      navigate(`/logistica/salidas/${regId}`, {
        state: {
          returnUrl: `/caja-chica/${currentTab}`,
          from: "caja-chica",
          fromTab: currentTab,
          tabLabel: "GUIA SALIDA"
        }
      });
      return;
    }
    const targetId = item.id_registro_directo || (String(item.id_registro).includes("_") ? item.id_registro.split("_")[1] : item.id_registro);
    sessionStorage.setItem("caja_chica_active_tab", currentTab);
    navigate(`/caja-chica/${currentTab}/${targetId}`, {
      state: { 
        returnUrl: `/caja-chica/${currentTab}`, 
        from: "caja-chica",
        fromTab: currentTab,
        tabLabel: TAB_LABELS[currentTab] || "CAJA CHICA"
      }
    });
  };

  const handleNueva = () => {
    navigate("/caja-chica/solicitud/nueva");
  };

  const formatPEN = (val) => `S/. ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatUSD = (val) => `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isLoadingTable =
    (currentTab === "atencion" && isLoadingAtencion) ||
    (currentTab === "liquidaciones" && isLoadingLiq) ||
    (currentTab === "aprobacion" && isLoadingAprob) ||
    (currentTab === "caja_chica" && isLoadingCaja) ||
    (currentTab === "guias_salida" && isLoadingGuias);

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col">
      {/* 1. ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">
              Módulo Caja Chica
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sesión activa
            </span>
          </div>
        </div>

        {/* ACCIONES DEL HEADER SEGÚN SUBMÓDULO */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {currentTab === "caja_chica" ? (
            <Button
              onClick={() => setAperturaModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider px-4 h-9 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <Wallet2 size={15} />
              Apertura / Ingreso
            </Button>
          ) : currentTab === "guias_salida" ? (
            <Button
              onClick={() => navigate("/logistica/salidas/nueva")}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider px-4 h-9 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <PackageCheck size={15} />
              Nueva Guía
            </Button>
          ) : (
            <Button
              onClick={handleNueva}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider px-5 h-9 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <FilePlus size={15} />
              Nueva Solicitud
            </Button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors border border-gray-200 bg-white"
            title="Refrescar"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVEGACIÓN HORIZONTAL ESTILO JIRA */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs px-3 sm:px-6">
        <div className="flex items-center justify-between border-b border-gray-100">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto overflow-y-hidden scrollbar-none py-1">
            {[
              {
                id: "atencion",
                label: "Atención Solicitud",
                icon: ClipboardList,
                badge: `${statsGlobal.atencion?.count ?? 0}`,
              },
              {
                id: "liquidaciones",
                label: "Liquidaciones",
                icon: FileText,
                badge: `${statsGlobal.liquidaciones?.count ?? 0}`,
              },
              {
                id: "aprobacion",
                label: "Aprobación Liq.",
                icon: CheckCircle2,
                badge: `${statsGlobal.aprobacion?.count ?? 0}`,
              },
              {
                id: "caja_chica",
                label: "Caja Chica",
                icon: Wallet2,
                badge: `${statsGlobal.caja_chica?.count ?? 0}`,
              },
              {
                id: "guias_salida",
                label: "Guías Salida",
                icon: PackageCheck,
                badge: `${statsGlobal.guias_salida?.count ?? 0}`,
              },
            ].map((tab) => {
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
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>Gestión Caja Chica</span>
          </div>
        </div>
      </div>

      {/* 3. FILA ÚNICA DE 4 KPIS CONTEXTUALES SEGÚN LA SECCIÓN ACTIVA */}
      {currentTab === "atencion" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Solicitudes</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {isLoadingAtencion ? "--" : (activeFilteredStats ? activeFilteredStats.count : (statsGlobal.atencion?.count ?? 0))}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-sky-600 block">Por Atender</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Monto PEN</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {formatPEN(activeFilteredStats ? activeFilteredStats.montoTotalSoles : statsGlobal.atencion?.montoTotalSoles)}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-teal-600 block">Soles</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Monto USD</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {formatUSD(activeFilteredStats ? activeFilteredStats.montoTotalDolares : statsGlobal.atencion?.montoTotalDolares)}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-blue-600 block">Dólares</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Estado Operativo</span>
                <span className="text-xl font-black text-gray-900 leading-none">En Proceso</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-amber-600 block">Activo</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "liquidaciones" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Liquidaciones</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {isLoadingLiq ? "--" : (activeFilteredStats ? activeFilteredStats.count : (statsGlobal.liquidaciones?.count ?? 0))}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-amber-600 block">Rendiciones</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Liquidado PEN</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {formatPEN(activeFilteredStats ? activeFilteredStats.montoTotalSoles : statsGlobal.liquidaciones?.montoTotalSoles)}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-teal-600 block">Soles</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Liquidado USD</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {formatUSD(activeFilteredStats ? activeFilteredStats.montoTotalDolares : statsGlobal.liquidaciones?.montoTotalDolares)}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-blue-600 block">Dólares</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sustento Contable</span>
                <span className="text-xl font-black text-gray-900 leading-none">Auditable</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">Documentado</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "aprobacion" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total por Aprobar</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {isLoadingAprob ? "--" : (activeFilteredStats ? activeFilteredStats.count : (statsGlobal.aprobacion?.count ?? 0))}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-indigo-600 block">Pendiente V°B°</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Monto Revisión PEN</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {formatPEN(activeFilteredStats ? activeFilteredStats.montoTotalSoles : statsGlobal.aprobacion?.montoTotalSoles)}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-teal-600 block">Soles</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Monto Revisión USD</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {formatUSD(activeFilteredStats ? activeFilteredStats.montoTotalDolares : statsGlobal.aprobacion?.montoTotalDolares)}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-blue-600 block">Dólares</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Control y V°B°</span>
                <span className="text-xl font-black text-gray-900 leading-none">Conforme</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-purple-600 block">Filtro Gerencial</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "caja_chica" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <Wallet2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Operaciones</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {isLoadingCaja ? "--" : (activeFilteredStats ? activeFilteredStats.count : (statsGlobal.caja_chica?.count ?? 0))}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">Movimientos</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Flujo Efectivo PEN</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {formatPEN(activeFilteredStats ? activeFilteredStats.montoTotalSoles : statsGlobal.caja_chica?.montoTotalSoles)}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-teal-600 block">Soles</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Flujo Efectivo USD</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {formatUSD(activeFilteredStats ? activeFilteredStats.montoTotalDolares : statsGlobal.caja_chica?.montoTotalDolares)}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-blue-600 block">Dólares</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Estado de Fondo</span>
                <span className="text-xl font-black text-gray-900 leading-none">Conciliado</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">Caja Activa</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "guias_salida" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Guías</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {isLoadingGuias ? "--" : (activeFilteredStats ? activeFilteredStats.count : (statsGlobal.guias_salida?.count ?? 0))}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-rose-600 block">Emitidas</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Valorizado Salidas</span>
                <span className="text-xl font-black text-gray-900 leading-none">
                  {formatPEN(activeFilteredStats ? activeFilteredStats.montoTotalSoles : statsGlobal.guias_salida?.montoTotalSoles)}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-teal-600 block">Soles</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Despacho Logístico</span>
                <span className="text-xl font-black text-gray-900 leading-none">En Tránsito</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-amber-600 block">Transporte</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Control Almacén</span>
                <span className="text-xl font-black text-gray-900 leading-none">Conforme</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">Validado</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. FILTROS Y BARRA DE BÚSQUEDA */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm relative">
        
        {/* Sincronización loader */}
        {isFetching && (
          <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20 flex items-center gap-2 text-indigo-600 font-bold text-[10px] uppercase tracking-wider bg-white/90 pl-2">
            <Loader className="w-3.5 h-3.5 animate-spin" />
            Sincronizando...
          </div>
        )}

        <div className="flex flex-row items-center gap-3 w-full lg:max-w-2xl flex-wrap sm:flex-nowrap">
          {/* Buscador */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <ERPInput
              placeholder="Buscar por código, referencia o responsable..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Año */}
          <div className="relative">
            <select
              value={selectedAnno}
              onChange={(e) => setSelectedAnno(e.target.value === "%" ? "%" : Number(e.target.value))}
              className="h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white transition-all appearance-none cursor-pointer outline-none min-w-[90px]"
            >
              <option value="%">Todos los años</option>
              {[2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>

          {/* Mes */}
          <div className="relative">
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(e.target.value)}
              className="h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white transition-all appearance-none cursor-pointer outline-none min-w-[120px]"
            >
              <option value="%">Todos los meses</option>
              {Array.from({ length: 12 }, (_, i) => {
                const m = String(i + 1).padStart(2, '0');
                const formatter = new Intl.DateTimeFormat('es-PE', { month: 'long' });
                const name = formatter.format(new Date(2026, i, 1));
                return (
                  <option key={m} value={m}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4. TABLA DEL SUBMÓDULO ACTIVO */}
      <div className="flex-1 min-h-0">
        {currentTab === "atencion" && (
          <TablaAtencionSolicitud
            data={filteredData}
            isLoading={isLoadingTable}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onRowClick={handleRowClick}
            onAtender={handleAtender}
          />
        )}

        {currentTab === "liquidaciones" && (
          <TablaLiquidaciones
            data={filteredData}
            isLoading={isLoadingTable}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onRowClick={handleRowClick}
          />
        )}

        {currentTab === "aprobacion" && (
          <TablaAprobacionLiquidaciones
            data={filteredData}
            isLoading={isLoadingTable}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onRowClick={handleRowClick}
          />
        )}

        {currentTab === "caja_chica" && (
          <TablaCajaChica
            data={filteredData}
            isLoading={isLoadingTable}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onRowClick={handleRowClick}
          />
        )}

        {currentTab === "guias_salida" && (
          <TablaGuiasSalida
            data={filteredData}
            isLoading={isLoadingTable}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onRowClick={handleRowClick}
          />
        )}
      </div>

      {/* MODAL DE APERTURA / INGRESO DE CAJA */}
      <AperturaCajaModal
        open={aperturaModalOpen}
        onClose={() => setAperturaModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries(["caja-chica-general"]);
          queryClient.invalidateQueries(["caja-chica-resumen"]);
          toast.success("Apertura / Ingreso registrado con éxito");
        }}
      />
    </div>
  );
}

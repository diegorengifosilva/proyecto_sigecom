import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  FilePlus,
  ClipboardList,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Coins,
  Search,
  RefreshCw,
  User,
  Building2,
  Landmark,
  Receipt,
  FileText,
  AlertCircle,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Send,
  Calendar,
  Layers,
  Check
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { ERPTable, ERPInput } from "@/components/ui/ERPComponents";
import { Button } from "@/components/ui/button";
import { toast } from "../../utils/toast";
import Swal from "sweetalert2";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from "recharts";

export default function CajaChicaPortalHub({ defaultTab = "resumen" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser: user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "resumen";

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const tabs = [
    {
      id: "resumen",
      label: "Resumen y Análisis Predictivo",
      icon: FolderOpen,
      badge: "Dashboard",
    },
    {
      id: "solicitud-nueva",
      label: "Nueva Solicitud",
      icon: FilePlus,
      badge: "Crear",
    },
    {
      id: "mis-solicitudes",
      label: "Mis Solicitudes Activas",
      icon: ClipboardList,
      badge: "Bandeja",
    },
  ];

  // PAGINACIÓN RESPONSIVA DINÁMICA (0 scroll vertical)
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

  // FILTROS Y ESTADOS DE BÚSQUEDA
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // FETCH DE DATOS DESDE BACKEND (PORTAL SOLICITANTE)
  const { data: portalData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["caja-chica-portal-solicitante"],
    queryFn: async () => {
      const token = localStorage.getItem("access_token");
      const { data } = await api.get("caja_chica/portal_solicitante/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
    staleTime: 30000,
  });

  // FETCH DE USUARIOS ACTIVOS PARA EL SELECT DE DESTINATARIO
  const { data: usuariosActivos = [] } = useQuery({
    queryKey: ["usuarios-activos-select"],
    queryFn: async () => {
      try {
        const { data } = await api.get("users/usuarios-activos/");
        return Array.isArray(data) ? data : data?.results || [];
      } catch (e) {
        return [];
      }
    },
    staleTime: 120000,
  });

  const stats = portalData?.stats || {
    total: 0,
    pendientes: 0,
    desembolsadas: 0,
    en_revision: 0,
    aprobadas: 0,
    montoTotalSoles: 0,
    montoTotalDolares: 0,
    tasaAprobacion: 100,
    proyeccionSiguienteMes: 0,
  };

  const tablaSolicitudes = portalData?.tabla || [];
  const analiticaData = portalData?.analitica || {
    tendencia_mensual: [],
    distribucion_estados: [],
  };

  // Filtrado de tabla
  const filteredData = useMemo(() => {
    return tablaSolicitudes.filter((item) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (item.codigo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.concepto || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.destinatario || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.nro_solicitud || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.area || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEstado =
        filterEstado === "all" ||
        (filterEstado === "tramite" && [0, 1].includes(item.id_estado)) ||
        (filterEstado === "desembolsado" && item.id_estado === 2) ||
        (filterEstado === "revision" && item.id_estado === 3) ||
        (filterEstado === "aprobado" && item.id_estado === 4);

      return matchesSearch && matchesEstado;
    });
  }, [tablaSolicitudes, searchTerm, filterEstado]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentTab, searchTerm, filterEstado]);

  // FORMULARIO DE NUEVA SOLICITUD
  const [formData, setFormData] = useState({
    destinatario_id: "",
    tipo_solicitud: "Compras",
    tipo_moneda: "S",
    monto_soles: "",
    monto_dolares: "",
    tipo_cambio: "3.75",
    banco: "BCP",
    numero_cuenta: "",
    concepto: "",
    observacion: "",
    fecha_requerida: new Date().toISOString().split("T")[0],
  });

  const [savingSolicitud, setSavingSolicitud] = useState(false);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Conversión automática de montos si cambia soles o dólares
      if (name === "monto_soles" && updated.tipo_moneda === "S") {
        const tc = parseFloat(updated.tipo_cambio) || 3.75;
        const ms = parseFloat(value) || 0;
        updated.monto_dolares = ms > 0 ? (ms / tc).toFixed(2) : "";
      } else if (name === "monto_dolares" && updated.tipo_moneda === "D") {
        const tc = parseFloat(updated.tipo_cambio) || 3.75;
        const md = parseFloat(value) || 0;
        updated.monto_soles = md > 0 ? (md * tc).toFixed(2) : "";
      }

      return updated;
    });
  };

  const handleGuardarSolicitud = async (e) => {
    e.preventDefault();

    if (!formData.destinatario_id) {
      toast.error("Por favor selecciona un destinatario de los fondos.");
      return;
    }
    const montoPrincipal = formData.tipo_moneda === "S" ? formData.monto_soles : formData.monto_dolares;
    if (!montoPrincipal || parseFloat(montoPrincipal) <= 0) {
      toast.error("Por favor ingresa un monto válido mayor a 0.");
      return;
    }
    if (!formData.concepto.trim()) {
      toast.error("Por favor ingresa el concepto o justificación del gasto.");
      return;
    }

    try {
      setSavingSolicitud(true);
      const payload = {
        id_destinatario: parseInt(formData.destinatario_id),
        tipo_moneda: formData.tipo_moneda,
        monto_soles: parseFloat(formData.monto_soles) || 0,
        monto_dolares: parseFloat(formData.monto_dolares) || 0,
        tipo_cambio: parseFloat(formData.tipo_cambio) || 3.75,
        concepto: formData.concepto.trim(),
        observacion: formData.observacion.trim(),
        numero_cuenta: formData.numero_cuenta.trim(),
        id_estado: 1, // Pendiente para Atención
      };

      await api.post("caja_chica/solicitudes_caja_chica/", payload);

      Swal.fire({
        title: "¡Solicitud Registrada!",
        text: "Tu solicitud fue enviada correctamente al área administrativa para su atención y desembolso.",
        icon: "success",
        confirmButtonColor: "#0D9488",
        confirmButtonText: "Entendido",
      });

      // Limpiar formulario y refrescar
      setFormData({
        destinatario_id: "",
        tipo_solicitud: "Compras",
        tipo_moneda: "S",
        monto_soles: "",
        monto_dolares: "",
        tipo_cambio: "3.75",
        banco: "BCP",
        numero_cuenta: "",
        concepto: "",
        observacion: "",
        fecha_requerida: new Date().toISOString().split("T")[0],
      });

      queryClient.invalidateQueries({ queryKey: ["caja-chica-portal-solicitante"] });
      handleTabChange("mis-solicitudes");
    } catch (err) {
      console.error("Error al registrar solicitud:", err);
      const errorMsg = err?.response?.data?.error || "No se pudo registrar la solicitud. Verifica los datos ingresados.";
      toast.error(errorMsg);
    } finally {
      setSavingSolicitud(false);
    }
  };

  // HELPERS DE FORMATO
  const formatSoles = (val) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(val || 0);
  const formatDolares = (val) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0);

  const getEstadoBadge = (idEstado, estadoNombre) => {
    switch (idEstado) {
      case 0:
      case 1:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            En Aprobación
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Coins className="w-3 h-3 text-blue-600" />
            Desembolsado (Por Rendir)
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Clock className="w-3 h-3 text-purple-600" />
            En Revisión Contable
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Aprobado y Concluido
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {estadoNombre || "Pendiente"}
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col font-sans">
      {/* 1. ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">
              Portal del Solicitante - Caja Chica
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Autoservicio Colaborador
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Plataforma analítica y predictiva para emisión de solicitudes, control de caja menor, viáticos y trazabilidad
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border-slate-200 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-teal-600" : ""}`} />
            <span>Actualizar</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleTabChange("solicitud-nueva")}
            className="flex items-center gap-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
          >
            <FilePlus className="w-4 h-4" />
            <span>Nueva Solicitud</span>
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
            <span>Colaborador: {user?.nombre || user?.username || "Usuario"}</span>
          </div>
        </div>
      </div>

      {/* 3. FILA ÚNICA DE 4 KPIS PREDICTIVOS Y DE TOMA DE DECISIONES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
        {/* KPI 1: Total Solicitado */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Solicitado
              </span>
              <span className="text-xl font-black text-gray-900 leading-none">
                {formatSoles(stats.montoTotalSoles)}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-teal-600 block">{stats.total} solicitudes</span>
            <span>Histórico</span>
          </div>
        </div>

        {/* KPI 2: En Trámite */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                En Trámite
              </span>
              <span className="text-xl font-black text-amber-600 leading-none">
                {stats.pendientes} activas
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-amber-600 block">Por Atender</span>
            <span>Administración</span>
          </div>
        </div>

        {/* KPI 3: Desembolsado / Atendido */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Desembolsado
              </span>
              <span className="text-xl font-black text-blue-600 leading-none">
                {stats.desembolsadas} en custodia
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-blue-600 block">Por Rendir</span>
            <span>Destinatario</span>
          </div>
        </div>

        {/* KPI 4: Tasa de Aprobación & Proyección */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Tasa de Éxito / Proy.
              </span>
              <span className="text-xl font-black text-purple-600 leading-none">
                {stats.tasaAprobacion}%
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
            <span className="text-purple-600 block">Est: {formatSoles(stats.proyeccionSiguienteMes)}</span>
            <span>Próx. Mes</span>
          </div>
        </div>
      </div>

      {/* 4. CONTENIDO DINÁMICO SEGÚN PESTAÑA */}
      {currentTab === "resumen" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Banner Predictivo Inteligente */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
                <span>Análisis Predictivo de Gasto Personal</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Proyección para el siguiente mes: {formatSoles(stats.proyeccionSiguienteMes)}
              </h2>
              <p className="text-xs text-teal-100/80 max-w-xl">
                Basado en tu histórico de asignaciones, tu tasa de aprobación contable es del{" "}
                <span className="text-white font-bold">{stats.tasaAprobacion}%</span> con un promedio de atención inferior a 24 horas hábiles.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleTabChange("solicitud-nueva")}
                className="px-4 py-2 rounded-xl text-xs font-black bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <FilePlus className="w-4 h-4" />
                <span>Solicitar Fondos</span>
              </button>
            </div>
          </div>

          {/* Gráficos de Analítica */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico 1: Tendencia Mensual */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Evolución de Fondos Solicitados
                  </h3>
                  <p className="text-[11px] text-gray-400 font-medium">Últimos 6 meses acumulados</p>
                </div>
                <span className="text-xs font-black text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                  {formatSoles(stats.montoTotalSoles)} Total
                </span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analiticaData.tendencia_mensual || []}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `S/ ${v}`} />
                    <Tooltip
                      formatter={(val) => [formatSoles(val), "Monto Solicitado"]}
                      contentStyle={{ backgroundColor: "#1E293B", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total_pen"
                      stroke="#0D9488"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorGasto)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Distribución por Estado */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Distribución por Etapas del Ciclo
                  </h3>
                  <p className="text-[11px] text-gray-400 font-medium">Estado actual de tus requerimientos</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {stats.total} registradas
                </span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analiticaData.distribucion_estados || []}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11, fill: "#334155" }} width={120} />
                    <Tooltip
                      formatter={(val) => [`${val} solicitudes`, "Cantidad"]}
                      contentStyle={{ backgroundColor: "#1E293B", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                    />
                    <Bar dataKey="cantidad" radius={[0, 6, 6, 0]}>
                      {(analiticaData.distribucion_estados || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || "#0D9488"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: NUEVA SOLICITUD (FORMULARIO ÁGIL IN-PAGE) */}
      {currentTab === "solicitud-nueva" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="border-b border-gray-100 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Formulario de Emisión de Solicitud de Caja Chica
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Completa los datos para requerir fondos de caja menor, viáticos de viaje o compras inmediatas
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full font-bold border border-teal-200/60">
              <Check className="w-3.5 h-3.5" />
              <span>Aprobación Inmediata</span>
            </div>
          </div>

          <form onSubmit={handleGuardarSolicitud} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* SECCIÓN 1: IDENTIFICACIÓN */}
              <div className="space-y-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200/70 pb-2">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>1. Responsables y Área</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Solicitante
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={user?.nombre || user?.username || "Usuario Actual"}
                    className="w-full text-xs font-bold bg-white/80 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 cursor-not-allowed shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destinatario de los Fondos <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="destinatario_id"
                    value={formData.destinatario_id}
                    onChange={handleFormChange}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  >
                    <option value="">-- Seleccionar Colaborador --</option>
                    {usuariosActivos.map((u) => (
                      <option key={u.id_usuario || u.id} value={u.id_usuario || u.id}>
                        {u.nombre_completo || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Persona a quien se transferirá el dinero para que realice los pagos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Solicitud
                  </label>
                  <select
                    name="tipo_solicitud"
                    value={formData.tipo_solicitud}
                    onChange={handleFormChange}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  >
                    <option value="Compras">Compras Menores</option>
                    <option value="Viáticos">Viáticos / Alimentación</option>
                    <option value="Movilidad">Movilidad Local</option>
                    <option value="Servicios">Servicios / Reparaciones</option>
                    <option value="Otros Gastos">Otros Gastos Operativos</option>
                  </select>
                </div>
              </div>

              {/* SECCIÓN 2: MONTO Y DATOS BANCARIOS */}
              <div className="space-y-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200/70 pb-2">
                  <Landmark className="w-4 h-4 text-teal-600" />
                  <span>2. Monto y Cuenta Destino</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Moneda
                    </label>
                    <select
                      name="tipo_moneda"
                      value={formData.tipo_moneda}
                      onChange={handleFormChange}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                    >
                      <option value="S">Soles (PEN)</option>
                      <option value="D">Dólares (USD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monto Requerido <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name={formData.tipo_moneda === "S" ? "monto_soles" : "monto_dolares"}
                      value={formData.tipo_moneda === "S" ? formData.monto_soles : formData.monto_dolares}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      required
                      className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Banco Destino
                    </label>
                    <select
                      name="banco"
                      value={formData.banco}
                      onChange={handleFormChange}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                    >
                      <option value="BCP">BCP</option>
                      <option value="BBVA">BBVA</option>
                      <option value="Interbank">Interbank</option>
                      <option value="Scotiabank">Scotiabank</option>
                      <option value="Banco de la Nación">Banco de la Nación</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      N° Cuenta / CCI
                    </label>
                    <input
                      type="text"
                      name="numero_cuenta"
                      value={formData.numero_cuenta}
                      onChange={handleFormChange}
                      placeholder="Ej: 191-xxxxxxx"
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha Requerida de Desembolso
                  </label>
                  <input
                    type="date"
                    name="fecha_requerida"
                    value={formData.fecha_requerida}
                    onChange={handleFormChange}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* SECCIÓN 3: JUSTIFICACIÓN DEL GASTO */}
              <div className="space-y-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200/70 pb-2">
                  <Receipt className="w-4 h-4 text-teal-600" />
                  <span>3. Justificación y Detalle</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Concepto Principal del Gasto <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    name="concepto"
                    value={formData.concepto}
                    onChange={handleFormChange}
                    placeholder="Describe claramente en qué se utilizarán los fondos..."
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observaciones Adicionales
                  </label>
                  <textarea
                    rows={2}
                    name="observacion"
                    value={formData.observacion}
                    onChange={handleFormChange}
                    placeholder="Detalles de facturación, comprobantes requeridos..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs resize-none"
                  />
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleTabChange("mis-solicitudes")}
                className="w-full sm:w-auto text-xs font-bold text-slate-600"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={savingSolicitud}
                className="w-full sm:w-auto text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 px-6 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{savingSolicitud ? "Enviando Solicitud..." : "Enviar Solicitud a Administración"}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* PESTAÑA 3: MIS SOLICITUDES ACTIVAS (ERPTABLE RESPONSIVA) */}
      {currentTab === "mis-solicitudes" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-3 sm:p-5 flex-1 min-h-0 flex flex-col animate-in fade-in duration-300">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Bandeja Personal de Solicitudes
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                {filteredData.length} registros
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Filtro por estado */}
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 h-8 text-slate-700 font-medium focus:outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="tramite">En Aprobación / Trámite</option>
                <option value="desembolsado">Desembolsado</option>
                <option value="revision">En Revisión Contable</option>
                <option value="aprobado">Aprobado / Concluido</option>
              </select>

              {/* Buscador */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <ERPInput
                  type="text"
                  placeholder="Buscar código, concepto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs py-1.5 h-8 bg-slate-50 border-slate-200 w-full"
                />
              </div>
            </div>
          </div>

          {/* Tabla de Mis Solicitudes */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <ERPTable
              columns={[
                {
                  key: "codigo",
                  title: "Código / N°",
                  width: "140px",
                  render: (val, row) => (
                    <div className="flex flex-col">
                      <span
                        className="font-black text-xs text-teal-700 hover:underline cursor-pointer"
                        onClick={() => navigate(`/caja-chica/atencion/${row.id_registro_directo}`)}
                      >
                        {row.codigo || row.cog || `SOL-${row.nro_solicitud}`}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Reg #{row.id_registro_directo}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "fecha",
                  title: "Fecha",
                  width: "105px",
                  render: (val) => (
                    <span className="text-xs text-slate-600 font-medium">
                      {val || "-"}
                    </span>
                  ),
                },
                {
                  key: "destinatario_nombre",
                  title: "Destinatario Asignado",
                  width: "160px",
                  render: (val, row) => (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-800 font-semibold truncate max-w-[140px]">
                        {val || row.destinatario || "Colaborador"}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "tipo",
                  title: "Tipo",
                  width: "115px",
                  render: (val) => (
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {val || "Caja Chica"}
                    </span>
                  ),
                },
                {
                  key: "concepto",
                  title: "Concepto / Justificación",
                  render: (val) => (
                    <span className="text-xs text-slate-700 font-normal line-clamp-1" title={val}>
                      {val || "-"}
                    </span>
                  ),
                },
                {
                  key: "monto_pen",
                  title: "Monto Soles",
                  width: "120px",
                  align: "right",
                  render: (val, row) => (
                    <span className="text-xs font-black text-slate-900">
                      {formatSoles(val)}
                    </span>
                  ),
                },
                {
                  key: "id_estado",
                  title: "Estado de Aprobación",
                  width: "170px",
                  render: (val, row) => getEstadoBadge(val, row.estado_nombre),
                },
                {
                  key: "acciones",
                  title: "Acción",
                  width: "130px",
                  align: "center",
                  render: (_, row) => (
                    <button
                      type="button"
                      onClick={() => navigate(`/caja-chica/atencion/${row.id_registro_directo}`)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 transition-all border border-teal-200 flex items-center gap-1 cursor-pointer mx-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ver Ficha</span>
                    </button>
                  ),
                },
              ]}
              data={paginatedData}
              loading={isLoading}
              emptyMessage="Aún no has registrado ninguna solicitud de caja chica."
              pageSize={pageSize}
              currentPage={currentPage}
              totalItems={filteredData.length}
              onPageChange={(p) => setCurrentPage(p)}
              rowKey="id_registro"
            />
          </div>
        </div>
      )}
    </div>
  );
}

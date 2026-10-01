import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader,
  Clock,
  User,
  DollarSign,
  Briefcase,
  Package,
  FileText,
  Building,
  Calendar,
  Layers,
  Coins,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plane,
  Bus,
  Plus,
  Lock,
  Wallet,
  Copy,
  Trash2,
  Send,
  RotateCcw,
  ExternalLink,
  ClipboardCopy,
  TrendingUp,
  Percent,
  Check
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { CompactField } from "../../components/ui/CompactField";
import ActionMenu from "@/components/ui/ActionMenu";
import NuevaCajaChicaModal from "./NuevaCajaChicaModal";
import NuevaOrdenCompraModal from "./NuevaOrdenCompraModal";
import NuevoPasajeModal from "./NuevoPasajeModal";

const getRequestIcon = (item) => {
  const categoria = item.categoria_solicitud || (
    item.es_caja_chica || String(item.tipo || "").toLowerCase().includes("caja") ? "caja_chica" :
    (item.transporte || String(item.tipo || "").toLowerCase().includes("pasaje") || String(item.tipo || "").toLowerCase().includes("viaje")) ? "pasaje" :
    "compra"
  );
  const tipoMov = String(item.tipo_movimiento || "");
  const tipoGasto = String(item.tipo_gasto || "");
  const transporte = String(item.transporte || "").toUpperCase();
  const tipo = String(item.tipo || "").toLowerCase();
  const concepto = String(item.concepto || "").toLowerCase();

  // 1. CAJA CHICA (Purple)
  if (categoria === "caja_chica" || tipoMov === "01" || tipoMov === "1" || tipoGasto === "01" || tipo.includes("caja") || item.es_caja_chica) {
    return (
      <div className="p-1 rounded-lg bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center w-7 h-7" title="Caja Chica">
        <Wallet className="w-3.5 h-3.5 shrink-0" />
      </div>
    );
  }

  // 2. PASAJE AEREO (Sky Blue)
  if (
    categoria === "pasaje" &&
    (transporte === "A" || tipo.includes("aér") || tipo.includes("aer") || concepto.includes("aér") || concepto.includes("aer") || tipo === "a")
  ) {
    return (
      <div className="p-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-200/60 flex items-center justify-center w-7 h-7" title="Pasajes Aéreos">
        <Plane className="w-3.5 h-3.5 shrink-0" />
      </div>
    );
  }

  // 3. PASAJE TERRESTRE (Amber)
  if (
    categoria === "pasaje" ||
    transporte === "T" ||
    tipoMov === "02" ||
    tipoMov === "2" ||
    tipoGasto === "02" ||
    tipo.includes("pasaje") ||
    tipo.includes("viaje") ||
    tipo.includes("terrestre") ||
    concepto.includes("terrestre")
  ) {
    return (
      <div className="p-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center w-7 h-7" title="Pasajes Terrestres">
        <Bus className="w-3.5 h-3.5 shrink-0" />
      </div>
    );
  }

  // 4. ORDEN COMPRA / SERVICIOS (Emerald)
  return (
    <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center w-7 h-7" title="Orden de Compra / Servicio">
      <Package className="w-3.5 h-3.5 shrink-0" />
    </div>
  );
};

const getRequestTextColor = (item) => {
  const categoria = item.categoria_solicitud || (
    item.es_caja_chica || String(item.tipo || "").toLowerCase().includes("caja") ? "caja_chica" :
    (item.transporte || String(item.tipo || "").toLowerCase().includes("pasaje") || String(item.tipo || "").toLowerCase().includes("viaje")) ? "pasaje" :
    "compra"
  );
  const tipoMov = String(item.tipo_movimiento || "");
  const tipoGasto = String(item.tipo_gasto || "");
  const transporte = String(item.transporte || "").toUpperCase();
  const tipo = String(item.tipo || "").toLowerCase();
  const concepto = String(item.concepto || "").toLowerCase();

  if (categoria === "caja_chica" || tipoMov === "01" || tipoMov === "1" || tipoGasto === "01" || tipo.includes("caja") || item.es_caja_chica) {
    return "text-purple-600 group-hover:text-purple-700";
  }

  if (
    categoria === "pasaje" &&
    (transporte === "A" || tipo.includes("aér") || tipo.includes("aer") || concepto.includes("aér") || concepto.includes("aer") || tipo === "a")
  ) {
    return "text-sky-600 group-hover:text-sky-700";
  }

  if (
    categoria === "pasaje" ||
    transporte === "T" ||
    tipoMov === "02" ||
    tipoMov === "2" ||
    tipoGasto === "02" ||
    tipo.includes("pasaje") ||
    tipo.includes("viaje") ||
    tipo.includes("terrestre") ||
    concepto.includes("terrestre")
  ) {
    return "text-amber-600 group-hover:text-amber-700";
  }

  return "text-emerald-600 group-hover:text-emerald-700";
};

export default function PlanInversionDetalle({ idPlan }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id_plan: routeId } = useParams();
  const realId = idPlan || routeId;

  const { setCustomBreadcrumbs, setBreadcrumbOverride } = useOutletContext() || {};

  const [expandedSections, setExpandedSections] = useState(["datos_plan", "solicitudes"]);
  const toggleSection = (sec) => {
    setExpandedSections(prev =>
      prev.includes(sec) ? prev.filter(x => x !== sec) : [...prev, sec]
    );
  };

  const [cajaChicaModalOpen, setCajaChicaModalOpen] = useState(false);
  const [selectedCategoryForCajaChica, setSelectedCategoryForCajaChica] = useState(null);

  const [ordenCompraModalOpen, setOrdenCompraModalOpen] = useState(false);
  const [selectedCategoryForOrden, setSelectedCategoryForOrden] = useState(null);

  const [pasajeModalOpen, setPasajeModalOpen] = useState(false);
  const [pasajeTransporteDefault, setPasajeTransporteDefault] = useState("A");
  const [selectedCategoryForPasaje, setSelectedCategoryForPasaje] = useState(null);

  // Estado para menú contextual (clic derecho) en filas
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuItem, setContextMenuItem] = useState(null);

  const handleRowContextMenu = (e, sol) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuItem(sol);
    setContextMenuOpen(true);
  };

  const getCategoriaFromSol = (item) => {
    return item.categoria_solicitud || (
      item.es_caja_chica || String(item.tipo || "").toLowerCase().includes("caja") ? "caja_chica" :
      (item.transporte || String(item.tipo || "").toLowerCase().includes("pasaje") || String(item.tipo || "").toLowerCase().includes("viaje")) ? "pasaje" :
      "compra"
    );
  };

  const getTargetIdFromSol = (item) => {
    return item.id_solicitud || item.id_pasaje || item.id_registro_directo || (String(item.id_registro).includes('_') ? item.id_registro.split('_')[1] : item.id_registro);
  };

  const handleDuplicarGrupo = async (item) => {
    try {
      const categoria = getCategoriaFromSol(item);
      const targetId = getTargetIdFromSol(item);
      toast.info("Duplicando grupo de solicitud...");
      const res = await api.post(`/compras/solicitudes/${categoria}/${targetId}/duplicar/`);
      toast.success(res.data?.message || "Grupo duplicado exitosamente");
      queryClient.invalidateQueries(["planInversionDetalle", realId]);
      refetch();
    } catch (error) {
      console.error("Error al duplicar grupo:", error);
      toast.error(error.response?.data?.error || "Error al duplicar el grupo");
    }
  };

  const handleEliminarSolicitud = async (item) => {
    const categoria = getCategoriaFromSol(item);
    const targetId = getTargetIdFromSol(item);
    const cod = item.codigo || targetId;
    if (!window.confirm(`¿Está seguro de eliminar la solicitud ${cod}? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      toast.info("Eliminando solicitud...");
      if (categoria === "compra") {
        await api.delete(`/compras/atencion/${targetId}/eliminar/`);
      } else if (categoria === "pasaje") {
        await api.delete(`/compras/pasajes/${targetId}/eliminar/`);
      } else {
        await api.delete(`/caja_chica/solicitudes_caja_chica/${targetId}/`);
      }
      toast.success("Solicitud eliminada correctamente");
      queryClient.invalidateQueries(["planInversionDetalle", realId]);
      refetch();
    } catch (error) {
      console.error("Error al eliminar solicitud:", error);
      toast.error(error.response?.data?.error || "Error al eliminar la solicitud");
    }
  };

  const handleEnviarSolicitud = async (item) => {
    try {
      const categoria = getCategoriaFromSol(item);
      const targetId = getTargetIdFromSol(item);
      toast.info("Enviando solicitud...");
      if (categoria === "compra") {
        await api.post(`/compras/atencion/${targetId}/enviar/`);
      } else if (categoria === "pasaje") {
        await api.post(`/compras/pasajes/${targetId}/enviar/`);
      } else {
        await api.post(`/caja_chica/solicitudes_caja_chica/${targetId}/cambiar_estado/`, { nuevo_estado_id: 1 });
      }
      toast.success("Solicitud enviada exitosamente");
      queryClient.invalidateQueries(["planInversionDetalle", realId]);
      refetch();
    } catch (error) {
      console.error("Error al enviar solicitud:", error);
      toast.error(error.response?.data?.error || "Error al enviar la solicitud");
    }
  };

  const handleAtenderSolicitud = async (item) => {
    try {
      const categoria = getCategoriaFromSol(item);
      const targetId = getTargetIdFromSol(item);
      toast.info("Atendiendo solicitud...");
      if (categoria === "compra") {
        await api.post(`/compras/atencion/${targetId}/atender/`);
      } else if (categoria === "pasaje") {
        await api.post(`/compras/pasajes/${targetId}/atender/`);
      } else {
        await api.post(`/caja_chica/solicitudes_caja_chica/${targetId}/cambiar_estado/`, { nuevo_estado_id: 2 });
      }
      toast.success("Solicitud atendida exitosamente");
      queryClient.invalidateQueries(["planInversionDetalle", realId]);
      refetch();
    } catch (error) {
      console.error("Error al atender solicitud:", error);
      toast.error(error.response?.data?.error || "Error al atender la solicitud");
    }
  };

  const handleRevertirSolicitud = async (item) => {
    try {
      const categoria = getCategoriaFromSol(item);
      const targetId = getTargetIdFromSol(item);
      const estadoId = Number(item.id_estado ?? (item.estado_nombre?.toLowerCase() === 'atendido' ? 2 : 1));
      toast.info("Revirtiendo estado de solicitud...");
      if (categoria === "compra") {
        await api.post(`/compras/atencion/${targetId}/revertir/`);
      } else if (categoria === "pasaje") {
        await api.post(`/compras/pasajes/${targetId}/revertir/`);
      } else {
        await api.post(`/caja_chica/solicitudes_caja_chica/${targetId}/cambiar_estado/`, { nuevo_estado_id: estadoId === 2 ? 1 : 0 });
      }
      toast.success("Estado revertido exitosamente");
      queryClient.invalidateQueries(["planInversionDetalle", realId]);
      refetch();
    } catch (error) {
      console.error("Error al revertir estado:", error);
      toast.error(error.response?.data?.error || "Error al revertir el estado");
    }
  };

  const handleVerDetalle = (item) => {
    const categoria = getCategoriaFromSol(item);
    const targetId = getTargetIdFromSol(item);
    const tipoMov = String(item.tipo_movimiento || "");
    const isFromAdmin = window.location.pathname.startsWith('/plan-inversion-anual');
    const returnUrl = isFromAdmin ? `/plan-inversion-anual/${realId}` : `/compras/plan-inversion/${realId}`;
    const navState = {
      from: isFromAdmin ? "plan-inversion-admin" : "plan-inversion",
      id_plan: realId,
      returnUrl: returnUrl,
    };
    if (categoria === "compra" || tipoMov === "03" || tipoMov === "3" || String(item.id_registro).startsWith("compra_")) {
      navigate(`/compras/atencion/${targetId}`, { state: navState });
    } else if (categoria === "caja_chica" || tipoMov === "01" || tipoMov === "1") {
      navigate(`/compras/caja-chica/${targetId}`, { state: navState });
    } else {
      navigate(`/compras/pasajes/${targetId}`, { state: navState });
    }
  };

  const handleCopiarCodigo = (item) => {
    const targetId = getTargetIdFromSol(item);
    const cod = item.codigo || targetId;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(String(cod));
      toast.success(`Código ${cod} copiado al portapapeles`);
    }
  };

  const getContextMenuOptions = (item) => {
    if (!item) return [];
    const estadoId = Number(item.id_estado ?? (item.estado_nombre?.toLowerCase() === 'atendido' ? 2 : item.estado_nombre?.toLowerCase() === 'enviado' ? 1 : 0));

    const opts = [
      {
        label: "Duplicar Grupo",
        icon: Copy,
        onClick: () => handleDuplicarGrupo(item)
      },
      estadoId === 0 ? {
        label: "Enviar Solicitud",
        icon: Send,
        onClick: () => handleEnviarSolicitud(item)
      } : null,
      estadoId === 1 ? {
        label: "Atender Solicitud",
        icon: CheckCircle2,
        onClick: () => handleAtenderSolicitud(item)
      } : null,
      (estadoId === 1 || estadoId === 2) ? {
        label: estadoId === 2 ? "Revertir a Pendiente" : "Revertir a Borrador",
        icon: RotateCcw,
        onClick: () => handleRevertirSolicitud(item)
      } : null,
      {
        label: "Ver Detalle",
        icon: ExternalLink,
        onClick: () => handleVerDetalle(item)
      },
      {
        label: "Copiar Código",
        icon: ClipboardCopy,
        onClick: () => handleCopiarCodigo(item)
      },
      {
        label: "Eliminar",
        icon: Trash2,
        className: "text-red-600 hover:bg-red-50 hover:text-red-700",
        onClick: () => handleEliminarSolicitud(item)
      }
    ];

    return opts.filter(Boolean);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["planInversionDetalle", realId],
    queryFn: async () => {
      const res = await api.get(`/compras/plan_inversion/${realId}/`);
      return res.data;
    },
    enabled: !!realId,
  });

  const isFromAdmin = typeof window !== "undefined" && window.location.pathname.startsWith('/plan-inversion-anual');

  const handleVolver = () => {
    if (isFromAdmin) {
      navigate('/plan-inversion-anual');
    } else {
      navigate('/compras/programacion');
    }
  };

  useEffect(() => {
    if (data) {
      const codeToShow = data.codigo || `PLAN-${data.id_plan}`;
      if (setBreadcrumbOverride) setBreadcrumbOverride(codeToShow);

      const crumbs = [
        { 
          label: isFromAdmin ? "PLAN INVERSIÓN ANUAL" : "PROGRAMACION", 
          path: isFromAdmin ? "/plan-inversion-anual" : "/compras/programacion" 
        },
        { label: codeToShow }
      ];
      if (setCustomBreadcrumbs) setCustomBreadcrumbs(crumbs);
    }
  }, [data, isFromAdmin, setCustomBreadcrumbs, setBreadcrumbOverride]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader className="h-8 w-8 text-indigo-600 animate-spin" />
        <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Cargando Plan de Inversión...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 mb-4">
          <ShieldAlert className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Error de Carga</h3>
        <p className="text-sm text-gray-500 mt-2">No se pudo encontrar el Plan de Inversión #{realId} o el servidor no respondió correctamente.</p>
        <button
          onClick={handleVolver}
          className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all cursor-pointer"
        >
          Volver al Listado
        </button>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (estado) => {
    const statusStr = String(estado || "Pendiente").toLowerCase();
    
    if (statusStr.includes("liquida") && statusStr.includes("aproba")) {
      return (
        <div className="flex justify-center items-center" title="Liquidación Aprobada">
          <Lock className="w-4 h-4 text-black shrink-0 animate-in zoom-in duration-300" />
        </div>
      );
    }
    
    let colorClass = "text-slate-400";
    if (statusStr.includes("envio") || statusStr.includes("envío")) {
      colorClass = "text-red-500";
    } else if (statusStr.includes("atencion") || statusStr.includes("atención")) {
      colorClass = "text-amber-500";
    } else if (statusStr.includes("liquidac") || statusStr.includes("liquidación")) {
      colorClass = "text-sky-500";
    } else if (statusStr.includes("enviada")) {
      colorClass = "text-emerald-500";
    } else if (statusStr.includes("aprobada") || statusStr.includes("aprobado") || statusStr.includes("activo")) {
      colorClass = "text-emerald-600";
    } else if (statusStr.includes("anulado")) {
      colorClass = "text-gray-400";
    }
    
    return (
      <div className="flex justify-center items-center" title={estado || "Pendiente"}>
        <CheckCircle2 className={`w-4 h-4 ${colorClass} shrink-0 animate-in zoom-in duration-300`} />
      </div>
    );
  };

  const solicitudes = data.solicitudes || [];

  // Totales Generales del Plan
  const totalPresupuesto = Number(data.total || data.presupuesto || 0);
  const totalProgramado = solicitudes.length > 0 
    ? solicitudes.reduce((sum, s) => sum + Number(s.monto_dolares || 0), 0)
    : Number(data.monto_ejecutado || data.total_programado || 0);
  const totalDisponible = Math.max(0, totalPresupuesto - totalProgramado);
  const porcentajeEjecutado = totalPresupuesto > 0 ? Math.min(100, Math.round((totalProgramado / totalPresupuesto) * 100)) : 0;

  // Lista unificada ordenada de solicitudes (más recientes primero)
  const sortedSolicitudes = [...solicitudes].sort((a, b) => {
    const dateA = a.fecha ? new Date(a.fecha).getTime() : 0;
    const dateB = b.fecha ? new Date(b.fecha).getTime() : 0;
    if (dateA !== dateB) return dateB - dateA;
    return (Number(b.id_registro) || 0) - (Number(a.id_registro) || 0);
  });

  // Categoría unificada para los modales
  const unifiedCategory = {
    id: "otros",
    name: "Plan de Inversión",
    budget: totalPresupuesto,
    programmedSum: totalProgramado,
    availableSum: totalDisponible,
    gastoIds: [data?.tipo_gasto || 5],
    movIds: [data?.tipo_gasto || 5],
  };

  const handleOpenOrdenCompra = () => {
    setSelectedCategoryForOrden(unifiedCategory);
    setOrdenCompraModalOpen(true);
  };

  const handleOpenPasajeAereo = () => {
    setSelectedCategoryForPasaje(unifiedCategory);
    setPasajeTransporteDefault("A");
    setPasajeModalOpen(true);
  };

  const handleOpenPasajeTerrestre = () => {
    setSelectedCategoryForPasaje(unifiedCategory);
    setPasajeTransporteDefault("T");
    setPasajeModalOpen(true);
  };

  const handleOpenCajaChica = () => {
    setSelectedCategoryForCajaChica(unifiedCategory);
    setCajaChicaModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1920px] mx-auto animate-in fade-in duration-700 font-sans">
      
      {/* HEADER */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center">
            {/* Botón Atrás */}
            <button
              onClick={handleVolver}
              className="mr-5 p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-gray-100 group cursor-pointer"
              title={isFromAdmin ? "Volver a Plan Inversión Anual" : "Volver a Programación"}
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </button>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <span>PROGRAMACIÓN:</span>
                  <span className="text-indigo-600">{data.codigo || `PLAN-${data.id_plan}`}</span>
                </h1>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black rounded-full uppercase tracking-wider">
                  {data.estado_orden_nombre || "Activo"}
                </span>
              </div>

              {/* Chips de datos principales */}
              <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">
                <span className="flex items-center gap-1 px-3 py-1 bg-indigo-50/50 border border-indigo-100 text-indigo-700 rounded-xl" title="Código de Registro">
                  <FileText className="h-3 w-3 shrink-0" />
                  CÓDIGO: {data.codigo || `PLAN-${data.id_plan}`}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50/50 border border-emerald-100 text-emerald-700 rounded-xl">
                  <Calendar className="h-3 w-3 shrink-0" />
                  AÑO: {data.anno || "2026"} {data.mes ? `/ MES: ${data.mes}` : ""}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-violet-50/50 border border-violet-100 text-violet-700 rounded-xl max-w-xs truncate" title={data.empresa || "V&C CORPORATION S.A.C."}>
                  <Building className="h-3 w-3 shrink-0" />
                  EMPRESA: {data.empresa || "V&C CORPORATION S.A.C."}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-amber-50/50 border border-amber-100 text-amber-700 rounded-xl">
                  <Layers className="h-3 w-3 shrink-0" />
                  ÁREA: {data.area_nombre || "GENERAL"}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-blue-50/50 border border-blue-100 text-blue-700 rounded-xl font-black">
                  <Briefcase className="h-3 w-3 shrink-0" />
                  TIPO: PLAN INVERSIÓN
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={handleVolver}
              className="px-5 h-10 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* CUERPO DEL DETALLE */}
      <div className="flex flex-col xl:flex-row gap-6 w-full items-start">
        
        {/* PANEL IZQUIERDO (70%) */}
        <div className="w-full xl:w-8/12 flex flex-col space-y-6">

          {/* SECTION 1: DATOS PLAN INVERSIÓN */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('datos_plan')}
              className="flex items-center justify-between w-full px-5 py-4 bg-gray-50 hover:bg-gray-100/80 transition-colors border-b border-gray-200 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {expandedSections.includes('datos_plan') ? (
                  <ChevronDown className="h-4 w-4 text-indigo-600 font-bold" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-indigo-600 font-bold" />
                )}
                <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  DATOS PLAN INVERSIÓN
                </h3>
              </div>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md uppercase border border-indigo-200/60">
                Plan Anual
              </span>
            </button>

            <AnimatePresence>
              {expandedSections.includes('datos_plan') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      
                      {/* Código */}
                      <div className="md:col-span-4 flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Código
                        </label>
                        <div className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>{data.codigo || `PLAN-${data.id_plan}`}</span>
                          <button
                            onClick={() => {
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(data.codigo || String(data.id_plan));
                                toast.success("Código copiado");
                              }
                            }}
                            className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Copiar Código"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Área */}
                      <div className="md:col-span-4 flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Área Responsable
                        </label>
                        <div className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-xs font-bold text-slate-800 truncate">
                          {data.area_nombre || "GENERAL"}
                        </div>
                      </div>

                      {/* Empresa */}
                      <div className="md:col-span-4 flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Empresa
                        </label>
                        <div className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-xs font-bold text-slate-800 truncate">
                          {data.empresa || "V&C CORPORATION S.A.C."}
                        </div>
                      </div>

                      {/* Referencia (Ancho completo) */}
                      <div className="md:col-span-12 flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Referencia / Descripción
                        </label>
                        <div className="min-h-[70px] p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {data.referencia || "Sin referencia especificada"}
                        </div>
                      </div>

                      {/* Cantidad */}
                      <div className="md:col-span-3 flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Cantidad
                        </label>
                        <div className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-xs font-bold text-slate-800">
                          {Number(data.cantidad || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Precio */}
                      <div className="md:col-span-4 flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Precio Unitario
                        </label>
                        <div className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-xs font-bold text-slate-800">
                          {formatCurrency(data.precio)}
                        </div>
                      </div>

                      {/* Total Presupuesto */}
                      <div className="md:col-span-5 flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                          Total Presupuestado
                        </label>
                        <div className="h-10 px-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between text-sm font-black text-indigo-900">
                          <span>{formatCurrency(totalPresupuesto)}</span>
                          <span className="text-[10px] uppercase font-bold text-indigo-600">USD</span>
                        </div>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* SECTION 2: SOLICITUDES DE GASTO (SECCIÓN ÚNICA Y CENTRALIZADA) */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('solicitudes')}
              className="flex items-center justify-between w-full px-5 py-4 bg-gray-50 hover:bg-gray-100/80 transition-colors border-b border-gray-200 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {expandedSections.includes('solicitudes') ? (
                  <ChevronDown className="h-4 w-4 text-indigo-600 font-bold" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-indigo-600 font-bold" />
                )}
                <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Coins className="w-4 h-4 text-indigo-600" />
                  SOLICITUDES DE GASTO
                </h3>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md uppercase">
                  {solicitudes.length} {solicitudes.length === 1 ? "Solicitud" : "Solicitudes"}
                </span>
              </div>

              {/* Métricas en el Header de la Sección */}
              <div className="hidden sm:flex items-center gap-4 text-right">
                <div className="text-[10px] text-gray-500 font-bold uppercase">
                  <span className="mr-1 text-gray-800">Presupuesto:</span>
                  <span className="text-gray-800 font-black">{formatCurrency(totalPresupuesto)}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase border-l border-gray-200 pl-3">
                  <span className="mr-1 text-indigo-600">Programado:</span>
                  <span className="text-indigo-600 font-black">{formatCurrency(totalProgramado)}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase border-l border-gray-200 pl-3">
                  <span className="mr-1 text-emerald-700">Disponible:</span>
                  <span className={`font-black ${totalDisponible <= 0 && totalPresupuesto > 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {formatCurrency(totalDisponible)}
                  </span>
                </div>
              </div>
            </button>

            <AnimatePresence>
              {expandedSections.includes('solicitudes') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {/* BARRA DE BOTONES DE ACCIÓN PARA CREAR PARTIDAS */}
                  <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Registrar Solicitud:
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleOpenOrdenCompra}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-black rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Crear Solicitud de Orden de Compra o Servicios"
                      >
                        <Package className="w-3.5 h-3.5 text-emerald-600" />
                        ORDEN COMPRA/SERVICIOS
                      </button>
                      <button
                        onClick={handleOpenPasajeAereo}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-black rounded-xl border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:border-sky-400 transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Crear Solicitud de Pasaje Aéreo"
                      >
                        <Plane className="w-3.5 h-3.5 text-sky-600" />
                        PASAJE AEREO
                      </button>
                      <button
                        onClick={handleOpenPasajeTerrestre}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-black rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Crear Solicitud de Pasaje Terrestre"
                      >
                        <Bus className="w-3.5 h-3.5 text-amber-600" />
                        PASAJE TERRESTRE
                      </button>
                      <button
                        onClick={handleOpenCajaChica}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-black rounded-xl border border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Crear Solicitud de Caja Chica"
                      >
                        <Wallet className="w-3.5 h-3.5 text-purple-600" />
                        CAJA CHICA
                      </button>
                    </div>
                  </div>

                  {/* TABLA UNIFICADA DE TODAS LAS SOLICITUDES DE GASTO */}
                  {sortedSolicitudes.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
                        <Coins className="w-6 h-6 text-slate-400" />
                      </div>
                      <span className="font-bold uppercase text-xs tracking-wider text-slate-600">
                        No hay solicitudes de gasto registradas
                      </span>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        Utilice los botones superiores para registrar una Orden de Compra/Servicio, Pasaje o Solicitud de Caja Chica para este plan de inversión.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 border-b border-gray-200 text-[10px] font-black uppercase">
                            <th className="px-4 py-3 w-12 text-center">Tipo</th>
                            <th className="px-4 py-3 pl-6">Registro</th>
                            <th className="px-4 py-3 w-28">Fecha</th>
                            <th className="px-4 py-3">Concepto</th>
                            <th className="px-4 py-3 w-32 text-right">Programado</th>
                            <th className="px-4 py-3 w-28 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedSolicitudes.map((sol) => (
                            <tr
                              key={sol.id_solicitud || sol.id_pasaje || sol.id_registro}
                              onClick={() => handleVerDetalle(sol)}
                              onContextMenu={(e) => handleRowContextMenu(e, sol)}
                              className="group hover:bg-slate-50/80 border-b border-slate-100 transition-colors cursor-pointer text-slate-700 text-xs select-none"
                            >
                              <td className="px-4 py-2.5 text-center flex justify-center items-center">
                                {getRequestIcon(sol)}
                              </td>
                              <td className={`px-4 py-2.5 pl-6 font-bold group-hover:underline ${getRequestTextColor(sol)}`}>
                                {sol.id_registro_directo || (sol.id_registro && String(sol.id_registro).includes('_') ? sol.id_registro.split('_')[1] : (sol.id_registro || sol.id_solicitud))}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-slate-800 font-bold whitespace-nowrap">
                                {sol.fecha || "-"}
                              </td>
                              <td className="px-4 py-2 max-w-xs" title={sol.concepto}>
                                 {(() => {
                                   const raw = (sol.concepto || "").trim();
                                   const categoria = sol.categoria_solicitud || (
                                     sol.es_caja_chica || String(sol.tipo || "").toLowerCase().includes("caja") ? "caja_chica" :
                                     (sol.transporte || String(sol.tipo || "").toLowerCase().includes("pasaje") || String(sol.tipo || "").toLowerCase().includes("viaje")) ? "pasaje" :
                                     "compra"
                                   );

                                   if (categoria === "caja_chica" || sol.es_caja_chica) {
                                     let mainConcepto = "Caja Chica";
                                     if (!raw || raw.toLowerCase() === "solicitud de caja chica" || raw.toLowerCase() === "solicitud caja chica" || raw.toLowerCase() === "caja chica") {
                                       mainConcepto = "Caja Chica";
                                     } else if (raw.toLowerCase().startsWith("caja chica")) {
                                       mainConcepto = raw;
                                     } else {
                                       mainConcepto = `Caja Chica - ${raw}`;
                                     }

                                     const dest = (sol.destinatario_nombre || sol.destinatario || "").trim();

                                     return (
                                       <div className="flex flex-col justify-center leading-tight py-0.5">
                                         <span className="font-bold text-slate-800 truncate" title={mainConcepto}>
                                           {mainConcepto}
                                         </span>
                                         {dest ? (
                                           <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 truncate mt-0.5" title={`Destinatario: ${dest}`}>
                                             <User className="w-3 h-3 text-purple-600 shrink-0" />
                                             <span className="truncate">{dest}</span>
                                           </span>
                                         ) : (
                                           <span className="text-[10.5px] text-slate-400 italic mt-0.5">
                                             Sin destinatario
                                           </span>
                                         )}
                                       </div>
                                     );
                                   }

                                   if (categoria === "pasaje" || sol.transporte) {
                                     const trans = (sol.transporte || "").toUpperCase();
                                     const tipo = String(sol.tipo || "").toLowerCase();
                                     const isAereo = trans === "A" || tipo.includes("aér") || tipo.includes("aer") || tipo === "a";
                                     const prefix = isAereo ? "Pasaje Aéreo" : "Pasaje Terrestre";
                                     const obs = (sol.observacion || sol.referencia || "").trim();

                                     let conceptoPasaje = prefix;
                                     if (!raw || raw.toLowerCase().includes("pasaje aereo / terrestre") || raw.toLowerCase() === "pasaje") {
                                       conceptoPasaje = obs ? `${prefix} - ${obs}` : prefix;
                                     } else if (raw === "Pasaje Aéreo" || raw === "Pasaje Terrestre" || raw.toLowerCase() === prefix.toLowerCase()) {
                                       conceptoPasaje = obs ? `${prefix} - ${obs}` : prefix;
                                     } else if (raw.toLowerCase().startsWith("pasaje")) {
                                       conceptoPasaje = raw;
                                       if (obs && !raw.includes(obs)) {
                                         conceptoPasaje = `${raw} - ${obs}`;
                                       }
                                     } else {
                                       conceptoPasaje = `${prefix} - ${raw}`;
                                     }
                                     return (
                                       <span className="font-bold text-slate-800 truncate block" title={conceptoPasaje}>
                                         {conceptoPasaje}
                                       </span>
                                     );
                                   }

                                   let conceptoCompra = "";
                                   if (!raw) {
                                     const t = (sol.tipo || "").toUpperCase();
                                     const prefix = (t === "S" || t === "SERVICIO") ? "Solicitud de Servicio" : "Solicitud de Compra";
                                     conceptoCompra = sol.referencia ? `${prefix} - ${sol.referencia}` : prefix;
                                   } else if (raw.toLowerCase().startsWith("solicitud")) {
                                     conceptoCompra = raw;
                                   } else {
                                     const t = (sol.tipo || "").toUpperCase();
                                     const prefix = (t === "S" || t === "SERVICIO") ? "Solicitud de Servicio" : "Solicitud de Compra";
                                     conceptoCompra = `${prefix} - ${raw}`;
                                   }
                                   return (
                                     <span className="font-bold text-slate-800 truncate block" title={conceptoCompra}>
                                       {conceptoCompra}
                                     </span>
                                   );
                                 })()}
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                                {formatCurrency(sol.monto_dolares)}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {getStatusBadge(sol.estado_nombre)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TOTAL GENERAL CARD */}
                  <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-wrap md:flex-nowrap justify-between items-center gap-4 mt-6 mx-5 mb-5 shadow-lg border border-slate-950">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700/50">
                        <Coins className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Resumen Presupuesto</h4>
                        <span className="text-sm font-black uppercase tracking-wider font-sans">TOTAL GENERAL</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6 text-right w-full md:w-auto justify-end">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Presupuesto</span>
                        <span className="text-base font-black tracking-tight">{formatCurrency(totalPresupuesto)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-indigo-300 uppercase tracking-wider block mb-0.5">Programado</span>
                        <span className="text-base font-black tracking-tight text-indigo-400">{formatCurrency(totalProgramado)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Disponible</span>
                        <span className={`text-base font-black tracking-tight ${totalDisponible < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                          {formatCurrency(totalDisponible)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* PANEL DERECHO SIDEBAR (30%) */}
        <div className="w-full xl:w-4/12 flex flex-col space-y-6">
          
          {/* TARJETA 1: MÉTRICAS Y CONTROL FINANCIERO */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50/50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Ejecución Presupuestal
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                {porcentajeEjecutado}%
              </span>
            </div>
            <div className="p-5 space-y-4">
              
              {/* Barra de progreso */}
              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                  <span>Progreso de Solicitudes</span>
                  <span className="text-indigo-600 font-black">{porcentajeEjecutado}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${porcentajeEjecutado >= 90 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                    style={{ width: `${Math.min(100, porcentajeEjecutado)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Presupuesto Total:</span>
                  <span className="font-black text-slate-900">{formatCurrency(totalPresupuesto)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Total Programado:</span>
                  <span className="font-black text-indigo-600">{formatCurrency(totalProgramado)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Saldo Disponible:</span>
                  <span className={`font-black ${totalDisponible <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(totalDisponible)}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* TARJETA 2: FICHA DE REGISTRO */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50/50 border-b border-gray-200">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                Ficha del Plan
              </h3>
            </div>
            <div className="p-5 space-y-3.5">
              <CompactField label="ID Registro" value={data.id_plan} />
              <CompactField label="Código" value={data.codigo || `PLAN-${data.id_plan}`} />
              <CompactField label="Área" value={data.area_nombre || "GENERAL"} />
              <CompactField label="Año Fiscal" value={data.anno || "2026"} />
              {data.mes && <CompactField label="Mes" value={`Mes ${data.mes}`} />}
              <CompactField label="Fuente Financiamiento" value={data.fuente_financiamiento || "Recursos Propios"} />
              <CompactField label="Tipo de Gasto" value={data.tipo_gasto || "Otros"} />
              <CompactField label="Registrado Por" value={data.usu || "SISTEMA"} />
              <CompactField label="Fecha Registro" value={data.fer ? data.fer.split(' ')[0] : null} />
            </div>
          </div>

        </div>

      </div>

      {/* MODAL NUEVA CAJA CHICA */}
      {cajaChicaModalOpen && (
        <NuevaCajaChicaModal
          open={cajaChicaModalOpen}
          onClose={() => setCajaChicaModalOpen(false)}
          idApertura={realId}
          category={selectedCategoryForCajaChica}
          aperturaData={data}
          disponible={selectedCategoryForCajaChica?.availableSum}
          categoryBudget={selectedCategoryForCajaChica?.budget}
          categoryProgrammed={selectedCategoryForCajaChica?.programmedSum}
          onSuccess={(newId) => {
            refetch();
            if (newId) {
              navigate(`/compras/caja-chica/${newId}`);
            }
          }}
        />
      )}

      {/* MODAL NUEVA ORDEN DE COMPRA / SERVICIO */}
      {ordenCompraModalOpen && (
        <NuevaOrdenCompraModal
          open={ordenCompraModalOpen}
          onClose={() => setOrdenCompraModalOpen(false)}
          idApertura={realId}
          category={selectedCategoryForOrden}
          aperturaData={data}
          disponible={selectedCategoryForOrden?.availableSum}
          categoryBudget={selectedCategoryForOrden?.budget}
          categoryProgrammed={selectedCategoryForOrden?.programmedSum}
          onSuccess={(newId) => {
            refetch();
            if (newId) {
              navigate(`/compras/atencion/${newId}`);
            }
          }}
        />
      )}

      {/* MODAL NUEVO PASAJE AÉREO / TERRESTRE */}
      {pasajeModalOpen && (
        <NuevoPasajeModal
          open={pasajeModalOpen}
          onClose={() => setPasajeModalOpen(false)}
          idApertura={realId}
          category={selectedCategoryForPasaje}
          aperturaData={data}
          disponible={selectedCategoryForPasaje?.availableSum}
          categoryBudget={selectedCategoryForPasaje?.budget}
          categoryProgrammed={selectedCategoryForPasaje?.programmedSum}
          defaultTransporte={pasajeTransporteDefault}
          onSuccess={(newId) => {
            refetch();
            if (newId) {
              navigate(`/compras/pasajes/${newId}`);
            }
          }}
        />
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
            options={getContextMenuOptions(contextMenuItem)}
          />
        </div>
      )}

    </div>
  );
}

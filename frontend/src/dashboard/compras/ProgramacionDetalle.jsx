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
  Paperclip,
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
  ClipboardCopy
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

  // 1. CAJA CHICA (Purple / Morado)
  if (categoria === "caja_chica" || tipoMov === "01" || tipoMov === "1" || tipoGasto === "01" || tipo.includes("caja") || item.es_caja_chica) {
    return (
      <div className="p-1 rounded-lg bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center w-7 h-7" title="Caja Chica">
        <Wallet className="w-3.5 h-3.5 shrink-0" />
      </div>
    );
  }

  // 2. PASAJE AEREO (Sky Blue / Celeste)
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

  // 3. PASAJE TERRESTRE (Amber / Naranja)
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

  // 4. ORDEN COMPRA / SERVICIOS (Emerald / Verde)
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

  // 1. CAJA CHICA (Purple)
  if (categoria === "caja_chica" || tipoMov === "01" || tipoMov === "1" || tipoGasto === "01" || tipo.includes("caja") || item.es_caja_chica) {
    return "text-purple-600 group-hover:text-purple-700";
  }

  // 2. PASAJE AEREO (Sky)
  if (
    categoria === "pasaje" &&
    (transporte === "A" || tipo.includes("aér") || tipo.includes("aer") || concepto.includes("aér") || concepto.includes("aer") || tipo === "a")
  ) {
    return "text-sky-600 group-hover:text-sky-700";
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
    return "text-amber-600 group-hover:text-amber-700";
  }

  // 4. ORDEN COMPRA / SERVICIOS (Emerald)
  return "text-emerald-600 group-hover:text-emerald-700";
};

export default function ProgramacionDetalle({ idApertura }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const realId = idApertura || id;

  const { setCustomBreadcrumbs, setBreadcrumbOverride } = useOutletContext() || {};

  const [expandedSections, setExpandedSections] = useState(["presupuesto", "documentos"]);
  const toggleSection = (sec) => {
    setExpandedSections(prev =>
      prev.includes(sec) ? prev.filter(x => x !== sec) : [...prev, sec]
    );
  };

  const [expandedCategories, setExpandedCategories] = useState(["suministros", "mano_obra", "costo_servicios", "otros"]);
  const toggleCategory = (catId) => {
    setExpandedCategories(prev =>
      prev.includes(catId) ? prev.filter(x => x !== catId) : [...prev, catId]
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
      queryClient.invalidateQueries(["programacionDetalle", realId]);
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
      queryClient.invalidateQueries(["programacionDetalle", realId]);
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
      queryClient.invalidateQueries(["programacionDetalle", realId]);
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
      queryClient.invalidateQueries(["programacionDetalle", realId]);
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
      queryClient.invalidateQueries(["programacionDetalle", realId]);
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
    if (categoria === "compra" || tipoMov === "03" || tipoMov === "3" || String(item.id_registro).startsWith("compra_")) {
      navigate(`/compras/atencion/${targetId}`);
    } else if (categoria === "caja_chica" || tipoMov === "01" || tipoMov === "1") {
      navigate(`/compras/caja-chica/${targetId}`);
    } else {
      navigate(`/compras/pasajes/${targetId}`);
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
    queryKey: ["programacionDetalle", realId],
    queryFn: async () => {
      const res = await api.get(`/cotizaciones/apertura_detalle/${realId}/`);
      return res.data;
    },
    enabled: !!realId,
  });

  useEffect(() => {
    if (data) {
      const codeToShow = data.cotizacion_codigo || data.id_registro?.codigo || data.codigo || data.numero_orden || `AP-${data.id_apertura}`;
      if (setBreadcrumbOverride) setBreadcrumbOverride(codeToShow);

      const crumbs = [
        { label: "PROGRAMACION", path: "/compras/programacion" },
        { label: codeToShow }
      ];
      if (setCustomBreadcrumbs) setCustomBreadcrumbs(crumbs);
    }
  }, [data, setCustomBreadcrumbs, setBreadcrumbOverride]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader className="h-8 w-8 text-indigo-600 animate-spin" />
        <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Cargando Programación...</span>
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
        <p className="text-sm text-gray-500 mt-2">No se pudo encontrar la información solicitada o el servidor no respondió correctamente.</p>
        <button
          onClick={() => navigate('/compras/programacion')}
          className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all"
        >
          Volver al Listado
        </button>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (estado) => {
    const statusStr = String(estado || "Pendiente").toLowerCase();
    
    // Lock icon for "LIQUIDACION APROBADA" (which has "liquida" and "aproba")
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
    } else if (statusStr.includes("aprobada") || statusStr.includes("aprobado")) {
      colorClass = "text-slate-800";
    } else if (statusStr.includes("anulado")) {
      colorClass = "text-gray-400";
    }
    
    return (
      <div className="flex justify-center items-center" title={estado || "Pendiente"}>
        <CheckCircle2 className={`w-4 h-4 ${colorClass} shrink-0 animate-in zoom-in duration-300`} />
      </div>
    );
  };

  const getDocStatusBadge = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "APLICA" || s === "A") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-xl text-[9px] font-black uppercase tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Aplica
        </span>
      );
    }
    if (s === "NO APLICA" || s === "N") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200/50 rounded-xl text-[9px] font-black uppercase tracking-wider">
          <XCircle className="w-3.5 h-3.5" />
          No Aplica
        </span>
      );
    }
    if (s === "CONVALIDADO" || s === "C") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/50 rounded-xl text-[9px] font-black uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" />
          Convalidado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider">
        <HelpCircle className="w-3.5 h-3.5" />
        No Definido
      </span>
    );
  };

  // CATEGORÍAS PRESUPUESTALES UNIFICADAS
  const categories = [
    { 
      id: "suministros", 
      name: "Suministros", 
      budgetKeys: ["orden_compra_equipos", "orden_compra_materiales"], 
      icon: Package, 
      color: "text-emerald-500",
      gastoIds: [1, 2],
      movIds: [1, 2] // 1 = Equipos, 2 = Materiales
    },
    { 
      id: "mano_obra", 
      name: "Mano de Obra", 
      budgetKeys: ["orden_compra_hh"], 
      icon: User, 
      color: "text-blue-500",
      gastoIds: [3],
      movIds: [3] // 3 = HH (Mano de Obra)
    },
    { 
      id: "costo_servicios", 
      name: "Gasto de Servicio", 
      budgetKeys: ["orden_compra_costo_servicios"], 
      icon: DollarSign, 
      color: "text-indigo-500",
      gastoIds: [4],
      movIds: [4] // 4 = Gastos de Servicio
    },
    { 
      id: "otros", 
      name: "Otros", 
      budgetKeys: ["orden_compra_otros"], 
      icon: FileText, 
      color: "text-violet-500",
      gastoIds: [5],
      movIds: [5] // 5 = Otros
    },
  ];

  const solicitudes = data.solicitudes || [];

  const suministrosApertura = data.apertura_suministros || [];
  const serviciosApertura = data.apertura_servicios || [];

  const getCategoryItems = (catId) => {
    if (catId === "suministros") {
      return suministrosApertura.filter(s => s.id_tipo_gasto === 1 || s.id_tipo_gasto === 2);
    }
    if (catId === "mano_obra") {
      return serviciosApertura.filter(s => s.id_tipo_gasto === 3);
    }
    if (catId === "costo_servicios") {
      return serviciosApertura.filter(s => s.id_tipo_gasto === 4);
    }
    if (catId === "otros") {
      return serviciosApertura.filter(s => s.id_tipo_gasto === 5 || !s.id_tipo_gasto);
    }
    return [];
  };

  // Totales Generales
  const totalPresupuesto = Number(data.presupuesto || 0);
  const totalProgramado = solicitudes.reduce((sum, s) => sum + Number(s.monto_dolares || 0), 0);
  const totalDisponible = Math.max(0, totalPresupuesto - totalProgramado);

  // Documentos de Gestión
  const docs = [
    { desc: "Documentos Entregables del Proyecto - DEP", val: data.doc },
    data.do1 ? { desc: data.do1, val: data.ti1 } : null,
    data.do2 ? { desc: data.do2, val: data.ti2 } : null,
    data.do3 ? { desc: data.do3, val: data.ti3 } : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1920px] mx-auto animate-in fade-in duration-700 font-sans">
      
      {/* HEADER */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center">
            {/* Botón Atrás */}
            <button
              onClick={() => navigate('/compras/programacion')}
              className="mr-5 p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-gray-100 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </button>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  PROGRAMACIÓN: {data.cotizacion_codigo || data.codigo || data.numero_orden || `AP-${data.id_apertura}`}
                </h1>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black rounded-full uppercase tracking-wider">
                  {data.estado_orden_nombre || "Pendiente"}
                </span>
              </div>

              {/* Chips de datos principales */}
              <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">
                <span className="flex items-center gap-1 px-3 py-1 bg-indigo-50/50 border border-indigo-100 text-indigo-700 rounded-xl" title="Número de Orden de Compra">
                  <FileText className="h-3 w-3 shrink-0" />
                  NRO. ORDEN: {data.numero_orden || "S/N"}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50/50 border border-emerald-100 text-emerald-700 rounded-xl">
                  <Calendar className="h-3 w-3 shrink-0" />
                  FECHA ORDEN: {data.fecha_orden ? data.fecha_orden.split(' ')[0] : "S/N"}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-violet-50/50 border border-violet-100 text-violet-700 rounded-xl max-w-xs truncate" title={data.cliente_nombre || data.id_registro?.cliente_nombre || data.id_registro?.id_cliente?.nombre || "S/N"}>
                  <Building className="h-3 w-3 shrink-0" />
                  CLIENTE: {data.cliente_nombre || data.id_registro?.cliente_nombre || data.id_registro?.id_cliente?.nombre || "S/N"}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-amber-50/50 border border-amber-100 text-amber-700 rounded-xl">
                  <Layers className="h-3 w-3 shrink-0" />
                  ÁREA: {data.area_nombre || data.id_registro?.area_nombre || "S/N"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => navigate('/compras/programacion')}
              className="px-5 h-10 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
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
          
          {/* PRESUPUESTO SECTION */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('presupuesto')}
              className="flex items-center justify-between w-full px-5 py-4 bg-gray-50 hover:bg-gray-100/80 transition-colors border-b border-gray-200"
            >
              <div className="flex items-center gap-3">
                {expandedSections.includes('presupuesto') ? (
                  <ChevronDown className="h-4 w-4 text-indigo-600 font-bold" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-indigo-600 font-bold" />
                )}
                <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Presupuesto y Solicitudes de Gasto</h3>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md uppercase">
                  {solicitudes.length} Solicitudes
                </span>
              </div>
            </button>

            <AnimatePresence>
              {expandedSections.includes('presupuesto') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 space-y-4">
                    {categories
                      .filter(cat => {
                        const presentIds = data.tipos_gasto_presentes;
                        if (!presentIds) return true;
                        return (cat.gastoIds || cat.movIds).some(id => presentIds.includes(id));
                      })
                      .map((cat) => {
                      const budget = cat.budgetKeys.reduce((sum, key) => sum + Number(data[key] || 0), 0);
                      const catItems = getCategoryItems(cat.id);
                      const catSols = solicitudes
                        .filter(s => {
                          const gasto = Number(s.tipo_gasto !== undefined && s.tipo_gasto !== null ? s.tipo_gasto : s.tipo_movimiento);
                          if (cat.id === "suministros") return gasto === 1 || gasto === 2;
                          if (cat.id === "mano_obra") return gasto === 3;
                          if (cat.id === "costo_servicios") return gasto === 4;
                          if (cat.id === "otros") return gasto === 5 || (gasto < 1 || gasto > 5 || !gasto);
                          return (cat.gastoIds || cat.movIds).includes(gasto);
                        })
                        .sort((a, b) => {
                          const dateA = a.fecha ? new Date(a.fecha).getTime() : 0;
                          const dateB = b.fecha ? new Date(b.fecha).getTime() : 0;
                          if (dateA !== dateB) return dateA - dateB;
                          return (Number(a.id_registro) || 0) - (Number(b.id_registro) || 0);
                        });
                      const programmedSum = catSols.reduce((sum, s) => sum + Number(s.monto_dolares || 0), 0);
                      const availableSum = Math.max(0, budget - programmedSum);

                      if (budget === 0 && catSols.length === 0 && catItems.length === 0) return null;

                      const isExpanded = expandedCategories.includes(cat.id);

                      return (
                        <div key={cat.id} className="bg-slate-50/50 border border-slate-200/65 rounded-xl overflow-hidden shadow-sm">
                          {/* Sub-Category Header */}
                          <button
                            onClick={() => toggleCategory(cat.id)}
                            className="flex items-center justify-between w-full px-4 py-3 bg-slate-100/60 hover:bg-slate-100 transition-colors border-b border-slate-200/80"
                          >
                            <div className="flex items-center gap-2.5">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-indigo-600 font-black" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-indigo-600 font-black" />
                              )}
                              <cat.icon className={`w-4.5 h-4.5 ${cat.color} shrink-0`} />
                              <span className="text-[12px] font-black text-slate-800 uppercase tracking-widest">{cat.name}</span>
                              <span className="px-2 py-0.5 bg-slate-200/90 text-slate-700 text-[9px] font-black rounded-full uppercase" title="Ítems presupuestados en esta categoría">
                                {catItems.length} {catItems.length === 1 ? "Ítem" : "Ítems"}
                              </span>
                              {catSols.length > 0 ? (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[9px] font-black rounded-full uppercase" title="Solicitudes de gasto registradas">
                                  {catSols.length} {catSols.length === 1 ? "Solicitud" : "Solicitudes"}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-bold rounded-full uppercase" title="Sin solicitudes de gasto aún">
                                  0 Solicitudes
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-right">
                              <div className="text-[10px] text-gray-500 font-bold uppercase">
                                <span className="mr-1 text-gray-800">Presupuesto:</span>
                                <span className="text-gray-800 font-black">{formatCurrency(budget)}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-bold uppercase border-l border-gray-200 pl-3">
                                <span className="mr-1 text-indigo-600">Programado:</span>
                                <span className="text-indigo-600 font-black">{formatCurrency(programmedSum)}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-bold uppercase border-l border-gray-200 pl-3">
                                <span className="mr-1 text-emerald-700">Disponible:</span>
                                <span className={`font-black ${availableSum < 0 ? "text-red-600" : "text-emerald-700"}`}>
                                  {formatCurrency(availableSum)}
                                </span>
                              </div>
                            </div>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden bg-white"
                              >
                                {/* SECCIÓN 1: ÍTEMS PRESUPUESTADOS DE LA APERTURA */}
                                {catItems.length > 0 && (
                                  <div className="border-b border-slate-200/80 bg-slate-50/40">
                                    <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200/60 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <cat.icon className={`w-3.5 h-3.5 ${cat.color}`} />
                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                          Ítems Presupuestados ({cat.name})
                                        </span>
                                      </div>
                                      <span className="text-[9.5px] font-bold text-slate-500 uppercase">
                                        {catItems.length} {catItems.length === 1 ? "Registro" : "Registros"} en Orden
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                          <tr className="bg-slate-50 text-slate-500 text-[9.5px] font-black uppercase tracking-wider border-b border-slate-200/60">
                                            <th className="px-4 py-2 w-12 text-center">N°</th>
                                            <th className="px-4 py-2 w-36">Código</th>
                                            <th className="px-4 py-2">Descripción / Concepto</th>
                                            <th className="px-4 py-2 w-28 text-center">Cant. / UM</th>
                                            <th className="px-4 py-2 w-32 text-right">Costo Unit.</th>
                                            <th className="px-4 py-2 w-32 text-right">Presupuesto</th>
                                            <th className="px-4 py-2 w-32 text-center">Cronograma</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                          {catItems.map((item, idx) => {
                                            const isGroupHeader = item.nivel === 0;
                                            const code = item.codigo_item || item.codigo_servicio || (isGroupHeader ? `GRP-${item.codigo_grupo || idx + 1}` : "—");
                                            const desc = item.descripcion || item.descripcion_item || item.nombre_grupo || item.nombre_servicio || "Sin descripción";
                                            const cant = Number(item.cantidad || item.horas || 1);
                                            const um = item.tipo_unidad || (item.horas ? "HRS" : "UNI");
                                            const unitCost = Number(item.costo_precio || 0);
                                            const totalCost = Number(item.costo_total || 0);
                                            
                                            return (
                                              <tr 
                                                key={item.id_registro || idx}
                                                className={`transition-colors ${isGroupHeader ? "bg-slate-50/60 font-semibold text-slate-900" : "hover:bg-slate-50/80 text-slate-700"}`}
                                              >
                                                <td className="px-4 py-2 text-center text-slate-400 font-mono text-[11px]">
                                                  {idx + 1}
                                                </td>
                                                <td className="px-4 py-2 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">
                                                  {code}
                                                </td>
                                                <td className="px-4 py-2">
                                                  <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800 text-xs line-clamp-2" title={desc}>
                                                      {desc}
                                                    </span>
                                                    {item.proveedor && (
                                                      <span className="text-[10px] text-slate-400 truncate mt-0.5">
                                                        Prov: {item.proveedor}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="px-4 py-2 text-center font-bold text-slate-700 whitespace-nowrap">
                                                  {cant} <span className="text-[10px] font-normal text-slate-400">{um}</span>
                                                </td>
                                                <td className="px-4 py-2 text-right font-bold text-slate-600 whitespace-nowrap">
                                                  {formatCurrency(unitCost)}
                                                </td>
                                                <td className="px-4 py-2 text-right font-black text-slate-900 whitespace-nowrap">
                                                  {formatCurrency(totalCost)}
                                                </td>
                                                <td className="px-4 py-2 text-center whitespace-nowrap">
                                                  {item.fini ? (
                                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                                      {item.fini} {item.fmax ? `al ${item.fmax}` : ""}
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                      Por programar
                                                    </span>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* SECCIÓN 2: SOLICITUDES DE GASTO */}
                                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Solicitudes de Gasto</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setSelectedCategoryForOrden({ ...cat, budget, programmedSum, availableSum, items: catItems });
                                        setOrdenCompraModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg border border-emerald-200/60 bg-emerald-50/30 text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm active:scale-95 cursor-pointer"
                                    >
                                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                                      ORDEN COMPRA/SERVICIOS
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedCategoryForPasaje({ ...cat, budget, programmedSum, availableSum, items: catItems });
                                        setPasajeTransporteDefault("A");
                                        setPasajeModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg border border-sky-200/60 bg-sky-50/30 text-sky-700 hover:bg-sky-50 transition-colors shadow-sm cursor-pointer active:scale-95"
                                    >
                                      <Plane className="w-3.5 h-3.5 text-sky-600" />
                                      PASAJE AEREO
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedCategoryForPasaje({ ...cat, budget, programmedSum, availableSum, items: catItems });
                                        setPasajeTransporteDefault("T");
                                        setPasajeModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg border border-amber-200/60 bg-amber-50/30 text-amber-700 hover:bg-amber-50 transition-colors shadow-sm cursor-pointer active:scale-95"
                                    >
                                      <Bus className="w-3.5 h-3.5 text-amber-600" />
                                      PASAJE TERRESTRE
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedCategoryForCajaChica({ ...cat, budget, programmedSum, availableSum, items: catItems });
                                        setCajaChicaModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg border border-purple-200/60 bg-purple-50/30 text-purple-700 hover:bg-purple-50 transition-colors shadow-sm active:scale-95"
                                    >
                                      <Wallet className="w-3.5 h-3.5 text-purple-600" />
                                      CAJA CHICA
                                    </button>
                                  </div>
                                </div>

                                {catSols.length === 0 ? (
                                  <div className="p-6 text-center text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                                    No hay solicitudes registradas en esta categoría
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50/50 text-slate-700 border-b border-gray-200 text-[10px] font-black uppercase">
                                          <th className="px-4 py-2.5 w-12 text-center">Tipo</th>
                                          <th className="px-4 py-2.5 pl-6">Registro</th>
                                          <th className="px-4 py-2.5 w-28">Fecha</th>
                                          <th className="px-4 py-2.5">Concepto</th>
                                          <th className="px-4 py-2.5 w-32 text-right">Programado</th>
                                          <th className="px-4 py-2.5 w-28 text-center">Estado</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {catSols.map((sol) => (
                                          <tr
                                            key={sol.id_solicitud || sol.id_pasaje || sol.id_registro}
                                            onClick={() => {
                                              handleVerDetalle(sol);
                                            }}
                                            onContextMenu={(e) => handleRowContextMenu(e, sol)}
                                            className="group hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer text-slate-700 text-xs select-none"
                                          >
                                            <td className="px-4 py-2.5 text-center flex justify-center items-center">
                                              {getRequestIcon(sol)}
                                            </td>
                                            <td className={`px-4 py-2.5 pl-6 font-bold group-hover:underline ${getRequestTextColor(sol)}`}>
                                              {sol.id_registro_directo || (sol.id_registro && String(sol.id_registro).includes('_') ? sol.id_registro.split('_')[1] : (sol.id_registro || sol.id_solicitud))}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-800 font-bold whitespace-nowrap">
                                              {sol.fecha}
                                            </td>
                                            <td className="px-4 py-2 max-w-xs" title={sol.concepto}>
                                               {(() => {
                                                 const raw = (sol.concepto || "").trim();
                                                 const categoria = sol.categoria_solicitud || (
                                                   sol.es_caja_chica || String(sol.tipo || "").toLowerCase().includes("caja") ? "caja_chica" :
                                                   (sol.transporte || String(sol.tipo || "").toLowerCase().includes("pasaje") || String(sol.tipo || "").toLowerCase().includes("viaje")) ? "pasaje" :
                                                   "compra"
                                                 );

                                                 if (categoria === "caja_chica") {
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

                                                 if (categoria === "pasaje") {
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
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

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

          {/* PROYECTOS Y DOCUMENTOS SECTION */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('documentos')}
              className="flex items-center justify-between w-full px-5 py-4 bg-gray-50 hover:bg-gray-100/80 transition-colors border-b border-gray-200"
            >
              <div className="flex items-center gap-3">
                {expandedSections.includes('documentos') ? (
                  <ChevronDown className="h-4 w-4 text-indigo-600 font-bold" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-indigo-600 font-bold" />
                )}
                <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Gestión de Proyectos y Servicios</h3>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md uppercase">
                  {docs.length} Documentos
                </span>
              </div>
            </button>

            <AnimatePresence>
              {expandedSections.includes('documentos') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-700 border-b border-gray-200">
                          <th className="px-4 py-3 text-[10px] font-black uppercase">Descripción del Entregable</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase w-48 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docs.map((doc, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-xs font-bold text-gray-800 uppercase">
                              {doc.desc}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {getDocStatusBadge(doc.val)}
                            </td>
                          </tr>
                        ))}
                        {docs.length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs">
                              No se definieron entregables para este proyecto
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* PANEL DERECHO SIDEBAR (30%) */}
        <div className="w-full xl:w-4/12 flex flex-col space-y-6">
          
          {/* DATOS DE LA APERTURA */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50/50 border-b border-gray-200">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-indigo-500" />
                Datos de Apertura
              </h3>
            </div>
            <div className="p-5 space-y-3.5">
              <CompactField label="Nro de Orden" value={data.numero_orden} />
              <CompactField label="Fecha Orden" value={data.fecha_orden ? data.fecha_orden.split(' ')[0] : null} />
              <CompactField label="Fecha Entrega" value={data.fecha_entrega ? data.fecha_entrega.split(' ')[0] : null} />
              <CompactField 
                label="Plazo de Orden" 
                value={data.orden_plazo_valor ? `${data.orden_plazo_valor} ${data.unidad_plazo_nombre || ''}` : null} 
              />
              <CompactField label="Prioridad" value={data.prioridad_nombre} />
              {data.responsables && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Responsables
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {data.responsables.split(',').map((email, idx) => (
                      <span key={idx} className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {email.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DATOS DE LA COTIZACIÓN PADRE */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50/50 border-b border-gray-200">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Building className="w-4.5 h-4.5 text-indigo-500" />
                Cotización Padre
              </h3>
            </div>
            <div className="p-5 space-y-3.5">
              <CompactField label="Código" value={data.cotizacion_codigo} />
              <CompactField label="Cliente" value={data.cliente_nombre || data.id_registro?.cliente_nombre || data.id_registro?.id_cliente?.nombre} />
              <CompactField label="Área" value={data.area_nombre || data.id_registro?.area_nombre || "General"} />
              <CompactField label="Referencia" value={data.cotizacion_referencia} />
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

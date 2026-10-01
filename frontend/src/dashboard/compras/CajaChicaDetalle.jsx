import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Loader,
  User,
  Building2,
  FileText,
  Printer,
  Send,
  RotateCcw,
  Edit2,
  Calendar,
  ShieldCheck,
  Coins,
  Landmark,
  Copy,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Trash2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Receipt,
  Car,
  DollarSign,
  Save,
  LogOut,
  Clock,
  CheckCheck,
  Sparkles,
  Link as LinkIcon
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import ModalAgregarComprobante from "./ModalAgregarComprobante";

// Helper para formatear fechas a DD/MM/YYYY
const formatDateDMY = (dateStr, includeTime = false) => {
  if (!dateStr) return "S/N";
  try {
    const cleanStr = String(dateStr).trim();
    const [datePart, timePart] = cleanStr.split(/[ T]/);
    if (datePart && datePart.includes("-")) {
      const parts = datePart.split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const formattedDate = `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
        if (includeTime && timePart) {
          return `${formattedDate} ${timePart.substring(0, 5)}`;
        }
        return formattedDate;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      if (includeTime) {
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${formattedDate} ${hours}:${minutes}`;
      }
      return formattedDate;
    }
  } catch (e) {
    console.error(e);
  }
  return String(dateStr);
};

// Avatar con iniciales
const getInitials = (name) => {
  if (!name) return "CC";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export default function CajaChicaDetalle({ idCajaChica }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, id_caja_chica, nro_solicitud } = useParams();
  const queryClient = useQueryClient();
  const { setCustomBreadcrumbs, setBreadcrumbOverride } = useOutletContext() || {};

  const realId = idCajaChica || id_caja_chica || nro_solicitud || id;

  // Modales
  const [showPlanillaModal, setShowPlanillaModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showAddMovilidadModal, setShowAddMovilidadModal] = useState(false);
  const [editingMovilidadRow, setEditingMovilidadRow] = useState(null);
  const [showReintegroModal, setShowReintegroModal] = useState(false);
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Form states
  const [reintegroInput, setReintegroInput] = useState("");
  const [devolucionInput, setDevolucionInput] = useState("");
  const [newMovilidadForm, setNewMovilidadForm] = useState({
    id_planilla: null,
    orden: null,
    num: null,
    fecha: new Date().toISOString().split("T")[0],
    motivo: "MOVILIDAD",
    destino: "",
    id_trabajador: "",
    persona: "",
    monto: ""
  });
  const [newDocForm, setNewDocForm] = useState({
    tipo_doc: "FAC",
    id_tipo_concepto: 2,
    serie: "",
    numero: "",
    fecha: new Date().toISOString().split("T")[0],
    ruc: "",
    proveedor: "",
    detalle: "",
    igv: "18.00",
    importe: ""
  });

  // Estado para edición inline de campos (doble clic)
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  // Listas de datos para selects
  const [usuarios, setUsuarios] = useState([]);
  const [bancos, setBancos] = useState([]);

  useEffect(() => {
    const fetchAux = async () => {
      try {
        const [resUsers, resBancos] = await Promise.allSettled([
          api.get("/users/usuarios-activos/"),
          api.get("/users/bancos/"),
        ]);
        if (resUsers.status === "fulfilled" && Array.isArray(resUsers.value.data)) {
          setUsuarios(resUsers.value.data);
        }
        if (resBancos.status === "fulfilled" && Array.isArray(resBancos.value.data)) {
          setBancos(resBancos.value.data);
        }
      } catch {
        // Silencioso
      }
    };
    fetchAux();
  }, []);

  // 1. QUERY PRINCIPAL
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["cajaChicaDetalle", realId],
    queryFn: async () => {
      const res = await api.get(`/caja_chica/solicitudes_caja_chica/${realId}/`);
      return res.data;
    },
    enabled: !!realId,
    staleTime: 1000 * 5,
  });

  // DETECCIÓN DE CONTEXTO (CAJA CHICA VS COMPRAS)
  const isFromCajaChica = location.pathname.startsWith("/caja-chica") || location.state?.from === "caja-chica";

  const TAB_LABELS_MAP = {
    atencion: "ATENCION",
    liquidaciones: "LIQUIDACIONES",
    aprobacion: "APROBACION",
    caja_chica: "CAJA CHICA",
    "caja-chica": "CAJA CHICA",
    guias_salida: "GUIA SALIDA",
    "guias-salida": "GUIA SALIDA",
  };

  const getOriginTab = () => {
    // 1. Detectar directamente desde la URL (ej: /caja-chica/aprobacion/20262309)
    const match = location.pathname.match(/\/caja-chica\/([a-zA-Z0-9_-]+)\//);
    if (match && match[1] && TAB_LABELS_MAP[match[1]]) {
      return match[1];
    }
    // 2. Desde el estado de navegación
    if (location.state?.fromTab && TAB_LABELS_MAP[location.state.fromTab]) {
      return location.state.fromTab;
    }
    // 3. Desde sessionStorage
    const stored = sessionStorage.getItem("caja_chica_active_tab");
    if (stored && TAB_LABELS_MAP[stored]) return stored;
    // 4. Fallback según estado de la solicitud
    const est = Number(data?.id_estado?.id_estado ?? data?.id_estado);
    if (est === 3) return "aprobacion";
    if (est === 2) return "liquidaciones";
    if (est === 4) return "caja_chica";
    return "atencion";
  };

  const activeOriginTab = getOriginTab();
  const activeOriginLabel = location.state?.tabLabel || TAB_LABELS_MAP[activeOriginTab] || "CAJA CHICA";

  // Volver seguro al módulo de origen sin recargar ni pasar por compras cuando viene de caja chica
  const handleVolver = () => {
    if (isFromCajaChica) {
      if (location.state?.returnUrl && location.state.returnUrl.startsWith("/caja-chica")) {
        navigate(location.state.returnUrl);
        return;
      }
      navigate(`/caja-chica/${activeOriginTab}`);
      return;
    }

    // Viene de Compras
    if (location.state?.returnUrl) {
      navigate(location.state.returnUrl);
      return;
    }
    if (location.state?.from === "plan-inversion" || location.state?.id_plan) {
      navigate(`/compras/plan-inversion/${location.state.id_plan}`);
      return;
    }
    if (data?.id_apertura) {
      navigate(`/compras/programacion/${data.id_apertura}`);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/compras/atencion");
  };

  const directId = useMemo(() => {
    if (!data && !realId) return "";
    if (data?.id_registro_numero) return String(data.id_registro_numero);
    const regStr = String(data?.id_registro || realId || "");
    return regStr.includes("_") ? regStr.split("_")[1] : regStr;
  }, [data, realId]);

  // Sincronización de Breadcrumbs
  useEffect(() => {
    if (!data) return;
    const displayNro = String(directId);
    if (setBreadcrumbOverride) setBreadcrumbOverride(displayNro);

    if (setCustomBreadcrumbs) {
      if (isFromCajaChica) {
        // Requerimiento exacto:
        // > ATENCION > 20262131
        // > APROBACION > 20262131
        // > LIQUIDACIONES > 20262131
        setCustomBreadcrumbs([
          { label: activeOriginLabel, path: `/caja-chica/${activeOriginTab}` },
          { label: displayNro, active: true }
        ]);
      } else {
        const planId = location.state?.id_plan || data?.id_plan_inversion;
        setCustomBreadcrumbs([
          { label: "Compras", path: "/compras" },
          ...(planId ? [{ label: `Plan Inversión #${planId}`, path: `/compras/plan-inversion/${planId}` }] : (data.id_apertura ? [{ label: `Programación #${data.id_apertura}`, path: `/compras/programacion/${data.id_apertura}` }] : [])),
          { label: `Solicitud de Gasto #${displayNro}`, active: true }
        ]);
      }
    }
  }, [setCustomBreadcrumbs, setBreadcrumbOverride, data, directId, isFromCajaChica, activeOriginLabel, activeOriginTab, location.state]);

  // MUTATION PARA ACTUALIZAR CAMPOS DE CABECERA
  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value }) => {
      let payload = { [field]: value };
      if (field === 'monto_soles') {
        const tc = parseFloat(data?.tipo_cambio || 3.75) || 3.75;
        payload.monto_dolares = (parseFloat(value) / tc).toFixed(2);
      } else if (field === 'monto_dolares') {
        const tc = parseFloat(data?.tipo_cambio || 3.75) || 3.75;
        payload.monto_soles = (parseFloat(value) * tc).toFixed(2);
      }
      const res = await api.patch(`/caja_chica/solicitudes_caja_chica/${realId}/`, payload);
      return res.data;
    },
    onSuccess: (updatedData) => {
      queryClient.setQueryData(["cajaChicaDetalle", realId], updatedData);
      queryClient.invalidateQueries(["cajaChicaDetalle", realId]);
      toast.success("Campo actualizado correctamente");
      setEditingField(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al actualizar el campo");
    }
  });

  // MUTATION PARA GUARDAR LIQUIDACION
  const guardarLiquidacionMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/caja_chica/solicitudes_caja_chica/${realId}/guardar_liquidacion/`, payload);
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.setQueryData(["cajaChicaDetalle", realId], resData.data);
      queryClient.invalidateQueries(["cajaChicaDetalle", realId]);
      queryClient.invalidateQueries(["caja-chica-liquidaciones"]);
      queryClient.invalidateQueries(["caja-chica-aprobacion"]);
      toast.success("Liquidación actualizada con éxito");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al guardar liquidación");
    }
  });

  // MUTATION PARA APROBAR LIQUIDACION
  const aprobarLiquidacionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/caja_chica/solicitudes_caja_chica/${realId}/aprobar_liquidacion/`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Liquidación aprobada con éxito");
      queryClient.setQueryData(["cajaChicaDetalle", realId], resData.data);
      queryClient.invalidateQueries(["cajaChicaDetalle", realId]);
      queryClient.invalidateQueries(["caja-chica-liquidaciones"]);
      queryClient.invalidateQueries(["caja-chica-aprobacion"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al aprobar liquidación");
    }
  });

  // MUTATION PARA CAMBIO DE ESTADO
  const cambiarEstadoMutation = useMutation({
    mutationFn: async (payloadOrId) => {
      const payload = typeof payloadOrId === "object" ? payloadOrId : { id_estado: payloadOrId };
      const res = await api.patch(`/caja_chica/solicitudes_caja_chica/${realId}/`, payload);
      return res.data;
    },
    onSuccess: (updatedData) => {
      toast.success("Operación realizada con éxito");
      queryClient.setQueryData(["cajaChicaDetalle", realId], updatedData);
      queryClient.invalidateQueries(["cajaChicaDetalle", realId]);
      queryClient.invalidateQueries(["caja-chica-atencion"]);
      queryClient.invalidateQueries(["caja-chica-liquidaciones"]);
      queryClient.invalidateQueries(["caja-chica-aprobacion"]);
      queryClient.invalidateQueries(["caja-chica-general"]);
      queryClient.invalidateQueries(["caja-chica-resumen"]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al actualizar estado");
    }
  });

  // MUTATION PARA AGREGAR COMPROBANTE
  const guardarComprobanteMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/caja_chica/solicitudes_caja_chica/${realId}/guardar_comprobante/`, payload);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Comprobante agregado correctamente");
      setShowAddDocModal(false);
      setNewDocForm({
        tipo_doc: "FAC",
        id_tipo_concepto: 2,
        serie: "",
        numero: "",
        fecha: new Date().toISOString().split("T")[0],
        ruc: "",
        proveedor: "",
        detalle: "",
        igv: "18.00",
        importe: ""
      });
      queryClient.invalidateQueries(["cajaChicaDetalle", realId]);
      queryClient.invalidateQueries(["caja-chica-atencion"]);
      queryClient.invalidateQueries(["caja-chica-liquidaciones"]);
      queryClient.invalidateQueries(["caja-chica-aprobacion"]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al registrar comprobante");
    }
  });

  // MUTATION PARA ELIMINAR COMPROBANTE
  const eliminarComprobanteMutation = useMutation({
    mutationFn: async (idComp) => {
      const res = await api.delete(`/caja_chica/solicitudes_caja_chica/${realId}/eliminar_comprobante/?id_comprobante=${idComp}`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Comprobante eliminado");
      queryClient.invalidateQueries(["cajaChicaDetalle", realId]);
      queryClient.invalidateQueries(["caja-chica-atencion"]);
      queryClient.invalidateQueries(["caja-chica-liquidaciones"]);
      queryClient.invalidateQueries(["caja-chica-aprobacion"]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al eliminar comprobante");
    }
  });

  // MUTATION PARA GUARDAR / ACTUALIZAR TRASLADO DE MOVILIDAD
  const guardarMovilidadMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/caja_chica/solicitudes_caja_chica/${realId}/guardar_movilidad/`, payload);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Traslado registrado en la planilla");
      setShowAddMovilidadModal(false);
      setEditingMovilidadRow(null);
      setNewMovilidadForm({
        id_planilla: null,
        orden: null,
        num: null,
        fecha: new Date().toISOString().split("T")[0],
        motivo: "MOVILIDAD",
        destino: "",
        id_trabajador: "",
        persona: data?.destinatario_nombre || data?.solicitante_nombre || "",
        monto: ""
      });
      queryClient.setQueryData(["cajaChicaDetalle", realId], resData.data);
      queryClient.invalidateQueries(["cajaChicaDetalle", realId]);
      queryClient.invalidateQueries(["caja-chica-liquidaciones"]);
      queryClient.invalidateQueries(["caja-chica-aprobacion"]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al registrar traslado en la planilla");
    }
  });

  // MUTATION PARA ELIMINAR TRASLADO DE MOVILIDAD
  const eliminarMovilidadMutation = useMutation({
    mutationFn: async (target) => {
      let q = "";
      if (typeof target === "object" && target !== null) {
        if (target.id_planilla) q += `id_planilla=${target.id_planilla}&`;
        if (target.orden || target.num) q += `orden=${target.orden || target.num}`;
      } else {
        q = `id_planilla=${target}&orden=${target}&num=${target}`;
      }
      const res = await api.delete(`/caja_chica/solicitudes_caja_chica/${realId}/eliminar_movilidad/?${q}`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Traslado eliminado de la planilla");
      queryClient.setQueryData(["cajaChicaDetalle", realId], resData.data);
      queryClient.invalidateQueries(["cajaChicaDetalle", realId]);
      queryClient.invalidateQueries(["caja-chica-liquidaciones"]);
      queryClient.invalidateQueries(["caja-chica-aprobacion"]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al eliminar traslado de la planilla");
    }
  });

  // MUTATION PARA ELIMINAR SOLICITUD
  const eliminarMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/caja_chica/solicitudes_caja_chica/${realId}/`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData?.message || "Solicitud de caja chica eliminada con éxito.");
      queryClient.invalidateQueries(["cajaChicaDetalle", realId]);
      queryClient.invalidateQueries(["caja-chica-atencion"]);
      queryClient.invalidateQueries(["caja-chica-liquidaciones"]);
      queryClient.invalidateQueries(["caja-chica-aprobacion"]);
      handleVolver();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al eliminar solicitud.");
    }
  });

  // Inline edit handlers
  const handleStartEditing = (field, currentValue) => {
    if (!isPendiente && (field === 'monto_soles' || field === 'monto_dolares')) {
      toast.info("El monto solo puede modificarse cuando la solicitud está en estado PENDIENTE DE ENVÍO.");
      return;
    }
    setEditingField(field);
    setEditingValue(currentValue ?? "");
  };

  const handleSaveField = (field, valueOverride) => {
    let value = valueOverride !== undefined ? valueOverride : editingValue;
    updateFieldMutation.mutate({ field, value });
  };

  const handleCancelEditing = () => {
    setEditingField(null);
    setEditingValue("");
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.info("Número de cuenta copiado al portapapeles");
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[450px] flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-100 shadow-sm font-sans">
        <Loader className="w-9 h-9 text-emerald-600 animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Cargando Detalle de Liquidación de Gasto...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center space-y-4 bg-red-50/50 rounded-3xl border border-red-100 text-center font-sans">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <div>
          <h3 className="text-sm font-black text-red-950 uppercase tracking-wider mb-1">Error de Carga</h3>
          <p className="text-xs font-semibold text-red-700">
            {error?.response?.data?.error || error?.message || "No se pudieron obtener los datos de la solicitud."}
          </p>
        </div>
        <button
          onClick={handleVolver}
          className="px-5 py-2.5 bg-white hover:bg-red-50 border border-red-200 text-red-700 font-black text-xs uppercase rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          Volver
        </button>
      </div>
    );
  }

  // Identificación de estados
  const estadoId = Number(data?.id_estado?.id_estado ?? data?.id_estado ?? 99);
  const estadoStr = String(data?.estado_nombre || "").toUpperCase();
  const isPendiente = estadoId === 0 || (estadoStr.includes("PENDIENTE") && !estadoStr.includes("ATENCIÓN") && !estadoStr.includes("ATENCION") && !estadoStr.includes("LIQUIDACION"));
  const isEnviado = estadoId === 1 || estadoStr.includes("ENVIADO") || estadoStr.includes("PENDIENTE DE ATENCIÓN");
  const isAtendido = estadoId === 2 || estadoStr.includes("ATENDIDO");
  const isLiqEnviada = estadoId === 3 || estadoStr.includes("LIQUIDACION ENVIADA") || estadoStr.includes("LIQUIDACIÓN ENVIADA");
  const isAprobado = estadoId === 4 || estadoStr.includes("APROBADA") || estadoStr.includes("APROBADO") || String(data.aprobado_rendicion) === '1';

  // Badge de Estado idéntico a CompraDetalle / PasajeDetalle
  const getStatusBadge = () => {
    let colorClasses = "bg-slate-50 text-slate-700 border-slate-200";
    if (isPendiente) {
      colorClasses = "bg-red-50 text-red-700 border-red-200/50";
    } else if (isEnviado) {
      colorClasses = "bg-amber-50 text-amber-700 border-amber-200/50";
    } else if (isAtendido) {
      colorClasses = "bg-sky-50 text-sky-700 border-sky-200/50";
    } else if (isLiqEnviada) {
      colorClasses = "bg-indigo-50 text-indigo-700 border-indigo-200/50";
    } else if (isAprobado) {
      colorClasses = "bg-zinc-900 text-zinc-50 border-zinc-950";
    }

    return {
      bg: colorClasses,
      label: data?.estado_nombre || (isAprobado ? "Aprobada" : isLiqEnviada ? "Liquidación Enviada" : isAtendido ? "Atendido" : isEnviado ? "Pendiente Atención" : "Pendiente de Envío")
    };
  };

  const statusBadge = getStatusBadge();

  // Helper para normalizar tipo y número de comprobante en 2 filas
  const formatComprobanteDoc = (item) => {
    let tipo = (item.tipo_documento_nombre || "").trim();
    const rawDoc = (item.documento || "").trim();
    const rawNum = (item.numero_documento || item.numero || "").trim();
    const docTipo = (item.tipo_doc || "").trim().toUpperCase();

    const tipoMap = {
      FAC: "FACTURA",
      BOL: "BOLETA",
      PLL: "PLANILLA DE MOVILIDAD",
      REC: "RECIBO",
      RH: "RECIBO POR HONORARIOS",
      TIC: "TICKET",
      TCK: "TICKET",
      TK: "TICKET",
      VBO: "BOLETO DE VIAJE",
      ND: "NOTA DE DÉBITO",
      NC: "NOTA DE CRÉDITO",
      OTR: "OTRO",
    };

    if (!tipo) {
      if (docTipo && tipoMap[docTipo]) {
        tipo = tipoMap[docTipo];
      } else if (String(item.detalle || "").toUpperCase().includes("PLANILLA") || rawDoc === "P000000") {
        tipo = "PLANILLA DE MOVILIDAD";
      } else if (docTipo) {
        tipo = docTipo;
      } else {
        tipo = "DOCUMENTO";
      }
    } else {
      const upper = tipo.toUpperCase();
      if (upper.includes("FACTURA")) tipo = "FACTURA";
      else if (upper.includes("BOLETA")) tipo = "BOLETA";
      else if (upper.includes("PLANILLA")) tipo = "PLANILLA DE MOVILIDAD";
      else if (upper.includes("HONORARIOS")) tipo = "RECIBO POR HONORARIOS";
      else if (upper.includes("RECIBO")) tipo = "RECIBO";
      else if (upper.includes("TICKET")) tipo = "TICKET";
      else tipo = upper;
    }

    let numero = rawNum;
    if (!numero && rawDoc) {
      const parts = rawDoc.split(" ");
      if (parts.length > 1) {
        numero = parts.slice(1).join(" ");
      } else if (rawDoc !== docTipo && rawDoc !== "OTR") {
        numero = rawDoc;
      }
    }

    if (!numero) {
      numero = rawDoc === "P000000" ? "P000000" : (rawDoc && rawDoc !== docTipo && rawDoc !== "OTR" ? rawDoc : "S/N");
    }

    return {
      tipo: tipo.toUpperCase(),
      numero: numero.toUpperCase(),
    };
  };

  // Helper para cálculo de IGV e Importe (Base)
  const calculateRowIgv = (total, rawIgv) => {
    const totalVal = parseFloat(total) || 0;
    const igvNum = parseFloat(rawIgv) || 0;
    let rate = 0;
    let percent = 0;

    if (igvNum > 0) {
      if (igvNum <= 1) {
        rate = igvNum;
        percent = Math.round(igvNum * 100);
      } else {
        percent = igvNum;
        rate = igvNum / 100;
      }
    }

    const baseVal = rate > 0 ? (totalVal / (1 + rate)) : totalVal;
    const montoIgv = totalVal - baseVal;

    return {
      total: totalVal,
      percent,
      rate,
      base: baseVal,
      montoIgv
    };
  };

  // Cálculos de Liquidación
  const comprobantesList = data.comprobantes || [];
  const planillaList = data.planilla_movilidad || [];

  let sumBase = 0;
  let sumIgv = 0;
  let sumTotal = 0;

  comprobantesList.forEach((c) => {
    const calc = calculateRowIgv(c.importe, c.igv);
    sumBase += calc.base;
    sumIgv += calc.montoIgv;
    sumTotal += calc.total;
  });

  const totalsComprobantes = {
    sumBase,
    sumIgv,
    sumTotal
  };

  const totalComprobantesCalc = totalsComprobantes.sumTotal;
  const totalRendidoVal = comprobantesList.length > 0 
    ? totalComprobantesCalc 
    : (data.total_rendido !== null && data.total_rendido !== undefined ? parseFloat(data.total_rendido) : 0);

  // MONTO PRESUPUESTO usa directamente monto_entregado (según solicitud del usuario)
  const montoPresupuesto = (data.monto_entregado !== null && data.monto_entregado !== undefined && data.monto_entregado !== "")
    ? parseFloat(data.monto_entregado)
    : parseFloat(data.monto_soles || data.monto_rendicion || 0);

  // REINTEGRO usa monto_reintegro
  const reintegroVal = (data.monto_reintegro !== null && data.monto_reintegro !== undefined && data.monto_reintegro !== "")
    ? parseFloat(data.monto_reintegro)
    : (data.reintegro !== null && data.reintegro !== undefined && data.reintegro !== "" ? parseFloat(data.reintegro) : null);

  // DEVOLUCIÓN usa monto_devolucion
  const devolucionVal = (data.monto_devolucion !== null && data.monto_devolucion !== undefined && data.monto_devolucion !== "")
    ? parseFloat(data.monto_devolucion)
    : (data.devolucion !== null && data.devolucion !== undefined && data.devolucion !== "" ? parseFloat(data.devolucion) : null);

  // SALDO
  const saldoCalc = (data.saldo_rendicion !== null && data.saldo_rendicion !== undefined)
    ? parseFloat(data.saldo_rendicion)
    : (montoPresupuesto + (reintegroVal || 0) - (devolucionVal || 0) - totalRendidoVal);

  const tc = parseFloat(data.tipo_cambio || 3.3630) || 3.3630;
  const isDolares = data.tipo_moneda === "D";
  const currencySymbol = isDolares ? "$" : "S/.";

  const montoUSD = isDolares ? montoPresupuesto : (tc > 0 ? montoPresupuesto / tc : 0);
  const montoPEN = isDolares ? montoPresupuesto * tc : montoPresupuesto;

  const formatMoney = (val, symbol = "S/.") => `${symbol} ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const percentEjecutado = montoPresupuesto > 0 ? Math.min(100, Math.round((totalRendidoVal / montoPresupuesto) * 100)) : 0;

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1920px] mx-auto animate-in fade-in duration-500 font-sans pb-12">
      
      {/* 1. ENCABEZADO EJECUTIVO Y BARRA DE ACCIONES SUPERIOR */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* IDENTIFICACIÓN Y TÍTULO */}
          <div className="flex items-start gap-4">
            <button
              onClick={handleVolver}
              className="p-2.5 bg-slate-50 hover:bg-emerald-50 rounded-2xl text-slate-400 hover:text-emerald-600 border border-slate-200/60 transition-all group shrink-0 cursor-pointer"
              title="Volver"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </button>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                  {directId}
                </h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${statusBadge.bg}`}>
                  {statusBadge.label}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
                  {data.tipo_solicitud_nombre || "Caja Chica"}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200/80 font-mono">
                  SOLICITUD DE GASTO
                </span>
              </div>

              {/* Fila secundaria: CONCEPTO & OBSERVACIÓN EDITABLES */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {/* CONCEPTO */}
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50/70 border border-indigo-100 text-indigo-700 font-black text-[10px] uppercase tracking-wider">
                    CONCEPTO
                  </span>
                  {editingField === 'concepto' ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveField('concepto', editingValue)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveField('concepto', editingValue);
                        if (e.key === "Escape") setEditingField(null);
                      }}
                      className="px-2.5 py-1 text-sm font-black text-slate-800 bg-white border-2 border-indigo-500 rounded-xl shadow-md outline-none min-w-[260px]"
                      placeholder="Concepto del gasto..."
                    />
                  ) : (
                    <span
                      onDoubleClick={() => handleStartEditing('concepto', data.concepto || "")}
                      className={`text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5 ${
                        isPendiente ? "cursor-pointer hover:text-indigo-600 hover:bg-slate-50 px-2 py-1 rounded-xl border border-dashed border-transparent hover:border-indigo-300 transition-all group" : ""
                      }`}
                      title={isPendiente ? "Doble clic para editar concepto" : undefined}
                    >
                      <span>{data.concepto || "Sin concepto registrado"}</span>
                      {isPendiente && <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </span>
                  )}
                </div>

                {/* OBSERVACIÓN */}
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-50/70 border border-amber-100 text-amber-700 font-black text-[10px] uppercase tracking-wider">
                    OBSERVACIÓN
                  </span>
                  {editingField === 'observacion' ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveField('observacion', editingValue)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveField('observacion', editingValue);
                        if (e.key === "Escape") setEditingField(null);
                      }}
                      className="px-2.5 py-1 text-sm font-semibold text-slate-800 bg-white border-2 border-amber-500 rounded-xl shadow-md outline-none min-w-[260px]"
                      placeholder="Observaciones..."
                    />
                  ) : (
                    <span
                      onDoubleClick={() => handleStartEditing('observacion', data.observacion || "")}
                      className={`text-xs font-semibold text-slate-600 flex items-center gap-1.5 ${
                        isPendiente ? "cursor-pointer hover:text-amber-700 hover:bg-amber-50/50 px-2 py-1 rounded-xl border border-dashed border-transparent hover:border-amber-300 transition-all group" : ""
                      }`}
                      title={isPendiente ? "Doble clic para editar observación" : undefined}
                    >
                      <span>{data.observacion || (isPendiente ? "Sin observación (Doble clic para añadir)" : "Sin observaciones")}</span>
                      {isPendiente && <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN SUPERIORES */}
          <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center">
            {/* 1. REINTEGRO */}
            <button
              onClick={() => {
                setReintegroInput(reintegroVal !== null && reintegroVal !== undefined ? String(reintegroVal) : "");
                setShowReintegroModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>Reintegro</span>
            </button>

            {/* 2. DEVOLUCIÓN */}
            <button
              onClick={() => {
                setDevolucionInput(devolucionVal !== null && devolucionVal !== undefined ? String(devolucionVal) : "");
                setShowDevolucionModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
              <span>Devolución</span>
            </button>

            {/* 3. APROBAR / APROBADA */}
            <button
              onClick={() => {
                if (isAprobado) return;
                if (window.confirm("¿Confirmar aprobación de la liquidación de gasto?")) {
                  aprobarLiquidacionMutation.mutate();
                }
              }}
              disabled={isAprobado || aprobarLiquidacionMutation.isLoading}
              className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer ${
                isAprobado 
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" 
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20"
              }`}
            >
              {aprobarLiquidacionMutation.isLoading ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{isAprobado ? "Aprobada" : "Aprobar"}</span>
            </button>

            {/* 4. REPORTE (IMPRIMIR) */}
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
              title="Imprimir Reporte"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Reporte</span>
            </button>

            {/* BOTÓN ENVIAR (Si pendiente por el solicitante) */}
            {isPendiente && (
              <button
                onClick={() => {
                  if (window.confirm("¿Confirmar envío de la solicitud de gasto?")) {
                    cambiarEstadoMutation.mutate(1);
                  }
                }}
                disabled={cambiarEstadoMutation.isLoading}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {cambiarEstadoMutation.isLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Enviar Solicitud</span>
              </button>
            )}

            {/* BOTÓN ATENDER (Si está en Atención: estado 0 o 1, y no atendido aún) */}
            {(!isAtendido && !isLiqEnviada && !isAprobado) && (
              <button
                onClick={() => {
                  if (window.confirm("¿Confirmar atención de esta solicitud? Pasará a LIQUIDACIONES para el descargo de comprobantes.")) {
                    cambiarEstadoMutation.mutate(2);
                  }
                }}
                disabled={cambiarEstadoMutation.isLoading}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {cambiarEstadoMutation.isLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Atender Solicitud</span>
              </button>
            )}

            {/* BOTÓN ENVIAR LIQUIDACIÓN (Si está atendido en rendición) */}
            {isAtendido && (
              <button
                onClick={() => {
                  if (comprobantesList.length === 0 && planillaList.length === 0) {
                    if (!window.confirm("Aún no ha adjuntado comprobantes ni planilla de movilidad. ¿Desea enviar la liquidación de todos modos?")) {
                      return;
                    }
                  } else {
                    if (!window.confirm("¿Confirmar el envío de la liquidación para revisión y aprobación contable?")) {
                      return;
                    }
                  }
                  cambiarEstadoMutation.mutate({
                    id_estado: 3,
                    fecha_rendicion: new Date().toISOString().split("T")[0]
                  });
                }}
                disabled={cambiarEstadoMutation.isLoading}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {cambiarEstadoMutation.isLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Enviar Liquidación</span>
              </button>
            )}

            {/* ACCIONES DE APROBACIÓN CONTABLE (Si liquidación fue enviada) */}
            {isLiqEnviada && (
              <div className="flex items-center gap-1.5">
                {/* 1. Aprobar */}
                <button
                  onClick={() => {
                    if (window.confirm("¿Aprobar formalmente esta liquidación de Caja Chica?")) {
                      cambiarEstadoMutation.mutate(4);
                    }
                  }}
                  disabled={cambiarEstadoMutation.isLoading}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Aprobar Liquidación"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aprobar</span>
                </button>

                {/* 2. Reintegrar */}
                <button
                  onClick={() => {
                    const sugerido = saldoCalc < 0 ? Math.abs(saldoCalc).toFixed(2) : "0.00";
                    const val = window.prompt("Ingrese el monto a reintegrar al colaborador (S/.):", sugerido);
                    if (val !== null && !isNaN(val) && parseFloat(val) >= 0) {
                      cambiarEstadoMutation.mutate({
                        id_estado: 4,
                        monto_reintegro: parseFloat(val),
                        reintegro: parseFloat(val)
                      });
                    }
                  }}
                  disabled={cambiarEstadoMutation.isLoading}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Reintegrar monto gastado en exceso y aprobar"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Reintegrar</span>
                </button>

                {/* 3. Devolución */}
                <button
                  onClick={() => {
                    const sugerido = saldoCalc > 0 ? saldoCalc.toFixed(2) : "0.00";
                    const val = window.prompt("Ingrese el monto devuelto a Caja Chica (S/.):", sugerido);
                    if (val !== null && !isNaN(val) && parseFloat(val) >= 0) {
                      cambiarEstadoMutation.mutate({
                        id_estado: 4,
                        monto_devolucion: parseFloat(val),
                        devolucion: parseFloat(val)
                      });
                    }
                  }}
                  disabled={cambiarEstadoMutation.isLoading}
                  className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-sky-600/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Registrar devolución de saldo sobrante a caja y aprobar"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Devolución</span>
                </button>
              </div>
            )}

            {/* Menú Más Acciones */}
            <div className="relative">
              <button
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMoreActions && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-50 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setShowMoreActions(false);
                      if (window.confirm("¿Está seguro de eliminar esta solicitud?")) {
                        eliminarMutation.mutate();
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Solicitud
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* METADATOS COMPACTOS CON FECHAS EN FORMATO DD/MM/YYYY */}
        <div className="px-6 py-3 bg-slate-50/60 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 border-t border-slate-100/80">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-bold text-slate-600 uppercase text-[10px]">Solicitante:</span>
            <span className="font-black text-slate-800">{data.solicitante_nombre || data.nombre || "No Definido"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-bold text-slate-600 uppercase text-[10px]">Destinatario:</span>
            <span className="font-black text-slate-800">{data.destinatario_nombre || "No Definido"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-bold text-slate-600 uppercase text-[10px]">Área:</span>
            <span className="font-black text-slate-800">{data.area_nombre || data.area || "No Definida"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-bold text-slate-600 uppercase text-[10px]">Fecha Creación:</span>
            <span className="font-black text-slate-800">
              {formatDateDMY(data.fecha)} {data.hora ? `| ${data.hora}` : ""}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-bold text-slate-600 uppercase text-[10px]">Moneda & T.C.:</span>
            <span className="font-black text-slate-800">
              {data.tipo_moneda === 'D' ? 'Dólares ($)' : 'Soles (S/.)'} (T.C. {parseFloat(data.tipo_cambio || 3.36).toFixed(3)})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold text-slate-600 uppercase text-[10px]">Código:</span>
            <span className="font-black text-indigo-700">{data.codigo || "S/N"}</span>
          </div>
        </div>
      </div>

      {/* 2. CUERPO PRINCIPAL DIVIDIDO EN 2 COLUMNAS (70% / 30%) */}
      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
        
        {/* COLUMNA PRINCIPAL IZQUIERDA (70%) */}
        <div className="w-full xl:w-8/12 space-y-6">
          
          {/* FILA 1: 1. BENEFICIARIO & 2. TRANSFERENCIA (2 TARJETAS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. BENEFICIARIO Y CUENTA BANCARIA */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    1. Beneficiario / Destinatario
                  </span>
                </div>
              </div>

              {/* Avatar e Información */}
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-sm flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
                  {getInitials(data.destinatario_nombre || data.solicitante_nombre)}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 text-sm uppercase leading-tight truncate">
                    {data.destinatario_nombre || data.solicitante_nombre || "NO REGISTRADO"}
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    DNI: <span className="font-mono font-bold text-slate-700">{data.destinatario_dni || "S/N"}</span>
                  </p>
                </div>
              </div>

              {/* Banco y Número de Cuenta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-wider">
                    <Landmark className="w-3 h-3 text-slate-500" />
                    <span>Banco</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {data.banco_nombre || "No especificado"}
                  </p>
                </div>

                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 space-y-0.5">
                  <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-slate-500" />
                      <span>Cuenta / CCI</span>
                    </div>
                    {data.numero_cuenta && (
                      <button
                        onClick={() => copyToClipboard(data.numero_cuenta)}
                        className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        title="Copiar cuenta"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-800 truncate">
                    {data.numero_cuenta || "Sin cuenta registrada"}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. TRANSFERENCIA Y PRESUPUESTO */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <Coins className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    2. Presupuesto y Transferencia
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  REGISTRO: {directId}
                </span>
              </div>

              {/* Destacado Presupuesto */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                    Monto Asignado
                  </span>
                  <span className="text-xl font-black text-emerald-950 font-mono">
                    {formatMoney(montoPresupuesto, "S/.")}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Equiv. USD</span>
                  <span className="text-sm font-black text-slate-700 font-mono">
                    ${parseFloat(data.monto_dolares || (montoPresupuesto / tc)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Fechas de Transferencia y Límite */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                    Fecha Transferencia
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    {data.fecha_transferencia_corta || formatDateDMY(data.fecha_transferencia) || "Pendiente"}
                  </p>
                </div>

                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                    Límite Liquidación
                  </span>
                  <p className="text-xs font-bold text-indigo-900">
                    {data.fecha_liquidacion_corta || formatDateDMY(data.fecha_liquidacion) || "Sin liquidar"}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* 3. SECCIÓN LIQUIDACIÓN (8 CAMPOS EXACTOS DE SIGECOM 4.0) */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    3. Liquidación de Gasto
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
                    Control de rendición, saldos, reintegros y devoluciones (SIGECOM 4.0)
                  </span>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                isAprobado ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {isAprobado ? "Rendición Aprobada" : "En Proceso de Liquidación"}
              </span>
            </div>

            {/* GRILLA DE 8 MÉTRICAS DEL 4.0 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* 1. FECHA RENDICIÓN */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1 hover:border-indigo-300 transition-colors">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Fecha Rendición</span>
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                {editingField === 'fecha_rendicion' ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="date"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="px-2 py-1 text-xs border border-indigo-500 rounded-lg bg-white w-full font-bold"
                    />
                    <button
                      onClick={() => {
                        guardarLiquidacionMutation.mutate({ fecha_rendicion: editingValue });
                        setEditingField(null);
                      }}
                      className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => {
                      setEditingField('fecha_rendicion');
                      setEditingValue(data.fecha_rendicion ? String(data.fecha_rendicion).split('T')[0] : '');
                    }}
                    className="cursor-pointer group flex items-baseline justify-between"
                    title="Doble clic para editar fecha de rendición"
                  >
                    <span className="text-lg font-black text-slate-800 tracking-tight">
                      {data.fecha_rendicion_corta || formatDateDMY(data.fecha_rendicion) || "S/N"}
                    </span>
                    <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <span className="text-[10px] text-slate-400 block">Fecha de rendición de gastos</span>
              </div>

              {/* 2. MONTO PRESUPUESTO */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1">
                <div className="flex items-center justify-between text-indigo-600">
                  <span className="text-[10px] font-black uppercase tracking-wider">Monto Presupuesto</span>
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <span className="text-xl font-black text-indigo-900 tracking-tight block font-mono">
                  {formatMoney(montoPresupuesto, "S/.")}
                </span>
                <span className="text-[10px] text-indigo-600 font-medium block">
                  Total asignado a solicitud
                </span>
              </div>

              {/* 3. REINTEGRO */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1 hover:border-amber-300 transition-colors">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Reintegro</span>
                  <button
                    onClick={() => {
                      setReintegroInput(reintegroVal !== null && reintegroVal !== undefined ? String(reintegroVal) : "");
                      setShowReintegroModal(true);
                    }}
                    className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer"
                  >
                    Editar
                  </button>
                </div>
                <span className="text-xl font-black text-slate-800 tracking-tight block font-mono">
                  {reintegroVal !== null && reintegroVal !== undefined ? formatMoney(reintegroVal, "S/.") : "—"}
                </span>
                <span className="text-[10px] text-slate-400 block">Monto a favor del solicitante</span>
              </div>

              {/* 4. RECEPCIÓN */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1 hover:border-indigo-300 transition-colors">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Recepción</span>
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                {editingField === 'fecha_recepcion' ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="date"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="px-2 py-1 text-xs border border-indigo-500 rounded-lg bg-white w-full font-bold"
                    />
                    <button
                      onClick={() => {
                        guardarLiquidacionMutation.mutate({ fecha_recepcion: editingValue });
                        setEditingField(null);
                      }}
                      className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => {
                      setEditingField('fecha_recepcion');
                      setEditingValue(data.fecha_recepcion ? String(data.fecha_recepcion).split('T')[0] : '');
                    }}
                    className="cursor-pointer group flex items-baseline justify-between"
                    title="Doble clic para editar fecha de recepción"
                  >
                    <span className="text-lg font-black text-slate-800 tracking-tight">
                      {data.fecha_recepcion_corta || formatDateDMY(data.fecha_recepcion) || "S/N"}
                    </span>
                    <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <span className="text-[10px] text-slate-400 block">Recepción de documentación</span>
              </div>

              {/* 5. TOTAL RENDIDO */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-[10px] font-black uppercase tracking-wider">Total Rendido</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-2xl font-black text-emerald-900 tracking-tight block font-mono">
                  {formatMoney(totalRendidoVal, "S/.")}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block">
                  Comprobantes validados ({comprobantesList.length})
                </span>
              </div>

              {/* 6. SALDO */}
              <div className={`p-4 rounded-2xl border space-y-1 ${
                saldoCalc < 0 
                  ? "bg-rose-50 border-rose-200" 
                  : saldoCalc > 0 
                  ? "bg-amber-50 border-amber-200" 
                  : "bg-slate-50/70 border-slate-200/80"
              }`}>
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] font-black uppercase tracking-wider">Saldo</span>
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <span className={`text-2xl font-black tracking-tight block font-mono ${
                  saldoCalc < 0 ? "text-rose-700" : saldoCalc > 0 ? "text-amber-700" : "text-slate-800"
                }`}>
                  {formatMoney(saldoCalc, "S/.")}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {saldoCalc === 0 ? "Liquidación equilibrada" : saldoCalc > 0 ? "Saldo por devolver" : "Saldo a reintegrar"}
                </span>
              </div>

              {/* 7. DEVOLUCIÓN */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1 hover:border-sky-300 transition-colors">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Devolución</span>
                  <button
                    onClick={() => {
                      setDevolucionInput(devolucionVal !== null && devolucionVal !== undefined ? String(devolucionVal) : "");
                      setShowDevolucionModal(true);
                    }}
                    className="text-[10px] font-bold text-sky-600 hover:underline cursor-pointer"
                  >
                    Editar
                  </button>
                </div>
                <span className="text-xl font-black text-slate-800 tracking-tight block font-mono">
                  {devolucionVal !== null && devolucionVal !== undefined ? formatMoney(devolucionVal, "S/.") : "—"}
                </span>
                <span className="text-[10px] text-slate-400 block">Monto devuelto a caja</span>
              </div>

              {/* 8. DEVOL.(IGV) */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Devol.(IGV)</span>
                  <Coins className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-xl font-black text-slate-800 tracking-tight block font-mono">
                  {formatMoney(data.devolucion_igv || 0, "S/.")}
                </span>
                <span className="text-[10px] text-slate-400 block">Ajuste IGV liquidado</span>
              </div>

            </div>
          </div>

          {/* 4. SECCIÓN TABLA DETALLE DE COMPROBANTES RENDIDOS */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-200/70 text-teal-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      4. Detalle de Comprobantes Rendidos
                    </span>
                    <span className="text-[10px] font-black text-slate-700 bg-slate-200/90 border border-slate-300/80 px-2.5 py-0.5 rounded-full select-none">
                      {comprobantesList.length} {comprobantesList.length === 1 ? "Ítem" : "Ítems"}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                    Facturas, boletas, planillas de movilidad y recibos sustentatorios
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddDocModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Comprobante</span>
                </button>
              </div>
            </div>

            {/* TABLA DE COMPROBANTES */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/90 text-slate-900 font-black uppercase tracking-wider text-[10px] border-b-2 border-slate-300 select-none">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-24">Fecha</th>
                    <th className="py-2.5 px-3 text-center w-36">Documento</th>
                    <th className="py-2.5 px-3 text-center w-52">Proveedor / RUC</th>
                    <th className="py-2.5 px-3 text-center">Detalle / Concepto</th>
                    <th className="py-2.5 px-3 text-center w-28">Importe</th>
                    <th className="py-2.5 px-3 text-center w-28">IGV</th>
                    <th className="py-2.5 px-3 text-center w-28">Total</th>
                    <th className="py-2.5 px-3 text-center w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-[11px]">
                  {comprobantesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                        <p className="font-bold text-slate-600">No hay comprobantes registrados aún.</p>
                        <p className="text-[11px] text-slate-400">
                          Haga clic en "+ Agregar Comprobante" para registrar gastos o adjuntar planilla de movilidad.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    comprobantesList.map((item, idx) => {
                      const calc = calculateRowIgv(item.importe, item.igv);
                      const docInfo = formatComprobanteDoc(item);
                      return (
                        <tr key={item.id_comprobante || item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          {/* Fecha */}
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-600 text-center whitespace-nowrap">
                            {item.fecha ? formatDateDMY(item.fecha) : "—"}
                          </td>

                          {/* Documento */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex flex-col items-center justify-center leading-none">
                              <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider">
                                {docInfo.tipo}
                              </span>
                              <span className="font-mono font-black text-xs text-teal-700 bg-teal-50/80 border border-teal-200/60 px-2 py-0.5 rounded-md mt-1 tracking-tight">
                                {docInfo.numero}
                              </span>
                            </div>
                          </td>

                          {/* Proveedor / RUC */}
                          <td className="py-2.5 px-3 text-left">
                            {item.proveedor || item.razon_social ? (
                              <div className="flex flex-col">
                                <span className="font-black text-slate-900 leading-snug uppercase">
                                  {item.proveedor || item.razon_social}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">
                                  {item.ruc ? `RUC: ${item.ruc}` : "Sin RUC"}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-400 italic">Sin Proveedor</span>
                                <span className="text-[10px] text-slate-400 font-mono">Sin RUC</span>
                              </div>
                            )}
                          </td>

                          {/* Detalle / Concepto */}
                          <td className="py-2.5 px-3 text-left">
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-800 leading-snug uppercase">
                                {item.detalle || "—"}
                              </span>
                              {item.concepto && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9.5px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200/80">
                                    {item.concepto}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Importe (Base) */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {formatMoney(calc.base, "S/.")}
                          </td>

                          {/* IGV: Si es 0% -> INAFECTO */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end justify-center leading-none">
                              {calc.percent > 0 ? (
                                <span className="text-[10px] font-mono font-black text-teal-700 bg-teal-50 border border-teal-200/80 px-1.5 py-0.5 rounded">
                                  {calc.percent}%
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-mono font-black text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded tracking-wider uppercase">
                                  INAFECTO
                                </span>
                              )}
                              <span className="font-mono font-semibold text-xs text-slate-600 mt-1">
                                {formatMoney(calc.montoIgv, "S/.")}
                              </span>
                            </div>
                          </td>

                          {/* Total */}
                          <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono whitespace-nowrap text-xs">
                            {formatMoney(calc.total, "S/.")}
                          </td>

                          {/* Acciones */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => {
                                const ident = idx + 1;
                                if (window.confirm(`¿Eliminar comprobante #${ident}?`)) {
                                  eliminarComprobanteMutation.mutate(item.id_comprobante || item.id || item.orden || item.num);
                                }
                              }}
                              disabled={eliminarComprobanteMutation.isLoading}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Eliminar comprobante"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 bg-slate-50/90 font-black text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right uppercase text-xs tracking-wider font-black">
                      TOTALES:
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-mono font-black text-slate-800 whitespace-nowrap">
                      {formatMoney(totalsComprobantes.sumBase, "S/.")}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-mono font-black text-slate-800 whitespace-nowrap">
                      {formatMoney(totalsComprobantes.sumIgv, "S/.")}
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-mono text-teal-700 font-black whitespace-nowrap">
                      {formatMoney(totalRendidoVal, "S/.")}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 5. SECCIÓN TABLA FIJA DETALLE DE PLANILLA DE MOVILIDAD */}
          <div id="seccion-planilla-movilidad" className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-50 border border-purple-200/70 text-purple-700">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      5. Detalle de Planilla de Movilidad
                    </span>
                    <span className="text-[10px] font-black text-purple-800 bg-purple-100 border border-purple-200/80 px-2.5 py-0.5 rounded-full select-none">
                      {planillaList.length} {planillaList.length === 1 ? "Ítem" : "Ítems"}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                    Registro y control de gastos de movilidad local, rutas y traslados (SIGECOM 4.0)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingMovilidadRow(null);
                    setNewMovilidadForm({
                      id_planilla: null,
                      orden: null,
                      num: null,
                      fecha: new Date().toISOString().split("T")[0],
                      motivo: "MOVILIDAD",
                      destino: "",
                      id_trabajador: data?.id_destinatario?.id_usuario || data?.id_destinatario || "",
                      persona: data?.destinatario_nombre || data?.solicitante_nombre || "",
                      monto: ""
                    });
                    setShowAddMovilidadModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Traslado</span>
                </button>
              </div>
            </div>

            {/* TABLA DE PLANILLA DE MOVILIDAD */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/90 text-slate-900 font-black uppercase tracking-wider text-[10px] border-b-2 border-slate-300 select-none">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-28">Fecha</th>
                    <th className="py-2.5 px-3 text-center w-36">Motivo</th>
                    <th className="py-2.5 px-3 text-center">Destino / Ruta</th>
                    <th className="py-2.5 px-3 text-center w-64">Trabajador / Persona</th>
                    <th className="py-2.5 px-3 text-center w-32">Gasto (S/.)</th>
                    <th className="py-2.5 px-3 text-center w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-[11px]">
                  {planillaList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Car className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-400" />
                        <p className="font-bold text-slate-600">No hay registros de movilidad en esta solicitud.</p>
                        <p className="text-[11px] text-slate-400">
                          Haga clic en "+ Agregar Traslado" para ingresar traslados urbanos de movilidad.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    planillaList.map((item, idx) => (
                      <tr key={item.id_planilla ?? item.id ?? item.orden ?? item.num ?? idx} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-600 text-center whitespace-nowrap">
                          {item.fecha ? formatDateDMY(item.fecha) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 font-black text-[10px] uppercase tracking-wider">
                            {item.motivo || "MOVILIDAD"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-left font-black text-slate-800 uppercase">
                          {item.destino || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-left">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold">{item.trabajador || item.persona || "—"}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-purple-900 font-mono text-xs whitespace-nowrap">
                          {formatMoney(item.monto, "S/.")}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditingMovilidadRow({ ...item, displayNum: idx + 1 });
                                setNewMovilidadForm({
                                  id_planilla: item.id_planilla || null,
                                  orden: item.orden ?? item.num ?? idx + 1,
                                  num: idx + 1,
                                  fecha: item.fecha ? String(item.fecha).split('T')[0] : new Date().toISOString().split("T")[0],
                                  motivo: item.motivo || "MOVILIDAD",
                                  destino: item.destino || "",
                                  id_trabajador: item.id_trabajador || "",
                                  persona: item.trabajador || item.persona || "",
                                  monto: item.monto !== null && item.monto !== undefined ? String(item.monto) : ""
                                });
                                setShowAddMovilidadModal(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Editar traslado"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                const ord = idx + 1;
                                if (window.confirm(`¿Eliminar traslado #${ord} (${item.destino || 'Sin destino'})?`)) {
                                  eliminarMovilidadMutation.mutate({ id_planilla: item.id_planilla, orden: item.orden ?? item.num });
                                }
                              }}
                              disabled={eliminarMovilidadMutation.isLoading}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar traslado"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 bg-slate-50/90 font-black text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right uppercase text-xs tracking-wider font-black">
                      TOTAL PLANILLA MOVILIDAD:
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-mono text-purple-700 font-black whitespace-nowrap">
                      {formatMoney(planillaList.reduce((acc, r) => acc + (parseFloat(r.monto) || 0), 0), "S/.")}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>



        </div>

        {/* COLUMNA LATERAL DERECHA (30%) */}
        <div className="w-full xl:w-4/12 space-y-6">
          
          {/* ASISTENTE IA (SIGECOM AI) */}
          <div className="bg-[#F8F7FF] rounded-3xl p-5 shadow-sm border border-[#EBE6FF] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9E3FF] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-950 block">
                    ASISTENTE IA
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight block -mt-0.5">
                    Resumen de Liquidación
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full uppercase border border-emerald-200">
                SIGECOM AI
              </span>
            </div>

            <div className="bg-white/80 p-3.5 rounded-2xl border border-[#E0D7FF] space-y-2 text-xs">
              <p className="font-bold text-slate-800 leading-snug">
                {comprobantesList.length > 0 
                  ? `Liquidación con ${comprobantesList.length} comprobante(s) registrado(s) por un total de ${formatMoney(totalRendidoVal, "S/.")}.` 
                  : "Aún no se han agregado comprobantes de gasto para esta liquidación."}
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {saldoCalc === 0 
                  ? "El monto rendido coincide exactamente con el presupuesto asignado." 
                  : saldoCalc > 0 
                  ? `Existe un saldo favorable a caja de ${formatMoney(saldoCalc, "S/.")} pendiente de devolución.` 
                  : `Se ha generado un exceso de gasto de ${formatMoney(Math.abs(saldoCalc), "S/.")} que requiere reintegro al solicitante.`}
              </p>
            </div>
          </div>

          {/* DISTRIBUCIÓN Y RESUMEN ECONÓMICO */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Resumen Económico
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
                    Ejecución del Presupuesto
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-600 uppercase">Ejecución Rendición:</span>
                  <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 font-mono">
                    {percentEjecutado}%
                  </span>
                </div>
                <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentEjecutado}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">Total Asignado (S/.):</span>
                  <span className="font-black text-slate-900 font-mono">{formatMoney(montoPEN, "S/.")}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">Total Rendido:</span>
                  <span className="font-black text-emerald-700 font-mono">{formatMoney(totalRendidoVal, "S/.")}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">Tipo de Cambio:</span>
                  <span className="font-mono font-bold text-slate-700">S/. {tc.toFixed(4)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Saldo Final:</span>
                  <span className={`text-base font-black font-mono ${saldoCalc < 0 ? "text-rose-700" : saldoCalc > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {formatMoney(saldoCalc, "S/.")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BITÁCORA DE ESTADOS */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Bitácora de Estados
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Paso 1: Creado */}
              <div className="flex items-start gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-800">Solicitud Creada</p>
                  <p className="text-[10px] text-slate-400 font-mono">{formatDateDMY(data.fecha)} {data.hora}</p>
                </div>
              </div>

              {/* Paso 2: Enviado */}
              {isEnviado && (
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Enviado para Atención</p>
                    <p className="text-[10px] text-slate-400">Por {data.solicitante_nombre || data.nombre || "Solicitante"}</p>
                  </div>
                </div>
              )}

              {/* Paso 3: Atendido */}
              {isAtendido && (
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Atendido / Transferido</p>
                    <p className="text-[10px] text-slate-400 font-mono">{data.fecha_transferencia_corta || formatDateDMY(data.fecha_transferencia) || "Transferencia confirmada"}</p>
                  </div>
                </div>
              )}

              {/* Paso 4: Liquidación Rendida */}
              {(isLiqEnviada || isAprobado) && (
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    4
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Liquidación Rendida</p>
                    <p className="text-[10px] text-slate-400 font-mono">{data.fecha_rendicion_corta || formatDateDMY(data.fecha_rendicion) || "Comprobantes registrados"}</p>
                  </div>
                </div>
              )}

              {/* Paso 5: Liquidación Aprobada */}
              {isAprobado && (
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800 font-black">Liquidación Aprobada</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Validada y cerrada</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* MODAL 1: PLANILLA DE MOVILIDAD */}
      {/* ============================================================ */}
      {showPlanillaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-4 md:p-5 bg-gradient-to-r from-purple-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-purple-300" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Planilla de Movilidad - Solicitud #{directId}
                </h3>
              </div>
              <button
                onClick={() => setShowPlanillaModal(false)}
                className="p-1 rounded-xl hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between text-xs bg-purple-50 p-3 rounded-2xl border border-purple-100">
                <span className="font-bold text-purple-900">
                  Beneficiario: {data.destinatario_nombre || data.solicitante_nombre || "S/N"}
                </span>
                <span className="font-bold text-purple-900 font-mono">
                  Total Traslados: {planillaList.length}
                </span>
              </div>

              {planillaList.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <Car className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="font-bold text-sm">No hay registros de traslados en la planilla.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Nro.</th>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Motivo</th>
                        <th className="py-2.5 px-3">Destino / Ruta</th>
                        <th className="py-2.5 px-3">Persona</th>
                        <th className="py-2.5 px-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {planillaList.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{formatDateDMY(row.fecha)}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{row.motivo || "TRASLADO"}</td>
                          <td className="py-2.5 px-3 text-slate-600">{row.destino || "—"}</td>
                          <td className="py-2.5 px-3 text-slate-500">{row.persona || "—"}</td>
                          <td className="py-2.5 px-3 text-right font-black font-mono text-indigo-700">
                            {formatMoney(row.monto, "S/.")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50 font-black text-slate-900">
                        <td colSpan={5} className="py-3 px-3 text-right uppercase text-[11px]">Total Planilla:</td>
                        <td className="py-3 px-3 text-right text-xs font-mono text-purple-700">
                          {formatMoney(planillaList.reduce((acc, r) => acc + (parseFloat(r.monto) || 0), 0), "S/.")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowPlanillaModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: AGREGAR COMPROBANTE CON ESCÁNER INTELIGENTE QR SUNAT Y CONSULTA RUC */}
      {/* ============================================================ */}
      <ModalAgregarComprobante
        isOpen={showAddDocModal}
        onClose={() => setShowAddDocModal(false)}
        onSave={(payload) => {
          const { archivoAdjunto, ...dataToSend } = payload;
          guardarComprobanteMutation.mutate(dataToSend);
        }}
        isLoadingSave={guardarComprobanteMutation.isLoading}
        realId={realId}
      />

      {/* ============================================================ */}
      {/* MODAL 3: REGISTRAR REINTEGRO */}
      {/* ============================================================ */}
      {showReintegroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider">
                Registrar Reintegro (S/.)
              </h3>
              <button onClick={() => setShowReintegroModal(false)} className="p-1 text-white/70 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                guardarLiquidacionMutation.mutate({ 
                  reintegro: reintegroInput || null,
                  monto_reintegro: reintegroInput || null
                });
                setShowReintegroModal(false);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Monto Reintegro (S/.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  placeholder="0.00"
                  value={reintegroInput}
                  onChange={(e) => setReintegroInput(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-amber-400 rounded-xl text-lg font-black text-slate-900 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReintegroModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer"
                >
                  Guardar Reintegro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: REGISTRAR DEVOLUCIÓN */}
      {/* ============================================================ */}
      {showDevolucionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-gradient-to-r from-sky-600 to-sky-700 text-white flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider">
                Registrar Devolución (S/.)
              </h3>
              <button onClick={() => setShowDevolucionModal(false)} className="p-1 text-white/70 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                guardarLiquidacionMutation.mutate({ 
                  devolucion: devolucionInput || null,
                  monto_devolucion: devolucionInput || null
                });
                setShowDevolucionModal(false);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Monto Devolución (S/.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  placeholder="0.00"
                  value={devolucionInput}
                  onChange={(e) => setDevolucionInput(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-sky-400 rounded-xl text-lg font-black text-slate-900 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDevolucionModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-sky-600 text-white rounded-lg hover:bg-sky-700 cursor-pointer"
                >
                  Guardar Devolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: AGREGAR / EDITAR TRASLADO DE PLANILLA DE MOVILIDAD */}
      {/* ============================================================ */}
      {showAddMovilidadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-4 md:p-5 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  {editingMovilidadRow ? `Editar Traslado #${editingMovilidadRow.displayNum || editingMovilidadRow.num || 1}` : "Agregar Traslado a Planilla de Movilidad"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddMovilidadModal(false);
                  setEditingMovilidadRow(null);
                }}
                className="p-1 rounded-xl hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newMovilidadForm.monto || parseFloat(newMovilidadForm.monto) <= 0) {
                  toast.error("Ingrese un importe o gasto válido");
                  return;
                }
                guardarMovilidadMutation.mutate(newMovilidadForm);
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={newMovilidadForm.fecha}
                    onChange={(e) => setNewMovilidadForm({ ...newMovilidadForm, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Motivo
                  </label>
                  <input
                    type="text"
                    required
                    value={newMovilidadForm.motivo}
                    onChange={(e) => setNewMovilidadForm({ ...newMovilidadForm, motivo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold"
                    placeholder="MOVILIDAD"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Destino / Ruta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: TALLER - PARURO"
                  value={newMovilidadForm.destino}
                  onChange={(e) => setNewMovilidadForm({ ...newMovilidadForm, destino: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Trabajador Responsable
                </label>
                <select
                  value={newMovilidadForm.id_trabajador || ""}
                  onChange={(e) => {
                    const uId = e.target.value;
                    const uObj = usuarios.find(u => String(u.id_usuario) === String(uId));
                    setNewMovilidadForm({
                      ...newMovilidadForm,
                      id_trabajador: uId,
                      persona: uObj ? (uObj.nombre_completo || `${uObj.first_name} ${uObj.last_name}`.trim() || uObj.username) : newMovilidadForm.persona
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium mb-1.5"
                >
                  <option value="">-- Seleccionar Trabajador Registrado --</option>
                  {usuarios.map((u) => {
                    const nom = u.nombre_completo || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
                    return (
                      <option key={u.id_usuario} value={u.id_usuario}>
                        {nom}
                      </option>
                    );
                  })}
                </select>
                <input
                  type="text"
                  placeholder="O ingrese nombre si no está en la lista"
                  value={newMovilidadForm.persona}
                  onChange={(e) => setNewMovilidadForm({ ...newMovilidadForm, persona: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-medium text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Gasto / Importe (S/.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={newMovilidadForm.monto}
                  onChange={(e) => setNewMovilidadForm({ ...newMovilidadForm, monto: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-purple-400 rounded-xl text-sm font-black text-slate-900 font-mono"
                />
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMovilidadModal(false);
                    setEditingMovilidadRow(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardarMovilidadMutation.isLoading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {guardarMovilidadMutation.isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingMovilidadRow ? "Actualizar Traslado" : "Guardar Traslado"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

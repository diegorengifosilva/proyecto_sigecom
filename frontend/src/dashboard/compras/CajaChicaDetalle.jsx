import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
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
  Trash2
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";

// Helper para formatear fechas a DD/MM/YYYY y HH:mm
const formatDateDMY = (dateStr, includeTime = false) => {
  if (!dateStr) return "S/N";
  try {
    const parts = String(dateStr).split("T");
    const datePart = parts[0];
    const [y, m, d] = datePart.split("-");
    if (!y || !m || !d) return String(dateStr);
    
    let formatted = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    if (includeTime && parts[1]) {
      const timePart = parts[1].substring(0, 5);
      formatted += ` ${timePart}`;
    }
    return formatted;
  } catch {
    return String(dateStr);
  }
};

export default function CajaChicaDetalle({ idCajaChica }) {
  const navigate = useNavigate();
  const { id, id_caja_chica, nro_solicitud } = useParams();
  const queryClient = useQueryClient();
  const { setCustomBreadcrumbs } = useOutletContext() || {};

  const realId = idCajaChica || id_caja_chica || nro_solicitud || id;

  // Estado para edición inline de campos
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [, setCopied] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Listas de datos para selects
  const [usuarios, setUsuarios] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [tiposSolicitud, setTiposSolicitud] = useState([]);

  useEffect(() => {
    const fetchAux = async () => {
      try {
        const [resUsers, resBancos, resTipos] = await Promise.allSettled([
          api.get("/users/usuarios-activos/"),
          api.get("/users/bancos/"),
          api.get("/core/tipo_solicitud/"),
        ]);
        if (resUsers.status === "fulfilled" && Array.isArray(resUsers.value.data)) {
          setUsuarios(resUsers.value.data);
        }
        if (resBancos.status === "fulfilled" && Array.isArray(resBancos.value.data)) {
          setBancos(resBancos.value.data);
        }
        if (resTipos.status === "fulfilled" && Array.isArray(resTipos.value.data)) {
          setTiposSolicitud(resTipos.value.data);
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
    staleTime: 1000 * 30,
  });

  // Breadcrumbs
  useEffect(() => {
    if (setCustomBreadcrumbs && data) {
      const directId = data.id_registro_numero || (data.id_registro && String(data.id_registro).includes('_') ? data.id_registro.split('_')[1] : data.id_registro);
      setCustomBreadcrumbs([
        { label: "Compras", path: "/compras" },
        ...(data.id_apertura ? [{ label: `Programación #${data.id_apertura}`, path: `/compras/programacion/${data.id_apertura}` }] : []),
        { label: `Solicitud de Gasto #${directId}`, path: `/caja-chica/solicitudes/${directId}` }
      ]);
    }
  }, [setCustomBreadcrumbs, data]);

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
      queryClient.invalidateQueries(["programacionDetalle"]);
      toast.success("Campo actualizado correctamente");
      setEditingField(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al actualizar el campo");
    }
  });

  // MUTATION PARA CAMBIO DE ESTADO
  const cambiarEstadoMutation = useMutation({
    mutationFn: async (nuevoEstadoId) => {
      const res = await api.post(`/caja_chica/solicitudes_caja_chica/${realId}/cambiar_estado/`, {
        id_estado: nuevoEstadoId
      });
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Estado actualizado con éxito");
      queryClient.invalidateQueries(["cajaChicaDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
      queryClient.invalidateQueries(["listaLiquidaciones"]);
      queryClient.invalidateQueries(["compras-programacion"]);
      queryClient.invalidateQueries(["programacionDetalle"]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al cambiar el estado");
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
      const aperturaId = resData?.id_apertura || data?.id_apertura;
      queryClient.invalidateQueries(["cajaChicaDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
      queryClient.invalidateQueries(["listaLiquidaciones"]);
      queryClient.invalidateQueries(["compras-programacion"]);
      queryClient.invalidateQueries(["programacionDetalle"]);
      if (aperturaId) {
        navigate(`/compras/programacion/${aperturaId}`);
      } else {
        navigate("/compras/programacion");
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al eliminar solicitud.");
    }
  });

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

    if (field === 'monto_soles' || field === 'monto_dolares') {
      const tc = parseFloat(data?.tipo_cambio || 3.75) || 3.75;
      const maxUSD = Number(data?.presupuesto_info?.disponible_maximo);
      if (!isNaN(maxUSD) && maxUSD >= 0) {
        const maxPEN = maxUSD * tc;
        if (field === 'monto_soles') {
          const numVal = parseFloat(value) || 0;
          if (numVal > maxPEN + 0.009) {
            toast.warning(`El monto ingresado (S/ ${numVal.toFixed(2)}) excede el saldo disponible (S/ ${maxPEN.toFixed(2)} / $${maxUSD.toFixed(2)}). Se ajustó al máximo permitido.`);
            value = maxPEN.toFixed(2);
          }
        } else if (field === 'monto_dolares') {
          const numVal = parseFloat(value) || 0;
          if (numVal > maxUSD + 0.009) {
            toast.warning(`El monto ingresado ($${numVal.toFixed(2)}) excede el saldo disponible ($${maxUSD.toFixed(2)}). Se ajustó al máximo permitido.`);
            value = maxUSD.toFixed(2);
          }
        }
      }
    }

    updateFieldMutation.mutate({ field, value });
  };

  const handleCancelEditing = () => {
    setEditingField(null);
    setEditingValue("");
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.info("Número de cuenta copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  // Avatar con iniciales
  const getInitials = (name) => {
    if (!name) return "CC";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader className="w-10 h-10 text-purple-600 animate-spin" />
        <span className="text-slate-500 font-bold text-sm tracking-wide">
          Cargando detalle de la solicitud de gasto...
        </span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800">No se pudo cargar la solicitud</h2>
        <p className="text-sm text-slate-500 max-w-md">
          {error?.response?.data?.error || error?.message || "La solicitud no existe o fue eliminada."}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
        >
          Volver Atrás
        </button>
      </div>
    );
  }

  const directId = data.id_registro_numero || (data.id_registro && String(data.id_registro).includes('_') ? data.id_registro.split('_')[1] : data.id_registro);

  // Estados
  const estadoId = Number(data?.id_estado?.id_estado ?? data?.id_estado ?? 99);
  const estadoStr = String(data?.estado_nombre || "").toUpperCase();
  const isPendiente = estadoId === 0 || (estadoStr.includes("PENDIENTE") && !estadoStr.includes("ATENCIÓN") && !estadoStr.includes("ATENCION"));
  const isEnviado = estadoId === 1 || estadoStr.includes("ENVIADO") || estadoStr.includes("ATENCIÓN") || estadoStr.includes("ATENCION");
  const isAtendido = estadoId === 2 || estadoStr.includes("ATENDIDO");
  const isAprobado = estadoId === 4 || estadoStr.includes("APROBADA") || estadoStr.includes("APROBADO");

  const getStatusBadge = () => {
    const statusStr = String(data?.estado_nombre || "Pendiente").toLowerCase();
    
    let colorClasses = "bg-slate-50 text-slate-700 border-slate-200";
    if (statusStr.includes("envio") || statusStr.includes("envío")) {
      colorClasses = "bg-red-50 text-red-700 border-red-200/50";
    } else if (statusStr.includes("atencion") || statusStr.includes("atención")) {
      colorClasses = "bg-amber-50 text-amber-700 border-amber-200/50";
    } else if (statusStr.includes("pendiente de liquidacion") || statusStr.includes("pendiente de liquidación") || statusStr.includes("atendido")) {
      colorClasses = "bg-sky-50 text-sky-700 border-sky-200/50";
    } else if (statusStr.includes("enviada")) {
      colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
    } else if (statusStr.includes("aprobada")) {
      colorClasses = "bg-zinc-900 text-zinc-50 border-zinc-950";
    } else if (statusStr.includes("anulado")) {
      colorClasses = "bg-gray-100 text-gray-600 border-gray-300/50";
    }

    return {
      bg: colorClasses,
      label: data?.estado_nombre || "Pendiente"
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1920px] mx-auto animate-in fade-in duration-500 font-sans pb-12">
      
      {/* ENCABEZADO EJECUTIVO Y BARRA DE ACCIONES */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* IDENTIFICACIÓN Y TÍTULO */}
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate(data.id_apertura ? `/compras/programacion/${data.id_apertura}` : "/caja-chica")}
              className="p-2.5 bg-slate-50 hover:bg-purple-50 rounded-2xl text-slate-400 hover:text-purple-600 border border-slate-200/60 transition-all group shrink-0"
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
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                  {data.tipo_solicitud_nombre || "Planilla de Movilidad"}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200/80 font-mono">
                  SOLICITUD DE GASTO
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-slate-500">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50/70 border border-indigo-100 text-indigo-700 font-black text-[10px] uppercase tracking-wider">
                  CÓDIGO: {data.codigo || "S/N"}
                </span>
                <span>•</span>
                <span className="font-semibold text-slate-600">
                  Área: {data.area_nombre || data.area || "General"}
                </span>
                <span>•</span>
                <span>Fecha: {data.fecha_corta || formatDateDMY(data.fecha)} {data.hora ? `(${data.hora})` : ''}</span>
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN SUPERIORES */}
          <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center">
            {/* Imprimir */}
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Imprimir
            </button>

            {/* SI ESTÁ EN PENDIENTE DE ENVÍO: BOTÓN ENVIAR SOLICITUD */}
            {isPendiente && (
              <button
                onClick={() => {
                  if (window.confirm("¿Confirmar envío de la solicitud de gasto a aprobación/atención? Al enviarla, los campos quedarán bloqueados para edición.")) {
                    cambiarEstadoMutation.mutate(1); // 1 = Enviado / Pendiente Atención
                  }
                }}
                disabled={cambiarEstadoMutation.isLoading}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {cambiarEstadoMutation.isLoading ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Enviar Solicitud</span>
              </button>
            )}

            {/* SI ESTÁ ENVIADO: BOTÓN REVERTIR PARA EDICIÓN */}
            {(isEnviado || estadoId === 1) && !isAtendido && (
              <button
                onClick={() => {
                  if (window.confirm("¿Confirmar retornar solicitud al estado PENDIENTE DE ENVÍO para realizar modificaciones?")) {
                    cambiarEstadoMutation.mutate(0); // 0 = Pendiente de Envio
                  }
                }}
                disabled={cambiarEstadoMutation.isLoading}
                className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-800 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revertir para Edición</span>
              </button>
            )}

            {/* SI ESTÁ ENVIADO O PENDIENTE DE ATENCIÓN: BOTÓN ATENDER */}
            {(isEnviado || estadoId === 1) && !isAtendido && (
              <button
                onClick={() => {
                  if (window.confirm("¿Confirmar que esta solicitud de caja chica ha sido atendida? Pasará al estado ATENDIDO, PENDIENTE DE LIQUIDACIÓN.")) {
                    cambiarEstadoMutation.mutate(2); // 2 = Atendido, Pendiente de Liquidacion
                  }
                }}
                disabled={cambiarEstadoMutation.isLoading}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {cambiarEstadoMutation.isLoading ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Atender</span>
              </button>
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
                      if (window.confirm("¿Está seguro de eliminar esta solicitud de caja chica? Esta acción no se puede deshacer.")) {
                        eliminarMutation.mutate();
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CUERPO PRINCIPAL DIVIDIDO EN 2 COLUMNAS (70% / 30%) */}
      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
        
        {/* COLUMNA PRINCIPAL IZQUIERDA (70%) */}
        <div className="w-full xl:w-8/12 space-y-6">
          
          {/* FILA 1: DESTINATARIO & DATOS BANCARIOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. BENEFICIARIO / DESTINATARIO */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    1. Destinatario / Beneficiario
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-sm flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
                  {getInitials(data.destinatario_nombre || data.nombre)}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  {editingField === 'id_destinatario' ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-purple-500 rounded-lg bg-white"
                      >
                        <option value="">-- Seleccionar Usuario --</option>
                        {usuarios.map(u => (
                          <option key={u.id_usuario || u.id} value={u.id_usuario || u.id}>
                            {u.nombre_completo || u.usuario}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => handleSaveField('id_destinatario')} className="p-1 bg-emerald-500 text-white rounded-md">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={handleCancelEditing} className="p-1 bg-slate-200 text-slate-600 rounded-md">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDoubleClick={() => handleStartEditing('id_destinatario', data.id_destinatario)}
                      className="cursor-pointer group"
                      title="Doble clic para cambiar destinatario"
                    >
                      <h4 className="font-black text-slate-900 text-sm truncate flex items-center gap-1.5">
                        {data.destinatario_nombre || data.nombre || "No especificado"}
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        DNI: {data.destinatario_dni || "S/N"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Tipo de Solicitud:</span>
                {editingField === 'tipo_solicitud' ? (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={editingValue}
                      onChange={(e) => setEditingValue(Number(e.target.value))}
                      className="px-2 py-0.5 text-xs border border-purple-500 rounded-md bg-white"
                    >
                      {(tiposSolicitud.length > 0 ? tiposSolicitud : [
                        { id_tipo: 4, nombre: "Planilla de Movilidad" },
                        { id_tipo: 1, nombre: "Otros" },
                        { id_tipo: 2, nombre: "Movilidad" },
                        { id_tipo: 3, nombre: "Traslado" },
                      ]).map((t) => (
                        <option key={t.id_tipo} value={t.id_tipo}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => handleSaveField('tipo_solicitud')} className="p-1 bg-emerald-500 text-white rounded-md cursor-pointer">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={handleCancelEditing} className="p-1 bg-slate-200 text-slate-600 rounded-md cursor-pointer">
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span
                    onDoubleClick={() => handleStartEditing('tipo_solicitud', data.tipo_solicitud || 4)}
                    className="font-bold text-purple-700 cursor-pointer hover:underline"
                    title="Doble clic para editar modalidad"
                  >
                    {data.tipo_solicitud_nombre || "Planilla de Movilidad"}
                  </span>
                )}
              </div>
            </div>

            {/* 2. DATOS BANCARIOS */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    2. Cuenta y Banco de Abono
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                    Entidad Bancaria
                  </label>
                  {editingField === 'id_banco' ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-indigo-500 rounded-lg bg-white"
                      >
                        <option value="">-- Seleccionar Banco --</option>
                        {bancos.map(b => (
                          <option key={b.id_banco} value={b.id_banco}>
                            {b.nombre}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => handleSaveField('id_banco')} className="p-1 bg-emerald-500 text-white rounded-md">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={handleCancelEditing} className="p-1 bg-slate-200 text-slate-600 rounded-md">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDoubleClick={() => handleStartEditing('id_banco', data.id_banco)}
                      className="cursor-pointer group flex items-center justify-between"
                      title="Doble clic para cambiar banco"
                    >
                      <span className="font-bold text-slate-800 text-sm">
                        {data.banco_nombre || "-- Seleccionar Banco --"}
                      </span>
                      <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                    Número de Cuenta / CCI
                  </label>
                  {editingField === 'numero_cuenta' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-indigo-500 rounded-lg"
                      />
                      <button onClick={() => handleSaveField('numero_cuenta')} className="p-1 bg-emerald-500 text-white rounded-md">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={handleCancelEditing} className="p-1 bg-slate-200 text-slate-600 rounded-md">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDoubleClick={() => handleStartEditing('numero_cuenta', data.numero_cuenta)}
                      className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 cursor-pointer group"
                      title="Doble clic para editar número de cuenta"
                    >
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {data.numero_cuenta || "Sin número registrado"}
                      </span>
                      {data.numero_cuenta && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(data.numero_cuenta);
                          }}
                          className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
                          title="Copiar cuenta"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FILA 2: FECHAS Y CONTROL DE LIQUIDACIÓN */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  3. Cronología y Plazos de Rendición
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fecha Solicitud */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Fecha Registro
                </span>
                <span className="font-bold text-slate-800 text-sm block">
                  {data.fecha_corta || formatDateDMY(data.fecha)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Hora: {data.hora || "08:00 AM"}
                </span>
              </div>

              {/* Fecha Transferencia */}
              <div className="p-3.5 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">
                  Fecha Transferencia
                </span>
                {editingField === 'fecha_transferencia' ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="px-2 py-1 text-xs border border-purple-500 rounded-md bg-white w-full"
                    />
                    <button onClick={() => handleSaveField('fecha_transferencia')} className="p-1 bg-emerald-500 text-white rounded-md">
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span
                    onDoubleClick={() => handleStartEditing('fecha_transferencia', data.fecha_transferencia ? data.fecha_transferencia.split('T')[0] : '')}
                    className="font-bold text-purple-900 text-sm block cursor-pointer hover:underline"
                    title="Doble clic para editar fecha de transferencia"
                  >
                    {data.fecha_transferencia_corta || formatDateDMY(data.fecha_transferencia) || "Pendiente"}
                  </span>
                )}
                <span className="text-[10px] text-purple-500 font-medium">
                  Abono en cuenta bancaria
                </span>
              </div>

              {/* Fecha Liquidación */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                  Fecha Liquidación
                </span>
                {editingField === 'fecha_liquidacion' ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="px-2 py-1 text-xs border border-indigo-500 rounded-md bg-white w-full"
                    />
                    <button onClick={() => handleSaveField('fecha_liquidacion')} className="p-1 bg-emerald-500 text-white rounded-md">
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span
                    onDoubleClick={() => handleStartEditing('fecha_liquidacion', data.fecha_liquidacion ? data.fecha_liquidacion.split('T')[0] : '')}
                    className="font-bold text-indigo-900 text-sm block cursor-pointer hover:underline"
                    title="Doble clic para editar fecha de liquidación"
                  >
                    {data.fecha_liquidacion_corta || formatDateDMY(data.fecha_liquidacion) || "Sin liquidar"}
                  </span>
                )}
                <span className="text-[10px] text-indigo-500 font-medium">
                  Límite de rendición de cuentas
                </span>
              </div>
            </div>
          </div>

          {/* FILA 3: CONCEPTO DEL GASTO Y OBSERVACIONES */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  4. Concepto del Gasto y Justificación
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                  Concepto Principal del Gasto
                </label>
                {editingField === 'concepto' ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-purple-500 rounded-xl outline-hidden focus:ring-2 focus:ring-purple-500/20"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={handleCancelEditing} className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
                        Cancelar
                      </button>
                      <button onClick={() => handleSaveField('concepto')} className="px-3 py-1 text-xs font-bold bg-purple-600 text-white rounded-lg">
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => handleStartEditing('concepto', data.concepto)}
                    className="p-3.5 bg-slate-50/80 hover:bg-purple-50/30 rounded-2xl border border-slate-200/80 cursor-pointer group transition-colors"
                    title="Doble clic para editar concepto"
                  >
                    <p className="font-bold text-slate-800 text-sm leading-relaxed">
                      {data.concepto || "Sin concepto registrado"}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                  Observaciones Adicionales
                </label>
                {editingField === 'observacion' ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-purple-500 rounded-xl outline-hidden focus:ring-2 focus:ring-purple-500/20"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={handleCancelEditing} className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
                        Cancelar
                      </button>
                      <button onClick={() => handleSaveField('observacion')} className="px-3 py-1 text-xs font-bold bg-purple-600 text-white rounded-lg">
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => handleStartEditing('observacion', data.observacion)}
                    className="p-3 bg-slate-50/50 hover:bg-slate-100/60 rounded-xl border border-slate-200/60 cursor-pointer group transition-colors"
                    title="Doble clic para editar observaciones"
                  >
                    <p className="text-xs text-slate-600 italic">
                      {data.observacion ? data.observacion : "Ninguna observación registrada."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA LATERAL DERECHA (30%) */}
        <div className="w-full xl:w-4/12 space-y-6">
          
          {/* TARJETA 1: RESUMEN FINANCIERO */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-3xl shadow-xl p-6 text-white space-y-5 border border-purple-800/30">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs font-black uppercase tracking-wider text-purple-200 flex items-center gap-2">
                <Coins className="w-4 h-4 text-purple-400" />
                Resumen Económico
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Moneda: {data.tipo_moneda === 'D' ? 'DÓLARES ($)' : 'SOLES (S/)'}
              </span>
            </div>

            {data?.presupuesto_info && (
              <div className="bg-purple-900/60 border border-purple-400/30 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                <span className="font-bold text-purple-200 uppercase tracking-wider text-[10px]">
                  Partida: {data.presupuesto_info.categoria_nombre}
                </span>
                <span className="font-semibold text-purple-300 text-[11px]">
                  Disponible máx: <b className="text-emerald-400 font-bold">${Number(data.presupuesto_info.disponible_maximo || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                  Monto en Soles
                </span>
                {editingField === 'monto_soles' ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      step="0.01"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveField('monto_soles');
                        if (e.key === 'Escape') handleCancelEditing();
                      }}
                      className="w-full px-2 py-1 text-sm font-black text-slate-800 bg-white border-2 border-purple-400 rounded-lg outline-none"
                    />
                    <button onClick={() => handleSaveField('monto_soles')} className="p-1 bg-emerald-500 text-white rounded-md cursor-pointer">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={handleCancelEditing} className="p-1 bg-slate-700 text-slate-300 rounded-md cursor-pointer">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => isPendiente && handleStartEditing('monto_soles', data.monto_soles)}
                    className={`cursor-pointer group flex items-center justify-between ${isPendiente ? "hover:opacity-90" : ""}`}
                    title={isPendiente ? "Doble clic para editar monto en soles" : undefined}
                  >
                    <span className="text-3xl font-black text-white tracking-tight">
                      S/ {parseFloat(data.monto_soles || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                    {isPendiente && <Edit2 className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                    Monto en Dólares
                  </span>
                  {editingField === 'monto_dolares' ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveField('monto_dolares');
                          if (e.key === 'Escape') handleCancelEditing();
                        }}
                        className="w-full px-2 py-1 text-xs font-black text-slate-800 bg-white border-2 border-purple-400 rounded-lg outline-none"
                      />
                      <button onClick={() => handleSaveField('monto_dolares')} className="p-1 bg-emerald-500 text-white rounded-md cursor-pointer">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={handleCancelEditing} className="p-1 bg-slate-700 text-slate-300 rounded-md cursor-pointer">
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDoubleClick={() => isPendiente && handleStartEditing('monto_dolares', data.monto_dolares)}
                      className={`cursor-pointer group flex items-center justify-between ${isPendiente ? "hover:opacity-90" : ""}`}
                      title={isPendiente ? "Doble clic para editar monto en dólares" : undefined}
                    >
                      <span className="text-lg font-black text-purple-100">
                        $ {parseFloat(data.monto_dolares || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      {isPendiente && <Edit2 className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                    Tipo de Cambio
                  </span>
                  <span className="text-lg font-mono font-bold text-purple-200">
                    {parseFloat(data.tipo_cambio || 3.75).toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TARJETA 2: PROYECTO, ÁREA Y SOLICITANTE */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-slate-50 text-slate-600">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Origen y Cotización
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Cotización / Proyecto:</span>
                {data.id_apertura ? (
                  <button
                    onClick={() => navigate(`/compras/programacion/${data.id_apertura}`)}
                    className="font-bold text-purple-700 hover:underline flex items-center gap-1"
                  >
                    <span>{data.codigo || `Apertura #${data.id_apertura}`}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="font-bold text-slate-800">{data.codigo || "S/N"}</span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span className="text-slate-400 font-medium">Área Solicitante:</span>
                <span className="font-bold text-slate-800">{data.area_nombre || data.area || "General"}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span className="text-slate-400 font-medium">Usuario Solicitante:</span>
                <span className="font-bold text-slate-800">{data.solicitante_nombre || data.regus || "S/N"}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span className="text-slate-400 font-medium">Partida / Gasto:</span>
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-black text-[10px] uppercase">
                  {data.tipo_gasto_nombre || (data.tipo_gasto === 3 ? "Mano de Obra" : data.tipo_gasto === 4 ? "Gastos de Servicio" : data.tipo_gasto === 5 ? "Otros" : "Suministros")}
                </span>
              </div>
            </div>
          </div>

          {/* TARJETA 3: ESTADO Y TRAZABILIDAD */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Flujo de Liquidación
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-black">
                  ✓
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 text-xs">1. Registro de Solicitud</h5>
                  <p className="text-[11px] text-slate-400">{data.fecha_corta || formatDateDMY(data.fecha)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                  data.fecha_transferencia ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {data.fecha_transferencia ? '✓' : '2'}
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 text-xs">2. Transferencia / Desembolso</h5>
                  <p className="text-[11px] text-slate-400">
                    {data.fecha_transferencia ? formatDateDMY(data.fecha_transferencia) : "Pendiente de transferencia"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                  isAprobado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isAprobado ? '✓' : '3'}
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 text-xs">3. Rendición y Liquidación</h5>
                  <p className="text-[11px] text-slate-400">
                    {data.fecha_liquidacion ? formatDateDMY(data.fecha_liquidacion) : "Pendiente de liquidación"}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Loader,
  Clock,
  User,
  DollarSign,
  MapPin,
  CreditCard,
  Link as LinkIcon,
  ChevronDown,
  ChevronRight,
  Building,
  Building2,
  Mail,
  FileText,
  AlertTriangle,
  Briefcase,
  Package,
  Printer,
  Send,
  RotateCcw,
  Edit2,
  Trash2,
  Plus,
  X,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Coins,
  Truck,
  Phone,
  Sparkles,
  Paperclip,
  TrendingUp,
  Layers,
  Info,
  ExternalLink,
  FileSpreadsheet,
  AlertCircle,
  MoreHorizontal
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";

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

export default function CompraDetalle({ idSolicitud }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { setCustomBreadcrumbs, setBreadcrumbOverride } = useOutletContext() || {};

  const realId = idSolicitud || id;

  // Estado para edición inline con doble clic
  const [editingField, setEditingField] = useState(null); // 'referencia', 'empresa', 'direccion', 'contacto', 'tipo', 'tipo_moneda', 'tipo_cambio', 'fecha_orden', 'tiempo_entrega', 'entrega_lugar', 'concepto'
  const [editingValue, setEditingValue] = useState("");

  // Estado para edición y adición de partidas
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({ codigo: "", descripcion: "", cantidad: 1, valor: 0.00 });

  const [newCodigoPartida, setNewCodigoPartida] = useState("");
  const [newDescripcionPartida, setNewDescripcionPartida] = useState("");
  const [newCantidadPartida, setNewCantidadPartida] = useState(1);
  const [newValorPartida, setNewValorPartida] = useState(0.00);

  // Referencias para navegación rápida por flechas entre inputs
  const inputCodRef = useRef(null);
  const inputDescRef = useRef(null);
  const inputCantRef = useRef(null);
  const inputValRef = useRef(null);

  const handleAddRowKeyDown = (e, nextInputRef, prevInputRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddPartida();
    } else if (e.key === "ArrowRight") {
      const isAtEnd = e.target.selectionStart === undefined || e.target.selectionStart === e.target.value.length;
      if (isAtEnd && nextInputRef?.current) {
        e.preventDefault();
        nextInputRef.current.focus();
        nextInputRef.current.select?.();
      }
    } else if (e.key === "ArrowLeft") {
      const isAtStart = e.target.selectionStart === undefined || e.target.selectionStart === 0;
      if (isAtStart && prevInputRef?.current) {
        e.preventDefault();
        prevInputRef.current.focus();
        prevInputRef.current.select?.();
      }
    }
  };

  // Tab activo en el historial
  const [activeHistoryTab, setActiveHistoryTab] = useState("todos");

  // Menú de más acciones
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Carga de datos de la orden
  const { data, isLoading, error } = useQuery({
    queryKey: ["compraDetalle", realId],
    queryFn: async () => {
      const res = await api.get(`/compras/atencion/${realId}/`);
      return res.data;
    },
    enabled: !!realId,
  });

  // Identificación de estados y permiso de edición
  const estadoId = Number(data?.id_estado?.id_estado ?? data?.id_estado ?? 99);
  const estadoStr = String(data?.estado_nombre || "Pendiente").toUpperCase();
  const isEditable = estadoId === 0 || estadoStr.includes("PENDIENTE DE ENVIO") || estadoStr.includes("PENDIENTE DE ENVÍO");
  const isEnviado = estadoId === 1 || estadoStr.includes("ENVIADO, PENDIENTE");
  const isAtendido = estadoId === 2 || estadoStr.includes("ATENDIDO, PENDIENTE");

  // ID directo / numérico sin prefijo (ej: 20262035)
  const directId = useMemo(() => {
    if (!data && !realId) return "";
    if (data?.id_registro_directo) return String(data.id_registro_directo);
    if (data?.id_solicitud) return String(data.id_solicitud);
    const regStr = String(data?.id_registro || realId || "");
    return regStr.includes("_") ? regStr.split("_")[1] : regStr;
  }, [data, realId]);

  useEffect(() => {
    if (data) {
      const displayNro = String(directId);
      if (setBreadcrumbOverride) setBreadcrumbOverride(displayNro);

      const crumbs = [];
      crumbs.push({
        label: "PROGRAMACION",
        path: "/compras/programacion"
      });
      if (data.id_apertura) {
        crumbs.push({
          label: String(data.id_apertura),
          path: `/compras/programacion/${data.id_apertura}`
        });
      }
      crumbs.push({
        label: displayNro
      });

      if (setCustomBreadcrumbs) setCustomBreadcrumbs(crumbs);
    }
  }, [data, directId, setCustomBreadcrumbs, setBreadcrumbOverride]);

  // Funciones controladoras de edición inline por doble clic
  const handleStartEdit = (field, currentValue) => {
    if (!isEditable) {
      toast.info("La orden solo puede editarse cuando está en estado PENDIENTE DE ENVÍO.");
      return;
    }
    setEditingField(field);
    setEditingValue(currentValue ?? "");
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditingValue("");
  };

  const handleSaveEdit = (fieldOverride, valueOverride) => {
    const field = fieldOverride || editingField;
    if (!field) return;
    const value = valueOverride !== undefined ? valueOverride : editingValue;

    if (data && String(data[field] ?? "").trim() === String(value ?? "").trim()) {
      setEditingField(null);
      return;
    }

    editFieldMutation.mutate({ [field]: value });
    setEditingField(null);
  };

  const handleInlineKeyDown = (e, fieldOverride) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit(fieldOverride);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // Lista unificada de partidas
  const partidas = useMemo(() => {
    if (!data) return [];
    return [
      ...(data.suministros || []).map(item => ({
        ...item,
        id: item.id_detalle || item.id_suministro,
        codigo: item.codigo_item || item.codigo || "",
        descripcion: item.descripcion || "",
        tipo_nombre: "Suministro",
        cantidad: Number(item.cantidad || 0),
        valor: Number(item.precio_venta || item.valor || item.costo_precio || 0.00),
        total: Number(item.venta_total || item.total || item.costo_total || 0.00),
        esSuministro: true
      })),
      ...(data.servicios || []).map(item => ({
        ...item,
        id: item.id_detalle || item.id_servicio,
        codigo: item.codigo_item || item.codigo || "",
        descripcion: item.descripcion_item || item.nombre_servicio || item.descripcion || "",
        tipo_nombre: "Servicio",
        cantidad: Number(item.horas || item.cantidad || 0),
        valor: Number(item.cotizado_hombre_dia || item.costo_hombre_dia || item.valor || 0.00),
        total: Number(item.cotizado_total || item.total || item.costo_total || 0.00),
        esSuministro: false
      }))
    ];
  }, [data]);

  // Mutaciones
  const editFieldMutation = useMutation({
    mutationFn: async (updatedFields) => {
      const res = await api.put(`/compras/atencion/${realId}/editar/`, updatedFields);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Campo actualizado con éxito.");
      queryClient.invalidateQueries(["compraDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
      queryClient.invalidateQueries(["programacionDetalle"]);
    },
    onError: (err) => {
      const errMsg = err.response?.data?.error || err.message || "Error al actualizar campo.";
      toast.error(errMsg);
    },
  });

  const enviarMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/compras/atencion/${realId}/enviar/`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Orden enviada con éxito.");
      queryClient.invalidateQueries(["compraDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
      queryClient.invalidateQueries(["compras-programacion"]);
      queryClient.invalidateQueries(["programacionDetalle"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al enviar la orden.");
    },
  });

  const revertirMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/compras/atencion/${realId}/revertir/`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Orden retornada a PENDIENTE DE ENVÍO para edición.");
      queryClient.invalidateQueries(["compraDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
      queryClient.invalidateQueries(["programacionDetalle"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al revertir la orden.");
    },
  });
  const atenderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/compras/atencion/${realId}/atender/`);
      return res.data;
    },
    onSuccess: (dataRes) => {
      toast.success(dataRes?.message || "Solicitud atendida con éxito.");
      queryClient.invalidateQueries(["compraDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
      queryClient.invalidateQueries(["listaLiquidaciones"]);
      queryClient.invalidateQueries(["compras-programacion"]);
      queryClient.invalidateQueries(["programacionDetalle"]);
    },
    onError: (err) => {
      const errMsg = err.response?.data?.error || err.message || "Error al atender la solicitud.";
      toast.error(errMsg);
    },
  });

  const anularMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/compras/atencion/${realId}/anular/`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Solicitud anulada con éxito.");
      queryClient.invalidateQueries(["compraDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al anular la solicitud.");
    }
  });

  const eliminarSolicitudMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/compras/atencion/${realId}/eliminar/`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData?.message || "Solicitud eliminada con éxito.");
      const aperturaId = resData?.id_apertura || data?.id_apertura;
      queryClient.invalidateQueries(["compraDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
      queryClient.invalidateQueries(["compras-programacion"]);
      queryClient.invalidateQueries(["programacionDetalle"]);
      if (aperturaId) {
        navigate(`/compras/programacion/${aperturaId}`);
      } else {
        navigate("/compras/programacion");
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al eliminar la solicitud.");
    }
  });

  const addMutation = useMutation({
    mutationFn: async (newItem) => {
      const res = await api.post(`/compras/atencion/${realId}/detalles/agregar/`, newItem);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Partida agregada con éxito.");
      queryClient.invalidateQueries(["compraDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al agregar detalle.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (idDetalle) => {
      const res = await api.delete(`/compras/detalles/${idDetalle}/eliminar/`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Partida eliminada con éxito.");
      queryClient.invalidateQueries(["compraDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al eliminar detalle.");
    }
  });

  const editMutation = useMutation({
    mutationFn: async ({ idDetalle, updatedItem }) => {
      const res = await api.put(`/compras/detalles/${idDetalle}/editar/`, updatedItem);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Partida actualizada con éxito.");
      setEditingItemId(null);
      queryClient.invalidateQueries(["compraDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al actualizar detalle.");
    }
  });

  const handleAddPartida = () => {
    if (!newDescripcionPartida.trim()) {
      toast.warning("Debe ingresar una descripción para la partida.");
      return;
    }

    const cant = Number(newCantidadPartida) || 1;
    const val = Number(newValorPartida) || 0.00;
    const totalPartida = cant * val;

    // Validación presupuestal
    const maxUSD = Number(data?.presupuesto_info?.disponible_maximo);
    if (!isNaN(maxUSD) && maxUSD >= 0) {
      const tcVal = Number(data?.tipo_cambio || 3.75) || 3.75;
      const newOrderTotal = subtotalCalculado + totalPartida;
      const newOrderUSD = isDolares ? newOrderTotal : (newOrderTotal / tcVal);

      if (newOrderUSD > maxUSD + 0.009) {
        toast.warning(
          `Esta partida causaría que la orden ($${newOrderUSD.toFixed(2)}) exceda el saldo disponible de su partida presupuestal ($${maxUSD.toFixed(2)}).`
        );
        return;
      }
    }

    addMutation.mutate({
      codigo: newCodigoPartida.trim() || "",
      descripcion: newDescripcionPartida.trim(),
      cantidad: cant,
      valor: val
    }, {
      onSuccess: () => {
        setNewCodigoPartida("");
        setNewDescripcionPartida("");
        setNewCantidadPartida(1);
        setNewValorPartida(0.00);
      }
    });
  };

  const startEditing = (item) => {
    setEditingItemId(item.id);
    setEditForm({
      codigo: item.codigo || "",
      descripcion: item.descripcion || "",
      cantidad: item.cantidad || 1,
      valor: item.valor || 0.00
    });
  };

  const handleSavePartidaEdit = (idDetalle) => {
    if (!editForm.descripcion.trim()) {
      toast.warning("Debe ingresar una descripción.");
      return;
    }

    const cant = Number(editForm.cantidad) || 1;
    const val = Number(editForm.valor) || 0.00;
    const nuevoTotalItem = cant * val;

    // Validación presupuestal
    const maxUSD = Number(data?.presupuesto_info?.disponible_maximo);
    if (!isNaN(maxUSD) && maxUSD >= 0) {
      const tcVal = Number(data?.tipo_cambio || 3.75) || 3.75;
      const subtotalOtros = partidas.filter(p => p.id !== idDetalle).reduce((acc, it) => acc + (Number(it.total) || 0), 0);
      const newOrderTotal = subtotalOtros + nuevoTotalItem;
      const newOrderUSD = isDolares ? newOrderTotal : (newOrderTotal / tcVal);

      if (newOrderUSD > maxUSD + 0.009) {
        toast.warning(
          `Esta modificación causaría que la orden ($${newOrderUSD.toFixed(2)}) exceda el saldo disponible de su partida presupuestal ($${maxUSD.toFixed(2)}).`
        );
        return;
      }
    }

    editMutation.mutate({
      idDetalle,
      updatedItem: {
        codigo: editForm.codigo,
        descripcion: editForm.descripcion,
        cantidad: cant,
        valor: val
      }
    });
  };

  const handleEditPartidaKeyDown = (e, idDetalle) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSavePartidaEdit(idDetalle);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingItemId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[450px] flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-100 shadow-sm font-sans">
        <Loader className="w-9 h-9 text-emerald-600 animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Cargando Detalle de la Orden...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center space-y-4 bg-red-50/50 rounded-3xl border border-red-100 text-center font-sans">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <div>
          <h3 className="text-sm font-black text-red-950 uppercase tracking-wider mb-1">Error de Carga</h3>
          <p className="text-xs font-semibold text-red-700">{error?.message || "No se pudieron obtener los datos de la solicitud."}</p>
        </div>
        <button
          onClick={() => navigate("/compras/atencion")}
          className="px-5 py-2.5 bg-white hover:bg-red-50 border border-red-200 text-red-700 font-black text-xs uppercase rounded-xl transition-all shadow-sm active:scale-95"
        >
          Volver a la Lista
        </button>
      </div>
    );
  }

  // Cálculos económicos
  const tc = Number(data.tipo_cambio || 3.75);
  const isDolares = data.tipo_moneda === "D";
  const currencySymbol = isDolares ? "$" : "S/.";

  const subtotalCalculado = partidas.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const igvCalculado = subtotalCalculado * 0.18;
  const totalCalculado = subtotalCalculado + igvCalculado;

  const totalUSD = isDolares ? totalCalculado : (tc > 0 ? totalCalculado / tc : 0);
  const totalPEN = isDolares ? totalCalculado * tc : totalCalculado;

  // Estado y badges
  const isApproved = estadoStr.includes("APROBADA") || estadoStr.includes("ATENDIDO") || estadoStr.includes("ENVIADA");

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

  // Avatar con iniciales del proveedor
  const getInitials = (name) => {
    if (!name) return "OC";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1920px] mx-auto animate-in fade-in duration-500 font-sans pb-12">
      
      {/* ENCABEZADO EJECUTIVO Y BARRA DE ACCIONES SUPERIOR */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* IDENTIFICACIÓN Y TÍTULO */}
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate(data.id_apertura ? `/compras/programacion/${data.id_apertura}` : "/compras/atencion")}
              className="p-2.5 bg-slate-50 hover:bg-emerald-50 rounded-2xl text-slate-400 hover:text-emerald-600 border border-slate-200/60 transition-all group shrink-0"
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
                  {data.tipo === "Servicio" || data.tipo === "S" ? "Orden de Servicio" : "Orden de Compra"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50/70 border border-indigo-100 text-indigo-700 font-black text-[10px] uppercase tracking-wider">
                  REFERENCIA
                </span>
                {editingField === 'referencia' ? (
                  <input
                    type="text"
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={() => handleSaveEdit('referencia', editingValue)}
                    onKeyDown={(e) => handleInlineKeyDown(e, 'referencia')}
                    className="px-2.5 py-1 text-sm font-black text-slate-800 bg-white border-2 border-indigo-500 rounded-xl shadow-md outline-none min-w-[320px]"
                    placeholder="Referencia de la orden..."
                  />
                ) : (
                  <span 
                    onDoubleClick={() => handleStartEdit('referencia', data.referencia || data.concepto || "")}
                    className={`text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5 ${
                      isEditable ? "cursor-pointer hover:text-indigo-600 hover:bg-slate-50 px-2 py-1 rounded-xl border border-dashed border-transparent hover:border-indigo-300 transition-all group" : ""
                    }`}
                    title={isEditable ? "Doble clic para editar referencia" : undefined}
                  >
                    <span>{data.referencia || data.concepto || "Sin referencia especificada"}</span>
                    {isEditable && <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN SUPERIORES */}
          <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center">
            
            {/* Imprimir PDF */}
            <button
              onClick={() => toast.info("Generando reporte PDF de la Orden...")}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Imprimir
            </button>

            {/* Enviar Correo */}
            <button
              onClick={() => toast.info("Preparando envío de correo al proveedor...")}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              Enviar
            </button>

            {/* SI ESTÁ EN PENDIENTE DE ENVÍO: BOTÓN ENVIAR ORDEN */}
            {isEditable && (
              <button
                onClick={() => {
                  if (window.confirm("¿Confirmar envío de la orden? Al enviarla, los campos quedarán bloqueados para edición.")) {
                    enviarMutation.mutate();
                  }
                }}
                disabled={enviarMutation.isLoading}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Enviar orden a logística / atención"
              >
                {enviarMutation.isLoading ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Enviar Orden</span>
              </button>
            )}

            {/* SI ESTÁ ENVIADO: BOTÓN REVERTIR PARA EDICIÓN */}
            {isEnviado && (
              <button
                onClick={() => {
                  if (window.confirm("¿Confirmar retornar esta orden al estado PENDIENTE DE ENVÍO para corregir o modificar datos?")) {
                    revertirMutation.mutate();
                  }
                }}
                disabled={revertirMutation.isLoading}
                className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-800 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                title="Retornar orden a Pendiente de Envío para modificar datos"
              >
                {revertirMutation.isLoading ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Revertir para Edición</span>
              </button>
            )}

            {/* SI ESTÁ ENVIADO O PENDIENTE DE ATENCIÓN: BOTÓN ATENDER */}
            {(isEnviado || (estadoId === 1)) && (
              <button
                onClick={() => {
                  if (window.confirm("¿Confirmar que esta orden ha sido atendida? Pasará al estado ATENDIDO, PENDIENTE DE LIQUIDACIÓN.")) {
                    atenderMutation.mutate();
                  }
                }}
                disabled={atenderMutation.isLoading}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {atenderMutation.isLoading ? (
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
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-2xs"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMoreActions && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-50 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setShowMoreActions(false);
                      anularMutation.mutate();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Anular Orden
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreActions(false);
                      if (window.confirm("¿Está seguro de eliminar esta orden de compra/servicio? Esta acción no se puede deshacer.")) {
                        eliminarSolicitudMutation.mutate();
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

        {/* METADATOS COMPACTOS CON FECHAS EN FORMATO DD/MM/YYYY */}
        <div className="px-6 py-3 bg-slate-50/60 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 border-t border-slate-100/80">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-bold text-slate-600 uppercase text-[10px]">Solicitante:</span>
            <span className="font-black text-slate-800">{data.nombre || data.regus || "No Definido"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-bold text-slate-600 uppercase text-[10px]">Área:</span>
            <span className="font-black text-slate-800">{data.area || "No Definida"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-bold text-slate-600 uppercase text-[10px]">Fecha Creación:</span>
            <span className="font-black text-slate-800">
              {formatDateDMY(data.fecha)} {data.hora ? `| ${data.hora}` : ""}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold text-slate-600 uppercase text-[10px]">Cotización / Proyecto:</span>
            <span 
              className="font-black text-indigo-700 underline cursor-pointer" 
              onClick={() => data.id_apertura && navigate(`/compras/programacion/${data.id_apertura}`)}
            >
              {data.codigo || "S/N"}
            </span>
          </div>
        </div>
      </div>

      {/* CUERPO PRINCIPAL DIVIDIDO EN 2 COLUMNAS (70% / 30%) */}
      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
        
        {/* COLUMNA PRINCIPAL IZQUIERDA (70%) */}
        <div className="w-full xl:w-8/12 space-y-6">
          
          {/* FILA 1: 1. PROVEEDOR & 2. INFORMACIÓN DE LA ORDEN (2 TARJETAS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. TARJETA PROVEEDOR */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    1. Proveedor / Empresa
                  </span>
                </div>
              </div>

              {/* Información Empresa */}
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                  {getInitials(data.empresa)}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  {editingField === 'empresa' ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('empresa', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'empresa')}
                      className="w-full px-2 py-1 text-sm font-black text-slate-900 uppercase bg-white border-2 border-indigo-500 rounded-lg shadow-sm outline-none"
                      placeholder="Nombre de la empresa / proveedor..."
                    />
                  ) : (
                    <h3
                      onDoubleClick={() => handleStartEdit('empresa', data.empresa || "")}
                      className={`font-black text-slate-900 text-sm uppercase leading-tight flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-indigo-300 rounded px-1.5 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar nombre de empresa" : undefined}
                    >
                      <span className="truncate">{data.empresa || "EMPRESA NO REGISTRADA"}</span>
                      {isEditable && <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />}
                    </h3>
                  )}

                  {editingField === 'direccion' ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('direccion', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'direccion')}
                      className="w-full px-2 py-0.5 text-xs text-slate-700 bg-white border-2 border-indigo-500 rounded-lg shadow-sm outline-none"
                      placeholder="Dirección del proveedor..."
                    />
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('direccion', data.direccion || "")}
                      className={`text-[11px] text-slate-500 font-medium flex items-center gap-1.5 ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-indigo-300 rounded px-1.5 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar dirección" : undefined}
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{data.direccion || "Dirección no registrada"}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />}
                    </p>
                  )}
                </div>
              </div>

              {/* Contacto Principal */}
              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Contacto Principal
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingField === 'contacto' ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveEdit('contacto', editingValue)}
                          onKeyDown={(e) => handleInlineKeyDown(e, 'contacto')}
                          className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-indigo-500 rounded-lg shadow-sm outline-none"
                          placeholder="Nombre del contacto..."
                        />
                      ) : (
                        <div
                          onDoubleClick={() => handleStartEdit('contacto', data.contacto || "")}
                          className={`flex items-center justify-between ${
                            isEditable ? "cursor-pointer hover:bg-white hover:ring-1 hover:ring-indigo-300 rounded px-1 py-0.5 transition-all group" : ""
                          }`}
                          title={isEditable ? "Doble clic para editar contacto" : undefined}
                        >
                          <p className="font-bold text-slate-800 text-xs truncate">{data.contacto || "No asignado"}</p>
                          {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400">Asesor Comercial</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Llamar">
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Correo">
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. INFORMACIÓN DE LA ORDEN */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-teal-50 text-teal-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    2. Información de la Orden
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  REGISTRO: {directId}
                </span>
              </div>


              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Tipo de Orden */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Tipo</span>
                  {editingField === 'tipo' ? (
                    <select
                      autoFocus
                      value={editingValue}
                      onChange={(e) => {
                        setEditingValue(e.target.value);
                        handleSaveEdit('tipo', e.target.value);
                      }}
                      onBlur={() => handleSaveEdit('tipo', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'tipo')}
                      className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-indigo-500 rounded-lg outline-none"
                    >
                      <option value="C">Compra</option>
                      <option value="S">Servicio</option>
                    </select>
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('tipo', data.tipo === "Servicio" || data.tipo === "S" ? "S" : "C")}
                      className={`font-black text-slate-800 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-indigo-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para cambiar tipo de orden" : undefined}
                    >
                      <span>{data.tipo === "Servicio" || data.tipo === "S" ? "Servicio" : "Compra"}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>

                {/* Forma de Pago */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Forma de Pago</span>
                  <p className="font-black text-slate-800">{data.forma_pago || "Crédito / Contado"}</p>
                </div>

                {/* Moneda */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Moneda</span>
                  {editingField === 'tipo_moneda' ? (
                    <select
                      autoFocus
                      value={editingValue}
                      onChange={(e) => {
                        setEditingValue(e.target.value);
                        handleSaveEdit('tipo_moneda', e.target.value);
                      }}
                      onBlur={() => handleSaveEdit('tipo_moneda', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'tipo_moneda')}
                      className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-indigo-500 rounded-lg outline-none"
                    >
                      <option value="D">Dólares ($ USD)</option>
                      <option value="S">Soles (S/ PEN)</option>
                    </select>
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('tipo_moneda', data.tipo_moneda === "D" ? "D" : "S")}
                      className={`font-black text-emerald-700 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-indigo-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para cambiar moneda (Dólares/Soles)" : undefined}
                    >
                      <span>{isDolares ? "Dólares ($ USD)" : "Soles (S/ PEN)"}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>

                {/* Tipo de Cambio */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Tipo de Cambio</span>
                  {editingField === 'tipo_cambio' ? (
                    <input
                      type="number"
                      step="0.0001"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('tipo_cambio', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'tipo_cambio')}
                      className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-indigo-500 rounded-lg outline-none"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('tipo_cambio', tc)}
                      className={`font-black text-slate-800 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-indigo-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar tipo de cambio" : undefined}
                    >
                      <span>S/. {tc.toFixed(4)}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>

                {/* Fecha Requerida */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Fecha Requerida</span>
                  {editingField === 'fecha_orden' ? (
                    <input
                      type="date"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('fecha_orden', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'fecha_orden')}
                      className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-indigo-500 rounded-lg outline-none"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('fecha_orden', data.fecha_orden ? data.fecha_orden.split('T')[0] : "")}
                      className={`font-black text-slate-800 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-indigo-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar fecha requerida" : undefined}
                    >
                      <span>{formatDateDMY(data.fecha_orden)}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>

                {/* Tiempo de Entrega */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Tiempo Entrega</span>
                  {editingField === 'tiempo_entrega' ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('tiempo_entrega', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'tiempo_entrega')}
                      className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-indigo-500 rounded-lg outline-none"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('tiempo_entrega', data.tiempo_entrega || "")}
                      className={`font-black text-slate-800 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-indigo-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar tiempo de entrega" : undefined}
                    >
                      <span>{data.tiempo_entrega || "No especificado"}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>
              </div>

              {/* Observaciones / Concepto */}
              <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 text-[11px] text-slate-600">
                <span className="font-bold text-slate-400 uppercase text-[10px] block mb-0.5">Observaciones:</span>
                {editingField === 'concepto' ? (
                  <div className="space-y-1">
                    <textarea
                      autoFocus
                      rows={2}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('concepto', editingValue)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit('concepto', editingValue);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          handleCancelEdit();
                        }
                      }}
                      className="w-full p-2 text-xs text-slate-700 bg-white border-2 border-indigo-500 rounded-lg outline-none"
                      placeholder="Observaciones de la orden..."
                    />
                    <span className="text-[9px] text-slate-400">Enter para guardar, Shift+Enter para salto de línea, Esc para cancelar</span>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => handleStartEdit('concepto', data.concepto || data.referencia || "")}
                    className={`flex items-start justify-between ${
                      isEditable ? "cursor-pointer hover:bg-slate-100/80 hover:ring-1 hover:ring-indigo-300 rounded p-1 transition-all group" : ""
                    }`}
                    title={isEditable ? "Doble clic para editar observaciones" : undefined}
                  >
                    <p className="italic font-medium text-slate-700">{data.concepto || data.referencia || "Sin observaciones adicionales."}</p>
                    {isEditable && <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1 mt-0.5" />}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 3. DETALLE DE LA COMPRA / TABLA DE PARTIDAS */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
            
            {/* Header de la Tabla */}
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    3. Detalle de la Compra / Partidas
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {partidas.length} ítems registrados en la orden
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toast.info("Generando reporte de partidas...")}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  Reporte
                </button>
                <button
                  onClick={() => toast.info("Exportando partidas a Excel...")}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-xs uppercase rounded-xl border border-emerald-200 shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Excel
                </button>
              </div>
            </div>

            {/* Grilla de Partidas */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">N°</th>
                    <th className="py-3 px-4 w-28 text-center">Código</th>
                    <th className="py-3 px-4">Descripción / Ítem</th>
                    <th className="py-3 px-4 w-20 text-center">Cantidad</th>
                    <th className="py-3 px-4 w-28 text-center">Valor</th>
                    <th className="py-3 px-4 w-28 text-center">Total</th>
                    <th className="py-3 px-4 w-20 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partidas.map((item, index) => {
                    const isEditing = editingItemId === item.id;

                    if (isEditing) {
                      return (
                        <tr key={item.id || index} className="bg-emerald-50/40">
                          <td className="py-2.5 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              value={editForm.codigo}
                              onChange={(e) => setEditForm({ ...editForm, codigo: e.target.value })}
                              onKeyDown={(e) => handleEditPartidaKeyDown(e, item.id)}
                              className="w-full px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold"
                              placeholder="Código..."
                            />
                          </td>
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              autoFocus
                              value={editForm.descripcion}
                              onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                              onKeyDown={(e) => handleEditPartidaKeyDown(e, item.id)}
                              className="w-full px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-medium"
                              placeholder="Descripción..."
                            />
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="number"
                              min="1"
                              value={editForm.cantidad}
                              onChange={(e) => setEditForm({ ...editForm, cantidad: e.target.value })}
                              onKeyDown={(e) => handleEditPartidaKeyDown(e, item.id)}
                              className="w-16 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs text-center font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.valor}
                              onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })}
                              onKeyDown={(e) => handleEditPartidaKeyDown(e, item.id)}
                              className="w-24 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs text-right font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right font-black text-emerald-800">
                            {currencySymbol} {(Number(editForm.cantidad || 0) * Number(editForm.valor || 0)).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("¿Eliminar esta partida de la orden?")) {
                                  deleteMutation.mutate(item.id);
                                }
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar Partida"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={item.id || index}
                        onDoubleClick={() => {
                          if (isEditable) {
                            startEditing(item);
                          }
                        }}
                        className={`hover:bg-slate-50/80 transition-colors ${isEditable ? "cursor-pointer group" : ""}`}
                        title={isEditable ? "Doble clic para editar partida (Enter para guardar, Esc para cancelar)" : undefined}
                      >
                        <td className="py-3 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="py-3 px-4 text-center font-black text-indigo-600 uppercase">
                          {item.codigo && item.codigo !== "-" && item.codigo !== "SERV" ? item.codigo : ""}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {item.descripcion}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">{item.cantidad}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700">
                          {currencySymbol} {Number(item.valor || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-slate-900">
                          {currencySymbol} {Number(item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isEditable ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("¿Eliminar esta partida de la orden?")) {
                                  deleteMutation.mutate(item.id);
                                }
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar Partida"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* FILA DE ADICIÓN RÁPIDA (SOLO CUANDO ES EDITABLE) */}
                  {isEditable && (
                    <tr className="bg-emerald-50/20 border-t border-dashed border-emerald-200">
                      <td className="py-2.5 px-4 text-center font-black text-emerald-600">+</td>
                      <td className="py-2.5 px-4">
                        <input
                          ref={inputCodRef}
                          type="text"
                          placeholder="Opcional..."
                          value={newCodigoPartida}
                          onChange={(e) => setNewCodigoPartida(e.target.value)}
                          onKeyDown={(e) => handleAddRowKeyDown(e, inputDescRef, null)}
                          className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-hidden focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          ref={inputDescRef}
                          type="text"
                          placeholder="Descripción de la nueva partida..."
                          value={newDescripcionPartida}
                          onChange={(e) => setNewDescripcionPartida(e.target.value)}
                          onKeyDown={(e) => handleAddRowKeyDown(e, inputCantRef, inputCodRef)}
                          className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-hidden focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <input
                          ref={inputCantRef}
                          type="number"
                          min="1"
                          value={newCantidadPartida}
                          onChange={(e) => setNewCantidadPartida(e.target.value)}
                          onKeyDown={(e) => handleAddRowKeyDown(e, inputValRef, inputDescRef)}
                          className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-center font-bold outline-hidden focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <input
                          ref={inputValRef}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newValorPartida || ""}
                          onChange={(e) => setNewValorPartida(e.target.value)}
                          onKeyDown={(e) => handleAddRowKeyDown(e, null, inputCantRef)}
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-right font-bold outline-hidden focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-emerald-800">
                        {currencySymbol} {(Number(newCantidadPartida || 1) * Number(newValorPartida || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={handleAddPartida}
                          disabled={addMutation.isLoading}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                          title="Agregar Partida (Enter)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Desglose de Totales de la Tabla */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                * Todos los valores están sujetos a las condiciones comerciales estipuladas.
              </div>

              <div className="w-full md:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>Subtotal:</span>
                  <span>{currencySymbol} {subtotalCalculado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>IGV (18%):</span>
                  <span>{currencySymbol} {igvCalculado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black text-sm border-t border-slate-200 pt-1">
                  <span>Total Orden:</span>
                  <span className="text-emerald-700">{currencySymbol} {totalCalculado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* FILA DE 3 TARJETAS: 4. CONDICIONES DE ENTREGA | 5. DISTRIBUCIÓN PRESUPUESTAL | 6. RESUMEN ECONÓMICO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 4. CONDICIONES DE ENTREGA */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                        4. Condiciones de Entrega
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
                        Logística y Despacho
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* Lugar de Entrega */}
                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white text-indigo-600 border border-slate-200/60 shadow-2xs shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Lugar de Entrega</span>
                      {editingField === 'entrega_lugar' ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveEdit('entrega_lugar', editingValue)}
                          onKeyDown={(e) => handleInlineKeyDown(e, 'entrega_lugar')}
                          className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-indigo-500 rounded-lg outline-none"
                          placeholder="Lugar de entrega / destino..."
                        />
                      ) : (
                        <p
                          onDoubleClick={() => handleStartEdit('entrega_lugar', data.entrega_lugar || "Almacén Central - V&C Corporation")}
                          className={`text-xs font-bold text-slate-800 truncate leading-snug flex items-center justify-between ${
                            isEditable ? "cursor-pointer hover:bg-white hover:ring-1 hover:ring-indigo-300 rounded px-1 py-0.5 transition-all group" : ""
                          }`}
                          title={isEditable ? "Doble clic para editar lugar de entrega" : undefined}
                        >
                          <span className="truncate">{data.entrega_lugar || "Almacén Central - V&C Corporation"}</span>
                          {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Responsable y Modalidad */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-wider">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>Responsable</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-800 truncate">{data.nombre || ""}</p>
                    </div>

                    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-wider">
                        <Truck className="w-3 h-3 text-slate-500" />
                        <span>Modalidad</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-800 truncate">Por Proveedor</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tiempo Entrega Footer */}
              <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[10px] font-bold text-indigo-900 uppercase">Tiempo Entrega:</span>
                </div>
                {editingField === 'tiempo_entrega' ? (
                  <input
                    type="text"
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={() => handleSaveEdit('tiempo_entrega', editingValue)}
                    onKeyDown={(e) => handleInlineKeyDown(e, 'tiempo_entrega')}
                    className="px-2 py-0.5 text-xs font-black text-indigo-700 uppercase bg-white border-2 border-indigo-500 rounded-lg outline-none max-w-[150px]"
                    placeholder="Ej. 48 horas..."
                  />
                ) : (
                  <span
                    onDoubleClick={() => handleStartEdit('tiempo_entrega', data.tiempo_entrega || "")}
                    className={`text-xs font-black text-indigo-700 uppercase flex items-center gap-1 ${
                      isEditable ? "cursor-pointer hover:bg-white/90 hover:ring-1 hover:ring-indigo-300 rounded px-1.5 py-0.5 transition-all group" : ""
                    }`}
                    title={isEditable ? "Doble clic para editar tiempo de entrega" : undefined}
                  >
                    <span>{data.tiempo_entrega || "No especificado"}</span>
                    {isEditable && <Edit2 className="w-2.5 h-2.5 text-indigo-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                  </span>
                )}
              </div>
            </div>

            {/* 5. DISTRIBUCIÓN PRESUPUESTAL */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                        5. Distribución Presupuestal
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
                        Asignación por Proyecto
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Proyecto Asignado */}
                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Proyecto / Cuenta</span>
                      <p className="text-xs font-black text-indigo-700 truncate">{data.codigo || "PREVIO TEST GENERAL"}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded-md border border-indigo-100">
                      {data.area || "Operaciones"}
                    </span>
                  </div>

                  {/* Barra de Ejecución */}
                  <div className="space-y-1.5 bg-slate-50/40 p-2.5 rounded-2xl border border-slate-100/60">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-600 uppercase">Ejecución Presupuesto:</span>
                      <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">68% Utilizado</span>
                    </div>
                    <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: "68%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de Totales */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50/40 border border-emerald-100/80 rounded-2xl p-2.5 space-y-0.5">
                  <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">Total Partidas</span>
                  <p className="text-xs font-black text-emerald-700">{currencySymbol} {subtotalCalculado.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Moneda Base</span>
                  <p className="text-xs font-black text-slate-800">{isDolares ? "USD ($)" : "PEN (S/.)"}</p>
                </div>
              </div>
            </div>

            {/* 6. RESUMEN ECONÓMICO */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                        6. Resumen Económico
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
                        Totales e Impuestos
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {isDolares ? "USD ($)" : "PEN (S/.)"}
                  </span>
                </div>

                {data?.presupuesto_info && (
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-2.5 flex items-center justify-between text-xs mb-3">
                    <span className="font-black text-emerald-800 uppercase tracking-wider text-[10px]">
                      Partida: {data.presupuesto_info.categoria_nombre}
                    </span>
                    <span className="font-bold text-slate-600 text-[11px]">
                      Disponible máx: <b className="text-emerald-700 font-black">${Number(data.presupuesto_info.disponible_maximo || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>
                    </span>
                  </div>
                )}

                <div className="space-y-1.5 text-xs bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-[11px] font-bold">Tipo de Cambio:</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">S/. {tc.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-[11px] font-bold">Subtotal:</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{currencySymbol} {subtotalCalculado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-[11px] font-bold">IGV (18%):</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{currencySymbol} {igvCalculado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* TOTAL DESTACADO */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-3.5 rounded-2xl space-y-1 shadow-md shadow-slate-900/10 border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    Total de la Orden
                  </span>
                  <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-black text-emerald-300 uppercase">
                    {isDolares ? "USD" : "PEN"}
                  </span>
                </div>
                <div className="text-xl font-black tracking-tight text-emerald-400 font-mono">
                  {currencySymbol} {totalCalculado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400 pt-1.5 border-t border-white/10 flex justify-between items-center">
                  <span>Equiv. en {isDolares ? "PEN:" : "USD:"}</span>
                  <span className="font-mono font-bold text-white">
                    {isDolares ? `S/. ${totalPEN.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$ ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* 9. HISTORIAL Y BITÁCORA DE ACTIVIDAD */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  9. Historial de Actividad
                </span>
              </div>

              {/* Tabs de Filtro */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {["todos", "cambios", "aprobaciones"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveHistoryTab(tab)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${activeHistoryTab === tab ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3 pl-2 text-xs">
              <div className="flex items-start gap-3 relative before:absolute before:left-2 before:top-4 before:bottom-0 before:w-0.5 before:bg-slate-100">
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs shrink-0 mt-0.5 z-10" />
                <div className="flex-1 pb-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800">Creación de Solicitud de Orden</p>
                    <span className="text-[10px] text-slate-400 font-medium">{formatDateDMY(data.fecha)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Registrado por {data.nombre || data.regus || "Sistema"}</p>
                </div>
              </div>

              {isApproved && (
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow-xs shrink-0 mt-0.5 z-10" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800">Aprobación / Atención Confirmada</p>
                      <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Completado</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Estado actualizado a {data.estado_nombre}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA (30% SIDEBAR) */}
        <div className="w-full xl:w-4/12 space-y-6">
          
          {/* ASISTENTE IA / INTELIGENCIA */}
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
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tight block -mt-0.5">
                    Sugerencias Inteligentes
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full uppercase border border-emerald-200">
                SIGECOM AI
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Item 1: Análisis de Precios */}
              <div className="bg-white p-3.5 rounded-2xl border border-purple-100/90 shadow-xs space-y-1.5 hover:border-purple-200 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-xs text-slate-900">Análisis de precios</span>
                </div>
                <p className="text-[11px] text-slate-600 font-normal leading-relaxed pl-8">
                  Los costos cotizados se encuentran dentro del rango histórico del proyecto.
                </p>
                <div className="pl-8 pt-0.5">
                  <span className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer">
                    Ver detalle →
                  </span>
                </div>
              </div>

              {/* Item 2: Proveedor Recomendado */}
              <div className="bg-white p-3.5 rounded-2xl border border-purple-100/90 shadow-xs space-y-1.5 hover:border-purple-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">Proveedor recomendado</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black border border-emerald-200">
                    95% cumplimiento
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-normal leading-relaxed pl-8">
                  {data.empresa ? `${data.empresa} cuenta con excelente índice de cumplimiento en órdenes anteriores.` : "Seleccione un proveedor para ver estadísticas."}
                </p>
                <div className="pl-8 pt-0.5 text-[10px] text-slate-400 font-medium">
                  Última orden: {formatDateDMY(data.fecha)}
                </div>
              </div>

              {/* Item 3: Validación Presupuestal */}
              <div className="bg-white p-3.5 rounded-2xl border border-purple-100/90 shadow-xs space-y-1.5 hover:border-purple-200 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-xs text-slate-900">Validación presupuestal</span>
                </div>
                <p className="text-[11px] text-slate-600 font-normal leading-relaxed pl-8">
                  La orden está respaldada dentro del presupuesto y disponibilidad del proyecto.
                </p>
                <div className="pl-8 pt-0.5">
                  <span className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer">
                    Ver detalle →
                  </span>
                </div>
              </div>

              {/* Enlace ver más */}
              <div className="text-right pt-1">
                <span className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer">
                  Ver más recomendaciones →
                </span>
              </div>
            </div>
          </div>

          {/* 7. FLUJO DE APROBACIÓN (STEPPER) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  7. Flujo de Aprobación
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase">
                {isApproved ? "Completado" : "En Proceso"}
              </span>
            </div>

            {/* Stepper */}
            <div className="space-y-4 text-xs">
              {/* Paso 1 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">1. Creada y Solicitada</p>
                  <p className="text-[10px] text-slate-400">Por {data.nombre || "Usuario"} • {formatDateDMY(data.fecha)}</p>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${isApproved ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white animate-pulse"}`}>
                  {isApproved ? <Check className="w-3.5 h-3.5" /> : "2"}
                </div>
                <div>
                  <p className="font-bold text-slate-800">2. Revisión de Compras</p>
                  <p className="text-[10px] text-slate-400">{isApproved ? "Revisado conforme" : "En evaluación técnica y comercial"}</p>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${isApproved ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {isApproved ? <Check className="w-3.5 h-3.5" /> : "3"}
                </div>
                <div>
                  <p className="font-bold text-slate-800">3. Aprobación y Atención</p>
                  <p className="text-[10px] text-slate-400">{isApproved ? "Atendido exitosamente" : "Pendiente de confirmación"}</p>
                </div>
              </div>

              {/* Paso 4 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                  4
                </div>
                <div>
                  <p className="font-bold text-slate-500">4. Liquidación y Cierre</p>
                  <p className="text-[10px] text-slate-400">Recepción en obra / almacén</p>
                </div>
              </div>
            </div>
          </div>

          {/* 8. DOCUMENTOS RELACIONADOS */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                  <Paperclip className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  8. Documentos Relacionados
                </span>
              </div>
              <button onClick={() => toast.info("Función de adjuntar documento")} className="text-[10px] font-bold text-emerald-600 hover:underline uppercase">
                + Adjuntar
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {data.codigo && (
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100/60 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <div>
                      <p className="font-bold text-slate-800 text-[11px]">Cotización {data.codigo}</p>
                      <p className="text-[9px] text-slate-400">Expediente principal</p>
                    </div>
                  </div>
                  <button className="p-1 rounded-lg text-slate-400 hover:text-indigo-600">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="font-bold text-slate-800 text-[11px]">Partidas_Orden_{data.id_registro || realId}.xlsx</p>
                    <p className="text-[9px] text-slate-400">Hoja de cálculo generada</p>
                  </div>
                </div>
                <button className="p-1 rounded-lg text-slate-400 hover:text-emerald-600">
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

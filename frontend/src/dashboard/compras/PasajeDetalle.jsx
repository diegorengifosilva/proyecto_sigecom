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
  Link as LinkIcon,
  ChevronDown,
  Building2,
  Mail,
  FileText,
  AlertTriangle,
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
  Plane,
  Bus,
  Users,
  Sparkles,
  Layers,
  Info,
  MoreHorizontal,
  Navigation,
  Compass,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import EmpresaTransporteAutocomplete from "@/components/compras/EmpresaTransporteAutocomplete";
import DniUsuarioAutocomplete from "@/components/compras/DniUsuarioAutocomplete";

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

// Formateador para input datetime-local: YYYY-MM-DDTHH:mm
const toInputDateTime = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return String(dateStr).substring(0, 16);
    }
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
};

export default function PasajeDetalle({ idPasaje }) {
  const navigate = useNavigate();
  const { id, id_pasaje } = useParams();
  const queryClient = useQueryClient();
  const { setCustomBreadcrumbs, setBreadcrumbOverride } = useOutletContext() || {};

  const realId = idPasaje || id_pasaje || id;

  // Estado para edición inline de campos de cabecera/itinerario
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  // Estado para edición y adición de pasajeros
  const [editingPasajeroId, setEditingPasajeroId] = useState(null);
  const [editPasajeroForm, setEditPasajeroForm] = useState({ dni: "", nombre: "", observacion: "", id_usuario: null });

  const [newDniPasajero, setNewDniPasajero] = useState("");
  const [newNombrePasajero, setNewNombrePasajero] = useState("");
  const [newObservacionPasajero, setNewObservacionPasajero] = useState("");
  const [newIdUsuarioPasajero, setNewIdUsuarioPasajero] = useState(null);

  const inputDniRef = useRef(null);
  const inputNombreRef = useRef(null);
  const inputObsRef = useRef(null);

  // Tab activo en historial
  const [activeHistoryTab, setActiveHistoryTab] = useState("todos");
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Carga de datos de la solicitud de pasaje
  const { data, isLoading, error } = useQuery({
    queryKey: ["pasajeDetalle", realId],
    queryFn: async () => {
      const res = await api.get(`/compras/pasajes/${realId}/`);
      return res.data;
    },
    enabled: !!realId,
  });

  // Identificación de estados y modo de edición
  const estadoId = Number(data?.id_estado?.id_estado ?? data?.id_estado ?? 99);
  const estadoStr = String(data?.estado_nombre || "Pendiente").toUpperCase();
  const isEditable = estadoId === 0 || estadoStr.includes("PENDIENTE DE ENVIO") || estadoStr.includes("PENDIENTE DE ENVÍO");
  const isEnviado = estadoId === 1 || estadoStr.includes("ENVIADO, PENDIENTE");
  const isAtendido = estadoId === 2 || estadoStr.includes("ATENDIDO, PENDIENTE");
  const isApproved = estadoStr.includes("APROBADA") || estadoStr.includes("LIQUIDACION APROBADA") || estadoStr.includes("ATENDIDO");

  // ID numérico directo (ej: 20260330)
  const directId = useMemo(() => {
    if (!data && !realId) return "";
    if (data?.id_registro_directo) return String(data.id_registro_directo);
    if (data?.id_pasaje) return String(data.id_pasaje);
    const regStr = String(data?.id_registro || realId || "");
    return regStr.includes("_") ? regStr.split("_")[1] : regStr;
  }, [data, realId]);

  // Breadcrumbs ejecutivos sincronizados
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
        label: `PASAJE ${displayNro}`
      });

      if (setCustomBreadcrumbs) setCustomBreadcrumbs(crumbs);
    }
  }, [data, directId, setCustomBreadcrumbs, setBreadcrumbOverride]);

  // Funciones para edición en línea (doble clic)
  const handleStartEdit = (field, currentValue) => {
    if (!isEditable) {
      toast.info("La solicitud solo puede editarse cuando está en estado PENDIENTE DE ENVÍO.");
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
    let value = valueOverride !== undefined ? valueOverride : editingValue;

    if (field === 'monto_dolares' || field === 'monto_soles') {
      const tc = Number(data?.tipo_cambio || 3.75) || 3.75;
      const maxUSD = Number(data?.presupuesto_info?.disponible_maximo);
      if (!isNaN(maxUSD) && maxUSD >= 0) {
        const maxPEN = maxUSD * tc;
        if (field === 'monto_dolares') {
          const numVal = parseFloat(value) || 0;
          if (numVal > maxUSD + 0.009) {
            toast.warning(`El monto ingresado ($${numVal.toFixed(2)}) excede el saldo disponible ($${maxUSD.toFixed(2)}). Se ajustó al máximo permitido.`);
            value = maxUSD.toFixed(2);
          }
        } else if (field === 'monto_soles') {
          const numVal = parseFloat(value) || 0;
          if (numVal > maxPEN + 0.009) {
            toast.warning(`El monto ingresado (S/ ${numVal.toFixed(2)}) excede el saldo disponible (S/ ${maxPEN.toFixed(2)} / $${maxUSD.toFixed(2)}). Se ajustó al máximo permitido.`);
            value = maxPEN.toFixed(2);
          }
        }
      }
    }

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

  // Lista de pasajeros
  const pasajeros = useMemo(() => {
    if (!data) return [];
    return data.detalles || [];
  }, [data]);

  // Mutaciones de la solicitud de pasaje
  const editFieldMutation = useMutation({
    mutationFn: async (updatedFields) => {
      const res = await api.put(`/compras/pasajes/${realId}/editar/`, updatedFields);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Campo actualizado con éxito.");
      queryClient.invalidateQueries(["pasajeDetalle", realId]);
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
      const res = await api.post(`/compras/pasajes/${realId}/enviar/`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Solicitud de pasaje enviada con éxito.");
      queryClient.invalidateQueries(["pasajeDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
      queryClient.invalidateQueries(["listaLiquidaciones"]);
      queryClient.invalidateQueries(["compras-programacion"]);
      queryClient.invalidateQueries(["programacionDetalle"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al enviar solicitud de pasaje.");
    },
  });

  const revertirMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/compras/pasajes/${realId}/revertir/`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Solicitud retornada a PENDIENTE DE ENVÍO para edición.");
      queryClient.invalidateQueries(["pasajeDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
      queryClient.invalidateQueries(["listaLiquidaciones"]);
      queryClient.invalidateQueries(["compras-programacion"]);
      queryClient.invalidateQueries(["programacionDetalle"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al revertir la solicitud.");
    },
  });

  const atenderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/compras/pasajes/${realId}/atender/`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Pasaje atendido con éxito.");
      queryClient.invalidateQueries(["pasajeDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
      queryClient.invalidateQueries(["listaLiquidaciones"]);
      queryClient.invalidateQueries(["compras-programacion"]);
      queryClient.invalidateQueries(["programacionDetalle"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al atender pasaje.");
    },
  });

  const anularMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/compras/pasajes/${realId}/anular/`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Solicitud anulada con éxito.");
      queryClient.invalidateQueries(["pasajeDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
      queryClient.invalidateQueries(["listaLiquidaciones"]);
      queryClient.invalidateQueries(["compras-programacion"]);
      queryClient.invalidateQueries(["programacionDetalle"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al anular pasaje.");
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/compras/pasajes/${realId}/eliminar/`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData?.message || "Solicitud eliminada con éxito.");
      const aperturaId = resData?.id_apertura || data?.id_apertura;
      queryClient.invalidateQueries(["pasajeDetalle", realId]);
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
      toast.error(err.response?.data?.error || err.message || "Error al eliminar pasaje.");
    },
  });

  // Mutaciones de Pasajeros
  const addPasajeroMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/compras/pasajes/${realId}/pasajeros/agregar/`, payload);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Pasajero agregado con éxito.");
      setNewDniPasajero("");
      setNewNombrePasajero("");
      setNewObservacionPasajero("");
      setNewIdUsuarioPasajero(null);
      setTimeout(() => {
        if (inputDniRef.current) {
          inputDniRef.current.value = "";
          inputDniRef.current.focus();
        }
        if (inputNombreRef.current) {
          inputNombreRef.current.value = "";
        }
        if (inputObsRef.current) {
          inputObsRef.current.value = "";
        }
      }, 20);
      queryClient.invalidateQueries(["pasajeDetalle", realId]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al agregar pasajero.");
    },
  });

  const editPasajeroMutation = useMutation({
    mutationFn: async ({ idDetalle, payload }) => {
      const res = await api.put(`/compras/pasajes/pasajeros/${idDetalle}/editar/`, payload);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Pasajero actualizado con éxito.");
      setEditingPasajeroId(null);
      queryClient.invalidateQueries(["pasajeDetalle", realId]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al actualizar pasajero.");
    },
  });

  const deletePasajeroMutation = useMutation({
    mutationFn: async (idDetalle) => {
      const res = await api.delete(`/compras/pasajes/pasajeros/${idDetalle}/eliminar/`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Pasajero eliminado.");
      queryClient.invalidateQueries(["pasajeDetalle", realId]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || "Error al eliminar pasajero.");
    },
  });

  const handleAddPasajero = () => {
    if (!newNombrePasajero.trim() && !newDniPasajero.trim()) {
      toast.warning("Debe ingresar al menos el DNI o el nombre del pasajero.");
      return;
    }
    addPasajeroMutation.mutate({
      dni: newDniPasajero.trim(),
      nombre: newNombrePasajero.trim(),
      observacion: newObservacionPasajero.trim(),
      id_usuario: newIdUsuarioPasajero || null,
    });
  };

  const handleStartEditPasajero = (p) => {
    setEditingPasajeroId(p.id_detalle);
    setEditPasajeroForm({
      dni: p.dni || p.dni_usuario || "",
      nombre: p.nombre || p.nombre_usuario || p.nombre_especial || "",
      observacion: p.observacion || "",
      id_usuario: p.id_usuario || null,
    });
  };

  const handleSavePasajeroEdit = (idDetalle) => {
    if (!editPasajeroForm.nombre.trim() && !editPasajeroForm.dni.trim()) {
      toast.warning("Debe ingresar un nombre o DNI.");
      return;
    }
    editPasajeroMutation.mutate({
      idDetalle,
      payload: {
        dni: editPasajeroForm.dni.trim(),
        nombre: editPasajeroForm.nombre.trim(),
        observacion: editPasajeroForm.observacion.trim(),
        id_usuario: editPasajeroForm.id_usuario || null,
      }
    });
  };

  const handleEditPasajeroKeyDown = (e, idDetalle) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSavePasajeroEdit(idDetalle);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingPasajeroId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[450px] flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-100 shadow-sm font-sans">
        <Loader className="w-9 h-9 text-sky-600 animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Cargando Detalle del Pasaje...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center space-y-4 bg-red-50/50 rounded-3xl border border-red-100 text-center font-sans">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <div>
          <h3 className="text-sm font-black text-red-950 uppercase tracking-wider mb-1">Error de Carga</h3>
          <p className="text-xs font-semibold text-red-700">{error?.message || "No se pudieron obtener los datos de la solicitud de pasaje."}</p>
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
  const tc = Number(data.tipo_cambio || 3.3630);
  const isDolares = data.tipo_moneda === "D";
  const currencySymbol = isDolares ? "$" : "S/.";
  const montoUSD = Number(data.monto_dolares || (tc > 0 ? Number(data.monto_soles || 0) / tc : 0));
  const montoPEN = Number(data.monto_soles || (Number(data.monto_dolares || 0) * tc));

  const isAereo = String(data.transporte || "").toUpperCase() === "A" || String(data.transporte_nombre || "").toUpperCase().includes("AEREO");

  // Estado y badges
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

  // Avatar con iniciales de la aerolínea/empresa
  const getInitials = (name) => {
    if (!name) return "PS";
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
              className="p-2.5 bg-slate-50 hover:bg-sky-50 rounded-2xl text-slate-400 hover:text-sky-600 border border-slate-200/60 transition-all group shrink-0"
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
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border flex items-center gap-1.5 ${
                  isAereo ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {isAereo ? <Plane className="w-3 h-3 text-sky-600" /> : <Bus className="w-3 h-3 text-amber-600" />}
                  <span>{isAereo ? "Pasaje Aéreo" : "Pasaje Terrestre"}</span>
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-sky-50/70 border border-sky-100 text-sky-700 font-black text-[10px] uppercase tracking-wider">
                    CONCEPTO
                  </span>
                  {editingField === 'concepto' ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('concepto', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'concepto')}
                      className="px-2.5 py-1 text-sm font-black text-slate-800 bg-white border-2 border-sky-500 rounded-xl shadow-md outline-none min-w-[220px]"
                      placeholder="Concepto del gasto..."
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => handleStartEdit('concepto', data.concepto || "")}
                      className={`text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5 ${
                        isEditable ? "cursor-pointer hover:text-sky-600 hover:bg-slate-50 px-2 py-1 rounded-xl border border-dashed border-transparent hover:border-sky-300 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar concepto" : undefined}
                    >
                      <span>
                        {data.concepto || "Pasaje Aéreo / Terrestre"}
                      </span>
                      {isEditable && <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </span>
                  )}
                </div>

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
                      onBlur={() => handleSaveEdit('observacion', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'observacion')}
                      className="px-2.5 py-1 text-sm font-semibold text-slate-800 bg-white border-2 border-amber-500 rounded-xl shadow-md outline-none min-w-[240px]"
                      placeholder="Observaciones..."
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => handleStartEdit('observacion', data.observacion || "")}
                      className={`text-xs font-semibold text-slate-600 flex items-center gap-1.5 ${
                        isEditable ? "cursor-pointer hover:text-amber-700 hover:bg-amber-50/50 px-2 py-1 rounded-xl border border-dashed border-transparent hover:border-amber-300 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar observación" : undefined}
                    >
                      <span>
                        {data.observacion || (isEditable ? "Sin observación (Doble clic para añadir)" : "Sin observaciones")}
                      </span>
                      {isEditable && <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN SUPERIORES */}
          <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center">
            
            {/* Imprimir PDF */}
            <button
              onClick={() => toast.info("Generando reporte PDF de la Solicitud de Pasaje...")}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Imprimir
            </button>

            {/* Enviar Correo */}
            <button
              onClick={() => toast.info("Preparando envío de correo de la solicitud...")}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              Enviar
            </button>

            {/* SI ESTÁ EN PENDIENTE DE ENVÍO: BOTÓN ENVIAR ORDEN */}
            {isEditable && (
              <button
                onClick={() => {
                  if (window.confirm("¿Confirmar envío de la solicitud de pasajes? Al enviarla, los campos quedarán bloqueados para edición.")) {
                    enviarMutation.mutate();
                  }
                }}
                disabled={enviarMutation.isLoading}
                className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-sky-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Enviar solicitud para atención de pasajes"
              >
                {enviarMutation.isLoading ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Enviar Solicitud</span>
              </button>
            )}

            {/* SI ESTÁ ENVIADO: BOTÓN REVERTIR PARA EDICIÓN */}
            {isEnviado && (
              <button
                onClick={() => {
                  if (window.confirm("¿Confirmar retornar esta solicitud al estado PENDIENTE DE ENVÍO para corregir o modificar datos?")) {
                    revertirMutation.mutate();
                  }
                }}
                disabled={revertirMutation.isLoading}
                className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-800 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                title="Retornar a Pendiente de Envío para modificar datos"
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
            {(isEnviado || estadoId === 1) && (
              <button
                onClick={() => {
                  if (window.confirm("¿Confirmar que esta solicitud de pasajes ha sido atendida? Pasará al estado ATENDIDO, PENDIENTE DE LIQUIDACIÓN.")) {
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
                    Anular Solicitud
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreActions(false);
                      if (window.confirm("¿Está seguro de eliminar esta solicitud de pasajes? Esta acción no se puede deshacer.")) {
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

        {/* METADATOS COMPACTOS CON FECHAS EN FORMATO DD/MM/YYYY */}
        <div className="px-6 py-3 bg-slate-50/60 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 border-t border-slate-100/80">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-bold text-slate-600 uppercase text-[10px]">Solicitante:</span>
            <span className="font-black text-slate-800">{data.nombre || data.regus || "No Definido"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
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
              className="font-black text-sky-700 underline cursor-pointer" 
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
          
          {/* FILA 1: 1. AEROLÍNEA & 2. ITINERARIO (2 TARJETAS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. TARJETA AEROLÍNEA / EMPRESA DE TRANSPORTE */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-sky-50 text-sky-600">
                    {isAereo ? <Plane className="w-4 h-4" /> : <Bus className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    1. Empresa de Transporte / Modalidad
                  </span>
                </div>
              </div>

              {/* Información Empresa / Aerolínea */}
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-500 text-white font-black text-sm flex items-center justify-center shadow-md shadow-sky-600/20 shrink-0">
                  {getInitials(data.empresa)}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  {editingField === 'empresa' ? (
                    <div className="w-full">
                      <EmpresaTransporteAutocomplete
                        tipo={data.transporte || "A"}
                        value={editingValue}
                        autoFocus={true}
                        inline={true}
                        placeholder={isAereo ? "Buscar aerolínea o escribir nombre..." : "Buscar empresa de transporte o escribir nombre..."}
                        inputClassName="w-full px-2.5 py-1 text-sm font-black text-slate-900 uppercase bg-white border-2 border-sky-500 rounded-xl shadow-md outline-none"
                        onChange={(val) => setEditingValue(val)}
                        onSelect={(item) => {
                          setEditingValue(item.nombre);
                          editFieldMutation.mutate({
                            id_empresa: item.id_empresa || null,
                            empresa: item.nombre
                          });
                          setEditingField(null);
                        }}
                        onEnter={(val) => handleSaveEdit('empresa', val)}
                        onEscape={() => handleCancelEdit()}
                        onBlurCustom={(val) => {
                          if (val && val !== data.empresa) {
                            handleSaveEdit('empresa', val);
                          } else {
                            handleCancelEdit();
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <h3
                      onDoubleClick={() => handleStartEdit('empresa', data.empresa || "")}
                      className={`font-black text-slate-900 text-sm uppercase leading-tight flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-sky-300 rounded px-1.5 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar aerolínea/empresa" : undefined}
                    >
                      <span className="truncate">{data.empresa || "AEROLÍNEA NO REGISTRADA"}</span>
                      {isEditable && <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />}
                    </h3>
                  )}

                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{data.concepto || "Pasaje Aéreo / Terrestre"}</span>
                  </p>
                  {data.observacion && (
                    <p className="text-[11px] text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/60 font-medium inline-flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold uppercase text-[9px] text-amber-800">Obs:</span>
                      <span>{data.observacion}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Modalidad y Tipo de Transporte */}
              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Modalidad de Emisión
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Transporte</span>
                    {editingField === 'transporte' ? (
                      <select
                        autoFocus
                        value={editingValue}
                        onChange={(e) => {
                          setEditingValue(e.target.value);
                          handleSaveEdit('transporte', e.target.value);
                        }}
                        onBlur={() => handleSaveEdit('transporte', editingValue)}
                        onKeyDown={(e) => handleInlineKeyDown(e, 'transporte')}
                        className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-sky-500 rounded-lg outline-none"
                      >
                        <option value="A">Aéreo</option>
                        <option value="T">Terrestre</option>
                      </select>
                    ) : (
                      <p
                        onDoubleClick={() => handleStartEdit('transporte', data.transporte || "A")}
                        className={`font-black text-slate-800 flex items-center justify-between ${
                          isEditable ? "cursor-pointer hover:bg-white hover:ring-1 hover:ring-sky-300 rounded px-1 py-0.5 transition-all group" : ""
                        }`}
                        title={isEditable ? "Doble clic para cambiar transporte" : undefined}
                      >
                        <span>{data.transporte_nombre || (isAereo ? "Aéreo" : "Terrestre")}</span>
                        {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Modo de Viaje</span>
                    {editingField === 'modo' ? (
                      <select
                        autoFocus
                        value={editingValue}
                        onChange={(e) => {
                          setEditingValue(e.target.value);
                          handleSaveEdit('modo', e.target.value);
                        }}
                        onBlur={() => handleSaveEdit('modo', editingValue)}
                        onKeyDown={(e) => handleInlineKeyDown(e, 'modo')}
                        className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-sky-500 rounded-lg outline-none"
                      >
                        <option value="1">Solo Ida</option>
                        <option value="2">Retorno</option>
                        <option value="3">Ida y Vuelta</option>
                      </select>
                    ) : (
                      <p
                        onDoubleClick={() => handleStartEdit('modo', data.modo || 2)}
                        className={`font-black text-slate-800 flex items-center justify-between ${
                          isEditable ? "cursor-pointer hover:bg-white hover:ring-1 hover:ring-sky-300 rounded px-1 py-0.5 transition-all group" : ""
                        }`}
                        title={isEditable ? "Doble clic para cambiar modo de viaje" : undefined}
                      >
                        <span>{data.modo_nombre || (data.modo === 2 ? "Retorno" : "Solo Ida")}</span>
                        {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. INFORMACIÓN DEL ITINERARIO & MONEDA */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Compass className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    2. Itinerario y Moneda
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  REGISTRO: {directId}
                </span>
              </div>

              {data?.presupuesto_info && (
                <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                  <span className="font-black text-sky-800 uppercase tracking-wider text-[10px]">
                    Partida: {data.presupuesto_info.categoria_nombre}
                  </span>
                  <span className="font-bold text-slate-600 text-[11px]">
                    Disponible máx: <b className="text-emerald-700 font-black">${Number(data.presupuesto_info.disponible_maximo || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                {/* 1. Origen (lugar_origen) */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Origen</span>
                  {editingField === 'lugar_origen' ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('lugar_origen', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'lugar_origen')}
                      className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-sky-500 rounded-lg outline-none uppercase"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('lugar_origen', data.lugar_origen || "")}
                      className={`font-black text-slate-800 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-sky-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar lugar de origen" : undefined}
                    >
                      <span>{data.lugar_origen || "NO DEFINIDO"}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>

                {/* 5. Destino (lugar_destino) */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Destino</span>
                  {editingField === 'lugar_destino' ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('lugar_destino', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'lugar_destino')}
                      className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-sky-500 rounded-lg outline-none uppercase"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('lugar_destino', data.lugar_destino || "")}
                      className={`font-black text-slate-800 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-sky-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar lugar de destino" : undefined}
                    >
                      <span>{data.lugar_destino || "NO DEFINIDO"}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>

                {/* 2. Fecha Salida (fecha_salida) */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Fecha Salida</span>
                  {editingField === 'fecha_salida' ? (
                    <input
                      type="datetime-local"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('fecha_salida', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'fecha_salida')}
                      className="w-full px-1.5 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-sky-500 rounded-lg outline-none"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('fecha_salida', toInputDateTime(data.fecha_salida))}
                      className={`font-black text-slate-800 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-sky-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar fecha y hora de salida" : undefined}
                    >
                      <span>{formatDateDMY(data.fecha_salida, true)}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>

                {/* 6. Fecha Retorno (fecha_retorno) */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Fecha Retorno</span>
                  {editingField === 'fecha_retorno' ? (
                    <input
                      type="datetime-local"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('fecha_retorno', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'fecha_retorno')}
                      className="w-full px-1.5 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-sky-500 rounded-lg outline-none"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('fecha_retorno', toInputDateTime(data.fecha_retorno))}
                      className={`font-black text-slate-800 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-sky-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar fecha y hora de retorno" : undefined}
                    >
                      <span>{data.fecha_retorno ? formatDateDMY(data.fecha_retorno, true) : "Sin retorno"}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>

                {/* 3. Moneda (tipo_moneda) */}
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
                      className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-sky-500 rounded-lg outline-none"
                    >
                      <option value="D">Dólares ($ USD)</option>
                      <option value="S">Soles (S/ PEN)</option>
                    </select>
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('tipo_moneda', data.tipo_moneda || "D")}
                      className={`font-black text-emerald-700 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-sky-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para cambiar moneda (Dólares/Soles)" : undefined}
                    >
                      <span>{isDolares ? "Dólares ($ USD)" : "Soles (S/ PEN)"}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>

                {/* 7. Tipo de Cambio (tipo_cambio) */}
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
                      className="w-full px-2 py-0.5 text-xs font-bold text-slate-800 bg-white border-2 border-sky-500 rounded-lg outline-none"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('tipo_cambio', tc)}
                      className={`font-black text-slate-800 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-slate-50 hover:ring-1 hover:ring-sky-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar tipo de cambio" : undefined}
                    >
                      <span>S/. {tc.toFixed(4)}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>

                {/* 4. Monto Soles (monto_soles) */}
                <div className="space-y-0.5 bg-slate-50/80 p-2 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Monto Soles</span>
                  {editingField === 'monto_soles' ? (
                    <input
                      type="number"
                      step="0.01"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('monto_soles', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'monto_soles')}
                      className="w-full px-2 py-0.5 text-xs font-black text-slate-800 bg-white border-2 border-sky-500 rounded-lg outline-none"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('monto_soles', data.monto_soles || 0)}
                      className={`text-xs font-black text-slate-800 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-white hover:ring-1 hover:ring-sky-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar monto en soles" : undefined}
                    >
                      <span>S/. {montoPEN.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>

                {/* 8. Monto Dolares (monto_dolares) */}
                <div className="space-y-0.5 bg-emerald-50/40 p-2 rounded-2xl border border-emerald-100">
                  <span className="text-[9px] font-bold text-emerald-700 uppercase block">Monto Dólares</span>
                  {editingField === 'monto_dolares' ? (
                    <input
                      type="number"
                      step="0.01"
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleSaveEdit('monto_dolares', editingValue)}
                      onKeyDown={(e) => handleInlineKeyDown(e, 'monto_dolares')}
                      className="w-full px-2 py-0.5 text-xs font-black text-emerald-800 bg-white border-2 border-sky-500 rounded-lg outline-none"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => handleStartEdit('monto_dolares', data.monto_dolares || 0)}
                      className={`text-xs font-black text-emerald-700 flex items-center justify-between ${
                        isEditable ? "cursor-pointer hover:bg-white hover:ring-1 hover:ring-sky-300 rounded px-1 py-0.5 transition-all group" : ""
                      }`}
                      title={isEditable ? "Doble clic para editar monto en dólares" : undefined}
                    >
                      <span>$ {montoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      {isEditable && <Edit2 className="w-2.5 h-2.5 text-emerald-400 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* 3. TABLA DE PASAJEROS (DETALLE) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
            
            {/* Header de la Tabla */}
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    3. Lista de Pasajeros de la Solicitud
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {pasajeros.length} pasajero(s) registrado(s) para este itinerario
                  </p>
                </div>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/60">
                    <th className="py-3 px-4 text-center w-12">N°</th>
                    <th className="py-3 px-4 w-36 text-center">DNI</th>
                    <th className="py-3 px-4">Nombre Completo</th>
                    <th className="py-3 px-4">Observaciones</th>
                    <th className="py-3 px-4 text-center w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pasajeros.length === 0 && !isEditable && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                        No hay pasajeros registrados
                      </td>
                    </tr>
                  )}

                  {pasajeros.map((p, index) => {
                    const isEditing = editingPasajeroId === p.id_detalle;

                    if (isEditing) {
                      return (
                        <tr key={p.id_detalle} className="bg-sky-50/40">
                          <td className="py-2.5 px-4 text-center font-black text-sky-700">{index + 1}</td>
                          <td className="py-2.5 px-4">
                            <DniUsuarioAutocomplete
                              mode="dni"
                              value={editPasajeroForm.dni}
                              onChange={(val) => setEditPasajeroForm((prev) => ({ ...prev, dni: val }))}
                              onSelect={(user) => {
                                setEditPasajeroForm((prev) => ({
                                  ...prev,
                                  dni: user.dni || prev.dni,
                                  nombre: user.nombre_completo || prev.nombre,
                                  id_usuario: user.id_usuario || null,
                                }));
                              }}
                              placeholder="DNI..."
                              inputClassName="w-full px-2 py-1 bg-white border border-sky-300 rounded-lg text-xs font-mono font-bold"
                              onKeyDown={(e) => handleEditPasajeroKeyDown(e, p.id_detalle)}
                            />
                          </td>
                          <td className="py-2.5 px-4">
                            <DniUsuarioAutocomplete
                              mode="nombre"
                              value={editPasajeroForm.nombre}
                              onChange={(val) => setEditPasajeroForm((prev) => ({ ...prev, nombre: val }))}
                              onSelect={(user) => {
                                setEditPasajeroForm((prev) => ({
                                  ...prev,
                                  nombre: user.nombre_completo || prev.nombre,
                                  dni: user.dni || prev.dni,
                                  id_usuario: user.id_usuario || null,
                                }));
                              }}
                              placeholder="Nombre completo..."
                              inputClassName="w-full px-2 py-1 bg-white border border-sky-300 rounded-lg text-xs font-bold"
                              onKeyDown={(e) => handleEditPasajeroKeyDown(e, p.id_detalle)}
                            />
                          </td>
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              value={editPasajeroForm.observacion}
                              onChange={(e) => setEditPasajeroForm({ ...editPasajeroForm, observacion: e.target.value })}
                              onKeyDown={(e) => handleEditPasajeroKeyDown(e, p.id_detalle)}
                              className="w-full px-2 py-1 bg-white border border-sky-300 rounded-lg text-xs font-medium"
                              placeholder="Observación..."
                            />
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("¿Eliminar este pasajero de la solicitud?")) {
                                  deletePasajeroMutation.mutate(p.id_detalle);
                                }
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar Pasajero"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={p.id_detalle || index}
                        onDoubleClick={() => {
                          if (isEditable) {
                            handleStartEditPasajero(p);
                          }
                        }}
                        className={`hover:bg-slate-50/80 transition-colors ${isEditable ? "cursor-pointer group" : ""}`}
                        title={isEditable ? "Doble clic para editar pasajero (Enter para guardar, Esc para cancelar)" : undefined}
                      >
                        <td className="py-3 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sky-700">
                          {p.dni || p.dni_usuario || "-"}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {p.nombre_completo || p.nombre || p.nombre_usuario || p.nombre_especial || "Sin nombre"}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {p.observacion ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono border border-slate-200/80">
                              {p.observacion}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin observaciones</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isEditable ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("¿Eliminar este pasajero de la solicitud?")) {
                                  deletePasajeroMutation.mutate(p.id_detalle);
                                }
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar Pasajero"
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
                    <tr className="bg-sky-50/20 border-t border-dashed border-sky-200">
                      <td className="py-2.5 px-4 text-center font-black text-sky-600">+</td>
                      <td className="py-2.5 px-4">
                        <DniUsuarioAutocomplete
                          mode="dni"
                          value={newDniPasajero}
                          onChange={(val) => setNewDniPasajero(val)}
                          onSelect={(user) => {
                            setNewDniPasajero(user.dni || "");
                            setNewNombrePasajero(user.nombre_completo || "");
                            setNewIdUsuarioPasajero(user.id_usuario || null);
                            if (inputObsRef.current) {
                              inputObsRef.current.focus();
                            }
                          }}
                          placeholder="DNI..."
                          inputRef={inputDniRef}
                          inputClassName="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-hidden focus:border-sky-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddPasajero();
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <DniUsuarioAutocomplete
                          mode="nombre"
                          value={newNombrePasajero}
                          onChange={(val) => setNewNombrePasajero(val)}
                          onSelect={(user) => {
                            setNewNombrePasajero(user.nombre_completo || "");
                            setNewDniPasajero(user.dni || "");
                            setNewIdUsuarioPasajero(user.id_usuario || null);
                            if (inputObsRef.current) {
                              inputObsRef.current.focus();
                            }
                          }}
                          placeholder="Nombre completo del pasajero..."
                          inputRef={inputNombreRef}
                          inputClassName="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-hidden focus:border-sky-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddPasajero();
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          ref={inputObsRef}
                          type="text"
                          placeholder="Observaciones / código de reserva..."
                          value={newObservacionPasajero}
                          onChange={(e) => setNewObservacionPasajero(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddPasajero();
                          }}
                          className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-hidden focus:border-sky-500"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={handleAddPasajero}
                          disabled={addPasajeroMutation.isLoading}
                          className="p-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Agregar Pasajero (Enter)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer de la Tabla con Resumen */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <span className="font-bold text-slate-700">{pasajeros.length} Pasajero(s)</span>
                <span>•</span>
                <span>Ruta: {data.lugar_origen || "Origen"} <ArrowRight className="w-3 h-3 inline text-slate-400" /> {data.lugar_destino || "Destino"}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Total Solicitado:</span>
                <span className="font-black text-slate-900 text-sm">{currencySymbol} {(isDolares ? montoUSD : montoPEN).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

          </div>

          {/* FILA DE 3 TARJETAS: 4. CONDICIONES DE ENTREGA | 5. DISTRIBUCIÓN PRESUPUESTAL | 6. RESUMEN ECONÓMICO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 4. CONDICIONES DE DESPACHO Y LOGÍSTICA */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-100/80 flex items-center justify-center shrink-0">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                        4. Ruta y Despacho
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
                        Logística de Viaje
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white text-sky-600 border border-slate-200/60 shadow-2xs shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Trayecto Completo</span>
                      <p className="text-xs font-bold text-slate-800 truncate leading-snug">
                        {data.lugar_origen || "Origen"} ➔ {data.lugar_destino || "Destino"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-wider">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>Responsable</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-800 truncate">{data.nombre || data.regus || ""}</p>
                    </div>

                    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-wider">
                        {isAereo ? <Plane className="w-3 h-3 text-slate-500" /> : <Bus className="w-3 h-3 text-slate-500" />}
                        <span>Medio</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-800 truncate">{isAereo ? "Aéreo Comercial" : "Terrestre Interprovincial"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aerolínea y Modalidad Footer */}
              <div className="bg-sky-50/50 border border-sky-100/80 rounded-2xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span className="text-[10px] font-bold text-sky-900 uppercase">Salida:</span>
                </div>
                <span className="text-xs font-black text-sky-700 uppercase">
                  {formatDateDMY(data.fecha_salida, true)}
                </span>
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
                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Proyecto / Cuenta</span>
                      <p className="text-xs font-black text-sky-700 truncate">{data.codigo || "PROYECTO OPERACIONES"}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[9px] font-bold rounded-md border border-sky-100">
                      {data.area || "Operaciones"}
                    </span>
                  </div>

                  <div className="space-y-1.5 bg-slate-50/40 p-2.5 rounded-2xl border border-slate-100/60">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-600 uppercase">Ejecución Presupuesto:</span>
                      <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">45% Utilizado</span>
                    </div>
                    <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600 h-full rounded-full transition-all duration-500" style={{ width: "45%" }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-sky-50/40 border border-sky-100/80 rounded-2xl p-2.5 space-y-0.5">
                  <span className="text-[9px] font-bold text-sky-800 uppercase tracking-wider block">Pasajeros</span>
                  <p className="text-xs font-black text-sky-700">{pasajeros.length} persona(s)</p>
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
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                        6. Resumen Económico
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
                        Montos Equivalentes
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Total en Dólares (USD):</span>
                    <span className="font-black text-slate-900">$ {montoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Tipo de Cambio:</span>
                    <span className="font-mono font-bold text-slate-700">S/. {tc.toFixed(4)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Total en Soles:</span>
                    <span className="text-base font-black text-emerald-700">S/. {montoPEN.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
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
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tight block -mt-0.5">
                    Sugerencias de Viaje
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full uppercase border border-emerald-200">
                SIGECOM AI
              </span>
            </div>

            <div className="bg-white/80 p-3.5 rounded-2xl border border-[#E0D7FF] space-y-2 text-xs">
              <p className="font-bold text-slate-800 leading-snug">
                Itinerario de {data.lugar_origen || "Origen"} a {data.lugar_destino || "Destino"} registrado con {pasajeros.length} pasajero(s).
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Verifique que los códigos de reserva o tickets coincidan con la emisión oficial de {data.empresa || "la aerolínea"} antes de enviar a aprobación.
              </p>
            </div>
          </div>

          {/* 9. HISTORIAL Y BITÁCORA */}
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
              <div className="flex items-start gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-800">Solicitud Creada</p>
                  <p className="text-[10px] text-slate-400">{formatDateDMY(data.fecha)} {data.hora}</p>
                </div>
              </div>

              {isEnviado && (
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Enviado para Atención</p>
                    <p className="text-[10px] text-slate-400">Por {data.nombre || data.regus}</p>
                  </div>
                </div>
              )}

              {isAtendido && (
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Atendido / Emitido</p>
                    <p className="text-[10px] text-slate-400">Pendiente de Liquidación</p>
                  </div>
                </div>
              )}

              {isApproved && (
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800 font-black">Liquidación Aprobada</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Comprobante y rendición validados</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

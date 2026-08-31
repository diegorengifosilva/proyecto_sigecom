import React, { useState, useEffect } from "react";
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
  Link,
  ChevronDown,
  ChevronRight,
  Building,
  Mail,
  FileText,
  AlertTriangle,
  Briefcase,
  Package,
  Printer,
  Send,
  Edit2,
  Trash2,
  Plus,
  X,
  Calendar
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { CompactField } from "../../components/ui/CompactField";

export default function CompraDetalle({ idSolicitud }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { setCustomBreadcrumbs, setBreadcrumbOverride } = useOutletContext() || {};

  const realId = idSolicitud || id;

  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({ codigo: "", descripcion: "", cantidad: 1, valor: 0.00 });

  const [newCodigoPartida, setNewCodigoPartida] = useState("");
  const [newDescripcionPartida, setNewDescripcionPartida] = useState("");
  const [newCantidadPartida, setNewCantidadPartida] = useState(1);
  const [newValorPartida, setNewValorPartida] = useState(0.00);

  const { data, isLoading, error } = useQuery({
    queryKey: ["compraDetalle", realId],
    queryFn: async () => {
      const res = await api.get(`/compras/atencion/${realId}/`);
      return res.data;
    },
    enabled: !!realId,
  });

  useEffect(() => {
    if (data) {
      const displayNro = data.numero_orden || data.nro_solicitud || realId;
      if (setBreadcrumbOverride) setBreadcrumbOverride(displayNro);

      const crumbs = [];
      if (data.id_apertura) {
        crumbs.push({
          label: "PROGRAMACION",
          path: "/compras/programacion"
        });
        crumbs.push({
          label: String(data.id_apertura),
          path: `/compras/programacion/${data.id_apertura}`
        });
      } else {
        crumbs.push({
          label: "ATENCION",
          path: "/compras/atencion"
        });
      }
      crumbs.push({
        label: displayNro
      });

      if (setCustomBreadcrumbs) setCustomBreadcrumbs(crumbs);
    }
  }, [data, realId, setCustomBreadcrumbs, setBreadcrumbOverride]);

  const partidas = data ? [
    ...(data.suministros || []).map(item => ({
      ...item,
      id: item.id_detalle || item.id_suministro,
      codigo: item.codigo_item || item.codigo || "",
      descripcion: item.descripcion || "",
      cantidad: item.cantidad || 0,
      valor: item.precio_venta || item.valor || item.costo_precio || 0.00,
      total: item.venta_total || item.total || item.costo_total || 0.00,
      esSuministro: true
    })),
    ...(data.servicios || []).map(item => ({
      ...item,
      id: item.id_detalle || item.id_servicio,
      codigo: item.codigo_item || item.codigo || "",
      descripcion: item.descripcion_item || item.nombre_servicio || item.descripcion || "",
      cantidad: item.horas || item.cantidad || 0,
      valor: item.cotizado_hombre_dia || item.costo_hombre_dia || item.valor || 0.00,
      total: item.cotizado_total || item.total || item.costo_total || 0.00,
      esSuministro: false
    }))
  ] : [];


  const atenderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/compras/atencion/${realId}/atender/`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Solicitud atendida con éxito.");
      queryClient.invalidateQueries(["compraDetalle", realId]);
      queryClient.invalidateQueries(["listaAtencion"]);
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
    onSuccess: (data) => {
      toast.success(data.message || "Solicitud eliminada con éxito.");
      queryClient.invalidateQueries(["listaAtencion"]);
      navigate("/compras/atencion");
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
      toast.success(data.message || "Detalle agregado con éxito.");
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
      toast.success(data.message || "Detalle eliminado con éxito.");
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
      toast.success(data.message || "Detalle actualizado con éxito.");
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
      toast.warning("Debe ingresar una descripción.");
      return;
    }
    addMutation.mutate({
      codigo: newCodigoPartida || `PART-${(partidas?.length || 0) + 1}`,
      descripcion: newDescripcionPartida,
      cantidad: newCantidadPartida,
      valor: newValorPartida
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

  const handleSaveEdit = (idDetalle) => {
    if (!editForm.descripcion.trim()) {
      toast.warning("Debe ingresar una descripción.");
      return;
    }
    editMutation.mutate({
      idDetalle,
      updatedItem: {
        codigo: editForm.codigo,
        descripcion: editForm.descripcion,
        cantidad: editForm.cantidad,
        valor: editForm.valor
      }
    });
  };

  if (isLoading) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Cargando detalles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center space-y-4 bg-red-50/50 rounded-2xl border border-red-150 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <div>
          <h3 className="text-sm font-black text-red-950 uppercase tracking-wider mb-1">Error de Carga</h3>
          <p className="text-xs font-semibold text-red-750">{error.message || "No se pudieron obtener los datos de la solicitud."}</p>
        </div>
        <button
          onClick={() => navigate("/compras/atencion")}
          className="px-4 py-2 bg-white hover:bg-red-50 border border-red-200 text-red-700 font-extrabold text-[10px] uppercase rounded-xl transition-all active:scale-95"
        >
          Volver a la Lista
        </button>
      </div>
    );
  }

  const isPending = data.estado_nombre?.toLowerCase().includes("atencion") || data.estado_nombre?.toLowerCase().includes("atención");
  const displayNro = data.id_registro && String(data.id_registro).includes("_")
    ? data.id_registro.split("_")[1]
    : data.id_registro;

  const sumPartidasCant = partidas.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
  const sumPartidasTotal = partidas.reduce((acc, item) => acc + Number(item.total || 0), 0);

  const getStatusBadgeClass = (estado) => {
    const statusStr = String(estado || "").toLowerCase();
    if (statusStr.includes("envio") || statusStr.includes("envío")) {
      return "bg-red-50 text-red-700 border-red-200/50";
    }
    if (statusStr.includes("atencion") || statusStr.includes("atención")) {
      return "bg-amber-50 text-amber-700 border-amber-200/50";
    }
    if (statusStr.includes("pendiente de liquidacion") || statusStr.includes("pendiente de liquidación")) {
      return "bg-sky-50 text-sky-700 border-sky-200/50";
    }
    if (statusStr.includes("enviada")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/50";
    }
    if (statusStr.includes("aprobada")) {
      return "bg-zinc-900 text-zinc-50 border-zinc-950";
    }
    if (statusStr.includes("anulado")) {
      return "bg-gray-100 text-gray-600 border-gray-300/50";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
  
  <div className="flex flex-col xl:flex-row gap-6 w-full max-w-[1920px] mx-auto animate-in fade-in duration-700 font-sans">
      
      {/* LEFT PANEL (70%) - Partidas */}
      <div className="w-full xl:w-8/12 flex flex-col space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible font-sans">
          <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center">
              {/* Botón Atrás */}
              <button
                onClick={() => navigate("/compras/atencion")}
                className="mr-5 p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-gray-100 group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              </button>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">
                    {displayNro}
                  </h1>

                  {/* BADGE ESTADO COMPRA */}
                  <span
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusBadgeClass(data.estado_nombre)}`}
                  >
                    {data.estado_nombre || "PENDIENTE"}
                  </span>
                </div>

                {/* LÍNEA DE DATOS EDITABLES (Unificada y Responsiva) */}
                <div className="relative flex flex-wrap items-center gap-1.5 mt-2 bg-slate-50/50 p-1 rounded-2xl border border-slate-100/80 w-fit max-w-full">
                  {/* CÓDIGO */}
                  <div className="bg-white px-2.5 py-1 rounded-xl border border-gray-200/80 shadow-sm flex items-center transition-all hover:border-gray-300">
                    <Link className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                    <span className="font-bold text-[10px] text-gray-400 uppercase mr-1">CÓDIGO:</span>
                    <span className="font-bold text-[11px] text-gray-800 uppercase tracking-tight">
                      {data.codigo || "S/N"}
                    </span>
                  </div>

                  {/* FECHA */}
                  <div className="bg-white px-2.5 py-1 rounded-xl border border-gray-200/80 shadow-sm flex items-center transition-all hover:border-gray-300">
                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                    <span className="font-bold text-[10px] text-gray-400 uppercase mr-1">FECHA:</span>
                    <span className="font-bold text-[11px] text-gray-800 uppercase tracking-tight">
                      {data.fecha ? (data.fecha.substring(0, 10) + (data.hora ? " | " + data.hora : "")) : "S/N"}
                    </span>
                  </div>

                  {/* SOLICITANTE */}
                  <div className="bg-white px-2.5 py-1 rounded-xl border border-gray-200/80 shadow-sm flex items-center transition-all hover:border-gray-300">
                    <User className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                    <span className="font-bold text-[10px] text-gray-400 uppercase mr-1">SOLICITANTE:</span>
                    <span className="font-bold text-[11px] text-gray-800 uppercase tracking-tight">
                      {data.nombre || data.regus || "NO DEFINIDO"}
                    </span>
                  </div>

                  {/* ÁREA */}
                  <div className="bg-white px-2.5 py-1 rounded-xl border border-gray-200/80 shadow-sm flex items-center transition-all hover:border-gray-300">
                    <Building className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
                    <span className="font-bold text-[10px] text-gray-400 uppercase mr-1">ÁREA:</span>
                    <span className="font-bold text-[11px] text-gray-800 uppercase tracking-tight">
                      {data.area || "NO DEFINIDA"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* GESTIÓN DE EMPRESA */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="w-full px-5 py-4 bg-slate-50/50 border-b border-gray-200 flex items-center gap-3">
            <Building className="w-4.5 h-4.5 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
              Gestión de Empresa
            </h3>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CompactField label="Empresa" value={data.empresa} />
            <CompactField label="Dirección" value={data.direccion || "NO REGISTRADA"} />
            <CompactField label="Contacto" value={data.contacto || "NO DEFINIDO"} />
            <CompactField label="Forma de Pago" value={data.forma_pago || "CONTADO"} />
          </div>
        </div>

        {/* PARTIDAS */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-4.5 h-4.5 text-indigo-500" />
                  Partidas
                </h3>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md uppercase border border-indigo-100">
                  {partidas.length} Ítems
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span
                  onClick={() => toast.info("Generando reporte...")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 text-[9px] font-black rounded-lg uppercase shadow-sm hover:bg-teal-100 transition-all cursor-pointer select-none"
                >
                  Reporte
                </span>
                <span
                  onClick={() => toast.info("Exportando...")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-[9px] font-black rounded-lg uppercase shadow-sm hover:bg-green-100 transition-all cursor-pointer select-none"
                >
                  Exportar
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 border-b border-gray-200">
                    <th className="px-4 py-3 text-[10px] font-black uppercase w-12 text-center">Nro</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase w-32">Código</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase">Descripción</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase w-20 text-center">Cant</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase w-28 text-right">Valor Unit</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase w-28 text-right">Total</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase w-24 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {partidas.map((item, index) => {
                    const isEditing = editingItemId === item.id;
                    
                    if (isEditing) {
                      return (
                        <tr key={item.id || index} className="bg-indigo-50/30 border-b border-indigo-100">
                          <td className="px-4 py-2 text-center text-xs font-extrabold text-indigo-500">{index + 1}</td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-[11px] font-bold text-gray-800 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={editForm.codigo}
                              onChange={e => setEditForm({ ...editForm, codigo: e.target.value })}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-[11px] font-bold text-gray-800 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={editForm.descripcion}
                              onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-[11px] font-bold text-gray-800 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={editForm.cantidad}
                              onChange={e => setEditForm({ ...editForm, cantidad: parseInt(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="0.01"
                              className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-[11px] font-bold text-gray-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={editForm.valor}
                              onChange={e => setEditForm({ ...editForm, valor: parseFloat(e.target.value) || 0.00 })}
                            />
                          </td>
                          <td className="px-4 py-2 text-right text-xs font-black text-slate-700">
                            {data.tipo_moneda === "D" ? "$" : "S/."} {Number(editForm.cantidad * editForm.valor).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-center flex items-center justify-center gap-1.5 h-11">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Guardar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={item.id || index} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                        <td className="px-4 py-2.5 text-center text-xs font-extrabold text-gray-400">{index + 1}</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-slate-800 uppercase tracking-tight">{item.codigo}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase">{item.descripcion}</td>
                        <td className="px-4 py-2.5 text-center text-xs font-extrabold text-gray-800">{item.cantidad}</td>
                        <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-700">
                          {data.tipo_moneda === "D" ? "$" : "S/."} {Number(item.valor || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs font-black text-gray-900">
                          {data.tipo_moneda === "D" ? "$" : "S/."} {Number(item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-center flex items-center justify-center gap-1.5 h-11">
                          <button
                            onClick={() => startEditing(item)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Editar fila"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* FILA PARA AGREGAR NUEVA PARTIDA */}
                  <tr className="bg-slate-50/40 border-b border-dashed border-slate-200">
                    <td className="px-4 py-2 text-center text-xs font-black text-slate-400">+</td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        placeholder="CÓDIGO..."
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[11px] font-bold text-gray-800 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={newCodigoPartida}
                        onChange={e => setNewCodigoPartida(e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        placeholder="DESCRIPCIÓN DE LA PARTIDA..."
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[11px] font-bold text-gray-800 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={newDescripcionPartida}
                        onChange={e => {
                          if (!newCodigoPartida && e.target.value) {
                            setNewCodigoPartida(`PART-${(partidas?.length || 0) + 1}`);
                          }
                          setNewDescripcionPartida(e.target.value);
                        }}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[11px] font-bold text-gray-800 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={newCantidadPartida}
                        onChange={e => setNewCantidadPartida(parseInt(e.target.value) || 0)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[11px] font-bold text-gray-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={newValorPartida}
                        onChange={e => setNewValorPartida(parseFloat(e.target.value) || 0.00)}
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-xs font-black text-slate-500">
                      {data.tipo_moneda === "D" ? "$" : "S/."} {Number(newCantidadPartida * newValorPartida).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={handleAddPartida}
                        className="p-1 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center mx-auto"
                        title="Agregar partida"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>

                  {/* FILA DE TOTAL DE PARTIDAS */}
                  <tr className="bg-slate-50/80 font-black border-t-2 border-slate-200/60">
                    <td colSpan="3" className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-500 font-extrabold">Total:</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-800 font-black">{sumPartidasCant}</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right text-xs text-slate-900 font-black">
                      {data.tipo_moneda === "D" ? "$" : "S/."} {Number(sumPartidasTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* FALLBACK IF NO ITEMS */}
          {partidas.length === 0 && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No hay partidas registradas en esta solicitud</p>
            </div>
          )}

        </div>

        {/* RIGHT PANEL (30%) - Sidebar */}
        <div className="w-full xl:w-4/12 space-y-6">
          
          {/* DATOS SOLICITUD CARD */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-t-2xl">
              <h3 className="font-black text-gray-900 flex items-center text-[11px] uppercase tracking-wider">
                <FileText className="h-3.5 w-3.5 mr-2 text-indigo-500" /> Datos Solicitud
              </h3>
            </div>

            <div className="p-3 space-y-2.5">
              
              {/* FECHA ORDEN & TIPO */}
              <div className="grid grid-cols-2 gap-2.5">
                <CompactField label="Fecha Orden" value={data.fecha_orden ? data.fecha_orden.substring(0, 10) : "S/N"} />
                <CompactField label="Tipo" value={data.tipo || "COMPRA"} />
              </div>

              {/* ORDEN NRO & TIEMPO */}
              <div className="grid grid-cols-2 gap-2.5">
                <CompactField label="Orden No." value={data.numero_orden || "NO ASIGNADO"} />
                <CompactField label="Tiempo" value={data.tiempo_entrega || "INMEDIATO"} />
              </div>

              {/* LUGAR ENTREGA */}
              <CompactField label="Lugar Entrega" value={data.entrega_lugar || "NO ASIGNADO"} />

              {/* MONEDA & TIPO CAMBIO */}
              <div className="grid grid-cols-2 gap-2.5">
                <CompactField label="Moneda" value={data.tipo_moneda === "D" ? "Dólares" : "Soles"} />
                <CompactField label="T. Cambio" value={Number(data.tipo_cambio || 1.0).toFixed(3)} />
              </div>

              {/* MONTO DOLARES & MONTO SOLES */}
              <div className="grid grid-cols-2 gap-2.5">
                <CompactField label="Monto USD" value={"$ " + Number(data.monto_dolares || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                <CompactField label="Monto PEN" value={"S/. " + Number(data.monto_soles || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} />
              </div>

              {/* REFERENCIA */}
              <CompactField label="Referencia" value={data.referencia} />

            </div>

            {/* BLACK/DARK TOTALS BAR */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-t border-slate-950 mt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Importe Total ({data.tipo_moneda === "D" ? "USD" : "PEN"})
              </span>
              <span className="text-sm font-black tracking-tight">
                {data.tipo_moneda === "D" ? "$ " : "S/. "}
                {Number(data.tipo_moneda === "D" ? (data.monto_dolares || data.monto_usd || 0) : (data.monto_soles || data.monto_pen || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* BOTTOM ACTION BAR */}
          <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => toast.info("Generando vista de impresión...")}
                className="p-2 border border-gray-200 hover:bg-slate-50 hover:text-indigo-600 rounded-xl text-slate-500 transition-all active:scale-95 shrink-0" 
                title="Imprimir Orden"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button 
                onClick={() => toast.info("Preparando envío de correo...")}
                className="p-2 border border-gray-200 hover:bg-slate-50 hover:text-indigo-600 rounded-xl text-slate-500 transition-all active:scale-95 shrink-0" 
                title="Enviar por Correo"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button 
                onClick={() => toast.info("Exportando reporte...")}
                className="p-2 border border-gray-200 hover:bg-slate-50 hover:text-indigo-600 rounded-xl text-slate-500 transition-all active:scale-95 shrink-0" 
                title="Exportar PDF"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* ATENDER */}
              {isPending && (
                <button
                  onClick={() => {
                    toast.info(({ closeToast }) => (
                      <div className="flex flex-col min-w-[340px] overflow-hidden rounded-lg">
                        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50/50 border-b border-indigo-100">
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-sm border border-indigo-100">
                            <Check className="h-3.5 w-3.5 text-indigo-600" />
                          </div>
                          <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">
                            Atender Solicitud
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-[11px] text-gray-600 leading-tight">
                            ¿Confirmar la atención de esta solicitud? Esto cambiará su estado a <span className="font-bold text-gray-900 underline decoration-indigo-200 underline-offset-2">Atendido</span>.
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-4 pb-3">
                          <button onClick={closeToast} className="whitespace-nowrap text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">Cancelar</button>
                          <button
                            onClick={() => { atenderMutation.mutate(); closeToast(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[9px] font-black rounded-xl uppercase shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
                          >
                            <span>Confirmar Atención</span>
                            <Check className="h-3 w-3 opacity-70" />
                          </button>
                        </div>
                      </div>
                    ), { position: "top-right", autoClose: false, closeOnClick: false, draggable: false, icon: false, className: "p-0 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden !w-max !max-w-[400px]" });
                  }}
                  disabled={atenderMutation.isLoading}
                  className="flex items-center px-4 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-[10px] font-black text-indigo-700 hover:bg-indigo-100/50 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm h-[42px] uppercase group"
                >
                  {atenderMutation.isLoading ? (
                    <div className="h-3.5 w-3.5 mr-2 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-2 text-indigo-600 group-hover:scale-110 transition-transform" />
                  )}
                  {atenderMutation.isLoading ? "Procesando..." : "Atender"}
                </button>
              )}

              {/* ANULAR */}
              {data?.estado_nombre && !data.estado_nombre.toLowerCase().includes("anulado") && (
                <button
                  onClick={() => {
                    toast.info(({ closeToast }) => (
                      <div className="flex flex-col min-w-[340px] overflow-hidden rounded-lg">
                        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50/50 border-b border-amber-100">
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-sm border border-amber-100">
                            <X className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">
                            Anular Solicitud
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-[11px] text-gray-600 leading-tight">
                            ¿Confirmar la anulación de esta solicitud? Esta acción cambiará el estado a <span className="font-bold text-gray-900 underline decoration-amber-200 underline-offset-2">Anulado</span>.
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-4 pb-3">
                          <button onClick={closeToast} className="whitespace-nowrap text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">Cancelar</button>
                          <button
                            onClick={() => { anularMutation.mutate(); closeToast(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-[9px] font-black rounded-xl uppercase shadow-md shadow-amber-200 hover:bg-amber-700 transition-all active:scale-95 whitespace-nowrap"
                          >
                            <span>Confirmar Anulación</span>
                            <X className="h-3 w-3 opacity-70" />
                          </button>
                        </div>
                      </div>
                    ), { position: "top-right", autoClose: false, closeOnClick: false, draggable: false, icon: false, className: "p-0 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden !w-max !max-w-[400px]" });
                  }}
                  disabled={anularMutation.isLoading}
                  className="flex items-center px-4 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-[10px] font-black text-amber-700 hover:bg-amber-100/50 hover:border-amber-300 hover:shadow-md transition-all shadow-sm h-[42px] uppercase group"
                >
                  {anularMutation.isLoading ? (
                    <div className="h-3.5 w-3.5 mr-2 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5 mr-2 text-amber-600 group-hover:scale-110 transition-transform" />
                  )}
                  {anularMutation.isLoading ? "Procesando..." : "Anular"}
                </button>
              )}

              {/* BORRAR */}
              <button
                onClick={() => {
                  toast.error(({ closeToast }) => (
                    <div className="flex flex-col min-w-[340px] overflow-hidden rounded-lg">
                      <div className="flex items-center gap-3 px-4 py-2 bg-rose-50/50 border-b border-rose-100">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-sm border border-rose-100">
                          <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        </div>
                        <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">Eliminar Registro</span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[11px] text-gray-600 leading-tight">¿Estás seguro de que deseas <span className="font-bold text-red-600 underline decoration-red-200 underline-offset-2">eliminar permanentemente</span> esta solicitud? Esta acción no se puede deshacer.</p>
                      </div>
                      <div className="flex items-center justify-end gap-3 px-4 pb-3">
                        <button onClick={closeToast} className="whitespace-nowrap text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">Cancelar</button>
                        <button
                          onClick={() => { eliminarSolicitudMutation.mutate(); closeToast(); }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-[9px] font-black rounded-xl uppercase shadow-md shadow-red-200 hover:bg-red-700 transition-all active:scale-95 whitespace-nowrap"
                        >
                          <span>Confirmar Eliminación</span>
                          <Trash2 className="h-3 w-3 opacity-70" />
                        </button>
                      </div>
                    </div>
                  ), { position: "top-right", autoClose: false, closeOnClick: false, draggable: false, icon: false, className: "p-0 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden !w-max !max-w-[400px]" });
                }}
                disabled={eliminarSolicitudMutation.isLoading}
                className="flex items-center px-4 py-2 bg-red-50/50 border border-red-200 rounded-xl text-[10px] font-black text-red-700 hover:bg-red-100/50 hover:border-red-300 hover:shadow-md transition-all shadow-sm h-[42px] uppercase group"
              >
                {eliminarSolicitudMutation.isLoading ? (
                  <div className="h-3.5 w-3.5 mr-2 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 mr-2 text-red-600 group-hover:scale-110 transition-transform" />
                )}
                {eliminarSolicitudMutation.isLoading ? "Eliminando..." : "Borrar"}
              </button>

              {/* SALIR */}
              <button
                onClick={() => navigate("/compras/atencion")}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl text-[10px] font-black transition-all shadow-sm h-[42px] uppercase active:scale-95"
              >
                Salir
              </button>
            </div>
          </div>

        </div>

  </div>

  );
}

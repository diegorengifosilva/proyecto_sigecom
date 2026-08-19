import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  ChevronUp,
  Building,
  Mail,
  FileText,
  AlertTriangle,
  Briefcase,
  Package
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

export default function CompraDetalle({ idSolicitud }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [suministrosOpen, setSuministrosOpen] = useState(true);
  const [serviciosOpen, setServiciosOpen] = useState(true);

  // Fetch detailed data
  const { data, isLoading, error } = useQuery({
    queryKey: ["compra-detalle", idSolicitud],
    queryFn: async () => {
      const { data } = await api.get(`compras/atencion/${idSolicitud}/`);
      return data;
    },
    refetchOnWindowFocus: false
  });

  // Mutation to Attend
  const atenderMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`compras/atencion/${idSolicitud}/atender/`);
      return data;
    },
    onSuccess: (res) => {
      toast.success(res.message || "Solicitud atendida con éxito");
      queryClient.invalidateQueries(["compra-detalle", idSolicitud]);
      queryClient.invalidateQueries(["compras-atencion"]);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Error al atender la solicitud";
      toast.error(msg);
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <Loader className="w-10 h-10 animate-spin text-indigo-600" />
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Cargando detalles de la solicitud...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3 max-w-md mx-auto text-center">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 flex items-center justify-center rounded-2xl border border-rose-100">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black text-gray-900 uppercase">Error al Cargar Solicitud</h3>
        <p className="text-xs font-medium text-gray-500">
          La solicitud con ID {idSolicitud} no existe o no tienes permisos para visualizarla.
        </p>
        <button
          onClick={() => navigate("/compras/atencion")}
          className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase rounded-xl shadow-md transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a Atención
        </button>
      </div>
    );
  }

  const isPending = data.estado_nombre?.toUpperCase() === "PENDIENTE";
  const displayNro = data.id_registro && data.id_registro.includes("_")
    ? data.id_registro.split("_")[1]
    : data.id_registro;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/compras/atencion")}
            className="mr-4 p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-gray-100 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">
                {displayNro}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 ${
                  isPending
                    ? "bg-amber-500 text-white"
                    : "bg-emerald-600 text-white shadow-sm"
                }`}
              >
                {data.estado_nombre || "PENDIENTE"}
              </span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Link className="w-3 h-3 text-indigo-500" />
              COTIZACIÓN ASOCIADA: <span className="text-gray-700 font-black">{data.codigo || "S/N"}</span>
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2.5">
          {isPending && (
            <button
              onClick={() => atenderMutation.mutate()}
              disabled={atenderMutation.isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-75 disabled:pointer-events-none"
            >
              {atenderMutation.isLoading ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Atender
            </button>
          )}
          <button
            onClick={() => navigate("/compras/atencion")}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-[10px] uppercase rounded-xl transition-all active:scale-95"
          >
            Salir
          </button>
        </div>
      </div>

      {/* DUAL GRID LAYOUT */}
      <div className="flex flex-col xl:flex-row gap-6 w-full">
        
        {/* LEFT PANEL (70%) */}
        <div className="w-full xl:w-8/12 flex flex-col space-y-6">
          
          {/* PROVEEDOR CARD */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2">
              Información del Proveedor
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-wider leading-none">Empresa</span>
                    <span className="text-xs font-extrabold text-gray-900 uppercase mt-0.5 block">{data.empresa || "S/N"}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-wider leading-none">Dirección</span>
                    <span className="text-xs font-semibold text-gray-700 uppercase mt-0.5 block">{data.direccion || "NO REGISTRADA"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-wider leading-none">Contacto</span>
                    <span className="text-xs font-semibold text-gray-700 uppercase mt-0.5 block">{data.contacto || "NO DEFINIDO"}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block tracking-wider leading-none">Lugar de Entrega</span>
                    <span className="text-xs font-semibold text-gray-700 uppercase mt-0.5 block">{data.entrega_lugar || "NO ASIGNADO"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SUMINISTROS SECTION */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setSuministrosOpen(!suministrosOpen)}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-gray-200"
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-black text-gray-800 uppercase tracking-widest">
                  Partidas de Suministros ({data.suministros?.length || 0})
                </span>
              </div>
              {suministrosOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            
            <AnimatePresence initial={false}>
              {suministrosOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-x-auto"
                >
                  {data.suministros && data.suministros.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-100">
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase w-12 text-center">Nro</th>
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase w-28">Código</th>
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase">Descripción</th>
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase w-16 text-center">Cant</th>
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase w-24 text-right">Valor Unit</th>
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase w-24 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.suministros.map((item, index) => (
                          <tr key={item.id_suministro || index} className="hover:bg-slate-50/50 border-b last:border-0 border-slate-100">
                            <td className="px-4 py-2.5 text-center text-xs font-extrabold text-gray-400">{index + 1}</td>
                            <td className="px-4 py-2.5 text-xs font-bold text-gray-800 uppercase tracking-tight">{item.codigo_item}</td>
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-600 uppercase">{item.descripcion}</td>
                            <td className="px-4 py-2.5 text-center text-xs font-extrabold text-gray-800">{item.cantidad}</td>
                            <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-700">
                              {data.tipo_moneda === "D" ? "$" : "S/."} {Number(item.precio_venta || item.costo_precio || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-black text-gray-900">
                              {data.tipo_moneda === "D" ? "$" : "S/."} {Number(item.venta_total || item.costo_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                      No hay suministros registrados en esta cotización
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SERVICIOS SECTION */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setServiciosOpen(!serviciosOpen)}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-gray-200"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-black text-gray-800 uppercase tracking-widest">
                  Partidas de Servicios ({data.servicios?.length || 0})
                </span>
              </div>
              {serviciosOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            <AnimatePresence initial={false}>
              {serviciosOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-x-auto"
                >
                  {data.servicios && data.servicios.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-100">
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase w-12 text-center">Nro</th>
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase w-28">Código</th>
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase">Descripción</th>
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase w-16 text-center">Horas</th>
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase w-16 text-center">Hombres</th>
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase w-24 text-right">Tarifa</th>
                          <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase w-24 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.servicios.map((item, index) => (
                          <tr key={item.id_servicio || index} className="hover:bg-slate-50/50 border-b last:border-0 border-slate-100">
                            <td className="px-4 py-2.5 text-center text-xs font-extrabold text-gray-400">{index + 1}</td>
                            <td className="px-4 py-2.5 text-xs font-bold text-gray-800 uppercase tracking-tight">{item.codigo_item || "SERV"}</td>
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-600 uppercase">
                              {item.descripcion_item || item.nombre_servicio || "SERVICIO GENERAL"}
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs font-extrabold text-gray-800">{item.horas || 0}</td>
                            <td className="px-4 py-2.5 text-center text-xs font-extrabold text-gray-800">{item.cantidad_hombres || 0}</td>
                            <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-700">
                              {data.tipo_moneda === "D" ? "$" : "S/."} {Number(item.cotizado_hombre_dia || item.costo_hombre_dia || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-black text-gray-900">
                              {data.tipo_moneda === "D" ? "$" : "S/."} {Number(item.cotizado_total || item.costo_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                      No hay servicios registrados en esta cotización
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* RIGHT PANEL - SIDEBAR (30%) */}
        <div className="w-full xl:w-4/12 space-y-6">
          
          {/* SIDEBAR METADATA CARD */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Datos de la Solicitud
            </h3>

            <div className="space-y-3.5 text-xs font-bold">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px]">No. Solicitud</span>
                <span className="text-gray-800 uppercase">{displayNro}</span>
              </div>

              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px]">Solicitante</span>
                <span className="text-gray-800 uppercase">{data.regus || "S/N"}</span>
              </div>

              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px]">Área</span>
                <span className="text-gray-800 uppercase">{data.area || "S/N"}</span>
              </div>

              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px]">Fecha Registro</span>
                <span className="text-gray-800 uppercase">{data.fecha ? data.fecha.substring(0, 10) : "S/N"}</span>
              </div>

              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px]">Fecha Orden</span>
                <span className="text-gray-800 uppercase">{data.fecha_orden ? data.fecha_orden.substring(0, 10) : "S/N"}</span>
              </div>

              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px]">Tipo</span>
                <span className="text-gray-800 uppercase">{data.tipo || "COMPRA"}</span>
              </div>

              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px]">Nro de Orden</span>
                <span className="text-gray-800 uppercase">{data.numero_orden || "NO ASIGNADO"}</span>
              </div>

              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px]">Moneda</span>
                <span className="text-indigo-600 uppercase">{data.tipo_moneda === "D" ? "Dólares" : "Soles"}</span>
              </div>

              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px]">Tipo de Cambio (TC)</span>
                <span className="text-gray-800">{Number(data.tipo_cambio || 1.0).toFixed(3)}</span>
              </div>

              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px]">Forma de Pago</span>
                <span className="text-gray-800 uppercase">{data.forma_pago || "CONTADO"}</span>
              </div>

              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px]">Tiempo Entrega</span>
                <span className="text-gray-800 uppercase">{data.tiempo_entrega || "INMEDIATO"}</span>
              </div>

              <div className="flex flex-col border-b border-gray-50 pb-2">
                <span className="text-gray-400 uppercase text-[10px] mb-1">Referencia</span>
                <span className="text-gray-600 font-medium uppercase break-all">{data.referencia || "SIN REFERENCIA"}</span>
              </div>
            </div>

            {/* TOTALES SECTION */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-black text-gray-500 uppercase">
                <span>Total PEN</span>
                <span className="text-sm text-slate-800">
                  S/. {Number(data.monto_soles || data.monto_pen || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-black text-gray-500 uppercase">
                <span>Total USD</span>
                <span className="text-sm text-slate-800">
                  $ {Number(data.monto_dolares || data.monto_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

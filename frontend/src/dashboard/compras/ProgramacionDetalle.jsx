import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  Lock
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { CompactField } from "../../components/ui/CompactField";

const getRequestIcon = (item) => {
  const tipoGasto = String(item.tipo_gasto || "");
  const transporte = String(item.transporte || "");
  const tipo = String(item.tipo || "").toLowerCase();

  if (tipoGasto === "02" || tipo.includes("pasajes") || tipo.includes("viaje")) {
    if (transporte === "A" || tipo.includes("aéreo") || tipo.includes("aero")) {
      return (
        <div className="p-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-100/50 flex items-center justify-center w-7 h-7" title="Pasajes Aéreos">
          <Plane className="w-3.5 h-3.5 shrink-0" />
        </div>
      );
    }
    return (
      <div className="p-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100/50 flex items-center justify-center w-7 h-7" title="Pasajes Terrestres">
        <Bus className="w-3.5 h-3.5 shrink-0" />
      </div>
    );
  }

  if (tipo.includes("servicio")) {
    return (
      <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/50 flex items-center justify-center w-7 h-7" title="Orden de Servicio">
        <Briefcase className="w-3.5 h-3.5 shrink-0" />
      </div>
    );
  }

  return (
    <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/50 flex items-center justify-center w-7 h-7" title="Orden de Compra / Suministro">
      <Package className="w-3.5 h-3.5 shrink-0" />
    </div>
  );
};

export default function ProgramacionDetalle({ idApertura }) {
  const navigate = useNavigate();
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["programacionDetalle", realId],
    queryFn: async () => {
      const res = await api.get(`/cotizaciones/apertura_detalle/${realId}/`);
      return res.data;
    },
    enabled: !!realId,
  });

  useEffect(() => {
    if (data) {
      const codeToShow = data.numero_orden || `AP-${data.id_apertura}`;
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
      movIds: [1, 2] // 1 = Equipos, 2 = Materiales
    },
    { 
      id: "mano_obra", 
      name: "Mano de Obra", 
      budgetKeys: ["orden_compra_hh"], 
      icon: User, 
      color: "text-blue-500",
      movIds: [3] // 3 = HH (Mano de Obra)
    },
    { 
      id: "costo_servicios", 
      name: "Gasto de Servicio", 
      budgetKeys: ["orden_compra_costo_servicios"], 
      icon: DollarSign, 
      color: "text-indigo-500",
      movIds: [4] // 4 = Costo de Servicios
    },
    { 
      id: "otros", 
      name: "Otros", 
      budgetKeys: ["orden_compra_otros"], 
      icon: FileText, 
      color: "text-violet-500",
      movIds: [5] // 5 = Otros / Pasajes
    },
  ];

  const solicitudes = data.solicitudes || [];

  // Totales Generales
  const totalPresupuesto = Number(data.presupuesto || 0);
  const totalProgramado = solicitudes.reduce((sum, s) => sum + Number(s.monto_dolares || 0), 0);
  const totalDisponible = totalPresupuesto - totalProgramado;

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
                  PROGRAMACIÓN: {data.numero_orden || `AP-${data.id_apertura}`}
                </h1>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black rounded-full uppercase tracking-wider">
                  {data.estado_orden_nombre || "Pendiente"}
                </span>
              </div>

              {/* Chips de datos principales */}
              <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">
                <span className="flex items-center gap-1 px-3 py-1 bg-indigo-50/50 border border-indigo-100 text-indigo-700 rounded-xl">
                  <Coins className="h-3 w-3 shrink-0" />
                  CÓDIGO: {data.cotizacion_codigo || "S/N"}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50/50 border border-emerald-100 text-emerald-700 rounded-xl">
                  <Calendar className="h-3 w-3 shrink-0" />
                  FECHA ORDEN: {data.fecha_orden ? data.fecha_orden.split(' ')[0] : "S/N"}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-violet-50/50 border border-violet-100 text-violet-700 rounded-xl max-w-xs truncate" title={data.id_registro?.id_cliente?.nombre || data.cliente_nombre}>
                  <Building className="h-3 w-3 shrink-0" />
                  CLIENTE: {data.id_registro?.id_cliente?.nombre || data.cliente_nombre || "S/N"}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 bg-amber-50/50 border border-amber-100 text-amber-700 rounded-xl">
                  <Layers className="h-3 w-3 shrink-0" />
                  ÁREA: {data.area_nombre || "S/N"}
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
                        return cat.movIds.some(id => presentIds.includes(id));
                      })
                      .map((cat) => {
                      const budget = cat.budgetKeys.reduce((sum, key) => sum + Number(data[key] || 0), 0);
                      const catSols = solicitudes.filter(s => {
                        const mov = Number(s.tipo_movimiento);
                        return cat.movIds.includes(mov) || (cat.id === "otros" && (mov < 1 || mov > 5 || !mov));
                      });
                      const programmedSum = catSols.reduce((sum, s) => sum + Number(s.monto_dolares || 0), 0);
                      const availableSum = budget - programmedSum;

                      if (budget === 0 && catSols.length === 0) return null;

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
                              <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 text-[9px] font-black rounded-full uppercase">
                                {catSols.length}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-right">
                              <div className="text-[10px] text-gray-500 font-bold uppercase">
                                <span className="mr-1">Ppto:</span>
                                <span className="text-gray-800 font-black">{formatCurrency(budget)}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-bold uppercase border-l border-gray-200 pl-3">
                                <span className="mr-1 text-indigo-500">Prog:</span>
                                <span className="text-indigo-600 font-black">{formatCurrency(programmedSum)}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-bold uppercase border-l border-gray-200 pl-3">
                                <span className="mr-1">Disp:</span>
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
                                {/* Barra de Acciones / Agregar Solicitudes */}
                                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Solicitudes de Gasto</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        toast.info(`Crear Orden de Compra/Servicio para ${cat.name}`);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg border border-emerald-200/60 bg-emerald-50/30 text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm"
                                    >
                                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                                      ORDEN COMPRA/SERVICIOS
                                    </button>
                                    <button
                                      onClick={() => {
                                        toast.info(`Crear Pasaje Aéreo para ${cat.name}`);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg border border-sky-200/60 bg-sky-50/30 text-sky-700 hover:bg-sky-50 transition-colors shadow-sm"
                                    >
                                      <Plane className="w-3.5 h-3.5 text-sky-600" />
                                      PASAJE AEREO
                                    </button>
                                    <button
                                      onClick={() => {
                                        toast.info(`Crear Pasaje Terrestre para ${cat.name}`);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg border border-amber-200/60 bg-amber-50/30 text-amber-700 hover:bg-amber-50 transition-colors shadow-sm"
                                    >
                                      <Bus className="w-3.5 h-3.5 text-amber-600" />
                                      PASAJE TERRESTRE
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
                                          <th className="px-4 py-2.5 w-32 text-right">Monto</th>
                                          <th className="px-4 py-2.5 w-28 text-center">Estado</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {catSols.map((sol) => (
                                          <tr
                                            key={sol.id_solicitud}
                                            onClick={() => {
                                              if (sol.tipo_gasto === "03") {
                                                navigate(`/compras/atencion/${sol.id_solicitud}`);
                                              } else {
                                                toast.info(`Detalles del pasaje: ${sol.codigo}`);
                                              }
                                            }}
                                            className="group hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer text-slate-700 text-xs"
                                          >
                                            <td className="px-4 py-2.5 text-center flex justify-center items-center">
                                              {getRequestIcon(sol)}
                                            </td>
                                            <td className="px-4 py-2.5 pl-6 font-bold text-indigo-600 group-hover:underline">
                                              {sol.id_registro || sol.id_solicitud}
                                            </td>
                                            <td className="px-4 py-2.5 text-[10px] text-gray-400 font-extrabold uppercase whitespace-nowrap">
                                              {sol.fecha}
                                            </td>
                                            <td className="px-4 py-2.5 font-medium max-w-xs truncate" title={sol.concepto}>
                                              {sol.concepto}
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
              <CompactField label="Cliente" value={data.id_registro?.id_cliente?.nombre || data.cliente_nombre} />
              <CompactField label="Área" value={data.area_nombre} />
              <CompactField label="Referencia" value={data.cotizacion_referencia} />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

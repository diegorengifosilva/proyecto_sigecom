import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Award, Percent, Calculator, Clock, CheckCircle } from "lucide-react";

export default function RendimientoDashboard({ module = "comercial", anno, mes, cotizaciones = [], viewScope = "global" }) {
  const [tab, setTab] = useState("overview");

  // Estados para el Simulador Comercial
  const [tasaCierre, setTasaCierre] = useState(25); // por ciento
  const [ticketPromedio, setTicketPromedio] = useState(15000); // dólares/soles
  const [comisionTasa, setComisionTasa] = useState(1.5); // por ciento comisión
  const [baseSimulacion, setBaseSimulacion] = useState("todas"); // "todas" o "activas"
  const [sortConfig, setSortConfig] = useState({ key: "adjudicado", direction: "desc" });
  const [comercialSeleccionado, setComercialSeleccionado] = useState("todos");
  const [modeloProyeccion, setModeloProyeccion] = useState("monto_real");

  const listaComerciales = useMemo(() => {
    if (module !== "comercial") return [];
    const set = new Set();
    cotizaciones.forEach(c => {
      const name = (c.comercial_nombre || "Por Asignar").trim().toUpperCase();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [module, cotizaciones]);

  const aplicarEscenario = (escenario) => {
    if (escenario === "conservador") {
      setTasaCierre(10);
      setTicketPromedio(10000);
    } else if (escenario === "moderado") {
      setTasaCierre(25);
      setTicketPromedio(15000);
    } else if (escenario === "optimista") {
      setTasaCierre(45);
      setTicketPromedio(25000);
    }
  };

  // Estados para el Simulador Logístico
  const [targetLeadTime, setTargetLeadTime] = useState(4.0); // días
  const [supplierReliability, setSupplierReliability] = useState(95); // por ciento

  const tabs = useMemo(() => {
    if (module === "logistica") {
      return [
        { id: "overview", label: "Desempeño de Proveedores", icon: <Award size={16} /> },
        { id: "simulador", label: "Simulador de Lead Time", icon: <Clock size={16} /> },
      ];
    }
    return [
      { id: "overview", label: "Desempeño Comercial", icon: <Award size={16} /> },
      { id: "simulador", label: "Simulador de Proyecciones", icon: <Calculator size={16} /> },
    ];
  }, [module]);

  // Datos deterministas para proveedores de logística basados en año/mes
  const performanceBySupplier = useMemo(() => {
    if (module !== "logistica") return [];
    const seed = Number(anno) + (mes === "%" ? 6 : Number(mes));
    const getVal = (min, max, offset) => {
      const x = Math.sin(seed + offset) * 10000;
      return min + (x - Math.floor(x)) * (max - min);
    };

    return [
      { name: "ACEROS INDUSTRIALES S.A.", ordenes: Math.round(getVal(15, 25, 1)), monto: getVal(40000, 65000, 2), leadTime: getVal(3.2, 4.2, 3), fillRate: getVal(96, 99, 4) },
      { name: "PROVEEDORA GENERAL E.I.R.L.", ordenes: Math.round(getVal(10, 18, 5)), monto: getVal(25000, 42000, 6), leadTime: getVal(4.1, 4.9, 7), fillRate: getVal(94, 97, 8) },
      { name: "IMPORTACIONES METALÚRGICAS S.A.C.", ordenes: Math.round(getVal(6, 12, 9)), monto: getVal(18000, 31000, 10), leadTime: getVal(4.8, 5.7, 11), fillRate: getVal(90, 94, 12) },
      { name: "DISTRIBUIDORA FERRETERA DEL SUR", ordenes: Math.round(getVal(4, 9, 13)), monto: getVal(8000, 15000, 14), leadTime: getVal(5.5, 6.8, 15), fillRate: getVal(86, 91, 16) }
    ].sort((a, b) => b.monto - a.monto);
  }, [module, anno, mes]);

  // Totales Logísticos
  const logisticsTotals = useMemo(() => {
    if (module !== "logistica") return null;
    let totalMonto = 0;
    let totalOrdenes = 0;
    let sumLeadTime = 0;
    let sumFillRate = 0;

    performanceBySupplier.forEach(s => {
      totalMonto += s.monto;
      totalOrdenes += s.ordenes;
      sumLeadTime += s.leadTime;
      sumFillRate += s.fillRate;
    });

    return {
      monto: totalMonto,
      ordenes: totalOrdenes,
      leadTimeAvg: sumLeadTime / performanceBySupplier.length,
      fillRateAvg: sumFillRate / performanceBySupplier.length
    };
  }, [module, performanceBySupplier]);

  // Agrupamiento dinámico por vendedor (Comercial)
  const performanceBySalesperson = useMemo(() => {
    if (module === "logistica") return [];
    const map = {};
    cotizaciones.forEach(c => {
      const name = (c.comercial_nombre || "Por Asignar").trim().toUpperCase();
      if (!map[name]) {
        map[name] = { 
          name, 
          cotizado: 0, 
          adjudicado: 0, 
          cantidad: 0, 
          cantidadAdjudicada: 0, 
          pipeline: 0,
          cantidadCerrada: 0 // para calcular conversión (ganadas + perdidas)
        };
      }
      const amount = Number(c.tot_c || c.total_cotizacion || 0);
      map[name].cotizado += amount;
      map[name].cantidad += 1;
      
      const esAdjudicado = c.estado_nombre === "Adjudicado" || c.envio === 3 || String(c.estado).toLowerCase().includes("adjudicado");
      const esPerdido = c.estado_nombre === "Anulada" || c.estado_nombre === "Rechazada";
      
      if (esAdjudicado) {
        map[name].adjudicado += amount;
        map[name].cantidadAdjudicada += 1;
        map[name].cantidadCerrada += 1;
      } else if (esPerdido) {
        map[name].cantidadCerrada += 1;
      } else {
        map[name].pipeline += amount;
      }
    });

    const list = Object.values(map);

    // Aplicar ordenamiento
    if (sortConfig.key) {
      list.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return list;
  }, [module, cotizaciones, sortConfig]);

  // Líderes destacados (vista global) y desglose de pipeline personal (vista personal)
  const liderVentas = useMemo(() => {
    if (module !== "comercial" || performanceBySalesperson.length === 0) return null;
    return [...performanceBySalesperson].sort((a, b) => b.adjudicado - a.adjudicado)[0];
  }, [module, performanceBySalesperson]);

  const liderPipeline = useMemo(() => {
    if (module !== "comercial" || performanceBySalesperson.length === 0) return null;
    return [...performanceBySalesperson].sort((a, b) => b.pipeline - a.pipeline)[0];
  }, [module, performanceBySalesperson]);

  const liderEficiencia = useMemo(() => {
    if (module !== "comercial" || performanceBySalesperson.length === 0) return null;
    return [...performanceBySalesperson]
      .map(v => ({
        ...v,
        conversion: v.cantidadCerrada > 0 ? (v.cantidadAdjudicada / v.cantidadCerrada) : 0
      }))
      .sort((a, b) => b.conversion - a.conversion)[0];
  }, [module, performanceBySalesperson]);

  const miDesglosePipeline = useMemo(() => {
    if (module !== "comercial" || viewScope !== "personal" || !performanceBySalesperson[0]) return null;
    let opsCount = 0, opsVal = 0;
    let draftCount = 0, draftVal = 0;
    let sentCount = 0, sentVal = 0;

    cotizaciones.forEach(c => {
      const amount = Number(c.tot_c || c.total_cotizacion || 0);
      const esAdjudicado = c.estado_nombre === "Adjudicado" || c.envio === 3 || String(c.estado).toLowerCase().includes("adjudicado");
      const esPerdido = c.estado_nombre === "Anulada" || c.estado_nombre === "Rechazada";

      if (!esAdjudicado && !esPerdido) {
        if (c.id_estado === 11) {
          opsCount++;
          opsVal += amount;
        } else if (c.estado_envio === 1) {
          draftCount++;
          draftVal += amount;
        } else {
          sentCount++;
          sentVal += amount;
        }
      }
    });

    return { opsCount, opsVal, draftCount, draftVal, sentCount, sentVal };
  }, [module, viewScope, performanceBySalesperson, cotizaciones]);

  // Totales Comerciales
  const totals = useMemo(() => {
    if (module === "logistica") return {};
    let cotizado = 0;
    let adjudicado = 0;
    let totalDocs = cotizaciones.length;
    let adjudicadosDocs = 0;

    cotizaciones.forEach(c => {
      const amount = Number(c.tot_c || c.total_cotizacion || 0);
      cotizado += amount;
      if (c.estado_nombre === "Adjudicado" || c.envio === 3 || String(c.estado).toLowerCase().includes("adjudicado")) {
        adjudicado += amount;
        adjudicadosDocs += 1;
      }
    });

    const tasaConversion = totalDocs > 0 ? ((adjudicadosDocs / totalDocs) * 100).toFixed(1) : 0;

    return { cotizado, adjudicado, totalDocs, adjudicadosDocs, tasaConversion };
  }, [module, cotizaciones]);

  // Simulación Comercial
  const simulacionResult = useMemo(() => {
    let pool = comercialSeleccionado === "todos"
      ? cotizaciones
      : cotizaciones.filter(c => (c.comercial_nombre || "Por Asignar").trim().toUpperCase() === comercialSeleccionado);

    if (baseSimulacion === "activas") {
      pool = pool.filter(c => c.estado_nombre !== "Adjudicado" && c.envio !== 3 && !String(c.estado).toLowerCase().includes("adjudicado") && c.estado_nombre !== "Anulada" && c.estado_nombre !== "Rechazada");
    }

    if (modeloProyeccion === "monto_real") {
      const sumaReal = pool.reduce((acc, c) => acc + Number(c.tot_c || c.total_cotizacion || 0), 0);
      return sumaReal * (tasaCierre / 100);
    } else {
      const totalDocs = pool.length;
      return totalDocs * (tasaCierre / 100) * ticketPromedio;
    }
  }, [cotizaciones, tasaCierre, ticketPromedio, baseSimulacion, comercialSeleccionado, modeloProyeccion]);

  const comisionResult = useMemo(() => {
    return simulacionResult * (comisionTasa / 100);
  }, [simulacionResult, comisionTasa]);

  const filteredPool = useMemo(() => {
    if (module !== "comercial") return [];
    return comercialSeleccionado === "todos"
      ? cotizaciones
      : cotizaciones.filter(c => (c.comercial_nombre || "Por Asignar").trim().toUpperCase() === comercialSeleccionado);
  }, [module, cotizaciones, comercialSeleccionado]);

  const poolSumMontoReal = useMemo(() => {
    if (module !== "comercial") return 0;
    let pool = filteredPool;
    if (baseSimulacion === "activas") {
      pool = pool.filter(c => c.estado_nombre !== "Adjudicado" && c.envio !== 3 && !String(c.estado).toLowerCase().includes("adjudicado") && c.estado_nombre !== "Anulada" && c.estado_nombre !== "Rechazada");
    }
    return pool.reduce((acc, c) => acc + Number(c.tot_c || c.total_cotizacion || 0), 0);
  }, [module, filteredPool, baseSimulacion]);

  // Simulación Logística (Fill Rate estimado según Lead Time y Confiabilidad)
  const simulacionLogisticaResult = useMemo(() => {
    const delayPenalty = targetLeadTime > 5.0 ? (targetLeadTime - 5.0) * 8.5 : 0;
    const estimated = Math.max(0, Math.min(100, supplierReliability - delayPenalty));
    return estimated;
  }, [targetLeadTime, supplierReliability]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === "desc") {
          return { key, direction: "asc" };
        } else {
          return { key: "adjudicado", direction: "desc" };
        }
      }
      return { key, direction: "desc" };
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* HEADER DE RENDIMIENTO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 p-1.5 rounded-xl text-indigo-600">
            <TrendingUp size={15} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              {module === "logistica" ? `Desempeño y Simulación Logística ${anno}` : (viewScope === "personal" ? `Mi Rendimiento Comercial ${anno}` : `Rendimiento Comercial ${anno}`)}
            </h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              {module === "logistica" ? "Análisis de eficiencia de abastecimiento y simulación de calidad" : (viewScope === "personal" ? "Mis metas y proyecciones de ventas" : "Control de metas y proyecciones de ventas")}
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
          {tabs.map((t) => {
            const isSel = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black rounded-lg transition-all ${
                  isSel
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENIDO DENTRO DE TARJETA UNIFICADA */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 min-h-[450px]">
        <AnimatePresence mode="wait">
          {tab === "overview" && (
            <motion.div
              key={`${module}-overview`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* KPIS DE RESUMEN */}
              {module === "comercial" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50/55 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Monto Adjudicado (Logrado)</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[1000] text-gray-800">${totals.adjudicado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 block mt-2">De un total cotizado de ${totals.cotizado.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>

                  <div className="bg-gray-50/55 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Proyectos Ganados / Totales</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[1000] text-gray-800">{totals.adjudicadosDocs}</span>
                      <span className="text-xs text-gray-400 font-bold">/ {totals.totalDocs} Docs</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full" 
                        style={{ width: `${totals.totalDocs > 0 ? (totals.adjudicadosDocs / totals.totalDocs) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50/55 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tasa de Cierre Real</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[1000] text-gray-800">{totals.tasaConversion}%</span>
                      <Percent className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 block mt-2">Porcentaje de éxito basado en documentos</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50/55 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Compras Emitidas</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[1000] text-gray-800">${logisticsTotals.monto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 block mt-2">Acumulado en {logisticsTotals.ordenes} órdenes de compra emitidas</span>
                  </div>

                  <div className="bg-gray-50/55 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fill Rate Promedio</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[1000] text-gray-800">{logisticsTotals.fillRateAvg.toFixed(1)}%</span>
                      <CheckCircle className="w-4 h-4 text-indigo-500 ml-1 inline" />
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full" 
                        style={{ width: `${logisticsTotals.fillRateAvg}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50/55 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Lead Time Promedio</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[1000] text-gray-800">{logisticsTotals.leadTimeAvg.toFixed(1)} d</span>
                      <Clock className="w-4 h-4 text-emerald-500 ml-1 inline" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 block mt-2">Días promedio de retraso en entrega</span>
                  </div>
                </div>
              )}

              {/* TABLA PRINCIPAL / SCORECARD PERSONAL */}
              {module === "comercial" ? (
                viewScope === "personal" ? (
                  /* VISTA PERSONAL: CUADRO DE MANDO BESPOKE */
                  performanceBySalesperson.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl text-gray-400 font-medium">
                      Sin datos personales registrados en este período
                    </div>
                  ) : (
                    (() => {
                      const miData = performanceBySalesperson[0];
                      const rateText = miData.adjudicado > 0 ? ((miData.adjudicado / 100000) * 100).toFixed(0) : 0;
                      const conversionRate = miData.cantidadCerrada > 0 ? ((miData.cantidadAdjudicada / miData.cantidadCerrada) * 100).toFixed(0) : 0;
                      const ticketPromedioGanado = miData.cantidadAdjudicada > 0 ? (miData.adjudicado / miData.cantidadAdjudicada) : 0;

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                          {/* CARD 1: ESTADO DEL PIPELINE */}
                          <div className="bg-gray-50/45 border border-gray-200/80 p-5 rounded-2xl space-y-4">
                            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider border-b border-gray-200/60 pb-2 flex items-center justify-between">
                              <span>📂 Estado de mi Pipeline</span>
                              <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">Activo</span>
                            </h4>
                            <div className="space-y-3.5">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                  <span className="font-bold text-gray-500">Oportunidades</span>
                                </div>
                                <div className="text-right font-black text-gray-700">
                                  {miDesglosePipeline?.opsCount || 0} Docs <span className="text-gray-300 mx-1">|</span> <span className="text-indigo-600 font-extrabold">${(miDesglosePipeline?.opsVal || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                  <span className="font-bold text-gray-500">Por Enviar (Drafts)</span>
                                </div>
                                <div className="text-right font-black text-gray-700">
                                  {miDesglosePipeline?.draftCount || 0} Docs <span className="text-gray-300 mx-1">|</span> <span className="text-amber-600 font-extrabold">${(miDesglosePipeline?.draftVal || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  <span className="font-bold text-gray-500">Enviadas (Negociación)</span>
                                </div>
                                <div className="text-right font-black text-gray-700">
                                  {miDesglosePipeline?.sentCount || 0} Docs <span className="text-gray-300 mx-1">|</span> <span className="text-emerald-600 font-extrabold">${(miDesglosePipeline?.sentVal || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* CARD 2: META Y CUMPLIMIENTO */}
                          <div className="bg-gray-50/45 border border-gray-200/80 p-5 rounded-2xl flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider border-b border-gray-200/60 pb-2 mb-3">🎯 Avance de Meta Personal</h4>
                              <div className="flex justify-between items-baseline mb-1">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Logrado</span>
                                <span className="text-xl font-[1000] text-gray-800">${miData.adjudicado.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                              </div>
                              <div className="flex justify-between items-baseline">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Meta Anual</span>
                                <span className="text-xs font-bold text-gray-500">$100,000</span>
                              </div>
                            </div>
                            <div className="pt-4">
                              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden shrink-0 mb-2">
                                <div 
                                  className="bg-indigo-600 h-full rounded-full transition-all duration-300" 
                                  style={{ width: `${Math.min((miData.adjudicado / 100000) * 100, 100)}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                                <span>Cumplimiento</span>
                                <span>{rateText}%</span>
                              </div>
                            </div>
                          </div>

                          {/* CARD 3: EFICIENCIA Y TICKET PROMEDIO */}
                          <div className="bg-gray-50/45 border border-gray-200/80 p-5 rounded-2xl space-y-4 flex flex-col">
                            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider border-b border-gray-200/60 pb-2">⚡ Mi Eficiencia Comercial</h4>
                            <div className="grid grid-cols-2 gap-4 flex-1 items-center">
                              <div className="text-center p-3 bg-white rounded-xl border border-gray-200/60 shadow-sm flex flex-col justify-center items-center h-full">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tasa Cierre</span>
                                <span className="text-2xl font-[1000] text-emerald-600">{conversionRate}%</span>
                              </div>
                              <div className="text-center p-3 bg-white rounded-xl border border-gray-200/60 shadow-sm flex flex-col justify-center items-center h-full">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ticket Prom.</span>
                                <span className="text-lg font-[1000] text-gray-800 truncate max-w-[90px]">${Math.round(ticketPromedioGanado).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )
                ) : (
                  /* VISTA GLOBAL: RANKING COMPARATIVO Y DESTACOS */
                  <div className="pt-2">
                    {/* TARJETAS DE DESTACADOS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                      {liderVentas && (
                        <div className="bg-indigo-50/20 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                          <div>
                            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block mb-0.5">🏆 Líder de Ventas</span>
                            <span className="text-xs font-black text-gray-800 block truncate max-w-[150px]">{liderVentas.name}</span>
                            <span className="text-[10px] font-bold text-gray-500">Logrado: ${liderVentas.adjudicado.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                          </div>
                          <div className="w-9 h-9 rounded-full bg-indigo-100/80 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0 select-none">
                            {liderVentas.name.charAt(0)}
                          </div>
                        </div>
                      )}
                      {liderPipeline && (
                        <div className="bg-emerald-50/20 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                          <div>
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-0.5">💼 Líder de Pipeline</span>
                            <span className="text-xs font-black text-gray-800 block truncate max-w-[150px]">{liderPipeline.name}</span>
                            <span className="text-[10px] font-bold text-gray-500">Cartera: ${liderPipeline.pipeline.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                          </div>
                          <div className="w-9 h-9 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0 select-none">
                            {liderPipeline.name.charAt(0)}
                          </div>
                        </div>
                      )}
                      {liderEficiencia && (
                        <div className="bg-amber-50/20 border border-amber-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                          <div>
                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block mb-0.5">⚡ Ejecutivo Más Eficiente</span>
                            <span className="text-xs font-black text-gray-800 block truncate max-w-[150px]">{liderEficiencia.name}</span>
                            <span className="text-[10px] font-bold text-gray-500">Tasa Cierre: {(liderEficiencia.conversion * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-9 h-9 rounded-full bg-amber-100/80 text-amber-700 flex items-center justify-center font-black text-xs shrink-0 select-none">
                            {liderEficiencia.name.charAt(0)}
                          </div>
                        </div>
                      )}
                    </div>

                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">
                      Ranking de Ventas por Ejecutivo
                    </h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-black uppercase tracking-wider text-[9px] select-none text-center">
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort("name")}>
                              Ejecutivo Comercial{getSortIcon("name")}
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort("cantidad")}>
                              Cant. Cotizaciones{getSortIcon("cantidad")}
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort("cotizado")}>
                              Monto Cotizado{getSortIcon("cotizado")}
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort("adjudicado")}>
                              Monto Ganado{getSortIcon("adjudicado")}
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort("pipeline")}>
                              Pipeline Activo{getSortIcon("pipeline")}
                            </th>
                            <th className="px-4 py-3 text-center">
                              Meta Individual
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort("adjudicado")}>
                              Cumplimiento Meta{getSortIcon("adjudicado")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {performanceBySalesperson.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-6 text-gray-400 font-medium">Sin datos de ejecutivos en este período</td>
                            </tr>
                          ) : (
                            performanceBySalesperson.map((v, i) => {
                              const metaIndividual = 100000;
                              const rateText = v.adjudicado > 0 ? ((v.adjudicado / metaIndividual) * 100).toFixed(0) : 0;
                              const barRate = Math.min(Number(rateText), 100);
                              const conversionRate = v.cantidadCerrada > 0 ? ((v.cantidadAdjudicada / v.cantidadCerrada) * 100).toFixed(0) : 0;
                              const ticketPromedioGanado = v.cantidadAdjudicada > 0 ? (v.adjudicado / v.cantidadAdjudicada) : 0;

                              return (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="px-4 py-3 font-bold text-gray-700 flex flex-col items-center justify-center gap-0.5 text-center">
                                    <div className="flex items-center gap-2 justify-center">
                                      <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-[10px] shrink-0">
                                        {v.name.charAt(0)}
                                      </div>
                                      <span className="truncate max-w-[160px]">{v.name}</span>
                                    </div>
                                    <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider pl-0">
                                      Conversión: {conversionRate}% | Ticket Prom. Ganado: ${Math.round(ticketPromedioGanado).toLocaleString()}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center font-medium text-gray-600">{v.cantidad}</td>
                                  <td className="px-4 py-3 text-center font-medium text-gray-500">${v.cotizado.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                  <td className="px-4 py-3 text-center font-black text-gray-800">${v.adjudicado.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                  <td className="px-4 py-3 text-center font-bold text-indigo-600/90">${v.pipeline.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                  <td className="px-4 py-3 text-center font-medium text-gray-500">${metaIndividual.toLocaleString()}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 justify-center">
                                      <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden shrink-0">
                                        <div 
                                          className="bg-indigo-600 h-full rounded-full" 
                                          style={{ width: `${barRate}%` }}
                                        />
                                      </div>
                                      <span className="font-bold text-gray-600 text-[10px] w-10 text-right">{rateText}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ) : (
                <div className="pt-2">
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">Ranking de Desempeño por Proveedor</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-black uppercase tracking-wider text-[9px]">
                          <th className="px-4 py-3">Proveedor Homologado</th>
                          <th className="px-4 py-3 text-right">Cant. Órdenes Compra</th>
                          <th className="px-4 py-3 text-right">Lead Time Promedio</th>
                          <th className="px-4 py-3 text-right">Monto Comprado</th>
                          <th className="px-4 py-3 text-center">Tasa de Cumplimiento (Fill Rate)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {performanceBySupplier.map((p, i) => {
                          return (
                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-bold text-gray-700 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-black text-[10px]">
                                  {p.name.charAt(0)}
                                </div>
                                {p.name}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-600">{p.ordenes}</td>
                              <td className="px-4 py-3 text-right font-medium text-gray-500">{p.leadTime.toFixed(1)} días</td>
                              <td className="px-4 py-3 text-right font-black text-gray-800">${p.monto.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 justify-center">
                                  <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden shrink-0">
                                    <div 
                                      className={`h-full rounded-full ${p.fillRate >= 95 ? 'bg-emerald-500' : (p.fillRate >= 90 ? 'bg-yellow-500' : 'bg-red-500')}`} 
                                      style={{ width: `${p.fillRate}%` }}
                                    />
                                  </div>
                                  <span className="font-bold text-gray-600 text-[10px] w-8 text-right">{p.fillRate.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === "simulador" && (
            <motion.div
              key={`${module}-simulador`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-12 gap-8"
            >
              {/* CONTROLES SIMULACIÓN */}
              <div className="col-span-12 lg:col-span-5 space-y-5 bg-gray-50/55 p-6 rounded-2xl border border-gray-200">
                {module === "comercial" ? (
                  <>
                    <div>
                      <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-1">Configuración del Escenario Comercial</h3>
                      <p className="text-[10px] text-gray-400">Modifica los indicadores y modelos para estimar ventas futuras.</p>
                    </div>

                    {/* SELECTOR DE EJECUTIVO COMERCIAL */}
                    {viewScope !== "personal" && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider block">Ejecutivo Comercial</label>
                        <select
                          value={comercialSeleccionado}
                          onChange={(e) => setComercialSeleccionado(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="todos">TODOS LOS EJECUTIVOS</option>
                          {listaComerciales.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* MODELO DE PROYECCIÓN */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider block">Modelo de Proyección</label>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 w-full">
                        <button
                          type="button"
                          onClick={() => setModeloProyeccion("monto_real")}
                          className={`flex-1 text-center py-1 text-[9px] font-black rounded transition-all uppercase tracking-wider ${
                            modeloProyeccion === "monto_real" ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Monto Real ($)
                        </button>
                        <button
                          type="button"
                          onClick={() => setModeloProyeccion("ticket_promedio")}
                          className={`flex-1 text-center py-1 text-[9px] font-black rounded transition-all uppercase tracking-wider ${
                            modeloProyeccion === "ticket_promedio" ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Ticket Promedio
                        </button>
                      </div>
                    </div>

                    {/* ESCENARIOS RÁPIDOS */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider block">Ajustes Rápidos de Escenario</label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => aplicarEscenario("conservador")}
                          className="flex-1 py-1 px-1.5 border border-red-200 text-red-600 bg-red-50/20 hover:bg-red-50 text-[9px] font-black rounded-lg transition-colors uppercase tracking-wider"
                        >
                          🔴 Conservador
                        </button>
                        <button
                          type="button"
                          onClick={() => aplicarEscenario("moderado")}
                          className="flex-1 py-1 px-1.5 border border-amber-200 text-amber-600 bg-amber-50/20 hover:bg-amber-50 text-[9px] font-black rounded-lg transition-colors uppercase tracking-wider"
                        >
                          🟡 Moderado
                        </button>
                        <button
                          type="button"
                          onClick={() => aplicarEscenario("optimista")}
                          className="flex-1 py-1 px-1.5 border border-emerald-200 text-emerald-600 bg-emerald-50/20 hover:bg-emerald-50 text-[9px] font-black rounded-lg transition-colors uppercase tracking-wider"
                        >
                          🟢 Optimista
                        </button>
                      </div>
                    </div>

                    {/* BASE SIMULACION TOGGLE */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider block">Base de la Simulación</label>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 w-full">
                        <button
                          type="button"
                          onClick={() => setBaseSimulacion("todas")}
                          className={`flex-1 text-center py-1 text-[9px] font-black rounded transition-all uppercase tracking-wider ${
                            baseSimulacion === "todas" ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Todas ({filteredPool.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBaseSimulacion("activas")}
                          className={`flex-1 text-center py-1 text-[9px] font-black rounded transition-all uppercase tracking-wider ${
                            baseSimulacion === "activas" ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Solo Activas ({filteredPool.filter(c => c.estado_nombre !== "Adjudicado" && c.envio !== 3 && !String(c.estado).toLowerCase().includes("adjudicado") && c.estado_nombre !== "Anulada" && c.estado_nombre !== "Rechazada").length})
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-gray-600">
                        <span>Tasa de Cierre Estimada</span>
                        <span className="text-indigo-600 font-black">{tasaCierre}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="100" 
                        value={tasaCierre} 
                        onChange={(e) => setTasaCierre(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                        <span>5%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <div className={`space-y-2 transition-all duration-200 ${modeloProyeccion === "monto_real" ? "opacity-35 cursor-not-allowed pointer-events-none" : ""}`}>
                      <div className="flex justify-between text-xs font-bold text-gray-600">
                        <span>Ticket Promedio de Venta {modeloProyeccion === "monto_real" && <span className="text-[8px] text-gray-400 font-normal italic">(No aplica)</span>}</span>
                        <span className="text-indigo-600 font-black">${ticketPromedio.toLocaleString()}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1000" 
                        max="100000" 
                        step="1000"
                        value={ticketPromedio} 
                        onChange={(e) => setTicketPromedio(Number(e.target.value))}
                        disabled={modeloProyeccion === "monto_real"}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                        <span>$1,000</span>
                        <span>$100,000</span>
                      </div>
                    </div>

                    {/* COMISION SLIDER */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-gray-600">
                        <span>Tasa de Comisión Estimada</span>
                        <span className="text-indigo-600 font-black">{comisionTasa.toFixed(1)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="5.0" 
                        step="0.1"
                        value={comisionTasa} 
                        onChange={(e) => setComisionTasa(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                        <span>0.5%</span>
                        <span>5.0%</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200/60 text-[10px] text-gray-400 leading-normal font-medium space-y-1">
                      <span className="font-bold text-gray-500 block">Fórmula de Proyección:</span>
                      {modeloProyeccion === "monto_real" ? (
                        <span>Proyectado = Suma real cotizada (${poolSumMontoReal.toLocaleString(undefined, {maximumFractionDigits: 0})}) × tasa de cierre ({tasaCierre}%).</span>
                      ) : (
                        <span>Proyectado = cotizaciones base ({baseSimulacion === "activas" ? "activas" : "todas"}) × tasa de cierre ({tasaCierre}%) × ticket promedio (${ticketPromedio.toLocaleString()}).</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-1">Simulación de Calidad de Suministros</h3>
                      <p className="text-[10px] text-gray-400">Modifica las variables de tiempo para simular la efectividad de recepción.</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-gray-600">
                        <span>Lead Time de Entrega Objetivo</span>
                        <span className="text-indigo-600 font-black">{targetLeadTime.toFixed(1)} días</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="12" 
                        step="0.5"
                        value={targetLeadTime} 
                        onChange={(e) => setTargetLeadTime(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                        <span>1.0 día</span>
                        <span>12.0 días</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-gray-600">
                        <span>Fiabilidad Base del Proveedor</span>
                        <span className="text-indigo-600 font-black">{supplierReliability}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="100" 
                        value={supplierReliability} 
                        onChange={(e) => setSupplierReliability(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200/60 text-[10px] text-gray-400 leading-normal font-medium">
                      <span className="font-bold text-gray-500 block mb-0.5">Penalización por Retraso:</span>
                      Si el Lead Time excede los 5 días, se descuenta un 8.5% de cumplimiento por cada día adicional.
                    </div>
                  </>
                )}
              </div>

              {/* RESULTADO SIMULACIÓN */}
              <div className="col-span-12 lg:col-span-7 flex flex-col justify-center items-center text-center p-6 space-y-6">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
                  <Calculator size={32} />
                </div>

                {module === "comercial" ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg">
                      <div className="bg-gray-50 border border-gray-200/60 p-5 rounded-2xl text-center shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                          {viewScope === "personal" ? "Mis Ventas Proyectadas" : "Ventas Proyectadas"}
                        </span>
                        <h2 className="text-2xl font-[1000] text-gray-800 tracking-tight leading-none">
                          ${simulacionResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-2">
                          Basado en {baseSimulacion === "activas" ? "pipeline activo" : "todas las cotizaciones"} {viewScope === "personal" ? "personales" : (comercialSeleccionado !== "todos" ? `de ${comercialSeleccionado}` : "")}
                        </p>
                      </div>

                      <div className="bg-indigo-50/30 border border-indigo-100 p-5 rounded-2xl text-center shadow-sm">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">
                          {viewScope === "personal" ? "Mi Comisión Estimada" : "Comisión Estimada"}
                        </span>
                        <h2 className="text-2xl font-[1000] text-indigo-700 tracking-tight leading-none">
                          ${comisionResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[9px] text-indigo-600/80 font-bold uppercase tracking-wider mt-2">
                          Calculado al {comisionTasa.toFixed(1)}% {viewScope === "personal" ? "de comisión personal" : (comercialSeleccionado !== "todos" ? `para ${comercialSeleccionado.split(" ")[0]}` : "de comisión")}
                        </p>
                      </div>
                    </div>

                    <div className="w-full max-w-lg bg-gray-50 border border-gray-200/60 p-4 rounded-2xl flex justify-between items-center text-left">
                      <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                          {viewScope === "personal" ? "Meta Anual Personal" : "Meta Anual Referencial"}
                        </span>
                        <span className="text-sm font-black text-gray-700">
                          {viewScope === "personal" ? "$100,000.00" : "$500,000.00"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">% de Cobertura Sim.</span>
                        <span className="text-sm font-black text-emerald-600">
                          {((simulacionResult / (viewScope === "personal" ? 100000 : 500000)) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tasa de Fill Rate Estimada</span>
                      <h2 className="text-4xl font-[1000] text-gray-800 tracking-tight leading-none mb-2">
                        {simulacionLogisticaResult.toFixed(1)}%
                      </h2>
                      <p className="text-xs text-gray-500 font-medium max-w-sm">
                        Una reducción en los tiempos de entrega optimiza la disponibilidad en almacén de inmediato.
                      </p>
                    </div>

                    <div className="w-full max-w-md bg-gray-50 border border-gray-200/60 p-4 rounded-2xl flex justify-between items-center text-left">
                      <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Estado de Recepciones Proyectado</span>
                        <span className="text-sm font-black text-gray-700">
                          {simulacionLogisticaResult >= 95 ? "EXCELENTE" : (simulacionLogisticaResult >= 90 ? "ALERTA LEVE" : "RIESGO ABASTECIMIENTO")}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Calificación General</span>
                        <span className={`text-sm font-black ${simulacionLogisticaResult >= 95 ? 'text-emerald-600' : (simulacionLogisticaResult >= 90 ? 'text-yellow-600' : 'text-red-600')}`}>
                          {simulacionLogisticaResult >= 95 ? "A+" : (simulacionLogisticaResult >= 90 ? "B" : "F")}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
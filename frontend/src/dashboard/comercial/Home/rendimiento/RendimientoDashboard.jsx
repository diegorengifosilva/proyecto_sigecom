import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Award, Percent, Calculator, Clock, CheckCircle } from "lucide-react";

export default function RendimientoDashboard({ module = "comercial", anno, mes, cotizaciones = [] }) {
  const [tab, setTab] = useState("overview");

  // Estados para el Simulador Comercial
  const [tasaCierre, setTasaCierre] = useState(25); // por ciento
  const [ticketPromedio, setTicketPromedio] = useState(15000); // dólares/soles

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
        map[name] = { name, cotizado: 0, adjudicado: 0, cantidad: 0, cantidadAdjudicada: 0 };
      }
      const amount = Number(c.tot_c || c.total_cotizacion || 0);
      map[name].cotizado += amount;
      map[name].cantidad += 1;
      if (c.estado_nombre === "Adjudicado" || c.envio === 3 || String(c.estado).toLowerCase().includes("adjudicado")) {
        map[name].adjudicado += amount;
        map[name].cantidadAdjudicada += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.adjudicado - a.adjudicado);
  }, [module, cotizaciones]);

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
    const totalDocs = cotizaciones.length;
    const proyectado = totalDocs * (tasaCierre / 100) * ticketPromedio;
    return proyectado;
  }, [cotizaciones, tasaCierre, ticketPromedio]);

  // Simulación Logística (Fill Rate estimado según Lead Time y Confiabilidad)
  const simulacionLogisticaResult = useMemo(() => {
    const delayPenalty = targetLeadTime > 5.0 ? (targetLeadTime - 5.0) * 8.5 : 0;
    const estimated = Math.max(0, Math.min(100, supplierReliability - delayPenalty));
    return estimated;
  }, [targetLeadTime, supplierReliability]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* HEADER DE RENDIMIENTO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-2">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 tracking-tight">
            <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
              <TrendingUp size={16} />
            </div>
            {module === "logistica" ? `Desempeño y Simulación Logística ${anno}` : `Rendimiento Comercial ${anno}`}
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-10">
            {module === "logistica" ? "Análisis de eficiencia de abastecimiento y simulación de calidad" : "Control de metas y proyecciones de ventas"}
          </p>
        </div>

        {/* TABS */}
        <div className="flex bg-gray-50 border border-gray-200 p-0.5 rounded-xl">
          {tabs.map((t) => {
            const isSel = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  isSel
                    ? "bg-white text-indigo-600 shadow-sm border border-gray-200/50"
                    : "text-gray-500 hover:text-gray-800"
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
                  <div className="bg-gray-50/50 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Monto Adjudicado (Logrado)</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[900] text-gray-800">${totals.adjudicado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 block mt-2">De un total cotizado de ${totals.cotizado.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>

                  <div className="bg-gray-50/50 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Proyectos Ganados / Totales</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[900] text-gray-800">{totals.adjudicadosDocs}</span>
                      <span className="text-xs text-gray-400 font-bold">/ {totals.totalDocs} Docs</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full" 
                        style={{ width: `${totals.totalDocs > 0 ? (totals.adjudicadosDocs / totals.totalDocs) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50/50 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tasa de Cierre Real</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[900] text-gray-800">{totals.tasaConversion}%</span>
                      <Percent className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 block mt-2">Porcentaje de éxito basado en documentos</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50/50 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Compras Emitidas</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[900] text-gray-800">${logisticsTotals.monto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 block mt-2">Acumulado en {logisticsTotals.ordenes} órdenes de compra emitidas</span>
                  </div>

                  <div className="bg-gray-50/50 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fill Rate Promedio</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[900] text-gray-800">{logisticsTotals.fillRateAvg.toFixed(1)}%</span>
                      <CheckCircle className="w-4 h-4 text-indigo-500 ml-1 inline" />
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full" 
                        style={{ width: `${logisticsTotals.fillRateAvg}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50/50 border border-gray-200/60 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Lead Time Promedio</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-[900] text-gray-800">{logisticsTotals.leadTimeAvg.toFixed(1)} d</span>
                      <Clock className="w-4 h-4 text-emerald-500 ml-1 inline" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 block mt-2">Días promedio de retraso en entrega</span>
                  </div>
                </div>
              )}

              {/* TABLA PRINCIPAL */}
              {module === "comercial" ? (
                <div className="pt-2">
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">Ranking de Ventas por Ejecutivo</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-black uppercase tracking-wider text-[9px]">
                          <th className="px-4 py-3">Ejecutivo Comercial</th>
                          <th className="px-4 py-3 text-right">Cant. Cotizaciones</th>
                          <th className="px-4 py-3 text-right">Cant. Ganadas</th>
                          <th className="px-4 py-3 text-right">Monto Cotizado</th>
                          <th className="px-4 py-3 text-right">Monto Ganado</th>
                          <th className="px-4 py-3 text-center">Cumplimiento / Progreso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {performanceBySalesperson.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-gray-400 font-medium">Sin datos de ejecutivos en este período</td>
                          </tr>
                        ) : (
                          performanceBySalesperson.map((v, i) => {
                            const rate = v.cantidad > 0 ? ((v.cantidadAdjudicada / v.cantidad) * 100).toFixed(0) : 0;
                            return (
                              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 font-bold text-gray-700 flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-[10px]">
                                    {v.name.charAt(0)}
                                  </div>
                                  {v.name}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-gray-600">{v.cantidad}</td>
                                <td className="px-4 py-3 text-right font-medium text-emerald-600">{v.cantidadAdjudicada}</td>
                                <td className="px-4 py-3 text-right font-medium text-gray-500">${v.cotizado.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td className="px-4 py-3 text-right font-black text-gray-800">${v.adjudicado.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2 justify-center">
                                    <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden shrink-0">
                                      <div 
                                        className="bg-indigo-600 h-full rounded-full" 
                                        style={{ width: `${Math.min(rate * 2, 100)}%` }}
                                      />
                                    </div>
                                    <span className="font-bold text-gray-600 text-[10px] w-8 text-right">{rate}%</span>
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
              <div className="col-span-12 lg:col-span-5 space-y-6 bg-gray-50/55 p-6 rounded-2xl border border-gray-200">
                {module === "comercial" ? (
                  <>
                    <div>
                      <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-1">Configuración del Escenario Comercial</h3>
                      <p className="text-[10px] text-gray-400">Modifica los indicadores promedio para estimar ventas futuras.</p>
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

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-gray-600">
                        <span>Ticket Promedio de Venta</span>
                        <span className="text-indigo-600 font-black">${ticketPromedio.toLocaleString()}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1000" 
                        max="100000" 
                        step="1000"
                        value={ticketPromedio} 
                        onChange={(e) => setTicketPromedio(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                        <span>$1,000</span>
                        <span>$100,000</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200/60 text-[10px] text-gray-400 leading-normal font-medium">
                      <span className="font-bold text-gray-500 block mb-0.5">Fórmula de Proyección:</span>
                      Proyectado = total de cotizaciones del período ({cotizaciones.length}) × tasa de cierre (%) × ticket promedio.
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
                  <Calculator size={36} />
                </div>

                {module === "comercial" ? (
                  <>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ventas Proyectadas Estimadas</span>
                      <h2 className="text-4xl font-[1000] text-gray-800 tracking-tight leading-none mb-2">
                        ${simulacionResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h2>
                      <p className="text-xs text-gray-500 font-medium max-w-sm">
                        Simulación basada en el volumen actual de <span className="font-black text-gray-700">{cotizaciones.length} cotizaciones</span> registradas en el período.
                      </p>
                    </div>

                    <div className="w-full max-w-md bg-gray-50 border border-gray-200/60 p-4 rounded-2xl flex justify-between items-center text-left">
                      <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Meta Anual Referencial</span>
                        <span className="text-sm font-black text-gray-700">$500,000.00</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">% de Cobertura Sim.</span>
                        <span className="text-sm font-black text-emerald-600">
                          {((simulacionResult / 500000) * 100).toFixed(0)}%
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
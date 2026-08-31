import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList
} from "recharts";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, AlertTriangle, CheckCircle, Clock, ArrowRight } from "lucide-react";

/* ==================================
    TOOLTIP PERSONALIZADO (Clientes)
================================== */
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg font-sans">
        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 border-b border-slate-100 pb-1">
          {data.nombre}
        </p>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-6 text-[10px]">
            <span className="text-slate-500 font-semibold">Cotizaciones:</span>
            <span className="font-bold text-slate-700">{data.cotizaciones}</span>
          </div>
          <div className="flex justify-between gap-6 text-[10px]">
            <span className="text-slate-500 font-semibold">Monto Cotizado:</span>
            <span className="font-mono font-bold text-slate-700">
              $ {data.monto_cotizado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between gap-6 text-[10px]">
            <span className="text-[#06A99C] font-bold">Venta Real:</span>
            <span className="font-mono font-bold text-[#06A99C]">
              $ {data.monto_real.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between gap-6 text-[10px] border-t border-slate-100 pt-1">
            <span className="text-indigo-600 font-bold">Eficiencia (Conversión):</span>
            <span className="font-bold text-indigo-700">{data.conversion}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function ClientesChart({ data = [], viewScope = "global", cotizaciones = [] }) {
  const isPersonal = viewScope === "personal";
  const navigate = useNavigate();

  // 1️⃣ Vista Global: Clientes con mayor venta real (Top 10)
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data.map(item => ({
      ...item,
      nombre: item.nombre || "Desconocido", 
      codigo: item.codigo,
      cotizaciones: Number(item.cotizaciones || 0),
      monto_cotizado: Number(item.monto_cotizado || 0),
      monto_real: Number(item.monto_real || 0),
      conversion: Number(item.conversion || 0)
    }));
  }, [data]);

  // 2️⃣ Vista Personal: Oportunidades en Riesgo (Stuck > 45 days)
  const stuckQuotes = useMemo(() => {
    if (!cotizaciones || !Array.isArray(cotizaciones)) return [];
    
    return cotizaciones
      .filter(c => {
        const isNotSent = Number(c.estado_envio) === 1 || !c.estado_envio;
        if (!isNotSent) return false;
        
        const qDate = new Date(c.fecha || c.cotif);
        const days = Math.floor((new Date() - qDate) / (1000 * 60 * 60 * 24));
        return days > 45;
      })
      .map(c => {
        const qDate = new Date(c.fecha || c.cotif);
        const days = Math.floor((new Date() - qDate) / (1000 * 60 * 60 * 24));
        return {
          ...c,
          daysElapsed: days,
          severity: days > 60 ? "critical" : "warning"
        };
      })
      .sort((a, b) => b.daysElapsed - a.daysElapsed)
      .slice(0, 5);
  }, [cotizaciones]);

  if (!isPersonal && (!data || data.length === 0)) return (
    <div className="h-[300px] flex items-center justify-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-[1.5rem] border border-dashed border-slate-200">
      Sin datos de clientes
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm h-full flex flex-col min-w-0 overflow-hidden"
    >
      {/* HEADER */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-1.5 rounded-lg ${isPersonal ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"}`}>
              {isPersonal ? <AlertTriangle className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <h3 className="text-[13px] font-[900] text-slate-800 tracking-tight">
              {isPersonal ? "Oportunidades en Riesgo de Pérdida" : "Clientes con Mayor Venta Real"}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-8">
            {isPersonal ? "COTIZACIONES PENDIENTES SIN AVANCES CON >45 DÍAS" : "TOP 10 POR FACTURACIÓN ADJUDICADA"}
          </p>
        </div>
        
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          {isPersonal ? <AlertTriangle className="w-4 h-4 text-slate-400" /> : <Users className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* CONTENIDO DIVERGENTE */}
      <div className="flex-1 flex flex-col justify-center w-full">
        {isPersonal ? (
          /* LISTA DE OPORTUNIDADES EN RIESGO */
          <div className="space-y-3 min-h-[320px] flex flex-col justify-center">
            {stuckQuotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">¡Al día!</h4>
                <p className="text-[10px] text-slate-500">No tienes cotizaciones pendientes estancadas con más de 45 días.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stuckQuotes.map((q, idx) => (
                  <motion.div 
                    key={q.id_registro || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      const targetReg = q.num_registro || q.num_reg || q.id_registro;
                      if (targetReg) {
                        const isOportunidad = (q.estado_nombre || "").toLowerCase().includes("oportunidad") || q.id_estado === 11;
                        const path = isOportunidad ? "oportunidades" : "cotizaciones";
                        navigate(`/comercial/${path}/${targetReg}`);
                      }
                    }}
                    className="group flex items-center justify-between p-3 bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 rounded-xl cursor-pointer transition-all duration-300"
                  >
                    <div className="flex flex-col gap-0.5 max-w-[70%]">
                      <span className="text-[11px] font-black text-slate-800 truncate uppercase tracking-tight">
                        {!q.cliente || q.cliente.trim() === "-" 
                          ? `Cotización: ${q.numero || q.num_registro || "Sin Número"}` 
                          : q.cliente}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
                        <span className="px-1.5 py-0.5 bg-slate-200/50 text-slate-600 rounded">
                          {!q.cliente || q.cliente.trim() === "-" ? "Sin Cliente Especificado" : `Doc: ${q.numero || q.num_registro}`}
                        </span>
                        <span>•</span>
                        <span className="text-indigo-600">
                          {q.tmone === "D" ? "$" : "S/."} {Number(q.tot_c || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${
                          q.severity === "critical" 
                            ? "bg-rose-50 text-rose-600 border border-rose-100" 
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          <Clock size={10} /> {q.daysElapsed} días
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                          {q.severity === "critical" ? "Crítico" : "Alerta"}
                        </span>
                      </div>
                      
                      <div className="p-1 rounded-md text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300">
                        <ArrowRight size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* GRÁFICO DE BARRAS HORIZONTAL PROFESIONAL (Top 10) */
          <div className="w-full flex-grow min-h-[220px] flex flex-col mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.slice(0, 10)}
                layout="vertical"
                margin={{ top: 10, right: 45, left: 35, bottom: 5 }}
                barSize={12}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide /> 
                <YAxis 
                  dataKey="nombre" 
                  type="category" 
                  tick={({ x, y, payload }) => (
                    <text 
                      x={x - 8} 
                      y={y} 
                      dy={4}
                      fill="#475569" 
                      fontSize={9} 
                      fontWeight={600} 
                      textAnchor="end"
                      fontFamily="Inter, sans-serif"
                    >
                      {payload.value.length > 25 
                        ? `${payload.value.substring(0, 22)}...` 
                        : payload.value}
                    </text>
                  )}
                  axisLine={false}
                  tickLine={false}
                  width={150} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 4 }} />
                <Bar 
                  dataKey="monto_real" 
                  fill="#06a99c" 
                  radius={[0, 6, 6, 0]}
                  background={{ fill: '#f8fafc', radius: [0, 6, 6, 0] }}
                >
                  <LabelList 
                    dataKey="monto_real" 
                    position="right" 
                    formatter={(val) => `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    style={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
                    offset={8}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
        <div className="flex flex-col overflow-hidden">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            {isPersonal ? "Acción Requerida" : "LÍDER COMERCIAL"}
          </span>
          <span className="text-[10px] font-extrabold text-slate-700 truncate max-w-[180px]">
            {isPersonal 
              ? (stuckQuotes.length > 0 ? "Priorizar contactos y reactivar" : "Ninguna action pendiente")
              : chartData[0]?.nombre}
          </span>
        </div>
        <div className="text-right flex flex-col">
          <span className="text-[8px] font-bold text-slate-400 uppercase">
            {isPersonal ? "Total Pendiente" : "VENTA REAL LÍDER"}
          </span>
          <span className="text-[11px] font-black text-[#06A99C] italic">
            {isPersonal 
              ? `${stuckQuotes.length} en alerta` 
              : `$ ${chartData[0]?.monto_real.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
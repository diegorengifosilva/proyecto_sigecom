import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  FileText, Target, TrendingUp, Zap, ArrowUpRight, ArrowDownRight 
} from "lucide-react";
import api from "@/services/api";

/* =========================
   UTILIDADES DE FORMATEO (UX Improvement)
========================= */
const formatValue = (value, isCurrency = false) => {
  const num = Number(value) || 0;
  const prefix = isCurrency ? "$" : "";
  
  if (num >= 1000000) {
    return `${prefix}${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${prefix}${(num / 1000).toFixed(1)}k`;
  }
  return `${prefix}${num.toLocaleString()}`;
};

/* =========================
   SUB-COMPONENTE KPI CARD
========================= */
const KPICard = ({ label, current, accumulated, icon: Icon, color, category, unit, trend, delay, showProgress = false, rawProgress = 0 }) => {
  const colorMap = {
    cian: { bg: "bg-[#CCFBF1]/30", border: "border-[#06A99C]/20", text: "text-[#134E4A]", iconBg: "bg-[#06A99C]/10", icon: "text-[#06A99C]", bar: "bg-[#06A99C]" },
    emerald: { bg: "bg-emerald-50/40", border: "border-emerald-100", text: "text-emerald-700", iconBg: "bg-emerald-100/50", icon: "text-emerald-600", bar: "bg-emerald-500" },
    indigo: { bg: "bg-indigo-50/40", border: "border-indigo-100", text: "text-indigo-700", iconBg: "bg-indigo-100/50", icon: "text-indigo-600", bar: "bg-indigo-500" },
    amber: { bg: "bg-amber-50/40", border: "border-amber-100", text: "text-amber-700", iconBg: "bg-amber-100/50", icon: "text-amber-600", bar: "bg-amber-500" },
  };

  const style = colorMap[color] || colorMap.cian;
  const isNegative = trend < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.1 }}
      className={`relative overflow-hidden p-4 rounded-[1.5rem] border shadow-sm flex flex-col justify-between min-h-[140px] bg-white hover:shadow-md transition-all ${style.border}`}
    >
      {/* HEADER */}
      <div className="flex justify-between items-start relative z-10">
        <div className={`p-2 rounded-xl ${style.iconBg}`}>
          <Icon className={`w-4 h-4 ${style.icon}`} />
        </div>
        <div className="flex flex-col items-end">
           <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${style.bg} ${style.text}`}>
            {category}
          </span>
          {trend !== null && (
            <div 
              title="Vs. mes anterior" 
              className={`flex items-center mt-1 text-[10px] font-black cursor-help ${isNegative ? "text-rose-500" : "text-emerald-500"}`}
            >
              {isNegative ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="mt-3 relative z-10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-0.5">
          {label} <span className="text-[8px] opacity-70">(Mes)</span>
        </p>
        <div className="flex items-baseline gap-1">
          <h3 className="text-2xl font-[1000] tracking-tighter leading-none text-slate-800">
            {current}
          </h3>
          <span className="text-[10px] font-black text-slate-400 uppercase">{unit}</span>
        </div>
      </div>

      {/* PROGRESS BAR (Para Efectividad) */}
      {showProgress && (
        <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(rawProgress, 100)}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className={`h-full ${style.bar}`}
          />
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-3 pt-2 border-t border-slate-50 flex justify-between items-center relative z-10">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Acumulado Anual</span>
        <span className={`text-[11px] font-[900] ${style.text}`}>
          {accumulated} <small className="text-[8px] font-normal opacity-60">{unit}</small>
        </span>
      </div>
    </motion.div>
  );
};

/* =========================
   COMPONENTE PRINCIPAL
========================= */
export default function KpisResumen({ 
  data,
  loading
}) {
  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-[140px] bg-slate-50 animate-pulse rounded-[1.5rem] border border-slate-100" />
      ))}
    </div>
  );

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full">
      {/* KPI 1: CANTIDAD */}
      <KPICard
        label="Cotizaciones"
        current={data.cotizaciones_mes || 0}
        accumulated={data.total_cotizaciones?.anual || 0}
        icon={FileText}
        color="cian"
        category="Flujo"
        unit="Docs"
        trend={data.total_cotizaciones?.variacion}
        delay={0}
      />

      {/* KPI 2: MONTO COTIZADO (Human-Readable) */}
      <KPICard
        label="Monto Cotizado"
        current={formatValue(data.monto_mes, true)}
        accumulated={formatValue(data.monto_total?.anual, true)}
        icon={TrendingUp}
        color="indigo"
        category="Potencial"
        unit="USD"
        trend={data.monto_total?.variacion} 
        delay={1}
      />

      {/* KPI 3: VENTAS REALES (Human-Readable) */}
      <KPICard
        label="Ventas Cerradas"
        current={formatValue(data.ventas_reales_mes, true)}
        accumulated={formatValue(data.ventas_reales_anual, true)}
        icon={Zap}
        color="emerald"
        category="Cierre"
        unit="USD"
        trend={data.ventas_variacion}
        delay={2}
      />

      {/* KPI 4: EFECTIVIDAD (Con Barra de Progreso) */}
      <KPICard
        label="Efectividad"
        current={`${data.porcentaje_aprobacion_mes || 0}%`}
        accumulated={`${data.porcentaje_aprobacion || 0}%`}
        icon={Target}
        color="amber"
        category="Eficiencia"
        unit="Ratio"
        trend={null}
        delay={3}
        showProgress={true}
        rawProgress={data.porcentaje_aprobacion_mes}
      />
    </div>
  );
}
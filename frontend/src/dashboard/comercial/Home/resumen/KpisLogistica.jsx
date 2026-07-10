import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Clock, CheckCircle, ShoppingBag, Database, ArrowUpRight, ArrowDownRight 
} from "lucide-react";

/* =========================
   UTILIDADES DE FORMATEO
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

      {/* PROGRESS BAR */}
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
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Meta del Año</span>
        <span className={`text-[11px] font-[900] ${style.text}`}>
          {accumulated} <small className="text-[8px] font-normal opacity-60">{unit}</small>
        </span>
      </div>
    </motion.div>
  );
};

export default function KpisLogistica({ anno = new Date().getFullYear(), mes = "%" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generar datos de simulación basados en semilla determinista del año y mes
    const seed = Number(anno) + (mes === "%" ? 6 : Number(mes));
    const randomVal = (min, max, offset = 0) => {
      const x = Math.sin(seed + offset) * 10000;
      return min + Math.floor((x - Math.floor(x)) * (max - min));
    };

    setLoading(true);
    const timer = setTimeout(() => {
      const leadTimeMes = (randomVal(30, 60, 1) / 10).toFixed(1);
      const leadTimeAnual = (randomVal(35, 55, 2) / 10).toFixed(1);
      const fillRateMes = randomVal(92, 99, 3);
      const fillRateAnual = randomVal(94, 98, 4);
      const comprasMes = randomVal(80000, 180000, 5);
      const comprasAnual = randomVal(900000, 1900000, 6);
      const invMes = randomVal(1100, 1400, 7);
      const invAnual = 1500;

      setData({
        leadTimeMes,
        leadTimeAnual,
        leadTimeTrend: -(randomVal(5, 15, 8) / 10).toFixed(1), // negativo es mejor en lead time
        fillRateMes,
        fillRateAnual,
        fillRateTrend: (randomVal(1, 3, 9) / 10).toFixed(1),
        comprasMes,
        comprasAnual,
        comprasTrend: (randomVal(2, 12, 10)).toFixed(1),
        invMes,
        invAnual,
        invTrend: (randomVal(1, 5, 11) / 10).toFixed(1),
      });
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [anno, mes]);

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
      {/* KPI 1: LEAD TIME */}
      <KPICard
        label="Lead Time Promedio"
        current={`${data.leadTimeMes} d`}
        accumulated={`${data.leadTimeAnual} d`}
        icon={Clock}
        color="cian"
        category="Abastecimiento"
        unit="Días"
        trend={data.leadTimeTrend}
        delay={0}
      />

      {/* KPI 2: FILL RATE */}
      <KPICard
        label="Fill Rate Recepciones"
        current={`${data.fillRateMes}%`}
        accumulated={`${data.fillRateAnual}%`}
        icon={CheckCircle}
        color="indigo"
        category="Eficiencia"
        unit="Ratio"
        trend={data.fillRateTrend}
        delay={1}
        showProgress={true}
        rawProgress={data.fillRateMes}
      />

      {/* KPI 3: COMPRAS TOTALES */}
      <KPICard
        label="Monto de Compras"
        current={formatValue(data.comprasMes, true)}
        accumulated={formatValue(data.comprasAnual, true)}
        icon={ShoppingBag}
        color="emerald"
        category="Adquisición"
        unit="USD"
        trend={data.comprasTrend}
        delay={2}
      />

      {/* KPI 4: STOCK / REFERENCIAS */}
      <KPICard
        label="Referencias Activas"
        current={data.invMes}
        accumulated={data.invAnual}
        icon={Database}
        color="amber"
        category="Kardex"
        unit="Items"
        trend={data.invTrend}
        delay={3}
      />
    </div>
  );
}

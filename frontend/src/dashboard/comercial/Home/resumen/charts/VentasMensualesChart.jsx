import React, { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend
} from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, Sparkles, Target, Award } from "lucide-react";

/* ==================================
    TOOLTIP PERSONALIZADO (FORECAST)
================================== */
const ForecastTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataCotizado = payload.find(p => p.dataKey === "cotizado");
    const dataVendidoReal = payload.find(p => p.dataKey === "ventasReal" || p.dataKey === "ventas");
    const dataProjected = payload.find(p => p.dataKey === "ventasProjected");
    const isFuture = payload[0]?.payload?.isFuture;

    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2 border-b border-slate-100 pb-1">
          {label} {isFuture ? "(Predicción IA)" : ""}
        </p>
        <div className="space-y-1.5">
          {!isFuture ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#06A99C]" />
                <p className="text-[10px] font-bold text-slate-500 uppercase">Vendido (OC)</p>
              </div>
              <p className="text-xs font-black text-[#06A99C]">
                $ {Number(dataVendidoReal?.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <p className="text-[10px] font-bold text-slate-500 uppercase">Predicción de Venta</p>
              </div>
              <p className="text-xs font-black text-indigo-600">
                $ {Number(dataProjected?.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Cotizado (Pipeline)</p>
            </div>
            <p className="text-xs font-bold text-slate-400">
              $ {Number(dataCotizado?.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/* ==================================
    TOOLTIP PERSONALIZADO (BURN-UP)
================================== */
const BurnUpTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataAcumulado = payload.find(p => p.dataKey === "acumuladoVentas");
    const dataMin = payload.find(p => p.dataKey === "acumuladoMinTarget");
    const dataMax = payload.find(p => p.dataKey === "acumuladoMaxTarget");

    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2 border-b border-slate-100 pb-1">
          Acumulado hasta {label}
        </p>
        <div className="space-y-1.5">
          {dataAcumulado && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#06A99C]" />
                <p className="text-[10px] font-bold text-slate-500 uppercase">Ventas Logradas</p>
              </div>
              <p className="text-xs font-black text-[#06A99C]">
                $ {Number(dataAcumulado.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Meta Máxima (Hito)</p>
            </div>
            <p className="text-xs font-bold text-emerald-600">
              $ {Number(dataMax?.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Meta Mínima</p>
            </div>
            <p className="text-xs font-bold text-amber-600">
              $ {Number(dataMin?.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function VentasMensualesChart({ data = [], viewScope = "global", cotizaciones = [] }) {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const dataFormateada = useMemo(() => {
    return data.map(d => ({
      ...d,
      mes_label: meses[parseInt(d.mes) - 1],
      ventas: Number(d.oc || 0),
      cotizado: Number(d.total || 0)
    }));
  }, [data]);

  // Fallback goals from localStorage or standard corporate target divide-by-3
  const personalGoals = useMemo(() => {
    let minAnual = 0;
    let maxAnual = 0;
    
    // Look up goals in localStorage
    const stored = localStorage.getItem(`vc_personal_goals_2026`);
    if (stored) {
      try {
        const personal = JSON.parse(stored);
        Object.values(personal).forEach(p => {
          minAnual += Number(p.minimo || 0);
          maxAnual += Number(p.maximo || 0);
        });
      } catch (e) {
        console.error(e);
      }
    }
    
    if (minAnual === 0 && maxAnual === 0) {
      // Default fallback based on corporate goals: 300k / 400k
      minAnual = 388333.33;
      maxAnual = 401666.67;
    }
    
    return { min: minAnual, max: maxAnual };
  }, []);

  // 1️⃣ GLOBAL VIEW: Calculate Sales Win Rate and Forecast Curve
  const { winRate, dataWithForecast } = useMemo(() => {
    let totalCotizadoPast = 0;
    let totalVendidoPast = 0;
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    dataFormateada.forEach(d => {
      const mNum = parseInt(d.mes);
      if (mNum <= currentMonth) {
        totalCotizadoPast += d.cotizado;
        totalVendidoPast += d.ventas;
      }
    });
    
    const wr = totalCotizadoPast > 0 ? (totalVendidoPast / totalCotizadoPast) : 0.15;
    const rate = wr > 0 ? wr : 0.15;

    const formatted = dataFormateada.map(d => {
      const mNum = parseInt(d.mes);
      const isFuture = mNum > currentMonth;
      return {
        ...d,
        ventasReal: isFuture ? null : d.ventas,
        ventasProjected: d.cotizado * rate,
        isFuture
      };
    });

    return { winRate: rate, dataWithForecast: formatted };
  }, [dataFormateada]);

  // 2️⃣ PERSONAL VIEW: Cumulative sales burn-up chart
  const burnUpData = useMemo(() => {
    let runningSales = 0;
    const currentMonth = new Date().getMonth() + 1;
    
    return dataFormateada.map(d => {
      const mNum = parseInt(d.mes);
      runningSales += d.ventas;
      
      return {
        ...d,
        acumuladoVentas: mNum <= currentMonth ? runningSales : null,
        acumuladoMinTarget: (personalGoals.min / 12) * mNum,
        acumuladoMaxTarget: (personalGoals.max / 12) * mNum,
      };
    });
  }, [dataFormateada, personalGoals]);

  if (!data || data.length === 0) return (
    <div className="h-[300px] flex items-center justify-center text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50/50 rounded-[1.5rem] border border-dashed border-slate-200">
      Cargando comparativa mensual...
    </div>
  );

  const isPersonal = viewScope === "personal";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm h-full flex flex-col min-w-0 overflow-hidden"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-[#06A99C]/10 rounded-lg text-[#06A99C]">
              {isPersonal ? <Target className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            </div>
            <h3 className="text-[13px] font-[900] text-slate-800 tracking-tight">
              {isPersonal ? "Trayectoria de Metas Personales" : "Efectividad de Ventas"}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-8">
            {isPersonal ? "Avance Acumulado vs Cuota Anual" : "Vendido vs Cotizado (Con Predicción IA)"}
          </p>
        </div>

        {/* LEYENDAS DIVERGENTES SEGÚN VIEW SCOPE */}
        <div className="flex flex-col items-end gap-1">
          {isPersonal ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Mi Logrado</span>
                <div className="w-6 h-1 rounded-full bg-[#06A99C]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Meta Máx.</span>
                <div className="w-6 h-[2px] rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter">Meta Mín.</span>
                <div className="w-6 h-[2px] rounded-full bg-amber-500 stroke-dasharray" style={{ borderStyle: "dashed" }} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Vendido (Real)</span>
                <div className="w-6 h-1 rounded-full bg-[#06A99C]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter flex items-center gap-1">
                  <Sparkles size={8} /> Proyección IA
                </span>
                <div className="w-6 h-[2px] rounded-full bg-indigo-500 opacity-70" style={{ borderStyle: "dotted" }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Cotizado (Pipeline)</span>
                <div className="w-6 h-[2px] rounded-full bg-[#94A3B8] opacity-50" />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[220px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          {isPersonal ? (
            /* AreaChart para Burn-up */
            <AreaChart data={burnUpData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06A99C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06A99C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="mes_label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }} 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<BurnUpTooltip />} />
              
              {/* Meta Max Line */}
              <Area
                type="monotone"
                dataKey="acumuladoMaxTarget"
                stroke="#10B981"
                strokeWidth={1.5}
                fill="none"
                dot={false}
              />
              {/* Meta Min Line (Dashed) */}
              <Area
                type="monotone"
                dataKey="acumuladoMinTarget"
                stroke="#F59E0B"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
                dot={false}
              />
              {/* Actual Cumulative Sales */}
              <Area
                type="monotone"
                dataKey="acumuladoVentas"
                stroke="#06A99C"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorAcumulado)"
                dot={{ r: 3, fill: '#fff', strokeWidth: 2, stroke: '#06A99C' }}
              />
            </AreaChart>
          ) : (
            /* AreaChart para Efectividad + Predicción IA */
            <AreaChart data={dataWithForecast} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06A99C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06A99C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              
              <XAxis 
                dataKey="mes_label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }} 
                dy={10} 
              />
              
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }} 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              
              <Tooltip content={<ForecastTooltip />} cursor={{ stroke: '#06A99C', strokeWidth: 1, strokeDasharray: '3 3' }} />
              
              {/* Cotizado */}
              <Area
                type="monotone"
                dataKey="cotizado"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="transparent"
                dot={false}
                activeDot={false}
              />

              {/* Ventas Proyectadas (IA) */}
              <Area
                type="monotone"
                dataKey="ventasProjected"
                stroke="#6366F1"
                strokeWidth={2}
                strokeDasharray="3 3"
                fill="url(#colorForecast)"
                dot={false}
              />

              {/* Ventas Reales (OC) */}
              <Area
                type="monotone"
                dataKey="ventasReal"
                stroke="#06A99C"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorVentas)"
                dot={{ 
                  r: 4, 
                  fill: '#fff', 
                  strokeWidth: 2, 
                  stroke: '#06A99C',
                  fillOpacity: 1
                }}
                activeDot={{ 
                  r: 6, 
                  strokeWidth: 0,
                  fill: '#06A99C' 
                }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
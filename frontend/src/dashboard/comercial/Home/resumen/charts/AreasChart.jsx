import React, { useState, useMemo } from "react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Sector,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, ArrowUpRight, Target, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

const MAP_FULL_NAMES = {
  MIN: "MINERÍA",
  IND: "INDUSTRIA",
  OIL: "PETROQUÍMICA",
  SFY: "SEGURIDAD DE MAQUINARIA"
};

const AREA_COLORS = {
  MIN: "#06A99C", // Minería (Teal)
  IND: "#8B5CF6", // Industria (Violet)
  OIL: "#0EA5E9", // Petroquímica (Cyan / Light Blue)
  SFY: "#10B981"  // Seguridad de Maquinaria (Emerald)
};

/* ==================================
    TOOLTIP PIVOT / DEVIATIONS
================================== */
const GapTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const hasSurplus = data.gap >= 0;
    return (
      <div className="bg-white/95 border border-slate-200 p-3 rounded-xl shadow-xl backdrop-blur-sm">
        <p className="text-[10px] font-black text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">
          {data.areaLabel}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#06A99C]" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Logrado</p>
            </div>
            <p className="text-xs font-black text-[#06A99C]">
              $ {Math.round(data.sales).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Meta</p>
            </div>
            <p className="text-xs font-bold text-slate-500">
              $ {Math.round(data.target).toLocaleString()}
            </p>
          </div>
          <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between items-center gap-4">
            <p className={`text-[9px] font-black uppercase ${hasSurplus ? "text-emerald-600" : "text-rose-600"}`}>
              {hasSurplus ? "Superávit" : "Brecha"}
            </p>
            <p className={`text-[10px] font-black ${hasSurplus ? "text-emerald-600" : "text-rose-600"}`}>
              {hasSurplus ? "+" : ""}$ {Math.round(data.gap).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function AreasChart({ data = [], viewScope = "global", cotizaciones = [], mes }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const isPersonal = viewScope === "personal";
  const COLORS = ["#4f46e5", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b"];

  // 1️⃣ Vista Global: Lógica de Donut y Distribución
  const { processedData, totalVendido } = useMemo(() => {
    const total = data.reduce((sum, item) => sum + Number(item.monto), 0);

    const sorted = [...data]
      .sort((a, b) => (Number(b.monto) || 0) - (Number(a.monto) || 0))
      .map((item, index) => {
        const vendido = Number(item.monto) || 0;
        const cotizado = Number(item.cotizado) || 0;

        const eficaciaCalculada = cotizado > 0 && vendido > 0 
          ? ((vendido / cotizado) * 100).toFixed(1) 
          : "0.0";

        return {
          ...item,
          areaLabel: MAP_FULL_NAMES[item.area] || item.area,
          monto: vendido,
          color: AREA_COLORS[item.area] || COLORS[index % COLORS.length],
          porcentaje: total > 0 ? ((vendido / total) * 100).toFixed(1) : "0.0",
          efectividad: eficaciaCalculada
        };
      });

    return { processedData: sorted, totalVendido: total };
  }, [data]);

  // 2️⃣ Vista Personal: Gaps Matrix (Desviación por Área)
  const personalAreaGoals = useMemo(() => {
    const stored = localStorage.getItem(`vc_personal_goals_2026`);
    if (stored) {
      try {
        const personal = JSON.parse(stored);
        return {
          IND: Number(personal[1]?.minimo || 0),
          MIN: Number(personal[2]?.minimo || 0),
          OIL: Number(personal[4]?.minimo || 0),
          SFY: Number(personal[8]?.minimo || 0)
        };
      } catch (e) {
        console.error(e);
      }
    }
    return {
      IND: 100000,
      MIN: 200000,
      OIL: 50000,
      SFY: 10000
    };
  }, []);

  const gapAnalysisData = useMemo(() => {
    const currentMonth = (!mes || mes === "%") ? (new Date().getMonth() + 1) : Number(mes);

    return ["MIN", "OIL", "IND", "SFY"].map(areaKey => {
      const record = data.find(item => item.area === areaKey) || { monto: 0, cotizado: 0 };
      const annualGoal = personalAreaGoals[areaKey] || 0;
      const targetSoFar = (annualGoal / 12) * currentMonth;
      const actualSales = Number(record.monto) || 0;
      const gap = actualSales - targetSoFar;
      const pct = targetSoFar > 0 ? (actualSales / targetSoFar) * 100 : 0;

      return {
        area: areaKey,
        areaLabel: MAP_FULL_NAMES[areaKey] || areaKey,
        target: targetSoFar,
        sales: actualSales,
        gap,
        percentage: pct,
        color: areaKey === "MIN" ? "#06A99C" : areaKey === "OIL" ? "#0ea5e9" : areaKey === "IND" ? "#8B5CF6" : "#10B981"
      };
    }).sort((a, b) => b.gap - a.gap);
  }, [data, personalAreaGoals]);

  if (!isPersonal && (!data || data.length === 0)) return (
    <div className="h-[250px] flex items-center justify-center text-slate-400 text-[10px] font-black uppercase bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
      Sin datos de áreas
    </div>
  );

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          cornerRadius={6}
        />
      </g>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm h-full flex flex-col min-w-0 overflow-hidden"
    >
      {/* HEADER */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h3 className="text-[13px] font-[900] text-slate-800 tracking-tight">
              {isPersonal ? "Matriz de Desviaciones por Área" : "Distribución por Área"}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-8">
            {isPersonal ? "Brechas y superávits vs Meta mensual acumulada" : "Ventas Reales y Eficacia"}
          </p>
        </div>

        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <LayoutGrid className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {isPersonal ? (
          /* VISTA PERSONAL: GAP MATRIX GRID (7/12 chart, 5/12 legend list) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1">
            {/* Recharts BarChart */}
            <div className="lg:col-span-7 flex flex-col h-full justify-center">
              <div className="w-full flex-grow min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={gapAnalysisData}
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 15, bottom: 5 }}
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="areaLabel" 
                      type="category" 
                      tick={({ x, y, payload }) => (
                        <text 
                          x={x - 4} 
                          y={y} 
                          dy={4}
                          fill="#64748b" 
                          fontSize={8} 
                          fontWeight={700} 
                          textAnchor="end"
                          fontFamily="Inter, sans-serif"
                        >
                          {payload.value.length > 15 
                            ? `${payload.value.substring(0, 12)}...` 
                            : payload.value}
                        </text>
                      )}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip content={<GapTooltip />} cursor={{ fill: '#f8fafc', radius: 4 }} />
                    <Bar dataKey="sales" radius={[0, 4, 4, 0]} name="Logrado" barSize={8}>
                      {gapAnalysisData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                    <Bar dataKey="target" fill="#cbd5e1" radius={[0, 4, 4, 0]} name="Meta" barSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* List side */}
            <div className="lg:col-span-5 flex flex-col gap-2 pl-4 border-l border-slate-50">
              {gapAnalysisData.map((item, index) => {
                const hasSurplus = item.gap >= 0;
                return (
                  <div 
                    key={item.area} 
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-inner" 
                        style={{ backgroundColor: item.color, border: `2px solid white` }} 
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight truncate">
                          {item.areaLabel}
                        </span>
                        <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 truncate">
                          <span>Meta: ${Math.round(item.target/1000)}k</span>
                          <span>•</span>
                          <span>Logr: ${Math.round(item.sales/1000)}k</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-0.5 ${
                        hasSurplus ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                      }`}>
                        {hasSurplus ? "+" : ""}{Math.round(item.gap/1000)}k
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* VISTA GLOBAL: DONUT INTERACTIVO Y PROFESIONAL */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1">
            <div className="lg:col-span-6 relative flex flex-col justify-center items-center h-full w-full flex-grow">
              <div className="w-full flex-grow min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={processedData}
                      dataKey="monto"
                      nameKey="area"
                      outerRadius={100}
                      innerRadius={78}
                      paddingAngle={3}
                      cornerRadius={6}
                      stroke="none"
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      {processedData.map((entry, i) => (
                        <Cell 
                          key={i} 
                          fill={entry.color} 
                          opacity={activeIndex === null || activeIndex === i ? 1 : 0.3}
                          className="transition-all duration-300 outline-none cursor-pointer"
                          style={{ filter: activeIndex === i ? `drop-shadow(0px 4px 10px ${entry.color}30)` : 'none' }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Centro dinámico del Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <AnimatePresence mode="wait">
                  {activeIndex !== null ? (
                    <motion.div 
                      key="active"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="text-center p-2"
                    >
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5 tracking-wider truncate max-w-[130px]">
                        {processedData[activeIndex].areaLabel}
                      </span>
                      <span className="text-xl font-extrabold text-slate-800 font-mono block">
                        $ {(processedData[activeIndex].monto / 1000).toFixed(1)}k
                      </span>
                      <span className="text-[9px] font-bold text-indigo-600 block mt-0.5">
                        {processedData[activeIndex].porcentaje}% del total
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div key="total" className="text-center p-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5 tracking-widest">VENTA TOTAL</span>
                      <span className="text-xl font-extrabold text-slate-800 font-mono block">
                        $ {(totalVendido / 1000).toFixed(1)}k
                      </span>
                      <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">
                        100% Facturado
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Leyenda y Detalles Corporativos */}
            <div className="lg:col-span-6 flex flex-col gap-2.5 pl-4 border-l border-slate-50">
              {processedData.map((item, index) => (
                <div 
                  key={item.area} 
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`group flex items-center justify-between transition-all duration-300 cursor-pointer p-2 rounded-xl ${
                    activeIndex === index ? 'bg-slate-50 shadow-sm translate-x-1' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-300 group-hover:scale-110" 
                      style={{ backgroundColor: item.color, border: `2px solid white` }} 
                    />
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[10px] uppercase tracking-tight truncate max-w-[130px] ${
                        activeIndex === index ? 'font-black text-indigo-600' : 'font-bold text-slate-600'
                      }`}>
                        {item.areaLabel}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Target size={10} className="text-slate-300" />
                        <span className="text-[8px] font-bold text-slate-400 uppercase">
                          {item.efectividad}% Eficacia
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-black block font-mono ${
                        activeIndex === index ? 'text-indigo-600' : 'text-slate-800'
                    }`}>
                      $ {item.monto > 0 ? (item.monto / 1000).toFixed(1) : "0"}k
                    </span>
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-[7px] text-slate-400 font-bold uppercase tracking-tighter">Real</span>
                      <ArrowUpRight size={10} className={`transition-all ${activeIndex === index ? 'opacity-100 text-indigo-400 translate-y-0' : 'opacity-0 translate-y-1'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
        <div className="flex flex-col overflow-hidden">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            {isPersonal ? "Estado General del Cumplimiento" : "Venta Total Realizada"}
          </span>
          <span className="text-[10px] font-extrabold text-slate-700 truncate max-w-[180px]">
            {isPersonal 
              ? `${gapAnalysisData.filter(d => d.gap >= 0).length} de 4 áreas en superávit` 
               : `S/. ${totalVendido.toLocaleString('es-PE')}`}
          </span>
        </div>
        <div className="text-right flex flex-col">
          <span className="text-[8px] font-bold text-slate-400 uppercase">
            Muestra
          </span>
          <span className="text-[11px] font-black text-emerald-600 italic">
            Live Data
          </span>
        </div>
      </div>
    </motion.div>
  );
}
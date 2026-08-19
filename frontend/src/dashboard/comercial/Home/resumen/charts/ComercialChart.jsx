import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";
import { motion } from "framer-motion";
import { Award, Users, TrendingUp, Sparkles, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/* ==================================
    TOOLTIP LEADERBOARD
================================== */
const LeaderboardTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const rawData = payload[0].payload;
    const name = label || rawData.subject || rawData.vendedorLabel;
    const vendido = rawData.monto || 0;
    const cotizado = rawData.cotizadoRaw || rawData.cotizado || 0;
    const ratio = rawData.efectividad || (cotizado > 0 ? ((vendido / cotizado) * 100).toFixed(1) : 0);

    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-2 border-b border-slate-100 pb-1">
          {name}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#06A99C]" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Vendido</p>
            </div>
            <p className="text-xs font-black text-slate-800">$ {Number(vendido).toLocaleString()}</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Cotizado</p>
            </div>
            <p className="text-xs font-bold text-slate-500">$ {Number(cotizado).toLocaleString()}</p>
          </div>
          <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between items-center gap-4">
            <p className="text-[9px] font-black text-[#06A99C] uppercase">Efectividad</p>
            <p className="text-[10px] font-black text-[#06A99C]">{ratio}%</p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/* ==================================
    TOOLTIP RADAR KPI
================================== */
const RadarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-2 border-b border-slate-100 pb-1">
          {payload[0].payload.subject}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#06A99C]" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Mi Rendimiento</p>
            </div>
            <p className="text-xs font-black text-[#06A99C]">{payload[0].payload.userRaw}</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Promedio Equipo</p>
            </div>
            <p className="text-xs font-bold text-slate-500">{payload[0].payload.avgRaw}</p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function ComercialChart({ data = [], viewScope = "global", cotizaciones = [] }) {
  const { authUser: user } = useAuth();
  const isPersonal = viewScope === "personal";

  const formatName = (name) => {
    const words = name.split(" ");
    if (words.length <= 1) return name;
    return `${words[0]} ${words[1][0]}.`;
  };

  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      vendedorFull: item.vendedor,
      vendedorLabel: formatName(item.vendedor),
      efectividad: item.cotizado > 0 ? ((item.monto / item.cotizado) * 100).toFixed(1) : 0
    }));
  }, [data]);

  // Encontrar al líder
  const lider = useMemo(() => {
    return [...chartData].sort((a, b) => b.monto - a.monto)[0];
  }, [chartData]);

  const ventaTotal = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.monto, 0);
  }, [chartData]);

  // Lógica de Radar para vista personal
  const currentUserRecord = useMemo(() => {
    if (!user || !data || data.length === 0) return data[0] || null;
    const loggedInName = (user.nombre_completo || "").trim().toLowerCase();
    const loggedInUser = (user.usuario || "").trim().toLowerCase();

    return data.find(item => {
      const vName = (item.vendedor || "").trim().toLowerCase();
      return vName.includes(loggedInName) || loggedInName.includes(vName) ||
             vName.includes(loggedInUser) || loggedInUser.includes(vName) ||
             (user.dni && String(item.dni) === String(user.dni));
    }) || data[0] || null;
  }, [user, data]);

  const teamAverageRecord = useMemo(() => {
    if (!data || data.length === 0) return null;
    const count = data.length;
    const sumMonto = data.reduce((acc, curr) => acc + curr.monto, 0);
    const sumCotizado = data.reduce((acc, curr) => acc + curr.cotizado, 0);
    const sumCantidad = data.reduce((acc, curr) => acc + curr.cantidad, 0);
    const sumTicket = data.reduce((acc, curr) => acc + (curr.ticket_promedio || 0), 0);

    return {
      monto: sumMonto / count,
      cotizado: sumCotizado / count,
      cantidad: sumCantidad / count,
      ticket_promedio: sumTicket / count,
      efectividad: sumCotizado > 0 ? (sumMonto / sumCotizado) * 100 : 0
    };
  }, [data]);

  const maxMetrics = useMemo(() => {
    if (!data || data.length === 0) return { monto: 1, cotizado: 1, cantidad: 1, ticket: 1, efectividad: 1 };
    return {
      monto: Math.max(...data.map(item => item.monto), 1),
      cotizado: Math.max(...data.map(item => item.cotizado), 1),
      cantidad: Math.max(...data.map(item => item.cantidad), 1),
      ticket: Math.max(...data.map(item => item.ticket_promedio || 1), 1),
      efectividad: Math.max(...data.map(item => item.cotizado > 0 ? (item.monto / item.cotizado) * 100 : 0), 1)
    };
  }, [data]);

  const radarData = useMemo(() => {
    if (!currentUserRecord || !teamAverageRecord) return [];

    const userWR = currentUserRecord.cotizado > 0 ? (currentUserRecord.monto / currentUserRecord.cotizado) * 100 : 0;
    const avgWR = teamAverageRecord.efectividad;

    return [
      {
        subject: "Efectividad %",
        user: (userWR / maxMetrics.efectividad) * 100,
        average: (avgWR / maxMetrics.efectividad) * 100,
        userRaw: `${userWR.toFixed(1)}%`,
        avgRaw: `${avgWR.toFixed(1)}%`
      },
      {
        subject: "Ticket Promedio",
        user: ((currentUserRecord.ticket_promedio || 0) / maxMetrics.ticket) * 100,
        average: ((teamAverageRecord.ticket_promedio || 0) / maxMetrics.ticket) * 100,
        userRaw: `$${Math.round(currentUserRecord.ticket_promedio || 0).toLocaleString()}`,
        avgRaw: `$${Math.round(teamAverageRecord.ticket_promedio || 0).toLocaleString()}`
      },
      {
        subject: "Ventas (USD)",
        user: (currentUserRecord.monto / maxMetrics.monto) * 100,
        average: (teamAverageRecord.monto / maxMetrics.monto) * 100,
        userRaw: `$${Math.round(currentUserRecord.monto).toLocaleString()}`,
        avgRaw: `$${Math.round(teamAverageRecord.monto).toLocaleString()}`
      },
      {
        subject: "Vol. Cotizado",
        user: (currentUserRecord.cotizado / maxMetrics.cotizado) * 100,
        average: (teamAverageRecord.cotizado / maxMetrics.cotizado) * 100,
        userRaw: `$${Math.round(currentUserRecord.cotizado).toLocaleString()}`,
        avgRaw: `$${Math.round(teamAverageRecord.cotizado).toLocaleString()}`
      },
      {
        subject: "Actividad (#)",
        user: (currentUserRecord.cantidad / maxMetrics.cantidad) * 100,
        average: (teamAverageRecord.cantidad / maxMetrics.cantidad) * 100,
        userRaw: `${currentUserRecord.cantidad} u`,
        avgRaw: `${Math.round(teamAverageRecord.cantidad)} u`
      }
    ];
  }, [currentUserRecord, teamAverageRecord, maxMetrics]);

  const globalRadarData = useMemo(() => {
    if (isPersonal || chartData.length === 0) return [];
    
    const maxVendido = Math.max(...chartData.map(item => item.monto), 1);
    const maxCotizado = Math.max(...chartData.map(item => item.cotizado), 1);

    return chartData.map(item => ({
      subject: item.vendedorLabel,
      vendedorLabel: item.vendedorLabel,
      vendido: (item.monto / maxVendido) * 100,
      cotizado: (item.cotizado / maxCotizado) * 100,
      monto: item.monto,
      cotizadoRaw: item.cotizado,
      efectividad: item.efectividad
    }));
  }, [chartData, isPersonal]);

  const radarDataToRender = isPersonal ? radarData : globalRadarData;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm h-full flex flex-col"
    >
      {/* HEADER */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-[#CCFBF1] rounded-lg text-[#134E4A]">
              {isPersonal ? <UserCheck className="w-4 h-4" /> : <Award className="w-4 h-4" />}
            </div>
            <h3 className="text-[13px] font-[900] text-slate-800 tracking-tight">
              {isPersonal ? "Radar de Competencias Comerciales" : "Performance Comercial"}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-8">
            {isPersonal ? "Comparativa individual vs Promedio Equipo" : "Ranking de Conversión"}
          </p>
        </div>
        
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <Users className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* GRÁFICO */}
      <div className="flex-1 flex flex-col justify-center items-center">
        {radarDataToRender.length > 0 && (
          <div className="flex justify-center items-center gap-6 mb-3 text-[10px] font-extrabold uppercase tracking-tight">
            <div className="flex items-center gap-1.5 text-[#06A99C]">
              <div className="w-2 h-2 rounded-full bg-[#06A99C]" />
              <span>{isPersonal ? "Mi Performance" : "Vendido (Logrado)"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#6366F1]">
              <div className="w-2 h-2 rounded-full bg-[#6366F1]" />
              <span>{isPersonal ? "Promedio Equipo" : "Volumen Cotizado"}</span>
            </div>
          </div>
        )}
        <div className="flex-1 w-full min-h-[220px] flex items-center justify-center mt-2">
          <ResponsiveContainer width="100%" height="100%">
            {radarDataToRender.length > 0 && (
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarDataToRender}>
                <defs>
                  <filter id="radarShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#06A99C" floodOpacity="0.15" />
                  </filter>
                  <filter id="avgShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#6366F1" floodOpacity="0.1" />
                  </filter>
                </defs>
                <PolarGrid gridType="polygon" stroke="#e2e8f0" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 9, fontWeight: 900 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name={isPersonal ? "Mi Performance" : "Vendido (Logrado)"}
                  dataKey={isPersonal ? "user" : "vendido"}
                  stroke="#06A99C"
                  strokeWidth={2}
                  fill="#06A99C"
                  fillOpacity={0.18}
                  dot={{ r: 3, fill: '#FFFFFF', stroke: '#06A99C', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#06A99C', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                  filter="url(#radarShadow)"
                />
                <Radar
                  name={isPersonal ? "Promedio Equipo" : "Volumen Cotizado"}
                  dataKey={isPersonal ? "average" : "cotizado"}
                  stroke="#6366F1"
                  strokeWidth={1.5}
                  fill="#6366F1"
                  fillOpacity={0.08}
                  dot={{ r: 2.5, fill: '#FFFFFF', stroke: '#6366F1', strokeWidth: 1.2 }}
                  filter="url(#avgShadow)"
                />
                <Tooltip content={isPersonal ? <RadarTooltip /> : <LeaderboardTooltip />} />
              </RadarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
              {isPersonal ? "Comercial Identificado" : "Top Producer"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                {isPersonal ? (currentUserRecord?.vendedorFull || user?.nombre_completo) : lider?.vendedorFull}
              </span>
              <div className="px-1.5 py-0.5 bg-[#CCFBF1] rounded-md border border-[#10B981]/20">
                <span className="text-[9px] font-black text-[#134E4A]">
                  {isPersonal ? (currentUserRecord?.cotizado > 0 ? ((currentUserRecord.monto / currentUserRecord.cotizado) * 100).toFixed(1) : 0) : lider?.efectividad}% Efic.
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Venta Total Equipo</span>
            <div className="flex items-center justify-end gap-1 text-[#10B981]">
              <TrendingUp size={12} strokeWidth={3} />
              <span className="text-xs font-black tracking-tighter">$ {(ventaTotal / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
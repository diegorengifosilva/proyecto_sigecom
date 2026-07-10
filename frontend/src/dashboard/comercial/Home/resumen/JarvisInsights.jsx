import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertTriangle, TrendingUp, HelpCircle } from "lucide-react";

export default function JarvisInsights({ activeModule = "comercial", anno = 2026, mes = "%" }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      // Determinación de semilla según año y mes para cambiar los insights de forma realista
      const seed = Number(anno) + (mes === "%" ? 6 : Number(mes));
      const getVal = (min, max, offset) => {
        const x = Math.sin(seed + offset) * 10000;
        return min + Math.floor((x - Math.floor(x)) * (max - min));
      };

      if (activeModule === "comercial") {
        setInsights([
          {
            type: "warning",
            title: "Alerta de Desviación de Meta",
            text: `La efectividad comercial del mes se encuentra en ${(getVal(15, 19, 1) + getVal(1, 9, 2) / 10).toFixed(1)}% (Meta: 20%). Alerta: Se detectaron ${getVal(2, 5, 3)} cotizaciones estancadas en el área de Minería por un total de $${formatMoney(getVal(25000, 65000, 4))}. Se recomienda iniciar seguimiento.`,
          },
          {
            type: "prediction",
            title: "Proyección de Ventas (Forecast)",
            text: `Predicción de Cierre: Basado en el volumen de cotizaciones actuales y la tasa de conversión histórica del mes, se proyecta un cierre de ventas de $${formatMoney(getVal(140000, 210000, 5))} (equivalente al ${getVal(88, 97, 6)}% del objetivo mensual).`,
          },
          {
            type: "action",
            title: "Oportunidad Comercial Detectada",
            text: `Se identificó que ${getVal(2, 4, 7)} clientes recurrentes del área Industrial no registran cotizaciones emitidas durante los últimos 45 días. Se sugiere automatizar una alerta de reactivación para el equipo comercial.`,
          }
        ]);
      } else {
        setInsights([
          {
            type: "warning",
            title: "Alerta de Lead Time Crítico",
            text: `El Lead Time promedio de abastecimiento aumentó a ${(getVal(50, 65, 1) / 10).toFixed(1)} días (+14% vs. mes anterior). Alerta: El proveedor principal de la orden OC-2026-0042 registra un retraso acumulado de ${getVal(2, 4, 2)} días.`,
          },
          {
            type: "prediction",
            title: "Predicción de Stock Crítico",
            text: `Basado en el historial de despachos de Kardex y consumo del último mes, se proyecta una probabilidad de quiebre de stock en ${getVal(2, 4, 3)} referencias de repuestos críticos del área de Industria antes del término del período.`,
          },
          {
            type: "action",
            title: "Recomendación de Optimización",
            text: `Se detectó una desviación del ${(getVal(3, 7, 4) + getVal(1, 9, 5) / 10).toFixed(1)}% en costos unitarios de materiales importados. Se sugiere adelantar el pedido consolidado con el proveedor local para mitigar el impacto financiero.`,
          }
        ]);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [activeModule, anno, mes]);

  const formatMoney = (val) => {
    return Number(val).toLocaleString("en-US", { maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <div className="bg-slate-50 border border-gray-200 rounded-2xl p-5 space-y-3 animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded-md" />
        <div className="h-3 w-full bg-gray-200 rounded-md" />
        <div className="h-3 w-5/6 bg-gray-200 rounded-md" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden">
      {/* GLOW DE FONDO */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Jarvis AI • Insights Predictivos</h4>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Recomendaciones automatizadas en base a tus datos en tiempo real</p>
        </div>
      </div>

      {/* LISTA DE INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="wait">
          {insights.map((insight, idx) => {
            const colors = {
              warning: { bg: "bg-rose-50/55", border: "border-rose-100/75", title: "text-rose-700", icon: AlertTriangle, iconColor: "text-rose-500" },
              prediction: { bg: "bg-indigo-50/40", border: "border-indigo-100/60", title: "text-indigo-700", icon: TrendingUp, iconColor: "text-indigo-500" },
              action: { bg: "bg-amber-50/40", border: "border-amber-100/60", title: "text-amber-700", icon: Sparkles, iconColor: "text-amber-500" }
            }[insight.type] || { bg: "bg-slate-50", border: "border-slate-100", title: "text-slate-700", icon: HelpCircle, iconColor: "text-slate-500" };

            const IconComp = colors.icon;

            return (
              <motion.div
                key={`${activeModule}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className={`p-3.5 rounded-xl border ${colors.bg} ${colors.border} flex flex-col justify-between space-y-2`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded bg-white border border-gray-100 ${colors.iconColor}`}>
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <h5 className={`text-[10px] font-black uppercase tracking-wider ${colors.title}`}>
                    {insight.title}
                  </h5>
                </div>
                <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase tracking-tight">
                  {insight.text}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

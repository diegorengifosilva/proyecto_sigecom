import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertTriangle, TrendingUp, HelpCircle } from "lucide-react";

export default function VcAiInsights({ activeModule = "comercial", anno = 2026, mes = "%", cotizaciones = [] }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      if (activeModule !== "comercial") {
        // Mocked logistica insights (since logistica data is mocked on dashboard)
        const seed = Number(anno) + (mes === "%" ? 6 : Number(mes));
        const getVal = (min, max, offset) => {
          const x = Math.sin(seed + offset) * 10000;
          return min + Math.floor((x - Math.floor(x)) * (max - min));
        };
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
        setLoading(false);
        return;
      }

      if (!cotizaciones || cotizaciones.length === 0) {
        setInsights([
          {
            type: "prediction",
            title: "Datos Insuficientes",
            text: "No hay registros de cotizaciones en el periodo seleccionado para generar el análisis predictivo."
          }
        ]);
        setLoading(false);
        return;
      }

      const activeCoti = cotizaciones.filter(c => {
        const f = new Date(c.fecha || c.cotif);
        const passesAnno = !anno || anno === "%" || f.getFullYear() === Number(anno);
        const passesMes = !mes || mes === "%" || (f.getMonth() + 1) === Number(mes);
        return passesAnno && passesMes;
      });

      if (activeCoti.length === 0) {
        setInsights([
          {
            type: "prediction",
            title: "Falta de Datos",
            text: "Seleccione un periodo de búsqueda con cotizaciones registradas para habilitar los insights dinámicos."
          }
        ]);
        setLoading(false);
        return;
      }

      const calculatedInsights = [];

      // 1. Concentración de Clientes
      const clientMap = {};
      let totalMonto = 0;
      activeCoti.forEach(c => {
        const client = c.cliente || "Cliente Indefinido";
        const monto = Number(c.tot_c || c.total_cotizacion || 0);
        clientMap[client] = (clientMap[client] || 0) + monto;
        totalMonto += monto;
      });

      const clientArray = Object.entries(clientMap).sort((a, b) => b[1] - a[1]);
      if (clientArray.length > 0 && totalMonto > 0) {
        const [topClient, topMonto] = clientArray[0];
        const pct = (topMonto / totalMonto) * 100;
        if (pct > 30) {
          calculatedInsights.push({
            type: "warning",
            title: "Alerta de Concentración de Cartera",
            text: `Riesgo Alto: El cliente ${topClient} concentra el ${pct.toFixed(1)}% de la prospección comercial total ($${Number(topMonto).toLocaleString("en-US", { maximumFractionDigits: 0 })}). Se recomienda buscar diversificación.`
          });
        } else {
          calculatedInsights.push({
            type: "prediction",
            title: "Distribución de Cartera Saludable",
            text: `La distribución comercial es óptima. El cliente principal (${topClient}) representa el ${pct.toFixed(1)}% del volumen cotizado, lo que minimiza el riesgo de concentración.`
          });
        }
      }

      // 2. Líderes de Área y Desempeño
      const areaMap = {};
      activeCoti.forEach(c => {
        const area = c.area_nombre || "Sin Área";
        const monto = Number(c.tot_c || c.total_cotizacion || 0);
        areaMap[area] = (areaMap[area] || 0) + monto;
      });
      const areaArray = Object.entries(areaMap).sort((a, b) => b[1] - a[1]);
      if (areaArray.length > 0) {
        const [topArea, topAreaMonto] = areaArray[0];
        const bottomArea = areaArray[areaArray.length - 1][0];
        const topPct = (topAreaMonto / totalMonto) * 100;
        calculatedInsights.push({
          type: "prediction",
          title: "Participación y Desempeño de Área",
          text: `El área de ${topArea} lidera la prospección con el ${topPct.toFixed(1)}% de participación ($${Number(topAreaMonto).toLocaleString("en-US", { maximumFractionDigits: 0 })}). El área con menor actividad es ${bottomArea}.`
        });
      }

      // 3. Vencimiento Crítico o Ejecutivo Top
      const hoy = new Date();
      const vencimientoCritico = activeCoti.filter(c => {
        if (!c.fecha_limite) return false;
        const limite = new Date(c.fecha_limite);
        const diffTime = limite - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const esActiva = ["Pendiente", "Enviado", "Emitido"].includes(c.estado_nombre || c.estado);
        return esActiva && diffDays <= 3;
      });

      if (vencimientoCritico.length > 0) {
        const totalCriticoMonto = vencimientoCritico.reduce((acc, c) => acc + Number(c.tot_c || c.total_cotizacion || 0), 0);
        calculatedInsights.push({
          type: "warning",
          title: "Seguimiento Crítico Pendiente",
          text: `Prioridad: Se detectaron ${vencimientoCritico.length} cotizaciones activas próximas a vencer o vencidas por $${Number(totalCriticoMonto).toLocaleString("en-US", { maximumFractionDigits: 0 })}. Se requiere acción comercial inmediata.`
        });
      } else {
        const salesMap = {};
        activeCoti.forEach(c => {
          const salesRep = c.comercial_nombre || "Por Asignar";
          salesMap[salesRep] = (salesMap[salesRep] || 0) + 1;
        });
        const salesArray = Object.entries(salesMap).sort((a, b) => b[1] - a[1]);
        if (salesArray.length > 0) {
          const [topSeller, numCoti] = salesArray[0];
          calculatedInsights.push({
            type: "action",
            title: "Líder en Gestión Comercial",
            text: `El ejecutivo ${topSeller} registra la mayor actividad comercial con ${numCoti} cotizaciones gestionadas. Buen ritmo de prospección.`
          });
        }
      }

      setInsights(calculatedInsights);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [activeModule, anno, mes, cotizaciones]);

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
          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">V&C AI • Insights Predictivos</h4>
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

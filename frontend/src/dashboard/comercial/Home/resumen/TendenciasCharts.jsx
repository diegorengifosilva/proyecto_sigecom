import React from "react";
import { TrendingUp, BarChart3 } from "lucide-react";
import VentasMensualesChart from "./charts/VentasMensualesChart";
import ComercialChart from "./charts/ComercialChart";
import ClientesChart from "./charts/ClientesChart";
import AreasChart from "./charts/AreasChart";
export default function TendenciasCharts({ 
  filtros, 
  viewScope = "global", 
  cotizaciones = [],
  data,
  loading
}) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 bg-slate-100/50 animate-pulse rounded-[2.5rem]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* HEADER DE SECCIÓN SIN CONTENEDOR */}
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 tracking-tight">
            <div className="bg-indigo-500/10 p-1 rounded-md">
              <BarChart3 size={16} className="text-indigo-600" />
            </div>
            Tendencias y Comportamiento
          </h2>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest ml-8">
            Análisis evolutivo de métricas comerciales
          </p>
        </div>
      </div>

      {/* GRID DE GRÁFICOS - Cada gráfico debe manejar su propio contenedor blanco internamente */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <VentasMensualesChart data={data.ventas_mensuales} viewScope={viewScope} cotizaciones={cotizaciones} />
        <ComercialChart data={data.ranking_comercial} viewScope={viewScope} cotizaciones={cotizaciones} />
        <ClientesChart data={data.clientes_recurrentes} viewScope={viewScope} cotizaciones={cotizaciones} />
        <AreasChart data={data.areas} viewScope={viewScope} cotizaciones={cotizaciones} mes={filtros.mes} />
      </div>
    </div>
  );
}
import React, { useState } from "react";
import SemaforoCumplimiento from "./resumen/SemaforoCumplimiento";
import AlertasPanel from "./resumen/AlertasPanel"; 
import CalendarioComercial from "./resumen/CalendarioComercial";
import TendenciasCharts from "./resumen/TendenciasCharts";

export default function ResumenDashboard({ 
  anno, 
  mes, 
  cotizaciones = [], 
  todasCotizaciones = [], 
  aperturas = [], 
  alertas = [], 
  viewScope = "global",
  resumenData,
  loading
}) {
  const filtros = { anio: anno, mes };

  return (
    <div className="flex flex-col gap-8 p-1"> 
      
      <section className="w-full">
        <SemaforoCumplimiento 
          anno={anno} 
          mes={mes} 
          viewScope={viewScope} 
          objetivos={resumenData?.objetivos}
          logrado={resumenData?.logrado}
          loading={loading}
        />
      </section>

      {/* Tareas Pendientes y Alertas Comerciales Críticas */}
      <section className="w-full">
        <AlertasPanel cotizaciones={cotizaciones} alertas={alertas} mes={mes} />
      </section>

      {/* Calendario Comercial y Agenda */}
      <section className="w-full">
        <CalendarioComercial 
          cotizaciones={todasCotizaciones.length > 0 ? todasCotizaciones : cotizaciones} 
          aperturas={aperturas}
          alertas={alertas}
        />
      </section>

      <section className="w-full">
        <TendenciasCharts 
          filtros={filtros} 
          viewScope={viewScope} 
          cotizaciones={cotizaciones} 
          data={resumenData?.tendencias}
          loading={loading}
        />
      </section>

    </div>
  );
}
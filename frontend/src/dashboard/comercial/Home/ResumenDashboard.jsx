import React, { useState } from "react";
import SemaforoCumplimiento from "./resumen/SemaforoCumplimiento";
import AlertasPanel from "../Home/resumen/AlertasPanel"; // 
import TendenciasCharts from "../Home/resumen/TendenciasCharts"; // [cite: 61]

export default function ResumenDashboard({ anno, mes }) {
  const filtros = { anio: anno, mes };

  return (
    <div className="flex flex-col gap-8 p-1"> 
      
      <section className="w-full">
        <SemaforoCumplimiento anno={anno} mes={mes} />
      </section>

      <section className="w-full">
        <TendenciasCharts filtros={filtros} />
      </section>

    </div>
  );
}
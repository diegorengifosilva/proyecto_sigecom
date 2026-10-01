import React, { useState } from "react";
import {
  HeartPulse,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Search
} from "lucide-react";
import { toast } from "react-toastify";

export default function RrhhEmos() {
  const [clinics, setClinics] = useState([
    {
      id: "cli-1",
      name: "Clínica Ocupacional San Pablo",
      ruc: "20100128456",
      address: "Av. La Marina 2541, San Miguel",
      phone: "(01) 610-3333",
      active: true
    },
    {
      id: "cli-2",
      name: "Centro Médico Ocupacional Natclar",
      ruc: "20455891234",
      address: "Av. Javier Prado Este 4450, Surco",
      phone: "(01) 437-8899",
      active: true
    },
    {
      id: "cli-3",
      name: "Pulso Salud Ocupacional",
      ruc: "20512398711",
      address: "Calle Los Pinos 180, Miraflores",
      phone: "(01) 500-6000",
      active: true
    }
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <HeartPulse className="w-4 h-4" />
            <span>Salud Ocupacional en RR. HH.</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clínicas y Exámenes EMO</h1>
          <p className="text-sm text-gray-500 mt-1">
            Programación de exámenes médicos preocupacionales y periódicos en coordinación con IPRESS autorizadas.
          </p>
        </div>

        <button
          onClick={() => toast.info("Registrar nueva clínica o centro médico")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva IPRESS / Clínica</span>
        </button>
      </div>

      {/* Grid de Clínicas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {clinics.map((cli) => (
          <div key={cli.id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span className="font-mono">RUC: {cli.ruc}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                  Autorizada
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-base">{cli.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{cli.address}</p>
              <p className="text-xs text-blue-600 font-medium mt-1">Tel: {cli.phone}</p>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">Convenio vigente</span>
              <button
                onClick={() => toast.info(`Generando orden de atención para ${cli.name}`)}
                className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
              >
                Generar Orden EMO
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

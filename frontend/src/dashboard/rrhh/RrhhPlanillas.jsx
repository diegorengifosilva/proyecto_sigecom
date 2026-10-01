import React, { useState } from "react";
import {
  DollarSign,
  FileSpreadsheet,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Download,
  Plus
} from "lucide-react";
import { toast } from "react-toastify";

export default function RrhhPlanillas() {
  const [periods, setPeriods] = useState([
    {
      period: "2026-02",
      name: "Febrero 2026",
      status: "OPEN",
      totalEmployees: 53,
      totalAmount: 185420.0,
      currency: "PEN"
    },
    {
      period: "2026-01",
      name: "Enero 2026",
      status: "CLOSED",
      totalEmployees: 52,
      totalAmount: 181200.0,
      currency: "PEN"
    },
    {
      period: "2025-12",
      name: "Diciembre 2025",
      status: "CLOSED",
      totalEmployees: 50,
      totalAmount: 235800.0,
      currency: "PEN"
    }
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Gestión de Compensaciones</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cierres de Nómina y Planillas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submódulo para control de conceptos remunerativos, historial salarial y generación de boletas de pago.
          </p>
        </div>

        <button
          onClick={() => toast.info("Aperturar nuevo período de nómina")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Aperturar Período</span>
        </button>
      </div>

      {/* Lista de Períodos de Nómina */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Período</th>
              <th className="py-3 px-4">Colaboradores</th>
              <th className="py-3 px-4">Monto Estimado</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {periods.map((p) => (
              <tr key={p.period} className="hover:bg-gray-50/50">
                <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{p.name}</span>
                </td>
                <td className="py-3.5 px-4 text-xs">{p.totalEmployees} colaboradores</td>
                <td className="py-3.5 px-4 font-mono font-semibold text-xs text-gray-900">
                  {p.currency} {p.totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      p.status === "CLOSED"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {p.status === "CLOSED" ? "Cerrada" : "En Elaboración"}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  <button
                    onClick={() => toast.info(`Exportando planilla de ${p.name}`)}
                    className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Exportar TXT / Excel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

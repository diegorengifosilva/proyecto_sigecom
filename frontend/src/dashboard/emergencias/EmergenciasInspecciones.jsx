import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Plus,
  Clock,
  FileCheck2,
  AlertTriangle
} from "lucide-react";
import { toast } from "react-toastify";

export default function EmergenciasInspecciones() {
  const [inspections, setInspections] = useState([
    {
      id: "insp-1",
      code: "INSP-EME-2026-001",
      target: "Ronda Mensual de Gabinetes y Mangueras Contra Incendio",
      location: "Almacén y Planta Callao",
      inspector: "Pablo Quispe (HSE)",
      date: "2026-02-15",
      findings: 1,
      status: "COMPLETED"
    },
    {
      id: "insp-2",
      code: "INSP-EME-2026-002",
      target: "Inspección de Botiquines y Estaciones de Lavaojos",
      location: "Talleres y Oficinas Administrativas",
      inspector: "Marcia Silva (HSE)",
      date: "2026-02-20",
      findings: 0,
      status: "COMPLETED"
    },
    {
      id: "insp-3",
      code: "INSP-EME-2026-003",
      target: "Inspección de Luces de Emergencia y Rutas de Escape",
      location: "Edificio Central",
      inspector: "Mantenimiento Eléctrico",
      date: "2026-03-01",
      findings: 0,
      status: "SCHEDULED"
    }
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Verificación Preventiva</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inspecciones de Emergencia</h1>
          <p className="text-sm text-gray-500 mt-1">
            Programa de rondas e inspecciones periódicas de extintores, gabinetes, botiquines y sistemas de alarma.
          </p>
        </div>

        <button
          onClick={() => toast.info("Registrar nueva inspección")}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Inspección</span>
        </button>
      </div>

      {/* Tabla de Inspecciones */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Código / Programa</th>
              <th className="py-3 px-4">Sede / Ubicación</th>
              <th className="py-3 px-4">Inspector Responsable</th>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Hallazgos</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inspections.map((insp) => (
              <tr key={insp.id} className="hover:bg-gray-50/50">
                <td className="py-3.5 px-4 font-semibold text-gray-900">
                  <div>{insp.target}</div>
                  <span className="text-xs text-gray-400 font-mono font-normal">{insp.code}</span>
                </td>
                <td className="py-3.5 px-4 text-xs">{insp.location}</td>
                <td className="py-3.5 px-4 text-xs text-gray-700">{insp.inspector}</td>
                <td className="py-3.5 px-4 text-xs font-mono">{insp.date}</td>
                <td className="py-3.5 px-4 text-xs">
                  {insp.findings > 0 ? (
                    <span className="text-amber-600 font-semibold">{insp.findings} observación(es)</span>
                  ) : (
                    <span className="text-emerald-600 font-semibold">Conforme (0)</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      insp.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {insp.status === "COMPLETED" ? "Ejecutada" : "Programada"}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => toast.success(`Abriendo acta de inspección ${insp.code}`)}
                    className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold"
                  >
                    Ver Acta
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

import React, { useState } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  User,
  Calendar
} from "lucide-react";
import { toast } from "react-toastify";

export default function EmergenciasAcciones() {
  const [actions, setActions] = useState([
    {
      id: "act-1",
      code: "ACT-EME-001",
      description: "Instalación de señalética fotoluminiscente en rutas de evacuación del nivel 2.",
      responsible: "Carlos Mendoza (Supervisor HSE)",
      dueDate: "2026-03-15",
      status: "OPEN",
      origin: "Simulacro de Evacuación Enero"
    },
    {
      id: "act-2",
      code: "ACT-EME-002",
      description: "Recarga y prueba hidrostática de extintores PQS de 6kg en almacén general.",
      responsible: "Mantenimiento / Proveedor Certificado",
      dueDate: "2026-03-10",
      status: "IN_PROGRESS",
      origin: "Inspección Periódica Mensual"
    },
    {
      id: "act-3",
      code: "ACT-EME-003",
      description: "Reabastecimiento de apósitos y férulas en botiquín de trauma.",
      responsible: "Enfermería Ocupacional",
      dueDate: "2026-02-28",
      status: "COMPLETED",
      origin: "Simulacro de Primeros Auxilios"
    }
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <ClipboardCheck className="w-4 h-4" />
            <span>Mejora Continua y Eficacia</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Planes de Acción Correctiva</h1>
          <p className="text-sm text-gray-500 mt-1">
            Acciones derivadas de simulacros, intervenciones reales e inspecciones con responsable y fecha límite de subsanación.
          </p>
        </div>

        <button
          onClick={() => toast.info("Registrar nueva acción correctiva")}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Acción</span>
        </button>
      </div>

      {/* Lista de Acciones */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Código / Origen</th>
              <th className="py-3 px-4">Descripción de la Acción</th>
              <th className="py-3 px-4">Responsable</th>
              <th className="py-3 px-4">Fecha Límite</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Cierre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {actions.map((act) => (
              <tr key={act.id} className="hover:bg-gray-50/50">
                <td className="py-3.5 px-4 font-bold text-gray-900 font-mono text-xs">
                  <div>{act.code}</div>
                  <span className="text-[11px] text-gray-400 font-normal">{act.origin}</span>
                </td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-800 max-w-xs">{act.description}</td>
                <td className="py-3.5 px-4 text-xs text-gray-600">{act.responsible}</td>
                <td className="py-3.5 px-4 text-xs text-gray-500 font-mono">{act.dueDate}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      act.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : act.status === "IN_PROGRESS"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {act.status === "COMPLETED" ? "Subsanado" : act.status === "IN_PROGRESS" ? "En Proceso" : "Abierto"}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  {act.status !== "COMPLETED" && (
                    <button
                      onClick={() => {
                        setActions(
                          actions.map((a) => (a.id === act.id ? { ...a, status: "COMPLETED" } : a))
                        );
                        toast.success(`Acción ${act.code} marcada como subsanada.`);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                    >
                      Subsanar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

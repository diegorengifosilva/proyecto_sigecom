import React, { useState } from "react";
import {
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Clock,
  Plus
} from "lucide-react";
import { toast } from "react-toastify";

export default function SaludGestionMedica() {
  const [observations, setObservations] = useState([
    {
      id: "obs-1",
      collaborator: "Pedro Gomez Sanchez",
      dni: "10293847",
      clinic: "Natclar",
      issue: "Agudeza visual no corregida (requiere lentes correctivos con filtro UV).",
      specialty: "Oftalmología",
      status: "OPEN",
      deadline: "2026-03-20"
    },
    {
      id: "obs-2",
      collaborator: "Ana Morales Vega",
      dni: "20394857",
      clinic: "San Pablo",
      issue: "Presión arterial limítrofe en evaluación periódica; interconsulta con cardiología.",
      specialty: "Cardiología",
      status: "LIFTED",
      deadline: "2026-02-25"
    }
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Seguimiento Clínico Ocupacional</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión Médica e Interconsultas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control de interconsultas con especialistas, seguimiento y levantamiento de observaciones médicas emitidas por clínicas.
          </p>
        </div>

        <button
          onClick={() => toast.info("Registrar nueva interconsulta médica")}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Interconsulta</span>
        </button>
      </div>

      {/* Tabla de Interconsultas */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Colaborador</th>
              <th className="py-3 px-4">Especialidad</th>
              <th className="py-3 px-4">Observación Médica</th>
              <th className="py-3 px-4">Fecha Límite</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Levantamiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {observations.map((obs) => (
              <tr key={obs.id} className="hover:bg-gray-50/50">
                <td className="py-3.5 px-4 font-semibold text-gray-900">
                  <div>{obs.collaborator}</div>
                  <span className="text-xs text-gray-400 font-mono">{obs.dni}</span>
                </td>
                <td className="py-3.5 px-4 text-xs font-semibold text-teal-700">{obs.specialty}</td>
                <td className="py-3.5 px-4 text-xs max-w-xs">{obs.issue}</td>
                <td className="py-3.5 px-4 text-xs font-mono">{obs.deadline}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      obs.status === "LIFTED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {obs.status === "LIFTED" ? "Levantada" : "En Seguimiento"}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  {obs.status !== "LIFTED" ? (
                    <button
                      onClick={() => {
                        setObservations(
                          observations.map((o) => (o.id === obs.id ? { ...o, status: "LIFTED" } : o))
                        );
                        toast.success("Observación médica levantada con informe de especialista.");
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                    >
                      Levantar
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Conforme</span>
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

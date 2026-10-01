import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Building,
  User,
  Plus,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { toast } from "react-toastify";

export default function SaludAgenda() {
  const [appointments, setAppointments] = useState([
    {
      id: "apt-1",
      collaborator: "Juan Perez Desarrollador",
      dni: "88776655",
      clinic: "Clínica San Pablo",
      date: "2026-03-02 08:30",
      examType: "Ingreso / Preocupacional",
      protocol: "Protocolo Estándar Administrativo",
      status: "SCHEDULED"
    },
    {
      id: "apt-2",
      collaborator: "Carlos Mendoza Ramos",
      dni: "44556677",
      clinic: "Natclar Surco",
      date: "2026-03-05 09:00",
      examType: "Periódico Anual",
      protocol: "Protocolo Minero Las Bambas (Gran Altura)",
      status: "SCHEDULED"
    }
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">
            <Calendar className="w-4 h-4" />
            <span>Programación de Citas Médicas</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Agenda y Órdenes de Atención</h1>
          <p className="text-sm text-gray-500 mt-1">
            Programación de citas para exámenes médicos ocupacionales y generación de órdenes de atención en clínicas IPRESS.
          </p>
        </div>

        <button
          onClick={() => toast.info("Generar nueva cita médica")}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Programar Cita</span>
        </button>
      </div>

      {/* Grid de Citas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {appointments.map((apt) => (
          <div key={apt.id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">
                {apt.examType}
              </span>
              <span className="font-mono text-xs text-gray-400">{apt.date}</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{apt.collaborator}</h3>
              <p className="text-xs text-gray-400 font-mono">DNI: {apt.dni}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Clínica:</span>
                <span className="font-semibold text-gray-800">{apt.clinic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Protocolo:</span>
                <span className="font-semibold text-gray-800">{apt.protocol}</span>
              </div>
            </div>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Cita Confirmada</span>
              </span>
              <button
                onClick={() => toast.success(`Imprimiendo orden de atención para ${apt.collaborator}`)}
                className="px-3 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-semibold"
              >
                Imprimir Orden
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

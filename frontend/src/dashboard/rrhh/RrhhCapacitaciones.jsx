import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  GraduationCap,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  BookOpen,
  Award,
  Search
} from "lucide-react";
import { toast } from "react-toastify";

export default function RrhhCapacitaciones() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const res = await api.get("hseq/trainings/");
      // Filtrar capacitaciones donde managementOwner sea RRHH o generales
      setTrainings(res.data || []);
    } catch (err) {
      console.error("Error al cargar capacitaciones:", err);
      toast.error("No se pudo cargar las capacitaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Desarrollo Organizacional</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Capacitaciones de Recursos Humanos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de capacitaciones no técnicas: clima laboral, liderazgo, inducción corporativa y habilidades blandas.
          </p>
        </div>

        <button
          onClick={() => toast.info("Crear sesión formativa de RR. HH.")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Capacitación</span>
        </button>
      </div>

      {/* Grid de Capacitaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainings.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span className="font-mono font-bold text-blue-600">{item.code}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                  {item.managementOwner || "RRHH"}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-base">{item.title}</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {item.description || "Sesión formativa enfocada al desarrollo del talento humano y competencias organizacionales."}
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {item.durationHours || 2} horas
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {item.status || "Programada"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Video,
  FileCheck,
  Award,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";

export default function MiCapacitacion() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ employee: null, assignments: [] });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchMyTrainings = async () => {
    try {
      setLoading(true);
      const res = await api.get("hseq/my-trainings/");
      setData(res.data && typeof res.data === 'object' ? res.data : { employee: null, assignments: [] });
    } catch (err) {
      console.error("Error al cargar mis capacitaciones:", err);
      toast.error("No se pudieron cargar sus cursos.");
      setData({ employee: null, assignments: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTrainings();
  }, []);

  const assignmentsList = Array.isArray(data?.assignments)
    ? data.assignments
    : (Array.isArray(data) ? data : []);

  const filtered = assignmentsList.filter((item) =>
    (item.training_title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.training_code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Portal del Colaborador</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mi Capacitación</h1>
          {data.employee && (
            <p className="text-sm text-gray-500 mt-1">
              Colaborador: <strong className="text-gray-800">{data.employee.full_name}</strong> ({data.employee.position_name} - {data.employee.area_name})
            </p>
          )}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por curso o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando sus asignaciones...</div>
      ) : (!Array.isArray(filtered) || filtered.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No se encontraron cursos asignados</p>
          <p className="text-xs text-gray-400 mt-1">Comuníquese con el área de HSEQ para verificar su programación.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(filtered) ? filtered : []).map((item) => {
            const isApproved = item.status === "APPROVED";
            const isFailed = item.status === "FAILED";
            const isPending = item.status === "PENDING";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-5 flex flex-col justify-between hover:border-indigo-300 transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {item.training_code}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        isApproved
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isFailed
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {isApproved ? "Aprobado" : isFailed ? "Desaprobado" : "Pendiente"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 leading-snug mb-2">
                    {item.training_title}
                  </h3>

                  <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Modalidad: <strong>{item.training_modality || "Virtual"}</strong></span>
                    </div>
                    {item.best_score !== null && (
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Mejor Nota: <strong className="text-indigo-700">{Number(item.best_score).toFixed(0)}/20</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  {item.training_video_url && (
                    <a
                      href={item.training_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Ver Clase</span>
                    </a>
                  )}

                  <span className="text-xs text-gray-400 font-medium ml-auto">
                    {item.attempt_count > 0 ? `${item.attempt_count} intentos` : "Sin intentos"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

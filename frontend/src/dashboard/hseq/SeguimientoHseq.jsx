import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  BarChart3,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  KeyRound,
  Edit3,
} from "lucide-react";
import { toast } from "react-toastify";

export default function SeguimientoHseq() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`hseq/assignments/?search=${search}&status=${filterStatus}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setAssignments(list);
    } catch (err) {
      console.error("Error al cargar seguimiento:", err);
      toast.error("No se pudieron cargar las asignaciones.");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [search, filterStatus]);

  const handleUnlockExam = async (id) => {
    try {
      const res = await api.post(`hseq/assignments/${id}/unlock-exam/`);
      toast.success(res.data.message || "Examen desbloqueado.");
      fetchAssignments();
    } catch (err) {
      console.error("Error al desbloquear examen:", err);
      toast.error("No se pudo desbloquear el examen.");
    }
  };

  const handleRecordScore = async (id) => {
    const raw = prompt("Ingrese la nota de evaluación (0 a 20):");
    if (!raw) return;
    const score = parseFloat(raw);
    if (isNaN(score) || score < 0 || score > 20) {
      toast.error("Nota inválida. Debe ser un número entre 0 y 20.");
      return;
    }

    try {
      const res = await api.post(`hseq/assignments/${id}/record-score/`, { score });
      toast.success(res.data.message || "Calificación guardada.");
      fetchAssignments();
    } catch (err) {
      console.error("Error al registrar nota:", err);
      toast.error("No se pudo guardar la calificación.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Matriz de Cumplimiento Transversal</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Seguimiento de Asignaciones HSEQ</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control de asistencia, desbloqueo de exámenes y registro de notas de colaboradores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Todos los Estados</option>
            <option value="APPROVED">Aprobados</option>
            <option value="FAILED">Desaprobados</option>
            <option value="PENDING">Pendientes</option>
            <option value="OVERDUE">Vencidos</option>
          </select>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por colaborador o curso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando matriz de seguimiento...</div>
      ) : (!Array.isArray(assignments) || assignments.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No se encontraron asignaciones</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Área</th>
                  <th className="py-3 px-4">Capacitación</th>
                  <th className="py-3 px-4 text-center">Mejor Nota</th>
                  <th className="py-3 px-4 text-center">Intentos</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(assignments) ? assignments : []).map((item) => {
                  const isApproved = item.status === "APPROVED";
                  const isFailed = item.status === "FAILED";

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{item.employee_name}</div>
                        <div className="text-[11px] font-mono text-gray-400">{item.employee_dni}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{item.employee_area}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{item.training_title}</div>
                        <div className="text-[11px] font-mono text-gray-400">{item.training_code}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.best_score !== null ? (
                          <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            {Number(item.best_score).toFixed(0)}/20
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-500 font-medium">
                        {item.attempt_count || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isFailed
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isApproved ? "Aprobado" : isFailed ? "Desaprobado" : "Pendiente"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {!item.exam_unlocked_at && (
                          <button
                            onClick={() => handleUnlockExam(item.id)}
                            title="Desbloquear examen (asistencia)"
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRecordScore(item.id)}
                          title="Calificar nota manual"
                          className="p-1.5 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

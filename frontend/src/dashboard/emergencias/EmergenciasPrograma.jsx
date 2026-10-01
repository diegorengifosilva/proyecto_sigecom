import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  FileText,
  Camera,
  X
} from "lucide-react";
import { toast } from "react-toastify";

export default function EmergenciasPrograma() {
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);

  const [newDrill, setNewDrill] = useState({
    title: "",
    activityType: "DRILL",
    audience: "Planta y Oficinas",
    scheduledAt: "",
    pillar: "RESPUESTA_A_EMERGENCIAS"
  });

  const fetchProgram = async () => {
    try {
      setLoading(true);
      const res = await api.get("emergencias/program/");
      setDrills(res.data || []);
    } catch (err) {
      console.error("Error al cargar programa anual:", err);
      toast.error("No se pudo cargar el programa de simulacros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgram();
  }, []);

  const handleCreateDrill = async (e) => {
    e.preventDefault();
    try {
      await api.post("emergencias/program/", newDrill);
      toast.success("Simulacro incorporado al programa anual.");
      setShowAddModal(false);
      setNewDrill({
        title: "",
        activityType: "DRILL",
        audience: "Planta y Oficinas",
        scheduledAt: "",
        pillar: "RESPUESTA_A_EMERGENCIAS"
      });
      fetchProgram();
    } catch (err) {
      console.error("Error al programar simulacro:", err);
      toast.error("No se pudo registrar la actividad.");
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleTarget) return;
    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries());
    try {
      await api.post(`emergencias/program/${rescheduleTarget.id}/reschedule/`, data);
      toast.success("Simulacro reprogramado con motivo registrado.");
      setRescheduleTarget(null);
      fetchProgram();
    } catch (err) {
      console.error("Error al reprogramar:", err);
      toast.error("No se pudo reprogramar el simulacro.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <CalendarDays className="w-4 h-4" />
            <span>Planificación y Entrenamiento</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Programa Anual de Simulacros</h1>
          <p className="text-sm text-gray-500 mt-1">
            Calendario único de simulacros por sede y proyecto, trazabilidad de reprogramaciones y adjuntos de evidencias.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-rose-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Programar Simulacro</span>
        </button>
      </div>

      {/* Grid de Simulacros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-sm text-gray-400">
            Cargando programa de simulacros...
          </div>
        ) : drills.length > 0 ? (
          drills.map((d) => (
            <div
              key={d.id}
              className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[11px]">
                    {d.activityType === "DRILL" ? "Simulacro Oficial" : "Entrenamiento"}
                  </span>
                  <span
                    className={`font-semibold text-[11px] px-2 py-0.5 rounded-full ${
                      d.status === "EXECUTED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {d.status || "Programado"}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-base">{d.title}</h3>
                <p className="text-xs text-gray-500 mt-1">Sede: {d.audience || "Todas las sedes"}</p>
                <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Fecha:{" "}
                    <strong>
                      {d.currentScheduledAt ? new Date(d.currentScheduledAt).toLocaleDateString("es-PE") : "Por definir"}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Reprog: {d.rescheduleCount || 0}</span>
                <div className="space-x-2">
                  <button
                    onClick={() => setRescheduleTarget(d)}
                    className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Reprogramar
                  </button>
                  <button
                    onClick={() => toast.info(`Adjuntando evidencias para ${d.title}`)}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg"
                  >
                    Evidencias
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-gray-200/80 text-center text-sm text-gray-400">
            Aún no se han programado simulacros para este período.
          </div>
        )}
      </div>

      {/* Modal Programar Simulacro */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900">Programar Simulacro o Entrenamiento</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDrill} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título de la Actividad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Simulacro Nacional Multipeligro por Sismo"
                  value={newDrill.title}
                  onChange={(e) => setNewDrill({ ...newDrill, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Actividad</label>
                <select
                  value={newDrill.activityType}
                  onChange={(e) => setNewDrill({ ...newDrill, activityType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                >
                  <option value="DRILL">Simulacro Operativo</option>
                  <option value="TRAINING">Entrenamiento de Brigada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sede / Ubicación Objetivo</label>
                <input
                  type="text"
                  placeholder="Planta Callao, Mina Toquepala, etc."
                  value={newDrill.audience}
                  onChange={(e) => setNewDrill({ ...newDrill, audience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha y Hora Programada *</label>
                <input
                  type="datetime-local"
                  required
                  value={newDrill.scheduledAt}
                  onChange={(e) => setNewDrill({ ...newDrill, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-rose-500/20"
                >
                  Programar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reprogramar */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Reprogramar Simulacro</h2>
                <p className="text-xs text-gray-400 mt-0.5">{rescheduleTarget.title}</p>
              </div>
              <button
                onClick={() => setRescheduleTarget(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nueva Fecha y Hora *</label>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo Obligatorio *</label>
                <textarea
                  name="reason"
                  required
                  rows={3}
                  placeholder="Justifique el motivo de la reprogramación..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRescheduleTarget(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-rose-500/20"
                >
                  Confirmar Reprogramación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

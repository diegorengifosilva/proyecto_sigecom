import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  ClipboardCheck,
  Search,
  Award,
  HelpCircle,
  Clock,
  CheckCircle2,
  FileQuestion,
} from "lucide-react";
import { toast } from "react-toastify";

export default function EvaluacionesHseq() {
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState([]);
  const [selectedEval, setSelectedEval] = useState(null);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const res = await api.get("hseq/evaluations/");
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setEvaluations(list);
    } catch (err) {
      console.error("Error al cargar evaluaciones:", err);
      toast.error("No se pudieron cargar las evaluaciones.");
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
          <ClipboardCheck className="w-4 h-4" />
          <span>Evaluaciones y Banco de Preguntas</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Evaluaciones de Capacitaciones HSEQ</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configuración de exámenes, preguntas de opción múltiple, notas mínimas aprobatorias (regla estándar: 16) y límites de intentos.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando evaluaciones...</div>
      ) : (!Array.isArray(evaluations) || evaluations.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <FileQuestion className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No se encontraron evaluaciones configuradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1">Exámenes Registrados</h2>
            <div className="space-y-2">
              {(Array.isArray(evaluations) ? evaluations : []).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEval(ev)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedEval?.id === ev.id
                      ? "bg-indigo-50/80 border-indigo-300 shadow-sm ring-1 ring-indigo-500/20"
                      : "bg-white border-gray-200 hover:border-indigo-200 hover:bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100">
                      {ev.training_code || "HSEQ"}
                    </span>
                    <span className="text-gray-400 font-medium">Nota Mín: {Number(ev.minimum_score).toFixed(0)}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mt-1">{ev.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                    <span>{ev.total_questions || ev.preguntas?.length || 0} preguntas</span>
                    {ev.max_attempts && <span>· Máx {ev.max_attempts} intentos</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
            {selectedEval ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div>
                    <span className="text-xs font-mono font-bold text-gray-400">{selectedEval.training_code}</span>
                    <h2 className="text-lg font-bold text-gray-900">{selectedEval.title}</h2>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>Nota Mínima Aprobatoria: <strong className="text-indigo-600 font-bold text-sm">{Number(selectedEval.minimum_score).toFixed(0)} / 20</strong></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Banco de Preguntas</h3>
                  {(!Array.isArray(selectedEval.preguntas) || selectedEval.preguntas.length === 0) ? (
                    <p className="text-xs text-gray-400 py-6 text-center">No hay preguntas registradas en esta evaluación.</p>
                  ) : (
                    (Array.isArray(selectedEval.preguntas) ? selectedEval.preguntas : []).map((q, idx) => (
                      <div key={q.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-bold text-gray-900">
                            <span className="text-indigo-600 mr-1.5">{idx + 1}.</span>
                            {q.prompt}
                          </div>
                          <span className="text-[11px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 shrink-0">
                            {Number(q.points).toFixed(0)} pts
                          </span>
                        </div>

                        <div className="space-y-1.5 pl-4">
                          {(q.opciones || []).map((opt) => (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${
                                opt.is_correct
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold"
                                  : "bg-white text-gray-600 border-gray-200/80"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span>{opt.label}</span>
                              {opt.is_correct && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-24 text-gray-400 text-xs">
                Seleccione un examen a la izquierda para inspeccionar su banco de preguntas y nota aprobatoria.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

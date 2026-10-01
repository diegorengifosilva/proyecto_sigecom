import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { MessageSquareText, Star, Award, CheckCircle2, Search } from "lucide-react";
import { toast } from "react-toastify";

export default function EncuestasHseq() {
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState([]);

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        setLoading(true);
        const res = await api.get("hseq/surveys/");
        const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setSurveys(list);
      } catch (err) {
        console.error("Error al cargar encuestas:", err);
        toast.error("No se pudieron cargar las respuestas de encuestas.");
        setSurveys([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSurveys();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
          <MessageSquareText className="w-4 h-4" />
          <span>Calidad y Retroalimentación</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Encuestas de Satisfacción HSEQ</h1>
        <p className="text-sm text-gray-500 mt-1">
          Resultados de encuestas post-capacitación: evaluación del facilitador, dominio, materiales y aplicabilidad en campo.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando encuestas...</div>
      ) : (!Array.isArray(surveys) || surveys.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <MessageSquareText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No se han registrado encuestas aún</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Capacitación</th>
                  <th className="py-3 px-4 text-center">Tema (1-5)</th>
                  <th className="py-3 px-4 text-center">Facilitador (1-5)</th>
                  <th className="py-3 px-4 text-center">Expectativas</th>
                  <th className="py-3 px-4">Comentarios</th>
                  <th className="py-3 px-4 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(surveys) ? surveys : []).map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/70">
                    <td className="py-3 px-4 font-semibold text-gray-900">{s.employee_name}</td>
                    <td className="py-3 px-4 text-gray-700">{s.training_title}</td>
                    <td className="py-3 px-4 text-center font-bold text-amber-600">{s.topic_rating}/5</td>
                    <td className="py-3 px-4 text-center font-bold text-amber-600">{s.trainer_rating}/5</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          s.expectations_met ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {s.expectations_met ? "Cumplió" : "No Cumplió"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 italic max-w-xs truncate">{s.comments || "—"}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{s.submitted_at?.substring(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

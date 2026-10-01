import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { BookOpenCheck, Award, Users, CheckCircle2, Clock } from "lucide-react";
import { toast } from "react-toastify";

export default function MatrizCompetencias() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ profiles: [], competencies: [] });

  useEffect(() => {
    const fetchMatrix = async () => {
      try {
        setLoading(true);
        const res = await api.get("hseq/competencies/matrix/");
        setData(res.data && typeof res.data === 'object' ? res.data : { profiles: [], competencies: [] });
      } catch (err) {
        console.error("Error al cargar matriz de competencias:", err);
        toast.error("No se pudo cargar la matriz.");
        setData({ profiles: [], competencies: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchMatrix();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1">
          <BookOpenCheck className="w-4 h-4" />
          <span>Estructura de Competencias HSEQ</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Matriz de Competencias por Perfil</h1>
        <p className="text-sm text-gray-500 mt-1">
          Mapeo de cursos y certificaciones requeridas según el perfil y puesto de trabajo en V&C Corporation.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando matriz de competencias...</div>
      ) : (!Array.isArray(data?.profiles) || data.profiles.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <BookOpenCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No se encontraron perfiles de competencias</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(Array.isArray(data?.profiles) ? data.profiles : []).map((prof) => (
            <div key={prof.id} className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{prof.name}</h2>
                  <p className="text-xs text-gray-500">{prof.description || "Sin descripción asignada"}</p>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl self-start">
                  {prof.colaboradores_count || 0} colaboradores asociados
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Array.isArray(prof?.detalles) ? prof.detalles : []).map((det) => (
                  <div
                    key={det.id}
                    className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-mono font-bold text-gray-500">{det.competency?.code}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            det.is_required ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {det.is_required ? "Obligatoria" : "Opcional"}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-gray-900 mb-1">{det.competency?.name}</div>
                      <div className="text-[11px] text-gray-500">Exigencia: {det.requirement_moment}</div>
                    </div>

                    {det.validity_months && (
                      <div className="mt-2 pt-2 border-t border-gray-200/60 text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Renovación cada {det.validity_months} meses</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

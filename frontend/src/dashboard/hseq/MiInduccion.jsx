import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Download,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Send,
} from "lucide-react";
import { toast } from "react-toastify";

export default function MiInduccion() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ employee: null, process: null });

  const fetchMyInduction = async () => {
    try {
      setLoading(true);
      const res = await api.get("hseq/my-induction/");
      setData(res.data);
    } catch (err) {
      console.error("Error al cargar mi inducción:", err);
      toast.error("No se pudo cargar su proceso de inducción.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInduction();
  }, []);

  const handleCompleteRequirement = async (reqId) => {
    try {
      const res = await api.post(`hseq/onboarding/requirements/${reqId}/complete/`);
      toast.success(res.data.message || "Requisito completado.");
      fetchMyInduction();
    } catch (err) {
      console.error("Error al completar requisito:", err);
      toast.error("No se pudo marcar el requisito.");
    }
  };

  const process = data.process;
  const isCompleted = process?.status === "COMPLETED" || process?.status === "HR_WORKPLACE_TRAINING";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Inducción de Seguridad y Salud en el Trabajo</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mi Inducción Corporativa</h1>
          {data.employee && (
            <p className="text-sm text-gray-500 mt-1">
              Colaborador: <strong className="text-gray-800">{data.employee.full_name}</strong> · Cargo: {data.employee.position_name}
            </p>
          )}
        </div>

        {process && (
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                isCompleted
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isCompleted ? "Fase HSEQ Completada" : "En Progreso"}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando requisitos de inducción...</div>
      ) : !process ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <FileCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No tiene un proceso de inducción pendiente</p>
          <p className="text-xs text-gray-400 mt-1">Su inducción general y específica se encuentra al día.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-2">Checklist de Cumplimiento Obligatorio</h2>
            <p className="text-xs text-gray-500 mb-4">
              Revise, descargue y acepte cada documento antes de iniciar sus labores en sede o proyecto.
            </p>

            <div className="divide-y divide-gray-100">
              {(Array.isArray(process?.requisitos) ? process.requisitos : []).map((req) => {
                const reqDone = req.status === "COMPLETED";
                return (
                  <div key={req.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          reqDone ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{req.label}</div>
                        <div className="text-xs text-gray-400">Código: {req.code} · Categoría: {req.category}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {reqDone ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completado
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCompleteRequirement(req.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                        >
                          Confirmar Lectura
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

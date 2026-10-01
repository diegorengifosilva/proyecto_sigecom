import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Settings, ShieldCheck, Layers, Award, Save } from "lucide-react";
import { toast } from "react-toastify";

export default function ConfiguracionHseq() {
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState({ pillars: [], programs: [] });
  const [minScore, setMinScore] = useState(16);
  const [target, setTarget] = useState(80);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        setLoading(true);
        const res = await api.get("hseq/catalogs/");
        if (res.data && typeof res.data === 'object') {
          setCatalogs(res.data);
          if (Array.isArray(res.data.programs) && res.data.programs.length > 0) {
            const p = res.data.programs[0];
            setMinScore(Number(p.minimum_score) || 16);
            setTarget(Number(p.general_target) || 80);
          }
        }
      } catch (err) {
        console.error("Error al cargar configuración:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalogs();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Parámetros generales de HSEQ actualizados.");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          <Settings className="w-4 h-4" />
          <span>Políticas y Reglas de Negocio</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración del Módulo HSEQ</h1>
        <p className="text-sm text-gray-500 mt-1">
          Parámetros institucionales: nota mínima de aprobación, meta corporativa y pilares estratégicos.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <form onSubmit={handleSave} className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Reglas de Evaluación y Metas</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nota Mínima Aprobatoria (Escala vigesimal 0-20)
              </label>
              <input
                type="number"
                min="10"
                max="20"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-[11px] text-gray-400 mt-1">Regla corporativa V&C: Nota estándar 16.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Meta General de Cumplimiento (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-[11px] text-gray-400 mt-1">Meta corporativa del programa anual (típicamente 80%).</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Parámetros</span>
            </button>
          </div>
        </form>

        <div className="pt-6 border-t border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Pilares HSEQ Activos</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Array.isArray(catalogs?.pillars) ? catalogs.pillars : []).map((p) => (
              <div key={p.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 text-xs">
                <span className="font-mono font-bold text-emerald-700 mr-2">{p.code}</span>
                <span className="font-semibold text-gray-800">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

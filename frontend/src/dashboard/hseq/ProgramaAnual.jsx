import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Video,
  Clock,
  Send,
  Users,
  Layers,
} from "lucide-react";
import { toast } from "react-toastify";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function ProgramaAnual() {
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedPillar, setSelectedPillar] = useState("");
  const [search, setSearch] = useState("");

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `hseq/trainings/?month=${selectedMonth}&pillarId=${selectedPillar}&search=${search}`
      );
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setTrainings(list);
    } catch (err) {
      console.error("Error al cargar programa:", err);
      toast.error("No se pudo cargar el programa de capacitaciones.");
      setTrainings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      const res = await api.get("hseq/catalogs/");
      setPillars(res.data.pillars || []);
    } catch (err) {
      console.error("Error al cargar pilares:", err);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  useEffect(() => {
    fetchTrainings();
  }, [selectedMonth, selectedPillar, search]);

  const handlePublish = async (id) => {
    try {
      const res = await api.post(`hseq/trainings/${id}/publish/`);
      toast.success(res.data.message || "Capacitación publicada.");
      fetchTrainings();
    } catch (err) {
      console.error("Error al publicar capacitación:", err);
      toast.error("No se pudo publicar la capacitación.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
            <CalendarDays className="w-4 h-4" />
            <span>Planificación y Ejecución Anual</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Programa Anual de Capacitaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión y seguimiento mensual de cursos obligatorios, pilares y asistencias en V&C Corp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Todos los Meses</option>
            {MESES.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={selectedPillar}
            onChange={(e) => setSelectedPillar(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Todos los Pilares</option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="relative w-full md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar curso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando programa anual...</div>
      ) : (!Array.isArray(trainings) || trainings.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No se encontraron capacitaciones</p>
          <p className="text-xs text-gray-400 mt-1">Pruebe ajustando los filtros de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(trainings) ? trainings : []).map((t) => {
            const isConfirmed = t.status === "CONFIRMED";
            const isExecuted = t.status === "EXECUTED";
            const isDraft = t.status === "DRAFT";

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-5 flex flex-col justify-between hover:border-emerald-300 transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {t.code}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        isExecuted
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : isConfirmed
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {isExecuted ? "Ejecutado" : isConfirmed ? "Publicado" : "Borrador"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 leading-snug mb-2">{t.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4">{t.description || "Sin descripción adicional"}</p>

                  <div className="space-y-1.5 text-xs text-gray-600 mb-4 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pilar:</span>
                      <strong className="text-gray-800">{t.pillar_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mes Planificado:</span>
                      <strong>{MESES[t.planned_month - 1] || `Mes ${t.planned_month}`}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Asignados:</span>
                      <span><strong>{t.approved_count || 0}</strong> aprobados de <strong>{t.assignments_count || 0}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  {isDraft && (
                    <button
                      onClick={() => handlePublish(t.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publicar a Personal</span>
                    </button>
                  )}

                  {isConfirmed && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Disponible en portal
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

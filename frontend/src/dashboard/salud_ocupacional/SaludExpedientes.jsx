import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Link } from "react-router-dom";
import {
  FileText,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Building,
  ArrowRight,
  X
} from "lucide-react";
import { toast } from "react-toastify";

export default function SaludExpedientes() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showNewModal, setShowNewModal] = useState(false);

  const [newCase, setNewCase] = useState({
    collaboratorName: "",
    collaboratorDni: "",
    examType: "PRE_OCCUPATIONAL",
    clinic: "Clínica San Pablo",
    scheduledAt: new Date().toISOString().split("T")[0]
  });

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await api.get("salud-ocupacional/cases/");
      setCases(res.data || []);
    } catch (err) {
      console.error("Error al cargar expedientes:", err);
      toast.error("No se pudo cargar la lista de expedientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleCreateCase = async (e) => {
    e.preventDefault();
    try {
      await api.post("salud-ocupacional/cases/", newCase);
      toast.success("Expediente EMO creado exitosamente.");
      setShowNewModal(false);
      setNewCase({
        collaboratorName: "",
        collaboratorDni: "",
        examType: "PRE_OCCUPATIONAL",
        clinic: "Clínica San Pablo",
        scheduledAt: new Date().toISOString().split("T")[0]
      });
      fetchCases();
    } catch (err) {
      console.error("Error al crear expediente:", err);
      toast.error("No se pudo crear el expediente médico.");
    }
  };

  const filtered = cases.filter((c) => {
    const matchStatus = statusFilter === "ALL" || c.aptitudeResult === statusFilter;
    const matchSearch =
      !search ||
      (c.collaboratorName && c.collaboratorName.toLowerCase().includes(search.toLowerCase())) ||
      (c.code && c.code.toLowerCase().includes(search.toLowerCase())) ||
      (c.collaboratorDni && c.collaboratorDni.includes(search));
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">
            <FileText className="w-4 h-4" />
            <span>Vigilancia Médica Individual</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Expedientes Médicos Ocupacionales (EMO)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de historias ocupacionales por tipo (Ingreso, Periódico, Retiro, Reubicación), clínica y diagnósticos clínicos.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-teal-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Aperturar Expediente</span>
        </button>
      </div>

      {/* Toolbar / Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nombre del colaborador o DNI..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="ALL">Todos los Dictámenes</option>
            <option value="FIT">Apto</option>
            <option value="FIT_WITH_RESTRICTIONS">Apto con Restricción</option>
            <option value="NOT_FIT">No Apto</option>
          </select>

          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
            {filtered.length} expedientes
          </span>
        </div>
      </div>

      {/* Tabla de Expedientes */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Código EMO</th>
              <th className="py-3 px-4">Colaborador</th>
              <th className="py-3 px-4">Tipo Examen</th>
              <th className="py-3 px-4">Clínica / IPRESS</th>
              <th className="py-3 px-4">Fecha Evaluación</th>
              <th className="py-3 px-4">Dictamen Médico</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-sm text-gray-400">
                  Cargando expedientes médicos...
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-teal-700">{c.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-900">
                    <div>{c.collaboratorName}</div>
                    <span className="text-xs text-gray-400 font-mono">{c.collaboratorDni}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-gray-700">{c.examType}</td>
                  <td className="py-3.5 px-4 text-xs">{c.clinic || "Clínica Ocupacional"}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-500">
                    {c.evaluationDate ? new Date(c.evaluationDate).toLocaleDateString("es-PE") : "Programado"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        c.aptitudeResult === "FIT"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : c.aptitudeResult === "FIT_WITH_RESTRICTIONS"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {c.aptitudeResult || "En Evaluación"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => toast.info(`Abriendo expediente médico ${c.code}`)}
                      className="px-2.5 py-1 text-xs font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg"
                    >
                      Ver Ficha
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-8 text-center text-sm text-gray-400">
                  No hay expedientes que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Expediente */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900">Aperturar Expediente EMO</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre del Colaborador *</label>
                <input
                  type="text"
                  required
                  placeholder="Apellidos y Nombres"
                  value={newCase.collaboratorName}
                  onChange={(e) => setNewCase({ ...newCase, collaboratorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">DNI *</label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="8 dígitos"
                  value={newCase.collaboratorDni}
                  onChange={(e) => setNewCase({ ...newCase, collaboratorDni: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Examen</label>
                  <select
                    value={newCase.examType}
                    onChange={(e) => setNewCase({ ...newCase, examType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="PRE_OCCUPATIONAL">Ingreso</option>
                    <option value="PERIODIC">Periódico</option>
                    <option value="RETIREMENT">Retiro</option>
                    <option value="CHANGE_OF_POSITION">Reubicación</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Programada</label>
                  <input
                    type="date"
                    value={newCase.scheduledAt}
                    onChange={(e) => setNewCase({ ...newCase, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Clínica / IPRESS</label>
                <input
                  type="text"
                  value={newCase.clinic}
                  onChange={(e) => setNewCase({ ...newCase, clinic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-teal-500/20"
                >
                  Aperturar Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

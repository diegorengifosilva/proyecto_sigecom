import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Link } from "react-router-dom";
import {
  UserPlus,
  Users,
  Search,
  Plus,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Building,
  HeartPulse,
  ArrowRight,
  X
} from "lucide-react";
import { toast } from "react-toastify";

export default function RrhhReclutamiento() {
  const [processes, setProcesses] = useState([]);
  const [summary, setSummary] = useState({ byStatus: {}, overdue: 0 });
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [areas, setAreas] = useState([]);
  const [positions, setPositions] = useState([]);

  // Form nueva vacante
  const [newVacante, setNewVacante] = useState({
    title: "",
    areaId: "",
    positionId: "",
    vacancyCount: 1,
    employmentType: "Tiempo Completo",
    workLocation: "Oficina Central",
    targetHireDate: "",
    requestReason: ""
  });

  // Form nuevo postulante
  const [newCandidate, setNewCandidate] = useState({
    fullName: "",
    dni: "",
    email: "",
    phone: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, procRes, confRes] = await Promise.all([
        api.get("rrhh/recruitment/summary/"),
        api.get("rrhh/recruitment/processes/"),
        api.get("rrhh/configuration/")
      ]);
      setSummary(sumRes.data);
      setProcesses(procRes.data);
      setAreas(confRes.data.areas || []);
      setPositions(confRes.data.positions || []);
      if (procRes.data.length > 0 && !selectedProcess) {
        setSelectedProcess(procRes.data[0]);
      }
    } catch (err) {
      console.error("Error al cargar reclutamiento:", err);
      toast.error("No se pudo cargar el módulo de reclutamiento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProcess = async (e) => {
    e.preventDefault();
    if (!newVacante.title || !newVacante.areaId || !newVacante.positionId) {
      toast.warning("Título, área y cargo son obligatorios.");
      return;
    }
    try {
      const res = await api.post("rrhh/recruitment/processes/", newVacante);
      toast.success("Requisición de personal creada exitosamente.");
      setShowNewModal(false);
      fetchData();
      setSelectedProcess(res.data);
    } catch (err) {
      console.error("Error al crear proceso:", err);
      toast.error("Error al crear solicitud.");
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!selectedProcess) return;
    if (!newCandidate.fullName) {
      toast.warning("El nombre del candidato es obligatorio.");
      return;
    }
    try {
      await api.post(`rrhh/recruitment/processes/${selectedProcess.id}/candidates/`, newCandidate);
      toast.success("Postulante registrado en el proceso.");
      setNewCandidate({ fullName: "", dni: "", email: "", phone: "" });
      // Recargar proceso actual
      const updated = await api.get(`rrhh/recruitment/processes/${selectedProcess.id}/`);
      setSelectedProcess(updated.data);
      fetchData();
    } catch (err) {
      console.error("Error al registrar candidato:", err);
      toast.error("Error al registrar candidato.");
    }
  };

  const handleUpdateCandidateStage = async (candidateId, newStage) => {
    try {
      await api.patch(`rrhh/recruitment/candidates/${candidateId}/`, { status: newStage });
      toast.success("Etapa de selección actualizada.");
      if (selectedProcess) {
        const updated = await api.get(`rrhh/recruitment/processes/${selectedProcess.id}/`);
        setSelectedProcess(updated.data);
      }
    } catch (err) {
      console.error("Error al actualizar candidato:", err);
      toast.error("No se pudo actualizar el estado.");
    }
  };

  const handleUpdateEmoStatus = async (candidateId, emoStatus) => {
    try {
      await api.patch(`rrhh/recruitment/candidates/${candidateId}/emo/`, { status: emoStatus, result: emoStatus });
      toast.success("Aptitud médica ocupacional actualizada.");
      if (selectedProcess) {
        const updated = await api.get(`rrhh/recruitment/processes/${selectedProcess.id}/`);
        setSelectedProcess(updated.data);
      }
    } catch (err) {
      console.error("Error al actualizar EMO:", err);
      toast.error("No se pudo registrar la aptitud EMO.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <UserPlus className="w-4 h-4" />
            <span>Atracción y Selección del Talento</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reclutamiento y Contratación</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de requisiciones, embudo de candidatos, cartas oferta, validación EMO y alta laboral.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Solicitud de Vacante</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">Solicitudes Totales</span>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">{processes.length}</div>
            <span className="text-[11px] text-gray-400">Requisiciones registradas</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">En Proceso</span>
            <div className="text-2xl font-extrabold text-blue-600 mt-1">
              {(summary.byStatus?.REQUESTED || 0) + (summary.byStatus?.IN_PROGRESS || 0)}
            </div>
            <span className="text-[11px] text-blue-500">Evaluación activa</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">Altas Realizadas</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.byStatus?.HIRED || 0}</div>
            <span className="text-[11px] text-emerald-500">Contrataciones cerradas</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">Hitos Pendientes</span>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{summary.overdue || 0}</div>
            <span className="text-[11px] text-amber-500">Tareas por regularizar</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid de Reclutamiento: Lista de Procesos y Detalle Seleccionado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Expedientes de Requisición */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Expedientes de Requisición</h2>
            <span className="text-xs text-gray-500">{processes.length} activos</span>
          </div>

          <div className="divide-y divide-gray-100 overflow-y-auto max-h-[600px]">
            {processes.length > 0 ? (
              processes.map((proc) => {
                const isSelected = selectedProcess && selectedProcess.id === proc.id;
                return (
                  <button
                    key={proc.id}
                    onClick={() => setSelectedProcess(proc)}
                    className={`w-full p-4 text-left transition-all flex flex-col gap-1.5 ${
                      isSelected ? "bg-blue-50/60 border-l-4 border-blue-600" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-700">{proc.code}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          proc.status === "HIRED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {proc.status}
                      </span>
                    </div>
                    <div className="font-semibold text-sm text-gray-900">{proc.title}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{proc.area?.name || "Área"}</span>
                      <span>·</span>
                      <span>{proc.position?.name || "Cargo"}</span>
                      <span>·</span>
                      <span>{proc.candidates?.length || 0} candidatos</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-sm text-gray-400">
                {loading ? "Cargando solicitudes..." : "No hay solicitudes de vacantes registradas."}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Detalle del Proceso Seleccionado */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-6">
          {selectedProcess ? (
            <>
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
                    {selectedProcess.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedProcess.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-1">{selectedProcess.title}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Área: <strong className="text-gray-700">{selectedProcess.area?.name}</strong> · Cargo:{" "}
                  <strong className="text-gray-700">{selectedProcess.position?.name}</strong> · Vacantes:{" "}
                  <strong>{selectedProcess.vacancyCount}</strong>
                </p>
              </div>

              {/* Form Agregar Candidato */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/70 space-y-3">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  <span>Incorporar Postulante al Embudo</span>
                </h3>
                <form onSubmit={handleAddCandidate} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Apellidos y Nombres"
                    value={newCandidate.fullName}
                    onChange={(e) => setNewCandidate({ ...newCandidate, fullName: e.target.value })}
                    className="md:col-span-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="DNI"
                    value={newCandidate.dni}
                    onChange={(e) => setNewCandidate({ ...newCandidate, dni: e.target.value })}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    + Agregar
                  </button>
                </form>
              </div>

              {/* Listado de Candidatos en Embudo */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center justify-between">
                  <span>Candidatos Registrados</span>
                  <span className="text-xs text-gray-400 font-normal">
                    {selectedProcess.candidates?.length || 0} postulantes
                  </span>
                </h3>

                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {selectedProcess.candidates && selectedProcess.candidates.length > 0 ? (
                    selectedProcess.candidates.map((cand) => (
                      <div key={cand.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{cand.fullName}</h4>
                          <span className="text-xs text-gray-400 font-mono">
                            DNI: {cand.dni || "Pendiente"} · {cand.email || "Sin correo"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Selector Etapa */}
                          <select
                            value={cand.status}
                            onChange={(e) => handleUpdateCandidateStage(cand.id, e.target.value)}
                            className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700"
                          >
                            <option value="APPLICANT">Postulante</option>
                            <option value="INTERVIEW">Entrevista</option>
                            <option value="OFFER_SENT">Oferta Enviada</option>
                            <option value="SELECTED">Seleccionado</option>
                            <option value="REJECTED">No Seleccionado</option>
                          </select>

                          {/* Selector EMO */}
                          <select
                            value={cand.emoStatus || "PENDING"}
                            onChange={(e) => handleUpdateEmoStatus(cand.id, e.target.value)}
                            className={`px-2 py-1 border rounded-lg text-xs font-semibold ${
                              cand.emoStatus === "FIT"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : cand.emoStatus === "NOT_FIT"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            <option value="PENDING">EMO Pendiente</option>
                            <option value="SCHEDULED">EMO Programado</option>
                            <option value="FIT">EMO Apto</option>
                            <option value="FIT_WITH_RESTRICTIONS">Apto con Restricción</option>
                            <option value="NOT_FIT">No Apto</option>
                          </select>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-400">
                      No hay candidatos asignados a esta vacante aún.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <Briefcase className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-semibold">Seleccione un expediente de requisición</p>
              <p className="text-xs">Visualice el embudo de contratación y seguimiento EMO</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Requisición */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Nueva Solicitud de Personal (RH.FOR.006)</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProcess} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título de la Vacante *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Técnico Electricista de Planta"
                  value={newVacante.title}
                  onChange={(e) => setNewVacante({ ...newVacante, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Área Solicitante *</label>
                  <select
                    required
                    value={newVacante.areaId}
                    onChange={(e) => setNewVacante({ ...newVacante, areaId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Seleccione área</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cargo a Cubrir *</label>
                  <select
                    required
                    value={newVacante.positionId}
                    onChange={(e) => setNewVacante({ ...newVacante, positionId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Seleccione cargo</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Número de Vacantes</label>
                  <input
                    type="number"
                    min={1}
                    value={newVacante.vacancyCount}
                    onChange={(e) => setNewVacante({ ...newVacante, vacancyCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Objetivo Ingreso</label>
                  <input
                    type="date"
                    value={newVacante.targetHireDate}
                    onChange={(e) => setNewVacante({ ...newVacante, targetHireDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo de la Requisición</label>
                <textarea
                  rows={2}
                  value={newVacante.requestReason}
                  onChange={(e) => setNewVacante({ ...newVacante, requestReason: e.target.value })}
                  placeholder="Incremento de actividad, reemplazo por renuncia, nuevo proyecto..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/20"
                >
                  Registrar Requisición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

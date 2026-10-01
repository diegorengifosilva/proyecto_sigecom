import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  Users,
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  HeartPulse,
  Trash2
} from "lucide-react";
import { toast } from "react-toastify";

const BRIGADE_TYPES = {
  FIRST_AID: "Primeros Auxilios",
  FIRE: "Lucha Contra Incendios",
  EVACUATION: "Evacuación y Rescate",
  HAZMAT: "Materiales Peligrosos (HAZMAT)",
  EMERGENCY: "Brigada de Emergencia General"
};

export default function EmergenciasConformacion() {
  const [members, setMembers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBrigade, setSelectedBrigade] = useState("ALL");

  const [newMember, setNewMember] = useState({
    employeeId: "",
    brigadeType: "FIRST_AID",
    role: "BRIGADISTA",
    notes: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [memRes, candRes] = await Promise.all([
        api.get("emergencias/members/"),
        api.get("emergencias/candidates/")
      ]);
      setMembers(memRes.data || []);
      setCandidates(candRes.data || []);
    } catch (err) {
      console.error("Error al cargar brigadistas:", err);
      toast.error("No se pudo cargar la conformación de brigadas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.employeeId) {
      toast.warning("Debe seleccionar un colaborador.");
      return;
    }
    try {
      await api.post("emergencias/members/", newMember);
      toast.success("Brigadista incorporado a la brigada.");
      setShowAddModal(false);
      setNewMember({ employeeId: "", brigadeType: "FIRST_AID", role: "BRIGADISTA", notes: "" });
      fetchData();
    } catch (err) {
      console.error("Error al agregar brigadista:", err);
      toast.error(err.response?.data?.error || "Error al registrar brigadista.");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("¿Está seguro de retirar al brigadista de la brigada?")) return;
    try {
      await api.delete(`emergencias/members/${memberId}/`);
      toast.success("Brigadista retirado.");
      fetchData();
    } catch (err) {
      console.error("Error al retirar brigadista:", err);
      toast.error("No se pudo retirar.");
    }
  };

  const filteredMembers = members.filter(
    (m) => selectedBrigade === "ALL" || m.brigadeType === selectedBrigade
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <Users className="w-4 h-4" />
            <span>Padrón de Brigadistas</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Conformación de Brigadas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registro, asignación de roles (Jefe, Líder, Brigadista) y organización por brigadas especializadas.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-rose-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Incorporar Brigadista</span>
        </button>
      </div>

      {/* Filtros por Brigada */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedBrigade("ALL")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedBrigade === "ALL"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Todas las Brigadas ({members.length})
        </button>
        {Object.entries(BRIGADE_TYPES).map(([key, label]) => {
          const count = members.filter((m) => m.brigadeType === key).length;
          return (
            <button
              key={key}
              onClick={() => setSelectedBrigade(key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedBrigade === key
                  ? "bg-rose-600 text-white shadow-sm shadow-rose-500/20"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid de Brigadistas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-sm text-gray-400">
            Cargando brigadistas...
          </div>
        ) : filteredMembers.length > 0 ? (
          filteredMembers.map((m) => (
            <div
              key={m.id}
              className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[11px]">
                    {BRIGADE_TYPES[m.brigadeType] || m.brigadeType}
                  </span>
                  <span
                    className={`font-semibold text-[11px] px-2 py-0.5 rounded-full ${
                      m.role === "CHIEF"
                        ? "bg-purple-50 text-purple-700"
                        : m.role === "LEADER"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {m.role === "CHIEF" ? "Jefe de Brigada" : m.role === "LEADER" ? "Líder" : "Brigadista"}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-base">{m.employee?.fullName}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  DNI: <span className="font-mono">{m.employee?.dni}</span> · {m.employee?.area?.name || "Sin área"}
                </p>
                {m.notes && <p className="text-xs text-gray-400 mt-2 italic">"{m.notes}"</p>}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    m.eligibility?.eligible ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {m.eligibility?.eligible ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Apto Operativo</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Observado</span>
                    </>
                  )}
                </span>
                <button
                  onClick={() => handleRemoveMember(m.id)}
                  className="text-gray-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                  title="Retirar de brigada"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-gray-200/80 text-center text-sm text-gray-400">
            No hay brigadistas registrados en esta categoría.
          </div>
        )}
      </div>

      {/* Modal Incorporar Brigadista */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900">Incorporar Colaborador a Brigada</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Colaborador Candidato *</label>
                <select
                  required
                  value={newMember.employeeId}
                  onChange={(e) => setNewMember({ ...newMember, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="">Seleccione colaborador</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.dni}) · {c.area?.name || "Sin área"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Brigada Asignada *</label>
                <select
                  value={newMember.brigadeType}
                  onChange={(e) => setNewMember({ ...newMember, brigadeType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  {Object.entries(BRIGADE_TYPES).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rol Operativo *</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="BRIGADISTA">Brigadista</option>
                  <option value="LEADER">Líder de Brigada</option>
                  <option value="CHIEF">Jefe de Brigada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  placeholder="Ej. Cuenta con certificación externa de paramédico"
                  value={newMember.notes}
                  onChange={(e) => setNewMember({ ...newMember, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
                  Incorporar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

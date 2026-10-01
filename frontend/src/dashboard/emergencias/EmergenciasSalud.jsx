import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Search,
  FileCheck2,
  ShieldAlert
} from "lucide-react";
import { toast } from "react-toastify";

export default function EmergenciasSalud() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await api.get("emergencias/members/");
      setMembers(res.data || []);
    } catch (err) {
      console.error("Error al cargar aptitud médica:", err);
      toast.error("No se pudo cargar la información médica.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filtered = members.filter((m) =>
    search ? m.employee?.fullName?.toLowerCase().includes(search.toLowerCase()) || m.employee?.dni?.includes(search) : true
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <HeartPulse className="w-4 h-4" />
            <span>Vigilancia Médica de Brigadistas</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Aptitud Médica para Brigadistas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Validación cruzada con Salud Ocupacional (EMO): certifica si el colaborador está físicamente apto para labores de rescate.
          </p>
        </div>
      </div>

      {/* Tabla de Aptitud */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Brigadista</th>
              <th className="py-3 px-4">DNI</th>
              <th className="py-3 px-4">Brigada / Rol</th>
              <th className="py-3 px-4">Vigencia EMO</th>
              <th className="py-3 px-4">Aptitud Rescate</th>
              <th className="py-3 px-4 text-right">Constancia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                  Cargando estado médico...
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-semibold text-gray-900">{m.employee?.fullName}</td>
                  <td className="py-3.5 px-4 font-mono text-xs">{m.employee?.dni}</td>
                  <td className="py-3.5 px-4 text-xs">{m.brigadeType} · {m.role}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-600">
                    {m.medicalFitness?.emoExpiresAt
                      ? new Date(m.medicalFitness.emoExpiresAt).toLocaleDateString("es-PE")
                      : "Vigente"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        m.eligibility?.medicalValid
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {m.eligibility?.medicalValid ? "Apto Físico" : "Por Validar"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => toast.success(`Constancia de suficiencia emitida para ${m.employee?.fullName}`)}
                      className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold"
                    >
                      Ver Certificado
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                  No hay brigadistas registrados para validar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

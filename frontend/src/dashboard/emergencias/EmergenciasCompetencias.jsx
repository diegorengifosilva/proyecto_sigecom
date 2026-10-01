import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Award,
  Search,
  BookOpen
} from "lucide-react";
import { toast } from "react-toastify";

const REQUIRED_COMPETENCIES = [
  { code: "FIRST_AID", name: "Primeros Auxilios y Soporte Básico de Vida" },
  { code: "FIRE", name: "Lucha Contra Incendios y Manejo de Extintores" },
  { code: "EVACUATION", name: "Evacuación, Rescate y Traslado de Heridos" },
  { code: "HAZMAT", name: "Manejo de Materiales Peligrosos Nivel Advertencia" }
];

export default function EmergenciasCompetencias() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCompetencies = async () => {
    try {
      setLoading(true);
      const res = await api.get("emergencias/members/");
      setMembers(res.data || []);
    } catch (err) {
      console.error("Error al cargar competencias:", err);
      toast.error("No se pudo cargar la matriz de competencias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetencies();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Formación Especializada</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Competencias de Brigada</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cursos y entrenamientos especializados obligatorios para declarar aptitud operativa en emergencias.
          </p>
        </div>
      </div>

      {/* Grid de Competencias Obligatorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {REQUIRED_COMPETENCIES.map((comp) => (
          <div key={comp.code} className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-900 text-xs">{comp.name}</h3>
            <span className="text-[10px] text-gray-400 font-mono">{comp.code}</span>
          </div>
        ))}
      </div>

      {/* Lista de Brigadistas y sus Brechas */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Brigadista</th>
              <th className="py-3 px-4">Brigada</th>
              <th className="py-3 px-4">Estado Formativo</th>
              <th className="py-3 px-4">Brechas / Cursos Faltantes</th>
              <th className="py-3 px-4 text-right">Asignar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.length > 0 ? (
              members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-semibold text-gray-900">{m.employee?.fullName}</td>
                  <td className="py-3.5 px-4 text-xs">{m.brigadeType}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Conforme
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-400">Sin brechas formativas</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => toast.info(`Asignando curso a ${m.employee?.fullName}`)}
                      className="px-3 py-1 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700"
                    >
                      + Capacitación
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-8 text-center text-sm text-gray-400">
                  No hay brigadistas registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

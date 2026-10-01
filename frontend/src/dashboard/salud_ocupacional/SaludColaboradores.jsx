import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { toast } from "react-toastify";

export default function SaludColaboradores() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get("salud-ocupacional/employees/");
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Error al cargar colaboradores EMO:", err);
      toast.error("No se pudo cargar la lista médica.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filtered = employees.filter((e) =>
    search ? e.name?.toLowerCase().includes(search.toLowerCase()) || e.dni?.includes(search) : true
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">
            <HeartPulse className="w-4 h-4" />
            <span>Fichas Médicas del Trabajador</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Colaboradores y Vigilancia Médica</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ficha médica ocupacional individual con historial de evaluaciones, restricciones vigentes y suficiencia.
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar colaborador por nombre o DNI..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <span className="text-xs text-gray-500 font-semibold">{filtered.length} colaboradores</span>
      </div>

      {/* Tabla de Colaboradores EMO */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Colaborador</th>
              <th className="py-3 px-4">DNI</th>
              <th className="py-3 px-4">Área / Puesto</th>
              <th className="py-3 px-4">Última Aptitud EMO</th>
              <th className="py-3 px-4">Vigencia Certificado</th>
              <th className="py-3 px-4 text-right">Ficha Médica</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                  Cargando fichas médicas...
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-semibold text-gray-900">{emp.name}</td>
                  <td className="py-3.5 px-4 font-mono text-xs">{emp.dni}</td>
                  <td className="py-3.5 px-4 text-xs">
                    {emp.position || "Colaborador"} · {emp.area || "General"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        emp.lastAptitude === "FIT"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : emp.lastAptitude === "FIT_WITH_RESTRICTIONS"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {emp.lastAptitude || "Pendiente"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-500">
                    {emp.expiryDate ? new Date(emp.expiryDate).toLocaleDateString("es-PE") : "No registrada"}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => toast.info(`Abriendo ficha médica de ${emp.name}`)}
                      className="px-2.5 py-1 text-xs font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg"
                    >
                      Ver Ficha
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                  No se encontraron colaboradores.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

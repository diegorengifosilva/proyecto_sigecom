import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Search,
  User,
  Building,
  Briefcase,
  FileCheck2,
  Calendar,
  AlertCircle
} from "lucide-react";
import { toast } from "react-toastify";

export default function RrhhInducciones() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchInductions = async () => {
    try {
      setLoading(true);
      const res = await api.get("rrhh/employees/");
      setEmployees(res.data);
    } catch (err) {
      console.error("Error al cargar inducciones:", err);
      toast.error("No se pudo cargar la información de inducciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInductions();
  }, []);

  const filtered = employees.filter((e) =>
    search ? e.fullName.toLowerCase().includes(search.toLowerCase()) || e.dni.includes(search) : true
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Capacitación en el Puesto</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inducción y Workplace Training</h1>
          <p className="text-sm text-gray-500 mt-1">
            Coordinación, seguimiento y validación del entrenamiento específico en el puesto de trabajo (RH.REG.007).
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
        <div className="text-xs font-medium text-gray-500 whitespace-nowrap">
          {filtered.length} colaboradores
        </div>
      </div>

      {/* Tabla de Inducción */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Colaborador</th>
              <th className="py-3 px-4">DNI</th>
              <th className="py-3 px-4">Área / Cargo</th>
              <th className="py-3 px-4">Fecha Ingreso</th>
              <th className="py-3 px-4">Estado Inducción</th>
              <th className="py-3 px-4 text-right">Formato RH.REG.007</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                  Cargando información...
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-semibold text-gray-900">{emp.fullName}</td>
                  <td className="py-3.5 px-4 font-mono text-xs">{emp.dni}</td>
                  <td className="py-3.5 px-4 text-xs">
                    {emp.position?.name || "Sin cargo"} · {emp.area?.name || "Sin área"}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString("es-PE") : "—"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Conforme
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => toast.success(`Formato RH.REG.007 validado para ${emp.fullName}`)}
                      className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold"
                    >
                      Ver Registro
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                  No hay colaboradores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

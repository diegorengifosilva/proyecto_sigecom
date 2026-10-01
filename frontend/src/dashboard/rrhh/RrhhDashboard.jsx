import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Link } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserX,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  FileText,
  Building,
  RefreshCw,
  Search,
  Plus
} from "lucide-react";
import { toast } from "react-toastify";

export default function RrhhDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    active: 0,
    inactive: 0,
    areas: 0,
    positions: 0,
    recent: []
  });

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get("rrhh/summary/");
      setSummary(res.data);
    } catch (err) {
      console.error("Error al cargar resumen RRHH:", err);
      toast.error("No se pudo cargar el resumen de Recursos Humanos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const totalEmployees = (summary.active || 0) + (summary.inactive || 0);
  const retentionRate = totalEmployees > 0 ? Math.round(((summary.active || 0) / totalEmployees) * 100) : 100;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Users className="w-4 h-4" />
            <span>Gestión del Talento Humano</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Dashboard de Recursos Humanos
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              Activo
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Métricas de plantilla, movimientos de personal, reclutamiento y legajos laborales centralizados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSummary}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="Recargar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <Link
            to="/rrhh/colaboradores"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Ver Colaboradores</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Plantilla Activa</span>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">{summary.active || 0}</div>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-1">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Colaboradores vigentes</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Histórico Ceses</span>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">{summary.inactive || 0}</div>
            <span className="text-xs font-medium text-gray-400 flex items-center gap-1 mt-1">
              <UserX className="w-3.5 h-3.5" />
              <span>Bajas archivadas</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <UserX className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Áreas de Trabajo</span>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">{summary.areas || 0}</div>
            <span className="text-xs font-medium text-blue-600 flex items-center gap-1 mt-1">
              <Building className="w-3.5 h-3.5" />
              <span>Estructura orgánica</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cargos / Puestos</span>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">{summary.positions || 0}</div>
            <span className="text-xs font-medium text-purple-600 flex items-center gap-1 mt-1">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Catálogo y MOF</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Accesos directos a submódulos */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Link
          to="/rrhh/reclutamiento"
          className="bg-white p-4 rounded-xl border border-gray-200/80 hover:border-blue-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center mb-2">
            <UserCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800">Reclutamiento</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Vacantes y CVs</span>
        </Link>

        <Link
          to="/rrhh/inducciones"
          className="bg-white p-4 rounded-xl border border-gray-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800">Inducción</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Workplace Training</span>
        </Link>

        <Link
          to="/rrhh/boletines"
          className="bg-white p-4 rounded-xl border border-gray-200/80 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center mb-2">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800">Boletines</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Comunicados</span>
        </Link>

        <Link
          to="/rrhh/estructura"
          className="bg-white p-4 rounded-xl border border-gray-200/80 hover:border-purple-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center justify-center mb-2">
            <Layers className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800">Estructura</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Áreas y MOF</span>
        </Link>

        <Link
          to="/rrhh/emos"
          className="bg-white p-4 rounded-xl border border-gray-200/80 hover:border-rose-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors flex items-center justify-center mb-2">
            <Briefcase className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800">Clínicas EMO</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Exámenes médicos</span>
        </Link>

        <Link
          to="/rrhh/mi-informacion"
          className="bg-white p-4 rounded-xl border border-gray-200/80 hover:border-amber-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center mb-2">
            <UserCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800">Mi Información</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Portal personal</span>
        </Link>
      </div>

      {/* Tabla de Movimientos Recientes */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Últimos Colaboradores Registrados</h2>
            <p className="text-xs text-gray-400 mt-0.5">Registros incorporados al maestro de personal de la empresa</p>
          </div>
          <Link
            to="/rrhh/colaboradores"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Ver padrón completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">DNI</th>
                <th className="py-3 px-4">Área</th>
                <th className="py-3 px-4">Puesto / Cargo</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Legajo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.recent && summary.recent.length > 0 ? (
                summary.recent.map((emp) => (
                  <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      <Link to={`/rrhh/colaboradores/${emp.id}`} className="hover:text-blue-600">
                        {emp.fullName}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono">{emp.dni}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">{emp.area?.name || "Sin área"}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">{emp.position?.name || "Sin puesto"}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {emp.status === "ACTIVE" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/rrhh/colaboradores/${emp.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        <span>Abrir</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                    {loading ? "Cargando colaboradores..." : "No se registraron colaboradores recientemente."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

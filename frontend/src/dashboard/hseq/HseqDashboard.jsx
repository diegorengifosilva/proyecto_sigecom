import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Link } from "react-router-dom";
import {
  Users,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ClockAlert,
  BellRing,
  Download,
  GraduationCap,
  Layers,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";

export default function HseqDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get("hseq/dashboard/summary/");
      setData(res.data);
    } catch (err) {
      console.error("Error al cargar resumen HSEQ:", err);
      toast.error("No se pudo cargar el resumen del Dashboard HSEQ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const summary = data || {
    activeEmployees: 0,
    trainingsPlanned: 0,
    pendingAssignments: 0,
    approvalRate: 0,
    applicableAssignments: 0,
    approvedAssignments: 0,
    generalTarget: 80,
    year: new Date().getFullYear(),
    failedAssignments: 0,
    overdueAssignments: 0,
    byPillar: [],
    completionByArea: [],
    employeesAtRisk: [],
    tarSummary: { alerts: 0, critical: 0, expired: 0 },
  };

  const byPillar = Array.isArray(summary.byPillar) ? summary.byPillar : [];
  const completionByArea = Array.isArray(summary.completionByArea) ? summary.completionByArea : [];
  const employeesAtRisk = Array.isArray(summary.employeesAtRisk) ? summary.employeesAtRisk : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Seguridad, Salud en el Trabajo y Medio Ambiente</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Dashboard HSEQ
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              Programa {summary.year}
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Seguimiento de capacitaciones, horas de formación, cumplimiento por pilar y certificaciones críticas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/hseq/certificaciones-tar"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
              summary.tarSummary.expired > 0
                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                : summary.tarSummary.critical > 0
                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            }`}
            title="Certificaciones de Alto Riesgo"
          >
            <BellRing className="w-4 h-4" />
            <span>Alerta TAR:</span>
            <strong className="font-bold">{summary.tarSummary.alerts}</strong>
          </Link>

          <button
            onClick={fetchSummary}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Personal Activo */}
        <Link
          to="/hseq/colaboradores"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Personal Activo</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "..." : summary.activeEmployees}</div>
          <p className="text-xs text-gray-400 mt-1">Población objetivo HSEQ</p>
        </Link>

        {/* Cursos Planificados */}
        <Link
          to="/hseq/programa"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Capacitaciones</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "..." : summary.trainingsPlanned}</div>
          <p className="text-xs text-gray-400 mt-1">En programa anual</p>
        </Link>

        {/* Pendientes */}
        <Link
          to="/hseq/seguimiento"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Pendientes</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600">{loading ? "..." : summary.pendingAssignments}</div>
          <p className="text-xs text-gray-400 mt-1">En plazo de evaluación</p>
        </Link>

        {/* Cumplimiento General */}
        <Link
          to="/hseq/seguimiento"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Cumplimiento</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{loading ? "..." : `${summary.approvalRate}%`}</div>
          <p className="text-xs text-gray-400 mt-1">Meta corporativa: {summary.generalTarget}%</p>
        </Link>

        {/* Desaprobados */}
        <Link
          to="/hseq/seguimiento"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Desaprobados</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-110 transition-transform">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">{loading ? "..." : summary.failedAssignments}</div>
          <p className="text-xs text-gray-400 mt-1">Requieren regularización</p>
        </Link>

        {/* Vencidos */}
        <Link
          to="/hseq/seguimiento"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Vencidos</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
              <ClockAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-700">{loading ? "..." : summary.overdueAssignments}</div>
          <p className="text-xs text-gray-400 mt-1">Fuera de plazo límite</p>
        </Link>
      </div>

      {/* Grid Central: Avance por Pilar y Cumplimiento por Área */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avance por Pilar */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-gray-900">Avance por Pilar HSEQ</h2>
              </div>
              <span className="text-xs text-gray-400 font-medium">Corte en tiempo real</span>
            </div>

            {byPillar.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No hay datos de asignaciones en los pilares.</p>
            ) : (
              <div className="space-y-4">
                {byPillar.map((p) => {
                  const target = summary.generalTarget || 80;
                  const achieved = p.approvalRate >= target;
                  return (
                    <div key={p.code} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-gray-800 font-semibold">{p.name}</span>
                        <span className={achieved ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                          {p.approvalRate}% ({p.approved}/{p.applicable})
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            achieved ? "bg-emerald-500" : p.approvalRate > 50 ? "bg-indigo-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(p.approvalRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Meta general: <strong>{summary.generalTarget}%</strong></span>
            <Link to="/hseq/programa" className="text-indigo-600 hover:text-indigo-800 font-semibold">
              Ver Programa Anual →
            </Link>
          </div>
        </div>

        {/* Cumplimiento por Área */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-gray-900">Cumplimiento por Área</h2>
              </div>
              <span className="text-xs text-gray-400 font-medium">Colaboradores activos</span>
            </div>

            {completionByArea.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No hay asignaciones registradas por área.</p>
            ) : (
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2">
                {completionByArea.map((area) => (
                  <div key={area.name} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-medium truncate max-w-[200px]" title={area.name}>
                      {area.name}
                    </span>
                    <div className="flex items-center gap-3 w-48">
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(area.completionRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-800 font-bold w-12 text-right">
                        {area.completionRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Evaluado sobre asignaciones efectivas</span>
            <Link to="/hseq/seguimiento" className="text-emerald-600 hover:text-emerald-800 font-semibold">
              Ver Matriz Completa →
            </Link>
          </div>
        </div>
      </div>

      {/* Tabla Inferior: Colaboradores con Atención Inmediata */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold text-gray-900">Colaboradores con Observaciones o Riesgo</h2>
          </div>
          <span className="text-xs text-gray-400">Atención prioritaria del equipo HSEQ</span>
        </div>

        {employeesAtRisk.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No hay colaboradores con cursos vencidos o desaprobados en este momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4">Colaborador</th>
                  <th className="py-2.5 px-4">Área</th>
                  <th className="py-2.5 px-4 text-center">Desaprobados</th>
                  <th className="py-2.5 px-4 text-center">Total Observados</th>
                  <th className="py-2.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employeesAtRisk.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-900">{row.fullName}</td>
                    <td className="py-3 px-4 text-gray-600">{row.area}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                        {row.failed}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                        {row.criticalCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/hseq/colaboradores/${row.employeeId}`}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Ver Legajo →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

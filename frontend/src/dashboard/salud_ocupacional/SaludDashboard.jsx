import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Link } from "react-router-dom";
import {
  HeartPulse,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  Users,
  ShieldCheck,
  FileText,
  Activity,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { toast } from "react-toastify";

export default function SaludDashboard() {
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    fit: 0,
    fitWithRestrictions: 0,
    unfit: 0,
    observed: 0,
    expiringSoon: 0,
    overdue: 0,
    recentCases: []
  });
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get("salud-ocupacional/summary/");
      setSummary(res.data);
    } catch (err) {
      console.error("Error al cargar resumen médico:", err);
      toast.error("No se pudo cargar el panel de salud ocupacional.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Medicina Ocupacional y Vigilancia</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Panel General de Salud Ocupacional
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium">
              Confidencial
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vigilancia epidemiológica, aptitudes médicas, vencimiento de certificados EMO y control de restricciones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSummary}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <Link
            to="/salud-ocupacional/expedientes"
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-teal-500/20 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Ver Expedientes EMO</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards: Semáforo de Aptitud Médica */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Aptos</span>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1">{summary.fit || 0}</div>
            <span className="text-[11px] text-emerald-500 font-medium">Sin restricciones</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Con Restricción</span>
            <div className="text-3xl font-extrabold text-amber-600 mt-1">{summary.fitWithRestrictions || 0}</div>
            <span className="text-[11px] text-amber-500 font-medium">Labores adaptadas</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">No Aptos</span>
            <div className="text-3xl font-extrabold text-rose-600 mt-1">{summary.unfit || 0}</div>
            <span className="text-[11px] text-rose-500 font-medium">Inhabilitados</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Por Vencer (30d)</span>
            <div className="text-3xl font-extrabold text-blue-600 mt-1">{summary.expiringSoon || 0}</div>
            <span className="text-[11px] text-blue-500 font-medium">Programar renovación</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vencidos / Cesados</span>
            <div className="text-3xl font-extrabold text-gray-600 mt-1">{summary.overdue || 0}</div>
            <span className="text-[11px] text-gray-400 font-medium">EMO no vigente</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
            <HeartPulse className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Accesos directos a submódulos de Salud Ocupacional */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Link
          to="/salud-ocupacional/expedientes"
          className="bg-white p-3.5 rounded-xl border border-gray-200/80 hover:border-teal-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center mb-1.5">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-800">Expedientes</span>
        </Link>

        <Link
          to="/salud-ocupacional/colaboradores"
          className="bg-white p-3.5 rounded-xl border border-gray-200/80 hover:border-teal-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center mb-1.5">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-800">Colaboradores</span>
        </Link>

        <Link
          to="/salud-ocupacional/agenda"
          className="bg-white p-3.5 rounded-xl border border-gray-200/80 hover:border-teal-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center mb-1.5">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-800">Agenda y Citas</span>
        </Link>

        <Link
          to="/salud-ocupacional/vigencias"
          className="bg-white p-3.5 rounded-xl border border-gray-200/80 hover:border-teal-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center mb-1.5">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-800">Vigencias EMO</span>
        </Link>

        <Link
          to="/salud-ocupacional/habilitaciones"
          className="bg-white p-3.5 rounded-xl border border-gray-200/80 hover:border-teal-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center mb-1.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-800">Habilitaciones</span>
        </Link>

        <Link
          to="/salud-ocupacional/vida-saludable"
          className="bg-white p-3.5 rounded-xl border border-gray-200/80 hover:border-teal-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center mb-1.5">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-800">Vida Saludable</span>
        </Link>

        <Link
          to="/salud-ocupacional/drive-sync"
          className="bg-white p-3.5 rounded-xl border border-gray-200/80 hover:border-teal-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center mb-1.5">
            <RefreshCw className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-800">Sync Drive</span>
        </Link>
      </div>

      {/* Expedientes EMO Recientes */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Últimos Expedientes EMO Evaluados</h2>
            <p className="text-xs text-gray-400 mt-0.5">Dictámenes médicos ocupacionales emitidos</p>
          </div>
          <Link
            to="/salud-ocupacional/expedientes"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <span>Ver todos los expedientes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Código</th>
              <th className="py-3 px-4">Colaborador</th>
              <th className="py-3 px-4">Tipo Examen</th>
              <th className="py-3 px-4">Clínica</th>
              <th className="py-3 px-4">Resultado Aptitud</th>
              <th className="py-3 px-4 text-right">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.recentCases && summary.recentCases.length > 0 ? (
              summary.recentCases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-teal-700">{c.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-900">{c.collaboratorName}</td>
                  <td className="py-3.5 px-4 text-xs">{c.examType}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-500">{c.clinic || "San Pablo"}</td>
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
                      {c.aptitudeResult || "En Proceso"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/salud-ocupacional/expedientes/${c.id}`}
                      className="px-2.5 py-1 text-xs font-semibold text-teal-600 hover:bg-teal-50 rounded-lg"
                    >
                      Ver Ficha
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                  {loading ? "Cargando expedientes..." : "No hay expedientes médicos registrados recientemente."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

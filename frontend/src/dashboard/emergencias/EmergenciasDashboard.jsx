import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Link } from "react-router-dom";
import {
  Siren,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  CalendarDays,
  FileCheck2,
  PackageCheck,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Users
} from "lucide-react";
import { toast } from "react-toastify";

export default function EmergenciasDashboard() {
  const [overview, setOverview] = useState({
    total: 0,
    eligible: 0,
    employmentAlerts: 0,
    medicalAlerts: 0,
    competencyAlerts: 0,
    pendingReports: 0,
    openActions: 0,
    nextActivities: []
  });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const [overRes, memRes] = await Promise.all([
        api.get("emergencias/overview/"),
        api.get("emergencias/members/")
      ]);
      setOverview(overRes.data);
      setMembers(memRes.data || []);
    } catch (err) {
      console.error("Error al cargar resumen de emergencias:", err);
      toast.error("No se pudo cargar el resumen de emergencias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <Siren className="w-4 h-4" />
            <span>Preparación y Respuesta Operativa</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Gestión de Emergencias y Brigadas
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
              V&C Response
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Conformación de brigadas de rescate, simulacros anuales, aptitud médica cruzada y control de equipos contra incendios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOverview}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <Link
            to="/emergencias/conformacion"
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-rose-500/20 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Padrón de Brigadistas</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Brigadistas Registrados</span>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">{overview.total || members.length}</div>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{overview.eligible || 0} aptos operativamente</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Alertas Médicas EMO</span>
            <div className="text-3xl font-extrabold text-amber-600 mt-1">{overview.medicalAlerts || 0}</div>
            <span className="text-xs font-medium text-amber-500 flex items-center gap-1 mt-1">
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Por validar con Salud Ocup.</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <HeartPulse className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Informes Pendientes</span>
            <div className="text-3xl font-extrabold text-blue-600 mt-1">{overview.pendingReports || 0}</div>
            <span className="text-xs font-medium text-blue-500 flex items-center gap-1 mt-1">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Plazo: 3 días hábiles</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones Abiertas</span>
            <div className="text-3xl font-extrabold text-purple-600 mt-1">{overview.openActions || 0}</div>
            <span className="text-xs font-medium text-purple-500 flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Planes correctivos</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Accesos directos a submódulos de Emergencia */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Link
          to="/emergencias/conformacion"
          className="bg-white p-4 rounded-xl border border-gray-200/80 hover:border-rose-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors flex items-center justify-center mb-2">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800">Conformación</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Brigadas y roles</span>
        </Link>

        <Link
          to="/emergencias/salud"
          className="bg-white p-4 rounded-xl border border-gray-200/80 hover:border-rose-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center mb-2">
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800">Aptitud Médica</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Cruce EMO</span>
        </Link>

        <Link
          to="/emergencias/programa"
          className="bg-white p-4 rounded-xl border border-gray-200/80 hover:border-rose-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center mb-2">
            <CalendarDays className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800">Simulacros</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Programa anual</span>
        </Link>

        <Link
          to="/emergencias/equipos"
          className="bg-white p-4 rounded-xl border border-gray-200/80 hover:border-rose-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center justify-center mb-2">
            <PackageCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800">Equipos</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Extintores y botiquines</span>
        </Link>

        <Link
          to="/emergencias/acciones"
          className="bg-white p-4 rounded-xl border border-gray-200/80 hover:border-rose-300 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-800">Planes de Acción</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Mejora continua</span>
        </Link>
      </div>

      {/* Flujo de Respuesta Ante Emergencias */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900">Protocolo de Activación y Respuesta Corporativa</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-100">
            <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center mb-2">1</span>
            <strong className="block font-bold text-gray-900 text-sm">Evento o Alarma</strong>
            <p className="text-gray-500 mt-1">Detección de amago, sismo, evacuación o accidente laboral.</p>
          </div>
          <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-100">
            <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center mb-2">2</span>
            <strong className="block font-bold text-gray-900 text-sm">Respuesta de Brigada</strong>
            <p className="text-gray-500 mt-1">Despliegue operativo inmediato del jefe y líderes designados.</p>
          </div>
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mb-2">3</span>
            <strong className="block font-bold text-gray-900 text-sm">Informe de Evento</strong>
            <p className="text-gray-500 mt-1">Elaboración obligatoria en plazo máximo de 3 días hábiles.</p>
          </div>
          <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center mb-2">4</span>
            <strong className="block font-bold text-gray-900 text-sm">Aprobación HSEQ</strong>
            <p className="text-gray-500 mt-1">Revisión, firma y emisión oficial de lecciones aprendidas.</p>
          </div>
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center mb-2">5</span>
            <strong className="block font-bold text-gray-900 text-sm">Plan de Acción</strong>
            <p className="text-gray-500 mt-1">Levantamiento de observaciones y seguimiento de cierre.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

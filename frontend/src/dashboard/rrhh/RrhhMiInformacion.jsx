import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  UserRound,
  Mail,
  Phone,
  Calendar,
  Building,
  Briefcase,
  FileText,
  GraduationCap,
  Download,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Clock
} from "lucide-react";
import { toast } from "react-toastify";

export default function RrhhMiInformacion() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMyInfo = async () => {
    try {
      setLoading(true);
      const res = await api.get("rrhh/me/");
      setData(res.data);
    } catch (err) {
      console.error("Error al cargar mi información:", err);
      toast.error("No se pudo cargar la información del perfil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInfo();
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500">Cargando su información personal...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-amber-900">Perfil no vinculado</h2>
          <p className="text-xs text-amber-700">
            Su usuario no se encuentra vinculado al maestro de colaboradores de Recursos Humanos. Comuníquese con RR. HH.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
            {data.fullName ? data.fullName.charAt(0) : "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{data.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {data.status === "ACTIVE" ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {data.position?.name || "Puesto no asignado"} · {data.area?.name || "Área general"}
            </p>
          </div>
        </div>
      </div>

      {/* Datos Personales */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-blue-600 flex items-center gap-2">
          <UserRound className="w-4 h-4" />
          <span>Ficha de Identificación del Colaborador</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] font-medium text-gray-400 block uppercase">DNI / Documento</span>
            <span className="font-semibold font-mono text-gray-900">{data.dni}</span>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] font-medium text-gray-400 block uppercase">Correo Corporativo</span>
            <span className="font-semibold text-gray-900 truncate block">{data.email || "—"}</span>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] font-medium text-gray-400 block uppercase">Fecha de Ingreso</span>
            <span className="font-semibold text-gray-900">
              {data.hireDate ? new Date(data.hireDate).toLocaleDateString("es-PE") : "—"}
            </span>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] font-medium text-gray-400 block uppercase">Teléfono Personal</span>
            <span className="font-semibold text-gray-900">{data.personalPhone || "—"}</span>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] font-medium text-gray-400 block uppercase">Correo Personal</span>
            <span className="font-semibold text-gray-900 truncate block">{data.personalEmail || "—"}</span>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
            <span className="text-[11px] font-medium text-gray-400 block uppercase">Fecha de Nacimiento</span>
            <span className="font-semibold text-gray-900">
              {data.birthDate ? new Date(data.birthDate).toLocaleDateString("es-PE") : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Cursos y Capacitaciones Asignadas */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-blue-600 flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          <span>Mis Capacitaciones y Cursos Asignados</span>
        </h2>

        <div className="divide-y divide-gray-100">
          {data.assignments && data.assignments.length > 0 ? (
            data.assignments.map((asig) => (
              <div key={asig.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{asig.training?.title}</h4>
                  <span className="text-xs text-gray-400">
                    {asig.training?.managementOwner} · Pilar: {asig.training?.pillar?.name || "General"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {asig.bestScore != null && (
                    <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                      Nota: {asig.bestScore}
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      asig.status === "PASSED" || asig.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {asig.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-gray-400">
              No tiene cursos asignados pendientes en este período.
            </div>
          )}
        </div>
      </div>

      {/* Documentos y Boletas Personales */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-blue-600 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>Mis Documentos y Boletas Laborales</span>
        </h2>

        <div className="divide-y divide-gray-100">
          {data.documents && data.documents.length > 0 ? (
            data.documents.map((doc) => (
              <div key={doc.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{doc.title}</h4>
                    <span className="text-xs text-gray-400">
                      {doc.period || doc.type} · {new Date(doc.uploadedAt).toLocaleDateString("es-PE")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toast.info(`Descargando documento: ${doc.title}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-gray-400">
              No hay documentos o boletas disponibles para descarga en este momento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

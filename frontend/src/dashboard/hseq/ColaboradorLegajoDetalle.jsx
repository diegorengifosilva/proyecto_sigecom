import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/services/api";
import {
  Users,
  Award,
  Calendar,
  FileCheck,
  ShieldCheck,
  ArrowLeft,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";

export default function ColaboradorLegajoDetalle() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDossier = async () => {
      try {
        setLoading(true);
        const res = await api.get(`hseq/employees/${id}/dossier/`);
        setData(res.data);
      } catch (err) {
        console.error("Error al cargar legajo:", err);
        toast.error("No se pudo cargar el legajo del colaborador.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDossier();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-gray-400">Cargando legajo HSEQ...</div>;
  }

  if (!data || !data.employee) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No se encontró el colaborador solicitado.</p>
        <Link to="/hseq/colaboradores" className="text-indigo-600 underline text-xs mt-2 inline-block">
          Volver a la lista
        </Link>
      </div>
    );
  }

  const { employee, assignments, tarCertificates, induction } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Botón Volver */}
      <Link
        to="/hseq/colaboradores"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a Colaboradores</span>
      </Link>

      {/* Ficha Cabecera */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
              DNI: {employee.dni}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {employee.status === "ACTIVE" ? "Colaborador Activo" : "Inactivo"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{employee.full_name}</h1>
          <p className="text-xs text-gray-500 mt-1">
            {employee.position_name} · <strong>{employee.area_name}</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 text-xs text-gray-600 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span>{employee.email}</span>
            </div>
            {employee.corporate_phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{employee.corporate_phone}</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div>Fecha de Ingreso: <strong>{employee.hire_date ? employee.hire_date.substring(0, 10) : "N/D"}</strong></div>
            <div>Modalidad: <strong>{employee.worker_category === "PAYROLL" ? "Planilla" : "RxH"}</strong></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historial de Capacitaciones */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Capacitaciones y Cursos Asignados ({assignments?.length || 0})</span>
            </h2>
          </div>

          {(!Array.isArray(assignments) || assignments.length === 0) ? (
            <p className="text-xs text-gray-400 py-6 text-center">No tiene capacitaciones registradas.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {(Array.isArray(assignments) ? assignments : []).map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-gray-900">{item.training_title}</div>
                    <div className="text-gray-400 font-mono text-[11px]">{item.training_code}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.best_score !== null && (
                      <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        {Number(item.best_score).toFixed(0)}/20
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        item.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : item.status === "FAILED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {item.status === "APPROVED" ? "Aprobado" : item.status === "FAILED" ? "Desaprobado" : "Pendiente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Certificaciones TAR y Estado de Inducción */}
        <div className="space-y-6">
          {/* Inducción */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Estado de Inducción</span>
            </h3>

            {induction ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo:</span>
                  <strong className="text-gray-800">{induction.type}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {induction.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha Inicio:</span>
                  <span>{induction.initiated_at?.substring(0, 10)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Sin proceso de inducción activo.</p>
            )}
          </div>

          {/* Certificados TAR */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Certificaciones TAR ({tarCertificates?.length || 0})</span>
            </h3>

            {(!Array.isArray(tarCertificates) || tarCertificates.length === 0) ? (
              <p className="text-xs text-gray-400">Sin certificaciones de alto riesgo registradas.</p>
            ) : (
              <div className="space-y-2.5">
                {(Array.isArray(tarCertificates) ? tarCertificates : []).map((cert) => (
                  <div key={cert.id} className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-gray-900">
                      <span>{cert.type}</span>
                      <span className="text-gray-500 font-mono text-[10px]">{cert.certificate_code}</span>
                    </div>
                    <div className="text-gray-500 flex justify-between text-[11px]">
                      <span>Vence:</span>
                      <strong>{cert.expires_at?.substring(0, 10)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  Briefcase,
  DollarSign,
  HeartPulse,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Clock,
  Download,
  AlertCircle
} from "lucide-react";
import { toast } from "react-toastify";

export default function RrhhColaboradorDetalle() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");

  const fetchDossier = async () => {
    try {
      setLoading(true);
      const res = await api.get(`rrhh/employees/${id}/dossier/`);
      setEmployee(res.data);
    } catch (err) {
      console.error("Error al cargar legajo:", err);
      toast.error("No se pudo cargar el legajo del colaborador.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDossier();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 font-medium">Cargando legajo digital...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-rose-800">Colaborador no encontrado</h2>
          <p className="text-xs text-rose-600">El legajo solicitado no existe o no tiene permisos para acceder.</p>
          <Link
            to="/rrhh/colaboradores"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-rose-300 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-100/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la lista</span>
          </Link>
        </div>
      </div>
    );
  }

  const latestSalary = employee.compensationHistory?.[0];
  const latestEmo = employee.occupationalEmoCases?.[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Botón Volver y Encabezado Ficha */}
      <div className="space-y-4">
        <Link
          to="/rrhh/colaboradores"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Padrón de Colaboradores</span>
        </Link>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
              {employee.fullName ? employee.fullName.charAt(0) : "C"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{employee.fullName}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    employee.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {employee.status === "ACTIVE" ? "Activo" : "Cesado / Inactivo"}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                DNI: <span className="font-mono font-semibold text-gray-700">{employee.dni}</span> ·{" "}
                {employee.position?.name || "Sin cargo"} en {employee.area?.name || "Área no asignada"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toast.info("Generando resumen del legajo en PDF...")}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4 text-gray-500" />
              <span>Exportar Ficha</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-400 uppercase">Fecha Ingreso</span>
            <div className="text-sm font-bold text-gray-900">
              {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString("es-PE") : "No registrada"}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-400 uppercase">Remuneración</span>
            <div className="text-sm font-bold text-gray-900">
              {latestSalary
                ? `${latestSalary.currency || "PEN"} ${Number(latestSalary.monthlyAmount).toLocaleString("es-PE", {
                    minimumFractionDigits: 2
                  })}`
                : "Confidencial / Sin registro"}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-400 uppercase">Estado EMO</span>
            <div className="text-sm font-bold text-gray-900">
              {latestEmo?.aptitudeResult || latestEmo?.status || "Sin examen EMO"}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-400 uppercase">Inducción HSEQ</span>
            <div className="text-sm font-bold text-gray-900">
              {employee.inductionProcesses?.length > 0 ? "Completada" : "En proceso"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-6">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "general"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Información General
        </button>
        <button
          onClick={() => setActiveTab("documentos")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "documentos"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Documentos y Legajo Digital ({employee.documents?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "historial"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Historial y Formación ({employee.assignments?.length || 0})
        </button>
      </div>

      {/* Contenido de Tabs */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-blue-600">
              Datos Personales y Contacto
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">DNI / Documento:</span>
                <span className="font-semibold text-gray-900 font-mono">{employee.dni}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Correo Electrónico:</span>
                <span className="font-semibold text-gray-900">{employee.email || "No registrado"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Teléfono Personal:</span>
                <span className="font-semibold text-gray-900">{employee.personalPhone || "No registrado"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Fecha de Nacimiento:</span>
                <span className="font-semibold text-gray-900">
                  {employee.birthDate ? new Date(employee.birthDate).toLocaleDateString("es-PE") : "No registrada"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cuenta de Usuario:</span>
                <span className="font-semibold text-blue-600">
                  {employee.account?.username ? `@${employee.account.username}` : "Sin cuenta asignada"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-blue-600">
              Estructura Organizacional
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Área Orgánica:</span>
                <span className="font-semibold text-gray-900">{employee.area?.name || "Sin área"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Cargo / Puesto:</span>
                <span className="font-semibold text-gray-900">{employee.position?.name || "Sin cargo"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Jefatura Directa:</span>
                <span className="font-semibold text-gray-900">
                  {employee.directManager?.fullName || "No asignada"}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Origen del Registro:</span>
                <span className="font-semibold text-gray-700">{employee.sourceSystem || "SIGECOM RRHH"}</span>
              </div>
              {employee.terminationDate && (
                <div className="flex justify-between text-rose-600">
                  <span>Fecha de Cese:</span>
                  <span className="font-semibold">{new Date(employee.terminationDate).toLocaleDateString("es-PE")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "documentos" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Expediente Documental Digital</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Contratos, declaraciones juradas, constancias y certificados laborales
              </p>
            </div>
            <button
              onClick={() => toast.info("Función para adjuntar documento al legajo")}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors"
            >
              + Adjuntar Documento
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {employee.documents && employee.documents.length > 0 ? (
              employee.documents.map((doc) => (
                <div key={doc.id} className="py-3 flex items-center justify-between hover:bg-gray-50/50 rounded-xl px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{doc.title}</h4>
                      <span className="text-xs text-gray-400">
                        {doc.type} · Subido el {new Date(doc.uploadedAt).toLocaleDateString("es-PE")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.info(`Descargando documento: ${doc.title}`)}
                    className="px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    Descargar
                  </button>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">
                No hay documentos registrados en el legajo de este colaborador.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "historial" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900">Capacitaciones y Formación Corporativa</h3>
          <div className="divide-y divide-gray-100">
            {employee.assignments && employee.assignments.length > 0 ? (
              employee.assignments.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{item.training?.title || "Capacitación"}</h4>
                    <span className="text-xs text-gray-400">
                      Pilar: {item.training?.pillar?.name || "General"} · Gestión: {item.training?.managementOwner || "RRHH"}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      item.status === "COMPLETED" || item.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">
                Sin registros de formación o capacitaciones asignadas.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

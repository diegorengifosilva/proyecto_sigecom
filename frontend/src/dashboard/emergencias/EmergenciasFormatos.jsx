import React, { useState } from "react";
import {
  FileText,
  Download,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search
} from "lucide-react";
import { toast } from "react-toastify";

export default function EmergenciasFormatos() {
  const [templates, setTemplates] = useState([
    {
      id: "fmt-1",
      code: "EME-FOR-001",
      name: "Constancia de Suficiencia Médica Individual para Brigadistas",
      documentType: "MEDICAL_FITNESS",
      version: "V02",
      effectiveAt: "2026-01-01"
    },
    {
      id: "fmt-2",
      code: "EME-FOR-002",
      name: "Relación Grupal de Trabajadores Aptos para Labores de Brigada",
      documentType: "MEDICAL_ROSTER",
      version: "V01",
      effectiveAt: "2026-01-01"
    },
    {
      id: "fmt-3",
      code: "EME-FOR-003",
      name: "Informe y Evaluación de Simulacro de Emergencia",
      documentType: "DRILL_REPORT",
      version: "V03",
      effectiveAt: "2026-02-01"
    },
    {
      id: "fmt-4",
      code: "EME-FOR-004",
      name: "Registro e Informe de Intervención Real de Emergencia",
      documentType: "INTERVENTION_REPORT",
      version: "V02",
      effectiveAt: "2026-01-15"
    },
    {
      id: "fmt-5",
      code: "EME-FOR-005",
      name: "Tarjeta de Inspección Mensual de Extintores y Gabinetes",
      documentType: "EQUIPMENT_CONTROL",
      version: "V01",
      effectiveAt: "2026-01-01"
    }
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <FileText className="w-4 h-4" />
            <span>Sistema Documental Oficial</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Formatos Controlados</h1>
          <p className="text-sm text-gray-500 mt-1">
            Plantillas vigentes de respuesta a emergencias, códigos maestros, versiones aprobadas y formatos emitidos.
          </p>
        </div>

        <button
          onClick={() => toast.info("Publicar nueva revisión de formato controlado")}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Publicar Revisión</span>
        </button>
      </div>

      {/* Grid de Formatos */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-rose-600" />
          <span>Catálogo de Formatos Vigentes</span>
        </h2>

        <div className="divide-y divide-gray-100">
          {templates.map((fmt) => (
            <div key={fmt.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 rounded-xl px-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-rose-700">{fmt.code}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {fmt.version}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-gray-900">{fmt.name}</h4>
                <span className="text-xs text-gray-400">
                  Tipo: {fmt.documentType} · Vigente desde: {fmt.effectiveAt}
                </span>
              </div>

              <button
                onClick={() => toast.success(`Descargando plantilla oficial: ${fmt.code}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-rose-50 rounded-lg text-xs font-semibold text-rose-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Formato</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

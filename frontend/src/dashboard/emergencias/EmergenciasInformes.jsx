import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  FileCheck2,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus
} from "lucide-react";
import { toast } from "react-toastify";

export default function EmergenciasInformes() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get("emergencias/reports/");
      setReports(res.data || []);
    } catch (err) {
      console.error("Error al cargar informes:", err);
      toast.error("No se pudo cargar los informes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <FileCheck2 className="w-4 h-4" />
            <span>Control Documental</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Informes y Flujo de Firmas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bandeja de elaboración, evaluación post-simulacro o post-emergencia, lecciones aprendidas y aprobación HSEQ.
          </p>
        </div>

        <button
          onClick={() => toast.info("Generar nuevo informe de simulacro")}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Informe</span>
        </button>
      </div>

      {/* Lista de Informes */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Código</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Ubicación</th>
              <th className="py-3 px-4">Fecha Evento</th>
              <th className="py-3 px-4">Estado / Firma</th>
              <th className="py-3 px-4 text-right">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.length > 0 ? (
              reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-bold text-gray-900 font-mono text-xs">{r.code}</td>
                  <td className="py-3.5 px-4 text-xs font-medium text-gray-700">
                    {r.reportType === "DRILL" ? "Informe de Simulacro" : "Informe de Intervención"}
                  </td>
                  <td className="py-3.5 px-4 text-xs">{r.location || "Sede Principal"}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-400">
                    {r.eventAt ? new Date(r.eventAt).toLocaleDateString("es-PE") : "—"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {r.status || "APROBADO"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => toast.success(`Descargando ${r.code}.pdf`)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                  No hay informes registrados en la bandeja.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

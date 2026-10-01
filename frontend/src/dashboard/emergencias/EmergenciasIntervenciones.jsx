import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Plus,
  FileText,
  CheckCircle2,
  Users
} from "lucide-react";
import { toast } from "react-toastify";

export default function EmergenciasIntervenciones() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get("emergencias/reports/");
      // Filtrar reportes que sean de tipo intervención real
      const interventions = (res.data || []).filter((r) => r.reportType !== "DRILL");
      setReports(interventions);
    } catch (err) {
      console.error("Error al cargar intervenciones:", err);
      toast.error("No se pudo cargar el registro de intervenciones.");
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
            <AlertTriangle className="w-4 h-4" />
            <span>Respuesta en Campo</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Intervenciones Reales de Brigada</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bitácora formal de emergencias reales atendidas: fecha, causa, recursos utilizados, cronología y lesionados.
          </p>
        </div>

        <button
          onClick={() => toast.info("Registrar nueva intervención real de emergencia")}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Intervención</span>
        </button>
      </div>

      {/* Grid de Intervenciones */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Código / Evento</th>
              <th className="py-3 px-4">Ubicación</th>
              <th className="py-3 px-4">Fecha y Hora</th>
              <th className="py-3 px-4">Estado del Informe</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.length > 0 ? (
              reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-semibold text-gray-900">
                    <div>{r.code || "Informe"}</div>
                    <span className="text-xs text-gray-400 font-normal">Intervención de emergencia</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs">{r.location || "Sede Principal"}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-400">
                    {r.eventAt ? new Date(r.eventAt).toLocaleString("es-PE") : "—"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {r.status || "EMITIDO"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => toast.info(`Abriendo informe ${r.code}`)}
                      className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold"
                    >
                      Ver Informe
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-8 text-center text-sm text-gray-400">
                  No se registran intervenciones reales en el período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

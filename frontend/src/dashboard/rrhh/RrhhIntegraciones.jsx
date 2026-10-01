import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  RefreshCw,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Database
} from "lucide-react";
import { toast } from "react-toastify";

export default function RrhhIntegraciones() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSyncHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get("integracion/history/");
      setRuns(res.data);
    } catch (err) {
      console.error("Error al cargar historial de sincronización:", err);
      toast.error("No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncHistory();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <GitBranch className="w-4 h-4" />
            <span>Interoperabilidad Corporativa</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Integraciones y Sincronizaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoreo en tiempo real de altas, ceses y actualización de colaboradores sincronizados desde SIGECOM Comercial.
          </p>
        </div>

        <button
          onClick={fetchSyncHistory}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Historial de Integración */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Ejecución</th>
              <th className="py-3 px-4">Origen</th>
              <th className="py-3 px-4">Módulos Destino</th>
              <th className="py-3 px-4">Aplicados</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4">Fecha / Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {runs.length > 0 ? (
              runs.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-900">
                    {r.externalRunId ? r.externalRunId.slice(0, 13) : r.id.slice(0, 8)}...
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold text-blue-600">{r.sourceSystem}</td>
                  <td className="py-3.5 px-4 text-xs">
                    {Array.isArray(r.targetModules) ? r.targetModules.join(", ") : r.targetModules}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono font-semibold text-gray-900">{r.appliedCount}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        r.status === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-400">
                    {r.startedAt ? new Date(r.startedAt).toLocaleString("es-PE") : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                  No hay sincronizaciones registradas aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

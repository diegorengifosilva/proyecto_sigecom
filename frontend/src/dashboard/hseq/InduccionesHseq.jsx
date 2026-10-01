import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  FileCheck2,
  Search,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";

export default function InduccionesHseq() {
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState([]);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const res = await api.get("hseq/onboarding/");
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setProcesses(list);
    } catch (err) {
      console.error("Error al cargar procesos de inducción:", err);
      toast.error("No se pudieron cargar los procesos de inducción.");
      setProcesses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
            <FileCheck2 className="w-4 h-4" />
            <span>Gestión de Inducción y Reinducción</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Procesos de Inducción HSEQ</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoreo de ingresos laborales, reinducciones anuales y validación de workplace training.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando procesos de inducción...</div>
      ) : (!Array.isArray(processes) || processes.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <FileCheck2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No hay procesos de inducción registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Área / Cargo</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Motivo / Disparador</th>
                  <th className="py-3 px-4 text-center">Fase HSEQ</th>
                  <th className="py-3 px-4 text-center">Workplace Training</th>
                  <th className="py-3 px-4 text-right">Inicio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(processes) ? processes : []).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{p.employee_name}</div>
                      <div className="text-[11px] font-mono text-gray-400">{p.employee_dni}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-800">{p.employee_position}</div>
                      <div className="text-gray-400">{p.employee_area}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-800">{p.type}</td>
                    <td className="py-3 px-4 text-gray-600">{p.trigger}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-gray-100 text-gray-700">
                        {p.workplace_training_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">{p.initiated_at?.substring(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

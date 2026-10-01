import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Clock,
  Plus,
} from "lucide-react";
import { toast } from "react-toastify";

const TAR_TYPES = [
  { value: "HEIGHT", label: "Trabajos en Altura" },
  { value: "ELECTRICAL_RISK", label: "Riesgo Eléctrico" },
  { value: "LOTO", label: "Bloqueo y Etiquetado (LOTO)" },
  { value: "HOT_WORK", label: "Trabajos en Caliente" },
  { value: "SCAFFOLDING", label: "Andamios y Plataformas" },
];

export default function CertificacionesTar() {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [search, setSearch] = useState("");

  const fetchCerts = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `hseq/tar-certificates/?type=${selectedType}&status=${selectedStatus}&search=${search}`
      );
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setCertificates(list);
    } catch (err) {
      console.error("Error al cargar certificados TAR:", err);
      toast.error("No se pudieron cargar los certificados TAR.");
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, [selectedType, selectedStatus, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Acreditaciones de Alto Riesgo</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Certificaciones TAR</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control de vigencias de certificados de Altura, Riesgo Eléctrico, LOTO, Caliente y Andamios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="">Todos los Tipos TAR</option>
            {TAR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="">Todas las Vigencias</option>
            <option value="VALID">Vigentes</option>
            <option value="WARNING">Por Vencer (30 días)</option>
            <option value="EXPIRED">Vencidos</option>
          </select>

          <div className="relative w-full md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando certificados TAR...</div>
      ) : (!Array.isArray(certificates) || certificates.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <ShieldAlert className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No se encontraron certificaciones TAR</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Área / Cargo</th>
                  <th className="py-3 px-4">Tipo de Acreditación</th>
                  <th className="py-3 px-4">Proveedor / Nro</th>
                  <th className="py-3 px-4">Emisión</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(certificates) ? certificates : []).map((c) => {
                  const now = new Date();
                  const exp = new Date(c.expires_at);
                  const isExpired = exp < now;
                  const isWarning = !isExpired && exp <= new Date(now.getTime() + 30 * 24 * 3600 * 1000);

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{c.employee_name}</div>
                        <div className="text-[11px] font-mono text-gray-400">{c.employee_dni}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-800">{c.employee_position}</div>
                        <div className="text-gray-400">{c.employee_area}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">{c.type}</td>
                      <td className="py-3 px-4 text-gray-600">
                        <div>{c.provider || "Entidad Externa"}</div>
                        <div className="font-mono text-[11px] text-gray-400">{c.certificate_code || "—"}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{c.issued_at?.substring(0, 10)}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{c.expires_at?.substring(0, 10)}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                            isExpired
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : isWarning
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {isExpired ? "Vencido" : isWarning ? "Por Vencer" : "Vigente"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

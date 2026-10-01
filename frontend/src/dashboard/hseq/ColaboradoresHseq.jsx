import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Link } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Briefcase,
  Building,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "react-toastify";

export default function ColaboradoresHseq() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [areas, setAreas] = useState([]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get(`hseq/employees/?search=${search}&areaId=${selectedArea}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setEmployees(list);
    } catch (err) {
      console.error("Error al cargar colaboradores:", err);
      toast.error("No se pudieron cargar los colaboradores.");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      const res = await api.get("hseq/catalogs/");
      setAreas(Array.isArray(res.data?.areas) ? res.data.areas : []);
    } catch (err) {
      console.error("Error al cargar áreas:", err);
      setAreas([]);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedArea]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Users className="w-4 h-4" />
            <span>Población Laboral y Seguridad</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Colaboradores y Legajos HSEQ</h1>
          <p className="text-sm text-gray-500 mt-1">
            Directorio del personal con estado formativo, acreditación TAR y legajo de inducción.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Todas las Áreas</option>
            {(Array.isArray(areas) ? areas : []).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por DNI o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando personal...</div>
      ) : (!Array.isArray(employees) || employees.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No se encontraron colaboradores</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">DNI</th>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Área / Cargo</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(employees) ? employees : []).map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gray-700">{emp.dni}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{emp.full_name}</div>
                      <div className="text-[11px] text-gray-400">{emp.worker_category === "PAYROLL" ? "Planilla" : "RxH"}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{emp.position_name}</div>
                      <div className="text-gray-400">{emp.area_name}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 space-y-0.5">
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={emp.email}>
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span>{emp.email}</span>
                      </div>
                      {emp.corporate_phone && (
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Phone className="w-3 h-3" />
                          <span>{emp.corporate_phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                          emp.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {emp.status === "ACTIVE" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/hseq/colaboradores/${emp.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Legajo</span>
                      </Link>
                    </td>
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

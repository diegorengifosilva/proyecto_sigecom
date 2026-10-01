import React, { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import { Link } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowRight,
  UserCheck,
  UserX,
  FileText,
  Building,
  Briefcase,
  AlertCircle,
  Download,
  X,
  Check
} from "lucide-react";
import { toast } from "react-toastify";

const PAGE_SIZE = 12;

export default function RrhhColaboradores() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedArea, setSelectedArea] = useState("ALL");
  const [page, setPage] = useState(1);

  // Modales
  const [showNewModal, setShowNewModal] = useState(false);
  const [terminationTarget, setTerminationTarget] = useState(null);
  const [areas, setAreas] = useState([]);
  const [positions, setPositions] = useState([]);

  // Formulario nuevo
  const [newEmployee, setNewEmployee] = useState({
    dni: "",
    fullName: "",
    email: "",
    personalPhone: "",
    areaId: "",
    positionId: "",
    hireDate: new Date().toISOString().split("T")[0],
    compensationType: "PLANILLA"
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get("rrhh/employees/");
      setEmployees(res.data);
    } catch (err) {
      console.error("Error al cargar colaboradores:", err);
      toast.error("No se pudo cargar la lista de colaboradores.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      const res = await api.get("rrhh/configuration/");
      setAreas(res.data.areas || []);
      setPositions(res.data.positions || []);
    } catch (err) {
      console.error("Error al cargar catálogo:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchCatalogs();
  }, []);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchStatus = statusFilter === "ALL" || emp.status === statusFilter;
      const matchArea = selectedArea === "ALL" || (emp.area && String(emp.area.id) === selectedArea);
      const matchSearch =
        !term ||
        (emp.fullName && emp.fullName.toLowerCase().includes(term)) ||
        (emp.dni && emp.dni.toLowerCase().includes(term)) ||
        (emp.area?.name && emp.area.name.toLowerCase().includes(term)) ||
        (emp.position?.name && emp.position.name.toLowerCase().includes(term));
      return matchStatus && matchArea && matchSearch;
    });
  }, [employees, search, statusFilter, selectedArea]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filteredEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.dni || !newEmployee.fullName) {
      toast.warning("DNI y Nombres Completos son obligatorios.");
      return;
    }
    try {
      await api.post("rrhh/employees/", newEmployee);
      toast.success("Colaborador registrado exitosamente.");
      setShowNewModal(false);
      setNewEmployee({
        dni: "",
        fullName: "",
        email: "",
        personalPhone: "",
        areaId: "",
        positionId: "",
        hireDate: new Date().toISOString().split("T")[0],
        compensationType: "PLANILLA"
      });
      fetchEmployees();
    } catch (err) {
      console.error("Error al registrar colaborador:", err);
      toast.error(err.response?.data?.error || "Error al crear colaborador.");
    }
  };

  const handleTerminateEmployee = async (e) => {
    e.preventDefault();
    if (!terminationTarget) return;
    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries());
    try {
      await api.patch(`rrhh/employees/${terminationTarget.id}/termination/`, data);
      toast.success(`Baja registrada para ${terminationTarget.fullName}.`);
      setTerminationTarget(null);
      fetchEmployees();
    } catch (err) {
      console.error("Error al registrar baja:", err);
      toast.error("No se pudo registrar la baja.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Users className="w-4 h-4" />
            <span>Maestro de Personal</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Colaboradores y Legajos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Padrón centralizado de trabajadores, legajo digital, condición laboral y control de ceses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, DNI, cargo o área..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos / Cesados</option>
          </select>

          <select
            value={selectedArea}
            onChange={(e) => {
              setSelectedArea(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Todas las Áreas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <div className="px-3 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-600 whitespace-nowrap">
            {filteredEmployees.length} registros
          </div>
        </div>
      </div>

      {/* Tabla de Colaboradores */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">DNI</th>
                <th className="py-3 px-4">Área</th>
                <th className="py-3 px-4">Puesto</th>
                <th className="py-3 px-4">Condición</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-sm text-gray-400">
                    Cargando colaboradores...
                  </td>
                </tr>
              ) : visible.length > 0 ? (
                visible.map((emp) => (
                  <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/rrhh/colaboradores/${emp.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 block"
                      >
                        {emp.fullName}
                      </Link>
                      <span className="text-[11px] text-gray-400">{emp.email || "Sin correo"}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{emp.dni}</td>
                    <td className="py-3 px-4 text-xs">{emp.area?.name || "Sin área"}</td>
                    <td className="py-3 px-4 text-xs">{emp.position?.name || "Sin cargo"}</td>
                    <td className="py-3 px-4 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                        {emp.compensationType || "Planilla"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {emp.status === "ACTIVE" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        to={`/rrhh/colaboradores/${emp.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <span>Legajo</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                      {emp.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => setTerminationTarget(emp)}
                          className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Baja
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-sm text-gray-400">
                    No se encontraron colaboradores con los criterios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Página {currentPage} de {totalPages} ({filteredEmployees.length} registros)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nuevo Colaborador */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Registrar Colaborador</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">DNI / Documento *</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={newEmployee.dni}
                    onChange={(e) => setNewEmployee({ ...newEmployee, dni: e.target.value })}
                    placeholder="8 dígitos"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={newEmployee.personalPhone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, personalPhone: e.target.value })}
                    placeholder="999 888 777"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Apellidos y Nombres *</label>
                <input
                  type="text"
                  required
                  value={newEmployee.fullName}
                  onChange={(e) => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                  placeholder="Ej. Perez Ramirez Juan Carlos"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="colaborador@empresa.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Área</label>
                  <select
                    value={newEmployee.areaId}
                    onChange={(e) => setNewEmployee({ ...newEmployee, areaId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Seleccione área</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Puesto / Cargo</label>
                  <select
                    value={newEmployee.positionId}
                    onChange={(e) => setNewEmployee({ ...newEmployee, positionId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Seleccione cargo</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha de Ingreso</label>
                  <input
                    type="date"
                    value={newEmployee.hireDate}
                    onChange={(e) => setNewEmployee({ ...newEmployee, hireDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Condición Laboral</label>
                  <select
                    value={newEmployee.compensationType}
                    onChange={(e) => setNewEmployee({ ...newEmployee, compensationType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="PLANILLA">Planilla</option>
                    <option value="HONORARIOS">Recibos por Honorarios</option>
                    <option value="PRACTICANTE">Practicante</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/20"
                >
                  Guardar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Baja de Colaborador */}
      {terminationTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Registrar Cese / Baja</h2>
                <p className="text-xs text-gray-400 mt-0.5">{terminationTarget.fullName}</p>
              </div>
              <button
                onClick={() => setTerminationTarget(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTerminateEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Efectiva de Baja *</label>
                <input
                  type="date"
                  name="terminationDate"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Referencia / Documento</label>
                <input
                  type="text"
                  name="reference"
                  placeholder="Carta de renuncia, fin de contrato, acuerdo mutuo..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo Detallado *</label>
                <textarea
                  name="reason"
                  required
                  rows={3}
                  placeholder="Explique las causas del cese..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setTerminationTarget(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-rose-500/20"
                >
                  Confirmar Baja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

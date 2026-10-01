import React, { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  DollarSign,
  ArrowRight,
  X,
  Save,
  CheckCircle2,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";

const ESTADOS = [
  "Apertura",
  "Inicio",
  "Planificación",
  "Ejecución",
  "Cierre",
  "Cerrado",
  "Pausado",
];

const UNIDADES_NEGOCIO = ["Minería", "Petroquímica", "Industria", "Safety"];

const MODALIDADES = [
  { value: "suma_alzada", label: "Suma Alzada" },
  { value: "costo_reembolsable", label: "Costo Reembolsable" },
  { value: "llave_en_mano", label: "Llave en Mano" },
  { value: "mixto", label: "Mixto" },
];

export default function ProyectosLista() {
  const [loading, setLoading] = useState(true);
  const [proyectos, setProyectos] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedEstado, setSelectedEstado] = useState("");
  const [selectedUnidad, setSelectedUnidad] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal Crear Proyecto
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    cliente: "",
    unidad_negocio: "Minería",
    modalidad_contratacion: "suma_alzada",
    estado: "Apertura",
    fecha_inicio: new Date().toISOString().substring(0, 10),
    fecha_fin: new Date(Date.now() + 90 * 86400000).toISOString().substring(0, 10),
    presupuesto_gastos: 0,
    responsable: "",
  });

  const fetchProyectos = async () => {
    try {
      setLoading(true);
      const res = await api.get("proyectos/proyectos/");
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setProyectos(list);
    } catch (err) {
      console.error("Error al cargar lista de proyectos:", err);
      toast.error("No se pudo cargar el catálogo de proyectos.");
      setProyectos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProyectos();
  }, []);

  // Filtrado
  const filtered = useMemo(() => {
    return proyectos.filter((p) => {
      const matchSearch =
        !search ||
        (p.codigo || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.nombre || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.cliente || "").toLowerCase().includes(search.toLowerCase());

      const matchEstado = !selectedEstado || p.estado === selectedEstado;
      const matchUnidad = !selectedUnidad || p.unidad_negocio === selectedUnidad;

      return matchSearch && matchEstado && matchUnidad;
    });
  }, [proyectos, search, selectedEstado, selectedUnidad]);

  // Paginación
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.codigo || !formData.nombre) {
      toast.warn("Por favor ingrese al menos el código y nombre del proyecto.");
      return;
    }

    try {
      setSaving(true);
      await api.post("proyectos/proyectos/", formData);
      toast.success("Proyecto creado exitosamente.");
      setShowModal(false);
      setFormData({
        codigo: "",
        nombre: "",
        cliente: "",
        unidad_negocio: "Minería",
        modalidad_contratacion: "suma_alzada",
        estado: "Apertura",
        fecha_inicio: new Date().toISOString().substring(0, 10),
        fecha_fin: new Date(Date.now() + 90 * 86400000).toISOString().substring(0, 10),
        presupuesto_gastos: 0,
        responsable: "",
      });
      fetchProyectos();
    } catch (err) {
      console.error("Error al crear proyecto:", err);
      toast.error("No se pudo crear el proyecto. Verifique que el código sea único.");
    } finally {
      setSaving(false);
    }
  };

  const fmtUSD = (num) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Portafolio de Obras y Servicios</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Catálogo de Proyectos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Directorio completo de proyectos con estado operativo, presupuesto y acceso al workstation EVM.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedEstado}
            onChange={(e) => {
              setSelectedEstado(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Todos los Estados</option>
            {ESTADOS.map((est) => (
              <option key={est} value={est}>{est}</option>
            ))}
          </select>

          <select
            value={selectedUnidad}
            onChange={(e) => {
              setSelectedUnidad(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Todas las Unidades</option>
            {UNIDADES_NEGOCIO.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <span className="text-xs text-gray-400 ml-2">
            Mostrando <strong>{filtered.length}</strong> proyectos
          </span>
        </div>
      </div>

      {/* Tabla de Resultados */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando portafolio de proyectos...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold">No se encontraron proyectos</p>
          <p className="text-xs text-gray-400 mt-1">Pruebe ajustando los filtros de búsqueda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Proyecto</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Unidad / Modalidad</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Presupuesto</th>
                  <th className="py-3 px-4 text-right">Gasto Real</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(paginated) ? paginated : []).map((p) => {
                  const isExec = p.estado === "Ejecución" || p.estado === "Ejecucion";
                  const isPlan = p.estado === "Planificación" || p.estado === "Planificacion";
                  const isDone = p.estado === "Cerrado" || p.estado === "Cierre";

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                        {p.codigo}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 max-w-sm truncate" title={p.nombre}>
                          {p.nombre}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{p.fecha_inicio} al {p.fecha_fin}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800 max-w-[180px] truncate">{p.cliente || "V&C Corporation"}</div>
                        {p.responsable && <div className="text-[11px] text-gray-400 truncate">{p.responsable}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-700">{p.unidad_negocio || "Minería"}</div>
                        <div className="text-[11px] text-gray-400">{p.modalidad_contratacion || "Suma Alzada"}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                            isExec
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isPlan
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : isDone
                              ? "bg-gray-100 text-gray-600 border-gray-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {p.estado || "Apertura"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                        {fmtUSD(p.presupuesto_gastos || p.presupuesto_estimado || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-rose-600">
                        {fmtUSD(p.gasto_real || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/proyectos/${p.id}`}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Workstation</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer de Paginación */}
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div>
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> (Total: {filtered.length} proyectos)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Proyecto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-gray-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Registrar Nuevo Proyecto</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Código del Proyecto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: PRY-2026-001"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Unidad de Negocio</label>
                  <select
                    value={formData.unidad_negocio}
                    onChange={(e) => setFormData({ ...formData, unidad_negocio: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {UNIDADES_NEGOCIO.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nombre del Proyecto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mantenimiento y montaje de transformadores de potencia"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Cliente / Entidad</label>
                  <input
                    type="text"
                    placeholder="Ej: Minera Las Bambas S.A."
                    value={formData.cliente}
                    onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Responsable / Líder</label>
                  <input
                    type="text"
                    placeholder="Nombre del Ing. Residente o PM"
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Fecha de Fin</label>
                  <input
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Presupuesto ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.presupuesto_gastos}
                    onChange={(e) => setFormData({ ...formData, presupuesto_gastos: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Estado Inicial</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {ESTADOS.map((est) => (
                      <option key={est} value={est}>{est}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Modalidad de Contratación</label>
                  <select
                    value={formData.modalidad_contratacion}
                    onChange={(e) => setFormData({ ...formData, modalidad_contratacion: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {MODALIDADES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-all inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Guardando..." : "Guardar Proyecto"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

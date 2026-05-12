import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  Network,
  Info,
  Repeat2,
  Binoculars,
  Search,
  AlertTriangle,
  Filter,
  Loader2,
  ChevronDown,
  Building2,
  Send,
  FileSliders,
  Trash2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";

const FilterCardKardex = ({ onProcess, onReport, onClear, initialFilters = {}, reportLoading = false }) => {
  const currentYear = new Date().getFullYear();

  const [filters, setFilters] = useState({
    anio: initialFilters.anno || "%",
    mes: initialFilters.mes || "%",
    cliente: initialFilters.cliente || "%",
    estado: initialFilters.estado || "%",
    area: initialFilters.area || "%",
    envio: initialFilters.envio || "%",
    moneda: initialFilters.moneda || "S",
    producto: "",
    generalCampo: "",
    generalValor: "",
  });

  const [clientes, setClientes] = useState([]);
  const [areas, setAreas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const DEFAULT_FILTERS = {
    anio: "%",
    mes: "%",
    cliente: "%",
    estado: "%",
    area: "%",
    envio: "%",
    moneda: "S",
    producto: "",
    generalCampo: "",
    generalValor: "",
  };

  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [openBuscador, setOpenBuscador] = useState(false);
  const [busquedaQuery, setBusquedaQuery] = useState("");
  const [productosLista, setProductosLista] = useState([]);
  const [loadingBuscador, setLoadingBuscador] = useState(false);

  const fetchProductos = async (query) => {
    setLoadingBuscador(true);
    try {
      const res = await api.get(`logistica/dashboard/productos/?q=${query}`);
      setProductosLista(res.data || []);
    } catch {
      setProductosLista([]);
    } finally {
      setLoadingBuscador(false);
    }
  };

  useEffect(() => {
    if (!openBuscador) return;
    const timer = setTimeout(() => {
      fetchProductos(busquedaQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [busquedaQuery, openBuscador]);

  const handleSeleccionarProducto = (producto) => {
    setProductoSeleccionado(`${producto.codigo || ""} - ${producto.nombre || ""}`);
    setFilters((prev) => ({ ...prev, producto: producto.codigo || "" }));
    setOpenBuscador(false);
    setBusquedaQuery("");
    setProductosLista([]);
  };

  const handleClearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setProductoSeleccionado("");
    setBusquedaQuery("");
    setProductosLista([]);
    setOpenBuscador(false);
    if (typeof onClear === "function") onClear();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientesRes, areasRes] = await Promise.all([
          api.get("core/clientes/"),
          api.get("users/areas/"),
        ]);
        setClientes(clientesRes.data || []);
        setAreas(areasRes.data || []);
      } catch (err) {
        console.error("Error cargando filtros:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const anios = Array.from({ length: currentYear - 2010 + 1 }, (_, i) => 2010 + i);

  const meses = [
    { value: "%", label: "-- Todos --" },
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const monedas = [
    { value: "S", label: "Soles" },
    { value: "D", label: "Dólares" },
  ];

  const handleProcess = async (e) => {
    if (e) e.preventDefault();
    if (!onProcess) return;
    setProcessing(true);
    const filtros = { ...filters };
    if (filtros.generalCampo && filtros.generalValor?.trim()) {
      filtros.campo = filtros.generalCampo;
      filtros.valor = filtros.generalValor.trim();
    }
    await onProcess(filtros);
    setProcessing(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="relative w-full">
      <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="w-full flex items-center justify-between px-1 py-2 md:py-0 cursor-pointer md:cursor-default">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-700">
          <Filter className="w-4 h-4 text-teal-600" /> Filtros
        </h2>
        <div className="md:hidden">
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isMobileOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {(isMobileOpen || window.innerWidth >= 768) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="pt-3 pb-4 flex flex-col gap-5">
            <button onClick={handleClearFilters} className="absolute top-2 right-2 px-2 py-1 text-xs rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800 shadow-sm flex items-center gap-1">
              Limpiar
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="grid grid-cols-2 gap-2">
                <SelectBox
                  label="Año"
                  icon={<Calendar className="w-4 h-4" />}
                  options={[{ value: "%", label: "Todos" }, ...anios.slice().reverse().map((a) => ({ value: String(a), label: String(a) }))]}
                  value={filters.anio}
                  onChange={(e) => handleChange("anio", e.target.value)}
                />
                <SelectBox
                  label="Mes"
                  icon={<CalendarDays className="w-4 h-4" />}
                  options={meses}
                  value={filters.mes}
                  onChange={(e) => handleChange("mes", e.target.value)}
                />
              </div>

              <SelectBox
                label="Seleccione Producto"
                icon={<Building2 className="w-4 h-4" />}
                options={[]}
                value={productoSeleccionado}
                onChange={() => { }}
                onOpen={() => {
                  setBusquedaQuery("");
                  fetchProductos("");
                  setOpenBuscador(true);
                }}
              />

              <div className="grid grid-cols-2 gap-2">
                <SelectBox
                  label="Moneda"
                  icon={<Binoculars className="w-4 h-4" />}
                  options={monedas}
                  value={filters.moneda}
                  onChange={(e) => handleChange("moneda", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" onClick={handleProcess} disabled={processing} variant="ghost" className="text-sm font-black uppercase tracking-widest text-teal-700 hover:bg-teal-100 border border-transparent hover:border-teal-200 rounded-xl h-9 px-8 transition-all">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : <><Repeat2 className="w-4 h-4" /> Procesar</>}
              </Button>

              <Button
                type="button"
                disabled={reportLoading}
                onClick={() => {
                  if (!onReport) return;
                  if (!filters.producto || filters.producto === "%") {
                    setError("Debe seleccionar un producto antes de generar el reporte PDF.");
                    return;
                  }
                  onReport(filters);
                }}
                className="h-9 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
              >
                {reportLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando PDF...</> : <>Reporte PDF</>}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {openBuscador && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenBuscador(false)} />
          <div className="relative z-10 bg-white rounded-xl shadow-2xl w-[520px] max-h-[480px] flex flex-col overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-600 rounded"><Building2 size={14} className="text-white" /></div>
                <span className="text-[11px] font-black text-white uppercase tracking-wider">Seleccionar Producto</span>
              </div>
              <button onClick={() => setOpenBuscador(false)} className="p-1 text-slate-400 hover:text-white transition-colors rounded"><X size={16} /></button>
            </div>
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
              <input type="text" autoFocus placeholder="Buscar por código o nombre..." value={busquedaQuery} onChange={(e) => setBusquedaQuery(e.target.value)} className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-teal-400 bg-white" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-4 py-2 text-[10px] font-black text-slate-600 uppercase w-36">Código</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-600 uppercase">Nombre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productosLista.map((producto, idx) => (
                    <tr key={idx} onClick={() => handleSeleccionarProducto(producto)} className="hover:bg-teal-50 cursor-pointer transition-colors group">
                      <td className="px-4 py-2.5 text-[11px] font-black text-slate-700 group-hover:text-teal-700">{producto.codigo}</td>
                      <td className="px-4 py-2.5 text-[11px] font-medium text-slate-600 group-hover:text-teal-700">{producto.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const SelectBox = ({ label, icon, options, value, onChange, onOpen }) => {
  if (typeof onOpen === "function") {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1 text-xs font-medium text-gray-700">{icon} {label}</label>
        <button type="button" onClick={onOpen} className="w-full rounded-xl border bg-white px-3 py-2 text-xs text-left flex items-center justify-between hover:bg-teal-50 hover:border-teal-400 transition-all">
          <span className="truncate text-gray-700">{value || "Seleccione producto"}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-xs font-medium text-gray-700">{icon} {label}</label>
      <select value={value} onChange={onChange} className="w-full rounded-xl border bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 transition-all">
        {options.map((opt) => (<option key={`${label}-${opt.value}-${opt.label}`} value={opt.value}>{opt.label}</option>))}
      </select>
    </div>
  );
};

export default FilterCardKardex;

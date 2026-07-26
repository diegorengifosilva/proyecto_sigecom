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
  Loader2,
  ChevronDown,
  Building2,
  Send,
  FileSliders,
  FunnelX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";

const FilterCard = ({ onProcess, onReport, initialFilters = {}, dashboard = "cotizaciones", compact = false, className = "" }) => {
  const currentYear = new Date().getFullYear();

  const [filters, setFilters] = useState({
    anio: initialFilters.anno || currentYear.toString(),
    mes: initialFilters.mes || "%",
    cliente: initialFilters.cliente || "%",
    estado: initialFilters.estado || "%",
    area: initialFilters.area || "%",
    envio: initialFilters.envio || "%",
    generalCampo: "",
    generalValor: "",
  });

  const [clientes, setClientes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const estadosCot = [
    { value: "%", label: "-- Todos --" },
    { value: "1", label: "Adjudicado" },
    { value: "2", label: "Pendiente" },
    { value: "3", label: "Perdida" },
    { value: "4", label: "Anulado" },
    { value: "5", label: "Postergada" },
    { value: "7", label: "En Seguimiento" },
  ];

  const estadosLog = [
    { value: "%", label: "-- Todos --" },
    { value: "ACTIVO", label: "Activo" },
    { value: "ANULADO", label: "Anulado" },
  ];

  const envios = [
    { value: "%", label: "-- Todos --" },
    { value: "0", label: "Pendiente de Envio" },
    { value: "1", label: "Pendiente de Revision" },
    { value: "2", label: "Pendiente de Aprobacion" },
    { value: "3", label: "Enviado" },
  ];

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

  const aniosOptions = [
    { value: "%", label: "-- Todos --" },
    ...Array.from({ length: currentYear - 2010 + 1 }, (_, i) => {
      const anio = 2010 + i;
      return { value: anio.toString(), label: anio.toString() };
    }).reverse()
  ];

  const meses = [
    { value: "%", label: "-- Todos --" },
    { value: "01", label: "Enero" }, { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" }, { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" }, { value: "06", label: "Junio" },
    { value: "07", label: "Julio" }, { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" }, { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
  ];

  const camposGenerales = dashboard === "logistica" ? [
    { value: "", label: "-- Todos --" },
    { value: "num_reg", label: "N° Registro" },
    { value: "oco", label: "O. Compra" },
    { value: "nfa", label: "Factura" },
    { value: "ngu", label: "Guía" },
    { value: "dor", label: "Razón Social" },
  ] : [
    { value: "", label: "-- Todos --" },
    { value: "num_reg", label: "N° Registro" },
    { value: "cotin", label: "Código" },
    { value: "cliente_nombre", label: "Cliente" },
    { value: "refef", label: "Referencia" },
  ];

  const handleProcess = async (e) => {
    if (e) e.preventDefault();
    setProcessing(true);
    try {
      const filtros = { ...filters };
      if (filtros.generalCampo && filtros.generalValor) {
        filtros.campo = filtros.generalCampo;
        filtros.valor = filtros.generalValor.trim();
      }
      await onProcess(filtros);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SelectBox label="Año" icon={<Calendar size={14} />} options={aniosOptions} value={filters.anio} onChange={(e) => setFilters({ ...filters, anio: e.target.value })} />
        <SelectBox label="Mes" icon={<CalendarDays size={14} />} options={meses} value={filters.mes} onChange={(e) => setFilters({ ...filters, mes: e.target.value })} />
        <SelectBox label="Cliente" icon={<Building2 size={14} />} options={[{ value: "%", label: "-- Todos --" }, ...clientes.map(c => ({ value: c.codigo, label: c.nombre }))]} value={filters.cliente} onChange={(e) => setFilters({ ...filters, cliente: e.target.value })} />
        <SelectBox label="Estado" icon={<Info size={14} />} options={dashboard === "logistica" ? estadosLog : estadosCot} value={filters.estado} onChange={(e) => setFilters({ ...filters, estado: e.target.value })} />

        {dashboard === "cotizaciones" && (
          <SelectBox label="Envío" icon={<Send size={14} />} options={envios} value={filters.envio} onChange={(e) => setFilters({ ...filters, envio: e.target.value })} />
        )}

        <SelectBox label="Campo" icon={<Binoculars size={14} />} options={camposGenerales} value={filters.generalCampo} onChange={(e) => setFilters({ ...filters, generalCampo: e.target.value })} />

        <div className="flex flex-col gap-1.5 lg:col-span-1">
          <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider"><Search size={14} /> Buscador</label>
          <input
            type="text"
            placeholder="Buscar..."
            value={filters.generalValor}
            onChange={(e) => setFilters({ ...filters, generalValor: e.target.value })}
            className="h-9 w-full rounded-xl border border-slate-200 px-3 text-xs focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-end gap-2 lg:col-span-1">
          <Button onClick={handleProcess} disabled={processing} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold h-9 rounded-xl text-xs gap-2">
            {processing ? <Loader2 size={14} className="animate-spin" /> : <Repeat2 size={14} />}
            PROCESAR
          </Button>
          <Button onClick={() => onReport?.(filters)} variant="outline" className="h-9 w-9 p-0 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
            <FileSliders size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

const SelectBox = ({ label, icon, options, value, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{icon} {label}</label>
    <select value={value} onChange={onChange} className="h-9 w-full rounded-xl border border-slate-200 px-3 text-xs focus:ring-2 focus:ring-teal-500/20 transition-all bg-white shadow-sm appearance-none">
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export default FilterCard;

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MessageSquare, Lightbulb, AlertTriangle, CheckCircle2, Trash2, ShieldAlert, ArrowUpRight, EyeOff, Check, X, Filter, Calendar, CalendarDays } from "lucide-react";
import { ERPTable, ERPButton, ERPInput, FilterDropdown } from "@/components/ui/ERPComponents";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { toast } from "@/utils/toast";
import { formatDate } from "@/utils/formatters";

// API Fetching
const fetchSuggestions = async () => {
  const { data } = await api.get("buzon/sugerencias/");
  return data;
};

const fetchGerencias = async () => {
  const { data } = await api.get("buzon/gerencias/");
  return data;
};

const fetchAreas = async () => {
  const { data } = await api.get("users/areas/");
  return data;
};

export default function Sugerencias() {
  const { authUser: user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("%");
  const [statusFilter, setStatusFilter] = useState("%");
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [solucion, setSolucion] = useState("");
  const [tipo, setTipo] = useState("S"); // S=Sugerencia, Q=Queja
  const [prioridad, setPrioridad] = useState(1); // 1=Baja, 2=Media, 3=Alta
  const [anonimo, setAnonimo] = useState(0); // 0=No, 1=Si
  const [idGerencia, setIdGerencia] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Advanced Filters states
  const [selectedAnno, setSelectedAnno] = useState(new Date().getFullYear().toString());
  const [selectedMes, setSelectedMes] = useState("%");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("RANGO");
  const [annoDesde, setAnnoDesde] = useState("");
  const [mesDesde, setMesDesde] = useState("");
  const [annoHasta, setAnnoHasta] = useState("");
  const [mesHasta, setMesHasta] = useState("");
  const [prioridadFilter, setPrioridadFilter] = useState("%");
  const [anonimoFilter, setAnonimoFilter] = useState("%");
  const [areaFilter, setAreaFilter] = useState("%");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filterPanelRef = useRef(null);

  // Tanstack Query
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["suggestions_list"],
    queryFn: fetchSuggestions,
  });

  const { data: gerencias = [] } = useQuery({
    queryKey: ["gerencias_list"],
    queryFn: fetchGerencias,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas_list"],
    queryFn: fetchAreas,
  });

  const areasConRegistros = useMemo(() => {
    const ids = new Set(suggestions.map(s => String(s.id_area)).filter(Boolean));
    return areas.filter(a => ids.has(String(a.id_area)));
  }, [areas, suggestions]);

  // Close filter panel on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target)) {
        setShowAdvancedFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isAdmin = user?.modulos?.some(m => m.toUpperCase() === "SUGERENCIAS Y QUEJAS");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!asunto.trim() || !descripcion.trim()) {
      toast.error("Por favor completa todos los campos obligatorios.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("buzon/sugerencias/", {
        asunto,
        descripcion,
        solucion,
        tipo,
        prioridad,
        anonimo,
        id_area: user?.id_area || null,
        id_gerencia: idGerencia || null
      });

      toast.success("Tu sugerencia/queja ha sido registrada con éxito.");
      queryClient.invalidateQueries(["suggestions_list"]);
      
      // Reset & Close
      setAsunto("");
      setDescripcion("");
      setSolucion("");
      setTipo("S");
      setPrioridad(1);
      setAnonimo(0);
      setIdGerencia("");
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Error al registrar la sugerencia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este registro?")) {
      try {
        await api.delete(`buzon/sugerencias/${id}/`);
        toast.success("Registro eliminado.");
        queryClient.invalidateQueries(["suggestions_list"]);
      } catch (err) {
        console.error(err);
        toast.error("Error al eliminar el registro.");
      }
    }
  };

  const handleUpdateStatus = async (id, currentStatus) => {
    let nextStatus = "PENDIENTE";
    if (currentStatus === "PENDIENTE") nextStatus = "EN PROCESO";
    else if (currentStatus === "EN PROCESO") nextStatus = "RESUELTO";

    try {
      await api.patch(`buzon/sugerencias/${id}/`, { estado: nextStatus });
      toast.success(`Estado actualizado a ${nextStatus}`);
      queryClient.invalidateQueries(["suggestions_list"]);
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar el estado.");
    }
  };

  // KPIs calculations
  const totalCount = suggestions.length;
  const pendingCount = suggestions.filter(s => s.estado === "PENDIENTE").length;
  const inProcessCount = suggestions.filter(s => s.estado === "EN PROCESO").length;
  const resolvedCount = suggestions.filter(s => s.estado === "RESUELTO").length;

  const yearsOptions = [
    { v: "%", n: "TODOS" },
    { v: "2024", n: "2024" },
    { v: "2025", n: "2025" },
    { v: "2026", n: "2026" },
    { v: "2027", n: "2027" },
  ];

  const monthsOptions = [
    { v: "%", n: "TODOS" },
    { v: "1", n: "ENERO" },
    { v: "2", n: "FEBRERO" },
    { v: "3", n: "MARZO" },
    { v: "4", n: "ABRIL" },
    { v: "5", n: "MAYO" },
    { v: "6", n: "JUNIO" },
    { v: "7", n: "JULIO" },
    { v: "8", n: "AGOSTO" },
    { v: "9", n: "SETIEMBRE" },
    { v: "10", n: "OCTUBRE" },
    { v: "11", n: "NOVIEMBRE" },
    { v: "12", n: "DICIEMBRE" },
  ];

  const rangeYearsOptions = [
    { v: "2024", n: "2024" },
    { v: "2025", n: "2025" },
    { v: "2026", n: "2026" },
    { v: "2027", n: "2027" },
  ];

  const rangeMonthsOptions = [
    { v: "1", n: "ENERO" },
    { v: "2", n: "FEBRERO" },
    { v: "3", n: "MARZO" },
    { v: "4", n: "ABRIL" },
    { v: "5", n: "MAYO" },
    { v: "6", n: "JUNIO" },
    { v: "7", n: "JULIO" },
    { v: "8", n: "AGOSTO" },
    { v: "9", n: "SETIEMBRE" },
    { v: "10", n: "OCTUBRE" },
    { v: "11", n: "NOVIEMBRE" },
    { v: "12", n: "DICIEMBRE" },
  ];

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (annoDesde) count++;
    if (mesDesde) count++;
    if (annoHasta) count++;
    if (mesHasta) count++;
    if (prioridadFilter !== "%") count++;
    if (anonimoFilter !== "%") count++;
    if (areaFilter !== "%") count++;
    return count;
  }, [annoDesde, mesDesde, annoHasta, mesHasta, prioridadFilter, anonimoFilter, areaFilter]);

  const handleResetFilters = () => {
    setAnnoDesde("");
    setMesDesde("");
    setAnnoHasta("");
    setMesHasta("");
    setPrioridadFilter("%");
    setAnonimoFilter("%");
    setAreaFilter("%");
  };

  const filteredData = suggestions.filter(item => {
    const matchesSearch = 
      item.asunto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.usuario_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.area_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.gerencia_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "%" || item.tipo === typeFilter;
    const matchesStatus = statusFilter === "%" || item.estado === statusFilter;

    // Año
    const matchesAnno = selectedAnno === "%" || String(item.anno) === String(selectedAnno);

    // Mes
    const matchesMes = selectedMes === "%" || String(item.mes) === String(selectedMes);

    // Rango de fecha operativo
    let matchesRango = true;
    const itemMonths = Number(item.anno) * 12 + Number(item.mes);
    
    // Desde
    if (annoDesde) {
      if (mesDesde) {
        const desdeMonths = Number(annoDesde) * 12 + Number(mesDesde);
        if (itemMonths < desdeMonths) matchesRango = false;
      } else {
        if (Number(item.anno) < Number(annoDesde)) matchesRango = false;
      }
    }
    
    // Hasta
    if (annoHasta) {
      if (mesHasta) {
        const hastaMonths = Number(annoHasta) * 12 + Number(mesHasta);
        if (itemMonths > hastaMonths) matchesRango = false;
      } else {
        if (Number(item.anno) > Number(annoHasta)) matchesRango = false;
      }
    }

    // Prioridad
    const matchesPrioridad = prioridadFilter === "%" || String(item.prioridad) === String(prioridadFilter);

    // Anonimo
    const matchesAnonimo = anonimoFilter === "%" || String(item.anonimo) === String(anonimoFilter);

    // Área del remitente
    const matchesArea = areaFilter === "%" || String(item.id_area) === String(areaFilter);

    return matchesSearch && matchesType && matchesStatus && matchesAnno && matchesMes && matchesRango && matchesPrioridad && matchesAnonimo && matchesArea;
  });

  const PRIORITIES = {
    1: { label: "Baja", color: "bg-slate-50 text-slate-600 border-slate-200" },
    2: { label: "Media", color: "bg-amber-50 text-amber-700 border-amber-200" },
    3: { label: "Alta", color: "bg-rose-50 text-rose-700 border-rose-200" },
  };

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col">
      
      {/* HEADER SECTION */}
      <div className="flex flex-row justify-between items-center gap-2">
        <div>
          <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">Buzón de Sugerencias y Quejas</h1>
          <p className="text-[10px] md:text-sm text-gray-500 font-medium">
            <span>{filteredData.length} registros encontrados</span>
          </p>
        </div>

        <ERPButton icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowModal(true)}>
          <span className="hidden sm:inline">Nueva Sugerencia / Queja</span>
          <span className="inline sm:hidden">Registrar</span>
        </ERPButton>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3.5">
        
        {/* KPI 1 - Total */}
        <button
          type="button"
          onClick={() => {
            setTypeFilter("%");
            setStatusFilter("%");
          }}
          className={`w-full text-left bg-white p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98] ${
            statusFilter === "%"
              ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-md"
              : "border-gray-150 hover:border-indigo-300 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Total Tickets</span>
            <div className={`p-1.5 rounded-lg transition-all duration-300 ${statusFilter === "%" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"}`}>
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">{totalCount}</h3>
          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            Total recibidos
          </div>
        </button>

        {/* KPI 2 - Pendientes */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("PENDIENTE");
            setTypeFilter("%");
          }}
          className={`w-full text-left bg-white p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98] ${
            statusFilter === "PENDIENTE"
              ? "border-amber-500 ring-2 ring-amber-500/10 shadow-md"
              : "border-gray-150 hover:border-amber-300 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Pendientes</span>
            <div className={`p-1.5 rounded-lg transition-all duration-300 ${statusFilter === "PENDIENTE" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-600"}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">{pendingCount}</h3>
          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            Por Atender
          </div>
        </button>

        {/* KPI 3 - En Proceso */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("EN PROCESO");
            setTypeFilter("%");
          }}
          className={`w-full text-left bg-white p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98] ${
            statusFilter === "EN PROCESO"
              ? "border-blue-500 ring-2 ring-blue-500/10 shadow-md"
              : "border-gray-150 hover:border-blue-300 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">En Proceso</span>
            <div className={`p-1.5 rounded-lg transition-all duration-300 ${statusFilter === "EN PROCESO" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"}`}>
              <Lightbulb className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">{inProcessCount}</h3>
          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            En Atención
          </div>
        </button>

        {/* KPI 4 - Atendidos */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("RESUELTO");
            setTypeFilter("%");
          }}
          className={`w-full text-left bg-white p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98] ${
            statusFilter === "RESUELTO"
              ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-md"
              : "border-gray-150 hover:border-emerald-300 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Atendidos</span>
            <div className={`p-1.5 rounded-lg transition-all duration-300 ${statusFilter === "RESUELTO" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">{resolvedCount}</h3>
          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            Resueltos y Cerrados
          </div>
        </button>

      </div>

      {/* FILTER PANEL */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-3 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-row items-center gap-2 w-full lg:max-w-3xl flex-wrap sm:flex-nowrap">
          {/* Buscador */}
          <ERPInput
            placeholder="Buscar en la tabla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="w-full sm:w-72 md:w-80 flex-1 sm:flex-initial"
          />

          {/* Filtro Año */}
          <div className="shrink-0">
            <FilterDropdown
              icon="Calendar"
              value={selectedAnno === "%" ? "TODOS" : selectedAnno}
              onSelect={(val) => setSelectedAnno(prev => String(prev) === String(val) ? "%" : val)}
              options={yearsOptions}
              onToggle={setIsDropdownOpen}
              showSearch={true}
              gridLayout={true}
            />
          </div>

          {/* Filtro Mes */}
          <div className="shrink-0">
            <FilterDropdown
              icon="CalendarDays"
              value={selectedMes === "%" ? "TODOS" : monthsOptions.find(m => m.v === selectedMes)?.n}
              onSelect={(val) => setSelectedMes(prev => String(prev) === String(val) ? "%" : val)}
              options={monthsOptions}
              onToggle={setIsDropdownOpen}
              showSearch={true}
              gridLayout={true}
            />
          </div>

          {/* Botón de Filtros Especiales */}
          <div className="relative shrink-0" ref={filterPanelRef}>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[11px] font-black transition-all uppercase shadow-sm ${
                showAdvancedFilters
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-gray-50 border-gray-200 text-gray-650 hover:bg-white hover:border-gray-300"
              }`}
            >
              <Filter className={`h-3.5 w-3.5 ${showAdvancedFilters ? "text-indigo-650" : "text-gray-400"}`} />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center bg-indigo-600 text-white h-4 w-4 rounded-full text-[9px] ml-1 animate-in zoom-in font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* PANEL DESPLEGABLE */}
            {showAdvancedFilters && (
              <div className="absolute left-0 mt-2 w-[560px] bg-white border border-gray-150 rounded-2xl shadow-2xl z-[100] p-0 animate-in fade-in zoom-in duration-200 origin-top-left flex flex-col">
                {/* Header */}
                <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex justify-between items-center shrink-0 rounded-t-2xl">
                  <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Filtros Avanzados</h4>
                  <button
                    onClick={handleResetFilters}
                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-850 uppercase"
                  >
                    Limpiar
                  </button>
                </div>

                <div className="flex-1 flex min-h-0">
                  {/* Panel Izquierdo: Categorías */}
                  <div className="w-[160px] border-r border-gray-100 bg-gray-50/50 flex flex-col p-1.5 gap-1 shrink-0 rounded-bl-2xl">
                    {[
                      { id: "RANGO", label: "Rango Operativo" },
                      { id: "REMITENTE", label: "Tipo de Remitente" },
                      { id: "PRIORIDAD", label: "Prioridades" },
                      { id: "AREAS", label: "Áreas" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveFilterTab(tab.id)}
                        className={`text-left px-3 py-2 rounded-lg text-[10px] font-black transition-all uppercase ${activeFilterTab === tab.id
                            ? "bg-white text-indigo-600 shadow-sm border border-gray-100 font-black"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Panel Derecho: Contenido */}
                  <div className={`flex-1 p-4 transition-all duration-300 rounded-br-2xl ${isDropdownOpen ? 'pb-60' : ''}`}>
                    
                    {/* RANGO */}
                    {activeFilterTab === "RANGO" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Desde */}
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-400 tracking-widest uppercase block">Desde</span>
                            <div className="flex flex-col gap-2">
                              <FilterDropdown
                                label="Año"
                                icon="Calendar"
                                value={annoDesde ? annoDesde : "Seleccionar"}
                                onSelect={(val) => setAnnoDesde(prev => String(prev) === String(val) ? "" : val)}
                                options={rangeYearsOptions}
                                onToggle={setIsDropdownOpen}
                                showSearch={true}
                                gridLayout={true}
                              />
                              <FilterDropdown
                                label="Mes"
                                icon="CalendarDays"
                                value={mesDesde ? rangeMonthsOptions.find(m => m.v === mesDesde)?.n || "Seleccionar" : "Seleccionar"}
                                onSelect={(val) => setMesDesde(prev => String(prev) === String(val) ? "" : val)}
                                options={rangeMonthsOptions}
                                onToggle={setIsDropdownOpen}
                                showSearch={true}
                                gridLayout={true}
                              />
                            </div>
                          </div>
                          
                          {/* Hasta */}
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-400 tracking-widest uppercase block">Hasta</span>
                            <div className="flex flex-col gap-2">
                              <FilterDropdown
                                label="Año"
                                icon="Calendar"
                                value={annoHasta ? annoHasta : "Seleccionar"}
                                onSelect={(val) => setAnnoHasta(prev => String(prev) === String(val) ? "" : val)}
                                options={rangeYearsOptions}
                                onToggle={setIsDropdownOpen}
                                showSearch={true}
                                gridLayout={true}
                                alignRight={true}
                              />
                              <FilterDropdown
                                label="Mes"
                                icon="CalendarDays"
                                value={mesHasta ? rangeMonthsOptions.find(m => m.v === mesHasta)?.n || "Seleccionar" : "Seleccionar"}
                                onSelect={(val) => setMesHasta(prev => String(prev) === String(val) ? "" : val)}
                                options={rangeMonthsOptions}
                                onToggle={setIsDropdownOpen}
                                showSearch={true}
                                gridLayout={true}
                                alignRight={true}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* REMITENTE */}
                    {activeFilterTab === "REMITENTE" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: "1", n: "SÓLO ANÓNIMOS", desc: "Remitentes con identidad protegida", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
                            { id: "0", n: "SÓLO PÚBLICOS", desc: "Remitentes con nombre expuesto", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" }
                          ].map((opt) => {
                            const isSelected = anonimoFilter === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setAnonimoFilter(prev => prev === opt.id ? "%" : opt.id)}
                                className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${isSelected
                                    ? `${opt.bg} ${opt.text} border-transparent ring-2 ring-indigo-500/20 shadow-sm`
                                    : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 text-gray-500'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full shadow-sm transition-all duration-300 ${isSelected ? `${opt.dot} scale-125` : 'bg-gray-300 group-hover:bg-gray-400'}`} />
                                  <div className="flex flex-col text-left">
                                    <span className={`text-[10px] font-black tracking-wide uppercase transition-colors ${isSelected ? opt.text : 'text-gray-600 group-hover:text-indigo-600'}`}>
                                      {opt.n}
                                    </span>
                                    <span className="text-[8px] font-bold opacity-60 uppercase tracking-tight">
                                      {opt.desc}
                                    </span>
                                  </div>
                                </div>
                                <div className={`flex items-center justify-center w-5 h-5 rounded-lg transition-all duration-300 ${isSelected ? 'bg-white/50 shadow-inner scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* PRIORIDAD */}
                    {activeFilterTab === "PRIORIDAD" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: "1", n: "BAJA", desc: "Prioridad baja / rutinaria", bg: "bg-slate-50 text-slate-600 border-slate-200", text: "text-slate-650", dot: "bg-slate-400" },
                            { id: "2", n: "MEDIA", desc: "Prioridad media / importante", bg: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
                            { id: "3", n: "ALTA", desc: "Prioridad alta / urgente", bg: "bg-rose-50 text-rose-700 border-rose-200", text: "text-rose-700", dot: "bg-rose-500" }
                          ].map((opt) => {
                            const isSelected = prioridadFilter === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setPrioridadFilter(prev => prev === opt.id ? "%" : opt.id)}
                                className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${isSelected
                                    ? `${opt.bg} ${opt.text} border-transparent ring-2 ring-indigo-500/20 shadow-sm font-bold`
                                    : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 text-gray-500 font-semibold'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full shadow-sm transition-all duration-300 ${isSelected ? `${opt.dot} scale-125` : 'bg-gray-300 group-hover:bg-gray-400'}`} />
                                  <div className="flex flex-col text-left">
                                    <span className={`text-[10px] font-black tracking-wide uppercase transition-colors ${isSelected ? opt.text : 'text-gray-600 group-hover:text-indigo-600'}`}>
                                      {opt.n}
                                    </span>
                                    <span className="text-[8px] font-bold opacity-60 uppercase tracking-tight">
                                      {opt.desc}
                                    </span>
                                  </div>
                                </div>
                                <div className={`flex items-center justify-center w-5 h-5 rounded-lg transition-all duration-300 ${isSelected ? 'bg-white/50 shadow-inner scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* AREAS */}
                    {activeFilterTab === "AREAS" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                          {areasConRegistros.map((a) => {
                            const isSelected = areaFilter === String(a.id_area);
                            return (
                              <button
                                key={a.id_area}
                                type="button"
                                onClick={() => setAreaFilter(prev => prev === String(a.id_area) ? "%" : String(a.id_area))}
                                className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${isSelected
                                    ? 'bg-indigo-50 text-indigo-700 border-transparent ring-2 ring-indigo-500/20 shadow-sm font-bold'
                                    : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 text-gray-500'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full shadow-sm transition-all duration-300 ${isSelected ? 'bg-indigo-500 scale-125' : 'bg-gray-300 group-hover:bg-gray-400'}`} />
                                  <span className={`text-[10px] font-black tracking-wide uppercase transition-colors ${isSelected ? 'text-indigo-900 font-bold' : 'text-gray-600 group-hover:text-indigo-650'}`}>
                                    {a.nombre.toUpperCase()}
                                  </span>
                                </div>
                                <div className={`flex items-center justify-center w-5 h-5 rounded-lg transition-all duration-300 ${isSelected ? 'bg-white/50 shadow-inner scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend buttons / Type Filters */}
        <div className="flex items-center space-x-0.5 overflow-x-auto w-full lg:w-auto no-scrollbar pb-1 lg:pb-0 justify-end">
          {[
            { label: "SUGERENCIA", value: "S" },
            { label: "QUEJA", value: "Q" }
          ].map((opt) => {
            const isActive = typeFilter === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setTypeFilter(prev => prev === opt.value ? "%" : opt.value)}
                className={`whitespace-nowrap px-3 py-1.5 text-[9px] font-black rounded-xl transition-all ${isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="flex-1 min-h-0">
        <ERPTable
          headers={[
            { label: "Fecha", className: "w-[15%]" },
            { label: "Tipo / Prioridad", className: "w-[15%]" },
            { label: "Asunto y Detalle", className: "w-[30%]" },
            { label: "Gerencia Destino", className: "w-[15%]" },
            { label: "Remitente", className: "w-[15%]" },
            { label: "Estado", className: "w-[10%]" }
          ]}
          loading={isLoading}
        >
          {filteredData.length > 0 ? (
            filteredData.map((item) => (
              <tr 
                key={item.id_registro} 
                onClick={() => navigate(`/sugerencias/${item.id_registro}`)}
                className="transition-colors cursor-pointer hover:bg-indigo-50/30 active:bg-indigo-100/30"
              >
                <td className="px-4 py-3 text-xs font-bold text-slate-800">
                  {item.fecha ? formatDate(item.fecha) : "Sin Fecha"}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider ${
                      item.tipo === "S" 
                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {item.tipo === "S" ? "SUGERENCIA" : "QUEJA"}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-bold border ${PRIORITIES[item.prioridad]?.color || ""}`}>
                      Prioridad: {PRIORITIES[item.prioridad]?.label || item.prioridad}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  <p className="font-bold text-slate-800 mb-0.5">{item.asunto}</p>
                  <p className="text-gray-500 font-medium text-[11px] leading-relaxed truncate max-w-sm" title={item.descripcion}>
                    {item.descripcion}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-indigo-650 font-bold uppercase tracking-wide">
                  {item.gerencia_nombre || "General / TI"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {item.anonimo === 1 ? (
                    <div className="flex items-center gap-1.5 text-gray-500 font-bold">
                      <EyeOff className="w-3.5 h-3.5 shrink-0" />
                      <span className="italic text-[11px]">Anónimo</span>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-800 leading-tight">{item.usuario_nombre}</p>
                      <p className="text-gray-500 text-[9px] font-bold uppercase mt-0.5 tracking-wider">
                        ÁREA: {item.area_nombre || "Sin Área"}
                      </p>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shadow-sm ${
                    item.estado === "PENDIENTE" 
                      ? "bg-amber-50 text-amber-700 border-amber-200" 
                      : item.estado === "EN PROCESO"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    {item.estado}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-slate-450 text-xs font-bold uppercase tracking-wider bg-white">
                No hay sugerencias registradas que coincidan con los filtros.
              </td>
            </tr>
          )}
        </ERPTable>
      </div>

      {/* REGISTRATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => !isSubmitting && setShowModal(false)}
          />
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-lg border border-slate-100 relative z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Nueva Sugerencia / Queja
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Tu opinión es muy importante para nosotros. Escribe en detalle la sugerencia o reporte de queja.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tipo de Registro <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-bold text-slate-700 bg-slate-50/50"
                  >
                    <option value="S">SUGERENCIA / MEJORA</option>
                    <option value="Q">QUEJA / ERROR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Prioridad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(Number(e.target.value))}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-bold text-slate-700 bg-slate-50/50"
                  >
                    <option value={1}>1 - BAJA</option>
                    <option value={2}>2 - MEDIA</option>
                    <option value={3}>3 - ALTA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Área del Remitente
                </label>
                <input
                  type="text"
                  value={user?.area_nombre?.toUpperCase() || "SIN ÁREA ASIGNADA"}
                  disabled
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 font-bold text-slate-400 bg-slate-100/50 cursor-not-allowed uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Gerencia Destinada <span className="text-red-500">*</span>
                </label>
                <select
                  value={idGerencia}
                  onChange={(e) => setIdGerencia(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-bold text-slate-700 bg-slate-50/50"
                  required
                >
                  <option value="">-- SELECCIONAR GERENCIA DESTINO --</option>
                  {gerencias.map(g => (
                    <option key={g.id_gerencia} value={g.id_gerencia}>{g.nombre.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Asunto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="Ej. Problema al descargar formatos"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-semibold text-slate-700 bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Descripción de Queja o Sugerencia <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe detalladamente tu propuesta o la queja..."
                  rows={4}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-semibold text-slate-700 bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Solucion / Medida Correctiva
                </label>
                <textarea
                  value={solucion}
                  onChange={(e) => setSolucion(e.target.value)}
                  placeholder="Escribe la solución o medida correctiva propuesta..."
                  rows={3}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-semibold text-slate-700 bg-slate-50/50"
                />
              </div>

              {/* OPCIÓN ANÓNIMO */}
              <div 
                onClick={() => setAnonimo(anonimo === 0 ? 1 : 0)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  anonimo === 1 
                    ? "border-purple-400 bg-purple-50/30" 
                    : "border-slate-200 hover:bg-slate-50/50"
                }`}
              >
                <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${
                  anonimo === 1 ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300 bg-white"
                }`}>
                  {anonimo === 1 && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Enviar de forma Anónima</p>
                  <p className="text-[9px] text-slate-400">Protege tu identidad. Ningún usuario podrá ver tu nombre en el sistema.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <ERPButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Registrando..." : "Enviar Registro"}
                </ERPButton>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

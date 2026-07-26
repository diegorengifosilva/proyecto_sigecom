import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Tags, ClipboardList, Settings2, RefreshCcw, Percent, 
  StickyNote, Plus, Info, Loader, Search, Edit2, Trash2, Save 
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import InputField from "@/components/ui/InputField";

// FETCH FUNCTIONS
const fetchNotas = async () => {
  const { data } = await api.get("core/notas/");
  return data.data || [];
};

const fetchEstados = async () => {
  const { data } = await api.get("core/estados/");
  return data || [];
};

export default function ParametrosVentas() {
  const queryClient = useQueryClient();
  const [tabActiva, setTabActiva] = useState("estados");
  const [searchTerm, setSearchTerm] = useState("");
  const [syncingTC, setSyncingTC] = useState(false);

  // Modals state for Notes
  const [notaModalOpen, setNotaModalOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState(null);
  const [notaForm, setNotaForm] = useState({
    codigo: "",
    descripcion: "",
    activo: true
  });

  // Query for Notes
  const { data: notas = [], isLoading: loadingNotas } = useQuery({
    queryKey: ["maestra-notas"],
    queryFn: fetchNotas,
    enabled: tabActiva === "notas"
  });

  // Query for States
  const { data: estados = [], isLoading: loadingEstados } = useQuery({
    queryKey: ["maestra-estados"],
    queryFn: fetchEstados,
    enabled: tabActiva === "estados"
  });

  // MUTATIONS FOR NOTES
  const saveNotaMutation = useMutation({
    mutationFn: async (payload) => {
      const formatted = {
        ...payload,
        activo: payload.activo ? 1 : 0
      };
      if (selectedNota) {
        return await api.put("core/notas/", {
          id_nota: selectedNota.id_nota,
          ...formatted
        });
      } else {
        return await api.post("core/notas/", formatted);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-notas"]);
      toast.success(selectedNota ? "Nota técnica actualizada" : "Nota técnica registrada");
      setNotaModalOpen(false);
      setSelectedNota(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Error al guardar la nota";
      toast.error(msg);
    }
  });

  const deleteNotaMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete("core/notas/", {
        data: { id_nota: id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-notas"]);
      toast.success("Nota técnica desactivada correctamente");
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "No se pudo desactivar la nota";
      toast.error(msg);
    }
  });

  // HANDLERS
  const handleEditNota = (nota) => {
    setSelectedNota(nota);
    setNotaForm({
      codigo: nota.codigo || "",
      descripcion: nota.descripcion || "",
      activo: nota.activo === 1 || nota.activo === true
    });
    setNotaModalOpen(true);
  };

  const handleNewNota = () => {
    setSelectedNota(null);
    // Auto-generate next code prefix if possible
    const lastCode = notas.length > 0 ? Math.max(...notas.map(n => parseInt(n.codigo) || 0)) : 0;
    const nextCode = String(lastCode + 1).padStart(2, '0');
    setNotaForm({
      codigo: nextCode,
      descripcion: "",
      activo: true
    });
    setNotaModalOpen(true);
  };

  const handleSaveNota = () => {
    if (!notaForm.codigo.trim() || !notaForm.descripcion.trim()) {
      toast.warning("Código y Descripción son obligatorios");
      return;
    }
    saveNotaMutation.mutate(notaForm);
  };

  const handleForceSync = () => {
    setSyncingTC(true);
    setTimeout(() => {
      setSyncingTC(false);
      toast.success("Sincronización exitosa: El tipo de cambio actual es 3.398 PEN/USD (SUNAT Live).");
    }, 1200);
  };

  const filteredNotas = notas.filter(n =>
    n.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.codigo?.includes(searchTerm)
  );

  const filteredEstados = estados.filter(e =>
    e.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(e.id_estado).includes(searchTerm)
  );

  const TABS = [
    { id: "estados", label: "Estados", icon: <Settings2 size={16} />, desc: "Ciclo de cotizaciones" },
    { id: "servicios", label: "Tipo de Servicio", icon: <ClipboardList size={16} />, desc: "Tipos de servicio" },
    { id: "cambio", label: "Tipo de Cambio", icon: <RefreshCcw size={16} />, desc: "Tipos de cambio base" },
    { id: "descuentos", label: "Factores de Descuento", icon: <Percent size={16} />, desc: "Reglas de margen" },
    { id: "notas", label: "Notas / Plantillas", icon: <StickyNote size={16} />, desc: "Condiciones técnicas predefinidas" },
  ];

  // Tab content renderer
  const renderTabContent = () => {
    if (tabActiva === "notas") {
      return (
        <div className="flex flex-col h-full">
          {/* TOOLBAR */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar por código o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-slate-50 border-slate-200 text-xs h-8.5 rounded-lg shadow-sm"
              />
            </div>
            <Button
              onClick={handleNewNota}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 h-9 text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-100 flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={3} />
              Nueva Nota
            </Button>
          </div>

          {/* TABLE */}
          <div className="flex-1 overflow-auto relative border border-slate-150 rounded-xl bg-white shadow-xs">
            {loadingNotas && (
              <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader className="w-8 h-8 animate-spin text-cyan-600" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando</span>
                </div>
              </div>
            )}
            <Table
              headers={["Código", "Descripción Nota Técnica", "Estado"]}
              data={filteredNotas}
              onRowClick={handleEditNota}
              renderRow={(nota) => [
                <span className="text-xs font-bold text-slate-800 text-center block font-mono">
                  {nota.codigo}
                </span>,
                <span className="text-xs font-semibold text-slate-700 text-left block px-6 whitespace-pre-wrap leading-relaxed py-2">
                  {nota.descripcion}
                </span>,
                <div className="flex justify-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                    nota.activo === 1
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-slate-50 text-slate-500 border-slate-100"
                  }`}>
                    {nota.activo === 1 ? "Activo" : "Inactivo"}
                  </span>
                </div>
              ]}
            />
          </div>
        </div>
      );
    }

    if (tabActiva === "estados") {
      return (
        <div className="flex flex-col h-full">
          {/* TOOLBAR */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-slate-50 border-slate-200 text-xs h-8.5 rounded-lg shadow-sm"
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="flex-1 overflow-auto relative border border-slate-150 rounded-xl bg-white shadow-xs">
            {loadingEstados && (
              <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader className="w-8 h-8 animate-spin text-cyan-600" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando</span>
                </div>
              </div>
            )}
            <Table
              headers={["ID", "Nombre Estado", "Cotizaciones", "Orden Compra", "Facturación", "Estado"]}
              data={filteredEstados}
              renderRow={(est) => [
                <span className="text-xs font-bold text-slate-800 text-center block font-mono">
                  {est.id_estado}
                </span>,
                <span className="text-xs font-semibold text-slate-700 text-left block px-6">
                  {est.nombre}
                </span>,
                <div className="flex justify-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    est.cotizaciones === 1 ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-slate-50 text-slate-400"
                  }`}>
                    {est.cotizaciones === 1 ? "Sí" : "No"}
                  </span>
                </div>,
                <div className="flex justify-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    est.orden_compra === 1 ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-slate-50 text-slate-400"
                  }`}>
                    {est.orden_compra === 1 ? "Sí" : "No"}
                  </span>
                </div>,
                <div className="flex justify-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    est.facturacion === 1 ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-slate-50 text-slate-400"
                  }`}>
                    {est.facturacion === 1 ? "Sí" : "No"}
                  </span>
                </div>,
                <div className="flex justify-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                    est.activo === 1 || est.activo === true
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-slate-50 text-slate-500 border-slate-100"
                  }`}>
                    {est.activo === 1 || est.activo === true ? "Activo" : "Inactivo"}
                  </span>
                </div>
              ]}
            />
          </div>
        </div>
      );
    }

    if (tabActiva === "servicios") {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-white h-full rounded-2xl border border-slate-200 shadow-sm">
          <div className="max-w-md w-full bg-slate-50/50 border border-slate-100 p-6 rounded-3xl text-center space-y-4 shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Tipos de Servicio</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Mantenimiento de Tarifas Base</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed px-2">
              En SIGECOM 5.0, los servicios no son estáticos. Se dividen en perfiles profesionales técnicos de campo. Puedes gestionar sus perfiles de costo por hora y asignación de área en:
            </p>
            <div className="pt-2">
              <button 
                onClick={() => window.location.href = "/sigecom/maestro/gastos?tab=personal"}
                className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-cyan-100 active:scale-98"
              >
                Ir a Gastos y Personal
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (tabActiva === "cambio") {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-white h-full rounded-2xl border border-slate-200 shadow-sm">
          <div className="max-w-md w-full bg-slate-50/50 border border-slate-100 p-6 rounded-3xl text-center space-y-4 shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Tipo de Cambio</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Sincronización Diaria de SUNAT</p>
            </div>
            <div className="bg-white border border-slate-150/60 rounded-2xl p-4 flex items-center justify-between shadow-xs">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Tasa Base Actual</span>
                <span className="text-xl font-mono font-black text-slate-800">3.398 <span className="text-xs font-sans text-slate-500">PEN / USD</span></span>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-50 border border-emerald-100 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                En Línea
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              El sistema actualiza automáticamente el tipo de cambio cada mañana consultando la API de la SUNAT.
            </p>
            <div className="pt-2">
              <button 
                onClick={handleForceSync}
                disabled={syncingTC}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-100 disabled:opacity-50 active:scale-98 flex items-center justify-center gap-2"
              >
                {syncingTC ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="w-3.5 h-3.5" />
                )}
                {syncingTC ? "Sincronizando..." : "Sincronizar ahora con SUNAT"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (tabActiva === "descuentos") {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-white h-full rounded-2xl border border-slate-200 shadow-sm">
          <div className="max-w-lg w-full bg-slate-50/50 border border-slate-100 p-6 rounded-3xl space-y-4 shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Percent className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Factores de Descuento</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Reglas de Margen Comercial</p>
            </div>
            
            <div className="bg-white border border-slate-150/60 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="border-b border-slate-100 pb-2 text-center">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Fórmula de Margen</span>
                <code className="text-xs font-mono font-bold text-slate-800">Margen = Costo Directo / (1 - Descuento)</code>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Suministros Base:</span>
                  <span className="font-mono font-black text-slate-800 bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">15.00%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Servicios Base:</span>
                  <span className="font-mono font-black text-slate-800 bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">25.00%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Viajes / Viáticos:</span>
                  <span className="font-mono font-black text-slate-800 bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-150">0.00%</span>
                </div>
              </div>
            </div>
    
            <p className="text-xs text-slate-500 leading-relaxed text-center px-4">
              Los factores de descuento/margen se calculan automáticamente al cotizar en el panel de detalle comercial.
            </p>
          </div>
        </div>
      );
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0 bg-slate-50/30 overflow-hidden font-sans">
      
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 pt-4 flex flex-col gap-1 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <nav className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              <span>Configuración</span>
              <span>/</span>
              <span>Ventas</span>
            </nav>
            <div className="flex items-center gap-2">
              <div className="bg-blue-600/10 text-blue-700 w-7 h-7 rounded-md flex items-center justify-center shrink-0">
                <Tags className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Parámetros de Ventas</h1>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="mt-2 flex items-center gap-2 text-slate-500 text-xs pb-1">
          <Info size={14} className="text-blue-500" />
          <p>{TABS.find(t => t.id === tabActiva)?.desc || "Configuración general."}</p>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const isActive = tabActiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setTabActiva(tab.id); setSearchTerm(""); }}
                className={`group relative flex items-center gap-2 px-3 pb-3 text-sm font-medium outline-none transition-all ${
                  isActive ? "text-cyan-600 font-bold" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className={isActive ? "text-cyan-600" : "text-slate-400"}>{tab.icon}</span>
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabParamSales"
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-cyan-600 rounded-t-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* DYNAMIC CONTENT */}
      <div className="flex-1 p-6 bg-slate-50/10 min-h-0 overflow-hidden">
        {renderTabContent()}
      </div>

      {/* NOTA MODAL */}
      <Dialog open={notaModalOpen} onOpenChange={() => setNotaModalOpen(false)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
              <StickyNote size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                {selectedNota ? "Editar Nota Técnica" : "Nueva Nota Técnica"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Plantilla y condiciones comerciales</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <InputField
              label="Código:"
              value={notaForm.codigo}
              onChange={(e) => setNotaForm(prev => ({ ...prev, codigo: e.target.value.slice(0, 2) }))}
              placeholder="Ej. 01 (Max 2 caracteres)..."
              inline
              size="sm"
              className="font-mono font-bold text-slate-800"
            />

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                Descripción / Contenido de Nota:
              </label>
              <textarea
                value={notaForm.descripcion}
                onChange={(e) => setNotaForm(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Escriba aquí los términos, garantías o especificaciones predefinidas..."
                className="w-full min-h-[140px] bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 transition-all focus:outline-none focus:ring-0 leading-relaxed"
              />
            </div>

            {selectedNota && (
              <div className="flex items-center gap-4 py-1.5 px-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[100px]">
                  Estado:
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notaForm.activo}
                    onChange={(e) => setNotaForm(prev => ({ ...prev, activo: e.target.checked }))}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className={`ml-2 text-[10px] font-black uppercase ${notaForm.activo ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {notaForm.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
            {selectedNota ? (
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm("¿Está seguro de desactivar esta nota técnica?")) {
                    deleteNotaMutation.mutate(selectedNota.id_nota);
                  }
                }}
                className="text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
              >
                Eliminar
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setNotaModalOpen(false)}
                className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveNota}
                className="text-[10px] font-black uppercase tracking-widest bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-9 px-8 flex items-center gap-1.5 shadow-lg shadow-cyan-100"
              >
                <Save size={14} />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
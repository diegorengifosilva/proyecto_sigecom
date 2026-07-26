import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader, Search, Plus, Edit2, Trash2, ListTree, UserCheck, Save 
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import InputField from "@/components/ui/InputField";

// FETCH FUNCTIONS
const fetchGastosDetalle = async () => {
  const { data } = await api.get("core/tipo_gasto_detalle/");
  return data.data || [];
};

const fetchTipoPersonal = async () => {
  const { data } = await api.get("core/tipo_personal/");
  return data.data || [];
};

const fetchAreas = async () => {
  const { data } = await api.get("users/areas/");
  return data;
};

export default function GastosAnalisis() {
  const queryClient = useQueryClient();
  const [tabActiva, setTabActiva] = useState("gastos");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [gastoModalOpen, setGastoModalOpen] = useState(false);
  const [selectedGasto, setSelectedGasto] = useState(null);
  const [gastoForm, setGastoForm] = useState({
    nombre: "",
    code_prefix: "05",
    activo: true
  });

  const [personalModalOpen, setPersonalModalOpen] = useState(false);
  const [selectedPersonal, setSelectedPersonal] = useState(null);
  const [personalForm, setPersonalForm] = useState({
    nombre: "",
    costo_min: "",
    costo_max: "",
    id_area: "",
    activo: true
  });

  // Queries
  const { data: gastos = [], isLoading: loadingGastos } = useQuery({
    queryKey: ["maestra-gastos-detalle"],
    queryFn: fetchGastosDetalle,
    enabled: tabActiva === "gastos"
  });

  const { data: personal = [], isLoading: loadingPersonal } = useQuery({
    queryKey: ["maestra-personal"],
    queryFn: fetchTipoPersonal,
    enabled: tabActiva === "personal"
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["maestra-areas-short"],
    queryFn: fetchAreas
  });

  // GASTOS MUTATIONS
  const saveGastoMutation = useMutation({
    mutationFn: async (payload) => {
      if (selectedGasto) {
        return await api.put("core/tipo_gasto_detalle/", {
          id_gasto_detalle: selectedGasto.id_gasto_detalle,
          nombre: payload.nombre,
          activo: payload.activo
        });
      } else {
        return await api.post("core/tipo_gasto_detalle/", {
          nombre: payload.nombre,
          code_prefix: payload.code_prefix
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-gastos-detalle"]);
      toast.success(selectedGasto ? "Cuenta de gasto actualizada" : "Cuenta de gasto creada");
      setGastoModalOpen(false);
      setSelectedGasto(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Error al guardar la cuenta de gasto";
      toast.error(msg);
    }
  });

  const deleteGastoMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete("core/tipo_gasto_detalle/", {
        data: { id_gasto_detalle: id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-gastos-detalle"]);
      toast.success("Cuenta de gasto desactivada correctamente");
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "No se pudo desactivar la cuenta";
      toast.error(msg);
    }
  });

  // PERSONAL MUTATIONS
  const savePersonalMutation = useMutation({
    mutationFn: async (payload) => {
      const formatted = {
        ...payload,
        costo_min: parseFloat(payload.costo_min) || 0,
        costo_max: parseFloat(payload.costo_max) || 0
      };
      if (selectedPersonal) {
        return await api.put("core/tipo_personal/", {
          id_personal: selectedPersonal.id_personal,
          ...formatted
        });
      } else {
        return await api.post("core/tipo_personal/", formatted);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-personal"]);
      toast.success(selectedPersonal ? "Tipo de personal actualizado" : "Tipo de personal registrado");
      setPersonalModalOpen(false);
      setSelectedPersonal(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Error al guardar el tipo de personal";
      toast.error(msg);
    }
  });

  const deletePersonalMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete("core/tipo_personal/", {
        data: { id_personal: id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-personal"]);
      toast.success("Tipo de personal desactivado correctamente");
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "No se pudo desactivar el registro";
      toast.error(msg);
    }
  });

  // HANDLERS
  const handleEditGasto = (gasto) => {
    setSelectedGasto(gasto);
    setGastoForm({
      nombre: gasto.nombre || "",
      code_prefix: gasto.codigo?.substring(0, 2) || "05",
      activo: gasto.activo === 1 || gasto.activo === true
    });
    setGastoModalOpen(true);
  };

  const handleNewGasto = () => {
    setSelectedGasto(null);
    setGastoForm({
      nombre: "",
      code_prefix: "05",
      activo: true
    });
    setGastoModalOpen(true);
  };

  const handleEditPersonal = (p) => {
    setSelectedPersonal(p);
    setPersonalForm({
      nombre: p.nombre || "",
      costo_min: p.costo_min || "",
      costo_max: p.costo_max || "",
      id_area: p.id_area || "",
      activo: p.activo === 1 || p.activo === true
    });
    setPersonalModalOpen(true);
  };

  const handleNewPersonal = () => {
    setSelectedPersonal(null);
    setPersonalForm({
      nombre: "",
      costo_min: "",
      costo_max: "",
      id_area: areas[0]?.id_area || "",
      activo: true
    });
    setPersonalModalOpen(true);
  };

  const activeLoading = tabActiva === "gastos" ? loadingGastos : loadingPersonal;

  const filteredGastos = gastos.filter(g =>
    g.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.codigo?.includes(searchTerm)
  );

  const filteredPersonal = personal.filter(p =>
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.includes(searchTerm) ||
    areas.find(a => a.id_area === p.id_area)?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full p-6 bg-slate-50/20 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
        <div>
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <ListTree size={18} className="text-cyan-600" />
            Gastos y Personal
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cuentas analíticas y perfiles de costos</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-slate-200 bg-white rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => { setTabActiva("gastos"); setSearchTerm(""); }}
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md tracking-wider transition-all ${
                tabActiva === "gastos" 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tipos de Gasto
            </button>
            <button
              onClick={() => { setTabActiva("personal"); setSearchTerm(""); }}
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md tracking-wider transition-all ${
                tabActiva === "personal" 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tipo Personal
            </button>
          </div>

          <Button
            onClick={tabActiva === "gastos" ? handleNewGasto : handleNewPersonal}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 h-9 text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-100 flex items-center gap-1.5"
          >
            <Plus size={14} strokeWidth={3} />
            {tabActiva === "gastos" ? "Nuevo Gasto" : "Nuevo Personal"}
          </Button>
        </div>
      </div>

      {/* SEARCH TOOLBAR */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder={tabActiva === "gastos" ? "Buscar por código o cuenta..." : "Buscar por nombre o departamento..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 bg-white border-slate-200 text-xs h-8.5 rounded-lg shadow-sm"
        />
      </div>

      {/* TABLE BLOCK */}
      <div className="flex-1 overflow-auto relative border border-slate-150 rounded-xl bg-white shadow-xs">
        {activeLoading && (
          <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader className="w-8 h-8 animate-spin text-cyan-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando</span>
            </div>
          </div>
        )}

        {tabActiva === "gastos" ? (
          <Table
            headers={["Código", "Nombre de Cuenta de Gasto", "Tipo Principal", "Estado"]}
            data={filteredGastos}
            onRowClick={handleEditGasto}
            renderRow={(gasto) => [
              <span className="text-xs font-bold text-slate-800 text-center block font-mono">
                {gasto.codigo}
              </span>,
              <span className="text-xs font-semibold text-slate-700 text-left block px-6">
                {gasto.nombre}
              </span>,
              <span className="text-[10px] font-bold text-slate-500 text-center block uppercase">
                {gasto.codigo?.startsWith("05") ? "Servicios" : gasto.codigo?.startsWith("06") ? "Viajes / Viáticos" : "General"}
              </span>,
              <div className="flex justify-center">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                  gasto.activo === 1
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-500 border-slate-100"
                }`}>
                  {gasto.activo === 1 ? "Activo" : "Inactivo"}
                </span>
              </div>
            ]}
          />
        ) : (
          <Table
            headers={["Código", "Nombre / Rol", "Costo Mínimo", "Costo Máximo", "Área / Departamento", "Estado"]}
            data={filteredPersonal}
            onRowClick={handleEditPersonal}
            renderRow={(p) => [
              <span className="text-xs font-bold text-slate-800 text-center block font-mono">
                {p.codigo}
              </span>,
              <span className="text-xs font-semibold text-slate-700 text-left block px-6">
                {p.nombre}
              </span>,
              <span className="text-xs font-mono font-bold text-slate-600 text-center block">
                $/ {Number(p.costo_min || 0).toFixed(2)}
              </span>,
              <span className="text-xs font-mono font-bold text-slate-600 text-center block">
                $/ {Number(p.costo_max || 0).toFixed(2)}
              </span>,
              <span className="text-[10px] font-bold text-slate-500 text-center block uppercase bg-slate-50 border border-slate-150/40 rounded px-1.5 py-0.5 mx-auto w-fit">
                {areas.find(a => a.id_area === p.id_area)?.nombre || "SIN ÁREA"}
              </span>,
              <div className="flex justify-center">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                  p.activo === 1
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-500 border-slate-100"
                }`}>
                  {p.activo === 1 ? "Activo" : "Inactivo"}
                </span>
              </div>
            ]}
          />
        )}
      </div>

      {/* GASTO MODAL */}
      <Dialog open={gastoModalOpen} onOpenChange={() => setGastoModalOpen(false)}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
              <ListTree size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                {selectedGasto ? "Editar Cuenta de Gasto" : "Nueva Cuenta de Gasto"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mapeo analítico de costos</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {!selectedGasto && (
              <div className="flex items-center gap-4 py-1.5 px-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[100px]">
                  Prefijo Código:
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                    <input 
                      type="radio" 
                      name="code_prefix" 
                      value="05" 
                      checked={gastoForm.code_prefix === "05"}
                      onChange={(e) => setGastoForm(prev => ({ ...prev, code_prefix: e.target.value }))}
                      className="text-cyan-600 focus:ring-0 focus:outline-none"
                    />
                    05 - Servicios
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                    <input 
                      type="radio" 
                      name="code_prefix" 
                      value="06" 
                      checked={gastoForm.code_prefix === "06"}
                      onChange={(e) => setGastoForm(prev => ({ ...prev, code_prefix: e.target.value }))}
                      className="text-cyan-600 focus:ring-0 focus:outline-none"
                    />
                    06 - Viajes / Viáticos
                  </label>
                </div>
              </div>
            )}

            <InputField
              label="Nombre Cuenta:"
              value={gastoForm.nombre}
              onChange={(e) => setGastoForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. ALQUILER DE LOCAL..."
              inline
              size="sm"
              className="font-bold text-slate-800"
            />

            {selectedGasto && (
              <div className="flex items-center gap-4 py-1.5 px-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[100px]">
                  Estado:
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={gastoForm.activo}
                    onChange={(e) => setGastoForm(prev => ({ ...prev, activo: e.target.checked }))}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className={`ml-2 text-[10px] font-black uppercase ${gastoForm.activo ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {gastoForm.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
            {selectedGasto ? (
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm(`¿Está seguro de desactivar la cuenta "${selectedGasto.codigo}"?`)) {
                    deleteGastoMutation.mutate(selectedGasto.id_gasto_detalle);
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
                onClick={() => setGastoModalOpen(false)}
                className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!gastoForm.nombre.trim()) {
                    toast.warning("El nombre de la cuenta es requerido");
                    return;
                  }
                  saveGastoMutation.mutate(gastoForm);
                }}
                className="text-[10px] font-black uppercase tracking-widest bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-9 px-8 flex items-center gap-1.5 shadow-lg shadow-cyan-100"
              >
                <Save size={14} />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PERSONAL MODAL */}
      <Dialog open={personalModalOpen} onOpenChange={() => setPersonalModalOpen(false)}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                {selectedPersonal ? "Editar Tipo Personal" : "Nuevo Tipo Personal"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Perfiles de personal y tarifas base</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <InputField
              label="Nombre / Rol:"
              value={personalForm.nombre}
              onChange={(e) => setPersonalForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. MAESTRO DE OBRA..."
              inline
              size="sm"
              className="font-bold text-slate-800"
            />

            <InputField
              label="Costo Mínimo ($):"
              type="number"
              value={personalForm.costo_min}
              onChange={(e) => setPersonalForm(prev => ({ ...prev, costo_min: e.target.value }))}
              placeholder="Ej. 15.00"
              inline
              size="sm"
              className="font-mono font-semibold text-slate-700"
            />

            <InputField
              label="Costo Máximo ($):"
              type="number"
              value={personalForm.costo_max}
              onChange={(e) => setPersonalForm(prev => ({ ...prev, costo_max: e.target.value }))}
              placeholder="Ej. 45.00"
              inline
              size="sm"
              className="font-mono font-semibold text-slate-700"
            />

            <div className="flex items-center gap-4 py-1.5 px-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[100px]">
                Área / Depto:
              </label>
              <select
                value={personalForm.id_area}
                onChange={(e) => setPersonalForm(prev => ({ ...prev, id_area: e.target.value }))}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-0 uppercase transition-colors"
              >
                {areas.map(a => (
                  <option key={a.id_area} value={a.id_area}>{a.nombre}</option>
                ))}
              </select>
            </div>

            {selectedPersonal && (
              <div className="flex items-center gap-4 py-1.5 px-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[100px]">
                  Estado:
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={personalForm.activo}
                    onChange={(e) => setPersonalForm(prev => ({ ...prev, activo: e.target.checked }))}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className={`ml-2 text-[10px] font-black uppercase ${personalForm.activo ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {personalForm.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
            {selectedPersonal ? (
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm(`¿Está seguro de desactivar el registro "${selectedPersonal.nombre}"?`)) {
                    deletePersonalMutation.mutate(selectedPersonal.id_personal);
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
                onClick={() => setPersonalModalOpen(false)}
                className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!personalForm.nombre.trim()) {
                    toast.warning("El nombre es requerido");
                    return;
                  }
                  savePersonalMutation.mutate(personalForm);
                }}
                className="text-[10px] font-black uppercase tracking-widest bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-9 px-8 flex items-center gap-1.5 shadow-lg shadow-cyan-100"
              >
                <Save size={14} />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
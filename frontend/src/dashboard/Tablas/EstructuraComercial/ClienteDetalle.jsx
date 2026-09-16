import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Building2, UserCheck, Plus, Save, Trash2, Mail, Phone, Globe, MapPin, Loader, CheckCircle2, AlertCircle, Edit2
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import InputField from "@/components/ui/InputField";
import SelectField from "@/components/ui/SelectField";
import Table from "@/components/ui/table";
import RepresentanteModal from "./Modal/RepresentanteModal";
import { generarIniciales } from "@/utils/formatters";

export default function ClienteDetalle({ cliente, onBack }) {
  const queryClient = useQueryClient();
  const idCliente = cliente?.id_cliente;

  // ESTADO DE FORMULARIO DE CLIENTE
  const [formData, setFormData] = useState({
    codigo: cliente?.id_cliente_formateado || String(cliente?.id_cliente || "").padStart(5, '0'),
    nombre: cliente?.nombre || "",
    iniciales: cliente?.iniciales || "",
    ruc: cliente?.ruc || "",
    direccion: cliente?.direccion || cliente?.dir || "",
    tipo: cliente?.tipo || 0,
    forma_pago: cliente?.forma_pago || "",
    pagina_web: cliente?.pagina_web || cliente?.web || "",
    representante_legal: cliente?.representante_legal || cliente?.rleg || "",
    ubicacion: cliente?.ubicacion || cliente?.ubic || "",
    activo: String(cliente?.activo === true || cliente?.activo === "1" || cliente?.activo === 1 ? "1" : "0"),
  });

  const [dirty, setDirty] = useState(false);

  // MODAL PARA AÑADIR/EDITAR REPRESENTANTES DE ESTE CLIENTE
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);

  // CARGAR REPRESENTANTES DEL CLIENTE ESPECÍFICO
  const { data: representantes = [], isLoading: isLoadingReps, isFetching: isFetchingReps, refetch: refetchReps } = useQuery({
    queryKey: ["representantes-cliente", idCliente],
    queryFn: async () => {
      if (!idCliente) return [];
      const { data } = await api.get(`core/representantes/?id_cliente=${idCliente}`);
      return data.filter(r => r.nombre_representante !== null && r.nombre_representante.trim() !== "");
    },
    enabled: !!idCliente,
  });

  // MUTACIÓN PARA GUARDAR DATOS DEL CLIENTE
  const saveClienteMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.put("core/clientes/", payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(["maestra-clientes"]);
      toast.success("Empresa actualizada correctamente");
      setDirty(false);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Error al actualizar la empresa";
      toast.error(msg);
    }
  });

  // MUTACIÓN PARA ELIMINAR CLIENTE
  const deleteClienteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete("core/clientes/", { data: { id_cliente: id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-clientes"]);
      toast.success("Empresa eliminada correctamente");
      if (onBack) onBack();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "No se pudo eliminar la empresa";
      toast.error(msg);
    }
  });

  // MUTACIÓN PARA GUARDAR REPRESENTANTE DE ESTE CLIENTE
  const saveRepMutation = useMutation({
    mutationFn: async (repPayload) => {
      const isEdit = !!repPayload.id_representante;
      if (isEdit) {
        return await api.put("core/representantes/", repPayload);
      } else {
        return await api.post("core/representantes/", repPayload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["representantes-cliente", idCliente]);
      queryClient.invalidateQueries(["maestra-representantes"]);
      toast.success(`Representante ${selectedRep ? 'actualizado' : 'registrado'} correctamente`);
      setRepModalOpen(false);
      setSelectedRep(null);
    },
    onError: (err) => {
      const errorData = err.response?.data;
      const msg = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
      toast.error(msg || "Error al guardar el representante");
    }
  });

  // MUTACIÓN PARA ELIMINAR REPRESENTANTE DE ESTE CLIENTE
  const deleteRepMutation = useMutation({
    mutationFn: async (idRep) => {
      return await api.delete("core/representantes/", { data: { id_representante: idRep } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["representantes-cliente", idCliente]);
      queryClient.invalidateQueries(["maestra-representantes"]);
      toast.success("Representante eliminado correctamente");
      setRepModalOpen(false);
      setSelectedRep(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Error al eliminar representante";
      toast.error(msg);
    }
  });

  const handleClienteChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "ruc" && value.length > 11) return;

    setFormData((prev) => {
      const nextData = {
        ...prev,
        [name]: name === "activo"
          ? (checked ? "1" : "0")
          : (type === "checkbox" ? (checked ? "1" : "0") : value),
      };
      if (name === "nombre" && (!prev.iniciales || prev.iniciales === generarIniciales(prev.nombre || ""))) {
        nextData.iniciales = generarIniciales(value);
      }
      return nextData;
    });
    setDirty(true);
  };

  const handleSaveCliente = () => {
    if (!formData.nombre?.trim()) {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }
    if (formData.ruc && formData.ruc.length !== 11) {
      toast.error("El RUC debe tener exactamente 11 dígitos");
      return;
    }

    const payload = {
      ...formData,
      id_cliente: idCliente,
      tipo: parseInt(formData.tipo) || 0,
      activo: formData.activo === "1" || formData.activo === 1 ? 1 : 0
    };

    saveClienteMutation.mutate(payload);
  };

  const handleDeleteCliente = () => {
    if (window.confirm(`¿Está seguro de eliminar la empresa "${formData.nombre}"?`)) {
      deleteClienteMutation.mutate(idCliente);
    }
  };

  const handleAddRep = () => {
    setSelectedRep(null);
    setRepModalOpen(true);
  };

  const handleEditRep = (rep) => {
    setSelectedRep(rep);
    setRepModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4 font-sans overflow-y-auto custom-scrollbar p-1">
      {/* 1️⃣ HEADER / BARRA DE NAVEGACIÓN SUPERIOR */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Volver a Clientes</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
              <Building2 size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  {formData.codigo}
                </span>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight truncate max-w-[320px] sm:max-w-md">
                  {formData.nombre || "Sin Nombre"}
                </h2>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Detalle y Gestión de Representantes Asociados
              </p>
            </div>
          </div>
        </div>

        {/* ACCIONES DEL CLIENTE */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleDeleteCliente}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            title="Eliminar Empresa"
          >
            <Trash2 size={15} />
            <span>Eliminar</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCliente}
            disabled={saveClienteMutation.isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Save size={15} />
            <span>{saveClienteMutation.isLoading ? "Guardando..." : "Guardar Cambios"}</span>
          </button>
        </div>
      </div>

      {/* 2️⃣ PANEL COCKPIT DE DATOS DE LA EMPRESA */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-5 space-y-4 shrink-0">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="text-cyan-600" size={16} />
            Datos de la Empresa Cliente
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            formData.activo === "1"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-500 border-slate-200"
          }`}>
            {formData.activo === "1" ? "Estado: Activo" : "Estado: Inactivo"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InputField
            label="Código:"
            name="codigo"
            value={formData.codigo}
            readOnly
            inline size="sm"
            className="bg-slate-50 border-none font-mono font-bold text-slate-500"
          />

          <InputField
            label="RUC:"
            name="ruc"
            value={formData.ruc}
            onChange={handleClienteChange}
            inline size="sm"
            className="font-bold text-slate-800 font-mono"
            placeholder="11 dígitos"
          />

          <InputField
            label="Nombre / Razón Social:"
            name="nombre"
            value={formData.nombre}
            onChange={handleClienteChange}
            inline size="sm"
            className="font-bold text-slate-800"
            containerClassName="col-span-1 sm:col-span-2"
          />

          <InputField
            label="Iniciales:"
            name="iniciales"
            value={formData.iniciales}
            onChange={handleClienteChange}
            inline size="sm"
            className="font-bold text-slate-800 uppercase"
          />

          <SelectField
            label="Tipo Empresa:"
            name="tipo"
            value={formData.tipo}
            onChange={handleClienteChange}
            inline size="sm"
            options={[
              { value: 0, label: "Nacional" },
              { value: 1, label: "Extranjero" },
              { value: 2, label: "Especial / Otro" }
            ]}
          />

          <InputField
            label="Dirección:"
            name="direccion"
            value={formData.direccion}
            onChange={handleClienteChange}
            inline size="sm"
            className="font-bold text-slate-800"
            containerClassName="col-span-1 sm:col-span-2"
          />

          <InputField
            label="Página Web:"
            name="pagina_web"
            value={formData.pagina_web}
            onChange={handleClienteChange}
            inline size="sm"
            className="font-medium text-blue-600"
            placeholder="https://empresa.com"
          />

          <InputField
            label="Representante Legal:"
            name="representante_legal"
            value={formData.representante_legal}
            onChange={handleClienteChange}
            inline size="sm"
            className="font-bold text-slate-800"
          />

          <InputField
            label="Ubicación / Ciudad:"
            name="ubicacion"
            value={formData.ubicacion}
            onChange={handleClienteChange}
            inline size="sm"
            className="font-bold text-slate-800"
          />

          <div className="flex items-center gap-3 pt-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Activo:</label>
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo === "1"}
              onChange={handleClienteChange}
              className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3️⃣ TABLA DE REPRESENTANTES Y CONTACTOS ASOCIADOS */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-5 space-y-4 flex-1 min-h-[300px] flex flex-col">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-50 rounded-lg text-cyan-700">
              <UserCheck size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Representantes y Contactos Directos
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Personas de contacto registradas para {formData.nombre} ({representantes.length})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddRep}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Nuevo Representante</span>
          </button>
        </div>

        {/* CONTENEDOR DE TABLA DE REPRESENTANTES */}
        <div className="flex-1 min-h-0 overflow-hidden relative rounded-xl border border-slate-200 bg-white">
          {(isLoadingReps || isFetchingReps) && (
            <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader className="w-6 h-6 animate-spin text-cyan-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cargando Representantes</span>
              </div>
            </div>
          )}

          {representantes.length === 0 && !isLoadingReps ? (
            <div className="w-full h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
              <UserCheck size={32} className="opacity-40" />
              <span className="text-xs font-bold uppercase tracking-wider">No hay representantes registrados para esta empresa</span>
              <button
                type="button"
                onClick={handleAddRep}
                className="mt-2 text-xs font-bold text-cyan-600 hover:underline uppercase"
              >
                + Registrar primer representante
              </button>
            </div>
          ) : (
            <Table
              disablePagination={true}
              headers={[
                "Código", "Representante", "Cargo", "Contacto", "Email", "Estado", "Acciones"
              ].map((h) => (
                <span key={h} className="text-xs font-black py-2 uppercase tracking-widest text-slate-700 text-center block">
                  {h}
                </span>
              ))}
              data={representantes}
              onRowClick={(rep) => handleEditRep(rep)}
              renderRow={(rep) => [
                <span key="cod" className="text-xs font-bold text-slate-600 text-center block font-mono">
                  {rep.id_rep_formateado || String(rep.id_representante).padStart(5, '0')}
                </span>,

                <span key="rep" className="text-xs font-bold text-slate-900 text-left block px-3 truncate max-w-[220px]">
                  {rep.nombre_representante}
                </span>,

                <span key="cargo" className="text-[11px] font-medium text-slate-600 text-center block italic">
                  {rep.cargo || "-"}
                </span>,

                <div key="contact" className="flex flex-col text-center">
                  <span className="text-xs font-mono font-bold text-slate-800">{rep.telefono || rep.movil || "-"}</span>
                  {rep.telefono && rep.movil && <span className="text-[9px] text-slate-400 font-mono">{rep.movil}</span>}
                </div>,

                <span key="email" className="text-xs text-blue-600 text-center block underline decoration-blue-200 underline-offset-2 truncate max-w-[200px]">
                  {rep.email || "-"}
                </span>,

                <div key="est" className="flex justify-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                    rep.activo === true || rep.activo === "1" || rep.activo === 1
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-slate-50 text-slate-500 border-slate-100"
                  }`}>
                    {(rep.activo === true || rep.activo === "1" || rep.activo === 1) ? "Activo" : "Inactivo"}
                  </span>
                </div>,

                <div key="act" className="flex justify-center items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditRep(rep);
                    }}
                    className="p-1 hover:bg-slate-100 text-slate-600 hover:text-cyan-700 rounded-lg transition-colors"
                    title="Editar Representante"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`¿Eliminar al representante "${rep.nombre_representante}"?`)) {
                        deleteRepMutation.mutate(rep.id_representante);
                      }
                    }}
                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Eliminar Representante"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ]}
            />
          )}
        </div>
      </div>

      {/* MODAL DE REGISTRO/EDICIÓN DE REPRESENTANTES */}
      {repModalOpen && (
        <RepresentanteModal
          open={repModalOpen}
          onClose={() => {
            setRepModalOpen(false);
            setSelectedRep(null);
          }}
          repData={selectedRep ? { ...selectedRep, id_cliente: idCliente } : { id_cliente: idCliente }}
          representantes={representantes}
          onGuardar={(data) => {
            saveRepMutation.mutate({ ...data, id_cliente: idCliente });
          }}
          onEliminar={(idRep) => deleteRepMutation.mutate(idRep)}
        />
      )}
    </div>
  );
}

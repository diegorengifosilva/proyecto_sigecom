import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader, Search, MoreHorizontal, ChartSpline, Plus, Edit2, Trash2
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClienteModal from "../Modal/ClienteModal";

const fetchClientes = async () => {
  const { data } = await api.get("core/clientes/");
  // Filtramos: que exista 'nombre' y no sea solo espacios
  return data.filter(c => c.nombre !== null && c.nombre.trim() !== "");
};

export default function TablaClientes() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // ESTADOS PARA EL MODAL
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  const { data: clientes = [], isLoading, isFetching } = useQuery({
    queryKey: ["maestra-clientes"],
    queryFn: fetchClientes,
  });

  // MUTACIÓN PARA GUARDAR/ACTUALIZAR
  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      const esEdicion = !!selectedCliente;

      if (esEdicion) {
        // IMPORTANTE: Asegúrate que el endpoint acepte PUT sin ID en la URL 
        // o añade el ID si tu backend lo requiere: `core/clientes/${formData.codigo}/`
        return await api.put(`core/clientes/`, formData);
      } else {
        return await api.post("core/clientes/", formData);
      }
    },
    onSuccess: (response) => {
      // ⚡ Invalida la caché para refrescar la tabla
      queryClient.invalidateQueries(["maestra-clientes"]);

      // Mostramos el mensaje que viene de Django
      const mensaje = response.data?.message || "Operación exitosa";
      toast.success(mensaje, {
        description: `La empresa ${selectedCliente ? 'se actualizó' : 'se registró'} correctamente.`
      });

      setModalOpen(false);
      setSelectedCliente(null);
    },
    onError: (error) => {
      // Si Django devuelve errores de validación (ej: RUC duplicado)
      const errorData = error.response?.data;
      const mensajeError = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);

      toast.error("Error al guardar", {
        description: mensajeError || "No se pudo conectar con el servidor"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (codigo) => {
      // 1. Quitamos ${codigo} de la URL para que coincida con tu endpoint principal
      // 2. Enviamos el código en el objeto 'data' (el body del DELETE)
      return await api.delete(`core/clientes/`, {
        data: { codigo: codigo }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-clientes"]);
      toast.success("Empresa eliminada correctamente");
      setModalOpen(false);
      setSelectedCliente(null);
    },
    onError: (error) => {
      // Capturamos el mensaje de error que configuramos en el backend
      const msg = error.response?.data?.error || "Error al eliminar";
      toast.error("No se pudo eliminar", {
        description: msg
      });
    }
  });

  const handleEdit = (cliente) => {
    setSelectedCliente(cliente);
    setModalOpen(true);
  };

  const handleNew = () => {
    setSelectedCliente(null);
    setModalOpen(true);
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ruc?.includes(searchTerm) ||
    String(c.codigo).includes(searchTerm)
  );

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Search size={18} className="text-cyan-600" />
            Empresas Clientes
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Base de datos de empresas y clientes</p>
        </div>
        <Button
          onClick={handleNew}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 h-9 text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-100 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={14} strokeWidth={3} />
          Nueva Empresa
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input 
          placeholder="Buscar por código, nombre o RUC..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 bg-white border-slate-200 text-xs h-8.5 rounded-lg shadow-sm"
        />
      </div>

      {/* TABLA */}
      <div className="flex-1 overflow-auto relative rounded-xl border border-slate-200 bg-white shadow-sm">
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader className="w-8 h-8 animate-spin text-cyan-600" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sincronizando</span>
            </div>
          </div>
        )}

        <Table
          headers={[
            "Código", "Nombre", "Iniciales", "RUC", "Tipo", "Actividad", "Estado"
          ].map((h) => (
            <span className="text-xs font-black py-2 uppercase tracking-widest text-slate-700 text-center block">
              {h}
            </span>
          ))}

          data={clientesFiltrados}
          onRowClick={(cliente) => handleEdit(cliente)}

          renderRow={(cliente) => [
            <span className="text-xs font-bold text-slate-600 text-center block">
              {cliente.codigo}
            </span>,

            <span className="text-xs font-semibold text-slate-800 text-left block px-4">
              {cliente.nombre}
            </span>,

            <span className="text-xs font-medium text-slate-500 text-center block uppercase">
              {cliente.iniciales}
            </span>,

            <span className="text-xs font-mono font-bold text-slate-600 text-center block">
              {cliente.ruc}
            </span>,

            <span className="text-[10px] font-bold text-slate-500 text-center block uppercase">
              {cliente.tipo}
            </span>,

            <span className="text-xs font-medium text-slate-500 text-left block px-4 truncate max-w-[150px]">
              {cliente.pro}
            </span>,

            <div className="flex justify-center">
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                // En tu DB 'activo' es varchar(1), manejamos '1' como activo
                cliente.activo === "1" || cliente.activo === true
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-slate-50 text-slate-500 border-slate-100"
                }`}>
                {(cliente.activo === "1" || cliente.activo === true) ? "Activo" : "Inactivo"}
              </span>
            </div>
          ]}
        />
      </div>

      {/* COMPONENTE MODAL - Lo crearemos a continuación */}
      <ClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clienteData={selectedCliente}
        clientes={clientes}
        onGuardar={(data) => saveMutation.mutate(data)}
        onEliminar={(codigo) => deleteMutation.mutate(codigo)}
      />
    </div>
  );
}
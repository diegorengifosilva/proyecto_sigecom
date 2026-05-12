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
    <div className="flex flex-col h-full p-6">
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar empresa/cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all h-9 text-sm rounded-md shadow-sm"
            />
          </div>

          <Button
            onClick={handleNew}
            className="bg-cyan-600 hover:bg-cyan-700 text-white h-9 px-4 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-cyan-100 flex gap-2 items-center"
          >
            <Plus size={16} strokeWidth={3} />
            Nueva Empresa
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
            <ChartSpline className="w-4 h-4 text-slate-500" />
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
            <MoreHorizontal className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
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
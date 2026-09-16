import React, { useState, useEffect } from "react";
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
import useResponsivePageSize from "@/hook/useResponsivePageSize";

const fetchClientes = async () => {
  const { data } = await api.get("core/clientes/");
  // Filtramos: que exista 'nombre' y no sea solo espacios
  return data.filter(c => c.nombre !== null && c.nombre.trim() !== "");
};

export default function TablaClientes({
  title = "Empresas Clientes",
  subtitle = "Directorio de clientes y empresas registradas",
  buttonLabel = "Nuevo Cliente"
}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, tableAreaRef] = useResponsivePageSize();

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
        return await api.put(`core/clientes/`, formData);
      } else {
        return await api.post("core/clientes/", formData);
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(["maestra-clientes"]);
      const mensaje = response.data?.message || "Operación exitosa";
      toast.success(mensaje, {
        description: `La empresa ${selectedCliente ? 'se actualizó' : 'se registró'} correctamente.`
      });
      setModalOpen(false);
      setSelectedCliente(null);
    },
    onError: (error) => {
      const msg = error.response?.data?.error || "Error al procesar";
      toast.error("No se pudo guardar la empresa", {
        description: msg
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (idCliente) => {
      return await api.delete(`core/clientes/`, {
        data: { id_cliente: idCliente }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-clientes"]);
      toast.success("Empresa eliminada correctamente");
      setModalOpen(false);
      setSelectedCliente(null);
    },
    onError: (error) => {
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
    (c.id_cliente_formateado && String(c.id_cliente_formateado).includes(searchTerm)) ||
    String(c.id_cliente).includes(searchTerm)
  );

  const totalPages = Math.ceil(clientesFiltrados.length / pageSize) || 1;
  const paginatedClientes = clientesFiltrados.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      {/* TOOLBAR UNIFICADO: BÚSQUEDA A LA IZQUIERDA, BOTÓN ACCIÓN A LA DERECHA */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 shrink-0">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input 
            placeholder="Buscar por código, nombre o RUC..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 bg-white border-slate-200 text-xs h-8.5 rounded-lg shadow-xs"
          />
        </div>

        <Button
          onClick={handleNew}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 h-8.5 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <Plus size={14} strokeWidth={3} />
          {buttonLabel}
        </Button>
      </div>

      {/* TABLA */}
      <div ref={tableAreaRef} className="flex-1 min-h-0 overflow-hidden relative rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader className="w-8 h-8 animate-spin text-cyan-600" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sincronizando</span>
            </div>
          </div>
        )}

        <Table
          disablePagination={false}
          pagination={{
            currentPage: currentPage,
            totalPages: totalPages,
            total: clientesFiltrados.length,
            from: clientesFiltrados.length > 0 ? (currentPage - 1) * pageSize + 1 : 0,
            to: Math.min(currentPage * pageSize, clientesFiltrados.length),
            onPageChange: (p) => setCurrentPage(p)
          }}
          headers={[
            "Código", "Nombre", "Iniciales", "RUC", "Dirección", "Estado"
          ].map((h) => (
            <span key={h} className="text-xs font-black py-2 uppercase tracking-widest text-slate-700 text-center block">
              {h}
            </span>
          ))}

          data={paginatedClientes}
          onRowClick={(cliente) => handleEdit(cliente)}

          renderRow={(cliente) => [
            <span key="cod" className="text-xs font-bold text-slate-600 text-center block font-mono">
              {cliente.id_cliente_formateado || String(cliente.id_cliente).padStart(5, '0')}
            </span>,

            <span key="nom" className="text-xs font-semibold text-slate-800 text-left block px-4 truncate max-w-[220px]">
              {cliente.nombre}
            </span>,

            <span key="ini" className="text-xs font-medium text-slate-500 text-center block uppercase">
              {cliente.iniciales || "-"}
            </span>,

            <span key="ruc" className="text-xs font-mono font-bold text-slate-600 text-center block">
              {cliente.ruc || "-"}
            </span>,

            <span key="dir" className="text-xs font-medium text-slate-500 text-left block px-4 truncate max-w-[200px]">
              {cliente.direccion || "-"}
            </span>,

            <div key="est" className="flex justify-center">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                cliente.activo === true || cliente.activo === "1"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-slate-50 text-slate-500 border-slate-100"
                }`}>
                {(cliente.activo === true || cliente.activo === "1") ? "Activo" : "Inactivo"}
              </span>
            </div>
          ]}
        />
      </div>

      <ClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clienteData={selectedCliente}
        clientes={clientes}
        onGuardar={(data) => saveMutation.mutate(data)}
        onEliminar={(idCliente) => deleteMutation.mutate(idCliente)}
      />
    </div>
  );
}
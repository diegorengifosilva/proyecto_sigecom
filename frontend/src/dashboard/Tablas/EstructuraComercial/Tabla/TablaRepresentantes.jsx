import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader, Search, MoreHorizontal, ChartSpline, Plus, UserCheck 
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";

import Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RepresentanteModal from "../Modal/RepresentanteModal";
import useResponsivePageSize from "@/hook/useResponsivePageSize";

const fetchRepresentantes = async () => {
  const { data } = await api.get("core/representantes/");
  return data.filter(r => r.nombre_representante !== null && r.nombre_representante.trim() !== "");
};

export default function TablaRepresentantes() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, tableAreaRef] = useResponsivePageSize();
  
  // ESTADOS PARA EL MODAL
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);

  const { data: representantes = [], isLoading, isFetching } = useQuery({
    queryKey: ["maestra-representantes"],
    queryFn: fetchRepresentantes,
  });

  // MUTACIÓN PARA GUARDAR/ACTUALIZAR
  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      const esEdicion = !!selectedRep; 
      if (esEdicion) {
        return await api.put(`core/representantes/`, formData);
      } else {
        return await api.post("core/representantes/", formData);
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(["maestra-representantes"]);
      const mensaje = response.data?.message || "Operación exitosa";
      toast.success(mensaje, {
        description: `El representante se ${selectedRep ? 'actualizó' : 'registró'} correctamente.`
      });
      setModalOpen(false);
      setSelectedRep(null);
    },
    onError: (error) => {
      const errorData = error.response?.data;
      const mensajeError = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
      toast.error("Error al guardar", {
        description: mensajeError || "No se pudo conectar con el servidor"
      });
    }
  });

  // MUTACIÓN PARA ELIMINAR
  const deleteMutation = useMutation({
    mutationFn: async (idRepresentante) => {
      return await api.delete(`core/representantes/`, { 
        data: { id_representante: idRepresentante } 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-representantes"]);
      toast.success("Representante eliminado correctamente");
      setModalOpen(false);
      setSelectedRep(null);
    },
    onError: (error) => {
      const msg = error.response?.data?.error || "Error al eliminar";
      toast.error("No se pudo eliminar", {
        description: msg
      });
    }
  });

  const handleEdit = (rep) => {
    setSelectedRep(rep);
    setModalOpen(true);
  };

  const handleNew = () => {
    setSelectedRep(null);
    setModalOpen(true);
  };

  // FILTRO MULTICAMPO: Nombre, Cargo, Empresa o Código
  const repsFiltrados = representantes.filter(r => 
    r.nombre_representante?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.nombre_empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.id_rep_formateado && String(r.id_rep_formateado).includes(searchTerm)) ||
    String(r.id_representante).includes(searchTerm)
  );

  const totalPages = Math.ceil(repsFiltrados.length / pageSize) || 1;
  const paginatedReps = repsFiltrados.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            placeholder="Buscar por nombre, cargo o empresa..."
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
          Nuevo Representante
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
            total: repsFiltrados.length,
            from: repsFiltrados.length > 0 ? (currentPage - 1) * pageSize + 1 : 0,
            to: Math.min(currentPage * pageSize, repsFiltrados.length),
            onPageChange: (p) => setCurrentPage(p)
          }}
          headers={[
            "Código", "Representante", "Cargo", "Contacto", "Email", "Empresa", "Estado"
          ].map((h) => (
            <span key={h} className="text-xs font-black py-2 uppercase tracking-widest text-slate-700 text-center block">
              {h}
            </span>
          ))}
          
          data={paginatedReps}
          onRowClick={(rep) => handleEdit(rep)} 

          renderRow={(rep) => [
            <span key="cod" className="text-xs font-bold text-slate-600 text-center block font-mono">
              {rep.id_rep_formateado || String(rep.id_representante).padStart(5, '0')}
            </span>,

            <span key="rep" className="text-xs font-semibold text-slate-800 text-left block px-4 truncate max-w-[200px]">
              {rep.nombre_representante}
            </span>,

            <span key="cargo" className="text-[11px] font-medium text-slate-500 text-center block italic">
              {rep.cargo || "-"}
            </span>,

            <div key="contact" className="flex flex-col text-center">
              <span className="text-xs font-mono font-bold text-slate-700">{rep.telefono || rep.movil || "-"}</span>
              {rep.telefono && rep.movil && <span className="text-[9px] text-slate-400">{rep.movil}</span>}
            </div>,

            <span key="email" className="text-xs text-blue-600 text-center block underline decoration-blue-200 underline-offset-2 truncate max-w-[180px]">
              {rep.email || "-"}
            </span>,

            <span key="empresa" className="text-[10px] font-bold text-slate-600 text-center block uppercase bg-slate-100 rounded py-0.5 px-1 mx-2 truncate max-w-[160px]">
              {rep.nombre_empresa || "-"}
            </span>,

            <div key="est" className="flex justify-center">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                rep.activo === true || rep.activo === "1" || rep.activo === 1
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                  : "bg-slate-50 text-slate-500 border-slate-100"
              }`}>
                {(rep.activo === true || rep.activo === "1" || rep.activo === 1) ? "Activo" : "Inactivo"}
              </span>
            </div>
          ]}
        />
      </div>

      {modalOpen && (
        <RepresentanteModal 
            open={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setSelectedRep(null);
            }}
            repData={selectedRep}
            representantes={representantes}
            onGuardar={(data) => saveMutation.mutate(data)}
            onEliminar={(idRepresentante) => deleteMutation.mutate(idRepresentante)}
        />
      )}
    </div>
  );
}
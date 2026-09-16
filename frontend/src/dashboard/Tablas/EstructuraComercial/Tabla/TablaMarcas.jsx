import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader, Search, Plus, Edit2, Trash2, Tag, CheckCircle, XCircle 
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import InputField from "@/components/ui/InputField";
import useResponsivePageSize from "@/hook/useResponsivePageSize";

const fetchMarcas = async () => {
  const { data } = await api.get("core/tipo_marca/");
  return Array.isArray(data) ? data : [];
};

export default function TablaMarcas() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, tableAreaRef] = useResponsivePageSize();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMarca, setSelectedMarca] = useState(null);
  const [nombre, setNombre] = useState("");
  const [activo, setActivo] = useState(true);

  // Query
  const { data: marcas = [], isLoading, isFetching } = useQuery({
    queryKey: ["maestra-marcas-tabla"],
    queryFn: fetchMarcas,
  });

  // Save / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const formattedName = nombre.trim().toUpperCase();
      if (!formattedName) {
        throw new Error("El nombre de la marca es requerido");
      }

      if (selectedMarca) {
        return await api.put("core/tipo_marca/", {
          id_marca: selectedMarca.id_marca,
          nombre: formattedName,
          activo: activo ? "1" : "0"
        });
      } else {
        return await api.post("core/tipo_marca/", {
          nombre: formattedName,
          activo: "1"
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-marcas-tabla"]);
      queryClient.invalidateQueries(["maestra-marcas"]);
      toast.success(selectedMarca ? "Marca actualizada correctamente" : "Marca registrada con éxito");
      setModalOpen(false);
      setSelectedMarca(null);
      setNombre("");
    },
    onError: (err) => {
      const msg = err.response?.data?.error || err.message || "Error al guardar la marca";
      toast.error(msg);
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (marcaId) => {
      return await api.delete("core/tipo_marca/", {
        data: { id_marca: marcaId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-marcas-tabla"]);
      queryClient.invalidateQueries(["maestra-marcas"]);
      toast.success("Marca desactivada correctamente");
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "No se pudo desactivar la marca";
      toast.error(msg);
    }
  });

  const handleNew = () => {
    setSelectedMarca(null);
    setNombre("");
    setActivo(true);
    setModalOpen(true);
  };

  const handleEdit = (marca, e) => {
    if (e) e.stopPropagation();
    setSelectedMarca(marca);
    setNombre(marca.nombre || "");
    setActivo(marca.activo === "1" || marca.activo === 1 || marca.activo === true);
    setModalOpen(true);
  };

  const handleDelete = (marca, e) => {
    if (e) e.stopPropagation();
    if (confirm(`¿Está seguro de desactivar la marca "${marca.nombre}"?`)) {
      deleteMutation.mutate(marca.id_marca);
    }
  };

  // Filter
  const marcasFiltradas = marcas.filter(m => {
    const codeStr = String(m.id_marca).padStart(5, "0");
    const formattedCode = `MAR-${codeStr}`;
    return (
      m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formattedCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      codeStr.includes(searchTerm)
    );
  });

  const totalPages = Math.ceil(marcasFiltradas.length / pageSize) || 1;
  const paginatedMarcas = marcasFiltradas.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            placeholder="Buscar por código o nombre de marca..."
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
          Nueva Marca
        </Button>
      </div>

      {/* CONTENEDOR DE TABLA */}
      <div ref={tableAreaRef} className="flex-1 min-h-0 overflow-hidden relative border border-slate-150 rounded-xl bg-white shadow-xs flex flex-col">
        {(isLoading || isFetching || saveMutation.isPending || deleteMutation.isPending) && (
          <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader className="w-8 h-8 animate-spin text-cyan-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando</span>
            </div>
          </div>
        )}

        <Table
          disablePagination={false}
          pagination={{
            currentPage: currentPage,
            totalPages: totalPages,
            total: marcasFiltradas.length,
            from: marcasFiltradas.length > 0 ? (currentPage - 1) * pageSize + 1 : 0,
            to: Math.min(currentPage * pageSize, marcasFiltradas.length),
            onPageChange: (p) => setCurrentPage(p)
          }}
          headers={["Código", "Nombre de Marca", "Estado", "Acciones"]}
          data={paginatedMarcas}
          onRowClick={handleEdit}
          renderRow={(marca) => {
            const formattedCode = `MAR-${String(marca.id_marca).padStart(5, "0")}`;
            const isActivo = marca.activo === "1" || marca.activo === 1 || marca.activo === true;

            return [
              <span key="cod" className="text-xs font-bold text-slate-800 text-center block font-mono">
                {formattedCode}
              </span>,
              <span key="nom" className="text-xs font-bold text-slate-700 text-left block px-6">
                {marca.nombre}
              </span>,
              <div key="est" className="flex justify-center">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                  isActivo
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-500 border-slate-100"
                }`}>
                  {isActivo ? "ACTIVO" : "INACTIVO"}
                </span>
              </div>,
              <div key="acc" className="flex items-center justify-center gap-2">
                <button
                  onClick={(e) => handleEdit(marca, e)}
                  title="Editar Marca"
                  className="p-1 rounded text-slate-400 hover:text-cyan-600 hover:bg-slate-100 transition-colors"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={(e) => handleDelete(marca, e)}
                  title="Desactivar Marca"
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ];
          }}
        />
      </div>

      {/* MODAL MARCA */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                {selectedMarca ? "Editar Marca" : "Nueva Marca"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gestión de fabricante y proveedor de productos</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <InputField
              label="Nombre de la Marca:"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="EJ. CISCO, RITTAL, SCHNEIDER..."
              inline
              size="sm"
              className="font-bold text-slate-800 uppercase"
            />

            {selectedMarca && (
              <div className="flex items-center gap-4 py-1.5 px-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[120px]">
                  Estado Marca:
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                  <span className="ml-3 text-xs font-bold text-slate-700">
                    {activo ? "Activo" : "Inactivo"}
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="h-8.5 px-4 text-xs font-bold text-slate-600 rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !nombre.trim()}
              className="h-8.5 px-4 text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
            >
              {saveMutation.isPending ? "Guardando..." : "Guardar Marca"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader, Search, MoreHorizontal, ChartSpline, Plus, Edit2, Trash2
} from "lucide-react";
import api from "@/services/api";

import Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CargoModal from "../Modal/CargoModal";
import useResponsivePageSize from "@/hook/useResponsivePageSize";

const fetchCargos = async () => {
  const { data } = await api.get("cotizaciones/users/cargos/");
  // Filtramos: que exista 'nombre' Y que no sea solo espacios en blanco
  return data.filter(cargo => cargo.nombre !== null && cargo.nombre.trim() !== "");
};

export default function TablaCargos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, tableAreaRef] = useResponsivePageSize();

  // ESTADOS PARA EL MODAL
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCargo, setSelectedCargo] = useState(null);

  const { data: cargos = [], isLoading, isFetching } = useQuery({
    queryKey: ["maestra-cargos"],
    queryFn: fetchCargos,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      const existe = cargos.some(c => c.codigo === formData.codigo && formData.codigo !== "NUEVO");
      if (existe) {
        return await api.put(`cotizaciones/users/cargos/`, formData);
      } else {
        return await api.post("cotizaciones/users/cargos/", formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-cargos"]);
      setModalOpen(false);
    },
  });

  const handleEdit = (cargo) => {
    setSelectedCargo(cargo);
    setModalOpen(true);
  };

  const handleNew = () => {
    setSelectedCargo(null);
    setModalOpen(true);
  };

  const cargosFiltrados = cargos.filter(c =>
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(c.codigo).includes(searchTerm)
  );

  const totalPages = Math.ceil(cargosFiltrados.length / pageSize) || 1;
  const paginatedCargos = cargosFiltrados.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            placeholder="Buscar por código o descripción..."
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
          Nuevo Cargo
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
            total: cargosFiltrados.length,
            from: cargosFiltrados.length > 0 ? (currentPage - 1) * pageSize + 1 : 0,
            to: Math.min(currentPage * pageSize, cargosFiltrados.length),
            onPageChange: (p) => setCurrentPage(p)
          }}
          headers={[
            "Código", "Nombre", "Nombre Otro", "Estado"
          ].map((h) => (
            <span key={h} className="text-xs font-black py-2 uppercase tracking-widest text-slate-700 text-center block">
              {h}
            </span>
          ))}

          data={paginatedCargos}
          onRowClick={(cargo) => handleEdit(cargo)}

          renderRow={(cargo) => [
            <span key="cod" className="text-xs font-bold text-slate-600 text-center block">
              {cargo.codigo}
            </span>,

            <span key="nom" className="text-xs font-semibold text-slate-800 text-left block px-4">
              {cargo.nombre}
            </span>,

            <span key="nom_otro" className="text-xs font-medium text-slate-500 text-left block px-4 italic">
              {cargo.nom}
            </span>,

            <div key="est" className="flex justify-center">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${cargo.activo
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-slate-50 text-slate-500 border-slate-100"
                }`}>
                {cargo.activo ? "Activo" : "Inactivo"}
              </span>
            </div>,
          ]}
        />
      </div>

      <CargoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        cargoData={selectedCargo}
        onGuardar={(data) => saveMutation.mutate(data)}
      />
    </div>
  );
}
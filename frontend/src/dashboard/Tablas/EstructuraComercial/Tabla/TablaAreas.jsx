import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader, Search, ListFilter, SlidersHorizontal,
  MoreHorizontal, ChartSpline, X, Plus, Edit2, Trash2
} from "lucide-react";
import api from "@/services/api";

import Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AreaModal from "../Modal/AreaModal";
import useResponsivePageSize from "@/hook/useResponsivePageSize";

const fetchAreas = async () => {
  const { data } = await api.get("users/areas/");
  return data;
};

export default function TablaAreas() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, tableAreaRef] = useResponsivePageSize();

  // ESTADOS PARA EL MODAL
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);

  const { data: areas = [], isLoading, isFetching } = useQuery({
    queryKey: ["maestra-areas"],
    queryFn: fetchAreas,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      if (formData.codigo === "Auto") {
        return await api.post("users/areas/", formData);
      } else {
        return await api.put(`users/areas/${formData.codigo}/`, formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-areas"]);
      setModalOpen(false);
    },
  });

  const handleEdit = (area) => {
    setSelectedArea(area);
    setModalOpen(true);
  };

  const handleNew = () => {
    setSelectedArea(null);
    setModalOpen(true);
  };

  const areasFiltradas = areas.filter(a =>
    a.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(a.codigo).includes(searchTerm)
  );

  const totalPages = Math.ceil(areasFiltradas.length / pageSize) || 1;
  const paginatedAreas = areasFiltradas.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            placeholder="Buscar por código o nombre..."
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
          Nueva Área
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
            total: areasFiltradas.length,
            from: areasFiltradas.length > 0 ? (currentPage - 1) * pageSize + 1 : 0,
            to: Math.min(currentPage * pageSize, areasFiltradas.length),
            onPageChange: (p) => setCurrentPage(p)
          }}
          headers={[
            "Código", "Nombre", "Responsable", "Correlativo", "Estado",
          ].map((h) => (
            <span key={h} className="text-xs font-black py-2 uppercase tracking-widest text-slate-700 text-center block">
              {h}
            </span>
          ))}

          data={paginatedAreas}
          onRowClick={(area) => handleEdit(area)}

          renderRow={(area) => [
            <span key="cod" className="text-xs font-bold text-slate-600 text-center block">
              {area.codigo}
            </span>,

            <span key="nom" className="text-xs font-semibold text-slate-800 text-left block px-4">
              {area.nombre}
            </span>,

            <span key="resp" className="text-xs font-medium text-slate-600 text-left block px-4">
              {area.responsable}
            </span>,

            <span key="corr" className="text-xs font-mono font-bold text-slate-500 text-center block">
              {String(area.correlativo).padStart(3, '0')}
            </span>,

            <div key="est" className="flex justify-center">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${area.activo
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-slate-50 text-slate-500 border-slate-100"
                }`}>
                {area.activo ? "Activo" : "Inactivo"}
              </span>
            </div>,
          ]}
        />
      </div>

      <AreaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        areaData={selectedArea}
        onGuardar={(data) => saveMutation.mutate(data)}
      />
    </div>
  );
}
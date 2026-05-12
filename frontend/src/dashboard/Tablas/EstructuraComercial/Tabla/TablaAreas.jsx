import React, { useState } from "react";
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

const fetchAreas = async () => {
  const { data } = await api.get("users/areas/");
  return data;
};

export default function TablaAreas() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // ESTADOS PARA EL MODAL
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);

  const { data: areas = [], isLoading, isFetching } = useQuery({
    queryKey: ["maestra-areas"],
    queryFn: fetchAreas,
  });

  // MUTACIÓN PARA GUARDAR/ACTUALIZAR (Ejemplo básico)
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

  // Función para abrir modal en modo edición
  const handleEdit = (area) => {
    setSelectedArea(area);
    setModalOpen(true);
  };

  // Función para abrir modal en modo creación
  const handleNew = () => {
    setSelectedArea(null);
    setModalOpen(true);
  };

  const areasFiltradas = areas.filter(a =>
    a.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(a.codigo).includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full p-6">
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar área..."
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
            Nueva Área
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
            "Código", "Nombre", "Responsable", "Correlativo", "Estado",
          ].map((h) => (
            <span className="text-xs font-black py-2 uppercase tracking-widest text-slate-700 text-center block">
              {h}
            </span>
          ))}

          data={areasFiltradas}

          /* CLAVE: Al dar clic en la fila, abrimos el modal de edición */
          onRowClick={(area) => handleEdit(area)}

          renderRow={(area) => [
            <span className="text-xs font-bold text-slate-600 text-center block">
              {area.codigo}
            </span>,

            <span className="text-xs font-semibold text-slate-800 text-left block px-4">
              {area.nombre}
            </span>,

            <span className="text-xs font-medium text-slate-600 text-left block px-4">
              {area.responsable}
            </span>,

            <span className="text-xs font-mono font-bold text-slate-500 text-center block">
              {String(area.correlativo).padStart(3, '0')}
            </span>,

            <div className="flex justify-center">
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${area.activo
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-slate-50 text-slate-500 border-slate-100"
                }`}>
                {area.activo ? "Activo" : "Inactivo"}
              </span>
            </div>,
          ]}
        />
      </div>

      {/* COMPONENTE MODAL */}
      <AreaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        areaData={selectedArea}
        onGuardar={(data) => saveMutation.mutate(data)}
      />
    </div>
  );
}
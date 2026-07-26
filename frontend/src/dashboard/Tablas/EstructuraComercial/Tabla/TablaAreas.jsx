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
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <ListFilter size={18} className="text-cyan-600" />
            Áreas de la Empresa
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestión de departamentos y correlativos de cotización</p>
        </div>
        <Button
          onClick={handleNew}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 h-9 text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-100 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={14} strokeWidth={3} />
          Nueva Área
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input 
          placeholder="Buscar por código o nombre..."
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
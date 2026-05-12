import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader, Search, MoreHorizontal, ChartSpline, Plus, Edit2, Trash2
} from "lucide-react";
import api from "@/services/api";

import Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CargoModal from "../Modal/CargoModal";

const fetchCargos = async () => {
  const { data } = await api.get("cotizaciones/users/cargos/");
  // Filtramos: que exista 'nombre' Y que no sea solo espacios en blanco
  return data.filter(cargo => cargo.nombre !== null && cargo.nombre.trim() !== "");
};

export default function TablaCargos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // ESTADOS PARA EL MODAL
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCargo, setSelectedCargo] = useState(null);

  const { data: cargos = [], isLoading, isFetching } = useQuery({
    queryKey: ["maestra-cargos"],
    queryFn: fetchCargos,
  });

  // MUTACIÓN PARA GUARDAR/ACTUALIZAR
  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      // Si el cargo ya existe (estamos editando), usamos PUT
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

  return (
    <div className="flex flex-col h-full p-6">
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar cargo..."
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
            Nuevo Cargo
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
            "Código", "Nombre", "Nombre Otro", "Estado"
          ].map((h) => (
            <span className="text-xs font-black py-2 uppercase tracking-widest text-slate-700 text-center block">
              {h}
            </span>
          ))}

          data={cargosFiltrados}
          onRowClick={(cargo) => handleEdit(cargo)}

          renderRow={(cargo) => [
            <span className="text-xs font-bold text-slate-600 text-center block">
              {cargo.codigo}
            </span>,

            <span className="text-xs font-semibold text-slate-800 text-left block px-4">
              {cargo.nombre}
            </span>,

            <span className="text-xs font-medium text-slate-500 text-left block px-4 italic">
              {cargo.nom}
            </span>,

            <div className="flex justify-center">
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${cargo.activo
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
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InputField from "@/components/ui/InputField";
import SelectField from "../../components/ui/SelectField";
import api from "@/services/api";
import { Tags, X, Check, FolderTree } from "lucide-react";

export default function SubgrupoModal({ open, onClose, onConfirm, subgrupo = null }) {
  const [form, setForm] = useState({ tipoGasto: "", nombre: "" });
  const [tiposGasto, setTiposGasto] = useState([]);

  // ==========================
  // Reset y carga al abrir
  // ==========================
  useEffect(() => {
    if (!open) return;

    if (subgrupo) {
      // ✏️ EDICIÓN
      setForm({
        tipoGasto: subgrupo.tipoCodigo || "",
        nombre: subgrupo.titulo || "",
      });
    } else {
      // ➕ NUEVO
      setForm({ tipoGasto: "", nombre: "" });
    }
  }, [open, subgrupo]);

  useEffect(() => {
    if (!open) return;

    const fetchTiposGasto = async () => {
      try {
        const res = await api.get("/core/tipo_gasto/");
        const data = Array.isArray(res.data) ? res.data : [];
        const activos = data.filter((t) => t.concepto === "1");
        setTiposGasto(activos);
      } catch (error) {
        console.error("Error cargando tipos de gasto", error);
        setTiposGasto([]);
      }
    };

    fetchTiposGasto();
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!form.tipoGasto) return;

    onConfirm({
      ...form,
      _key: subgrupo?.id,           // id del subgrupo si estamos editando
      servicioId: subgrupo?.servicioId, // id del servicio al que pertenece
    });

    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">

        {/* HEADER MODERNO */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <FolderTree size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                {subgrupo ? "Editar Subgrupo" : "Nuevo Subgrupo"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Categorización y tipos de gasto
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO FORMULARIO */}
        <div className="p-2">
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">

            {/* TIPO DE GASTO */}
            <SelectField
              inline
              size="sm"
              label="Tipo de Gasto:"
              name="tipoGasto"
              value={form.tipoGasto}
              onChange={handleChange}
              options={tiposGasto.map((t) => ({
                id: t.codigo,
                nombre: t.nombre,
              }))}
              className="text-xs font-semibold focus:ring-teal-500/20"
            />

            {/* NOMBRE SUBGRUPO */}
            <InputField
              inline
              size="sm"
              label="Nombre Grupo:"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder=""
              className="text-xs font-semibold focus:ring-teal-500/20"
            />

          </div>
        </div>

        {/* FOOTER CON BOTONES GHOST */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-xl transition-all"
          >
            Salir
          </Button>
          <Button
            variant="ghost"
            onClick={handleSubmit}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-teal-700 hover:bg-teal-100 rounded-xl transition-all"
          >
            {subgrupo ? "Guardar cambios" : "Agregar Subgrupo"}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

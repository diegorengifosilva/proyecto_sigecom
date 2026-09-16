import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InputField from "@/components/ui/InputField";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useEffect, useState } from "react";
import { Layers3, Settings2, FileText, X, Check } from "lucide-react";
import { quillListKeyboard } from "@/utils/quillListKeyboard";

export default function ServicioModal({ open, onClose, onAceptar, servicio = null }) {
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [lineasPdf, setLineasPdf] = useState(0);
  const [detalle, setDetalle] = useState("");

  useEffect(() => {
    if (!open) return;

    if (servicio) {
      // ✏️ MODO EDICIÓN
      setNombre(servicio.tituloGeneral || servicio.nombre || "");
      setCantidad(servicio.cantidad ?? 1);
      setLineasPdf(servicio.lineasPdf ?? 0);
      setDetalle(servicio.detalle || "");
    } else {
      // ➕ MODO CREACIÓN
      setNombre("");
      setCantidad(1);
      setLineasPdf(0);
      setDetalle("");
    }
  }, [open, servicio]);

  if (!open) return null;

  const handleAceptar = () => {
    if (!nombre.trim()) return;
    if (Number(cantidad) <= 0) return;

    onAceptar({
      nombre: nombre.toUpperCase().trim(),
      cantidad: Number(cantidad),
      lineasPdf: Number(lineasPdf),
      detalle,
      _key: servicio?.id,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
        
        {/* HEADER MODERNO */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <Settings2 size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                {servicio ? "Editar Servicio" : "Agregar Servicio"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Configuración de prestaciones y detalles técnicos
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-2 space-y-2">
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
            
            {/* NOMBRE SERVICIO */}
            <InputField
              inline
              size="sm"
              label="Nombre Servicio:"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              className="text-xs font-semibold focus:ring-teal-500/20"
              placeholder=""
            />

            <div className="grid grid-cols-2 gap-4">
              {/* CANTIDAD */}
              <InputField
                inline
                size="sm"
                type="number"
                min={1}
                label="Cantidad:"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="text-xs font-bold focus:ring-teal-500/20"
              />

              {/* LÍNEAS PDF */}
              <InputField
                inline
                size="sm"
                type="number"
                min={0}
                label="Líneas PDF:"
                value={lineasPdf}
                onChange={(e) => setLineasPdf(e.target.value)}
                className="text-xs font-bold focus:ring-teal-500/20"
              />
            </div>

            {/* EDITOR DE TEXTO ENRIQUECIDO */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 ml-1">
                <FileText size={14} className="text-slate-600" />
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                  Detalle del Servicio:
                </label>
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden quill-modern-container">
                <ReactQuill
                  value={detalle}
                  onChange={setDetalle}
                  theme="snow"
                  modules={{
                    toolbar: [
                      ["bold", "italic"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      [{ indent: "-1" }, { indent: "+1" }],
                      ["blockquote"],
                    ],
                    keyboard: quillListKeyboard,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
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
            onClick={handleAceptar}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-teal-700 hover:bg-teal-100 rounded-xl transition-all"
          >
            {servicio ? "Guardar cambios" : "Agregar Servicio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

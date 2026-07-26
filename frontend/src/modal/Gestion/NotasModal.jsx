// src/dashboard/cotizaciones/NotasModal.jsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, TextCursorInput, X, FileText, Check, AlertTriangle } from "lucide-react";
import api from "../../services/api";

export default function NotasModal({ open, onClose, onAceptar }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notasDB, setNotasDB] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [filtro, setFiltro] = useState("");

  // Cargar notas desde tu nuevo backend al abrir
  useEffect(() => {
    if (!open) return;
    setSeleccionados(new Set()); // Limpiar selección previa
    setError(null);

    const fetchNotas = async () => {
      setLoading(true);
      try {
        const res = await api.get("/core/notas/");
        // Mantenemos la lógica de mostrar solo activos: '1'
        setNotasDB(res.data.filter((n) => n.activo === "1"));
      } catch (err) {
        console.error("Error cargando notas:", err);
        setError("No se pudieron cargar las notas técnicas desde el servidor.");
      } finally {
        setLoading(false);
      }
    };
    fetchNotas();
  }, [open]);

  // Manejo de check/uncheck múltiple
  const toggleSeleccion = (codigo) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) {
        next.delete(codigo);
      } else {
        next.add(codigo);
      }
      return next;
    });
  };

  const handleAceptar = () => {
    // Obtenemos los textos de las notas seleccionadas en el orden original
    const textosSeleccionados = notasDB
      .filter((n) => seleccionados.has(n.codigo))
      .map((n) => n.nombre);

    // Le pasamos los textos al padre
    if (onAceptar) onAceptar(textosSeleccionados);
    onClose();
  };

  const notasFiltradas = notasDB.filter(
    (n) =>
      n.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      n.codigo.includes(filtro)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* max-w-2xl para que sea más angosto y parezca submodal */}
      <DialogContent className="max-w-3xl h-[80vh] p-0 overflow-hidden flex flex-col bg-white border border-slate-200 shadow-2xl rounded-2xl animate-in fade-in zoom-in duration-200">

        {/* HEADER MODERNO */}
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-100 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl">
              <FileText size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Insertar Cláusulas Técnicas
              </h3>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                Selecciona las notas prediseñadas de la base de datos
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-slate-400">
            <X size={16} />
          </Button>
        </div>

        {/* BUSCADOR FIJO */}
        <div className="px-5 py-3 border-b bg-white shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500" size={16} strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Buscar por palabra clave (ej: 'garantía', 'viáticos')..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-bold focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
        </div>

        {/* CONTENIDO (TABLA MEJORADA) */}
        <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
              Cargando notas...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 text-center py-12 px-6 border border-dashed border-red-200 bg-red-50 rounded-xl">
              <AlertTriangle className="text-red-500" size={32} />
              <p className="text-xs font-bold text-red-900 leading-relaxed">{error}</p>
            </div>
          ) : notasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest italic">
              No se encontraron notas técnicos
            </div>
          ) : (
            <div className="space-y-1">
              {notasFiltradas.map((nota, index) => (
                <div
                  key={nota.codigo || index}
                  onClick={() => toggleSeleccion(nota.codigo)}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${seleccionados.has(nota.codigo)
                      ? "bg-sky-50 border-sky-200 shadow-sm"
                      : "bg-white border-transparent hover:border-slate-100 hover:bg-slate-50 hover:shadow-inner"
                    }`}
                >
                  {/* CHECKBOX MODERNO */}
                  <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${seleccionados.has(nota.codigo)
                      ? "bg-sky-600 border-sky-600"
                      : "border-slate-200 group-hover:border-sky-300"
                    }`}>
                    {seleccionados.has(nota.codigo) && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>

                  {/* TEXTO */}
                  <div className="flex-1 leading-relaxed">
                    <p className={`text-xs ${seleccionados.has(nota.codigo) ? "text-sky-950 font-medium" : "text-slate-600"}`}>
                      {nota.nombre}
                    </p>
                  </div>

                  {/* CÓDIGO (opcional, como en tu imagen) */}
                  <div className="shrink-0 text-[9px] font-mono text-slate-300 bg-slate-100 px-1 py-0.5 rounded">
                    {nota.codigo || 'S/C'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER DE GESTIÓN */}
        <div className="bg-white border-t border-slate-100 px-6 py-3.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
            <TextCursorInput size={14} className="text-sky-500" /> Se insertarán las notas seleccionadas en el editor
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-[11px] font-black uppercase tracking-widest text-red-700 hover:bg-red-50 rounded-xl h-9"
            >
              Cancelar
            </Button>

            <Button
              onClick={handleAceptar}
              disabled={seleccionados.size === 0}
              className={`text-[11px] font-black uppercase tracking-widest px-8 rounded-xl h-9 transition-all ${seleccionados.size > 0
                  ? "bg-sky-600 text-white hover:bg-sky-700 shadow"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
            >
              Insertar {seleccionados.size > 0 ? `(${seleccionados.size})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
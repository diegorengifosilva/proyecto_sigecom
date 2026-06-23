import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, Search, X, Building2, Loader2 } from "lucide-react";

function EncargadosModal({ open, onClose, empresa, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEncargados = async (q = "") => {
    if (!empresa) return;

    setLoading(true);
    try {
      const { data } = await api.get(
        `/core/clientes/${empresa}/encargados/`,
        { params: { q } }
      );
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching encargados:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Cargar base al abrir o cambiar empresa
  useEffect(() => {
    if (open && empresa) {
      setQuery("");
      fetchEncargados("");
    }
  }, [open, empresa]);

  // 🔹 Búsqueda con debounce
  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(() => {
      fetchEncargados(query.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden">

        {/* HEADER MODERNO */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <User size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Seleccionar Encargado
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Responsables asociados a la empresa
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 space-y-4">
          {/* ALERTA SI NO HAY EMPRESA */}
          {!empresa && (
            <div className="flex items-center gap-2 p-3 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl animate-pulse">
              <Building2 size={14} />
              DEBE SELECCIONAR UNA EMPRESA ANTES DE CONTINUAR
            </div>
          )}

          {/* INPUT DE BÚSQUEDA ESTILO ERP */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código o nombre..."
              disabled={!empresa}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium transition-all focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-500 animate-spin" size={16} />
            )}
          </div>

          {/* LISTA CON DISEÑO DE TARJETAS */}
          <div className="max-h-72 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {!loading && results.length === 0 && empresa && (
              <div className="py-10 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay resultados</p>
              </div>
            )}

            {results.map((encargado) => (
              <div
                key={encargado.codigo}
                onClick={() => {
                  onSelect(encargado);
                  onClose();
                }}
                className="group flex items-center gap-4 px-4 py-3 cursor-pointer rounded-xl border border-transparent hover:border-teal-200 hover:bg-teal-50/50 transition-all duration-200"
              >
                {/* CÓDIGO CON ESTILO BADGE */}
                <div className="text-[10px] font-black bg-slate-100 text-slate-500 group-hover:bg-[#0d767e] group-hover:text-white rounded-lg px-2 py-1.5 transition-colors min-w-[70px] text-center">
                  {encargado.codigo}
                </div>

                {/* INFO */}
                <div className="flex-grow">
                  <p className="text-xs font-black text-slate-700 group-hover:text-[#0d767e] transition-colors">
                    {encargado.representante}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">
                    {encargado.cargo || "Sin cargo definido"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER LIMPIO */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EncargadosModal;

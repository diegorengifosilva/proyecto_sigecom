import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Search, X, Loader2, Mail, Phone, ShieldCheck } from "lucide-react"; // Iconografía moderna

function ContactosModal({ open, onClose, tipo, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==========================
  // OBTENER CONTACTOS
  // ==========================
  const fetchContactos = async (q = "") => {
    setLoading(true);

    try {
      const { data } = await api.get("/users/usuarios-activos/", {
        params: { q }
      });

      let usuarios = Array.isArray(data) ? data : [];

      // ==========================================
      // LÓGICA DE FILTRADO POR TIPO
      // ==========================================
      if (tipo === "comercial") {
        const IDsPermitidos = [
          "eduardo.bonilla",
          "claudia.carbonel",
          "luisa.oncebay",
          "diego.rengifo"
        ];

        // Solo mostramos los de la lista para Comercial
        usuarios = usuarios.filter(u =>
          IDsPermitidos.includes(u.usuario)
        );
      }
      // Si tipo === "tecnico", no entra al IF y muestra todos (comportamiento estándar)

      setResults(usuarios);

    } catch (err) {
      console.error("Error fetching contactos:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // CARGA INICIAL
  // ==========================
  useEffect(() => {
    if (open) {
      setQuery("");
      fetchContactos("");
    }
  }, [open, tipo]);

  // ==========================
  // BÚSQUEDA CON DEBOUNCE
  // ==========================
  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(() => {
      fetchContactos(query.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden">

        {/* HEADER CON IDENTIDAD CORPORATIVA */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Seleccionar contacto {tipo === "tecnico" ? "técnico" : "comercial"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Usuarios activos en el sistema central
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 space-y-4">

          {/* BUSCADOR ESTILO ERP */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o teléfono..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium transition-all focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-500 animate-spin" size={16} />
            )}
          </div>

          {/* LISTA DE RESULTADOS */}
          <div className="max-h-72 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {!loading && results.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin resultados encontrados</p>
              </div>
            )}

            {results.map((contacto) => (
              <div
                key={contacto.usuario}
                onClick={() => {
                  onSelect(contacto);
                  onClose();
                }}
                className="group flex items-center gap-4 px-4 py-3 cursor-pointer rounded-xl border border-transparent hover:border-teal-200 hover:bg-teal-50/50 transition-all duration-200"
              >
                {/* DNI / IDENTIFICADOR */}
                <div className="text-[10px] font-black bg-slate-100 text-slate-500 group-hover:bg-[#0d767e] group-hover:text-white rounded-lg px-2 py-1.5 transition-colors min-w-[85px] text-center shadow-sm">
                  {contacto.dni}
                </div>

                {/* INFORMACIÓN DEL USUARIO */}
                <div className="flex-grow">
                  <p className="text-xs font-black text-slate-700 group-hover:text-[#0d767e] transition-colors uppercase tracking-tight">
                    {contacto.nombre_completo}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {contacto.email_usu ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600">
                        <Mail size={10} /> {contacto.email_usu}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600">
                        <Phone size={10} /> {contacto.movil1 || "Sin contacto"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContactosModal;
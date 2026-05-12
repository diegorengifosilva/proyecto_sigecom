import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, FileText, Search, X, Check, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const normalizeText = (text = "") =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const AsignarCotiModal = ({ open, onClose, onConfirm, referencia }) => {

  const containerRef = useRef(null);

  const [form, setForm] = useState({
    descripcion: "",
    usuario: "",
    usuario_nombre: "",
  });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [selectedUser, setSelectedUser] = useState(false);

  const cacheRef = useRef({});
  const abortRef = useRef(null);

  // =============================
  // Reset ERP
  // =============================
  const resetForm = () => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setHighlightIndex(-1);
    setSelectedUser(false);

    setForm({
      descripcion: "",
      usuario: "",
      usuario_nombre: "",
    });
  };

  // =============================
  // Highlight ERP
  // =============================
  const highlightMatch = (text, query) => {

    const cleanQuery = normalizeText(query);

    if (!cleanQuery) return text;

    return text.split(/(\s+)/).map((part, i) =>
      normalizeText(part).includes(cleanQuery) ? (
        <span
          key={i}
          className="bg-yellow-200/70 rounded px-0.5"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // =============================
  // Fetch usuarios
  // =============================
  const fetchUsuarios = async (q = "") => {

    if (cacheRef.current[q]) {
      setResults(cacheRef.current[q]);
      return;
    }

    if (abortRef.current) abortRef.current.abort();

    abortRef.current = new AbortController();

    setLoading(true);

    try {
      const { data } = await api.get("/users/usuarios-activos/", {
        params: { q },
        signal: abortRef.current.signal,
      });

      const clean = Array.isArray(data) ? data.slice(0, 20) : [];

      cacheRef.current[q] = clean;
      setResults(clean);

    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error("❌ Error buscando usuarios:", err);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // Debounce
  // =============================
  useEffect(() => {

    if (!query.trim() || selectedUser) return;

    const timeout = setTimeout(() => {
      fetchUsuarios(normalizeText(query));
      setShowDropdown(true);
    }, 300);

    return () => clearTimeout(timeout);

  }, [query, selectedUser]);

  // =============================
  // Click outside
  // =============================
  useEffect(() => {

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  // =============================
  // Confirmar
  // =============================
  const handleConfirm = () => {

    if (!form.descripcion.trim() || !form.usuario) return;

    onConfirm?.({
      usuario: form.usuario,
      usuario_nombre: form.usuario_nombre,
      descripcion: form.descripcion,
    });
  };

  // =============================
  // Open / Close lifecycle
  // =============================
  useEffect(() => {

    if (!open) return resetForm();

    setForm((p) => ({
      ...p,
      descripcion: referencia ?? "",
    }));

  }, [open, referencia]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [results]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden font-sans"
          >
            {/* HEADER MODERNO */}
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <UserPlus size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Asignar Cotización
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Delegar responsabilidad a otro usuario
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* CUERPO DEL FORMULARIO */}
            <div className="p-5 space-y-5">

              {/* MOTIVO */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                  <FileText size={14} className="text-emerald-600" />
                  Motivo de Asignación
                </label>
                <textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white outline-none transition-all resize-none shadow-inner"
                  placeholder="Explique brevemente por qué se asigna esta cotización..."
                />
              </div>

              {/* AUTOCOMPLETE USUARIO */}
              <div ref={containerRef} className="space-y-2 relative">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                  <Search size={14} className="text-emerald-600" />
                  Asignar a Usuario
                </label>

                <div className="relative group">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setHighlightIndex(-1);
                      setSelectedUser(false);
                      setForm((p) => ({ ...p, usuario: "", usuario_nombre: "" }));
                    }}
                    onKeyDown={(e) => {
                      if (!showDropdown || !results.length) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlightIndex((p) => p < results.length - 1 ? p + 1 : 0);
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlightIndex((p) => p > 0 ? p - 1 : results.length - 1);
                      }
                      if (e.key === "Enter" && highlightIndex >= 0) {
                        e.preventDefault();
                        const usuario = results[highlightIndex];
                        setForm((p) => ({
                          ...p,
                          usuario: usuario.usuario,
                          usuario_nombre: usuario.nombre_completo,
                        }));
                        setQuery(usuario.nombre_completo);
                        setShowDropdown(false);
                        setSelectedUser(true);
                      }
                      if (e.key === "Escape") setShowDropdown(false);
                    }}
                    placeholder="Escriba nombre del colaborador..."
                    className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold transition-all outline-none pr-10 shadow-sm
                      ${selectedUser ? 'bg-emerald-50 border-emerald-200 text-[#0d767e]' : 'bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'}
                    `}
                  />

                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {query && (
                      <button onClick={resetForm} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                        <X size={14} />
                      </button>
                    )}
                    {selectedUser && <Check size={16} className="text-emerald-600" />}
                  </div>
                </div>

                {/* DROPDOWN ESTILIZADO */}
                <AnimatePresence>
                  {showDropdown && query && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-56 overflow-hidden flex flex-col"
                    >
                      <div className="overflow-y-auto custom-scrollbar">
                        {loading ? (
                          <div className="p-4 space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="h-8 rounded-lg bg-slate-100 animate-pulse" />
                            ))}
                          </div>
                        ) : results.length === 0 ? (
                          <div className="p-6 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin resultados</p>
                          </div>
                        ) : (
                          results.map((usuario, i) => (
                            <div
                              key={usuario.usuario}
                              className={`px-4 py-3 cursor-pointer transition-all flex items-center justify-between group
                                ${highlightIndex === i ? "bg-emerald-50 text-[#0d767e]" : "hover:bg-slate-50 text-slate-600"}
                              `}
                              onClick={() => {
                                setForm((p) => ({
                                  ...p,
                                  usuario: usuario.usuario,
                                  usuario_nombre: usuario.nombre_completo,
                                }));
                                setQuery(usuario.nombre_completo);
                                setShowDropdown(false);
                                setSelectedUser(true);
                              }}
                            >
                              <div>
                                <p className="font-black text-[11px] uppercase tracking-tight">
                                  {highlightMatch(usuario.nombre_completo, query)}
                                </p>
                                <p className="text-[9px] font-bold opacity-60">
                                  {usuario.email_usu || usuario.movil1 || "Sin contacto"}
                                </p>
                              </div>
                              <MousePointer2 size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${highlightIndex === i ? 'opacity-100' : ''}`} />
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* FOOTER ACCIONES */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-[11px] font-black uppercase tracking-widest text-red-700 hover:bg-red-100 border border-transparent hover:border-red-200 rounded-xl h-9 px-8 transition-all"
              >
                Cancelar
              </Button>
              <Button
                variant="ghost"
                onClick={handleConfirm}
                disabled={!form.descripcion || !form.usuario}
                className="text-[11px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100 border border-transparent hover:border-emerald-200 rounded-xl h-9 px-8 transition-all"
              >
                Asignar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AsignarCotiModal;

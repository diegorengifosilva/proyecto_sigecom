import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";

export default function SearchableSelect({
  value,
  displayValue = "",
  options = [],
  onChange,
  onSearch,
  placeholder = "Buscar...",
  disabled = false,
  loading = false,
  allowClear = false,
  onAdd,
  addLabel = "Nuevo",
  renderOption,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open || !onSearch) return;
    const t = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, open, onSearch]);

  const handleSelect = (opt) => {
    onChange(opt);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={`w-full text-left text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5 bg-white flex items-center justify-between gap-2 ${
          disabled ? "bg-slate-50 text-slate-400" : "hover:border-slate-300"
        }`}
      >
        <span className={`truncate ${displayValue ? "text-slate-800" : "text-slate-400"}`}>
          {displayValue || placeholder}
        </span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 flex gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            {onAdd && (
              <button
                type="button"
                onClick={() => { setOpen(false); onAdd(); }}
                className="shrink-0 px-2 py-1.5 text-[10px] font-bold uppercase bg-teal-600 text-white rounded-lg flex items-center gap-1"
              >
                <Plus size={12} /> {addLabel}
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto">
            {allowClear && (
              <button type="button" onClick={() => handleSelect(null)}
                className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50">
                -- Sin selección --
              </button>
            )}
            {loading && <p className="px-3 py-4 text-xs text-slate-400 text-center">Cargando...</p>}
            {!loading && options.length === 0 && (
              <p className="px-3 py-4 text-xs text-slate-400 text-center">Sin resultados</p>
            )}
            {!loading && options.map((opt, idx) => (
              <button
                key={opt.id ?? opt.idalmacen ?? opt.id_cliente ?? opt.id_usuario ?? opt.id_producto ?? idx}
                type="button"
                onClick={() => handleSelect(opt)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 border-b border-slate-50 last:border-0"
              >
                {renderOption ? renderOption(opt) : (
                  <span className="text-slate-700">{opt.nombre || opt.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

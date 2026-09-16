import { useState, useRef, useEffect, useMemo } from "react";
import { Plane, Bus, MapPin, Check, ChevronDown } from "lucide-react";
import { buscarCiudadesPeru } from "@/data/ciudadesPeru";

export default function CiudadAutocomplete({
  label,
  value = "",
  onChange,
  transporte = "A", // 'A' = Aéreo, 'T' = Terrestre
  placeholder = "Ej: LIM o LIMA",
  required = false,
  disabled = false,
  focusRing = "focus:border-sky-500 focus:ring-sky-500/20",
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const isAereo = (transporte || "A").toUpperCase() === "A";

  // Obtener sugerencias en tiempo real
  const sugerencias = useMemo(() => {
    return buscarCiudadesPeru(value, transporte);
  }, [value, transporte]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Manejo de teclado (flechas, enter, escape)
  const handleKeyDown = (e) => {
    if (!isOpen || sugerencias.length === 0) {
      // Permitir que ArrowDown y ArrowUp se propaguen al formulario para navegar entre campos
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setHighlightIndex((prev) => (prev < sugerencias.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : sugerencias.length - 1));
    } else if (e.key === "Enter") {
      if (highlightIndex >= 0 && highlightIndex < sugerencias.length) {
        e.preventDefault();
        e.stopPropagation();
        seleccionarCiudad(sugerencias[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  const seleccionarCiudad = (ciudad) => {
    if (onChange) {
      onChange(ciudad.nombre);
    }
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onFocus={() => {
            setIsOpen(true);
            setHighlightIndex(-1);
          }}
          onChange={(e) => {
            if (onChange) onChange(e.target.value.toUpperCase());
            if (!isOpen) setIsOpen(true);
            setHighlightIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 ${focusRing} focus:ring-2 text-slate-800 font-bold outline-hidden transition-all text-xs uppercase bg-white pr-8`}
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 pointer-events-none">
          {isAereo ? (
            <Plane className="w-3.5 h-3.5 text-sky-500" />
          ) : (
            <Bus className="w-3.5 h-3.5 text-amber-500" />
          )}
          <ChevronDown className="w-3 h-3 text-slate-300" />
        </div>
      </div>

      {/* DROPDOWN FLOTANTE DE SUGERENCIAS */}
      {isOpen && sugerencias.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto divide-y divide-slate-100">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider">
            <span>{isAereo ? "Aeropuertos y Ciudades" : "Destinos del Perú"}</span>
            <span>{sugerencias.length} sugerencias</span>
          </div>

          {sugerencias.map((ciudad, idx) => {
            const isSelected = value.trim().toUpperCase() === ciudad.nombre.toUpperCase();
            const isHighlighted = highlightIndex === idx;

            return (
              <div
                key={ciudad.codigo || idx}
                onMouseDown={(e) => {
                  e.preventDefault(); // Evita perder foco antes de seleccionar
                  seleccionarCiudad(ciudad);
                }}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`px-3 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                  isHighlighted ? "bg-sky-50/80" : isSelected ? "bg-emerald-50/70" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      ciudad.iata
                        ? "bg-sky-100 text-sky-700 font-black text-[10px] border border-sky-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ciudad.iata ? ciudad.iata : <MapPin className="w-3.5 h-3.5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-800 truncate">
                        {ciudad.nombre}
                      </span>
                      {ciudad.iata && (
                        <span className="text-[10px] font-black text-sky-600 px-1 py-0.2 bg-sky-50 rounded border border-sky-200">
                          {ciudad.iata}
                        </span>
                      )}
                    </div>

                    <div className="text-[10.5px] text-slate-500 font-medium truncate">
                      {ciudad.aeropuerto ? (
                        <span>{ciudad.aeropuerto}</span>
                      ) : (
                        <span>Región {ciudad.departamento}</span>
                      )}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

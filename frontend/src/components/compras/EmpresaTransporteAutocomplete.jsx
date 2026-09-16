import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plane, Bus, Search, Loader, ChevronDown, X } from "lucide-react";
import api from "@/services/api";

export default function EmpresaTransporteAutocomplete({
  value = "",
  onSelect,
  onChange,
  tipo = "A", // 'A' = Aéreo, 'T' = Terrestre
  placeholder,
  tabIndex = 1,
  label,
  labelClassName = "",
  inline = false,
  className = "",
  disabled = false,
  required = false,
  autoFocus = false,
  inputClassName = "",
  onEscape,
  onEnter,
  onBlurCustom,
}) {
  const isAereo = tipo === "A";
  const defaultLabel = isAereo ? "Aerolínea" : "Empresa de Transporte";
  const defaultPlaceholder = isAereo
    ? "Buscar aerolínea o escribir nombre..."
    : "Buscar empresa de transporte o escribir nombre...";

  const finalLabel = label || defaultLabel;
  const finalPlaceholder = placeholder || defaultPlaceholder;

  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Auto focus si se especifica
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      setShowDropdown(true);
      updateCoords();
      fetchResults(value || "");
    }
  }, [autoFocus]);

  // Sincronizar cuando no se esté editando activamente
  useEffect(() => {
    if (!isFocused) {
      setQuery(value || "");
    }
  }, [value, isFocused]);

  // Actualizar coordenadas para el menú flotante portal
  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  // Seguir la posición del input en tiempo real (scroll y redimensionamiento)
  useEffect(() => {
    if (!showDropdown) return;
    let active = true;
    const tick = () => {
      if (!active) return;
      updateCoords();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const handleScrollOrResize = () => updateCoords();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      active = false;
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [showDropdown]);

  // Scroll automático en dropdown
  useEffect(() => {
    if (showDropdown && highlightIndex >= 0 && dropdownRef.current) {
      const container = dropdownRef.current;
      const items = container.querySelectorAll(".cursor-pointer");
      const activeItem = items[highlightIndex];
      if (activeItem) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elemTop = activeItem.offsetTop;
        const elemBottom = elemTop + activeItem.offsetHeight;

        if (elemTop < containerTop) {
          container.scrollTop = elemTop;
        } else if (elemBottom > containerBottom) {
          container.scrollTop = elemBottom - container.clientHeight;
        }
      }
    }
  }, [highlightIndex, showDropdown]);

  // Búsqueda remota de empresas de transporte
  const fetchResults = async (searchVal) => {
    setLoading(true);
    try {
      const res = await api.get("core/empresas-transporte/buscar/", {
        params: {
          q: (searchVal || "").trim(),
          tipo: tipo || "A",
        },
      });
      const dataArray = Array.isArray(res.data) ? res.data : [];
      setResults(dataArray);
      setHighlightIndex(dataArray.length > 0 ? 0 : -1);
    } catch (err) {
      console.error("❌ Error buscando empresas de transporte:", err);
      setResults([]);
      setHighlightIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  // Debounce en búsqueda
  useEffect(() => {
    if (!isFocused) return;
    const t = setTimeout(() => {
      fetchResults(query);
    }, 50);

    return () => clearTimeout(t);
  }, [query, isFocused, tipo]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    setIsFocused(true);
    if (onChange) {
      onChange(val);
    }
  };

  const handleSelect = (empresa) => {
    setQuery(empresa.nombre || "");
    setShowDropdown(false);
    setIsFocused(false);
    setHighlightIndex(-1);
    if (onSelect) {
      onSelect(empresa);
    }
    if (onChange) {
      onChange(empresa.nombre || "");
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setQuery("");
    if (onChange) {
      onChange("");
    }
    inputRef.current?.focus();
    fetchResults("");
    setShowDropdown(true);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || results.length === 0) {
      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape();
      }
      if (e.key === "Enter" && onEnter) {
        e.preventDefault();
        onEnter(query);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setHighlightIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      if (highlightIndex >= 0 && highlightIndex < results.length) {
        e.preventDefault();
        e.stopPropagation();
        handleSelect(results[highlightIndex]);
      } else if (onEnter) {
        e.preventDefault();
        e.stopPropagation();
        onEnter(query);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setShowDropdown(false);
      if (onEscape) onEscape();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
    updateCoords();
    fetchResults(query);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setHighlightIndex(-1);
      if (onBlurCustom) onBlurCustom(query);
    }, 250);
  };

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (showDropdown) {
      setShowDropdown(false);
    } else {
      inputRef.current?.focus();
      setIsFocused(true);
      setShowDropdown(true);
      updateCoords();
      fetchResults("");
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${
        inline ? "flex items-center gap-2 w-full" : "flex flex-col gap-1 w-full"
      } ${className}`}
    >
      {finalLabel && (
        <label
          className={`text-[11px] font-black text-slate-700 uppercase tracking-wider shrink-0 flex items-center mb-0 cursor-pointer ${
            labelClassName || ""
          }`}
          onClick={() => inputRef.current?.focus()}
        >
          {finalLabel} {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          required={required}
          disabled={disabled}
          tabIndex={tabIndex}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={finalPlaceholder}
          className={
            inputClassName ||
            `w-full h-10 px-3.5 pr-14 rounded-xl border border-slate-200 text-slate-800 font-bold text-xs bg-white outline-hidden transition-all placeholder:text-slate-400 ${
              isAereo
                ? "focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                : "focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            }`
          }
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              title="Limpiar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={toggleDropdown}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            title={showDropdown ? "Cerrar opciones" : "Ver opciones disponibles"}
          >
            {loading ? (
              <Loader className={`w-3.5 h-3.5 animate-spin ${isAereo ? "text-sky-600" : "text-amber-600"}`} />
            ) : (
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDropdown ? "rotate-180 text-sky-600" : ""}`} />
            )}
          </button>
        </div>
      </div>

      {/* DROPDOWN FLOTANTE PORTAL */}
      {showDropdown && (results.length > 0 || loading) && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${coords.top + 4}px`,
              left: `${coords.left}px`,
              width: `${Math.max(coords.width, 360)}px`,
              zIndex: 9999,
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 overflow-y-auto max-h-64 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-slate-100/80 font-sans"
          >
            <div className="px-3 py-1.5 bg-slate-50/80 rounded-xl mb-1 flex items-center justify-between text-[9px] font-black uppercase text-slate-400 tracking-wider">
              <span>
                {loading
                  ? `Buscando ${isAereo ? "aerolíneas" : "empresas"}...`
                  : `${isAereo ? "Aerolíneas registradas" : "Empresas registradas"} (${results.length})`}
              </span>
              <span>Enter para seleccionar</span>
            </div>

            {results.map((item, idx) => {
              const isSelected = idx === highlightIndex;
              return (
                <div
                  key={item.id_empresa || idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-1 text-left ${
                    isSelected
                      ? isAereo
                        ? "bg-sky-50 text-sky-950 ring-1 ring-sky-500/30 font-semibold"
                        : "bg-amber-50 text-amber-950 ring-1 ring-amber-500/30 font-semibold"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isAereo ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isAereo ? <Plane className="w-3.5 h-3.5" /> : <Bus className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-black text-xs text-slate-900 uppercase truncate">
                        {item.nombre}
                      </span>
                    </div>

                    {item.ruc && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200 shrink-0 font-mono">
                        RUC: {item.ruc}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

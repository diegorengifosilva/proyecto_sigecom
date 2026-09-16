import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { User, Search, Loader, X, Check } from "lucide-react";
import api from "@/services/api";

export default function DniUsuarioAutocomplete({
  mode = "dni", // "dni" o "nombre"
  value = "",
  onChange,
  onSelect,
  placeholder,
  className = "",
  inputClassName = "",
  disabled = false,
  autoFocus = false,
  onKeyDown,
  inputRef: externalRef,
}) {
  const isDniMode = mode === "dni";
  const defaultPlaceholder = isDniMode ? "DNI..." : "Nombre completo del pasajero...";
  const finalPlaceholder = placeholder || defaultPlaceholder;

  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef(null);
  const internalRef = useRef(null);
  const inputRef = externalRef || internalRef;
  const dropdownRef = useRef(null);

  // Auto focus si se especifica
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Sincronizar valor externo cuando cambia
  useEffect(() => {
    if (!value) {
      setQuery("");
      setShowDropdown(false);
      setResults([]);
      setHighlightIndex(-1);
      if (inputRef.current && inputRef.current.value !== "") {
        inputRef.current.value = "";
      }
    } else if (!isFocused || value !== query) {
      setQuery(value);
    }
  }, [value, isFocused]);

  // Actualizar coordenadas para el menú flotante en Portal (evita recortes de overflow en tabla)
  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, isDniMode ? 340 : 380),
      });
    }
  };

  // Posicionar dropdown en scroll o redimensionamiento
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

  // Scroll automático en dropdown al navegar con flechas
  useEffect(() => {
    if (showDropdown && highlightIndex >= 0 && dropdownRef.current) {
      const container = dropdownRef.current;
      const items = container.querySelectorAll(".dni-user-item");
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

  // Búsqueda remota de usuarios por coincidencia en DNI o Nombre Completo
  const fetchResults = async (searchVal) => {
    const term = (searchVal || "").trim();
    if (!term || term.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get("/users/buscar/", {
        params: { q: term },
      });
      const dataArray = Array.isArray(res.data) ? res.data : [];
      setResults(dataArray);
      setHighlightIndex(dataArray.length > 0 ? 0 : -1);
      setShowDropdown(dataArray.length > 0 && isFocused);
    } catch (err) {
      console.warn("Error buscando usuarios:", err);
      // Fallback a usuarios-activos si fuera necesario
      try {
        const fallbackRes = await api.get("/users/usuarios-activos/", {
          params: { q: term },
        });
        const fallbackArray = Array.isArray(fallbackRes.data) ? fallbackRes.data : [];
        setResults(fallbackArray);
        setHighlightIndex(fallbackArray.length > 0 ? 0 : -1);
        setShowDropdown(fallbackArray.length > 0 && isFocused);
      } catch (fbErr) {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounce en búsqueda
  useEffect(() => {
    if (!isFocused) return;
    const timer = setTimeout(() => {
      fetchResults(query);
    }, 120);

    return () => clearTimeout(timer);
  }, [query, isFocused]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) {
      onChange(val);
    }
    if (val.trim().length >= 2) {
      setShowDropdown(true);
      updateCoords();
    } else {
      setShowDropdown(false);
    }
  };

  const handleSelect = (user) => {
    const selectedVal = isDniMode
      ? String(user.dni || "").trim()
      : String(user.nombre_completo || user.usuario || "").trim();

    setQuery(selectedVal);
    setShowDropdown(false);
    setHighlightIndex(-1);

    if (onChange) {
      onChange(selectedVal);
    }
    if (onSelect) {
      onSelect(user);
    }
  };

  const handleKeyDown = (e) => {
    if (showDropdown && results.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        return;
      } else if (e.key === "Enter") {
        if (highlightIndex >= 0 && highlightIndex < results.length) {
          e.preventDefault();
          e.stopPropagation();
          handleSelect(results[highlightIndex]);
          return;
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setShowDropdown(false);
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    updateCoords();
    if (query.trim().length >= 2) {
      setShowDropdown(true);
      fetchResults(query);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setHighlightIndex(-1);
    }, 250);
  };

  const defaultInputClass = isDniMode
    ? "w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-hidden focus:border-sky-500 transition-all placeholder:text-slate-400"
    : "w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-hidden focus:border-sky-500 transition-all placeholder:text-slate-400";

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={finalPlaceholder}
          className={inputClassName || defaultInputClass}
        />

        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <Loader className="w-3 h-3 text-sky-600 animate-spin" />
          </div>
        )}
      </div>

      {/* DROPDOWN FLOTANTE VIA PORTAL */}
      {showDropdown && results.length > 0 && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${coords.top + 4}px`,
              left: `${coords.left}px`,
              width: `${Math.max(coords.width, isDniMode ? 340 : 380)}px`,
              zIndex: 9999,
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 overflow-y-auto max-h-64 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-slate-100/80 font-sans"
          >
            <div className="px-3 py-1.5 bg-sky-50/80 rounded-xl mb-1 flex items-center justify-between text-[9px] font-black uppercase text-sky-700 tracking-wider">
              <span>Coincidencias ({results.length})</span>
              <span>Enter o Clic para seleccionar</span>
            </div>

            {results.map((item, idx) => {
              const isSelected = idx === highlightIndex;
              return (
                <div
                  key={item.id_usuario || idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`dni-user-item p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2.5 text-left ${
                    isSelected
                      ? "bg-sky-50 text-sky-950 ring-1 ring-sky-500/30 font-semibold"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200/80 font-black text-[10px]">
                      <User className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {isDniMode ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs text-sky-700">
                              {item.dni || "S/DNI"}
                            </span>
                            {item.area_nombre && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[140px]">
                                {item.area_nombre}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-slate-900 truncate uppercase mt-0.5">
                            {item.nombre_completo || item.usuario}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-black text-xs text-slate-900 truncate uppercase">
                            {item.nombre_completo || item.usuario}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-bold text-[11px] text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                              DNI: {item.dni || "S/DNI"}
                            </span>
                            {item.area_nombre && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[140px]">
                                {item.area_nombre}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="shrink-0 text-sky-600 pr-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Building2, Search, Loader, MapPin, CreditCard, Phone, Check } from "lucide-react";
import api from "@/services/api";

export default function ProveedorAutocomplete({
  value = "",
  onSelect,
  onChange,
  placeholder = "Buscar proveedor o escribir nombre...",
  tabIndex = 4,
  label = "Empresa / Prov.:*",
  labelClassName = "",
  inline = true,
  className = "",
  disabled = false,
}) {
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

  // Sincronizar con el valor externo cuando no se está editando activamente
  useEffect(() => {
    if (!isFocused) {
      setQuery(value || "");
    }
  }, [value, isFocused]);

  // Actualizar coordenadas para el menú flotante portal (posición fija relativa al viewport)
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

  // Seguir la posición del input en tiempo real (animaciones y scroll)
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

  // Scroll highlighted item into view automatically
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

  // Búsqueda remota de proveedores
  const fetchResults = async (searchVal) => {
    setLoading(true);
    try {
      const res = await api.get("core/proveedores/buscar/", {
        params: { q: (searchVal || "").trim() },
      });
      const dataArray = Array.isArray(res.data) ? res.data : [];
      setResults(dataArray);
      setHighlightIndex(dataArray.length > 0 ? 0 : -1);
    } catch (err) {
      console.error("❌ Error buscando proveedores:", err);
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
    }, 80);

    return () => clearTimeout(t);
  }, [query, isFocused]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    setIsFocused(true);
    if (onChange) {
      onChange(val);
    }
  };

  const handleSelect = (proveedor) => {
    setQuery(proveedor.nombre || "");
    setShowDropdown(false);
    setIsFocused(false);
    setHighlightIndex(-1);
    if (onSelect) {
      onSelect(proveedor);
    }
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || results.length === 0) {
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
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setShowDropdown(false);
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
    }, 200);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${
        inline ? "flex items-center gap-2 w-full" : "flex flex-col gap-1 w-full"
      } ${className}`}
    >
      {label && (
        <label
          className={`text-[10px] font-black text-slate-600 uppercase tracking-wider shrink-0 flex items-center mb-0 cursor-pointer ${
            labelClassName || "w-28"
          }`}
          onClick={() => inputRef.current?.focus()}
        >
          {label}
        </label>
      )}

      <div className="relative flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          tabIndex={tabIndex}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-8.5 px-3 pr-8 rounded-xl border-0 outline-none ring-0 bg-slate-50/80 hover:bg-slate-100/70 focus:bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          {loading ? (
            <Loader className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          ) : (
            <Search className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {/* DROPDOWN FLOTANTE PORTAL */}
      {showDropdown && (results.length > 0 || loading) && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${coords.top + 3}px`,
              left: `${coords.left}px`,
              width: `${Math.max(coords.width, 360)}px`,
              zIndex: 9999,
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 overflow-y-auto max-h-64 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-slate-100/80 font-sans"
          >
            <div className="px-3 py-1.5 bg-slate-50/80 rounded-xl mb-1 flex items-center justify-between text-[9px] font-black uppercase text-slate-400 tracking-wider">
              <span>{loading ? "Buscando proveedores..." : `Proveedores encontrados (${results.length})`}</span>
              <span>Enter para seleccionar</span>
            </div>

            {results.map((item, idx) => {
              const isSelected = idx === highlightIndex;
              return (
                <div
                  key={item.id_proveedor || idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-1 text-left ${
                    isSelected ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/30 font-semibold" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-xs text-slate-900 uppercase truncate">
                      {item.nombre}
                    </span>
                    {item.ruc && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200 shrink-0 font-mono">
                        RUC: {item.ruc}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-500">
                    {item.iniciales && (
                      <span className="px-1 py-0.2 bg-emerald-50 text-emerald-700 font-bold rounded text-[9px]">
                        {item.iniciales}
                      </span>
                    )}
                    {item.forma_pago && (
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <CreditCard className="w-3 h-3 text-emerald-600 shrink-0" />
                        {item.forma_pago}
                      </span>
                    )}
                    {item.direccion && (
                      <span className="flex items-center gap-1 text-slate-500 truncate max-w-[240px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.direccion}</span>
                      </span>
                    )}
                    {(item.telefono || item.correo) && (
                      <span className="flex items-center gap-1 text-slate-400 truncate">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        {item.telefono || item.correo}
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

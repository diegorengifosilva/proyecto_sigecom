import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { User, Search, Loader, Check, X, Landmark, CreditCard, Shield } from "lucide-react";
import api from "@/services/api";

export default function DestinatarioAutocomplete({
  value = "",
  onSelect,
  onChange,
  placeholder = "Buscar colaborador (ej. DIEG, NOMBRE, DNI)...",
  tabIndex = 1,
  label = "Destinatario",
  labelClassName = "",
  inline = false,
  className = "",
  disabled = false,
  required = false,
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

  // Búsqueda remota de usuarios
  const fetchResults = async (searchVal) => {
    setLoading(true);
    try {
      const res = await api.get("/users/usuarios-activos/", {
        params: { q: (searchVal || "").trim() },
      });
      const dataArray = Array.isArray(res.data) ? res.data : [];
      setResults(dataArray);
      setShowDropdown(dataArray.length > 0 && isFocused);
      setHighlightIndex(-1);
    } catch (err) {
      console.error("Error buscando usuarios activos:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce para búsqueda
  useEffect(() => {
    if (!isFocused) return;
    const timer = setTimeout(() => {
      fetchResults(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, isFocused]);

  // Manejadores de teclado
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
        selectItem(results[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setShowDropdown(false);
    }
  };

  // Seleccionar elemento
  const selectItem = (user) => {
    const displayName = user.nombre_completo || user.usuario || "";
    setQuery(displayName);
    setShowDropdown(false);
    setIsFocused(false);
    if (onSelect) {
      onSelect(user);
    }
    if (onChange) {
      onChange(displayName);
    }
  };

  // Limpiar selección
  const handleClear = (e) => {
    e.stopPropagation();
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    if (onSelect) {
      onSelect(null);
    }
    if (onChange) {
      onChange("");
    }
    inputRef.current?.focus();
  };

  const getInitials = (name) => {
    if (!name) return "US";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col ${className}`}>
      {label && (
        <label className={`block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 ${labelClassName}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-purple-600" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          tabIndex={tabIndex}
          required={required}
          onFocus={() => {
            setIsFocused(true);
            updateCoords();
            if (results.length > 0) {
              setShowDropdown(true);
            } else {
              fetchResults(query);
            }
          }}
          onBlur={() => {
            // Retardo para permitir clicks en el dropdown portal
            setTimeout(() => {
              setIsFocused(false);
              setShowDropdown(false);
            }, 250);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (onChange) onChange(val);
            updateCoords();
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-800 font-bold outline-hidden transition-all text-xs bg-white placeholder:font-normal placeholder:text-slate-400"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {loading ? (
            <Loader className="w-3.5 h-3.5 text-purple-600 animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Limpiar colaborador"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 text-slate-300" />
          )}
        </div>
      </div>

      {/* DROPDOWN PORTAL (Evita overflow clipping en modales) */}
      {showDropdown &&
        results.length > 0 &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${coords.top + 4}px`,
              left: `${coords.left}px`,
              width: `${Math.max(coords.width, 320)}px`,
              zIndex: 9999,
            }}
            className="bg-white rounded-2xl shadow-xl border border-purple-100 py-1.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 text-slate-700"
          >
            <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Colaboradores Coincidentes ({results.length})</span>
              <span className="text-purple-600 font-bold">↑↓ Enter</span>
            </div>

            {results.map((u, index) => {
              const isHighlighted = index === highlightIndex;
              const nombre = u.nombre_completo || u.usuario;
              const banco = u.banco_nombre || u.id_banco?.nombre;
              const nroCuenta = u.nro_cuenta || u.numero_cuenta;

              return (
                <div
                  key={u.id_usuario || u.id || index}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectItem(u);
                  }}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={`px-3.5 py-2.5 cursor-pointer transition-colors flex items-start gap-3 border-b border-slate-50 last:border-b-0 ${
                    isHighlighted ? "bg-purple-50/80 text-purple-900" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {getInitials(nombre)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-xs text-slate-900 truncate">
                        {nombre}
                      </span>
                      {u.dni && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          DNI: {u.dni}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500">
                      {banco ? (
                        <span className="flex items-center gap-1 font-semibold text-indigo-700">
                          <Landmark className="w-3 h-3 text-indigo-500" />
                          {banco}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sin banco registrado</span>
                      )}

                      {nroCuenta && (
                        <span className="flex items-center gap-1 font-mono font-bold text-slate-600">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          {nroCuenta}
                        </span>
                      )}
                    </div>
                  </div>

                  {isHighlighted && (
                    <div className="self-center p-1 rounded-md bg-purple-100 text-purple-700">
                      <Check className="w-3 h-3" />
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

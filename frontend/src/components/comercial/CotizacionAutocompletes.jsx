import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import * as LucideIcons from "lucide-react";
import api from "@/services/api";
import { toast } from "../../utils/toast";
import QuickCreateClienteModal from "../ui/QuickCreateClienteModal";
import QuickCreateRepresentanteModal from "../ui/QuickCreateRepresentanteModal";


const Icon = ({ name, className }) => {
  const iconName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const LucideIcon = LucideIcons[iconName] || LucideIcons.HelpCircle;
  return <LucideIcon className={className} />;
};

const normalizeText = (text = "") =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const hasMatchingPrefix = (name = "", query = "") => {
  const normName = (name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const normQuery = (query || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!normQuery) return false;
  
  if (normName === normQuery || normName.startsWith(normQuery)) return true;

  const cleanName = normName.replace(/\b(s\.?a\.?c\.?|s\.?a\.?|e\.?i\.?r\.?l\.?|s\.?r\.?l\.?|s\.?a\.?b\.?)\b/g, "").trim();
  if (cleanName === normQuery || cleanName.startsWith(normQuery)) return true;

  return false;
};


const highlightMatch = (text, query) => {
  if (!text) return "";
  if (!query) return text;

  const normText = normalizeText(text);
  const normQuery = normalizeText(query);

  const parts = [];
  let lastIndex = 0;
  let searchIndex = 0;

  while (searchIndex < text.length) {
    const matchIndex = normText.indexOf(normQuery, searchIndex);
    if (matchIndex === -1) {
      parts.push(text.slice(lastIndex));
      break;
    }

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    const matchText = text.slice(matchIndex, matchIndex + query.length);
    parts.push(
      <span key={matchIndex} className="bg-teal-500/10 text-teal-700 rounded px-0.5 font-bold">
        {matchText}
      </span>
    );

    lastIndex = matchIndex + query.length;
    searchIndex = lastIndex;
  }

  return parts;
};

export const ClienteAutocomplete = ({ value, onSelect, isReadOnly, initialId, onContextMenu, onOptionsClick, tabIndex, numReg, className }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [width, setWidth] = useState(120);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isFocused, setIsFocused] = useState(false);

  const [showQuickClienteModal, setShowQuickClienteModal] = useState(false);
  const containerRef = useRef(null);
  const spanRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);


  // Sync with parent value
  useEffect(() => {
    if (!isFocused) {
      setQuery(value || "");
    }
  }, [value, isFocused]);

  // Trigger onSelect to clear client when query is empty
  useEffect(() => {
    if (query === "" && value && isFocused) {
      onSelect({ id_cliente: null, nombre: "", codigo: "" });
    }
  }, [query, value, onSelect, isFocused]);

  // Measure text width dynamically
  useEffect(() => {
    if (spanRef.current) {
      const measured = spanRef.current.offsetWidth;
      setWidth(Math.max(100, Math.min(380, measured + 12)));
    }
  }, [query]);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  // Continuous viewport tracking loop when open (solves modal animation lag/gap)
  useEffect(() => {
    if (!showDropdown) return;
    
    let active = true;
    const tick = () => {
      if (!active) return;
      updateCoords();
      requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
    return () => {
      active = false;
    };
  }, [showDropdown]);

  // Scroll highlighted item into view automatically (keyboard arrow navigation scroll)
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

  const fetchResults = async (searchVal) => {
    if (!searchVal) {
      setResults([]);
      setHighlightIndex(-1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await api.get("core/clientes/buscar/", {
        params: { q: searchVal }
      });
      const dataArray = Array.isArray(res) ? res : [];
      setResults(dataArray);
      if (dataArray.length > 0) {
        setHighlightIndex(0);
      } else {
        setHighlightIndex(-1);
      }
    } catch (err) {
      console.error("❌ Error buscando clientes:", err);
      setResults([]);
      setHighlightIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  // Debounce API call on query change
  useEffect(() => {
    if (!showDropdown) return;

    const t = setTimeout(() => {
      fetchResults(query.trim());
    }, 300);

    return () => clearTimeout(t);
  }, [query, showDropdown]);

  const handleFocus = () => {
    setShowDropdown(true);
    setIsFocused(true);
    fetchResults(query.trim());
  };

  const handleBlur = () => {
    // Delay setting states to allow option clicks to go through
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setHighlightIndex(-1);
      if (query !== value) {
        onSelect({ id_cliente: initialId, nombre: query, fromBlur: true });
      }
    }, 150);
  };

  const matchFound = results.some(
    (c) => hasMatchingPrefix(c.nombre, query)
  );

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const maxIndex = query.trim() && !matchFound ? results.length : results.length - 1;
      setHighlightIndex((prev) => (prev + 1 <= maxIndex ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const maxIndex = query.trim() && !matchFound ? results.length : results.length - 1;
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : maxIndex));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && results[highlightIndex]) {
        handleSelectOption(results[highlightIndex]);
      } else if (highlightIndex === results.length || (query.trim() && !matchFound)) {
        setShowDropdown(false);
        setShowQuickClienteModal(true);
      } else {
        setShowDropdown(false);
        setHighlightIndex(-1);
        if (query !== value) {
          onSelect({ id_cliente: null, nombre: query, fromBlur: true });
        }
      }
    } else if (e.key === "Tab" || e.key === "Escape") {
      setShowDropdown(false);
      setHighlightIndex(-1);
      if (query !== value) {
        onSelect({ id_cliente: null, nombre: query, fromBlur: true });
      }
    }
  };

  const handleSelectOption = (item) => {
    setQuery(item.nombre);
    setShowDropdown(false);
    setHighlightIndex(-1);
    onSelect(item);
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => {
        setShowDropdown(false);
        if (onContextMenu) onContextMenu(e);
      }}
      className={className || "relative flex items-center px-2 py-1 -ml-2 rounded-lg hover:bg-gray-50 transition-all font-sans"}
    >
      <Icon name="briefcase" className="h-3.5 w-3.5 mr-1.5 text-teal-500" />
      {isReadOnly ? (
        <span className="font-bold text-gray-800 uppercase tracking-tight truncate max-w-[200px]">
          {value || "SIN CLIENTE"}
        </span>
      ) : (
        <div className="relative flex items-center">
          {/* Invisible span to measure the exact text width dynamically */}
          <span
            ref={spanRef}
            className="absolute -top-[9999px] -left-[9999px] invisible whitespace-pre font-bold text-xs uppercase px-1"
          >
            {query || "Buscar cliente..."}
          </span>
          <input
            ref={inputRef}
            type="text"
            tabIndex={tabIndex}
            className="bg-transparent hover:bg-white focus:bg-white border-b border-transparent focus:border-teal-300 px-1 font-bold text-gray-800 uppercase outline-none text-xs transition-all"
            style={{ width: `${width}px` }}
            value={query}
            onFocus={(e) => {
              e.target.select();
              handleFocus();
            }}
            onBlur={handleBlur}
            onClick={(e) => {
              e.target.select();
              if (!showDropdown) handleFocus();
            }}
            onMouseDown={(e) => {
              if (e.button === 2) {
                e.preventDefault();
              }
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!showDropdown) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar cliente..."
          />
          {showDropdown && (results.length > 0 || loading || (query.trim() && !matchFound)) && createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: `${coords.top + 2}px`,
                left: `${coords.left}px`,
                width: `${Math.max(280, coords.width)}px`,
                zIndex: 9999,
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => e.preventDefault()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="autocomplete-dropdown-portal bg-white/95 backdrop-blur-md border border-slate-100/80 rounded-2xl shadow-xl shadow-slate-200/40 max-h-60 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 text-left font-sans pointer-events-auto"
            >
              {loading ? (
                <div className="p-3 text-center text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Buscando...</div>
              ) : (
                <>
                  {results.map((c, index) => (
                    <div
                      key={c.id_cliente}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOption(c);
                      }}
                      className={`px-3 py-2 text-[10px] cursor-pointer rounded-lg mb-0.5 last:mb-0 transition-all duration-150 border-l-2
                        ${highlightIndex === index 
                          ? "bg-teal-50/80 text-teal-950 border-teal-500 font-semibold" 
                          : "hover:bg-slate-50/80 text-slate-700 border-transparent"}`}
                    >
                      <div className="font-black uppercase">{highlightMatch(c.nombre, query)}</div>
                      <div className={`text-[8px] mt-0.5 font-bold transition-colors
                        ${highlightIndex === index ? "text-teal-600/80" : "text-slate-400"}`}>
                        RUC: {c.ruc || "SIN RUC"}
                      </div>
                    </div>
                  ))}
                  {query.trim() && !matchFound && (
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowDropdown(false);
                        setShowQuickClienteModal(true);
                      }}
                      className={`px-3 py-2 text-[10px] cursor-pointer rounded-lg mt-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-black border border-teal-200/80 flex items-center gap-1.5 transition-all shadow-sm
                        ${highlightIndex === results.length ? "ring-2 ring-teal-500 font-bold" : ""}`}
                    >
                      <Icon name="plus-circle" className="h-3.5 w-3.5 text-teal-600" />
                      <span className="uppercase">Crear Cliente "{query.trim()}"</span>
                    </div>
                  )}
                </>
              )}
            </div>,
            document.body
          )}
        </div>
      )}
      {value && onOptionsClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOptionsClick(e);
          }}
          className="ml-1.5 p-0.5 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          title="Opciones Cliente"
        >
          <Icon name="more-vertical" className="h-3.5 w-3.5" />
        </button>
      )}
      <QuickCreateClienteModal
        open={showQuickClienteModal}
        onClose={() => setShowQuickClienteModal(false)}
        initialName={query}
        coords={coords}
        numReg={numReg}
        onSave={(nuevoCliente) => {
          handleSelectOption(nuevoCliente);
        }}
      />
    </div>
  );
};




export const RepresentanteAutocomplete = ({ value, clienteId, onSelect, isReadOnly, initialId, onContextMenu, onOptionsClick, tabIndex, numReg, className }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [width, setWidth] = useState(120);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isFocused, setIsFocused] = useState(false);

  const [showQuickRepModal, setShowQuickRepModal] = useState(false);
  const containerRef = useRef(null);
  const spanRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const cacheRef = useRef({}); // Keyed by clienteId: { [clienteId]: [...] }

  // Sync with parent value
  useEffect(() => {
    if (!isFocused) {
      setQuery(value || "");
    }
  }, [value, isFocused]);

  // Trigger onSelect to clear representative when query is empty
  useEffect(() => {
    if (query === "" && value && isFocused) {
      onSelect({ id_representante: null, nombre_representante: "", codigo: "" });
    }
  }, [query, value, onSelect, isFocused]);

  // Measure text width dynamically
  useEffect(() => {
    if (spanRef.current) {
      const measured = spanRef.current.offsetWidth;
      setWidth(Math.max(100, Math.min(260, measured + 12)));
    }
  }, [query]);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  // Continuous viewport tracking loop when open (solves modal animation lag/gap)
  useEffect(() => {
    if (!showDropdown) return;
    
    let active = true;
    const tick = () => {
      if (!active) return;
      updateCoords();
      requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
    return () => {
      active = false;
    };
  }, [showDropdown]);

  // Scroll highlighted item into view automatically (keyboard arrow navigation scroll)
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

  const fetchResults = async (searchVal) => {
    if (!clienteId) return;
    if (!searchVal && cacheRef.current[clienteId]) {
      const dataArray = cacheRef.current[clienteId];
      setResults(dataArray);
      if (dataArray.length > 0) {
        setHighlightIndex(0);
      } else {
        setHighlightIndex(-1);
      }
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await api.get("core/representantes/buscar/", {
        params: { cliente_id: clienteId, q: searchVal }
      });
      const dataArray = Array.isArray(res) ? res : [];
      setResults(dataArray);
      if (dataArray.length > 0) {
        setHighlightIndex(0);
      } else {
        setHighlightIndex(-1);
      }
      if (!searchVal) {
        cacheRef.current[clienteId] = dataArray;
      }
    } catch (err) {
      console.error("❌ Error buscando encargados:", err);
      setResults([]);
      setHighlightIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  // Debounce API call on query change
  useEffect(() => {
    if (!showDropdown || !clienteId) return;

    const t = setTimeout(() => {
      fetchResults(query.trim());
    }, 300);

    return () => clearTimeout(t);
  }, [query, showDropdown, clienteId]);

  const handleFocus = () => {
    if (!clienteId) return;
    setShowDropdown(true);
    setIsFocused(true);
    fetchResults(query.trim());
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setHighlightIndex(-1);
      if (query !== value) {
        onSelect({ id_representante: initialId, nombre_representante: query, fromBlur: true });
      }
    }, 150);
  };


  const matchFound = results.some(
    (enc) => hasMatchingPrefix(enc.nombre_representante, query)
  );

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const maxIndex = clienteId && query.trim() && !matchFound ? results.length : results.length - 1;
      setHighlightIndex((prev) => (prev + 1 <= maxIndex ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const maxIndex = clienteId && query.trim() && !matchFound ? results.length : results.length - 1;
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : maxIndex));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && results[highlightIndex]) {
        handleSelectOption(results[highlightIndex]);
      } else if (highlightIndex === results.length || (clienteId && query.trim() && !matchFound)) {
        setShowDropdown(false);
        setShowQuickRepModal(true);
      } else {
        setShowDropdown(false);
        setHighlightIndex(-1);
        if (query !== value) {
          onSelect({ id_representante: null, nombre_representante: query, fromBlur: true });
        }
      }
    } else if (e.key === "Tab" || e.key === "Escape") {
      setShowDropdown(false);
      setHighlightIndex(-1);
      if (query !== value) {
        onSelect({ id_representante: null, nombre_representante: query, fromBlur: true });
      }
    }
  };

  const handleSelectOption = (item) => {
    setQuery(item.nombre_representante);
    setShowDropdown(false);
    setHighlightIndex(-1);
    onSelect(item);
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => {
        setShowDropdown(false);
        if (onContextMenu) onContextMenu(e);
      }}
      className={className || "relative flex items-center px-2 py-1 rounded-lg hover:bg-gray-50 transition-all font-sans"}
    >
      <Icon name="user" className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
      {isReadOnly ? (
        <span className="font-bold text-gray-800 uppercase tracking-tight truncate max-w-[150px]">
          {value || "SIN NOMBRE"}
        </span>
      ) : (
        <div className="relative flex items-center">
          {/* Invisible span to measure the exact text width dynamically */}
          <span
            ref={spanRef}
            className="absolute -top-[9999px] -left-[9999px] invisible whitespace-pre font-bold text-xs uppercase px-1"
          >
            {query || (clienteId ? "Buscar encargado..." : "Selecciona cliente primero")}
          </span>
          <input
            ref={inputRef}
            type="text"
            tabIndex={tabIndex}
            className="bg-transparent hover:bg-white focus:bg-white border-b border-transparent focus:border-teal-300 px-1 font-bold text-gray-800 uppercase outline-none text-xs transition-all"
            style={{ width: `${width}px` }}
            value={query}
            onFocus={(e) => {
              e.target.select();
              handleFocus();
            }}
            onBlur={handleBlur}
            onClick={(e) => {
              e.target.select();
              if (!showDropdown) handleFocus();
            }}
            onMouseDown={(e) => {
              if (e.button === 2) {
                e.preventDefault();
              }
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!showDropdown) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={clienteId ? "Buscar encargado..." : "Selecciona cliente primero"}
            disabled={!clienteId}
          />
          {showDropdown && (results.length > 0 || loading || (clienteId && query.trim() && !matchFound)) && createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: `${coords.top + 2}px`,
                left: `${coords.left}px`,
                width: `${Math.max(220, coords.width)}px`,
                zIndex: 9999,
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => e.preventDefault()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="autocomplete-dropdown-portal bg-white/95 backdrop-blur-md border border-slate-100/80 rounded-2xl shadow-xl shadow-slate-200/40 max-h-60 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 text-left font-sans pointer-events-auto"
            >
              {loading ? (
                <div className="p-3 text-center text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Buscando...</div>
              ) : (
                <>
                  {results.map((enc, index) => (
                    <div
                      key={enc.id_representante}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOption(enc);
                      }}
                      className={`px-3 py-2 text-[10px] cursor-pointer rounded-lg mb-0.5 last:mb-0 transition-all duration-150 border-l-2
                        ${highlightIndex === index 
                          ? "bg-amber-50/80 text-amber-950 border-amber-500 font-semibold" 
                          : "hover:bg-slate-50/80 text-slate-700 border-transparent"}`}
                    >
                      <div className="font-black uppercase">{highlightMatch(enc.nombre_representante, query)}</div>
                      <div className={`text-[8px] mt-0.5 font-bold transition-colors
                        ${highlightIndex === index ? "text-amber-600/80" : "text-slate-400"}`}>
                        {enc.cargo || "SIN CARGO"}
                      </div>
                    </div>
                  ))}
                  {clienteId && query.trim() && !matchFound && (
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowDropdown(false);
                        setShowQuickRepModal(true);
                      }}
                      className={`px-3 py-2 text-[10px] cursor-pointer rounded-lg mt-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-black border border-amber-200/80 flex items-center gap-1.5 transition-all shadow-sm
                        ${highlightIndex === results.length ? "ring-2 ring-amber-500 font-bold" : ""}`}
                    >
                      <Icon name="user-plus" className="h-3.5 w-3.5 text-amber-600" />
                      <span className="uppercase">Crear Representante "{query.trim()}"</span>
                    </div>
                  )}
                </>
              )}
            </div>,
            document.body
          )}
        </div>
      )}
      {value && onOptionsClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOptionsClick(e);
          }}
          className="ml-1.5 p-0.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          title="Opciones Encargado"
        >
          <Icon name="more-vertical" className="h-3.5 w-3.5" />
        </button>
      )}
      <QuickCreateRepresentanteModal
        open={showQuickRepModal}
        onClose={() => setShowQuickRepModal(false)}
        clienteId={clienteId}
        initialName={query}
        coords={coords}
        numReg={numReg}
        onSave={(nuevoRep) => {
          // Limpiar caché para este clienteId
          if (cacheRef.current[clienteId]) {
            delete cacheRef.current[clienteId];
          }
          handleSelectOption(nuevoRep);
        }}
      />
    </div>
  );
};



export const ProductoAutocomplete = ({
  value,
  idMarca,
  onSelect,
  isReadOnly,
  tcamb = 1,
  tipoMoneda = "S",
  placeholder = "Buscar código...",
  tabIndex,
  catalogoVersion = 0,
  onKeyDown,
  onTriggerCreate,
  id
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [width, setWidth] = useState(100);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef(null);
  const spanRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const cacheRef = useRef({});
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  // Bust cache if catalogoVersion changes
  useEffect(() => {
    cacheRef.current = {};
  }, [catalogoVersion]);

  // Sync with parent value
  useEffect(() => {
    if (!isFocused) {
      setQuery(value || "");
    }
  }, [value, isFocused]);

  // Measure text width dynamically
  useEffect(() => {
    if (spanRef.current) {
      const measured = spanRef.current.offsetWidth;
      setWidth(Math.max(100, Math.min(260, measured + 12)));
    }
  }, [query]);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  // Continuous viewport tracking loop when open
  useEffect(() => {
    if (!showDropdown) return;
    
    let active = true;
    const tick = () => {
      if (!active) return;
      updateCoords();
      requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
    return () => {
      active = false;
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

  const fetchResults = async (searchVal) => {
    if (!idMarca) return;
    const cacheKey = `${idMarca}-${searchVal}`;
    if (cacheRef.current[cacheKey]) {
      const dataArray = cacheRef.current[cacheKey];
      setResults(dataArray);
      
      const exactMatch = dataArray.find(item => (item.codigo || "").toLowerCase().trim() === searchVal.toLowerCase().trim());
      if (exactMatch) {
        setHighlightIndex(dataArray.indexOf(exactMatch));
      } else if (dataArray.length > 0) {
        setHighlightIndex(0);
      } else if (searchVal.trim()) {
        setHighlightIndex(0);
      } else {
        setHighlightIndex(-1);
      }
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await api.get("core/productos/", {
        params: { id_marca: idMarca, search: searchVal }
      });
      const dataArray = res && res.ok && Array.isArray(res.data) ? res.data : [];
      setResults(dataArray);
      
      const exactMatch = dataArray.find(item => (item.codigo || "").toLowerCase().trim() === searchVal.toLowerCase().trim());
      if (exactMatch) {
        setHighlightIndex(dataArray.indexOf(exactMatch));
      } else if (dataArray.length > 0) {
        setHighlightIndex(0);
      } else if (searchVal.trim()) {
        setHighlightIndex(0);
      } else {
        setHighlightIndex(-1);
      }
      cacheRef.current[cacheKey] = dataArray;
    } catch (err) {
      console.error("❌ Error buscando productos:", err);
      setResults([]);
      setHighlightIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  // Debounce API call on query change
  useEffect(() => {
    if (!showDropdown || !idMarca) return;

    const t = setTimeout(() => {
      fetchResults(query.trim());
    }, 300);

    return () => clearTimeout(t);
  }, [query, showDropdown, idMarca, catalogoVersion]);

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

  const handleFocus = () => {
    if (!idMarca) return;
    setShowDropdown(true);
    setIsFocused(true);
    fetchResults(query.trim());
  };

  const exactMatchExists = results.some(
    (item) => (item.codigo || "").toLowerCase().trim() === query.toLowerCase().trim()
  );

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setHighlightIndex(-1);
      if (query && query !== value) {
        const match = results.find(item => (item.codigo || '').toUpperCase() === query.trim().toUpperCase());
        if (match) {
          onSelect(match);
        } else {
          onSelect({ codigo: query, isCustom: true });
        }
      }
    }, 200);
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (onKeyDown) onKeyDown(e);
      return;
    }
    if (!showDropdown) {
      if (onKeyDown) onKeyDown(e);
      return;
    }
    const maxIndex = exactMatchExists ? results.length - 1 : results.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 <= maxIndex ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : maxIndex));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < results.length && results[highlightIndex]) {
        handleSelectOption(results[highlightIndex]);
      } else if (highlightIndex === results.length && !exactMatchExists && query.trim()) {
        setShowDropdown(false);
        setHighlightIndex(-1);
        if (onTriggerCreate) {
          onTriggerCreate(query);
        } else {
          onSelect({ codigo: query, isCustom: true });
        }
      } else {
        setShowDropdown(false);
        setHighlightIndex(-1);
        if (query !== value) {
          const match = results.find(item => (item.codigo || '').toUpperCase() === query.trim().toUpperCase());
          if (match) {
            onSelect(match);
          } else {
            onSelect({ codigo: query, isCustom: true });
          }
        }
      }
    } else if (e.key === "Tab" || e.key === "Escape") {
      e.stopPropagation();
      setShowDropdown(false);
      setHighlightIndex(-1);
      if (query !== value) {
        const match = results.find(item => (item.codigo || '').toUpperCase() === query.trim().toUpperCase());
        if (match) {
          onSelect(match);
        } else {
          onSelect({ codigo: query, isCustom: true });
        }
      }
    } else {
      if (onKeyDown) onKeyDown(e);
    }
  };

  const handleSelectOption = (item) => {
    setQuery(item.codigo);
    setShowDropdown(false);
    setHighlightIndex(-1);
    onSelect(item);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center px-1 py-0.5 rounded transition-all w-full justify-center font-bold text-xs"
    >
      {isReadOnly ? (
        <span className="font-bold text-gray-800 uppercase tracking-tight truncate max-w-[150px]">
          {value || "---"}
        </span>
      ) : (
        <div className="relative flex items-center w-full justify-center">
          <span
            ref={spanRef}
            className="absolute -top-[9999px] -left-[9999px] invisible whitespace-pre font-bold text-xs uppercase px-1"
          >
            {query || (idMarca ? placeholder : "Selecciona marca")}
          </span>
          <input
            id={id}
            ref={inputRef}
            type="text"
            tabIndex={tabIndex}
            className="bg-transparent hover:bg-white focus:bg-white border border-gray-200 rounded px-1 py-0.5 font-bold text-gray-800 uppercase outline-none text-[11px] transition-all text-center w-full focus:ring-1 focus:ring-teal-500"
            value={query}
            onFocus={(e) => {
              e.target.select();
              handleFocus();
            }}
            onBlur={handleBlur}
            onClick={(e) => {
              e.target.select();
              if (!showDropdown) handleFocus();
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!showDropdown) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={idMarca ? placeholder : "Marca..."}
            disabled={!idMarca}
          />
          {showDropdown && idMarca && (results.length > 0 || (!exactMatchExists && query.trim()) || loading) && createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: `${coords.top + 2}px`,
                left: `${coords.left}px`,
                width: `${Math.max(280, coords.width)}px`,
                zIndex: 9999,
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => e.preventDefault()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="autocomplete-dropdown-portal bg-white/95 backdrop-blur-md border border-slate-100/80 rounded-2xl shadow-xl shadow-slate-200/40 max-h-60 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 text-left pointer-events-auto"
            >
              {loading ? (
                <div className="p-3 text-center text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Buscando...</div>
              ) : (
                <>
                  {results.map((prod, index) => (
                    <div
                      key={prod.id_producto}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOption(prod);
                      }}
                      className={`px-3 py-2 text-[10px] cursor-pointer rounded-lg mb-0.5 last:mb-0 transition-all duration-150 border-l-2
                        ${highlightIndex === index 
                          ? "bg-teal-50/80 text-teal-950 border-teal-500 font-semibold" 
                          : "hover:bg-slate-50/80 text-slate-700 border-transparent"}`}
                    >
                      <div className="font-black uppercase">
                        {highlightMatch(prod.codigo, query)}
                      </div>
                      <div className={`text-[9px] font-semibold mt-0.5 line-clamp-1 transition-colors
                        ${highlightIndex === index ? "text-teal-900" : "text-slate-500"}`}>
                        {prod.nombre}
                      </div>
                      <div className={`text-[8px] mt-0.5 font-bold transition-colors
                        ${highlightIndex === index ? "text-teal-700" : "text-slate-400"}`}>
                        S/. {prod.precio_soles} | $ {prod.precio_dolares}
                      </div>
                    </div>
                  ))}
                  {!exactMatchExists && query.trim() && (
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowDropdown(false);
                        setHighlightIndex(-1);
                        if (onTriggerCreate) {
                          onTriggerCreate(query);
                        } else {
                          onSelect({ codigo: query, isCustom: true });
                        }
                      }}
                      className={`px-3 py-2 cursor-pointer rounded-lg mb-0.5 border border-dashed text-center font-bold text-[10px] tracking-wide uppercase transition-colors
                        ${highlightIndex === results.length 
                          ? "bg-teal-50 border-teal-500 text-teal-950" 
                          : "hover:bg-slate-50 border-slate-200 text-slate-600"}`}
                    >
                      + Agregar Producto: "{query.toUpperCase()}"
                    </div>
                  )}
                </>
              )}
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
};

export const TipoPersonalAutocomplete = ({ value, idArea, onSelect, isReadOnly, tabIndex, placeholder = "Buscar personal...", onKeyDown, onTriggerCreatePersonal, catalogoVersion = 0, idRegistro }) => {
  const [query, setQuery] = useState("");
  const [allPersonal, setAllPersonal] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [width, setWidth] = useState(120);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef(null);
  const spanRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [creating, setCreating] = useState(false);

  // Sync with parent value
  useEffect(() => {
    if (!isFocused) {
      setQuery(value || "");
    }
  }, [value, isFocused]);

  // Load all personal for this area
  useEffect(() => {
    if (!idArea) {
      setAllPersonal([]);
      return;
    }
    const loadPersonal = async () => {
      setLoading(true);
      try {
        const { data: res } = await api.get("core/tipo_personal/");
        const dataArray = res && res.ok && Array.isArray(res.data) ? res.data : [];
        const filteredByArea = dataArray.filter(
          (r) => r.id_area && String(r.id_area) === String(idArea) && r.activo === 1
        );
        setAllPersonal(filteredByArea);
      } catch (err) {
        console.error("❌ Error cargando tipo personal:", err);
        setAllPersonal([]);
      } finally {
        setLoading(false);
      }
    };
    loadPersonal();
  }, [idArea, catalogoVersion]);

  // Measure text width dynamically
  useEffect(() => {
    if (spanRef.current) {
      const measured = spanRef.current.offsetWidth;
      setWidth(Math.max(120, Math.min(260, measured + 12)));
    }
  }, [query]);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (!showDropdown) return;
    let active = true;
    const tick = () => {
      if (!active) return;
      updateCoords();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      active = false;
    };
  }, [showDropdown]);

  useEffect(() => {
    if (showDropdown && highlightIndex >= 0 && dropdownRef.current) {
      const container = dropdownRef.current;
      const items = container.querySelectorAll(".cursor-pointer");
      const activeItem = items[highlightIndex];
      if (activeItem) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const flexOffsetTop = activeItem.offsetTop;
        const flexOffsetHeight = activeItem.offsetHeight;

        if (flexOffsetTop < containerTop) {
          container.scrollTop = flexOffsetTop;
        } else if (flexOffsetTop + flexOffsetHeight > containerBottom) {
          container.scrollTop = flexOffsetTop + flexOffsetHeight - container.clientHeight;
        }
      }
    }
  }, [highlightIndex, showDropdown]);

  const fetchResults = (searchVal) => {
    const queryText = searchVal.toLowerCase().trim();
    const filtered = queryText
      ? allPersonal.filter(
          (r) =>
            r.codigo?.toLowerCase().includes(queryText) ||
            r.nombre?.toLowerCase().includes(queryText)
        )
      : allPersonal;

    const mappedOptions = filtered.map((p) => ({
      ...p,
      id: p.codigo,
      displayName: `${p.codigo}-${p.nombre}`
    }));

    setResults(mappedOptions);
    if (mappedOptions.length > 0) {
      setHighlightIndex(0);
    } else {
      setHighlightIndex(-1);
    }
  };

  useEffect(() => {
    fetchResults(query);
  }, [query, allPersonal]);

  const handleFocus = () => {
    setShowDropdown(true);
    setIsFocused(true);
  };

  const exactMatchExists = allPersonal.some(
    p => normalizeText(p.nombre) === normalizeText(query) || normalizeText(`${p.codigo}-${p.nombre}`) === normalizeText(query)
  );

  const handleCreatePersonal = async (personalName) => {
    const uppercaseName = personalName.trim().toUpperCase();
    if (!uppercaseName) return;

    setCreating(true);
    try {
      const { data: res } = await api.post("core/tipo_personal/", {
        nombre: uppercaseName,
        id_area: idArea,
        costo_min: 0,
        costo_max: 0,
        id_registro: idRegistro
      });
      if (res.ok && res.registro) {
        toast.success(`Tipo de personal "${uppercaseName}" creado con éxito`);
        const itemMapeado = {
          ...res.registro,
          id: res.registro.codigo,
          displayName: `${res.registro.codigo}-${res.registro.nombre}`
        };
        setAllPersonal(prev => [...prev, itemMapeado]);
        handleSelectOption(itemMapeado);
      } else {
        toast.error("Error al crear el tipo de personal");
      }
    } catch (err) {
      console.error("Error al crear personal:", err);
      toast.error("Error al crear el tipo de personal");
    } finally {
      setCreating(false);
    }
  };

  const getNextCode = () => {
    if (!idArea) return "";
    const prefix = String(idArea).padStart(2, '0');
    let maxNum = 0;
    let hasSeparator = false;
    let zfillLen = 2;

    const areaCodes = allPersonal
      .filter(p => p.codigo)
      .map(p => p.codigo);

    for (const code of areaCodes) {
      if (!code) continue;
      const regex = new RegExp(`^${prefix}(-?)(\\d+)$`);
      const match = code.match(regex);
      if (match) {
        const sep = match[1];
        const numStr = match[2];
        if (sep === '-') {
          hasSeparator = true;
        }
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
          zfillLen = numStr.length;
        }
      }
    }

    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(zfillLen, '0');
    if (hasSeparator || areaCodes.some(c => c.startsWith(prefix) && c.includes('-'))) {
      return `${prefix}-${paddedNum}`;
    } else {
      return `${prefix}${paddedNum}`;
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setHighlightIndex(-1);
      if (query && query !== value) {
        const match = allPersonal.find(
          (p) => `${p.codigo}-${p.nombre}`.toUpperCase() === query.toUpperCase() ||
                 p.codigo?.toUpperCase() === query.toUpperCase()
        );
        if (match) {
          onSelect(match);
        } else {
          const hyphenIdx = query.indexOf('-');
          const code = hyphenIdx !== -1 ? query.substring(0, hyphenIdx).trim() : getNextCode();
          const nombre = hyphenIdx !== -1 ? query.substring(hyphenIdx + 1).trim() : query.trim();
          onSelect({ codigo: code, nombre: nombre, isCustom: true });
        }
      }
    }, 150);
  };

  const handleKeyDownInternal = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (onKeyDown) onKeyDown(e);
      return;
    }
    if (!showDropdown) {
      if (onKeyDown) onKeyDown(e);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      setHighlightIndex((prev) => (prev + 1 <= maxIndex ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : maxIndex));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      if (highlightIndex >= 0 && highlightIndex < results.length && results[highlightIndex]) {
        handleSelectOption(results[highlightIndex]);
      } else if (highlightIndex === results.length && !exactMatchExists && query.trim()) {
        if (onTriggerCreatePersonal) {
          onTriggerCreatePersonal(query);
        } else {
          handleCreatePersonal(query);
        }
        setShowDropdown(false);
        setHighlightIndex(-1);
      } else {
        setShowDropdown(false);
        setHighlightIndex(-1);
        if (query && query !== value) {
          const match = allPersonal.find(
            (p) => `${p.codigo}-${p.nombre}`.toUpperCase() === query.toUpperCase() ||
                   p.codigo?.toUpperCase() === query.toUpperCase()
          );
          if (match) {
            onSelect(match);
          } else {
            const hyphenIdx = query.indexOf('-');
            const code = hyphenIdx !== -1 ? query.substring(0, hyphenIdx).trim() : getNextCode();
            const nombre = hyphenIdx !== -1 ? query.substring(hyphenIdx + 1).trim() : query.trim();
            onSelect({ codigo: code, nombre: nombre, isCustom: true });
          }
        }
      }
    } else if (e.key === "Tab" || e.key === "Escape") {
      setShowDropdown(false);
      setHighlightIndex(-1);
    } else {
      if (onKeyDown) onKeyDown(e);
    }
  };

  const handleSelectOption = (item) => {
    const codeName = `${item.codigo}-${item.nombre}`;
    setQuery(codeName);
    setShowDropdown(false);
    setHighlightIndex(-1);
    onSelect(item);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center px-1 py-0.5 rounded transition-all w-full justify-start font-bold text-xs"
    >
      {isReadOnly ? (
        <span className="font-bold text-gray-800 uppercase tracking-tight truncate max-w-[150px]">
          {value || "---"}
        </span>
      ) : (
        <div className="relative flex items-center w-full">
          <span
            ref={spanRef}
            className="absolute -top-[9999px] -left-[9999px] invisible whitespace-pre font-bold text-xs uppercase px-1"
          >
            {query || (idArea ? placeholder : "Selecciona área")}
          </span>
          <input
            ref={inputRef}
            type="text"
            tabIndex={tabIndex}
            className="bg-transparent hover:bg-white focus:bg-white border border-gray-200 rounded px-1.5 py-0.5 font-bold text-gray-800 uppercase outline-none text-[11px] transition-all w-full focus:ring-1 focus:ring-indigo-500"
            value={query}
            onFocus={(e) => {
              const target = e.target;
              setTimeout(() => {
                if (target) target.select();
              }, 50);
              handleFocus();
            }}
            onBlur={handleBlur}
            onClick={(e) => {
              const target = e.target;
              setTimeout(() => {
                if (target) target.select();
              }, 50);
              if (!showDropdown) handleFocus();
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!showDropdown) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDownInternal}
            placeholder={idArea ? placeholder : "Selecciona área..."}
            disabled={!idArea}
          />
          {showDropdown && idArea && (results.length > 0 || (!exactMatchExists && query.trim()) || loading || creating) && createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: `${coords.top + 2}px`,
                left: `${coords.left}px`,
                width: `${Math.max(300, coords.width)}px`,
                zIndex: 9999,
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => e.preventDefault()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="autocomplete-dropdown-portal bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 text-left pointer-events-auto"
            >
              {creating ? (
                <div className="p-3 text-center text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Creando Personal...</div>
              ) : loading ? (
                <div className="p-3 text-center text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Cargando...</div>
              ) : (
                <>
                  {results.map((item, index) => (
                    <div
                      key={item.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOption(item);
                      }}
                      className={`px-3 py-2 cursor-pointer rounded-lg mb-1 last:mb-0 transition-all duration-150 border-l-4 text-left
                        ${highlightIndex === index 
                          ? "bg-indigo-50/70 text-indigo-950 border-indigo-500 font-semibold shadow-sm" 
                          : "hover:bg-slate-50 text-slate-700 border-transparent"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded shrink-0">
                          {item.codigo}
                        </span>
                        <span className="font-extrabold text-[11.5px] uppercase tracking-wide text-slate-800 truncate">
                          {item.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 pl-0.5 text-[9.5px] font-bold">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 uppercase tracking-tighter text-[9px]">MÍNIMO:</span>
                          <span className="text-indigo-600 font-black bg-indigo-50/50 border border-indigo-100/50 px-1.5 py-0.5 rounded">${parseFloat(item.costo_min || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 uppercase tracking-tighter text-[9px]">MÁXIMO:</span>
                          <span className="text-emerald-600 font-black bg-emerald-50/50 border border-emerald-100/50 px-1.5 py-0.5 rounded">${parseFloat(item.costo_max || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!exactMatchExists && query.trim() && (
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (onTriggerCreatePersonal) {
                          onTriggerCreatePersonal(query);
                        } else {
                          handleCreatePersonal(query);
                        }
                        setShowDropdown(false);
                        setHighlightIndex(-1);
                      }}
                      className={`px-3 py-2 cursor-pointer rounded-lg mb-1 last:mb-0 border border-dashed text-center font-bold text-[10.5px] tracking-wide uppercase transition-colors
                        ${highlightIndex === results.length 
                          ? "bg-indigo-50 border-indigo-500 text-indigo-750" 
                          : "hover:bg-slate-50 border-slate-200 text-slate-650"}`}
                    >
                      Agregar Personal: "{query.toUpperCase()}"
                    </div>
                  )}
                </>
              )}
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
};

export const TipoGastoDetalleAutocomplete = ({ value, codePrefix, onSelect, isReadOnly, tabIndex, placeholder = "Buscar gasto...", onKeyDown, onTriggerCreateGasto, idRegistro }) => {
  const [query, setQuery] = useState("");
  const [allGastos, setAllGastos] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef(null);
  const spanRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [creating, setCreating] = useState(false);

  // Sync with parent value
  useEffect(() => {
    if (!isFocused) {
      setQuery(value || "");
    }
  }, [value, isFocused]);

  // Load all expenses
  useEffect(() => {
    const loadGastos = async () => {
      setLoading(true);
      try {
        const { data: res } = await api.get("core/tipo_gasto_detalle/");
        const dataArray = res && res.ok && Array.isArray(res.data) ? res.data : [];
        const activeGastos = dataArray.filter((r) => r.activo === 1);
        setAllGastos(activeGastos);
      } catch (err) {
        console.error("❌ Error cargando tipo gasto detalle:", err);
        setAllGastos([]);
      } finally {
        setLoading(false);
      }
    };
    loadGastos();
  }, []);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (!showDropdown) return;
    let active = true;
    const tick = () => {
      if (!active) return;
      updateCoords();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      active = false;
    };
  }, [showDropdown]);

  useEffect(() => {
    if (showDropdown && highlightIndex >= 0 && dropdownRef.current) {
      const container = dropdownRef.current;
      const items = container.querySelectorAll(".cursor-pointer");
      const activeItem = items[highlightIndex];
      if (activeItem) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const flexOffsetTop = activeItem.offsetTop;
        const flexOffsetHeight = activeItem.offsetHeight;

        if (flexOffsetTop < containerTop) {
          container.scrollTop = flexOffsetTop;
        } else if (flexOffsetTop + flexOffsetHeight > containerBottom) {
          container.scrollTop = flexOffsetTop + flexOffsetHeight - container.clientHeight;
        }
      }
    }
  }, [highlightIndex, showDropdown]);

  const fetchResults = (searchVal) => {
    const queryText = searchVal.toLowerCase().trim();
    let filtered = allGastos;
    if (codePrefix) {
      filtered = filtered.filter((r) => r.codigo && r.codigo.startsWith(codePrefix));
    }
    if (queryText) {
      filtered = filtered.filter(
        (r) =>
          r.codigo?.toLowerCase().includes(queryText) ||
          r.nombre?.toLowerCase().includes(queryText)
      );
    }

    const mappedOptions = filtered.map((g) => ({
      ...g,
      id: g.codigo,
      displayName: `${g.codigo}-${g.nombre}`
    }));

    setResults(mappedOptions);
    if (mappedOptions.length > 0) {
      setHighlightIndex(0);
    } else {
      setHighlightIndex(-1);
    }
  };

  useEffect(() => {
    fetchResults(query);
  }, [query, allGastos, codePrefix]);

  const handleFocus = () => {
    setShowDropdown(true);
    setIsFocused(true);
  };

  const exactMatchExists = allGastos.some(
    g => (codePrefix ? g.codigo?.startsWith(codePrefix) : true) && 
         (normalizeText(g.nombre) === normalizeText(query) || normalizeText(g.codigo) === normalizeText(query))
  );

  const handleCreateGasto = async (gastoName) => {
    const uppercaseName = gastoName.trim().toUpperCase();
    if (!uppercaseName) return;



    setCreating(true);
    try {
      const { data: res } = await api.post("core/tipo_gasto_detalle/", {
        nombre: uppercaseName,
        code_prefix: codePrefix,
        id_registro: idRegistro
      });
      if (res.ok && res.registro) {
        toast.success(`Tipo de gasto "${uppercaseName}" creado con éxito`);
        const itemMapeado = {
          ...res.registro,
          id: res.registro.codigo,
          displayName: `${res.registro.codigo}-${res.registro.nombre}`
        };
        setAllGastos(prev => [...prev, itemMapeado]);
        handleSelectOption(itemMapeado);
      } else {
        toast.error("Error al crear el tipo de gasto");
      }
    } catch (err) {
      console.error("Error al crear gasto:", err);
      toast.error("Error al crear el tipo de gasto");
    } finally {
      setCreating(false);
    }
  };

  const getNextCode = () => {
    if (!codePrefix) return "";
    let maxNum = 0;
    let hasSeparator = false;
    let zfillLen = 3;

    const activeCodes = allGastos
      .filter(g => g.codigo && g.codigo.startsWith(codePrefix))
      .map(g => g.codigo);

    for (const code of activeCodes) {
      if (!code) continue;
      const regex = new RegExp(`^${codePrefix}(-?)(\\d+)$`);
      const match = code.match(regex);
      if (match) {
        const sep = match[1];
        const numStr = match[2];
        if (sep === '-') {
          hasSeparator = true;
        }
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
          zfillLen = numStr.length;
        }
      }
    }

    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(zfillLen, '0');
    if (hasSeparator || activeCodes.some(c => c.startsWith(codePrefix) && c.includes('-'))) {
      return `${codePrefix}-${paddedNum}`;
    } else {
      return `${codePrefix}${paddedNum}`;
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setHighlightIndex(-1);
      if (query && query !== value) {
        const match = allGastos.find(
          (g) => g.codigo?.toUpperCase() === query.toUpperCase()
        );
        if (match) {
          onSelect(match);
        } else {
          const hyphenIdx = query.indexOf('-');
          const code = hyphenIdx !== -1 ? query.substring(0, hyphenIdx).trim() : getNextCode();
          const nombre = hyphenIdx !== -1 ? query.substring(hyphenIdx + 1).trim() : query.trim();
          onSelect({ codigo: code, nombre: nombre, isCustom: true });
        }
      }
    }, 150);
  };

  const handleKeyDownInternal = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (onKeyDown) onKeyDown(e);
      return;
    }
    if (!showDropdown) {
      if (onKeyDown) onKeyDown(e);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      setHighlightIndex((prev) => (prev + 1 <= maxIndex ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : maxIndex));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      if (highlightIndex >= 0 && highlightIndex < results.length && results[highlightIndex]) {
        handleSelectOption(results[highlightIndex]);
      } else if (highlightIndex === results.length && !exactMatchExists && query.trim()) {
        if (onTriggerCreateGasto) {
          onTriggerCreateGasto(query);
        } else {
          handleCreateGasto(query);
        }
        setShowDropdown(false);
        setHighlightIndex(-1);
      } else {
        setShowDropdown(false);
        setHighlightIndex(-1);
        if (query && query !== value) {
          const match = allGastos.find(
            (g) => g.codigo?.toUpperCase() === query.toUpperCase()
          );
          if (match) {
            onSelect(match);
          } else {
            const hyphenIdx = query.indexOf('-');
            const code = hyphenIdx !== -1 ? query.substring(0, hyphenIdx).trim() : getNextCode();
            const nombre = hyphenIdx !== -1 ? query.substring(hyphenIdx + 1).trim() : query.trim();
            onSelect({ codigo: code, nombre: nombre, isCustom: true });
          }
        }
      }
    } else if (e.key === "Tab" || e.key === "Escape") {
      setShowDropdown(false);
      setHighlightIndex(-1);
    } else {
      if (onKeyDown) onKeyDown(e);
    }
  };

  const handleSelectOption = (item) => {
    setQuery(item.codigo);
    setShowDropdown(false);
    setHighlightIndex(-1);
    onSelect(item);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center px-1 py-0.5 rounded transition-all w-full justify-start font-bold text-xs"
    >
      {isReadOnly ? (
        <span className="font-bold text-gray-800 uppercase tracking-tight truncate max-w-[150px]">
          {value || "---"}
        </span>
      ) : (
        <div className="relative flex items-center w-full">
          <span
            ref={spanRef}
            className="absolute -top-[9999px] -left-[9999px] invisible whitespace-pre font-bold text-xs uppercase px-1"
          >
            {query || placeholder}
          </span>
          <input
            ref={inputRef}
            type="text"
            tabIndex={tabIndex}
            className="bg-transparent hover:bg-white focus:bg-white border border-gray-200 rounded px-1.5 py-0.5 font-bold text-gray-800 uppercase outline-none text-[11px] transition-all w-full focus:ring-1 focus:ring-indigo-500"
            value={query}
            onFocus={(e) => {
              const target = e.target;
              setTimeout(() => {
                if (target) target.select();
              }, 50);
              handleFocus();
            }}
            onBlur={handleBlur}
            onClick={(e) => {
              const target = e.target;
              setTimeout(() => {
                if (target) target.select();
              }, 50);
              if (!showDropdown) handleFocus();
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!showDropdown) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDownInternal}
            placeholder={placeholder}
          />
          {showDropdown && (results.length > 0 || (!exactMatchExists && query.trim()) || loading || creating) && createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: `${coords.top + 2}px`,
                left: `${coords.left}px`,
                width: `${Math.max(300, coords.width)}px`,
                zIndex: 9999,
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => e.preventDefault()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="autocomplete-dropdown-portal bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 text-left pointer-events-auto"
            >
              {creating ? (
                <div className="p-3 text-center text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Creando Gasto...</div>
              ) : loading ? (
                <div className="p-3 text-center text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Cargando...</div>
              ) : (
                <>
                  {results.map((item, index) => (
                    <div
                      key={item.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOption(item);
                      }}
                      className={`px-3 py-2 cursor-pointer rounded-lg mb-1 last:mb-0 transition-all duration-150 border-l-4 text-left
                        ${highlightIndex === index 
                          ? "bg-teal-50 text-teal-950 border-teal-500 font-semibold shadow-sm" 
                          : "hover:bg-slate-50 text-slate-700 border-transparent"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[9px] font-black text-teal-650 bg-teal-50 border border-teal-100 rounded shrink-0">
                          {item.codigo}
                        </span>
                        <span className="font-extrabold text-[11.5px] uppercase tracking-wide text-slate-800 truncate">
                          {item.nombre}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!exactMatchExists && query.trim() && (
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (onTriggerCreateGasto) {
                          onTriggerCreateGasto(query);
                        } else {
                          handleCreateGasto(query);
                        }
                        setShowDropdown(false);
                        setHighlightIndex(-1);
                      }}
                      className={`px-3 py-2 cursor-pointer rounded-lg mb-1 last:mb-0 border border-dashed text-center font-bold text-[10.5px] tracking-wide uppercase transition-colors
                        ${highlightIndex === results.length 
                          ? "bg-teal-50 border-teal-500 text-teal-750" 
                          : "hover:bg-slate-50 border-slate-200 text-slate-650"}`}
                    >
                      Agregar Gasto: "{query.toUpperCase()}"
                    </div>
                  )}
                </>
              )}
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
};

export const MarcaAutocomplete = ({
  idMarca,
  proveedores = [],
  onSelect,
  onAddBrand,
  isReadOnly,
  tabIndex,
  placeholder = "-- Marca --",
  onKeyDown,
  idRegistro
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [width, setWidth] = useState(100);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isFocused, setIsFocused] = useState(false);
  const [creating, setCreating] = useState(false);

  const containerRef = useRef(null);
  const spanRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Measure text width dynamically
  const selectedBrand = proveedores.find(p => p.id_marca === idMarca);
  const brandName = selectedBrand ? selectedBrand.nombre : "";

  // Sync display with idMarca changes
  useEffect(() => {
    if (!isFocused) {
      setQuery(brandName);
    }
  }, [idMarca, proveedores, isFocused, brandName]);

  useEffect(() => {
    if (spanRef.current) {
      const measured = spanRef.current.offsetWidth;
      setWidth(Math.max(100, Math.min(220, measured + 12)));
    }
  }, [query]);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (!showDropdown) return;
    let active = true;
    const tick = () => {
      if (!active) return;
      updateCoords();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      active = false;
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

  // Filter results locally
  const filterResults = (searchVal) => {
    const trimmed = searchVal.trim();
    if (!trimmed) {
      setResults(proveedores);
      setHighlightIndex(proveedores.length > 0 ? 0 : -1);
      return;
    }
    const filtered = proveedores.filter(p => 
      normalizeText(p.nombre).includes(normalizeText(trimmed))
    );
    setResults(filtered);
    
    const exactMatch = filtered.find(p => normalizeText(p.nombre) === normalizeText(trimmed));
    if (exactMatch) {
      setHighlightIndex(filtered.indexOf(exactMatch));
    } else if (filtered.length > 0) {
      setHighlightIndex(0);
    } else if (trimmed) {
      setHighlightIndex(0);
    } else {
      setHighlightIndex(-1);
    }
  };

  useEffect(() => {
    filterResults(query);
  }, [query, proveedores]);

  const handleFocus = () => {
    setShowDropdown(true);
    setIsFocused(true);
    filterResults(query);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setHighlightIndex(-1);
      
      // If query does not match anything and is not empty, reset or create it
      if (query && query !== brandName) {
        const exactMatch = proveedores.find(p => normalizeText(p.nombre) === normalizeText(query));
        if (exactMatch) {
          handleSelectOption(exactMatch);
        } else {
          handleCreateBrand(query);
        }
      }
    }, 200);
  };

  const handleSelectOption = (item) => {
    setQuery(item.nombre);
    setShowDropdown(false);
    setHighlightIndex(-1);
    onSelect(item);
  };

  const handleCreateBrand = async (brandNameVal) => {
    const uppercaseName = brandNameVal.trim().toUpperCase();
    if (!uppercaseName) {
      setQuery(brandName);
      return;
    }



    setCreating(true);
    try {
      const { data: res } = await api.post("core/tipo_marca/", {
        nombre: uppercaseName,
        id_registro: idRegistro
      });
      if (res.ok && res.registro) {
        toast.success(`Marca "${uppercaseName}" creada con éxito`);
        if (onAddBrand) {
          onAddBrand(res.registro);
        }
        onSelect(res.registro);
        setQuery(res.registro.nombre);
        setShowDropdown(false);
      } else {
        toast.error("Error al crear la marca");
        setQuery(brandName);
      }
    } catch (err) {
      console.error("Error al crear marca:", err);
      toast.error("Error al crear la marca");
      setQuery(brandName);
    } finally {
      setCreating(false);
    }
  };

  const exactMatchExists = proveedores.some(
    p => normalizeText(p.nombre) === normalizeText(query)
  );

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (onKeyDown) onKeyDown(e);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      setHighlightIndex((prev) => (prev + 1 <= maxIndex ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : maxIndex));
    } else if (e.key === "Enter") {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      if (highlightIndex >= 0 && highlightIndex < results.length && results[highlightIndex]) {
        handleSelectOption(results[highlightIndex]);
      } else if (highlightIndex === results.length && !exactMatchExists && query.trim()) {
        handleCreateBrand(query);
      } else {
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
    } else if (e.key === "Tab" || e.key === "Escape") {
      e.stopPropagation();
      setShowDropdown(false);
      setHighlightIndex(-1);
    } else {
      if (onKeyDown) onKeyDown(e);
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center w-full font-sans justify-center">
      {isReadOnly ? (
        <span className="font-bold text-[10.5px] text-gray-800 uppercase tracking-tight truncate w-full text-center">
          {brandName || placeholder}
        </span>
      ) : (
        <div className="relative flex items-center w-full justify-center">
          <span
            ref={spanRef}
            className="absolute -top-[9999px] -left-[9999px] invisible whitespace-pre font-bold text-[10.5px] uppercase px-1"
          >
            {query || placeholder}
          </span>
          <input
            ref={inputRef}
            type="text"
            tabIndex={tabIndex}
            data-field="id_marca"
            className="w-full text-[10.5px] border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center uppercase font-bold text-gray-800 hover:bg-gray-50 focus:bg-white transition-all outline-none"
            style={{ width: `${width}px` }}
            value={query}
            onFocus={(e) => {
              e.target.select();
              handleFocus();
            }}
            onBlur={handleBlur}
            onClick={(e) => {
              e.target.select();
              if (!showDropdown) handleFocus();
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!showDropdown) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          {showDropdown && (results.length > 0 || (!exactMatchExists && query.trim()) || creating) && createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: `${coords.top + 2}px`,
                left: `${coords.left}px`,
                width: `${Math.max(220, coords.width)}px`,
                zIndex: 9999,
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => e.preventDefault()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="autocomplete-dropdown-portal bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 text-left font-sans pointer-events-auto"
            >
              {creating ? (
                <div className="p-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">Creando Marca...</div>
              ) : (
                <>
                  {results.map((item, index) => (
                    <div
                      key={item.id_marca}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOption(item);
                      }}
                      className={`px-3 py-1.5 cursor-pointer rounded-lg text-[10px] transition-all duration-150 border-l-2
                        ${highlightIndex === index 
                         ? "bg-indigo-50 border-indigo-500 font-black text-indigo-955" 
                          : "hover:bg-slate-50 border-transparent text-slate-700 font-semibold"}`}
                    >
                      <span className="uppercase">{highlightMatch(item.nombre, query)}</span>
                    </div>
                  ))}
                  {!exactMatchExists && query.trim() && (
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCreateBrand(query);
                      }}
                      className="px-3 py-2 cursor-pointer rounded-lg text-[10px] text-indigo-650 hover:bg-indigo-50 border border-dashed border-indigo-200 mt-1 font-bold text-center uppercase tracking-wide transition-colors"
                    >
                      Crear: "{query.toUpperCase()}"
                    </div>
                  )}
                </>
              )}
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
};

export const UnidadMedidaAutocomplete = ({
  idMedida,
  unidadesMedida = [],
  onSelect,
  onAddMedida,
  isReadOnly,
  tabIndex,
  placeholder = "-- Unidad --",
  onKeyDown
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isFocused, setIsFocused] = useState(false);
  const [creating, setCreating] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Find the selected unit
  const selectedUnit = unidadesMedida.find(u => Number(u.id_medida) === Number(idMedida) || u.id_medida === idMedida);
  const unitName = selectedUnit ? selectedUnit.nombre : "";

  // Sync display with idMedida changes
  useEffect(() => {
    if (!isFocused) {
      setQuery(unitName);
    }
  }, [idMedida, unidadesMedida, isFocused, unitName]);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (!showDropdown) return;
    let active = true;
    const tick = () => {
      if (!active) return;
      updateCoords();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      active = false;
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

  // Filter results locally
  const filterResults = (searchVal) => {
    const trimmed = searchVal.trim();
    if (!trimmed) {
      setResults(unidadesMedida);
      setHighlightIndex(unidadesMedida.length > 0 ? 0 : -1);
      return;
    }
    const filtered = unidadesMedida.filter(u =>
      normalizeText(u.nombre).includes(normalizeText(trimmed)) ||
      normalizeText(u.codigo).includes(normalizeText(trimmed))
    );
    setResults(filtered);
    setHighlightIndex(filtered.length > 0 ? 0 : -1);
  };

  useEffect(() => {
    filterResults(query);
  }, [query, unidadesMedida]);

  const handleFocus = () => {
    setShowDropdown(true);
    setIsFocused(true);
    filterResults(query);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setHighlightIndex(-1);

      // If query does not match anything and is not empty, reset it
      if (query !== unitName) {
        const exactMatch = unidadesMedida.find(u =>
          normalizeText(u.nombre) === normalizeText(query) ||
          normalizeText(u.codigo) === normalizeText(query)
        );
        if (exactMatch) {
          handleSelectOption(exactMatch);
        } else {
          setQuery(unitName);
        }
      }
    }, 200);
  };

  const handleSelectOption = (item) => {
    setQuery(item.nombre);
    setShowDropdown(false);
    setHighlightIndex(-1);
    onSelect(item);
  };

  const handleCreateUnit = async (val) => {
    const uppercaseVal = val.trim().toUpperCase();
    if (!uppercaseVal) return;

    if (!window.confirm(`¿Desea crear la unidad de medida "${uppercaseVal}" en la base de datos?`)) {
      return;
    }

    setCreating(true);
    try {
      const { data: res } = await api.post("core/unidades_medida/", {
        codigo: uppercaseVal.slice(0, 10),
        nombre: uppercaseVal
      });
      if (res.ok && res.registro) {
        toast.success(`Unidad "${uppercaseVal}" creada con éxito`);
        if (onAddMedida) {
          onAddMedida(res.registro);
        }
        onSelect(res.registro);
        setQuery(res.registro.nombre);
        setShowDropdown(false);
      } else {
        toast.error("Error al crear la unidad");
      }
    } catch (err) {
      console.error("Error al crear unidad:", err);
      toast.error("Error al crear la unidad");
    } finally {
      setCreating(false);
    }
  };

  const exactMatchExists = unidadesMedida.some(
    u => normalizeText(u.nombre) === normalizeText(query) || normalizeText(u.codigo) === normalizeText(query)
  );

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (onKeyDown) onKeyDown(e);
      return;
    }
    if (!showDropdown) {
      if (e.key === "ArrowDown") {
        if (onKeyDown) {
          onKeyDown(e);
          return;
        }
        e.preventDefault();
        setShowDropdown(true);
        filterResults(query);
        return;
      }
      if (onKeyDown) onKeyDown(e);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      setHighlightIndex((prev) => (prev + 1 <= maxIndex ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : maxIndex));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const maxIndex = exactMatchExists ? results.length - 1 : results.length;
      if (highlightIndex >= 0 && highlightIndex < results.length && results[highlightIndex]) {
        handleSelectOption(results[highlightIndex]);
      } else if (highlightIndex === results.length && !exactMatchExists && query.trim()) {
        handleCreateUnit(query);
      } else {
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
    } else if (e.key === "Tab") {
      setShowDropdown(false);
      setHighlightIndex(-1);
    } else if (e.key === "Escape") {
      if (showDropdown) {
        e.preventDefault();
        e.stopPropagation();
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
    } else {
      if (onKeyDown) onKeyDown(e);
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center w-full font-sans">
      {isReadOnly ? (
        <span className="font-bold text-[11px] text-gray-800 uppercase tracking-tight truncate w-full">
          {unitName || placeholder}
        </span>
      ) : (
        <div className="relative flex items-center w-full">
          <input
            ref={inputRef}
            type="text"
            tabIndex={tabIndex}
            className="u-medida-input w-full text-[11px] border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase font-semibold text-gray-700 hover:bg-slate-50 focus:bg-white transition-all outline-none"
            value={query}
            onFocus={(e) => {
              e.target.select();
              setIsFocused(true);
            }}
            onBlur={handleBlur}
            onClick={(e) => {
              e.target.select();
              if (!showDropdown) handleFocus();
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!showDropdown) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          {showDropdown && (results.length > 0 || (!exactMatchExists && query.trim()) || creating) && createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: `${coords.top + 2}px`,
                left: `${coords.left}px`,
                width: `${Math.max(200, coords.width)}px`,
                zIndex: 9999,
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => e.preventDefault()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="autocomplete-dropdown-portal bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 text-left font-sans pointer-events-auto"
            >
              {creating ? (
                <div className="p-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">Creando Unidad...</div>
              ) : (
                <>
                  {results.map((item, index) => (
                    <div
                      key={item.id_medida}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOption(item);
                      }}
                      className={`px-2.5 py-1.5 cursor-pointer rounded-lg text-[10.5px] transition-all duration-150 border-l-2 flex items-center justify-between gap-3
                        ${highlightIndex === index
                          ? "bg-indigo-50/70 border-indigo-500 font-bold"
                          : "hover:bg-slate-50 border-transparent text-slate-700 font-semibold"}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border transition-all duration-150
                          ${highlightIndex === index
                            ? "bg-indigo-100/80 text-indigo-700 border-indigo-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {highlightMatch(item.codigo, query)}
                        </span>
                        <span className={`truncate ${highlightIndex === index ? "text-indigo-955 font-extrabold" : "text-slate-700"}`}>
                          {highlightMatch(item.nombre, query)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!exactMatchExists && query.trim() && (
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCreateUnit(query);
                      }}
                      className="px-2.5 py-2 cursor-pointer rounded-lg text-[10px] text-indigo-650 hover:bg-indigo-50 border border-dashed border-indigo-200 mt-1 font-bold text-center uppercase tracking-wide transition-colors"
                    >
                      Crear: "{query.toUpperCase()}"
                    </div>
                  )}
                </>
              )}
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
};


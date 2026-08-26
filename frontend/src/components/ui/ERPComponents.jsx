import React from 'react';
import * as LucideIcons from 'lucide-react';

export const ERPIcon = ({ name, className }) => {
  const iconName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const LucideIcon = LucideIcons[iconName] || LucideIcons.HelpCircle;
  return <LucideIcon className={className} />;
};

export const StatusBadge = ({ status }) => {
  const statusString = status ? String(status).toLowerCase().trim() : '';

  // 1. PENDIENTE (Orange/Amber)
  if (statusString === 'pendiente' || statusString.includes('pendiente')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60 shadow-sm">
        Pendiente
      </span>
    );
  }

  // 2. ADJUDICADO / ADJUDICADA (Green/Emerald)
  if (statusString === 'adjudicado' || statusString === 'adjudicada' || statusString.includes('adjudicad')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200/60 shadow-sm">
        Adjudicado
      </span>
    );
  }

  // 3. COTIZADO / COTIZADA (Teal)
  if (statusString === 'cotizado' || statusString === 'cotizada') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 shadow-sm">
        Cotizado
      </span>
    );
  }

  // 4. EN SEGUIMIENTO / SEGUIMIENTO (Blue)
  if (statusString === 'en seguimiento' || statusString === 'seguimiento' || statusString.includes('seguimiento')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60 shadow-sm">
        En Seguimiento
      </span>
    );
  }

  // 5. NO COTIZADO / NO COTIZADA (Sky/Cyan)
  if (statusString === 'no cotizado' || statusString === 'no cotizada' || statusString.includes('no cotizado')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200/60 shadow-sm">
        No Cotizado
      </span>
    );
  }

  // 6. RECHAZADO / RECHAZADA (Rose)
  if (statusString === 'rechazado' || statusString === 'rechazada' || statusString.includes('rechazad')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60 shadow-sm">
        Rechazado
      </span>
    );
  }

  // 7. POSTERGADA (Purple)
  if (statusString === 'postergada' || statusString.includes('postergada')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/60 shadow-sm">
        Postergada
      </span>
    );
  }

  // 8. PERDIDA / PERDIDO (Slate/Gray)
  if (statusString === 'perdida' || statusString === 'perdido' || statusString.includes('perdida') || statusString.includes('perdido')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/60 shadow-sm">
        Perdida
      </span>
    );
  }

  // 9. ANULADO / ANULADA (Red)
  if (statusString === 'anulado' || statusString === 'anulada' || statusString.includes('anulad')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200/60 shadow-sm">
        Anulado
      </span>
    );
  }

  // 10. FACTURADA / FACTURADO (Indigo)
  if (statusString === 'facturada' || statusString === 'facturado' || statusString.includes('facturad')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-sm">
        Facturada
      </span>
    );
  }

  // 11. OPORTUNIDAD (Indigo fallback)
  if (statusString.includes('oportunidad')) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
        Oportunidad
      </span>
    );
  }

  // Fallback
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-gray-50 text-gray-500 border border-gray-200 shadow-sm">
      {status}
    </span>
  );
};

export const ERPTable = ({
  headers,
  children,
  mobileCards,
  loading,
  onSort,
  sortConfig,
  pagination
}) => {
  const [isEditingPage, setIsEditingPage] = React.useState(false);
  const [inputPageVal, setInputPageVal] = React.useState("");

  React.useEffect(() => {
    if (pagination) {
      setInputPageVal(String(pagination.currentPage));
    }
  }, [pagination?.currentPage]);

  const handlePageSubmit = () => {
    setIsEditingPage(false);
    if (!pagination) return;
    const pageNum = parseInt(inputPageVal, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pagination.totalPages) {
      pagination.onPageChange(pageNum);
    } else {
      setInputPageVal(String(pagination.currentPage));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handlePageSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingPage(false);
      if (pagination) {
        setInputPageVal(String(pagination.currentPage));
      }
    }
  };

  const handleBlur = () => {
    handlePageSubmit();
  };

  const handlePageInputChange = (e) => {
    const val = e.target.value;
    if (val === "") {
      setInputPageVal("");
      return;
    }
    if (!pagination) return;
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (num > pagination.totalPages) {
        setInputPageVal(String(pagination.totalPages));
      } else if (num < 1) {
        setInputPageVal("1");
      } else {
        setInputPageVal(String(num));
      }
    }
  };

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col h-full">
      {/* Vista Escritorio / Tabletas */}
      <div className="hidden md:block overflow-x-auto flex-1">
        <table className="min-w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-md">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  onClick={() => onSort && h.key && onSort(h.key)}
                  className={`px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest ${h.key ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''} ${h.className || ''}`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{h.label || h}</span>
                    {h.key && sortConfig?.key === h.key && (
                      sortConfig.direction === 'asc'
                        ? <LucideIcons.ChevronUp className="h-3 w-3 text-indigo-500" />
                        : <LucideIcons.ChevronDown className="h-3 w-3 text-indigo-500" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 relative">
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="px-6 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <LucideIcons.Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <span className="text-sm font-medium animate-pulse">Cargando datos...</span>
                  </div>
                </td>
              </tr>
            ) : children}
          </tbody>
        </table>
      </div>

      {/* Vista Celular */}
      <div className="block md:hidden flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <LucideIcons.Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <span className="text-xs font-semibold animate-pulse text-gray-500">Cargando datos...</span>
          </div>
        ) : (
          mobileCards || (
            <div className="text-center py-8 text-xs font-bold text-gray-400 uppercase">
              No hay registros disponibles
            </div>
          )
        )}
      </div>

      {pagination && (
        <div className="bg-gray-50/50 px-4 py-2 border-t border-gray-100 flex items-center justify-between">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
            {pagination.from} - {pagination.to} de {pagination.total}
          </div>
          <div className="flex items-center space-x-1.5">
            {/* Primero << */}
            <button
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(1)}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
              title="Primera página"
            >
              <LucideIcons.ChevronsLeft className="h-4 w-4" />
            </button>

            {/* Anterior < */}
            <button
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
              title="Página anterior"
            >
              <LucideIcons.ChevronLeft className="h-4 w-4" />
            </button>

            {/* Número de página (Clickable / Editable) */}
            {isEditingPage ? (
              <input
                type="number"
                value={inputPageVal}
                onChange={handlePageInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onFocus={(e) => e.target.select()}
                className="w-10 text-center text-xs font-black text-gray-700 border border-gray-300 rounded bg-white py-0.5 px-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                autoFocus
                min="1"
                max={pagination.totalPages}
              />
            ) : (
              <span 
                onClick={() => setIsEditingPage(true)}
                className="text-xs font-black text-gray-700 min-w-[2rem] text-center cursor-pointer hover:bg-gray-100 hover:text-indigo-600 px-1 py-0.5 rounded transition-all"
                title="Hacer clic para ir a página..."
              >
                {pagination.currentPage}
              </span>
            )}

            {/* Siguiente > */}
            <button
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
              title="Página siguiente"
            >
              <LucideIcons.ChevronRight className="h-4 w-4" />
            </button>

            {/* Último >> */}
            <button
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
              title="Última página"
            >
              <LucideIcons.ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ERPButton = ({ children, onClick, variant = 'primary', icon, className = '', disabled = false }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-red-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm ${variants[variant]} ${className}`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export const ERPInput = ({ placeholder, value, onChange, icon, type = 'text', className = '' }) => {
  
  // Automatización para bloquear números negativos en caliente si el tipo es number
  const handleNumberChange = (e) => {
    if (type === 'number') {
      const val = e.target.value;
      // Si intentan meter un número negativo, lo forzamos a vacío o a su valor absoluto
      if (val && Number(val) < 0) {
        return; // Ignora el cambio si es negativo
      }
    }
    if (onChange) onChange(e);
  };

  return (
    <div className={`relative ${className}`}>
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleNumberChange}
        // min="0" evita que usen las flechas del teclado hacia abajo
        min={type === 'number' ? "0" : undefined} 
        className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-sm placeholder:text-gray-400 
          ${icon ? 'pl-10' : ''} 
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
    </div>
  );
};

export const FilterDropdown = ({ label, value, options, onSelect, icon: Icon, onToggle, showSearch = true, gridLayout = false, alignRight = false }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [localSearch, setLocalSearch] = React.useState("");
  const containerRef = React.useRef(null);

  // Cerrar al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        if (onToggle) onToggle(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      setLocalSearch("");
    }
  }, [isOpen]);

  const filteredOptions = React.useMemo(() => {
    if (!showSearch) return options;
    return options.filter(opt => 
      opt.n.toLowerCase().includes(localSearch.toLowerCase())
    );
  }, [options, localSearch, showSearch]);

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (onToggle) onToggle(nextState);
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-tighter cursor-pointer ${isOpen
            ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          }`}
      >
        {Icon && (
          typeof Icon === 'string' 
            ? <ERPIcon name={Icon} className={`h-3.5 w-3.5 ${isOpen ? "text-indigo-600" : "text-gray-400"}`} />
            : <Icon className={`h-3.5 w-3.5 ${isOpen ? "text-indigo-600" : "text-gray-400"}`} />
        )}
        {label && <span className="opacity-60">{label}:</span>}
        <span className="text-gray-900">{value}</span>
        <LucideIcons.ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <div className={`absolute z-50 mt-2 ${alignRight ? 'right-0' : 'left-0'} ${gridLayout ? 'w-64' : 'w-48'} bg-white border border-gray-100 rounded-2xl shadow-xl py-2 animate-in fade-in zoom-in duration-150 flex flex-col max-h-[480px]`}>
          {showSearch && (
            <div className="px-3 pb-2 pt-1 border-b border-gray-100 flex items-center gap-2 shrink-0">
              <LucideIcons.Search className="h-3.5 w-3.5 text-gray-400" />
              <input
                autoFocus
                className="bg-transparent outline-none text-gray-700 font-bold text-[10px] uppercase w-full placeholder:text-gray-300"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Buscar..."
              />
            </div>
          )}
          
          <div className={`overflow-y-auto flex-1 ${gridLayout ? "p-2 space-y-1.5" : ""}`}>
            {gridLayout ? (
              <>
                {/* First option (TODOS / Limpiar) at the top as full-width */}
                {filteredOptions[0] && (filteredOptions[0].v === "%" || filteredOptions[0].v === "") && (
                  <button
                    key={filteredOptions[0].v}
                    onClick={() => {
                      onSelect(filteredOptions[0].v);
                      setIsOpen(false);
                      if (onToggle) onToggle(false);
                    }}
                    className={`w-full text-center py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                      (String(value) === String(filteredOptions[0].n) || 
                       (filteredOptions[0].v === "" && String(value) === "Seleccionar") || 
                       (filteredOptions[0].v === "%" && String(value) === "TODOS"))
                        ? "text-indigo-600 bg-indigo-50"
                        : "text-gray-600 hover:bg-gray-50 bg-gray-50/50"
                    }`}
                  >
                    {filteredOptions[0].n}
                  </button>
                )}
                <div className="grid grid-cols-3 gap-1">
                  {filteredOptions.slice((filteredOptions[0] && (filteredOptions[0].v === "%" || filteredOptions[0].v === "")) ? 1 : 0).map((opt) => {
                    const isSelected = String(value) === String(opt.n) || 
                      (opt.n && value !== undefined && value !== null && String(value).toUpperCase() === String(opt.n).toUpperCase());
                    return (
                      <button
                        key={opt.v}
                        onClick={() => {
                          onSelect(opt.v);
                          setIsOpen(false);
                          if (onToggle) onToggle(false);
                        }}
                        className={`text-center py-1.5 px-0.5 rounded-lg text-[8.5px] font-bold uppercase transition-colors truncate border ${
                          isSelected
                            ? "text-indigo-600 bg-indigo-50 border-indigo-200 font-black"
                            : "text-gray-600 hover:bg-indigo-50/30 hover:text-indigo-600 bg-white border-gray-100"
                        }`}
                      >
                        {opt.n}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => {
                    onSelect(opt.v);
                    setIsOpen(false);
                    if (onToggle) onToggle(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${
                    String(value) === String(opt.n) ? "text-indigo-600 bg-indigo-50/50" : "text-gray-600"
                  }`}
                >
                  {opt.n}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
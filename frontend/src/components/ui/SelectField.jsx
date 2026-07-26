import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export default function SelectField({
  label,
  icon,
  inline = false,
  value,
  onChange,
  options = [],
  error,
  className,
  disabled,
  tabIndex,
  children,
  searchable = false,
  dropdownClassName,
  triggerClassName,
  labelClassName,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);

  // Extract options from children if no options prop is provided
  let finalOptions = options || [];
  if (finalOptions.length === 0 && children) {
    finalOptions = React.Children.map(children, (child) => {
      if (!child || child.type !== "option") return null;
      return {
        value: child.props.value,
        id: child.props.value,
        label: child.props.children,
        nombre: child.props.children,
      };
    }).filter(Boolean);
  }

  // Find selected option
  const selectedOption = finalOptions.find(
    (o) => String(o.id ?? o.value) === String(value)
  );

  const displayText = selectedOption
    ? selectedOption.nombre || selectedOption.label
    : "Seleccionar…";

  // Reset search query on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    setIsOpen(false);
    if (onChange) {
      onChange({
        target: {
          value: val,
          id: props.id,
          name: props.name,
        },
      });
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const opt = filteredOptions[highlightedIndex];
          handleSelect(opt.id ?? opt.value);
        } else {
          setIsOpen(false);
        }
      } else {
        setIsOpen(true);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0) {
        setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const filteredOptions = searchable && searchQuery.trim() !== ""
    ? finalOptions.filter(o => 
        String(o.nombre || o.label).toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(o.id ?? o.value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : finalOptions;

  // Sync highlightedIndex with selected value on open
  useEffect(() => {
    if (isOpen) {
      const selectedIdx = filteredOptions.findIndex(o => String(o.id ?? o.value) === String(value));
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, value, filteredOptions.length]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col gap-1 w-full relative",
        inline && "flex-row items-center gap-2",
        className
      )}
    >
      {label && (
        <label className={cn("text-[10px] font-black text-slate-600 uppercase tracking-wider ml-2 block mb-0.5 shrink-0 select-none", labelClassName)}>
          {label}
        </label>
      )}

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : (tabIndex !== undefined ? tabIndex : 0)}
        className={cn(
          "group relative flex items-center px-4 py-2 rounded-full transition-all duration-200 border border-slate-100/50 shadow-sm cursor-pointer select-none outline-none flex-1",
          "bg-slate-50/60 hover:bg-slate-100/40 focus:bg-white focus:ring-2 focus:ring-teal-500/25 focus:border-teal-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/25",
          isOpen ? "bg-white ring-2 ring-teal-500/25 border-teal-200" : "",
          error ? "bg-red-50/60 border-red-300" : "",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          triggerClassName
        )}
      >
        {icon && (
          <span className="mr-2 text-teal-500 flex items-center justify-center shrink-0">
            {icon}
          </span>
        )}

        <span
          className={cn(
            "text-[11px] font-bold tracking-tight truncate uppercase",
            value ? "text-slate-700" : "text-slate-400"
          )}
        >
          {displayText}
        </span>

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 ml-auto text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-teal-500"
          )}
        />
      </div>

      {isOpen && (
        <div className={cn(
          "absolute left-0 w-full min-w-max bg-white border border-slate-200/80 rounded-2xl shadow-2xl z-[999] py-1.5 max-h-52 overflow-y-auto no-scrollbar",
          dropdownClassName?.includes("bottom-")
            ? "bottom-[102%] animate-in fade-in slide-in-from-bottom-1 duration-150"
            : "top-[102%] animate-in fade-in slide-in-from-top-1 duration-150",
          dropdownClassName
        )}>
          {searchable && (
            <div className="px-3 py-1 sticky top-0 bg-white/95 z-10 border-b border-slate-100 mb-1">
              <input
                type="text"
                autoFocus
                className="w-full text-[10.5px] border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white placeholder:text-slate-400 font-semibold"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">
              Sin opciones
            </div>
          ) : (
            filteredOptions.map((o, idx) => {
              const optVal = o.id ?? o.value ?? "";
              const optLabel = String(o.nombre || o.label).toUpperCase();
              const isSelected = String(value) === String(optVal);
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={`opt-${optVal}-${idx}`}
                  onClick={() => handleSelect(optVal)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-colors",
                    isSelected
                      ? "bg-teal-500/10 text-teal-700 font-black border-l-4 border-l-teal-500 pl-3"
                      : isHighlighted
                        ? "bg-slate-100 text-slate-900 border-l-4 border-l-slate-300 pl-3 font-semibold"
                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-l-4 border-l-transparent"
                  )}
                >
                  {optLabel}
                </div>
              );
            })
          )}
        </div>
      )}

      {!inline && error && (
        <p className="text-red-500 text-[10px] mt-0.5 ml-2">{error}</p>
      )}
    </div>
  );
}
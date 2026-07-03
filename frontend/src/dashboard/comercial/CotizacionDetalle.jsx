import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useParams, useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import api from '@/services/api';
import { toast } from '../../utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import SelectField from '../../components/ui/SelectField';
import { CompactField } from '../../components/ui/CompactField';
import { CompactTiempoUnidad } from '../../components/ui/CompactTiempoUnidad';
import { cn } from "@/lib/utils";
import TrackingInput from '@/components/ui/TrackingInput';
import ActionMenu from '@/components/ui/ActionMenu';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from 'date-fns/locale/es';

registerLocale('es', es);

import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Import sub-components from SIGECOM_5 (using existing ones where possible)
import AgregarGrupoSuministroModal from '../Suministros/AgregarGrupoSuministroModal';
import RegistroItemModal from '../Suministros/RegistroItemModal';
import RegistroItemBuscadorModal from '../Suministros/RegistroItemBuscadorModal';
import ServicioModal from '../Servicios/ServicioModal';
import { useCotizacionAcciones } from '@/hook/useCotizacionAcciones';
import { useCotizacionSuministros } from '@/hook/useCotizacionSuministros';
import { useCotizacionServicios } from '@/hook/useCotizacionServicios';
import { ClienteAutocomplete, RepresentanteAutocomplete, ProductoAutocomplete, TipoPersonalAutocomplete, TipoGastoDetalleAutocomplete, UnidadMedidaAutocomplete, MarcaAutocomplete } from '@/components/comercial/CotizacionAutocompletes';
import { calcularItemSegunProveedor, resolverEndpointPorProveedor } from '@/dashboard/Suministros/tables/tablaUtils';

const Icon = ({ name, className }) => {
  const iconName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const LucideIcon = LucideIcons[iconName] || LucideIcons.HelpCircle;
  return <LucideIcon className={className} />;
};

const QuickAddGroupRow = ({ tipo, onAdd }) => {
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const colorClass = tipo === 'equipos' ? 'indigo' : 'amber';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && nombre.trim()) {
      onAdd({ nombre, cantidad });
      setNombre('');
      setCantidad(1);
    }
  };

  return (
    <div className={`mt-2 group flex items-center gap-3 px-4 py-2 bg-white border-2 border-dashed border-${colorClass}-100 rounded-xl hover:border-${colorClass}-300 transition-all focus-within:border-${colorClass}-400 focus-within:bg-${colorClass}-50/30 shadow-sm`}>
      <div className={`p-1.5 rounded-lg bg-${colorClass}-100 text-${colorClass}-600 group-hover:rotate-90 transition-transform`}>
        <Icon name="plus" className="h-3.5 w-3.5" />
      </div>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Añadir nueva partida de ${tipo}...`}
        className="flex-1 bg-transparent border-none outline-none font-black text-[11px] uppercase placeholder:text-gray-300 text-gray-700"
      />
      <div className="flex items-center gap-2 px-3 border-l border-gray-100">
        <span className="text-[9px] font-black text-gray-400 uppercase">Cant:</span>
        <input
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="w-10 bg-transparent font-bold text-[10px] text-center outline-none text-gray-600"
        />
      </div>
      <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest hidden md:block">Presiona Enter</span>
    </div>
  );
};

// ==========================================
// SUB-COMPONENTE: REPROGRAMAR ALERTA (MENU)
// ==========================================
const ReprogramMenu = ({ note, onReprogram }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const handleConfirm = () => {
    const formatted = tempDate.toLocaleString('sv-SE').replace('T', ' ');
    onReprogram(note, 'reprogram', formatted);
    setIsMenuOpen(false);
  };

  return (
    <ActionMenu
      title="Reprogramar Alerta"
      align="end"
      open={isMenuOpen}
      onOpenChange={setIsMenuOpen}
      closeOnSelect={false}
      contentClassName="min-w-[440px]"
      customTrigger={
        <button
          className="p-1 rounded hover:bg-amber-50 text-amber-600 transition-all"
          title="Reprogramar"
        >
          <Icon name="refresh-cw" className="h-3.5 w-3.5" />
        </button>
      }
    >
      <div
        className="p-3 bg-white"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
          }
        }}
      >
        <div className="flex gap-4 items-stretch">
          <div className="border-r border-slate-100 pr-4" onClick={(e) => e.stopPropagation()}>
            <DatePicker
              selected={tempDate}
              onChange={(date) => {
                const newDate = date || new Date();
                newDate.setHours(tempDate.getHours());
                newDate.setMinutes(tempDate.getMinutes());
                setTempDate(newDate);
              }}
              locale="es"
              inline
              minDate={new Date()}
            />
          </div>

          <div className="flex-1 flex flex-col justify-center py-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Hora de Alerta</span>
              <input
                type="time"
                value={tempDate.toTimeString().slice(0, 5)}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':');
                  const newDate = new Date(tempDate);
                  newDate.setHours(parseInt(h), parseInt(m));
                  setTempDate(newDate);
                }}
                className="text-xl font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full text-center focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
              />
            </div>

            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50">
              <span className="text-[9px] font-black text-indigo-400 uppercase block mb-2">Programado para:</span>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-700 uppercase">
                  {tempDate.toLocaleString('es-PE', { day: '2-digit', month: 'long' })}
                </span>
                <span className="text-lg font-black text-indigo-600">
                  {tempDate.toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="check" className="h-3.5 w-3.5" />
              Confirmar Fecha (Enter)
            </button>
          </div>
        </div>
      </div>
    </ActionMenu>
  );
};

const QuickInput = ({ placeholder, onSave, icon: Icon, className }) => {
  const [val, setVal] = useState("");
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-100 focus-within:border-indigo-300 focus-within:bg-white transition-all", className)}>
      {Icon && <Icon size={16} className="text-gray-400" />}
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && val.trim()) {
            onSave(val);
            setVal("");
          }
        }}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold uppercase placeholder:text-gray-300 text-slate-700"
      />
    </div>
  );
};

const parseDecimalString = (valStr) => {
  if (valStr === undefined || valStr === null || valStr === "") return 0;
  const parts = valStr.toString().split(".");
  if (parts[1] && parts[1].length > 2) {
    return parseFloat(parts[0] + "." + parts[1].slice(0, 2)) || 0;
  }
  return parseFloat(valStr) || 0;
};

const handleDecimalChange = (e, callback) => {
  let val = e.target.value;
  val = val.replace(/,/g, '.');
  if (val === "" || val === "-" || val === "." || val === "-.") {
    callback(val);
    return;
  }
  const regex = /^-?\d*\.?\d{0,2}$/;
  if (regex.test(val)) {
    callback(val);
  }
};
const highlightText = (text, search) => {
  if (!search || !search.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-teal-500/20 text-teal-900 rounded-[3px] px-0.5 font-bold">{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

const NotasAutocomplete = ({ notasComunes = [], onSelect }) => {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

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

  const filteredNotas = useMemo(() => {
    if (!query.trim()) return notasComunes;
    const q = query.toLowerCase();
    return notasComunes.filter(n => 
      n.descripcion && n.descripcion.toLowerCase().includes(q)
    );
  }, [query, notasComunes]);

  useEffect(() => {
    if (filteredNotas.length > 0) {
      setHighlightIndex(0);
    } else {
      setHighlightIndex(-1);
    }
  }, [filteredNotas]);

  const handleFocus = () => {
    setShowDropdown(true);
    setIsFocused(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setQuery("");
      setHighlightIndex(-1);
    }, 200);
  };

  const handleSelectOption = (nota) => {
    onSelect(nota.descripcion);
    setQuery("");
    setShowDropdown(false);
    setHighlightIndex(-1);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 < filteredNotas.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredNotas.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && filteredNotas[highlightIndex]) {
        handleSelectOption(filteredNotas[highlightIndex]);
      } else {
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
    } else if (e.key === "Tab" || e.key === "Escape") {
      setShowDropdown(false);
      setHighlightIndex(-1);
    }
  };

  const highlightMatch = (text, queryText) => {
    if (!queryText.trim()) return text;
    const parts = text.split(new RegExp(`(${queryText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === queryText.toLowerCase() 
            ? <span key={i} className="bg-yellow-100 text-slate-900 font-extrabold">{part}</span> 
            : part
        )}
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center bg-white border border-teal-200 rounded-full px-3 py-1 hover:border-teal-400 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/25 transition-all duration-200"
    >
      <Icon name="bookmark" className="h-3.5 w-3.5 mr-1.5 text-teal-600 flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 uppercase tracking-tight placeholder:text-slate-400 placeholder:normal-case focus:ring-0 p-0"
        value={query}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isFocused ? "Buscar nota..." : "AGREGAR NOTAS..."}
      />
      <button
        type="button"
        className="ml-1 p-0.5 rounded text-slate-400 hover:text-teal-600 transition-colors flex-shrink-0"
        onClick={() => {
          if (showDropdown) {
            inputRef.current?.blur();
          } else {
            inputRef.current?.focus();
          }
        }}
      >
        <Icon
          name={showDropdown ? "chevron-up" : "chevron-down"}
          className="h-3.5 w-3.5 text-slate-400"
        />
      </button>

      {showDropdown && filteredNotas.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${coords.top + 4}px`,
            left: `${coords.left}px`,
            width: `${Math.max(350, coords.width)}px`,
            zIndex: 99999,
            pointerEvents: "auto",
          }}
          onMouseDown={(e) => e.preventDefault()}
          onWheel={(e) => e.stopPropagation()}
          className="bg-white/95 backdrop-blur-md border border-slate-150 rounded-2xl shadow-xl shadow-slate-200/40 max-h-60 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 text-left font-sans pointer-events-auto"
        >
          {filteredNotas.map((nota, index) => (
            <div
              key={nota.id_nota || nota.codigo || index}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectOption(nota);
              }}
              className={`px-3 py-2 text-[10px] cursor-pointer rounded-xl mb-0.5 last:mb-0 transition-all duration-150 border-l-2
                ${highlightIndex === index 
                  ? "bg-teal-50/80 text-teal-950 border-teal-500 font-semibold shadow-sm" 
                  : "hover:bg-slate-50/80 text-slate-700 border-transparent"}`}
            >
              <div className="font-semibold uppercase whitespace-normal leading-relaxed text-slate-700">
                {highlightMatch(nota.descripcion, query)}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

let lastFocusedInput = null;

const handleDetailsKeyDown = (e) => {
  const key = e.key;

  // 1. Handle Alt and Escape to CLOSE the details panel and restore focus
  if (key === "Alt" || key === "Escape") {
    e.preventDefault();
    e.stopPropagation();

    // Find the currently open trigger button
    const detailsButton = document.querySelector("button[title='Detalles Adicionales'][data-state='open']") || 
                          document.querySelector("button[title='Detalles Adicionales']");
    if (detailsButton) {
      // Toggle off the Radix Popover/Dropdown by dispatching pointerdown/mousedown/click
      detailsButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      detailsButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      detailsButton.click();
    }

    // Restore focus to the input that opened this details menu
    if (lastFocusedInput) {
      setTimeout(() => {
        lastFocusedInput.focus();
        if (lastFocusedInput.select) lastFocusedInput.select();
      }, 50);
    }
    return;
  }

  // 2. Handle arrow navigation between inputs inside the details popover
  if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "ArrowDown" && key !== "ArrowUp") {
    return;
  }

  const target = e.target;
  const container = e.currentTarget; // This is the div wrapper with onKeyDown

  // Find all focusable inputs inside the details panel
  const inputs = Array.from(container.querySelectorAll("input, select")).filter(input => {
    return input.type !== "hidden" && !input.disabled && !input.readOnly;
  });

  const index = inputs.indexOf(target);
  if (index === -1) return;

  if (key === "ArrowRight") {
    const isText = target.tagName === "INPUT" && (target.type === "text" || target.type === "search");
    const canMove = !isText || target.selectionEnd === target.value.length;
    if (canMove && index < inputs.length - 1) {
      e.preventDefault();
      inputs[index + 1].focus();
      if (inputs[index + 1].select) inputs[index + 1].select();
    }
  } else if (key === "ArrowLeft") {
    const isText = target.tagName === "INPUT" && (target.type === "text" || target.type === "search");
    const canMove = !isText || target.selectionStart === 0;
    if (canMove && index > 0) {
      e.preventDefault();
      inputs[index - 1].focus();
      if (inputs[index - 1].select) inputs[index - 1].select();
    }
  } else if (key === "ArrowDown") {
    if (target.tagName === "SELECT" || target.type === "number") return;
    if (index < inputs.length - 1) {
      e.preventDefault();
      inputs[index + 1].focus();
      if (inputs[index + 1].select) inputs[index + 1].select();
    }
  } else if (key === "ArrowUp") {
    if (target.tagName === "SELECT" || target.type === "number") return;
    if (index > 0) {
      e.preventDefault();
      inputs[index - 1].focus();
      if (inputs[index - 1].select) inputs[index - 1].select();
    }
  }
};

const handleRowKeyDown = (e, submitFn) => {
  // Check if Alt key is pressed alone to toggle additional details
  if (e.key === "Alt") {
    e.preventDefault();
    e.stopPropagation();
    lastFocusedInput = e.target;
    const row = e.currentTarget;
    const detailsButton = row.querySelector("button[title='Detalles Adicionales']");
    if (detailsButton) {
      // Radix UI trigger responds to pointerdown and mousedown
      detailsButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      detailsButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      detailsButton.click();
    }
    return;
  }

  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") {
    return;
  }

  const target = e.target;
  if (target.tagName !== "INPUT" && target.tagName !== "SELECT" && target.tagName !== "BUTTON") {
    return;
  }

  if (e.defaultPrevented) {
    return;
  }

  const row = e.currentTarget;
  const inputs = Array.from(row.querySelectorAll("input, select, button[title='Detalles Adicionales']")).filter(input => {
    return input.type !== "hidden" && !input.disabled && !input.readOnly;
  });
  const currentIndex = inputs.indexOf(target);
  if (currentIndex === -1) return;

  if (e.key === "Alt") {
    e.preventDefault();
    e.stopPropagation();
    const btn = row.querySelector("button[title='Detalles Adicionales']");
    if (btn) {
      btn.click();
    }
    return;
  }

  const supportsSelection = ["text", "search", "url", "tel", "password"].includes(target.type) || target.tagName === "TEXTAREA";

  const focusInput = (index) => {
    const nextInput = inputs[index];
    if (nextInput) {
      nextInput.focus();
      if (nextInput.select) nextInput.select();
    }
  };

  if (e.key === "ArrowRight") {
    if (supportsSelection && target.selectionStart !== target.value.length) {
      return;
    }
    e.preventDefault();
    if (currentIndex === 0) {
      focusInput(2);
    } else if (currentIndex === 1) {
      focusInput(3);
    } else if (currentIndex === 2 || currentIndex === 3) {
      focusInput(4);
    } else {
      focusInput(currentIndex + 1);
    }
  } else if (e.key === "ArrowLeft") {
    if (supportsSelection && target.selectionStart !== 0) {
      return;
    }
    e.preventDefault();
    if (currentIndex === 5 || currentIndex === 4) {
      focusInput(currentIndex === 5 ? 4 : 2);
    } else if (currentIndex === 3) {
      focusInput(1);
    } else if (currentIndex === 2) {
      focusInput(0);
    } else if (currentIndex === 1) {
      focusInput(0);
    } else {
      focusInput(currentIndex - 1);
    }
  } else if (e.key === "ArrowDown") {
    if (currentIndex === 0) {
      e.preventDefault();
      focusInput(1);
    } else if (currentIndex === 2) {
      e.preventDefault();
      focusInput(3);
    }
  } else if (e.key === "ArrowUp") {
    if (currentIndex === 1) {
      e.preventDefault();
      focusInput(0);
    } else if (currentIndex === 3) {
      e.preventDefault();
      focusInput(2);
    }
  } else if (e.key === "Enter") {
    if (e.ctrlKey || e.metaKey) {
      return; // Bubbles up for Ctrl+Enter save group shortcut
    }
    if (target.tagName === "BUTTON") {
      return; // Let the button click handler run naturally to open the ActionMenu!
    }
    e.preventDefault();
    submitFn();
    // Schedule focus redirect to first input (Brand) on next tick
    setTimeout(() => {
      focusInput(0);
    }, 50);
  }
};

const EditableGroupRow = ({
  tipo,
  onSave,
  formatMoneySymbol,
  proveedores,
  setProveedores,
  tipoCambio,
  tipoMoneda,
  isVenta,
  tipoVenta,
  normalizarProductoDB,
  categoriasPersonal = [],
  tiposGasto = [],
  notasComunes = [],
  idArea,
  catalogoVersion,
  setCatalogoVersion,
  unidadesMedida = [],
  setUnidadesMedida,
  handleTriggerCreateProduct,
  renderInlineProductCreateForm,
  handleTriggerCreatePersonal,
  renderInlinePersonalCreateForm
}) => {
  const isSavingRef = useRef(false);
  const [tempData, setTempData] = useState({ titulo: '', cantidad: 1, costoEnvio: 0, detalle: '' });
  const [tempItems, setTempItems] = useState([]);
  const [manoObraCostError, setManoObraCostError] = useState("");
  const [descError, setDescError] = useState({ category: null, message: "" });
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [categoryTitles, setCategoryTitles] = useState({ "04": "", "05": "", "06": "" });
  const categoryTitleInputRef = useRef(null);
  const quillSrvRef = useRef(null);

  const handleInsertNota = (notaTexto) => {
    if (!notaTexto) return;
    if (quillSrvRef.current) {
      const quill = quillSrvRef.current.getEditor();
      const range = quill.getSelection() || { index: quill.getLength() };
      quill.insertText(range.index, `${notaTexto}\n`, { bold: false });
      quill.setSelection(range.index + notaTexto.length + 1);
    } else {
      setTempData(prev => ({
        ...prev,
        detalle: (prev.detalle || "") + `<p>${notaTexto}</p>`
      }));
    }
  };
  const [newItem, setNewItem] = useState({
    codigo_item: '',
    proveedor: '',
    id_marca: null,
    descripcion: '',
    cantidad: 1,
    costo_precio: 0,
    costo_envio: 0,
    porcentaje_envio: 0,
    costo_con_envio: 0,
    porcentaje_utilidad: 20,
    utilidad: 0,
    precio_venta: 0,
    venta_total: 0,
    tipo_unidad: 'UNI',
    observacion: '',
    tiempo_entrega: '',
    id_unidad_tiempo_entrega: 1
  });

  const [newManoObraItem, setNewManoObraItem] = useState({
    categoria: "04",
    codigo_item: "",
    descripcion_item: "",
    cantidad_hombres: 1,
    cantidad_dias: 1,
    horas: 8,
    costo_hombre_dia: 0,
    cotizado_hombre_dia: 0,
    porcentaje: 20,
    utilidad: 0,
    cotizado_total: 0,
    costo_min: 0,
    costo_max: 0,
    costType: 'min'
  });

  const [newGastosServicioItem, setNewGastosServicioItem] = useState({
    categoria: "05",
    codigo_item: "",
    descripcion_item: "",
    cantidad_hombres: 1,
    cantidad_dias: 1,
    horas: 0,
    costo_hombre_dia: 0,
    cotizado_hombre_dia: 0,
    porcentaje: 0,
    utilidad: 0,
    cotizado_total: 0
  });

  const [newOtrosItem, setNewOtrosItem] = useState({
    categoria: "06",
    codigo_item: "",
    descripcion_item: "",
    cantidad_hombres: 1,
    cantidad_dias: 1,
    horas: 0,
    costo_hombre_dia: 0,
    cotizado_hombre_dia: 0,
    porcentaje: 20,
    utilidad: 0,
    cotizado_total: 0
  });

  const handleProductCreatedLocal = (registro) => {
    const normalizado = normalizarProductoDB(registro, tipoMoneda, tipoCambio || 1, Number(newItem.cantidad || 1));
    setNewItem(prev => {
      const next = {
        ...prev,
        proveedor: normalizado.proveedor,
        id_marca: registro.id_marca,
        codigo_item: normalizado.codigo,
        descripcion: normalizado.descripcion,
        tipo_unidad: normalizado.unidad,
        costo_precio: normalizado.costoPrecio,
        porcentaje_utilidad: prev.porcentaje_utilidad || 20
      };
      return recalculateItem(next, 'porcentaje_utilidad', tempData.costoEnvio || 0, 0);
    });
  };

  const handleProductCancelLocal = (codigo) => {
    setNewItem(prev => ({
      ...prev,
      codigo_item: codigo
    }));
  };

  const handlePersonalCreatedLocal = (registro) => {
    const cMin = parseFloat(registro.costo_min || 0);
    const cMax = parseFloat(registro.costo_max || 0);
    const cAvg = cMin && cMax ? (cMin + cMax) / 2 : (cMax || cMin || 0);
    setNewManoObraItem(prev => {
      const next = {
        ...prev,
        codigo_item: `${registro.codigo}-${registro.nombre}`,
        descripcion_item: '',
        costo_hombre_dia: cAvg,
        costo_min: cMin,
        costo_max: cMax,
        costType: 'avg'
      };
      return recalculateServiceItem(next, 'costo_hombre_dia');
    });

    setTimeout(() => {
      const descInput = document.getElementById("new-group-mano-obra-desc");
      if (descInput) {
        descInput.focus();
        if (descInput.select) descInput.select();
      }
    }, 100);
  };

  const handlePersonalCancelLocal = () => {};

  const handleGastoCreatedLocal = (registro, codePrefix) => {
    if (codePrefix === '05') {
      setNewGastosServicioItem(prev => {
        const next = {
          ...prev,
          codigo_item: registro.codigo,
          descripcion_item: registro.nombre
        };
        return recalculateServiceItem(next, 'cotizado_hombre_dia');
      });
      setTimeout(() => {
        const descInput = document.getElementById("new-group-gastos-desc");
        if (descInput) {
          descInput.focus();
          if (descInput.select) descInput.select();
        }
      }, 100);
    } else if (codePrefix === '06') {
      setNewOtrosItem(prev => {
        const next = {
          ...prev,
          codigo_item: registro.codigo,
          descripcion_item: registro.nombre
        };
        return recalculateServiceItem(next, 'costo_hombre_dia');
      });
      setTimeout(() => {
        const descInput = document.getElementById("new-group-otros-desc");
        if (descInput) {
          descInput.focus();
          if (descInput.select) descInput.select();
        }
      }, 100);
    }
  };

  const handleGastoCancelLocal = () => {};

  const formatMoneySymbolSafe = formatMoneySymbol || ((val) => `$ ${Number(val || 0).toFixed(2)}`);

  const recalculateItem = (item, fieldModificado, groupCostoEnvio = 0, totalCostoItems = 0) => {
    const next = { ...item };
    const cantidad = Number(next.cantidad || 0);
    const costoPrecio = Number(next.costo_precio || 0);

    let costoEnvio = Number(next.costo_envio || 0);
    let porcentajeEnvio = Number(next.porcentaje_envio || 0);

    if (isVenta) {
      if (tipoVenta === "T") {
        porcentajeEnvio = totalCostoItems > 0 ? (costoPrecio / totalCostoItems) * 100 : 0;
        costoEnvio = (porcentajeEnvio / 100) * groupCostoEnvio;
      } else if (tipoVenta === "P") {
        costoEnvio = cantidad > 0 ? groupCostoEnvio / cantidad : 0;
        porcentajeEnvio = costoPrecio > 0 ? ((costoEnvio / costoPrecio) * 100) : 0;
      }
    } else {
      costoEnvio = 0;
      porcentajeEnvio = 0;
    }

    const costoConEnvio = costoPrecio + costoEnvio;
    next.costo_envio = Number(costoEnvio.toFixed(2));
    next.porcentaje_envio = Number(porcentajeEnvio.toFixed(2));
    next.costo_con_envio = Number(costoConEnvio.toFixed(2));

    let porcentajeUtil = Number(next.porcentaje_utilidad || 0);
    let utilidadUnit = (costoConEnvio * porcentajeUtil) / 100;

    if (fieldModificado === 'utilidad') {
      utilidadUnit = Number(next.utilidad || 0);
      porcentajeUtil = costoConEnvio > 0 ? (utilidadUnit / costoConEnvio) * 100 : 0;
      next.porcentaje_utilidad = Number(porcentajeUtil.toFixed(2));
    } else {
      next.utilidad = Number(utilidadUnit.toFixed(2));
    }

    const ventaPrecio = costoConEnvio + next.utilidad;
    next.precio_venta = Number(ventaPrecio.toFixed(2));
    next.venta_total = Number((ventaPrecio * cantidad).toFixed(2));
    next.costo_total = Number((costoPrecio * cantidad).toFixed(2));

    return next;
  };

  const recalculateServiceItem = (item, fieldModificado) => {
    const next = { ...item };
    const cantidad = Number(next.cantidad_hombres || 0);
    const dias = next.categoria === "06" ? 1 : Number(next.cantidad_dias || 0);
    const horas = Number(next.horas || 8);
    
    if (next.categoria === "04") {
      const costo = Number(next.costo_hombre_dia || 0);
      const pct = Number(next.porcentaje || 0);
      const costoTotal = cantidad * dias * costo;
      const utilidad = costoTotal * (pct / 100);
      
      next.utilidad = Number(utilidad.toFixed(2));
      next.cotizado_hombre_dia = Number((costo * (1 + pct / 100)).toFixed(2));
      next.cotizado_total = Number((costoTotal + utilidad).toFixed(2));
    } else if (next.categoria === "05") {
      const precio = Number(next.cotizado_hombre_dia || 0);
      next.porcentaje = 0;
      next.utilidad = 0;
      next.costo_hombre_dia = precio;
      next.cotizado_total = Number((cantidad * dias * precio).toFixed(2));
    } else if (next.categoria === "06") {
      const costo = Number(next.costo_hombre_dia || 0);
      const pct = Number(next.porcentaje || 0);
      const costoTotal = cantidad * 1 * costo;
      const utilidad = costoTotal * (pct / 100);
      
      next.cantidad_dias = 1;
      next.utilidad = Number(utilidad.toFixed(2));
      next.cotizado_hombre_dia = Number((costo * (1 + pct / 100)).toFixed(2));
      next.cotizado_total = Number((costoTotal + utilidad).toFixed(2));
    }
    return next;
  };

  const recalculateAllTempItems = (items, currentGroupCostoEnvio) => {
    if (tipo === "SERVICIOS") return items;
    if (!isVenta) {
      return items.map(item => recalculateItem(item, 'costo_precio', 0, 0));
    }
    if (tipoVenta === "P") {
      return items.map(item => {
        const next = { ...item, costo_envio: currentGroupCostoEnvio };
        return recalculateItem(next, 'costo_envio', 0, 0);
      });
    } else {
      const totalCostoItems = items.reduce((acc, it) => acc + (Number(it.costo_precio || 0) * Number(it.cantidad || 0)), 0);
      return items.map(item => recalculateItem(item, 'costo_precio', currentGroupCostoEnvio, totalCostoItems));
    }
  };

  const handleNewItemChange = (field, value) => {
    setNewItem(prev => {
      const updated = { ...prev, [field]: value };
      return recalculateItem(updated, field, tempData.costoEnvio || 0, 0);
    });
  };

  const handleManoObraFieldChange = (field, value) => {
    setNewManoObraItem(prev => {
      let updated = { ...prev, [field]: value };
      return recalculateServiceItem(updated, field);
    });
  };

  const handleGastosServicioFieldChange = (field, value) => {
    setNewGastosServicioItem(prev => {
      let updated = { ...prev, [field]: value };
      return recalculateServiceItem(updated, field);
    });
  };

  const handleOtrosFieldChange = (field, value) => {
    setNewOtrosItem(prev => {
      let updated = { ...prev, [field]: value };
      return recalculateServiceItem(updated, field);
    });
  };

  const handleGroupCostoEnvioChange = (val) => {
    const rawVal = parseFloat(val) || 0;
    setTempData(prev => ({ ...prev, costoEnvio: rawVal }));
    setTempItems(prevItems => recalculateAllTempItems(prevItems, rawVal));
  };

  const handleAddItem = () => {
    if (!newItem.descripcion.trim()) {
      toast.warn("Por favor ingrese la descripción del producto.");
      return;
    }
    const candidateItem = {
      ...newItem,
      id_temp: Date.now() + Math.random(),
      codigo_item: (newItem.codigo_item || "S/C").toUpperCase(),
      descripcion: newItem.descripcion.toUpperCase(),
      cantidad: Number(newItem.cantidad || 1),
      costo_precio: Number(newItem.costo_precio || 0),
      costo_envio: tipoVenta === "P" ? (newItem.costo_envio || tempData.costoEnvio || 0) : 0
    };

    const recalculatedCandidate = recalculateItem(candidateItem, 'costo_precio', 0, 0);
    const updatedItems = [...tempItems, recalculatedCandidate];
    const finalItems = recalculateAllTempItems(updatedItems, tempData.costoEnvio);

    setTempItems(finalItems);
    setNewItem({
      codigo_item: '',
      proveedor: '',
      id_marca: null,
      descripcion: '',
      cantidad: 1,
      costo_precio: 0,
      costo_envio: tipoVenta === "P" ? Number(tempData.costoEnvio || 0) : 0,
      porcentaje_envio: 0,
      costo_con_envio: 0,
      porcentaje_utilidad: 20,
      utilidad: 0,
      precio_venta: 0,
      venta_total: 0,
      tipo_unidad: 'UNI',
      observacion: '',
      tiempo_entrega: '',
      id_unidad_tiempo_entrega: 1
    });
  };

  const handleDescriptionChange = (category, value) => {
    if (category === "04") handleManoObraFieldChange('descripcion_item', value);
    if (category === "05") handleGastosServicioFieldChange('descripcion_item', value);
    if (category === "06") handleOtrosFieldChange('descripcion_item', value);
    if (descError.category === category) {
      setDescError({ category: null, message: "" });
    }
  };

  const handleAddItemByCategory = (item, setItem, resetValue) => {
    if (!item.descripcion_item.trim()) {
      setDescError({ category: item.categoria, message: "Por favor ingrese la descripción." });
      return;
    }
    const candidateItem = {
      ...item,
      id_temp: Date.now() + Math.random(),
      codigo_item: (item.codigo_item || "S/C").toUpperCase(),
      descripcion_item: item.descripcion_item.toUpperCase()
    };
    
    const recalculated = recalculateServiceItem(candidateItem, "costo_hombre_dia");
    setTempItems(prev => [...prev, recalculated]);
    
    setItem(resetValue);
    setDescError({ category: null, message: "" });
  };

  const handleAddManoObraItem = () => {
    let finalCosto = parseFloat(newManoObraItem.costo_hombre_dia || 0);
    const min = parseFloat(newManoObraItem.costo_min || 0);
    const max = parseFloat(newManoObraItem.costo_max || 0);
    
    if (min > 0 && finalCosto < min) {
      finalCosto = min;
      setManoObraCostError(`Ajustado al mínimo: ${formatMoneySymbolSafe(min)}`);
      setTimeout(() => setManoObraCostError(""), 4000);
    } else if (max > 0 && finalCosto > max) {
      finalCosto = max;
      setManoObraCostError(`Ajustado al máximo: ${formatMoneySymbolSafe(max)}`);
      setTimeout(() => setManoObraCostError(""), 4000);
    }

    const itemToAdd = {
      ...newManoObraItem,
      costo_hombre_dia: finalCosto
    };

    handleAddItemByCategory(itemToAdd, setNewManoObraItem, {
      categoria: "04",
      codigo_item: "",
      descripcion_item: "",
      cantidad_hombres: 1,
      cantidad_dias: 1,
      horas: 8,
      costo_hombre_dia: 0,
      cotizado_hombre_dia: 0,
      porcentaje: 20,
      utilidad: 0,
      cotizado_total: 0,
      costo_min: 0,
      costo_max: 0,
      costType: 'min'
    });
  };

  const handleAddGastosServicioItem = () => {
    handleAddItemByCategory(newGastosServicioItem, setNewGastosServicioItem, {
      categoria: "05",
      codigo_item: "",
      descripcion_item: "",
      cantidad_hombres: 1,
      cantidad_dias: 1,
      horas: 0,
      costo_hombre_dia: 0,
      cotizado_hombre_dia: 0,
      porcentaje: 0,
      utilidad: 0,
      cotizado_total: 0
    });
  };

  const handleAddOtrosItem = () => {
    handleAddItemByCategory(newOtrosItem, setNewOtrosItem, {
      categoria: "06",
      codigo_item: "",
      descripcion_item: "",
      cantidad_hombres: 1,
      cantidad_dias: 1,
      horas: 0,
      costo_hombre_dia: 0,
      cotizado_hombre_dia: 0,
      porcentaje: 20,
      utilidad: 0,
      cotizado_total: 0
    });
  };

  const handleRemoveItem = (idTemp) => {
    const filtered = tempItems.filter(item => item.id_temp !== idTemp);
    const finalItems = recalculateAllTempItems(filtered, tempData.costoEnvio);
    setTempItems(finalItems);
  };

  const handleSaveGroup = () => {
    if (!tempData.titulo.trim()) return;
    onSave({
      nombre: tempData.titulo.toUpperCase(),
      cantidad: tempData.cantidad,
      tipo: tipo,
      items: tempItems,
      costoEnvio: Number(tempData.costoEnvio || 0),
      detalle: tempData.detalle || "",
      categoryTitles: categoryTitles
    });
    setTempData({ titulo: '', cantidad: 1, costoEnvio: 0, detalle: '' }); // Reset group
    setTempItems([]); // Reset items
    setCategoryTitles({ "04": "MANO DE OBRA", "05": "GASTOS SERVICIO", "06": "OTROS" }); // Reset titles
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && tempData.titulo.trim()) {
      handleSaveGroup();
    }
  };

  const handleContainerKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && tempData.titulo.trim()) {
      e.preventDefault();
      e.stopPropagation();
      handleSaveGroup();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setTempData({ titulo: '', cantidad: 1, costoEnvio: 0, detalle: '' });
      setTempItems([]);
      setCategoryTitles({ "04": "MANO DE OBRA", "05": "GASTOS SERVICIO", "06": "OTROS" }); // Reset titles
    }
  };

  const handleHeaderKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowDown") {
      return;
    }

    const target = e.target;
    if (target.tagName !== "INPUT") return;

    const container = e.currentTarget;
    const inputs = Array.from(container.querySelectorAll("input")).filter(input => {
      return input.type !== "hidden" && !input.disabled && !input.readOnly;
    });
    const currentIndex = inputs.indexOf(target);
    if (currentIndex === -1) return;

    if (e.key === "ArrowRight") {
      const nextInput = inputs[currentIndex + 1];
      if (nextInput) {
        e.preventDefault();
        nextInput.focus();
        if (nextInput.select) nextInput.select();
      }
    } else if (e.key === "ArrowLeft") {
      const prevInput = inputs[currentIndex - 1];
      if (prevInput) {
        e.preventDefault();
        prevInput.focus();
        if (prevInput.select) prevInput.select();
      }
    } else if (e.key === "ArrowDown") {
      const tableRow = container.closest(".bg-white.border").querySelector("tbody tr.bg-indigo-50\\/10");
      if (tableRow) {
        const firstRowInput = tableRow.querySelector("input");
        if (firstRowInput) {
          e.preventDefault();
          firstRowInput.focus();
          if (firstRowInput.select) firstRowInput.select();
        }
      }
    }
  };

  const canExpand = true;
  const isExpanded = canExpand && tempData.titulo.trim().length > 0;
  
  const totalGrupoCalculado = tipo === "SERVICIOS"
    ? tempItems.reduce((acc, item) => acc + Number(item.cotizado_total || 0), 0) * tempData.cantidad
    : tempItems.reduce((acc, item) => acc + Number(item.venta_total || 0), 0) * tempData.cantidad;

  const brandOptions = (proveedores || []).map(p => ({
    id: String(p.id_marca).padStart(2, '0'),
    nombre: p.nombre
  }));

  return (
    <div 
      onKeyDown={handleContainerKeyDown}
      className={cn(
        "bg-white border rounded-xl overflow-hidden transition-all duration-300 shadow-sm mb-6",
        isExpanded ? "border-indigo-400 ring-4 ring-indigo-50" : "border-gray-200"
      )}
    >
      {/* Cabecera del Grupo editable */}
      <div 
        onKeyDown={handleHeaderKeyDown}
        className="px-5 py-3.5 flex justify-between items-center bg-gray-50/50 border-b border-gray-100"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={cn("transition-transform duration-300", isExpanded ? "rotate-90 text-indigo-600" : "rotate-0 text-gray-400")}>
            <Icon name="plus" className="h-4 w-4" />
          </div>

          <div className="flex flex-col flex-1 max-w-[300px]">
            <input
              type="text"
              placeholder={tipo === "SERVICIOS" ? "NOMBRE DEL NUEVO GRUPO DE SERVICIOS..." : "NOMBRE DE LA NUEVA PARTIDA DE SUMINISTROS..."}
              className="bg-transparent border-none outline-none font-black text-gray-800 text-[12px] uppercase tracking-wide w-full placeholder:text-gray-400 focus:ring-0 px-0"
              value={tempData.titulo}
              onChange={(e) => {
                const newVal = e.target.value;
                setTempData({ ...tempData, titulo: newVal });
                if (tipo === "SERVICIOS" && newVal.trim().length > 0 && tempData.titulo.trim().length === 0) {
                  setIsDetailExpanded(true);
                }
              }}
              onKeyDown={handleKeyDown}
            />
          </div>

          {canExpand && (
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              {tempItems.length} Ítems a crear
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Condicional: Costo Envío para Venta (Total o Parcial) */}
          {isVenta && canExpand && (
            <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-lg focus-within:border-blue-400 transition-colors">
              <span className="text-[9px] font-black text-blue-600 uppercase">
                {tipoVenta === "P" ? "Envío Unit:" : "Envío Tot:"}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-16 bg-transparent border-none outline-none text-[11.5px] font-black text-blue-800 text-center focus:ring-0 p-0"
                value={tempData.costoEnvio === undefined || tempData.costoEnvio === null ? "" : tempData.costoEnvio}
                onChange={(e) => handleGroupCostoEnvioChange(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg focus-within:border-indigo-400 transition-colors">
            <span className="text-[9px] font-black text-indigo-600 uppercase">Cant:</span>
            <input
              type="number"
              min="1"
              className="w-10 bg-transparent border-none outline-none text-[11.5px] font-black text-indigo-800 text-center focus:ring-0 p-0"
              value={tempData.cantidad}
              onChange={(e) => setTempData({ ...tempData, cantidad: parseInt(e.target.value) || 1 })}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="text-right min-w-[120px] flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                Total Grupo:
              </span>
              <span className="text-[11.5px] font-black text-indigo-600 uppercase tracking-tight">
                {formatMoneySymbolSafe(totalGrupoCalculado)}
              </span>
            </div>
          </div>


        </div>
      </div>

      {/* Items Section (Only visible if isExpanded is true) */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="p-4 bg-gray-50/20">
              <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Icon name="package-2" className="h-3.5 w-3.5" />
                {tipo === "SERVICIOS" ? "Agregar servicios a la nueva partida" : "Agregar suministros a la nueva partida"}
              </h4>

              {tipo === "SERVICIOS" && (
                <div className={cn(
                  "mb-4 bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-300",
                  isDetailExpanded ? "overflow-visible" : "overflow-hidden"
                )}>
                  {/* Collapsible Header */}
                  <div
                    onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                    className="w-full px-4 py-2.5 flex justify-between items-center bg-slate-50 border-b border-gray-150 hover:bg-slate-100/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4 text-teal-800 flex-grow mr-4">
                      <div className="flex items-center gap-2">
                        <Icon name="file-text" className="h-4 w-4 text-[#0d767e]" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 whitespace-nowrap">
                          Detalle del Servicio
                        </span>
                      </div>
                      
                      {/* Integrated Toolbar */}
                      {isDetailExpanded && (
                        <div 
                          id="srv-quill-toolbar"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center bg-transparent border-none p-0 ql-toolbar ql-snow"
                        >
                          <span className="ql-formats">
                            <button className="ql-bold" title="Negrita" />
                            <button className="ql-italic" title="Cursiva" />
                          </span>
                          <span className="ql-formats">
                            <button className="ql-list" value="ordered" title="Numeración" />
                            <button className="ql-list" value="bullet" title="Viñetas" />
                          </span>
                          <span className="ql-formats">
                            <button className="ql-indent" value="-1" title="Disminuir Sangría" />
                            <button className="ql-indent" value="+1" title="Aumentar Sangría" />
                          </span>
                          <span className="ql-formats">
                            <button className="ql-blockquote" title="Cita" />
                          </span>

                          {notasComunes && notasComunes.length > 0 && (
                            <span className="ql-formats select-none pointer-events-auto !mr-0">
                              <div className="w-64">
                                <NotasAutocomplete
                                  notasComunes={notasComunes}
                                  onSelect={handleInsertNota}
                                />
                              </div>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {tempData.detalle && tempData.detalle.replace(/<[^>]*>/g, '').trim().length > 0 ? (
                        <span className="text-[9px] font-black text-[#0d767e] bg-teal-50 border border-teal-150 px-2 py-0.5 rounded-full uppercase">
                          Con Contenido
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-gray-400 bg-gray-50 border border-gray-150 px-2 py-0.5 rounded-full uppercase">
                          Vacío
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                        className="p-1 hover:bg-slate-200/60 rounded-md transition-colors"
                      >
                        <Icon
                          name={isDetailExpanded ? "chevron-up" : "chevron-down"}
                          className="h-4 w-4 text-slate-500"
                        />
                      </button>
                    </div>
                  </div>

                  {/* Quill Editor Block */}
                  <AnimatePresence initial={false}>
                    {isDetailExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 bg-white border-t border-gray-100 overflow-visible"
                      >
                        <div className="quill-modern-container border border-slate-200 rounded-xl shadow-sm bg-white text-left overflow-visible">
                          <style>{`
                            #srv-quill-toolbar.ql-toolbar.ql-snow {
                              display: flex !important;
                              align-items: center !important;
                              border: none !important;
                              background: transparent !important;
                              padding: 0 !important;
                            }
                            #srv-quill-toolbar.ql-toolbar.ql-snow .ql-formats {
                              margin-right: 6px !important;
                              display: flex !important;
                              align-items: center !important;
                            }
                            #srv-quill-toolbar.ql-toolbar.ql-snow button {
                              width: 26px !important;
                              height: 26px !important;
                              padding: 3px !important;
                            }
                            .quill-modern-container .ql-container.ql-snow {
                              border: none !important;
                            }
                            .quill-modern-container .ql-editor ol + ul,
                            .quill-modern-container .ql-editor ul + ol,
                            .quill-modern-container .ql-editor ol + ol,
                            .quill-modern-container .ql-editor ul + ul {
                              counter-reset: none !important;
                            }
                          `}</style>
                          <ReactQuill
                            ref={quillSrvRef}
                            value={tempData.detalle || ""}
                            onChange={(content) => setTempData(prev => ({ ...prev, detalle: content }))}
                            theme="snow"
                            modules={{
                              toolbar: {
                                container: "#srv-quill-toolbar"
                              }
                            }}
                            placeholder="Escriba aquí los detalles y especificaciones del servicio con negrita, guiones, etc..."
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {tipo === "SERVICIOS" ? (
                <div className="space-y-6 mt-4 overflow-visible">
                  {/* CATEGORÍA: MANO DE OBRA */}
                  <div className="bg-white border border-slate-150 rounded-xl shadow-sm overflow-visible animate-fadeIn">
                    <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                          <Icon name="users" className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider">
                          Mano de Obra
                        </span>
                        <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full uppercase">
                          {tempItems.filter(it => it.categoria === "04").length} Ítems
                        </span>
                      </div>
                      
                      <div className="w-80 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg focus-within:border-indigo-400 transition-colors">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight whitespace-nowrap">
                          Título:
                        </span>
                        <input
                          type="text"
                          data-field="subgroup-custom-title"
                          className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 focus:ring-0 p-0 uppercase"
                          value={categoryTitles["04"] || ""}
                          onChange={(e) => setCategoryTitles(prev => ({ ...prev, "04": e.target.value.toUpperCase() }))}
                        />
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto overflow-visible">
                      <table className="min-w-full table-fixed divide-y divide-slate-100">
                        <thead className="bg-slate-100/50 border-b border-slate-200">
                          <tr>
                            <th className="w-[14%] px-3 py-2 text-center text-[10px] font-black text-slate-755 uppercase tracking-wider">Código Personal</th>
                            <th className="w-[25%] px-3 py-2 text-center text-[10px] font-black text-slate-755 uppercase tracking-wider">Descripción</th>
                            <th className="w-[5%] px-3 py-2 text-center text-[10px] font-black text-slate-755 uppercase tracking-wider">Cantidad</th>
                            <th className="w-[5%] px-3 py-2 text-center text-[10px] font-black text-slate-755 uppercase tracking-wider">Días</th>
                            <th className="w-[5%] px-3 py-2 text-center text-[10px] font-black text-slate-755 uppercase tracking-wider">Horas</th>
                            <th className="w-[8%] px-3 py-2 text-center text-[10px] font-black text-slate-755 uppercase tracking-wider">Costo H/D</th>
                            <th className="w-[10%] px-3 py-2 text-center text-[10px] font-black text-slate-755 uppercase tracking-wider">Utilidad</th>
                            <th className="w-[8%] px-3 py-2 text-center text-[10px] font-black text-slate-755 uppercase tracking-wider">Cotizado H/D</th>
                            <th className="w-[16%] px-3 py-2 text-center text-[10px] font-black text-slate-755 uppercase tracking-wider">Cotizado Total</th>
                            <th className="w-[4%] px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {tempItems.filter(it => it.categoria === "04").map((item) => (
                            <tr key={item.id_temp} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-3 py-1.5 text-[11px] font-bold text-slate-900 uppercase">
                                {item.codigo_item || "S/C"}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-slate-700 uppercase font-medium truncate max-w-0" title={item.descripcion_item}>
                                {item.descripcion_item}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-center font-bold text-slate-900">
                                {item.cantidad_hombres}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-center font-bold text-slate-900">
                                {item.cantidad_dias}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-center font-bold text-slate-900">
                                {item.horas}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-right text-slate-600 font-medium whitespace-nowrap">
                                {formatMoneySymbolSafe(item.costo_hombre_dia)}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-right text-slate-600 font-medium">
                                <div className="flex flex-col items-end whitespace-nowrap">
                                  <span>{formatMoneySymbolSafe(item.utilidad)}</span>
                                  <span className="text-[9px] text-slate-400">{item.porcentaje}%</span>
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-right text-slate-600 font-medium whitespace-nowrap">
                                {formatMoneySymbolSafe(item.cotizado_hombre_dia)}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] font-black text-right text-slate-900 whitespace-nowrap">
                                {formatMoneySymbolSafe(item.cotizado_total)}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <button
                                  onClick={() => handleRemoveItem(item.id_temp)}
                                  className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                                  title="Quitar"
                                >
                                  <Icon name="trash-2" className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          
                          <tr className="bg-indigo-50/10">
                            <td className="px-3 py-1.5 min-w-[200px]">
                              <TipoPersonalAutocomplete
                                value={newManoObraItem.codigo_item || ""}
                                idArea={idArea}
                                catalogoVersion={catalogoVersion}
                                onTriggerCreatePersonal={(name) => handleTriggerCreatePersonal(name, 'new', handlePersonalCreatedLocal, handlePersonalCancelLocal)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManoObraItem();
                                  }
                                }}
                                onSelect={(item) => {
                                  if (!item || !item.codigo) {
                                    setNewManoObraItem(prev => {
                                      const next = {
                                        ...prev,
                                        codigo_item: '',
                                        descripcion_item: '',
                                        costo_hombre_dia: 0,
                                        costo_min: 0,
                                        costo_max: 0,
                                        costType: 'min'
                                      };
                                      return recalculateServiceItem(next, 'costo_hombre_dia');
                                    });
                                    return;
                                  }
                                  setNewManoObraItem(prev => {
                                    const cMin = parseFloat(item.costo_min || 0);
                                    const cMax = parseFloat(item.costo_max || 0);
                                    const cAvg = cMin && cMax ? (cMin + cMax) / 2 : (cMax || cMin || 0);
                                    const next = {
                                      ...prev,
                                      codigo_item: `${item.codigo}-${item.nombre}`,
                                      descripcion_item: '',
                                      costo_hombre_dia: cAvg,
                                      costo_min: cMin,
                                      costo_max: cMax,
                                      costType: 'avg'
                                    };
                                    return recalculateServiceItem(next, 'costo_hombre_dia');
                                  });
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex flex-col w-full">
                                <input
                                  id="new-group-mano-obra-desc"
                                  type="text"
                                  className={cn(
                                    "w-full text-[11px] border rounded px-1.5 py-1 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-left",
                                    descError.category === "04" ? "border-red-400 ring-1 ring-red-100" : "border-slate-300"
                                  )}
                                  value={newManoObraItem.descripcion_item}
                                  placeholder="Descripción..."
                                  onChange={(e) => handleDescriptionChange('04', e.target.value.toUpperCase())}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddManoObraItem();
                                    }
                                  }}
                                />
                                {descError.category === "04" && (
                                  <span className="text-[9px] text-red-500 font-bold mt-0.5 pl-1">
                                    {descError.message}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <input
                                type="number"
                                placeholder="1"
                                min="1"
                                className="w-full text-[11px] border border-slate-300 text-center rounded px-1 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                value={newManoObraItem.cantidad_hombres || ""}
                                onChange={(e) => handleManoObraFieldChange('cantidad_hombres', parseInt(e.target.value) || 1)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManoObraItem();
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <input
                                type="number"
                                placeholder="1"
                                min="1"
                                className="w-full text-[11px] border border-slate-300 text-center rounded px-1 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                value={newManoObraItem.cantidad_dias || ""}
                                onChange={(e) => handleManoObraFieldChange('cantidad_dias', parseInt(e.target.value) || 1)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManoObraItem();
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <input
                                type="number"
                                placeholder="8"
                                min="1"
                                className="w-full text-[11px] border border-slate-300 text-center rounded px-1 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                value={newManoObraItem.horas || ""}
                                onChange={(e) => handleManoObraFieldChange('horas', parseInt(e.target.value) || 8)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManoObraItem();
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <input
                                type="text"
                                placeholder="0.00"
                                className="w-full text-[11px] border border-slate-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center bg-white"
                                value={newManoObraItem.costo_hombre_dia === undefined || newManoObraItem.costo_hombre_dia === null ? "" : newManoObraItem.costo_hombre_dia}
                                onChange={(e) => handleDecimalChange(e, (val) => handleManoObraFieldChange('costo_hombre_dia', val))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManoObraItem();
                                  }
                                }}
                                onBlur={(e) => {
                                  let val = parseDecimalString(e.target.value);
                                  const min = parseFloat(newManoObraItem.costo_min || 0);
                                  const max = parseFloat(newManoObraItem.costo_max || 0);
                                  let modified = false;
                                  if (min > 0 && val < min) {
                                    val = min;
                                    modified = true;
                                    toast.info(`Costo ajustado al mínimo permitido: ${formatMoneySymbolSafe(min)}`);
                                  } else if (max > 0 && val > max) {
                                    val = max;
                                    modified = true;
                                    toast.info(`Costo ajustado al máximo permitido: ${formatMoneySymbolSafe(max)}`);
                                  }
                                  if (modified) {
                                    handleManoObraFieldChange('costo_hombre_dia', val);
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex flex-col gap-1 items-center justify-center text-center">
                                <span className="text-[11px] font-bold text-slate-700">
                                  {formatMoneySymbolSafe(Number(newManoObraItem.utilidad || 0))}
                                </span>
                                <div className="relative flex items-center justify-center w-full">
                                  <input
                                    type="text"
                                    className="w-full text-[10px] border border-slate-300 text-center rounded px-1 py-0.5 font-medium text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                    value={newManoObraItem.porcentaje === undefined || newManoObraItem.porcentaje === null ? "" : newManoObraItem.porcentaje}
                                    onChange={(e) => handleDecimalChange(e, (val) => handleManoObraFieldChange('porcentaje', val))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddManoObraItem();
                                      }
                                    }}
                                  />
                                  <span className="absolute right-1 text-[9px] text-slate-400">%</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-center text-[11.5px] font-semibold text-slate-500">
                              {formatMoneySymbolSafe(Number(newManoObraItem.cotizado_hombre_dia || 0))}
                            </td>
                            <td className="px-3 py-1.5 text-right text-[11px] font-black text-indigo-600 align-middle">
                              {formatMoneySymbolSafe(Number(newManoObraItem.cotizado_total || 0))}
                            </td>
                            <td className="px-3 py-1.5 text-center align-middle">
                              <button
                                onClick={handleAddManoObraItem}
                                className="p-1 bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                title="Añadir"
                              >
                                <Icon name="check" className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                          {renderInlinePersonalCreateForm && renderInlinePersonalCreateForm('new', handlePersonalCreatedLocal, handlePersonalCancelLocal)}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* CATEGORÍA: GASTOS SERVICIO */}
                  <div className="bg-white border border-slate-150 rounded-xl shadow-sm overflow-visible animate-fadeIn">
                    <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-teal-50 text-teal-600 rounded-lg border border-teal-100">
                          <Icon name="dollar-sign" className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider">
                          Gastos Servicio
                        </span>
                        <span className="text-[9px] bg-teal-50 border border-teal-100 text-teal-600 font-bold px-1.5 py-0.5 rounded-full uppercase">
                          {tempItems.filter(it => it.categoria === "05").length} Ítems
                        </span>
                      </div>
                      
                      <div className="w-80 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg focus-within:border-teal-400 transition-colors">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight whitespace-nowrap">
                          Título:
                        </span>
                        <input
                          type="text"
                          data-field="subgroup-custom-title"
                          className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 focus:ring-0 p-0 uppercase"
                          value={categoryTitles["05"] || ""}
                          onChange={(e) => setCategoryTitles(prev => ({ ...prev, "05": e.target.value.toUpperCase() }))}
                        />
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto overflow-visible">
                      <table className="min-w-full table-fixed divide-y divide-slate-100">
                        <thead className="bg-slate-100/50 border-b border-slate-200">
                          <tr>
                            <th className="w-[15%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Código Gasto</th>
                            <th className="w-[35%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Descripción</th>
                            <th className="w-[10%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Cantidad</th>
                            <th className="w-[10%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Días</th>
                            <th className="w-[12%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Precio</th>
                            <th className="w-[13%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Total</th>
                            <th className="w-[5%] px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {tempItems.filter(it => it.categoria === "05").map((item) => (
                            <tr key={item.id_temp} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-3 py-1.5 text-[11px] font-bold text-slate-900 uppercase whitespace-nowrap">
                                {item.codigo_item || "S/C"}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-slate-700 uppercase font-medium truncate max-w-0" title={item.descripcion_item}>
                                {item.descripcion_item}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-center font-bold text-slate-900">
                                {item.cantidad_hombres}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-center font-bold text-slate-900">
                                {item.cantidad_dias}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-right text-slate-600 font-medium whitespace-nowrap">
                                {formatMoneySymbolSafe(item.cotizado_hombre_dia)}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] font-black text-right text-slate-900 whitespace-nowrap">
                                {formatMoneySymbolSafe(item.cotizado_total)}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <button
                                  onClick={() => handleRemoveItem(item.id_temp)}
                                  className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                                  title="Quitar"
                                >
                                  <Icon name="trash-2" className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          
                          <tr className="bg-indigo-50/10">
                            <td className="px-3 py-1.5">
                              <TipoGastoDetalleAutocomplete
                                value={newGastosServicioItem.codigo_item || ""}
                                codePrefix="05"
                                onTriggerCreateGasto={(name) => handleTriggerCreateGasto(name, 'new', '05', handleGastoCreatedLocal, handleGastoCancelLocal)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddGastosServicioItem();
                                  }
                                }}
                                onSelect={(item) => {
                                  if (!item || !item.codigo) {
                                    setNewGastosServicioItem(prev => {
                                      const next = {
                                        ...prev,
                                        codigo_item: '',
                                        descripcion_item: '',
                                        cotizado_hombre_dia: 0
                                      };
                                      return recalculateServiceItem(next, 'cotizado_hombre_dia');
                                    });
                                    return;
                                  }
                                  setNewGastosServicioItem(prev => {
                                    const next = {
                                      ...prev,
                                      codigo_item: item.codigo,
                                      descripcion_item: item.nombre,
                                      cotizado_hombre_dia: 0
                                    };
                                    return recalculateServiceItem(next, 'cotizado_hombre_dia');
                                  });
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex flex-col w-full">
                                <input
                                  id="new-group-gastos-desc"
                                  type="text"
                                  className={cn(
                                    "w-full text-[11px] border rounded px-1.5 py-1 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-left",
                                    descError.category === "05" ? "border-red-400 ring-1 ring-red-100" : "border-slate-300"
                                  )}
                                  value={newGastosServicioItem.descripcion_item}
                                  placeholder="Descripción..."
                                  onChange={(e) => handleDescriptionChange('05', e.target.value.toUpperCase())}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddGastosServicioItem();
                                    }
                                  }}
                                />
                                {descError.category === "05" && (
                                  <span className="text-[9px] text-red-500 font-bold mt-0.5 pl-1">
                                    {descError.message}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <input
                                type="number"
                                placeholder="1"
                                min="1"
                                className="w-full text-[11px] border border-slate-300 text-center rounded px-1 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                value={newGastosServicioItem.cantidad_hombres || ""}
                                onChange={(e) => handleGastosServicioFieldChange('cantidad_hombres', parseInt(e.target.value) || 1)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddGastosServicioItem();
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <input
                                type="number"
                                placeholder="1"
                                min="1"
                                className="w-full text-[11px] border border-slate-300 text-center rounded px-1 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                value={newGastosServicioItem.cantidad_dias || ""}
                                onChange={(e) => handleGastosServicioFieldChange('cantidad_dias', parseInt(e.target.value) || 1)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddGastosServicioItem();
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <input
                                type="text"
                                placeholder="0.00"
                                className="w-full text-[11px] border border-slate-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center bg-white"
                                value={newGastosServicioItem.cotizado_hombre_dia === undefined || newGastosServicioItem.cotizado_hombre_dia === null ? "" : newGastosServicioItem.cotizado_hombre_dia}
                                onChange={(e) => handleDecimalChange(e, (val) => handleGastosServicioFieldChange('cotizado_hombre_dia', val))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddGastosServicioItem();
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right text-[11px] font-black text-indigo-600 align-middle">
                              {formatMoneySymbolSafe(Number(newGastosServicioItem.cotizado_total || 0))}
                            </td>
                            <td className="px-3 py-1.5 text-center align-middle">
                              <button
                                onClick={handleAddGastosServicioItem}
                                className="p-1 bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                title="Añadir"
                              >
                                <Icon name="check" className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                          {renderInlineGastoCreateForm && renderInlineGastoCreateForm('new', handleGastoCreatedLocal, handleGastoCancelLocal)}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* CATEGORÍA: OTROS */}
                  <div className="bg-white border border-slate-150 rounded-xl shadow-sm overflow-visible animate-fadeIn">
                    <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                          <Icon name="file-text" className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider">
                          Otros
                        </span>
                        <span className="text-[9px] bg-amber-50 border border-amber-100 text-amber-600 font-bold px-1.5 py-0.5 rounded-full uppercase">
                          {tempItems.filter(it => it.categoria === "06").length} Ítems
                        </span>
                      </div>
                      
                      <div className="w-80 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg focus-within:border-amber-400 transition-colors">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight whitespace-nowrap">
                          Título:
                        </span>
                        <input
                          type="text"
                          data-field="subgroup-custom-title"
                          className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 focus:ring-0 p-0 uppercase"
                          value={categoryTitles["06"] || ""}
                          onChange={(e) => setCategoryTitles(prev => ({ ...prev, "06": e.target.value.toUpperCase() }))}
                        />
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto overflow-visible">
                      <table className="min-w-full table-fixed divide-y divide-slate-100">
                        <thead className="bg-slate-100/50 border-b border-slate-200">
                          <tr>
                            <th className="w-[15%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Código Gasto</th>
                            <th className="w-[32%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Descripción</th>
                            <th className="w-[6%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Cantidad</th>
                            <th className="w-[8%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Precio</th>
                            <th className="w-[10%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Utilidad</th>
                            <th className="w-[10%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Venta Precio</th>
                            <th className="w-[14%] px-3 py-2 text-center text-[10px] font-black text-slate-750 uppercase tracking-wider">Venta Total</th>
                            <th className="w-[5%] px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {tempItems.filter(it => it.categoria === "06").map((item) => (
                            <tr key={item.id_temp} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-3 py-1.5 text-[11px] font-bold text-slate-900 uppercase whitespace-nowrap">
                                {item.codigo_item || "S/C"}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-slate-750 uppercase font-semibold truncate max-w-0" title={item.descripcion_item}>
                                {item.descripcion_item}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-center font-bold text-slate-900">
                                {item.cantidad_hombres}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-right text-slate-600 font-medium whitespace-nowrap">
                                {formatMoneySymbolSafe(item.costo_hombre_dia)}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-right text-slate-600 font-medium">
                                <div className="flex flex-col items-end whitespace-nowrap">
                                  <span>{formatMoneySymbolSafe(item.utilidad)}</span>
                                  <span className="text-[9px] text-gray-400">{item.porcentaje}%</span>
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-right text-slate-600 font-medium whitespace-nowrap">
                                {formatMoneySymbolSafe(item.cotizado_hombre_dia)}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] font-black text-right text-slate-900 whitespace-nowrap">
                                {formatMoneySymbolSafe(item.cotizado_total)}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <button
                                  onClick={() => handleRemoveItem(item.id_temp)}
                                  className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                                  title="Quitar"
                                >
                                  <Icon name="trash-2" className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          
                          <tr className="bg-indigo-50/10">
                            <td className="px-3 py-1.5">
                              <TipoGastoDetalleAutocomplete
                                value={newOtrosItem.codigo_item || ""}
                                codePrefix="06"
                                onTriggerCreateGasto={(name) => handleTriggerCreateGasto(name, 'new', '06', handleGastoCreatedLocal, handleGastoCancelLocal)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddOtrosItem();
                                  }
                                }}
                                onSelect={(item) => {
                                  if (!item || !item.codigo) {
                                    setNewOtrosItem(prev => {
                                      const next = {
                                        ...prev,
                                        codigo_item: '',
                                        descripcion_item: '',
                                        costo_hombre_dia: 0
                                      };
                                      return recalculateServiceItem(next, 'costo_hombre_dia');
                                    });
                                    return;
                                  }
                                  setNewOtrosItem(prev => {
                                    const next = {
                                      ...prev,
                                      codigo_item: item.codigo,
                                      descripcion_item: item.nombre,
                                      costo_hombre_dia: 0
                                    };
                                    return recalculateServiceItem(next, 'costo_hombre_dia');
                                  });
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex flex-col w-full">
                                <input
                                  id="new-group-otros-desc"
                                  type="text"
                                  className={cn(
                                    "w-full text-[11px] border rounded px-1.5 py-1 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-left",
                                    descError.category === "06" ? "border-red-400 ring-1 ring-red-100" : "border-slate-300"
                                  )}
                                  value={newOtrosItem.descripcion_item}
                                  placeholder="Descripción..."
                                  onChange={(e) => handleDescriptionChange('06', e.target.value.toUpperCase())}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddOtrosItem();
                                    }
                                  }}
                                />
                                {descError.category === "06" && (
                                  <span className="text-[9px] text-red-500 font-bold mt-0.5 pl-1">
                                    {descError.message}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <input
                                type="number"
                                placeholder="1"
                                min="1"
                                className="w-full text-[11px] border border-slate-300 text-center rounded px-1 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                value={newOtrosItem.cantidad_hombres || ""}
                                onChange={(e) => handleOtrosFieldChange('cantidad_hombres', parseInt(e.target.value) || 1)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddOtrosItem();
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <input
                                type="text"
                                placeholder="0.00"
                                className="w-full text-[11px] border border-slate-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center bg-white"
                                value={newOtrosItem.costo_hombre_dia === undefined || newOtrosItem.costo_hombre_dia === null ? "" : newOtrosItem.costo_hombre_dia}
                                onChange={(e) => handleDecimalChange(e, (val) => handleOtrosFieldChange('costo_hombre_dia', val))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddOtrosItem();
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex flex-col gap-1 items-center justify-center text-center">
                                <span className="text-[11px] font-bold text-slate-700">
                                  {formatMoneySymbolSafe(Number(newOtrosItem.utilidad || 0))}
                                </span>
                                <div className="relative flex items-center justify-center w-full">
                                  <input
                                    type="text"
                                    className="w-full text-[10px] border border-slate-300 text-center rounded px-1 py-0.5 font-medium text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                    value={newOtrosItem.porcentaje === undefined || newOtrosItem.porcentaje === null ? "" : newOtrosItem.porcentaje}
                                    onChange={(e) => handleDecimalChange(e, (val) => handleOtrosFieldChange('porcentaje', val))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddOtrosItem();
                                      }
                                    }}
                                  />
                                  <span className="absolute right-1 text-[9px] text-slate-400">%</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-center text-[11.5px] font-semibold text-slate-500">
                              {formatMoneySymbolSafe(Number(newOtrosItem.cotizado_hombre_dia || 0))}
                            </td>
                            <td className="px-3 py-1.5 text-right text-[11px] font-black text-indigo-600 align-middle">
                              {formatMoneySymbolSafe(Number(newOtrosItem.cotizado_total || 0))}
                            </td>
                            <td className="px-3 py-1.5 text-center align-middle">
                              <button
                                onClick={handleAddOtrosItem}
                                className="p-1 bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                title="Añadir"
                              >
                                <Icon name="check" className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                          {renderInlineGastoCreateForm && renderInlineGastoCreateForm('new', handleGastoCreatedLocal, handleGastoCancelLocal)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <table className="min-w-full table-fixed divide-y divide-gray-100">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="w-[3%] py-2"></th>
                        <th className={isVenta ? "w-[14%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[15%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Código/Marca</th>
                        <th className={isVenta ? "w-[25%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[28%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Descripción *</th>
                        <th className={isVenta ? "w-[6%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[7%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Cantidad</th>
                        <th className={isVenta ? "w-[11%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[12%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Costo Unit.</th>
                        {isVenta && (
                          <th className="w-[10%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Envío</th>
                        )}
                        <th className={isVenta ? "w-[9%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[10%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Utilidad</th>
                        <th className={isVenta ? "w-[11%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[12%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Venta Precio</th>
                        <th className={isVenta ? "w-[11%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[13%] px-4 py-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Venta Total</th>
                        <th className="w-[5%] px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tempItems.map((item) => (
                        <tr key={item.id_temp} className="hover:bg-gray-50/50 transition-colors">
                          <td className="w-[3%] py-1.5"></td>
                          <td className="px-4 py-1.5 text-[11px] font-bold text-gray-900 uppercase">
                            <div className="flex flex-col">
                              <span>{item.codigo_item}</span>
                              {item.id_marca && (
                                <span className="text-[9px] text-gray-400 font-semibold">
                                  {proveedores?.find(p => String(p.id_marca).padStart(2, '0') === String(item.proveedor))?.nombre || ""}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-1.5 text-[11px] text-gray-700 uppercase font-medium">
                            <div className="flex flex-col">
                              <span>{item.descripcion}</span>
                              {item.observacion && (
                                <span className="text-[9px] text-gray-400 font-semibold">{item.observacion}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-1.5 text-[11px] text-center font-bold text-gray-900">{item.cantidad}</td>
                          <td className="px-4 py-1.5 text-[11px] text-right text-gray-600 font-medium">{formatMoneySymbolSafe(item.costo_precio)}</td>
                          {isVenta && (
                            <td className="px-4 py-1.5 text-[11px] text-right text-gray-600 font-medium">
                              {formatMoneySymbolSafe(item.costo_envio)}
                            </td>
                          )}
                          <td className="px-4 py-1.5 text-[11px] text-right text-gray-600 font-medium">
                            <div className="flex flex-col items-end">
                              <span>{formatMoneySymbolSafe(item.utilidad || 0)}</span>
                              <span className="text-[9px] text-gray-400">{item.porcentaje_utilidad || 0}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-1.5 text-[11px] text-right text-gray-600 font-medium">
                            {formatMoneySymbolSafe(item.precio_venta || item.costo_precio)}
                          </td>
                          <td className="px-4 py-1.5 text-[11px] font-black text-right text-gray-900">
                            {formatMoneySymbolSafe(isVenta ? item.venta_total : item.cantidad * item.costo_precio)}
                          </td>
                          <td className="px-4 py-1.5 text-center">
                            <button
                              onClick={() => handleRemoveItem(item.id_temp)}
                              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                              title="Quitar"
                            >
                              <Icon name="trash-2" className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      <tr className="bg-indigo-50/10" onKeyDown={e => handleRowKeyDown(e, handleAddItem)}>
                        <td className="w-[3%] py-1.5"></td>
                        {/* P/N o Código / Marca */}
                        <td className="px-4 py-1.5">
                          {canExpand ? (
                            <div className="flex flex-col gap-1 items-center justify-center text-center relative">
                              <MarcaAutocomplete
                                idMarca={newItem.id_marca}
                                proveedores={proveedores}
                                onSelect={(brand) => {
                                  const code = String(brand.id_marca).padStart(2, '0');
                                  setNewItem(prev => {
                                    const next = { ...prev, proveedor: code, id_marca: brand.id_marca };
                                    return recalculateItem(next, 'id_marca', tempData.costoEnvio || 0, 0);
                                  });
                                }}
                                onAddBrand={(newBrand) => {
                                  setProveedores(prev => [...prev, newBrand]);
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                                    e.preventDefault();
                                    handleAddItem();
                                  }
                                }}
                              />
                              <ProductoAutocomplete
                                id="quick-add-codigo-new"
                                value={newItem.codigo_item || ""}
                                idMarca={newItem.id_marca}
                                tcamb={tipoCambio}
                                tipoMoneda={tipoMoneda}
                                catalogoVersion={catalogoVersion}
                                onTriggerCreate={(code) => handleTriggerCreateProduct(code, 'new', newItem.id_marca)}
                                onSelect={(prod) => {
                                  if (prod.isCustom) {
                                    setNewItem(prev => ({
                                      ...prev,
                                      codigo_item: prod.codigo
                                    }));
                                  } else {
                                    const normalizado = normalizarProductoDB(prod, tipoMoneda, tipoCambio, Number(newItem.cantidad || 1));
                                    setNewItem(prev => {
                                      const next = {
                                        ...prev,
                                        proveedor: normalizado.proveedor,
                                        id_marca: prod.id_marca,
                                        codigo_item: normalizado.codigo,
                                        descripcion: normalizado.descripcion,
                                        tipo_unidad: normalizado.unidad,
                                        costo_precio: normalizado.costoPrecio,
                                        porcentaje_utilidad: prev.porcentaje_utilidad || 20
                                      };
                                      return recalculateItem(next, 'porcentaje_utilidad', tempData.costoEnvio || 0, 0);
                                    });
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="P/N..."
                              className="w-full bg-transparent border border-gray-200 rounded px-2 py-1 text-[11px] font-bold uppercase text-indigo-700 placeholder:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                              value={newItem.codigo_item}
                              onChange={(e) => handleNewItemChange('codigo_item', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                                  e.preventDefault();
                                  handleAddItem();
                                }
                              }}
                            />
                          )}
                        </td>
                        {/* Descripción / Observación */}
                        <td className="px-4 py-1.5">
                          {canExpand ? (
                            <div className="flex flex-col gap-1 items-center justify-center text-center">
                              <input
                                id="quick-add-descripcion-new"
                                type="text"
                                className="w-full text-[11px] border border-gray-300 rounded px-1.5 py-0.5 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                                value={newItem.descripcion || ""}
                                placeholder="Descripción..."
                                onChange={e => handleNewItemChange("descripcion", e.target.value.toUpperCase())}
                              />
                              <input
                                type="text"
                                className="w-full text-[9px] border border-gray-200 text-gray-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                                value={newItem.observacion || ""}
                                placeholder="Observación..."
                                onChange={e => handleNewItemChange("observacion", e.target.value.toUpperCase())}
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="DESCRIPCIÓN DEL ARTÍCULO..."
                              className="w-full bg-transparent border border-gray-200 rounded px-2 py-1 text-[11px] font-bold uppercase text-indigo-700 placeholder:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                              value={newItem.descripcion}
                              onChange={(e) => handleNewItemChange('descripcion', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                                  e.preventDefault();
                                  handleAddItem();
                                }
                              }}
                            />
                          )}
                        </td>
                        {/* Cantidad */}
                        <td className="px-4 py-1.5 text-center">
                          <input
                            type="number"
                            placeholder="0"
                            className={canExpand
                              ? "w-full text-[11px] border border-gray-300 text-center rounded px-1 py-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                              : "w-16 bg-transparent border border-gray-200 rounded px-2 py-1 text-[11px] font-bold text-center text-indigo-700 placeholder:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                            }
                            value={newItem.cantidad || ""}
                            onChange={(e) => handleNewItemChange('cantidad', parseInt(e.target.value) || 1)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                                e.preventDefault();
                                handleAddItem();
                              }
                            }}
                          />
                        </td>
                        {/* Costo Unitario */}
                        <td className="px-4 py-1.5 text-center">
                          <input
                            type="text"
                            placeholder="0.00"
                            className={canExpand
                              ? "w-full text-[11px] border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center bg-white"
                              : "w-24 bg-transparent border border-gray-200 rounded px-2 py-1 text-[11px] font-bold text-center text-indigo-700 placeholder:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                            }
                            value={newItem.costo_precio === undefined || newItem.costo_precio === null ? "" : newItem.costo_precio}
                            onChange={(e) => handleDecimalChange(e, (val) => handleNewItemChange('costo_precio', val))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                                e.preventDefault();
                                handleAddItem();
                              }
                            }}
                          />
                        </td>
                        {/* Envío condicional */}
                        {isVenta && (
                          <td className="px-4 py-1.5 text-center">
                            <span className="text-[11px] font-bold text-gray-700">
                              {formatMoneySymbolSafe(Number(newItem.costo_envio || 0))}
                            </span>
                          </td>
                        )}
                        {/* Utilidad */}
                        <td className="px-4 py-1.5">
                          <div className="flex flex-col gap-1 items-center justify-center text-center">
                            <span className="text-[11px] font-bold text-gray-700">
                              {formatMoneySymbolSafe(Number(newItem.utilidad || 0))}
                            </span>
                            <div className="relative flex items-center justify-center w-full">
                              <input
                                type="text"
                                className="w-full text-[10px] border border-gray-300 text-center rounded px-1 py-0.5 font-medium text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                value={newItem.porcentaje_utilidad === undefined || newItem.porcentaje_utilidad === null ? "" : newItem.porcentaje_utilidad}
                                onChange={(e) => handleDecimalChange(e, (val) => handleNewItemChange('porcentaje_utilidad', val))}
                                onKeyDown={e => {
                                  if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                                    e.preventDefault();
                                    handleAddItem();
                                  }
                                }}
                              />
                              <span className="absolute right-1 text-[9px] text-gray-400">%</span>
                            </div>
                          </div>
                        </td>
                        {/* Precio unitario */}
                        <td className="px-4 py-1.5 text-center text-[11.5px] font-semibold text-gray-500">
                          {formatMoneySymbolSafe(Number(newItem.precio_venta || 0))}
                        </td>
                        {/* Total */}
                        <td className="px-4 py-1.5 text-right text-[11px] font-black text-indigo-600 align-middle">
                          {formatMoneySymbolSafe(isVenta ? (newItem.venta_total || 0) : (newItem.cantidad || 1) * (newItem.costo_precio || 0))}
                        </td>
                        <td className="px-4 py-1.5 text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            {canExpand && (
                              <ActionMenu
                                title="Logística y Detalles del Nuevo Ítem"
                                align="end"
                                closeOnSelect={false}
                                contentClassName="min-w-[300px]"
                                customTrigger={
                                  <button
                                    type="button"
                                    className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg border border-gray-200 shadow-sm transition-colors flex items-center justify-center"
                                    title="Detalles Adicionales"
                                  >
                                    <Icon name="ellipsis-vertical" className="h-3.5 w-3.5" />
                                  </button>
                                }
                              >
                                <div 
                                  className="p-3 space-y-3 text-xs text-left bg-white"
                                  onKeyDown={handleDetailsKeyDown}
                                 >
                                  {/* U. Medida */}
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-gray-400 uppercase text-[9px]">U. Medida:</span>
                                    <UnidadMedidaAutocomplete
                                      idMedida={newItem.id_medida}
                                      unidadesMedida={unidadesMedida}
                                      onSelect={(unit) => {
                                        setNewItem(prev => ({
                                          ...prev,
                                          id_medida: unit.id_medida,
                                          tipo_unidad: unit.nombre
                                        }));
                                      }}
                                      onAddMedida={(newUnit) => {
                                        setUnidadesMedida(prev => [...prev, newUnit]);
                                        setNewItem(prev => ({
                                          ...prev,
                                          id_medida: newUnit.id_medida,
                                          tipo_unidad: newUnit.nombre
                                        }));
                                      }}
                                    />
                                  </div>
                                  {/* Tiempo Entrega */}
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-gray-400 uppercase text-[9px]">Tiempo Entrega:</span>
                                    <div className="flex gap-2">
                                      <input
                                        type="number"
                                        className="w-2/3 border border-gray-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-gray-700"
                                        value={newItem.tiempo_entrega || ""}
                                        onChange={e => handleNewItemChange("tiempo_entrega", e.target.value)}
                                        placeholder="Días"
                                      />
                                      <select
                                        className="w-1/3 border border-gray-200 rounded px-1 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-gray-750"
                                        value={newItem.id_unidad_tiempo_entrega || 1}
                                        onChange={e => handleNewItemChange("id_unidad_tiempo_entrega", parseInt(e.target.value, 10))}
                                      >
                                        <option value={1}>DÍAS</option>
                                        <option value={2}>SEMANAS</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* RESUMEN DE VENTA */}
                                  {(() => {
                                    const itemCantidad = Number(newItem.cantidad || 0);
                                    const itemCostoPrecio = Number(newItem.costo_precio || 0);
                                    const itemCostoEnvio = Number(newItem.costo_envio || 0);
                                    const itemPrecioVenta = Number(newItem.precio_venta || 0);
                                    const itemVentaTotal = Number(newItem.venta_total || 0);
                                    const itemUtilidad = Number(newItem.utilidad || 0);

                                    const costoTotal = itemCostoPrecio * itemCantidad;
                                    const costoConEnvioPorUnidad = itemCostoPrecio + itemCostoEnvio;
                                    const precioVentaUnit = itemPrecioVenta;
                                    const ventaTotal = isVenta ? itemVentaTotal : costoTotal;
                                    const utilidadTotal = itemUtilidad * itemCantidad;

                                    return (
                                      <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3 space-y-2 shadow-inner mt-2">
                                        <div className="flex items-center gap-2 text-teal-700">
                                          <Icon name="trending-up" className="h-3.5 w-3.5" />
                                          <span className="text-[10px] font-black uppercase tracking-tight">Resumen de Venta</span>
                                        </div>
                                        <div className="space-y-1 text-[11px]">
                                          <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-100/50">
                                            <span>Costo Total:</span>
                                            <span className="font-semibold text-gray-700">{formatMoneySymbolSafe(costoTotal)}</span>
                                          </div>
                                          {isVenta && (
                                            <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-100/50">
                                              <span>Costo con Envío:</span>
                                              <span className="font-semibold text-gray-700">{formatMoneySymbolSafe(costoConEnvioPorUnidad)}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-100/50">
                                            <span>Precio Venta:</span>
                                            <span className="font-semibold text-gray-700">{formatMoneySymbolSafe(precioVentaUnit)}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-teal-800 py-0.5 border-b border-teal-100/50 font-black">
                                            <span>Venta Total:</span>
                                            <span className="text-teal-700 text-[12px]">{formatMoneySymbolSafe(ventaTotal)}</span>
                                          </div>
                                          {isVenta && (
                                            <div className="flex justify-between items-center text-emerald-800 py-0.5 font-bold">
                                              <span>Utilidad Total:</span>
                                              <span className="text-emerald-600">{formatMoneySymbolSafe(utilidadTotal)}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </ActionMenu>
                            )}
                          </div>
                        </td>
                      </tr>
                      {renderInlineProductCreateForm && renderInlineProductCreateForm('new', handleProductCreatedLocal, handleProductCancelLocal)}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

const CotizacionDetalle = ({ esOportunidad = false }) => {
  const { numReg } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    crearNuevaVersion,
    copiarCotizacion, // Extraer la función de copia
    eliminarCotizacion,
    enviarCotizacionAprobacion,
    isPending,
    handleReporteDetallado,
    handleReporteResumen
  } = useCotizacionAcciones(numReg, (action, payload) => {
    if (action === "enviar-aprobacion") {
      // Sincronizar estado local inmediatamente para evitar F5
      setData(prev => prev ? { ...prev, estado_envio: 2 } : prev);
      setOriginalData(prev => prev ? { ...prev, estado_envio: 2 } : prev);
    }
  });
  const pasarACotizacion = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("access_token");
      const res = await api.post(
        `cotizaciones/${numReg}/pasar-a-cotizacion/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    },
    onSuccess: (res) => {
      toast.success("Transición a cotización exitosa");
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      queryClient.invalidateQueries({ queryKey: ["cotizacion", numReg] });
      navigate(`/sigecom/comercial/cotizaciones/${numReg}`, { replace: true });
    },
    onError: (err) => {
      const errMsg = err.response?.data?.error || "Error al realizar la transición";
      toast.error(errMsg);
    }
  });
  const pasarAApertura = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("access_token");
      const res = await api.post(
        `cotizaciones/${numReg}/pasar-a-apertura/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    },
    onSuccess: (res) => {
      toast.success("Transición a apertura exitosa");
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["aperturas"] });
      queryClient.invalidateQueries({ queryKey: ["cotizacion", numReg] });
      navigate(`/sigecom/comercial/aperturas/${numReg}`, { replace: true });
    },
    onError: (err) => {
      const errMsg = err.response?.data?.error || "Error al realizar la transición";
      toast.error(errMsg);
    }
  });
  const [data, setData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [catalogoVersion, setCatalogoVersion] = useState(0);

  useEffect(() => {
    const codeToShow = data?.codigo || data?.numero;
    if (codeToShow) {
      window.dispatchEvent(new CustomEvent("sigecom-breadcrumb-label", {
        detail: {
          path: window.location.pathname,
          label: codeToShow
        }
      }));
    }
  }, [data?.codigo, data?.numero]);

  useEffect(() => {
    const isDropdownOrPortalOpen = () => {
      return !!document.querySelector(
        '.autocomplete-dropdown-portal, ' +
        '[data-radix-popper-content-wrapper], ' +
        '[data-radix-portal], ' +
        '.react-datepicker-popper, ' +
        '[role="listbox"], ' +
        '[role="menu"]'
      );
    };

    const navigateFocusGeometrically = (currentElement, direction) => {
      const container = document.getElementById('section-servicios');
      if (!container) return false;

      const selector = 'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"]';
      const allInputs = Array.from(container.querySelectorAll(selector))
        .filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && !el.readOnly;
        });

      const currentRect = currentElement.getBoundingClientRect();
      const currentCenterX = currentRect.left + currentRect.width / 2;

      let targetElement = null;

      if (direction === 'down') {
        const belowInputs = allInputs.filter(el => {
          const r = el.getBoundingClientRect();
          return r.top > currentRect.top + 5;
        });

        if (belowInputs.length > 0) {
          belowInputs.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
          const nextRowTop = belowInputs[0].getBoundingClientRect().top;

          const nextRowInputs = belowInputs.filter(el => {
            const r = el.getBoundingClientRect();
            return Math.abs(r.top - nextRowTop) < 15;
          });

          nextRowInputs.sort((a, b) => {
            const rA = a.getBoundingClientRect();
            const rB = b.getBoundingClientRect();
            const centerA = rA.left + rA.width / 2;
            const centerB = rB.left + rB.width / 2;
            return Math.abs(centerA - currentCenterX) - Math.abs(centerB - currentCenterX);
          });

          targetElement = nextRowInputs[0];
        }
      } else if (direction === 'up') {
        const aboveInputs = allInputs.filter(el => {
          const r = el.getBoundingClientRect();
          return r.top < currentRect.top - 5;
        });

        if (aboveInputs.length > 0) {
          aboveInputs.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
          const prevRowTop = aboveInputs[0].getBoundingClientRect().top;

          const prevRowInputs = aboveInputs.filter(el => {
            const r = el.getBoundingClientRect();
            return Math.abs(r.top - prevRowTop) < 15;
          });

          prevRowInputs.sort((a, b) => {
            const rA = a.getBoundingClientRect();
            const rB = b.getBoundingClientRect();
            const centerA = rA.left + rA.width / 2;
            const centerB = rB.left + rB.width / 2;
            return Math.abs(centerA - currentCenterX) - Math.abs(centerB - currentCenterX);
          });

          targetElement = prevRowInputs[0];
        }
      } else if (direction === 'right') {
        const row = currentElement.closest('tr');
        if (row) {
          const rowInputs = Array.from(row.querySelectorAll(selector))
            .filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && !el.readOnly;
            });
          const idx = rowInputs.indexOf(currentElement);
          if (idx !== -1 && idx < rowInputs.length - 1) {
            targetElement = rowInputs[idx + 1];
          }
        }
        if (!targetElement) {
          const rowInputs = allInputs.filter(el => {
            if (el === currentElement) return false;
            const r = el.getBoundingClientRect();
            return Math.abs(r.top - currentRect.top) < 15 && r.left > currentRect.left + 5;
          });
          if (rowInputs.length > 0) {
            rowInputs.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
            targetElement = rowInputs[0];
          }
        }
      } else if (direction === 'left') {
        const row = currentElement.closest('tr');
        if (row) {
          const rowInputs = Array.from(row.querySelectorAll(selector))
            .filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && !el.readOnly;
            });
          const idx = rowInputs.indexOf(currentElement);
          if (idx > 0) {
            targetElement = rowInputs[idx - 1];
          }
        }
        if (!targetElement) {
          const rowInputs = allInputs.filter(el => {
            if (el === currentElement) return false;
            const r = el.getBoundingClientRect();
            return Math.abs(r.top - currentRect.top) < 15 && r.left < currentRect.left - 5;
          });
          if (rowInputs.length > 0) {
            rowInputs.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left);
            targetElement = rowInputs[0];
          }
        }
      }

      if (targetElement) {
        if (targetElement.hasAttribute('contenteditable') || targetElement.classList.contains('ql-editor')) {
          targetElement.focus();
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(targetElement);
            range.collapse(direction === 'up' || direction === 'left');
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } else {
          targetElement.focus();
          if (typeof targetElement.select === 'function') {
            targetElement.select();
          }
        }
        return true;
      }
      return false;
    };

    const handleGlobalKeyDown = (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
        return;
      }

      const target = e.target;
      if (!target) return;

      const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.hasAttribute('contenteditable') || target.getAttribute('contenteditable') === 'true' || target.classList.contains('ql-editor');

      if (!isInput && !isContentEditable) {
        return;
      }

      const isInsideServicios = !!target.closest('#section-servicios');
      if (!isInsideServicios) {
        return;
      }

      if (isDropdownOrPortalOpen()) {
        return;
      }

      const isTextarea = target.tagName === 'TEXTAREA';
      const isNumberInput = target.type === 'number';
      const supportsSelection = ["text", "search", "url", "tel", "password"].includes(target.type) || isTextarea;

      let direction = '';
      if (e.key === 'ArrowUp') direction = 'up';
      if (e.key === 'ArrowDown') direction = 'down';
      if (e.key === 'ArrowLeft') direction = 'left';
      if (e.key === 'ArrowRight') direction = 'right';

      if (target.getAttribute('data-field') === 'subgroup-custom-title') {
        if (direction === 'down') {
          const card = target.closest('.bg-white') || target.closest('.border') || target.closest('div');
          if (card) {
            const firstInput = card.querySelector('tbody input:not([type="hidden"]):not(:disabled)');
            if (firstInput) {
              e.preventDefault();
              e.stopPropagation();
              firstInput.focus();
              if (typeof firstInput.select === 'function') {
                firstInput.select();
              }
              return;
            }
          }
        }
      }

      if (isContentEditable) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);

          const preRange = range.cloneRange();
          preRange.selectNodeContents(target);
          preRange.setEnd(range.startContainer, range.startOffset);
          const startOffset = preRange.toString().length;

          const postRange = range.cloneRange();
          postRange.selectNodeContents(target);
          postRange.setStart(range.endContainer, range.endOffset);
          const endOffset = postRange.toString().length;

          if (direction === 'up' && startOffset > 0) return;
          if (direction === 'down' && endOffset > 0) return;
          if (direction === 'left' && startOffset > 0) return;
          if (direction === 'right' && endOffset > 0) return;
        }
      }

      if (isTextarea) {
        if (direction === 'up' && target.selectionStart !== 0) return;
        if (direction === 'down' && target.selectionEnd !== target.value.length) return;
      }

      if (supportsSelection && !isTextarea && !isNumberInput && !isContentEditable) {
        let selStart = 0;
        let selEnd = 0;
        try {
          selStart = target.selectionStart;
          selEnd = target.selectionEnd;
        } catch (err) {
          selStart = 0;
          selEnd = target.value.length;
        }

        if (direction === 'left' && selStart !== 0) return;
        if (direction === 'right' && selEnd !== target.value.length) return;
      }

      if (target.tagName === 'SELECT') {
        if (direction === 'up' || direction === 'down') return;
      }

      const success = navigateFocusGeometrically(target, direction);
      if (success) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const isReadOnly = Number(data?.estado_envio ?? 0) === 2;
  const isVenta = data?.id_tipo === "V";
  const tipoVenta = data?.tipo_venta;
  const canEdit = !isReadOnly;
  const quillRef = useRef(null);

  const xlsInputRef = useRef(null);
  const [xlsImportGrupoActivo, setXlsImportGrupoActivo] = useState(null);
  const [quickAddForm, setQuickAddForm] = useState({});

  // Product creation form states
  const [productCreateState, setProductCreateState] = useState({
    isOpen: false,
    targetGroup: null, // 'new' or codigo_grupo (string)
    idMarca: null,
    codigo: "",
    codigo2: "",
    nombre: "",
    id_medida: "",
    contenido_valor: "1.00",
    precio_dolares: "0.00",
    stock_min: "0",
    stock_max: "0",
    proveedor: "",
    descripcion: ""
  });
  const [productCreateCreating, setProductCreateCreating] = useState(false);
  const inlineProductFormRef = useRef(null);
  const inlineProductNombreInputRef = useRef(null);

  const [personalCreateState, setPersonalCreateState] = useState({
    isOpen: false,
    targetGroup: null,
    nombre: "",
    costo_min: "0.00",
    costo_max: "0.00",
    onSuccess: null,
    onCancel: null
  });
  const [personalCreateCreating, setPersonalCreateCreating] = useState(false);
  const inlinePersonalFormRef = useRef(null);
  const inlinePersonalCostoMinInputRef = useRef(null);
  const inlinePersonalNombreInputRef = useRef(null);

  const [gastoCreateState, setGastoCreateState] = useState({
    isOpen: false,
    targetGroup: null,
    nombre: "",
    codePrefix: "",
    onSuccess: null,
    onCancel: null
  });
  const [gastoCreateCreating, setGastoCreateCreating] = useState(false);
  const inlineGastoFormRef = useRef(null);
  const inlineGastoNombreInputRef = useRef(null);

  useEffect(() => {
    if (personalCreateState.isOpen) {
      setTimeout(() => {
        if (inlinePersonalFormRef.current) {
          inlinePersonalFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 150);
    }
  }, [personalCreateState.isOpen]);

  useEffect(() => {
    if (gastoCreateState.isOpen) {
      setTimeout(() => {
        if (inlineGastoFormRef.current) {
          inlineGastoFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 150);
    }
  }, [gastoCreateState.isOpen]);

  useEffect(() => {
    if (productCreateState.isOpen) {
      setTimeout(() => {
        if (inlineProductFormRef.current) {
          inlineProductFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 150);
    }
  }, [productCreateState.isOpen]);

  const handleTriggerCreateProduct = (code, targetGroup, idMarca) => {
    const brandName = proveedores?.find(p => p.id_marca === idMarca)?.nombre || "";
    setProductCreateState({
      isOpen: true,
      targetGroup,
      idMarca,
      codigo: code.toUpperCase(),
      codigo2: "",
      nombre: "",
      id_medida: "",
      contenido_valor: "1.00",
      precio_dolares: "0.00",
      stock_min: "0",
      stock_max: "0",
      proveedor: brandName,
      descripcion: ""
    });

    setTimeout(() => {
      if (inlineProductNombreInputRef.current) {
        inlineProductNombreInputRef.current.focus();
        inlineProductNombreInputRef.current.select();
      }
    }, 100);
  };

  const handleCancelCreateProduct = (onCancel) => {
    const { targetGroup, codigo } = productCreateState;
    setProductCreateState(prev => ({ ...prev, isOpen: false }));

    if (onCancel) {
      onCancel(codigo);
    } else {
      if (typeof targetGroup === 'string' && targetGroup.startsWith('edit-')) {
        setEditForm(prev => ({
          ...prev,
          codigo_item: codigo
        }));
      } else {
        handleRowChange("codigo_item", codigo, "add", targetGroup);
      }
    }
  };

  const handleSaveProductInline = async (onSuccess) => {
    const { targetGroup, idMarca, codigo, codigo2, nombre, id_medida, contenido_valor, precio_dolares, stock_min, stock_max, proveedor, descripcion } = productCreateState;
    
    if (!idMarca) {
      toast.error("Por favor, seleccione una Marca antes de crear el producto.");
      return;
    }
    if (!nombre.trim()) {
      toast.error("La descripción/nombre del producto es requerida.");
      if (inlineProductNombreInputRef.current) {
        inlineProductNombreInputRef.current.focus();
        inlineProductNombreInputRef.current.select();
      }
      return;
    }

    if (!precio_dolares || isNaN(Number(precio_dolares)) || Number(precio_dolares) < 0) {
      toast.error("El precio en dólares es requerido y debe ser mayor o igual a 0.");
      const priceInput = inlineProductFormRef.current?.querySelector('[data-inline-field="precio_dolares"]');
      if (priceInput) {
        priceInput.focus();
        if (typeof priceInput.select === 'function') {
          priceInput.select();
        }
      }
      return;
    }

    setProductCreateCreating(true);
    try {
      const { data: res } = await api.post("core/productos/", {
        id_marca: idMarca,
        codigo,
        nombre: nombre.trim().toUpperCase(),
        codigo2: codigo2.trim().toUpperCase() || null,
        contenido_valor,
        id_medida: id_medida || null,
        descripcion: descripcion.trim().toUpperCase() || null,
        stock_min,
        stock_max,
        proveedor: proveedor.trim().toUpperCase() || null,
        precio_dolares,
        tipo_cambio: data?.tipo_cambio || 1
      });

      if (res.ok && res.registro) {
        toast.success(`Producto "${codigo}" creado con éxito.`);
        setCatalogoVersion(prev => prev + 1);

        if (onSuccess) {
          onSuccess(res.registro);
        } else {
          if (typeof targetGroup === 'string' && targetGroup.startsWith('edit-')) {
            const normalizado = normalizarProductoDB(res.registro, data?.tipo_moneda || "S", data?.tipo_cambio || 1, Number(editForm.cantidad || 1));
            setEditForm(prev => {
              const updated = {
                ...prev,
                proveedor: normalizado.proveedor,
                id_marca: res.registro.id_marca,
                codigo_item: normalizado.codigo,
                descripcion: normalizado.descripcion,
                tipo_unidad: normalizado.unidad,
                costo_precio: normalizado.costoPrecio,
                porcentaje_utilidad: prev.porcentaje_utilidad || 20
              };
              return recalculateRowValues(updated, 'porcentaje_utilidad');
            });
          } else {
            const currentForm = quickAddForm[targetGroup] || { cantidad: 1 };
            const normalizado = normalizarProductoDB(res.registro, data?.tipo_moneda, data?.tipo_cambio || 1, Number(currentForm.cantidad || 1));
            setQuickAddForm(prev => {
              const current = prev[targetGroup] || { cantidad: 1 };
              const updated = {
                ...current,
                proveedor: normalizado.proveedor,
                id_marca: res.registro.id_marca,
                codigo_item: normalizado.codigo,
                descripcion: normalizado.descripcion,
                tipo_unidad: normalizado.unidad,
                costo_precio: normalizado.costoPrecio,
                porcentaje_utilidad: current.porcentaje_utilidad || 20
              };

              let groupCostoEnvio = 0;
              let totalCostoItems = 0;
              const foundGroup = gruposSuministros[targetGroup];
              if (foundGroup) {
                groupCostoEnvio = Number(data?.tipo_venta === "P" ? (foundGroup.costo_envio_unidad || foundGroup.costo_envio || 0) : (foundGroup.costo_envio_total || foundGroup.costo_envio || 0));
                const items = foundGroup.items || [];
                const existingCosto = items.reduce((acc, it) => acc + (Number(it.costo_precio || 0) * Number(it.cantidad || 0)), 0);
                const addCost = Number(updated.costo_precio || 0);
                const addQty = Number(updated.cantidad || 0);
                totalCostoItems = existingCosto + (addCost * addQty);
              }
              const recalculated = recalculateRowValues(updated, 'porcentaje_utilidad', groupCostoEnvio, totalCostoItems);

              return {
                ...prev,
                [targetGroup]: recalculated
              };
            });
          }
        }

        setProductCreateState(prev => ({ ...prev, isOpen: false }));
        
        // Auto-focus and select the description input in the quick-add row
        setTimeout(() => {
          const inputId = targetGroup === "new" ? "quick-add-descripcion-new" : `quick-add-descripcion-${targetGroup}`;
          const inputEl = document.getElementById(inputId);
          if (inputEl) {
            inputEl.focus();
            if (inputEl.select) inputEl.select();
          }
        }, 100);
      } else {
        toast.error("Error al crear el producto.");
      }
    } catch (err) {
      console.error("Error al crear producto:", err);
      toast.error(err.response?.data?.error || "Error al crear el producto");
    } finally {
      setProductCreateCreating(false);
    }
  };

  const handleTriggerCreatePersonal = (name, targetGroup, onSuccess, onCancel) => {
    setPersonalCreateState({
      isOpen: true,
      targetGroup,
      nombre: name.toUpperCase(),
      costo_min: "0.00",
      costo_max: "0.00",
      onSuccess,
      onCancel
    });

    setTimeout(() => {
      if (inlinePersonalNombreInputRef.current) {
        inlinePersonalNombreInputRef.current.focus();
        inlinePersonalNombreInputRef.current.select();
      }
    }, 150);
  };

  const handleCancelCreatePersonal = (onCancel) => {
    const { onCancel: stateOnCancel } = personalCreateState;
    setPersonalCreateState(prev => ({ ...prev, isOpen: false }));
    const activeCancel = onCancel || stateOnCancel;
    if (activeCancel) {
      activeCancel();
    }
  };

  const handleSavePersonalInline = async (onSuccess) => {
    const { targetGroup, nombre, costo_min, costo_max, onSuccess: stateOnSuccess } = personalCreateState;
    const activeSuccess = onSuccess || stateOnSuccess;

    if (!nombre.trim()) {
      toast.error("El nombre/cargo del personal es requerido.");
      return;
    }

    setPersonalCreateCreating(true);
    try {
      const { data: res } = await api.post("core/tipo_personal/", {
        nombre: nombre.trim().toUpperCase(),
        id_area: data?.id_area,
        costo_min: parseFloat(costo_min || 0),
        costo_max: parseFloat(costo_max || 0)
      });

      if (res.ok && res.registro) {
        toast.success(`Tipo de personal "${nombre.trim().toUpperCase()}" creado con éxito.`);
        setCatalogoVersion(prev => prev + 1);

        if (activeSuccess) {
          activeSuccess(res.registro);
        }

        setPersonalCreateState(prev => ({ ...prev, isOpen: false }));
      } else {
        toast.error("Error al crear el tipo de personal.");
      }
    } catch (err) {
      console.error("Error al crear personal:", err);
      toast.error(err.response?.data?.error || "Error al crear el tipo de personal");
    } finally {
      setPersonalCreateCreating(false);
    }
  };

  const renderInlinePersonalCreateForm = (targetGroup, onSuccess, onCancel) => {
    if (!personalCreateState.isOpen) return null;

    let isMatch = false;
    if (personalCreateState.targetGroup === targetGroup) {
      isMatch = true;
    } else if (typeof personalCreateState.targetGroup === 'string' && personalCreateState.targetGroup.startsWith('edit-')) {
      const idServicioItem = personalCreateState.targetGroup.split('-')[1];
      // For editing personal inside an inline edit row
      if (targetGroup.startsWith('edit-') && targetGroup === personalCreateState.targetGroup) {
        isMatch = true;
      }
    }

    if (!isMatch) return null;

    const colCount = 10;

    const handleFormKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleCancelCreatePersonal(onCancel);
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.stopPropagation();
        e.preventDefault();
        handleSavePersonalInline(onSuccess);
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        let isAtStart = true;
        let isAtEnd = true;
        try {
          if (e.target.selectionStart !== null && e.target.selectionStart !== undefined) {
            isAtStart = e.target.selectionStart === 0;
            isAtEnd = e.target.selectionStart === e.target.value?.length;
          }
        } catch (err) {}
        const fieldKey = e.target.getAttribute('data-inline-field');
        const navMap = {
          nombre: {
            ArrowRight: "costo_min"
          },
          costo_min: {
            ArrowLeft: "nombre",
            ArrowRight: "costo_max"
          },
          costo_max: {
            ArrowLeft: "costo_min"
          }
        };

        if (fieldKey && navMap[fieldKey]) {
          const directions = navMap[fieldKey];
          const targetField = directions[e.key];
          if (targetField) {
            let shouldGo = false;
            if (e.key === 'ArrowLeft' && isAtStart) shouldGo = true;
            if (e.key === 'ArrowRight' && isAtEnd) shouldGo = true;
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') shouldGo = true;

            if (shouldGo) {
              e.preventDefault();
              const input = inlinePersonalFormRef.current?.querySelector(`[data-inline-field="${targetField}"]`);
              if (input) {
                input.focus();
                if (typeof input.select === 'function') {
                  input.select();
                }
              }
            }
          }
        }
      }
    };

    return (
      <tr 
        ref={inlinePersonalFormRef}
        className="bg-indigo-50/30 border-y-2 border-indigo-500/20 animate-fadeIn"
        onKeyDown={handleFormKeyDown}
      >
        <td colSpan={colCount} className="p-3">
          <div className="flex flex-col gap-2.5 font-sans">
            {/* Cabecera Informativa */}
            <div className="flex items-center justify-between border-b border-indigo-150 pb-1.5 mb-0.5 text-[10px] font-black uppercase text-indigo-800 tracking-wider">
              <div className="flex items-center gap-1.5">
                <Icon name="plus-circle" className="h-4 w-4 text-indigo-600" />
                <span>Registrar Personal</span>
              </div>
              <span className="text-indigo-700 bg-indigo-100/50 px-2 py-0.5 rounded border border-indigo-200/50 font-bold">
                [ENTER] Guardar • [ESC] Cancelar
              </span>
            </div>

            {/* Campos en horizontal */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="col-span-2">
                <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">Nombre / Cargo *</label>
                <input
                  ref={inlinePersonalNombreInputRef}
                  type="text"
                  data-inline-field="nombre"
                  value={personalCreateState.nombre}
                  onChange={(e) => setPersonalCreateState(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="NOMBRE DEL CARGO (EJ. MAESTRO DE OBRA)"
                  required
                  className="border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1.5 w-full text-[11px] uppercase outline-none text-slate-700 font-semibold transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">Costo Mínimo *</label>
                <input
                  ref={inlinePersonalCostoMinInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  data-inline-field="costo_min"
                  value={personalCreateState.costo_min}
                  onChange={(e) => setPersonalCreateState(prev => ({ ...prev, costo_min: e.target.value }))}
                  placeholder="0.00"
                  className="border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1.5 w-full text-[11px] outline-none text-slate-700 font-semibold transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">Costo Máximo *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  data-inline-field="costo_max"
                  value={personalCreateState.costo_max}
                  onChange={(e) => setPersonalCreateState(prev => ({ ...prev, costo_max: e.target.value }))}
                  placeholder="0.00"
                  className="border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1.5 w-full text-[11px] outline-none text-slate-700 font-semibold transition-all bg-white"
                />
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const handleTriggerCreateGasto = (name, targetGroup, codePrefix, onSuccess, onCancel) => {
    setGastoCreateState({
      isOpen: true,
      targetGroup,
      nombre: name.toUpperCase(),
      codePrefix,
      onSuccess,
      onCancel
    });

    setTimeout(() => {
      if (inlineGastoNombreInputRef.current) {
        inlineGastoNombreInputRef.current.focus();
        inlineGastoNombreInputRef.current.select();
      }
    }, 150);
  };

  const handleCancelCreateGasto = (onCancel) => {
    const { onCancel: stateOnCancel } = gastoCreateState;
    setGastoCreateState(prev => ({ ...prev, isOpen: false }));
    const activeCancel = onCancel || stateOnCancel;
    if (activeCancel) {
      activeCancel();
    }
  };

  const handleSaveGastoInline = async (onSuccess) => {
    const { targetGroup, nombre, codePrefix, onSuccess: stateOnSuccess } = gastoCreateState;
    const activeSuccess = onSuccess || stateOnSuccess;

    if (!nombre.trim()) {
      toast.error("El nombre/concepto del gasto es requerido.");
      return;
    }

    setGastoCreateCreating(true);
    try {
      const { data: res } = await api.post("core/tipo_gasto_detalle/", {
        nombre: nombre.trim().toUpperCase(),
        code_prefix: codePrefix
      });

      if (res.ok && res.registro) {
        toast.success(`Tipo de Gasto "${nombre.trim().toUpperCase()}" creado con éxito.`);
        setCatalogoVersion(prev => prev + 1);

        if (activeSuccess) {
          activeSuccess(res.registro);
        }

        setGastoCreateState(prev => ({ ...prev, isOpen: false }));
      } else {
        toast.error("Error al crear el tipo de gasto.");
      }
    } catch (err) {
      console.error("Error al crear gasto:", err);
      toast.error(err.response?.data?.error || "Error al crear el tipo de gasto");
    } finally {
      setGastoCreateCreating(false);
    }
  };

  const renderInlineGastoCreateForm = (targetGroup, onSuccess, onCancel) => {
    if (!gastoCreateState.isOpen) return null;

    let isMatch = false;
    if (gastoCreateState.targetGroup === targetGroup) {
      isMatch = true;
    } else if (typeof gastoCreateState.targetGroup === 'string' && gastoCreateState.targetGroup.startsWith('edit-')) {
      const idServicioItem = Number(gastoCreateState.targetGroup.split('-')[1]);
      if (targetGroup.startsWith('edit-') && targetGroup === gastoCreateState.targetGroup) {
        isMatch = true;
      }
    }

    if (!isMatch) return null;

    const gp = Object.values(gruposServicios || {}).find(g => g.id_servicio === targetGroup) || {};
    const colCount = gp.tipoCodigo?.endsWith("05") ? 8 : 9;

    const handleFormKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleCancelCreateGasto(onCancel);
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.stopPropagation();
        e.preventDefault();
        handleSaveGastoInline(onSuccess);
      }
    };

    return (
      <tr 
        ref={inlineGastoFormRef}
        className="bg-indigo-50/30 border-y-2 border-indigo-500/20 animate-fadeIn"
        onKeyDown={handleFormKeyDown}
      >
        <td colSpan={colCount} className="p-3">
          <div className="flex flex-col gap-2.5 font-sans">
            {/* Cabecera Informativa */}
            <div className="flex items-center justify-between border-b border-indigo-150 pb-1.5 mb-0.5 text-[10px] font-black uppercase text-indigo-800 tracking-wider">
              <div className="flex items-center gap-1.5">
                <Icon name="plus-circle" className="h-4 w-4 text-indigo-600" />
                <span>Registrar Gasto</span>
              </div>
              <span className="text-indigo-700 bg-indigo-100/50 px-2 py-0.5 rounded border border-indigo-200/50 font-bold">
                [ENTER] Guardar • [ESC] Cancelar
              </span>
            </div>

            {/* Campo Nombre */}
            <div className="flex flex-col gap-1">
              <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">Nombre / Concepto *</label>
              <div className="flex gap-2">
                <input
                  ref={inlineGastoNombreInputRef}
                  type="text"
                  value={gastoCreateState.nombre}
                  onChange={(e) => setGastoCreateState(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="CONCEPTO DEL GASTO (EJ. VIÁTICOS, PAGO TERCEROS)"
                  required
                  className="border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1.5 w-full text-[11px] uppercase outline-none text-slate-700 font-semibold transition-all bg-white"
                />
                <button
                  type="button"
                  disabled={gastoCreateCreating}
                  onClick={() => handleSaveGastoInline(onSuccess)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-750 disabled:bg-indigo-300 text-white rounded-lg text-[11px] font-bold uppercase transition-all shrink-0 shadow-sm"
                >
                  {gastoCreateCreating ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelCreateGasto(onCancel)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold uppercase transition-all shrink-0 border border-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const renderInlineProductCreateForm = (targetGroup, onSuccess, onCancel) => {
    if (!productCreateState.isOpen) return null;

    let isMatch = false;
    if (productCreateState.targetGroup === targetGroup) {
      isMatch = true;
    } else if (typeof productCreateState.targetGroup === 'string' && productCreateState.targetGroup.startsWith('edit-')) {
      const idSuministro = Number(productCreateState.targetGroup.split('-')[1]);
      let itemBelongsToGroup = false;
      if (targetGroup === 'new') {
        // newItem doesn't have ID yet
      } else {
        const gp = Object.values(gruposSuministros || {}).find(g => g.codigo_grupo === targetGroup);
        if (gp && gp.items?.some(it => it.id_suministro === idSuministro)) {
          itemBelongsToGroup = true;
        }
      }
      if (itemBelongsToGroup) {
        isMatch = true;
      }
    }

    if (!isMatch) return null;

    const brandId = productCreateState.idMarca;
    const brandName = proveedores?.find(p => p.id_marca === brandId)?.nombre || "";

    const colCount = isVenta ? 10 : 9;

    const handleFormKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleCancelCreateProduct(onCancel);
      } else if (e.key === "Enter" && !e.shiftKey) {
        // If U. Medida suggestions dropdown is currently open, don't trigger save
        const isDropdownOpen = document.body.querySelector('.autocomplete-dropdown-portal');
        if (isDropdownOpen) {
          return; // Let UnidadMedidaAutocomplete handle selecting with Enter
        }
        if (e.target.closest('[role="listbox"]') || e.target.closest('.react-datepicker-popper') || document.querySelector('[data-radix-popper-content-wrapper]')) {
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        handleSaveProductInline(onSuccess);
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        let isAtStart = true;
        let isAtEnd = true;
        try {
          if (e.target.selectionStart !== null && e.target.selectionStart !== undefined) {
            isAtStart = e.target.selectionStart === 0;
            isAtEnd = e.target.selectionStart === e.target.value?.length;
          }
        } catch (err) {
          // input type="number" doesn't support selectionStart
        }
        const fieldKey = e.target.getAttribute('data-inline-field') || (e.target.classList.contains('u-medida-input') ? 'id_medida' : null);

        const navMap = {
          nombre: {
            ArrowRight: "id_medida",
            ArrowDown: "descripcion"
          },
          descripcion: {
            ArrowRight: "codigo2",
            ArrowUp: "nombre"
          },
          id_medida: {
            ArrowLeft: "nombre",
            ArrowRight: "precio_dolares",
            ArrowDown: "codigo2"
          },
          precio_dolares: {
            ArrowLeft: "id_medida",
            ArrowDown: "proveedor"
          },
          codigo2: {
            ArrowLeft: "descripcion",
            ArrowRight: "proveedor",
            ArrowUp: "id_medida",
            ArrowDown: "stock_min"
          },
          proveedor: {
            ArrowLeft: "codigo2",
            ArrowUp: "precio_dolares",
            ArrowDown: "stock_max"
          },
          stock_min: {
            ArrowLeft: "descripcion",
            ArrowRight: "stock_max",
            ArrowUp: "codigo2"
          },
          stock_max: {
            ArrowLeft: "stock_min",
            ArrowUp: "proveedor"
          }
        };

        if (fieldKey && navMap[fieldKey]) {
          // If U. Medida suggestions dropdown is currently open, don't trigger parent field navigation for ArrowUp/Down
          if (fieldKey === "id_medida" && ["ArrowUp", "ArrowDown"].includes(e.key)) {
            const isDropdownOpen = document.body.querySelector('.autocomplete-dropdown-portal');
            if (isDropdownOpen) {
              return; // let autocomplete handle it!
            }
          }

          const directions = navMap[fieldKey];
          const targetField = directions[e.key];
          if (targetField) {
            const isTextarea = e.target.tagName === 'TEXTAREA';
            let shouldGo = false;
            if (e.key === 'ArrowLeft' && isAtStart) shouldGo = true;
            if (e.key === 'ArrowRight' && isAtEnd) shouldGo = true;
            if (e.key === 'ArrowUp' && (!isTextarea || isAtStart)) shouldGo = true;
            if (e.key === 'ArrowDown' && (!isTextarea || isAtEnd)) shouldGo = true;

            if (shouldGo) {
              e.preventDefault();
              const formEl = inlineProductFormRef.current;
              if (formEl) {
                let input = null;
                if (targetField === "id_medida") {
                  input = formEl.querySelector('.u-medida-input');
                } else {
                  input = formEl.querySelector(`[data-inline-field="${targetField}"]`);
                }
                if (input) {
                  input.focus();
                  if (typeof input.select === 'function') {
                    input.select();
                  }
                }
              }
            }
          }
        }
      }
    };

    return (
      <tr 
        ref={inlineProductFormRef}
        className="bg-teal-50/30 border-y-2 border-teal-500/20 animate-fadeIn"
        onKeyDown={handleFormKeyDown}
      >
        <td colSpan={colCount} className="p-3">
          <div className="flex flex-col gap-3 font-sans">
            {/* Cabecera Informativa */}
            <div className="flex items-center justify-between border-b border-teal-100/50 pb-1.5 mb-1 text-[10px] font-black uppercase text-teal-800 tracking-wider">
              <div className="flex items-center gap-1.5">
                <Icon name="plus-circle" className="h-4 w-4 text-teal-600" />
                <span>Registrar Producto: "{productCreateState.codigo}"</span>
              </div>
              <span className="text-teal-700 bg-teal-100/50 px-2 py-0.5 rounded border border-teal-200/50 font-bold">
                Marca: {brandName || "---"} • [ENTER] Guardar • [ESC] Cancelar
              </span>
            </div>

            {/* Dos Columnas Principales */}
            <div className="flex flex-col md:flex-row gap-4">
              
              {/* Columna Izquierda: Campos de Texto Largo (60% del ancho) */}
              <div className="w-full md:w-3/5 space-y-3 flex flex-col justify-between">
                <div className="flex-1 flex flex-col min-h-[58px]">
                  <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">Descripción / Nombre *</label>
                  <textarea
                    ref={inlineProductNombreInputRef}
                    data-inline-field="nombre"
                    value={productCreateState.nombre}
                    onChange={(e) => setProductCreateState(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="DESCRIPCIÓN DEL PRODUCTO"
                    required
                    rows={2}
                    className="border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-2.5 py-1.5 w-full text-[11px] uppercase outline-none text-slate-700 font-semibold transition-all bg-white resize-none flex-1"
                  />
                </div>
                <div className="flex-1 flex flex-col min-h-[58px]">
                  <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">Detalles (Opcional)</label>
                  <textarea
                    data-inline-field="descripcion"
                    value={productCreateState.descripcion}
                    onChange={(e) => setProductCreateState(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="DETALLES O ESPECIFICACIONES ADICIONALES DEL PRODUCTO"
                    rows={2}
                    className="border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-2.5 py-1.5 w-full text-[11px] uppercase outline-none text-slate-700 font-semibold transition-all bg-white resize-none flex-1"
                  />
                </div>
              </div>

              {/* Columna Derecha: Campos de Control y Metadata (40% del ancho) */}
              <div className="w-full md:w-2/5 flex flex-col gap-3">
                {/* Fila 1 */}
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">U. Medida</label>
                    <UnidadMedidaAutocomplete
                      idMedida={productCreateState.id_medida}
                      unidadesMedida={unidadesMedida}
                      onSelect={(unit) => {
                        setProductCreateState(prev => ({
                          ...prev,
                          id_medida: unit.id_medida
                        }));
                      }}
                      onAddMedida={(newUnit) => {
                        setUnidadesMedida(prev => [...prev, newUnit]);
                        setProductCreateState(prev => ({
                          ...prev,
                          id_medida: newUnit.id_medida
                        }));
                      }}
                      onKeyDown={handleFormKeyDown}
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">Precio Dólares ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      data-inline-field="precio_dolares"
                      value={productCreateState.precio_dolares}
                      onChange={(e) => setProductCreateState(prev => ({ ...prev, precio_dolares: e.target.value }))}
                      className="border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-2.5 py-1.5 w-full text-[11px] outline-none text-slate-700 font-semibold transition-all bg-white"
                    />
                  </div>
                </div>

                {/* Fila 2 */}
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">Código Alternativo (Cód. 2)</label>
                    <input
                      type="text"
                      data-inline-field="codigo2"
                      value={productCreateState.codigo2}
                      onChange={(e) => setProductCreateState(prev => ({ ...prev, codigo2: e.target.value }))}
                      placeholder="OPCIONAL"
                      className="border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-2.5 py-1.5 w-full text-[11px] uppercase outline-none text-slate-700 font-semibold transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">Proveedor</label>
                    <input
                      type="text"
                      data-inline-field="proveedor"
                      value={productCreateState.proveedor}
                      onChange={(e) => setProductCreateState(prev => ({ ...prev, proveedor: e.target.value }))}
                      placeholder="OPCIONAL"
                      className="border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-2.5 py-1.5 w-full text-[11px] uppercase outline-none text-slate-700 font-semibold transition-all bg-white"
                    />
                  </div>
                </div>

                {/* Fila 3 */}
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      data-inline-field="stock_min"
                      value={productCreateState.stock_min}
                      onChange={(e) => setProductCreateState(prev => ({ ...prev, stock_min: e.target.value }))}
                      className="border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-2.5 py-1.5 w-full text-[11px] outline-none text-slate-700 font-semibold transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-650 uppercase mb-1">Stock Máximo</label>
                    <input
                      type="number"
                      data-inline-field="stock_max"
                      value={productCreateState.stock_max}
                      onChange={(e) => setProductCreateState(prev => ({ ...prev, stock_max: e.target.value }))}
                      className="border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-2.5 py-1.5 w-full text-[11px] outline-none text-slate-700 font-semibold transition-all bg-white"
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>
        </td>
      </tr>
    );
  };

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsType, setSuggestionsType] = useState(null); // 'add' or 'edit'
  const [suggestionsKey, setSuggestionsKey] = useState(null); // groupCode or itemId
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const suggestionsTimeoutRef = useRef(null);

  const [sugerenciasTiempos, setSugerenciasTiempos] = useState({ suministros: [], servicios: [], validez: [] });

  useEffect(() => {
    const fetchSugerencias = async () => {
      try {
        const { data: res } = await api.get("cotizaciones/tiempos-frecuentes/", {
          params: {
            id_cliente: data?.id_cliente || "",
            id_tipo: data?.id_tipo || ""
          }
        });
        if (res) {
          setSugerenciasTiempos({
            suministros: res.suministros || [],
            servicios: res.servicios || [],
            validez: res.validez || []
          });
        }
      } catch (err) {
        console.error("Error cargando sugerencias de tiempos:", err);
      }
    };

    fetchSugerencias();
  }, [data?.id_cliente, data?.id_tipo]);

  const handleSelectSugerenciaSuministro = (sug) => {
    if (isReadOnly) return;
    let unitId = "1";
    const code = sug.unidad_frontend || sug.unidad_codigo?.toUpperCase();
    if (code === "S" || code === "SE") unitId = "2";
    else if (code === "M" || code === "ME") unitId = "3";
    
    handleFieldChange("entrega_suministros", sug.cantidad);
    handleFieldChange("id_unidad_tiempo_entrega_suministros", unitId);
  };

  const handleSelectSugerenciaServicio = (sug) => {
    if (isReadOnly) return;
    let unitId = "1";
    const code = sug.unidad_frontend || sug.unidad_codigo?.toUpperCase();
    if (code === "S" || code === "SE") unitId = "2";
    else if (code === "M" || code === "ME") unitId = "3";
    
    handleFieldChange("entrega_servicios", sug.cantidad);
    handleFieldChange("id_unidad_tiempo_entrega_servicios", unitId);
  };

  const handleSelectSugerenciaValidez = (sug) => {
    if (isReadOnly) return;
    let unitId = "1";
    const code = sug.unidad_frontend || sug.unidad_codigo?.toUpperCase();
    if (code === "S" || code === "SE") unitId = "2";
    else if (code === "M" || code === "ME") unitId = "3";
    
    handleFieldChange("validez_oferta", sug.cantidad);
    handleFieldChange("id_unidad_tiempo_validez", unitId);
  };

  const isSuggestionActive = (sug, cant, unitIdSelected) => {
    if (cant === undefined || cant === null) return false;
    let unitId = "1";
    const code = sug.unidad_frontend || sug.unidad_codigo?.toUpperCase();
    if (code === "S" || code === "SE") unitId = "2";
    else if (code === "M" || code === "ME") unitId = "3";
    
    return Number(cant) === Number(sug.cantidad) && String(unitIdSelected) === String(unitId);
  };

  const [reporteSuministrosOpen, setReporteSuministrosOpen] = useState(false);
  const [reporteServiciosOpen, setReporteServiciosOpen] = useState(false);

  // Control del menú desplegable del header
  const [reporteMenuOpen, setReporteMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Control de los modales de visualización para Cliente
  const [reporteResumenOpen, setReporteResumenOpen] = useState(false);
  const [reporteDetalladoOpen, setReporteDetalladoOpen] = useState(false);
  const [reportePdfOpen, setReportePdfOpen] = useState(false);

  // Control de altura responsiva para iframes de reportes
  const [reporteHeight, setReporteHeight] = useState(null);
  const [reporteLoading, setReporteLoading] = useState(true);

  // Resetear estados al abrir/cerrar modales
  useEffect(() => {
    if (!reporteSuministrosOpen && !reporteServiciosOpen && !reporteDetalladoOpen && !reporteResumenOpen && !reportePdfOpen) {
      setReporteHeight(null);
      setReporteLoading(true);
    } else {
      setReporteLoading(true);
      setReporteHeight(null);
    }
  }, [reporteSuministrosOpen, reporteServiciosOpen, reporteDetalladoOpen, reporteResumenOpen, reportePdfOpen]);

  // Escuchar mensaje de altura de los reportes
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'set-iframe-height') {
        const h = Number(e.data.height);
        if (h > 0) {
          setReporteHeight(h);
          setReporteLoading(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Cerrar reportes al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setReporteSuministrosOpen(false);
        setReporteServiciosOpen(false);
        setReporteDetalladoOpen(false);
        setReporteResumenOpen(false);
        setReportePdfOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fallback de carga por seguridad (1.5 segundos)
  useEffect(() => {
    if (reporteSuministrosOpen || reporteServiciosOpen || reporteDetalladoOpen || reporteResumenOpen || reportePdfOpen) {
      const timer = setTimeout(() => {
        setReporteLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [reporteSuministrosOpen, reporteServiciosOpen, reporteDetalladoOpen, reporteResumenOpen, reportePdfOpen]);

  // Efecto para cerrar el menú si se hace clic fuera de él (Cierre Orgánico)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setReporteMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizarProductoDB = (prod, tipoMoneda, tcamb, cantidad) => {
    const isSoles = tipoMoneda === 'S' || tipoMoneda === 'PEN';
    const pSoles = Number(prod.precio_soles) || 0;
    const pDolares = Number(prod.precio_dolares) || 0;
    const tc = Number(tcamb) || 1;

    let costoPrecio = 0;
    if (isSoles) {
      costoPrecio = pSoles > 0 ? pSoles : pDolares * tc;
    } else {
      costoPrecio = pDolares > 0 ? pDolares : (tc > 0 ? pSoles / tc : 0);
    }

    const proveedor = String(prod.id_marca || "").padStart(2, '0');

    return {
      codigo: prod.codigo || "",
      descripcion: prod.nombre || "",
      unidad: prod.medida_nombre || "UNI",
      costoPrecio: Number(costoPrecio.toFixed(2)),
      proveedor: proveedor,
      marca: prod.marca_nombre || "Otros"
    };
  };

  const fetchSuggestions = async (codigo, proveedorCode) => {
    const key = String(codigo).trim().toUpperCase();
    if (!key || key.length < 3 || ["S/C", "."].includes(key)) {
      return [];
    }

    if (!proveedorCode) {
      return [{ isWarning: true, message: "⚠️ Selecciona una marca primero" }];
    }

    const brandId = parseInt(proveedorCode, 10);
    const tcamb = data?.tipo_cambio || 1;

    try {
      const res = await api.get("/core/productos/", {
        params: {
          search: key,
          id_marca: brandId
        }
      });
      const rows = res.data && res.data.ok && Array.isArray(res.data.data) ? res.data.data : [];
      return rows.map(prod => {
        const normalizado = normalizarProductoDB(prod, data?.tipo_moneda, tcamb, 1);
        return {
          ...normalizado,
          itemOriginal: prod
        };
      });
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      return [];
    }
  };

  const triggerSuggestionsSearch = (value, proveedorCode, type, key) => {
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }

    const trimmed = String(value).trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setSuggestionsType(null);
      setSuggestionsKey(null);
      setFocusedSuggestionIndex(-1);
      return;
    }

    suggestionsTimeoutRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(trimmed, proveedorCode);
      if (results.length > 0) {
        setSuggestions(results);
        setSuggestionsType(type);
        setSuggestionsKey(key);
        setFocusedSuggestionIndex(-1);
      } else {
        setSuggestions([]);
        setSuggestionsType(null);
        setSuggestionsKey(null);
        setFocusedSuggestionIndex(-1);
      }
    }, 250);
  };

  const handleSelectSuggestion = (sug, type, key) => {
    if (sug.isWarning) return;
    const brandId = parseInt(sug.proveedor, 10) || null;
    if (type === "add") {
      setQuickAddForm(prev => {
        const current = prev[key] || { cantidad: 1 };
        const updated = {
          ...current,
          proveedor: sug.proveedor,
          id_marca: brandId,
          codigo_item: sug.codigo,
          descripcion: sug.descripcion,
          tipo_unidad: sug.unidad,
          costo_precio: sug.costoPrecio,
          porcentaje_utilidad: current.porcentaje_utilidad || 20
        };
        const recalculated = recalculateRowValues(updated, 'porcentaje_utilidad');
        return {
          ...prev,
          [key]: recalculated
        };
      });
      toast.success(`Ítem ${sug.codigo} seleccionado (${sug.marca || 'Catálogo'})`);
    } else if (type === "edit") {
      setEditForm(prev => {
        const updated = {
          ...prev,
          proveedor: sug.proveedor,
          id_marca: brandId,
          codigo_item: sug.codigo,
          descripcion: sug.descripcion,
          tipo_unidad: sug.unidad,
          costo_precio: sug.costoPrecio,
          porcentaje_utilidad: prev.porcentaje_utilidad || 20
        };
        return recalculateRowValues(updated, 'porcentaje_utilidad');
      });
      toast.success(`Ítem ${sug.codigo} seleccionado (${sug.marca || 'Catálogo'})`);
    }
    setSuggestions([]);
    setSuggestionsType(null);
    setSuggestionsKey(null);
    setFocusedSuggestionIndex(-1);
  };

  const handlePNKeyDown = (e, type, key, currentCode, currentProveedor) => {
    if (suggestions.length > 0 && suggestionsType === type && suggestionsKey === key) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedSuggestionIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter") {
        if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < suggestions.length) {
          e.preventDefault();
          if (suggestions[focusedSuggestionIndex]?.isWarning) {
            return;
          }
          handleSelectSuggestion(suggestions[focusedSuggestionIndex], type, key);
        } else {
          e.preventDefault();
          if (type === "add") {
            handleQuickAddLookup(currentCode, currentProveedor, key);
          } else {
            handleEditRowLookup(currentCode, currentProveedor);
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSuggestions([]);
        setSuggestionsType(null);
        setSuggestionsKey(null);
        setFocusedSuggestionIndex(-1);
      }
    } else {
      if (e.key === "Enter") {
        e.preventDefault();
        if (type === "add") {
          handleQuickAddLookup(currentCode, currentProveedor, key);
        } else {
          handleEditRowLookup(currentCode, currentProveedor);
        }
      }
    }
  };

  const handlePNBlur = () => {
    setTimeout(() => {
      setSuggestions([]);
      setSuggestionsType(null);
      setSuggestionsKey(null);
      setFocusedSuggestionIndex(-1);
    }, 200);
  };

  const recalculateRowValues = (row, fieldModificado, groupCostoEnvio = 0, totalCostoItems = 0) => {
    const next = { ...row };
    const cantidad = Number(next.cantidad || 0);
    const costoPrecio = Number(next.costo_precio || 0);
    
    let costoEnvio = Number(next.costo_envio || 0);
    let porcentajeEnvio = Number(next.porcentaje_envio || 0);

    if (isVenta) {
      if (tipoVenta === "T") {
        porcentajeEnvio = totalCostoItems > 0 ? (costoPrecio / totalCostoItems) * 100 : 0;
        costoEnvio = (porcentajeEnvio / 100) * groupCostoEnvio;
      } else if (tipoVenta === "P") {
        costoEnvio = cantidad > 0 ? groupCostoEnvio / cantidad : 0;
        porcentajeEnvio = costoPrecio > 0 ? ((costoEnvio / costoPrecio) * 100) : 0;
      }
    } else {
      costoEnvio = 0;
      porcentajeEnvio = 0;
    }

    const costoConEnvio = costoPrecio + costoEnvio;
    next.costo_envio = Number(costoEnvio.toFixed(2));
    next.porcentaje_envio = Number(porcentajeEnvio.toFixed(2));
    next.costo_con_envio = Number(costoConEnvio.toFixed(2));

    let porcentajeUtil = Number(next.porcentaje_utilidad || 0);
    let utilidadUnit = (costoConEnvio * porcentajeUtil) / 100;

    if (fieldModificado === 'utilidad') {
      utilidadUnit = Number(next.utilidad || 0);
      porcentajeUtil = costoConEnvio > 0 ? (utilidadUnit / costoConEnvio) * 100 : 0;
      next.porcentaje_utilidad = Number(porcentajeUtil.toFixed(2));
    } else if (fieldModificado === 'porcentaje_utilidad') {
      next.utilidad = Number(utilidadUnit.toFixed(2));
    } else {
      next.utilidad = Number(utilidadUnit.toFixed(2));
    }

    const ventaPrecio = costoConEnvio + next.utilidad;
    next.precio_venta = Number(ventaPrecio.toFixed(2));
    next.venta_total = Number((ventaPrecio * cantidad).toFixed(2));
    next.costo_total = Number((costoPrecio * cantidad).toFixed(2));

    return next;
  };

  const handleRowChange = (field, value, mode, groupCode = null) => {
    let cleanedValue = value;
    if (['cantidad', 'costo_precio', 'porcentaje_utilidad', 'porcentaje_envio', 'tiempo_entrega', 'costo_envio'].includes(field)) {
      if (typeof value === 'string' && value.length > 1 && value.startsWith('0') && value[1] !== '.') {
        cleanedValue = value.replace(/^0+/, '');
        if (cleanedValue === '') cleanedValue = '0';
      }
    }

    if (mode === 'edit') {
      let foundGroup = null;
      let groupCostoEnvio = 0;
      let totalCostoItems = 0;

      Object.values(gruposSuministros || {}).forEach(gp => {
        const found = gp.items?.some(it => it.id_suministro === editingItemId);
        if (found) {
          foundGroup = gp;
        }
      });

      if (foundGroup) {
        groupCostoEnvio = Number(data?.tipo_venta === "P" ? (foundGroup.costo_envio_unidad || foundGroup.costo_envio || 0) : (foundGroup.costo_envio_total || foundGroup.costo_envio || 0));
        const items = foundGroup.items || [];
        totalCostoItems = items.reduce((acc, it) => {
          const isCurrent = it.id_suministro === editingItemId;
          const cost = isCurrent && field === 'costo_precio' ? Number(cleanedValue) : Number(it.costo_precio || 0);
          const qty = isCurrent && field === 'cantidad' ? Number(cleanedValue) : Number(it.cantidad || 0);
          return acc + (cost * qty);
        }, 0);
      }

      setEditForm(prev => {
        const updated = { ...prev, [field]: cleanedValue };
        return recalculateRowValues(updated, field, groupCostoEnvio, totalCostoItems);
      });
    } else {
      let foundGroup = gruposSuministros[groupCode];
      let groupCostoEnvio = 0;
      let totalCostoItems = 0;

      if (foundGroup) {
        groupCostoEnvio = Number(data?.tipo_venta === "P" ? (foundGroup.costo_envio_unidad || foundGroup.costo_envio || 0) : (foundGroup.costo_envio_total || foundGroup.costo_envio || 0));
        const items = foundGroup.items || [];
        const existingCosto = items.reduce((acc, it) => acc + (Number(it.costo_precio || 0) * Number(it.cantidad || 0)), 0);

        setQuickAddForm(prev => {
          const current = prev[groupCode] || {
            cantidad: 1,
            costo_precio: 0,
            porcentaje_utilidad: 20,
            proveedor: "",
            id_marca: null,
            codigo_item: "",
            descripcion: "",
            observacion: "",
            utilidad: 0,
            precio_venta: 0,
            venta_total: 0
          };
          const updated = { ...current, [field]: cleanedValue };
          const addCost = Number(updated.costo_precio || 0);
          const addQty = Number(updated.cantidad || 0);
          totalCostoItems = existingCosto + (addCost * addQty);

          const recalculated = recalculateRowValues(updated, field, groupCostoEnvio, totalCostoItems);
          return {
            ...prev,
            [groupCode]: recalculated
          };
        });
      } else {
        setQuickAddForm(prev => {
          const current = prev[groupCode] || {
            cantidad: 1,
            costo_precio: 0,
            porcentaje_utilidad: 20,
            proveedor: "",
            id_marca: null,
            codigo_item: "",
            descripcion: "",
            observacion: "",
            utilidad: 0,
            precio_venta: 0,
            venta_total: 0
          };
          const updated = { ...current, [field]: cleanedValue };
          const recalculated = recalculateRowValues(updated, field, 0, 0);
          return {
            ...prev,
            [groupCode]: recalculated
          };
        });
      }
    }
  };

  const handleQuickAddLookup = async (codigo, proveedorCode, groupCode) => {
    const key = String(codigo).trim().toUpperCase();
    if (!key) {
      toast.info("Ingrese un P/N para buscar en el catálogo");
      return;
    }

    let targetProveedor = proveedorCode;

    if (!targetProveedor) {
      toast.warn("Debe seleccionar una marca primero");
      return;
    }

    const brandId = parseInt(targetProveedor, 10);
    const tcamb = data?.tipo_cambio || 1;

    try {
      const res = await api.get("/core/productos/", {
        params: {
          search: key,
          id_marca: brandId
        }
      });

      const rows = res.data && res.data.ok && Array.isArray(res.data.data) ? res.data.data : [];
      const encontrado = rows.find(i => String(i.codigo).toUpperCase() === key || String(i.ocodigo).toUpperCase() === key || String(i.codigo2).toUpperCase() === key);

      if (!encontrado) {
        setQuickAddForm(prev => {
          const current = prev[groupCode] || {};
          return {
            ...prev,
            [groupCode]: {
              ...current,
              proveedor: targetProveedor,
              id_marca: brandId,
              codigo_item: key
            }
          };
        });
        toast.info("Código no encontrado en el catálogo. Ingrese descripción y costo manualmente.");
        return;
      }

      const normalizado = normalizarProductoDB(encontrado, data?.tipo_moneda, tcamb, Number(quickAddForm[groupCode]?.cantidad || 1));

      setQuickAddForm(prev => {
        const updated = {
          ...prev[groupCode],
          proveedor: targetProveedor,
          id_marca: brandId,
          codigo_item: normalizado.codigo,
          descripcion: normalizado.descripcion,
          tipo_unidad: normalizado.unidad,
          costo_precio: normalizado.costoPrecio,
          porcentaje_utilidad: prev[groupCode]?.porcentaje_utilidad || 20
        };
        const recalculated = recalculateRowValues(updated, 'porcentaje_utilidad');
        return {
          ...prev,
          [groupCode]: recalculated
        };
      });
      toast.success("Datos de catálogo cargados");
    } catch (err) {
      console.error("Error looking up item:", err);
      toast.error("Error buscando en catálogo");
    }
  };

  const handleEditRowLookup = async (codigo, proveedorCode) => {
    const key = String(codigo).trim().toUpperCase();
    if (!key) {
      toast.info("Ingrese un P/N para buscar en el catálogo");
      return;
    }

    let targetProveedor = proveedorCode;

    if (!targetProveedor) {
      toast.warn("Debe seleccionar una marca primero");
      return;
    }

    const brandId = parseInt(targetProveedor, 10);
    const tcamb = data?.tipo_cambio || 1;

    try {
      const res = await api.get("/core/productos/", {
        params: {
          search: key,
          id_marca: brandId
        }
      });

      const rows = res.data && res.data.ok && Array.isArray(res.data.data) ? res.data.data : [];
      const encontrado = rows.find(i => String(i.codigo).toUpperCase() === key || String(i.ocodigo).toUpperCase() === key || String(i.codigo2).toUpperCase() === key);

      if (!encontrado) {
        setEditForm(prev => ({
          ...prev,
          proveedor: targetProveedor,
          id_marca: brandId,
          codigo_item: key
        }));
        toast.info("Código no encontrado en el catálogo. Ingrese descripción y costo manualmente.");
        return;
      }

      const normalizado = normalizarProductoDB(encontrado, data?.tipo_moneda, tcamb, Number(editForm.cantidad || 1));

      setEditForm(prev => {
        const updated = {
          ...prev,
          proveedor: targetProveedor,
          id_marca: brandId,
          codigo_item: normalizado.codigo,
          descripcion: normalizado.descripcion,
          tipo_unidad: normalizado.unidad,
          costo_precio: normalizado.costoPrecio,
          porcentaje_utilidad: prev.porcentaje_utilidad || 20
        };
        return recalculateRowValues(updated, 'porcentaje_utilidad');
      });
      toast.success("Datos de catálogo cargados");
    } catch (err) {
      console.error("Error looking up item:", err);
      toast.error("Error buscando en catálogo");
    }
  };

  const handleAddRowKeyDown = (e, groupCode) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleQuickAddSubmit(groupCode);
    }
  };

  const handleQuickAddSubmit = async (groupCode) => {
    const form = quickAddForm[groupCode];
    if (!form || !form.descripcion?.trim() || !form.cantidad) {
      toast.warning("La descripción y la cantidad son obligatorias");
      return;
    }

    const success = await handleAgregarItem({
      ...form,
      cog_override: groupCode
    });

    if (success) {
      setQuickAddForm(prev => ({
        ...prev,
        [groupCode]: {
          proveedor: "",
          id_marca: null,
          codigo_item: "",
          descripcion: "",
          observacion: "",
          cantidad: 1,
          costo_precio: 0,
          porcentaje_utilidad: 20,
          utilidad: 0,
          precio_venta: 0,
          venta_total: 0,
          costo_envio: 0,
          porcentaje_envio: 0,
          costo_con_envio: 0,
          tiempo_entrega: "",
          id_unidad_tiempo_entrega: 1,
          tipo_unidad: "UNI"
        }
      }));
    }
  };

  // State from Drawer logic
  const {
    gruposSuministros,
    setGruposSuministros,
    fetchSuministros,
    proveedores,
    setProveedores,
    handleCalcularTotalGrupo,
    handleAgregarGrupoSuministro: hookAgregarGrupoSuministro,
    handleAgregarItem: hookAgregarItem,
    saveEditItem: hookSaveEditItem,
    handleDuplicarGrupo,
    handleEliminarGrupo,
    handleEliminarItem,
    handleExportarGrupoXLS,
    handleExportarGeneralXLS,
    handleImportarDesdeXLS,
    handleGuardarOrden,
    sensors,
    handleDragEnd,
    handleReporteSuministros,
    handleReporteServicios,
    isSuministrosDirty,
    saveSuministros,
  } = useCotizacionSuministros(numReg);

  const sortedGrupos = useMemo(() => {
    return Object.values(gruposSuministros || {}).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [gruposSuministros]);

  const {
    gruposServicios,
    setGruposServicios,
    fetchServicios,
    handleAgregarGrupoServicio,
    handleAgregarItemServicio,
    handleEliminarGrupoServicio,
    handleEliminarItemServicio,
    handleDuplicarServicio,
    sensors: sensorsServicios,
    handleDragEnd: handleDragEndServicios,
    isServiciosDirty,
    saveServicios,
  } = useCotizacionServicios(numReg);

  const sortedGruposServicios = useMemo(() => {
    return Object.values(gruposServicios || {}).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [gruposServicios]);
  const [expandedCategories, setExpandedCategories] = useState(['Suministros', 'Servicios', 'Condiciones', 'Cliente']);
  const [generalConditions, setGeneralConditions] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [searchQueryNotas, setSearchQueryNotas] = useState('');

  // Estados para descuento comercial
  const [descuentoAplicar, setDescuentoAplicar] = useState(false);
  const [descuentoAfecto, setDescuentoAfecto] = useState("t");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("");
  const [descuentoImporte, setDescuentoImporte] = useState("");
  const [descuentoTotales, setDescuentoTotales] = useState({ total: 0, suministros: 0, servicios: 0, des_m: 0 });
  const [loadingDescuentoTotales, setLoadingDescuentoTotales] = useState(false);
  const [descuentoError, setDescuentoError] = useState("");
  const [savingDescuento, setSavingDescuento] = useState(false);
  const [originalDescuento, setOriginalDescuento] = useState({
    aplicar: false,
    afecto: "t",
    porcentaje: "",
    importe: ""
  });

  const isDescuentoDirty = descuentoAplicar !== originalDescuento.aplicar ||
    descuentoAfecto !== originalDescuento.afecto ||
    String(descuentoPorcentaje) !== String(originalDescuento.porcentaje) ||
    String(descuentoImporte) !== String(originalDescuento.importe);

  const [gruposExpandidos, setGruposExpandidos] = useState({});

  const toggleGrupo = (grupoId) => {
    setGruposExpandidos(prev => ({ ...prev, [grupoId]: !prev[grupoId] }));
  };

  const [nuevoGrupoTemp, setNuevoGrupoTemp] = useState({ activo: false, tipo: null, nombre: '', cantidad: 1 });

  // Inline Editing State
  const [editingItemId, setEditingItemId] = useState(null);
  const [activeEditField, setActiveEditField] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isEditingGenerals, setIsEditingGenerals] = useState(false);
  const [formGenerals, setFormGenerals] = useState({});

  // Notes & Documents State
  const [documents, setDocuments] = useState([]);
  const [docDescription, setDocDescription] = useState('');
  const [showDocInput, setShowDocInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null); // Para disparar el input file oculto
  const loadedConditionsRef = useRef(""); // Para evitar auto-guardar el valor inicial
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [archivoNombreVisual, setArchivoNombreVisual] = useState("");

  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [isAlert, setIsAlert] = useState(false); // S o N

  // Modals state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyReferencia, setCopyReferencia] = useState('');
  const [copyIdArea, setCopyIdArea] = useState('');
  const [copyIdCliente, setCopyIdCliente] = useState(null);
  const [copyClienteNombre, setCopyClienteNombre] = useState('');
  const [copyClienteQuery, setCopyClienteQuery] = useState('');
  const [copyIdRepresentante, setCopyIdRepresentante] = useState(null);
  const [copyRepresentanteNombre, setCopyRepresentanteNombre] = useState('');
  const [copyEncargadoQuery, setCopyEncargadoQuery] = useState('');
  const [copyIdTipo, setCopyIdTipo] = useState('');
  const [copyTipoVenta, setCopyTipoVenta] = useState('');
  const [openGrupoModal, setOpenGrupoModal] = useState(false);
  const [openItemModal, setOpenItemModal] = useState(false);
  const [grupoActivo, setGrupoActivo] = useState(null);
  const [itemActivo, setItemActivo] = useState(null);
  const [openRegistroItem, setOpenRegistroItem] = useState(false);

  // Group header inline edit states
  const [editingGroupHeader, setEditingGroupHeader] = useState(null); // { codigo_grupo, campo: 'cantidad' | 'costo_envio' }
  const [editingHeaderValue, setEditingHeaderValue] = useState("");



  // Modeless inline states for Services
  const [categoriasPersonal, setCategoriasPersonal] = useState([]);
  const [tiposGasto, setTiposGasto] = useState([]);
  const [editingGrupoServicioId, setEditingGrupoServicioId] = useState(null);
  const [editingGrupoForm, setEditingGrupoForm] = useState({ nombre: '', cantidad: 1 });
  const [addingServicioForm, setAddingServicioForm] = useState({});
  const [editingItemServicioId, setEditingItemServicioId] = useState(null);
  const [editingServicioForm, setEditingServicioForm] = useState({});
  const [activeEditServicioField, setActiveEditServicioField] = useState(null);

  // Collapse/Expand state for Services and Subgroups
  const [serviciosExpandidos, setServiciosExpandidos] = useState({});
  const [subgruposExpandidos, setSubgruposExpandidos] = useState({});
  const [inlineDescError, setInlineDescError] = useState({ subgrupoId: null, message: "" });

  const toggleServicioGrupo = (idServicio) => {
    setServiciosExpandidos(prev => ({ ...prev, [idServicio]: !prev[idServicio] }));
  };

  const toggleSubgrupo = (subgrupoKey) => {
    setSubgruposExpandidos(prev => ({ ...prev, [subgrupoKey]: !prev[subgrupoKey] }));
  };

  const [editingGroupServicioHeader, setEditingGroupServicioHeader] = useState(null); // { id_servicio, campo }
  const [editingServicioHeaderValue, setEditingServicioHeaderValue] = useState("");
  const [editingSubgrupoId, setEditingSubgrupoId] = useState(null);
  const [editingSubgrupoValue, setEditingSubgrupoValue] = useState("");

  const handleSaveServicioHeaderEdit = (grupo) => {
    if (!editingGroupServicioHeader) return;
    const campo = editingGroupServicioHeader.campo;
    let val = editingServicioHeaderValue;

    if (campo === 'nombre') {
      val = val.toUpperCase().trim();
      if (!val) return;
    } else if (campo === 'cantidad') {
      val = parseInt(val) || 1;
    }

    setGruposServicios(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const srv = next[grupo.id_servicio];
      if (srv) {
        if (campo === 'nombre') srv.tituloGeneral = val;
        if (campo === 'cantidad') srv.cantidad = val;
      }
      return next;
    });

    setEditingGroupServicioHeader(null);
  };

  const handleSaveSubgrupoTitle = (grupoId, subgrupoId) => {
    setGruposServicios(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const srv = next[grupoId];
      if (srv) {
        const subg = srv.subgrupos?.find(sg => sg.id_servicio === subgrupoId);
        if (subg) {
          subg.titulo = (editingSubgrupoValue || "").trim().toUpperCase();
        }
      }
      return next;
    });
    setEditingSubgrupoId(null);
  };

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const catRes = await api.get("/cotizaciones/categorias/");
        setCategoriasPersonal(Array.isArray(catRes.data) ? catRes.data : []);
      } catch (err) {
        console.error("Error loading categories:", err);
      }
      try {
        const tgRes = await api.get("/cotizaciones/tgasto_d/");
        setTiposGasto(Array.isArray(tgRes.data) ? tgRes.data : []);
      } catch (err) {
        console.error("Error loading expense types:", err);
      }
    };
    fetchDropdownData();
  }, []);

  const PIPELINE = [
    { id: 11, label: 'Oportunidad', color: 'bg-sky-500' },
    { id: 2, label: 'Pendiente', color: 'bg-amber-500' },
    { id: 1, label: 'Adjudicado', color: 'bg-emerald-600' },
    { id: 3, label: 'Perdida', color: 'bg-rose-600' },
    { id: 4, label: 'Anulado', color: 'bg-slate-500' },
    { id: 5, label: 'Postergada', color: 'bg-purple-500' },
    { id: 7, label: 'En Seguimiento', color: 'bg-indigo-500' }
  ];

  const OPP_STATES = [
    { id: 1, label: 'Pendiente', color: 'bg-amber-500' },
    { id: 2, label: 'No Cotizado', color: 'bg-slate-500' },
    { id: 3, label: 'Rechazado', color: 'bg-rose-600' },
    { id: 4, label: 'Cotizado', color: 'bg-emerald-600' }
  ];

  const updatePreviewCode = async (areaId, tipoId, clienteId) => {
    if (!numReg || isReadOnly) return;
    try {
      const { data: res } = await api.get(`cotizaciones/generar-codigo/${numReg}/`, {
        params: {
          id_area: areaId || "",
          id_tipo: tipoId || "",
          id_cliente: clienteId || ""
        }
      });
      if (res.ok) {
        setData(prev => {
          if (!prev) return prev;
          const newCode = res.codigo || "";
          return { ...prev, codigo: newCode, numero: newCode };
        });
      }
    } catch (err) {
      console.error("Error previsualizando código:", err);
    }
  };

  // Previsualización automática del código cuando cambian id_area, id_tipo o id_cliente
  useEffect(() => {
    if (data && (data.id_area !== originalData?.id_area || data.id_tipo !== originalData?.id_tipo || data.id_cliente !== originalData?.id_cliente)) {
      updatePreviewCode(data.id_area, data.id_tipo, data.id_cliente);
    } else if (data && originalData && data.id_area === originalData.id_area && data.id_tipo === originalData.id_tipo && data.id_cliente === originalData.id_cliente) {
      setData(prev => ({
        ...prev,
        codigo: originalData.codigo || "",
        numero: originalData.numero || originalData.codigo || ""
      }));
    }
  }, [data?.id_area, data?.id_tipo, data?.id_cliente]);

  // ==============================
  // CONTEXT MENU AND DETAIL MODALS
  // ==============================
  const [contextMenuPos, setContextMenuPos] = useState(null);
  const [contextMenuType, setContextMenuType] = useState(null); // 'cliente' | 'representante'
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const [modalTargetId, setModalTargetId] = useState(null);
  const [modalTargetName, setModalTargetName] = useState("");
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const handleVerDetalles = async (type, id, name) => {
    if (!id) {
      toast.warn(`Seleccione un ${type === 'cliente' ? 'cliente' : 'encargado'} primero.`);
      return;
    }
    setModalTargetId(id);
    setModalTargetName(name);
    setContextMenuType(type);

    setModalLoading(true);
    setModalData(null);
    setAnalysisData(null);
    try {
      const endpoint = type === 'cliente'
        ? `core/clientes/?id_cliente=${id}`
        : `core/representantes/?id_representante=${id}`;

      const params = type === 'cliente'
        ? { cliente: id, anno: '%' }
        : { id_representante: id, anno: '%' };

      const [resDetails, resAnalysis] = await Promise.all([
        api.get(endpoint),
        api.get('cotizaciones/lista_cotizaciones/', { params })
      ]);
      setModalData(resDetails.data);

      const cotizaciones = resAnalysis.data?.tabla || (Array.isArray(resAnalysis.data) ? resAnalysis.data : (resAnalysis.data.results || []));
      const totalCount = cotizaciones.length;
      let totalAmount = 0;
      let wonCount = 0;
      let wonAmount = 0;
      let activeCount = 0;
      let lostCount = 0;

      cotizaciones.forEach(c => {
        const value = parseFloat(c.total_cotizacion || c.total || 0);
        totalAmount += value;
        const isWon = c.id_estado === 1 || c.id_estado === '1' || c.id_estado?.id_estado === 1 || c.id_estado?.id_estado === '1' || c.estado_nombre?.toLowerCase() === 'adjudicado' || c.estado_nombre?.toLowerCase() === 'adjudicada';
        const isLost = c.id_estado === 3 || c.id_estado === '3' || c.id_estado?.id_estado === 3 || c.id_estado?.id_estado === '3' || c.estado_nombre?.toLowerCase() === 'perdida';

        if (isWon) {
          wonCount++;
          wonAmount += value;
        } else if (isLost) {
          lostCount++;
        } else {
          activeCount++;
        }
      });

      const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;
      const successRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

      setAnalysisData({
        cotizaciones,
        stats: {
          totalCount,
          totalAmount,
          wonCount,
          wonAmount,
          lostCount,
          activeCount,
          averageAmount,
          successRate
        }
      });
    } catch (err) {
      console.error("Error al obtener detalles/análisis:", err);
      toast.error("No se pudieron cargar los datos.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleVerAnalisis = async (type, id, name) => {
    if (!id) {
      toast.warn(`Seleccione un ${type === 'cliente' ? 'cliente' : 'encargado'} primero.`);
      return;
    }
    setModalTargetId(id);
    setModalTargetName(name);
    setContextMenuType(type);
    setAnalysisLoading(true);
    setAnalysisData(null);
    try {
      const params = type === 'cliente'
        ? { cliente: id, anno: '%' }
        : { id_representante: id, anno: '%' };
      const { data: resData } = await api.get('cotizaciones/lista_cotizaciones/', { params });

      const cotizaciones = resData?.tabla || (Array.isArray(resData) ? resData : (resData.results || []));
      const totalCount = cotizaciones.length;
      let totalAmount = 0;
      let wonCount = 0;
      let wonAmount = 0;
      let activeCount = 0;
      let lostCount = 0;

      cotizaciones.forEach(c => {
        const value = parseFloat(c.total_cotizacion || c.total || 0);
        totalAmount += value;
        const isWon = c.id_estado === 1 || c.id_estado === '1' || c.id_estado?.id_estado === 1 || c.id_estado?.id_estado === '1' || c.estado_nombre?.toLowerCase() === 'adjudicado' || c.estado_nombre?.toLowerCase() === 'adjudicada';
        const isLost = c.id_estado === 3 || c.id_estado === '3' || c.id_estado?.id_estado === 3 || c.id_estado?.id_estado === '3' || c.estado_nombre?.toLowerCase() === 'perdida';

        if (isWon) {
          wonCount++;
          wonAmount += value;
        } else if (isLost) {
          lostCount++;
        } else {
          activeCount++;
        }
      });

      const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;
      const successRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

      setAnalysisData({
        cotizaciones,
        stats: {
          totalCount,
          totalAmount,
          wonCount,
          wonAmount,
          lostCount,
          activeCount,
          averageAmount,
          successRate
        }
      });
    } catch (err) {
      console.error("Error al obtener análisis:", err);
      toast.error("No se pudo cargar el análisis.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // ==============================
  // CONTROL DE EDICIÓN POR ENVÍO
  // ==============================
  // Track if changes have been made in header fields
  const isHeaderDirty = useMemo(() => {
    if (!data || !originalData) return false;
    const keysToCompare = [
      "referencia",
      "forma_pago",
      "lugar",
      "tipo_moneda",
      "tipo_cambio",
      "igv",
      "entrega_suministros",
      "id_unidad_tiempo_entrega_suministros",
      "entrega_servicios",
      "id_unidad_tiempo_entrega_servicios",
      "validez_oferta",
      "id_unidad_tiempo_validez",
      "id_area",
      "id_tipo",
      "tipo_venta",
      "probabilidad",
      "id_cliente",
      "id_representante",
      "representante_nombre",
      "representante_cargo",
      "representante_telefono",
      "representante_movil",
      "representante_correo",
      "id_estado",
      "estado_oportunidad",
      "recepcion_solicitud",
      "fecha_limite",
      "visita_tecnica",
      "emision_cotizacion",
      "comentario"
    ];
    return keysToCompare.some(key => data[key] !== originalData[key]);
  }, [data, originalData]);

  const isCondicionesDirty = generalConditions !== loadedConditionsRef.current;

  const isDirty = isHeaderDirty || isSuministrosDirty || isServiciosDirty || isCondicionesDirty || isDescuentoDirty;

  // Auto-save Suministros
  useEffect(() => {
    if (!isSuministrosDirty || isReadOnly) return;
    const timer = setTimeout(async () => {
      try {
        await saveSuministros();
        fetchHistory();
      } catch (err) {
        console.error("Error al autoguardar suministros:", err);
        toast.error("Error al autoguardar suministros");
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [isSuministrosDirty, saveSuministros, isReadOnly]);

  // Auto-save Servicios
  useEffect(() => {
    if (!isServiciosDirty || isReadOnly) return;
    const timer = setTimeout(async () => {
      try {
        await saveServicios();
        fetchHistory();
      } catch (err) {
        console.error("Error al autoguardar servicios:", err);
        toast.error("Error al autoguardar servicios");
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [isServiciosDirty, saveServicios, isReadOnly]);

  // Auto-save Condiciones Generales
  useEffect(() => {
    if (!isCondicionesDirty || isReadOnly) return;
    const timer = setTimeout(async () => {
      try {
        await api.post(`cotizaciones/condiciones-generales/${numReg}/`, { condiciones: generalConditions });
        loadedConditionsRef.current = generalConditions;
        fetchHistory();
      } catch (err) {
        console.error("Error al autoguardar condiciones:", err);
        toast.error("Error al autoguardar condiciones generales");
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [isCondicionesDirty, generalConditions, numReg, isReadOnly]);

  const [savingHeader, setSavingHeader] = useState(false);

  const handleGuardarCabecera = async () => {
    if (isReadOnly) return;
    setSavingHeader(true);
    try {
      const promises = [];

      if (isHeaderDirty) {
        const endpoint = `cotizaciones/cotizacion_detalle/${numReg}/`;
        const payload = {
          referencia: data.referencia,
          forma_pago: data.forma_pago,
          lugar: data.lugar,
          tipo_moneda: data.tipo_moneda,
          tipo_cambio: data.tipo_cambio,
          igv: data.igv,
          entrega_suministros: data.entrega_suministros,
          id_unidad_tiempo_entrega_suministros: data.id_unidad_tiempo_entrega_suministros,
          entrega_servicios: data.entrega_servicios,
          id_unidad_tiempo_entrega_servicios: data.id_unidad_tiempo_entrega_servicios,
          validez_oferta: data.validez_oferta,
          id_unidad_tiempo_validez: data.id_unidad_tiempo_validez,
          id_area: data.id_area,
          id_tipo: data.id_tipo,
          tipo_venta: data.tipo_venta,
          probabilidad: data.probabilidad,
          id_estado: data.id_estado,
          id_cliente: data.id_cliente,
          id_representante: data.id_representante,
          representante_nombre: data.representante_nombre,
          representante_cargo: data.representante_cargo,
          representante_telefono: data.representante_telefono,
          representante_movil: data.representante_movil,
          representante_correo: data.representante_correo,
          estado_oportunidad: data.estado_oportunidad,
          recepcion_solicitud: data.recepcion_solicitud,
          fecha_limite: data.fecha_limite,
          visita_tecnica: data.visita_tecnica,
          emision_cotizacion: data.emision_cotizacion,
          comentario: data.comentario,
        };
        const headerPromise = api.put(endpoint, payload).then(res => {
          setData(res.data);
          setOriginalData(res.data);
        });
        promises.push(headerPromise);
      }

      if (isCondicionesDirty) {
        const conditionsPromise = api.post(`cotizaciones/condiciones-generales/${numReg}/`, { condiciones: generalConditions }).then(() => {
          loadedConditionsRef.current = generalConditions;
        });
        promises.push(conditionsPromise);
      }

      if (isSuministrosDirty) {
        promises.push(saveSuministros());
      }

      if (isServiciosDirty) {
        promises.push(saveServicios());
      }

      if (isDescuentoDirty) {
        if (descuentoError) {
          throw new Error(`Error en Descuento Comercial: ${descuentoError}`);
        }
        const discountPayload = {
          aplicar: descuentoAplicar,
          afecto: descuentoAfecto,
          porcentaje: descuentoPorcentaje ? Number(descuentoPorcentaje) : null,
          importe: descuentoImporte ? Number(descuentoImporte) : null
        };
        const discountPromise = api.post(`/cotizaciones/${numReg}/descuento/`, discountPayload).then(() => {
          setOriginalDescuento({
            aplicar: descuentoAplicar,
            afecto: descuentoAfecto,
            porcentaje: descuentoPorcentaje,
            importe: descuentoImporte
          });
        });
        promises.push(discountPromise);
      }

      await Promise.all(promises);

      // Cargar la información fresca (incluidos totales de la cotización y descuento recalculados)
      await loadAllData();

      toast.success("Cambios guardados correctamente");
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      queryClient.invalidateQueries({ queryKey: ["aperturas"] });
      queryClient.invalidateQueries({ queryKey: ["cotizaciones-aprobacion"] });
      queryClient.invalidateQueries({ queryKey: ["aprobacion-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["revision-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["seguimiento-cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["cotizacion", numReg] });
      queryClient.invalidateQueries({ queryKey: ["cotizacion-detalle", numReg] });
    } catch (err) {
      console.error("Error al guardar cambios:", err);
      const errMsg = err.response?.data?.error || err.message || "Error al guardar cambios de la cotización";
      toast.error(errMsg);
    } finally {
      setSavingHeader(false);
    }
  };

  // Handler único para edición de campos de cabecera
  const handleFieldChange = (field, value) => {
    if (!canEdit) {
      toast.warn("Edición bloqueada: cotización congelada");
      return;
    }

    setData(prev => {
      const newState = { ...prev, [field]: value };

      // 1. Si el tipo de cotización deja de ser Venta (V), 
      // reseteamos los campos logísticos (tipo_venta y costo_envio)
      if (field === "id_tipo" && value !== "V") {
        newState.tipo_venta = "";
        newState.costo_envio = "";
      }

      // 2. Lógica de limpieza al cambiar entre Total y Parcial
      if (field === "tipo_venta" && value === "P") {
        newState.costo_envio = 0;
      }

      return newState;
    });
  };

  const fetchDescuento = async () => {
    if (!numReg) return;
    try {
      const res = await api.get(`/cotizaciones/${numReg}/descuento/`);
      const aplicar = res.data.aplicar ?? false;
      const afecto = res.data.afecto ?? "t";
      const porcentaje = res.data.porcentaje !== null && res.data.porcentaje !== undefined ? String(res.data.porcentaje) : "";
      const importe = res.data.importe !== null && res.data.importe !== undefined ? String(res.data.importe) : "";

      setDescuentoAplicar(aplicar);
      setDescuentoAfecto(afecto);
      setDescuentoPorcentaje(porcentaje);
      setDescuentoImporte(importe);
      setOriginalDescuento({ aplicar, afecto, porcentaje, importe });
      setDescuentoError("");
    } catch {
      console.warn("⚠️ No hay descuento guardado aún");
    }

    setLoadingDescuentoTotales(true);
    try {
      const resTot = await api.get(`/cotizaciones/${numReg}/totales-descuento/`);
      setDescuentoTotales(resTot.data);
    } catch (err) {
      console.error("Error al obtener totales de descuento:", err);
    } finally {
      setLoadingDescuentoTotales(false);
    }
  };

  const getBaseAfecta = () => {
    if (descuentoAfecto === "t") return descuentoTotales.total;
    if (descuentoAfecto === "su") return descuentoTotales.suministros;
    if (descuentoAfecto === "ser") return descuentoTotales.servicios;
    return 0;
  };

  const handleDescuentoImporteChange = (value) => {
    const base = getBaseAfecta();
    setDescuentoImporte(value);
    if (!base || !value) {
      setDescuentoPorcentaje("");
      setDescuentoError("");
      return;
    }
    const valNum = Number(value);
    if (valNum > base) setDescuentoError("El importe no puede superar el total base");
    else setDescuentoError("");
    setDescuentoPorcentaje(((valNum / base) * 100).toFixed(2));
  };

  const handleDescuentoPorcentajeChange = (value) => {
    const base = getBaseAfecta();
    setDescuentoPorcentaje(value);
    if (!base || !value) {
      setDescuentoImporte("");
      setDescuentoError("");
      return;
    }
    const valNum = Number(value);
    if (valNum > 100) setDescuentoError("El porcentaje no puede superar 100%");
    else setDescuentoError("");
    setDescuentoImporte(((base * valNum) / 100).toFixed(2));
  };

  // Recalcular importe o porcentaje cuando cambie descuentoAfecto
  useEffect(() => {
    if (!descuentoImporte && !descuentoPorcentaje) return;
    if (descuentoImporte) handleDescuentoImporteChange(descuentoImporte);
    else if (descuentoPorcentaje) handleDescuentoPorcentajeChange(descuentoPorcentaje);
  }, [descuentoAfecto]);

  const handleGuardarDescuento = async () => {
    if (descuentoError) return;
    setSavingDescuento(true);
    try {
      const payload = {
        aplicar: descuentoAplicar,
        afecto: descuentoAfecto,
        porcentaje: descuentoPorcentaje ? Number(descuentoPorcentaje) : null,
        importe: descuentoImporte ? Number(descuentoImporte) : null
      };
      await api.post(`/cotizaciones/${numReg}/descuento/`, payload);
      toast.success("Descuento guardado y aplicado correctamente");
      
      // Invalidate queries to refresh totals in parent views
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      queryClient.invalidateQueries({ queryKey: ["aperturas"] });
      queryClient.invalidateQueries({ queryKey: ["cotizacion", numReg] });
      queryClient.invalidateQueries({ queryKey: ["cotizacion-detalle", numReg] });

      // Reload main page data
      await loadAllData();
    } catch (err) {
      console.error("Error al guardar descuento:", err);
      toast.error("Error al guardar el descuento");
    } finally {
      setSavingDescuento(false);
    }
  };

  const handleResetDescuento = async () => {
    if (isReadOnly) return;
    setSavingDescuento(true);
    try {
      const payload = {
        aplicar: false,
        afecto: "t",
        porcentaje: null,
        importe: null
      };
      await api.post(`/cotizaciones/${numReg}/descuento/`, payload);
      toast.success("Descuento eliminado correctamente");

      // Reset local fields
      setDescuentoAplicar(false);
      setDescuentoAfecto("t");
      setDescuentoPorcentaje("");
      setDescuentoImporte("");
      setDescuentoError("");

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      queryClient.invalidateQueries({ queryKey: ["aperturas"] });
      queryClient.invalidateQueries({ queryKey: ["cotizacion", numReg] });
      queryClient.invalidateQueries({ queryKey: ["cotizacion-detalle", numReg] });

      // Reload main page data
      await loadAllData();
    } catch (err) {
      console.error("Error al resetear descuento:", err);
      toast.error("Error al eliminar el descuento");
    } finally {
      setSavingDescuento(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [numReg]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Fetch unidades de medida
      try {
        const { data: units } = await api.get("core/unidades_medida/");
        setUnidadesMedida(Array.isArray(units) ? units : []);
      } catch (err) {
        console.error("Error loading units of measure:", err);
      }

      // 1. Cabecera
      const endpoint = `cotizaciones/cotizacion_detalle/${numReg}/`;
      const res = await api.get(endpoint);
      setData(res.data);
      setOriginalData(res.data);
      if (esOportunidad) {
        const OPP_STATES_MAP = { 1: 'Pendiente', 2: 'No Cotizado', 3: 'Rechazado', 4: 'Cotizado' };
        setCurrentStatus(OPP_STATES_MAP[res.data.estado_oportunidad] || 'Pendiente');
      } else {
        setCurrentStatus(res.data.estado_nombre || 'Pendiente');
      }

      // Cargar condiciones desde el nuevo endpoint
      try {
        const condRes = await api.get(`cotizaciones/condiciones-generales/${numReg}/`);
        setGeneralConditions(condRes.data.condiciones || '');
        loadedConditionsRef.current = condRes.data.condiciones || '';
      } catch (err) {
        console.error("Error cargando condiciones", err);
        setGeneralConditions(res.data.acu_e || ''); // Fallback al campo antiguo
        loadedConditionsRef.current = res.data.acu_e || '';
      }

      // 2. Suministros (Ya se cargan y mapean en el hook useCotizacionSuministros)

      // 3. Servicios (simulado o endpoint real si existe)
      // const srvRes = await api.get(`cotizaciones/cotizacion/${numReg}/servicios/`);
      // setGruposServicios(mapServiciosBackendToState(srvRes.data));

      // 4. Descuento
      await fetchDescuento();

      // 5. Trazabilidad
      fetchHistory();

    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Error al cargar la información");
    } finally {
      setLoading(false);
    }
  };



  const handleAgregarGrupoSuministro = async (form) => {
    const success = await hookAgregarGrupoSuministro(form, null, data?.tipo_venta);
    if (success) setOpenGrupoModal(false);
  };

  const handleSaveHeaderEdit = (grupo) => {
    if (!editingGroupHeader) return;
    const { campo } = editingGroupHeader;

    let isChanged = false;
    let finalNombre = grupo.nombre_grupo || "";
    let finalCantidad = Number(grupo.cantidad || 1);
    let finalCostoEnvio = Number(data?.tipo_venta === "P" ? (grupo.costo_envio_unidad || grupo.costo_envio || 0) : (grupo.costo_envio_total || grupo.costo_envio || 0));

    if (campo === 'nombre') {
      const cleanVal = editingHeaderValue.trim();
      isChanged = cleanVal.toUpperCase() !== (grupo.nombre_grupo || "").trim().toUpperCase();
      finalNombre = cleanVal;
    } else if (campo === 'cantidad') {
      const rawVal = parseFloat(editingHeaderValue);
      const newVal = isNaN(rawVal) ? 1 : Math.max(1, Math.round(rawVal));
      isChanged = newVal !== Number(grupo.cantidad || 1);
      finalCantidad = newVal;
    } else if (campo === 'costo_envio') {
      const rawVal = parseFloat(editingHeaderValue);
      const newVal = isNaN(rawVal) ? 0 : Number(rawVal.toFixed(2));
      const oldVal = Number(finalCostoEnvio.toFixed(2));
      isChanged = Math.abs(newVal - oldVal) >= 0.01;
      finalCostoEnvio = newVal;
    }

    if (!isChanged) {
      setEditingGroupHeader(null);
      return; // Salir silenciosamente si no hay cambio real
    }

    const payload = {
      _key: String(grupo.codigo_grupo),
      nombre: finalNombre.toUpperCase(),
      cantidad: finalCantidad,
      costoEnvio: finalCostoEnvio,
      items: grupo.items
    };

    hookAgregarGrupoSuministro(payload, null, data?.tipo_venta);
    setEditingGroupHeader(null);
  };

  const handleAgregarItem = async (form) => {
    const activeGrupoKey = form.cog_override || grupoActivo;
    const success = await hookAgregarItem(form, activeGrupoKey, null, data?.tipo_venta);
    if (success) setOpenItemModal(false);
    return success;
  };

  const saveEditItem = async () => {
    let originalItem = null;
    for (const grupo of Object.values(gruposSuministros || {})) {
      const found = grupo.items?.find(it => it.id_suministro === editingItemId);
      if (found) {
        originalItem = found;
        break;
      }
    }

    if (originalItem) {
      const fieldsToCompare = [
        'codigo_item', 'descripcion', 'cantidad', 'costo_precio', 
        'porcentaje_utilidad', 'id_marca', 'proveedor', 'observacion', 
        'tipo_unidad', 'costo_envio', 'tiempo_entrega', 'id_unidad_tiempo_entrega'
      ];
      
      const hasChanged = fieldsToCompare.some(field => {
        const origVal = originalItem[field];
        const editVal = editForm[field];
        const cleanOrig = (origVal === undefined || origVal === null) ? "" : String(origVal).trim();
        const cleanEdit = (editVal === undefined || editVal === null) ? "" : String(editVal).trim();
        return cleanOrig !== cleanEdit;
      });

      if (!hasChanged) {
        setEditingItemId(null);
        setActiveEditField(null);
        return;
      }
    }

    const success = await hookSaveEditItem(editingItemId, editForm, null, data?.tipo_venta);
    if (success) {
      setEditingItemId(null);
      setActiveEditField(null);
    }
  };

  const handleConfirmGrupoServicio = async (form) => {
    await handleAgregarGrupoServicio({
      nombre: form.nombre,
      cantidad: form.cantidad,
      lineasPdf: form.lineasPdf,
      detalle: form.detalle,
      items: form.items,
      categoryTitles: form.categoryTitles,
      _key: form._key
    });
  };

  const handleConfirmManoObraInline = async (form, grupoId, subgrupoId) => {
    if (!form.descripcion_item || !form.descripcion_item.trim()) {
      setInlineDescError({ subgrupoId, message: "Por favor ingrese la descripción." });
      setTimeout(() => {
        const descInput = document.getElementById(`quick-add-srv-desc-${subgrupoId}`);
        if (descInput) descInput.focus();
      }, 50);
      return;
    }

    let finalCosto = parseFloat(form.costo_hombre_dia || 0);
    const min = parseFloat(form.costo_min || 0);
    const max = parseFloat(form.costo_max || 0);

    if (min > 0 && finalCosto < min) {
      finalCosto = min;
      toast.info(`Costo ajustado al mínimo permitido: ${formatMoneySymbol(min)}`);
    } else if (max > 0 && finalCosto > max) {
      finalCosto = max;
      toast.info(`Costo ajustado al máximo permitido: ${formatMoneySymbol(max)}`);
    }

    const hookForm = {
      id_servicio: form.id_servicio || null,
      codigo_item: form.codigo_item,
      descripcion_item: form.descripcion_item,
      cantidad_hombres: Number(form.cantidad_hombres || 0),
      cantidad_dias: Number(form.cantidad_dias || 0),
      horas: Number(form.horas || 8),
      costo_hombre_dia: finalCosto,
      porcentaje: Number(form.porcentaje || 0),
    };
    const success = await handleAgregarItemServicio(hookForm, grupoId, subgrupoId, data?.id_area);
    if (success) {
      setAddingServicioForm(prev => {
        const next = { ...prev };
        delete next[subgrupoId];
        return next;
      });
      setEditingItemServicioId(null);
      setActiveEditServicioField(null);
      setInlineDescError({ subgrupoId: null, message: "" });
    }
  };

  const handleConfirmGastosServicioInline = async (form, grupoId, subgrupoId) => {
    if (!form.descripcion_item || !form.descripcion_item.trim()) {
      setInlineDescError({ subgrupoId, message: "Por favor ingrese la descripción." });
      setTimeout(() => {
        const descInput = document.getElementById(`quick-add-srv-desc-${subgrupoId}`);
        if (descInput) descInput.focus();
      }, 50);
      return;
    }

    const hookForm = {
      id_servicio: form.id_servicio || null,
      codigo_item: form.codigo_item,
      descripcion_item: form.descripcion_item,
      cantidad_hombres: Number(form.cantidad_hombres || 0),
      cantidad_dias: Number(form.cantidad_dias || 0),
      costo_hombre_dia: Number(form.cotizado_hombre_dia || form.costo_hombre_dia || 0),
      horas: 8,
      porcentaje: 0,
    };
    const success = await handleAgregarItemServicio(hookForm, grupoId, subgrupoId, data?.id_area);
    if (success) {
      setAddingServicioForm(prev => {
        const next = { ...prev };
        delete next[subgrupoId];
        return next;
      });
      setEditingItemServicioId(null);
      setActiveEditServicioField(null);
      setInlineDescError({ subgrupoId: null, message: "" });
    }
  };

  const handleConfirmOtrosInline = async (form, grupoId, subgrupoId) => {
    if (!form.descripcion_item || !form.descripcion_item.trim()) {
      setInlineDescError({ subgrupoId, message: "Por favor ingrese la descripción." });
      setTimeout(() => {
        const descInput = document.getElementById(`quick-add-srv-desc-${subgrupoId}`);
        if (descInput) descInput.focus();
      }, 50);
      return;
    }

    const hookForm = {
      id_servicio: form.id_servicio || null,
      codigo_item: form.codigo_item,
      descripcion_item: form.descripcion_item,
      cantidad_hombres: Number(form.cantidad_hombres || 0),
      cantidad_dias: 1,
      costo_hombre_dia: Number(form.costo_hombre_dia || 0),
      horas: 8,
      porcentaje: Number(form.porcentaje || 0),
    };
    const success = await handleAgregarItemServicio(hookForm, grupoId, subgrupoId, data?.id_area);
    if (success) {
      setAddingServicioForm(prev => {
        const next = { ...prev };
        delete next[subgrupoId];
        return next;
      });
      setEditingItemServicioId(null);
      setActiveEditServicioField(null);
      setInlineDescError({ subgrupoId: null, message: "" });
    }
  };

  const handleQuickAddKeyDown = (e, grupoId, subgrupoId, type) => {
    // Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      setAddingServicioForm(prev => {
        const next = { ...prev };
        delete next[subgrupoId];
        return next;
      });
      const rowEl = e.currentTarget;
      const firstInput = rowEl.querySelector('input');
      if (firstInput) firstInput.focus();
      return;
    }

    // Enter
    if (e.key === 'Enter') {
      const dropdownOpen = document.querySelector('.autocomplete-dropdown-portal');
      if (dropdownOpen) {
        return;
      }
      
      e.preventDefault();
      const form = addingServicioForm[subgrupoId] || {
        codigo_item: "",
        descripcion_item: "",
        cantidad_hombres: 1,
        cantidad_dias: 1,
        horas: 8,
        costo_hombre_dia: 0,
        porcentaje: 20
      };
      if (type === '04') {
        handleConfirmManoObraInline(form, grupoId, subgrupoId);
      } else if (type === '05') {
        handleConfirmGastosServicioInline(form, grupoId, subgrupoId);
      } else if (type === '06') {
        handleConfirmOtrosInline(form, grupoId, subgrupoId);
      }
      return;
    }

    // Arrow Navigation
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const isSelectOrNumber = e.target.tagName === 'SELECT' || e.target.type === 'number';
      const isAtStart = isSelectOrNumber || e.target.selectionStart === 0;
      const isAtEnd = isSelectOrNumber || e.target.selectionEnd === e.target.value.length;

      if ((e.key === 'ArrowRight' && isAtEnd) || (e.key === 'ArrowLeft' && isAtStart)) {
        const rowEl = e.currentTarget;
        const inputs = Array.from(rowEl.querySelectorAll('input, select, textarea'))
          .filter(el => el.type !== 'hidden' && !el.disabled);
        const idx = inputs.indexOf(e.target);

        if (e.key === 'ArrowRight' && idx < inputs.length - 1) {
          e.preventDefault();
          const nextInput = inputs[idx + 1];
          nextInput.focus();
          if (typeof nextInput.select === 'function') {
            nextInput.select();
          }
        } else if (e.key === 'ArrowLeft' && idx > 0) {
          e.preventDefault();
          const prevInput = inputs[idx - 1];
          prevInput.focus();
          if (typeof prevInput.select === 'function') {
            prevInput.select();
          }
        }
      }
    }
  };

  const handleStartEditingItemInline = (item, fieldName = null) => {
    setEditingItemServicioId(item.id_servicio);
    setEditingServicioForm({
      id_servicio: item.id_servicio,
      codigo_item: item.codigo_item,
      descripcion_item: item.descripcion_item,
      cantidad_hombres: item.cantidad_hombres,
      cantidad_dias: item.cantidad_dias,
      horas: item.horas,
      costo_hombre_dia: item.costo_hombre_dia,
      cotizado_hombre_dia: item.cotizado_hombre_dia || item.costo_hombre_dia,
      porcentaje: item.porcentaje
    });
    setActiveEditServicioField(fieldName);
  };

  const renderGrupoSuministro = (grupo, gIdx, dndListeners = {}, dndAttributes = {}) => {
    const isExpanded = gruposExpandidos[grupo.codigo_grupo] !== false;
    const tipoVenta = data?.tipo_venta;

    return (
      <motion.div
        layout
        key={grupo.codigo_grupo || `grupo-${gIdx}`}
        className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
      >
        {/* Cabecera del Grupo */}
        <div
          onClick={() => toggleGrupo(grupo.codigo_grupo)}
          className="group cursor-pointer px-4 py-2 flex justify-between items-center hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {/* Manija de Arrastre de Grupo */}
            {!isReadOnly ? (
              <div
                {...dndListeners}
                {...dndAttributes}
                data-drag-handle
                onClick={(e) => e.stopPropagation()}
                className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 rounded transition-colors"
              >
                <Icon name="grip-vertical" className="h-3.5 w-3.5" />
              </div>
            ) : (
              <div className="p-1 text-gray-200">
                <Icon name="grip-vertical" className="h-3.5 w-3.5" />
              </div>
            )}

            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
              <Icon name="chevron-down" className="h-3.5 w-3.5 text-gray-400" />
            </div>

            <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
              {editingGroupHeader?.codigo_grupo === grupo.codigo_grupo && editingGroupHeader?.campo === 'nombre' ? (
                <input
                  type="text"
                  className="bg-transparent border border-gray-300 rounded text-[12px] font-black text-gray-800 p-0.5 focus:ring-0 focus:outline-none uppercase"
                  value={editingHeaderValue}
                  onChange={(e) => setEditingHeaderValue(e.target.value)}
                  onBlur={() => handleSaveHeaderEdit(grupo)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveHeaderEdit(grupo);
                    if (e.key === "Escape") setEditingGroupHeader(null);
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span 
                  className="font-black text-gray-800 text-[12px] uppercase tracking-wide cursor-pointer select-none"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingGroupHeader({ codigo_grupo: grupo.codigo_grupo, campo: 'nombre' });
                    setEditingHeaderValue(grupo.nombre_grupo || "");
                  }}
                  title="Doble clic para editar nombre del grupo"
                >
                  {grupo.nombre_grupo}
                </span>
              )}
            </div>

            <span className="text-[11px] text-gray-600 font-medium bg-gray-100 px-1.5 rounded">
              {grupo.items.length} Items
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[9px] font-black text-indigo-500 uppercase">Cant:</span>
              {editingGroupHeader?.codigo_grupo === grupo.codigo_grupo && editingGroupHeader?.campo === 'cantidad' ? (
                <input
                  type="number"
                  min="1"
                  className="w-12 bg-transparent border border-indigo-300 rounded text-[11.5px] font-black text-indigo-800 text-center p-0 focus:ring-0 focus:outline-none"
                  value={editingHeaderValue}
                  onChange={(e) => setEditingHeaderValue(e.target.value)}
                  onBlur={() => handleSaveHeaderEdit(grupo)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveHeaderEdit(grupo);
                    if (e.key === "Escape") setEditingGroupHeader(null);
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span 
                  className="text-[11.5px] font-black text-indigo-700 cursor-pointer select-none"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingGroupHeader({ codigo_grupo: grupo.codigo_grupo, campo: 'cantidad' });
                    setEditingHeaderValue(String(grupo.cantidad || 1));
                  }}
                  title="Doble clic para editar cantidad"
                >
                  {grupo.cantidad || 0}
                </span>
              )}
            </div>

            {isVenta && (
              <div 
                className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[9px] font-black text-blue-500 uppercase">
                  {tipoVenta === "P" ? "Envío Unit:" : "Envío Tot:"}
                </span>
                {editingGroupHeader?.codigo_grupo === grupo.codigo_grupo && editingGroupHeader?.campo === 'costo_envio' ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-16 bg-transparent border border-blue-300 rounded text-[11.5px] font-black text-blue-800 text-center p-0 focus:ring-0 focus:outline-none"
                    value={editingHeaderValue}
                    onChange={(e) => setEditingHeaderValue(e.target.value)}
                    onBlur={() => handleSaveHeaderEdit(grupo)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveHeaderEdit(grupo);
                      if (e.key === "Escape") setEditingGroupHeader(null);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    className="text-[11.5px] font-black text-blue-700 cursor-pointer select-none"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingGroupHeader({ codigo_grupo: grupo.codigo_grupo, campo: 'costo_envio' });
                      const currentVal = tipoVenta === "P" ? (grupo.costo_envio_unidad || grupo.costo_envio || 0) : (grupo.costo_envio_total || grupo.costo_envio || 0);
                      setEditingHeaderValue(String(currentVal));
                    }}
                    title={tipoVenta === "P" ? "Doble clic para editar envío unitario" : "Doble clic para editar envío total"}
                  >
                    {formatMoneySymbol(
                      tipoVenta === "P" 
                        ? (grupo.costo_envio_unidad || grupo.costo_envio || 0)
                        : (grupo.costo_envio_total || grupo.costo_envio || 0)
                    )}
                  </span>
                )}
              </div>
            )}

            <div className="text-right min-w-[120px]">
              <span className="text-[11.5px] font-black text-gray-900">
                {formatMoney((grupo.items || []).reduce((acc, curr) => acc + (Number(curr.venta_total) || 0), 0) * (grupo.cantidad || 1))}
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Tabla de Items */}
              <div className="w-full overflow-x-auto border-t border-gray-100">
                <table className="min-w-[850px] md:min-w-full table-fixed">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="w-[3%] py-1.5"></th>
                      <th className={isVenta ? "w-[14%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[15%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Código / Marca</th>
                      <th className={isVenta ? "w-[25%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[28%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Descripción</th>
                      <th className={isVenta ? "w-[6%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[7%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Cantidad</th>
                      <th className={isVenta ? "w-[11%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[12%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Costo Unit.</th>
                      {isVenta && (
                        <th className="w-[10%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Envío</th>
                      )}
                      <th className={isVenta ? "w-[9%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[10%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Utilidad</th>
                      <th className={isVenta ? "w-[11%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[12%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Venta Precio</th>
                      <th className={isVenta ? "w-[11%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider" : "w-[13%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider"}>Venta Total</th>
                      <th className="w-[5%] py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <SortableContext
                      items={grupo.items.map(item => `item-${item.id_suministro}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {grupo.items.map(item => (
                        <SortableItemRow
                          key={item.id_suministro}
                          item={item}
                          isReadOnly={isReadOnly}
                          editingItemId={editingItemId}
                          editForm={editForm}
                          setEditForm={setEditForm}
                          startEditItem={startEditItem}
                          handleEliminarItem={handleEliminarItem}
                          saveEditItem={saveEditItem}
                          cancelEditItem={cancelEditItem}
                          formatMoney={formatMoney}
                          formatMoneySymbol={formatMoneySymbol}
                          proveedores={proveedores}
                          setProveedores={setProveedores}
                          tcamb={data?.tipo_cambio || 1}
                          handleRowChange={handleRowChange}
                          handleEditRowLookup={handleEditRowLookup}
                          normalizarProductoDB={normalizarProductoDB}
                          recalculateRowValues={recalculateRowValues}
                          tipoMoneda={data?.tipo_moneda || "S"}
                          isVenta={isVenta}
                          tipoVenta={data?.tipo_venta}
                          catalogoVersion={catalogoVersion}
                          unidadesMedida={unidadesMedida}
                          setUnidadesMedida={setUnidadesMedida}
                          activeEditField={activeEditField}
                          handleTriggerCreateProduct={handleTriggerCreateProduct}
                          renderInlineProductCreateForm={renderInlineProductCreateForm}
                        />
                      ))}
                    </SortableContext>
                    {grupo.items.length === 0 && (
                      <tr>
                        <td colSpan={isVenta ? "10" : "9"} className="px-4 py-6 text-center">
                          <span className="text-[10px] text-gray-400 italic">No hay ítems registrados</span>
                        </td>
                      </tr>
                    )}
                    {/* Fila de agregado rápido */}
                    {!isReadOnly && (() => {
                      const currentForm = quickAddForm[grupo.codigo_grupo] || {
                        cantidad: 1,
                        porcentaje_utilidad: 20,
                        costo_precio: 0,
                        proveedor: "",
                        codigo_item: "",
                        descripcion: "",
                        observacion: "",
                        utilidad: 0,
                        precio_venta: 0,
                        venta_total: 0,
                        costo_envio: 0,
                        porcentaje_envio: 0,
                        costo_con_envio: 0
                      };
                      const brandOptions = (proveedores || []).map(p => ({
                        id: String(p.id_marca).padStart(2, '0'),
                        nombre: p.nombre
                      }));

                      return (
                        <tr 
                          className="bg-indigo-50/20"
                          onKeyDown={e => handleRowKeyDown(e, () => handleQuickAddSubmit(grupo.codigo_grupo))}
                        >
                          <td></td>
                          {/* Código / Marca */}
                          <td className="px-3 py-1.5">
                            <div className="flex flex-col gap-1 items-center justify-center text-center relative">
                              <MarcaAutocomplete
                                idMarca={currentForm.id_marca}
                                proveedores={proveedores}
                                onSelect={(brand) => {
                                  const code = String(brand.id_marca).padStart(2, '0');
                                  handleRowChange("proveedor", code, "add", grupo.codigo_grupo);
                                  handleRowChange("id_marca", brand.id_marca, "add", grupo.codigo_grupo);
                                }}
                                onAddBrand={(newBrand) => {
                                  setProveedores(prev => [...prev, newBrand]);
                                }}
                              />
                              <ProductoAutocomplete
                                id={`quick-add-codigo-${grupo.codigo_grupo}`}
                                value={currentForm.codigo_item || ""}
                                idMarca={currentForm.id_marca}
                                tcamb={data?.tipo_cambio || 1}
                                tipoMoneda={data?.tipo_moneda || "S"}
                                catalogoVersion={catalogoVersion}
                                onTriggerCreate={(code) => handleTriggerCreateProduct(code, grupo.codigo_grupo, currentForm.id_marca)}
                                onSelect={(prod) => {
                                  if (prod.isCustom) {
                                    handleRowChange("codigo_item", prod.codigo, "add", grupo.codigo_grupo);
                                  } else {
                                    const normalizado = normalizarProductoDB(prod, data?.tipo_moneda, data?.tipo_cambio || 1, Number(currentForm.cantidad || 1));
                                    setQuickAddForm(prev => {
                                      const current = prev[grupo.codigo_grupo] || { cantidad: 1 };
                                      const updated = {
                                        ...current,
                                        proveedor: normalizado.proveedor,
                                        id_marca: prod.id_marca,
                                        codigo_item: normalizado.codigo,
                                        descripcion: normalizado.descripcion,
                                        tipo_unidad: normalizado.unidad,
                                        costo_precio: normalizado.costoPrecio,
                                        porcentaje_utilidad: current.porcentaje_utilidad || 20
                                      };
                                      const recalculated = recalculateRowValues(updated, 'porcentaje_utilidad');
                                      return {
                                        ...prev,
                                        [grupo.codigo_grupo]: recalculated
                                      };
                                    });
                                  }
                                }}
                              />
                            </div>
                          </td>
                          {/* Descripción / Observación */}
                          <td className="px-3 py-1.5">
                            <div className="flex flex-col gap-1 items-center justify-center text-center">
                              <input
                                id={`quick-add-descripcion-${grupo.codigo_grupo}`}
                                type="text"
                                className="w-full text-[11px] border border-gray-300 rounded px-1.5 py-0.5 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                                value={currentForm.descripcion || ""}
                                placeholder="Descripción..."
                                onChange={e => handleRowChange("descripcion", e.target.value.toUpperCase(), "add", grupo.codigo_grupo)}
                              />
                              <input
                                type="text"
                                className="w-full text-[9px] border border-gray-200 text-gray-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                                value={currentForm.observacion || ""}
                                placeholder="Observación..."
                                onChange={e => handleRowChange("observacion", e.target.value.toUpperCase(), "add", grupo.codigo_grupo)}
                              />
                            </div>
                          </td>
                          {/* Cantidad */}
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              className="w-full text-[11px] border border-gray-300 text-center rounded px-1 py-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={currentForm.cantidad === undefined || currentForm.cantidad === null ? "" : currentForm.cantidad}
                              onChange={e => handleRowChange("cantidad", e.target.value, "add", grupo.codigo_grupo)}
                              onFocus={(e) => e.target.select()}
                            />
                          </td>
                          {/* Costo Unitario */}
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full text-[11px] border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                              value={currentForm.costo_precio === undefined || currentForm.costo_precio === null ? "" : currentForm.costo_precio}
                              onChange={e => handleRowChange("costo_precio", e.target.value, "add", grupo.codigo_grupo)}
                              onFocus={(e) => e.target.select()}
                            />
                          </td>
                           {/* Envío */}
                          {isVenta && (
                            <td className="px-3 py-1.5 text-center">
                              <div className="flex flex-col items-center justify-center text-center gap-1">
                                <span className="text-[11px] font-bold text-gray-700">
                                  {formatMoneySymbol(Number(currentForm.costo_envio || 0))}
                                </span>
                                {tipoVenta === "T" && (
                                  <span className="text-[9.5px] font-black text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-100">
                                    {Number(currentForm.porcentaje_envio || 0).toFixed(2)}%
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {/* Utilidad */}
                          <td className="px-3 py-1.5">
                            <div className="flex flex-col gap-1 items-center justify-center text-center">

                              {/* Monto de utilidad (Ahora ARRIBA) */}
                              <span className="text-[11px] font-bold text-gray-700">
                                {formatMoneySymbol(Number(currentForm.utilidad || 0))}
                              </span>
                              <div className="relative flex items-center justify-center w-full">
                                <input
                                  type="number"
                                  step="0.1"
                                  className="w-full text-[10px] border border-gray-300 text-center rounded px-1 py-0.5 font-medium text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  value={currentForm.porcentaje_utilidad === undefined || currentForm.porcentaje_utilidad === null ? "" : currentForm.porcentaje_utilidad}
                                  onChange={e => handleRowChange("porcentaje_utilidad", e.target.value, "add", grupo.codigo_grupo)}
                                  onFocus={(e) => e.target.select()}
                                />
                                <span className="absolute right-1 text-[9px] text-gray-400">%</span>
                              </div>
                            </div>
                          </td>
                          {/* Venta Precio */}
                          <td className="px-3 py-1.5 text-center text-[11.5px] font-semibold text-gray-500">
                            {formatMoneySymbol(Number(currentForm.precio_venta || 0))}
                          </td>
                          {/* Venta Total */}
                          <td className="px-3 py-1.5 text-center text-[11.5px] font-black text-indigo-600">
                            {formatMoneySymbol(Number(currentForm.venta_total || 0))}
                          </td>
                          {/* Acciones */}
                          <td className="px-3 py-1.5 text-center">
                            <div className="flex justify-center items-center gap-1">
                              <ActionMenu
                                title="Logística y Detalles del Nuevo Ítem"
                                align="end"
                                closeOnSelect={false}
                                contentClassName="min-w-[300px]"
                                customTrigger={
                                  <button
                                    type="button"
                                    className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded shadow-sm transition-colors flex items-center justify-center"
                                    title="Detalles Adicionales"
                                  >
                                    <Icon name="ellipsis-vertical" className="h-3.5 w-3.5" />
                                  </button>
                                }
                              >
                                <div 
                                  className="p-3 space-y-3 text-xs text-left"
                                  onKeyDown={handleDetailsKeyDown}
                                >
                                  {/* U. Medida */}
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-gray-400 uppercase text-[9px]">U. Medida:</span>
                                    <UnidadMedidaAutocomplete
                                      idMedida={currentForm.id_medida}
                                      unidadesMedida={unidadesMedida}
                                      onSelect={(unit) => {
                                        handleRowChange("id_medida", unit.id_medida, "add", grupo.codigo_grupo);
                                        handleRowChange("tipo_unidad", unit.nombre, "add", grupo.codigo_grupo);
                                      }}
                                      onAddMedida={(newUnit) => {
                                        setUnidadesMedida(prev => [...prev, newUnit]);
                                        handleRowChange("id_medida", newUnit.id_medida, "add", grupo.codigo_grupo);
                                        handleRowChange("tipo_unidad", newUnit.nombre, "add", grupo.codigo_grupo);
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-gray-400 uppercase text-[9px]">Tiempo Entrega:</span>
                                    <div className="flex gap-2">
                                      <input
                                        type="number"
                                        className="w-2/3 border border-gray-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-gray-700"
                                        value={currentForm.tiempo_entrega === undefined || currentForm.tiempo_entrega === null ? "" : currentForm.tiempo_entrega}
                                        onChange={e => handleRowChange("tiempo_entrega", e.target.value, "add", grupo.codigo_grupo)}
                                        placeholder="0"
                                      />
                                      <select
                                        className="w-1/3 border border-gray-200 rounded px-1 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-gray-700 bg-white"
                                        value={currentForm.id_unidad_tiempo_entrega || 1}
                                        onChange={e => handleRowChange("id_unidad_tiempo_entrega", parseInt(e.target.value, 10), "add", grupo.codigo_grupo)}
                                      >
                                        <option value={1}>Días</option>
                                        <option value={2}>Semanas</option>
                                        <option value={3}>Meses</option>
                                      </select>
                                    </div>
                                  </div>
                                  {/* Observación */}
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-gray-400 uppercase text-[9px]">Observación:</span>
                                    <input
                                      type="text"
                                      className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700"
                                      value={currentForm.observacion || ""}
                                      onChange={e => handleRowChange("observacion", e.target.value.toUpperCase(), "add", grupo.codigo_grupo)}
                                      placeholder="Observación..."
                                    />
                                  </div>

                                  {/* RESUMEN DE VENTA */}
                                  {(() => {
                                    const qaCantidad = Number(currentForm.cantidad || 0);
                                    const qaCostoPrecio = Number(currentForm.costo_precio || 0);
                                    const qaCostoEnvio = Number(currentForm.costo_envio || 0);
                                    const qaCostoConEnvio = Number(currentForm.costo_con_envio || 0);
                                    const qaPrecioVenta = Number(currentForm.precio_venta || 0);
                                    const qaVentaTotal = Number(currentForm.venta_total || 0);
                                    const qaUtilidad = Number(currentForm.utilidad || 0);

                                    const costoTotal = qaCostoPrecio * qaCantidad;
                                    const costoConEnvioPorUnidad = qaCostoPrecio + qaCostoEnvio;
                                    const costoConEnvioTotal = qaCostoConEnvio * qaCantidad;
                                    const precioVentaUnit = qaPrecioVenta;
                                    const ventaTotal = qaVentaTotal;
                                    const utilidadTotal = qaUtilidad * qaCantidad;

                                    return (
                                      <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3 space-y-2 shadow-inner mt-2">
                                        <div className="flex items-center gap-2 text-teal-700">
                                          <Icon name="trending-up" className="h-3.5 w-3.5" />
                                          <span className="text-[10px] font-black uppercase tracking-tight">Resumen de Venta</span>
                                        </div>
                                        <div className="space-y-1 text-[11px]">
                                          <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-100/50">
                                            <span>Costo Total:</span>
                                            <span className="font-semibold text-gray-700">{formatMoneySymbol(costoTotal)}</span>
                                          </div>
                                          {isVenta && (
                                            <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-100/50">
                                              <span>Costo con Envío:</span>
                                              <span className="font-semibold text-gray-700">{formatMoneySymbol(costoConEnvioPorUnidad)}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-100/50">
                                            <span>Precio Venta:</span>
                                            <span className="font-semibold text-gray-700">{formatMoneySymbol(precioVentaUnit)}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-teal-800 py-0.5 border-b border-teal-100/50 font-black">
                                            <span>Venta Total:</span>
                                            <span className="text-teal-700 text-[12px]">{formatMoneySymbol(ventaTotal)}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-emerald-800 py-0.5 font-bold">
                                            <span>Utilidad Total:</span>
                                            <span className="text-emerald-600">{formatMoneySymbol(utilidadTotal)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </ActionMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                    {renderInlineProductCreateForm(grupo.codigo_grupo)}
                  </tbody>
                </table>
              </div>

              {/* 🛠️ FOOTER DEL GRUPO: TODAS LAS ACCIONES REUNIDAS AQUÍ */}
              <div className="px-4 py-2 border-t border-gray-50 flex justify-end items-center bg-gray-50/20">

                {/* BOTONERA DE GESTIÓN */}
                <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-md p-0.5 shadow-sm">
                  {!isReadOnly && (
                    <>
                      {/* Botón: DUPLICAR GRUPO */}
                      <button
                        type="button"
                        title="Duplicar Grupo"
                        onClick={(e) => { e.stopPropagation(); handleDuplicarGrupo(grupo.codigo_grupo); }}
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        <Icon name="copy" className="h-3.5 w-3.5" />
                      </button>

                      {/* Botón: IMPORTAR DATOS */}
                      <button
                        type="button"
                        title="Importar Datos (.xlsx)"
                        onClick={(e) => {
                          e.stopPropagation();
                          setXlsImportGrupoActivo(grupo.codigo_grupo);
                          xlsInputRef.current?.click();
                        }}
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        <Icon name="file-up" className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}

                  {/* Botón: EXPORTAR DATOS */}
                  <button
                    type="button"
                    title="Exportar Grupo a Excel"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportarGrupoXLS(grupo.codigo_grupo);
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                  >
                    <Icon name="file-down" className="h-3.5 w-3.5" />
                  </button>

                  {!isReadOnly && (
                    <>
                      <div className="w-[1px] h-3.5 bg-gray-200 mx-0.5" />

                      {/* Botón: CONFIGURACIÓN DEL GRUPO */}
                      <button
                        type="button"
                        title="Configuración del Grupo"
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        <Icon name="settings-2" className="h-3.5 w-3.5" />
                      </button>

                      <div className="w-[1px] h-3.5 bg-gray-200 mx-0.5" />

                      {/* Botón: ELIMINAR GRUPO */}
                      <button
                        type="button"
                        title="Eliminar Grupo Completo"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminarGrupo(grupo.codigo_grupo);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Icon name="trash-2" className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // --- INLINE EDITING LOGIC ---
  const startEditItem = (item, fieldName = null) => {
    setEditingItemId(item.id_suministro || item.id);
    setEditForm({ ...item });
    setActiveEditField(fieldName);
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setActiveEditField(null);
  };

  const formatMoney = (val) => `$ ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatMoneySymbol = (val) => {
    const symbol = (data?.tipo_moneda === 'S' || data?.tipo_moneda === 'PEN') ? 'S/' : '$';
    return `${symbol} ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderAddingItemRow = (grupo, sg) => {
    if (isReadOnly) return null;

    const subgrupoId = sg.id_servicio;

    const getDefaultForm = (tipo) => {
      if (tipo?.endsWith("04")) {
        return {
          codigo_item: "",
          descripcion_item: "",
          cantidad_hombres: 1,
          cantidad_dias: 1,
          horas: 8,
          costo_hombre_dia: 0,
          porcentaje: 20
        };
      }
      if (tipo?.endsWith("05")) {
        return {
          codigo_item: "",
          descripcion_item: "",
          cantidad_hombres: 1,
          cantidad_dias: 1,
          costo_hombre_dia: 0,
          porcentaje: 20
        };
      }
      if (tipo?.endsWith("06")) {
        return {
          codigo_item: "",
          descripcion_item: "",
          cantidad_hombres: 1,
          costo_hombre_dia: 0,
          porcentaje: 20
        };
      }
      return {
        codigo_item: "",
        descripcion_item: "",
        cantidad_hombres: 1,
        cantidad_dias: 1,
        horas: 8,
        costo_hombre_dia: 0,
        porcentaje: 20
      };
    };

    const form = addingServicioForm[subgrupoId] || getDefaultForm(sg.tipoCodigo);

    const setForm = (updater) => {
      setAddingServicioForm(prev => {
        const current = prev[subgrupoId] || getDefaultForm(sg.tipoCodigo);
        const nextVal = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
        return {
          ...prev,
          [subgrupoId]: nextVal
        };
      });
    };

    const handlePersonalCreatedQuickLocal = (registro) => {
      const cMin = parseFloat(registro.costo_min || 0);
      const cMax = parseFloat(registro.costo_max || 0);
      const cAvg = cMin && cMax ? (cMin + cMax) / 2 : (cMax || cMin || 0);
      setForm({
        codigo_item: `${registro.codigo}-${registro.nombre}`,
        descripcion_item: '',
        costo_hombre_dia: cAvg,
        costo_min: cMin,
        costo_max: cMax
      });
      setTimeout(() => {
        const descInput = document.getElementById(`quick-add-srv-desc-${subgrupoId}`);
        if (descInput) {
          descInput.focus();
          if (descInput.select) descInput.select();
        }
      }, 50);
    };

    const handlePersonalCancelQuickLocal = () => {};

    const handleGastoCreatedQuickLocal = (registro) => {
      setForm({
        codigo_item: registro.codigo,
        descripcion_item: registro.nombre
      });
      setTimeout(() => {
        const descInput = document.getElementById(`quick-add-srv-desc-${subgrupoId}`);
        if (descInput) {
          descInput.focus();
          if (descInput.select) descInput.select();
        }
      }, 50);
    };

    const handleGastoCancelQuickLocal = () => {};

    const gripPlaceholder = (
      <td className="px-2 text-center align-middle">
        <Icon name="grip-vertical" className="h-3.5 w-3.5 text-gray-200 mx-auto" />
      </td>
    );

    if (sg.tipoCodigo === "04") {
      const formHombres = Number(form.cantidad_hombres || 0);
      const formDias = Number(form.cantidad_dias || 0);
      const formCosto = Number(form.costo_hombre_dia || 0);
      const formPorcentaje = Number(form.porcentaje || 0);

      const calculatedCostoTotal = formHombres * formDias * formCosto;
      const calculatedUtilidad = calculatedCostoTotal * (formPorcentaje / 100);
      const calculatedCotizadoTotal = calculatedCostoTotal + calculatedUtilidad;
      const calculatedCotizadoHD = formCosto * (1 + formPorcentaje / 100);

      return (
        <tr 
          className="bg-teal-50/10"
          onKeyDown={e => handleQuickAddKeyDown(e, grupo.id_servicio, sg.id_servicio, '04')}
        >
          {gripPlaceholder}
          {/* CÓDIGO PERSONAL */}
          <td className="px-2 py-1">
            <TipoPersonalAutocomplete
              value={form.codigo_item || ""}
              idArea={data?.id_area}
              catalogoVersion={catalogoVersion}
              onTriggerCreatePersonal={(name) => handleTriggerCreatePersonal(name, sg.id_servicio, handlePersonalCreatedQuickLocal, handlePersonalCancelQuickLocal)}
              onSelect={(personal) => {
                if (!personal) {
                  setForm({
                    codigo_item: '',
                    descripcion_item: '',
                    costo_hombre_dia: 0,
                    costo_min: 0,
                    costo_max: 0
                  });
                  return;
                }
                const cMin = parseFloat(personal.costo_min || 0);
                const cMax = parseFloat(personal.costo_max || 0);
                const cAvg = cMin && cMax ? (cMin + cMax) / 2 : (cMax || cMin || 0);
                setForm({
                  codigo_item: `${personal.codigo}-${personal.nombre}`,
                  descripcion_item: '',
                  costo_hombre_dia: cAvg,
                  costo_min: cMin,
                  costo_max: cMax
                });
                if (!personal.isCustom) {
                  setTimeout(() => {
                    const descInput = document.getElementById(`quick-add-srv-desc-${subgrupoId}`);
                    if (descInput) {
                      descInput.focus();
                      if (descInput.select) descInput.select();
                    }
                  }, 50);
                }
              }}
            />
          </td>
          {/* DESCRIPCIÓN */}
          <td className="px-2 py-1">
            <div className="flex flex-col w-full">
              <input
                id={`quick-add-srv-desc-${subgrupoId}`}
                type="text"
                className={cn(
                  "w-full text-[10.5px] border rounded px-1.5 py-0.5 uppercase font-semibold text-gray-700 bg-white",
                  inlineDescError.subgrupoId === sg.id_servicio ? "border-red-400 ring-1 ring-red-100" : "border-gray-300"
                )}
                placeholder="DESCRIPCIÓN DE LA TAREA..."
                value={form.descripcion_item || ""}
                onChange={(e) => {
                  setForm({ descripcion_item: e.target.value.toUpperCase() });
                  if (inlineDescError.subgrupoId === sg.id_servicio) {
                    setInlineDescError({ subgrupoId: null, message: "" });
                  }
                }}
              />
              {inlineDescError.subgrupoId === sg.id_servicio && (
                <span className="text-[9px] text-red-500 font-bold mt-0.5 pl-1">
                  {inlineDescError.message}
                </span>
              )}
            </div>
          </td>
          {/* CANTIDAD */}
          <td className="px-2 py-1 text-center">
            <input
              type="number"
              className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 font-bold bg-white"
              value={form.cantidad_hombres === undefined || form.cantidad_hombres === null ? "" : form.cantidad_hombres}
              onChange={(e) => setForm({ cantidad_hombres: parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          {/* DÍAS */}
          <td className="px-2 py-1 text-center">
            <input
              type="number"
              className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 font-semibold bg-white"
              value={form.cantidad_dias === undefined || form.cantidad_dias === null ? "" : form.cantidad_dias}
              onChange={(e) => setForm({ cantidad_dias: parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          {/* HORAS */}
          <td className="px-2 py-1 text-center">
            <input
              type="number"
              className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 bg-white"
              value={form.horas === undefined || form.horas === null ? "" : form.horas}
              onChange={(e) => setForm({ horas: parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          {/* COSTO H/D */}
          <td className="px-2 py-1 text-center">
            <input
              type="number"
              className="w-full text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 bg-white"
              value={form.costo_hombre_dia === undefined || form.costo_hombre_dia === null ? "" : form.costo_hombre_dia}
              onChange={(e) => setForm({ costo_hombre_dia: parseFloat(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          {/* UTILIDAD */}
          <td className="px-2 py-1">
            <div className="flex flex-col gap-1 items-center justify-center text-center">
              <span className="text-[10.5px] font-bold text-gray-700">
                {formatMoneySymbol(calculatedUtilidad)}
              </span>
              <div className="relative flex items-center justify-center w-full">
                <input
                  type="number"
                  step="0.1"
                  className="w-full text-[10px] border border-gray-300 text-center rounded px-1 py-0.5 font-medium text-gray-500 bg-white"
                  value={form.porcentaje === undefined || form.porcentaje === null ? "" : form.porcentaje}
                  onChange={(e) => setForm({ porcentaje: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                />
                <span className="absolute right-1 text-[9px] text-gray-400">%</span>
              </div>
            </div>
          </td>
          {/* COTIZADO H/D */}
          <td className="px-3 py-1.5 text-[10.5px] text-gray-600 text-right font-medium">
            {formatMoneySymbol(calculatedCotizadoHD)}
          </td>
          {/* COTIZADO TOTAL */}
          <td className="px-3 py-1.5 text-[10.5px] text-gray-900 text-right font-black">
            {formatMoneySymbol(calculatedCotizadoTotal)}
          </td>
          <td className="px-3 py-1 text-right">
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => handleConfirmManoObraInline(form, grupo.id_servicio, sg.id_servicio)}
                className="p-1 bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 rounded-lg transition-all"
                title="Agregar"
              >
                <Icon name="check" className="h-3.5 w-3.5" />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    if (sg.tipoCodigo === "05") {
      const formHombres = Number(form.cantidad_hombres || 0);
      const formDias = Number(form.cantidad_dias || 0);
      const formPrecio = Number(form.cotizado_hombre_dia || 0);
      const calculatedCotizadoTotal = formHombres * formDias * formPrecio;

      return (
        <tr 
          className="bg-teal-50/10"
          onKeyDown={e => handleQuickAddKeyDown(e, grupo.id_servicio, sg.id_servicio, '05')}
        >
          {gripPlaceholder}
          {/* CÓDIGO GASTO */}
          <td className="px-2 py-1">
            <TipoGastoDetalleAutocomplete
              value={form.codigo_item || ""}
              codePrefix="05"
              onTriggerCreateGasto={(name) => handleTriggerCreateGasto(name, sg.id_servicio, '05', handleGastoCreatedQuickLocal, handleGastoCancelQuickLocal)}
              onSelect={(gasto) => {
                if (!gasto) {
                  setForm({
                    codigo_item: '',
                    descripcion_item: ''
                  });
                  return;
                }
                setForm({
                  codigo_item: gasto.codigo,
                  descripcion_item: gasto.nombre
                });
                setTimeout(() => {
                  const descInput = document.getElementById(`quick-add-srv-desc-${subgrupoId}`);
                  if (descInput) {
                    descInput.focus();
                    if (descInput.select) descInput.select();
                  }
                }, 50);
              }}
            />
          </td>
          {/* DESCRIPCIÓN */}
          <td className="px-2 py-1">
            <div className="flex flex-col w-full">
              <input
                id={`quick-add-srv-desc-${subgrupoId}`}
                type="text"
                className={cn(
                  "w-full text-[10.5px] border rounded px-1.5 py-0.5 uppercase font-semibold text-gray-700 bg-white",
                  inlineDescError.subgrupoId === sg.id_servicio ? "border-red-400 ring-1 ring-red-100" : "border-gray-300"
                )}
                placeholder="CONCEPTO DEL GASTO..."
                value={form.descripcion_item || ""}
                onChange={(e) => {
                  setForm({ descripcion_item: e.target.value.toUpperCase() });
                  if (inlineDescError.subgrupoId === sg.id_servicio) {
                    setInlineDescError({ subgrupoId: null, message: "" });
                  }
                }}
              />
              {inlineDescError.subgrupoId === sg.id_servicio && (
                <span className="text-[9px] text-red-500 font-bold mt-0.5 pl-1">
                  {inlineDescError.message}
                </span>
              )}
            </div>
          </td>
          {/* CANTIDAD */}
          <td className="px-2 py-1 text-center">
            <input
              type="number"
              className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 font-bold bg-white"
              value={form.cantidad_hombres === undefined || form.cantidad_hombres === null ? "" : form.cantidad_hombres}
              onChange={(e) => setForm({ cantidad_hombres: parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          {/* DÍAS */}
          <td className="px-2 py-1 text-center">
            <input
              type="number"
              className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 font-semibold bg-white"
              value={form.cantidad_dias === undefined || form.cantidad_dias === null ? "" : form.cantidad_dias}
              onChange={(e) => setForm({ cantidad_dias: parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          {/* PRECIO */}
          <td className="px-2 py-1 text-right">
            <input
              type="number"
              className="w-full text-[10.5px] border border-gray-300 text-right rounded px-1 py-0.5 bg-white"
              value={form.cotizado_hombre_dia === undefined || form.cotizado_hombre_dia === null ? "" : form.cotizado_hombre_dia}
              onChange={(e) => setForm({ cotizado_hombre_dia: parseFloat(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          {/* TOTAL */}
          <td className="px-3 py-1.5 text-[10.5px] text-gray-900 text-right font-black">
            {formatMoneySymbol(calculatedCotizadoTotal)}
          </td>
          <td className="px-3 py-1 text-right">
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => handleConfirmGastosServicioInline(form, grupo.id_servicio, sg.id_servicio)}
                className="p-1 bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 rounded-lg transition-all"
                title="Agregar"
              >
                <Icon name="check" className="h-3.5 w-3.5" />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    if (sg.tipoCodigo === "06") {
      const formHombres = Number(form.cantidad_hombres || 0);
      const formCosto = Number(form.costo_hombre_dia || 0);
      const formPorcentaje = Number(form.porcentaje || 0);

      const calculatedCostoTotal = formHombres * formCosto;
      const calculatedUtilidad = calculatedCostoTotal * (formPorcentaje / 100);
      const calculatedCotizadoTotal = calculatedCostoTotal + calculatedUtilidad;
      const calculatedCotizadoHD = formCosto * (1 + formPorcentaje / 100);

      return (
        <tr 
          className="bg-teal-50/10"
          onKeyDown={e => handleQuickAddKeyDown(e, grupo.id_servicio, sg.id_servicio, '06')}
        >
          {gripPlaceholder}
          {/* CÓDIGO GASTO */}
          <td className="px-2 py-1">
            <TipoGastoDetalleAutocomplete
              value={form.codigo_item || ""}
              codePrefix="06"
              onTriggerCreateGasto={(name) => handleTriggerCreateGasto(name, sg.id_servicio, '06', handleGastoCreatedQuickLocal, handleGastoCancelQuickLocal)}
              onSelect={(gasto) => {
                if (!gasto) {
                  setForm({
                    codigo_item: '',
                    descripcion_item: ''
                  });
                  return;
                }
                setForm({
                  codigo_item: gasto.codigo,
                  descripcion_item: gasto.nombre
                });
                setTimeout(() => {
                  const descInput = document.getElementById(`quick-add-srv-desc-${subgrupoId}`);
                  if (descInput) {
                    descInput.focus();
                    if (descInput.select) descInput.select();
                  }
                }, 50);
              }}
            />
          </td>
          {/* DESCRIPCIÓN */}
          <td className="px-2 py-1">
            <div className="flex flex-col w-full">
              <input
                id={`quick-add-srv-desc-${subgrupoId}`}
                type="text"
                className={cn(
                  "w-full text-[10.5px] border rounded px-1.5 py-0.5 uppercase font-semibold text-gray-700 bg-white",
                  inlineDescError.subgrupoId === sg.id_servicio ? "border-red-400 ring-1 ring-red-100" : "border-gray-300"
                )}
                placeholder="DESCRIPCIÓN DEL CONCEPTO..."
                value={form.descripcion_item || ""}
                onChange={(e) => {
                  setForm({ descripcion_item: e.target.value.toUpperCase() });
                  if (inlineDescError.subgrupoId === sg.id_servicio) {
                    setInlineDescError({ subgrupoId: null, message: "" });
                  }
                }}
              />
              {inlineDescError.subgrupoId === sg.id_servicio && (
                <span className="text-[9px] text-red-500 font-bold mt-0.5 pl-1">
                  {inlineDescError.message}
                </span>
              )}
            </div>
          </td>
          {/* CANTIDAD */}
          <td className="px-2 py-1 text-center">
            <input
              type="number"
              className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 font-bold bg-white"
              value={form.cantidad_hombres === undefined || form.cantidad_hombres === null ? "" : form.cantidad_hombres}
              onChange={(e) => setForm({ cantidad_hombres: parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          {/* PRECIO */}
          <td className="px-2 py-1 text-center">
            <input
              type="number"
              className="w-full text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 bg-white"
              value={form.costo_hombre_dia === undefined || form.costo_hombre_dia === null ? "" : form.costo_hombre_dia}
              onChange={(e) => setForm({ costo_hombre_dia: parseFloat(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          {/* UTILIDAD */}
          <td className="px-2 py-1">
            <div className="flex flex-col gap-1 items-center justify-center text-center">
              <span className="text-[10.5px] font-bold text-gray-700">
                {formatMoneySymbol(calculatedUtilidad)}
              </span>
              <div className="relative flex items-center justify-center w-full">
                <input
                  type="number"
                  step="0.1"
                  className="w-full text-[10px] border border-gray-300 text-center rounded px-1 py-0.5 font-medium text-gray-500 bg-white"
                  value={form.porcentaje === undefined || form.porcentaje === null ? "" : form.porcentaje}
                  onChange={(e) => setForm({ porcentaje: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                />
                <span className="absolute right-1 text-[9px] text-gray-400">%</span>
              </div>
            </div>
          </td>
          {/* VENTA PRECIO */}
          <td className="px-3 py-1.5 text-[10.5px] text-gray-600 text-right font-medium">
            {formatMoneySymbol(calculatedCotizadoHD)}
          </td>
          {/* VENTA TOTAL */}
          <td className="px-3 py-1.5 text-[10.5px] text-gray-900 text-right font-black">
            {formatMoneySymbol(calculatedCotizadoTotal)}
          </td>
          <td className="px-3 py-1 text-right">
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => handleConfirmOtrosInline(form, grupo.id_servicio, sg.id_servicio)}
                className="p-1 bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 rounded-lg transition-all"
                title="Agregar"
              >
                <Icon name="check" className="h-3.5 w-3.5" />
              </button>
            </div>
          </td>
        </tr>
      );
    }
    return null;
  };

  const renderGrupoServicio = (grupo, gIdx, dndListeners = {}, dndAttributes = {}) => {
    const isExpanded = serviciosExpandidos[grupo.id_servicio] !== false;
    const itemsTotales = (grupo.subgrupos || []).reduce((acc, sg) => acc + (sg.items || []).length, 0);

    const totalCotizadoGrupo = (grupo.subgrupos || []).reduce((acc, sg) => {
      const sgTotal = (sg.items || []).reduce((sum, it) => sum + (it.cotizado_total || 0), 0);
      return acc + sgTotal;
    }, 0) * (grupo.cantidad || 1);

    const getSubgrupoWeight = (sg) => {
      const code = sg.tipoCodigo || "";
      if (code.endsWith("04") || code === "04" || code === "4") return 1;
      if (code.endsWith("05") || code === "05" || code === "5") return 2;
      if (code.endsWith("06") || code === "06" || code === "6") return 3;

      const name = (sg.tipoNombre || sg.titulo || "").toUpperCase();
      if (name.includes("MANO") || name.includes("PERSONAL") || name.includes("OBRA")) return 1;
      if (name.includes("GASTO") || name.includes("SERVICIO")) return 2;
      if (name.includes("OTRO")) return 3;

      return 99;
    };

    const subgruposOrdenados = [...(grupo.subgrupos || [])].sort((a, b) => {
      return getSubgrupoWeight(a) - getSubgrupoWeight(b);
    });

    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div
          onClick={() => toggleServicioGrupo(grupo.id_servicio)}
          className="group cursor-pointer px-5 py-3.5 flex justify-between items-center hover:bg-gray-50/50 transition-colors border-b border-gray-100"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {!isReadOnly ? (
              <div
                {...dndListeners}
                {...dndAttributes}
                data-drag-handle
                onClick={(e) => e.stopPropagation()}
                className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 rounded transition-colors"
              >
                <Icon name="grip-vertical" className="h-3.5 w-3.5" />
              </div>
            ) : (
              <div className="p-1 text-gray-200">
                <Icon name="grip-vertical" className="h-3.5 w-3.5" />
              </div>
            )}

            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
              <Icon name="chevron-down" className="h-3.5 w-3.5 text-gray-400" />
            </div>

            <div className="flex flex-col min-w-0" onClick={(e) => e.stopPropagation()}>
              {editingGroupServicioHeader?.id_servicio === grupo.id_servicio && editingGroupServicioHeader?.campo === 'nombre' ? (
                <input
                  type="text"
                  className="bg-transparent border border-gray-300 rounded text-[12px] font-black text-gray-800 p-0.5 focus:ring-0 focus:outline-none uppercase"
                  value={editingServicioHeaderValue}
                  onChange={(e) => setEditingServicioHeaderValue(e.target.value)}
                  onBlur={() => handleSaveServicioHeaderEdit(grupo)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveServicioHeaderEdit(grupo);
                    if (e.key === "Escape") setEditingGroupServicioHeader(null);
                  }}
                  autoFocus
                />
              ) : (
                <span 
                  className="font-black text-gray-800 text-[12px] uppercase tracking-wide cursor-pointer select-none"
                  onDoubleClick={(e) => {
                    if (isReadOnly) return;
                    e.stopPropagation();
                    setEditingGroupServicioHeader({ id_servicio: grupo.id_servicio, campo: 'nombre' });
                    setEditingServicioHeaderValue(grupo.tituloGeneral || "");
                  }}
                  title="Doble clic para editar nombre del grupo"
                >
                  {grupo.tituloGeneral}
                </span>
              )}
            </div>

            <span className="text-[10px] text-gray-600 font-medium bg-gray-100 px-1.5 rounded shrink-0 select-none">
              {itemsTotales} Ítems
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[9px] font-black text-indigo-500 uppercase">Cant:</span>
              {editingGroupServicioHeader?.id_servicio === grupo.id_servicio && editingGroupServicioHeader?.campo === 'cantidad' ? (
                <input
                  type="number"
                  min="1"
                  className="w-12 bg-transparent border border-indigo-300 rounded text-[11.5px] font-black text-indigo-800 text-center p-0 focus:ring-0 focus:outline-none"
                  value={editingServicioHeaderValue}
                  onChange={(e) => setEditingServicioHeaderValue(e.target.value)}
                  onBlur={() => handleSaveServicioHeaderEdit(grupo)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveServicioHeaderEdit(grupo);
                    if (e.key === "Escape") setEditingGroupServicioHeader(null);
                  }}
                  autoFocus
                />
              ) : (
                <span 
                  className="text-[11.5px] font-black text-indigo-700 cursor-pointer select-none"
                  onDoubleClick={(e) => {
                    if (isReadOnly) return;
                    e.stopPropagation();
                    setEditingGroupServicioHeader({ id_servicio: grupo.id_servicio, campo: 'cantidad' });
                    setEditingServicioHeaderValue(String(grupo.cantidad || 1));
                  }}
                  title="Doble clic para editar cantidad"
                >
                  {grupo.cantidad || 1}
                </span>
              )}
            </div>

            <div className="text-right min-w-[120px] select-none">
              <span className="text-[11.5px] font-black text-gray-900">
                {formatMoneySymbol(totalCotizadoGrupo)}
              </span>
            </div>

            {!isReadOnly && (
              <div className="flex gap-1">
                <button
                  type="button"
                  title="Duplicar Grupo de Servicios"
                  onClick={(e) => { e.stopPropagation(); handleDuplicarServicio(grupo.id_servicio); }}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  <Icon name="copy" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Eliminar Grupo Completo"
                  onClick={(e) => { e.stopPropagation(); handleEliminarGrupoServicio(grupo.id_servicio, grupo.tituloGeneral); }}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Icon name="trash-2" className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-4 space-y-4 bg-gray-50/20">
                {subgruposOrdenados.map((sg) => {
                  const sgKey = `${grupo.id_servicio}-${sg.tipoCodigo}`;
                  const isSgExpanded = subgruposExpandidos[sgKey] !== false;
                  const sgCotizadoTotal = (sg.items || []).reduce((sum, it) => sum + (it.cotizado_total || 0), 0);

                  const sortedItems = sg.items || [];

                  return (
                    <div key={sg.id || sgKey} className="bg-white border border-gray-150 rounded-lg overflow-hidden shadow-xs">
                      <div
                        onClick={() => {
                          if (editingSubgrupoId !== sg.id_servicio) {
                            toggleSubgrupo(sgKey);
                          }
                        }}
                        className="cursor-pointer px-4 py-2 bg-gray-50/80 hover:bg-gray-100/50 flex justify-between items-center transition-colors border-b border-gray-100"
                      >
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <div
                            className={`transition-transform duration-200 ${isSgExpanded ? 'rotate-0' : '-rotate-90'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubgrupo(sgKey);
                            }}
                          >
                            <Icon name="chevron-down" className="h-3 w-3 text-gray-400 cursor-pointer" />
                          </div>
                          {editingSubgrupoId === sg.id_servicio ? (
                            <input
                              type="text"
                              data-field="subgroup-custom-title"
                              className="bg-transparent border border-gray-300 rounded text-[10px] font-black text-gray-700 p-0.5 focus:ring-0 focus:outline-none uppercase"
                              value={editingSubgrupoValue}
                              onChange={(e) => setEditingSubgrupoValue(e.target.value)}
                              onBlur={() => {
                                handleSaveSubgrupoTitle(grupo.id_servicio, sg.id_servicio);
                                setEditingSubgrupoId(null);
                              }}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveSubgrupoTitle(grupo.id_servicio, sg.id_servicio);
                                  setEditingSubgrupoId(null);
                                }
                                if (e.key === "Escape") setEditingSubgrupoId(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            <span
                              className="text-[10px] font-black text-gray-700 tracking-wider uppercase cursor-pointer select-none"
                              onDoubleClick={(e) => {
                                if (isReadOnly) return;
                                e.stopPropagation();
                                setEditingSubgrupoId(sg.id_servicio);
                                const currentVal = sg.titulo && sg.titulo.trim().toUpperCase() !== sg.tipoNombre.trim().toUpperCase()
                                  ? sg.titulo
                                  : "";
                                setEditingSubgrupoValue(currentVal);
                              }}
                              title="Doble clic para editar título"
                            >
                              {sg.titulo && sg.titulo.trim().toUpperCase() !== sg.tipoNombre.trim().toUpperCase()
                                ? `${sg.tipoNombre} - ${sg.titulo}`
                                : sg.tipoNombre}
                            </span>
                          )}
                          <span className="text-[9px] font-bold text-gray-400 bg-white border border-gray-200 px-1.5 rounded-full select-none">
                            {sortedItems.length}
                          </span>
                        </div>

                        <div className="text-right select-none">
                          <span className="text-[10.5px] font-black text-gray-600">
                            {formatMoneySymbol(sgCotizadoTotal)}
                          </span>
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isSgExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div className="w-full overflow-x-auto">
                              <table className="min-w-[850px] md:min-w-full table-fixed border-collapse">
                                {sg.tipoCodigo?.endsWith("04") && (
                                  <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr>
                                      <th className="w-[3%] py-1.5"></th>
                                      <th className="w-[14%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Código Personal</th>
                                      <th className="w-[25%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Descripción</th>
                                      <th className="w-[5%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Cantidad</th>
                                      <th className="w-[5%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Días</th>
                                      <th className="w-[5%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Horas</th>
                                      <th className="w-[8%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Costo H/D</th>
                                      <th className="w-[10%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Utilidad</th>
                                      <th className="w-[8%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Cotizado H/D</th>
                                      <th className="w-[13%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Cotizado Total</th>
                                      <th className="w-[4%] py-1.5"></th>
                                    </tr>
                                  </thead>
                                )}

                                {sg.tipoCodigo?.endsWith("05") && (
                                  <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr>
                                      <th className="w-[3%] py-1.5"></th>
                                      <th className="w-[15%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Código Gasto</th>
                                      <th className="w-[41%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Descripción</th>
                                      <th className="w-[6%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Cantidad</th>
                                      <th className="w-[6%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Días</th>
                                      <th className="w-[9%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Precio</th>
                                      <th className="w-[16%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Total</th>
                                      <th className="w-[4%] py-1.5"></th>
                                    </tr>
                                  </thead>
                                )}

                                {sg.tipoCodigo?.endsWith("06") && (
                                  <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr>
                                      <th className="w-[3%] py-1.5"></th>
                                      <th className="w-[15%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Código Gasto</th>
                                      <th className="w-[32%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Descripción</th>
                                      <th className="w-[6%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Cantidad</th>
                                      <th className="w-[8%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Precio</th>
                                      <th className="w-[10%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Utilidad</th>
                                      <th className="w-[10%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Venta Precio</th>
                                      <th className="w-[12%] px-3 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">Venta Total</th>
                                      <th className="w-[4%] py-1.5"></th>
                                    </tr>
                                  </thead>
                                )}

                                <tbody className="divide-y divide-gray-50">
                                  <SortableContext
                                    items={sortedItems.map(item => `item-${item.id_servicio}`)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {sortedItems.map((item) => (
                                      <SortableItemServicioRow
                                        key={item.id_servicio}
                                        item={item}
                                        sg={sg}
                                        grupo={grupo}
                                        isReadOnly={isReadOnly}
                                        editingItemServicioId={editingItemServicioId}
                                        editingServicioForm={editingServicioForm}
                                        setEditingServicioForm={setEditingServicioForm}
                                        setEditingItemServicioId={setEditingItemServicioId}
                                        categoriasPersonal={categoriasPersonal}
                                        typesGasto={tiposGasto}
                                        handleConfirmManoObraInline={handleConfirmManoObraInline}
                                        handleConfirmGastosServicioInline={handleConfirmGastosServicioInline}
                                        handleConfirmOtrosInline={handleConfirmOtrosInline}
                                        handleStartEditingItemInline={handleStartEditingItemInline}
                                        handleEliminarItemServicio={handleEliminarItemServicio}
                                        formatMoneySymbol={formatMoneySymbol}
                                        activeEditServicioField={activeEditServicioField}
                                        setActiveEditServicioField={setActiveEditServicioField}
                                        handleTriggerCreatePersonal={handleTriggerCreatePersonal}
                                        renderInlinePersonalCreateForm={renderInlinePersonalCreateForm}
                                        handleTriggerCreateGasto={handleTriggerCreateGasto}
                                        renderInlineGastoCreateForm={renderInlineGastoCreateForm}
                                        catalogoVersion={catalogoVersion}
                                      />
                                    ))}
                                  </SortableContext>

                                  {renderAddingItemRow(grupo, sg)}
                                  {renderInlinePersonalCreateForm && renderInlinePersonalCreateForm(sg.id_servicio)}
                                  {renderInlineGastoCreateForm && renderInlineGastoCreateForm(sg.id_servicio)}

                                  {sortedItems.length === 0 && isReadOnly && (
                                    <tr>
                                      <td colSpan={sg.tipoCodigo?.endsWith("04") ? 11 : sg.tipoCodigo?.endsWith("05") ? 8 : 9} className="px-4 py-6 text-center">
                                        <span className="text-[10px] text-gray-400 italic font-medium uppercase tracking-wide">No hay ítems registrados en este subgrupo</span>
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ===========
  // OPCIONES
  // ===========
  const probOptions = [
    { id: "0", nombre: "Baja" },
    { id: "1", nombre: "Media" },
    { id: "2", nombre: "Alta" },
    { id: "3", nombre: "Muy Alta" },
  ];

  const tipoOptions = [
    { id: "P", nombre: "Proyecto" },
    { id: "S", nombre: "Servicio" },
    { id: "V", nombre: "Venta" },
  ];

  const tipoVentaOptions = [
    { id: "P", nombre: "Parcial" },
    { id: "T", nombre: "Total" },
  ];

  const areasOptions = [
    { id: "1", nombre: "Industria" },
    { id: "2", nombre: "Mineria" },
    { id: "4", nombre: "Petroquimica" },
    { id: "8", nombre: "Seguridad de Maquinaria" },
  ];

  const estadosOptions = [
    { id: "1", nombre: "Adjudicado" },
    { id: "2", nombre: "Pendiente" },
    { id: "3", nombre: "Perdida" },
    { id: "4", nombre: "Anulado" },
    { id: "5", nombre: "Postergada" },
    { id: "6", nombre: "En Seguimiento" },
  ];

  const monedasOptions = [
    { id: "S", nombre: "Soles" },
    { id: "D", nombre: "Dólares" },
  ];

  const unidadOptions = [
    { id: "1", nombre: "Dias" },
    { id: "2", nombre: "Semanas" },
    { id: "3", nombre: "Meses" },
  ]

  const igvOptions = [
    { id: "N", nombre: "No Incluye" },
    { id: "S", nombre: "Incluye" },
  ]

  const formasPagoOptions = [
    { id: "100% Contra Entrega", nombre: "100% Contra Entrega" },
    { id: "100% Factura a 30 días", nombre: "100% Factura a 30 días" },
    { id: "100% Factura a 42 días", nombre: "100% Factura a 42 días" },
    { id: "100% Factura a 60 días", nombre: "100% Factura a 60 días" },
    { id: "100% Factura a 180 días, vía factoring", nombre: "100% Factura a 180 días, vía factoring" },
    { id: "50% Adelanto, 50% Contra Entrega", nombre: "50% Adelanto, 50% Contra Entrega" },
    { id: "100% Factura a 180 días", nombre: "100% Factura a 180 días" },
  ]

  const estadoOpOptions = [
    { id: "0", nombre: "Pendiente" },
    { id: "1", nombre: "No Cotizado" },
    { id: "2", nombre: "Rechazado" },
    { id: "3", nombre: "Cotizado" },
  ];

  // ==========
  // ADJUNTOS
  // ==========
  // 1. LISTAR: Ahora lee directamente de la tabla de la base de datos
  const fetchDocuments = async () => {
    try {
      const { data: res } = await api.get(`cotizaciones/adjuntos/${numReg}/`);
      if (res.ok) {
        const mapeados = res.archivos.map((a) => ({
          id: a.id,
          name: a.nombre,
          description: a.description, // <--- AGREGA ESTA LÍNEA
          file_path: a.file_path,
          upload_date: a.fecha,
          uploaded_by: a.usuario,
        }));
        setDocuments(mapeados);
      }
    } catch (err) {
      console.error("Error cargando adjuntos", err);
    }
  };

  useEffect(() => {
    if (numReg) fetchDocuments();
  }, [numReg]);

  // 2. SUBIR: Simplificado, Django se encarga de los nombres y la ruta
  const handleFileAndUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("archivo", file);

      // CAMBIO: Enviamos solo lo que el usuario escribió (puede ser vacío)
      formData.append("descripcion", docDescription.trim());

      const { data: res } = await api.post(`cotizaciones/adjuntos/${numReg}/`, formData);

      if (res.ok) {
        toast.success("Documento vinculado correctamente");
        setDocDescription("");
        fetchDocuments();
        fetchHistory(); // <--- ACTUALIZA TRAZABILIDAD
      }
    } catch (error) {
      console.error("Error subiendo archivo", error);
      toast.error("Error al subir el archivo");
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  // 3. ELIMINAR: Usa el ID de la base de datos y el método DELETE
  const handleDeleteDocument = async (id) => {
    try {
      // Pasamos el ID por la URL como parámetro de consulta (?id=...)
      const { data: res } = await api.delete(`cotizaciones/adjuntos/${numReg}/?id=${id}`);

      if (res.ok) {
        toast.success("Archivo y registro eliminados");
        setDeletingDocId(null);
        fetchDocuments();
        fetchHistory(); // <--- ACTUALIZA TRAZABILIDAD
      }
    } catch (error) {
      console.error("Error al eliminar", error);
      toast.error("No se pudo eliminar el archivo");
    }
  };

  // ==================
  // MENSAJES SEGUIMIENTO
  // ==================
  // 1. Cargar Mensajes
  const fetchMensajes = async () => {
    try {
      const { data: res } = await api.get(`cotizaciones/mensajes/${numReg}/`);
      if (res.ok) {
        const mapeados = res.registros.map(m => {
          let alertDateObj = null;

          // m.alerta_fecha viene en formato ISO o string desde el backend
          if (m.alerta === "1" && m.alerta_fecha) {
            alertDateObj = new Date(m.alerta_fecha);
          }

          return {
            id: m.id_mensaje,
            timestamp: m.fecha_formateada || m.fecha,
            content: m.mensaje,
            user_role: m.usuario_nombre || 'Usuario',
            is_alert: m.alerta === "1",
            alert_date: alertDateObj,
            is_resolved: m.completo === "1"
          };
        });
        setNotes(mapeados);
      }
    } catch (err) {
      console.error("Error cargando mensajes", err);
    }
  };

  // Esta es la función que llama el botón "Marcar Listo"
  const handleResolveReminderInside = async (id) => {
    try {
      const { data: res } = await api.patch(`cotizaciones/mensajes/${numReg}/`, { id, completar: true });
      if (res.ok) {
        toast.success("Tarea completada");
        fetchMensajes();
        fetchHistory(); // <--- ACTUALIZA TRAZABILIDAD
      }
    } catch (err) {
      toast.error("No se pudo actualizar");
    }
  };

  // 2. Agregar Nota Actualizada
  const handleAddNote = React.useCallback(async (textOverride) => {
    let text = (typeof textOverride === 'string' ? textOverride : newNote).trim();
    if (!text) return;

    let finalMsj = text;

    try {
      // PREPARACIÓN DE LA FECHA:
      // Si isAlert es un objeto Date, lo formateamos para el backend.
      // Usamos una función auxiliar para obtener "YYYY-MM-DD HH:mm:ss"
      const fechaFormateada = (isAlert instanceof Date)
        ? isAlert.toLocaleString('sv-SE').replace('T', ' ')
        : null;

      const payload = {
        msj: finalMsj,
        alerta: isAlert ? "1" : "0",
        alerta_fecha: fechaFormateada
      };

      const { data: res } = await api.post(`cotizaciones/mensajes/${numReg}/`, payload);

      if (res.ok) {
        toast.success(isAlert ? "Alerta programada" : "Registro guardado");
        setNewNote('');
        setIsAlert(null);
        fetchMensajes();
        fetchHistory(); // <--- ACTUALIZA TRAZABILIDAD
      }
    } catch (err) {
      console.error("Error en handleAddNote:", err);
      toast.error("Error al guardar");
    }
  }, [newNote, isAlert, numReg, fetchMensajes]);

  const handleSaveQuickNote = (text) => {
    if (!text.trim()) return;
    handleAddNote(text);
  };

  // 3. NUEVO: Función para completar tarea (Check)
  const handleManageAlert = async (note, action, dateOverride = null) => {
    try {
      let payload = { id: note.id };

      if (action === 'complete') {
        payload.completar = true; // El backend usará timezone.now()
      } else if (action === 'reprogram') {
        if (dateOverride) {
          payload.nueva_fecha = dateOverride;
        } else {
          const nuevaFecha = prompt("Ingrese la nueva fecha (YYYY-MM-DD HH:mm)");
          if (!nuevaFecha) return;
          payload.nueva_fecha = nuevaFecha;
        }
      }

      const { data: res } = await api.patch(`cotizaciones/mensajes/${numReg}/`, payload);

      if (res.ok) {
        toast.success(action === 'complete' ? "¡Alerta completada!" : "Alerta reprogramada");
        fetchMensajes();
        fetchHistory(); // <--- ACTUALIZA TRAZABILIDAD
      }
    } catch (err) {
      toast.error("Error al actualizar");
    }
  };

  // 4. ELIMINAR MENSAJE (Sin confirmación de navegador)
  const [deletingId, setDeletingId] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);

  // 5. TRAZABILIDAD (HISTORIAL)
  const [history, setHistory] = useState([]);
  const fetchHistory = async () => {
    try {
      const { data: res } = await api.get(`cotizaciones/seguimientos/${numReg}/`);
      if (res.ok) {
        setHistory(res.seguimientos || []);
      }
    } catch (err) {
      console.error("Error cargando trazabilidad", err);
    }
  };

  const getHistoryType = (detalle) => {
    const text = (detalle || "").toUpperCase();
    if (text.includes("CREACIÓN") || text.includes("APERTURA") || text.includes("REGISTRO BASE")) return "CREACION";
    if (text.includes("ADJUNTÓ ARCHIVO") || text.includes("DOCUMENTO")) return "ADJUNTOS";
    if (text.includes("ESTADO") || text.includes("CAMBIO")) return "ESTADO";
    if (text.includes("REGISTRO:")) return "SEGUIMIENTO";
    if (text.includes("SUMINISTROS:")) return "SUMINISTROS";
    if (text.includes("SERVICIOS:")) return "SERVICIOS";
    if (text.includes("CONDICIONES GENERALES:")) return "CONDICIONES";
    return "SISTEMA";
  };

  const handleDeleteMensaje = async (id) => {
    try {
      const { data: res } = await api.delete(`cotizaciones/mensajes/${numReg}/`, {
        params: { id }
      });

      if (res.ok) {
        toast.success("Registro eliminado");
        setDeletingId(null);
        fetchMensajes();
        fetchHistory(); // <--- ACTUALIZA TRAZABILIDAD
      }
    } catch (err) {
      console.error("Error al eliminar mensaje", err);
      toast.error("No se pudo eliminar el registro");
    }
  };

  // Urgencia de Alertas
  const getAlertUrgency = (alertDate, isDone) => {
    if (!alertDate || isDone) return 'none';

    // Creamos la fecha. 
    const alert = new Date(alertDate);

    // Si sigue dando error, devolvemos 'none' para no romper el diseño
    if (isNaN(alert.getTime())) return 'none';

    const now = new Date();
    const diffInMs = alert - now;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInMs < 0) return 'expired';      // Rojo: Ya venció
    if (diffInDays <= 2) return 'urgent';    // Naranja: 2 días o menos
    return 'normal';                         // Ámbar: Más de 2 días
  };

  useEffect(() => {
    if (numReg) {
      fetchMensajes();
      fetchHistory();
    }
  }, [numReg]);

  // ===========
  // NOTAS
  // ===========
  const [notasComunes, setNotasComunes] = useState([]);
  const [loadingNotas, setLoadingNotas] = useState(true);

  // Función para traer las notas de la DB
  const fetchNotas = async () => {
    try {
      setLoadingNotas(true);
      const response = await api.get("core/notas/");

      // El backend retorna { ok: true, data: [...] }
      const dataNotas = response.data.ok ? response.data.data : [];

      setNotasComunes(dataNotas);
    } catch (error) {
      console.error("Error al cargar notas:", error);
    } finally {
      setLoadingNotas(false);
    }
  };

  // Función para crear una nota nueva en la DB
  const handleAddNuevaNota = async (texto) => {
    if (!texto.trim()) return;
    try {
      const nuevaNota = {
        descripcion: texto,
        activo: 1
      };
      const response = await api.post("core/notas/", nuevaNota);

      // Si se crea con éxito, la añadimos al editor y a la lista local
      // El backend retorna { ok: true, data: {...} }
      const notaCreada = response.data.ok ? response.data.data : response.data;

      setGeneralConditions(prev => prev ? `${prev}\n- ${texto}` : `- ${texto}`);
      setNotasComunes(prev => [...prev, notaCreada]);
    } catch (error) {
      alert("Error al guardar la nota en la base de datos");
    }
  };

  useEffect(() => {
    fetchNotas();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando Datos...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col items-center max-w-md text-center">
        <div className="bg-red-100 p-3 rounded-full text-red-600 mb-4">
          <Icon name="alert-circle" className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Error de Carga</h3>
        <p className="text-sm text-gray-500 mt-2">No se pudo encontrar la información solicitada o el servidor no respondió correctamente.</p>
        <button
          onClick={() => navigate(esOportunidad ? '/sigecom/comercial/oportunidades' : '/sigecom/comercial/cotizaciones')}
          className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all"
        >
          Volver al Listado
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full max-w-[1920px] mx-auto animate-in fade-in duration-700 font-sans">

      {/* 70% MAIN PANEL - Scrollable Content */}
      <div className="w-full xl:w-8/12 flex flex-col space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible font-sans">
          <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center">
              {/* Botón Atrás */}
              <button
                onClick={() => navigate(esOportunidad ? '/sigecom/comercial/oportunidades' : '/sigecom/comercial/cotizaciones')}
                className="mr-5 p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-gray-100 group"
              >
                <Icon name="arrow-left" className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              </button>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">
                    {data?.codigo || data?.numero || 'S/N'}
                  </h1>

                  {isDirty && (
                    <div className="flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 border border-amber-200 text-amber-700 uppercase tracking-widest shadow-sm animate-pulse">
                      Falta Guardar
                    </div>
                  )}

                  {/* BADGE ESTADO COTIZACION */}
                  <div className="relative group">
                    <button className={`flex items-center px-3 py-1 rounded-full text-[9px] font-black text-white transition-all shadow-sm uppercase tracking-widest ${(esOportunidad ? OPP_STATES : PIPELINE).find(s => s.label === currentStatus)?.color || 'bg-indigo-600'} hover:brightness-105 border border-white/20`}>
                      <Icon name="refresh-cw" className="h-2.5 w-2.5 mr-1.5" />
                      {currentStatus}
                    </button>
                    <select
                      value={currentStatus}
                      onChange={(e) => {
                        const selectedLabel = e.target.value;
                        if (esOportunidad) {
                          const matchedState = OPP_STATES.find(s => s.label === selectedLabel);
                          if (matchedState) {
                            setCurrentStatus(selectedLabel);
                            setData(prev => ({
                              ...prev,
                              estado_oportunidad: matchedState.id,
                            }));
                          }
                        } else {
                          const matchedState = PIPELINE.find(s => s.label === selectedLabel);
                          if (matchedState) {
                            setCurrentStatus(selectedLabel);
                            setData(prev => ({
                              ...prev,
                              id_estado: matchedState.id,
                              estado_nombre: selectedLabel
                            }));
                          }
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      disabled={isReadOnly}
                    >
                      {esOportunidad ? (
                        OPP_STATES.map(s => (
                          <option key={s.id} value={s.label}>
                            {s.label.toUpperCase()}
                          </option>
                        ))
                      ) : (
                        (() => {
                          let currentId = data?.id_estado ? Number(data.id_estado) : null;
                          if (!currentId && currentStatus) {
                            const matched = PIPELINE.find(s => s.label.toLowerCase() === currentStatus.toLowerCase());
                            if (matched) currentId = matched.id;
                          }
                          if (!currentId) currentId = 2; // Default fallback to Pendiente

                          const allowedStates = currentId === 11 
                            ? PIPELINE.filter(s => s.id === 11 || s.id === 2)
                            : PIPELINE.filter(s => s.id !== 11);

                          return allowedStates.map(s => (
                            <option key={s.id} value={s.label}>
                              {s.label.toUpperCase()}
                            </option>
                          ));
                        })()
                      )}
                    </select>
                  </div>

                  {/* BADGE ESTADO DE ENVÍO */}
                  {!esOportunidad && (
                    <div className="relative flex items-center">
                      {data?.estado_envio === 2 ? (
                        // Estado ENVIADO: Badge estático premium y deshabilitado
                        <div className="flex items-center px-3 py-1 rounded-full text-[9px] font-black bg-emerald-100 border border-emerald-200 text-emerald-700 uppercase tracking-widest shadow-sm">
                          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                          Enviado
                        </div>
                      ) : (
                        // Estado PENDIENTE: Botón interactivo con Toast de Confirmación Premium
                        <div className="relative flex items-center group/confirm">
                          <button
                            onClick={() => {
                              toast.info(({ closeToast }) => (
                                <div className="flex flex-col min-w-[340px] overflow-hidden rounded-lg">
                                  <div className="flex items-center gap-3 px-4 py-2 bg-rose-50/50 border-b border-rose-100">
                                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-sm border border-rose-100">
                                      <Icon name="send" className="h-3.5 w-3.5 text-rose-600" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">
                                      Marcar como Enviado
                                    </span>
                                  </div>
                                  <div className="px-4 py-3">
                                    <p className="text-[11px] text-gray-600 leading-tight">
                                      ¿Confirmar marcar esta cotización como <span className="font-bold text-gray-900 underline decoration-rose-200 underline-offset-2">ENVIADA AL CLIENTE</span>? Esta acción no se puede deshacer.
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-end gap-3 px-4 pb-3">
                                    <button onClick={closeToast} className="whitespace-nowrap text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">Cancelar</button>
                                    <button
                                      onClick={() => { enviarCotizacionAprobacion.mutate(data.id_registro); closeToast(); }}
                                      className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-[9px] font-black rounded-xl uppercase shadow-md shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 whitespace-nowrap"
                                    >
                                      <span>Confirmar Envío</span>
                                      <Icon name="arrow-right" className="h-3 w-3 opacity-70" />
                                    </button>
                                  </div>
                                </div>
                              ), { position: "top-right", autoClose: false, closeOnClick: false, draggable: false, icon: false, className: "p-0 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden !w-max !max-w-[400px]" });
                            }}
                            className="flex items-center px-3 py-1 rounded-full text-[9px] font-black bg-rose-50 border border-rose-200 text-rose-600 uppercase tracking-widest hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all duration-200 shadow-sm cursor-pointer"
                            disabled={enviarCotizacionAprobacion.isPending}
                          >
                            {enviarCotizacionAprobacion.isPending ? (
                              <div className="h-2.5 w-2.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mr-1.5" />
                            ) : (
                              <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500 mr-1.5 group-hover/confirm:bg-white" />
                            )}
                            Pendiente de Envío
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* LÍNEA DE DATOS EDITABLES */}
                <div className="relative flex flex-wrap items-center text-[12px] gap-x-4 gap-y-2">
                  {/* CLIENTE (Editable Autocomplete) */}
                  <ClienteAutocomplete
                    value={data.cliente_nombre}
                    initialId={data.id_cliente}
                    isReadOnly={isReadOnly}
                    onSelect={(cliente) => {
                      setData(prev => ({
                        ...prev,
                        id_cliente: cliente.id_cliente,
                        cliente_nombre: cliente.nombre,
                        id_representante: null,
                        representante_nombre: "",
                        representante_cargo: "",
                        representante_telefono: "",
                        representante_movil: "",
                        representante_correo: "",
                      }));
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuPos({ x: e.clientX, y: e.clientY });
                      setContextMenuType('cliente');
                      setContextMenuOpen(true);
                    }}
                    onOptionsClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setContextMenuPos({ x: rect.left, y: rect.bottom });
                      setContextMenuType('cliente');
                      setContextMenuOpen(true);
                    }}
                  />

                  {/* REPRESENTANTE (Editable Autocomplete) */}
                  <RepresentanteAutocomplete
                    value={data.representante_nombre}
                    clienteId={data.id_cliente}
                    initialId={data.id_representante}
                    isReadOnly={isReadOnly}
                    onSelect={(enc) => {
                      setData(prev => ({
                        ...prev,
                        id_representante: enc.id_representante,
                        representante_nombre: enc.nombre_representante,
                        representante_cargo: enc.cargo || "",
                        representante_telefono: enc.telefono || "",
                        representante_movil: enc.movil || "",
                        representante_correo: enc.email || "",
                      }));
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuPos({ x: e.clientX, y: e.clientY });
                      setContextMenuType('representante');
                      setContextMenuOpen(true);
                    }}
                    onOptionsClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setContextMenuPos({ x: rect.left, y: rect.bottom });
                      setContextMenuType('representante');
                      setContextMenuOpen(true);
                    }}
                  />

                  {/* ÁREA COMERCIAL (Select Directo con opciones reales) */}
                  <div className="group relative flex items-center cursor-pointer px-2 py-1 rounded-lg hover:bg-gray-50 transition-all">
                    <Icon name="layers" className="h-3.5 w-3.5 mr-1.5 text-teal-400" />
                    <span className="font-bold text-gray-800 uppercase tracking-tight">
                      {areasOptions.find(o => o.id === String(data.id_area))?.nombre || data.area_nombre || 'Seleccionar Área'}
                    </span>
                    {!isReadOnly && <Icon name="chevron-down" className="h-3 w-3 ml-1 text-gray-400" />}

                    <select
                      value={data.id_area || ""}
                      onChange={(e) => handleFieldChange("id_area", e.target.value ? Number(e.target.value) : "")}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      disabled={isReadOnly}
                    >
                      <option value="">Seleccionar Área</option>
                      {areasOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.nombre.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* TIPO Y TIPO VENTA*/}
                  <div className="group relative flex items-center cursor-pointer px-2 py-1 rounded-lg hover:bg-gray-50 transition-all whitespace-nowrap">
                    <Icon name="tag" className="h-3.5 w-3.5 mr-1.5 text-blue-500" />

                    <div className="flex items-center flex-nowrap">
                      {/* Selector Principal (Tipo) */}
                      <div className="relative flex items-center shrink-0">
                        <span className="font-bold text-gray-800 uppercase tracking-tight">
                          {tipoOptions.find(o => o.id === data.id_tipo)?.nombre || 'Tipo'}
                        </span>

                        <select
                          value={data.id_tipo || ""}
                          onChange={(e) => handleFieldChange("id_tipo", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          disabled={isReadOnly}
                        >
                          {tipoOptions.map(o => <option key={o.id} value={o.id}>{o.nombre.toUpperCase()}</option>)}
                        </select>
                      </div>

                      {/* Divisor interno y Sub-tipo solo si es Venta */}
                      {data.id_tipo === "V" && (
                        <div className="flex items-center animate-in fade-in slide-in-from-left-1">
                          <span className="text-gray-300 font-light mx-1.5">|</span>
                          <div className="relative flex items-center">
                            <span className="font-bold text-blue-600 uppercase tracking-tight">
                              {tipoVentaOptions.find(o => o.id === data.tipo_venta)?.nombre || 'tipo venta'}
                            </span>
                            <select
                              value={data.tipo_venta || ""}
                              onChange={(e) => handleFieldChange("tipo_venta", e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              disabled={isReadOnly}
                            >
                              {tipoVentaOptions.map(o => <option key={o.id} value={o.id}>{o.nombre.toUpperCase()}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isReadOnly && <Icon name="chevron-down" className="h-3 w-3 ml-1 text-gray-400 group-hover:text-gray-600 transition-colors" />}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isDirty && !isReadOnly && (
                <button
                  onClick={handleGuardarCabecera}
                  disabled={savingHeader}
                  className="flex items-center px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-black text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-sm transition-all h-[42px] uppercase group"
                >
                  {savingHeader ? (
                    <div className="h-3.5 w-3.5 mr-2 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon name="save" className="h-3.5 w-3.5 mr-2 text-emerald-600 group-hover:scale-110 transition-transform" />
                  )}
                  {savingHeader ? "Guardando..." : "Guardar Cambios"}
                </button>
              )}
              {/* MENÚ DESPLEGABLE DE REPORTES */}
              {!esOportunidad && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setReporteMenuOpen(!reporteMenuOpen)}
                    className="flex items-center px-4 py-2 bg-sky-50/70 border border-sky-200 rounded-xl text-[10px] font-black text-sky-700 hover:bg-sky-100/70 hover:border-sky-300 hover:shadow-sm transition-all h-[42px] uppercase group"
                  >
                    <Icon name="file-text" className="h-3.5 w-3.5 mr-2 text-sky-600 group-hover:scale-110 transition-transform" />
                    <span>Reporte</span>
                    <Icon name="chevron-down" className={`ml-1.5 h-3 w-3 transition-transform duration-200 ${reporteMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Tarjeta Flotante de Opciones */}
                  {reporteMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                        <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Opciones de Cliente</span>
                      </div>

                      {/* Opción 1: Reporte Detallado */}
                      <button
                        onClick={() => {
                          handleReporteDetallado(setReporteDetalladoOpen);
                          setReporteMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <div className="p-1 bg-indigo-50 rounded-lg text-indigo-600">
                          <Icon name="list-ordered" className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-bold leading-none">Reporte Detallado</p>
                          <span className="text-[9px] text-slate-400 font-medium">Desglose completo</span>
                        </div>
                      </button>

                      {/* Opción 2: Reporte Resumen */}
                      <button
                        onClick={() => {
                          handleReporteResumen(setReporteResumenOpen);
                          setReporteMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <div className="p-1 bg-amber-50 rounded-lg text-amber-600">
                          <Icon name="file-spreadsheet" className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-bold leading-none">Reporte Resumen</p>
                          <span className="text-[9px] text-slate-400 font-medium">Totales generales</span>
                        </div>
                      </button>

                      {/* Opción 3: Formato Word/PDF*/}
                      <button
                        onClick={() => {
                          setReportePdfOpen(true);
                          setReporteMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[11px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                      >
                        <div className="p-1 bg-slate-50 rounded-lg text-slate-400">
                          <LucideIcons.FileDown className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-bold leading-none text-slate-600">Reporte PDF / Word</p>
                          <span className="text-[9px] text-slate-400 font-medium">Formatos de descarga</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DATOS OPORTUNIDAD FOR 70% COLUMN */}
        {esOportunidad && data && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 font-sans p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                  <Icon name="calendar" className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    Datos de la Oportunidad
                  </h3>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Fase Inicial del Pipeline</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Información del Proyecto y Oportunidad */}
              <div className="lg:col-span-2 space-y-5">
                {/* Referencia del Proyecto */}
                <div className="group relative bg-gray-50/80 p-4 rounded-xl border border-gray-100 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tighter">
                      Referencia del Proyecto
                    </label>
                    {!isReadOnly && (
                      <Icon name="pencil" className="h-2.5 w-2.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    )}
                  </div>
                  <div className="relative min-h-[1.5rem] flex items-center">
                    <p className="text-[11px] font-black uppercase leading-snug text-gray-900 break-words w-full">
                      {data.referencia || 'SIN REFERENCIA ASIGNADA'}
                    </p>
                    {!isReadOnly && (
                      <textarea
                        rows="2"
                        className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded-lg px-2 py-1 text-[10px] font-black text-gray-900 uppercase outline-none resize-none shadow-sm"
                        defaultValue={data.referencia}
                        onBlur={(e) => handleFieldChange("referencia", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            e.target.blur();
                          }
                        }}
                        disabled={isReadOnly}
                      />
                    )}
                  </div>
                </div>
                {/* Grid de Fechas */}
                <div className="grid grid-cols-2 gap-4">
                  <CompactField label="Recepción Solicitud" className="group relative">
                    <div className="relative cursor-pointer min-h-[15px] flex items-center">
                      <span className="text-[10px] font-black text-gray-900 truncate">
                        {data.recepcion_solicitud ? data.recepcion_solicitud.split(/[T ]/)[0] : '---'}
                      </span>
                      {!isReadOnly && (
                        <>
                          <Icon name="pencil" className="h-2.5 w-2.5 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          <input
                            type="date"
                            className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded px-1 text-[10px] font-black text-gray-900 outline-none"
                            value={data.recepcion_solicitud ? data.recepcion_solicitud.split(/[T ]/)[0] : ""}
                            onChange={(e) => handleFieldChange("recepcion_solicitud", e.target.value)}
                            disabled={isReadOnly}
                          />
                        </>
                      )}
                    </div>
                  </CompactField>

                  <CompactField label="Fecha Límite" className="group relative">
                    <div className="relative cursor-pointer min-h-[15px] flex items-center">
                      <span className="text-[10px] font-black text-rose-600 truncate">
                        {data.fecha_limite ? data.fecha_limite.split(/[T ]/)[0] : '---'}
                      </span>
                      {!isReadOnly && (
                        <>
                          <Icon name="pencil" className="h-2.5 w-2.5 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          <input
                            type="date"
                            className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-red-300 rounded px-1 text-[10px] font-black text-gray-900 outline-none"
                            value={data.fecha_limite ? data.fecha_limite.split(/[T ]/)[0] : ""}
                            onChange={(e) => handleFieldChange("fecha_limite", e.target.value)}
                            disabled={isReadOnly}
                          />
                        </>
                      )}
                    </div>
                  </CompactField>

                  <CompactField label="Visita Técnica" className="group relative">
                    <div className="relative cursor-pointer min-h-[15px] flex items-center">
                      <span className="text-[10px] font-black text-gray-900 truncate">
                        {data.visita_tecnica ? data.visita_tecnica.split(/[T ]/)[0] : '---'}
                      </span>
                      {!isReadOnly && (
                        <>
                          <Icon name="pencil" className="h-2.5 w-2.5 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          <input
                            type="date"
                            className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded px-1 text-[10px] font-black text-gray-900 outline-none"
                            value={data.visita_tecnica ? data.visita_tecnica.split(/[T ]/)[0] : ""}
                            onChange={(e) => handleFieldChange("visita_tecnica", e.target.value)}
                            disabled={isReadOnly}
                          />
                        </>
                      )}
                    </div>
                  </CompactField>

                  <CompactField label="Emisión Cotización" className="group relative">
                    <div className="relative cursor-pointer min-h-[15px] flex items-center">
                      <span className="text-[10px] font-black text-gray-900 truncate">
                        {data.emision_cotizacion ? data.emision_cotizacion.split(/[T ]/)[0] : '---'}
                      </span>
                      {!isReadOnly && (
                        <>
                          <Icon name="pencil" className="h-2.5 w-2.5 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          <input
                            type="date"
                            className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded px-1 text-[10px] font-black text-gray-900 outline-none"
                            value={data.emision_cotizacion ? data.emision_cotizacion.split(/[T ]/)[0] : ""}
                            onChange={(e) => handleFieldChange("emision_cotizacion", e.target.value)}
                            disabled={isReadOnly}
                          />
                        </>
                      )}
                    </div>
                  </CompactField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CompactField label="Forma Pago" className="group relative">
                    <div className="relative cursor-pointer min-h-[15px] flex items-center">
                      <span className="text-[10px] font-black text-gray-900 truncate">
                        {data.forma_pago || '---'}
                      </span>
                      {!isReadOnly && (
                        <>
                          <Icon name="pencil" className="h-2.5 w-2.5 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          <input
                            type="text"
                            className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded px-1 text-[10px] font-black text-gray-900 uppercase outline-none"
                            defaultValue={data.forma_pago}
                            onBlur={(e) => handleFieldChange("forma_pago", e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            disabled={isReadOnly}
                          />
                        </>
                      )}
                    </div>
                  </CompactField>

                  <CompactField label="Lugar Entrega" className="group relative">
                    <div className="relative cursor-pointer min-h-[15px] flex items-center">
                      <span className="text-[10px] font-black text-gray-900 truncate">
                        {data.lugar || '---'}
                      </span>
                      {!isReadOnly && (
                        <>
                          <Icon name="pencil" className="h-2.5 w-2.5 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          <input
                            type="text"
                            className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded px-1 text-[10px] font-black text-gray-900 uppercase outline-none"
                            defaultValue={data.lugar}
                            onBlur={(e) => handleFieldChange("lugar", e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            disabled={isReadOnly}
                          />
                        </>
                      )}
                    </div>
                  </CompactField>
                </div>

                {/* Lugar de Entrega & Validez */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <CompactTiempoUnidad
                      label="Validez Oferta"
                      value={data.validez_oferta}
                      onValueChange={(e) => handleFieldChange("validez_oferta", e.target.value)}
                      unitValue={data.id_unidad_tiempo_validez || ""}
                      onUnitChange={(e) => handleFieldChange("id_unidad_tiempo_validez", e.target.value)}
                      options={unidadOptions}
                      isReadOnly={isReadOnly}
                    />
                    {!isReadOnly && sugerenciasTiempos.validez?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sugerenciasTiempos.validez.map((sug, idx) => {
                          const isActive = isSuggestionActive(sug, data.validez_oferta, data.id_unidad_tiempo_validez);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectSugerenciaValidez(sug)}
                              className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded transition-all cursor-pointer shadow-sm ${
                                isActive
                                  ? "bg-indigo-600 text-white border border-indigo-600"
                                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100/50"
                              }`}
                            >
                              {sug.formateado}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Comentarios */}
                <div className="group relative bg-gray-50/80 p-3 rounded-xl border border-gray-100 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tighter">
                      Comentarios / Observaciones de la Oportunidad
                    </label>
                    {!isReadOnly && (
                      <Icon name="pencil" className="h-2.5 w-2.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    )}
                  </div>
                  <div className="relative min-h-[1.5rem] flex items-center">
                    <p className="text-[10.5px] font-black uppercase leading-snug text-gray-900 break-words w-full">
                      {data.comentario || 'SIN OBSERVACIONES REGISTRADAS'}
                    </p>
                    {!isReadOnly && (
                      <textarea
                        rows="2"
                        className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded-lg px-2 py-1 text-[10px] font-black text-gray-900 uppercase outline-none resize-none shadow-sm"
                        defaultValue={data.comentario}
                        onBlur={(e) => handleFieldChange("comentario", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            e.target.blur();
                          }
                        }}
                        disabled={isReadOnly}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Configuración Financiera y de Plazos */}
              <div className="lg:col-span-1 space-y-5 lg:border-l lg:border-gray-100 lg:pl-6">
                <div className="space-y-4">
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 block mb-2">Configuración Comercial</span>

                  <CompactField label="Probabilidad" className="group relative">
                    <div className="relative">
                      <SelectField
                        id="probabilidad"
                        inline
                        value={(data.probabilidad !== undefined && data.probabilidad !== null) ? String(data.probabilidad) : ""}
                        onChange={(e) => handleFieldChange("probabilidad", e.target.value)}
                        options={probOptions}
                        disabled={isReadOnly}
                        className="bg-transparent border-none p-0 h-auto font-black text-[10px] text-gray-900 focus:ring-0 cursor-pointer"
                      />
                      {!isReadOnly && (
                        <div className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Icon name="chevron-down" className="h-2 w-2 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </CompactField>

                  <CompactField label="IGV">
                    <SelectField
                      id="igv"
                      inline
                      value={data.igv || "N"}
                      onChange={(e) => handleFieldChange("igv", e.target.value)}
                      options={igvOptions}
                      disabled={isReadOnly}
                      className="bg-transparent border-none p-0 h-auto font-black text-[10px] text-gray-900 focus:ring-0 cursor-pointer"
                    />
                  </CompactField>

                  <CompactField label="Moneda" className="group relative">
                    <div className="relative">
                      <SelectField
                        id="tipo_moneda"
                        inline
                        value={data.tipo_moneda || ""}
                        onChange={(e) => handleFieldChange("tipo_moneda", e.target.value)}
                        options={monedasOptions}
                        disabled={isReadOnly}
                        className="bg-transparent border-none p-0 h-auto font-black text-[10px] text-gray-900 focus:ring-0 cursor-pointer"
                      />
                      {!isReadOnly && (
                        <div className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Icon name="chevron-down" className="h-2 w-2 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </CompactField>

                  <CompactField label="T. Cambio" className="group relative">
                    <div className="relative cursor-pointer min-h-[15px] flex items-center">
                      <span className="text-[10px] font-black text-gray-900 truncate">
                        {data.tipo_cambio || '0.00'}
                      </span>
                      {!isReadOnly && (
                        <>
                          <Icon name="pencil" className="h-2.5 w-2.5 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          <input
                            type="number"
                            step="0.001"
                            className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded px-1 text-[10px] font-black text-gray-900 outline-none"
                            defaultValue={data.tipo_cambio}
                            onBlur={(e) => handleFieldChange("tipo_cambio", e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            disabled={isReadOnly}
                          />
                        </>
                      )}
                    </div>
                  </CompactField>

                  <div>
                    <CompactTiempoUnidad
                      label="Entrega Suministros"
                      value={data.entrega_suministros}
                      onValueChange={(e) => handleFieldChange("entrega_suministros", e.target.value)}
                      unitValue={data.id_unidad_tiempo_entrega_suministros || ""}
                      onUnitChange={(e) => handleFieldChange("id_unidad_tiempo_entrega_suministros", e.target.value)}
                      options={unidadOptions}
                      isReadOnly={isReadOnly}
                    />
                    {!isReadOnly && sugerenciasTiempos.suministros?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sugerenciasTiempos.suministros.map((sug, idx) => {
                          const isActive = isSuggestionActive(sug, data.entrega_suministros, data.id_unidad_tiempo_entrega_suministros);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectSugerenciaSuministro(sug)}
                              className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded transition-all cursor-pointer shadow-sm ${
                                isActive
                                  ? "bg-indigo-600 text-white border border-indigo-600"
                                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100/50"
                              }`}
                            >
                              {sug.formateado}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <CompactTiempoUnidad
                      label="Entrega Servicios"
                      value={data.entrega_servicios}
                      onValueChange={(e) => handleFieldChange("entrega_servicios", e.target.value)}
                      unitValue={data.id_unidad_tiempo_entrega_servicios || ""}
                      onUnitChange={(e) => handleFieldChange("id_unidad_tiempo_entrega_servicios", e.target.value)}
                      options={unidadOptions}
                      isReadOnly={isReadOnly}
                    />
                    {!isReadOnly && sugerenciasTiempos.servicios?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sugerenciasTiempos.servicios.map((sug, idx) => {
                          const isActive = isSuggestionActive(sug, data.entrega_servicios, data.id_unidad_tiempo_entrega_servicios);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectSugerenciaServicio(sug)}
                              className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded transition-all cursor-pointer shadow-sm ${
                                isActive
                                  ? "bg-indigo-600 text-white border border-indigo-600"
                                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100/50"
                              }`}
                            >
                              {sug.formateado}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Responsables */}
            <div className="pt-5 border-t border-gray-100 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Icon name="users" className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest block">Responsables</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block -mt-0.5">Asignación del Proyecto</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Comercial */}
                <div className={cn(
                  "group flex flex-col border rounded-xl p-3 shadow-sm transition-all duration-300",
                  data.comercial_nombre
                    ? "bg-white border-indigo-100 hover:border-indigo-300 hover:shadow-md"
                    : "bg-gray-50/50 border-gray-200 opacity-80"
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        data.comercial_nombre ? "bg-indigo-500 animate-pulse" : "bg-gray-400"
                      )}></div>
                      <span className={cn(
                        "text-[9.5px] font-black uppercase tracking-widest",
                        data.comercial_nombre ? "text-indigo-500" : "text-gray-500"
                      )}>Comercial</span>
                    </div>
                    <Icon
                      name={data.comercial_nombre ? "user-check" : "user-plus"}
                      className={cn("h-3 w-3 transition-colors", data.comercial_nombre ? "text-indigo-300 group-hover:text-indigo-500" : "text-gray-400")}
                    />
                  </div>

                  <div className="flex flex-col space-y-0.5">
                    <span className="text-[10px] font-black text-slate-800 uppercase leading-none truncate">
                      {data.comercial_nombre || 'PENDIENTE ASIGNAR'}
                    </span>
                    {data.comercial_nombre && (
                      <div className="flex flex-col gap-0.5 mt-1">
                        {data.comercial_telefono && (
                          <div className="flex items-center gap-1.5">
                            <Icon name="phone" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 tracking-tight">{data.comercial_telefono}</span>
                          </div>
                        )}
                        {data.comercial_movil_corporativo && (
                          <div className="flex items-center gap-1.5">
                            <Icon name="smartphone" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 tracking-tight">{data.comercial_movil_corporativo}</span>
                          </div>
                        )}
                        {data.comercial_correo && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Icon name="mail" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 lowercase truncate tracking-tight">{data.comercial_correo}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Técnico */}
                <div className={cn(
                  "group flex flex-col border rounded-xl p-3 shadow-sm transition-all duration-300",
                  data.tecnico_nombre
                    ? "bg-white border-emerald-100 hover:border-emerald-300 hover:shadow-md"
                    : "bg-gray-50/50 border-gray-200 opacity-80"
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        data.tecnico_nombre ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                      )}></div>
                      <span className={cn(
                        "text-[9.5px] font-black uppercase tracking-widest",
                        data.tecnico_nombre ? "text-emerald-500" : "text-gray-500"
                      )}>Técnico</span>
                    </div>
                    <Icon
                      name={data.tecnico_nombre ? "settings" : "user-plus"}
                      className={cn("h-3 w-3 transition-colors", data.tecnico_nombre ? "text-emerald-300 group-hover:text-emerald-500" : "text-gray-400")}
                    />
                  </div>

                  <div className="flex flex-col space-y-0.5">
                    <span className="text-[11px] font-black text-slate-800 uppercase leading-none truncate">
                      {data.tecnico_nombre || 'PENDIENTE ASIGNAR'}
                    </span>
                    {data.tecnico_nombre && (
                      <div className="flex flex-col gap-0.5 mt-1">
                        {data.tecnico_telefono && (
                          <div className="flex items-center gap-1.5">
                            <Icon name="phone" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 tracking-tight">{data.tecnico_telefono}</span>
                          </div>
                        )}
                        {data.tecnico_movil_corporativo && (
                          <div className="flex items-center gap-1.5">
                            <Icon name="smartphone" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 tracking-tight">{data.tecnico_movil_corporativo}</span>
                          </div>
                        )}
                        {data.tecnico_correo && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Icon name="mail" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 lowercase truncate tracking-tight">{data.tecnico_correo}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!esOportunidad && (
          <>
        {/* SUMINISTROS SECTION */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Cabecera Principal - Nivel 1 */}
          <button
            onClick={() => toggleCategory('Suministros')}
            className="flex items-center justify-between w-full px-5 py-4 bg-gray-50 hover:bg-gray-100/80 transition-colors border-b border-gray-200"
          >
            <div className="flex items-center gap-3">
              <Icon name={expandedCategories.includes('Suministros') ? 'chevron-down' : 'chevron-right'} className="h-4 w-4 text-gray-500" />
              <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Suministros</h3>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md uppercase">
                {Object.keys(gruposSuministros || {}).length} Grupos
              </span>
            </div>

            {Object.keys(gruposSuministros || {}).length > 0 && (
              <div className="flex items-center gap-2">
                {/* BOTÓN DE REPORTE (SUMINISTROS) */}
                {/* BOTÓN DE REPORTE HTML DESDE EL BACKEND */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setReporteSuministrosOpen(true); // <--- Cambiado para abrir el modal interno
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-black rounded-lg uppercase shadow-sm hover:bg-teal-100 hover:text-teal-900 transition-all cursor-pointer"
                  title="Ver reporte oficial en HTML"
                >
                  <Icon name="bar-chart-3" className="h-3 w-3" />
                  <span className="hidden sm:inline">Reporte</span>
                </span>

                {/* BOTÓN DE EXPORTAR EXISTENTE */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportarGeneralXLS();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-[10px] font-black rounded-lg uppercase shadow-sm hover:bg-green-100 transition-all cursor-pointer"
                >
                  <Icon name="file-down" className="h-3 w-3" />
                  <span className="hidden sm:inline">Exportar</span>
                </span>
              </div>
            )}
          </button>

          <AnimatePresence>
            {expandedCategories.includes('Suministros') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  {/* EL "ESPEJO" PARA AGREGAR NUEVOS GRUPOS */}
                  <EditableGroupRow
                    tipo="01"
                    onSave={(data) => handleAgregarGrupoSuministro(data)}
                    formatMoneySymbol={formatMoneySymbol}
                    proveedores={proveedores}
                    setProveedores={setProveedores}
                    tipoCambio={data?.tipo_cambio || 1}
                    tipoMoneda={data?.tipo_moneda || "S"}
                    isVenta={isVenta}
                    tipoVenta={data?.tipo_venta}
                    normalizarProductoDB={normalizarProductoDB}
                    catalogoVersion={catalogoVersion}
                    setCatalogoVersion={setCatalogoVersion}
                    unidadesMedida={unidadesMedida}
                    setUnidadesMedida={setUnidadesMedida}
                    handleTriggerCreateProduct={handleTriggerCreateProduct}
                    renderInlineProductCreateForm={renderInlineProductCreateForm}
                  />

                  {/* Renderizado de Grupos de Suministros */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sortedGrupos.map(g => `grupo-${g.codigo_grupo}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {sortedGrupos.map((grupo, idx) => (
                          <SortableWrapper
                            key={`grupo-wrapper-${grupo.codigo_grupo}`}
                            id={`grupo-${grupo.codigo_grupo}`}
                            data={{ type: 'grupo', codigo_grupo: grupo.codigo_grupo }}
                            className="relative"
                          >
                            {({ listeners, attributes, isDragging }) => (
                              <div style={{ opacity: isDragging ? 0.6 : 1 }}>
                                {renderGrupoSuministro(grupo, idx, listeners, attributes)}
                              </div>
                            )}
                          </SortableWrapper>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Empty State mejorado */}
                  {Object.keys(gruposSuministros || {}).length === 0 && (
                    <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                      <Icon name="package-2" className="h-5 w-5 text-gray-300 mx-auto mb-2" />
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                        No hay suministros registrados en esta cotización.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SERVICIOS SECTION */}
        <div id="section-servicios" className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => toggleCategory('Servicios')}
            className="flex items-center justify-between w-full px-5 py-4 bg-gray-50 hover:bg-gray-100/80 transition-colors border-b border-gray-200"
          >
            <div className="flex items-center gap-3">
              <Icon name={expandedCategories.includes('Servicios') ? 'chevron-down' : 'chevron-right'} className="h-4 w-4 text-gray-500" />
              <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Servicios</h3>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md uppercase">
                {Object.keys(gruposServicios || {}).length} Grupos
              </span>
            </div>

            {Object.keys(gruposServicios || {}).length > 0 && (
              <div className="flex items-center gap-2">
                {/* BOTÓN DE REPORTE (SERVICIOS) */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setReporteServiciosOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-black rounded-lg uppercase shadow-sm hover:bg-teal-100 hover:text-teal-900 transition-all cursor-pointer"
                >
                  <Icon name="bar-chart-3" className="h-3 w-3" />
                  <span className="hidden sm:inline">Reporte</span>
                </span>
              </div>
            )}
          </button>

          <AnimatePresence>
            {expandedCategories.includes('Servicios') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-6">
                  {/* EL "ESPEJO" INLINE PARA AGREGAR NUEVOS GRUPOS DE SERVICIOS */}
                  {!isReadOnly && (
                    <EditableGroupRow
                      tipo="SERVICIOS"
                      onSave={(data) => handleConfirmGrupoServicio(data)}
                      formatMoneySymbol={formatMoneySymbol}
                      categoriasPersonal={categoriasPersonal}
                      tiposGasto={tiposGasto}
                      notasComunes={notasComunes}
                      idArea={data?.id_area}
                      catalogoVersion={catalogoVersion}
                      setCatalogoVersion={setCatalogoVersion}
                      unidadesMedida={unidadesMedida}
                      setUnidadesMedida={setUnidadesMedida}
                      handleTriggerCreatePersonal={handleTriggerCreatePersonal}
                      renderInlinePersonalCreateForm={renderInlinePersonalCreateForm}
                    />
                  )}

                  <div className="space-y-6">
                    {sortedGruposServicios.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                        <Icon name="package-2" className="h-5 w-5 text-gray-300 mx-auto mb-2" />
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                          No hay grupos de servicios registrados. Crea uno nuevo arriba.
                        </p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensorsServicios}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEndServicios}
                      >
                        <SortableContext
                          items={sortedGruposServicios.map(g => `grupo-${g.id_servicio}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-6">
                            {sortedGruposServicios.map((grupo, gIdx) => (
                              <SortableWrapper
                                key={`grupo-srv-wrapper-${grupo.id_servicio}`}
                                id={`grupo-${grupo.id_servicio}`}
                                data={{ type: 'grupo', id_servicio: grupo.id_servicio }}
                                className="relative"
                              >
                                {({ listeners, attributes, isDragging }) => (
                                  <div style={{ opacity: isDragging ? 0.6 : 1 }}>
                                    {renderGrupoServicio(grupo, gIdx, listeners, attributes)}
                                  </div>
                                )}
                              </SortableWrapper>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CONDICIONES GENERALES */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => toggleCategory('Condiciones')}
            className="flex items-center justify-between w-full px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200 rounded-t-xl"
          >
            <div className="flex items-center">
              <Icon
                name={expandedCategories.includes('Condiciones') ? 'chevron-down' : 'chevron-right'}
                className="h-5 w-5 text-gray-500 mr-2"
              />
              <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Condiciones Generales</h3>
            </div>
          </button>

          {expandedCategories.includes('Condiciones') && (
            <div className="flex flex-col md:flex-row animate-in fade-in duration-300 border-t border-gray-100 items-stretch relative min-h-[500px]">

              {/* PANEL IZQUIERDO: SELECCIÓN DE NOTAS - SE ADAPTA AL ALTO DEL EDITOR */}
              {!isReadOnly && (
                <div className="w-full md:w-80 border-r border-gray-100 bg-gray-50/50 flex flex-col shrink-0 relative">
                  <div className="absolute inset-0 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-200/60 bg-white/60 backdrop-blur-md flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 rounded-lg">
                          <Icon name="bookmark" className="h-3.5 w-3.5 text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Notas</span>
                      </div>
                      {loadingNotas && <div className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full" />}
                    </div>

                    {/* Buscador de Notas */}
                    <div className="px-4 py-2 border-b border-gray-200/60 bg-white/40 shrink-0">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder="Buscar nota..."
                          value={searchQueryNotas}
                          onChange={(e) => setSearchQueryNotas(e.target.value)}
                          className="w-full text-[10px] pl-7 pr-7 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                        />
                        <Icon name="search" className="absolute left-2.5 h-3 w-3 text-gray-400" />
                        {searchQueryNotas && (
                          <button
                            type="button"
                            onClick={() => setSearchQueryNotas("")}
                            className="absolute right-2.5 hover:text-rose-500 text-gray-400"
                          >
                            <Icon name="x" className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Área de scroll de Notas */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar bg-gray-50/30">
                      {(() => {
                        const filtered = notasComunes.filter((nota) =>
                          (nota.descripcion || "")
                            .toLowerCase()
                            .includes(searchQueryNotas.toLowerCase())
                        );
                        if (filtered.length === 0 && !loadingNotas) {
                          return (
                            <div className="flex flex-col items-center justify-center py-10 opacity-30">
                              <Icon name="inbox" className="h-8 w-8 mb-2" />
                              <span className="text-[10px] font-bold uppercase">
                                {searchQueryNotas ? "Sin resultados" : "Sin notas"}
                              </span>
                            </div>
                          );
                        }
                        return filtered.map((nota) => (
                          <div
                            key={nota.id_nota || nota.codigo}
                            onClick={() => {
                              if (isReadOnly) return;
                              const quill = quillRef.current.getEditor();
                              const range = quill.getSelection() || { index: quill.getLength() };
                              const textoInsertar = nota.descripcion || '';
                              quill.insertText(range.index, `${textoInsertar}\n`, { bold: false });
                              quill.formatLine(range.index, textoInsertar.length, 'list', 'bullet');
                              quill.setSelection(range.index + textoInsertar.length + 1);
                            }}
                            className={cn(
                              "flex items-start p-3 bg-white border border-gray-200 rounded-xl transition-all group",
                              isReadOnly
                                ? "cursor-not-allowed opacity-70"
                                : "cursor-pointer hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5"
                            )}
                          >
                            {!isReadOnly && (
                              <div className="mt-0.5 h-4 w-4 rounded-lg border border-gray-200 flex items-center justify-center group-hover:border-indigo-500 group-hover:bg-indigo-600 transition-all">
                                <Icon name="plus" className="h-2.5 w-2.5 text-gray-400 group-hover:text-white transition-colors" />
                              </div>
                            )}
                            <span className="ml-3 text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 leading-tight">
                              {nota.descripcion}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>

                    {/* Footer del Panel Izquierdo */}
                    <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                      <div className="relative group">
                        <input
                          type="text"
                          placeholder={isReadOnly ? "Lectura protegida..." : "Escribir y guardar nota..."}
                          className="w-full text-[11px] pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              handleAddNuevaNota(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          disabled={isReadOnly}
                        />
                        {!isReadOnly && <Icon name="plus-circle" className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 group-focus-within:text-indigo-500" />}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PANEL DERECHO: EDITOR (EXPANDIBLE) */}
              <div className="flex-1 flex flex-col bg-white min-h-full">
                <div className="px-6 py-4 border-b border-gray-100 bg-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Condiciones</span>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => setGeneralConditions('')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black text-rose-500 hover:bg-rose-50 transition-all uppercase tracking-tighter"
                    >
                      <Icon name="trash-2" className="h-3 w-3" />
                      Borrar Todo
                    </button>
                  )}
                </div>

                <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
                  <style>{`
                    .editor-container {
                      display: flex;
                      flex-direction: column;
                      height: 100%;
                    }
                    .editor-container .quill {
                      display: flex;
                      flex-direction: column;
                      height: 100%;
                    }
                    .editor-container .ql-toolbar.ql-snow {
                      border: none !important;
                      border-bottom: 1px solid #f1f5f9 !important;
                      background: #f8fafc !important;
                      padding: 10px 20px !important;
                    }
                    .editor-container .ql-container.ql-snow {
                      border: none !important;
                    }
                    .editor-container .ql-editor {
                      padding: 40px;
                      font-size: 14px;
                      line-height: 1.8;
                      color: #1e293b;
                      background: white;
                      height: auto !important;
                      min-height: 500px;
                    }
                    /* Custom Scrollbar para el editor */
                    .editor-container .ql-editor::-webkit-scrollbar { width: 5px; }
                    .editor-container .ql-editor::-webkit-scrollbar-track { background: transparent; }
                    .editor-container .ql-editor::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                    
                    .editor-container .ql-editor ol + ul,
                    .editor-container .ql-editor ul + ol,
                    .editor-container .ql-editor ol + ol,
                    .editor-container .ql-editor ul + ul {
                      counter-reset: none !important;
                    }
                  `}</style>

                  <div className="editor-container">
                    <ReactQuill
                      ref={quillRef} // <--- IMPORTANTE: Referencia asignada
                      theme="snow"
                      value={generalConditions}
                      onChange={setGeneralConditions}
                      readOnly={isReadOnly}
                      placeholder="Las notas aparecerán aquí. Puedes editarlas libremente..."
                      modules={{
                        toolbar: isReadOnly ? false : [
                          ['bold', 'italic', 'underline'],
                          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                          [{ 'indent': '-1' }, { 'indent': '+1' }],
                          ['clean']
                        ],
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    )}
      </div>

      {/* 30% LATERAL PANEL - Sticky Dashboard */}
      <div className="w-full xl:w-4/12 space-y-6">

        {/* BOTONES*/}
        <div className="flex justify-end items-center gap-2">
          {/* NUEVA VERSIÓN */}
          <button
            onClick={() => {
              toast.info(({ closeToast }) => (
                <div className="flex flex-col min-w-[340px] overflow-hidden rounded-lg">
                  <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50/50 border-b border-indigo-100">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-sm border border-indigo-100">
                      <Icon name="layers" className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">
                      Nueva Versión de Registro
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[11px] text-gray-600 leading-tight">
                      ¿Confirmar la generación de una <span className="font-bold text-gray-900 underline decoration-indigo-200 underline-offset-2">nueva versión</span>?
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-3 px-4 pb-3">
                    <button onClick={closeToast} className="whitespace-nowrap text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">Cancelar</button>
                    <button
                      onClick={() => { crearNuevaVersion.mutate(); closeToast(); }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[9px] font-black rounded-xl uppercase shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
                    >
                      <span>Confirmar Nueva Versión</span>
                      <Icon name="arrow-right" className="h-3 w-3 opacity-70" />
                    </button>
                  </div>
                </div>
              ), { position: "top-right", autoClose: false, closeOnClick: false, draggable: false, icon: false, className: "p-0 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden !w-max !max-w-[400px]" });
            }}
            disabled={isPending}
            className={cn(
              "flex items-center px-4 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-[10px] font-black text-indigo-700 transition-all shadow-sm h-[42px] uppercase group",
              isPending ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-100/50 hover:border-indigo-300 hover:shadow-md"
            )}
          >
            {crearNuevaVersion.isPending ? (
              <div className="h-3.5 w-3.5 mr-2 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="layers" className="h-3.5 w-3.5 mr-2 text-indigo-600 group-hover:scale-110 transition-transform" />
            )}
            {crearNuevaVersion.isPending ? "Procesando..." : "Nueva Versión"}
          </button>

          {/* DUPLICAR */}
          <button
            onClick={() => {
              setCopyReferencia(data?.referencia ? `${data.referencia} - COPIA` : 'COPIA');
              setCopyIdArea(data?.id_area ? String(data.id_area) : '');
              setCopyIdCliente(data?.id_cliente || null);
              setCopyClienteNombre(data?.cliente_nombre || '');
              setCopyClienteQuery(data?.cliente_nombre || '');
              setCopyIdRepresentante(data?.id_representante || null);
              setCopyRepresentanteNombre(data?.representante_nombre || '');
              setCopyEncargadoQuery(data?.representante_nombre || '');
              setCopyIdTipo(data?.id_tipo || '');
              setCopyTipoVenta(data?.tipo_venta || '');
              setShowCopyModal(true);
            }}
            disabled={copiarCotizacion.isPending}
            className={cn(
              "flex items-center px-4 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-[10px] font-black text-amber-700 transition-all shadow-sm h-[42px] uppercase group",
              copiarCotizacion.isPending ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-100/50 hover:border-amber-300 hover:shadow-md"
            )}
          >
            {copiarCotizacion.isPending ? (
              <div className="h-3.5 w-3.5 mr-2 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="copy" className="h-3.5 w-3.5 mr-2 text-amber-600 group-hover:scale-110 transition-transform" />
            )}
            {copiarCotizacion.isPending ? "Procesando..." : "Generar Copia"}
          </button>

          {/* ELIMINAR */}
          {!isReadOnly && (
            <button
              onClick={() => {
                toast.error(({ closeToast }) => (
                  <div className="flex flex-col min-w-[340px] overflow-hidden rounded-lg">
                    <div className="flex items-center gap-3 px-4 py-2 bg-rose-50/50 border-b border-rose-100">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-sm border border-rose-100">
                        <Icon name="trash" className="h-3.5 w-3.5 text-rose-600" />
                      </div>
                      <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">Eliminar Registro</span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[11px] text-gray-600 leading-tight">¿Estás seguro de que deseas <span className="font-bold text-red-600 underline decoration-red-200 underline-offset-2">eliminar permanentemente</span> este registro? Esta acción no se puede deshacer.</p>
                    </div>
                    <div className="flex items-center justify-end gap-3 px-4 pb-3">
                      <button onClick={closeToast} className="whitespace-nowrap text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">Cancelar</button>
                      <button
                        onClick={() => { eliminarCotizacion.mutate(); closeToast(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-[9px] font-black rounded-xl uppercase shadow-md shadow-red-200 hover:bg-red-700 transition-all active:scale-95 whitespace-nowrap"
                      >
                        <span>Confirmar Eliminación</span>
                        <Icon name="trash" className="h-3 w-3 opacity-70" />
                      </button>
                    </div>
                  </div>
                ), { position: "top-right", autoClose: false, closeOnClick: false, draggable: false, icon: false, className: "p-0 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden !w-max !max-w-[400px]" });
              }}
              disabled={eliminarCotizacion.isPending}
              className={cn(
                "flex items-center px-4 py-2 bg-red-50/50 border border-red-200 rounded-xl text-[10px] font-black text-red-700 transition-all shadow-sm h-[42px] uppercase group",
                eliminarCotizacion.isPending ? "opacity-50 cursor-not-allowed" : "hover:bg-red-100/50 hover:border-red-300 hover:shadow-md"
              )}
            >
              {eliminarCotizacion.isPending ? (
                <div className="h-3.5 w-3.5 mr-2 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="trash" className="h-3.5 w-3.5 mr-2 text-red-600 group-hover:scale-110 transition-transform" />
              )}
              {eliminarCotizacion.isPending ? "Eliminando..." : "Eliminar"}
            </button>
          )}

          {/* PASAR A COTIZACIÓN */}
          {esOportunidad && (
            <button
              onClick={() => {
                toast.info(({ closeToast }) => (
                  <div className="flex flex-col min-w-[340px] overflow-hidden rounded-lg">
                    <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50/50 border-b border-emerald-100">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-sm border border-emerald-100">
                        <Icon name="check-circle" className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">
                        Convertir a Cotización
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[11px] text-gray-600 leading-tight">
                        ¿Confirmar la transición de esta oportunidad a <span className="font-bold text-gray-900 underline decoration-emerald-200 underline-offset-2">COTIZACIÓN</span>?
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-3 px-4 pb-3">
                      <button onClick={closeToast} className="whitespace-nowrap text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">Cancelar</button>
                      <button
                        onClick={() => { pasarACotizacion.mutate(); closeToast(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[9px] font-black rounded-xl uppercase shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap"
                      >
                        <span>Confirmar Transición</span>
                        <Icon name="arrow-right" className="h-3 w-3 opacity-70" />
                      </button>
                    </div>
                  </div>
                ), { position: "top-right", autoClose: false, closeOnClick: false, draggable: false, icon: false, className: "p-0 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden !w-max !max-w-[400px]" });
              }}
              disabled={pasarACotizacion.isPending}
              className={cn(
                "flex items-center px-4 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl text-[10px] font-black text-emerald-700 transition-all shadow-sm h-[42px] uppercase group",
                pasarACotizacion.isPending ? "opacity-50 cursor-not-allowed" : "hover:bg-emerald-100/50 hover:border-emerald-300 hover:shadow-md"
              )}
            >
              {pasarACotizacion.isPending ? (
                <div className="h-3.5 w-3.5 mr-2 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="check-circle" className="h-3.5 w-3.5 mr-2 text-emerald-600 group-hover:scale-110 transition-transform" />
              )}
              {pasarACotizacion.isPending ? "Procesando..." : "Pasar a Cotización"}
            </button>
          )}

          {/* PASAR A APERTURA */}
          {!esOportunidad && data?.id_estado !== 1 && (
            <button
              onClick={() => {
                // Validación de al menos 1 suministro o 1 servicio
                let suppliesCount = 0;
                if (gruposSuministros) {
                  Object.values(gruposSuministros).forEach(g => {
                    if (g.items && Array.isArray(g.items)) {
                      suppliesCount += g.items.length;
                    }
                  });
                }

                let servicesCount = 0;
                if (gruposServicios) {
                  Object.values(gruposServicios).forEach(g => {
                    if (g.subgrupos && Array.isArray(g.subgrupos)) {
                      g.subgrupos.forEach(sg => {
                        if (sg.items && Array.isArray(sg.items)) {
                          servicesCount += sg.items.length;
                        }
                      });
                    }
                  });
                }

                if (suppliesCount === 0 && servicesCount === 0) {
                  toast.error("No se puede pasar a apertura una cotización sin suministros ni servicios. Debe agregar al menos uno.");
                  return;
                }

                toast.info(({ closeToast }) => (
                  <div className="flex flex-col min-w-[340px] overflow-hidden rounded-lg">
                    <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50/50 border-b border-indigo-100">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-sm border border-indigo-100">
                        <Icon name="check-circle" className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">
                        Adjudicar y Aperturar Cotización
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[11px] text-gray-600 leading-tight">
                        ¿Confirmar la transición de esta cotización a <span className="font-bold text-gray-900 underline decoration-indigo-200 underline-offset-2">APERTURA (ADJUDICADO)</span>?
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-3 px-4 pb-3">
                      <button onClick={closeToast} className="whitespace-nowrap text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">Cancelar</button>
                      <button
                        onClick={() => { pasarAApertura.mutate(); closeToast(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[9px] font-black rounded-xl uppercase shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
                      >
                        <span>Confirmar Transición</span>
                        <Icon name="arrow-right" className="h-3 w-3 opacity-70" />
                      </button>
                    </div>
                  </div>
                ), { position: "top-right", autoClose: false, closeOnClick: false, draggable: false, icon: false, className: "p-0 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden !w-max !max-w-[400px]" });
              }}
              disabled={pasarAApertura.isPending}
              className={cn(
                "flex items-center px-4 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-[10px] font-black text-indigo-700 transition-all shadow-sm h-[42px] uppercase group",
                pasarAApertura.isPending ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-100/50 hover:border-indigo-300 hover:shadow-md"
              )}
            >
              {pasarAApertura.isPending ? (
                <div className="h-3.5 w-3.5 mr-2 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="file-text" className="h-3.5 w-3.5 mr-2 text-indigo-600 group-hover:scale-110 transition-transform" />
              )}
              {pasarAApertura.isPending ? "Procesando..." : "Pasar a Apertura"}
            </button>
          )}
        </div>

        {/* DATOS COTIZACION */}
        {!esOportunidad && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 font-sans relative z-10 focus-within:z-30">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-t-2xl">
              <h3 className="font-black text-gray-900 flex items-center text-[11px] uppercase tracking-wider">
                <Icon name="clipboard-list" className="h-3.5 w-3.5 mr-2 text-indigo-500" /> Datos Cotización
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Referencia */}
              <div className="group relative bg-gray-50/80 p-3 rounded-xl border border-gray-100 transition-all">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tighter">
                    Referencia del Proyecto
                  </label>
                  {!isReadOnly && (
                    <Icon name="pencil" className="h-2.5 w-2.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  )}
                </div>

                <div className="relative min-h-[1.5rem] flex items-center">
                  <p className="text-[10.5px] font-black uppercase leading-snug text-gray-900 break-words w-full">
                    {data.referencia || 'SIN REFERENCIA ASIGNADA'}
                  </p>

                  {!isReadOnly && (
                    <textarea
                      rows="2"
                      className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded-lg px-2 py-1 text-[10px] font-black text-gray-900 uppercase outline-none resize-none shadow-sm"
                      defaultValue={data.referencia}
                      onBlur={(e) => handleFieldChange("referencia", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          e.target.blur();
                        }
                      }}
                      disabled={isReadOnly}
                    />
                  )}
                </div>
              </div>

              {/* Grid 2 columnas: Probabilidad, IGV */}
              <div className="grid grid-cols-2 gap-3">
                <CompactField label="Probabilidad" className="group relative">
                  <div className="relative">
                    <SelectField
                      id="probabilidad"
                      inline
                      value={(data.probabilidad !== undefined && data.probabilidad !== null) ? String(data.probabilidad) : ""}
                      onChange={(e) => handleFieldChange("probabilidad", e.target.value)}
                      options={probOptions}
                      disabled={isReadOnly}
                      className="bg-transparent border-none p-0 h-auto font-black text-[10px] text-gray-900 focus:ring-0 cursor-pointer"
                    />
                    {!isReadOnly && (
                      <div className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Icon name="chevron-down" className="h-2 w-2 text-gray-400" />
                      </div>
                    )}
                  </div>
                </CompactField>

                <CompactField label="IGV">
                  <SelectField
                    id="igv"
                    inline
                    value={data.igv || "N"}
                    onChange={(e) => handleFieldChange("igv", e.target.value)}
                    options={igvOptions}
                    disabled={isReadOnly}
                    className="bg-transparent border-none p-0 h-auto font-black text-[10px] text-gray-900 focus:ring-0 cursor-pointer"
                  />
                </CompactField>
              </div>

              {/* Grid 2 columnas: Moneda, Tipo Cambio */}
              <div className="grid grid-cols-2 gap-3">
                <CompactField label="Moneda" className="group relative">
                  <div className="relative">
                    <SelectField
                      id="tipo_moneda"
                      inline
                      value={data.tipo_moneda || ""}
                      onChange={(e) => handleFieldChange("tipo_moneda", e.target.value)}
                      options={monedasOptions}
                      disabled={isReadOnly}
                      className="bg-transparent border-none p-0 h-auto font-black text-[10px] text-gray-900 focus:ring-0 cursor-pointer"
                    />
                    {!isReadOnly && (
                      <div className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Icon name="chevron-down" className="h-2 w-2 text-gray-400" />
                      </div>
                    )}
                  </div>
                </CompactField>

                <CompactField label="T. Cambio" className="group relative">
                  <div className="relative cursor-pointer min-h-[15px] flex items-center">
                    <span className="text-[10px] font-black text-gray-900 truncate">
                      {data.tipo_cambio || '0.00'}
                    </span>
                    {!isReadOnly && (
                      <>
                        <Icon name="pencil" className="h-2.5 w-2.5 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <input
                          type="number"
                          step="0.001"
                          className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded px-1 text-[10px] font-black text-gray-900 outline-none"
                          defaultValue={data.tipo_cambio}
                          onBlur={(e) => handleFieldChange("tipo_cambio", e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                          disabled={isReadOnly}
                        />
                      </>
                    )}
                  </div>
                </CompactField>
              </div>

              {/* Grid 2 columnas: Forma Pago, Lugar Entrega */}
              <div className="grid grid-cols-2 gap-3">
                <CompactField label="Forma Pago" className="group relative">
                  <div className="relative cursor-pointer min-h-[15px] flex items-center">
                    <span className="text-[10px] font-black text-gray-900 truncate">
                      {data.forma_pago || '---'}
                    </span>
                    {!isReadOnly && (
                      <>
                        <Icon name="pencil" className="h-2.5 w-2.5 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <input
                          type="text"
                          className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded px-1 text-[10px] font-black text-gray-900 uppercase outline-none"
                          defaultValue={data.forma_pago}
                          onBlur={(e) => handleFieldChange("forma_pago", e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                          disabled={isReadOnly}
                        />
                      </>
                    )}
                  </div>
                </CompactField>

                <CompactField label="Lugar Entrega" className="group relative">
                  <div className="relative cursor-pointer min-h-[15px] flex items-center">
                    <span className="text-[10px] font-black text-gray-900 truncate">
                      {data.lugar || '---'}
                    </span>
                    {!isReadOnly && (
                      <>
                        <Icon name="pencil" className="h-2.5 w-2.5 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <input
                          type="text"
                          className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 bg-white border border-indigo-300 rounded px-1 text-[10px] font-black text-gray-900 uppercase outline-none"
                          defaultValue={data.lugar}
                          onBlur={(e) => handleFieldChange("lugar", e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                          disabled={isReadOnly}
                        />
                      </>
                    )}
                  </div>
                </CompactField>
              </div>

              {/* Grid 3 columnas: Entrega Suministros, Entrega Servicios, Validez Oferta */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <CompactTiempoUnidad
                    label="Entrega Suministros"
                    value={data.entrega_suministros}
                    onValueChange={(e) => handleFieldChange("entrega_suministros", e.target.value)}
                    unitValue={data.id_unidad_tiempo_entrega_suministros || ""}
                    onUnitChange={(e) => handleFieldChange("id_unidad_tiempo_entrega_suministros", e.target.value)}
                    options={unidadOptions}
                    isReadOnly={isReadOnly}
                  />
                  {!isReadOnly && sugerenciasTiempos.suministros?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sugerenciasTiempos.suministros.map((sug, idx) => {
                        const isActive = isSuggestionActive(sug, data.entrega_suministros, data.id_unidad_tiempo_entrega_suministros);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSugerenciaSuministro(sug)}
                            className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded transition-all cursor-pointer shadow-sm ${
                              isActive
                                ? "bg-indigo-600 text-white border border-indigo-600"
                                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100/50"
                            }`}
                          >
                            {sug.formateado}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <CompactTiempoUnidad
                    label="Entrega Servicios"
                    value={data.entrega_servicios}
                    onValueChange={(e) => handleFieldChange("entrega_servicios", e.target.value)}
                    unitValue={data.id_unidad_tiempo_entrega_servicios || ""}
                    onUnitChange={(e) => handleFieldChange("id_unidad_tiempo_entrega_servicios", e.target.value)}
                    options={unidadOptions}
                    isReadOnly={isReadOnly}
                  />
                  {!isReadOnly && sugerenciasTiempos.servicios?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sugerenciasTiempos.servicios.map((sug, idx) => {
                        const isActive = isSuggestionActive(sug, data.entrega_servicios, data.id_unidad_tiempo_entrega_servicios);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSugerenciaServicio(sug)}
                            className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded transition-all cursor-pointer shadow-sm ${
                              isActive
                                ? "bg-indigo-600 text-white border border-indigo-600"
                                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100/50"
                            }`}
                          >
                            {sug.formateado}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <CompactTiempoUnidad
                    label="Validez Oferta"
                    value={data.validez_oferta}
                    onValueChange={(e) => handleFieldChange("validez_oferta", e.target.value)}
                    unitValue={data.id_unidad_tiempo_validez || ""}
                    onUnitChange={(e) => handleFieldChange("id_unidad_tiempo_validez", e.target.value)}
                    options={unidadOptions}
                    isReadOnly={isReadOnly}
                  />
                  {!isReadOnly && sugerenciasTiempos.validez?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sugerenciasTiempos.validez.map((sug, idx) => {
                        const isActive = isSuggestionActive(sug, data.validez_oferta, data.id_unidad_tiempo_validez);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSugerenciaValidez(sug)}
                            className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded transition-all cursor-pointer shadow-sm ${
                              isActive
                                ? "bg-indigo-600 text-white border border-indigo-600"
                                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100/50"
                            }`}
                          >
                            {sug.formateado}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Responsables */}
              <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                {/* Comercial */}
                <div className={cn(
                  "group flex flex-col border rounded-xl p-2.5 shadow-sm transition-all duration-300",
                  data.comercial_nombre
                    ? "bg-white border-indigo-100 hover:border-indigo-300 hover:shadow-md"
                    : "bg-gray-50/50 border-gray-200 opacity-80"
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        data.comercial_nombre ? "bg-indigo-500 animate-pulse" : "bg-gray-400"
                      )}></div>
                      <span className={cn(
                        "text-[9.5px] font-black uppercase tracking-widest",
                        data.comercial_nombre ? "text-indigo-500" : "text-gray-500"
                      )}>Comercial</span>
                    </div>
                    <Icon
                      name={data.comercial_nombre ? "user-check" : "user-plus"}
                      className={cn("h-3 w-3 transition-colors", data.comercial_nombre ? "text-indigo-300 group-hover:text-indigo-500" : "text-gray-400")}
                    />
                  </div>

                  <div className="flex flex-col space-y-0.5">
                    <span className="text-[10px] font-black text-slate-800 uppercase leading-none truncate">
                      {data.comercial_nombre || 'PENDIENTE ASIGNAR'}
                    </span>
                    {data.comercial_nombre && (
                      <div className="flex flex-col gap-0.5 mt-1">
                        {data.comercial_telefono && (
                          <div className="flex items-center gap-1.5">
                            <Icon name="phone" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 tracking-tight">{data.comercial_telefono}</span>
                          </div>
                        )}
                        {data.comercial_movil_corporativo && (
                          <div className="flex items-center gap-1.5">
                            <Icon name="smartphone" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 tracking-tight">{data.comercial_movil_corporativo}</span>
                          </div>
                        )}
                        {data.comercial_correo && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Icon name="mail" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 lowercase truncate tracking-tight">{data.comercial_correo}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Técnico */}
                <div className={cn(
                  "group flex flex-col border rounded-xl p-2.5 shadow-sm transition-all duration-300",
                  data.tecnico_nombre
                    ? "bg-white border-emerald-100 hover:border-emerald-300 hover:shadow-md"
                    : "bg-gray-50/50 border-gray-200 opacity-80"
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        data.tecnico_nombre ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                      )}></div>
                      <span className={cn(
                        "text-[9.5px] font-black uppercase tracking-widest",
                        data.tecnico_nombre ? "text-emerald-500" : "text-gray-500"
                      )}>Técnico</span>
                    </div>
                    <Icon
                      name={data.tecnico_nombre ? "settings" : "user-plus"}
                      className={cn("h-3 w-3 transition-colors", data.tecnico_nombre ? "text-emerald-300 group-hover:text-emerald-500" : "text-gray-400")}
                    />
                  </div>

                  <div className="flex flex-col space-y-0.5">
                    <span className="text-[11px] font-black text-slate-800 uppercase leading-none truncate">
                      {data.tecnico_nombre || 'PENDIENTE ASIGNAR'}
                    </span>
                    {data.tecnico_nombre && (
                      <div className="flex flex-col gap-0.5 mt-1">
                        {data.tecnico_telefono && (
                          <div className="flex items-center gap-1.5">
                            <Icon name="phone" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 tracking-tight">{data.tecnico_telefono}</span>
                          </div>
                        )}
                        {data.tecnico_movil_corporativo && (
                          <div className="flex items-center gap-1.5">
                            <Icon name="smartphone" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 tracking-tight">{data.tecnico_movil_corporativo}</span>
                          </div>
                        )}
                        {data.tecnico_correo && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Icon name="mail" className="h-3 w-3 text-slate-400" />
                            <span className="text-[10.5px] font-medium text-slate-500 lowercase truncate tracking-tight">{data.tecnico_correo}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Cotización (col-span-2) */}
              <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                <div className="col-span-2 bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-indigo-350 uppercase tracking-widest leading-none mb-1">
                      Total Cotización
                    </span>
                    <span className="text-xs font-black uppercase text-indigo-150 leading-none">
                      Importe Global
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white">
                      {formatMoneySymbol(data?.total_cotizacion || 0)}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* DESCUENTO COMERCIAL */}
        {!esOportunidad && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-black text-gray-900 flex items-center text-[11px] uppercase tracking-wider">
                <Icon name="percent" className="h-3.5 w-3.5 mr-2 text-indigo-500" strokeWidth={2.5} /> Descuento Comercial
              </h3>
              <div className="flex items-center gap-3">
                {loadingDescuentoTotales && (
                  <div className="animate-spin h-3 w-3 border-2 border-teal-500 border-t-transparent rounded-full" />
                )}
                {!isReadOnly && (
                  <button
                    type="button"
                    disabled={savingDescuento}
                    onClick={handleResetDescuento}
                    className="group flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-all disabled:opacity-50"
                    title="Limpiar descuento"
                  >
                    <Icon name="rotate-ccw" className="h-3.5 w-3.5 group-hover:rotate-[-45deg] transition-transform" />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 space-y-4">
              
              {/* Grid de 2 columnas para la configuración del descuento */}
              <div className="grid grid-cols-2 gap-3 pb-1">
                
                {/* Aplicar Descuento */}
                <CompactField label="Aplicar Descuento" className="group relative justify-center">
                  <div className="flex items-center min-h-[18px]">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={descuentoAplicar}
                      onChange={(e) => setDescuentoAplicar(e.target.checked)}
                      className="w-4 h-4 text-teal-650 border-gray-300 rounded focus:ring-teal-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
                    />
                  </div>
                </CompactField>

                {/* Afecto a */}
                <CompactField label="Afecto a" className="group relative">
                  <div className="relative">
                    <select
                      disabled={isReadOnly}
                      value={descuentoAfecto}
                      onChange={(e) => setDescuentoAfecto(e.target.value)}
                      className="bg-transparent border-none p-0 h-auto font-black text-[10px] text-gray-900 focus:ring-0 cursor-pointer w-full appearance-none pr-4 uppercase"
                    >
                      <option value="t">TOTAL GENERAL</option>
                      <option value="su">SUMINISTROS</option>
                      <option value="ser">SERVICIOS</option>
                    </select>
                    {!isReadOnly && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Icon name="chevron-down" className="h-2 w-2 text-gray-400" />
                      </div>
                    )}
                  </div>
                </CompactField>

                {/* Porcentaje */}
                <CompactField label="Porcentaje" className="group relative">
                  <div className="relative flex items-center w-full">
                    <input
                      type="number"
                      step="0.01"
                      disabled={isReadOnly}
                      value={descuentoPorcentaje}
                      onChange={(e) => handleDecimalChange(e, handleDescuentoPorcentajeChange)}
                      placeholder="0.00"
                      className="bg-transparent border-none p-0 h-auto font-black text-[10px] text-gray-900 focus:ring-0 outline-none w-full pr-4 font-mono"
                    />
                    <span className="absolute right-0 text-[10px] font-bold text-gray-400">%</span>
                  </div>
                </CompactField>

                {/* Importe */}
                <CompactField label="Importe" className="group relative">
                  <div className="relative flex items-center w-full">
                    <input
                      type="number"
                      step="0.01"
                      disabled={isReadOnly}
                      value={descuentoImporte}
                      onChange={(e) => handleDecimalChange(e, handleDescuentoImporteChange)}
                      placeholder="0.00"
                      className="bg-transparent border-none p-0 h-auto font-black text-[10px] text-gray-900 focus:ring-0 outline-none w-full pr-6 font-mono"
                    />
                    <span className="absolute right-0 text-[10px] font-bold text-gray-400">
                      {data?.tipo_moneda === 'S' || data?.tipo_moneda === 'PEN' ? 'S/' : '$'}
                    </span>
                  </div>
                </CompactField>

              </div>

              {descuentoError && (
                <p className="text-red-500 text-[9px] font-black uppercase tracking-tighter bg-red-50 p-2 rounded-lg border border-red-100">
                  {descuentoError}
                </p>
              )}

              {/* SECCIÓN 2: DASHBOARD */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                
                {/* Resumen de Base */}
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 space-y-2">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-gray-200/50">
                    <Icon name="calculator" className="h-3 w-3 text-teal-650" />
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Base de Cálculo</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-slate-500">Total Original:</span>
                      <span className="text-slate-900 font-mono text-[9.5px]">
                        {formatMoneySymbol((Number(descuentoTotales.total || 0) + Number(descuentoTotales.des_m || 0)))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-slate-500">Suministros:</span>
                      <span className="text-slate-770 font-mono">
                        {formatMoneySymbol(Number(descuentoTotales.suministros || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-slate-500">Servicios:</span>
                      <span className="text-slate-770 font-mono">
                        {formatMoneySymbol(Number(descuentoTotales.servicios || 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resultado Final */}
                <div className={cn(
                  "p-3 rounded-xl border space-y-2 transition-all duration-300",
                  descuentoAplicar
                    ? "bg-teal-50/30 border-teal-150"
                    : "bg-gray-50/40 border-gray-100 opacity-60"
                )}>
                  <div className="flex items-center gap-1.5 pb-1 border-b border-teal-200/20">
                    <Icon name="trending-up" className={cn("h-3 w-3", descuentoAplicar ? "text-teal-650" : "text-gray-400")} />
                    <span className={cn("text-[9px] font-black uppercase tracking-wider", descuentoAplicar ? "text-teal-700" : "text-slate-500")}>Resultado Final</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-slate-500">Descuento:</span>
                      <span className="font-black text-red-650 italic">
                        {descuentoAplicar ? `- ${formatMoneySymbol(Number(descuentoImporte || 0))}` : '0.00'}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-slate-200/50">
                      <div className="flex justify-between items-center text-[9.5px] font-black">
                        <span className={descuentoAplicar ? "text-teal-700" : "text-slate-650"}>Total Final:</span>
                        <span className={cn("font-mono", descuentoAplicar ? "text-teal-700 text-[10px]" : "text-slate-800")}>
                          {formatMoneySymbol((Number(descuentoTotales.total || 0) + Number(descuentoTotales.des_m || 0) - (descuentoAplicar ? Number(descuentoImporte || 0) : 0)))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTOS ADJUNTOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center text-sm uppercase">
              <Icon name="paperclip" className="h-4 w-4 mr-2 text-indigo-500" /> Documentos Adjuntos
            </h3>
          </div>

          <div className="p-5 space-y-4">
            {documents.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 italic">Sin documentos adjuntos.</p>
            ) : (
              <ul className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gray-100 ml-1">
                {documents.map((doc, idx) => (
                  <li key={doc.id && doc.id !== 'None' ? doc.id : `doc-${idx}`} className="relative pl-7 group">
                    <div className="absolute left-0 top-1 w-5 h-5 bg-white border-2 border-indigo-400 rounded-full flex items-center justify-center shadow-sm">
                      <Icon name="file-text" className="h-3 w-3 text-indigo-600" />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex justify-between items-start">
                        {/* 1. NOMBRE DEL ARCHIVO (PRUEBA.pdf) */}
                        <a
                          href={`http://localhost:8001${doc.file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-black text-[11px] truncate uppercase tracking-tight"
                        >
                          {doc.name}
                        </a>
                        {/* Acciones de Documento */}
                        <div className="flex items-center gap-1">
                          {deletingDocId === doc.id ? (
                            <div className="flex items-center gap-1 bg-red-50 rounded-lg px-1 py-0.5 border border-red-100 animate-in fade-in zoom-in duration-200">
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-[9px] font-black text-red-600 hover:text-red-700 px-1.5 py-0.5 uppercase tracking-tighter"
                              >
                                Confirmar
                              </button>
                              <span className="h-2 w-px bg-red-200"></span>
                              <button
                                onClick={() => setDeletingDocId(null)}
                                className="text-[9px] font-black text-slate-400 hover:text-slate-600 px-1.5 py-0.5 uppercase tracking-tighter"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingDocId(doc.id)}
                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-2"
                              title="Eliminar documento"
                            >
                              <Icon name="trash-2" className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. DESCRIPCIÓN - Solo se muestra si existe contenido */}
                      {doc.description && (
                        <p className="text-[11px] text-gray-600 font-black leading-tight mt-0.5">
                          {doc.description}
                        </p>
                      )}
                      {/* 3. FECHA Y USUARIO */}
                      <div className="flex items-center space-x-2 mt-1 opacity-70">
                        <span className="text-[11px] font-semibold text-slate-900 uppercase">{doc.upload_date}</span>
                        <span className="h-1 w-1 bg-gray-300 rounded-full"></span>
                        <span className="text-[11px] font-semibold text-slate-900">{doc.uploaded_by}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Nombre o descripción del documento..."
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={docDescription}
                onChange={(e) => setDocDescription(e.target.value)}
              />

              <label className={`w-full flex justify-center items-center px-4 py-2.5 border-2 border-dashed rounded-xl text-xs font-bold transition-all shadow-sm ${isUploading ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer'}`}>
                {isUploading ? (
                  <><Icon name="refresh-cw" className="h-4 w-4 mr-2 animate-spin" /> SUBIENDO...</>
                ) : (
                  <><Icon name="upload-cloud" className="h-4 w-4 mr-2" /> SELECCIONAR Y VINCULAR</>
                )}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileAndUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </div>

        {/* MENSAJES */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden max-h-[600px] transition-all">

          {/* Header Estandarizado */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center text-sm uppercase">
              <Icon name="message-square" className="h-4 w-4 mr-2 text-indigo-500" /> Seguimiento Comercial
            </h3>
            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-100 uppercase">
              {notes.length} {notes.length === 1 ? 'REGISTRO' : 'REGISTROS'}
            </span>
          </div>

          {/* Cuerpo del Log Compacto */}
          <div className="flex-1 p-5 bg-white overflow-y-auto custom-scrollbar">
            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-20">
                <Icon name="message-square" className="h-8 w-8 mb-2" />
                <p className="text-[9px] uppercase font-black tracking-widest text-center">Inicia la conversación</p>
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gray-100">
                {notes.map((note, index) => {
                  const safeKey = (note.id && note.id !== 'None') ? note.id : `note-${index}`;
                  const isAlert = note.is_alert;
                  const isDone = note.is_resolved;
                  const urgency = getAlertUrgency(note.alert_date, isDone);

                  return (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={safeKey}
                      className="relative pl-7 group"
                    >
                      {/* Icono de Timeline Estilo Adjuntos */}
                      <div className={cn(
                        "absolute left-0 top-0.5 w-5 h-5 bg-white border-2 rounded-full flex items-center justify-center shadow-sm z-10 transition-colors",
                        (isAlert && isDone) ? "border-emerald-400" :
                          (isAlert && urgency === 'expired') ? "border-red-400" :
                            (isAlert && urgency === 'urgent') ? "border-orange-400" : "border-indigo-400"
                      )}>
                        <Icon
                          name={(isAlert && isDone) ? "check" : isAlert ? "bell" : "message-square"}
                          className={cn(
                            "h-3 w-3",
                            (isAlert && isDone) ? "text-emerald-600" :
                              (isAlert && urgency === 'expired') ? "text-red-600" :
                                (isAlert && urgency === 'urgent') ? "text-orange-600" : "text-indigo-600"
                          )}
                        />
                      </div>

                      <div className="flex flex-col">
                        {/* Meta e Info de Usuario */}
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-tight">
                              {note.user_role === 'SISTEMA' ? '🤖 SISTEMA' : `@${note.user_role}`}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400 tabular-nums uppercase">
                              {note.timestamp}
                            </span>
                          </div>

                          {/* Badges y Acciones Compactas */}
                          <div className="flex items-center gap-2">
                            {isAlert && !isDone && (
                              <div className="flex gap-1.5 items-center">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase border ${urgency === 'expired' ? 'bg-red-50 text-red-600 border-red-100' :
                                  urgency === 'urgent' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                    'bg-slate-50 text-slate-400 border-slate-100'
                                  }`}>
                                  {urgency === 'expired' ? 'Vencido' : urgency === 'urgent' ? 'Pronto' : 'Alerta'}
                                </span>

                                <div className="flex items-center gap-1">
                                  {urgency === 'expired' ? (
                                    <ReprogramMenu note={note} onReprogram={handleManageAlert} />
                                  ) : null}

                                  <button
                                    onClick={() => handleManageAlert(note, 'complete')}
                                    className="p-1 rounded hover:bg-emerald-50 text-slate-300 hover:text-emerald-500 transition-all"
                                    title="Marcar como completado"
                                  >
                                    <Icon name="check" className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Botones de Acción */}
                            <div className="flex items-center gap-1">
                              {deletingId === note.id ? (
                                <div className="flex items-center gap-1 bg-red-50 rounded-lg px-1 py-0.5 border border-red-100 animate-in fade-in zoom-in duration-200">
                                  <button
                                    onClick={() => handleDeleteMensaje(note.id)}
                                    className="text-[9px] font-black text-red-600 hover:text-red-700 px-1.5 py-0.5 uppercase tracking-tighter"
                                  >
                                    Confirmar
                                  </button>
                                  <span className="h-2 w-px bg-red-200"></span>
                                  <button
                                    onClick={() => setDeletingId(null)}
                                    className="text-[9px] font-black text-slate-400 hover:text-slate-600 px-1.5 py-0.5 uppercase tracking-tighter"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeletingId(note.id)}
                                  className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                  title="Eliminar mensaje"
                                >
                                  <Icon name="trash-2" className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Contenido del Mensaje (Estilo Adjuntos) */}
                        <div className="text-[11px] font-black leading-tight text-slate-700">
                          {note.content}
                        </div>

                        {/* Fecha de Alerta Minimalista */}
                        {isAlert && !isDone && note.alert_date && (
                          <div className={`mt-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight ${urgency === 'expired' ? 'text-red-500' :
                            urgency === 'urgent' ? 'text-orange-500' : 'text-indigo-400'
                            }`}>
                            <Icon name="calendar" className="h-3 w-3" />
                            {note.alert_date.toLocaleString('es-PE', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat Input Compacto */}
          <div className="bg-white border-t border-slate-100">
            <TrackingInput
              value={newNote}
              onChange={setNewNote}
              onAddNote={handleAddNote}
              isAlert={isAlert}
              onAlertChange={setIsAlert}
            />
          </div>
        </div>

        {/* SECCIÓN DE TRAZABILIDAD MULTI-TIPO */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden max-h-[600px] transition-all hover:shadow-md">

          {/* Header Estandarizado */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center text-sm uppercase">
              <Icon name="history" className="h-4 w-4 mr-2.5 text-indigo-500" /> Trazabilidad del Registro
            </h3>
            <span className="bg-slate-50 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-200 uppercase">
              {history.length} Hitos Totales
            </span>
          </div>

          <div className="flex-1 p-5 overflow-y-auto bg-white custom-scrollbar">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-20">
                <Icon name="history" className="h-8 w-8 mb-2" />
                <p className="text-[9px] uppercase font-black tracking-widest text-center">Sin historial aún</p>
              </div>
            ) : (
              <div className="relative space-y-0 pb-2">
                {/* Línea conectora */}
                <div className="absolute left-[5px] top-2 bottom-0 w-[2px] bg-gradient-to-b from-indigo-200 via-slate-100 to-transparent"></div>

                {/* Mapeo de Hitos */}
                {[...history].reverse().map((n, idx) => {
                  const type = getHistoryType(n.detalle);
                  const typeConfig = {
                    CREACION: { color: 'indigo', icon: 'star', label: 'Apertura de Registro' },
                    SEGUIMIENTO: { color: 'amber', icon: 'message-square', label: 'Seguimiento Comercial' },
                    ADJUNTOS: { color: 'emerald', icon: 'paperclip', label: 'Gestión de Archivos' },
                    SISTEMA: { color: 'slate', icon: 'settings', label: 'Actividad del Sistema' },
                    ESTADO: { color: 'rose', icon: 'refresh-cw', label: 'Cambio de Estado' },
                    SUMINISTROS: { color: 'blue', icon: 'box', label: 'Suministros' },
                    SERVICIOS: { color: 'purple', icon: 'tool', label: 'Servicios' },
                    CONDICIONES: { color: 'slate', icon: 'file-text', label: 'Condiciones Generales' }
                  };

                  const config = typeConfig[type] || typeConfig.SISTEMA;
                  const colorClass = config.color;

                  const colorMap = {
                    indigo: { border: 'border-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50/30 border border-indigo-100/50' },
                    amber: { border: 'border-amber-500', text: 'text-amber-700', bg: 'bg-amber-50/30 border border-amber-100/50' },
                    emerald: { border: 'border-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50/30 border border-emerald-100/50' },
                    rose: { border: 'border-rose-500', text: 'text-rose-700', bg: 'bg-rose-50/30 border border-rose-100/50' },
                    blue: { border: 'border-blue-500', text: 'text-blue-700', bg: 'bg-blue-50/30 border border-blue-100/50' },
                    purple: { border: 'border-purple-500', text: 'text-purple-700', bg: 'bg-purple-50/30 border border-purple-100/50' },
                    slate: { border: 'border-slate-500', text: 'text-slate-700', bg: 'bg-slate-50/30 border border-slate-100/50' }
                  };

                  const classes = colorMap[colorClass] || colorMap.slate;

                  let cleanDetalle = n.detalle || "";
                  if (type === "SUMINISTROS" && cleanDetalle.toUpperCase().startsWith("SUMINISTROS:")) {
                    cleanDetalle = cleanDetalle.substring("Suministros:".length).trim();
                  } else if (type === "SERVICIOS" && cleanDetalle.toUpperCase().startsWith("SERVICIOS:")) {
                    cleanDetalle = cleanDetalle.substring("Servicios:".length).trim();
                  } else if (type === "CONDICIONES" && cleanDetalle.toUpperCase().startsWith("CONDICIONES GENERALES:")) {
                    cleanDetalle = cleanDetalle.substring("Condiciones Generales:".length).trim();
                  }

                  return (
                    <div key={n.id_seguimiento || idx} className="relative pl-8 pb-6 group">
                      {/* Punto conector dinámico según color */}
                      <div className={`absolute left-0 top-1.5 w-3 h-3 bg-white border-2 ${classes.border} rounded-full z-10 transition-all group-hover:scale-110`}></div>

                      <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-2">
                            {config.icon && <Icon name={config.icon} className={`h-3.5 w-3.5 ${classes.text}`} />}
                            <span className={`text-[10px] font-black ${classes.text} uppercase tracking-tight`}>
                              {config.label}
                            </span>
                            <span className="h-1 w-1 bg-slate-200 rounded-full"></span>
                            <span className="text-[10px] font-bold text-slate-400">@{n.usuario_nombre || 'sistema'}</span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 tabular-nums">{n.fecha_formateada}</span>
                        </div>

                        {/* Contenedor de contenido según tipo */}
                        <div className={`rounded-xl p-2.5 transition-all ${
                          type === 'CREACION' ? classes.bg : 'bg-transparent group-hover:bg-gray-50/50'
                        }`}>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-bold">
                            {type === 'ADJUNTOS' && <Icon name="file-text" className="inline h-3 w-3 mr-1 text-emerald-500" />}
                            {type === 'ESTADO' && <Icon name="arrow-right" className="inline h-3 w-3 mr-1 text-rose-500" />}
                            {cleanDetalle}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL NOTAS (TRAZABILIDAD) */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h4 className="text-sm font-bold text-gray-900 uppercase">Nueva Nota de Seguimiento</h4>
              <button onClick={() => setShowNoteModal(false)} className="text-gray-400 hover:text-gray-600"><Icon name="x" className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Registrar actualización comercial, acuerdos de reunión, etc..."
                className="w-full border-gray-300 rounded-xl p-3 text-sm focus:ring-indigo-500 min-h-[120px] bg-gray-50 shadow-inner"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex space-x-3">
              <button onClick={() => {
                if (newNote.trim()) {
                  setNotes([...notes, { content: newNote, date: new Date().toLocaleDateString() }]);
                  setNewNote('');
                  setShowNoteModal(false);
                }
              }} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold uppercase hover:bg-indigo-700 transition-all shadow-md">
                Guardar
              </button>
              <button onClick={() => setShowNoteModal(false)} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs font-bold uppercase hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENERAR COPIA */}
      {showCopyModal && (
        <div className="fixed top-6 right-6 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-[360px] border border-gray-100/80 overflow-hidden font-sans">
            <div className="px-4 py-2.5 bg-amber-50/50 border-b border-amber-100/60 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white rounded-lg border border-amber-200 text-amber-600">
                  <Icon name="copy" className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-wider">Generar Copia de Cotización</h4>
              </div>
              <button onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <Icon name="x" className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-[10px] text-gray-500 leading-tight">Complete los siguientes campos. Estos datos afectarán al nuevo código comercial generado.</p>

              {/* Referencia */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Referencia *</label>
                <input
                  type="text"
                  placeholder="Ej: Suministro de materiales para mina"
                  className="w-full border-none bg-slate-50/60 hover:bg-slate-100/40 rounded-full h-8 px-3 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/25 transition-all text-slate-700 font-bold"
                  value={copyReferencia}
                  onChange={(e) => setCopyReferencia(e.target.value)}
                />
              </div>

              {/* Área */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Área *</label>
                <select
                  className="w-full border-none bg-slate-50/60 hover:bg-slate-100/40 rounded-full h-8 px-3 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/25 transition-all text-slate-700 font-bold appearance-none cursor-pointer"
                  value={copyIdArea}
                  onChange={(e) => setCopyIdArea(e.target.value)}
                >
                  <option value="">Seleccione Área</option>
                  {areasOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.nombre.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Cliente */}
              <div className="space-y-1 relative z-30">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Cliente *</label>
                <div className="w-full border-none bg-slate-50/60 hover:bg-slate-100/40 focus-within:bg-white rounded-full h-8 px-3 text-xs outline-none focus-within:ring-2 focus-within:ring-amber-500/25 transition-all flex items-center">
                  <ClienteAutocomplete
                    value={copyClienteQuery}
                    initialId={copyIdCliente}
                    onSelect={(cliente) => {
                      setCopyIdCliente(cliente.id_cliente || null);
                      setCopyClienteNombre(cliente.nombre || "");
                      setCopyClienteQuery(cliente.nombre || "");
                      setCopyIdRepresentante(null);
                      setCopyRepresentanteNombre("");
                      setCopyEncargadoQuery("");
                    }}
                  />
                </div>
              </div>

              {/* Representante */}
              <div className="space-y-1 relative z-20">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Representante *</label>
                <div className="w-full border-none bg-slate-50/60 hover:bg-slate-100/40 focus-within:bg-white rounded-full h-8 px-3 text-xs outline-none focus-within:ring-2 focus-within:ring-amber-500/25 transition-all flex items-center">
                  <RepresentanteAutocomplete
                    value={copyEncargadoQuery}
                    clienteId={copyIdCliente}
                    initialId={copyIdRepresentante}
                    isReadOnly={!copyIdCliente}
                    onSelect={(enc) => {
                      setCopyIdRepresentante(enc.id_representante || null);
                      setCopyRepresentanteNombre(enc.nombre_representante || "");
                      setCopyEncargadoQuery(enc.nombre_representante || "");
                    }}
                  />
                </div>
              </div>

              {/* Tipo */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tipo *</label>
                <select
                  className="w-full border-none bg-slate-50/60 hover:bg-slate-100/40 rounded-full h-8 px-3 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/25 transition-all text-slate-700 font-bold appearance-none cursor-pointer"
                  value={copyIdTipo}
                  onChange={(e) => {
                    setCopyIdTipo(e.target.value);
                    if (e.target.value !== "V") {
                      setCopyTipoVenta("");
                    }
                  }}
                >
                  <option value="">Seleccione Tipo</option>
                  {tipoOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.nombre.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Tipo Venta (condicional si tipo es Venta "V") */}
              {copyIdTipo === "V" && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tipo Venta *</label>
                  <select
                    className="w-full border-none bg-slate-50/60 hover:bg-slate-100/40 rounded-full h-8 px-3 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/25 transition-all text-slate-700 font-bold appearance-none cursor-pointer"
                    value={copyTipoVenta}
                    onChange={(e) => setCopyTipoVenta(e.target.value)}
                  >
                    <option value="">Seleccione Tipo Venta</option>
                    {tipoVentaOptions.map(o => (
                      <option key={o.id} value={o.id}>{o.nombre.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-end items-center gap-3">
              <button
                onClick={() => setShowCopyModal(false)}
                className="whitespace-nowrap text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const payload = {
                    referencia: copyReferencia,
                    id_area: copyIdArea,
                    id_cliente: copyIdCliente,
                    id_representante: copyIdRepresentante,
                    id_tipo: copyIdTipo,
                    tipo_venta: copyIdTipo === "V" ? copyTipoVenta : null
                  };

                  // Validaciones básicas
                  if (!payload.referencia || !payload.id_area || !payload.id_cliente || !payload.id_representante || !payload.id_tipo) {
                    toast.warn("Por favor complete todos los campos requeridos.");
                    return;
                  }
                  if (payload.id_tipo === "V" && !payload.tipo_venta) {
                    toast.warn("Por favor seleccione el tipo de venta.");
                    return;
                  }

                  copiarCotizacion.mutate(payload);
                  setShowCopyModal(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-[9px] font-black rounded-xl uppercase shadow-md shadow-amber-200 hover:bg-amber-700 transition-all active:scale-95 whitespace-nowrap"
                disabled={copiarCotizacion.isPending}
              >
                {copiarCotizacion.isPending ? (
                  <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirmar Copia</span>
                    <Icon name="arrow-right" className="h-3 w-3 opacity-70" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INPUT XLS IMPORT */}
      <input
        type="file"
        ref={xlsInputRef}
        style={{ display: 'none' }}
        accept=".xlsx, .xls"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file && xlsImportGrupoActivo) {
            handleImportarDesdeXLS(file, xlsImportGrupoActivo, data?.tipo_cambio || 1);
          }
          e.target.value = '';
        }}
      />

      {/* REPORTE DE SUMINISTROS */}
      {reporteSuministrosOpen && createPortal(
        <div 
          onClick={() => setReporteSuministrosOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 transition-all"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 transition-all duration-300"
            style={{
              height: reporteHeight ? `${Math.min(window.innerHeight * 0.88, reporteHeight + 160)}px` : '350px'
            }}
          >
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">
                  Previsualización del Reporte Oficial
                </h3>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">
                  Módulo Suministros • Cotización N° {numReg}
                </p>
              </div>
              
              {/* Botón Cerrar */}
              <button 
                onClick={() => setReporteSuministrosOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600 bg-slate-100 border border-slate-200/60"
                title="Cerrar Previsualización"
              >
                <LucideIcons.X className="h-4 w-4" />
              </button>
            </div>

            {/* Cuerpo del Modal con Iframe */}
            <div className="flex-1 bg-slate-50 p-4 overflow-hidden relative flex items-center justify-center">
              {reporteLoading && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Preparando reporte...</span>
                </div>
              )}
              <iframe 
                src={`${api.defaults.baseURL}/cotizaciones/reporte-suministros-html/${numReg}/`}
                className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-sm"
                title="Reporte de Suministros Oficial"
                scrolling={reporteHeight && (reporteHeight + 160 < window.innerHeight * 0.88) ? "no" : "auto"}
                style={{ overflow: reporteHeight && (reporteHeight + 160 < window.innerHeight * 0.88) ? 'hidden' : 'auto' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* REPORTE DE SERVICIOS */}
      {reporteServiciosOpen && createPortal(
        <div 
          onClick={() => setReporteServiciosOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 transition-all"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 transition-all duration-300"
            style={{
              height: reporteHeight ? `${Math.min(window.innerHeight * 0.88, reporteHeight + 160)}px` : '350px'
            }}
          >
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">
                  Previsualización del Reporte de Servicios
                </h3>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">
                  Módulo Servicios • Cotización N° {numReg}
                </p>
              </div>
              
              {/* Botón Cerrar */}
              <button 
                onClick={() => setReporteServiciosOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600 bg-slate-100 border border-slate-200/60"
                title="Cerrar Previsualización"
              >
                <LucideIcons.X className="h-4 w-4" />
              </button>
            </div>

            {/* Cuerpo del Modal con el Iframe apuntando al endpoint de Servicios */}
            <div className="flex-1 bg-slate-50 p-4 overflow-hidden relative flex items-center justify-center">
              {reporteLoading && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Preparando reporte...</span>
                </div>
              )}
              <iframe 
                src={`${api.defaults.baseURL}/cotizaciones/reporte-servicios-html/${numReg}/`}
                className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-sm"
                title="Reporte de Servicios Oficial"
                scrolling={reporteHeight && (reporteHeight + 160 < window.innerHeight * 0.88) ? "no" : "auto"}
                style={{ overflow: reporteHeight && (reporteHeight + 160 < window.innerHeight * 0.88) ? 'hidden' : 'auto' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/*  REPORTE DETALLADO */}
      {reporteDetalladoOpen && createPortal(
        <div 
          onClick={() => setReporteDetalladoOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 transition-all"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 transition-all duration-300"
            style={{
              height: reporteHeight ? `${Math.min(window.innerHeight * 0.88, reporteHeight + 140)}px` : '350px'
            }}
          >
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">
                  Reporte de Cotización Detallado
                </h3>
              </div>
              <button 
                onClick={() => setReporteDetalladoOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600 bg-slate-100"
              >
                <LucideIcons.X className="h-4 w-4" />
              </button>
            </div>

            {/* CUERPO: El iframe usa exactamente tu PATH de Django */}
            <div className="flex-1 bg-slate-50 p-4 overflow-hidden relative flex items-center justify-center">
              {reporteLoading && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Preparando reporte...</span>
                </div>
              )}
              <iframe 
                src={`${api.defaults.baseURL}/cotizaciones/reporte-detallado/${numReg}/`}
                className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-sm"
                title="Reporte Cliente Detallado"
                scrolling={reporteHeight && (reporteHeight + 140 < window.innerHeight * 0.88) ? "no" : "auto"}
                style={{ overflow: reporteHeight && (reporteHeight + 140 < window.innerHeight * 0.88) ? 'hidden' : 'auto' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/*  REPORTE RESUMEN */}
      {reporteResumenOpen && createPortal(
        <div 
          onClick={() => setReporteResumenOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 transition-all"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 transition-all duration-300"
            style={{
              height: reporteHeight ? `${Math.min(window.innerHeight * 0.88, reporteHeight + 140)}px` : '350px'
            }}
          >
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">
                  Reporte de Cotización Resumen
                </h3>
              </div>
              <button 
                onClick={() => setReporteResumenOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600 bg-slate-100"
              >
                <LucideIcons.X className="h-4 w-4" />
              </button>
            </div>

            {/* CUERPO: El iframe usa exactamente tu PATH de Django */}
            <div className="flex-1 bg-slate-50 p-4 overflow-hidden relative flex items-center justify-center">
              {reporteLoading && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Preparando reporte...</span>
                </div>
              )}
              <iframe 
                src={`${api.defaults.baseURL}/cotizaciones/reporte-resumen/${numReg}/`}
                className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-sm"
                title="Reporte Cliente Resumen"
                scrolling={reporteHeight && (reporteHeight + 140 < window.innerHeight * 0.88) ? "no" : "auto"}
                style={{ overflow: reporteHeight && (reporteHeight + 140 < window.innerHeight * 0.88) ? 'hidden' : 'auto' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* REPORTE PDF PREVIEW & WORD DOWNLOAD */}
      {reportePdfOpen && createPortal(
        <div 
          onClick={() => setReportePdfOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 transition-all"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 transition-all duration-300"
            style={{
              height: '88vh'
            }}
          >
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">
                  Previsualización de Propuesta Económica
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.open(`${api.defaults.baseURL}/cotizaciones/${numReg}/pdf/`, '_blank')}
                  className="flex items-center px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-black text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-sm transition-all uppercase group"
                >
                  <Icon name="file-text" className="h-3.5 w-3.5 mr-1.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  Descargar PDF
                </button>

                <button
                  onClick={() => window.open(`${api.defaults.baseURL}/cotizaciones/cotizacion/word/${numReg}/`, '_blank')}
                  className="flex items-center px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[10px] font-black text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:shadow-sm transition-all uppercase group"
                >
                  <LucideIcons.FileDown className="h-3.5 w-3.5 mr-1.5 text-blue-600 group-hover:scale-110 transition-transform" />
                  Descargar Word
                </button>

                <button 
                  onClick={() => setReportePdfOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600 bg-slate-100 ml-2"
                >
                  <LucideIcons.X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* CUERPO: El iframe usa exactamente tu PATH de Django */}
            <div className="flex-1 bg-slate-50 p-4 overflow-hidden relative flex items-center justify-center">
              {reporteLoading && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Preparando reporte...</span>
                </div>
              )}
              <iframe 
                src={`${api.defaults.baseURL}/cotizaciones/${numReg}/pdf-preview/`}
                className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-sm"
                title="Previsualización de Cotización PDF"
                scrolling="auto"
                style={{ overflow: 'auto' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Context Menu for right-click on Autocompletes */}
      {contextMenuOpen && contextMenuPos && (
        <div
          style={{
            position: 'fixed',
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            width: 1,
            height: 1,
            pointerEvents: 'none',
            zIndex: 9999
          }}
        >
          <ActionMenu
            open={contextMenuOpen}
            onOpenChange={setContextMenuOpen}
            title={contextMenuType === 'cliente' ? "Opciones Cliente" : "Opciones Encargado"}
            align="start"
            customTrigger={<div className="w-0 h-0" />}
            options={[
              {
                label: contextMenuType === 'cliente' ? "Ver Ficha de Cliente" : "Ver Ficha de Encargado",
                icon: LucideIcons.UserCheck,
                hasSubmenu: true,
                onHover: () => {
                  if (contextMenuType === 'cliente') {
                    handleVerDetalles('cliente', data.id_cliente, data.cliente_nombre);
                  } else {
                    handleVerDetalles('representante', data.id_representante, data.representante_nombre);
                  }
                },
                onClick: () => {
                  if (contextMenuType === 'cliente') {
                    handleVerDetalles('cliente', data.id_cliente, data.cliente_nombre);
                  } else {
                    handleVerDetalles('representante', data.id_representante, data.representante_nombre);
                  }
                },
                submenuContent: (
                  <div className="w-fit min-w-[320px] max-w-[450px] p-3 text-left">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 select-none">
                      <LucideIcons.Info className="h-3.5 w-3.5 text-indigo-500" />
                      {contextMenuType === 'cliente' ? "Detalles de la Empresa" : "Información de Contacto"}
                    </h4>
                    {modalLoading ? (
                      <div className="flex flex-col items-center justify-center py-6 space-y-2">
                        <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Cargando...</span>
                      </div>
                    ) : (
                      contextMenuType === 'cliente' ? (
                        <div className="space-y-2.5 animate-in fade-in duration-200">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Nombre / Razón Social</span>
                            <span className="text-[10px] font-black text-slate-800 uppercase block leading-tight">{data.cliente_nombre || '---'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">RUC</span>
                              <span className="text-[10px] font-black text-slate-800">{modalData?.ruc || '---'}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Tipo</span>
                              <span className="text-[10px] font-black text-slate-800 uppercase">
                                {modalData?.tipo === 0 || modalData?.tipo === '0'
                                  ? 'Cliente'
                                  : modalData?.tipo === 1 || modalData?.tipo === '1'
                                    ? 'Proveedor'
                                    : '---'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5 animate-in fade-in duration-200">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Nombre</span>
                            <span className="text-[10px] font-black text-slate-800 uppercase block leading-tight">{data.representante_nombre || '---'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Empresa</span>
                              <span className="text-[10px] font-black text-slate-800 uppercase block leading-tight">{data.cliente_nombre || '---'}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Cargo</span>
                              <span className="text-[10px] font-black text-slate-800 uppercase">{data.representante_cargo || '---'}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Móvil</span>
                              <span className="text-[10px] font-black text-slate-800">{data.representante_movil || '---'}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Correo</span>
                              <span className="text-[10px] font-black text-slate-800 lowercase block truncate">{data.representante_correo || '---'}</span>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )
              },
              {
                label: "Análisis de Cotizaciones",
                icon: LucideIcons.BarChart3,
                hasSubmenu: true,
                onHover: () => {
                  if (contextMenuType === 'cliente') {
                    handleVerDetalles('cliente', data.id_cliente, data.cliente_nombre);
                  } else {
                    handleVerDetalles('representante', data.id_representante, data.representante_nombre);
                  }
                },
                onClick: () => {
                  if (contextMenuType === 'cliente') {
                    handleVerDetalles('cliente', data.id_cliente, data.cliente_nombre);
                  } else {
                    handleVerDetalles('representante', data.id_representante, data.representante_nombre);
                  }
                },
                submenuContent: (
                  <div className="w-fit min-w-[340px] max-w-[480px] p-3 text-left">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 select-none">
                      <LucideIcons.BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
                      Historial y Métricas Comerciales
                    </h4>
                    {modalLoading ? (
                      <div className="flex flex-col items-center justify-center py-6 space-y-2">
                        <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Cargando...</span>
                      </div>
                    ) : analysisData ? (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex flex-col justify-between animate-in fade-in duration-300">
                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Cotizaciones</span>
                            <span className="text-xs font-black text-slate-800">{analysisData.stats.totalCount}</span>
                          </div>

                          <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2 flex flex-col justify-between animate-in fade-in duration-300">
                            <span className="text-[8px] font-black text-emerald-600 uppercase block tracking-wider">Monto Total</span>
                            <span className="text-[10px] font-black text-emerald-700 truncate">
                              {new Intl.NumberFormat('es-PE', { style: 'currency', currency: data?.tipo_moneda === 'S' || data?.tipo_moneda === 'PEN' ? 'PEN' : 'USD' }).format(analysisData.stats.totalAmount)}
                            </span>
                          </div>

                          <div className="bg-teal-50/50 border border-teal-100/50 rounded-xl p-2 flex flex-col justify-between animate-in fade-in duration-300">
                            <span className="text-[8px] font-black text-teal-600 uppercase block tracking-wider">Aprobadas</span>
                            <span className="text-xs font-black text-teal-700">{analysisData.stats.wonCount}</span>
                          </div>

                          <div className="bg-amber-50/50 border border-amber-100/50 rounded-xl p-2 flex flex-col justify-between animate-in fade-in duration-300">
                            <span className="text-[8px] font-black text-amber-600 uppercase block tracking-wider">Tasa Éxito</span>
                            <span className="text-xs font-black text-amber-700">{analysisData.stats.successRate}%</span>
                          </div>

                          <div className="bg-sky-50/50 border border-sky-100/50 rounded-xl p-2 flex flex-col justify-between animate-in fade-in duration-300">
                            <span className="text-[8px] font-black text-sky-600 uppercase block tracking-wider">Monto Adjudicado</span>
                            <span className="text-[10px] font-black text-sky-700 truncate">
                              {new Intl.NumberFormat('es-PE', { style: 'currency', currency: data?.tipo_moneda === 'S' || data?.tipo_moneda === 'PEN' ? 'PEN' : 'USD' }).format(analysisData.stats.wonAmount)}
                            </span>
                          </div>

                          <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-2 flex flex-col justify-between animate-in fade-in duration-300">
                            <span className="text-[8px] font-black text-indigo-600 uppercase block tracking-wider">Media (Promedio)</span>
                            <span className="text-[10px] font-black text-indigo-700 truncate">
                              {new Intl.NumberFormat('es-PE', { style: 'currency', currency: data?.tipo_moneda === 'S' || data?.tipo_moneda === 'PEN' ? 'PEN' : 'USD' }).format(analysisData.stats.averageAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-inner max-h-[140px] overflow-y-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-2 py-1 text-[8px] font-black text-slate-400 uppercase tracking-wider">Código</th>
                                <th className="px-2 py-1 text-[8px] font-black text-slate-400 uppercase tracking-wider text-center">Estado</th>
                                <th className="px-2 py-1 text-[8px] font-black text-slate-400 uppercase tracking-wider text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {analysisData.cotizaciones.map((coti) => {
                                const isWon = coti.id_estado === 1 || coti.id_estado === '1' || coti.id_estado?.id_estado === 1 || coti.id_estado?.id_estado === '1' || coti.estado_nombre?.toLowerCase() === 'adjudicado' || coti.estado_nombre?.toLowerCase() === 'adjudicada';
                                const isLost = coti.id_estado === 3 || coti.id_estado === '3' || coti.id_estado?.id_estado === 3 || coti.id_estado?.id_estado === '3' || coti.estado_nombre?.toLowerCase() === 'perdida';
                                const isPending = coti.id_estado === 2 || coti.id_estado === '2' || coti.id_estado?.id_estado === 2 || coti.id_estado?.id_estado === '2' || coti.estado_nombre?.toLowerCase() === 'pendiente';
                                const isFollowing = coti.id_estado === 6 || coti.id_estado === '6' || coti.id_estado?.id_estado === 6 || coti.id_estado?.id_estado === '6' || coti.estado_nombre?.toLowerCase() === 'en seguimiento';

                                let badgeClass = "text-slate-600 bg-slate-50 border border-slate-100";
                                if (isWon) badgeClass = "text-emerald-600 bg-emerald-50 border border-emerald-100";
                                else if (isLost) badgeClass = "text-rose-600 bg-rose-50 border border-rose-100";
                                else if (isPending) badgeClass = "text-amber-600 bg-amber-50 border border-amber-100";
                                else if (isFollowing) badgeClass = "text-blue-600 bg-blue-50 border border-blue-100";

                                return (
                                  <tr key={coti.id_registro} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-2 py-1.5 text-[8px] font-black text-slate-800 uppercase">{coti.codigo || 'SIN CÓDIGO'}</td>
                                    <td className="px-2 py-1.5 text-center">
                                      <span className={`inline-block px-1 rounded text-[7px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                        {coti.estado_nombre || '---'}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1.5 text-[8px] font-black text-slate-800 text-right">
                                      {new Intl.NumberFormat('es-PE', { style: 'currency', currency: coti.tipo_moneda === 'S' || coti.tipo_moneda === 'PEN' ? 'PEN' : 'USD' }).format(coti.total_cotizacion || coti.total || 0)}
                                    </td>
                                  </tr>
                                );
                              })}
                              {analysisData.cotizaciones.length === 0 && (
                                <tr>
                                  <td colSpan="3" className="text-center text-[8px] text-slate-400 py-3 font-bold uppercase tracking-wider">
                                    Sin registros.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-[8px] text-slate-400 py-3 font-bold uppercase tracking-wider">No se encontraron cotizaciones.</div>
                    )}
                  </div>
                )
              }
            ]}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTES AUXILIARES ORDENABLES (Definidos fuera para evitar re-montaje)
// ============================================================================
const SortableWrapper = ({ id, data, children, className = "" }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data });

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={className}>
      {typeof children === 'function' ? children({ listeners, attributes, isDragging }) : children}
    </div>
  );
};

const SuggestionsList = ({
  type,
  targetKey,
  suggestions,
  suggestionsType,
  suggestionsKey,
  focusedSuggestionIndex,
  setFocusedSuggestionIndex,
  handleSelectSuggestion,
  formatMoney,
}) => {
  if (suggestions.length === 0 || suggestionsType !== type || suggestionsKey !== targetKey) {
    return null;
  }

  if (suggestions[0]?.isWarning) {
    return (
      <div className="absolute left-0 mt-1 min-w-[340px] max-w-[480px] p-3 bg-amber-50 border border-amber-200 rounded-xl shadow-xl z-50 text-left animate-in fade-in slide-in-from-top-1 duration-150 select-none">
        <span className="text-[11px] font-black text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
          {suggestions[0].message}
        </span>
      </div>
    );
  }

  return (
    <div className="absolute left-0 mt-1 min-w-[340px] max-w-[480px] max-h-[220px] overflow-y-auto bg-white border border-indigo-100 rounded-xl shadow-xl z-50 text-left divide-y divide-gray-50 border-t-2 border-t-indigo-500 animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="px-3 py-1.5 bg-indigo-50/50 text-[9px] font-black text-indigo-500 uppercase tracking-widest flex justify-between select-none">
        <span>Sugerencias de Catálogo</span>
        <span>{suggestions.length} items</span>
      </div>
      {suggestions.map((sug, idx) => {
        const isFocused = idx === focusedSuggestionIndex;
        return (
          <div
            key={`${sug.proveedor}-${sug.codigo}-${idx}`}
            onMouseDown={() => handleSelectSuggestion(sug, type, targetKey)}
            onMouseEnter={() => setFocusedSuggestionIndex(idx)}
            className={cn(
              "px-3 py-2 cursor-pointer transition-all flex flex-col gap-0.5",
              isFocused ? "bg-indigo-50 text-indigo-900 font-bold" : "hover:bg-gray-50 text-gray-700"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-black tracking-tight text-gray-900">
                {sug.codigo}
              </span>
              <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-teal-50 border border-teal-100 text-teal-600 uppercase tracking-tighter">
                {sug.marca || "Otros"}
              </span>
            </div>
            <span className="text-[10px] text-gray-500 line-clamp-1 leading-normal font-semibold">
              {sug.descripcion}
            </span>
            <div className="flex items-center justify-between text-[9px] text-gray-400 mt-0.5 font-bold uppercase">
              <span>Unid: {sug.unidad || "UNI"}</span>
              <span className="text-gray-600 font-black">
                Costo: {formatMoney(sug.costoPrecio)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SortableItemRow = ({
  item,
  isReadOnly,
  editingItemId,
  editForm,
  setEditForm,
  startEditItem,
  handleEliminarItem,
  saveEditItem,
  cancelEditItem,
  formatMoney,
  formatMoneySymbol,
  proveedores = [],
  setProveedores,
  tcamb = 1,
  handleRowChange,
  handleEditRowLookup,
  normalizarProductoDB,
  recalculateRowValues,
  tipoMoneda,
  isVenta,
  tipoVenta,
  catalogoVersion,
  unidadesMedida = [],
  setUnidadesMedida,
  activeEditField,
  handleTriggerCreateProduct,
  renderInlineProductCreateForm
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `item-${item.id_suministro}`,
    data: {
      type: 'item',
      id_suministro: item.id_suministro
    }
  });

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const itemId = item.id_suministro || item.id;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimer = useRef(null);
  const deleteConfirmRef = useRef(null);
  const rowRef = useRef(null);

  const setMergedRef = (el) => {
    setNodeRef(el);
    rowRef.current = el;
  };

  const adjustHeight = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (editingItemId === itemId && activeEditField) {
      const timer = setTimeout(() => {
        const rowEl = rowRef.current;
        if (rowEl) {
          let input = rowEl.querySelector(`[data-field="${activeEditField}"], [name="${activeEditField}"]`);
          if (input && input.tagName !== 'INPUT' && input.tagName !== 'TEXTAREA' && input.tagName !== 'SELECT') {
            input = input.querySelector('input, textarea, select') || input;
          }
          if (input) {
            input.focus();
            if (typeof input.select === 'function') {
              input.select();
            }
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [editingItemId, itemId, activeEditField]);

  useEffect(() => {
    if (editingItemId !== itemId) return;

    const handleClickOutside = (e) => {
      const rowEl = rowRef.current;
      if (rowEl && rowEl.contains(e.target)) return;

      if (e.target.closest(
        '[data-radix-popper-content-wrapper], ' +
        '[data-radix-portal], ' +
        '.Toastify, ' +
        '.react-datepicker-popper, ' +
        '.quill, ' +
        '.ql-snow, ' +
        '[role="dialog"], ' +
        '[role="menu"], ' +
        '[role="listbox"]'
      )) {
        return;
      }

      if (!document.body.contains(e.target)) {
        return;
      }

      cancelEditItem();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingItemId, itemId, cancelEditItem]);

  useEffect(() => {
    if (editingItemId === itemId) {
      setTimeout(() => {
        if (rowRef.current) {
          rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [editingItemId, itemId]);

  useEffect(() => {
    if (!showDeleteConfirm) return;

    const handleClickOutside = (e) => {
      if (deleteConfirmRef.current && !deleteConfirmRef.current.contains(e.target)) {
        setShowDeleteConfirm(false);
      }
    };

    const handleKeyDownGlobal = (e) => {
      if (e.key === "Escape") {
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDownGlobal);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDownGlobal);
    };
  }, [showDeleteConfirm]);

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimer.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  const proveedoresOptions = useMemo(() => {
    const list = (proveedores || []).map(p => ({
      id: String(p.id_marca).padStart(2, '0'),
      nombre: p.nombre
    }));

    if (item.id_marca && !list.some(p => parseInt(p.id, 10) === item.id_marca)) {
      list.push({
        id: String(item.id_marca).padStart(2, '0'),
        nombre: item.marca_nombre || `Marca #${item.id_marca}`
      });
    }

    if (editForm.id_marca && !list.some(p => parseInt(p.id, 10) === editForm.id_marca)) {
      list.push({
        id: String(editForm.id_marca).padStart(2, '0'),
        nombre: editForm.marca_nombre || editForm.marca || `Marca #${editForm.id_marca}`
      });
    }

    return list;
  }, [proveedores, item.id_marca, item.marca_nombre, editForm.id_marca, editForm.marca_nombre, editForm.marca]);

  const getFocusableInputs = () => {
    const rowEl = rowRef.current;
    if (!rowEl) return [];
    const selectors = [
      'select[data-field="id_marca"]',
      'div[data-field="codigo_item"] input',
      'textarea[data-field="descripcion"]',
      'textarea[data-field="observacion"]',
      'input[data-field="cantidad"]',
      'input[data-field="costo_precio"]',
      'input[data-field="porcentaje_utilidad"]'
    ];
    return selectors
      .map(sel => rowEl.querySelector(sel))
      .filter(el => el !== null && !el.disabled);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditItem();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditItem();
      return;
    }
    if (e.key === 'Alt') {
      e.preventDefault();
      e.stopPropagation();
      lastFocusedInput = e.target;
      const detailsButton = rowRef.current?.querySelector("button[title='Detalles Adicionales']");
      if (detailsButton) {
        detailsButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
        detailsButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        detailsButton.click();
      }
      return;
    }

    // Arrow Navigation
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const isSelectOrNumber = e.target.tagName === 'SELECT' || e.target.type === 'number';
      const isAtStart = isSelectOrNumber || e.target.selectionStart === 0;
      const isAtEnd = isSelectOrNumber || e.target.selectionEnd === e.target.value.length;

      let fieldName = e.target.getAttribute('data-field') || e.target.getAttribute('name');
      if (!fieldName) {
        const parentWithField = e.target.closest('[data-field]');
        if (parentWithField) {
          fieldName = parentWithField.getAttribute('data-field');
        }
      }
      if (!fieldName) return;

      const order = ['id_marca', 'codigo_item', 'descripcion', 'observacion', 'cantidad', 'costo_precio', 'porcentaje_utilidad'];
      const idx = order.indexOf(fieldName);

      if (e.key === 'ArrowRight' && isAtEnd) {
        if (idx !== -1 && idx < order.length - 1) {
          e.preventDefault();
          const inputs = getFocusableInputs();
          const nextField = order[idx + 1];
          const nextInput = inputs.find(el => {
            const elField = el.getAttribute('data-field') || el.getAttribute('name') || el.closest('[data-field]')?.getAttribute('data-field');
            return elField === nextField;
          });
          if (nextInput) {
            nextInput.focus();
            if (typeof nextInput.select === 'function') {
              nextInput.select();
            }
          }
        }
      } else if (e.key === 'ArrowLeft' && isAtStart) {
        if (idx > 0) {
          e.preventDefault();
          const inputs = getFocusableInputs();
          const prevField = order[idx - 1];
          const prevInput = inputs.find(el => {
            const elField = el.getAttribute('data-field') || el.getAttribute('name') || el.closest('[data-field]')?.getAttribute('data-field');
            return elField === prevField;
          });
          if (prevInput) {
            prevInput.focus();
            if (typeof prevInput.select === 'function') {
              prevInput.select();
            }
          }
        }
      }
    }
  };

  const handleProductCreatedEditLocal = (newProd) => {
    const normalizado = normalizarProductoDB(newProd, tipoMoneda, tcamb, Number(editForm.cantidad || 1));
    setEditForm(prev => {
      const updated = {
        ...prev,
        proveedor: normalizado.proveedor,
        id_marca: newProd.id_marca,
        codigo_item: normalizado.codigo,
        descripcion: normalizado.descripcion,
        tipo_unidad: normalizado.unidad,
        costo_precio: normalizado.costoPrecio,
        porcentaje_utilidad: prev.porcentaje_utilidad || 20
      };
      return recalculateRowValues(updated, 'porcentaje_utilidad');
    });
  };

  const handleProductCancelEditLocal = (cancelledCode) => {
    setEditForm(prev => ({
      ...prev,
      codigo_item: cancelledCode
    }));
  };

  if (editingItemId === itemId) {
    return (
      <>
        <tr ref={setMergedRef} style={style} className="bg-indigo-50/50">
        <td className="px-2 text-center align-middle">
          <Icon name="grip-vertical" className="h-3.5 w-3.5 text-gray-200 mx-auto" />
        </td>
        {/* Código / Marca */}
        <td className="px-3 py-1">
          <div className="flex flex-col gap-1 items-center justify-center text-center relative">
            <MarcaAutocomplete
              idMarca={editForm.id_marca}
              proveedores={proveedores}
              onSelect={(brand) => {
                const code = String(brand.id_marca).padStart(2, '0');
                setEditForm(prev => ({
                  ...prev,
                  proveedor: code,
                  id_marca: brand.id_marca
                }));
              }}
              onAddBrand={(newBrand) => {
                setProveedores(prev => [...prev, newBrand]);
              }}
              onKeyDown={handleKeyDown}
            />
            <div data-field="codigo_item" className="w-full">
              <ProductoAutocomplete
                value={editForm.codigo_item || ""}
                idMarca={editForm.id_marca}
                tcamb={tcamb}
                tipoMoneda={tipoMoneda}
                catalogoVersion={catalogoVersion}
                onKeyDown={handleKeyDown}
                onTriggerCreate={(code) => handleTriggerCreateProduct(code, `edit-${item.id_suministro}`, editForm.id_marca)}
                onSelect={(prod) => {
                  if (prod.isCustom) {
                    setEditForm(prev => ({ ...prev, codigo_item: prod.codigo }));
                  } else {
                    const normalizado = normalizarProductoDB(prod, tipoMoneda, tcamb, Number(editForm.cantidad || 1));
                    setEditForm(prev => {
                      const updated = {
                        ...prev,
                        proveedor: normalizado.proveedor,
                        id_marca: prod.id_marca,
                        codigo_item: normalizado.codigo,
                        descripcion: normalizado.descripcion,
                        tipo_unidad: normalizado.unidad,
                        costo_precio: normalizado.costoPrecio,
                        porcentaje_utilidad: prev.porcentaje_utilidad || 20
                      };
                      return recalculateRowValues(updated, 'porcentaje_utilidad');
                    });
                  }
                }}
              />
            </div>
          </div>
        </td>
        {/* Descripción / Observación */}
        <td className="px-3 py-1">
          <div className="flex flex-col gap-1 items-center justify-center text-center">
            <textarea
              ref={adjustHeight}
              data-field="descripcion"
              className="w-full text-[11px] border border-gray-300 rounded px-1.5 py-0.5 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center resize-none overflow-hidden h-auto"
              value={editForm.descripcion || ''}
              placeholder="Descripción..."
              onKeyDown={handleKeyDown}
              onChange={e => {
                setEditForm({ ...editForm, descripcion: e.target.value.toUpperCase() });
                adjustHeight(e.target);
              }}
              rows={1}
            />
            <textarea
              ref={adjustHeight}
              data-field="observacion"
              className="w-full text-[9px] border border-gray-200 text-gray-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center resize-none overflow-hidden h-auto"
              value={editForm.observacion || ''}
              placeholder="Observación..."
              onKeyDown={handleKeyDown}
              onChange={e => {
                setEditForm({ ...editForm, observacion: e.target.value.toUpperCase() });
                adjustHeight(e.target);
              }}
              rows={1}
            />
          </div>
        </td>
        {/* Cantidad */}
        <td className="px-3 py-1">
          <input
            type="number"
            data-field="cantidad"
            className="w-full text-[11px] border border-gray-300 text-center rounded px-1 py-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
            value={editForm.cantidad === undefined || editForm.cantidad === null ? '' : editForm.cantidad}
            onChange={e => handleRowChange('cantidad', e.target.value, 'edit')}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyDown}
          />
        </td>
        {/* Costo Unitario */}
        <td className="px-3 py-1">
          <input
            type="text"
            placeholder="0.00"
            data-field="costo_precio"
            className="w-full text-[11px] border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
            value={editForm.costo_precio === undefined || editForm.costo_precio === null ? '' : editForm.costo_precio}
            onChange={(e) => handleDecimalChange(e, (val) => handleRowChange('costo_precio', val, 'edit'))}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyDown}
          />
        </td>
        {/* Envío */}
        {isVenta && (
          <td className="px-3 py-1 text-center">
            <div className="flex flex-col items-center justify-center text-center gap-1">
              <span className="text-[11px] font-bold text-gray-700">
                {formatMoneySymbol(Number(editForm.costo_envio || 0))}
              </span>
              {tipoVenta === "T" && (
                <span className="text-[9.5px] font-black text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-100">
                  {Number(editForm.porcentaje_envio || 0).toFixed(2)}%
                </span>
              )}
            </div>
          </td>
        )}
        {/* % Util */}
        <td className="px-3 py-1">
          <div className="flex flex-col gap-1 items-center justify-center text-center">
            {/* Monto de utilidad (ARRIBA) */}
            <span className="text-[11px] font-bold text-gray-700">
              {formatMoneySymbol(Number(editForm.utilidad || 0))}
            </span>

            {/* Porcentaje / Input (ABAJO) */}
            <div className="relative flex items-center justify-center w-full">
              <input
                type="text"
                data-field="porcentaje_utilidad"
                className="w-full text-[10px] border border-gray-300 text-center rounded px-1 py-0.5 font-medium text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                value={editForm.porcentaje_utilidad === undefined || editForm.porcentaje_utilidad === null ? '' : editForm.porcentaje_utilidad}
                onChange={(e) => handleDecimalChange(e, (val) => handleRowChange('porcentaje_utilidad', val, 'edit'))}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
              />
              <span className="absolute right-1 text-[9px] text-gray-400">%</span>
            </div>
          </div>
        </td>
        {/* Precio Venta */}
        <td className="px-3 py-1 text-center text-[11.5px] font-semibold text-gray-500">
          {formatMoney(Number(editForm.precio_venta || 0))}
        </td>
        {/* Venta Total */}
        <td className="px-3 py-1 text-center text-[11.5px] font-black text-gray-900">
          {formatMoney(Number(editForm.venta_total || 0))}
        </td>
        {/* Actions */}
        <td className="px-3 py-1">
          <div className="flex justify-center items-center gap-1">
            <ActionMenu
              title="Logística y Detalles del Ítem"
              align="end"
              closeOnSelect={false}
              contentClassName="min-w-[300px]"
              customTrigger={
                <button
                  type="button"
                  className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded shadow-sm transition-colors flex items-center justify-center"
                  title="Detalles Adicionales"
                >
                  <Icon name="ellipsis-vertical" className="h-3.5 w-3.5" />
                </button>
              }
            >
              <div 
                className="p-3 space-y-3 text-xs text-left"
                onKeyDown={handleDetailsKeyDown}
              >
                {/* U. Medida */}
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-gray-400 uppercase text-[9px]">U. Medida:</span>
                  <UnidadMedidaAutocomplete
                    idMedida={editForm.id_medida || editForm.id_unidad}
                    unidadesMedida={unidadesMedida}
                    onSelect={(unit) => {
                      setEditForm(prev => ({
                        ...prev,
                        id_medida: unit.id_medida,
                        tipo_unidad: unit.nombre
                      }));
                    }}
                    onAddMedida={(newUnit) => {
                      setUnidadesMedida(prev => [...prev, newUnit]);
                      setEditForm(prev => ({
                        ...prev,
                        id_medida: newUnit.id_medida,
                        tipo_unidad: newUnit.nombre
                      }));
                    }}
                  />
                </div>
                {/* Tiempo Entrega */}
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-gray-400 uppercase text-[9px]">Tiempo Entrega:</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="w-2/3 border border-gray-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-gray-700"
                      value={editForm.tiempo_entrega === undefined || editForm.tiempo_entrega === null ? "" : editForm.tiempo_entrega}
                      onChange={e => handleRowChange("tiempo_entrega", e.target.value, "edit")}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                    <select
                      className="w-1/3 border border-gray-200 rounded px-1 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-gray-700 bg-white"
                      value={editForm.id_unidad_tiempo_entrega || 1}
                      onChange={e => handleRowChange("id_unidad_tiempo_entrega", parseInt(e.target.value, 10), "edit")}
                    >
                      <option value={1}>Días</option>
                      <option value={2}>Semanas</option>
                      <option value={3}>Meses</option>
                    </select>
                  </div>
                </div>
                {/* Costo Envío */}
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-gray-400 uppercase text-[9px]">Costo Envío Unit.:</span>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 bg-white"
                    value={editForm.costo_envio === undefined || editForm.costo_envio === null ? "" : editForm.costo_envio}
                    disabled={tipoVenta === "T"}
                    onChange={(e) => handleDecimalChange(e, (val) => handleRowChange("costo_envio", val, "edit"))}
                    placeholder="0.00"
                  />
                </div>
                {/* Observación */}
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-gray-400 uppercase text-[9px]">Observación:</span>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700"
                    value={editForm.observacion || ""}
                    onChange={e => handleRowChange("observacion", e.target.value.toUpperCase(), "edit")}
                    placeholder="Observación..."
                  />
                </div>

                {/* RESUMEN DE VENTA */}
                {(() => {
                  const editCantidad = Number(editForm.cantidad || 0);
                  const editCostoPrecio = Number(editForm.costo_precio || 0);
                  const editCostoEnvio = Number(editForm.costo_envio || 0);
                  const editCostoConEnvio = Number(editForm.costo_con_envio || 0);
                  const editPrecioVenta = Number(editForm.precio_venta || 0);
                  const editVentaTotal = Number(editForm.venta_total || 0);
                  const editUtilidad = Number(editForm.utilidad || 0);

                  const costoTotal = editCostoPrecio * editCantidad;
                  const costoConEnvioPorUnidad = editCostoPrecio + editCostoEnvio;
                  const costoConEnvioTotal = editCostoConEnvio * editCantidad;
                  const precioVentaUnit = editPrecioVenta;
                  const ventaTotal = editVentaTotal;
                  const utilidadTotal = editUtilidad * editCantidad;

                  return (
                    <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3 space-y-2 shadow-inner mt-2">
                      <div className="flex items-center gap-2 text-teal-700">
                        <Icon name="trending-up" className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-tight">Resumen de Venta</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-100/50">
                          <span>Costo Total:</span>
                          <span className="font-semibold text-gray-700">{formatMoneySymbol(costoTotal)}</span>
                        </div>
                        {isVenta && (
                          <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-100/50">
                            <span>Costo c/ Envío: AA</span>
                            <span className="font-semibold text-gray-700">{formatMoneySymbol(costoConEnvioPorUnidad)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-100/50">
                          <span>Precio Venta:</span>
                          <span className="font-semibold text-gray-700">{formatMoneySymbol(precioVentaUnit)}</span>
                        </div>
                        <div className="flex justify-between items-center text-teal-800 py-0.5 border-b border-teal-100/50 font-black">
                          <span>Venta Total:</span>
                          <span className="text-teal-700 text-[12px]">{formatMoneySymbol(ventaTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-800 py-0.5 font-bold">
                          <span>Utilidad Total:</span>
                          <span className="text-emerald-600">{formatMoneySymbol(utilidadTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </ActionMenu>
          </div>
        </td>
      </tr>
      {renderInlineProductCreateForm && renderInlineProductCreateForm(`edit-${item.id_suministro}`, handleProductCreatedEditLocal, handleProductCancelEditLocal)}
      </>
    );
  }

  // Visualizar Renglón en la Tabla
  return (
    <tr
      ref={setMergedRef}
      style={style}
      {...attributes}
      className={cn(
        "hover:bg-gray-50 cursor-pointer group transition-all duration-150 border-b border-gray-100",
        isDragging && "bg-indigo-50/20 shadow-inner"
      )}
      onDoubleClick={() => !isReadOnly && startEditItem(item)}
    >
      {!isReadOnly ? (
        <td
          {...listeners}
          data-drag-handle
          className="px-2 text-center align-middle cursor-grab active:cursor-grabbing hover:bg-gray-100/50"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <Icon name="grip-vertical" className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 mx-auto transition-colors" />
        </td>
      ) : (
        <td 
          className="px-2 text-center align-middle cursor-default"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <Icon name="grip-vertical" className="h-3.5 w-3.5 text-gray-100 mx-auto" />
        </td>
      )}
      {/* P/N / Marca */}
      <td 
        className="px-3 py-1 text-center"
        onDoubleClick={(e) => {
          if (!isReadOnly) {
            e.stopPropagation();
            startEditItem(item, 'codigo_item');
          }
        }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <span 
            className="text-[12px] font-bold text-gray-900 cursor-pointer"
            onDoubleClick={(e) => {
              if (!isReadOnly) {
                e.stopPropagation();
                startEditItem(item, 'codigo_item');
              }
            }}
          >
            {item.codigo_item}
          </span>
          {item.marca_nombre && (
            <span 
              className="text-[9.5px] font-semibold text-teal-600 uppercase tracking-tighter cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  startEditItem(item, 'id_marca');
                }
              }}
            >
              {item.marca_nombre}
            </span>
          )}
        </div>
      </td>
      {/* Descripción / Observación */}
      <td 
        className="px-3 py-1 text-center"
        onDoubleClick={(e) => {
          if (!isReadOnly) {
            e.stopPropagation();
            startEditItem(item, 'descripcion');
          }
        }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-[12px] text-gray-600 font-semibold leading-tight line-clamp-2" title={item.descripcion}>
            {item.descripcion}
          </span>
          {item.observacion && (
            <span className="text-[9.5px] text-gray-400 italic mt-0.5">{item.observacion}</span>
          )}
        </div>
      </td>
      {/* Cantidad */}
      <td 
        className="px-3 py-1 text-[12px] text-gray-900 text-center font-bold"
        onDoubleClick={(e) => {
          if (!isReadOnly) {
            e.stopPropagation();
            startEditItem(item, 'cantidad');
          }
        }}
      >
        {item.cantidad}
      </td>
      {/* Costo Unitario */}
      <td 
        className="px-3 py-1 text-[12.5px] text-slate-700 font-semibold text-center"
        onDoubleClick={(e) => {
          if (!isReadOnly) {
            e.stopPropagation();
            startEditItem(item, 'costo_precio');
          }
        }}
      >
        {formatMoney(item.costo_precio)}
      </td>
      {/* Envío */}
      {isVenta && (
        <td 
          className="px-3 py-1 text-center text-[12.5px] text-slate-700 font-semibold"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center justify-center text-center gap-0.5">
            <span>{formatMoney(item.costo_envio)}</span>
            {tipoVenta === "T" && (
              <span className="text-[10px] font-black text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-100">
                {Number(item.porcentaje_envio || 0).toFixed(2)}%
              </span>
            )}
          </div>
        </td>
      )}
      {/* % Utilidad */}
      <td 
        className="px-3 py-1 text-center"
        onDoubleClick={(e) => {
          if (!isReadOnly) {
            e.stopPropagation();
            startEditItem(item, 'porcentaje_utilidad');
          }
        }}
      >
        <div className="flex flex-col items-center justify-center text-center gap-0.5">
          <span className="text-[12.5px] font-extrabold text-slate-800">
            {formatMoneySymbol(Number(item.utilidad || 0))}
          </span>
          <span className="text-[10px] font-black text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-100">
            {Number(item.porcentaje_utilidad || 0).toFixed(1)}%
          </span>
        </div>
      </td>
      {/* Precio Unitario */}
      <td 
        className="px-3 py-1 text-[12.5px] text-slate-700 font-semibold text-center"
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {formatMoney(item.precio_venta)}
      </td>
      {/* Venta Total */}
      <td 
        className="px-3 py-1 text-[12.5px] font-black text-slate-900 text-center"
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {formatMoney(item.venta_total)}
      </td>
      {/* Acciones */}
      <td 
        className="px-3 py-1 align-middle text-center w-[60px] relative"
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div onClick={e => e.stopPropagation()} className="flex justify-center items-center gap-1">
          {/* Resumen Venta popover on hover */}
          <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
              title="Resumen de Venta"
            >
              <Icon name="trending-up" className="h-3.5 w-3.5" />
            </button>
            {isHovered && (
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 w-fit min-w-[320px] max-w-[450px] bg-white rounded-xl shadow-xl border border-gray-200 p-3.5 text-left text-xs space-y-3.5 z-50 animate-in fade-in zoom-in-95 duration-100 select-none">
                <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-gray-100 pb-1.5">
                  <Icon name="info" className="h-3.5 w-3.5 text-slate-400" />
                  <span>Especificaciones de Suministro</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="block font-bold text-gray-400 text-[9px] uppercase tracking-wide mb-0.5">U. Medida</span>
                    <span className="font-bold text-gray-700 uppercase">{item.tipo_unidad || "UNI"}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="block font-bold text-gray-400 text-[9px] uppercase tracking-wide mb-0.5">Tiempo Entrega</span>
                    <span className="font-bold text-gray-700">
                      {item.tiempo_entrega ?? 0} {item.id_unidad_tiempo_entrega === 3 ? 'Meses' : item.id_unidad_tiempo_entrega === 2 ? 'Semanas' : 'Días'}
                    </span>
                  </div>
                </div>

                {item.observacion && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                    <span className="block font-bold text-gray-400 text-[9px] uppercase tracking-wide mb-0.5">Observación</span>
                    <span className="text-gray-600 italic font-medium">{item.observacion}</span>
                  </div>
                )}

                {/* PANEL CÁLCULO MONETARIO */}
                {(() => {
                  const itemCantidad = Number(item.cantidad || 0);
                  const itemCostoPrecio = Number(item.costo_precio || 0);
                  const itemCostoEnvio = Number(item.costo_envio || 0);
                  const itemCostoConEnvio = Number(item.costo_con_envio || 0);
                  const itemPrecioVenta = Number(item.precio_venta || 0);
                  const itemVentaTotal = Number(item.venta_total || 0);
                  const itemUtilidad = Number(item.utilidad || 0);

                  const costoTotal = itemCostoPrecio * itemCantidad;
                  const costoConEnvioPorUnidad = itemCostoPrecio + itemCostoEnvio;
                  const costoConEnvioTotal = itemCostoConEnvio * itemCantidad;
                  const precioVentaUnit = itemPrecioVenta;
                  const ventaTotal = itemVentaTotal;
                  const utilidadTotal = itemUtilidad * itemCantidad;

                  return (
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 space-y-2 shadow-inner">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider">
                        <Icon name="calculator" className="h-3.5 w-3.5" />
                        <span>Resumen de Venta</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-200/30">
                          <span>Costo Total:</span>
                          <span className="font-semibold text-gray-700">{formatMoney(costoTotal)}</span>
                        </div>
                        {isVenta && (
                          <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-200/30">
                            <span>Costo con Envío:</span>
                            <span className="font-semibold text-gray-700">{formatMoney(costoConEnvioPorUnidad)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-gray-500 py-0.5 border-b border-gray-200/30">
                          <span>Precio Venta:</span>
                          <span className="font-semibold text-gray-700">{formatMoney(precioVentaUnit)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-800 py-0.5 border-b border-slate-200/50 font-bold">
                          <span>Venta Total:</span>
                          <span className="text-slate-900 font-black text-xs">{formatMoney(ventaTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-900 pt-0.5 font-bold">
                          <span>Utilidad Total:</span>
                          <span className="text-emerald-600 font-black text-xs">{formatMoney(utilidadTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Eliminar Item Direct Button & Inline Confirm */}
          {!isReadOnly && (
            <div className="relative flex items-center" ref={deleteConfirmRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowDeleteConfirm(prev => !prev);
                }}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                title="Eliminar Ítem"
              >
                <Icon name="trash-2" className="h-3.5 w-3.5" />
              </button>

              {showDeleteConfirm && (
                <div className="absolute right-0 bottom-full mb-1 flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg p-1.5 shadow-lg z-50 whitespace-nowrap animate-in fade-in slide-in-from-bottom-1 duration-100">
                  <span className="text-[10px] font-black text-gray-700 px-1">¿Borrar?</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleEliminarItem(item.id_suministro, item.codigo_grupo, tipoVenta, true);
                      setShowDeleteConfirm(false);
                    }}
                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white font-black text-[9px] rounded uppercase transition-colors"
                  >
                    Sí
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDeleteConfirm(false);
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[9px] rounded uppercase transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

const SortableItemServicioRow = ({
  item,
  sg,
  grupo,
  isReadOnly,
  editingItemServicioId,
  editingServicioForm,
  setEditingServicioForm,
  setEditingItemServicioId,
  categoriasPersonal,
  typesGasto,
  handleConfirmManoObraInline,
  handleConfirmGastosServicioInline,
  handleConfirmOtrosInline,
  handleStartEditingItemInline,
  handleEliminarItemServicio,
  formatMoneySymbol,
  activeEditServicioField,
  setActiveEditServicioField,
  handleTriggerCreatePersonal,
  renderInlinePersonalCreateForm,
  handleTriggerCreateGasto,
  renderInlineGastoCreateForm,
  catalogoVersion,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `item-${item.id_servicio}`,
    data: {
      type: 'item',
      id_servicio: item.id_servicio
    }
  });

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isEditingItem = editingItemServicioId === item.id_servicio;
  const rowRef = useRef(null);

  const setMergedRef = (el) => {
    setNodeRef(el);
    rowRef.current = el;
  };

  useEffect(() => {
    if (editingItemServicioId === item.id_servicio && activeEditServicioField) {
      const timer = setTimeout(() => {
        const rowEl = rowRef.current;
        if (rowEl) {
          let input = rowEl.querySelector(`[data-field="${activeEditServicioField}"], [name="${activeEditServicioField}"]`);
          if (input && input.tagName !== 'INPUT' && input.tagName !== 'TEXTAREA' && input.tagName !== 'SELECT') {
            input = input.querySelector('input, textarea, select') || input;
          }
          if (input) {
            input.focus();
            if (typeof input.select === 'function') {
              input.select();
            }
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [editingItemServicioId, item.id_servicio, activeEditServicioField]);

  useEffect(() => {
    if (editingItemServicioId !== item.id_servicio) return;

    const handleClickOutside = (e) => {
      const rowEl = rowRef.current;
      if (rowEl && rowEl.contains(e.target)) return;

      if (e.target.closest(
        '[data-radix-popper-content-wrapper], ' +
        '[data-radix-portal], ' +
        '.Toastify, ' +
        '.react-datepicker-popper, ' +
        '.quill, ' +
        '.ql-snow, ' +
        '[role="dialog"], ' +
        '[role="menu"], ' +
        '[role="listbox"]'
      )) {
        return;
      }

      if (!document.body.contains(e.target)) {
        return;
      }

      setEditingItemServicioId(null);
      setActiveEditServicioField(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingItemServicioId, item.id_servicio, setEditingItemServicioId, setActiveEditServicioField]);

  const getFocusableInputs = () => {
    const rowEl = rowRef.current;
    if (!rowEl) return [];
    
    let selectors = [];
    if (sg.tipoCodigo === "04") {
      selectors = [
        'div[data-field="codigo_item"] input',
        'input[data-field="descripcion_item"]',
        'input[data-field="cantidad_hombres"]',
        'input[data-field="cantidad_dias"]',
        'input[data-field="horas"]',
        'input[data-field="costo_hombre_dia"]',
        'input[data-field="porcentaje"]'
      ];
    } else if (sg.tipoCodigo === "05") {
      selectors = [
        'div[data-field="codigo_item"] input',
        'input[data-field="descripcion_item"]',
        'input[data-field="cantidad_hombres"]',
        'input[data-field="cantidad_dias"]',
        'input[data-field="cotizado_hombre_dia"]'
      ];
    } else if (sg.tipoCodigo === "06") {
      selectors = [
        'div[data-field="codigo_item"] input',
        'input[data-field="descripcion_item"]',
        'input[data-field="cantidad_hombres"]',
        'input[data-field="costo_hombre_dia"]',
        'input[data-field="porcentaje"]'
      ];
    }
    
    return selectors
      .map(sel => rowEl.querySelector(sel))
      .filter(el => el !== null && !el.disabled);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setEditingItemServicioId(null);
      setActiveEditServicioField(null);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (sg.tipoCodigo === "04") {
        handleConfirmManoObraInline(editingServicioForm, grupo.id_servicio, sg.id_servicio);
      } else if (sg.tipoCodigo === "05") {
        handleConfirmGastosServicioInline(editingServicioForm, grupo.id_servicio, sg.id_servicio);
      } else if (sg.tipoCodigo === "06") {
        handleConfirmOtrosInline(editingServicioForm, grupo.id_servicio, sg.id_servicio);
      }
      return;
    }

    // Arrow Navigation
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const isSelectOrNumber = e.target.tagName === 'SELECT' || e.target.type === 'number';
      const isAtStart = isSelectOrNumber || e.target.selectionStart === 0;
      const isAtEnd = isSelectOrNumber || e.target.selectionEnd === e.target.value.length;

      let fieldName = e.target.getAttribute('data-field') || e.target.getAttribute('name');
      if (!fieldName) {
        const parentWithField = e.target.closest('[data-field]');
        if (parentWithField) {
          fieldName = parentWithField.getAttribute('data-field');
        }
      }
      if (!fieldName) return;

      let order = [];
      if (sg.tipoCodigo === "04") {
        order = ['codigo_item', 'descripcion_item', 'cantidad_hombres', 'cantidad_dias', 'horas', 'costo_hombre_dia', 'porcentaje'];
      } else if (sg.tipoCodigo === "05") {
        order = ['codigo_item', 'descripcion_item', 'cantidad_hombres', 'cantidad_dias', 'cotizado_hombre_dia'];
      } else if (sg.tipoCodigo === "06") {
        order = ['codigo_item', 'descripcion_item', 'cantidad_hombres', 'costo_hombre_dia', 'porcentaje'];
      }
      
      const idx = order.indexOf(fieldName);

      if (e.key === 'ArrowRight' && isAtEnd) {
        if (idx !== -1 && idx < order.length - 1) {
          e.preventDefault();
          const inputs = getFocusableInputs();
          const nextField = order[idx + 1];
          const nextInput = inputs.find(el => {
            const elField = el.getAttribute('data-field') || el.getAttribute('name') || el.closest('[data-field]')?.getAttribute('data-field');
            return elField === nextField;
          });
          if (nextInput) {
            nextInput.focus();
            if (typeof nextInput.select === 'function') {
              nextInput.select();
            }
          }
        }
      } else if (e.key === 'ArrowLeft' && isAtStart) {
        if (idx > 0) {
          e.preventDefault();
          const inputs = getFocusableInputs();
          const prevField = order[idx - 1];
          const prevInput = inputs.find(el => {
            const elField = el.getAttribute('data-field') || el.getAttribute('name') || el.closest('[data-field]')?.getAttribute('data-field');
            return elField === prevField;
          });
          if (prevInput) {
            prevInput.focus();
            if (typeof prevInput.select === 'function') {
              prevInput.select();
            }
          }
        }
      }
    }
  };

  if (isEditingItem) {
    if (sg.tipoCodigo === "04") {
      const formHombres = Number(editingServicioForm.cantidad_hombres || 0);
      const formDias = Number(editingServicioForm.cantidad_dias || 0);
      const formCosto = Number(editingServicioForm.costo_hombre_dia || 0);
      const formPorcentaje = Number(editingServicioForm.porcentaje || 0);

      const calculatedCostoTotal = formHombres * formDias * formCosto;
      const calculatedUtilidad = calculatedCostoTotal * (formPorcentaje / 100);
      const calculatedCotizadoTotal = calculatedCostoTotal + calculatedUtilidad;
      const calculatedCotizadoHD = formCosto * (1 + formPorcentaje / 100);

      const handlePersonalCreatedEditLocal = (registro) => {
        const cMin = parseFloat(registro.costo_min || 0);
        const cMax = parseFloat(registro.costo_max || 0);
        const cAvg = cMin && cMax ? (cMin + cMax) / 2 : (cMax || cMin || 0);
        setEditingServicioForm(prev => ({
          ...prev,
          codigo_item: `${registro.codigo}-${registro.nombre}`,
          descripcion_item: '',
          costo_hombre_dia: cAvg,
          costo_min: cMin,
          costo_max: cMax
        }));
        setTimeout(() => {
          const descInput = document.querySelector('[data-field="descripcion_item"]');
          if (descInput) {
            descInput.focus();
            if (descInput.select) descInput.select();
          }
        }, 100);
      };

      const handlePersonalCancelEditLocal = () => {};

      return (
        <>
          <tr ref={setMergedRef} style={style} className="bg-indigo-50/30">
            <td className="px-2 text-center align-middle">
              <Icon name="grip-vertical" className="h-3.5 w-3.5 text-gray-200 mx-auto" />
            </td>
            <td className="px-2 py-1">
              <div data-field="codigo_item" className="w-full">
                <TipoPersonalAutocomplete
                  value={editingServicioForm.codigo_item || ""}
                  idArea={item.id_area || data?.id_area}
                  catalogoVersion={catalogoVersion}
                  onTriggerCreatePersonal={(name) => handleTriggerCreatePersonal(name, 'edit-' + item.id_servicio, handlePersonalCreatedEditLocal, handlePersonalCancelEditLocal)}
                  onKeyDown={handleKeyDown}
                  onSelect={(personal) => {
                    if (!personal) {
                      setEditingServicioForm(prev => ({
                        ...prev,
                        codigo_item: '',
                        descripcion_item: '',
                        costo_hombre_dia: 0,
                        costo_min: 0,
                        costo_max: 0
                      }));
                      return;
                    }
                    const cMin = parseFloat(personal.costo_min || 0);
                    const cMax = parseFloat(personal.costo_max || 0);
                    const cAvg = cMin && cMax ? (cMin + cMax) / 2 : (cMax || cMin || 0);
                    setEditingServicioForm(prev => ({
                      ...prev,
                      codigo_item: `${personal.codigo}-${personal.nombre}`,
                      descripcion_item: '',
                      costo_hombre_dia: cAvg,
                      costo_min: cMin,
                      costo_max: cMax
                    }));
                  }}
                />
              </div>
            </td>
          <td className="px-2 py-1">
            <input
              type="text"
              data-field="descripcion_item"
              onKeyDown={handleKeyDown}
              className="w-full text-[10.5px] border border-gray-300 rounded px-1.5 py-0.5 uppercase font-semibold text-gray-700 bg-white"
              value={editingServicioForm.descripcion_item || ""}
              onChange={(e) => setEditingServicioForm({ ...editingServicioForm, descripcion_item: e.target.value.toUpperCase() })}
            />
          </td>
          <td className="px-2 py-1 text-center">
            <input
              type="number"
              data-field="cantidad_hombres"
              onKeyDown={handleKeyDown}
              className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 font-bold bg-white"
              value={editingServicioForm.cantidad_hombres === undefined || editingServicioForm.cantidad_hombres === null ? "" : editingServicioForm.cantidad_hombres}
              onChange={(e) => setEditingServicioForm({ ...editingServicioForm, cantidad_hombres: parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          <td className="px-2 py-1 text-center">
            <input
              type="number"
              data-field="cantidad_dias"
              onKeyDown={handleKeyDown}
              className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 font-semibold bg-white"
              value={editingServicioForm.cantidad_dias === undefined || editingServicioForm.cantidad_dias === null ? "" : editingServicioForm.cantidad_dias}
              onChange={(e) => setEditingServicioForm({ ...editingServicioForm, cantidad_dias: parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          <td className="px-2 py-1 text-center">
            <input
              type="number"
              data-field="horas"
              onKeyDown={handleKeyDown}
              className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 bg-white"
              value={editingServicioForm.horas === undefined || editingServicioForm.horas === null ? "" : editingServicioForm.horas}
              onChange={(e) => setEditingServicioForm({ ...editingServicioForm, horas: parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
            />
          </td>
          <td className="px-2 py-1 text-right">
            <input
              type="text"
              data-field="costo_hombre_dia"
              onKeyDown={handleKeyDown}
              className="w-full text-[10.5px] border border-gray-300 text-right rounded px-1 py-0.5 bg-white"
              value={editingServicioForm.costo_hombre_dia === undefined || editingServicioForm.costo_hombre_dia === null ? "" : editingServicioForm.costo_hombre_dia}
              onChange={(e) => handleDecimalChange(e, (val) => setEditingServicioForm({ ...editingServicioForm, costo_hombre_dia: val }))}
              onFocus={(e) => e.target.select()}
            />
          </td>
          <td className="px-2 py-1">
            <div className="flex flex-col gap-1 items-center justify-center text-center">
              <span className="text-[10.5px] font-bold text-gray-700">
                {formatMoneySymbol(calculatedUtilidad)}
              </span>
              <div className="relative flex items-center justify-center w-full">
                <input
                  type="text"
                  data-field="porcentaje"
                  onKeyDown={handleKeyDown}
                  className="w-full text-[10px] border border-gray-300 text-center rounded px-1 py-0.5 font-medium text-gray-500 bg-white"
                  value={editingServicioForm.porcentaje === undefined || editingServicioForm.porcentaje === null ? "" : editingServicioForm.porcentaje}
                  onChange={(e) => handleDecimalChange(e, (val) => setEditingServicioForm({ ...editingServicioForm, porcentaje: val }))}
                  onFocus={(e) => e.target.select()}
                />
                <span className="absolute right-1 text-[9px] text-gray-400">%</span>
              </div>
            </div>
          </td>
          <td className="px-3 py-1.5 text-[10.5px] text-gray-600 text-right font-medium">
            {formatMoneySymbol(calculatedCotizadoHD)}
          </td>
          <td className="px-3 py-1.5 text-[10.5px] text-gray-900 text-right font-black">
            {formatMoneySymbol(calculatedCotizadoTotal)}
          </td>
          <td className="px-3 py-1 text-right">
            <div className="h-4" />
          </td>
        </tr>
        {renderInlinePersonalCreateForm && renderInlinePersonalCreateForm('edit-' + item.id_servicio, handlePersonalCreatedEditLocal, handlePersonalCancelEditLocal)}
        </>
      );
    }

    if (sg.tipoCodigo === "05") {
      const formHombres = Number(editingServicioForm.cantidad_hombres || 0);
      const formDias = Number(editingServicioForm.cantidad_dias || 0);
      const formPrecio = Number(editingServicioForm.cotizado_hombre_dia || 0);
      const handleGastoCreatedEditLocal = (registro) => {
        setEditingServicioForm(prev => ({
          ...prev,
          codigo_item: registro.codigo,
          descripcion_item: registro.nombre
        }));
        setTimeout(() => {
          const descInput = document.querySelector('[data-field="descripcion_item"]');
          if (descInput) {
            descInput.focus();
            if (descInput.select) descInput.select();
          }
        }, 100);
      };

      const handleGastoCancelEditLocal = () => {};

      const calculatedCotizadoTotal = formHombres * formDias * formPrecio;

      return (
        <>
          <tr ref={setMergedRef} style={style} className="bg-indigo-50/30">
            <td className="px-2 text-center align-middle">
              <Icon name="grip-vertical" className="h-3.5 w-3.5 text-gray-200 mx-auto" />
            </td>
            <td className="px-2 py-1">
              <div data-field="codigo_item" className="w-full">
                <TipoGastoDetalleAutocomplete
                  value={editingServicioForm.codigo_item || ""}
                  codePrefix="05"
                  onTriggerCreateGasto={(name) => handleTriggerCreateGasto(name, 'edit-' + item.id_servicio, '05', handleGastoCreatedEditLocal, handleGastoCancelEditLocal)}
                  onKeyDown={handleKeyDown}
                  onSelect={(gasto) => {
                    if (!gasto) {
                      setEditingServicioForm(prev => ({
                        ...prev,
                        codigo_item: '',
                        descripcion_item: ''
                      }));
                      return;
                    }
                    setEditingServicioForm(prev => ({
                      ...prev,
                      codigo_item: gasto.codigo,
                      descripcion_item: gasto.nombre
                    }));
                  }}
                />
              </div>
            </td>
            <td className="px-2 py-1">
              <input
                type="text"
                data-field="descripcion_item"
                onKeyDown={handleKeyDown}
                className="w-full text-[10.5px] border border-gray-300 rounded px-1.5 py-0.5 uppercase font-semibold text-gray-700 bg-white"
                value={editingServicioForm.descripcion_item || ""}
                onChange={(e) => setEditingServicioForm({ ...editingServicioForm, descripcion_item: e.target.value.toUpperCase() })}
              />
            </td>
            <td className="px-2 py-1 text-center">
              <input
                type="number"
                data-field="cantidad_hombres"
                onKeyDown={handleKeyDown}
                className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 font-bold bg-white"
                value={editingServicioForm.cantidad_hombres === undefined || editingServicioForm.cantidad_hombres === null ? "" : editingServicioForm.cantidad_hombres}
                onChange={(e) => setEditingServicioForm({ ...editingServicioForm, cantidad_hombres: parseInt(e.target.value) || 0 })}
                onFocus={(e) => e.target.select()}
              />
            </td>
            <td className="px-2 py-1 text-center">
              <input
                type="number"
                data-field="cantidad_dias"
                onKeyDown={handleKeyDown}
                className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 font-semibold bg-white"
                value={editingServicioForm.cantidad_dias === undefined || editingServicioForm.cantidad_dias === null ? "" : editingServicioForm.cantidad_dias}
                onChange={(e) => setEditingServicioForm({ ...editingServicioForm, cantidad_dias: parseInt(e.target.value) || 0 })}
                onFocus={(e) => e.target.select()}
              />
            </td>
            <td className="px-2 py-1 text-right">
              <input
                type="text"
                data-field="cotizado_hombre_dia"
                onKeyDown={handleKeyDown}
                className="w-full text-[10.5px] border border-gray-300 text-right rounded px-1 py-0.5 bg-white"
                value={editingServicioForm.cotizado_hombre_dia === undefined || editingServicioForm.cotizado_hombre_dia === null ? "" : editingServicioForm.cotizado_hombre_dia}
                onChange={(e) => handleDecimalChange(e, (val) => setEditingServicioForm({ ...editingServicioForm, cotizado_hombre_dia: val }))}
                onFocus={(e) => e.target.select()}
              />
            </td>
            <td className="px-3 py-1.5 text-[10.5px] text-gray-900 text-right font-black">
              {formatMoneySymbol(calculatedCotizadoTotal)}
            </td>
            <td className="px-3 py-1 text-right">
              <div className="h-4" />
            </td>
          </tr>
          {renderInlineGastoCreateForm && renderInlineGastoCreateForm('edit-' + item.id_servicio, handleGastoCreatedEditLocal, handleGastoCancelEditLocal)}
        </>
      );
    }

    if (sg.tipoCodigo === "06") {
      const formHombres = Number(editingServicioForm.cantidad_hombres || 0);
      const formCosto = Number(editingServicioForm.costo_hombre_dia || 0);
      const formPorcentaje = Number(editingServicioForm.porcentaje || 0);

      const calculatedCostoTotal = formHombres * formCosto;
      const calculatedUtilidad = calculatedCostoTotal * (formPorcentaje / 100);
      const calculatedCotizadoTotal = calculatedCostoTotal + calculatedUtilidad;
      const calculatedCotizadoHD = formCosto * (1 + formPorcentaje / 100);

      const handleGastoCreatedEditLocal = (registro) => {
        setEditingServicioForm(prev => ({
          ...prev,
          codigo_item: registro.codigo,
          descripcion_item: registro.nombre
        }));
        setTimeout(() => {
          const descInput = document.querySelector('[data-field="descripcion_item"]');
          if (descInput) {
            descInput.focus();
            if (descInput.select) descInput.select();
          }
        }, 100);
      };

      const handleGastoCancelEditLocal = () => {};

      return (
        <>
          <tr ref={setMergedRef} style={style} className="bg-indigo-50/30">
            <td className="px-2 text-center align-middle">
              <Icon name="grip-vertical" className="h-3.5 w-3.5 text-gray-200 mx-auto" />
            </td>
            <td className="px-2 py-1">
              <div data-field="codigo_item" className="w-full">
                <TipoGastoDetalleAutocomplete
                  value={editingServicioForm.codigo_item || ""}
                  codePrefix="06"
                  onTriggerCreateGasto={(name) => handleTriggerCreateGasto(name, 'edit-' + item.id_servicio, '06', handleGastoCreatedEditLocal, handleGastoCancelEditLocal)}
                  onKeyDown={handleKeyDown}
                  onSelect={(gasto) => {
                    if (!gasto) {
                      setEditingServicioForm(prev => ({
                        ...prev,
                        codigo_item: '',
                        descripcion_item: ''
                      }));
                      return;
                    }
                    setEditingServicioForm(prev => ({
                      ...prev,
                      codigo_item: gasto.codigo,
                      descripcion_item: gasto.nombre
                    }));
                  }}
                />
              </div>
            </td>
            <td className="px-2 py-1">
              <input
                type="text"
                data-field="descripcion_item"
                onKeyDown={handleKeyDown}
                className="w-full text-[10.5px] border border-gray-300 rounded px-1.5 py-0.5 uppercase font-semibold text-gray-700 bg-white"
                value={editingServicioForm.descripcion_item || ""}
                onChange={(e) => setEditingServicioForm({ ...editingServicioForm, descripcion_item: e.target.value.toUpperCase() })}
              />
            </td>
            <td className="px-2 py-1 text-center">
              <input
                type="number"
                data-field="cantidad_hombres"
                onKeyDown={handleKeyDown}
                className="w-full text-center text-[10.5px] border border-gray-300 text-center rounded px-1 py-0.5 font-bold bg-white"
                value={editingServicioForm.cantidad_hombres === undefined || editingServicioForm.cantidad_hombres === null ? "" : editingServicioForm.cantidad_hombres}
                onChange={(e) => setEditingServicioForm({ ...editingServicioForm, cantidad_hombres: parseInt(e.target.value) || 0 })}
                onFocus={(e) => e.target.select()}
              />
            </td>
            <td className="px-2 py-1 text-right">
              <input
                type="text"
                data-field="costo_hombre_dia"
                onKeyDown={handleKeyDown}
                className="w-full text-[10.5px] border border-gray-300 text-right rounded px-1 py-0.5 bg-white"
                value={editingServicioForm.costo_hombre_dia === undefined || editingServicioForm.costo_hombre_dia === null ? "" : editingServicioForm.costo_hombre_dia}
                onChange={(e) => handleDecimalChange(e, (val) => setEditingServicioForm({ ...editingServicioForm, costo_hombre_dia: val }))}
                onFocus={(e) => e.target.select()}
              />
            </td>
            <td className="px-2 py-1">
              <div className="flex flex-col gap-1 items-center justify-center text-center">
                <span className="text-[10.5px] font-bold text-gray-700">
                  {formatMoneySymbol(calculatedUtilidad)}
                </span>
                <div className="relative flex items-center justify-center w-full">
                  <input
                    type="text"
                    data-field="porcentaje"
                    onKeyDown={handleKeyDown}
                    className="w-full text-[10px] border border-gray-300 text-center rounded px-1 py-0.5 font-medium text-gray-500 bg-white"
                    value={editingServicioForm.porcentaje === undefined || editingServicioForm.porcentaje === null ? "" : editingServicioForm.porcentaje}
                    onChange={(e) => handleDecimalChange(e, (val) => setEditingServicioForm({ ...editingServicioForm, porcentaje: val }))}
                    onFocus={(e) => e.target.select()}
                  />
                  <span className="absolute right-1 text-[9px] text-gray-400">%</span>
                </div>
              </div>
            </td>
            <td className="px-3 py-1.5 text-[10.5px] text-gray-600 text-right font-medium">
              {formatMoneySymbol(calculatedCotizadoHD)}
            </td>
            <td className="px-3 py-1.5 text-[10.5px] text-gray-900 text-right font-black">
              {formatMoneySymbol(calculatedCotizadoTotal)}
            </td>
            <td className="px-3 py-1 text-right">
              <div className="h-4" />
            </td>
          </tr>
          {renderInlineGastoCreateForm && renderInlineGastoCreateForm('edit-' + item.id_servicio, handleGastoCreatedEditLocal, handleGastoCancelEditLocal)}
        </>
      );
    }
  }

  return (
    <tr
      ref={setMergedRef}
      style={style}
      onDoubleClick={() => !isReadOnly && handleStartEditingItemInline(item)}
      className="hover:bg-gray-50/70 group transition-colors cursor-pointer animate-in fade-in duration-150 border-b border-gray-100"
    >
      <td 
        className="px-2 text-center align-middle"
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {!isReadOnly ? (
          <div
            {...listeners}
            {...attributes}
            data-drag-handle
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 rounded transition-colors"
          >
            <Icon name="grip-vertical" className="h-3.5 w-3.5" />
          </div>
        ) : (
          <Icon name="grip-vertical" className="h-3.5 w-3.5 text-gray-200" />
        )}
      </td>

      {sg.tipoCodigo === "04" && (() => {
        const rowHombres = Number(item.cantidad_hombres || 0);
        const rowDias = Number(item.cantidad_dias || 0);
        const rowCosto = Number(item.costo_hombre_dia || 0);
        const rowPorcentaje = Number(item.porcentaje || 0);
        const rowCostoTotal = rowHombres * rowDias * rowCosto;
        const rowUtilidad = rowCostoTotal * (rowPorcentaje / 100);
        const rowCotizadoTotal = Number(item.cotizado_total || 0);
        const rowCotizadoHD = rowCosto * (1 + rowPorcentaje / 100);

        return (
          <>
            <td 
              className="px-3 py-1.5 text-[12px] font-bold text-gray-900 text-center uppercase whitespace-nowrap cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'codigo_item');
                }
              }}
            >
              {item.codigo_item}
            </td>
            <td 
              className="px-3 py-1.5 text-[12px] text-gray-655 text-center uppercase font-semibold truncate max-w-0 cursor-pointer" 
              title={item.descripcion_item}
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'descripcion_item');
                }
              }}
            >
              {item.descripcion_item}
            </td>
            <td 
              className="px-3 py-1.5 text-[12px] text-gray-900 text-center font-bold cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'cantidad_hombres');
                }
              }}
            >
              {rowHombres}
            </td>
            <td 
              className="px-3 py-1.5 text-[12px] text-gray-600 text-center font-semibold cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'cantidad_dias');
                }
              }}
            >
              {rowDias}
            </td>
            <td 
              className="px-3 py-1.5 text-[12px] text-gray-600 text-center cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'horas');
                }
              }}
            >
              {item.horas}
            </td>
            <td 
              className="px-3 py-1.5 text-[12.5px] text-slate-700 text-center font-semibold whitespace-nowrap cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'costo_hombre_dia');
                }
              }}
            >
              {formatMoneySymbol(item.costo_hombre_dia)}
            </td>
            <td 
              className="px-3 py-1.5 text-center cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'porcentaje');
                }
              }}
            >
              <div className="flex flex-col items-center justify-center gap-0.5 whitespace-nowrap">
                <span className="text-[12.5px] font-extrabold text-slate-800">{formatMoneySymbol(rowUtilidad)}</span>
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-100">
                  {rowPorcentaje.toFixed(1)}%
                </span>
              </div>
            </td>
            <td 
              className="px-3 py-1.5 text-[12.5px] text-slate-755 text-center font-semibold whitespace-nowrap"
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {formatMoneySymbol(rowCotizadoHD)}
            </td>
            <td 
              className="px-3 py-1.5 text-[12.5px] text-slate-900 text-center font-black whitespace-nowrap"
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {formatMoneySymbol(rowCotizadoTotal)}
            </td>
          </>
        );
      })()}

      {sg.tipoCodigo === "05" && (() => {
        const rowHombres = Number(item.cantidad_hombres || 0);
        const rowDias = Number(item.cantidad_dias || 0);
        const rowPrecio = Number(item.cotizado_hombre_dia || item.costo_hombre_dia || 0);
        const rowCotizadoTotal = rowHombres * rowDias * rowPrecio;

        return (
          <>
            <td 
              className="px-3 py-1.5 text-[12px] font-bold text-gray-900 text-center uppercase whitespace-nowrap cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'codigo_item');
                }
              }}
            >
              {item.codigo_item}
            </td>
            <td 
              className="px-3 py-1.5 text-[12px] text-gray-655 text-center uppercase font-semibold truncate max-w-0 cursor-pointer" 
              title={item.descripcion_item}
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'descripcion_item');
                }
              }}
            >
              {item.descripcion_item}
            </td>
            <td 
              className="px-3 py-1.5 text-[12px] text-gray-900 text-center font-bold cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'cantidad_hombres');
                }
              }}
            >
              {rowHombres}
            </td>
            <td 
              className="px-3 py-1.5 text-[12px] text-gray-600 text-center font-semibold cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'cantidad_dias');
                }
              }}
            >
              {rowDias}
            </td>
            <td 
              className="px-3 py-1.5 text-[12.5px] text-slate-700 text-center font-semibold whitespace-nowrap cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'cotizado_hombre_dia');
                }
              }}
            >
              {formatMoneySymbol(rowPrecio)}
            </td>
            <td 
              className="px-3 py-1.5 text-[12.5px] text-slate-900 text-center font-black whitespace-nowrap"
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {formatMoneySymbol(rowCotizadoTotal)}
            </td>
          </>
        );
      })()}

      {sg.tipoCodigo === "06" && (() => {
        const rowHombres = Number(item.cantidad_hombres || 0);
        const rowCosto = Number(item.costo_hombre_dia || 0);
        const rowPorcentaje = Number(item.porcentaje || 0);
        const rowCostoTotal = rowHombres * rowCosto;
        const rowUtilidad = rowCostoTotal * (rowPorcentaje / 100);
        const rowCotizadoTotal = Number(item.cotizado_total || 0);
        const rowCotizadoHD = rowCosto * (1 + rowPorcentaje / 100);

        return (
          <>
            <td 
              className="px-3 py-1.5 text-[12px] font-bold text-gray-900 text-center uppercase whitespace-nowrap cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'codigo_item');
                }
              }}
            >
              {item.codigo_item}
            </td>
            <td 
              className="px-3 py-1.5 text-[12px] text-gray-655 text-center uppercase font-semibold truncate max-w-0 cursor-pointer" 
              title={item.descripcion_item}
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'descripcion_item');
                }
              }}
            >
              {item.descripcion_item}
            </td>
            <td 
              className="px-3 py-1.5 text-[12px] text-gray-900 text-center font-bold cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'cantidad_hombres');
                }
              }}
            >
              {rowHombres}
            </td>
            <td 
              className="px-3 py-1.5 text-[12.5px] text-slate-700 text-center font-semibold whitespace-nowrap cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'costo_hombre_dia');
                }
              }}
            >
              {formatMoneySymbol(rowCosto)}
            </td>
            <td 
              className="px-3 py-1.5 text-center cursor-pointer"
              onDoubleClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleStartEditingItemInline(item, 'porcentaje');
                }
              }}
            >
              <div className="flex flex-col items-center justify-center gap-0.5 whitespace-nowrap">
                <span className="text-[12.5px] font-extrabold text-slate-800">{formatMoneySymbol(rowUtilidad)}</span>
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-100">
                  {rowPorcentaje.toFixed(1)}%
                </span>
              </div>
            </td>
            <td 
              className="px-3 py-1.5 text-[12.5px] text-slate-755 text-center font-semibold whitespace-nowrap"
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {formatMoneySymbol(rowCotizadoHD)}
            </td>
            <td 
              className="px-3 py-1.5 text-[12.5px] text-slate-900 text-center font-black whitespace-nowrap"
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {formatMoneySymbol(rowCotizadoTotal)}
            </td>
          </>
        );
      })()}

      <td 
        className="px-3 py-1.5 text-right"
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {!isReadOnly ? (
          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartEditingItemInline(item);
              }}
              className="p-0.5 text-gray-400 hover:text-indigo-600 transition-colors"
              title="Editar ítem"
            >
              <Icon name="edit-2" className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEliminarItemServicio(item.id_servicio);
              }}
              className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
              title="Eliminar ítem"
            >
              <Icon name="trash-2" className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="h-4" />
        )}
      </td>
    </tr>
  );
};

export default CotizacionDetalle;

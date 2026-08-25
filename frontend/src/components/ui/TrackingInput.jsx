import React, { useState, useEffect, useRef, memo } from 'react';
import * as LucideIcons from 'lucide-react';
import ActionMenu from './ActionMenu';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from 'date-fns/locale/es';
import { Bell, X, Calendar } from "lucide-react";

registerLocale('es', es);

const Icon = ({ name, className }) => {
  const iconName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const LucideIcon = LucideIcons[iconName] || LucideIcons.HelpCircle;
  return <LucideIcon className={className} />;
};

const TrackingInput = memo(({ 
  value, 
  onChange, 
  onAddNote, 
  isAlert, 
  onAlertChange 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const textareaRef = useRef(null);


  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  const handleSend = () => {
    const textToSend = localValue.trim();
    if (typeof onAddNote === 'function' && textToSend) {
      onAddNote(localValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' || e.key === ' ') {
      // Logic for commands removed
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (val) => {
    setLocalValue(val);
    if (typeof onChange === 'function') onChange(val);
  };


  return (
    <div className="bg-white border-t border-slate-100">
      <div className="relative">
        
        {isAlert && (
          <div className="absolute -top-3 left-4 z-20 px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black rounded-full flex items-center gap-1 shadow-md animate-in fade-in slide-in-from-bottom-1">
            <Bell className="h-2.5 w-2.5 fill-current" />
            RECORDATORIO: {isAlert.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            <button onClick={() => onAlertChange(null)} className="ml-1 hover:text-indigo-200">
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        <div className="flex">
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje de seguimiento..."
            className="w-full bg-transparent border-none focus:ring-0 outline-none text-[11px] font-black text-slate-700 resize-none py-3 px-5 min-h-[40px] max-h-[150px] placeholder:text-slate-300 placeholder:font-black uppercase tracking-tight"
          />
        </div>
        
        <div className="flex items-center justify-between py-2 px-5 bg-slate-50/50 border-t border-slate-100/50">
          <div className="flex items-center gap-2">
            <ActionMenu 
                title="Programar Agenda"
                align="start"
                open={isMenuOpen} 
                onOpenChange={setIsMenuOpen} 
                closeOnSelect={false} 
                contentClassName="min-w-[440px]"
                customTrigger={
                    <button 
                        type="button"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase transition-all ${
                            isAlert ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-100/80 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50'
                        }`}
                        onClick={() => {
                            if(!isAlert) onAlertChange(new Date()); 
                            setIsMenuOpen(true);
                        }}
                    >
                        <Icon name="bell" className={`h-3 w-3 ${isAlert ? 'fill-current' : ''}`} />
                        {isAlert ? 'Agendado' : 'Agendar'}
                    </button>
                }
            >
                {/* Contenido del Menu - Mantener igual */}
                <div className="p-3 bg-white">
                    <div className="flex gap-4 items-stretch">
                        <div 
                            className="border-r border-slate-100 pr-4"
                            onClick={(e) => e.stopPropagation()} 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                    textareaRef.current?.focus();
                                }
                            }}
                        >
                            <DatePicker
                                selected={isAlert instanceof Date ? isAlert : new Date()}
                                onChange={(date) => {
                                    const newDate = date || new Date();
                                    if (isAlert instanceof Date) {
                                        newDate.setHours(isAlert.getHours());
                                        newDate.setMinutes(isAlert.getMinutes());
                                    }
                                    onAlertChange(newDate);
                                }}
                                locale="es"
                                inline
                                showMonthDropdown
                                showYearDropdown
                                dropdownMode="select"
                                minDate={new Date()} 
                            />
                        </div>

                        <div 
                        className="flex-1 flex flex-col justify-center py-1 min-w-[140px]"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsMenuOpen(false);
                            textareaRef.current?.focus();
                            }
                        }}
                        >
                        <div className="space-y-4">
                            <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                                Hora de Alerta
                            </label>
                            <input 
                                type="time"
                                autoFocus
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                value={(isAlert instanceof Date ? isAlert : new Date()).toTimeString().slice(0,5)}
                                onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':');
                                const updatedDate = new Date(isAlert instanceof Date ? isAlert : new Date());
                                updatedDate.setHours(parseInt(hours, 10));
                                updatedDate.setMinutes(parseInt(minutes, 10));
                                onAlertChange(updatedDate);
                                }}
                            />
                            </div>

                            <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/50">
                            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Programado para:
                            </div>
                            <div className="text-[11px] font-black text-slate-700 uppercase">
                                {(isAlert instanceof Date ? isAlert : new Date()).toLocaleDateString('es-PE', { day: '2-digit', month: 'long' })}
                            </div>
                            <div className="text-indigo-600 font-black text-lg leading-tight">
                                {(isAlert instanceof Date ? isAlert : new Date()).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                            </div>
                            
                            <div className="flex flex-col gap-1 items-center">
                            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest text-center animate-pulse">
                                Presiona Enter para Confirmar
                            </span>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            </ActionMenu>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!localValue.trim()}
            className={`h-8 px-4 rounded-xl flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-wider ${
              localValue.trim() ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            Enviar
            <Icon name="arrow-up" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default TrackingInput;
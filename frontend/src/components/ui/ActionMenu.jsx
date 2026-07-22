import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { EllipsisVertical, ChevronRight } from "lucide-react";

const ActionMenu = ({ 
  options = [], 
  title = "Acciones", 
  customTrigger = null,
  align = "end",
  children,
  contentClassName = "",
  closeOnSelect = true,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange || setInternalOpen;

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        {customTrigger ? (
          customTrigger
        ) : (
          <button 
            className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all outline-none focus:ring-2 focus:ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisVertical className="w-4 h-4" />
          </button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          align={align} 
          sideOffset={8}
          className={`z-[9999] min-w-[220px] bg-white rounded-2xl p-1.5 shadow-[0_10px_38px_-10px_rgba(22,23,24,0.35),0_10px_20px_-15px_rgba(22,23,24,0.2)] border border-slate-100 animate-in fade-in zoom-in duration-200 ${contentClassName}`}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            const uMedida = e.currentTarget.querySelector(".u-medida-input");
            if (uMedida) {
              e.preventDefault();
              uMedida.focus();
              if (uMedida.select) uMedida.select();
            }
          }}
        >
          {title && (
            <div className="px-3 py-2 mb-1 border-b border-slate-50">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {title}
              </span>
            </div>
          )}

          {/* Lógica inteligente para los hijos */}
          {children && (
            <div onClick={(e) => {
              if (!closeOnSelect) {
                e.stopPropagation(); // Si es falso, no deja que el clic cierre el menú
              } else {
                onOpenChange(false); // Si es verdadero, cierra normalmente
              }
            }}>
              {children}
            </div>
          )}

          {options.map((option, index) => (
            <React.Fragment key={index}>
              {option.type === 'separator' ? (
                <DropdownMenu.Separator className="h-[1px] bg-slate-100 my-1" />
              ) : option.hasSubmenu ? (
                <DropdownMenu.Sub key={index}>
                  <DropdownMenu.SubTrigger 
                    className={`flex items-center justify-between w-full px-3 py-2.5 text-[11px] font-bold uppercase tracking-tight rounded-xl cursor-pointer outline-none transition-all 
                      ${option.variant === 'danger' 
                        ? 'text-red-500 hover:bg-red-50' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'}`}
                    onPointerEnter={() => option.onHover?.()}
                    onClick={(e) => {
                      e.preventDefault();
                      option.onClick?.();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {option.icon && <option.icon className="w-4 h-4 opacity-70" />}
                      <span>{option.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60 ml-2" />
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent 
                      className="z-[9999] min-w-[200px] bg-white rounded-2xl p-1.5 shadow-[0_10px_38px_-10px_rgba(22,23,24,0.35),0_10px_20px_-15px_rgba(22,23,24,0.2)] border border-slate-100 animate-in fade-in zoom-in duration-200"
                      sideOffset={8}
                      alignOffset={-4}
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      {option.submenuContent}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>
              ) : (
                <DropdownMenu.Item 
                  className={`flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-tight rounded-xl cursor-pointer outline-none transition-all 
                    ${option.variant === 'danger' 
                      ? 'text-red-500 hover:bg-red-50' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    option.onClick?.();
                    onOpenChange(false); // Las opciones de lista siempre cierran el menú[cite: 1]
                  }}
                >
                  {option.icon && <option.icon className="w-4 h-4 opacity-70" />}
                  {option.label}
                </DropdownMenu.Item>
              )}
            </React.Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default ActionMenu;
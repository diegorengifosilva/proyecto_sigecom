import React from 'react';
import { Icon } from "@iconify/react";
import { CompactField } from './CompactField';

export const CompactTiempoUnidad = ({ label, value, onValueChange, unitValue, onUnitChange, options, isReadOnly }) => {
  return (
    <CompactField label={label} className="group relative">
      <div className="flex items-center flex-nowrap whitespace-nowrap">
        {/* Valor Numérico */}
        <input
          type="number"
          defaultValue={value || "0"}
          key={value}
          onBlur={onValueChange}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          readOnly={isReadOnly}
          className="bg-transparent border-none p-0 h-auto w-8 font-black text-[11px] text-gray-900 focus:ring-0 outline-none"
        />

        <span className="text-gray-300 font-light mx-1">|</span>

        {/* Selector de Unidad (Días/Semanas/etc) */}
        <div className="relative flex items-center shrink-0">
          <select
            value={unitValue}
            onChange={onUnitChange}
            disabled={isReadOnly || !value || value === "0"}
            className="bg-transparent border-none p-0 h-auto font-black text-[11px] text-gray-600 focus:ring-0 cursor-pointer w-auto appearance-none pr-3"
          >
            {options.map(o => (
              <option key={o.id} value={o.id}>{o.nombre.toUpperCase()}</option>
            ))}
          </select>
          {!isReadOnly && (
            <Icon name="chevron-down" className="absolute right-0 h-2 w-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </CompactField>
  );
};
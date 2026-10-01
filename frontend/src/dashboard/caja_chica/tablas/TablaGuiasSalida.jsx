import React from "react";
import { ERPTable } from "@/components/ui/ERPComponents";
import { formatDate } from "@/utils/formatters";

const formatPEN = (val) => `S/. ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TablaGuiasSalida({
  data = [],
  isLoading = false,
  currentPage = 1,
  pageSize = 12,
  totalPages = 1,
  onPageChange,
  onRowClick
}) {
  const headers = [
    "Registro",
    "Fecha",
    "Encargado",
    "Origen",
    "Destino",
    "Operacion",
    "Fecha Salida",
    "Total"
  ];

  const paginatedItems = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const mobileCards = (
    <div className="flex flex-col gap-2">
      {paginatedItems.map((item) => (
        <div
          key={item.id_registro}
          onClick={() => onRowClick?.(item)}
          className="p-3 rounded-xl border border-gray-100 bg-white hover:border-rose-200 transition-all cursor-pointer flex flex-col gap-2 shadow-sm active:scale-[0.99]"
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-rose-700 tracking-tight">
              Reg. {item.registro}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/50">
              {item.operacion || "Salida"}
            </span>
          </div>
          <div className="text-xs text-gray-800 font-medium">
            <span>{item.origen} → {item.destino}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1 border-t border-gray-50">
            <span>{item.encargado}</span>
            <span className="font-bold text-gray-900 text-emerald-700">{formatPEN(item.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <ERPTable
      headers={headers}
      loading={isLoading}
      mobileCards={mobileCards}
      pagination={{
        currentPage,
        totalPages: totalPages || 1,
        totalItems: data.length,
        total: data.length,
        from: data.length === 0 ? 0 : (currentPage - 1) * pageSize + 1,
        to: Math.min(currentPage * pageSize, data.length),
        pageSize,
        onPageChange
      }}
    >
      {paginatedItems.length === 0 ? (
        <tr>
          <td colSpan={headers.length} className="px-6 py-12 text-center text-sm text-gray-400">
            No se encontraron guías de salida en este período.
          </td>
        </tr>
      ) : (
        paginatedItems.map((item) => (
          <tr
            key={item.id_registro}
            onClick={() => onRowClick?.(item)}
            className="hover:bg-rose-50/40 transition-colors cursor-pointer text-xs group"
          >
            {/* 1. Registro */}
            <td className="px-4 py-3 font-black text-rose-700 whitespace-nowrap">
              {item.registro}
            </td>

            {/* 2. Fecha */}
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
              {formatDate(item.fecha)}
            </td>

            {/* 3. Encargado */}
            <td className="px-4 py-3 font-medium text-gray-900 max-w-[170px] truncate" title={item.encargado}>
              {item.encargado}
            </td>

            {/* 4. Origen */}
            <td className="px-4 py-3 text-gray-700 max-w-[150px] truncate" title={item.origen}>
              {item.origen}
            </td>

            {/* 5. Destino */}
            <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate" title={item.destino}>
              {item.destino}
            </td>

            {/* 6. Operacion */}
            <td className="px-4 py-3 whitespace-nowrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/50">
                {item.operacion || "Salida"}
              </span>
            </td>

            {/* 7. Fecha Salida */}
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
              {formatDate(item.fecha_salida || item.fecha)}
            </td>

            {/* 8. Total */}
            <td className="px-4 py-3 font-black text-emerald-700 whitespace-nowrap text-right">
              {formatPEN(item.total)}
            </td>
          </tr>
        ))
      )}
    </ERPTable>
  );
}

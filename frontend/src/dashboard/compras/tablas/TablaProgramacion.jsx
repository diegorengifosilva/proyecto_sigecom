import React from "react";
import { ERPTable } from "@/components/ui/ERPComponents";
import { Pin } from "lucide-react";

const TablaProgramacion = ({
  data = [],
  isLoading = false,
  sortConfig,
  onSort,
  currentPage = 1,
  pageSize = 10,
  totalPages = 1,
  onPageChange,
  onRowClick,
  pinnedIds = new Set()
}) => {
  const headers = ["Código", "Referencia", "Empresa", "Área", "Tipo", "Programado", "Ejecutado", "Saldo"];

  const paginatedItems = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatCurrency = (val) => {
    return `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const mobileCards = (
    <div className="flex flex-col gap-2">
      {paginatedItems.map((item) => {
        const isPinned = pinnedIds.has(item.id_registro);
        return (
          <div
            key={item.id_registro}
            onClick={() => onRowClick?.(item)}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
              isPinned 
                ? 'bg-amber-50/20 border-amber-100 hover:border-amber-200' 
                : 'bg-white border-gray-100 hover:border-emerald-100 active:scale-[0.99]'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-emerald-600 tracking-tight flex items-center gap-1">
                {isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 rotate-45" />}
                {item.codigo}
              </span>
              <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                {item.tipo}
              </span>
            </div>

            <div>
              <h4 className="text-xs font-black text-gray-900 line-clamp-1 uppercase">
                {item.empresa}
              </h4>
              {item.referencia && (
                <p className="text-[10px] text-gray-500 font-medium line-clamp-2 mt-0.5 leading-snug">
                  {item.referencia}
                </p>
              )}
            </div>

            <div className="border-t border-gray-50 pt-2 flex flex-col gap-1 text-[9px] font-bold text-gray-500">
              <div className="flex justify-between">
                <span>Área: {item.area}</span>
                <span>Programado: {formatCurrency(item.programado)}</span>
              </div>
              <div className="flex justify-between font-black text-gray-900">
                <span>Ejecutado: {formatCurrency(item.ejecutado)}</span>
                <span className={item.saldo < 0 ? "text-rose-600" : "text-emerald-600"}>
                  Saldo: {formatCurrency(item.saldo)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex-1 min-h-0">
      <ERPTable
        loading={isLoading}
        headers={headers}
        onSort={onSort}
        sortConfig={sortConfig}
        mobileCards={mobileCards}
        pagination={{
          currentPage,
          totalPages,
          total: data.length,
          from: data.length > 0 ? (currentPage - 1) * pageSize + 1 : 0,
          to: Math.min(currentPage * pageSize, data.length),
          onPageChange: onPageChange
        }}
      >
        {paginatedItems.map((item) => {
          const isPinned = pinnedIds.has(item.id_registro);
          return (
            <tr
              key={item.id_registro}
              onClick={() => onRowClick?.(item)}
              className={`group hover:bg-gray-50/80 transition-colors cursor-pointer border-b last:border-0 border-gray-100 h-[50px] ${
                isPinned ? 'bg-amber-50/10 hover:bg-amber-50/20' : ''
              }`}
            >
              {/* Código */}
              <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-emerald-600">
                <div className="flex items-center gap-1.5">
                  {isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 rotate-45" />}
                  <span>{item.codigo}</span>
                </div>
              </td>

              {/* Referencia */}
              <td className="px-4 py-2">
                <div className="text-sm text-gray-600 font-medium line-clamp-1 max-w-xs xl:max-w-xl" title={item.referencia}>
                  {item.referencia}
                </div>
              </td>

              {/* Empresa */}
              <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-900 uppercase">
                {item.empresa}
              </td>

              {/* Área */}
              <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 font-bold uppercase tracking-tight">
                {item.area}
              </td>

              {/* Tipo */}
              <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-700 font-bold">
                {item.tipo}
              </td>

              {/* Programado */}
              <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-700 text-right">
                {formatCurrency(item.programado)}
              </td>

              {/* Ejecutado */}
              <td className="px-4 py-2 whitespace-nowrap text-sm font-black text-gray-900 text-right">
                {formatCurrency(item.ejecutado)}
              </td>

              {/* Saldo */}
              <td className={`px-4 py-2 whitespace-nowrap text-sm font-black text-right ${
                item.saldo < 0 ? "text-rose-600" : "text-emerald-700"
              }`}>
                {formatCurrency(item.saldo)}
              </td>
            </tr>
          );
        })}

        {data.length === 0 && !isLoading && (
          <tr>
            <td colSpan={headers.length} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs">
              No se encontraron registros de programación
            </td>
          </tr>
        )}
      </ERPTable>
    </div>
  );
};

export default TablaProgramacion;

import React from "react";
import { ERPTable, StatusBadge } from "@/components/ui/ERPComponents";
import { formatDate } from "@/utils/formatters";
import { Pin } from "lucide-react";

const TablaCotizaciones = ({
    data = [],
    isLoading,
    sortConfig,
    onSort,
    currentPage,
    pageSize,
    totalPages,
    onPageChange,
    onRowClick,
    onRowContextMenu,
    pinnedIds = new Set()
}) => {
    const headers = ["Código", "Referencia", "Cliente", "Área", "Estado", "Envío", "Fecha", "Total"];

    const paginatedItems = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const mobileCards = (
        <div className="flex flex-col gap-2">
            {paginatedItems.map((item) => {
                const isPinned = pinnedIds.has(item.id_registro);
                return (
                    <div
                        key={item.id_registro}
                        onClick={() => onRowClick(item.id_registro)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            onRowContextMenu?.(e, item);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                            isPinned 
                                ? 'bg-amber-50/20 border-amber-100 hover:border-amber-200' 
                                : 'bg-white border-gray-100 hover:border-indigo-100 active:scale-[0.99]'
                        }`}
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-indigo-600 tracking-tight flex items-center gap-1">
                                {isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 rotate-45" />}
                                {item.codigo}
                            </span>
                            <StatusBadge status={item.estado_nombre} />
                        </div>

                        <div>
                            <h4 className="text-xs font-black text-gray-900 line-clamp-1 uppercase">
                                {item.cliente_nombre}
                            </h4>
                            {item.referencia && (
                                <p className="text-[10px] text-gray-500 font-medium line-clamp-2 mt-0.5 leading-snug">
                                    {item.referencia}
                                </p>
                            )}
                        </div>

                        <div className="border-t border-gray-50 pt-2 flex items-center justify-between text-[9px] font-bold text-gray-400">
                            <div className="flex items-center gap-1.5">
                                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tight text-[8px]">
                                    {item.area_nombre}
                                </span>
                                <span>{formatDate(item.fecha)}</span>
                            </div>
                            <span className="text-xs font-black text-gray-950">
                                ${Number(item.total_cotizacion || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
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
                            onClick={() => onRowClick(item.id_registro)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                onRowContextMenu?.(e, item);
                            }}
                            className={`group hover:bg-gray-50/80 transition-colors cursor-pointer border-b last:border-0 border-gray-100 h-[50px] ${
                                isPinned ? 'bg-amber-50/10 hover:bg-amber-50/20' : ''
                            }`}
                        >
                            {/* Código */}
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-indigo-600">
                                <div className="flex items-center gap-1.5">
                                    {isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 rotate-45" />}
                                    <span>{item.codigo}</span>
                                </div>
                            </td>

                            {/* Referencia */}
                            <td className="px-4 py-2">
                                <div className="text-sm text-gray-600 font-medium line-clamp-1 max-w-xs xl:max-w-2xl" title={item.referencia}>
                                    {item.referencia}
                                </div>
                            </td>

                            {/* Cliente */}
                            <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900 leading-tight truncate max-w-[200px]">
                                        {item.cliente_nombre}
                                    </span>
                                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                                        {item.representante_nombre || 'S/V'}
                                    </span>
                                </div>
                            </td>

                            {/* Área */}
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 font-bold uppercase tracking-tight">
                                {item.area_nombre}
                            </td>

                            {/* Estado */}
                            <td className="px-4 py-2 whitespace-nowrap">
                                <StatusBadge status={item.estado_nombre} />
                            </td>

                            {/* Envío */}
                            <td className="px-4 py-2 whitespace-nowrap align-middle">
                                <div className="flex items-center">
                                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-colors duration-150 ${
                                        item.estado_envio === 2 
                                            ? 'bg-emerald-100 text-emerald-700' 
                                            : 'bg-rose-100 text-rose-700'
                                    }`}>
                                        {item.estado_envio === 2 ? 'Enviado' : 'Pendiente'}
                                    </span>
                                </div>
                            </td>

                            {/* Fecha */}
                            <td className="px-4 py-2 whitespace-nowrap text-[10px] text-gray-600 font-black uppercase">
                                {formatDate(item.fecha)}
                            </td>

                            {/* Total */}
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-black text-gray-900 text-right">
                                ${Number(item.total_cotizacion || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    );
                })}

                {data.length === 0 && !isLoading && (
                    <tr>
                        <td colSpan={headers.length} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs">
                            No se encontraron registros
                        </td>
                    </tr>
                )}
            </ERPTable>
        </div>
    );
};

export default TablaCotizaciones;
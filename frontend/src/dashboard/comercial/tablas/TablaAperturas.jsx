import React from "react";
import { ERPTable, StatusBadge } from "@/components/ui/ERPComponents";
import { formatDate } from "@/utils/formatters";
import { Pin } from "lucide-react";

const renderAreaBadge = (areaName) => {
    if (!areaName) return null;
    const name = areaName.trim().toUpperCase();
    
    let displayName = areaName;
    if (name === "SEGURIDAD DE MAQUINARIA" || name === "SEGURIDAD") {
        displayName = "SAFETY";
    }

    let badgeStyle = {
        bg: "bg-slate-50",
        text: "text-slate-600",
        border: "border-slate-200/60"
    };
    
    if (name === "MINERÍA" || name === "MINERIA") {
        badgeStyle = {
            bg: "bg-amber-50",
            text: "text-amber-700",
            border: "border-amber-200/60"
        };
    } else if (name === "INDUSTRIA") {
        badgeStyle = {
            bg: "bg-sky-50",
            text: "text-sky-700",
            border: "border-sky-200/60"
        };
    } else if (name === "PETROQUÍMICA" || name === "PETROQUIMICA") {
        badgeStyle = {
            bg: "bg-purple-50",
            text: "text-purple-700",
            border: "border-purple-200/60"
        };
    } else if (name === "SEGURIDAD DE MAQUINARIA" || name === "SEGURIDAD") {
        badgeStyle = {
            bg: "bg-rose-50",
            text: "text-rose-700",
            border: "border-rose-200/60"
        };
    } else if (name === "MANTENIMIENTO") {
        badgeStyle = {
            bg: "bg-emerald-50",
            text: "text-emerald-700",
            border: "border-emerald-200/60"
        };
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shadow-sm ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
            {displayName}
        </span>
    );
};

const TablaApertura = ({
    data = [],
    isLoading = false,
    currentPage = 1,
    pageSize = 10,
    onPageChange = () => {},
    onRowClick = () => {},
    onRowContextMenu,
    pinnedIds = new Set()
}) => {
    // Columnas solicitadas: FECHA, No ORDEN, COTIZACION, REFERENCIA, EMPRESA, AREA e IMPORTE
    const headers = [
        "Fecha",
        "N° Orden",
        "Cotización",
        "Referencia",
        "Empresa",
        "Área",
        "Estado",
        "Importe"
    ];

    const paginatedItems = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const mobileCards = (
        <div className="flex flex-col gap-2">
            {paginatedItems.map((item) => {
                const isPinned = pinnedIds.has(item.cotizacion_id);
                return (
                    <div
                        key={item.id_apertura}
                        onClick={() => onRowClick(item.cotizacion_id)}
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
                                {item.cotizacion_codigo || item.id_registro?.codigo}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-tighter">
                                    OC: {item.numero_orden}
                                </span>
                                <StatusBadge status={
                                    item.estado_orden === 1 ? "Adjudicado" :
                                    item.estado_orden === 2 ? "Pendiente" :
                                    item.estado_orden === 4 ? "Anulado" :
                                    item.estado_orden === 3 ? "Facturada" :
                                    item.estado_orden_nombre
                                } />
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-black text-gray-900 line-clamp-1 uppercase">
                                {item.cliente_nombre}
                            </h4>
                            {(item.cotizacion_referencia || item.id_registro?.referencia) && (
                                <p className="text-[10px] text-gray-500 font-medium line-clamp-2 mt-0.5 leading-snug">
                                    {item.cotizacion_referencia || item.id_registro?.referencia}
                                </p>
                            )}
                        </div>

                        <div className="border-t border-gray-50 pt-2 flex items-center justify-between text-[9px] font-bold text-gray-400">
                            <div className="flex items-center gap-1.5">
                                {renderAreaBadge(item.id_registro?.area_nombre)}
                                <span>{formatDate(item.fecha_orden)}</span>
                            </div>
                            <span className="text-xs font-black text-gray-950">
                                ${Number(item.total_orden || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // Cálculo dinámico de páginas en base al array real
    const totalPages = Math.ceil(data.length / pageSize) || 1;

    return (
        <div className="flex-1 min-h-0">
            <ERPTable
                loading={isLoading}
                headers={headers}
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
                {/* Paginación del lado del cliente idéntica a Cotizaciones */}
                {paginatedItems.map((item) => {
                    const isPinned = pinnedIds.has(item.cotizacion_id);
                    return (
                        <tr
                            // 🌟 CORRECCIÓN: Usamos id_apertura como KEY único obligatorio
                            key={item.id_apertura}
                            // 🌟 CORRECCIÓN: Usamos id_apertura o cotizacion_id según a qué detalle deba viajar
                            onClick={() => onRowClick(item.cotizacion_id)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                onRowContextMenu?.(e, item);
                            }}
                            className={`group hover:bg-gray-50/80 transition-colors cursor-pointer border-b last:border-0 border-gray-100 h-[50px] ${
                                isPinned ? 'bg-amber-50/10 hover:bg-amber-50/20' : ''
                            }`}
                        >
                            {/* FECHA */}
                            <td className="px-4 py-2 whitespace-nowrap text-[10px] text-gray-600 font-black uppercase">
                                {formatDate(item.fecha_orden)}
                            </td>

                            {/* N° ORDEN */}
                            <td className="px-4 py-2 whitespace-nowrap text-xs font-black text-gray-900 uppercase">
                                {item.numero_orden}
                            </td>

                            {/* COTIZACION */}
                            <td className="px-4 py-2 whitespace-nowrap text-xs font-black text-blue-600 group-hover:text-blue-700 transition-colors">
                                <div className="flex items-center gap-1.5">
                                    {isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 rotate-45" />}
                                    <span>{item.cotizacion_codigo || item.id_registro?.codigo}</span>
                                </div>
                            </td>

                            {/* REFERENCIA */}
                            <td className="px-4 py-2">
                                <span className="text-xs text-gray-600 font-medium line-clamp-2 max-w-[280px]" title={item.cotizacion_referencia || item.id_registro?.referencia}>
                                    {item.cotizacion_referencia || item.id_registro?.referencia}
                                </span>
                            </td>

                            {/* EMPRESA (Cliente) */}
                            <td className="px-4 py-2 whitespace-nowrap">
                                <span className="text-xs font-black text-gray-900 uppercase block max-w-[180px] truncate" title={item.cliente_nombre}>
                                    {item.cliente_nombre}
                                </span>
                            </td>

                             {/* AREA */}
                             <td className="px-4 py-2 whitespace-nowrap align-middle">
                                 {renderAreaBadge(item.id_registro?.area_nombre)}
                             </td>

                            {/* ESTADO */}
                            <td className="px-4 py-2 whitespace-nowrap">
                                <StatusBadge status={
                                    item.estado_orden === 1 ? "Adjudicado" :
                                    item.estado_orden === 2 ? "Pendiente" :
                                    item.estado_orden === 4 ? "Anulado" :
                                    item.estado_orden === 3 ? "Facturada" :
                                    item.estado_orden_nombre
                                } />
                            </td>

                            {/* IMPORTE */}
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-black text-gray-900 text-right">
                                ${Number(item.total_orden || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    );
                })}

                {/* Feedback visual si no hay datos */}
                {data.length === 0 && !isLoading && (
                    <tr>
                        <td colSpan={headers.length} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs">
                            No se encontraron órdenes de apertura administrativa
                        </td>
                    </tr>
                )}
            </ERPTable>
        </div>
    );
};

export default TablaApertura;
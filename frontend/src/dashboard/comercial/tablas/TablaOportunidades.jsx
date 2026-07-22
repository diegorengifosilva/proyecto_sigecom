import React from "react";
import { ERPTable, StatusBadge } from "@/components/ui/ERPComponents";
import { Calendar, MessageSquare, Pin } from "lucide-react";
import { formatDate } from "@/utils/formatters"; // Usamos tu formateador global si es necesario

const TablaOportunidades = ({
    data = [],            // Recibe los datos reales del Backend
    isLoading = false,    // Estado de carga aislado
    currentPage = 1,      // Página actual para la paginación
    pageSize = 10,        // Tamaño de página configurado en el padre
    onPageChange = () => {},
    onRowClick = () => {}, // Navegación al detalle
    onRowContextMenu,
    pinnedIds = new Set()
}) => {
    
    const headers = [
        "CODIGO",
        "RECEPCION",
        "CLIENTE",
        "DESCRIPCION",
        "VISITA TECNICA",
        "FECHA LIMITE",
        "EMISION COTIZACION",
        "ESTADO",
        "COMENTARIO"
    ];

    // Mapeo interno de estados numéricos (estado_oportunidad: 1, 2, 3, 4)
    const MAPPING_ESTADOS = {
        1: "Pendiente",
        2: "No Cotizado",
        3: "Rechazado",
        4: "Cotizado"
    };

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
                            <span className="text-xs font-black text-blue-600 tracking-tight flex items-center gap-1">
                                {isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 rotate-45" />}
                                {item.codigo || "S/C"}
                            </span>
                            <StatusBadge status={MAPPING_ESTADOS[item.estado_oportunidad] || "Pendiente"} />
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

                        <div className="border-t border-gray-50 pt-2 flex flex-col gap-1 text-[9px] text-gray-500 font-semibold uppercase">
                            <div className="flex justify-between">
                                <span className="text-gray-400 font-bold">Recepción:</span>
                                <span>{formatDate(item.recepcion_solicitud)}</span>
                            </div>
                            {item.fecha_limite && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold">F. Límite:</span>
                                    <span className="text-red-600 font-black">{formatDate(item.fecha_limite)}</span>
                                </div>
                            )}
                            {item.visita_tecnica && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold">V. Técnica:</span>
                                    <span className="text-amber-600 font-black">{formatDate(item.visita_tecnica)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // Calculamos las páginas de forma local basándonos en el tamaño del array real
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
                            {/* CODIGO */}
                            <td className="px-4 py-2 whitespace-nowrap text-xs font-black text-blue-600 group-hover:text-blue-700 transition-colors">
                                <div className="flex items-center gap-1.5">
                                    {isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 rotate-45" />}
                                    <span>{item.codigo || "S/C"}</span>
                                </div>
                            </td>

                            {/* RECEPCION (Usa el nombre real del Serializer) */}
                            <td className="px-4 py-2 whitespace-nowrap text-[10px] text-gray-500 font-bold uppercase">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    {formatDate(item.recepcion_solicitud)}
                                </div>
                            </td>

                            {/* CLIENTE */}
                            <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex flex-col max-w-[200px]">
                                    <span className="text-xs font-black text-gray-900 truncate uppercase">
                                        {item.cliente_nombre}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-bold truncate uppercase">
                                        {item.representante_nombre || "S/R"}
                                    </span>
                                </div>
                            </td>

                            {/* DESCRIPCION (Mapea con 'referencia' del Serializer) */}
                            <td className="px-4 py-2">
                                <span className="text-xs text-gray-600 font-medium line-clamp-2 max-w-[300px]" title={item.referencia}>
                                    {item.referencia || "Sin descripción"}
                                </span>
                            </td>

                            {/* VISITA TECNICA */}
                            <td className="px-4 py-2 whitespace-nowrap text-[10px] text-gray-500 font-bold uppercase">
                                {item.visita_tecnica ? formatDate(item.visita_tecnica) : <span className="text-gray-300">-</span>}
                            </td>

                            {/* FECHA LIMITE */}
                            <td className="px-4 py-2 whitespace-nowrap text-[10px] text-gray-500 font-bold uppercase">
                                {item.fecha_limite ? formatDate(item.fecha_limite) : <span className="text-gray-300">-</span>}
                            </td>

                            {/* EMISION COTIZACION */}
                            <td className="px-4 py-2 whitespace-nowrap text-[10px] text-gray-600 font-black uppercase">
                                {item.emision_cotizacion ? (
                                    <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-md font-bold">
                                        {formatDate(item.emision_cotizacion)}
                                    </span>
                                ) : (
                                    <span className="text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">Pendiente</span>
                                )}
                            </td>

                            {/* ESTADO (Traduce el número 1-4 a texto legible usando el mapping) */}
                            <td className="px-4 py-2 whitespace-nowrap">
                                <StatusBadge status={MAPPING_ESTADOS[item.estado_oportunidad] || "Pendiente"} />
                            </td>

                            {/* COMENTARIO */}
                            <td className="px-4 py-2">
                                {item.comentario ? (
                                    <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-gray-600 transition-colors" title={item.comentario}>
                                        <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />
                                        <span className="text-xs text-gray-500 truncate max-w-[150px]">
                                            {item.comentario}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-gray-300">-</span>
                                )}
                            </td>
                        </tr>
                    );
                })}

                {/* Mensaje de feedback si la lista real viene vacía */}
                {data.length === 0 && !isLoading && (
                    <tr>
                        <td colSpan={headers.length} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs">
                            No se encontraron oportunidades registradas
                        </td>
                    </tr>
                )}
            </ERPTable>
        </div>
    );
};

export default TablaOportunidades;
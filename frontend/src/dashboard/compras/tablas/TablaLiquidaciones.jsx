import React from "react";
import { ERPTable } from "@/components/ui/ERPComponents";
import { formatDate } from "@/utils/formatters";
import { Pin, Briefcase, Package, Plane, Bus } from "lucide-react";

const TablaLiquidaciones = ({
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
  const headers = [
    "",
    "Nro Solicitud", 
    "Fecha", 
    "Código", 
    "Tipo", 
    "Area", 
    "Solicitante", 
    "Concepto", 
    "Estado", 
    "Monto $", 
    "Monto S/."
  ];

  const paginatedItems = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatUSD = (val) => {
    return `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatPEN = (val) => {
    return `S/. ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getRequestIcon = (item) => {
    const tipoGasto = String(item.tipo_gasto || "");
    const transporte = String(item.transporte || "");
    const tipo = String(item.tipo || "").toLowerCase();

    if (tipoGasto === "02" || tipo.includes("pasajes") || tipo.includes("viaje")) {
      if (transporte === "A" || tipo.includes("aéreo") || tipo.includes("aero")) {
        return (
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100/50 flex items-center justify-center w-8 h-8" title="Pasajes Aéreos">
            <Plane className="w-4 h-4 shrink-0" />
          </div>
        );
      }
      return (
        <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100/50 flex items-center justify-center w-8 h-8" title="Pasajes Terrestres">
          <Bus className="w-4 h-4 shrink-0" />
        </div>
      );
    }

    if (tipo.includes("servicio")) {
      return (
        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/50 flex items-center justify-center w-8 h-8" title="Orden de Servicio">
          <Briefcase className="w-4 h-4 shrink-0" />
        </div>
      );
    }

    return (
      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/50 flex items-center justify-center w-8 h-8" title="Orden de Compra / Suministro">
        <Package className="w-4 h-4 shrink-0" />
      </div>
    );
  };

  const getStatusBadge = (estado) => {
    const statusStr = String(estado || "Pendiente").toLowerCase();
    
    let colorClasses = "bg-slate-50 text-slate-700 border-slate-200";
    if (statusStr.includes("envio") || statusStr.includes("envío")) {
      colorClasses = "bg-red-50 text-red-700 border-red-200/50";
    } else if (statusStr.includes("atencion") || statusStr.includes("atención")) {
      colorClasses = "bg-amber-50 text-amber-700 border-amber-200/50";
    } else if (statusStr.includes("pendiente de liquidacion") || statusStr.includes("pendiente de liquidación")) {
      colorClasses = "bg-sky-50 text-sky-700 border-sky-200/50";
    } else if (statusStr.includes("enviada")) {
      colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
    } else if (statusStr.includes("aprobada")) {
      colorClasses = "bg-zinc-900 text-zinc-50 border-zinc-950";
    } else if (statusStr.includes("anulado")) {
      colorClasses = "bg-gray-100 text-gray-600 border-gray-300/50";
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${colorClasses}`}>
        {estado || "Pendiente"}
      </span>
    );
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
                : 'bg-white border-gray-100 hover:border-violet-100 active:scale-[0.99]'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {getRequestIcon(item)}
                <span className="text-xs font-black text-violet-600 tracking-tight flex items-center gap-1">
                  {isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 rotate-45" />}
                  {item.id_registro && item.id_registro.includes('_') ? item.id_registro.split('_')[1] : item.id_registro}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {getStatusBadge(item.estado_nombre)}
                <span className="text-[9px] font-black uppercase bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded border border-violet-100">
                  {item.tipo}
                </span>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-gray-400 font-bold uppercase">Código: {item.codigo}</div>
              <h4 className="text-xs font-black text-gray-900 line-clamp-1 uppercase mt-0.5">
                {item.nombre}
              </h4>
              {item.concepto && (
                <p className="text-[10px] text-gray-500 font-medium line-clamp-2 mt-0.5 leading-snug">
                  {item.concepto}
                </p>
              )}
            </div>

            <div className="border-t border-gray-50 pt-2 flex items-center justify-between text-[9px] font-bold text-gray-400">
              <div className="flex flex-col">
                <span>Área: {item.area}</span>
                <span>Fecha: {formatDate(item.fecha)}</span>
              </div>
              <div className="text-right text-xs font-black text-gray-950 flex flex-col">
                {item.monto_usd > 0 && <span className="text-violet-600">{formatUSD(item.monto_usd)}</span>}
                {item.monto_pen > 0 && <span className="text-teal-600">{formatPEN(item.monto_pen)}</span>}
                {item.monto_usd === 0 && item.monto_pen === 0 && <span>—</span>}
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
              {/* Icon */}
              <td className="px-4 py-2 text-center w-10">
                <div className="flex items-center justify-center">
                  {getRequestIcon(item)}
                </div>
              </td>

              {/* Nro Solicitud */}
              <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-violet-600">
                <div className="flex items-center gap-1.5">
                  {isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 rotate-45" />}
                  <span>{item.id_registro && item.id_registro.includes('_') ? item.id_registro.split('_')[1] : item.id_registro}</span>
                </div>
              </td>

              {/* Fecha */}
              <td className="px-4 py-2 whitespace-nowrap text-[10px] text-gray-600 font-black uppercase">
                {formatDate(item.fecha)}
              </td>

              {/* Código */}
              <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 font-bold uppercase tracking-tight">
                {item.codigo}
              </td>

              {/* Tipo */}
              <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-700 font-bold">
                {item.tipo}
              </td>

              {/* Area */}
              <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-500 font-bold uppercase tracking-tight">
                {item.area}
              </td>

              {/* Nombre */}
              <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-900 uppercase">
                {item.nombre}
              </td>

              {/* Concepto */}
              <td className="px-4 py-2">
                <div className="text-sm text-gray-600 font-medium line-clamp-1 max-w-xs xl:max-w-md" title={item.concepto}>
                  {item.concepto}
                </div>
              </td>

              {/* Estado */}
              <td className="px-4 py-2 whitespace-nowrap">
                {getStatusBadge(item.estado_nombre)}
              </td>

              {/* Monto $ */}
              <td className="px-4 py-2 whitespace-nowrap text-sm font-black text-violet-600 text-right">
                {item.monto_usd > 0 ? formatUSD(item.monto_usd) : "—"}
              </td>

              {/* Monto S/. */}
              <td className="px-4 py-2 whitespace-nowrap text-sm font-black text-teal-600 text-right">
                {item.monto_pen > 0 ? formatPEN(item.monto_pen) : "—"}
              </td>
            </tr>
          );
        })}

        {data.length === 0 && !isLoading && (
          <tr>
            <td colSpan={headers.length} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs">
              No se encontraron liquidaciones
            </td>
          </tr>
        )}
      </ERPTable>
    </div>
  );
};

export default TablaLiquidaciones;

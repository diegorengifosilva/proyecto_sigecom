import React from "react";
import { ERPTable } from "@/components/ui/ERPComponents";
import { formatDate } from "@/utils/formatters";
import { Wallet, User, CheckCircle2, ArrowUpRight } from "lucide-react";

const formatUSD = (val) => `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPEN = (val) => `S/. ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TablaAtencionSolicitud({
  data = [],
  isLoading = false,
  currentPage = 1,
  pageSize = 12,
  totalPages = 1,
  onPageChange,
  onRowClick,
  onAtender
}) {
  const headers = [
    "",
    "N° Solicitud",
    "Fecha",
    "Codigo",
    "Area",
    "Concepto",
    "Estado",
    "Monto $",
    "Monto S/.",
    { label: "Acción", className: "text-center" }
  ];

  const paginatedItems = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getRequestIcon = (item) => {
    return (
      <div className="p-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-200/60 flex items-center justify-center w-7 h-7 shrink-0" title={item.tipo || "Atención Caja Chica"}>
        <Wallet className="w-3.5 h-3.5 shrink-0" />
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
        const displayId =
          item.id_registro_directo ||
          (item.id_registro && String(item.id_registro).includes("_")
            ? item.id_registro.split("_")[1]
            : item.id_registro || item.nro_solicitud);
        const solicitante = item.nombre || item.solicitante_nombre || item.solicitante || "";

        return (
          <div
            key={item.id_registro}
            onClick={() => onRowClick?.(item)}
            className="p-3 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 transition-all cursor-pointer flex flex-col gap-2 shadow-sm active:scale-[0.99]"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {getRequestIcon(item)}
                <div>
                  <span className="text-xs font-black text-slate-800 tracking-tight block">
                    #{displayId}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    {item.codigo}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {getStatusBadge(item.estado_nombre)}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-800 font-bold line-clamp-2">
                {item.concepto}
              </p>
              {solicitante && (
                <span
                  className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 truncate mt-0.5"
                  title={`Solicitante: ${solicitante}`}
                >
                  <User className="w-3 h-3 text-purple-600 shrink-0" />
                  <span className="truncate">{solicitante}</span>
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1 border-t border-gray-50">
              <span>{item.area}</span>
              <div className="font-bold text-gray-900 flex gap-2">
                <span className="text-emerald-600">{formatPEN(item.monto_pen)}</span>
                <span className="text-sky-600">{formatUSD(item.monto_usd)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 flex justify-end" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onAtender?.(item)}
                className="w-full py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Atender Solicitud</span>
              </button>
            </div>
          </div>
        );
      })}
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
            No se encontraron solicitudes para atender en este período.
          </td>
        </tr>
      ) : (
        paginatedItems.map((item) => {
          const displayId =
            item.id_registro_directo ||
            (item.id_registro && String(item.id_registro).includes("_")
              ? item.id_registro.split("_")[1]
              : item.id_registro || item.nro_solicitud);
          const solicitante = item.nombre || item.solicitante_nombre || item.solicitante || "";

          return (
            <tr
              key={item.id_registro}
              onClick={() => onRowClick?.(item)}
              className="hover:bg-slate-50/70 transition-colors cursor-pointer text-xs group"
            >
              {/* 1. Icono */}
              <td className="px-4 py-2 text-center w-10">
                <div className="flex items-center justify-center">
                  {getRequestIcon(item)}
                </div>
              </td>

              {/* 2. N° Solicitud */}
              <td className="px-4 py-3 font-black text-slate-800 whitespace-nowrap">
                <span>{displayId}</span>
              </td>

              {/* 3. Fecha */}
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {formatDate(item.fecha)}
              </td>

              {/* 4. Codigo */}
              <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                {item.codigo}
              </td>

              {/* 5. Area */}
              <td className="px-4 py-3 text-gray-600 max-w-[130px] truncate" title={item.area}>
                {item.area}
              </td>

              {/* 6. Concepto (Concepto + Solicitante en 2 líneas) */}
              <td className="px-4 py-2.5 max-w-[280px] xl:max-w-[380px]">
                <div className="flex flex-col justify-center leading-tight py-0.5">
                  <span className="font-bold text-slate-800 truncate" title={item.concepto || "—"}>
                    {item.concepto || "—"}
                  </span>
                  {solicitante ? (
                    <span
                      className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 truncate mt-0.5"
                      title={`Solicitante: ${solicitante}`}
                    >
                      <User className="w-3 h-3 text-purple-600 shrink-0" />
                      <span className="truncate">{solicitante}</span>
                    </span>
                  ) : null}
                </div>
              </td>

              {/* 7. Estado */}
              <td className="px-4 py-3 whitespace-nowrap">
                {getStatusBadge(item.estado_nombre)}
              </td>

              {/* 8. Monto $ */}
              <td className="px-4 py-3 font-black text-indigo-700 whitespace-nowrap text-right">
                {formatUSD(item.monto_usd)}
              </td>

              {/* 9. Monto S/. */}
              <td className="px-4 py-3 font-black text-emerald-700 whitespace-nowrap text-right">
                {formatPEN(item.monto_pen)}
              </td>

              {/* 10. Acción Rápida: Atender */}
              <td className="px-3 py-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onAtender?.(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-[10.5px] uppercase tracking-wider shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Atender Solicitud y pasar a Liquidaciones"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Atender</span>
                </button>
              </td>
            </tr>
          );
        })
      )}
    </ERPTable>
  );
}

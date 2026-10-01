import React from "react";
import { ERPTable } from "@/components/ui/ERPComponents";
import { formatDate } from "@/utils/formatters";

const formatUSD = (val) => `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPEN = (val) => `S/. ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TablaCajaChica({
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
    "Tipo",
    "Fecha",
    "Referencia",
    "Operacion",
    "Moneda",
    "Tipo Cambio",
    "Monto $",
    "Monto S/."
  ];

  const paginatedItems = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getTipoBadge = (tipo) => {
    const t = String(tipo || "Caja Chica").trim();
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
        {t}
      </span>
    );
  };

  const getMonedaBadge = (moneda) => {
    const isUSD = String(moneda).toUpperCase() === "USD" || String(moneda).toUpperCase() === "D";
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
        isUSD ? "bg-sky-50 text-sky-700 border border-sky-200/50" : "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
      }`}>
        {isUSD ? "USD" : "PEN"}
      </span>
    );
  };

  const mobileCards = (
    <div className="flex flex-col gap-2">
      {paginatedItems.map((item) => (
        <div
          key={item.id_registro}
          onClick={() => onRowClick?.(item)}
          className="p-3 rounded-xl border border-gray-100 bg-white hover:border-emerald-200 transition-all cursor-pointer flex flex-col gap-2 shadow-sm active:scale-[0.99]"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-700 tracking-tight">
                Reg. {item.registro}
              </span>
              <span className="text-[10px] font-bold text-gray-500">
                {item.referencia}
              </span>
            </div>
            {getTipoBadge(item.tipo)}
          </div>
          <div className="flex justify-between items-center text-xs text-gray-700">
            <span>{item.operacion}</span>
            <span className="text-gray-400">{formatDate(item.fecha)}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              {getMonedaBadge(item.moneda)}
              <span>TC: {Number(item.tipo_cambio || 0).toFixed(3)}</span>
            </div>
            <div className="font-bold text-gray-900 flex gap-2">
              <span className="text-emerald-600">{formatPEN(item.monto_pen)}</span>
              <span className="text-sky-600">{formatUSD(item.monto_usd)}</span>
            </div>
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
            No se encontraron registros de caja chica en este período.
          </td>
        </tr>
      ) : (
        paginatedItems.map((item) => (
          <tr
            key={item.id_registro}
            onClick={() => onRowClick?.(item)}
            className="hover:bg-emerald-50/40 transition-colors cursor-pointer text-xs group"
          >
            {/* 1. Registro */}
            <td className="px-4 py-3 font-black text-emerald-700 whitespace-nowrap">
              {item.registro}
            </td>

            {/* 2. Tipo */}
            <td className="px-4 py-3 whitespace-nowrap">
              {getTipoBadge(item.tipo)}
            </td>

            {/* 3. Fecha */}
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
              {formatDate(item.fecha)}
            </td>

            {/* 4. Referencia */}
            <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
              {item.referencia}
            </td>

            {/* 5. Operacion */}
            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
              {item.operacion}
            </td>

            {/* 6. Moneda */}
            <td className="px-4 py-3 whitespace-nowrap">
              {getMonedaBadge(item.moneda)}
            </td>

            {/* 7. Tipo Cambio */}
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-right">
              {Number(item.tipo_cambio || 0).toFixed(3)}
            </td>

            {/* 8. Monto $ */}
            <td className="px-4 py-3 font-black text-sky-700 whitespace-nowrap text-right">
              {formatUSD(item.monto_usd)}
            </td>

            {/* 9. Monto S/. */}
            <td className="px-4 py-3 font-black text-emerald-700 whitespace-nowrap text-right">
              {formatPEN(item.monto_pen)}
            </td>
          </tr>
        ))
      )}
    </ERPTable>
  );
}

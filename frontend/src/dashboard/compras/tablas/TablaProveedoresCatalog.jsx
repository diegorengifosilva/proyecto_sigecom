import React, { useMemo } from "react";
import { ERPTable } from "@/components/ui/ERPComponents";
import { Search, Plus } from "lucide-react";

export default function TablaProveedoresCatalog({
  data = [],
  isLoading = false,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  onRowClick,
  searchTerm = "",
  onSearchChange,
  buttonLabel = "Nuevo Proveedor",
  onNewClick
}) {
  const headers = [
    { label: "CÓDIGO", className: "w-24 text-center" },
    { label: "NOMBRE", className: "text-left" },
    { label: "INICIALES", className: "w-28 text-center" },
    { label: "RUC", className: "w-32 text-center" },
    { label: "DIRECCIÓN", className: "text-left" },
    { label: "ESTADO", className: "w-24 text-center" }
  ];

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return data;
    return data.filter((c) => {
      const code = c.id_cliente_formateado || String(c.id_cliente || "");
      const name = (c.nombre || "").toLowerCase();
      const ruc = c.ruc || "";
      const initials = (c.iniciales || "").toLowerCase();
      return (
        code.includes(term) ||
        name.includes(term) ||
        ruc.includes(term) ||
        initials.includes(term)
      );
    });
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedItems = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const mobileCards = (
    <div className="flex flex-col gap-2">
      {paginatedItems.map((item) => {
        const isActivo = item.activo === true || item.activo === "1" || item.activo === 1;
        const cod = item.id_cliente_formateado || String(item.id_cliente).padStart(5, "0");
        return (
          <div
            key={item.id_cliente}
            onClick={() => onRowClick?.(item)}
            className="p-2.5 rounded-xl border border-gray-100 bg-white hover:border-teal-200 transition-all cursor-pointer flex flex-col gap-1.5 active:scale-[0.99] shadow-xs"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-black font-mono text-teal-700 tracking-tight">
                {cod}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                  isActivo
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                {isActivo ? "Activo" : "Inactivo"}
              </span>
            </div>

            <div>
              <h4 className="text-xs font-black text-gray-900 uppercase line-clamp-1">
                {item.nombre}
              </h4>
              {item.direccion && (
                <p className="text-[10px] text-gray-500 font-medium line-clamp-1 mt-0.5">
                  {item.direccion}
                </p>
              )}
            </div>

            <div className="border-t border-gray-50 pt-1.5 flex items-center justify-between text-[10px] text-gray-500 font-medium">
              <span>RUC: <strong className="font-mono text-gray-800">{item.ruc || "-"}</strong></span>
              <span>{item.iniciales || "-"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
      {/* TOOLBAR ESTILO COMERCIAL: BUSCADOR Y BOTÓN NUEVO */}
      <div className="p-2 sm:px-3 sm:py-2 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 bg-gray-50/40">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o RUC..."
            value={searchTerm}
            onChange={(e) => {
              onSearchChange?.(e.target.value);
              onPageChange?.(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
          />
        </div>

        <button
          type="button"
          onClick={onNewClick}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={3} />
          <span>{buttonLabel}</span>
        </button>
      </div>

      {/* TABLA RESPONSIVA ERP */}
      <div className="flex-1 min-h-0">
        <ERPTable
          loading={isLoading}
          headers={headers}
          mobileCards={mobileCards}
          pagination={{
            currentPage,
            totalPages,
            total: filteredData.length,
            from: filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0,
            to: Math.min(currentPage * pageSize, filteredData.length),
            onPageChange
          }}
        >
          {paginatedItems.map((item) => {
            const isActivo = item.activo === true || item.activo === "1" || item.activo === 1;
            const cod = item.id_cliente_formateado || String(item.id_cliente).padStart(5, "0");
            return (
              <tr
                key={item.id_cliente}
                onClick={() => onRowClick?.(item)}
                className="h-[42px] hover:bg-teal-50/40 transition-colors cursor-pointer group text-xs text-gray-700 border-b border-gray-100 last:border-b-0"
              >
                <td className="px-3 py-1.5 text-center font-mono font-bold text-gray-600">
                  {cod}
                </td>
                <td className="px-3 py-1.5 text-left font-semibold text-gray-900 uppercase truncate max-w-[240px]">
                  {item.nombre}
                </td>
                <td className="px-3 py-1.5 text-center font-medium text-gray-500 uppercase">
                  {item.iniciales || "-"}
                </td>
                <td className="px-3 py-1.5 text-center font-mono font-medium text-gray-700">
                  {item.ruc || "-"}
                </td>
                <td className="px-3 py-1.5 text-left font-medium text-gray-500 truncate max-w-[240px]">
                  {item.direccion || "-"}
                </td>
                <td className="px-3 py-1.5 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                      isActivo
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                  >
                    {isActivo ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            );
          })}
        </ERPTable>
      </div>
    </div>
  );
}

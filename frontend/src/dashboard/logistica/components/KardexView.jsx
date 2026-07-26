import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { Loader, Package, AlertCircle, Search, X, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Table from "@/components/ui/table";
import FilterCardKardex from "@/components/ui/FilterCardKardex";
import XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function KardexView() {
  const { authUser: user } = useAuth();
  const [kardexRows, setKardexRows] = useState([]);
  const [processingFilters, setProcessingFilters] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [annoActual] = useState(new Date().getFullYear());
  const [searchInput, setSearchInput] = useState("");

  const calcularKardexDesdeMovimientos = (movs, tmo) => {
    let tcan = 0, tval = 0, ttot = 0;
    const rows = [];

    movs.forEach((row) => {
      const esEntrada = row.ope === "E";
      let ecan = 0, evalp = 0, etot = 0;
      let scan = 0, sval = 0, stot = 0;

      if (esEntrada) {
        ecan = Number(row.can || 0);
        if (tmo === "S") {
          evalp = row.tmo === "S" ? Number(row.val || 0) : Number(row.val || 0) * Number(row.tc || 0);
        } else {
          evalp = row.tmo === "D" ? Number(row.val || 0) : Number(row.val || 0) / Number(row.tc || 1);
        }
        etot = ecan * evalp;
        tcan += ecan;
        ttot += etot;
        tval = tcan > 0 ? ttot / tcan : 0;
      } else {
        scan = Number(row.can || 0);
        sval = tval;
        stot = scan * sval;
        tcan -= scan;
        ttot -= stot;
      }

      rows.push({
        fecha: row.fec,
        tipo: row.ope,
        referencia: row.dor,
        ingreso_cant: esEntrada ? ecan : 0,
        ingreso_precio: esEntrada ? evalp : 0,
        ingreso_total: esEntrada ? etot : 0,
        salida_cant: esEntrada ? 0 : scan,
        salida_precio: esEntrada ? 0 : sval,
        salida_total: esEntrada ? 0 : stot,
        saldo_cant: tcan,
        saldo_precio: tval,
        saldo_total: ttot,
      });
    });
    return rows;
  };

  const fetchKardex = async (filtersObj) => {
    try {
      const params = {
        anno: filtersObj.anio || filtersObj.anno,
        mes: filtersObj.mes,
        cod: filtersObj.producto,
        tmo: filtersObj.moneda,
      };

      const { data } = await api.get("logistica/kardex_base/", { params });
      const rows = calcularKardexDesdeMovimientos(data || [], params.tmo);
      setKardexRows(rows);
      setSearchInput(""); // Limpiar búsqueda al procesar nuevos filtros
    } catch (error) {
      console.error("Error fetching kardex:", error);
      toast.error("Error al cargar los datos del Kardex");
    }
  };

  const handleReport = async (filtros) => {
    const producto = filtros?.producto || "";
    if (!producto || producto === "%") {
      toast.warning("Debe seleccionar un producto.");
      return;
    }

    try {
      setReportLoading(true);
      const params = {
        anno: filtros.anio || "%",
        mes: filtros.mes || "%",
        cod: filtros.producto,
        moneda: filtros.moneda || "S"
      };

      const response = await api.get("/cotizaciones/reportes/reporte_kardex_pdf/", {
        params,
        responseType: "blob"
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo generar el reporte");
    } finally {
      setReportLoading(false);
    }
  };

  // Filtrado reactivo en tiempo real
  const filteredKardexRows = kardexRows.filter(row => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return true;
    return (
      (row.fecha || "").toLowerCase().includes(q) ||
      (row.referencia || "").toLowerCase().includes(q) ||
      (row.tipo === "E" ? "ingreso" : "salida").includes(q)
    );
  });

  const exportToExcel = () => {
    const dataToExport = filteredKardexRows;
    if (dataToExport.length === 0) {
      toast.warn("No hay datos filtrados para exportar");
      return;
    }

    const mappedData = dataToExport.map(row => ({
      "Fecha": row.fecha,
      "Tipo": row.tipo === "E" ? "Ingreso" : "Salida",
      "Referencia": row.referencia || "-",
      "Ingreso Cant": row.ingreso_cant || 0,
      "Ingreso Precio": row.ingreso_precio || 0,
      "Ingreso Total": row.ingreso_total || 0,
      "Salida Cant": row.salida_cant || 0,
      "Salida Precio": row.salida_precio || 0,
      "Salida Total": row.salida_total || 0,
      "Saldo Cant": row.saldo_cant || 0,
      "Saldo Precio": row.saldo_precio || 0,
      "Saldo Total": row.saldo_total || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(mappedData);

    const headerStyle = {
      fill: { fgColor: { rgb: "4F46E5" } }, // Indigo-600
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "CBD5E1" } },
        bottom: { style: "medium", color: { rgb: "312E81" } },
        left: { style: "thin", color: { rgb: "CBD5E1" } },
        right: { style: "thin", color: { rgb: "CBD5E1" } }
      }
    };

    const cellStyleEven = {
      font: { name: "Arial", sz: 9, color: { rgb: "1E293B" } },
      border: {
        top: { style: "thin", color: { rgb: "F1F5F9" } },
        bottom: { style: "thin", color: { rgb: "F1F5F9" } },
        left: { style: "thin", color: { rgb: "F1F5F9" } },
        right: { style: "thin", color: { rgb: "F1F5F9" } }
      }
    };

    const cellStyleOdd = {
      fill: { fgColor: { rgb: "F8FAFC" } }, // Zebra style (Slate-50)
      font: { name: "Arial", sz: 9, color: { rgb: "1E293B" } },
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      }
    };

    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    worksheet["!rows"] = [{ hpx: 28 }];

    for (let R = range.s.r; R <= range.e.r; ++R) {
      if (R > 0) worksheet["!rows"][R] = { hpx: 20 };

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = worksheet[cell_ref];
        if (!cell) continue;

        if (R === 0) {
          cell.s = headerStyle;
        } else {
          cell.s = R % 2 === 0 ? cellStyleEven : cellStyleOdd;

          if (typeof cell.v === "number") {
            cell.s = { ...cell.s, alignment: { horizontal: "right" } };
          } else if (cell.v === "Ingreso" || cell.v === "Salida") {
            cell.s = {
              ...cell.s,
              alignment: { horizontal: "center" },
              font: {
                ...cell.s.font,
                bold: true,
                color: { rgb: cell.v === "Ingreso" ? "0D9488" : "EA580C" }
              }
            };
          }
        }
      }
    }

    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 12;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = worksheet[XLSX.utils.encode_cell({ c: C, r: R })];
        if (cell && cell.v) {
          maxLen = Math.max(maxLen, String(cell.v).length);
        }
      }
      colWidths.push({ wch: maxLen + 3 });
    }
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kardex");
    XLSX.writeFile(workbook, `kardex_reporte_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Reporte de Excel de Kardex generado correctamente");
  };

  const exportToPDF = () => {
    const dataToExport = filteredKardexRows;
    if (dataToExport.length === 0) {
      toast.warn("No hay datos filtrados para exportar");
      return;
    }

    const doc = new jsPDF("landscape");
    
    // Header banner (Slate-800)
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 300, 38, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("KARDEX VALORIZADO DE ARTÍCULO", 14, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(226, 232, 240); // Slate-200
    const dateStr = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
    doc.text(`Generado: ${dateStr} | Total movimientos: ${dataToExport.length}`, 14, 28);

    const columns = [
      "Fecha", "Tipo", "Referencia", 
      "Ing. Cant", "Ing. Prc", "Ing. Tot", 
      "Sal. Cant", "Sal. Prc", "Sal. Tot", 
      "Sal. Cant", "Sal. Prc", "Sal. Tot"
    ];
    const rows = dataToExport.map(row => [
      row.fecha,
      row.tipo === "E" ? "Ingreso" : "Salida",
      row.referencia || "-",
      row.ingreso_cant || "-",
      row.ingreso_precio > 0 ? row.ingreso_precio.toFixed(4) : "-",
      row.ingreso_total > 0 ? row.ingreso_total.toFixed(2) : "-",
      row.salida_cant || "-",
      row.salida_precio > 0 ? row.salida_precio.toFixed(4) : "-",
      row.salida_total > 0 ? row.salida_total.toFixed(2) : "-",
      row.saldo_cant,
      row.saldo_precio.toFixed(4),
      row.saldo_total.toFixed(2)
    ]);

    autoTable(doc, {
      startY: 46,
      head: [columns],
      body: rows,
      theme: 'striped',
      headStyles: { 
        fillColor: [71, 85, 105], // Slate-600
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { 
        fontSize: 7.5, 
        textColor: [15, 23, 42]
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'center' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'center' },
        10: { halign: 'right' },
        11: { halign: 'right' }
      },
      didParseCell: function (data) {
        if (data.column.index === 1 && data.cell.section === 'body') {
          if (data.cell.raw === 'Ingreso') {
            data.cell.styles.textColor = [13, 148, 136];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'Salida') {
            data.cell.styles.textColor = [234, 88, 12];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { top: 46 }
    });

    doc.save(`kardex_reporte_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Reporte de PDF de Kardex generado correctamente");
  };

  const inventarioFinal = filteredKardexRows.length ? filteredKardexRows[filteredKardexRows.length - 1] : null;
  const baseRowClasses = "grid grid-cols-[110px_50px_1fr_repeat(9,minmax(85px,1fr))]";

  return (
    <div className="flex flex-col h-full p-6">
      <div className="w-full mb-4">
        <FilterCardKardex
          onProcess={async (filters) => {
            if (!filters.producto || filters.producto === "%") {
              toast.warning("Seleccione un producto");
              return;
            }
            setProcessingFilters(true);
            await fetchKardex(filters);
            setProcessingFilters(false);
          }}
          onReport={handleReport}
          onClear={() => {
            setKardexRows([]);
            setSearchInput("");
          }}
          reportLoading={reportLoading}
        />
      </div>

      {/* Buscador de Movimientos */}
      {kardexRows.length > 0 && (
        <div className="w-full max-w-md mb-4 self-start">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-400">
              <Search size={14} />
            </span>
            <input 
              type="text" 
              value={searchInput} 
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Filtrar movimientos por fecha o referencia..." 
              className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 font-semibold" 
            />
            {searchInput && (
              <button 
                onClick={() => setSearchInput("")} 
                className="absolute right-2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                title="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto relative rounded-xl border border-slate-200 bg-white shadow-sm custom-scrollbar">
        {processingFilters && (
          <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        )}

        <div className="min-w-[1100px] flex flex-col">
          <div className={`${baseRowClasses} bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-700`}>
            <div className="col-span-3 px-3 py-2 border-r border-slate-200">Datos del Movimiento</div>
            <div className="col-span-3 px-3 py-2 text-center border-r border-slate-200 bg-teal-50/50">Ingreso</div>
            <div className="col-span-3 px-3 py-2 text-center border-r border-slate-200 bg-orange-50/50">Salida</div>
            <div className="col-span-3 px-3 py-2 text-center bg-green-50/50">Saldo Final</div>
          </div>

          <div className={`${baseRowClasses} bg-slate-50 border-b border-slate-300 text-[10px] font-semibold text-slate-600`}>
            <div className="px-3 py-2 border-r border-slate-200">Fecha</div>
            <div className="px-3 py-2 border-r border-slate-200 text-center">Tipo</div>
            <div className="px-3 py-2 border-r border-slate-200">Referencia</div>
            <div className="px-2 py-2 text-center border-r border-slate-200 bg-teal-50/30">Cant.</div>
            <div className="px-2 py-2 text-right border-r border-slate-200 bg-teal-50/30">Precio</div>
            <div className="px-2 py-2 text-right border-r border-slate-200 bg-teal-50/30">Total</div>
            <div className="px-2 py-2 text-center border-r border-slate-200 bg-orange-50/30">Cant.</div>
            <div className="px-2 py-2 text-right border-r border-slate-200 bg-orange-50/30">Precio</div>
            <div className="px-2 py-2 text-right border-r border-slate-200 bg-orange-50/30">Total</div>
            <div className="px-2 py-2 text-center border-r border-slate-200 bg-green-50/30">Cant.</div>
            <div className="px-2 py-2 text-right border-r border-slate-200 bg-green-50/30">Precio</div>
            <div className="px-2 py-2 text-right bg-green-50/30">Total</div>
          </div>

          <div className="overflow-y-auto">
            {filteredKardexRows.length === 0 && !processingFilters && (
              <div className="p-10 text-center text-slate-400 text-sm font-semibold flex flex-col items-center gap-2">
                <Package size={40} className="opacity-20" />
                No hay datos para mostrar
              </div>
            )}
            {filteredKardexRows.map((row, idx) => (
              <div key={idx} className={`${baseRowClasses} hover:bg-teal-50/40 border-b border-slate-200 transition-colors`}>
                <div className="px-3 py-2 text-[11px] tabular-nums text-slate-700 border-r border-slate-100">{row.fecha}</div>
                <div className="px-3 py-2 text-[11px] font-bold text-center border-r border-slate-100">
                  <span className={row.tipo === "E" ? "text-teal-600" : "text-orange-600"}>{row.tipo}</span>
                </div>
                <div className="px-3 py-2 text-[11px] text-slate-600 truncate border-r border-slate-100" title={row.referencia}>{row.referencia}</div>
                <div className="px-2 py-2 text-center text-[11px] tabular-nums font-medium border-r border-slate-100">{row.ingreso_cant || "-"}</div>
                <div className="px-2 py-2 text-right text-[11px] tabular-nums text-slate-500 border-r border-slate-100">{row.ingreso_precio > 0 ? row.ingreso_precio.toFixed(4) : "-"}</div>
                <div className="px-2 py-2 text-right text-[11px] tabular-nums font-semibold text-slate-700 border-r border-slate-100">{row.ingreso_total > 0 ? row.ingreso_total.toFixed(2) : "-"}</div>
                <div className="px-2 py-2 text-center text-[11px] tabular-nums font-medium border-r border-slate-100">{row.salida_cant || "-"}</div>
                <div className="px-2 py-2 text-right text-[11px] tabular-nums text-slate-500 border-r border-slate-100">{row.salida_precio > 0 ? row.salida_precio.toFixed(4) : "-"}</div>
                <div className="px-2 py-2 text-right text-[11px] tabular-nums font-semibold text-slate-700 border-r border-slate-100">{row.salida_total > 0 ? row.salida_total.toFixed(2) : "-"}</div>
                <div className="px-2 py-2 text-center text-[11px] tabular-nums font-bold text-slate-800 border-r border-slate-100 bg-slate-50/30">{row.saldo_cant}</div>
                <div className="px-2 py-2 text-right text-[11px] tabular-nums text-slate-600 border-r border-slate-100 bg-slate-50/30">{row.saldo_precio.toFixed(4)}</div>
                <div className="px-2 py-2 text-right text-[11px] tabular-nums font-black text-amber-600 bg-slate-50/30">{row.saldo_total.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {inventarioFinal && (
            <div className={`${baseRowClasses} bg-slate-800 text-white font-bold border-t-2 border-slate-900 sticky bottom-0`}>
              <div className="col-span-3 px-4 py-3 text-xs uppercase tracking-widest">Inventario Final:</div>
              <div className="col-span-3 border-r border-slate-700" />
              <div className="col-span-3 border-r border-slate-700" />
              <div className="px-2 py-3 text-center text-xs tabular-nums">{inventarioFinal.saldo_cant}</div>
              <div className="px-2 py-3 text-right text-xs tabular-nums text-slate-300">{inventarioFinal.saldo_precio.toFixed(4)}</div>
              <div className="px-2 py-3 text-right text-xs tabular-nums text-amber-400">{inventarioFinal.saldo_total.toFixed(2)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Reportes */}
      {filteredKardexRows.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <span className="text-xs text-slate-500 font-medium">
            Total: <span className="font-bold text-slate-800">{filteredKardexRows.length}</span> registros cargados
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToPDF}
              className="flex items-center justify-center gap-2 px-3 py-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
              title="Exportar reporte PDF"
            >
              <Download size={14} />
              PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-3 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
              title="Exportar reporte Excel"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

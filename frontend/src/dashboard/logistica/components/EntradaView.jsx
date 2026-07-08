import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePlus, Eye, Loader, Search, RefreshCw, X, Download, FileSpreadsheet } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Table from "@/components/ui/table";
import { getEstadoColor, getEstadoNombre } from "@/components/ui/colors";
import NuevaLogisticaModal from "@/modal/logistica/NuevaLogisticaModal";
import api from "@/services/api";
import { toast } from "react-toastify";
import XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const CURRENT_YEAR = new Date().getFullYear().toString();
const MESES = [
  { value: "%", label: "Todos" },
  { value: "01", label: "Enero" },   { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },   { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },    { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },   { value: "08", label: "Agosto" },
  { value: "09", label: "Sep" },     { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },     { value: "12", label: "Dic" },
];

const monedaTabla = (tmo) => ({ S: "Soles", D: "Dólares" }[tmo] || tmo || ".");

export default function EntradaView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [anno, setAnno] = useState(CURRENT_YEAR);
  const [mes, setMes] = useState("%");
  const [almacen, setAlmacen] = useState("%");
  const [estado, setEstado] = useState("%");
  const [searchInput, setSearchInput] = useState("");

  const [openNueva, setOpenNueva] = useState(false);

  const goToDetalle = (numReg) => navigate(`/sigecom/logistica/entradas/${numReg}`);

  const { data: almacenes = [] } = useQuery({
    queryKey: ["almacenes_new"],
    queryFn: () => api.get("logistica/dashboard/almacenes/").then(r => Array.isArray(r.data) ? r.data : []),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isFetching } = useQuery({
    queryKey: ["logistica_entradas", { anno, mes, almacen, estado }],
    queryFn: () =>
      api.get("logistica/dashboard/", {
        params: { operacion: "E", anno: anno || "%", mes: mes || "%", almacen: almacen || "%", estado: estado || "%", general: "" },
      }).then(r => r.data),
    staleTime: 30 * 1000,
  });

  const movimientos = (data?.tabla || []).filter(m => m.ope === "E");

  // Filtrado dinámico en tiempo real (mientras escribe)
  const filteredMovimientos = movimientos.filter(m => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return true;
    return (
      String(m.num_reg).toLowerCase().includes(q) ||
      (m.dor || "").toLowerCase().includes(q) ||
      (m.oco || "").toLowerCase().includes(q) ||
      (m.nfa || "").toLowerCase().includes(q) ||
      (m.ngu || "").toLowerCase().includes(q) ||
      (m.nom_alm || "").toLowerCase().includes(q)
    );
  });

  const onRefresh = () => queryClient.invalidateQueries({ queryKey: ["logistica_entradas"] });

  const exportToExcel = () => {
    const dataToExport = filteredMovimientos;
    if (dataToExport.length === 0) {
      toast.warn("No hay datos filtrados para exportar");
      return;
    }

    const mappedData = dataToExport.map(item => ({
      "N° Registro": item.num_reg,
      "Fecha": item.fec,
      "O/Compra": item.oco || "-",
      "Nombre / Proveedor": item.dor || "-",
      "Factura": item.nfa || "-",
      "Guía": item.ngu || "-",
      "Almacén": item.nom_alm || "-",
      "Moneda": item.tmo === "S" ? "Soles" : "Dólares",
      "Total Soles": item.sol != null ? Number(item.sol) : 0,
      "Total Dólares": item.dol != null ? Number(item.dol) : 0,
      "Estado": item.est === "1" ? "ACTIVO" : "ANULADO"
    }));

    const worksheet = XLSX.utils.json_to_sheet(mappedData);

    const headerStyle = {
      fill: { fgColor: { rgb: "0D9488" } }, // Teal-600 (Color del sistema para Entradas)
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "CBD5E1" } },
        bottom: { style: "medium", color: { rgb: "0F766E" } },
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
      fill: { fgColor: { rgb: "F0FDFA" } }, // Zebra style (Teal-50)
      font: { name: "Arial", sz: 9, color: { rgb: "1E293B" } },
      border: {
        top: { style: "thin", color: { rgb: "CCFBF1" } },
        bottom: { style: "thin", color: { rgb: "CCFBF1" } },
        left: { style: "thin", color: { rgb: "CCFBF1" } },
        right: { style: "thin", color: { rgb: "CCFBF1" } }
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
          } else if (cell.v === "ACTIVO" || cell.v === "ANULADO") {
            cell.s = {
              ...cell.s,
              alignment: { horizontal: "center" },
              font: {
                ...cell.s.font,
                bold: true,
                color: { rgb: cell.v === "ACTIVO" ? "10B981" : "EF4444" }
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entradas");
    XLSX.writeFile(workbook, `entradas_reporte_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Reporte de Excel de Entradas generado correctamente");
  };

  const exportToPDF = () => {
    const dataToExport = filteredMovimientos;
    if (dataToExport.length === 0) {
      toast.warn("No hay datos filtrados para exportar");
      return;
    }

    const doc = new jsPDF();
    
    // Header banner (Teal-600)
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 220, 38, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("REPORTE DE ENTRADAS DE ALMACÉN", 14, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(204, 251, 241); // Teal-100
    const dateStr = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
    doc.text(`Generado: ${dateStr} | Total registros: ${dataToExport.length}`, 14, 28);

    const columns = ["N° Reg", "Fecha", "O/C", "Proveedor", "Guía", "Almacén", "Soles", "Dólares", "Estado"];
    const rows = dataToExport.map(item => [
      item.num_reg,
      item.fec ? item.fec.split("T")[0] : "-",
      item.oco || "-",
      item.dor || "-",
      item.ngu || "-",
      item.nom_alm || "-",
      item.sol != null ? `S/. ${Number(item.sol).toFixed(2)}` : "-",
      item.dol != null ? `$ ${Number(item.dol).toFixed(2)}` : "-",
      item.est === "1" ? "ACTIVO" : "ANULADO"
    ]);

    autoTable(doc, {
      startY: 46,
      head: [columns],
      body: rows,
      theme: 'striped',
      headStyles: { 
        fillColor: [15, 118, 110], // Teal-700
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { 
        fontSize: 7.5, 
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 18 },
        6: { halign: 'right', cellWidth: 20 },
        7: { halign: 'right', cellWidth: 20 },
        8: { halign: 'center', cellWidth: 18 }
      },
      didParseCell: function (data) {
        if (data.column.index === 8 && data.cell.section === 'body') {
          if (data.cell.raw === 'ACTIVO') {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'ANULADO') {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { top: 46 }
    });

    doc.save(`entradas_reporte_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Reporte de PDF de Entradas generado correctamente");
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Filtros */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Anno</label>
          <input type="number" value={anno} onChange={e => setAnno(e.target.value)}
            className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5 bg-white" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value)}
            className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
            {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Almacen</label>
          <select value={almacen} onChange={e => setAlmacen(e.target.value)}
            className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
            <option value="%">Todos</option>
            {almacenes.map(a => <option key={a.idalmacen} value={a.idalmacen}>{a.nombre}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Estado</label>
          <select value={estado} onChange={e => setEstado(e.target.value)}
            className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
            <option value="%">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="ANULADO">Anulado</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Búsqueda</label>
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={searchInput} 
              onChange={e => setSearchInput(e.target.value)}
              placeholder="N°, proveedor, O/C..." 
              className="w-full text-xs border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500" 
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
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto relative rounded-xl border border-slate-200 bg-white shadow-sm min-h-[400px]">
        {isFetching && (
          <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        )}
        <Table
          headers={["N° Registro", "Fecha", "O/Compra", "Nombre", "Factura", "Guia", "Almacen", "Mon.", "Soles", "Dolares", "", ""].map(h => (
            <span key={h} className="text-[10px] font-black uppercase tracking-wider text-slate-800 text-center block">{h}</span>
          ))}
          data={filteredMovimientos}
          onRowClick={c => goToDetalle(c.num_reg)}
          renderRow={c => [
            <span className="text-xs font-bold text-indigo-700 tabular-nums">{c.num_reg}</span>,
            <span className="text-xs text-slate-700">{c.fec ? c.fec.split("T")[0] : ""}</span>,
            <span className="text-xs text-slate-600">{c.oco || "."}</span>,
            <span className="text-xs font-semibold text-slate-800 uppercase">{c.dor || "."}</span>,
            <span className="text-xs text-slate-600">{c.nfa || "."}</span>,
            <span className="text-xs text-slate-600">{c.ngu || "."}</span>,
            <span className="text-xs text-slate-600">{c.nom_alm || "."}</span>,
            <span className="text-[10px] font-bold text-slate-400">{monedaTabla(c.tmo)}</span>,
            <span className="text-xs font-bold text-slate-800 tabular-nums">
              {c.sol != null ? Number(c.sol).toLocaleString("es-PE", { minimumFractionDigits: 2 }) : "."}</span>,
            <span className="text-xs font-bold text-slate-800 tabular-nums">
              {c.dol != null ? Number(c.dol).toLocaleString("es-PE", { minimumFractionDigits: 2 }) : "."}</span>,
            <div className="flex justify-center">
              <Button size="sm" variant="ghost"
                onClick={e => { e.stopPropagation(); goToDetalle(c.num_reg); }}
                className="h-7 w-7 p-0 rounded-full hover:bg-teal-50 text-slate-400 hover:text-teal-600">
                <Eye className="w-4 h-4" />
              </Button>
            </div>,
            <div className="flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border border-white ring-1 ring-slate-200"
                style={{ backgroundColor: getEstadoColor(c.est) }} title={getEstadoNombre(c.est)} />
            </div>,
          ]}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-4 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Total: <span className="font-bold text-slate-800">{filteredMovimientos.length}</span> registros
          </span>
          <button onClick={onRefresh} title="Actualizar" className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400">
            <RefreshCw size={13} />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={exportToPDF}
            className="flex items-center justify-center gap-2 px-3 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm h-9"
            title="Exportar reporte PDF"
          >
            <Download size={14} />
            PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm h-9"
            title="Exportar reporte Excel"
          >
            <FileSpreadsheet size={14} />
            Excel
          </button>
          <Button onClick={() => setOpenNueva(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold uppercase tracking-widest px-6 h-9 rounded-xl transition-all flex gap-2 shadow-lg shadow-teal-100">
            <FilePlus size={16} /> Nueva Entrada
          </Button>
        </div>
      </div>

      {openNueva && (
        <NuevaLogisticaModal
          open={openNueva}
          onClose={() => { setOpenNueva(false); onRefresh(); }}
          operacion="E"
          modo="N"
        />
      )}
    </div>
  );
}

import React, { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell, Legend, ReferenceLine } from "recharts";
import { BarChart3, FileSpreadsheet, Coins, Clock, Download, Save, Trash, HelpCircle } from "lucide-react";
import api from "@/services/api";

const COLORS = [
  "#6366f1", // Indigo
  "#0ea5e9", // Sky
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#a855f7", // Purple
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#64748b"  // Slate
];

export default function AnalisisDashboard({ module = "comercial", cotizaciones = [], anno, mes, viewScope = "global" }) {
  const [dimensions, setDimensions] = useState(["mes"]); 
  const [metrica, setMetrica] = useState("monto"); 
  const [overrideGrafico, setOverrideGrafico] = useState(null);
  const [mostrarPromedio, setMostrarPromedio] = useState(false);
  const [topN, setTopN] = useState("all");
  const [drillDownFilter, setDrillDownFilter] = useState(null);

  useEffect(() => {
    setDrillDownFilter(null);
  }, [dimensions, overrideGrafico, topN, metrica]);

  useEffect(() => {
    if (viewScope === "personal" && dimensions.includes("vendedor")) {
      setDimensions(prev => {
        const filtered = prev.filter(d => d !== "vendedor");
        return filtered.length > 0 ? filtered : ["mes"];
      });
    }
  }, [viewScope, dimensions]); 

  // Configuración de análisis guardados
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [loadingPresets, setLoadingPresets] = useState(true);

  useEffect(() => {
    api.get("cotizaciones/vistas_analisis/")
      .then(res => {
        setSavedAnalyses(Array.isArray(res.data) ? res.data : []);
        setLoadingPresets(false);
      })
      .catch(err => {
        console.error("Error cargando vistas guardadas", err);
        setSavedAnalyses([]);
        setLoadingPresets(false);
      });
  }, []);

  const [newAnalysisName, setNewAnalysisName] = useState("");

  // Setea dimensiones por defecto adecuadas cuando cambia el módulo
  useEffect(() => {
    setDimensions(["mes"]);
    setMetrica("monto");
  }, [module]);

  const dimensionsOptions = useMemo(() => {
    if (module === "logistica") {
      return [
        { id: "mes", label: "Mes" },
        { id: "proveedor", label: "Proveedor" },
        { id: "area", label: "Área de Compra" },
        { id: "categoria", label: "Categoría" },
      ];
    }
    const list = [
      { id: "mes", label: "Mes" },
      { id: "vendedor", label: "Ejecutivo" },
      { id: "area", label: "Área" },
      { id: "cliente", label: "Cliente" },
      { id: "estado", label: "Estado" },
      { id: "rango_monto", label: "Rango de Monto" },
    ];
    if (viewScope === "personal") {
      return list.filter(opt => opt.id !== "vendedor");
    }
    return list;
  }, [module, viewScope]);

  const metricasOptions = useMemo(() => {
    if (module === "logistica") {
      return [
        { id: "monto", label: "Monto de Compra ($)", icon: <Coins size={14} /> },
        { id: "cantidad", label: "Cantidad de OCs", icon: <FileSpreadsheet size={14} /> },
        { id: "leadtime", label: "Lead Time Promedio", icon: <Clock size={14} /> },
      ];
    }
    return [
      { id: "monto", label: "Monto Cotizado ($)", icon: <Coins size={14} /> },
      { id: "cantidad", label: "Cantidad de Docs", icon: <FileSpreadsheet size={14} /> },
    ];
  }, [module]);

  // Manejo de la selección múltiple de dimensiones
  const handleToggleDimension = (dimId) => {
    setDimensions(prev => {
      if (prev.includes(dimId)) {
        if (prev.length === 1) return prev; // Mantener al menos una activa
        return prev.filter(id => id !== dimId);
      }
      return [...prev, dimId];
    });
  };

  // RECOMENDADOR INTELIGENTE DE GRÁFICOS
  const tipoGrafico = useMemo(() => {
    if (overrideGrafico) return overrideGrafico;
    if (dimensions.length >= 2) {
      return "bar"; // Barras agrupadas para comparaciones cruzadas
    }
    const primary = dimensions[0];
    if (primary === "mes") {
      return "line"; // Líneas limpias para series temporales
    }
    if (primary === "area" || primary === "categoria" || primary === "estado") {
      return "pie"; // Gráfico circular para distribuciones
    }
    return "bar"; // Barras normales para elementos individuales (Clientes, Proveedores, Vendedores)
  }, [dimensions, overrideGrafico]);

  // Datos deterministas de Logística
  const mockLogisticaData = useMemo(() => {
    if (module !== "logistica") return [];
    const list = [];
    const seed = Number(anno) + (mes === "%" ? 6 : Number(mes));
    const getVal = (min, max, offset) => {
      const x = Math.sin(seed + offset) * 10000;
      return min + (x - Math.floor(x)) * (max - min);
    };

    const proveedores = ["ACEROS INDUSTRIALES S.A.", "PROVEEDORA GENERAL E.I.R.L.", "IMPORTACIONES METALÚRGICAS S.A.C.", "DISTRIBUIDORA FERRETERA DEL SUR"];
    const areas = ["LOGÍSTICA INTERNA", "SUMINISTROS DE FÁBRICA", "SERVICIOS AUXILIARES"];
    const categorias = ["Materia Prima", "Repuestos", "EPPs", "Herramientas"];
    const mesesNombres = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SET", "OCT", "NOV", "DIC"];

    for (let i = 1; i <= 60; i++) { // Más registros para soportar mejor el cruce de dimensiones
      const provIdx = Math.floor(getVal(0, proveedores.length, i * 2));
      const areaIdx = Math.floor(getVal(0, areas.length, i * 3));
      const catIdx = Math.floor(getVal(0, categorias.length, i * 4));
      const mesIdx = mes === "%" ? Math.floor(getVal(0, 12, i * 5)) : Number(mes) - 1;
      const monto = getVal(2000, 25000, i * 6);
      const leadTime = getVal(1.5, 9.0, i * 7);

      list.push({
        proveedor: proveedores[provIdx],
        area: areas[areaIdx],
        categoria: categorias[catIdx],
        mes: mesesNombres[mesIdx],
        monto,
        leadTime
      });
    }
    return list;
  }, [module, anno, mes]);

  // Resolver atributo de cotización
  const resolveAttributeValue = (c, keyId) => {
    if (module === "comercial") {
      if (keyId === "mes") {
        const dateObj = new Date(c.fecha || c.cotif);
        return dateObj.toLocaleString("es-ES", { month: "short" }).toUpperCase();
      }
      if (keyId === "vendedor") {
        const val = c.comercial_nombre || c.comercial;
        return (val && val !== "-" ? val : "Por Asignar").trim().toUpperCase();
      }
      if (keyId === "area") {
        const val = c.area_nombre || c.area;
        return (val && val !== "-" ? val : "Sin Área").trim().toUpperCase();
      }
      if (keyId === "cliente") {
        const val = c.cliente_nombre || c.cliente;
        return (val && val !== "-" ? val : "Cliente Genérico").trim().toUpperCase();
      }
      if (keyId === "estado") {
        const val = c.estado_nombre || c.estado;
        return (val && val !== "-" ? val : "Desconocido").trim().toUpperCase();
      }
      if (keyId === "rango_monto") {
        const amount = Number(c.tot_c || c.total_cotizacion || 0);
        if (amount < 1000) return "🟢 MICRO-NEGOCIOS (<$1K)";
        if (amount < 5000) return "🔵 PEQUEÑAS ($1K-$5K)";
        if (amount < 20000) return "🟡 MEDIANAS ($5K-$20K)";
        if (amount < 50000) return "🟠 GRANDES ($20K-$50K)";
        return "🔴 CORPORATIVAS (>$50K)";
      }
    } else {
      return c[keyId] || "SIN CLASIFICAR";
    }
    return "OTRO";
  };

  // Obtener claves únicas de la dimensión secundaria
  const uniqueSecondaryKeys = useMemo(() => {
    if (dimensions.length < 2) return [];
    const secondaryId = dimensions[1];
    const set = new Set();

    if (module === "comercial") {
      cotizaciones.forEach(c => {
        const key = resolveAttributeValue(c, secondaryId);
        if (key) set.add(key);
      });
    } else {
      mockLogisticaData.forEach(c => {
        let key = "";
        if (secondaryId === "mes") key = c.mes;
        else if (secondaryId === "proveedor") key = c.proveedor;
        else if (secondaryId === "area") key = c.area;
        else if (secondaryId === "categoria") key = c.categoria;
        if (key) set.add(key);
      });
    }
    return Array.from(set).slice(0, 6); // Limitar a 6 series para legibilidad extrema
  }, [module, cotizaciones, mockLogisticaData, dimensions]);

  // Motor de Agregación N-Dimensional
  const aggregatedData = useMemo(() => {
    const map = {};
    const primaryId = dimensions[0];
    const secondaryId = dimensions.length >= 2 ? dimensions[1] : null;
    const tertiaryIds = dimensions.slice(2);

    const rawData = module === "comercial" ? cotizaciones : mockLogisticaData;

    rawData.forEach(c => {
      // 1. Obtener la etiqueta del eje X (Dimensión Primaria + Concatenación de Terciarias si existen)
      const primaryVal = resolveAttributeValue(c, primaryId);
      const extraParts = tertiaryIds.map(id => resolveAttributeValue(c, id));
      const labelX = [primaryVal, ...extraParts].join(" - ");

      // 2. Resolver la dimensión secundaria si existe comparativa
      let secondaryVal = "";
      if (secondaryId) {
        secondaryVal = resolveAttributeValue(c, secondaryId);
      }

      // 3. Crear el objeto en el mapa si no existe
      if (!map[labelX]) {
        map[labelX] = { name: labelX };
        if (!secondaryId) {
          map[labelX].value = 0;
          map[labelX].leadtimeSum = 0;
          map[labelX].count = 0;
        } else {
          uniqueSecondaryKeys.forEach(k => {
            map[labelX][k] = 0;
            map[labelX][k + "_leadtimeSum"] = 0;
            map[labelX][k + "_count"] = 0;
          });
        }
      }

      // 4. Calcular el valor de la métrica activa
      let amount = 1;
      if (metrica === "monto") {
        amount = module === "comercial" ? Number(c.tot_c || c.total_cotizacion || 0) : Number(c.monto || 0);
      } else if (metrica === "leadtime" && module === "logistica") {
        amount = Number(c.leadTime || 0);
      }

      // 5. Acumular
      if (!secondaryId) {
        if (metrica === "leadtime") {
          map[labelX].leadtimeSum += amount;
          map[labelX].count += 1;
        } else {
          map[labelX].value += amount;
        }
      } else {
        if (uniqueSecondaryKeys.includes(secondaryVal)) {
          if (metrica === "leadtime") {
            map[labelX][secondaryVal + "_leadtimeSum"] += amount;
            map[labelX][secondaryVal + "_count"] += 1;
          } else {
            map[labelX][secondaryVal] += amount;
          }
        }
      }
    });

    // 6. Resolver promedios si la métrica es Lead Time
    Object.keys(map).forEach(k => {
      if (!secondaryId) {
        if (metrica === "leadtime" && map[k].count > 0) {
          map[k].value = map[k].leadtimeSum / map[k].count;
        }
      } else {
        if (metrica === "leadtime") {
          uniqueSecondaryKeys.forEach(s => {
            const count = map[k][s + "_count"] || 0;
            map[k][s] = count > 0 ? (map[k][s + "_leadtimeSum"] / count) : 0;
          });
        }
      }
    });

    const list = Object.values(map);

    // 7. Ordenar
    if (primaryId === "mes" && dimensions.length === 1) {
      const monthOrder = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SET", "OCT", "NOV", "DIC"];
      list.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
    } else if (primaryId === "rango_monto" && dimensions.length === 1) {
      const rankOrder = [
        "🟢 MICRO-NEGOCIOS (<$1K)",
        "🔵 PEQUEÑAS ($1K-$5K)",
        "🟡 MEDIANAS ($5K-$20K)",
        "🟠 GRANDES ($20K-$50K)",
        "🔴 CORPORATIVAS (>$50K)"
      ];
      list.sort((a, b) => rankOrder.indexOf(a.name) - rankOrder.indexOf(b.name));
    } else {
      if (!secondaryId) {
        list.sort((a, b) => b.value - a.value);
      } else {
        list.sort((a, b) => {
          const sumA = uniqueSecondaryKeys.reduce((acc, k) => acc + (a[k] || 0), 0);
          const sumB = uniqueSecondaryKeys.reduce((acc, k) => acc + (b[k] || 0), 0);
          return sumB - sumA;
        });
      }
    }

    // 8. Aplicar Top N con agrupación en "OTROS (RESTO)"
    if (module === "comercial" && topN !== "all" && list.length > Number(topN)) {
      const limit = Number(topN);
      const topRows = list.slice(0, limit);
      const restRows = list.slice(limit);
      
      const otrosObj = { name: "OTROS (RESTO)" };
      
      if (!secondaryId) {
        const sumVal = restRows.reduce((acc, row) => acc + (row.value || 0), 0);
        otrosObj.value = sumVal;
      } else {
        uniqueSecondaryKeys.forEach(k => {
          otrosObj[k] = restRows.reduce((acc, row) => acc + (row[k] || 0), 0);
        });
      }
      
      return [...topRows, otrosObj];
    }

    return list;
  }, [module, cotizaciones, mockLogisticaData, dimensions, uniqueSecondaryKeys, metrica, topN]);

  // Totales
  const totalMetricValue = useMemo(() => {
    if (dimensions.length < 2) {
      if (metrica === "leadtime") {
        return aggregatedData.length > 0 ? (aggregatedData.reduce((acc, row) => acc + row.value, 0) / aggregatedData.length) : 0;
      }
      return aggregatedData.reduce((acc, row) => acc + row.value, 0);
    } else {
      let sum = 0;
      aggregatedData.forEach(row => {
        uniqueSecondaryKeys.forEach(k => {
          sum += (row[k] || 0);
        });
      });
      if (metrica === "leadtime") {
        return sum / (aggregatedData.length * uniqueSecondaryKeys.length || 1);
      }
      return sum;
    }
  }, [aggregatedData, metrica, dimensions, uniqueSecondaryKeys]);

  const avgValue = useMemo(() => {
    if (aggregatedData.length === 0) return 0;
    if (metrica === "leadtime") return totalMetricValue;
    
    if (dimensions.length >= 2) {
      const sum = aggregatedData.reduce((acc, row) => {
        const rowSum = uniqueSecondaryKeys.reduce((s, k) => s + (row[k] || 0), 0);
        return acc + rowSum;
      }, 0);
      return sum / aggregatedData.length;
    }
    
    const sum = aggregatedData.reduce((acc, row) => acc + row.value, 0);
    return sum / aggregatedData.length;
  }, [aggregatedData, metrica, totalMetricValue, dimensions, uniqueSecondaryKeys]);

  const tableDataFiltered = useMemo(() => {
    if (!drillDownFilter) return aggregatedData;
    return aggregatedData.filter(row => row.name === drillDownFilter);
  }, [aggregatedData, drillDownFilter]);

  const tableTotalMetricValue = useMemo(() => {
    if (dimensions.length < 2) {
      if (metrica === "leadtime") {
        return tableDataFiltered.length > 0 ? (tableDataFiltered.reduce((acc, row) => acc + row.value, 0) / tableDataFiltered.length) : 0;
      }
      return tableDataFiltered.reduce((acc, row) => acc + row.value, 0);
    } else {
      let sum = 0;
      tableDataFiltered.forEach(row => {
        uniqueSecondaryKeys.forEach(k => {
          sum += (row[k] || 0);
        });
      });
      if (metrica === "leadtime") {
        return sum / (tableDataFiltered.length * uniqueSecondaryKeys.length || 1);
      }
      return sum;
    }
  }, [tableDataFiltered, metrica, dimensions, uniqueSecondaryKeys]);

  const maxRowTotal = useMemo(() => {
    if (tableDataFiltered.length === 0) return 1;
    const totalsList = tableDataFiltered.map(row => {
      if (dimensions.length < 2) return row.value;
      return uniqueSecondaryKeys.reduce((acc, k) => acc + (row[k] || 0), 0);
    });
    return Math.max(...totalsList) || 1;
  }, [tableDataFiltered, dimensions, uniqueSecondaryKeys]);

  const recomendacionAI = useMemo(() => {
    if (overrideGrafico) {
      return {
        tipo: overrideGrafico,
        justificacion: `Has forzado manualmente un gráfico de ${
          overrideGrafico === "bar" ? "Barras" : overrideGrafico === "line" ? "Líneas" : overrideGrafico === "area" ? "Área" : "Pastel"
        }.`
      };
    }
    if (dimensions.length >= 2) {
      return {
        tipo: "bar",
        justificacion: "Gráfico de Barras Cruzadas para comparar el comportamiento de múltiples dimensiones agrupadas."
      };
    }
    const primary = dimensions[0];
    if (primary === "mes") {
      return {
        tipo: "line",
        justificacion: "Gráfico de Líneas porque es la forma más limpia de visualizar series de tiempo y tendencias."
      };
    }
    if (primary === "area" || primary === "categoria" || primary === "estado" || primary === "rango_monto") {
      return {
        tipo: "pie",
        justificacion: "Gráfico Circular / Donut para ver la distribución y participación de cada categoría sobre el total."
      };
    }
    return {
      tipo: "bar",
      justificacion: "Gráfico de Barras porque es el estándar óptimo para comparar magnitudes individuales entre diferentes categorías."
    };
  }, [dimensions, overrideGrafico]);

  const autoInsights = useMemo(() => {
    if (module !== "comercial" || tableDataFiltered.length === 0) return [];
    
    const list = [...tableDataFiltered];
    const getVal = (row) => {
      if (dimensions.length < 2) return row.value;
      return uniqueSecondaryKeys.reduce((acc, k) => acc + (row[k] || 0), 0);
    };
    
    const sortedByVal = list.sort((a, b) => getVal(b) - getVal(a));
    const peak = sortedByVal[0];
    const lowest = sortedByVal[sortedByVal.length - 1];
    const totalSum = sortedByVal.reduce((acc, row) => acc + getVal(row), 0);
    const items = [];
    
    if (peak && totalSum > 0) {
      const percentage = ((getVal(peak) / totalSum) * 100).toFixed(1);
      items.push({
        type: "peak",
        title: "🎯 Concentración Máxima",
        desc: `El volumen principal se concentra en "${peak.name}" con $${getVal(peak).toLocaleString(undefined, {maximumFractionDigits: 0})}, lo que representa el ${percentage}% del total.`
      });
    }
    
    if (sortedByVal.length >= 3 && totalSum > 0) {
      const top3Sum = sortedByVal.slice(0, 3).reduce((acc, row) => acc + getVal(row), 0);
      const percentageTop3 = ((top3Sum / totalSum) * 100).toFixed(1);
      items.push({
        type: "pareto",
        title: "⚖️ Regla de Pareto (Top 3)",
        desc: `Los 3 elementos líderes de esta dimensión representan el ${percentageTop3}% de toda la facturación analizada.`
      });
    }
    
    if (lowest && lowest.name !== peak.name && totalSum > 0) {
      const percentage = ((getVal(lowest) / totalSum) * 100).toFixed(1);
      items.push({
        type: "low",
        title: "⚠️ Participación Mínima",
        desc: `La categoría con menor tracción comercial en este corte es "${lowest.name}" con apenas el ${percentage}% del total ($${getVal(lowest).toLocaleString(undefined, {maximumFractionDigits: 0})}).`
      });
    }
    
    return items;
  }, [module, tableDataFiltered, dimensions, uniqueSecondaryKeys]);

  const getSemanticColor = (name) => {
    const upper = String(name).toUpperCase();
    if (upper.includes("ADJUDICADO") || upper.includes("GANADO")) return "#10b981"; // Emerald
    if (upper.includes("RECHAZADA") || upper.includes("RECHAZADO") || upper.includes("ANULADA") || upper.includes("ANULADO")) return "#f43f5e"; // Rose
    if (upper.includes("ENVIADO") || upper.includes("ENVIADA")) return "#0ea5e9"; // Sky
    if (upper.includes("OPORTUNIDAD")) return "#6366f1"; // Indigo
    if (upper.includes("BORRADOR") || upper.includes("PENDIENTE")) return "#f59e0b"; // Amber
    return null;
  };

  const formatTooltipValue = (val) => {
    if (metrica === "monto") return `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (metrica === "leadtime") return `${Number(val).toFixed(1)} días`;
    return val;
  };

  // PRESETS GUARDADOS (Análisis en 1-Click)
  const handleSaveAnalysis = async () => {
    if (!newAnalysisName.trim()) return;
    try {
      const payload = {
        nombre: newAnalysisName.toUpperCase(),
        dimensions,
        metrica
      };
      const res = await api.post("cotizaciones/vistas_analisis/", payload);
      if (res.data) {
        setSavedAnalyses(prev => [res.data, ...prev]);
      }
      setNewAnalysisName("");
    } catch (err) {
      console.error("Error al guardar la vista", err);
    }
  };

  const handleDeletePreset = async (e, id_vista) => {
    e.stopPropagation();
    try {
      await api.delete(`cotizaciones/vistas_analisis/${id_vista}/`);
      setSavedAnalyses(prev => prev.filter(p => p.id_vista !== id_vista));
    } catch (err) {
      console.error("Error al eliminar la vista", err);
    }
  };

  const handleLoadPreset = (p) => {
    setDimensions(p.dimensions || ["mes"]);
    setMetrica(p.metrica || "monto");
  };

  // EXPORTACIÓN A CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    const headers = [
      dimensions.map(id => dimensionsOptions.find(d => d.id === id)?.label).join(" - "),
      ...(dimensions.length < 2 ? ["Valor"] : uniqueSecondaryKeys),
      "Total"
    ];
    csvContent += headers.map(h => `"${h}"`).join(",") + "\n";

    aggregatedData.forEach(row => {
      const line = [`"${row.name}"`];
      if (dimensions.length < 2) {
        line.push(row.value);
        line.push(row.value);
      } else {
        let rowTotal = 0;
        uniqueSecondaryKeys.forEach(k => {
          const val = row[k] || 0;
          line.push(val);
          rowTotal += val;
        });
        line.push(rowTotal);
      }
      csvContent += line.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_BI_${dimensions.join("_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 p-1.5 rounded-xl text-indigo-600">
            <BarChart3 size={15} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              {module === "logistica" ? "Visualizador BI Logístico" : (viewScope === "personal" ? "Mi Visualizador BI Personal" : "Visualizador BI Comercial")}
            </h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              Cruce multidimensional de objetivos comerciales
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* PANEL LATERAL DE BI */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm justify-between">
          <div className="space-y-5">
            {/* SELECTOR MULTIDIMENSIONAL ÚNICO */}
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                1. Selección de Dimensiones
                <HelpCircle size={10} className="text-gray-300" title="Selecciona una o más para cruzar datos" />
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {dimensionsOptions.map(opt => {
                  const isSelected = dimensions.includes(opt.id);
                  const orderIndex = dimensions.indexOf(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleToggleDimension(opt.id)}
                      className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        isSelected 
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                      {isSelected && (
                        <span className="w-3.5 h-3.5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[8px]">
                          {orderIndex + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MÉTRICA */}
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">2. Métrica Activa</h3>
              <div className="flex flex-col gap-1.5">
                {metricasOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setMetrica(opt.id)}
                    className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                      metrica === opt.id
                        ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 pl-3"
                        : "text-gray-600 hover:bg-gray-50 pl-2"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. TIPO DE GRÁFICO */}
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>3. Tipo de Gráfico</span>
                {overrideGrafico && (
                  <button 
                    type="button"
                    onClick={() => setOverrideGrafico(null)}
                    className="text-[8px] text-indigo-600 font-bold uppercase hover:underline"
                  >
                    Restablecer Auto
                  </button>
                )}
              </h3>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => setOverrideGrafico("bar")}
                  className={`py-1 text-center border text-[9px] font-black rounded-lg transition-colors uppercase ${
                    tipoGrafico === "bar" && overrideGrafico
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : (tipoGrafico === "bar" ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
                  }`}
                >
                  Barras
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideGrafico("line")}
                  className={`py-1 text-center border text-[9px] font-black rounded-lg transition-colors uppercase ${
                    tipoGrafico === "line" && overrideGrafico
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : (tipoGrafico === "line" ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
                  }`}
                >
                  Líneas
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideGrafico("area")}
                  className={`py-1 text-center border text-[9px] font-black rounded-lg transition-colors uppercase ${
                    tipoGrafico === "area" && overrideGrafico
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : (tipoGrafico === "area" ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
                  }`}
                >
                  Área
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideGrafico("pie")}
                  disabled={dimensions.length >= 2}
                  className={`py-1 text-center border text-[9px] font-black rounded-lg transition-colors uppercase disabled:opacity-30 disabled:cursor-not-allowed ${
                    tipoGrafico === "pie" && overrideGrafico
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : (tipoGrafico === "pie" ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
                  }`}
                >
                  Pastel
                </button>
              </div>
            </div>

            {/* 4. FILTROS AVANZADOS */}
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">4. Filtros Avanzados</h3>
              <div className="space-y-3 bg-slate-50/50 border border-slate-200/50 p-3 rounded-xl">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Mostrar Límite (Top N)</span>
                  <div className="grid grid-cols-4 gap-1">
                    {["all", "5", "10", "15"].map(limit => (
                      <button
                        key={limit}
                        type="button"
                        onClick={() => setTopN(limit)}
                        className={`py-0.5 text-center border text-[8px] font-black rounded transition-all uppercase ${
                          topN === limit
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-gray-500 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {limit === "all" ? "Todos" : `Top ${limit}`}
                      </button>
                    ))}
                  </div>
                </div>

                {tipoGrafico !== "pie" && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Línea de Media General</span>
                    <button
                      type="button"
                      onClick={() => setMostrarPromedio(prev => !prev)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        mostrarPromedio ? "bg-indigo-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-250 ease-in-out ${
                          mostrarPromedio ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GUARDAR CONFIGURACIÓN */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Vistas de Análisis Guardadas</span>
              <div className="flex gap-1.5">
                <input 
                  type="text" 
                  placeholder="Guardar vista actual..." 
                  value={newAnalysisName}
                  onChange={(e) => setNewAnalysisName(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                />
                <button
                  onClick={handleSaveAnalysis}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  title="Guardar Vista"
                >
                  <Save size={14} />
                </button>
              </div>
            </div>

            {/* LISTA DE PRESETS */}
            <div className="max-h-32 overflow-y-auto space-y-1">
              {Array.isArray(savedAnalyses) && savedAnalyses.map((p, idx) => (
                <div
                  key={p.id_vista || idx}
                  onClick={() => handleLoadPreset(p)}
                  className="flex justify-between items-center px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <span className="text-[9px] font-black text-slate-700 truncate max-w-[140px]">{p.nombre || p.name}</span>
                  <button
                    onClick={(e) => handleDeletePreset(e, p.id_vista || idx)}
                    className="text-gray-400 hover:text-red-500 p-0.5 transition"
                  >
                    <Trash size={11} />
                  </button>
                </div>
              ))}
              {(!Array.isArray(savedAnalyses) || savedAnalyses.length === 0) && (
                <span className="text-[9px] font-bold text-gray-400 block text-center py-2">Sin análisis personalizados</span>
              )}
            </div>
          </div>
        </div>

        {/* ÁREA DE VISUALIZACIÓN */}
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
          {/* GRÁFICO DINÁMICO */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative">
            
            {/* BOTÓN EXPORTAR */}
            <button
              onClick={handleExportCSV}
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200/50 text-[10px] font-black uppercase tracking-wider transition-all"
            >
              <Download size={12} />
              Exportar CSV
            </button>

            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2 pr-24 flex items-center flex-wrap gap-2">
              <span>Visualización: {dimensions.map(id => dimensionsOptions.find(d => d.id === id)?.label).join(" + ")} vs {metricasOptions.find(m => m.id === metrica)?.label}</span>
              {drillDownFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 text-indigo-755 border border-indigo-200 shadow-sm shrink-0 select-none animate-pulse">
                  Filtrado por: {drillDownFilter}
                  <button type="button" onClick={() => setDrillDownFilter(null)} className="hover:text-red-500 font-extrabold text-[10px]" title="Quitar filtro">✕</button>
                </span>
              )}
            </h3>

            <div className="mb-4 flex items-center gap-1 text-[9px] text-violet-600 font-black uppercase tracking-wider bg-violet-50/60 border border-violet-100/50 px-3 py-1.5 rounded-xl w-fit select-none shrink-0">
              <span>✨ BI Recomendador: {recomendacionAI.justificacion}</span>
            </div>

            <div className="h-[320px] w-full">
              {aggregatedData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 font-medium text-xs">
                  Sin datos suficientes para el desglose seleccionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {tipoGrafico === "bar" ? (
                    <BarChart data={aggregatedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} onClick={(state) => { if (state && state.activeLabel) setDrillDownFilter(prev => prev === state.activeLabel ? null : state.activeLabel); }} style={{ cursor: "pointer" }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#334155" fontSize={10} fontWeight="extrabold" fontFamily="sans-serif" tickLine={false} />
                      <YAxis stroke="#334155" fontSize={10} fontWeight="extrabold" fontFamily="sans-serif" tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: "rgba(15, 23, 42, 0.95)", borderRadius: "8px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", backdropFilter: "blur(4px)" }}
                        labelStyle={{ fontWeight: "800", color: "#f8fafc", fontSize: "10px", fontFamily: "monospace" }}
                        itemStyle={{ fontSize: "10px", color: "#e2e8f0", fontFamily: "monospace" }}
                        formatter={(val, name) => [formatTooltipValue(val), name === "value" ? metricasOptions.find(m => m.id === metrica)?.label : name]}
                      />
                      {mostrarPromedio && (
                        <ReferenceLine y={avgValue} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: `Media: ${formatTooltipValue(avgValue)}`, fill: '#f43f5e', fontSize: 9, fontWeight: 'bold', position: 'top' }} />
                      )}
                      {dimensions.length < 2 ? (
                        <Bar dataKey="value" fill="#4f46e5" radius={[2, 2, 0, 0]} isAnimationActive={true} animationDuration={250} maxBarSize={30} cursor="pointer">
                          {aggregatedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getSemanticColor(entry.name) || COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      ) : (
                        uniqueSecondaryKeys.map((key, index) => (
                          <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[2, 2, 0, 0]} isAnimationActive={true} animationDuration={250} maxBarSize={20} cursor="pointer" />
                        ))
                      )}
                      {dimensions.length >= 2 && <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "sans-serif", fontWeight: "800", color: "#334155" }} />}
                    </BarChart>
                  ) : tipoGrafico === "line" ? (
                    <LineChart data={aggregatedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} onClick={(state) => { if (state && state.activeLabel) setDrillDownFilter(prev => prev === state.activeLabel ? null : state.activeLabel); }} style={{ cursor: "pointer" }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#334155" fontSize={10} fontWeight="extrabold" fontFamily="sans-serif" tickLine={false} />
                      <YAxis stroke="#334155" fontSize={10} fontWeight="extrabold" fontFamily="sans-serif" tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: "rgba(15, 23, 42, 0.95)", borderRadius: "8px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", backdropFilter: "blur(4px)" }}
                        labelStyle={{ fontWeight: "800", color: "#f8fafc", fontSize: "10px", fontFamily: "monospace" }}
                        itemStyle={{ fontSize: "10px", color: "#e2e8f0", fontFamily: "monospace" }}
                        formatter={(val, name) => [formatTooltipValue(val), name === "value" ? metricasOptions.find(m => m.id === metrica)?.label : name]}
                      />
                      {mostrarPromedio && (
                        <ReferenceLine y={avgValue} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: `Media: ${formatTooltipValue(avgValue)}`, fill: '#f43f5e', fontSize: 9, fontWeight: 'bold', position: 'top' }} />
                      )}
                      <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 4 }} isAnimationActive={true} animationDuration={250} dot={false} cursor="pointer" />
                    </LineChart>
                  ) : tipoGrafico === "area" ? (
                    <AreaChart data={aggregatedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} onClick={(state) => { if (state && state.activeLabel) setDrillDownFilter(prev => prev === state.activeLabel ? null : state.activeLabel); }} style={{ cursor: "pointer" }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#334155" fontSize={10} fontWeight="extrabold" fontFamily="sans-serif" tickLine={false} />
                      <YAxis stroke="#334155" fontSize={10} fontWeight="extrabold" fontFamily="sans-serif" tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: "rgba(15, 23, 42, 0.95)", borderRadius: "8px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", backdropFilter: "blur(4px)" }}
                        labelStyle={{ fontWeight: "800", color: "#f8fafc", fontSize: "10px", fontFamily: "monospace" }}
                        itemStyle={{ fontSize: "10px", color: "#e2e8f0", fontFamily: "monospace" }}
                        formatter={(val, name) => [formatTooltipValue(val), name === "value" ? metricasOptions.find(m => m.id === metrica)?.label : name]}
                      />
                      {mostrarPromedio && (
                        <ReferenceLine y={avgValue} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: `Media: ${formatTooltipValue(avgValue)}`, fill: '#f43f5e', fontSize: 9, fontWeight: 'bold', position: 'top' }} />
                      )}
                      <Area type="monotone" dataKey="value" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} isAnimationActive={true} animationDuration={250} cursor="pointer" />
                    </AreaChart>
                  ) : (
                    <PieChart>
                      <Tooltip 
                        contentStyle={{ background: "rgba(15, 23, 42, 0.95)", borderRadius: "8px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", backdropFilter: "blur(4px)" }}
                        itemStyle={{ fontSize: "10px", color: "#e2e8f0", fontFamily: "monospace" }}
                        formatter={(val) => [formatTooltipValue(val), "Valor"]}
                      />
                      <Pie
                        data={aggregatedData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        innerRadius={45}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={true}
                        isAnimationActive={true}
                        animationDuration={250}
                        onClick={(entry) => setDrillDownFilter(prev => prev === entry.name ? null : entry.name)}
                        cursor="pointer"
                      >
                        {aggregatedData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getSemanticColor(entry.name) || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "9px", fontFamily: "monospace", fontWeight: "bold" }} />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* PANEL DE AUTO-INSIGHTS */}
          {module === "comercial" && autoInsights.length > 0 && (
            <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-3 shadow-inner">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <span>💡 Insights Automáticos del Asistente BI</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {autoInsights.map((ins, idx) => (
                  <div key={idx} className="bg-white p-3.5 border border-slate-150 rounded-xl space-y-1 shadow-sm hover:border-indigo-150 transition-colors">
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider block">{ins.title}</span>
                    <p className="text-[10px] text-slate-650 leading-relaxed font-semibold">{ins.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TABLA PIVOT RESUMIDA */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <span>Desglose de datos agrupados</span>
                {drillDownFilter && (
                  <span className="text-[9px] font-bold bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded border border-indigo-200">
                    Filtrado por gráfico
                  </span>
                )}
              </h3>
              <span className="text-[10px] font-black text-gray-500 bg-slate-50 px-2 py-0.5 rounded-md border border-gray-200 shadow-sm font-mono">
                {metrica === "monto" 
                  ? `Total: $${tableTotalMetricValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                  : (metrica === "leadtime" ? `Promedio: ${tableTotalMetricValue.toFixed(1)} días` : `Total: ${tableTotalMetricValue} Docs`)
                }
              </span>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-black uppercase tracking-wider text-[9px]">
                    <th className="px-4 py-2.5">Concepto ({dimensions.map(id => dimensionsOptions.find(d => d.id === id)?.label).join(" + ")})</th>
                    {dimensions.length >= 2 ? (
                      uniqueSecondaryKeys.map(k => (
                        <th key={k} className="px-4 py-2.5 text-right">{k}</th>
                      ))
                    ) : (
                      <th className="px-4 py-2.5 text-right">Valor Agrupado</th>
                    )}
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableDataFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={dimensions.length >= 2 ? uniqueSecondaryKeys.length + 2 : 3} className="text-center py-6 text-gray-400 font-medium">Sin datos agrupados</td>
                    </tr>
                  ) : (
                    tableDataFiltered.map((row, idx) => {
                      let rowTotal = 0;
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-gray-700">{row.name}</td>
                          {dimensions.length >= 2 ? (
                            uniqueSecondaryKeys.map(k => {
                              const val = row[k] || 0;
                              rowTotal += val;
                              return (
                                <td key={k} className="px-4 py-2.5 text-right text-gray-600 font-medium">
                                  {metrica === "monto" ? `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : val}
                                </td>
                              );
                            })
                          ) : (
                            <td className="px-4 py-2.5 text-right font-black text-gray-800">
                              {metrica === "monto" 
                                ? `$${row.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `${row.value} Docs`
                              }
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-right font-black text-slate-900 bg-slate-50/30 relative overflow-hidden select-none">
                            {/* Barra de formato condicional sutil */}
                            <div 
                              className="absolute top-0 right-0 bottom-0 bg-indigo-500/10 pointer-events-none transition-all duration-300"
                              style={{ width: `${((dimensions.length < 2 ? row.value : rowTotal) / maxRowTotal) * 100}%` }}
                            />
                            <span className="relative z-10">
                              {metrica === "monto" 
                                ? `$${(dimensions.length < 2 ? row.value : rowTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : (dimensions.length < 2 ? `${row.value} Docs` : `${rowTotal} Docs`)
                              }
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
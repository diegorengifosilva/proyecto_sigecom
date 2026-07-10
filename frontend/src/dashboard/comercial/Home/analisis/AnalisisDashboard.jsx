import React, { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell, Legend } from "recharts";
import { BarChart3, FileSpreadsheet, Coins, Clock, Download, Save, Trash, HelpCircle } from "lucide-react";

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

export default function AnalisisDashboard({ module = "comercial", cotizaciones = [], anno, mes }) {
  const [dimensions, setDimensions] = useState(["mes"]); 
  const [metrica, setMetrica] = useState("monto"); 

  // Configuración de análisis guardados
  const [savedAnalyses, setSavedAnalyses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pminsight_saved_analyses") || "[]");
    } catch {
      return [];
    }
  });
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
    return [
      { id: "mes", label: "Mes" },
      { id: "vendedor", label: "Ejecutivo" },
      { id: "area", label: "Área" },
      { id: "cliente", label: "Cliente" },
      { id: "estado", label: "Estado" },
    ];
  }, [module]);

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

  // RECOMENDADOR INTELIGENTE DE GRÁFICOS (Automático y sin selector manual)
  const tipoGrafico = useMemo(() => {
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
  }, [dimensions]);

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

  // Obtener claves únicas de la dimensión secundaria
  const uniqueSecondaryKeys = useMemo(() => {
    if (dimensions.length < 2) return [];
    const secondaryId = dimensions[1];
    const set = new Set();

    if (module === "comercial") {
      cotizaciones.forEach(c => {
        let key = "";
        if (secondaryId === "mes") {
          const dateObj = new Date(c.fecha || c.cotif);
          key = dateObj.toLocaleString("es-ES", { month: "short" }).toUpperCase();
        } else if (secondaryId === "vendedor") {
          key = (c.comercial_nombre || "Por Asignar").trim().toUpperCase();
        } else if (secondaryId === "area") {
          key = (c.area_nombre || "Sin Área").trim().toUpperCase();
        } else if (secondaryId === "cliente") {
          key = (c.cliente || "Cliente Genérico").trim().toUpperCase();
        } else if (secondaryId === "estado") {
          key = (c.estado_nombre || "Desconocido").trim().toUpperCase();
        }
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

  // Resolver atributo de cotización
  const resolveAttributeValue = (c, keyId) => {
    if (module === "comercial") {
      if (keyId === "mes") {
        const dateObj = new Date(c.fecha || c.cotif);
        return dateObj.toLocaleString("es-ES", { month: "short" }).toUpperCase();
      }
      if (keyId === "vendedor") return (c.comercial_nombre || "Por Asignar").trim().toUpperCase();
      if (keyId === "area") return (c.area_nombre || "Sin Área").trim().toUpperCase();
      if (keyId === "cliente") return (c.cliente || "Cliente Genérico").trim().toUpperCase();
      if (keyId === "estado") return (c.estado_nombre || "Desconocido").trim().toUpperCase();
    } else {
      return c[keyId] || "SIN CLASIFICAR";
    }
    return "OTRO";
  };

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

    return list;
  }, [module, cotizaciones, mockLogisticaData, dimensions, uniqueSecondaryKeys, metrica]);

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

  const formatTooltipValue = (val) => {
    if (metrica === "monto") return `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (metrica === "leadtime") return `${Number(val).toFixed(1)} días`;
    return val;
  };

  // PRESETS GUARDADOS (Análisis en 1-Click)
  const handleSaveAnalysis = () => {
    if (!newAnalysisName.trim()) return;
    const newPreset = {
      name: newAnalysisName.toUpperCase(),
      dimensions,
      metrica
    };
    const updated = [...savedAnalyses, newPreset];
    setSavedAnalyses(updated);
    localStorage.setItem("pminsight_saved_analyses", JSON.stringify(updated));
    setNewAnalysisName("");
  };

  const handleDeletePreset = (e, index) => {
    e.stopPropagation();
    const updated = savedAnalyses.filter((_, idx) => idx !== index);
    setSavedAnalyses(updated);
    localStorage.setItem("pminsight_saved_analyses", JSON.stringify(updated));
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-2">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 tracking-tight">
            <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
              <BarChart3 size={16} />
            </div>
            {module === "logistica" ? "Visualizador BI Logístico" : "Visualizador BI Comercial"}
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-10">
            Cruce multidimensional de objetivos comerciales
          </p>
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
              {savedAnalyses.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handleLoadPreset(p)}
                  className="flex justify-between items-center px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <span className="text-[9px] font-black text-slate-700 truncate max-w-[140px]">{p.name}</span>
                  <button
                    onClick={(e) => handleDeletePreset(e, idx)}
                    className="text-gray-400 hover:text-red-500 p-0.5 transition"
                  >
                    <Trash size={11} />
                  </button>
                </div>
              ))}
              {savedAnalyses.length === 0 && (
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

            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-6 pr-24">
              Visualización: {dimensions.map(id => dimensionsOptions.find(d => d.id === id)?.label).join(" + ")} vs {metricasOptions.find(m => m.id === metrica)?.label}
            </h3>

            <div className="h-[320px] w-full">
              {aggregatedData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 font-medium text-xs">
                  Sin datos suficientes para el desglose seleccionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {tipoGrafico === "bar" ? (
                    <BarChart data={aggregatedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight="bold" fontFamily="monospace" tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" fontFamily="monospace" tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: "rgba(15, 23, 42, 0.95)", borderRadius: "8px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", backdropFilter: "blur(4px)" }}
                        labelStyle={{ fontWeight: "800", color: "#f8fafc", fontSize: "10px", fontFamily: "monospace" }}
                        itemStyle={{ fontSize: "10px", color: "#e2e8f0", fontFamily: "monospace" }}
                        formatter={(val, name) => [formatTooltipValue(val), name === "value" ? metricasOptions.find(m => m.id === metrica)?.label : name]}
                      />
                      {dimensions.length < 2 ? (
                        <Bar dataKey="value" fill="#4f46e5" radius={[2, 2, 0, 0]} isAnimationActive={true} animationDuration={250} maxBarSize={30}>
                          {aggregatedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      ) : (
                        uniqueSecondaryKeys.map((key, index) => (
                          <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[2, 2, 0, 0]} isAnimationActive={true} animationDuration={250} maxBarSize={20} />
                        ))
                      )}
                      {dimensions.length >= 2 && <Legend wrapperStyle={{ fontSize: "9px", fontFamily: "monospace", fontWeight: "bold" }} />}
                    </BarChart>
                  ) : tipoGrafico === "line" ? (
                    <LineChart data={aggregatedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight="bold" fontFamily="monospace" tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" fontFamily="monospace" tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: "rgba(15, 23, 42, 0.95)", borderRadius: "8px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", backdropFilter: "blur(4px)" }}
                        labelStyle={{ fontWeight: "800", color: "#f8fafc", fontSize: "10px", fontFamily: "monospace" }}
                        itemStyle={{ fontSize: "10px", color: "#e2e8f0", fontFamily: "monospace" }}
                        formatter={(val, name) => [formatTooltipValue(val), name === "value" ? metricasOptions.find(m => m.id === metrica)?.label : name]}
                      />
                      <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 4 }} isAnimationActive={true} animationDuration={250} dot={false} />
                    </LineChart>
                  ) : tipoGrafico === "area" ? (
                    <AreaChart data={aggregatedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight="bold" fontFamily="monospace" tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" fontFamily="monospace" tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: "rgba(15, 23, 42, 0.95)", borderRadius: "8px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", backdropFilter: "blur(4px)" }}
                        labelStyle={{ fontWeight: "800", color: "#f8fafc", fontSize: "10px", fontFamily: "monospace" }}
                        itemStyle={{ fontSize: "10px", color: "#e2e8f0", fontFamily: "monospace" }}
                        formatter={(val, name) => [formatTooltipValue(val), name === "value" ? metricasOptions.find(m => m.id === metrica)?.label : name]}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} isAnimationActive={true} animationDuration={250} />
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
                      >
                        {aggregatedData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "9px", fontFamily: "monospace", fontWeight: "bold" }} />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* TABLA PIVOT RESUMIDA */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Desglose de datos agrupados</h3>
              <span className="text-[10px] font-black text-gray-500 bg-slate-50 px-2 py-0.5 rounded-md border border-gray-200 shadow-sm font-mono">
                {metrica === "monto" 
                  ? `Total: $${totalMetricValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                  : (metrica === "leadtime" ? `Promedio: ${totalMetricValue.toFixed(1)} días` : `Total: ${totalMetricValue} Docs`)
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
                  {aggregatedData.length === 0 ? (
                    <tr>
                      <td colSpan={dimensions.length >= 2 ? uniqueSecondaryKeys.length + 2 : 3} className="text-center py-6 text-gray-400 font-medium">Sin datos agrupados</td>
                    </tr>
                  ) : (
                    aggregatedData.map((row, idx) => {
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
                          <td className="px-4 py-2.5 text-right font-black text-slate-900 bg-slate-50/30">
                            {metrica === "monto" 
                              ? `$${(dimensions.length < 2 ? row.value : rowTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : (dimensions.length < 2 ? `${row.value} Docs` : `${rowTotal} Docs`)
                            }
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
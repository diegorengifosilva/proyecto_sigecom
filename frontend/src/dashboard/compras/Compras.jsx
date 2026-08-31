import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ShoppingCart, 
  ArrowUpRight, 
  CalendarRange, 
  ClipboardList, 
  Wallet2, 
  Search, 
  Loader, 
  FilePlus, 
  MoreHorizontal,
  ChevronDown
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { ERPInput } from "@/components/ui/ERPComponents";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

// IMPORTAR TABLAS
import TablaProgramacion from "./tablas/TablaProgramacion";
import TablaAtencion from "./tablas/TablaAtencion";
import TablaLiquidaciones from "./tablas/TablaLiquidaciones";

// FUNCIONES DE FETCHING CON REACT QUERY
const fetchProgramacionData = async () => {
  const token = localStorage.getItem("access_token");
  const { data } = await api.get("compras/lista_programacion/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

const fetchAtencionData = async ({ queryKey }) => {
  const [_, anno, mes] = queryKey;
  const token = localStorage.getItem("access_token");
  const params = {};
  if (anno && anno !== "%") params.anno = anno;
  if (mes && mes !== "%") params.mes = mes;

  const { data } = await api.get("compras/lista_atencion/", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};

const fetchLiquidacionesData = async () => {
  const token = localStorage.getItem("access_token");
  const { data } = await api.get("compras/lista_liquidaciones/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export default function Compras({ defaultTab = "programacion" }) {
  const navigate = useNavigate();
  const { authUser: user } = useAuth();
  const [currentTab, setCurrentTab] = useState(defaultTab);
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedAnno, setSelectedAnno] = useState(new Date().getFullYear());
  const [selectedMes, setSelectedMes] = useState("%");
  const [categoriaFilter, setCategoriaFilter] = useState("Todas");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination when tab or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [currentTab, globalSearch, selectedAnno, selectedMes, categoriaFilter]);

  // Mantener pestaña sincronizada con la prop defaultTab del ruteador
  useEffect(() => {
    setCurrentTab(defaultTab);
  }, [defaultTab]);

  // QUERY HOOKS PARA CADA TIPO DE DATA
  const { 
    data: dataProgramacion, 
    isLoading: isLoadingProg, 
    isFetching: isFetchingProg 
  } = useQuery({
    queryKey: ["compras-programacion"],
    queryFn: fetchProgramacionData,
    enabled: currentTab === "programacion",
    keepPreviousData: true
  });

  const { 
    data: dataAtencion, 
    isLoading: isLoadingAtencion, 
    isFetching: isFetchingAtencion 
  } = useQuery({
    queryKey: ["compras-atencion", selectedAnno, selectedMes],
    queryFn: fetchAtencionData,
    enabled: currentTab === "atencion",
    keepPreviousData: true
  });


  const { 
    data: dataLiquidaciones, 
    isLoading: isLoadingLiq, 
    isFetching: isFetchingLiq 
  } = useQuery({
    queryKey: ["compras-liquidaciones"],
    queryFn: fetchLiquidacionesData,
    enabled: currentTab === "liquidaciones",
    keepPreviousData: true
  });

  // DETERMINAR DATA ACTIVA
  const activeData = useMemo(() => {
    if (currentTab === "programacion") return dataProgramacion?.tabla || [];
    if (currentTab === "atencion") return dataAtencion?.tabla || [];
    if (currentTab === "liquidaciones") return dataLiquidaciones?.tabla || [];
    return [];
  }, [currentTab, dataProgramacion, dataAtencion, dataLiquidaciones]);

  const floatVal = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0.00 : parsed;
  };

  // FILTRADO LOCAL (BÚSQUEDA Y FILTROS RÁPIDOS)
  const filteredData = useMemo(() => {
    let result = activeData;

    if (currentTab === "atencion" || currentTab === "liquidaciones") {
      if (categoriaFilter !== "Todas") {
        if (categoriaFilter === "Compras") {
          result = result.filter(item => item.tipo_gasto === "03");
        } else if (categoriaFilter === "Aereo") {
          result = result.filter(item => {
            const trans = String(item.transporte || "").toUpperCase();
            const tipo = String(item.tipo || "").toLowerCase();
            return item.tipo_gasto === "02" && (trans === "A" || tipo.includes("aéreo") || tipo.includes("aero"));
          });
        } else if (categoriaFilter === "Terrestre") {
          result = result.filter(item => {
            const trans = String(item.transporte || "").toUpperCase();
            const tipo = String(item.tipo || "").toLowerCase();
            return item.tipo_gasto === "02" && (trans === "T" || tipo.includes("terrestre"));
          });
        }
      }
    }

    return result.filter((item) => {
      const searchStr = globalSearch.toLowerCase().trim();
      if (!searchStr) return true;
      
      const codigo = (item.codigo || "").toLowerCase();
      const nroSolicitud = (item.nro_solicitud || "").toLowerCase();
      const referencia = (item.referencia || "").toLowerCase();
      const concepto = (item.concepto || "").toLowerCase();
      const nombre = (item.nombre || "").toLowerCase();
      const empresa = (item.empresa || "").toLowerCase();
      const area = (item.area || "").toLowerCase();
      const tipo = (item.tipo || "").toLowerCase();
      
      return (
        codigo.includes(searchStr) ||
        nroSolicitud.includes(searchStr) ||
        referencia.includes(searchStr) ||
        concepto.includes(searchStr) ||
        nombre.includes(searchStr) ||
        empresa.includes(searchStr) ||
        area.includes(searchStr) ||
        tipo.includes(searchStr)
      );
    });
  }, [activeData, globalSearch, currentTab, categoriaFilter]);

  const activeStats = useMemo(() => {
    if (currentTab === "programacion") return dataProgramacion?.dashboard || {};
    if (currentTab === "atencion") {
      const list = filteredData;
      const total = list.length;
      const montoTotalSoles = list.reduce((sum, item) => sum + floatVal(item.monto_pen), 0);
      const montoTotalDolares = list.reduce((sum, item) => sum + floatVal(item.monto_usd), 0);
      
      const solesItems = list.map(item => floatVal(item.monto_pen)).filter(v => v > 0);
      const usdItems = list.map(item => floatVal(item.monto_usd)).filter(v => v > 0);
      
      const promedioSoles = solesItems.length ? solesItems.reduce((s, v) => s + v, 0) / solesItems.length : 0;
      const promedioDolares = usdItems.length ? usdItems.reduce((s, v) => s + v, 0) / usdItems.length : 0;
      
      const hoyStr = new Date().toISOString().substring(0, 7); // e.g. "2026-07"
      const esteMes = list.filter(item => item.fecha && item.fecha.startsWith(hoyStr)).length;

      return {
        total,
        montoTotalSoles,
        montoTotalDolares,
        promedioSoles,
        promedioDolares,
        esteMes
      };
    }
    if (currentTab === "liquidaciones") return dataLiquidaciones?.dashboard || {};
    return {};
  }, [currentTab, dataProgramacion, dataAtencion, dataLiquidaciones, filteredData]);

  const isLoading = isLoadingProg || isLoadingAtencion || isLoadingLiq;
  const isFetching = isFetchingProg || isFetchingAtencion || isFetchingLiq;

  const handleTabChange = (tabName) => {
    navigate(`/compras/${tabName}`);
  };

  const handleCrearNueva = () => {
    toast.info("La creación de registros de compras estará disponible pronto en la integración lógica.");
  };

  return (

      <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col">
        
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Título */}
            <div className="flex items-center gap-3">
              <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">Módulo Compras</h1>
            </div>
          </div>

          {/* ACCIONES DEL HEADER */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              onClick={handleCrearNueva}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider px-5 h-9 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <FilePlus size={15} />
              Nueva
            </Button>
            <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors border border-gray-200 bg-white">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* CONTENEDOR KPIs COMO BOTONES (ESTILO COMERCIAL) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          
          {/* 1. PROGRAMACIÓN */}
          <button
            type="button"
            onClick={() => handleTabChange("programacion")}
            className={`w-full text-left bg-white p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98] ${
              currentTab === "programacion"
                ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-md"
                : "border-gray-200 hover:border-emerald-300 hover:shadow-md"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                Programación
              </span>
              <div className="flex items-center gap-1.5">
                <ArrowUpRight className={`w-4 h-4 text-gray-300 transition-all duration-300 group-hover:text-emerald-400 ${currentTab === "programacion" && "text-emerald-500 translate-x-0.5 -translate-y-0.5"}`} />
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${currentTab === "programacion" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"}`}>
                  <CalendarRange className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-[950] text-gray-950 tracking-tight leading-none">
                {currentTab === "programacion" && isLoading ? (
                  <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-lg" />
                ) : (
                  currentTab === "programacion" ? activeStats.total || 0 : 3
                )}
              </h3>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-black tracking-tight">
              <div className="flex flex-col">
                <span className="text-gray-900 font-bold uppercase tracking-wider text-[9px] opacity-60">Presupuesto USD</span>
                <span className="text-gray-950 text-xs mt-0.5">
                  ${Number(currentTab === "programacion" ? activeStats.montoTotalDolares || 0 : 28290).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="text-right bg-emerald-50/70 text-emerald-700 px-2 py-1 rounded-lg flex flex-col items-end border border-emerald-100/50">
                <span className="text-[8px] font-black uppercase tracking-wider leading-none mb-0.5">Total PEN</span>
                <span className="font-bold text-[10px]">
                  S/. {Number(currentTab === "programacion" ? activeStats.montoTotalSoles || 0 : 3500).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </button>

          {/* 2. ATENCIÓN DE SOLICITUDES */}
          <button
            type="button"
            onClick={() => handleTabChange("atencion")}
            className={`w-full text-left bg-white p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98] ${
              currentTab === "atencion"
                ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-md"
                : "border-gray-200 hover:border-indigo-300 hover:shadow-md"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                Atención de Solicitudes
              </span>
              <div className="flex items-center gap-1.5">
                <ArrowUpRight className={`w-4 h-4 text-gray-300 transition-all duration-300 group-hover:text-indigo-400 ${currentTab === "atencion" && "text-indigo-500 translate-x-0.5 -translate-y-0.5"}`} />
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${currentTab === "atencion" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"}`}>
                  <ClipboardList className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-[950] text-gray-950 tracking-tight leading-none">
                {currentTab === "atencion" && isLoading ? (
                  <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-lg" />
                ) : (
                  currentTab === "atencion" ? activeStats.total || 0 : 3
                )}
              </h3>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-black tracking-tight">
              <div className="flex flex-col">
                <span className="text-gray-900 font-bold uppercase tracking-wider text-[9px] opacity-60">Monto USD</span>
                <span className="text-gray-950 text-xs mt-0.5">
                  ${Number(currentTab === "atencion" ? activeStats.montoTotalDolares || 0 : 12300).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="text-right bg-indigo-50/70 text-indigo-700 px-2 py-1 rounded-lg flex flex-col items-end border border-indigo-100/50">
                <span className="text-[8px] font-black uppercase tracking-wider leading-none mb-0.5">Total PEN</span>
                <span className="font-bold text-[10px]">
                  S/. {Number(currentTab === "atencion" ? activeStats.montoTotalSoles || 0 : 4500).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </button>

          {/* 3. LIQUIDACIONES */}
          <button
            type="button"
            onClick={() => handleTabChange("liquidaciones")}
            className={`w-full text-left bg-white p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm cursor-pointer active:scale-[0.98] ${
              currentTab === "liquidaciones"
                ? "border-violet-500 ring-2 ring-violet-500/10 shadow-md"
                : "border-gray-200 hover:border-violet-300 hover:shadow-md"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                Liquidaciones
              </span>
              <div className="flex items-center gap-1.5">
                <ArrowUpRight className={`w-4 h-4 text-gray-300 transition-all duration-300 group-hover:text-violet-400 ${currentTab === "liquidaciones" && "text-violet-500 translate-x-0.5 -translate-y-0.5"}`} />
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${currentTab === "liquidaciones" ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white"}`}>
                  <Wallet2 className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-[950] text-gray-950 tracking-tight leading-none">
                {currentTab === "liquidaciones" && isLoading ? (
                  <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-lg" />
                ) : (
                  currentTab === "liquidaciones" ? activeStats.total || 0 : 3
                )}
              </h3>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-black tracking-tight">
              <div className="flex flex-col">
                <span className="text-gray-900 font-bold uppercase tracking-wider text-[9px] opacity-60">Monto USD</span>
                <span className="text-gray-950 text-xs mt-0.5">
                  ${Number(currentTab === "liquidaciones" ? activeStats.montoTotalDolares || 0 : 350).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="text-right bg-violet-50/70 text-violet-700 px-2 py-1 rounded-lg flex flex-col items-end border border-violet-100/50">
                <span className="text-[8px] font-black uppercase tracking-wider leading-none mb-0.5">Total PEN</span>
                <span className="font-bold text-[10px]">
                  S/. {Number(currentTab === "liquidaciones" ? activeStats.montoTotalSoles || 0 : 1790).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </button>

        </div>

        {/* FILTROS Y BARRA DE BÚSQUEDA */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm relative">
          
          {/* Sincronización loader */}
          {isFetching && (
            <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20 flex items-center gap-2 text-indigo-600 font-bold text-[10px] uppercase tracking-wider bg-white/90 pl-2">
              <Loader className="w-3.5 h-3.5 animate-spin" />
              Sincronizando...
            </div>
          )}

          <div className="flex flex-row items-center gap-3 w-full lg:max-w-2xl flex-wrap sm:flex-nowrap">
            {/* Buscador */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <ERPInput
                placeholder="Buscar por código, referencia o responsable..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Año */}
            <div className="relative">
              <select
                value={selectedAnno}
                onChange={(e) => setSelectedAnno(Number(e.target.value))}
                className="h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white transition-all appearance-none cursor-pointer outline-none min-w-[90px]"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>

            {/* Mes */}
            <div className="relative">
              <select
                value={selectedMes}
                onChange={(e) => setSelectedMes(e.target.value)}
                className="h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white transition-all appearance-none cursor-pointer outline-none min-w-[120px]"
              >
                <option value="%">Todos los meses</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const m = String(i + 1).padStart(2, '0');
                  const formatter = new Intl.DateTimeFormat('es-PE', { month: 'long' });
                  const name = formatter.format(new Date(2026, i, 1));
                  return (
                    <option key={m} value={m}>
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* FILTROS RÁPIDOS DE CATEGORÍA ESTILO COMERCIAL */}
          {(currentTab === "atencion" || currentTab === "liquidaciones") && (
            <div className="flex flex-row items-center gap-1.5 self-end lg:self-auto flex-wrap justify-end pr-2">
              {[
                { label: "Orden Compra/Servicios", value: "Compras" },
                { label: "Pasaje Aéreo", value: "Aereo" },
                { label: "Pasajes Terrestre", value: "Terrestre" }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategoriaFilter(prev => prev === opt.value ? "Todas" : opt.value)}
                  className={`whitespace-nowrap px-3 py-1.5 text-[9px] font-black rounded-xl transition-all ${
                    categoriaFilter === opt.value
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                      : "text-gray-500 hover:bg-slate-50 hover:text-gray-900"
                  }`}
                >
                  {opt.label.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GRIDS DE CONTENIDO (TABLAS) */}
        <div className="flex-1 flex flex-col min-h-[400px]">
          
          {currentTab === "programacion" && (
            <TablaProgramacion
              data={filteredData}
              isLoading={isLoading}
              currentPage={currentPage}
              pageSize={10}
              totalPages={Math.max(1, Math.ceil(filteredData.length / 10))}
              onPageChange={setCurrentPage}
              onRowClick={(row) => {
                navigate(`/compras/programacion/${row.id_registro}`);
              }}
            />
          )}

          {currentTab === "atencion" && (
            <TablaAtencion
              data={filteredData}
              isLoading={isLoading}
              currentPage={currentPage}
              pageSize={10}
              totalPages={Math.max(1, Math.ceil(filteredData.length / 10))}
              onPageChange={setCurrentPage}
              onRowClick={(row) => {
                if (row.tipo_gasto === "03") {
                  navigate(`/compras/atencion/${row.id_solicitud}`);
                } else {
                  toast.success(`Seleccionado solicitud: ${row.codigo}`);
                }
              }}
            />
          )}

          {currentTab === "liquidaciones" && (
            <TablaLiquidaciones
              data={filteredData}
              isLoading={isLoading}
              currentPage={currentPage}
              pageSize={10}
              totalPages={Math.max(1, Math.ceil(filteredData.length / 10))}
              onPageChange={setCurrentPage}
              onRowClick={(row) => {
                if (row.tipo_gasto === "03") {
                  navigate(`/compras/atencion/${row.id_solicitud}`);
                } else {
                  toast.success(`Seleccionado liquidación: ${row.codigo}`);
                }
              }}
            />
          )}

        </div>
      </div>
  );
}

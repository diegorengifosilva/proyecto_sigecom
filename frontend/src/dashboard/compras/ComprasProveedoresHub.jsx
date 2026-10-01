import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Contact2,
  Users,
  ShieldCheck,
  PhoneCall,
  MapPin,
  FileCheck,
  Mail
} from "lucide-react";
import api from "@/services/api";
import { toast } from "../../utils/toast";
import TablaProveedoresCatalog from "./tablas/TablaProveedoresCatalog";
import TablaRepresentantesCatalog from "./tablas/TablaRepresentantesCatalog";
import ClienteModal from "../Tablas/EstructuraComercial/Modal/ClienteModal";
import RepresentanteModal from "../Tablas/EstructuraComercial/Modal/RepresentanteModal";

export default function ComprasProveedoresHub({ defaultTab = "proveedores" }) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "proveedores";

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  // 1. ORDEN SOLICITADO: 1. Proveedores, 2. Clientes, 3. Representantes
  const tabs = [
    {
      id: "proveedores",
      label: "Empresas Proveedoras",
      icon: Building2,
      badge: "Catálogo",
    },
    {
      id: "clientes",
      label: "Empresas Clientes",
      icon: Users,
      badge: "Clientes",
    },
    {
      id: "representantes",
      label: "Representantes y Contactos",
      icon: Contact2,
      badge: "Directorio",
    },
  ];

  // 2. PAGINACIÓN RESPONSIVA DINÁMICA (ESTILO MÓDULO COMERCIAL - SIN SCROLL VERTICAL)
  // Descuenta la altura acumulada del layout y elementos fijos para ajustar las filas exactamente al viewport
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const calculatePageSize = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      if (vw < 768) {
        setPageSize(6); // Móvil
        return;
      }

      // Altura por fila compacta en ERPTable (42px)
      const rowHeight = 42;
      // Altura acumulada real de elementos fijos:
      // Navbar layout (64px) + Padding Main desktop (48px) + Header Hub (42px) + Tabs (38px)
      // 4 KPIs compactos (68px) + Toolbar buscador/botón (44px) + thead tabla (36px) + paginador footer (40px)
      // Gaps/márgenes (30px) + margen de seguridad (45px) = 455px en pantallas grandes (vh >= 850) y 370px en laptops (vh < 850)
      const chromeHeight = vh < 850 ? 370 : 455;
      const availableHeight = Math.max(160, vh - chromeHeight);
      const computedRows = Math.floor(availableHeight / rowHeight);

      // Filas dinámicas inteligentes: se adaptan al alto de la pantalla sin desbordar ni generar scroll
      const finalPageSize = Math.max(Math.min(computedRows, 25), 5);
      setPageSize(finalPageSize);
    };

    calculatePageSize();
    window.addEventListener("resize", calculatePageSize);
    return () => window.removeEventListener("resize", calculatePageSize);
  }, []);

  // 3. ESTADOS DE BÚSQUEDA Y PÁGINA INDIVIDUAL POR PESTAÑA
  const [searchProv, setSearchProv] = useState("");
  const [pageProv, setPageProv] = useState(1);

  const [searchCli, setSearchCli] = useState("");
  const [pageCli, setPageCli] = useState(1);

  const [searchRep, setSearchRep] = useState("");
  const [pageRep, setPageRep] = useState(1);

  // 4. CARGA DE DATOS PARA ANALÍTICA EN TIEMPO REAL
  const { data: clientes = [], isLoading: isLoadingClientes } = useQuery({
    queryKey: ["maestra-clientes"],
    queryFn: async () => {
      const { data } = await api.get("core/clientes/");
      return data.filter((c) => c.nombre !== null && c.nombre.trim() !== "");
    },
    staleTime: 60000,
  });

  const { data: representantes = [], isLoading: isLoadingReps } = useQuery({
    queryKey: ["maestra-representantes"],
    queryFn: async () => {
      const { data } = await api.get("core/representantes/");
      return data.filter((r) => r.nombre_representante !== null && r.nombre_representante.trim() !== "");
    },
    staleTime: 60000,
  });

  // 5. ESTADOS Y MUTACIONES PARA MODALES (CREAR / EDITAR / ELIMINAR)
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  const [modalRepOpen, setModalRepOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);

  const saveClienteMutation = useMutation({
    mutationFn: async (formData) => {
      const esEdicion = !!selectedCliente;
      if (esEdicion) {
        return await api.put("core/clientes/", formData);
      } else {
        return await api.post("core/clientes/", formData);
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["maestra-clientes"] });
      const mensaje = response.data?.message || "Operación exitosa";
      toast.success(mensaje);
      setModalClienteOpen(false);
      setSelectedCliente(null);
    },
    onError: (error) => {
      const msg = error.response?.data?.error || "Error al procesar la empresa";
      toast.error(msg);
    }
  });

  const deleteClienteMutation = useMutation({
    mutationFn: async (idCliente) => {
      return await api.delete("core/clientes/", {
        data: { id_cliente: idCliente }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maestra-clientes"] });
      toast.success("Empresa eliminada correctamente");
      setModalClienteOpen(false);
      setSelectedCliente(null);
    },
    onError: (error) => {
      const msg = error.response?.data?.error || "Error al eliminar";
      toast.error(msg);
    }
  });

  const saveRepMutation = useMutation({
    mutationFn: async (formData) => {
      const esEdicion = !!selectedRep;
      if (esEdicion) {
        return await api.put("core/representantes/", formData);
      } else {
        return await api.post("core/representantes/", formData);
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["maestra-representantes"] });
      const mensaje = response.data?.message || "Operación exitosa";
      toast.success(mensaje);
      setModalRepOpen(false);
      setSelectedRep(null);
    },
    onError: (error) => {
      const msg = error.response?.data?.error || "Error al procesar representante";
      toast.error(msg);
    }
  });

  const deleteRepMutation = useMutation({
    mutationFn: async (idRep) => {
      return await api.delete("core/representantes/", {
        data: { id_representante: idRep }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maestra-representantes"] });
      toast.success("Representante eliminado correctamente");
      setModalRepOpen(false);
      setSelectedRep(null);
    },
    onError: (error) => {
      const msg = error.response?.data?.error || "Error al eliminar representante";
      toast.error(msg);
    }
  });

  const handleEditCliente = (cli) => {
    setSelectedCliente(cli);
    setModalClienteOpen(true);
  };

  const handleNewCliente = () => {
    setSelectedCliente(null);
    setModalClienteOpen(true);
  };

  const handleEditRep = (rep) => {
    setSelectedRep(rep);
    setModalRepOpen(true);
  };

  const handleNewRep = () => {
    setSelectedRep(null);
    setModalRepOpen(true);
  };

  // 6. MODELO DE ANALÍTICA Y KPIs DE ALTO VALOR DECISIONAL
  const analytics = useMemo(() => {
    // A. Proveedores
    const totalProveedores = clientes.length;
    let provActivos = 0;
    let provConRuc = 0;
    let provConDir = 0;

    clientes.forEach((c) => {
      const isActivo = c.activo === true || c.activo === "1" || c.activo === 1;
      if (isActivo) provActivos++;
      if (c.ruc && c.ruc.trim().length === 11) provConRuc++;
      if (c.direccion && c.direccion.trim() !== "" && !c.direccion.toLowerCase().includes("no especificado")) {
        provConDir++;
      }
    });

    const pctProvActivos = totalProveedores > 0 ? ((provActivos / totalProveedores) * 100).toFixed(1) : "0";
    const pctProvRuc = totalProveedores > 0 ? ((provConRuc / totalProveedores) * 100).toFixed(1) : "0";
    const pctProvDir = totalProveedores > 0 ? ((provConDir / totalProveedores) * 100).toFixed(1) : "0";

    // B. Clientes
    const totalClientes = clientes.length;
    let cliActivos = 0;
    let cliConRuc = 0;
    let cliConDir = 0;

    clientes.forEach((c) => {
      const isActivo = c.activo === true || c.activo === "1" || c.activo === 1;
      if (isActivo) cliActivos++;
      if (c.ruc && c.ruc.trim().length >= 10) cliConRuc++;
      if (c.direccion && !c.direccion.toLowerCase().includes("no especificado")) cliConDir++;
    });

    const pctCliActivos = totalClientes > 0 ? ((cliActivos / totalClientes) * 100).toFixed(1) : "0";
    const pctCliRuc = totalClientes > 0 ? ((cliConRuc / totalClientes) * 100).toFixed(1) : "0";

    // C. Representantes
    const totalReps = representantes.length;
    let repsConTel = 0;
    let repsConEmail = 0;
    let repsConEmpresa = 0;
    let repsActivos = 0;

    representantes.forEach((r) => {
      const isActivo = r.activo === true || r.activo === "1" || r.activo === 1;
      if (isActivo) repsActivos++;
      if ((r.telefono && r.telefono.trim()) || (r.movil && r.movil.trim())) repsConTel++;
      if (r.email && r.email.includes("@")) repsConEmail++;
      if (r.nombre_empresa && r.nombre_empresa.trim()) repsConEmpresa++;
    });

    const pctRepsTel = totalReps > 0 ? ((repsConTel / totalReps) * 100).toFixed(1) : "0";
    const pctRepsEmail = totalReps > 0 ? ((repsConEmail / totalReps) * 100).toFixed(1) : "0";
    const pctRepsAsig = totalReps > 0 ? ((repsConEmpresa / totalReps) * 100).toFixed(1) : "0";

    return {
      prov: {
        total: totalProveedores,
        activos: provActivos,
        pctActivos: pctProvActivos,
        conRuc: provConRuc,
        pctRuc: pctProvRuc,
        conDir: provConDir,
        pctDir: pctProvDir,
      },
      cli: {
        total: totalClientes,
        activos: cliActivos,
        pctActivos: pctCliActivos,
        conRuc: cliConRuc,
        pctRuc: pctCliRuc,
        conDir: cliConDir,
      },
      rep: {
        total: totalReps,
        activos: repsActivos,
        conTel: repsConTel,
        pctTel: pctRepsTel,
        conEmail: repsConEmail,
        pctEmail: pctRepsEmail,
        conEmpresa: repsConEmpresa,
        pctAsig: pctRepsAsig,
      }
    };
  }, [clientes, representantes]);

  return (
    <div className="w-full space-y-2 animate-in fade-in duration-300 min-h-0 flex flex-col font-sans">
      {/* 1. ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-base md:text-xl font-black text-gray-900 tracking-tight">
              Proveedores y Catálogo Comercial
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Directorio Activo
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Gestión integral de empresas proveedoras, clientes y ejecutivos comerciales
          </p>
        </div>
      </div>

      {/* 2. SUB-NAVEGACIÓN HORIZONTAL ESTILO JIRA */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs px-3 sm:px-5">
        <div className="flex items-center justify-between border-b border-gray-100">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto overflow-y-hidden scrollbar-none py-0.5">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`group flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-teal-600 text-teal-700 font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${
                        isActive
                          ? "bg-teal-50 text-teal-700 border border-teal-200/80"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. BLOQUE DE 4 KPIs ANALÍTICOS Y PREDICTIVOS SEGÚN LA PESTAÑA */}
      {currentTab === "proveedores" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-2.5">
          {/* KPI 1: Cartera Activa */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  Cartera Activa
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60 shrink-0">
                {analytics.prov.pctActivos}% Operativos
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingClientes ? "--" : analytics.prov.total.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {analytics.prov.activos.toLocaleString()} Vigentes
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Homologación:</span>
              <span className="font-bold text-teal-600">Cartera Formal V&C</span>
            </div>
          </div>

          {/* KPI 2: Formalidad Fiscal RUC */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  Formalidad Fiscal
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
                {analytics.prov.pctRuc}% Con RUC
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingClientes ? "--" : analytics.prov.conRuc.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                SUNAT Habido
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Auditoría Tributaria:</span>
              <span className="font-bold text-blue-600">RUC 11 Dígitos Válido</span>
            </div>
          </div>

          {/* KPI 3: Capacidad de Contacto */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  Contacto Directo
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                {analytics.rep.pctTel}% Móvil
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingReps ? "--" : analytics.rep.conTel.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Ejecutivos con Teléfono
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Respuesta Comercial:</span>
              <span className="font-bold text-emerald-600">Cotizaciones Ágiles</span>
            </div>
          </div>

          {/* KPI 4: Geo-Localización */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  Geo-Localización
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0">
                {analytics.prov.pctDir}% Mapeado
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingClientes ? "--" : analytics.prov.conDir.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Direcciones Fiscales
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Logística y Despachos:</span>
              <span className="font-bold text-indigo-600">Almacén Verificado</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "clientes" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-2.5">
          {/* KPI 1: Cuentas Corporativas */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  Cuentas Clientes
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60 shrink-0">
                {analytics.cli.pctActivos}% Operativas
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingClientes ? "--" : analytics.cli.total.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Empresas en Cartera
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Segmentación:</span>
              <span className="font-bold text-teal-600">Cuentas Minería/Industria</span>
            </div>
          </div>

          {/* KPI 2: Tasa de Vinculación */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <Contact2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  Vinculación Comercial
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                {analytics.rep.pctAsig}% Asignados
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingReps ? "--" : analytics.rep.conEmpresa.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Contactos Enlazados
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Atención Comercial:</span>
              <span className="font-bold text-emerald-600">Gestores Asignados</span>
            </div>
          </div>

          {/* KPI 3: Integridad RUC */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  RUC Validado
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                {analytics.cli.pctRuc}% RUC Válido
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingClientes ? "--" : analytics.cli.conRuc.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Identificación Fiscal
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Facturación Electrónica:</span>
              <span className="font-bold text-amber-600">Emisión Inmediata</span>
            </div>
          </div>

          {/* KPI 4: Cobertura Operativa */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  Cobertura Operativa
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
                {analytics.prov.pctDir}% Con Sede
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingClientes ? "--" : analytics.cli.conDir.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Sedes y Plantas
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Entrega de Suministros:</span>
              <span className="font-bold text-blue-600">Puntos de Despacho</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "representantes" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-2.5">
          {/* KPI 1: Directorio Total */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                  <Contact2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  Directorio Comercial
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60 shrink-0">
                {((analytics.rep.activos / Math.max(1, analytics.rep.total)) * 100).toFixed(0)}% Activos
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingReps ? "--" : analytics.rep.total.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Ejecutivos Registrados
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Red de Enlaces:</span>
              <span className="font-bold text-teal-600">Interlocutores Válidos</span>
            </div>
          </div>

          {/* KPI 2: Contactabilidad Móvil */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  Contactabilidad Directa
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                {analytics.rep.pctTel}% Móvil
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingReps ? "--" : analytics.rep.conTel.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Líneas Telefónicas
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Respuesta Inmediata:</span>
              <span className="font-bold text-emerald-600">Llamada y WhatsApp</span>
            </div>
          </div>

          {/* KPI 3: Canal Digital */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  Canal Digital
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
                {analytics.rep.pctEmail}% Con Email
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingReps ? "--" : analytics.rep.conEmail.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Correos Corporativos
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Envío Formal:</span>
              <span className="font-bold text-blue-600">Cotizaciones y OC</span>
            </div>
          </div>

          {/* KPI 4: Asignación a Empresas */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                  Vinculación Empresarial
                </span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 shrink-0">
                {analytics.rep.pctAsig}% Asignados
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none">
                {isLoadingReps ? "--" : analytics.rep.conEmpresa.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Enlaces a Cuentas
              </span>
            </div>
            <div className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-between border-t border-slate-100 pt-0.5">
              <span>Mapeo 1 a 1:</span>
              <span className="font-bold text-purple-600">Empresas con ejecutivo directo</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONTENEDOR DINÁMICO DE TABLAS CON FILAS RESPONSIVAS INTELIGENTES (IDÉNTICO A COMERCIAL) */}
      <div className="flex-1 min-h-0">
        {currentTab === "proveedores" && (
          <TablaProveedoresCatalog
            data={clientes}
            isLoading={isLoadingClientes}
            pageSize={pageSize}
            currentPage={pageProv}
            onPageChange={setPageProv}
            searchTerm={searchProv}
            onSearchChange={setSearchProv}
            buttonLabel="Nuevo Proveedor"
            onRowClick={handleEditCliente}
            onNewClick={handleNewCliente}
          />
        )}

        {currentTab === "clientes" && (
          <TablaProveedoresCatalog
            data={clientes}
            isLoading={isLoadingClientes}
            pageSize={pageSize}
            currentPage={pageCli}
            onPageChange={setPageCli}
            searchTerm={searchCli}
            onSearchChange={setSearchCli}
            buttonLabel="Nuevo Cliente"
            onRowClick={handleEditCliente}
            onNewClick={handleNewCliente}
          />
        )}

        {currentTab === "representantes" && (
          <TablaRepresentantesCatalog
            data={representantes}
            isLoading={isLoadingReps}
            pageSize={pageSize}
            currentPage={pageRep}
            onPageChange={setPageRep}
            searchTerm={searchRep}
            onSearchChange={setSearchRep}
            buttonLabel="Nuevo Representante"
            onRowClick={handleEditRep}
            onNewClick={handleNewRep}
          />
        )}
      </div>

      {/* 5. MODALES INTEGRADOS PARA CLIENTES / PROVEEDORES Y REPRESENTANTES */}
      <ClienteModal
        open={modalClienteOpen}
        onClose={() => {
          setModalClienteOpen(false);
          setSelectedCliente(null);
        }}
        clienteData={selectedCliente}
        clientes={clientes}
        onGuardar={(data) => saveClienteMutation.mutate(data)}
        onEliminar={(id) => deleteClienteMutation.mutate(id)}
      />

      <RepresentanteModal
        open={modalRepOpen}
        onClose={() => {
          setModalRepOpen(false);
          setSelectedRep(null);
        }}
        repData={selectedRep}
        representantes={representantes}
        onGuardar={(data) => saveRepMutation.mutate(data)}
        onEliminar={(id) => deleteRepMutation.mutate(id)}
      />
    </div>
  );
}

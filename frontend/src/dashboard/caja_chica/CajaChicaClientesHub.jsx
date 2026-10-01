import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Contact2,
  Building2,
  ShieldCheck,
  PhoneCall,
  MapPin,
  Mail,
  FileCheck,
  RefreshCw,
  Search
} from "lucide-react";
import api from "@/services/api";
import { toast } from "../../utils/toast";
import TablaProveedoresCatalog from "../compras/tablas/TablaProveedoresCatalog";
import TablaRepresentantesCatalog from "../compras/tablas/TablaRepresentantesCatalog";
import ClienteModal from "../Tablas/EstructuraComercial/Modal/ClienteModal";
import RepresentanteModal from "../Tablas/EstructuraComercial/Modal/RepresentanteModal";

export default function CajaChicaClientesHub({ defaultTab = "clientes" }) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "clientes";

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  // Pestañas solicitadas para Caja Chica (Clientes y Contactos, sin Proveedores)
  const tabs = [
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

  // PAGINACIÓN RESPONSIVA DINÁMICA (Cero scroll vertical, igual a Comercial y Compras)
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const calculatePageSize = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      if (vw < 768) {
        setPageSize(6);
        return;
      }

      const rowHeight = 42;
      const chromeHeight = vh < 850 ? 370 : 455;
      const availableHeight = Math.max(160, vh - chromeHeight);
      const computedRows = Math.floor(availableHeight / rowHeight);

      const finalPageSize = Math.max(Math.min(computedRows, 25), 5);
      setPageSize(finalPageSize);
    };

    calculatePageSize();
    window.addEventListener("resize", calculatePageSize);
    return () => window.removeEventListener("resize", calculatePageSize);
  }, []);

  // ESTADOS DE BÚSQUEDA Y PÁGINA INDIVIDUAL POR PESTAÑA
  const [searchCli, setSearchCli] = useState("");
  const [pageCli, setPageCli] = useState(1);

  const [searchRep, setSearchRep] = useState("");
  const [pageRep, setPageRep] = useState(1);

  // CARGA DE DATOS PARA ANALÍTICA EN TIEMPO REAL
  const { data: clientes = [], isLoading: isLoadingClientes } = useQuery({
    queryKey: ["caja-chica-clientes"],
    queryFn: async () => {
      const { data } = await api.get("core/clientes/");
      return data.filter((c) => c.nombre !== null && c.nombre.trim() !== "");
    },
    staleTime: 60000,
  });

  const { data: representantes = [], isLoading: isLoadingReps } = useQuery({
    queryKey: ["caja-chica-representantes"],
    queryFn: async () => {
      const { data } = await api.get("core/representantes/");
      return data.filter((r) => r.nombre_representante !== null && r.nombre_representante.trim() !== "");
    },
    staleTime: 60000,
  });

  // ESTADOS Y MUTACIONES PARA MODALES (CREAR / EDITAR / ELIMINAR)
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
      queryClient.invalidateQueries({ queryKey: ["caja-chica-clientes"] });
      queryClient.invalidateQueries({ queryKey: ["maestra-clientes"] });
      const mensaje = response.data?.message || "Operación exitosa";
      toast.success(mensaje);
      setModalClienteOpen(false);
      setSelectedCliente(null);
    },
    onError: (error) => {
      const msg = error.response?.data?.error || "Error al procesar el cliente";
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
      queryClient.invalidateQueries({ queryKey: ["caja-chica-clientes"] });
      queryClient.invalidateQueries({ queryKey: ["maestra-clientes"] });
      toast.success("Cliente eliminado correctamente");
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
      queryClient.invalidateQueries({ queryKey: ["caja-chica-representantes"] });
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
      queryClient.invalidateQueries({ queryKey: ["caja-chica-representantes"] });
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

  // MODELO DE ANALÍTICA Y KPIS CONTEXTUALES
  const analytics = useMemo(() => {
    // 1. Clientes
    const totalClientes = clientes.length;
    let cliActivos = 0;
    let cliConRuc = 0;
    let cliConDir = 0;

    clientes.forEach((c) => {
      const isActivo = c.activo === true || c.activo === "1" || c.activo === 1;
      if (isActivo) cliActivos++;
      if (c.ruc && c.ruc.trim().length === 11) cliConRuc++;
      if (c.direccion && c.direccion.trim() !== "" && !c.direccion.toLowerCase().includes("no especificado")) {
        cliConDir++;
      }
    });

    const pctCliActivos = totalClientes > 0 ? ((cliActivos / totalClientes) * 100).toFixed(1) : "0";
    const pctCliRuc = totalClientes > 0 ? ((cliConRuc / totalClientes) * 100).toFixed(1) : "0";
    const pctCliDir = totalClientes > 0 ? ((cliConDir / totalClientes) * 100).toFixed(1) : "0";

    // 2. Representantes
    const totalReps = representantes.length;
    let repsConEmail = 0;
    let repsConTelf = 0;
    let repsConEmpresa = 0;

    representantes.forEach((r) => {
      if (r.correo && r.correo.includes("@")) repsConEmail++;
      if (r.telefono && r.telefono.trim().length >= 6) repsConTelf++;
      if (r.id_cliente || r.empresa_nombre) repsConEmpresa++;
    });

    const pctRepsEmail = totalReps > 0 ? ((repsConEmail / totalReps) * 100).toFixed(1) : "0";
    const pctRepsTelf = totalReps > 0 ? ((repsConTelf / totalReps) * 100).toFixed(1) : "0";
    const pctRepsEmpresa = totalReps > 0 ? ((repsConEmpresa / totalReps) * 100).toFixed(1) : "0";

    return {
      totalClientes,
      cliActivos,
      pctCliActivos,
      pctCliRuc,
      pctCliDir,
      totalReps,
      repsConEmail,
      pctRepsEmail,
      pctRepsTelf,
      pctRepsEmpresa
    };
  }, [clientes, representantes]);

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col">
      {/* 1. ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">
              Catálogo de Clientes
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Caja Chica & Finanzas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["caja-chica-clientes"] });
              queryClient.invalidateQueries({ queryKey: ["caja-chica-representantes"] });
              toast.info("Catálogo actualizado");
            }}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors border border-gray-200 bg-white"
            title="Refrescar"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVEGACIÓN HORIZONTAL ESTILO JIRA */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs px-3 sm:px-6">
        <div className="flex items-center justify-between border-b border-gray-100">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto overflow-y-hidden scrollbar-none py-1">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`group flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
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

          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-400 pl-4 py-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>Directorio Comercial de Clientes</span>
          </div>
        </div>
      </div>

      {/* 3. FILA ÚNICA DE 4 KPIS CONTEXTUALES SEGÚN PESTAÑA */}
      {currentTab === "clientes" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Clientes</span>
                <span className="text-lg font-black text-gray-900 leading-none">
                  {isLoadingClientes ? "--" : analytics.totalClientes}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-teal-600 block">Directorio</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Clientes Activos</span>
                <span className="text-lg font-black text-gray-900 leading-none">
                  {isLoadingClientes ? "--" : `${analytics.pctCliActivos}%`}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">{analytics.cliActivos} Activas</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600 shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">RUC SUNAT</span>
                <span className="text-lg font-black text-gray-900 leading-none">
                  {isLoadingClientes ? "--" : `${analytics.pctCliRuc}%`}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-sky-600 block">Conforme</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Domicilio Fiscal</span>
                <span className="text-lg font-black text-gray-900 leading-none">
                  {isLoadingClientes ? "--" : `${analytics.pctCliDir}%`}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-purple-600 block">Registrado</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === "representantes" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600 shrink-0">
                <Contact2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Contactos</span>
                <span className="text-lg font-black text-gray-900 leading-none">
                  {isLoadingReps ? "--" : analytics.totalReps}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-sky-600 block">Registrados</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email Formal</span>
                <span className="text-lg font-black text-gray-900 leading-none">
                  {isLoadingReps ? "--" : `${analytics.pctRepsEmail}%`}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-emerald-600 block">{analytics.repsConEmail} Correos</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Teléfono / Móvil</span>
                <span className="text-lg font-black text-gray-900 leading-none">
                  {isLoadingReps ? "--" : `${analytics.pctRepsTelf}%`}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-amber-600 block">Contacto Directo</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Asignación Cliente</span>
                <span className="text-lg font-black text-gray-900 leading-none">
                  {isLoadingReps ? "--" : `${analytics.pctRepsEmpresa}%`}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
              <span className="text-indigo-600 block">Vinculados</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. TABLAS CON PAGINACIÓN DINÁMICA RESPONSIVA (SIN SCROLL VERTICAL) */}
      <div className="flex-1 min-h-0">
        {currentTab === "clientes" && (
          <TablaProveedoresCatalog
            data={clientes}
            isLoading={isLoadingClientes}
            searchTerm={searchCli}
            onSearchChange={setSearchCli}
            currentPage={pageCli}
            onPageChange={setPageCli}
            pageSize={pageSize}
            onNew={handleNewCliente}
            onEdit={handleEditCliente}
            onDelete={(id) => {
              if (window.confirm("¿Está seguro de eliminar este cliente?")) {
                deleteClienteMutation.mutate(id);
              }
            }}
            buttonLabel="Nuevo Cliente"
            title="Empresas Clientes"
            subtitle="Directorio de clientes y contratantes"
          />
        )}

        {currentTab === "representantes" && (
          <TablaRepresentantesCatalog
            data={representantes}
            isLoading={isLoadingReps}
            searchTerm={searchRep}
            onSearchChange={setSearchRep}
            currentPage={pageRep}
            onPageChange={setPageRep}
            pageSize={pageSize}
            onNew={handleNewRep}
            onEdit={handleEditRep}
            onDelete={(id) => {
              if (window.confirm("¿Está seguro de eliminar este representante?")) {
                deleteRepMutation.mutate(id);
              }
            }}
          />
        )}
      </div>

      {/* 5. MODALES DE GESTIÓN */}
      <ClienteModal
        isOpen={modalClienteOpen}
        onClose={() => {
          setModalClienteOpen(false);
          setSelectedCliente(null);
        }}
        initialData={selectedCliente}
        onSave={(data) => saveClienteMutation.mutate(data)}
        loading={saveClienteMutation.isLoading}
      />

      <RepresentanteModal
        isOpen={modalRepOpen}
        onClose={() => {
          setModalRepOpen(false);
          setSelectedRep(null);
        }}
        initialData={selectedRep}
        onSave={(data) => saveRepMutation.mutate(data)}
        loading={saveRepMutation.isLoading}
      />
    </div>
  );
}

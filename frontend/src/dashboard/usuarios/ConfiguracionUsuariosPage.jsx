import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Shield, Layers, Search, Check, Home, AlertTriangle, UserCheck, X, Lock, FileText } from "lucide-react";
import { ERPTable, ERPButton, ERPInput, FilterDropdown } from "@/components/ui/ERPComponents";
import api from "@/services/api";
import { toast } from "@/utils/toast";

const fetchUsers = async () => {
  const { data } = await api.get("users/usuarios-activos/");
  return data;
};

export default function ConfiguracionUsuariosPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("%");
  
  // Modal & Edit state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("datos"); // "datos" | "permisos" | "contrasena"
  const [selectedModules, setSelectedModules] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre_completo: "",
    usuario: "",
    correo: "",
    dni: "",
    id_area: "",
    id_cargo: "",
    id_banco: "",
    nro_cuenta: "",
    activo: 1,
    nueva_contrasena: "",
    confirmar_contrasena: "",
  });

  // Query: Users List
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["active_users_list"],
    queryFn: fetchUsers,
  });

  // Query: Areas List
  const { data: areas = [] } = useQuery({
    queryKey: ["areas_list"],
    queryFn: async () => {
      const { data } = await api.get("users/areas/");
      return data;
    }
  });

  // Query: Cargos List
  const { data: cargos = [] } = useQuery({
    queryKey: ["cargos_list"],
    queryFn: async () => {
      const { data } = await api.get("users/cargos/");
      return data;
    }
  });

  // Query: Bancos List
  const { data: bancos = [] } = useQuery({
    queryKey: ["bancos_list"],
    queryFn: async () => {
      const { data } = await api.get("users/bancos/");
      return data;
    }
  });

  const handleOpenManager = (user) => {
    setSelectedUser(user);
    setSelectedModules(user.modulos || []);
    setFormData({
      nombre_completo: user.nombre_completo || "",
      usuario: user.usuario || "",
      correo: user.correo || "",
      dni: user.dni || "",
      id_area: user.id_area || "",
      id_cargo: user.id_cargo || "",
      id_banco: user.id_banco || "",
      nro_cuenta: user.nro_cuenta || "",
      activo: user.activo ?? 1,
      nueva_contrasena: "",
      confirmar_contrasena: "",
    });
    setActiveTab("datos");
    setShowModal(true);
  };

  const handleToggleModule = (moduleName) => {
    if (selectedModules.includes(moduleName)) {
      setSelectedModules(selectedModules.filter(m => m !== moduleName));
    } else {
      setSelectedModules([...selectedModules, moduleName]);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSaving(true);
    try {
      const payload = {
        nombre_completo: formData.nombre_completo.trim(),
        usuario: formData.usuario.trim(),
        correo: formData.correo.trim(),
        dni: formData.dni.trim(),
        id_area: formData.id_area ? Number(formData.id_area) : null,
        id_cargo: formData.id_cargo ? Number(formData.id_cargo) : null,
        id_banco: formData.id_banco ? Number(formData.id_banco) : null,
        nro_cuenta: formData.nro_cuenta.trim(),
        activo: Number(formData.activo),
      };

      await api.put(`users/usuarios/${selectedUser.id_usuario}/`, payload);
      
      toast.success("Datos de usuario actualizados correctamente");
      queryClient.invalidateQueries(["active_users_list"]);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error al actualizar los datos del usuario.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!formData.nueva_contrasena) {
      toast.error("La nueva contraseña no puede estar vacía.");
      return;
    }
    if (formData.nueva_contrasena !== formData.confirmar_contrasena) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setIsSaving(true);
    try {
      await api.put(`users/usuarios/${selectedUser.id_usuario}/`, {
        nueva_contrasena: formData.nueva_contrasena
      });

      toast.success("Contraseña restablecida con éxito.");
      setFormData(prev => ({ ...prev, nueva_contrasena: "", confirmar_contrasena: "" }));
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error al restablecer la contraseña.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePermissions = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSaving(true);
    try {
      await api.post(`users/usuarios/${selectedUser.id_usuario}/modulos/`, {
        modulos: selectedModules
      });
      
      toast.success(`Permisos actualizados con éxito para ${selectedUser.nombre_completo}`);
      queryClient.invalidateQueries(["active_users_list"]);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error al actualizar los permisos del usuario.");
    } finally {
      setIsSaving(false);
    }
  };

  // Unique Areas list for dropdown filter
  const areasOptions = useMemo(() => {
    const unique = Array.from(new Set(users.map(u => u.area_nombre).filter(Boolean)));
    return [{ v: "%", n: "TODOS" }, ...unique.map(a => ({ v: a, n: a.toUpperCase() }))];
  }, [users]);

  // Filtering calculations
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.usuario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.correo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.cargo_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.area_nombre?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesArea = areaFilter === "%" || u.area_nombre === areaFilter;

    return matchesSearch && matchesArea;
  });

  // KPIs calculations
  const totalCount = users.length;
  const adminCount = users.filter(u => u.modulos?.includes("TI")).length;
  const withAccessCount = users.filter(u => u.modulos && u.modulos.length > 0).length;
  const noAccessCount = users.filter(u => !u.modulos || u.modulos.length === 0).length;

  const AVAILABLE_MODULES = [
    { name: "COMERCIAL", label: "Módulo Comercial", desc: "Gestión de cotizaciones, clientes y oportunidades." },
    { name: "LOGISTICA", label: "Módulo Logística & Almacén", desc: "Entradas, salidas de inventario y kardex de almacén." },
    { name: "COMPRAS", label: "Módulo Compras", desc: "Programación, atención y liquidaciones de compras." },
    { name: "CAJA CHICA", label: "Módulo Caja Chica & Finanzas", desc: "Solicitudes de gastos, arqueos y rendición de cuentas." },
    { name: "PROYECTOS", label: "Módulo Proyectos", desc: "Planeación, presupuestos y control de proyectos." },
    { name: "SUGERENCIAS Y QUEJAS", label: "Módulo Sugerencias y Quejas", desc: "Administrador de Buzón. Permite ver, gestionar y tomar acciones sobre las quejas y sugerencias de todos los usuarios." },
    { name: "TI", label: "Módulo TI (Superadministrador)", desc: "Acceso completo a todos los portales y configuración de seguridad." },
  ];

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500 min-h-0 flex flex-col">

      {/* HEADER SECTION */}
      <div className="flex flex-row justify-between items-center gap-2">
        <div>
          <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">Configuración de Usuarios</h1>
          <p className="text-[10px] md:text-sm text-gray-500 font-medium">
            <span>{filteredUsers.length} usuarios encontrados</span>
          </p>
        </div>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3.5">
        
        {/* KPI 1 - Total */}
        <div className="bg-white p-3 rounded-2xl border border-gray-150 hover:border-indigo-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Total Usuarios</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">{totalCount}</h3>
          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            Cuentas registradas
          </div>
        </div>

        {/* KPI 2 - Administradores */}
        <div className="bg-white p-3 rounded-2xl border border-gray-150 hover:border-purple-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Superadmins</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">{adminCount}</h3>
          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            Sistemas / TI
          </div>
        </div>

        {/* KPI 3 - Con Accesos */}
        <div className="bg-white p-3 rounded-2xl border border-gray-150 hover:border-emerald-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Con Accesos</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">{withAccessCount}</h3>
          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            Personal Autorizado
          </div>
        </div>

        {/* KPI 4 - Sin Accesos */}
        <div className="bg-white p-3 rounded-2xl border border-gray-150 hover:border-amber-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Sin Accesos</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none mt-0.5">{noAccessCount}</h3>
          <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            Accesos Limitados
          </div>
        </div>

      </div>

      {/* FILTER PANEL */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-3 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-row items-center gap-2 w-full lg:max-w-3xl flex-wrap sm:flex-nowrap">
          {/* Buscador */}
          <ERPInput
            placeholder="Buscar por usuario, nombre, cargo o área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="w-full sm:w-80 flex-1 sm:flex-initial"
          />

          {/* Filtro Area */}
          <FilterDropdown
            label="Área"
            icon="Layers"
            value={areaFilter === "%" ? "TODOS" : areaFilter}
            options={areasOptions}
            onSelect={setAreaFilter}
            showSearch={true}
          />
        </div>

        {/* Legend */}
        <div className="hidden lg:flex items-center gap-4 text-[9px] font-black uppercase tracking-wider text-slate-400 px-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> MODULOS</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> TI (ADMIN)</span>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="flex-1 min-h-0">
        <ERPTable
          headers={[
            { label: "Usuario / DNI", className: "w-[18%]" },
            { label: "Nombre Completo", className: "w-[25%]" },
            { label: "Cargo y Área", className: "w-[20%]" },
            { label: "Módulos Asignados", className: "w-[25%]" },
            { label: "Acciones", className: "w-[12%] text-center" }
          ]}
          loading={isLoading}
        >
          {filteredUsers.length > 0 ? (
            filteredUsers.map((item) => (
              <tr key={item.id_usuario} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-xs">
                  <p className="font-bold text-slate-800 mb-0.5">{item.usuario}</p>
                  <p className="text-slate-400 text-[10px] font-semibold">{item.dni || "Sin DNI"}</p>
                </td>
                <td className="px-4 py-3 text-xs">
                  <p className="font-bold text-slate-800">{item.nombre_completo}</p>
                  <p className="text-slate-400 text-[10px] font-semibold truncate max-w-xs">{item.correo}</p>
                </td>
                <td className="px-4 py-3 text-xs">
                  <p className="font-bold text-slate-800">{item.cargo_nombre || "Sin Cargo"}</p>
                  <p className="text-indigo-650 font-black text-[10px] uppercase tracking-wider">{item.area_nombre || "Sin Área"}</p>
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {item.modulos && item.modulos.length > 0 ? (
                      item.modulos.map((modName) => (
                        <span 
                          key={modName} 
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider ${
                            modName === "TI" 
                              ? "bg-purple-50 text-purple-700 border-purple-200" 
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          }`}
                        >
                          {modName}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold bg-slate-50 text-slate-400 border border-slate-200 uppercase tracking-wider">
                        Sin Accesos
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-center">
                  <ERPButton 
                    variant="secondary" 
                    onClick={() => handleOpenManager(item)}
                    className="!py-1.5 !px-3 mx-auto text-[10px] uppercase tracking-wider flex items-center gap-1.5 border border-slate-250 text-slate-700 bg-white hover:bg-slate-50 transition-all rounded-xl"
                  >
                    <Layers className="w-3.5 h-3.5 opacity-70" />
                    Gestionar
                  </ERPButton>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-slate-450 text-xs font-bold uppercase tracking-wider bg-white">
                No hay usuarios activos que coincidan con los filtros.
              </td>
            </tr>
          )}
        </ERPTable>
      </div>

      {/* REDESIGNED TABS MODAL FOR USER MANAGEMENT */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => !isSaving && setShowModal(false)}
          />
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-2xl border border-slate-100 relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-650" />
                  Administrar Usuario
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                  {selectedUser.nombre_completo} ({selectedUser.usuario})
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => !isSaving && setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Selectors */}
            <div className="flex border-b border-gray-150 mb-5 text-[10px] md:text-[11px] font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setActiveTab("datos")}
                className={`flex-1 pb-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "datos"
                    ? "border-indigo-600 text-indigo-650"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Datos Personales
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("permisos")}
                className={`flex-1 pb-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "permisos"
                    ? "border-indigo-600 text-indigo-650"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Módulos y Permisos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("contrasena")}
                className={`flex-1 pb-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "contrasena"
                    ? "border-indigo-600 text-indigo-650"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Cambiar Contraseña
              </button>
            </div>

            {/* Tab Panels */}
            <div className="overflow-y-auto flex-1 pr-1 pb-2">
              
              {/* TAB 1: DATOS PERSONALES */}
              {activeTab === "datos" && (
                <form onSubmit={handleSaveDetails} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nombre Completo */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">Nombre Completo</label>
                      <input 
                        type="text" 
                        required
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white"
                        value={formData.nombre_completo}
                        onChange={(e) => setFormData(p => ({ ...p, nombre_completo: e.target.value }))}
                      />
                    </div>
                    {/* Nombre de Usuario */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">Usuario</label>
                      <input 
                        type="text" 
                        required
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white"
                        value={formData.usuario}
                        onChange={(e) => setFormData(p => ({ ...p, usuario: e.target.value }))}
                      />
                    </div>
                    {/* Correo Corporativo */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">Correo Corporativo</label>
                      <input 
                        type="email" 
                        required
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white"
                        value={formData.correo}
                        onChange={(e) => setFormData(p => ({ ...p, correo: e.target.value }))}
                      />
                    </div>
                    {/* DNI */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">DNI / Documento</label>
                      <input 
                        type="text" 
                        maxLength={8}
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white"
                        value={formData.dni}
                        onChange={(e) => setFormData(p => ({ ...p, dni: e.target.value.replace(/\D/g, "") }))}
                      />
                    </div>
                    {/* Área */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">Área</label>
                      <select 
                        required
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white"
                        value={formData.id_area}
                        onChange={(e) => setFormData(p => ({ ...p, id_area: e.target.value }))}
                      >
                        <option value="">Seleccione Área...</option>
                        {areas.map(a => (
                          <option key={a.id_area} value={a.id_area}>{a.nombre.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    {/* Cargo */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">Cargo</label>
                      <select 
                        required
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white"
                        value={formData.id_cargo}
                        onChange={(e) => setFormData(p => ({ ...p, id_cargo: e.target.value }))}
                      >
                        <option value="">Seleccione Cargo...</option>
                        {cargos.map(c => (
                          <option key={c.id_cargo} value={c.id_cargo}>{c.nombre.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    {/* Banco */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">Banco</label>
                      <select 
                        required
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white"
                        value={formData.id_banco}
                        onChange={(e) => setFormData(p => ({ ...p, id_banco: e.target.value }))}
                      >
                        <option value="">Seleccione Banco...</option>
                        {bancos.map(b => (
                          <option key={b.id_banco} value={b.id_banco}>{b.nombre.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    {/* Nro de Cuenta */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">Número de Cuenta</label>
                      <input 
                        type="text" 
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white"
                        value={formData.nro_cuenta}
                        onChange={(e) => setFormData(p => ({ ...p, nro_cuenta: e.target.value }))}
                      />
                    </div>
                    {/* Estado Activo */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">Estado</label>
                      <select 
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white"
                        value={formData.activo}
                        onChange={(e) => setFormData(p => ({ ...p, activo: e.target.value }))}
                      >
                        <option value={1}>ACTIVO</option>
                        <option value={0}>INACTIVO</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <ERPButton type="submit" disabled={isSaving}>
                      {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </ERPButton>
                  </div>
                </form>
              )}

              {/* TAB 2: MODULOS Y PERMISOS */}
              {activeTab === "permisos" && (
                <form onSubmit={handleSavePermissions} className="space-y-4">
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {AVAILABLE_MODULES.map((mod) => {
                      const isChecked = selectedModules.includes(mod.name);
                      return (
                        <div 
                          key={mod.name}
                          onClick={() => handleToggleModule(mod.name)}
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isChecked 
                              ? "border-indigo-550 bg-indigo-50/40 shadow-sm" 
                              : "border-slate-150 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="pt-0.5 shrink-0">
                            <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all ${
                              isChecked 
                                ? "bg-indigo-600 border-indigo-600 text-white" 
                                : "border-slate-300 bg-white"
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold leading-tight ${isChecked ? "text-indigo-900" : "text-slate-700"}`}>
                              {mod.label}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                              {mod.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <ERPButton type="submit" disabled={isSaving}>
                      {isSaving ? "Guardando..." : "Guardar Permisos"}
                    </ERPButton>
                  </div>
                </form>
              )}

              {/* TAB 3: CAMBIAR CONTRASEÑA */}
              {activeTab === "contrasena" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 max-w-md mx-auto py-4">
                    {/* Nueva Contraseña */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">Nueva Contraseña</label>
                      <input 
                        type="password" 
                        required
                        placeholder="••••••••"
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white"
                        value={formData.nueva_contrasena}
                        onChange={(e) => setFormData(p => ({ ...p, nueva_contrasena: e.target.value }))}
                      />
                    </div>
                    {/* Confirmar Nueva Contraseña */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest">Confirmar Contraseña</label>
                      <input 
                        type="password" 
                        required
                        placeholder="••••••••"
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white"
                        value={formData.confirmar_contrasena}
                        onChange={(e) => setFormData(p => ({ ...p, confirmar_contrasena: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <ERPButton type="submit" disabled={isSaving}>
                      {isSaving ? "Restableciendo..." : "Restablecer Contraseña"}
                    </ERPButton>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

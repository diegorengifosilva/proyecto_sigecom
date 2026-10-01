import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import logo from "@/assets/logo.png";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import ActionMenu from "@/components/ui/ActionMenu";
import { toast } from "react-toastify";
import NotificationBell from "@/components/notificaciones/NotificationBell";

const Icon = ({ name, className }) => {
  const LucideIcon = LucideIcons[name] || LucideIcons.HelpCircle;
  return <LucideIcon className={className} />;
};

const NAV_ITEMS = [
  { path: "/home", label: "Dashboard", icon: "LayoutDashboard" },
  { path: "/comercial", label: "Comercial", icon: "FileText", modulo: "COMERCIAL" },
  {
    path: "/logistica",
    label: "Logística",
    icon: "ClipboardList",
    modulo: "LOGISTICA",
    subItems: [
      { path: "/logistica/tablas", label: "Tablas" }
    ]
  },
  {
    path: "/proyectos/home",
    label: "Proyectos",
    icon: "Briefcase",
    modulo: "PROYECTOS",
    subItems: [
      { path: "/proyectos/home", label: "Dashboard Principal" },
      { path: "/proyectos/mis-proyectos", label: "Mis Proyectos" },
      { path: "/proyectos/evaluaciones", label: "Evaluaciones Estratégicas" },
      { path: "/proyectos/riesgos", label: "Gestión de Riesgos" },
      { path: "/proyectos/reportes", label: "Reportes Ejecutivos" }
    ]
  },
  {
    path: "/compras",
    label: "Compras",
    icon: "ShoppingCart",
    modulo: "COMPRAS",
    subItems: [
      { path: "/compras/dashboard", label: "Dashboard Compras" },
      { path: "/compras/programacion", label: "Ciclo de Compras" },
      { path: "/compras/trazabilidad", label: "Trazabilidad y SLA" },
      { path: "/compras/proveedores", label: "Catálogo de Proveedores" },
      { path: "/compras/reportes", label: "Reportes Ejecutivos" }
    ]
  },
  {
    path: "/caja-chica",
    label: "Caja Chica",
    icon: "Wallet",
    modulo: "CAJA CHICA",
    subItems: [
      { path: "/caja-chica/dashboard", label: "Dashboard Caja Chica" },
      { path: "/caja-chica/operaciones", label: "Gestión Operativa" },
      { path: "/caja-chica/portal", label: "Portal del Solicitante" },
      { path: "/caja-chica/destinatario", label: "Portal del Destinatario" },
      { path: "/caja-chica/clientes", label: "Catálogo de Clientes" },
      { path: "/caja-chica/arqueo-reportes", label: "Arqueo y Reportes" }
    ]
  },
  { path: "/almacen", label: "Almacén", icon: "Package", modulo: "LOGISTICA" },
  { path: "/finanzas", label: "Finanzas", icon: "DollarSign", modulo: "CAJA CHICA" },
  {
    path: "/maestro/comercial",
    label: "Maestro",
    icon: "Database",
    subItems: [
      { path: "/maestro/comercial", label: "Maestro Comercial" },
      { path: "/maestro/compras", label: "Maestro Compras" },
      { path: "/maestro/parametros", label: "Parámetros y Notas" },
      { path: "/maestro/gastos", label: "Gastos y Personal" }
    ]
  },
  {
    path: "/hseq/dashboard",
    label: "HSEQ",
    icon: "GraduationCap",
    subItems: [
      { path: "/hseq/dashboard", label: "Dashboard HSEQ" },
      { path: "/hseq/capacitaciones", label: "Gestión de Capacitaciones" },
      { path: "/hseq/induccion-competencias", label: "Inducción y Competencias" },
      { path: "/hseq/colaboradores-portal", label: "Colaboradores y Portal" },
      { path: "/hseq/administracion", label: "Administración y Datos" }
    ]
  },
  {
    path: "/rrhh",
    label: "Recursos Humanos",
    icon: "UserCheck",
    subItems: [
      { path: "/rrhh", label: "Dashboard RR. HH." },
      { path: "/rrhh/personal", label: "Gestión y Selección" },
      { path: "/rrhh/desarrollo", label: "Desarrollo y Cultura" },
      { path: "/rrhh/nomina-portal", label: "Nómina, Salud y Portal" }
    ]
  },
  {
    path: "/emergencias",
    label: "Emergencias y Brigadas",
    icon: "Flame",
    subItems: [
      { path: "/emergencias", label: "Dashboard Emergencias" },
      { path: "/emergencias/brigadistas", label: "Gestión de Brigadistas" },
      { path: "/emergencias/operaciones", label: "Simulacros y Respuesta" },
      { path: "/emergencias/equipamiento", label: "Equipamiento e Inspecciones" }
    ]
  },
  {
    path: "/salud-ocupacional",
    label: "Salud Ocupacional",
    icon: "HeartPulse",
    subItems: [
      { path: "/salud-ocupacional", label: "Panel General EMO" },
      { path: "/salud-ocupacional/gestion-emo", label: "Gestión de EMO y Citas" },
      { path: "/salud-ocupacional/vigilancia", label: "Vigilancia Médica y Bienestar" },
      { path: "/salud-ocupacional/habilitaciones-red", label: "Habilitaciones y Red Médica" }
    ]
  },
  {
    path: "/seguridad/usuarios",
    label: "Seguridad y RBAC",
    icon: "ShieldAlert",
    modulo: "TI",
    subItems: [
      { path: "/seguridad/usuarios", label: "Administración Usuarios" },
      { path: "/seguridad/claves", label: "Gestión de Claves" },
      { path: "/seguridad/auditoria", label: "Auditoría Forense" }
    ]
  },
  {
    path: "/integracion/monitor",
    label: "Integración SIG",
    icon: "Network",
    modulo: "TI",
    subItems: [
      { path: "/integracion/monitor", label: "Monitor del Bus" },
      { path: "/integracion/comercial", label: "Comercial → Proyectos" },
      { path: "/integracion/personas", label: "Personal → RRHH & HSEQ" },
      { path: "/integracion/incidencias", label: "Bandeja Incidencias" }
    ]
  },
  { path: "/audit", label: "Auditoría", icon: "ShieldCheck" },
  { path: "/sugerencias", label: "Sugerencias y Quejas", icon: "MessageSquare" },
  { path: "/usuarios", label: "Configuración de Usuarios", icon: "Users", modulo: "TI" },
  { path: "/plan-inversion-anual", label: "Plan Inversión Anual", icon: "TrendingUp", modulo: "TI" },
];

const PORTALS_NAV_MAP = {
  comercial: ["Dashboard", "Comercial", "Maestro", "Sugerencias y Quejas"],
  logistica: ["Dashboard", "Logística", "Almacén", "Maestro", "Sugerencias y Quejas"],
  compras: ["Dashboard", "Compras", "Almacén", "Maestro", "Sugerencias y Quejas"],
  proyectos: ["Dashboard", "Proyectos", "Maestro", "Sugerencias y Quejas"],
  finanzas: ["Dashboard", "Finanzas", "Caja Chica", "Maestro", "Sugerencias y Quejas"],
  general: null // Muestra todos
};

const PORTAL_TO_MODULE_MAP = {
  comercial: "COMERCIAL",
  logistica: "LOGISTICA",
  compras: "COMPRAS",
  proyectos: "PROYECTOS",
  finanzas: "CAJA CHICA"
};

const PORTALS_LIST = [
  { key: "comercial", label: "Portal Comercial", path: "/comercial", modulo: "COMERCIAL", icon: "FileText", color: "from-blue-500 to-indigo-600" },
  { key: "logistica", label: "Portal Logística", path: "/logistica", modulo: "LOGISTICA", icon: "ClipboardList", color: "from-amber-500 to-orange-600" },
  { key: "compras", label: "Portal Compras", path: "/compras", modulo: "COMPRAS", icon: "ShoppingCart", color: "from-emerald-500 to-teal-600" },
  { key: "finanzas", label: "Portal Caja Chica", path: "/caja-chica", modulo: "CAJA CHICA", icon: "Wallet", color: "from-pink-500 to-rose-600" },
  { key: "proyectos", label: "Portal Proyectos", path: "/proyectos", modulo: "PROYECTOS", icon: "Briefcase", color: "from-purple-500 to-violet-600" }
];

const PATH_TO_PORTAL_MAP = {
  "/comercial": "comercial",
  "/logistica": "logistica",
  "/almacen": "logistica",
  "/compras": "compras",
  "/caja-chica": "finanzas",
  "/finanzas": "finanzas",
  "/proyectos": "proyectos"
};

const USE_MULTI_PORTAL = false; // Define si el sistema usa subdominios independientes. Falso para unificar en un solo dominio.

export default function DashboardLayout() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { authUser: user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getActivePortal = () => {
    if (!USE_MULTI_PORTAL) {
      return "general";
    }
    const host = window.location.hostname.toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const paramOverride = urlParams.get("portal");
    
    if (paramOverride) {
      localStorage.setItem("vc_portal_override", paramOverride);
      // Limpiar parámetro de la URL de forma asíncrona
      setTimeout(() => {
        urlParams.delete("portal");
        const searchStr = urlParams.toString();
        navigate({
          pathname: location.pathname,
          search: searchStr ? `?${searchStr}` : ""
        }, { replace: true });
      }, 0);
      return paramOverride;
    }
    const saved = localStorage.getItem("vc_portal_override");
    if (saved) return saved;

    if (host.includes("comercial")) return "comercial";
    if (host.includes("logistica")) return "logistica";
    if (host.includes("compras")) return "compras";
    if (host.includes("proyectos")) return "proyectos";
    if (host.includes("finanzas")) return "finanzas";
    return "general";
  };

  const changePortal = (targetPortal, path) => {
    if (!USE_MULTI_PORTAL) {
      navigate(path);
      return;
    }
    const host = window.location.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.")) {
      localStorage.setItem("vc_portal_override", targetPortal);
      navigate(path);
    } else {
      const domainParts = host.split(".");
      const port = window.location.port ? `:${window.location.port}` : "";
      const baseDomain = domainParts.slice(-2).join(".");
      window.location.href = `${window.location.protocol}//sigecom-5.${targetPortal}.${baseDomain}${port}${path}`;
    }
  };

  const activePortal = getActivePortal();
  const userModules = user?.modulos || [];
  const requiredModule = PORTAL_TO_MODULE_MAP[activePortal];
  
  // Superusuario TI tiene todos los accesos bypass
  const isSuperAdmin = userModules.some(m => m.toUpperCase() === "TI");

  // Validar si el usuario tiene acceso al portal actual
  const hasAccess = 
    isSuperAdmin ||
    activePortal === "general" || 
    (requiredModule && userModules.some(m => m.toUpperCase() === requiredModule.toUpperCase()));

  const currentPath = location.pathname;
  const pathPrefix = Object.keys(PATH_TO_PORTAL_MAP).find(prefix => currentPath.startsWith(prefix));
  const pathPortal = pathPrefix ? PATH_TO_PORTAL_MAP[pathPrefix] : null;

  const isRouteAllowed = 
    !pathPortal || 
    activePortal === "general" || 
    activePortal === pathPortal;

  // Redirección si la ruta no pertenece al portal activo pero el usuario tiene permisos (solo multi-portal)
  useEffect(() => {
    if (USE_MULTI_PORTAL && !isRouteAllowed && pathPortal) {
      const targetModule = PORTAL_TO_MODULE_MAP[pathPortal];
      const hasDbPermission = isSuperAdmin || (targetModule && userModules.some(m => m.toUpperCase() === targetModule.toUpperCase()));
      
      if (hasDbPermission) {
        changePortal(pathPortal, currentPath);
      } else {
        // Si no tiene permisos para esa ruta, enviarlo a su portal activo (o home)
        const activeItem = NAV_ITEMS.find(item => item.modulo && item.modulo.toUpperCase() === requiredModule?.toUpperCase());
        navigate(activeItem ? activeItem.path : "/home");
      }
    }
  }, [currentPath, activePortal, isRouteAllowed, userModules, isSuperAdmin]);

  // Proteger rutas no autorizadas en el dominio unificado
  useEffect(() => {
    if (!USE_MULTI_PORTAL && pathPortal) {
      const targetModule = PORTAL_TO_MODULE_MAP[pathPortal];
      const hasDbPermission = isSuperAdmin || (targetModule && userModules.some(m => m.toUpperCase() === targetModule.toUpperCase()));
      
      if (!hasDbPermission) {
        // Redirigir al primer módulo que tenga permitido
        const firstMod = userModules[0]?.toLowerCase();
        if (firstMod) {
          const defaultItem = NAV_ITEMS.find(item => item.modulo && item.modulo.toUpperCase() === userModules[0].toUpperCase());
          navigate(defaultItem ? defaultItem.path : "/home");
        } else {
          navigate("/login");
        }
      }
    }
  }, [currentPath, userModules, isSuperAdmin]);

  // Redirección automática si está en 'general' y no tiene permisos para Comercial al entrar a /home
  useEffect(() => {
    const isComercialAllowed = userModules.some(m => m.toUpperCase() === "COMERCIAL") || isSuperAdmin;
    if (activePortal === "general" && location.pathname === "/home" && !isComercialAllowed && userModules.length > 0) {
      let firstMod = userModules[0].toLowerCase();
      if (firstMod === "ti") {
        firstMod = "comercial";
      }
      const defaultPortal = firstMod === "caja chica" ? "finanzas" : firstMod;
      const defaultItem = NAV_ITEMS.find(item => item.modulo && item.modulo.toUpperCase() === userModules[0].toUpperCase());
      const path = defaultItem ? defaultItem.path : "/home";
      changePortal(defaultPortal, path);
    }
  }, [location.pathname, activePortal, userModules, isSuperAdmin]);

  // Filtrar ítems de navegación según el portal actual y los permisos asignados
  const filteredNavItems = NAV_ITEMS.filter((item) => {
    // 1. Filtrar por portal activo
    const allowedForPortal = PORTALS_NAV_MAP[activePortal];
    if (allowedForPortal && !allowedForPortal.includes(item.label)) {
      return false;
    }
    // 2. Filtrar por permisos de base de datos
    if (!item.modulo || isSuperAdmin) return true;
    return userModules.some(m => m.toUpperCase() === item.modulo.toUpperCase());
  });

  // Marcar notificación como leída si viene el parámetro marcar_leido_id en la URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const marcarLeidoId = params.get("marcar_leido_id");
    if (marcarLeidoId) {
      api.post(`/notificaciones/${marcarLeidoId}/marcar/`)
        .then(() => {
          // Limpiar el parámetro de la URL
          params.delete("marcar_leido_id");
          const searchStr = params.toString();
          navigate({
            pathname: location.pathname,
            search: searchStr ? `?${searchStr}` : ""
          }, { replace: true });
        })
        .catch(err => {
          console.error("Error al marcar notificación leída desde URL:", err);
        });
    }
  }, [location.search, location.pathname, navigate]);

  const [breadcrumbOverride, setBreadcrumbOverride] = useState(null);
  const [openMenus, setOpenMenus] = useState({});

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const initials = user?.nombre_completo
    ? user.nombre_completo.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase()
    : user?.usuario?.substring(0, 2).toUpperCase() || "US";

  const getCurrentModuleMeta = () => {
    const p = location.pathname;
    if (p.startsWith("/proyectos")) return { title: "Gestión de Proyectos", subtitle: "Módulo corporativo", icon: "FolderKanban" };
    if (p.startsWith("/hseq")) return { title: "Capacitaciones HSEQ", subtitle: "Módulo corporativo", icon: "GraduationCap" };
    if (p.startsWith("/rrhh")) return { title: "Recursos Humanos", subtitle: "Módulo corporativo", icon: "UserCheck" };
    if (p.startsWith("/emergencias")) return { title: "Gestión de Emergencias", subtitle: "Módulo corporativo", icon: "Flame" };
    if (p.startsWith("/salud-ocupacional")) return { title: "Salud Ocupacional EMO", subtitle: "Módulo corporativo", icon: "HeartPulse" };
    if (p.startsWith("/comercial")) return { title: "Gestión Comercial", subtitle: "Módulo corporativo", icon: "FileText" };
    if (p.startsWith("/logistica") || p.startsWith("/almacen")) return { title: "Logística y Almacén", subtitle: "Módulo corporativo", icon: "ClipboardList" };
    if (p.startsWith("/compras")) return { title: "Gestión de Compras", subtitle: "Módulo corporativo", icon: "ShoppingCart" };
    if (p.startsWith("/caja-chica") || p.startsWith("/finanzas")) return { title: "Caja Chica y Finanzas", subtitle: "Módulo corporativo", icon: "Wallet" };
    if (p.startsWith("/seguridad")) return { title: "Seguridad y RBAC", subtitle: "Módulo corporativo", icon: "ShieldAlert" };
    if (p.startsWith("/integracion")) return { title: "Integración SIG", subtitle: "Módulo corporativo", icon: "Network" };
    return { title: "SIGECOM 5.0", subtitle: "Sistema Integrado SIG", icon: "LayoutDashboard" };
  };

  const currentModuleMeta = getCurrentModuleMeta();

  // Form states for password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Todos los campos son obligatorios.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    try {
      setIsChangingPassword(true);
      await api.post("users/cambiar-contrasena/", {
        contrasena_actual: currentPassword,
        contrasena_nueva: newPassword
      });
      toast.success("Contraseña actualizada con éxito.");
      
      // Reset states
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordModal(false);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Error al actualizar la contraseña.";
      setPasswordError(errMsg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const [customBreadcrumbs, setCustomBreadcrumbs] = useState(null);

  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    
    // Evitar parpadeo/blanco al cambiar entre vistas del mismo registro comercial
    const commercialDetailRegex = /^\/comercial\/(oportunidades|cotizaciones|aperturas)\/([^/]+)/;
    const prevMatch = prevPathname.match(commercialDetailRegex);
    const currMatch = location.pathname.match(commercialDetailRegex);
    const isSameRecord = prevMatch && currMatch && prevMatch[2] === currMatch[2];
    
    if (!isSameRecord) {
      setBreadcrumbOverride(null);
      setCustomBreadcrumbs(null);
    }
  }

  useEffect(() => {
    const handleOverride = (e) => {
      const { path, label } = e.detail || {};
      if (path === location.pathname) {
        setBreadcrumbOverride(label);
      }
    };
    window.addEventListener("sigecom-breadcrumb-label", handleOverride);
    return () => window.removeEventListener("sigecom-breadcrumb-label", handleOverride);
  }, [location.pathname]);

  useEffect(() => {
    const handleCustom = (e) => {
      const { path, crumbs } = e.detail || {};
      if (path === location.pathname) {
        setCustomBreadcrumbs(crumbs);
      }
    };
    window.addEventListener("sigecom-custom-breadcrumbs", handleCustom);
    return () => window.removeEventListener("sigecom-custom-breadcrumbs", handleCustom);
  }, [location.pathname]);

  useEffect(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      let currentPageName = "";
      if (breadcrumbOverride) {
        currentPageName = breadcrumbOverride;
      } else {
        const lastPart = parts[parts.length - 1];
        currentPageName = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, " ");
      }
      document.title = `${currentPageName} | SIGECOM 5.0`;
    } else {
      document.title = "SIGECOM 5.0 - ERP";
    }
  }, [location.pathname, breadcrumbOverride]);

  useEffect(() => {
    const img = new Image();
    img.src = logo;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 32;
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, x, y, w, h);
        
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = canvas.toDataURL('image/png');
      }
    };
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Auto-open menus that contain the current path
    const activeMenus = {};
    filteredNavItems.forEach(item => {
      if (item.subItems && item.subItems.some(sub => location.pathname.startsWith(sub.path))) {
        activeMenus[item.label] = true;
      }
    });
    setOpenMenus(prev => ({ ...prev, ...activeMenus }));
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    logout();
    navigate("/login");
  };

  const getBreadcrumbs = () => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts.map((part, index) => {
      const path = `/${parts.slice(0, index + 1).join("/")}`;
      const isLast = index === parts.length - 1;
      let label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ");

      const friendlyLabels = {
        compras: "Compras",
        programacion: "Programación",
        atencion: "Atención de Solicitudes",
        liquidaciones: "Liquidaciones",
        ciclo: "Programación",
        trazabilidad: "Trazabilidad y SLA",
        proveedores: "Catálogo de Proveedores",
        reportes: "Reportes Ejecutivos"
      };

      if (friendlyLabels[part.toLowerCase()]) {
        label = friendlyLabels[part.toLowerCase()];
      }

      if (isLast && breadcrumbOverride && path === location.pathname) {
        label = breadcrumbOverride;
      }
      return { path, label, isLast };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen w-screen bg-gray-50 font-sans overflow-hidden relative">
      {/* Backdrop para móviles */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
        />
      )}

      {/* Sidebar estilo HSEQ corporativo */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-40 flex flex-col h-full bg-[#163f3b] text-[#eef9f7] border-r border-[#255650] shrink-0 transition-all duration-300 shadow-xl
          ${isMobileOpen ? "translate-x-0 w-[275px]" : "-translate-x-full md:translate-x-0"}
          ${isExpanded ? "md:w-[275px]" : "md:w-20"}`}
      >
        {/* Botón flotante para ocultar / mostrar menú */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="hidden md:flex absolute -right-3.5 top-6 z-50 text-[#163f3b] hover:text-[#0b2825] transition items-center justify-center w-7 h-7 rounded-full bg-white shadow-md border border-gray-200 hover:scale-105"
          title={isExpanded ? "Ocultar menú" : "Mostrar menú"}
        >
          {isExpanded ? (
            <LucideIcons.ChevronLeft className="h-4 w-4" />
          ) : (
            <LucideIcons.ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Brand Header con Tarjeta Blanca y Logo V&C Corporation */}
        <div className="p-3 pb-2 flex-shrink-0">
          {isExpanded ? (
            <NavLink
              to="/home"
              className="bg-white rounded-[13px] h-[92px] p-2 flex items-center justify-center shadow-md border border-white/20 transition-transform hover:scale-[1.01]"
              title="V&C Corporation"
            >
              <img
                src="/vc-corporation-logo.png"
                alt="V&C Corporation"
                className="max-h-[74px] w-full object-contain"
              />
            </NavLink>
          ) : (
            <NavLink
              to="/home"
              className="bg-white rounded-xl w-12 h-12 p-1.5 mx-auto flex items-center justify-center shadow-md border border-white/20 transition-transform hover:scale-105"
              title="V&C Corporation"
            >
              <img
                src="/vc-corporation-logo.png"
                alt="V&C"
                className="max-h-8 w-auto object-contain"
              />
            </NavLink>
          )}

          {/* Módulo corporativo activo */}
          <div className={`mt-3 flex items-center gap-2.5 px-2 py-1.5 border-b border-[#255650] ${isExpanded ? "" : "justify-center"}`}>
            <Icon name={currentModuleMeta.icon} className="h-5 w-5 text-teal-300 shrink-0" />
            {isExpanded && (
              <div className="min-w-0">
                <strong className="block text-[13.5px] font-bold text-white truncate leading-tight">
                  {currentModuleMeta.title}
                </strong>
                <span className="block text-[11px] text-[#b9d1cd]">
                  {currentModuleMeta.subtitle}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navegación Scrollable */}
        <nav className="flex-1 px-2.5 py-2 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {filteredNavItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isActive = location.pathname.startsWith(item.path);
            const isOpen = !!openMenus[item.label];

            const handleParentClick = (e) => {
              if (!isExpanded) {
                setIsExpanded(true);
                setOpenMenus((prev) => ({ ...prev, [item.label]: true }));
                navigate(item.path);
                return;
              }
              setOpenMenus((prev) => ({ ...prev, [item.label]: !prev[item.label] }));
            };

            return (
              <div key={item.label} className="flex flex-col">
                {hasSubItems ? (
                  <div>
                    {/* Botón principal del acordeón */}
                    <div className="flex items-center">
                      <NavLink
                        to={item.path}
                        onClick={(e) => {
                          if (!isExpanded) {
                            e.preventDefault();
                            setIsExpanded(true);
                            setOpenMenus((prev) => ({ ...prev, [item.label]: true }));
                            navigate(item.path);
                            return;
                          }
                          setOpenMenus((prev) => ({ ...prev, [item.label]: true }));
                        }}
                        title={item.label}
                        className={`flex-1 flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isActive || isOpen
                            ? "bg-[#168e87] text-white shadow-sm"
                            : "text-[#f2fbfa] hover:bg-white/10 hover:text-white"
                        } ${isExpanded ? "" : "justify-center"}`}
                      >
                        <Icon
                          name={item.icon}
                          className={`h-5 w-5 shrink-0 ${isExpanded ? "mr-2.5" : ""} ${
                            isActive || isOpen ? "text-white" : "text-teal-200/90"
                          }`}
                        />
                        {isExpanded && <span className="truncate">{item.label}</span>}
                      </NavLink>

                      {/* Flecha colapsable independiente si está expandido el sidebar */}
                      {isExpanded && (
                        <button
                          type="button"
                          onClick={handleParentClick}
                          className="p-2 rounded-lg text-teal-200/80 hover:text-white hover:bg-white/10 transition-colors ml-1"
                        >
                          <LucideIcons.ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${
                              isOpen ? "transform rotate-180" : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Subopciones */}
                    {isExpanded && isOpen && (
                      <div className="mt-1 ml-4 pl-3 border-l border-[#255650] space-y-1 py-1 animate-in slide-in-from-top-1 duration-200">
                        {item.subItems.map((sub, idx) => {
                          if (sub.isHeader) {
                            return (
                              <div
                                key={`hdr-${idx}-${sub.label}`}
                                className="pt-2.5 pb-0.5 px-2 text-[10px] font-bold uppercase tracking-wider text-teal-300/80 flex items-center gap-1.5"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                                <span>{sub.label}</span>
                              </div>
                            );
                          }
                          const isSubActive =
                            location.pathname === sub.path ||
                            location.pathname.startsWith(`${sub.path}/`) ||
                            (sub.label === "Ciclo de Compras" &&
                              ["/compras/programacion", "/compras/atencion", "/compras/liquidaciones", "/compras/ciclo"].some((p) =>
                                location.pathname.startsWith(p)
                              ));
                          return (
                            <NavLink
                              key={sub.path}
                              to={sub.path}
                              className={`block px-3 py-1.5 text-xs rounded-[6px] transition-all ${
                                isSubActive
                                  ? "border border-white bg-black/25 text-white font-bold shadow-sm"
                                  : "text-[#c7dbd8] hover:bg-white/10 hover:text-white font-medium"
                              }`}
                            >
                              {sub.label}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={item.path}
                    title={item.label}
                    className={`flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                      isActive
                        ? "bg-[#168e87] text-white shadow-sm"
                        : "text-[#f2fbfa] hover:bg-white/10 hover:text-white"
                    } ${isExpanded ? "" : "justify-center"}`}
                  >
                    <Icon
                      name={item.icon}
                      className={`h-5 w-5 shrink-0 ${isExpanded ? "mr-2.5" : ""} ${
                        isActive ? "text-white" : "text-teal-200/90"
                      }`}
                    />
                    {isExpanded && <span className="truncate">{item.label}</span>}
                  </NavLink>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Usuario / Mi Cuenta */}
        <div className="flex-shrink-0 border-t border-[#255650] p-3 bg-black/20">
          <ActionMenu
            align="start"
            title="Mi Cuenta"
            options={[
              {
                label: "Perfil Usuario",
                icon: LucideIcons.User,
                onClick: () => setShowProfileModal(true)
              },
              {
                label: "Cambiar Contraseña",
                icon: LucideIcons.KeyRound,
                onClick: () => setShowPasswordModal(true)
              },
              {
                label: "Cambiar módulo",
                icon: LucideIcons.Layers,
                hasSubmenu: true,
                submenuContent: (
                  <div className="py-0.5">
                    {PORTALS_LIST.filter(p => isSuperAdmin || userModules.some(m => m.toUpperCase() === p.modulo.toUpperCase())).map((item) => (
                      <button
                        key={item.path}
                        className="flex items-center w-full text-left gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-tight rounded-xl text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition-colors"
                        onClick={() => changePortal(item.key, item.path)}
                      >
                        <Icon name={item.icon} className="w-4 h-4 opacity-70" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )
              },
              { type: "separator" },
              {
                label: "Cerrar sesión",
                icon: LucideIcons.LogOut,
                variant: "danger",
                onClick: handleLogout
              }
            ]}
            customTrigger={
              <button className="flex items-center w-full min-w-0 text-left hover:bg-white/10 p-1.5 rounded-xl transition-all outline-none">
                <div className="h-8 w-8 rounded-full bg-[#168e87] border border-white/40 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow">
                  {initials}
                </div>
                {isExpanded && (
                  <div className="ml-2.5 min-w-0 flex-1 pr-1 relative">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {user?.nombre_completo || user?.usuario || "Usuario"}
                    </p>
                    <p className="text-[10px] font-semibold text-[#b9d1cd] truncate leading-none mt-0.5">
                      {user?.cargo_nombre || "Miembro"}
                    </p>
                  </div>
                )}
              </button>
            }
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 z-30">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Botón de Hamburguesa para celulares */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 md:hidden shrink-0"
            >
              <LucideIcons.Menu className="h-5.5 w-5.5" />
            </button>

            <nav className="flex items-center overflow-hidden">
              <ol className="flex items-center space-x-2 text-sm text-gray-500 min-w-0">
                <li className="hidden sm:block">
                  <NavLink to="/home" className="hover:text-indigo-600 transition-colors">
                    <LucideIcons.Home className="h-4 w-4" />
                  </NavLink>
                </li>
                {customBreadcrumbs ? (
                  customBreadcrumbs.map((crumb, idx) => (
                    <li key={idx} className="flex items-center min-w-0">
                      <LucideIcons.ChevronRight className="h-4 w-4 text-gray-300 mx-1 shrink-0" />
                      {crumb.path && !crumb.active ? (
                        <NavLink
                          to={crumb.path}
                          className="text-gray-400 hover:text-indigo-600 font-semibold truncate uppercase tracking-tight text-xs sm:text-sm transition-colors"
                        >
                          {crumb.label}
                        </NavLink>
                      ) : (
                        <span className={`font-bold truncate uppercase tracking-tight text-xs sm:text-sm ${
                          crumb.active ? "text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-lg shadow-sm" : "text-slate-800"
                        }`}>
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))
                ) : (
                  breadcrumbs.slice(1).map((crumb) => (
                    <li key={crumb.path} className={`items-center min-w-0 ${crumb.isLast ? "flex" : "hidden sm:flex"}`}>
                      <LucideIcons.ChevronRight className="h-4 w-4 text-gray-300 mx-1 shrink-0" />
                      {crumb.isLast ? (
                        <span className="font-bold text-indigo-600 truncate uppercase tracking-tight text-xs sm:text-sm">
                          {crumb.label}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-semibold truncate uppercase tracking-tight text-xs sm:text-sm">
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))
                )}
              </ol>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Dynamic icons or actions could go here */}
            <div className="h-8 w-px bg-gray-200" />
            <NotificationBell />
            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-all">
              <LucideIcons.Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-auto p-4 md:p-6 bg-gray-50/50">
          <div className="w-full h-full min-h-0">
            {hasAccess ? (
              <Outlet context={{ setCustomBreadcrumbs, setBreadcrumbOverride }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-2xl text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner animate-bounce">
                    <LucideIcons.ShieldAlert className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Acceso Restringido</h2>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-8">
                    Tu cuenta no tiene asignado el módulo necesario para ingresar al portal <span className="font-bold text-slate-600 uppercase">"{activePortal}"</span>. Solicita los permisos necesarios al administrador o ingresa a un portal autorizado.
                  </p>

                  <div className="w-full">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Portales Disponibles para Ti</h3>
                    {PORTALS_LIST.filter(p => userModules.some(m => m.toUpperCase() === p.modulo.toUpperCase())).length > 0 ? (
                      <div className="grid gap-3">
                        {PORTALS_LIST.filter(p => userModules.some(m => m.toUpperCase() === p.modulo.toUpperCase())).map((portal) => (
                          <button
                            key={portal.key}
                            onClick={() => changePortal(portal.key, portal.path)}
                            className={`flex items-center gap-4 w-full text-left bg-gradient-to-r ${portal.color} transition-all duration-300 p-4 rounded-2xl text-white shadow-md hover:shadow-lg font-semibold hover:-translate-y-0.5`}
                          >
                            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
                              <Icon name={portal.icon} className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate leading-tight">{portal.label}</p>
                              <p className="text-[10px] text-white/80 truncate leading-none mt-0.5">Módulo de {portal.modulo.toLowerCase()}</p>
                            </div>
                            <LucideIcons.ArrowRight className="h-4 w-4 text-white/80 shrink-0" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 font-medium text-xs">
                        No tienes ningún módulo asignado en la base de datos.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL PERFIL USUARIO */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowProfileModal(false)}
          />
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 relative z-10 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-50"
            >
              <LucideIcons.X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="h-20 w-20 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-3xl mx-auto shadow-lg shadow-indigo-100 mb-4">
                {initials}
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {user?.nombre_completo || "Usuario"}
              </h3>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mt-0.5">
                {user?.cargo_nombre || "Miembro"}
              </p>
            </div>

            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200/50">
                <span className="font-semibold text-slate-400 uppercase tracking-tight">Usuario</span>
                <span className="font-bold text-slate-700">{user?.usuario || "-"}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200/50">
                <span className="font-semibold text-slate-400 uppercase tracking-tight">Correo</span>
                <span className="font-bold text-slate-700">{user?.correo || "-"}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200/50">
                <span className="font-semibold text-slate-400 uppercase tracking-tight">DNI / Doc</span>
                <span className="font-bold text-slate-700">{user?.dni || "-"}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="font-semibold text-slate-400 uppercase tracking-tight">Área</span>
                <span className="font-bold text-slate-700">{user?.area_nombre || "-"}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-100"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAMBIAR CONTRASEÑA */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => {
              if (!isChangingPassword) {
                setShowPasswordModal(false);
                setPasswordError("");
              }
            }}
          />
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 relative z-10 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                if (!isChangingPassword) {
                  setShowPasswordModal(false);
                  setPasswordError("");
                }
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-50"
            >
              <LucideIcons.X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <LucideIcons.KeyRound className="w-5 h-5 text-indigo-600" />
                Cambiar Contraseña
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa tus credenciales para actualizar tu contraseña de acceso.
              </p>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium text-slate-700 bg-slate-50/50"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium text-slate-700 bg-slate-50/50"
                  placeholder="Mínimo 4 caracteres"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium text-slate-700 bg-slate-50/50"
                  placeholder="Repite la nueva contraseña"
                />
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError("");
                  }}
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  {isChangingPassword ? (
                    <>
                      <LucideIcons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

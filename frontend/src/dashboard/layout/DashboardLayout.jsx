import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import logo from "@/assets/logo.png";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const Icon = ({ name, className }) => {
  const LucideIcon = LucideIcons[name] || LucideIcons.HelpCircle;
  return <LucideIcon className={className} />;
};

const NAV_ITEMS = [
  { path: "/sigecom/home", label: "Dashboard", icon: "LayoutDashboard" },
  { path: "/sigecom/comercial", label: "Comercial", icon: "FileText" },
  {
    path: "/sigecom/logistica",
    label: "Logística",
    icon: "ClipboardList",
    subItems: [
      { path: "/sigecom/logistica/tablas", label: "Tablas" }
    ]
  },
  { path: "/sigecom/proyectos", label: "Proyectos", icon: "Briefcase" },
  { path: "/sigecom/compras", label: "Compras", icon: "ShoppingCart" },
  { path: "/sigecom/almacen", label: "Almacén", icon: "Package" },
  { path: "/sigecom/finanzas", label: "Finanzas", icon: "DollarSign" },
  { path: "/sigecom/maestro/catalogo", label: "Maestro", icon: "Database" },
  { path: "/sigecom/audit", label: "Auditoría", icon: "ShieldCheck" },
];

export default function DashboardLayout() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { authUser: user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [breadcrumbOverride, setBreadcrumbOverride] = useState(null);
  const [openMenus, setOpenMenus] = useState({});

  useEffect(() => {
    // Clear override whenever location changes
    setBreadcrumbOverride(null);
  }, [location.pathname]);

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
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Auto-open menus that contain the current path
    const activeMenus = {};
    NAV_ITEMS.forEach(item => {
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

      {/* Sidebar */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-40 flex flex-col h-full bg-white border-r border-gray-200 shrink-0 transition-all duration-300 
          ${isMobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0"}
          ${isExpanded ? "md:w-60" : "md:w-20"}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center overflow-hidden">
            <img src={logo} alt="Logo" className="h-12 w-12 object-contain shrink-0" />
            {isExpanded && (
              <span className="text-[14.5px] font-bold text-gray-900 ml-2 whitespace-nowrap">
                SIGECOM 5.0
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            {isExpanded ? (
              <LucideIcons.PanelLeftClose className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
            ) : (
              <LucideIcons.PanelLeftOpen className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
            )}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
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
                        className={`flex-1 flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                          isActive
                            ? "bg-indigo-50 text-indigo-600 shadow-sm"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        } ${isExpanded ? "" : "justify-center"}`}
                      >
                        <Icon
                          name={item.icon}
                          className={`h-5 w-5 ${isExpanded ? "mr-3" : ""} ${
                            isActive ? "text-indigo-600" : "text-gray-400"
                          }`}
                        />
                        {isExpanded && <span className="truncate">{item.label}</span>}
                      </NavLink>

                      {/* Flecha colapsable independiente si está expandido el sidebar */}
                      {isExpanded && (
                        <button
                          type="button"
                          onClick={handleParentClick}
                          className={`p-2.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors ml-1`}
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
                      <div className="mt-1 ml-5 pl-5 border-l border-gray-200 space-y-1 py-0.5 animate-in slide-in-from-top-1 duration-200">
                        {item.subItems.map((sub) => {
                          const isSubActive = location.pathname.startsWith(sub.path);
                          return (
                            <NavLink
                              key={sub.path}
                              to={sub.path}
                              className={`block px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                isSubActive
                                  ? "bg-indigo-50 text-indigo-600 shadow-sm font-bold"
                                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
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
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    } ${isExpanded ? "" : "justify-center"}`}
                  >
                    <Icon
                      name={item.icon}
                      className={`h-5 w-5 ${isExpanded ? "mr-3" : ""} ${
                        isActive ? "text-indigo-600" : "text-gray-400"
                      }`}
                    />
                    {isExpanded && <span className="truncate">{item.label}</span>}
                  </NavLink>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex-shrink-0 flex border-t border-gray-200 p-4 bg-gray-50/50">
          <div className="flex items-center w-full min-w-0">
            <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user?.usuario?.substring(0, 2).toUpperCase() || "US"}
            </div>
            {isExpanded && (
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-700 truncate">
                  {user?.usuario || "Usuario"}
                </p>
                <button
                  onClick={handleLogout}
                  className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
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
                  <NavLink to="/sigecom/home" className="hover:text-indigo-600 transition-colors">
                    <LucideIcons.Home className="h-4 w-4" />
                  </NavLink>
                </li>
                {breadcrumbs.slice(1).map((crumb) => (
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
                ))}
              </ol>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Dynamic icons or actions could go here */}
            <div className="h-8 w-px bg-gray-200" />
            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-all">
              <LucideIcons.Bell className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-all">
              <LucideIcons.Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50/50">
          <div className="w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

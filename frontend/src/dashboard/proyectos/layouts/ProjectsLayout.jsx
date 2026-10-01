import { useNavigate, Outlet, NavLink } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { proyectosService } from "../api";
import { BarChart3, ClipboardCheck, FolderKanban, Gauge, ShieldAlert } from "lucide-react";
import "./ProjectsLayout.css";
import { matchesSearch } from "../../../utils/search";
import { CorporateTopbarActions } from "../../../components/CorporateTopbarActions";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [projectPicker, setProjectPicker] = useState({ open: false, tab: null, label: "" });
  const [projects, setProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  const pickerTriggerRef = useRef(null);
  const projectSearchRef = useRef(null);

  const projectMenuItems = [
    { label: "Panel General", path: "/proyectos/mis-proyectos" },
    { label: "Cronograma", requiresProject: true, tab: "Tiempo" },
    { label: "Costos", requiresProject: true, tab: "Costos" },
    { label: "Recursos", requiresProject: true, tab: "Recursos" },
    { label: "Estado de Avance", requiresProject: true, tab: "Informes" },
  ];

  const menu = [
    { label: "Dashboard principal", path: "/proyectos/home", icon: Gauge },
    { label: "Mis proyectos", path: "/proyectos/mis-proyectos", icon: FolderKanban },
    {
      label: "Evaluaciones estratégicas",
      icon: ClipboardCheck,
      path: "/proyectos/evaluaciones",
      sub: [
        { label: "Nueva Evaluación", path: "/proyectos/evaluaciones/nueva" },
        { label: "Historial", path: "/proyectos/evaluaciones/historial" },
        { label: "Escenarios", path: "/proyectos/evaluaciones/escenarios" },
      ],
    },
    {
      label: "Gestión de riesgos",
      icon: ShieldAlert,
      path: "/proyectos/riesgos",
      sub: [
        { label: "Registrar Riesgos", path: "/proyectos/riesgos/registrar" },
        { label: "Análisis de Impacto", path: "/proyectos/riesgos/impacto" },
      ],
    },
    {
      label: "Reportes ejecutivos",
      icon: BarChart3,
      path: "/proyectos/reportes",
      sub: [
        { label: "Por Proyecto", path: "/proyectos/reportes/proyecto" },
        { label: "Comparativo", path: "/proyectos/reportes/comparativo" },
        { label: "Generar PDF/Word", path: "/proyectos/reportes/exportar" },
      ],
    },
  ];

  const ensureProjectsLoaded = useCallback(async () => {
    if (projects.length || projectsLoading) return;
    try {
      setProjectsLoading(true);
      const response = await proyectosService.listar();
      setProjects(response.data || []);
      setProjectsError(null);
    } catch (error) {
      setProjectsError("No se pudieron cargar los proyectos");
    } finally {
      setProjectsLoading(false);
    }
  }, [projects.length, projectsLoading]);

  const openProjectShortcut = async (tab, label) => {
    pickerTriggerRef.current = document.activeElement;
    await ensureProjectsLoaded();
    setProjectPicker({ open: true, tab, label });
    setProjectSearch("");
  };

  const closeProjectPicker = useCallback(() => {
    setProjectPicker({ open: false, tab: null, label: "" });
    requestAnimationFrame(() => pickerTriggerRef.current?.focus?.());
  }, []);

  useEffect(() => {
    if (!projectPicker.open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => projectSearchRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeProjectPicker();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeProjectPicker, projectPicker.open]);

  const handleSelectProject = (projectId) => {
    if (!projectId || !projectPicker.tab) return;
    const tab = projectPicker.tab;
    setProjectPicker({ open: false, tab: null, label: "" });
    navigate(`/proyectos/mis-proyectos/${projectId}?tab=${tab}`);
  };

  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    return projects.filter((p) => matchesSearch(
      projectSearch, p.codigo, p.nombre, p.responsable, p.cliente,
    ));
  }, [projectSearch, projects]);

  const toggleButton = (
    <button
      type="button"
      onClick={() => setSidebarVisible((prev) => !prev)}
      className="fixed top-4 z-50 text-teal-700 hover:text-teal-900 transition flex items-center justify-center w-9 h-9 rounded-full bg-white shadow border border-gray-200"
      style={{ left: sidebarVisible ? "260px" : "16px" }}
    >
      <span aria-hidden="true">{sidebarVisible ? "◀" : "▶"}</span>
      <span className="sr-only">{sidebarVisible ? "Ocultar menú" : "Mostrar menú"}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {toggleButton}

      {sidebarVisible && (
        <aside className="project-sidebar w-64 p-3 overflow-y-auto">
          <div className="project-brand flex flex-col mb-4">
            <NavLink to="/proyectos/home">
              <img src="/vc-corporation-logo.png" alt="V&C Corporation" className="cursor-pointer" />
            </NavLink>
            <div className="project-module-title"><FolderKanban size={20}/><div><strong>Gestión de Proyectos</strong><span>Módulo corporativo</span></div></div>
          </div>
          <nav className="project-nav space-y-2">
            {menu.map((item) => (
              <div key={item.label}>
                {item.sub ? (
                  <>
                    <div className="project-nav-heading">{item.icon && <item.icon size={18}/>}<span>{item.label}</span></div>
                    <ul className="project-subnav space-y-1">
                      {item.sub.map((subitem, index) => (
                        <li key={subitem.path || `${subitem.label}-${index}`}>
                          {subitem.requiresProject ? (
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={() => openProjectShortcut(subitem.tab, subitem.label)}
                            >
                              {subitem.label}
                            </button>
                          ) : (
                            <NavLink
                              to={subitem.path}
                              className={({ isActive }) =>
                                isActive ? "active" : ""
                              }
                            >
                              {subitem.label}
                            </NavLink>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      isActive ? "project-nav-link active" : "project-nav-link"
                    }
                  >
                    {item.icon && <item.icon size={18}/>}<span>{item.label}</span>
                  </NavLink>
                )}
              </div>
            ))}
          </nav>
        </aside>
      )}

      <main className="project-main flex-1 bg-white overflow-y-auto">
        <header className="project-topbar">
          <div><strong>Sistema Integrado de Gestión</strong><span>Gestión de Proyectos</span></div>
          <CorporateTopbarActions profileLabel="Gestión de Proyectos"/>
        </header>
        <div className="project-content"><Outlet /></div>
      </main>

      {projectPicker.open && (
        <div className="project-picker-overlay">
          <div className="project-picker-card">
            <div className="project-picker-header">
              <div className="project-picker-heading">
                <p>Selecciona el proyecto</p>
                <h3>{projectPicker.label}</h3>
              </div>
              <button
                type="button"
                onClick={closeProjectPicker}
                className="project-picker-close"
              >
                Cerrar ✕
              </button>
            </div>
            <div className="project-picker-filter">
              <p>Elige el proyecto que deseas abrir en la vista {projectPicker.tab}.</p>
              <label htmlFor="project-search" className="sr-only">Buscar proyecto</label>
              <input
                ref={projectSearchRef}
                id="project-search"
                type="search"
                className="corporate-search-input project-picker-search"
                placeholder="Buscar por código, nombre, cliente o líder..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                list="project-suggestions"
              />
              <datalist id="project-suggestions">
                {projects.map((p) => (
                  <option key={`sug-modal-${p.id}`} value={`${p.codigo} - ${p.nombre}`}>
                    {p.responsable || ""}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="project-picker-results">
              {projectsLoading ? (
                <div className="p-6 text-center text-gray-600">Cargando proyectos...</div>
              ) : projectsError ? (
                <div className="p-6 text-center text-red-600">{projectsError}</div>
              ) : filteredProjects.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No hay proyectos disponibles.</div>
              ) : (
                <ul className="project-picker-list">
                  {filteredProjects.map((proyecto) => (
                    <li key={proyecto.id} className="project-picker-item">
                      <button
                        type="button"
                        onClick={() => handleSelectProject(proyecto.id)}
                        className="project-picker-option"
                      >
                        <span className="project-picker-code">{proyecto.codigo}</span>
                        <span className="project-picker-name">{proyecto.nombre}</span>
                        <span className="project-picker-meta">
                          Cliente: {proyecto.cliente || "Interno"} · Estado: {proyecto.estado}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;



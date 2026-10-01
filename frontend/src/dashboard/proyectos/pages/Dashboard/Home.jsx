import React, { useState, useEffect, useMemo, useCallback } from "react";




import ReactECharts from "echarts-for-react";




import { useNavigate } from "react-router-dom";




import { proyectosService, tareasService } from "../../api";




import "./Home.css";
import { matchesSearch } from "../../../../utils/search";









const ESTADOS = [




  "Apertura",




  "Inicio",




  "Planificacion",




  "Ejecucion",




  "Cierre",




  "Cerrado",




  "Pausado",




];









const FAVORITES_KEY = "pm.dashboard.favoritos";




const MAX_PINNED = 10;




const MS_DAY = 1000 * 60 * 60 * 24;




const SEVERITY_WEIGHT = { alto: 3, medio: 2, bajo: 1 };




const ALERT_DESTINOS = {




  cronograma: "Tiempo",




  costos: "Costos",




  recursos: "Recursos",




  riesgos: "Riesgos",




  cierre: "Resumen",




};









const readFavoritos = () => {




  try {




    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");




  } catch (err) {




    console.warn("No se pudo leer favoritos", err);




    return [];




  }




};









const normalizeEstado = (value = "") =>




  value




    .normalize("NFD")




    .replace(/[\u0300-\u036f]/g, "")




    .toLowerCase();









const canonizarEstado = (value = "") => {



  const key = normalizeEstado(value);




  if (key === "apertura") return "Apertura";




  if (key === "inicio") return "Inicio";




  if (key === "planificacion") return "Planificacion";




  if (key === "ejecucion") return "Ejecucion";




  if (key === "cierre") return "Cierre";




  if (key === "cerrado") return "Cerrado";




  if (key === "pausado") return "Pausado";




  return "Ejecucion";




};







const normalizeText = (value = "") =>



  value



    .toString()



    .normalize("NFD")



    .replace(/[\u0300-\u036f]/g, "")



    .toLowerCase()



    .replace(/[^a-z0-9]+/g, " ")



    .trim()



    .replace(/\s+/g, " ");








const fmtMoney = (value, currency = "USD") =>




  isNaN(value)




    ? "-"




    : new Intl.NumberFormat(currency === "USD" ? "en-US" : "es-PE", {




        style: "currency",




        currency,




        maximumFractionDigits: 0,




      }).format(Number(value || 0));









const DEFAULT_TIMEZONE = "America/Lima";




const readUserTimezone = () => {




  if (typeof window === "undefined") return DEFAULT_TIMEZONE;




  try {




    const data = JSON.parse(localStorage.getItem("usuario_pm") || "{}");




    return data?.timezone || DEFAULT_TIMEZONE;




  } catch (err) {




    return DEFAULT_TIMEZONE;




  }




};




const USER_TIMEZONE = readUserTimezone();









const getNowUserTZ = () => {




  if (typeof window === "undefined") return new Date();




  return new Date(new Date().toLocaleString("en-US", { timeZone: USER_TIMEZONE }));




};









const parseUserDate = (value) => {




  if (!value) return null;




  if (typeof value === "string") {




    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);




    if (match) {




      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));




    }




  }




  const date = new Date(value);




  return Number.isNaN(date.getTime()) ? null : date;




};









const calcularAvance = (fechaInicio, fechaFin) => {




  if (!fechaInicio || !fechaFin) return 0;




  const inicio = parseUserDate(fechaInicio);




  const fin = parseUserDate(fechaFin);




  const hoy = getNowUserTZ();




  if (hoy < inicio) return 0;




  if (hoy > fin) return 100;




  const total = fin - inicio;




  const transcurrido = hoy - inicio;




  return Math.min(100, Math.max(0, Math.round((transcurrido / total) * 100)));




};









const calcularSPI = (ev, pv) => {




  if (!pv) return null;




  return (ev / pv).toFixed(2);




};









const calcularCPI = (ev, ac) => {




  if (!ac) return null;




  return (ev / ac).toFixed(2);




};









const diasHasta = (fechaFin) => {




  if (!fechaFin) return null;




  const fin = parseUserDate(fechaFin);




  if (!fin) return null;




  return Math.round((fin - getNowUserTZ()) / MS_DAY);




};









const renderPieChart = (percentage = 0) => ({




  series: [




    {




      type: "pie",




      radius: ["70%", "100%"],




      label: {




        show: true,




        position: "center",




        formatter: `${percentage}%`,




        fontSize: 14,




        fontWeight: "bold",




        color: "#111827",




      },




      labelLine: { show: false },




      data: [




        {




          value: percentage,




          itemStyle: {




            color: percentage >= 80 ? "#22c55e" : percentage >= 50 ? "#facc15" : "#ef4444",




          },




        },




        { value: 100 - percentage, itemStyle: { color: "#e5e7eb" } },




      ],




    },




  ],




});









const crearAlerta = (proyecto, alerta) => ({




  ...alerta,




  proyectoId: proyecto.id,




  proyectoCodigo: proyecto.codigo,




  proyectoNombre: proyecto.nombre,




  path: `/proyectos/mis-proyectos/${proyecto.id}?tab=${ALERT_DESTINOS[alerta.tipo] || "Resumen"}`,




});









const evaluarProyecto = (proyecto, avanceProgramado) => {




  const alertas = [];




  const diasRestantes = diasHasta(proyecto.fecha_fin);




  const avanceFinanciero = proyecto.presupuestoTotal > 0




    ? Math.round((proyecto.ev / proyecto.presupuestoTotal) * 100)




    : avanceProgramado;









  if (proyecto.spi && proyecto.spi < 0.95) {




    alertas.push(




      crearAlerta(proyecto, {




        tipo: "cronograma",




        severidad: proyecto.spi < 0.9 ? "alto" : "medio",




        mensaje: `SPI ${proyecto.spi} refleja retraso`,




        detalle: "El rendimiento del cronograma esta por debajo del plan.",




      })




    );




  }









  if (proyecto.cpi && proyecto.cpi < 0.95) {




    alertas.push(




      crearAlerta(proyecto, {




        tipo: "costos",




        severidad: proyecto.cpi < 0.85 ? "alto" : "medio",




        mensaje: `CPI ${proyecto.cpi} refleja sobrecosto`,




        detalle: "El costo real supera al valor ganado.",




      })




    );




  }









  if (avanceFinanciero >= 85) {




    alertas.push(




      crearAlerta(proyecto, {




        tipo: "recursos",




        severidad: "medio",




        mensaje: `${avanceFinanciero}% del presupuesto comprometido`,




        detalle: "Revisar disponibilidad de HH y costos.",




      })




    );




  }









  return { alertas, avanceFinanciero, diasRestantes };




};









const ordenarAlertas = (alertas) =>




  [...alertas].sort((a, b) => SEVERITY_WEIGHT[b.severidad] - SEVERITY_WEIGHT[a.severidad]);









const formatDate = (value) => {




  if (!value) return "--";




  const date = parseUserDate(value);




  if (!date) return "--";




  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: USER_TIMEZONE });




};









const timelinePercent = (proyecto) => {




  if (!proyecto.fecha_inicio || !proyecto.fecha_fin) return 0;




  const inicio = parseUserDate(proyecto.fecha_inicio);




  const fin = parseUserDate(proyecto.fecha_fin);




  if (!inicio || !fin) return 0;




  const hoy = getNowUserTZ();




  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) return 0;




  const transcurrido = Math.min(Math.max(hoy - inicio, 0), fin - inicio);




  return Math.round((transcurrido / (fin - inicio)) * 100);




};









const avatarPalette = ["#fde68a", "#bfdbfe", "#c4b5fd", "#fecdd3", "#bbf7d0", "#fed7aa", "#d9f99d"];




const getInitials = (name = "Sin Responsable") =>




  name




    .split(" ")




    .filter(Boolean)




    .slice(0, 2)




    .map((chunk) => chunk[0]?.toUpperCase() || "")




    .join("") || "SR";




const getAvatarColor = (name = "") => {




  const code = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);




  return avatarPalette[code % avatarPalette.length];




};









const indicadorClass = (indicador) => {




  if (indicador === "ok") return "chip chip--green";




  if (indicador === "warn") return "chip chip--yellow";




  return "chip chip--red";




};









const AlertIcon = ({ color = "#dc2626", size = 18 }) => (




  <svg




    width={size}




    height={size}




    viewBox="0 0 24 24"




    fill="none"




    stroke={color}




    strokeWidth="1.8"




    strokeLinecap="round"




    strokeLinejoin="round"




    aria-hidden="true"




  >




    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />




    <path d="M13.73 21a2 2 0 0 1-3.46 0" />




  </svg>




);









const NotificationButton = ({ count, onClick }) => (




  <button className="notifications-bell" onClick={onClick} type="button" aria-label="Ver alertas">




    <AlertIcon color="#dc2626" size={18} />




    {count > 0 && <span className="bell-badge">{count}</span>}




  </button>




);









const Modal = ({ open, title, onClose, children }) => {




  if (!open) return null;




  return (




    <div className="modal-overlay">




      <div className="modal-card">




        <div className="modal-header">




          <h3>{title}</h3>




          <button type="button" onClick={onClose} aria-label="Cerrar modal">




            &times;




          </button>




        </div>




        <div className="modal-body">{children}</div>




      </div>




    </div>




  );




};









export default function Home() {




  const navigate = useNavigate();




  const [proyectos, setProyectos] = useState([]);




  const [loading, setLoading] = useState(true);




  const [error, setError] = useState(null);




  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);




  const [curvasData, setCurvasData] = useState([]);




  const [loadingCurvas, setLoadingCurvas] = useState(false);




  const [favoritos, setFavoritos] = useState(() => readFavoritos());




  const [tareas, setTareas] = useState([]);



  const [tareasError, setTareasError] = useState(null);



  const [showAlertasModal, setShowAlertasModal] = useState(false);



  const [proyectoAlertas, setProyectoAlertas] = useState(null);



  const [responsableSeleccionado, setResponsableSeleccionado] = useState(null);



  const [fullscreenPanel, setFullscreenPanel] = useState(null);



  const [busquedaMonitoreados, setBusquedaMonitoreados] = useState("");



  const [viewportHeight, setViewportHeight] = useState(



    typeof window !== "undefined" ? window.innerHeight : 900



  );







  const isFullscreen = useCallback((panelId) => fullscreenPanel === panelId, [fullscreenPanel]);







  const getChartHeight = useCallback(



    (panelId, baseHeight = 280, offset = 200) => {



      if (!isFullscreen(panelId)) return `${baseHeight}px`;



      return `${Math.max(viewportHeight - offset, baseHeight)}px`;



    },



    [isFullscreen, viewportHeight]



  );








  useEffect(() => {




    const handleStorage = (event) => {




      if (event.key === FAVORITES_KEY) {




        try {




          setFavoritos(JSON.parse(event.newValue || "[]"));




        } catch (err) {




          console.warn("No se pudo sincronizar favoritos", err);




        }




      }




    };









    const handleCustom = (event) => {




      if (Array.isArray(event.detail)) {




        setFavoritos(event.detail);




      } else {




        setFavoritos(readFavoritos());




      }




    };









    window.addEventListener("storage", handleStorage);




    window.addEventListener("pm:favoritos-update", handleCustom);




    return () => {




      window.removeEventListener("storage", handleStorage);




      window.removeEventListener("pm:favoritos-update", handleCustom);




    };




  }, []);









  useEffect(() => {




    const cargarProyectos = async () => {




      setLoading(true);




      try {




        const response = await proyectosService.listar();




        const proyectosConMetricas = response.data.map((p) => {




          const presupuestoTotal =




            Number(p.presupuesto_gastos || 0) +




            Number(p.presupuesto_hh || 0) +




            Number(p.presupuesto_contingencia || 0) +




            Number(p.presupuesto_utilidad || 0);









          const ac = Number(p.gasto_real || 0) + Number(p.costo_hh_real || 0);




          const avance = calcularAvance(p.fecha_inicio, p.fecha_fin);




          const pv = (presupuestoTotal * avance) / 100;




          const ev = ac > 0 ? (presupuestoTotal * avance) / 100 : pv;




          const spi = calcularSPI(ev, pv);




          const cpi = calcularCPI(ev, ac);









          const evaluacion = evaluarProyecto(




            {




              ...p,




              presupuestoTotal,




              ac,




              ev,




              spi: spi ? Number(spi) : null,




              cpi: cpi ? Number(cpi) : null,




            },




            avance




          );









          const riesgoLabel = evaluacion.alertas.some((a) => a.severidad === "alto")




            ? "Critico"




            : evaluacion.alertas.length




            ? "Atencion"




            : "Sin alertas";









          return {




            ...p,




            avance,




            ac,




            pv,




            ev,




            spi,




            cpi,




            presupuestoTotal,




            alertas: evaluacion.alertas,




            riesgo: riesgoLabel,




            avanceFinanciero: evaluacion.avanceFinanciero,




            diasRestantes: evaluacion.diasRestantes,




          };




        });









        setProyectos(proyectosConMetricas);




        if (proyectosConMetricas.length > 0) {




          setProyectoSeleccionado(proyectosConMetricas[0].codigo);




        }




        setError(null);




      } catch (err) {




        console.error("Error cargando proyectos:", err);




        setError("Error al cargar proyectos: " + (err.response?.data?.error || err.message));




      } finally {




        setLoading(false);




      }




    };









    cargarProyectos();




  }, []);









  useEffect(() => {




    const cargarTareas = async () => {




      try {




        const response = await tareasService.listar();




        const dataTareas = response?.data;




        setTareas(Array.isArray(dataTareas) ? dataTareas : (Array.isArray(dataTareas?.results) ? dataTareas.results : []));




        setTareasError(null);




      } catch (err) {




        setTareasError("No se pudieron cargar las tareas del equipo.");




      }




    };




    cargarTareas();




  }, []);









  useEffect(() => {




    if (!proyectoSeleccionado) {




      setCurvasData([]);




      return;




    }









    const cargarCurvas = async () => {




      setLoadingCurvas(true);




      try {




        const proyecto = proyectos.find((p) => p.codigo === proyectoSeleccionado);




        if (proyecto) {




          const response = await proyectosService.obtenerCurvas(proyecto.id);




          setCurvasData(response.data);




        }




      } catch (err) {




        console.error("Error cargando curvas:", err);




        setCurvasData([]);




      } finally {




        setLoadingCurvas(false);




      }




    };









    cargarCurvas();




  }, [proyectoSeleccionado, proyectos]);









  const proyectosFavoritos = useMemo(




    () => proyectos.filter((p) => favoritos.includes(p.id)).slice(0, MAX_PINNED),




    [proyectos, favoritos]




  );









  const alertasGlobales = useMemo(




    () => ordenarAlertas(proyectos.flatMap((p) => p.alertas || [])),




    [proyectos]




  );









  const proyectosEnRiesgo = useMemo(




    () => proyectos.filter((p) => p.alertas.length > 0),




    [proyectos]




  );









  const estadosChart = useMemo(() => {




    const conteo = ESTADOS.map((estado) => ({




      estado,




      count: proyectos.filter((p) => canonizarEstado(p.estado) === estado).length,




    }));




    return {




      tooltip: { trigger: "axis" },




      xAxis: { type: "category", data: ESTADOS, axisLabel: { rotate: 30, fontSize: 10 } },




      yAxis: { type: "value", name: "Proyectos" },




      series: [




        {




          type: "bar",




          data: conteo.map((c) => c.count),




          itemStyle: {




            color: (params) => {




              const colors = ["#93c5fd", "#86efac", "#fde68a", "#4ade80", "#d1d5db", "#9ca3af", "#fdba74"];




              return colors[params.dataIndex] || "#60a5fa";




            },




          },




        },




      ],




    };




  }, [proyectos]);









  const curvaSChart = useMemo(() => {




    if (!curvasData || curvasData.length === 0) {




      return {




        title: { text: "Sin datos de curva S", left: "center", top: "middle" },




        xAxis: { type: "category", data: [] },




        yAxis: { type: "value" },




        series: [],




      };




    }




    const hoy = getNowUserTZ();




    const normalizados = curvasData




      .map((c) => ({




        ...c,




        fecha: parseUserDate(c.fecha) || hoy,




      }))




      .sort((a, b) => a.fecha - b.fecha);




    let data = normalizados.filter((c) => c.fecha <= hoy);




    if (data.length === 0) {




      data = [normalizados[0]];




    }




    const ultimaFecha = data[data.length - 1].fecha;




    if (ultimaFecha < hoy) {




      const ultimo = data[data.length - 1];




      data = [




        ...data,




        {




          ...ultimo,




          fecha: hoy,




        },




      ];




    }




    const fechas = data.map((c) =>




      c.fecha.toLocaleDateString("es-PE", {




        day: "2-digit",




        month: "short",




        timeZone: USER_TIMEZONE,




      })




    );




    const hoyLabel = hoy.toLocaleDateString("es-PE", {




      day: "2-digit",




      month: "short",




      timeZone: USER_TIMEZONE,




    });




    const marcaHoy = {




      symbol: "none",




      data: [{ xAxis: hoyLabel }],




      lineStyle: { color: "#ef4444", type: "dashed", width: 2 },




      label: { formatter: "Hoy", color: "#ef4444", position: "end" },




    };




    return {




      tooltip: { trigger: "axis" },




      legend: { data: ["PV", "EV", "AC"], top: 0 },




      xAxis: { type: "category", data: fechas },




      yAxis: {




        type: "value",




        axisLabel: {




          formatter: (value) => {




            if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";




            if (value >= 1000) return (value / 1000).toFixed(0) + "K";




            return value;




          },




        },




      },




      series: [




        {




          name: "PV",




          type: "line",




          data: data.map((c) => c.pv),




          smooth: true,




          lineStyle: { width: 3, color: "#3b82f6" },




          markLine: marcaHoy,




        },




        { name: "EV", type: "line", data: data.map((c) => c.ev), smooth: true, lineStyle: { width: 3, color: "#22c55e" } },




        { name: "AC", type: "line", data: data.map((c) => c.ac), smooth: true, lineStyle: { width: 3, color: "#ef4444" } },




      ],




    };




  }, [curvasData]);









  const proyectosPorId = useMemo(() => {



    const map = {};



    proyectos.forEach((p) => {



      map[p.id] = p;



    });



    return map;



  }, [proyectos]);







  const proyectosMonitoreados = useMemo(() => {



    if (!busquedaMonitoreados) return proyectosFavoritos;



    return proyectosFavoritos.filter((p) => matchesSearch(
      busquedaMonitoreados, p.codigo, p.nombre, p.cliente, p.responsable,
    ));



  }, [busquedaMonitoreados, proyectosFavoritos]);








  useEffect(() => {



    const previousOverflow = document.body.style.overflow;



    if (fullscreenPanel) {



      document.body.style.overflow = "hidden";



    } else {



      document.body.style.overflow = previousOverflow || "";




    }




    return () => {




      document.body.style.overflow = previousOverflow || "";




    };




  }, [fullscreenPanel]);









  useEffect(() => {



    const handleResize = () => setViewportHeight(window.innerHeight);



    window.addEventListener("resize", handleResize);



    return () => window.removeEventListener("resize", handleResize);



  }, []);







  const toggleFullscreen = useCallback((panelId) => {



    setFullscreenPanel((prev) => (prev === panelId ? null : panelId));



  }, []);







  const getScrollableProps = useCallback(



    (panelId, offset = 120, minHeight = 300) => {



      if (!isFullscreen(panelId)) return {};



      const height = Math.max(viewportHeight - offset, minHeight);



      return { style: { maxHeight: `${height}px`, overflowY: "auto" } };



    },



    [isFullscreen, viewportHeight]



  );











  useEffect(() => {



    const handleKeyDown = (event) => {



      if (event.key === "Escape") {



        setFullscreenPanel(null);



      }



    };



    window.addEventListener("keydown", handleKeyDown);



    return () => {



      window.removeEventListener("keydown", handleKeyDown);



    };



  }, []);








  const responsablesMonitoreados = useMemo(() => {




    if (!Array.isArray(tareas) || tareas.length === 0) return [];




    const grouped = tareas.reduce((acc, tarea) => {




      const responsable = tarea.responsable || "Sin responsable";




      if (!acc[responsable]) {




        acc[responsable] = {




          responsable,




          area: tarea.area || tarea.rol || "Operaciones",




          tareas: [],




          avatarInitials: getInitials(responsable),




          avatarColor: getAvatarColor(responsable),




        };




      }




      const proyecto = proyectosPorId[tarea.proyecto];




      const dueDate = tarea.fecha_fin ? parseUserDate(tarea.fecha_fin) : null;




      const vencida =




        dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < getNowUserTZ() && tarea.estado !== "finalizada";




      acc[responsable].tareas.push({




        ...tarea,




        proyectoCodigo: proyecto?.codigo || "--",




        proyectoNombre: proyecto?.nombre || "--",




        vencida,




      });




      return acc;




    }, {});









    return Object.values(grouped)




      .map((item) => {




        const total = item.tareas.length;




        const retrasadas = item.tareas.filter((t) => t.vencida || t.estado === "atrasada").length;




        const enFecha = item.tareas.filter((t) => !t.vencida && t.estado !== "atrasada").length;




        const indicador = retrasadas === 0 ? "ok" : retrasadas <= total * 0.3 ? "warn" : "risk";




        return { ...item, total, retrasadas, enFecha, indicador };




      })




      .sort((a, b) => b.retrasadas - a.retrasadas || b.total - a.total);




  }, [tareas, proyectosPorId]);









  const tareasResponsableSeleccionado = useMemo(() => {




    if (!responsableSeleccionado) return [];




    const registro = responsablesMonitoreados.find((r) => r.responsable === responsableSeleccionado);




    return registro ? registro.tareas : [];




  }, [responsablesMonitoreados, responsableSeleccionado]);









  const renderProyectoCard = useCallback(




    (proyecto) => {




      const alertaPrincipal = proyecto.alertas[0];




      const alertCount = proyecto.alertas?.length || 0;




      const timeline = timelinePercent(proyecto);




      const esFavorito = favoritos.includes(proyecto.id);




      const diasTooltip =




        proyecto.diasRestantes !== null ? `${proyecto.diasRestantes} dias restantes` : "Sin informacion de dias";









      return (




        <div key={proyecto.id} className={`project-card ${esFavorito ? "project-card--pinned" : ""}`}>




          <div className="project-card__top">




            <div>




              <p className="project-card__code">{proyecto.codigo}</p>




              <h3 className="project-card__name">{proyecto.nombre}</h3>




            </div>




            <button




              type="button"




              className={`alert-indicator ${alertCount ? "alert-indicator--active" : ""}`}




              onClick={() => alertCount > 0 && setProyectoAlertas(proyecto)}




              disabled={!alertCount}




              aria-label={alertCount ? `Ver ${alertCount} alertas del proyecto` : "Proyecto sin alertas"}




            >




              <AlertIcon color={alertCount ? "#dc2626" : "#94a3b8"} size={14} />




              {alertCount > 0 && <span className="alert-indicator__badge">{alertCount}</span>}




            </button>




          </div>









          <div className="project-card__body">




            <div className="project-card__chart">




              <p className="project-card__chart-title">% de avance</p>




              <div className="project-card__chart-visual">




                <ReactECharts option={renderPieChart(proyecto.avance || 0)} style={{ height: 140, width: 140 }} />




              </div>




            </div>




            <div className="project-card__metrics">




              <div className="metric-row">




                <span>SPI</span>




                <strong className={proyecto.spi >= 1 ? "text-success" : proyecto.spi ? "text-danger" : "text-muted"}>




                  {proyecto.spi ?? "-"}




                </strong>




              </div>




              <div className="metric-row">




                <span>CPI</span>




                <strong className={proyecto.cpi >= 1 ? "text-success" : proyecto.cpi ? "text-danger" : "text-muted"}>




                  {proyecto.cpi ?? "-"}




                </strong>




              </div>




            </div>




          </div>









          <div className="project-card__timeline">




            <div className="timeline-bar" title={diasTooltip}>




              <div className="timeline-bar__fill" style={{ width: `${timeline}%` }} />




            </div>




            <div className="timeline-labels">




              <span>{formatDate(proyecto.fecha_inicio)}</span>




              <span>{formatDate(proyecto.fecha_fin)}</span>




            </div>




          </div>









          <div className={`alert-pill ${alertaPrincipal ? alertaPrincipal.severidad : "ok"}`}>




            {alertaPrincipal ? alertaPrincipal.mensaje : "Sin alertas predictivas"}




          </div>









          <div className="project-card__footer project-card__footer--justified">




            <button




              type="button"




              className="btn-link"




              onClick={() => navigate(`/proyectos/mis-proyectos/${proyecto.id}`)}




            >




              Ver detalle




            </button>




            <span className="project-card__owner">{proyecto.responsable || "Sin lider"}</span>




          </div>




        </div>




      );




    },




    [favoritos, navigate, setProyectoAlertas]




  );









  return (




    <div className="contenedor-home">




      <div className="home-header">




        <div>




          <h1>Dashboard principal</h1>




          <p className="home-subtitle">Monitoreo integral del portafolio con foco en alertas y responsables.</p>




        </div>




        <NotificationButton count={alertasGlobales.length} onClick={() => setShowAlertasModal(true)} />




      </div>









      {fullscreenPanel && <div className="fullscreen-backdrop" onClick={() => setFullscreenPanel(null)} />}









      {error && (




        <div className="alerta-error">




          {error}




          <button type="button" onClick={() => setError(null)}>




            Cerrar




          </button>




        </div>




      )}









      {loading ? (




        <div className="panel-placeholder">Cargando proyectos...</div>




      ) : (




        <>




          <section



            className={`panel panel--full ${isFullscreen("monitoreados") ? "panel--fullscreen" : ""}`}



          >



            <div className="section-heading section-heading--between">



              <div>



                <h2>Estado de proyectos monitoreados</h2>



              </div>



              <button



                type="button"



                className="panel-expand-btn"



                onClick={() => toggleFullscreen("monitoreados")}



              >



                {isFullscreen("monitoreados") ? "Cerrar" : "Pantalla completa"}



              </button>



            </div>



            <div className="panel-search">



              <label htmlFor="busqueda-monitoreados" className="sr-only">
                {"Buscar proyectos monitorizados"}
              </label>
              <input
                id="busqueda-monitoreados"
                type="search"
                placeholder={"Buscar por c\u00f3digo, nombre, cliente o l\u00edder..."}
                className="corporate-search-input"
                value={busquedaMonitoreados}
                onChange={(e) => setBusquedaMonitoreados(e.target.value)}
                list="sugerencias-monitoreados"
              />
              <datalist id="sugerencias-monitoreados">



                {proyectosFavoritos.map((p) => (



                  <option



                    key={`sug-${p.id}`}



                    value={`${p.codigo} - ${p.nombre}`}



                  >



                    {p.responsable || ""}



                  </option>



                ))}



              </datalist>



            </div>



            {proyectosFavoritos.length === 0 ? (



              <div className="pin-placeholder">



                <p>No hay proyectos monitoreados. Activa la opción “Monitorear en dashboard” desde Resumen &gt; Panel General.</p>



              </div>



            ) : (



              <>



                {proyectosMonitoreados.length === 0 ? (



                  <div className="panel-placeholder">Sin coincidencias para “{busquedaMonitoreados}”.</div>



                ) : (



                <div className="estado-grid">
                  {proyectosMonitoreados.map((p) => renderProyectoCard(p))}
                </div>
                )}



              </>



            )}



          </section>








          <section className={`panel panel--full ${isFullscreen("responsables") ? "panel--fullscreen" : ""}`}>




            <div className="section-heading section-heading--between">




              <div>




                <h2>Monitoreo de Actividades por Responsable</h2>




              </div>




              <div className="panel-actions">




                <span className="badge">{Array.isArray(tareas) ? tareas.length : 0} tareas</span>




                <button




                  type="button"




                  className="panel-expand-btn"




                  onClick={() => toggleFullscreen("responsables")}




                >




                  {isFullscreen("responsables") ? "Cerrar" : "Pantalla completa"}




                </button>




              </div>




            </div>




            {tareasError ? (




              <div className="alerta-error">{tareasError}</div>




            ) : responsablesMonitoreados.length === 0 ? (




              <div className="panel-placeholder">No hay tareas registradas para el equipo.</div>




            ) : (




              <div className="tabla-responsables" {...getScrollableProps("responsables", 280)}>



                <table>




                  <thead>




                    <tr>




                      <th>Responsable</th>




                      <th className="center col-area">?rea</th>
                      <th className="center col-tareas">Tareas</th>




                      <th className="center col-en-fecha">En fecha</th>




                      <th className="center col-retrasadas">Retrasadas</th>




                      <th className="center">Indicador</th>




                      <th className="center">Acciones</th>




                    </tr>




                  </thead>




                  <tbody>




                    {responsablesMonitoreados.map((row) => (




                      <tr key={row.responsable}>




                        <td>




                          <div className="responsable-cell">




                            <span




                              className="responsable-avatar"




                              style={{ backgroundColor: row.avatarColor }}




                            >




                              {row.avatarInitials}




                            </span>




                            <div>




                              <p className="responsable-name">{row.responsable}</p>




                              <p className="responsable-meta">Monitoreado</p>




                            </div>




                          </div>




                        </td>




                        <td className="center col-area">{row.area}</td>




                        <td className="center col-tareas">{row.total}</td>




                        <td className="center col-en-fecha">{row.enFecha}</td>




                        <td className="center col-retrasadas">{row.retrasadas}</td>




                        <td className="center">




                          <span className={indicadorClass(row.indicador)}>




                            <span className="indicator-dot" />




                            {row.indicador === "ok" ? "En control" : row.indicador === "warn" ? "Atencion" : "Critico"}




                          </span>




                        </td>




                        <td className="center">




                          <button




                            type="button"




                            className="btn-ver"




                            onClick={() => setResponsableSeleccionado(row.responsable)}




                          >




                            Ver tareas




                          </button>




                        </td>




                      </tr>




                    ))}




                  </tbody>




                </table>




              </div>




            )}




          </section>









          <section className="grid-charts">




            <div className={`panel panel--full ${isFullscreen("estado") ? "panel--fullscreen" : ""}`}>



              <div className="section-heading section-heading--between">



                <h2>{"Distribuci\u00f3n por estado"}</h2>
                <button



                  type="button"



                  className="panel-expand-btn"



                  onClick={() => toggleFullscreen("estado")}



                >



                  {isFullscreen("estado") ? "Cerrar" : "Pantalla completa"}



                </button>



              </div>



              <ReactECharts



                className="chart-canvas"



                style={{ height: getChartHeight("estado", 320, 220) }}



                option={estadosChart}



                notMerge



                lazyUpdate



              />



            </div>



            <div className={`panel panel--full ${isFullscreen("curva") ? "panel--fullscreen" : ""}`}>




              <div className="section-heading section-heading--between">




                <h2>Curva S</h2>




                <div className="panel-actions">




                  <button




                    type="button"




                    className="panel-expand-btn"




                    onClick={() => toggleFullscreen("curva")}




                  >




                    {isFullscreen("curva") ? "Cerrar" : "Pantalla completa"}




                  </button>




                  <select value={proyectoSeleccionado || ""} onChange={(e) => setProyectoSeleccionado(e.target.value)}>




                    {proyectos.map((p) => (




                      <option key={p.codigo} value={p.codigo}>




                        {p.codigo}




                      </option>




                    ))}




                  </select>




                </div>




              </div>




              {loadingCurvas ? (



                <div className="panel-placeholder">Cargando curva...</div>



              ) : (



                <ReactECharts



                  className="chart-canvas"



                  style={{ height: getChartHeight("curva", 320, 240) }}



                  option={curvaSChart}



                  notMerge



                  lazyUpdate



                />



              )}



            </div>




          </section>









          <section className={`panel panel--full ${isFullscreen("alertas") ? "panel--fullscreen" : ""}`}>



            <div className="section-heading section-heading--between">



              <h2>Proyectos con alertas activas</h2>



              <button



                type="button"



                className="panel-expand-btn"



                onClick={() => toggleFullscreen("alertas")}



              >



                {isFullscreen("alertas") ? "Cerrar" : "Pantalla completa"}



              </button>



            </div>



            {proyectosEnRiesgo.length === 0 ? (



              <div className="panel-placeholder">No hay alertas activas.</div>



            ) : (



              <div className="tabla-responsables">



                <table>



                  <thead>




                    <tr>




                      <th>{"C\u00f3digo"}</th>
                      <th>Cliente</th>
                      <th>Estado</th>
                      <th>Alertas</th>




                      <th></th>




                    </tr>




                  </thead>




                  <tbody>




                    {proyectosEnRiesgo.map((p) => (




                      <tr key={p.id}>




                        <td>{p.codigo}</td>




                        <td>{p.cliente || "-"}</td>




                        <td>{p.estado}</td>




                        <td>




                          <ul className="alert-list-inline">




                            {p.alertas.slice(0, 2).map((alerta, idx) => (




                              <li key={`${alerta.mensaje}-${idx}`}>{alerta.mensaje}</li>




                            ))}




                            {p.alertas.length > 2 && <li>+{p.alertas.length - 2} adicionales</li>}




                          </ul>




                        </td>




                        <td>




                          <button




                            type="button"




                            className="btn-link"




                            onClick={() => navigate(`/proyectos/mis-proyectos/${p.id}?tab=Riesgos`)}




                          >




                            Ver riesgos




                          </button>




                        </td>




                      </tr>




                    ))}




                  </tbody>




                </table>




              </div>




            )}




          </section>









          <section className={`panel panel--full ${isFullscreen("finanzas") ? "panel--fullscreen" : ""}`}>



            <div className="section-heading section-heading--between">



              <h2>Resumen financiero</h2>



              <button



                type="button"



                className="panel-expand-btn"



                onClick={() => toggleFullscreen("finanzas")}



              >



                {isFullscreen("finanzas") ? "Cerrar" : "Pantalla completa"}



              </button>



            </div>



            <div className="tabla-responsables" {...getScrollableProps("finanzas", 260)}>



              <table>



                <thead>



                  <tr>



                    <th>{"C\u00f3digo"}</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Presupuesto</th>
                    <th>Ejecutado</th>
                    <th>Saldo</th>
                    <th>% Uso</th>
                    <th className="center">Alerta</th>
                  </tr>




                </thead>




                <tbody>



                  {proyectos.map((p) => {



                    const totalCotizado = Number(p.presupuestoTotal || 0);



                    const ejecutado = Number(p.ac || 0);



                    const saldo = totalCotizado - ejecutado;



                    const porcentajeUso = totalCotizado > 0 ? Math.round((ejecutado / totalCotizado) * 100) : 0;



                    const exceso = totalCotizado > 0 ? (ejecutado - totalCotizado) / totalCotizado : 0;



                    let alertaNivel = "ok";



                    if (exceso > 0.5) alertaNivel = "critico";



                    else if (exceso > 0.25) alertaNivel = "alerta";



                    const alertaTooltip =



                      alertaNivel === "critico"



                        ? "Gastos superiores al 50% del total cotizado"



                        : alertaNivel === "alerta"



                        ? "Gastos superan en 25% el total cotizado"



                        : "En control";



                    return (



                      <tr key={`fin-${p.id}`}>



                        <td className="texto-link" onClick={() => navigate(`/proyectos/mis-proyectos/${p.id}`)}>{p.codigo}</td>



                        <td>{p.cliente || "-"}</td>



                        <td>{p.estado}</td>



                        <td>{fmtMoney(totalCotizado, p.moneda)}</td>



                        <td>{fmtMoney(ejecutado, p.moneda)}</td>



                        <td className={saldo < 0 ? "texto-rojo" : "texto-verde"}>{fmtMoney(saldo, p.moneda)}</td>



                        <td>



                          <span className={porcentajeUso > 90 ? "chip chip--red" : porcentajeUso > 70 ? "chip chip--yellow" : "chip chip--green"}>



                            {porcentajeUso}%



                          </span>



                        </td>



                        <td className="center">



                          <span className={`status-dot status-dot--${alertaNivel}`} title={alertaTooltip}></span>



                        </td>



                      </tr>



                    );



                  })}



                </tbody>



              </table>



            </div>



          </section>



        </>




      )}









      <Modal open={showAlertasModal} title={`Alertas predictivas (${alertasGlobales.length})`} onClose={() => setShowAlertasModal(false)}>




        {alertasGlobales.length === 0 ? (




          <p className="panel-placeholder">Sin alertas en el portafolio.</p>




        ) : (




          <ul className="alert-modal-list">




            {alertasGlobales.map((alerta, idx) => (




              <li key={`${alerta.proyectoId}-${idx}`} className={`alert-modal-item ${alerta.severidad}`}>




                <div>




                  <p className="alert-modal-title">{alerta.mensaje}</p>




                  <p className="alert-modal-detail">{alerta.detalle}</p>




                  <p className="alert-modal-project">{alerta.proyectoCodigo} - {alerta.proyectoNombre}</p>




                </div>




                <button




                  type="button"




                  className="btn-link"




                  onClick={() => {




                    navigate(alerta.path);




                    setShowAlertasModal(false);




                  }}




                >




                  Ir al proyecto




                </button>




              </li>




            ))}




          </ul>




        )}




      </Modal>









      <Modal




        open={Boolean(proyectoAlertas)}




        title={proyectoAlertas ? `Alertas de ${proyectoAlertas.codigo}` : ""}




        onClose={() => setProyectoAlertas(null)}




      >




        {proyectoAlertas && proyectoAlertas.alertas?.length > 0 ? (




          <ul className="alert-modal-list">




            {proyectoAlertas.alertas.map((alerta, idx) => (




              <li key={`${alerta.mensaje}-${idx}`} className={`alert-modal-item ${alerta.severidad}`}>




                <div>




                  <p className="alert-modal-title">{alerta.mensaje}</p>




                  {alerta.detalle && <p className="alert-modal-detail">{alerta.detalle}</p>}




                  <p className="alert-modal-project">Responsable: {proyectoAlertas.responsable || "Sin lider"}</p>




                </div>




                <button




                  type="button"




                  className="btn-link"




                  onClick={() => {




                    navigate(`/proyectos/mis-proyectos/${proyectoAlertas.id}`);




                    setProyectoAlertas(null);




                  }}




                >




                  Abrir proyecto




                </button>




              </li>




            ))}




          </ul>




        ) : (




          <p className="panel-placeholder">Proyecto sin alertas activas.</p>




        )}




      </Modal>









      <Modal




        open={Boolean(responsableSeleccionado)}




        title={responsableSeleccionado ? `Tareas de ${responsableSeleccionado}` : ""}




        onClose={() => setResponsableSeleccionado(null)}




      >




        {tareasResponsableSeleccionado.length === 0 ? (




          <p className="panel-placeholder">No hay tareas asignadas.</p>




        ) : (




          <div className="tabla-responsables">




            <table>




              <thead>




                <tr>




                  <th>Tarea</th>




                  <th>Proyecto</th>




                  <th>Estado</th>




                  <th>Inicio</th>




                  <th>Fin</th>




                </tr>




              </thead>




              <tbody>




                {tareasResponsableSeleccionado.map((tarea) => (




                  <tr key={tarea.id} className={tarea.vencida ? "row-danger" : ""}>




                    <td>{tarea.titulo}</td>




                    <td>{tarea.proyectoCodigo}</td>




                    <td>{tarea.estado}</td>




                    <td>{formatDate(tarea.fecha_inicio)}</td>




                    <td>{formatDate(tarea.fecha_fin)}</td>




                  </tr>




                ))}




              </tbody>




            </table>




          </div>




        )}




      </Modal>




    </div>




  );




}


















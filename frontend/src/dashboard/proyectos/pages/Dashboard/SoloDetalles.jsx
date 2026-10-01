// src/pages/Dashboard/SoloDetalles.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import TiempoTab from "./tabs/TabTiempo";
import TabRiesgos from "./tabs/TabRiesgos";
import TabCambios from "./tabs/TabCambios";
import TabRecursos from "./tabs/TabRecursos";
import TabCalidad from "./tabs/TabCalidad";
import TabComunicaciones from "./tabs/TabComunicaciones";
import TabCompras from "./tabs/TabCompras";
import TabDocumentos from "./tabs/TabDocumentos";
import TabAlcance from "./tabs/TabAlcance";
import TabResumen from "./tabs/TabResumen";
import TabInformes from "./tabs/TabInformes";
import TabTareas from "./tabs/TabTareas";
import NotasWidget from "./components/NotasWidget";
import { proyectosService } from "../../api";
import "./SoloDetalles.css";

const FAVORITES_KEY = "pm.dashboard.favoritos";

/* ---------------- helpers ---------------- */
const fmtMoney = (n, c="USD") =>
  new Intl.NumberFormat(c === "USD" ? "en-US" : "es-PE", {
    style: "currency", currency: c, maximumFractionDigits: 0
  }).format(Number(n||0));

const fmtDMY = (iso) => {
  if (!iso || !iso.includes("-")) return "—";
  const [y,m,d] = iso.split("-");
  return `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y.slice(-2)}`;
};

const readFavoritos = () => {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch (err) {
    console.warn("No se pudo leer proyectos monitoreados", err);
    return [];
  }
};

/* ---------------- pestañas (nombres finales) ---------------- */
const TABS = [
  "Resumen",
  "Alcance",
  "Tiempo",
  "Tareas",
  "Costos",
  "Riesgos",
  "Control de Cambios",
  "Recursos",
  "Calidad",
  "Comunicaciones",
  "Compras",
  "Documentos",
  "Informes",
];

const ESTADOS_PROYECTO = [
  "Apertura",
  "Inicio",
  "Planificacion",
  "Ejecucion",
  "Cierre",
  "Cerrado",
  "Pausado",
];

const ETAPAS = [
  { value: "inicio", label: "Inicio" },
  { value: "planificacion", label: "Planificación" },
  { value: "ejecucion", label: "Ejecución" },
  { value: "monitoreo", label: "Monitoreo y control" },
  { value: "cierre", label: "Cierre" },
];

const TabBar = ({ active, onChange }) => (
  <nav className="project-detail-tabs" aria-label="Secciones del proyecto">
    <div className="project-detail-tabs__track" role="tablist">
      {TABS.map(t => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={active === t}
          onClick={()=>onChange(t)}
          className={`project-detail-tabs__button ${active === t ? "is-active" : ""}`}
        >
          {t}
        </button>
      ))}
    </div>
  </nav>
);

const Card = ({title,children}) => (
  <div className="rounded-xl border p-4">
    <div className="text-sm font-semibold text-gray-600 mb-2">{title}</div>
    <div>{children}</div>
  </div>
);
const KPICard = ({label,value,muted}) => (
  <div className="rounded-xl border p-4 text-center">
    <div className="text-xs text-gray-500">{label}</div>
    <div className={`text-xl font-semibold ${muted?"text-gray-600":"text-gray-800"}`}>{value}</div>
  </div>
);
const Section = ({title,children,actions}) => (
  <div className="rounded-xl border p-4 mb-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {actions}
    </div>
    {children}
  </div>
);

/* ---------------- página principal ---------------- */
export default function SoloDetalles() {
  const { codigo, id } = useParams();
  const projectId = codigo || id;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get("tab");
  const [active, setActive] = useState(() =>
    initialParam && TABS.includes(initialParam) ? initialParam : "Resumen"
  );
  const [proyecto, setProyecto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorito, setFavorito] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && TABS.includes(tabParam) && tabParam !== active) {
      setActive(tabParam);
    }
  }, [searchParams, active]);

  const handleTabChange = (nextTab) => {
    if (nextTab === active) return;
    setActive(nextTab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", nextTab);
    setSearchParams(params, { replace: true });
  };

  // Cargar proyecto desde API
  useEffect(() => {
    const cargarProyecto = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await proyectosService.obtener(projectId);
        setProyecto(response.data);
        document.title = `${response.data.codigo} — Detalles del Proyecto`;
      } catch (err) {
        console.error('Error cargando proyecto:', err);
        setError('Error al cargar proyecto: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      cargarProyecto();
    }
  }, [projectId]);

  useEffect(() => {
    if (!proyecto?.id) return;
    const stored = readFavoritos();
    setFavorito(stored.includes(proyecto.id));
  }, [proyecto?.id]);

  const moneda = proyecto?.moneda || "USD";

  // costos reales
  const [gastos, setGastos] = useState([]);
  const [hhReg, setHhReg] = useState([]);

  // Sincronizar gastos y HH con proyecto
  useEffect(() => {
    if (proyecto) {
      // Parsear gastos y HH desde el proyecto
      try {
        const g = typeof proyecto.gastos === 'string' ? JSON.parse(proyecto.gastos || '[]') : (proyecto.gastos || []);
        const h = typeof proyecto.hh === 'string' ? JSON.parse(proyecto.hh || '[]') : (proyecto.hh || []);
        setGastos(g);
        setHhReg(h);
      } catch {
        setGastos([]);
        setHhReg([]);
      }
    }
  }, [proyecto]);

  // presupuestos de apertura
  const presupuestoGastos = Number(proyecto?.presupuesto_gastos || 0);
  const presupuestoHH = Number(proyecto?.presupuesto_hh || 0);
  const contingencia = Number(proyecto?.presupuesto_contingencia || 0);
  const utilidad = Number(proyecto?.presupuesto_utilidad || 0);
  const presupuestoTotal = presupuestoGastos + presupuestoHH + contingencia + utilidad;

  // acumulados
  const gastosReales = useMemo(() => gastos.reduce((s,g) => s + Number(g.monto||0), 0), [gastos]);
  const costoHHReal = useMemo(() => hhReg.reduce((s,h) => s + (Number(h.horas||0) * Number(h.tarifa||0)), 0), [hhReg]);
  const programado = Number(proyecto?.gasto_real || 0) + Number(proyecto?.costo_hh_real || 0);

  // EVM (placeholder simple)
  const pv = presupuestoTotal * 0.4;
  const ev = presupuestoTotal * 0.35;
  const ac = programado;
  const cpi = ac ? (ev/ac) : 0;
  const spi = pv ? (ev/pv) : 0;
  const eac = presupuestoTotal / (cpi || 1);

  // persistencia "patch" - ahora actualiza via API
  async function updateProject(patch) {
    if (!proyecto?.id) return;

    try {
      const response = await proyectosService.actualizarParcial(proyecto.id, patch);
      setProyecto(prev => ({ ...prev, ...response.data }));
    } catch (err) {
      console.error('Error actualizando proyecto:', err);
      setError('Error al actualizar: ' + (err.response?.data?.error || err.message));
    }
  }

  const handleMonitorToggle = (checked) => {
    if (!proyecto?.id) return;
    const actual = readFavoritos();
    const next = checked
      ? Array.from(new Set([...actual, proyecto.id]))
      : actual.filter((id) => id !== proyecto.id);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn("No se pudo guardar monitoreo en dashboard", err);
    }
    setFavorito(checked);
    window.dispatchEvent(new CustomEvent("pm:favoritos-update", { detail: next }));
  };

  const [estadoDraft, setEstadoDraft] = useState(proyecto?.estado || "Ejecucion");
  const [etapaDraft, setEtapaDraft] = useState(proyecto?.etapa_actual || "inicio");
  const [updatingEstado, setUpdatingEstado] = useState(false);

  useEffect(() => {
    setEstadoDraft(proyecto?.estado || "Ejecucion");
    setEtapaDraft(proyecto?.etapa_actual || "inicio");
  }, [proyecto?.estado, proyecto?.etapa_actual]);

  const handleEstadoUpdate = async () => {
    if (!proyecto?.id) return;
    setUpdatingEstado(true);
    try {
      await updateProject({
        estado: estadoDraft,
        etapa_actual: etapaDraft,
      });
    } finally {
      setUpdatingEstado(false);
    }
  };

  // forms ligeros de costos
  const [gasto, setGasto] = useState({fecha:"", rubro:"", monto:""});
  const addGasto = async () => {
    if (!gasto.fecha || !gasto.rubro || !gasto.monto) return;
    const reg = { ...gasto, monto: Number(gasto.monto) };
    const nuevosGastos = [...gastos, reg];
    const nuevoGastoReal = Number(proyecto.gasto_real || 0) + reg.monto;

    setGastos(nuevosGastos);
    await updateProject({
      gastos: JSON.stringify(nuevosGastos),
      gasto_real: nuevoGastoReal
    });
    setGasto({ fecha: "", rubro: "", monto: "" });
  };

  const [hh, setHH] = useState({fecha:"", recurso:"", horas:"", tarifa:""});
  const addHH = async () => {
    if (!hh.fecha || !hh.recurso || !hh.horas || !hh.tarifa) return;
    const reg = { ...hh, horas: Number(hh.horas), tarifa: Number(hh.tarifa) };
    const nuevosHH = [...hhReg, reg];
    const nuevoCostoHH = Number(proyecto.costo_hh_real || 0) + (reg.horas * reg.tarifa);

    setHhReg(nuevosHH);
    await updateProject({
      hh: JSON.stringify(nuevosHH),
      costo_hh_real: nuevoCostoHH
    });
    setHH({ fecha: "", recurso: "", horas: "", tarifa: "" });
  };

  if (loading) {
    return <div className="p-6">Cargando proyecto...</div>;
  }

  if (error || !proyecto) {
    return (
      <div className="p-6">
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error || 'Proyecto no encontrado'}
        </div>
        <button className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => navigate(-1)}>
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div className="project-detail-page p-6 space-y-4">
      {/* header */}
      <div className="project-detail-header flex items-center justify-between">
        <div>
          <div className="project-detail-title text-2xl font-semibold text-gray-800">{proyecto.codigo} — {proyecto.nombre || "Proyecto"}</div>
          <div className="project-detail-meta text-sm text-gray-600">
            Cliente: <b>{proyecto.cliente || "—"}</b> · Estado: <b>{proyecto.estado || "—"}</b> ·
            Inicio: <b>{fmtDMY(proyecto.fecha_inicio)}</b> · Fin: <b>{fmtDMY(proyecto.fecha_fin)}</b>
          </div>
        </div>
        <button className="project-detail-back" onClick={() => navigate(-1)}>← Volver</button>
      </div>

      <div className="project-detail-state-panel rounded-xl border p-4 bg-white shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Estado del proyecto</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={estadoDraft}
            onChange={(e) => setEstadoDraft(e.target.value)}
          >
            {ESTADOS_PROYECTO.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Etapa</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={etapaDraft}
            onChange={(e) => setEtapaDraft(e.target.value)}
          >
            {ETAPAS.map((etapa) => (
              <option key={etapa.value} value={etapa.value}>
                {etapa.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2 min-w-[220px]">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="accent-blue-600 h-4 w-4"
              checked={favorito}
              onChange={(e) => handleMonitorToggle(e.target.checked)}
            />
            Monitorear en dashboard
          </label>
          <button
            onClick={handleEstadoUpdate}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
            disabled={updatingEstado}
          >
            {updatingEstado ? "Guardando..." : "Actualizar estado"}
          </button>
        </div>
      </div>

      <TabBar active={active} onChange={handleTabChange} />

      <section className="project-detail-content">

      {active==="Resumen" && (
        <div className="space-y-4">
          <TabResumen proyecto={proyecto} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card title="Presupuestos vs Ejecución">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-2">Presupuestos de apertura</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Gastos</div><div className="text-right">{fmtMoney(presupuestoGastos, moneda)}</div>
                      <div>HH (monto)</div><div className="text-right">{fmtMoney(presupuestoHH, moneda)}</div>
                      <div>Contingencia</div><div className="text-right">{fmtMoney(contingencia, moneda)}</div>
                      <div>Utilidad</div><div className="text-right">{fmtMoney(utilidad, moneda)}</div>
                      <div className="font-semibold">Total</div><div className="text-right font-semibold">{fmtMoney(presupuestoTotal, moneda)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-2">Ejecución (acumulado)</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Gastos reales</div><div className="text-right">{fmtMoney(gastosReales, moneda)}</div>
                      <div>HH costo real</div><div className="text-right">{fmtMoney(costoHHReal, moneda)}</div>
                      <div className="font-semibold">Programado</div><div className="text-right font-semibold">{fmtMoney(programado, moneda)}</div>
                      <div className="font-semibold">Saldo</div><div className="text-right font-semibold">{fmtMoney(presupuestoTotal - programado, moneda)}</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <div>
              <NotasWidget proyectoId={proyecto?.id} />
            </div>
          </div>
        </div>
      )}

      {active==="Alcance" && (
        <TabAlcance proyecto={proyecto} />
      )}

      {active==="Tiempo" && (
        <TiempoTab proyecto={proyecto} updateProject={updateProject} />
      )}

      {active==="Tareas" && (
        <TabTareas proyecto={proyecto} />
      )}

      {active==="Costos" && (
        <div className="project-costs-tab">
          <Section title="Cargar gastos">
            <p className="project-costs-section-help">Registre los desembolsos reales asociados al proyecto.</p>
            <form className="project-costs-form project-costs-form--expenses"
                  onSubmit={(e)=>{e.preventDefault(); addGasto();}} autoComplete="off">
              <label><span>Fecha</span><input type="date" value={gasto.fecha} onChange={e=>setGasto({...gasto,fecha:e.target.value})}/></label>
              <label><span>Rubro</span><input placeholder="Ej. Materiales" value={gasto.rubro} onChange={e=>setGasto({...gasto,rubro:e.target.value})}/></label>
              <label><span>Monto</span><input placeholder="0.00" type="number" inputMode="decimal" step="any" value={gasto.monto} onChange={e=>setGasto({...gasto,monto:e.target.value})}/></label>
              <button className="project-costs-add" type="submit">Agregar gasto</button>
            </form>
            <div className="project-costs-table">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100"><tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Rubro</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                </tr></thead>
                <tbody>
                  {gastos.map((g,i)=>(
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{fmtDMY(g.fecha)}</td>
                      <td className="px-3 py-2">{g.rubro}</td>
                      <td className="px-3 py-2 text-right">{fmtMoney(g.monto, moneda)}</td>
                    </tr>
                  ))}
                  {!gastos.length && <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-500">Sin registros.</td></tr>}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Registro de HH (reales)">
            <p className="project-costs-section-help">Consolide las horas efectivamente trabajadas y su costo real.</p>
            <form className="project-costs-form project-costs-form--hours"
                  onSubmit={(e)=>{e.preventDefault(); addHH();}} autoComplete="off">
              <label><span>Fecha</span><input type="date" value={hh.fecha} onChange={e=>setHH({...hh,fecha:e.target.value})}/></label>
              <label><span>Recurso</span><input placeholder="Nombre o recurso" value={hh.recurso} onChange={e=>setHH({...hh,recurso:e.target.value})}/></label>
              <label><span>Horas</span><input placeholder="0" type="number" inputMode="numeric" step="any" value={hh.horas} onChange={e=>setHH({...hh,horas:e.target.value})}/></label>
              <label><span>Tarifa</span><input placeholder="0.00" type="number" inputMode="decimal" step="any" value={hh.tarifa} onChange={e=>setHH({...hh,tarifa:e.target.value})}/></label>
              <button className="project-costs-add" type="submit">Agregar HH</button>
            </form>
            <div className="project-costs-table">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100"><tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Recurso</th>
                  <th className="px-3 py-2 text-right">Horas</th>
                  <th className="px-3 py-2 text-right">Tarifa</th>
                  <th className="px-3 py-2 text-right">Costo</th>
                </tr></thead>
                <tbody>
                  {hhReg.map((r,i)=>(
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{fmtDMY(r.fecha)}</td>
                      <td className="px-3 py-2">{r.recurso}</td>
                      <td className="px-3 py-2 text-right">{r.horas}</td>
                      <td className="px-3 py-2 text-right">{fmtMoney(r.tarifa, moneda)}</td>
                      <td className="px-3 py-2 text-right">{fmtMoney(r.horas*r.tarifa, moneda)}</td>
                    </tr>
                  ))}
                  {!hhReg.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Sin registros.</td></tr>}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="project-costs-kpis grid grid-cols-2 md:grid-cols-6 gap-3">
            <KPICard label="PV" value={fmtMoney(pv, moneda)} />
            <KPICard label="EV" value={fmtMoney(ev, moneda)} />
            <KPICard label="AC" value={fmtMoney(ac, moneda)} />
            <KPICard label="CPI" value={cpi ? cpi.toFixed(2) : "—"} />
            <KPICard label="SPI" value={spi ? spi.toFixed(2) : "—"} />
            <KPICard label="EAC" value={fmtMoney(eac, moneda)} />
          </div>
        </div>
      )}

      {active==="Riesgos" && (
        <TabRiesgos proyecto={proyecto} />
      )}

      {active==="Control de Cambios" && (
        <TabCambios proyecto={proyecto} />
      )}

      {active==="Recursos" && (
        <TabRecursos proyecto={proyecto} />
      )}

      {active==="Calidad" && (
        <TabCalidad proyecto={proyecto} />
      )}

      {active==="Comunicaciones" && (
        <TabComunicaciones proyecto={proyecto} />
      )}

      {active==="Compras" && (
        <TabCompras proyecto={proyecto} />
      )}

      {active==="Documentos" && (
        <TabDocumentos proyecto={proyecto} />
      )}

      {active==="Informes" && (
        <TabInformes proyecto={proyecto} />
      )}
      </section>
    </div>
  );
}




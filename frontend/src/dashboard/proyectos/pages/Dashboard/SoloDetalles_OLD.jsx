// src/pages/Dashboard/SoloDetalles.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TiempoTab from "./tabs/TabTiempo";


/* ---------------- claves & helpers ---------------- */
const K_PROYECTOS = "pm.proyectos";
const loadProjList = () => {
  try { return JSON.parse(localStorage.getItem(K_PROYECTOS) || "[]"); }
  catch { return []; }
};
const saveProjList = (list) => localStorage.setItem(K_PROYECTOS, JSON.stringify(list));

const fmtMoney = (n, c="USD") =>
  new Intl.NumberFormat(c === "USD" ? "en-US" : "es-PE", {
    style: "currency", currency: c, maximumFractionDigits: 0
  }).format(Number(n||0));

const fmtDMY = (iso) => {
  if (!iso || !iso.includes("-")) return "—";
  const [y,m,d] = iso.split("-");
  return `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y.slice(-2)}`;
};

/* ---------------- pestañas (nombres finales) ---------------- */
const TABS = [
  "Resumen",
  "Alcance",
  "Tiempo",
  "Costos",
  "Riesgos",
  "Control de Cambios",
  "Recursos",
  "Calidad",
  "Comunicaciones",
  "Compras",
  "Documentos",
];

const TabBar = ({active,onChange}) => (
  <div className="border-b">
    <div className="flex flex-wrap gap-2 px-4">
      {TABS.map(t => (
        <button key={t}
          onClick={()=>onChange(t)}
          className={`px-3 py-2 text-sm rounded-t ${active===t ? "border-b-2 border-blue-600 text-blue-700" : "text-gray-600 hover:text-gray-800"}`}>
          {t}
        </button>
      ))}
    </div>
  </div>
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
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [active, setActive] = useState("Resumen");

  // proyecto desde sessionStorage (lo setea Proyectos.jsx al navegar)
  const [proyecto, setProyecto] = useState(() => {
    const raw = sessionStorage.getItem("pm.project");
    const p = raw ? JSON.parse(raw) : {};
    return p && p.codigo === codigo ? p : p;
  });
  useEffect(()=>{ document.title = `${codigo} — Detalles del Proyecto`; }, [codigo]);

  const moneda = proyecto?.moneda || "USD";

  // costos reales
  const [gastos, setGastos] = useState(() => proyecto?.gastos || []);
  const [hhReg, setHhReg]   = useState(() => proyecto?.hh     || []);

  // presupuestos de apertura
  const presupuestoGastos = Number(proyecto.presupuesto || 0);
  const presupuestoHH     = Number(proyecto.presupuestoHH || 0);
  const contingencia      = Number(proyecto.contingencia || 0);
  const utilidad          = Number(proyecto.utilidad || 0);
  const presupuestoTotal  = presupuestoGastos + presupuestoHH + contingencia + utilidad;

  // acumulados
  const gastosReales = useMemo(()=>gastos.reduce((s,g)=>s+Number(g.monto||0),0),[gastos]);
  const costoHHReal  = useMemo(()=>hhReg.reduce((s,h)=>s+(Number(h.horas||0)*Number(h.tarifa||0)),0),[hhReg]);
  const programado   = Number(proyecto.programado || 0) + gastosReales + costoHHReal;

  // EVM (placeholder simple)
  const pv = presupuestoTotal * 0.4;
  const ev = presupuestoTotal * 0.35;
  const ac = programado;
  const cpi = ac ? (ev/ac) : 0;
  const spi = pv ? (ev/pv) : 0;
  const eac = presupuestoTotal / (cpi || 1);

  // persistencia “patch”
  function updateProject(patch) {
    setProyecto(prev => {
      const updated = { ...prev, ...patch };
      const list = loadProjList();
      const idx = list.findIndex(p => p.codigo === updated.codigo);
      if (idx >= 0) { list[idx] = { ...list[idx], ...patch }; saveProjList(list); }
      sessionStorage.setItem("pm.project", JSON.stringify(updated));
      return updated;
    });
  }

  // forms ligeros de costos
  const [gasto, setGasto] = useState({fecha:"", rubro:"", monto:""});
  const addGasto = () => {
    if (!gasto.fecha || !gasto.rubro || !gasto.monto) return;
    const reg = { ...gasto, monto: Number(gasto.monto) };
    setGastos(prev => {
      const next = [...prev, reg];
      updateProject({ gastos: next, programado: Number(proyecto.programado || 0) + reg.monto });
      return next;
    });
    setGasto({ fecha: "", rubro: "", monto: "" });
  };
  const [hh, setHH] = useState({fecha:"", recurso:"", horas:"", tarifa:""});
  const addHH = () => {
    if (!hh.fecha || !hh.recurso || !hh.horas || !hh.tarifa) return;
    const reg = { ...hh, horas: Number(hh.horas), tarifa: Number(hh.tarifa) };
    setHhReg(prev => {
      const next = [...prev, reg];
      updateProject({ hh: next, programado: Number(proyecto.programado || 0) + reg.horas*reg.tarifa });
      return next;
    });
    setHH({ fecha: "", recurso: "", horas: "", tarifa: "" });
  };

  return (
    <div className="p-6 space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-gray-800">{codigo} — {proyecto?.nombre || "Proyecto"}</div>
          <div className="text-sm text-gray-600">
            Cliente: <b>{proyecto?.cliente || "—"}</b> · Estado: <b>{proyecto?.estado || "—"}</b> ·
            Inicio: <b>{fmtDMY(proyecto?.inicio)}</b> · Fin: <b>{fmtDMY(proyecto?.fin)}</b>
          </div>
        </div>
        <button className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50" onClick={()=>navigate(-1)}>← Volver</button>
      </div>

      <TabBar active={active} onChange={setActive} />

      {active==="Resumen" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Presupuestos de apertura">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Gastos</div><div className="text-right">{fmtMoney(presupuestoGastos, moneda)}</div>
              <div>HH (monto)</div><div className="text-right">{fmtMoney(presupuestoHH, moneda)}</div>
              <div>Contingencia</div><div className="text-right">{fmtMoney(contingencia, moneda)}</div>
              <div>Utilidad</div><div className="text-right">{fmtMoney(utilidad, moneda)}</div>
              <div className="font-semibold">Total</div><div className="text-right font-semibold">{fmtMoney(presupuestoTotal, moneda)}</div>
            </div>
          </Card>
          <Card title="Ejecución (acumulado)">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Gastos reales</div><div className="text-right">{fmtMoney(gastosReales, moneda)}</div>
              <div>HH costo real</div><div className="text-right">{fmtMoney(costoHHReal, moneda)}</div>
              <div className="font-semibold">Programado</div><div className="text-right font-semibold">{fmtMoney(programado, moneda)}</div>
              <div className="font-semibold">Saldo</div><div className="text-right font-semibold">{fmtMoney(presupuestoTotal - programado, moneda)}</div>
            </div>
          </Card>
          <div className="grid grid-cols-3 gap-3">
            <KPICard label="CPI" value={cpi ? cpi.toFixed(2) : "—"} />
            <KPICard label="SPI" value={spi ? spi.toFixed(2) : "—"} />
            <KPICard label="EAC" value={fmtMoney(eac, moneda)} />
          </div>
        </div>
      )}

      {active==="Alcance" && (
        <Section title="WBS (placeholder)">
          <div className="text-sm text-gray-600">Aquí pondremos el árbol de alcance/WBS detallado. (Se puede conectar más adelante con el EDT de “Tiempo”).</div>
        </Section>
      )}

      {active==="Tiempo" && (
        <TiempoTab proyecto={proyecto} updateProject={updateProject} />
      )}

      {active==="Costos" && (
        <>
          <Section title="Cargar gastos">
            <form className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm"
                  onSubmit={(e)=>{e.preventDefault(); addGasto();}} autoComplete="off">
              <input className="border rounded px-2 py-1" type="date"
                     value={gasto.fecha} onChange={e=>setGasto({...gasto,fecha:e.target.value})}/>
              <input className="border rounded px-2 py-1" placeholder="Rubro"
                     value={gasto.rubro} onChange={e=>setGasto({...gasto,rubro:e.target.value})}/>
              <input className="border rounded px-2 py-1" placeholder="Monto"
                     type="number" inputMode="decimal" step="any"
                     value={gasto.monto} onChange={e=>setGasto({...gasto,monto:e.target.value})}/>
              <button className="rounded bg-blue-600 text-white px-3 py-1" type="submit">Agregar</button>
            </form>
            <div className="mt-3 overflow-hidden rounded border">
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
            <form className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm"
                  onSubmit={(e)=>{e.preventDefault(); addHH();}} autoComplete="off">
              <input className="border rounded px-2 py-1" type="date"
                     value={hh.fecha} onChange={e=>setHH({...hh,fecha:e.target.value})}/>
              <input className="border rounded px-2 py-1" placeholder="Recurso"
                     value={hh.recurso} onChange={e=>setHH({...hh,recurso:e.target.value})}/>
              <input className="border rounded px-2 py-1" placeholder="Horas" type="number" inputMode="numeric" step="any"
                     value={hh.horas} onChange={e=>setHH({...hh,horas:e.target.value})}/>
              <input className="border rounded px-2 py-1" placeholder="Tarifa" type="number" inputMode="decimal" step="any"
                     value={hh.tarifa} onChange={e=>setHH({...hh,tarifa:e.target.value})}/>
              <button className="rounded bg-blue-600 text-white px-3 py-1" type="submit">Agregar</button>
            </form>
            <div className="mt-3 overflow-hidden rounded border">
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

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <KPICard label="PV" value={fmtMoney(pv, moneda)} />
            <KPICard label="EV" value={fmtMoney(ev, moneda)} />
            <KPICard label="AC" value={fmtMoney(ac, moneda)} />
            <KPICard label="CPI" value={cpi ? cpi.toFixed(2) : "—"} />
            <KPICard label="SPI" value={spi ? spi.toFixed(2) : "—"} />
            <KPICard label="EAC" value={fmtMoney(eac, moneda)} />
          </div>
        </>
      )}

      {active==="Riesgos" && (
        <Section title="Matriz de riesgos (placeholder)">
          <div className="text-sm text-gray-600">Aquí irá la matriz P×I con owners, planes y seguimiento.</div>
        </Section>
      )}

      {active==="Control de Cambios" && (
        <Section title="Control de cambios (placeholder)">
          <div className="text-sm text-gray-600">Registro y flujo de aprobación de cambios que impactan alcance/costo/plazo.</div>
        </Section>
      )}

      {active==="Recursos" && (
        <Section title="Recursos (placeholder)">
          <div className="text-sm text-gray-600">Plantilla de equipo, roles y dedicaciones. (Se conectará al costo HH).</div>
        </Section>
      )}

      {active==="Calidad" && (
        <Section title="Calidad (placeholder)">
          <div className="text-sm text-gray-600">Criterios de aceptación, checklists y resultados.</div>
        </Section>
      )}

      {active==="Comunicaciones" && (
        <Section title="Comunicaciones (placeholder)">
          <div className="text-sm text-gray-600">Plan de comunicaciones y bitácora.</div>
        </Section>
      )}

      {active==="Compras" && (
        <Section title="Compras (placeholder)">
          <div className="text-sm text-gray-600">Órdenes/contratos, recepción y estado.</div>
        </Section>
      )}

      {active==="Documentos" && (
        <Section title="Documentos por proceso (placeholder)">
          <div className="text-sm text-gray-600">
            Se listarán por grupos de proceso (Inicio, Planificación, Ejecución, Monitoreo/Control, Cierre) con indicador “Pendiente/Completado”.
          </div>
        </Section>
      )}
    </div>
  );
}



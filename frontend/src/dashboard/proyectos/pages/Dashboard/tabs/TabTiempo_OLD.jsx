import React, {useMemo, useState} from "react";
import EDTModal from "./EDTModal";

// --- Gantt simple en SVG con resumen, hitos y flechas ---
function Gantt({tasks}) {
  const rows = tasks.filter(t => t.show !== false);

  const min = useMemo(() => {
    let m = null;
    for (const t of rows) if (t.start && (!m || t.start < m)) m = t.start;
    return m || new Date();
  }, [rows]);

  const max = useMemo(() => {
    let m = null;
    for (const t of rows) if (t.finish && (!m || t.finish > m)) m = t.finish;
    return m || new Date(min.getTime() + 7 * 86400000);
  }, [rows, min]);

  const pxPerDay = 16;
  const dayMs = 86400000;
  const xOf = (d) => ((d - min) / dayMs) * pxPerDay + 160; // margen izq para etiquetas
  const height = rows.length * 28 + 60;

  const indexByItem = new Map(tasks.map((t, i) => [t.item, i]));

  return (
    <svg width="100%" height={height}>
      {/* marcas semanales */}
      {Array.from({ length: Math.ceil((max - min) / dayMs / 7) + 2 }).map((_, k) => {
        const x = xOf(new Date(min.getTime() + k * 7 * dayMs));
        return <line key={k} x1={x} x2={x} y1={10} y2={height} stroke="#eee" />;
      })}

      {/* etiquetas + barras */}
      {rows.map((t, idx) => {
        const y = 22 + idx * 28;
        const x = t.start ? xOf(t.start) : xOf(min);
        const w = t.start && t.finish ? Math.max(6, xOf(t.finish) - x) : 6;
        const color = t.critical ? "#d92c20" : "#19934f";

        return (
          <g key={t.item}>
            <text x={10} y={y + 10} fontSize="12">{t.name}</text>

            {t._isSummary ? (
              <>
                <line x1={x} x2={x + w - 8} y1={y + 6} y2={y + 6} stroke={color} strokeWidth="4" />
                <polyline points={`${x},${y + 6} ${x},${y + 1}`} stroke={color} fill="none" strokeWidth="4" />
                <polyline points={`${x + w - 8},${y + 6} ${x + w - 8},${y + 1}`} stroke={color} fill="none" strokeWidth="4" />
              </>
            ) : t.hito ? (
              <rect x={x - 4} y={y + 2} width="8" height="8" transform={`rotate(45, ${x}, ${y + 6})`} fill={color} />
            ) : (
              <rect x={x} y={y} width={w} height="12" rx="3" fill={color} />
            )}

            {t.finish && (
              <text x={x + w + 6} y={y + 10} fontSize="11" fill="#666">
                {t.finish.toISOString().slice(0, 10)}
              </text>
            )}
          </g>
        );
      })}

      {/* flechas FS/SS/FF/SF */}
      {rows.flatMap((t, idx) => {
        if (!t._preds) return [];
        const yTo = 22 + idx * 28 + 6;

        return t._preds.map((p, k) => {
          const j = indexByItem.get(p.item);
          if (j == null) return null;
          const pred = tasks[j];
          const rowPred = rows.findIndex(r => r.item === pred.item);
          if (rowPred < 0) return null;
          const yFrom = 22 + rowPred * 28 + 6;

          const xStartPred = pred.start ? xOf(pred.start) : xOf(min);
          const xFinishPred = pred.finish ? xOf(pred.finish) : xOf(min);
          const xStartT = t.start ? xOf(t.start) : xOf(min);

          const xFrom = (p.tipo === "SS" || p.tipo === "SF") ? xStartPred : xFinishPred;
          const xTo = (p.tipo === "FS" || p.tipo === "FF") ? xStartT : xStartT;

          const mid = Math.min(xFrom, xTo) - 12;
          return (
            <g key={`${t.item}-${k}`} stroke="#666" fill="none">
              <path d={`M${xFrom},${yFrom} L${mid},${yFrom} L${mid},${yTo} L${xTo - 6},${yTo}`} />
              <polygon points={`${xTo - 6},${yTo - 3} ${xTo - 6},${yTo + 3} ${xTo},${yTo}`} fill="#666" />
            </g>
          );
        });
      })}
    </svg>
  );
}

// --- Timeline simple (no Gantt) ---
function Timeline({ tasks }) {
  const list = tasks.filter(t => t.timeline && t.show !== false);
  if (!list.length) return null;

  const min = list.reduce((m, t) => (t.start && (!m || t.start < m) ? t.start : m), null);
  const max = list.reduce((m, t) => (t.finish && (!m || t.finish > m) ? t.finish : m), null);
  const pxPerDay = 20, dayMs = 86400000;
  const xOf = d => ((d - min) / dayMs) * pxPerDay + 160;
  const height = list.length * 34 + 40;

  return (
    <svg width="100%" height={height} style={{ marginTop: 20 }}>
      {list.map((t, idx) => {
        const y = 12 + idx * 34;
        const x = t.start ? xOf(t.start) : xOf(min);
        const w = t.start && t.finish ? Math.max(4, xOf(t.finish) - x) : 4;
        return (
          <g key={t.item}>
            <text x={10} y={y + 14} fontSize="12">{t.name}</text>
            <rect x={x} y={y + 6} width={w} height="12" rx="6" fill="#2456f6" />
            {t.finish && (
              <text x={x + w + 8} y={y + 16} fontSize="11" fill="#666">
                {t.finish.toISOString().slice(0, 10)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function TabTiempo() {
  const [versiones, setVersiones] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [showModal, setShowModal] = useState(false);

  const tasks = useMemo(
    () => (currentIdx >= 0 ? versiones[currentIdx].tasks : []),
    [versiones, currentIdx]
  );

  const handleSave = (rows, asNew) => {
    const name = asNew
      ? `Cronograma v${versiones.length + 1}`
      : versiones[currentIdx]?.name || "Cronograma v1";

    const pack = { name, tasks: rows };
    let vs = [...versiones];
    if (asNew || currentIdx < 0) vs.push(pack);
    else vs[currentIdx] = pack;

    setVersiones(vs);
    setCurrentIdx(vs.length - 1);
    setShowModal(false);
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 items-center mb-3">
        <button className="btn" onClick={() => setShowModal(true)}>Nueva/editar EDT</button>
        <select className="select" value={currentIdx} onChange={e => setCurrentIdx(Number(e.target.value))}>
          <option value={-1}>— Seleccionar versión —</option>
          {versiones.map((v, i) => (
            <option key={i} value={i}>{v.name}</option>
          ))}
        </select>
      </div>

      {tasks.length === 0 ? (
        <div className="text-gray-500">No hay tareas visibles. Usa “Nueva/editar EDT”.</div>
      ) : (
        <>
          <h3 className="font-semibold mb-2">Diagrama Gantt — {versiones[currentIdx]?.name}</h3>
          <Gantt tasks={tasks} />
          <h3 className="font-semibold mt-6 mb-2">Línea de tiempo (seleccionadas)</h3>
          <Timeline tasks={tasks} />
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded shadow-xl w-[95%] h-[90%] overflow-auto">
            <div className="p-3 border-b flex justify-between items-center">
              <div className="font-semibold">Configurar EDT / Cronograma</div>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <EDTModal
              initial={tasks}
              onSave={handleSave}
              onClose={() => setShowModal(false)}
              projectStart={new Date("2025-10-09")}
            />
          </div>
        </div>
      )}
    </div>
  );
}






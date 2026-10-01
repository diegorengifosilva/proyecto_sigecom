import React, { useEffect, useMemo, useRef, useState } from "react";
import EDTModal from "./EDTModal";
import { cronogramasService } from "../../../api";
import "./TabTiempo.css";

const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return "0d";
  const hours = minutes / 60;
  const days = hours / 8;
  const weeks = days / 5;
  if (weeks >= 1 && Number.isInteger(days / 5)) return `${Math.round(weeks)}w`;
  if (days >= 1 && Number.isInteger(hours / 8)) return `${Math.round(days)}d`;
  if (hours >= 1) return `${Math.round(hours)}h`;
  return `${minutes}m`;
};

const parsePredecesoras = (raw) => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const parts = token.split(":");
      return { item: parseInt(parts[0], 10), tipo: (parts[1] || "FS").toUpperCase() };
    });
};

const parseDurationText = (value) => {
  const match = String(value || "").trim().match(/^(\d+)([dhws])$/i);
  if (!match) return 0;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === "h") return amount * 60;
  if (unit === "d") return amount * 8 * 60;
  if (unit === "w" || unit === "s") return amount * 5 * 8 * 60;
  return 0;
};

function Gantt({ tasks }) {
  const rows = tasks.filter((task) => task.mostrar !== false);

  const min = useMemo(() => {
    let value = null;
    rows.forEach((task) => {
      if (task.inicio) {
        const start = new Date(task.inicio);
        if (!value || start < value) value = start;
      }
    });
    return value || new Date();
  }, [rows]);

  const max = useMemo(() => {
    let value = null;
    rows.forEach((task) => {
      if (task.fin) {
        const finish = new Date(task.fin);
        if (!value || finish > value) value = finish;
      }
    });
    return value || new Date(min.getTime() + 7 * 86400000);
  }, [rows, min]);

  const pxPerDay = 16;
  const dayMs = 86400000;
  const xOf = (date) => ((date - min) / dayMs) * pxPerDay + 160;
  const height = rows.length * 28 + 60;
  const indexByItem = new Map(tasks.map((task, idx) => [task.item, idx]));

  return (
    <svg width="100%" height={height}>
      <defs>
        <marker id="arrow-head" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#6b7280" />
        </marker>
      </defs>

      {Array.from({ length: Math.ceil((max - min) / dayMs / 7) + 2 }).map((_, idx) => {
        const x = xOf(new Date(min.getTime() + idx * 7 * dayMs));
        return <line key={idx} x1={x} x2={x} y1={10} y2={height} stroke="#e5e7eb" />;
      })}

      {rows.map((task, idx) => {
        const y = 22 + idx * 28;
        const x = task.inicio ? xOf(new Date(task.inicio)) : xOf(min);
        const width = task.inicio && task.fin ? Math.max(6, xOf(new Date(task.fin)) - x) : 6;
        const color = task.es_critica ? "#dc2626" : "#19934f";

        return (
          <g key={task.item}>
            <text x={10} y={y + 10} fontSize="11" fill="#111827">
              {task.nombre || `Item ${task.item}`}
            </text>

            {task.es_resumen ? (
              <>
                <line x1={x} x2={x + width - 8} y1={y + 6} y2={y + 6} stroke={color} strokeWidth="4" />
                <polyline points={`${x},${y + 6} ${x},${y + 1}`} stroke={color} fill="none" strokeWidth="4" />
                <polyline
                  points={`${x + width - 8},${y + 6} ${x + width - 8},${y + 1}`}
                  stroke={color}
                  fill="none"
                  strokeWidth="4"
                />
              </>
            ) : task.es_hito ? (
              <rect x={x - 4} y={y + 2} width="8" height="8" transform={`rotate(45, ${x}, ${y + 6})`} fill={color} />
            ) : (
              <rect x={x} y={y} width={width} height="12" rx="3" fill={color} />
            )}

            {task.fin && (
              <text x={x + width + 6} y={y + 10} fontSize="10" fill="#6b7280">
                {new Date(task.fin).toISOString().slice(0, 10)}
              </text>
            )}
          </g>
        );
      })}

      {rows.flatMap((task) => {
        if (!task.predecesoras) return [];
        const preds = parsePredecesoras(task.predecesoras);
        const targetIndex = rows.findIndex((row) => row.item === task.item);
        const yTarget = 22 + targetIndex * 28 + 6;

        return preds.map((pred, idx) => {
          const predIndex = indexByItem.get(pred.item);
          if (predIndex == null) return null;
          const predTask = tasks[predIndex];
          const rowPred = rows.findIndex((row) => row.item === predTask.item);
          if (rowPred < 0) return null;
          const ySource = 22 + rowPred * 28 + 6;

          const startPred = predTask.inicio ? xOf(new Date(predTask.inicio)) : xOf(min);
          const finishPred = predTask.fin ? xOf(new Date(predTask.fin)) : xOf(min);
          const startTask = task.inicio ? xOf(new Date(task.inicio)) : xOf(min);
          const xFrom = pred.tipo === "SS" || pred.tipo === "SF" ? startPred : finishPred;
          const xTo = pred.tipo === "FS" || pred.tipo === "FF" ? startTask : startTask;
          const colorMap = { FS: "#2563eb", SS: "#059669", FF: "#d97706", SF: "#dc2626" };
          const color = colorMap[pred.tipo] || "#6b7280";

          const xBuffer = xTo - 10;
          const d = `M${xFrom} ${ySource}
            L${xBuffer} ${ySource}
            L${xBuffer} ${yTarget}
            L${xTo} ${yTarget}`;

          return (
            <path
              key={`${task.item}-${pred.item}-${idx}`}
              d={d}
              stroke={color}
              strokeWidth="1.4"
              fill="none"
              markerEnd="url(#arrow-head)"
            />
          );
        });
      })}
    </svg>
  );
}

const shortDate = (date) =>
  date.toLocaleDateString("es-PE", {
    month: "short",
    day: "2-digit",
  });

function TimelineMSP({ tasks }) {
  const events = tasks
    .filter((task) => task.timeline || task.es_hito || task.es_resumen)
    .map((task) => ({
      id: task.item,
      nombre: task.nombre || `Item ${task.item}`,
      fecha: task.inicio ? new Date(task.inicio) : task.fin ? new Date(task.fin) : null,
    }))
    .filter((evt) => evt.fecha)
    .sort((a, b) => a.fecha - b.fecha)
    .slice(0, 12);

  if (!events.length) {
    return (
      <div className="timeline-card mt-4">
        <h3 className="font-semibold mb-2 text-gray-800">Línea de tiempo ejecutiva</h3>
        <p className="text-sm text-gray-500">
          Marca algunas tareas con la bandera “Timeline” en el modal de EDT para visualizar un resumen ejecutivo.
        </p>
      </div>
    );
  }

  const min = events[0].fecha;
  const max = events.reduce((acc, evt) => (evt.fecha > acc ? evt.fecha : acc), events[events.length - 1].fecha);
  const total = Math.max(1, max - min);
  const today = new Date();
  const pct = (date) => Math.min(100, Math.max(0, ((date - min) / total) * 100));
  const showToday = today >= min && today <= max;

  return (
    <div className="timeline-card timeline-msp mt-4">
      <h3 className="font-semibold mb-2 text-gray-800">Línea de tiempo ejecutiva</h3>
      <div className="timeline-msp-wrapper">
        <div className="timeline-msp-axis">
          <div className="timeline-msp-line" />
          <div className="timeline-msp-arrow" />
          {showToday && (
            <div className="timeline-msp-today" style={{ left: `${pct(today)}%` }}>
              <span>Hoy</span>
            </div>
          )}
          {events.map((evt, idx) => (
            <div
              key={evt.id}
              className={`timeline-msp-event ${idx % 2 ? "alt" : ""}`}
              style={{ left: `${pct(evt.fecha)}%` }}
            >
              <span className="timeline-event-name">{evt.nombre}</span>
              <span className="timeline-event-date">{shortDate(evt.fecha)}</span>
              <span className="timeline-event-dot" />
            </div>
          ))}
        </div>
        <div className="timeline-msp-footer">
          <div>
            <p className="caption">Inicio</p>
            <p className="date">{shortDate(min)}</p>
          </div>
          <div>
            <p className="caption">Fin</p>
            <p className="date">{shortDate(max)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TabTiempo({ proyecto, updateProject }) {
  const [versiones, setVersiones] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const currentVersionIdRef = useRef(null);
  void updateProject;

  useEffect(() => {
    currentVersionIdRef.current =
      currentIdx >= 0 && versiones[currentIdx] ? versiones[currentIdx].id : null;
  }, [versiones, currentIdx]);

  useEffect(() => {
    if (!proyecto?.id) return;

    const fetchData = async () => {
      setInitializing(true);
      setError(null);
      try {
        const response = await cronogramasService.listarPorProyecto(proyecto.id);
        setVersiones(response.data);
        if (response.data.length) {
          const previousId = currentVersionIdRef.current;
          const idx = previousId
            ? response.data.findIndex((version) => version.id === previousId)
            : 0;
          setCurrentIdx(idx >= 0 ? idx : 0);
        } else {
          setCurrentIdx(-1);
        }
      } catch (err) {
        setError("No se pudo cargar el cronograma: " + (err.response?.data?.error || err.message));
      } finally {
        setInitializing(false);
      }
    };

    fetchData();
  }, [proyecto?.id]);

  const selectedVersion = currentIdx >= 0 ? versiones[currentIdx] : null;

  const tasks = useMemo(() => {
    if (!selectedVersion) return [];
    const list = selectedVersion.tareas || [];
    const mapped = list.map((task) => ({
      item: task.item,
      edt: task.edt || "",
      nivel: task.nivel,
      nombre: task.nombre,
      inicio: task.inicio,
      fin: task.fin,
      duracion: formatDuration(task.duracion_min || 0),
      calendario: task.calendario || "8+1",
      es_hito: task.es_hito || false,
      predecesoras: task.predecesoras || "",
      mostrar: task.mostrar !== false,
      timeline: task.timeline || false,
      es_critica: task.es_critica || false,
      es_resumen: task.es_resumen || false,
    }));

    return mapped.sort((a, b) => {
      const splitA = a.edt.split(".").map(Number);
      const splitB = b.edt.split(".").map(Number);
      for (let i = 0; i < Math.max(splitA.length, splitB.length); i += 1) {
        const valueA = splitA[i] || 0;
        const valueB = splitB[i] || 0;
        if (valueA !== valueB) return valueA - valueB;
      }
      return a.item - b.item;
    });
  }, [selectedVersion]);

  const taskIssues = useMemo(() => {
    const itemSet = new Set(tasks.map((task) => task.item));
    return tasks.map((task) => {
      const issues = [];
      if (!task.nombre) issues.push("Sin nombre");
      if (!task.inicio) issues.push("Sin fecha de inicio");
      if (!task.fin && !task.es_resumen) issues.push("Sin fecha de fin");
      parsePredecesoras(task.predecesoras).forEach((pred) => {
        if (!itemSet.has(pred.item)) issues.push(`Pred ${pred.item} no existe`);
      });
      return issues;
    });
  }, [tasks]);

  const stats = useMemo(() => {
    if (!tasks.length) {
      return { total: 0, criticas: 0, hitos: 0, visibles: 0, periodo: "-" };
    }
    const startDates = tasks.map((task) => (task.inicio ? new Date(task.inicio) : null)).filter(Boolean);
    const endDates = tasks.map((task) => (task.fin ? new Date(task.fin) : null)).filter(Boolean);
    const total = tasks.length;
    const criticas = tasks.filter((task) => task.es_critica).length;
    const hitos = tasks.filter((task) => task.es_hito).length;
    const visibles = tasks.filter((task) => task.mostrar !== false).length;
    const periodo =
      startDates.length && endDates.length
        ? `${startDates.sort((a, b) => a - b)[0].toISOString().slice(0, 10)} / ${
            endDates.sort((a, b) => b - a)[0].toISOString().slice(0, 10)
          }`
        : "-";
    return { total, criticas, hitos, visibles, periodo };
  }, [tasks]);

  const handleSave = async (rows, createNew) => {
    if (!proyecto?.id) {
      setError("No hay proyecto seleccionado");
      return;
    }

    setLoading(true);
    setStatusMessage(createNew ? "Creando nueva versión..." : "Actualizando versión...");
    setError(null);

    try {
      const nombre = createNew ? `Cronograma v${versiones.length + 1}` : selectedVersion?.nombre || "Cronograma";
      const tareasData = rows.map((row) => ({
        item: row.item,
        edt: row.edt || "",
        nivel: row.lvl || 3,
        nombre: row.name || "",
        duracion_min: parseDurationText(row.dur || "1d"),
        calendario: row.cal || "8+1",
        es_hito: !!row.hito,
        predecesoras: row.preds || "",
        mostrar: row.show !== false,
        timeline: !!row.timeline,
        descripcion: "",
      }));

      const payload = { nombre, tareas_data: tareasData, es_activa: true };
      let versionId;

      if (createNew || currentIdx < 0) {
        const response = await cronogramasService.crear(proyecto.id, payload);
        versionId = response.data.id;
      } else {
        versionId = selectedVersion.id;
        await cronogramasService.actualizar(proyecto.id, versionId, payload);
      }

      try {
        await cronogramasService.calcular(proyecto.id, versionId);
      } catch (calcError) {
        console.warn("No se pudo recalcular el cronograma:", calcError);
      }

      const refreshed = await cronogramasService.listarPorProyecto(proyecto.id);
      setVersiones(refreshed.data);
      const newIndex = refreshed.data.findIndex((version) => version.id === versionId);
      setCurrentIdx(newIndex >= 0 ? newIndex : 0);
      setShowModal(false);
    } catch (err) {
      setError("No se pudo guardar la version: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const handleExportMSP = async () => {
    if (!selectedVersion) return;
    setLoading(true);
    setStatusMessage("Generando archivo de MS Project...");
    setError(null);
    try {
      const response = await cronogramasService.exportarMSP(proyecto.id, selectedVersion.id);
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedVersion.nombre.replace(/\s+/g, "_")}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("No se pudo exportar a MS Project: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const handleExportExcel = async () => {
    if (!selectedVersion) return;
    setLoading(true);
    setStatusMessage("Exportando a Excel...");
    setError(null);
    try {
      const response = await cronogramasService.exportarXLSX(proyecto.id, selectedVersion.id);
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedVersion.nombre.replace(/\s+/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("No se pudo exportar a Excel: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const handleDownloadTemplate = async () => {
    setLoading(true);
    setStatusMessage("Descargando plantilla...");
    setError(null);
    try {
      const response = await cronogramasService.descargarPlantilla(proyecto.id);
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Plantilla_Cronograma_${proyecto.codigo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("No se pudo descargar la plantilla: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatusMessage("Importando cronograma...");
    setError(null);
    try {
      const nombre = window.prompt("Nombre de la nueva version", `Importado - ${file.name}`);
      if (!nombre) {
        setLoading(false);
        return;
      }
      await cronogramasService.importarExcel(proyecto.id, file, nombre);
      const refreshed = await cronogramasService.listarPorProyecto(proyecto.id);
      setVersiones(refreshed.data);
      setCurrentIdx(refreshed.data.length - 1);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError("No se pudo importar el archivo: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  if (initializing) {
    return <div className="p-6 text-center text-gray-500">Cargando cronograma...</div>;
  }

  return (
    <div className="p-4 space-y-4 relative">
      {error && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700">
          {error}
          <button className="ml-3 underline" onClick={() => setError(null)}>
            Cerrar
          </button>
        </div>
      )}

      <div className="cronograma-toolbar">
        <button className="btn px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setShowModal(true)}>
          Nueva o editar version
        </button>
        <div className="version-select">
          <span>Version</span>
          <select value={currentIdx} onChange={(e) => setCurrentIdx(Number(e.target.value))}>
            <option value={-1}>Seleccionar version</option>
            {versiones.map((version, idx) => (
              <option key={version.id} value={idx}>
                {version.nombre}
              </option>
            ))}
          </select>
        </div>
        {selectedVersion && (
          <span className={`version-chip ${selectedVersion.es_activa ? "active" : ""}`}>
            {selectedVersion.es_activa ? "Activa" : "Historica"}
          </span>
        )}
        <div className="flex flex-wrap gap-2 ml-auto">
          <button className="btn px-3 py-2 border rounded" onClick={handleExportMSP} disabled={!selectedVersion}>
            Exportar MS Project
          </button>
          <button className="btn px-3 py-2 border rounded" onClick={handleExportExcel} disabled={!selectedVersion}>
            Exportar Excel
          </button>
          <button className="btn px-3 py-2 border rounded" onClick={handleDownloadTemplate}>
            Descargar plantilla
          </button>
          <label className="btn px-3 py-2 border rounded cursor-pointer">
            Importar
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".xlsx,.xls"
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      {selectedVersion ? (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="label">Tareas totales</div>
              <div className="value">{stats.total}</div>
              <div className="hint">{stats.visibles} visibles</div>
            </div>
            <div className="kpi-card">
              <div className="label">Ruta critica</div>
              <div className="value">{stats.criticas}</div>
              <div className="hint">Elementos marcados como criticos</div>
            </div>
            <div className="kpi-card">
              <div className="label">Hitos</div>
              <div className="value">{stats.hitos}</div>
              <div className="hint">Eventos de control</div>
            </div>
            <div className="kpi-card">
              <div className="label">Periodo</div>
              <div className="value text-base">{stats.periodo}</div>
              <div className="hint">Rango planificado</div>
            </div>
          </div>

          <div className="cronograma-table-wrapper">
            <table className="cronograma-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>EDT</th>
                  <th>Nombre</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Duracion</th>
                  <th>Calendario</th>
                  <th>Pred</th>
                  <th>Bandera</th>
                  <th>Alertas</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) => {
                  const issues = taskIssues[idx];
                  return (
                    <tr key={task.item} className={task.es_critica ? "is-critical" : ""}>
                      <td>{task.item}</td>
                      <td>{task.edt || "-"}</td>
                      <td>
                        <div className="font-semibold text-gray-800">{task.nombre || "Sin nombre"}</div>
                        <div className="text-xs text-gray-500">Nivel {task.nivel}</div>
                      </td>
                      <td>{task.inicio ? new Date(task.inicio).toISOString().slice(0, 10) : "-"}</td>
                      <td>{task.fin ? new Date(task.fin).toISOString().slice(0, 10) : "-"}</td>
                      <td>{task.duracion}</td>
                      <td>{task.calendario}</td>
                      <td>{task.predecesoras || "-"}</td>
                      <td>
                        {task.es_hito && <span className="timeline-badge">Hito</span>}
                        {task.timeline && <span className="timeline-badge ml-1">Timeline</span>}
                      </td>
                      <td>
                        {issues.length > 0 ? (
                          <span className="issue-badge">{issues[0]}</span>
                        ) : (
                          <span className="text-xs text-green-700">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="gantt-card">
            <h3 className="font-semibold mb-2 text-gray-800">Diagrama Gantt</h3>
            <Gantt tasks={tasks} />
          </div>

          <TimelineMSP tasks={tasks} />
        </>
      ) : (
        <div className="bg-white border rounded p-6 text-center text-gray-500">
          No hay versiones registradas. Crea la primera para comenzar a planificar.
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-6xl max-h-[95vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Configurar EDT / Cronograma</h3>
                <p className="text-sm text-gray-500">Proyecto: {proyecto?.nombre || proyecto?.codigo}</p>
              </div>
              <button className="text-gray-500 hover:text-gray-800" onClick={() => setShowModal(false)}>
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <EDTModal
                initial={tasks}
                projectStart={new Date(proyecto?.fecha_inicio || new Date())}
                onSave={handleSave}
                onClose={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-cover">
          <div className="loading-card">
            <span className="loader-dot" />
            <span>{statusMessage || "Procesando..."}</span>
          </div>
        </div>
      )}
    </div>
  );
}





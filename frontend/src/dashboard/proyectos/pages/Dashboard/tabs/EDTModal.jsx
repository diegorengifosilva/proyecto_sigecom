import React, { useMemo, useRef, useState } from "react";
import { format, addMinutes } from "date-fns";
import "./TabTiempo.css";

const CALENDARS = {
  "8+1": {
    days: { 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
    shifts: [
      { start: 9 * 60, end: 13 * 60 },
      { start: 14 * 60, end: 18 * 60 },
    ],
    satShifts: [{ start: 9 * 60, end: 13 * 60 }],
  },
  "10": {
    days: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
    shifts: [{ start: 8 * 60, end: 18 * 60 }],
    satShifts: null,
  },
  "12": {
    days: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
    shifts: [{ start: 7 * 60, end: 19 * 60 }],
    satShifts: null,
  },
};

const DUR_RX = /^(\d+)([dhws])$/i;
const LAG_RX = /([+-]\d+[dhws])$/i;

const fmtDate = (value) => (value ? format(new Date(value), "yyyy-MM-dd") : "");

const parseDurationToMinutes = (raw) => {
  if (!raw) return 0;
  const match = String(raw).trim().match(DUR_RX);
  if (!match) return 0;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === "h") return amount * 60;
  if (unit === "d") return amount * 8 * 60;
  if (unit === "w" || unit === "s") return amount * 5 * 8 * 60;
  return 0;
};

const nextWorkingStart = (date, calKey) => {
  const cal = CALENDARS[calKey] || CALENDARS["8+1"];
  let dt = new Date(date);

  while (true) {
    const day = dt.getDay();
    const workingToday = !!cal.days[day];
    const shifts = day === 6 && cal.satShifts ? cal.satShifts : cal.shifts;

    if (!workingToday) {
      dt.setDate(dt.getDate() + 1);
      dt.setHours(0, 0, 0, 0);
      continue;
    }

    const minutes = dt.getHours() * 60 + dt.getMinutes();
    for (const shift of shifts) {
      if (minutes <= shift.start) {
        dt.setHours(0, 0, 0, 0);
        return addMinutes(dt, shift.start);
      }
      if (minutes >= shift.start && minutes < shift.end) {
        return dt;
      }
    }

    dt.setDate(dt.getDate() + 1);
    dt.setHours(0, 0, 0, 0);
  }
};

const addWorkMinutes = (start, minutesToAdd, calKey) => {
  if (!start) return null;
  if (minutesToAdd <= 0) return new Date(start);
  const cal = CALENDARS[calKey] || CALENDARS["8+1"];
  let dt = nextWorkingStart(start, calKey);
  let remaining = minutesToAdd;

  while (remaining > 0) {
    const day = dt.getDay();
    const shifts = day === 6 && cal.satShifts ? cal.satShifts : cal.shifts;
    const minutes = dt.getHours() * 60 + dt.getMinutes();

    let segStart = null;
    let segEnd = null;
    for (const shift of shifts) {
      if (minutes <= shift.start) {
        segStart = shift.start;
        segEnd = shift.end;
        dt.setHours(0, 0, 0, 0);
        dt = addMinutes(dt, segStart);
        break;
      }
      if (minutes >= shift.start && minutes < shift.end) {
        segStart = minutes;
        segEnd = shift.end;
        break;
      }
    }

    if (segStart === null) {
      dt.setDate(dt.getDate() + 1);
      dt.setHours(0, 0, 0, 0);
      dt = nextWorkingStart(dt, calKey);
      continue;
    }

    const slot = segEnd - segStart;
    const take = Math.min(remaining, slot);
    dt = addMinutes(dt, take);
    remaining -= take;

    if (remaining > 0) {
      dt.setDate(dt.getDate() + 1);
      dt.setHours(0, 0, 0, 0);
      dt = nextWorkingStart(dt, calKey);
    }
  }

  return dt;
};

const parsePreds = (raw) => {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      let item;
      let tipo = "FS";
      let lagMin = 0;
      const lagMatch = token.match(LAG_RX);
      if (lagMatch) {
        lagMin = parseDurationToMinutes(lagMatch[0]);
        token = token.replace(LAG_RX, "").trim();
      }
      const parts = token.split(":");
      item = parseInt(parts[0], 10);
      if (parts[1]) tipo = parts[1].toUpperCase();
      return { item, tipo, lagMin };
    });
};

const computeSchedule = (rows, projectStart) => {
  const idxByItem = new Map(rows.map((row, idx) => [row.item, idx]));
  const es = new Array(rows.length).fill(null);
  const ef = new Array(rows.length).fill(null);

  const ordered = [...rows].sort((a, b) => a.item - b.item);
  for (const row of ordered) {
    const index = idxByItem.get(row.item);
    if (row._isSummary) continue;

    const cal = row.cal || "8+1";
    let start = row.start ? new Date(row.start) : new Date(projectStart);

    for (const pred of row._preds) {
      const predIdx = idxByItem.get(pred.item);
      if (predIdx == null) continue;
      const predStart = es[predIdx];
      const predFinish = ef[predIdx];
      if (!predStart || !predFinish) continue;

      let candidate = start;
      if (pred.tipo === "FS" || pred.tipo === "SF") {
        candidate = addWorkMinutes(predFinish, pred.lagMin, cal);
      } else if (pred.tipo === "SS") {
        candidate = addWorkMinutes(predStart, pred.lagMin, cal);
      } else if (pred.tipo === "FF") {
        const finish = addWorkMinutes(predFinish, pred.lagMin, cal);
        const duration = row.hito ? 0 : parseDurationToMinutes(row.dur || "0d");
        candidate = addWorkMinutes(finish, -duration, cal);
      }

      if (candidate && candidate > start) {
        start = candidate;
      }
    }

    const durationMinutes = row.hito ? 0 : parseDurationToMinutes(row.dur || "0d");
    const finish = addWorkMinutes(start, durationMinutes, cal);

    es[index] = start;
    ef[index] = finish;
  }

  const result = rows.map((row, idx) => ({ ...row }));
  result.forEach((row, idx) => {
    row.start = es[idx] || row.start;
    row.finish = ef[idx] || row.finish;
  });
  return result;
};

const createRow = (item) => ({
  item,
  edt: "",
  lvl: 3,
  name: "",
  start: "",
  finish: "",
  dur: "1d",
  cal: "8+1",
  hito: false,
  preds: "",
  timeline: false,
  show: true,
});

export default function EDTModal({ initial, onClose, onSave, projectStart }) {
  const hydrated = (initial || []).map((row, idx) => ({
    ...row,
    item: row.item || idx + 1,
    lvl: row.lvl || row.nivel || 3,
    name: row.name || row.nombre || "",
    start: row.start ? fmtDate(row.start) : row.inicio ? fmtDate(row.inicio) : "",
    finish: row.finish ? fmtDate(row.finish) : row.fin ? fmtDate(row.fin) : "",
    cal: row.cal || row.calendario || "8+1",
    dur: row.dur || (row.duracion_min ? `${Math.max(1, row.duracion_min / 480)}d` : "1d"),
    preds: row.preds || row.predecesoras || "",
    timeline: row.timeline || false,
    show: row.show !== false,
  }));

  const [rows, setRows] = useState(hydrated);
  const nextItem = useRef(Math.max(0, ...rows.map((row) => Number(row.item) || 0)) + 1);
  const fileRef = useRef(null);

  const prepared = useMemo(() => {
    const enriched = rows.map((row) => ({
      ...row,
      item: Number(row.item) || 0,
      edt: row.edt || "",
      lvl: Number(row.lvl || 3),
      cal: row.cal || "8+1",
      dur: row.dur || "1d",
      preds: row.preds || "",
      hito: !!row.hito,
      show: row.show !== false,
      timeline: !!row.timeline,
      start: row.start ? new Date(row.start) : null,
      finish: row.finish ? new Date(row.finish) : null,
      _preds: parsePreds(row.preds),
      _childrenIdx: [],
    }));

    const stack = [];
    enriched.forEach((row, idx) => {
      row._childrenIdx = [];
      while (stack.length && enriched[stack.at(-1)].lvl >= row.lvl) stack.pop();
      if (stack.length) enriched[stack.at(-1)]._childrenIdx.push(idx);
      stack.push(idx);
    });

    enriched.forEach((row) => {
      if (row.lvl <= 2) row._isSummary = true;
      else if (row.lvl === 3 && row._childrenIdx.length > 0) row._isSummary = true;
      else row._isSummary = false;
    });

    return enriched;
  }, [rows]);

  const scheduled = useMemo(() => computeSchedule(prepared, projectStart || new Date()), [prepared, projectStart]);

  const issueMap = useMemo(() => {
    const itemSet = new Set(prepared.map((row) => row.item));
    return prepared.map((row) => {
      const issues = [];
      if (!row.name || !row.name.trim()) issues.push("Nombre requerido");
      if (!row.dur || !DUR_RX.test(row.dur)) issues.push("Duracion invalida");
      row._preds.forEach((pred) => {
        if (!itemSet.has(pred.item)) {
          issues.push(`Pred ${pred.item} no existe`);
        }
      });
      return issues;
    });
  }, [prepared]);

  const handleAdd = () => {
    setRows((prev) => [...prev, createRow(nextItem.current++)]);
  };

  const handleDuplicate = (index) => {
    setRows((prev) => {
      const clone = { ...prev[index], item: nextItem.current++ };
      return [...prev.slice(0, index + 1), clone, ...prev.slice(index + 1)];
    });
  };

  const handleUpdate = (index, patch) => {
    setRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const handleRemove = (index) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleExportXLSX = async () => {
    const { default: ExcelJS } = await import("exceljs");
    const data = rows.map((row) => ({
      Item: row.item,
      EDT: row.edt,
      Nivel: row.lvl,
      "Nombre de Tarea": row.name,
      Comienzo: row.start,
      Fin: row.finish,
      Duracion: row.dur,
      Calendario: row.cal,
      Hito: row.hito ? 1 : 0,
      Predecesoras: row.preds,
      Timeline: row.timeline ? 1 : 0,
      Mostrar: row.show ? 1 : 0,
    }));
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("EDT");
    worksheet.columns = Object.keys(data[0] || { Item: '' }).map((header) => ({ header, key: header, width: 20 }));
    worksheet.addRows(data);
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Plantilla_EDT.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateTemplate = () => {
    setRows([
      { item: 1, edt: "1", lvl: 1, name: "Proyecto", dur: "0d", cal: "8+1", hito: false, preds: "", timeline: false, show: true },
      { item: 2, edt: "1.1", lvl: 2, name: "Inicio", dur: "0d", cal: "8+1", hito: false, preds: "", timeline: false, show: true },
      { item: 3, edt: "1.1.1", lvl: 3, name: "Acta", dur: "1d", cal: "8+1", hito: false, preds: "2:FS", timeline: false, show: true },
      { item: 4, edt: "1.1.2", lvl: 3, name: "Kickoff", dur: "1d", cal: "8+1", hito: false, preds: "3:FS", timeline: true, show: true },
    ]);
    nextItem.current = 5;
  };

  const handleImportXLSX = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) return;
      const headers = sheet.getRow(1).values;
      const json = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const record = {};
        row.eachCell((cell, columnNumber) => { record[String(headers[columnNumber] ?? '')] = cell.value; });
        json.push(record);
      });
      const normalized = json.map((row, idx) => ({
        item: Number(row.Item ?? idx + 1),
        edt: String(row.EDT ?? ""),
        lvl: Number(row.Nivel ?? 3),
        name: String(row["Nombre de Tarea"] ?? ""),
        start: row.Comienzo ? fmtDate(row.Comienzo) : "",
        finish: row.Fin ? fmtDate(row.Fin) : "",
        dur: String(row.Duracion ?? "1d"),
        cal: String(row.Calendario ?? "8+1"),
        hito: row.Hito === 1 || row.Hito === true,
        preds: String(row.Predecesoras ?? ""),
        timeline: row.Timeline === 1 || row.Timeline === true,
        show: !(row.Mostrar === 0 || row.Mostrar === false),
      }));
      nextItem.current = Math.max(1, ...normalized.map((r) => Number(r.item))) + 1;
      setRows(normalized);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = (createNew) => {
    const clean = scheduled.map((row) => ({
      item: row.item,
      edt: row.edt,
      lvl: row.lvl,
      name: row.name,
      start: row.start,
      finish: row.finish,
      dur: row.dur,
      cal: row.cal,
      hito: row.hito,
      preds: row.preds,
      show: row.show,
      timeline: row.timeline,
      _isSummary: row._isSummary,
      _preds: row._preds,
    }));
    onSave?.(clean, createNew);
  };

  return (
    <div className="p-4">
      <div className="edt-toolbar">
        <button className="btn px-3 py-2 bg-blue-600 text-white rounded" onClick={handleAdd}>
          + Agregar fila
        </button>
        <button className="btn px-3 py-2 border rounded" onClick={handleGenerateTemplate}>
          Plantilla sugerida
        </button>
        <button className="btn px-3 py-2 border rounded" onClick={handleExportXLSX}>
          Exportar XLSX
        </button>
        <label className="btn px-3 py-2 border rounded cursor-pointer">
          Importar XLSX
          <input type="file" accept=".xlsx,.xls" ref={fileRef} onChange={handleImportXLSX} style={{ display: "none" }} />
        </label>
      </div>

      <div className="edt-table-wrapper">
        <table className="edt-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>EDT</th>
              <th>Nivel</th>
              <th>Nombre</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Duracion</th>
              <th>Calendario</th>
              <th>Hito</th>
              <th>Timeline</th>
              <th>Mostrar</th>
              <th>Predecesoras</th>
              <th>Alertas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const issues = issueMap[idx];
              return (
                <tr key={row.item || idx} className={issues.length ? "has-issue" : ""}>
                  <td>
                    <input type="number" value={row.item} onChange={(e) => handleUpdate(idx, { item: Number(e.target.value) })} />
                  </td>
                  <td>
                    <input value={row.edt} onChange={(e) => handleUpdate(idx, { edt: e.target.value })} />
                  </td>
                  <td>
                    <select value={row.lvl} onChange={(e) => handleUpdate(idx, { lvl: Number(e.target.value) })}>
                      {[1, 2, 3, 4].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input value={row.name} onChange={(e) => handleUpdate(idx, { name: e.target.value })} />
                  </td>
                  <td>
                    <input type="date" value={row.start} onChange={(e) => handleUpdate(idx, { start: e.target.value })} />
                  </td>
                  <td>
                    <input type="date" value={row.finish} onChange={(e) => handleUpdate(idx, { finish: e.target.value })} />
                  </td>
                  <td>
                    <input value={row.dur} onChange={(e) => handleUpdate(idx, { dur: e.target.value })} />
                  </td>
                  <td>
                    <select value={row.cal} onChange={(e) => handleUpdate(idx, { cal: e.target.value })}>
                      {Object.keys(CALENDARS).map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={row.hito} onChange={(e) => handleUpdate(idx, { hito: e.target.checked })} />
                  </td>
                  <td>
                    <input type="checkbox" checked={row.timeline} onChange={(e) => handleUpdate(idx, { timeline: e.target.checked })} />
                  </td>
                  <td>
                    <input type="checkbox" checked={row.show} onChange={(e) => handleUpdate(idx, { show: e.target.checked })} />
                  </td>
                  <td>
                    <input value={row.preds} onChange={(e) => handleUpdate(idx, { preds: e.target.value })} />
                  </td>
                  <td>
                    {issues.length > 0 && <div className="edt-issue">{issues[0]}</div>}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="texto-link" onClick={() => handleDuplicate(idx)}>
                        Duplicar
                      </button>
                      <button className="texto-link" onClick={() => handleRemove(idx)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 mt-2">
        Duracion admite formatos 4h, 5d, 2w. Las predecesoras siguen el formato Item:Tipo+Lag (ej. "12:FS+1d").
      </div>

      <div className="flex gap-2 justify-end mt-4">
        <button className="btn border px-4 py-2 rounded" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn border px-4 py-2 rounded" onClick={() => handleSave(true)}>
          Guardar como nueva version
        </button>
        <button className="btn bg-blue-600 text-white px-4 py-2 rounded" onClick={() => handleSave(false)}>
          Guardar version
        </button>
      </div>
    </div>
  );
}





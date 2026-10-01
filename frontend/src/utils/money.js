/**
 * Aritmética monetaria estilo Excel ROUND (half up / half away from 0).
 * Evita el error IEEE de toFixed/Math.round sobre floats (77.015 → 77.01).
 */

export function roundMoney(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const exp = decimals | 0;
  if (exp < 0) return n;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  // toPrecision neutraliza 41.994999999… / 41.9950000001 para ROUND half-up tipo Excel.
  const normalized = Number(abs.toPrecision(15));
  const shifted = Number(`${normalized}e${exp}`);
  if (!Number.isFinite(shifted)) return 0;
  const rounded = Math.round(shifted);
  return sign * Number(`${rounded}e-${exp}`);
}

export function toCents(value) {
  return Math.round(roundMoney(value) * 100);
}

export function fromCents(cents) {
  return roundMoney((Number(cents) || 0) / 100);
}

export function addMoney(...values) {
  return fromCents(values.reduce((acc, v) => acc + toCents(v), 0));
}

export function sumMoney(values) {
  if (!Array.isArray(values)) return 0;
  return fromCents(values.reduce((acc, v) => acc + toCents(v), 0));
}

export function mulMoney(a, b) {
  const x = Number(a) || 0;
  const y = Number(b) || 0;
  if (Number.isInteger(y)) return fromCents(toCents(x) * y);
  if (Number.isInteger(x)) return fromCents(toCents(y) * x);
  return roundMoney(x * y);
}

/** ROUND(base * pct / 100, 2) */
export function pctOf(base, pct) {
  return roundMoney((Number(base) || 0) * ((Number(pct) || 0) / 100));
}

/**
 * Total de línea desde precio unitario ya redondeado: ROUND(precio * qty, 2).
 */
export function moneyTotal(unit, qty) {
  return mulMoney(unit, qty);
}

/**
 * Total de línea estilo Excel: ROUND(base * (1 + pct/100) * qty, 2).
 * Coincide con =REDONDEAR(costo*(1+utilidad/100)*cantidad; 2).
 */
export function moneyTotalConPorcentaje(base, porcentaje, qty) {
  const b = Number(base) || 0;
  const p = Number(porcentaje) || 0;
  const q = Number(qty) || 0;
  return roundMoney(b * (1 + p / 100) * q);
}

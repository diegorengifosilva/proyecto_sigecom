import {
  roundMoney,
  addMoney,
  moneyTotal,
} from "./money";

/**
 * Utilidad unitaria bidireccional:
 * - origen "monto": el usuario tipeó el importe; se deriva el % y el monto no se vuelve a calcular.
 * - origen "porcentaje": el usuario tipeó el %; se deriva el monto.
 * - origen "conservar": no se toca el par (solo se redondea para mostrar).
 */
export function aplicarUtilidadBidireccional(costo, monto, porcentaje, origen) {
  const c = Number(costo) || 0;
  let m = Number(monto);
  if (!Number.isFinite(m)) m = 0;
  let p = Number(porcentaje);
  if (!Number.isFinite(p)) p = 0;
  if (p > 100) p = 100;
  if (p < 0) p = 0;
  if (m < 0) m = 0;

  if (origen === "monto") {
    if (c > 0 && m > c) m = c;
    p = c > 0 ? (m / c) * 100 : 0;
  } else if (origen === "porcentaje") {
    m = c * (p / 100);
  }

  return {
    utilidad: roundMoney(m),
    porcentaje: roundMoney(p),
  };
}

export function origenUtilidadDesdeCampo(field) {
  if (field === "utilidad") return "monto";
  if (field === "porcentaje" || field === "porcentaje_utilidad") return "porcentaje";
  if (
    field === "costo_hombre_dia" ||
    field === "costo_precio" ||
    field === "costo_envio" ||
    field === "costo_con_envio"
  ) {
    return null;
  }
  return "conservar";
}

/**
 * Totales de un ítem de suministro. Si el origen es %, el total de línea usa
 * ROUND(costo*(1+%/100)*qty) como Excel; el precio unitario se muestra redondeado.
 */
export function aplicarTotalesSuministro({
  costoPrecio,
  cantidad,
  costoEnvio = 0,
  porcentajeEnvio = 0,
  utilidad,
  porcentaje,
  origen,
}) {
  const costo = roundMoney(costoPrecio);
  const envio = roundMoney(costoEnvio);
  const qty = Number(cantidad) || 0;
  const costoConEnvio = addMoney(costo, envio);
  const resolved = aplicarUtilidadBidireccional(costoConEnvio, utilidad, porcentaje, origen);
  const precioVenta = addMoney(costoConEnvio, resolved.utilidad);
  const ventaTotal = moneyTotal(precioVenta, qty);

  return {
    costo_envio: envio,
    porcentaje_envio: roundMoney(porcentajeEnvio),
    costo_con_envio: costoConEnvio,
    utilidad: resolved.utilidad,
    porcentaje_utilidad: resolved.porcentaje,
    precio_venta: precioVenta,
    venta_total: ventaTotal,
    costo_total: moneyTotal(costo, qty),
  };
}

/**
 * Totales de un ítem de servicio (mano de obra / otros). Misma regla de %.
 */
export function aplicarTotalesServicio({
  costoUnit,
  totalUnits,
  utilidad,
  porcentaje,
  origen,
}) {
  const costo = roundMoney(costoUnit);
  const units = Number(totalUnits) || 0;
  const resolved = aplicarUtilidadBidireccional(costo, utilidad, porcentaje, origen);
  const cotizadoUnit = addMoney(costo, resolved.utilidad);
  const cotizadoTotal = moneyTotal(cotizadoUnit, units);

  return {
    utilidad: resolved.utilidad,
    porcentaje: resolved.porcentaje,
    costo_total: moneyTotal(costo, units),
    cotizado_hombre_dia: cotizadoUnit,
    cotizado_total: cotizadoTotal,
  };
}

import api from "@/services/api";
import { roundMoney, moneyTotal } from "@/utils/money";

const toNumber = (v) => Number(v) || 0;

// =====================
// NORMALIZADORES
// =====================
export const normalizarRittal = (item, tcamb = 3.355, cantidad = 1, tpr, proveedor) => {
  const precioVenta = item.precio_s ? toNumber(item.precio_s) / tcamb : 0;
  const costoPrecio = precioVenta * 0.62;
  const utilidad = precioVenta - costoPrecio;

  return {
    tpr, // 👈 CLAVE
    proveedor, // 👈 viene del XLS, no es la marca
    codigo: item._originalCodigo ?? item.cod ?? item.codigo ?? item.ocodigo ?? "",
    descripcion: item.nombre ?? "",
    marca: item.marca ?? item.proveedor ?? "",
    unidad: item.unidad ?? "UNI",
    cantidad,
    costoPrecio: roundMoney(costoPrecio),
    utilidad: roundMoney(utilidad),
    porcentaje: costoPrecio ? roundMoney((utilidad / costoPrecio) * 100) : 0,
    costoTotal: moneyTotal(costoPrecio, cantidad),
    ventaPrecio: roundMoney(precioVenta),
    ventaTotal: moneyTotal(precioVenta, cantidad),
    utilidadTotal: moneyTotal(utilidad, cantidad),
  };
};

export const normalizarPhoenix = (item, tcamb = 3.355, cantidad = 1, tpr, proveedor) => {
  const precioLista = item.precio ? toNumber(item.precio) / tcamb : 0;
  if (!precioLista) return null;

  let factorCosto = 0.67;
  let factorGranCliente = 0.76;

  const precioCosto = roundMoney(precioLista * factorCosto);

  return {
    tpr, // 👈 CLAVE
    proveedor, // 👈 viene del XLS, no es la marca
    codigo: item.codigo,
    descripcion: item.descripcion ?? "",
    marca: item.proveedor ?? "",
    unidad: item.pgc ?? "UNI",
    cantidad,
    costoPrecio: precioCosto,
    utilidad: 0,
    porcentaje: 0,
    costoTotal: precioCosto * cantidad,
    ventaPrecio: precioCosto,
    ventaTotal: precioCosto * cantidad,
    utilidadTotal: 0,
    precioLista,
    granCliente: roundMoney(precioLista * factorGranCliente),
    usuario: precioCosto,
  };
};

export const normalizarAlmLista = (item, tcamb = 3.355, cantidad = 1, tpr, proveedor) => {
  const precioLista = item.precio_d
    ? toNumber(item.precio_d)
    : item.precio_s
      ? toNumber(item.precio_s) / tcamb
      : 0;

  let costo = precioLista;

  if (
    item.proveedor === "LS Industrial Systems" ||
    item.proveedor === "Schneider"
  ) {
    costo = precioLista * 0.65;
  }

  const utilidad = precioLista - costo;

  return {
    tpr, // 👈 CLAVE
    proveedor, // 👈 viene del XLS, no es la marca
    codigo: item.codigo,
    descripcion: item.nombre ?? "",
    marca: item.proveedor ?? "",
    unidad: item.um ?? "UNI",
    cantidad,
    costoPrecio: roundMoney(costo),
    utilidad: roundMoney(utilidad),
    porcentaje: costo ? roundMoney((utilidad / costo) * 100) : 0,
    costoTotal: moneyTotal(costo, cantidad),
    ventaPrecio: roundMoney(precioLista),
    ventaTotal: moneyTotal(precioLista, cantidad),
    utilidadTotal: moneyTotal(utilidad, cantidad),
  };
};

export const normalizarOtros = (item, tcamb = 3.355, cantidad = 1, tpr, proveedor) => {
  const precio = item.precio_d
    ? toNumber(item.precio_d)
    : item.precio_s
      ? toNumber(item.precio_s) / tcamb
      : 0;

  return {
    tpr, // 👈 CLAVE
    proveedor, // 👈 viene del XLS, no es la marca
    codigo: item.codigo,
    descripcion: item.nombre ?? "",
    marca: item.proveedor ?? "Otros",
    unidad: item.um ?? "UNI",
    cantidad,
    costoPrecio: precio,
    utilidad: 0,
    porcentaje: 0,
    costoTotal: precio * cantidad,
    ventaPrecio: precio,
    ventaTotal: precio * cantidad,
    utilidadTotal: 0,
  };
};

export const normalizarRockwell = (item, tcamb = 1, cantidad = 1, tpr, proveedor) => {
  const precioLista = item.precio ? toNumber(item.precio) / tcamb : 0;

  const costoPrecio = precioLista;
  const utilidad = 0;

  return {
    tpr, // 👈 CLAVE
    proveedor, // 👈 viene del XLS, no es la marca
    codigo: item._originalCodigo ?? item.codigo ?? item.codigo2 ?? "",
    descripcion: item.descripcion ?? item.ds ?? "",
    marca: item.proveedor ?? "",
    unidad: item.pgc ?? "UNI",
    cantidad,
    costoPrecio: roundMoney(costoPrecio),
    utilidad: roundMoney(utilidad),
    porcentaje: 0,
    costoTotal: moneyTotal(costoPrecio, cantidad),
    ventaPrecio: roundMoney(costoPrecio),
    ventaTotal: moneyTotal(costoPrecio, cantidad),
    utilidadTotal: 0,
  };
};

// =====================
// CALCULO UNICO
// =====================
export const calcularItemSegunProveedor = (item, proveedor, tcamb, cantidad) => {
  switch (proveedor) {
    case "03": return normalizarRittal(item, tcamb, cantidad);
    case "02":
    case "05": return normalizarPhoenix(item, tcamb, cantidad);
    case "01": return normalizarRockwell(item, tcamb, cantidad);
    case "06": return normalizarAlmLista(item, tcamb, cantidad);
    case "07": return normalizarAlmLista(item, tcamb, cantidad);
    default: return normalizarOtros(item, tcamb, cantidad);
  }
};

// =====================
// RESOLVER ENDPOINT (UNICO)
// =====================
export const resolverEndpointPorProveedor = (proveedor) => ({
  "01": "/cotizaciones/rockwell/",
  "03": "/cotizaciones/rittal/",
  "05": "/cotizaciones/ceyesa/",
  "06": "/cotizaciones/alm-articulos/?proveedor=Schneider",
  "07": "/cotizaciones/alm-articulos/?proveedor=LS Industrial Systems",
  "99": "/cotizaciones/alm-articulos/?proveedor=OTROS",
}[proveedor] ?? null);

export const resolverEndpointPorCodigo = async (codigo) => {
  const proveedores = ["01", "03", "05", "06", "07"];
  const key = String(codigo).trim().toUpperCase();
  if (!key || ["S/C", "."].includes(key)) return "99";

  try {
    const promesas = proveedores.map(async (tpr) => {
      const endpoint = resolverEndpointPorProveedor(tpr);
      if (!endpoint) return null;
      try {
        const res = await api.get(endpoint, { params: { search: key, limit: 5 } });
        const rows = Array.isArray(res.data) ? res.data : [];
        const match = rows.some(r =>
          String(r.codigo || "").trim().toUpperCase() === key ||
          String(r.ocodigo || "").trim().toUpperCase() === key ||
          String(r.codigo2 || "").trim().toUpperCase() === key
        );
        if (match) return tpr;
      } catch (_) {}
      return null;
    });

    const resultados = await Promise.all(promesas);
    const encontrado = resultados.find(res => res !== null);
    return encontrado || "99";
  } catch (_) {
    return "99";
  }
};

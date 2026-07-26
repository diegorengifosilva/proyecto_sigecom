import React, { useState, useEffect } from "react";
import api from "@/services/api";
import SelectField from "../../components/ui/SelectField";
import InputField from "../../components/ui/InputField";
import { PackageSearch, ChevronsRight, Calculator, TrendingUp, Tag } from "lucide-react";
import CodigoItemSuministroModal from "./CodigoItemSuministroModal";
import { calcularItemSegunProveedor } from "./tables/tablaUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function RegistroItemModal({ open, onClose, onConfirm, item, num_reg, tipoVenta, costoEnvioGrupo = 0, sumaVentaGrupo = 0 }) {
  const toNumber = v => Number(v) || 0;
  const [proveedores, setProveedores] = useState([]);
  const [tcamb, setTcamb] = useState(1);
  const [codigoItemOpen, setCodigoItemOpen] = useState(false);
  const [endpointCodigoItem, setEndpointCodigoItem] = useState(null);

  const getEmptyForm = () => ({
    id: null,
    num: null,
    proveedor: "",
    codigo: "",
    descripcion: "",
    marca: "",
    unidad: "UNI",
    cantidad: 1,
    costoPrecio: "",
    costoEnvio: 0,
    porcentajeEnvio: 0,
    porcentaje: 20,
    utilidad: "",
    costoTotal: "",
    costoConEnvio: "",
    ventaPrecio: "",
    ventaTotal: "",
    utilidadTotal: "",
    entrega: "",
    entrega_uni: "D",
    observacion: "",
  });

  const [form, setForm] = useState(getEmptyForm());
  const resetForm = () => setForm(getEmptyForm());

  useEffect(() => {
    if (open) {
      console.log("SUMA:", sumaVentaGrupo);
    }
  }, [open, tipoVenta]);

  // =====================
  // FETCH TCAMB
  // =====================
  useEffect(() => {
    if (!open || !num_reg) return;

    const fetchCotizacion = async () => {
      const res = await api.get(`/cotizaciones/cotizacion_detalle/${num_reg}/`);
      setTcamb(Number(res.data.tcamb) || 1);
    };
    fetchCotizacion();
  }, [open, num_reg]);

  // =====================
  // FETCH PROVEEDORES
  // =====================
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const res = await api.get("/core/tipo_marca/");
        setProveedores(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error cargando proveedores", err);
        setProveedores([]);
      }
    };
    fetchProveedores();
  }, []);

  const proveedorOptions = proveedores.map(p => ({
    id: p.codigo,
    nombre: p.nombre
  }));

  // =====================
  // CARGA ITEM PARA EDICIÓN
  // =====================
  useEffect(() => {
    if (!open) return;

    console.log(">>> [MODAL ITEM] Props de Envío recibidas:", {
      tipoVenta,
      costoEnvioGrupo,
      // env_tot, // La nueva prop que añadiste
      sumaVentaGrupo,
      idItem: item?.id
    });

    if (item) {
      const inicial = {
        ...getEmptyForm(),
        id: item.id,
        num: item.num,
        proveedor: item.tpr ?? "",
        codigo: item.cod ?? "",
        descripcion: item.des ?? "",
        marca: item.pro ?? "",
        unidad: item.tde ?? "UNI",
        cantidad: item.can ?? 1,
        costoPrecio: item.puc ?? 0,
        porcentaje: item.cau ?? 20,
        entrega: item.ent ?? "",
        entrega_uni: item.enu ?? "D",
        observacion: item.obs ?? "",
        costoEnvio: item.cost_env ?? 0,
        porcentajeEnvio: item.por_env ?? 0,
        costoConEnvio: item.cost_c_env ?? 0,
      };

      // Esto fuerza a que el modal "se entere" de los cambios globales del jefe
      // apenas se abre, recalculando con los props actuales.
      setForm(calcularValores(inicial, null, tipoVenta, costoEnvioGrupo, sumaVentaGrupo));
    } else {
      resetForm();
    }
  }, [open, item, costoEnvioGrupo, sumaVentaGrupo]); // Agregamos estas dependencias

  // Nueva función de cálculo unificada
  const calcularValores = (
    data,
    campoModificado = null,
    tipoVenta = null,
    costoEnvioGrupo = 0,
    sumaVentaGrupo = 0
  ) => {
    const next = { ...data };
    const cantidad = toNumber(next.cantidad);
    const costoPrecio = toNumber(next.costoPrecio);

    // ==========================================
    // CASO 1 Y 2: LOGÍSTICA DE GRUPO
    // ==========================================
    if (tipoVenta === "T" || tipoVenta === "P") {
      let costoEnvioUnitario = 0;

      if (tipoVenta === "T") {
        const costoTotalLineaActual = costoPrecio * cantidad;

        // 1. Determinamos cuánto pesa esta línea en el grupo (sin dividir por cantidad aún)
        const valorAnteriorEnSuma = item?.toc ? toNumber(item.toc) : 0;
        const sumatoriaReal = (sumaVentaGrupo - valorAnteriorEnSuma) + costoTotalLineaActual;

        const divisor = sumatoriaReal > 0 ? sumatoriaReal : costoTotalLineaActual;

        // 2. RATIO DE LA LÍNEA (Peso total del renglón sobre el total del grupo)
        // Ejemplo Excel: 8504.64 / 22858.34 = 0.372 (37.2%)
        const ratioPesoLinea = divisor > 0 ? (costoTotalLineaActual / divisor) : 0;

        // 3. PORCENTAJE DE ENVÍO (Visual)
        // Calculamos el porcentaje por unidad y aplicamos formato
        const porcentajeCalculado = (ratioPesoLinea * 100) / cantidad;

        next.porcentajeEnvio = `${porcentajeCalculado.toFixed(2)}%`;

        // 4. COSTO ENVÍO UNITARIO
        // (Costo Total Envío Grupo * Peso de la Línea) / Cantidad de la línea
        // Ejemplo: (300 * 0.372) / 4 = 111.6 / 4 = 27.90
        costoEnvioUnitario = cantidad > 0 ? (costoEnvioGrupo * ratioPesoLinea) / cantidad : 0;

      } else {
        // Tipo "P" (Parcial/Unitario): El costo de envío total se divide entre las unidades
        costoEnvioUnitario = cantidad > 0 ? costoEnvioGrupo / cantidad : 0;
        next.porcentajeEnvio = (costoPrecio > 0) ? ((costoEnvioUnitario / costoPrecio) * 100).toFixed(2) : "0.00";
      }

      // --- El resto del cálculo se mantiene igual ---
      const costoConEnvio = costoPrecio + costoEnvioUnitario;
      let porcentajeUtil = toNumber(next.porcentaje);
      let utilidadUnit = (costoConEnvio * porcentajeUtil) / 100;

      if (campoModificado === "utilidad") {
        utilidadUnit = toNumber(next.utilidad);
        porcentajeUtil = costoConEnvio > 0 ? (utilidadUnit / costoConEnvio) * 100 : 0;
        next.porcentaje = porcentajeUtil.toFixed(2);
      } else {
        next.utilidad = utilidadUnit.toFixed(2);
      }

      const ventaPrecio = costoConEnvio + utilidadUnit;

      next.costoTotal = (costoPrecio * cantidad).toFixed(2);
      next.costoEnvio = costoEnvioUnitario.toFixed(2);
      next.costoConEnvio = costoConEnvio.toFixed(2);
      next.ventaPrecio = ventaPrecio.toFixed(2);
      next.ventaTotal = (ventaPrecio * cantidad).toFixed(2);
      next.utilidadTotal = (utilidadUnit * cantidad).toFixed(2);

      return next;
    }

    // ==========================================
    // CASO 3: SERVICIOS / PROYECTOS / OTROS (ESTÁNDAR)
    // ==========================================
    else {
      let utilidadUnit = (costoPrecio * toNumber(next.porcentaje)) / 100;
      let porcentajeUtil = toNumber(next.porcentaje);

      if (campoModificado === "utilidad") {
        utilidadUnit = toNumber(next.utilidad);
        porcentajeUtil = costoPrecio > 0 ? (utilidadUnit / costoPrecio) * 100 : 0;
        next.porcentaje = porcentajeUtil.toFixed(2);
      } else {
        next.utilidad = utilidadUnit.toFixed(2);
      }

      const ventaPrecio = costoPrecio + utilidadUnit;

      next.costoTotal = (costoPrecio * cantidad).toFixed(2);
      next.costoEnvio = "0.00";
      next.porcentajeEnvio = "0.00";
      next.costoConEnvio = costoPrecio.toFixed(2); // No hay envío, es igual al costo
      next.ventaPrecio = ventaPrecio.toFixed(2);
      next.ventaTotal = (ventaPrecio * cantidad).toFixed(2);
      next.utilidadTotal = (utilidadUnit * cantidad).toFixed(2);

      return next;
    }
  };

  // =====================
  // CAMBIO DE CAMPOS
  // =====================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      // Si el usuario borra todo el input, mandamos 0 para el cálculo pero guardamos "" para el input
      const valorParaCalculo = value === "" ? 0 : value;
      const actualizado = { ...prev, [name]: valorParaCalculo };

      return calcularValores(
        actualizado,
        name,
        tipoVenta,
        costoEnvioGrupo,
        sumaVentaGrupo
      );
    });
  };

  const handleSubmit = () => {
    if (!form.descripcion.trim() || !form.cantidad) return;

    // Calculamos una última vez para asegurar que todo esté fresco antes de enviar
    const dataFinalizada = calcularValores(form, null, tipoVenta, costoEnvioGrupo, sumaVentaGrupo);

    const itemDataFinal = {
      ...dataFinalizada,
      // Mapeo exacto para Django
      cod: dataFinalizada.codigo,
      des: dataFinalizada.descripcion,
      pro: dataFinalizada.marca,
      tpr: dataFinalizada.proveedor,
      tde: dataFinalizada.unidad,
      obs: dataFinalizada.observacion,
      can: toNumber(dataFinalizada.cantidad),
      ent: dataFinalizada.entrega,
      enu: dataFinalizada.entrega_uni,

      // Montos: Forzamos toNumber para que no viajen como Strings de .toFixed()
      puc: toNumber(dataFinalizada.costoPrecio),
      toc: toNumber(dataFinalizada.costoTotal),
      cau: toNumber(dataFinalizada.porcentaje),
      tou: toNumber(dataFinalizada.utilidad),
      val: toNumber(dataFinalizada.ventaPrecio),
      tot: toNumber(dataFinalizada.ventaTotal),

      // Logística: Estos son los que el padre necesita recalculados
      cost_env: toNumber(dataFinalizada.costoEnvio),
      por_env: toNumber(dataFinalizada.porcentajeEnvio),
      cost_c_env: toNumber(dataFinalizada.costoConEnvio)
    };

    onConfirm(itemDataFinal);
    handleClose();
  };

  // =====================
  // RESOLVER ENDPOINT
  // =====================
  const resolverEndpointPorProveedor = (proveedor) => {
    const map = {
      "01": "/cotizaciones/rockwell/",
      "03": "/cotizaciones/rittal/",
      "05": "/cotizaciones/ceyesa/",
      "06": "/cotizaciones/alm-articulos/?proveedor=Schneider",
      "07": "/cotizaciones/alm-articulos/?proveedor=LS Industrial Systems",
      "99": "/cotizaciones/alm-articulos/?proveedor=OTROS",
    };
    return map[proveedor] ?? null;
  };

  useEffect(() => {
    if (!open || !form.proveedor || item) return;
    setForm(prev => ({ ...prev, codigo: "", descripcion: "", marca: "", unidad: "UNI" }));
  }, [form.proveedor, open, item]);

  const handleClose = () => {
    resetForm();
    setCodigoItemOpen(false);
    onClose();
  };

  // =====================
  // BUSCAR POR CÓDIGO
  // =====================
  useEffect(() => {
    if (!open || !form.codigo || !form.proveedor || item) return;

    const buscarPorCodigo = async () => {
      try {
        const endpoint = resolverEndpointPorProveedor(form.proveedor);
        if (!endpoint) return;

        const res = await api.get(endpoint, { params: { search: form.codigo } });
        const encontrado = Array.isArray(res.data)
          ? res.data.find(i => String(i.codigo).toUpperCase() === String(form.codigo).toUpperCase())
          : null;

        if (!encontrado) return;

        const normalizado = calcularItemSegunProveedor(encontrado, form.proveedor, tcamb, toNumber(form.cantidad));

        // REEMPLAZO: Aplicamos el margen del 20% al encontrar el item
        setForm(prev => {
          const actualizado = {
            ...prev,
            ...normalizado,
            cantidad: prev.cantidad,
            porcentaje: prev.porcentaje || 20 // Mantenemos el % actual o 20 por defecto
          };
          return calcularValores(
            actualizado,
            "porcentaje",
            tipoVenta,
            costoEnvioGrupo,
            sumaVentaGrupo
          );
        });
      } catch (err) {
        console.error("❌ Error buscando por código", err);
      }
    };

    buscarPorCodigo();
  }, [form.codigo, form.proveedor, open, tcamb, item]);

  useEffect(() => {
    if (!open) return; // Quitamos la validación de costoPrecio

    setForm(prev =>
      calcularValores(
        prev,
        null,
        tipoVenta,
        costoEnvioGrupo,
        sumaVentaGrupo
      )
    );
  }, [open, tipoVenta, costoEnvioGrupo, sumaVentaGrupo]); // Agregamos 'open' para el primer render

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">

        {/* HEADER IDENTICO AL DE GRUPOS */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <PackageSearch size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Registro de Ítem
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Gestión de suministros, costos y márgenes
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO FORMULARIO */}
        <div className="p-2 space-y-2">

          {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-teal-600" />
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Información Básica</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                inline size="sm" label="Marca:" name="proveedor"
                value={form.proveedor} onChange={handleChange} options={proveedorOptions}
                className="text-xs font-semibold focus:ring-teal-500/20"
              />
              <InputField inline size="sm" label="Proveedor:" name="marca" value={form.marca} onChange={handleChange} />
            </div>

            <div className="flex items-start gap-2">
              <InputField
                inline size="sm" label="Código ítem:" name="codigo" value={form.codigo} onChange={handleChange}
                className="text-xs font-semibold focus:ring-teal-500/20"
                trailingIcon={
                  <button
                    type="button" disabled={!form.proveedor}
                    className={`ml-1 transition ${!form.proveedor ? "text-gray-300" : "text-[#0d767e] hover:scale-110"}`}
                    onClick={() => {
                      const endpoint = resolverEndpointPorProveedor(form.proveedor);
                      if (endpoint) { setEndpointCodigoItem(endpoint); setCodigoItemOpen(true); }
                    }}
                  >
                    <ChevronsRight size={16} />
                  </button>
                }
              />
            </div>

            {/* DESCRIPCIÓN CON TU FORMATO ORIGINAL */}
            <div className="flex items-start gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[85px] pt-1">
                Descripción:
              </label>
              <textarea
                name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-2 py-1.5 resize-none min-h-[40px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-white"
                placeholder="Ingrese descripción del ítem"
              />
            </div>

            {/* OBSERVACIÓN */}
            <div className="flex items-start gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[85px] pt-1">
                Observación:
              </label>
              <input
                name="observacion" value={form.observacion} onChange={handleChange}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-white"
                placeholder="Notas internas o detalles adicionales..."
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <InputField inline size="sm" label="Unidad:" name="unidad" value={form.unidad} onChange={handleChange} />
              <InputField inline size="sm" type="number" label="Cantidad:" name="cantidad" value={form.cantidad} onChange={handleChange} />
              {/* TIEMPO DE ENTREGA */}
              <InputField
                inline size="sm" type="number" label="Entrega:" name="entrega"
                value={form.entrega} onChange={handleChange} placeholder="0"
              />

              {/* UNIDAD DE ENTREGA (SELECTOR) */}
              <select
                name="entrega_uni"
                value={form.entrega_uni}
                onChange={handleChange}
                className="h-8 text-[11px] font-semibold border border-slate-200 rounded-xl px-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-white"
              >
                <option value="D">Días</option>
                <option value="S">Semanas</option>
                <option value="M">Meses</option>
              </select>
            </div>
          </div>

          {/* SECCIÓN 2: COSTOS VS RESUMEN */}
          <div className="grid grid-cols-2 gap-2">

            {/* COSTOS Y UTILIDAD */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
              <div className="flex items-center gap-2">
                <Calculator size={14} className="text-teal-600" />
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Costos y Utilidad</span>
              </div>
              <div className="space-y-3">
                {/* FILA 1: COSTO PRECIO (Ancho total) */}
                <InputField
                  inline
                  size="sm"
                  label="Costo Precio:"
                  name="costoPrecio"
                  type="currency"
                  value={form.costoPrecio}
                  onChange={handleChange}
                />

                {/* FILA 2: Lógica dinámica según Tipo de Venta */}
                {(tipoVenta === "T" || tipoVenta === "P") && (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Costo Envío: Siempre visible en T y P */}
                    <InputField
                      inline
                      size="sm"
                      label="Costo Envío:"
                      name="costoEnvio"
                      type="currency"
                      value={form.costoEnvio}
                      onChange={handleChange}
                      className={tipoVenta === "T" ? "bg-gray-100 font-semibold text-gray-500" : "bg-blue-50/50 font-semibold"}
                      readOnly //={tipoVenta === "T"} // En T es automático, en P es manual
                    />

                    {/* % Envío: SOLO visible si es Tipo T */}
                    {tipoVenta === "T" ? (
                      <InputField
                        inline
                        size="sm"
                        label="% Envío:"
                        name="porcentajeEnvio"
                        type="text"
                        value={form.porcentajeEnvio || "0.00"}
                        readOnly
                        className="bg-gray-50 text-gray-400 font-medium"
                      />
                    ) : (
                      <div />
                    )}
                  </div>
                )}

                {/* FILA 3: UTILIDAD | PORCENTAJE UTILIDAD */}
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    inline size="sm"
                    label="Utilidad:"
                    name="utilidad"
                    type="currency"
                    value={form.utilidad}
                    onChange={handleChange}
                  />
                  <InputField
                    inline size="sm"
                    label="% Utilidad:"
                    name="porcentaje"
                    type="currency"
                    value={form.porcentaje}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* RESUMEN DE VENTA */}
            <div className="bg-[#0d767e]/5 border border-[#0d767e]/10 rounded-2xl p-4 space-y-4 shadow-inner">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-[#0d767e]" />
                <span className="text-[11px] font-black text-[#0d767e] uppercase tracking-tight">Resumen de Venta</span>
              </div>
              <div className="space-y-1">
                <InputField inline size="sm" type="currency" label="Costo Total:" value={form.costoTotal} readOnly className="bg-transparent border-none text-[11px]" />
                {/* 💡 Solo aparece si hay logística de envío */}
                {(tipoVenta === "T" || tipoVenta === "P") && (
                  <InputField inline size="sm" type="currency" label="Costo c/ Envio:" value={form.costoConEnvio} readOnly className="bg-transparent border-none text-[11px]" />
                )}
                <InputField inline size="sm" type="currency" label="Precio Venta:" value={form.ventaPrecio} readOnly className="bg-transparent border-none text-[11px]" />
                <InputField inline size="sm" type="currency" label="Venta Total:" value={form.ventaTotal} readOnly className="bg-transparent border-none font-black text-[#0d767e] text-sm" />
                <InputField inline size="sm" type="currency" label="Utilidad Total:" value={form.utilidadTotal} readOnly className="bg-transparent border-none font-bold text-teal-700 text-[11px]" />
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
          <Button
            variant="ghost" onClick={handleClose}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-xl transition-all"
          >
            Cancelar
          </Button>
          <Button
            variant="ghost" onClick={handleSubmit}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-teal-700 hover:bg-teal-100 rounded-xl transition-all"
          >
            Aceptar
          </Button>
        </div>

        <CodigoItemSuministroModal
          open={codigoItemOpen} endpoint={endpointCodigoItem} tcamb={tcamb} proveedor={form.proveedor}
          onClose={() => setCodigoItemOpen(false)}
          onSelect={(itemSeleccionado) => {
            const normalizado = calcularItemSegunProveedor(itemSeleccionado, form.proveedor, tcamb, toNumber(form.cantidad));

            // REEMPLAZO: Aplicamos el cálculo inmediatamente al seleccionar
            setForm((prev) => {
              const actualizado = {
                ...prev,
                ...normalizado,
                porcentaje: prev.porcentaje || 20
              };
              return calcularValores(actualizado, "porcentaje");
            });
            setCodigoItemOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default RegistroItemModal;


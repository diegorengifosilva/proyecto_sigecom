import React, { useState, useEffect, useCallback } from "react";
import logoImg from "@/assets/logo.png";
import api from "@/services/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Package, Trash2, Plus, X, Pencil, Ban, Save, ArrowLeft } from "lucide-react";
import SearchableSelect from "@/dashboard/logistica/components/SearchableSelect";
import { NuevoClienteMiniModal, NuevoAlmacenMiniModal } from "@/dashboard/logistica/components/LogisticaMiniModals";

const MONEDA_OPTS = [
  { id: "S", nombre: "Soles" },
  { id: "D", nombre: "Dólares" },
];

const monedaLabel = (v) => MONEDA_OPTS.find((m) => m.id === v)?.nombre || v || "--";

const FORM_VACIO = {
  fecha: new Date().toISOString().split("T")[0],
  moneda: "S",
  tc: "",
  almacen: "",
  almacen_nombre: "",
  referencia: "",
  razon_social: "",
  cor_id: "",
  orden_compra: "",
  numero_doc: "",
  nro_guia: "",
  usuario_id: "",
  responsable: "",
  obs_doc: "",
  _soles: 0,
  _dolares: 0,
};

const ITEM_VACIO = { id_producto: "", codigo: "", descripcion: "", um_id: "", um: "", cant: 1, valor: "" };

function roundN(v, d = 2) {
  const f = 10 ** d;
  return Math.round(Number(v || 0) * f) / f;
}

function calcTotalesMoneda(total, moneda, tc) {
  const t = Number(tc) || 0;
  if (moneda === "D") {
    return { dolares: roundN(total), soles: roundN(total * t) };
  }
  return { soles: roundN(total), dolares: t > 0 ? roundN(total / t) : 0 };
}

function convertirItemsMoneda(items, monedaOrigen, monedaDestino, tc) {
  const tipoCambio = Number(tc) || 0;
  if (!tipoCambio || monedaOrigen === monedaDestino) return items;
  return items.map((it) => {
    let valor = Number(it.valor || 0);
    if (monedaOrigen === "S" && monedaDestino === "D") {
      valor = valor / tipoCambio;
    } else if (monedaOrigen === "D" && monedaDestino === "S") {
      valor = valor * tipoCambio;
    }
    const cant = Number(it.cant || 0);
    return { ...it, valor: roundN(valor, 4), total: roundN(cant * valor) };
  });
}

function fmtNum(v) {
  return v != null
    ? Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2 })
    : "--";
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
      {children}
    </div>
  );
}

function ReadVal({ value }) {
  return (
    <p className="text-xs font-semibold text-slate-800 py-1.5 px-3 bg-slate-50 rounded-lg border border-slate-100 min-h-[32px]">
      {value || "--"}
    </p>
  );
}

export default function NuevaLogisticaModal({
  open,
  onClose,
  logistica = null,
  operacion = "E",
  modo: modoProp = "N",
  asPage = false,
}) {
  const queryClient = useQueryClient();
  const [modo, setModo] = useState(modoProp);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState(ITEM_VACIO);

  const [clientesLista, setClientesLista] = useState([]);
  const [usuariosLista, setUsuariosLista] = useState([]);
  const [productosLista, setProductosLista] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);

  const [openClienteModal, setOpenClienteModal] = useState(false);
  const [openAlmacenModal, setOpenAlmacenModal] = useState(false);
  const [openBuscador, setOpenBuscador] = useState(false);
  const [busqQuery, setBusqQuery] = useState("");

  const { data: almacenes = [] } = useQuery({
    queryKey: ["almacenes_new"],
    queryFn: () => api.get("logistica/dashboard/almacenes/").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: open || asPage,
  });

  const esNuevo  = modo === "N";
  const esEditar = modo === "E";
  const esVer    = modo === "V";
  const editable = esNuevo || esEditar;
  const anulado  = form._anulado === "S";

  const totalGeneral = items.reduce((acc, it) => acc + Number(it.total || 0), 0);
  const totalesVista = calcTotalesMoneda(totalGeneral, form.moneda, form.tc);
  const totalSolesCab = editable ? totalesVista.soles : (form._soles != null && form._soles !== "" ? Number(form._soles) : totalesVista.soles);
  const totalDolaresCab = editable ? totalesVista.dolares : (form._dolares != null ? Number(form._dolares) : totalesVista.dolares);

  const getNumReg = () => form._num || logistica?.num_reg;

  const fetchTipoCambio = useCallback(async (fecha, mantenerManual = false) => {
    if (!fecha) return;
    try {
      const { data } = await api.get("logistica/tipo-cambio/", { params: { fecha } });
      if (data?.tipo_cambio) {
        setForm((p) => ({
          ...p,
          tc: mantenerManual && p.tc ? p.tc : String(data.tipo_cambio),
        }));
      }
    } catch { /* sin TC del día */ }
  }, []);

  const invalidarListas = () => {
    queryClient.invalidateQueries({ queryKey: ["logistica_entradas"] });
    queryClient.invalidateQueries({ queryKey: ["logistica_salidas"] });
    queryClient.invalidateQueries({ queryKey: ["almacenes_new"] });
  };

  const buscarClientes = useCallback(async (q = "") => {
    setLoadingClientes(true);
    try {
      const { data } = await api.get("core/clientes/buscar/", { params: { q } });
      setClientesLista(Array.isArray(data) ? data : []);
    } catch { setClientesLista([]); }
    finally { setLoadingClientes(false); }
  }, []);

  const buscarUsuarios = useCallback(async (q = "") => {
    setLoadingUsuarios(true);
    try {
      const { data } = await api.get("logistica/usuarios/", { params: { q } });
      setUsuariosLista(Array.isArray(data) ? data : []);
    } catch { setUsuariosLista([]); }
    finally { setLoadingUsuarios(false); }
  }, []);

  const buscarProductos = useCallback(async (q = "") => {
    setLoadingProductos(true);
    try {
      const { data } = await api.get("logistica/dashboard/productos/", {
        params: {
          q,
          almacen_id: form.almacen || "",
          operacion: operacion || "E",
        }
      });
      setProductosLista(Array.isArray(data) ? data : []);
    } catch { setProductosLista([]); }
    finally { setLoadingProductos(false); }
  }, [form.almacen, operacion]);

  useEffect(() => {
    if (!open && !asPage) return;
    setModo(modoProp);
    // Limpiar siempre el nuevo item y el buscador al abrir
    setNewItem(ITEM_VACIO);
    setOpenBuscador(false);
    setBusqQuery("");
    setProductosLista([]);
    if (logistica && logistica.num_reg) {
      cargarDetalle(logistica.num_reg);
    } else {
      let user = {};
      try { user = JSON.parse(localStorage.getItem("auth_user") || "{}"); } catch { /* ignore */ }
      const fechaHoy = new Date().toISOString().split("T")[0];
      setForm({
        ...FORM_VACIO,
        fecha: fechaHoy,
        usuario_id: user.id_usuario || "",
        responsable: user.nombre_completo || "",
      });
      setItems([]);
      fetchTipoCambio(fechaHoy);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asPage, logistica && logistica.num_reg, modoProp]);

  async function cargarDetalle(num_reg) {
    setLoading(true);
    try {
      const { data } = await api.get(`logistica/dashboard/modal/${num_reg}/`);
      const cab = data.cabecera || {};
      const monedaDb = cab.moneda === "Soles" ? "S" : cab.moneda === "Dolares" ? "D" : (cab.moneda || "S");
      setForm({
        fecha:        cab.fecha?.split?.("T")?.[0] || cab.fecha || new Date().toISOString().split("T")[0],
        moneda:       monedaDb,
        tc:           cab.tipo_cambio ?? "",
        almacen:      cab.almacen != null ? String(cab.almacen) : "",
        almacen_nombre: cab.almacen_nombre || "",
        referencia:   cab.referencia || cab.tipo_movimiento || "",
        razon_social: cab.razon_social || "",
        cor_id:       cab.cliente_id ?? cab.proveedor_codigo ?? "",
        orden_compra: cab.orden_compra || "",
        numero_doc:   cab.numero_doc || "",
        nro_guia:     cab.nro_guia || "",
        usuario_id:   cab.usuario_id ?? "",
        responsable:  cab.responsable || "",
        obs_doc:      cab.observacion ?? cab.obs_doc ?? "",
        _num:         cab.numero,
        _est:         cab.estado,
        _anulado:     cab.anulado,
        _soles:       data.resumen?.totalSoles ?? cab.soles ?? 0,
        _dolares:     data.resumen?.totalDolares ?? cab.dolares ?? 0,
      });

      const rawItems = data.items || [];
      let itemsWithStock = [];
      if (operacion === "S" && cab.almacen) {
        itemsWithStock = await Promise.all(
          rawItems.map(async (it, idx) => {
            let stockVal = 0;
            try {
              const resStock = await api.get("logistica/stock/", {
                params: { producto_id: it.id_producto, almacen_id: cab.almacen }
              });
              stockVal = resStock.data?.cantidad ?? 0;
            } catch (err) {
              console.error("Error fetching stock for item", it.id_producto, err);
            }
            return {
              id:            it.id_detalle || idx + 1,
              id_detalle:    it.id_detalle,
              id_producto:   it.id_producto || "",
              codigo:        it.codigo || "",
              descripcion:   it.descripcion || it.nombre || "",
              um_id:         it.id_unidad_medida != null ? String(it.id_unidad_medida) : "",
              um:            it.unidad || "",
              cant:          Number(it.cantidad || 0),
              valor:         Number(it.valor_unitario || 0),
              total:         Number(it.total || 0),
              observacion:   it.observacion || "",
              _stock:        stockVal + Number(it.cantidad || 0)
            };
          })
        );
      } else {
        itemsWithStock = rawItems.map((it, idx) => ({
          id:            it.id_detalle || idx + 1,
          id_detalle:    it.id_detalle,
          id_producto:   it.id_producto || "",
          codigo:        it.codigo || "",
          descripcion:   it.descripcion || it.nombre || "",
          um_id:         it.id_unidad_medida != null ? String(it.id_unidad_medida) : "",
          um:            it.unidad || "",
          cant:          Number(it.cantidad || 0),
          valor:         Number(it.valor_unitario || 0),
          total:         Number(it.total || 0),
          observacion:   it.observacion || "",
          _stock:        null
        }));
      }

      setItems(itemsWithStock);
    } catch {
      toast.error("Error al cargar el detalle");
    } finally {
      setLoading(false);
    }
  }

  const setF = (name, value) => {
    if (name === "fecha" && modo === "N") {
      setForm((p) => ({ ...p, fecha: value }));
      fetchTipoCambio(value);
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  };

  function cambiarMoneda(nuevaMoneda) {
    if (!nuevaMoneda || nuevaMoneda === form.moneda) return;
    const tc = Number(form.tc);
    if (!tc || tc <= 0) {
      toast.warning("Ingrese el tipo de cambio del movimiento antes de cambiar la moneda");
      return;
    }
    setItems((prev) => convertirItemsMoneda(prev, form.moneda, nuevaMoneda, tc));
    setForm((p) => ({ ...p, moneda: nuevaMoneda }));
    toast.info(`Valores convertidos a ${monedaLabel(nuevaMoneda)} (TC: ${tc})`);
  }

  async function validarFormulario() {
    if (!form.fecha) { toast.warning("La fecha es obligatoria"); return false; }
    if (!form.almacen) { toast.warning("Seleccione un almacén"); return false; }
    const tc = Number(form.tc);
    if (form.moneda === "D" && (!tc || tc <= 0)) {
      toast.warning("Ingrese un tipo de cambio válido para operar en dólares");
      return false;
    }
    if (items.length === 0) { toast.warning("Agregue al menos un ítem"); return false; }
    for (const it of items) {
      if (Number(it.cant || 0) <= 0) {
        toast.warning(`La cantidad para el ítem "${it.descripcion || it.codigo}" debe ser mayor a 0`);
        return false;
      }
      if (operacion === "S" && it._stock != null) {
        const stockDisp = Number(it._stock || 0);
        const cant = Number(it.cant || 0);
        if (cant > stockDisp) {
          toast.warning(`Stock insuficiente para "${it.descripcion || it.codigo}". Disponible: ${stockDisp}, Solicitado: ${cant}`);
          return false;
        }
      }
    }
    return true;
  }

  function addItem() {
    if (!newItem.codigo && !newItem.descripcion) return;
    const cant  = Number(newItem.cant  || 0);
    if (cant <= 0) {
      toast.warning("La cantidad debe ser mayor a 0");
      return;
    }
    // Validar stock en salida (frontend)
    if (operacion === "S" && newItem._stock != null) {
      const stockDisp = Number(newItem._stock || 0);
      if (cant > stockDisp) {
        toast.error(`Stock insuficiente. Disponible: ${stockDisp}, Solicitado: ${cant}`);
        return;
      }
    }
    const valor = Number(newItem.valor || 0);
    setItems((prev) => [
      ...prev,
      { id: Date.now(), ...newItem, cant, valor, total: cant * valor },
    ]);
    setNewItem(ITEM_VACIO);
  }

  function selectProducto(p) {
    setNewItem({
      id_producto: p.id_producto,
      codigo: p.codigo,
      descripcion: p.nombre || p.descripcion,
      um_id: p.id_unidad_medida || "",
      um: p.unidad || "",
      cant: newItem.cant || 1,
      valor: form.moneda === "D" ? (p.valor_dolares || p.valor_soles) : (p.valor_soles || p.valor_dolares),
      _stock: p.stock != null ? Number(p.stock) : null,
    });
    setOpenBuscador(false);
  }

  const buildPayload = () => ({
    ...form,
    cliente_id: form.cor_id,
    usuario_id: form.usuario_id,
    observacion: form.obs_doc ?? "",
    items: items.map((it) => ({
      id_detalle: it.id_detalle,
      id_producto: it.id_producto,
      producto_id: it.id_producto,
      codigo: it.codigo,
      descripcion: it.descripcion,
      id_unidad_medida: it.um_id,
      um_id: it.um_id,
      um: it.um,
      cant: it.cant,
      cantidad: it.cant,
      valor: it.valor,
      valor_unitario: it.valor,
      total: it.total,
      obs: it.observacion || "",
      observacion: it.observacion || "",
    })),
  });

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function updateItem(id, field, value) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (field === "cant" && operacion === "S" && it._stock != null) {
          const newCant = Number(value || 0);
          const stockDisp = Number(it._stock || 0);
          if (newCant > stockDisp) {
            toast.error(`Stock insuficiente para ${it.descripcion}. Disponible: ${stockDisp}, Solicitado: ${newCant}`);
            const updated = { ...it, cant: stockDisp };
            updated.total = stockDisp * Number(updated.valor || 0);
            return updated;
          }
        }
        const updated = { ...it, [field]: value };
        updated.total = Number(updated.cant || 0) * Number(updated.valor || 0);
        return updated;
      })
    );
  }

  async function handleSave() {
    if (!(await validarFormulario())) return;
    setSaving(true);
    try {
      const { data } = await api.post("logistica/movimiento/", { ...buildPayload(), ope: operacion });
      toast.success((operacion === "E" ? "Entrada" : "Salida") + " registrada correctamente");
      invalidarListas();
      onClose(data);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || "Error al guardar";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally { setSaving(false); }
  }

  async function handleUpdate() {
    const numReg = getNumReg();
    if (!numReg) { toast.error("No se encontró el número de registro"); return; }
    if (!(await validarFormulario())) return;
    setSaving(true);
    try {
      const { data } = await api.put(`logistica/movimiento/${numReg}/`, {
        ...buildPayload(), ope: operacion,
      });
      toast.success(
        `${operacion === "E" ? "Entrada" : "Salida"} N° ${numReg} actualizada correctamente`
      );
      invalidarListas();
      if (asPage) {
        await cargarDetalle(numReg);
        setModo("V");
      } else {
        onClose(data);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || "Error al actualizar";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally { setSaving(false); }
  }

  async function handleAnular() {
    const numReg = getNumReg();
    if (!numReg) { toast.error("No se encontró el número de registro"); return; }
    if (!window.confirm("Confirma anular este movimiento? Esta accion no se puede deshacer.")) return;
    setSaving(true);
    try {
      await api.patch(`logistica/movimiento/${numReg}/anular/`);
      toast.success("Movimiento anulado");
      invalidarListas();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al anular");
    } finally { setSaving(false); }
  }

  useEffect(() => {
    if (!openBuscador) return;
    const t = setTimeout(() => buscarProductos(busqQuery), 300);
    return () => clearTimeout(t);
  }, [busqQuery, openBuscador, buscarProductos]);

  useEffect(() => {
    if (editable && (open || asPage)) {
      buscarClientes("");
      buscarUsuarios("");
    }
  }, [editable, open, asPage, buscarClientes, buscarUsuarios]);

  const colorBtn    = operacion === "E" ? "bg-teal-600 hover:bg-teal-700 shadow-teal-200"   : "bg-rose-600 hover:bg-rose-700 shadow-rose-200";
  const colorHeader = operacion === "E" ? "bg-gradient-to-r from-teal-600 to-teal-500"      : "bg-gradient-to-r from-rose-600 to-rose-500";
  const headerBg    = operacion === "E" ? "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" : "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900";

  const content = (
    <>
        {/* HEADER */}
        <div className={`shrink-0 ${headerBg} px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {asPage && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Volver al listado"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className={`p-2 ${colorHeader} text-white rounded-lg`}>
              <Package size={20} />
            </div>
            <img src={logoImg} alt="Logo" className="h-8 w-auto" />
            <div>
              <h3 className="text-sm font-black text-white uppercase">
                {operacion === "E" ? "Entrada" : "Salida"} de Almacen
                {esNuevo ? " - Nuevo" : esEditar ? " - Editar" : " - Detalle"}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase">SIGECOM Logistica</p>
            </div>
          </div>
          {form._num && (
            <span className={`text-[10px] px-3 py-1 rounded-full font-bold border ${
              anulado
                ? "bg-red-900 text-red-300 border-red-700"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}>
              ID: {form._num}{anulado ? " | ANULADO" : ""}
            </span>
          )}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex-1 flex items-center justify-center p-16 text-slate-400 text-xs font-bold">
            Cargando...
          </div>
        )}

        {/* BODY */}
        {!loading && (
          <div className={`${asPage ? "flex-1" : ""} overflow-y-auto p-6 space-y-5 bg-slate-50/50`}>

            {/* Cabecera */}
            <div className="grid grid-cols-12 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">

              {form._num && (
                <div className="col-span-3">
                  <Field label="N° Registro">
                    <ReadVal value={form._num} />
                  </Field>
                </div>
              )}

              <div className="col-span-3">
                <Field label="Fecha">
                  {editable
                    ? <input type="date" value={form.fecha || ""} onChange={(e) => setF("fecha", e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5" />
                    : <ReadVal value={form.fecha} />}
                </Field>
              </div>

              <div className="col-span-3">
                <Field label="Almacén">
                  {editable ? (
                    <SearchableSelect
                      value={form.almacen}
                      displayValue={form.almacen_nombre || almacenes.find((a) => String(a.idalmacen) === String(form.almacen))?.nombre}
                      options={almacenes}
                      onChange={(opt) => {
                        if (!opt) { setF("almacen", ""); setF("almacen_nombre", ""); return; }
                        setForm((p) => ({ ...p, almacen: String(opt.idalmacen), almacen_nombre: opt.nombre }));
                      }}
                      onSearch={() => queryClient.invalidateQueries({ queryKey: ["almacenes_new"] })}
                      placeholder="Seleccionar almacén..."
                      onAdd={() => setOpenAlmacenModal(true)}
                      addLabel="Almacén"
                      renderOption={(a) => <span>{a.nombre}</span>}
                    />
                  ) : (
                    <ReadVal value={form.almacen_nombre || almacenes.find((a) => String(a.idalmacen) === String(form.almacen))?.nombre} />
                  )}
                </Field>
              </div>

              <div className="col-span-3">
                <Field label="Moneda">
                  {editable ? (
                    <SearchableSelect
                      value={form.moneda}
                      displayValue={monedaLabel(form.moneda)}
                      options={MONEDA_OPTS}
                      onChange={(opt) => cambiarMoneda(opt?.id || "S")}
                      placeholder="Moneda..."
                      renderOption={(o) => <span>{o.nombre}</span>}
                    />
                  ) : <ReadVal value={monedaLabel(form.moneda)} />}
                </Field>
              </div>

              <div className="col-span-3">
                <Field label="Tipo de Cambio">
                  {editable
                    ? <input type="number" step="0.01" value={form.tc || ""} onChange={(e) => setF("tc", e.target.value)}
                        placeholder="Auto" className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5" />
                    : <ReadVal value={form.tc ? Number(form.tc).toFixed(3) : "--"} />}
                </Field>
              </div>

              <div className="col-span-4">
                <Field label="O/Compra">
                  {editable
                    ? <input type="text" value={form.orden_compra || ""} onChange={(e) => setF("orden_compra", e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5" />
                    : <ReadVal value={form.orden_compra} />}
                </Field>
              </div>

              <div className="col-span-4">
                <Field label="Factura">
                  {editable
                    ? <input type="text" value={form.numero_doc || ""} onChange={(e) => setF("numero_doc", e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5" />
                    : <ReadVal value={form.numero_doc} />}
                </Field>
              </div>

              <div className="col-span-4">
                <Field label="Guía">
                  {editable
                    ? <input type="text" value={form.nro_guia || ""} onChange={(e) => setF("nro_guia", e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5" />
                    : <ReadVal value={form.nro_guia} />}
                </Field>
              </div>

              <div className="col-span-4">
                <Field label="Responsable">
                  {editable ? (
                    <SearchableSelect
                      value={form.usuario_id}
                      displayValue={form.responsable}
                      options={usuariosLista}
                      loading={loadingUsuarios}
                      onSearch={buscarUsuarios}
                      onChange={(opt) => {
                        if (!opt) { setF("usuario_id", ""); setF("responsable", ""); return; }
                        setForm((p) => ({ ...p, usuario_id: opt.id_usuario, responsable: opt.nombre }));
                      }}
                      placeholder="Buscar usuario..."
                      renderOption={(u) => (
                        <div>
                          <p className="font-semibold text-slate-800">{u.nombre}</p>
                          <p className="text-[10px] text-slate-400">{u.usuario}</p>
                        </div>
                      )}
                    />
                  ) : <ReadVal value={form.responsable} />}
                </Field>
              </div>

              <div className="col-span-8">
                <Field label="Proveedor / Razón Social">
                  {editable ? (
                    <SearchableSelect
                      value={form.cor_id}
                      displayValue={form.razon_social}
                      options={clientesLista}
                      loading={loadingClientes}
                      onSearch={buscarClientes}
                      onChange={(opt) => {
                        if (!opt) { setF("cor_id", ""); setF("razon_social", ""); return; }
                        setForm((p) => ({ ...p, cor_id: opt.id_cliente, razon_social: opt.nombre }));
                      }}
                      placeholder="Buscar cliente o proveedor..."
                      onAdd={() => setOpenClienteModal(true)}
                      addLabel="Cliente"
                      renderOption={(c) => (
                        <div>
                          <p className="font-semibold text-slate-800">{c.nombre}</p>
                          <p className="text-[10px] text-slate-400">{c.ruc || "Sin RUC"}</p>
                        </div>
                      )}
                    />
                  ) : <ReadVal value={form.razon_social} />}
                </Field>
              </div>

              <div className="col-span-12">
                <Field label="Observación">
                  {editable
                    ? <input type="text" value={form.obs_doc || ""} onChange={(e) => setF("obs_doc", e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5" />
                    : <ReadVal value={form.obs_doc} />}
                </Field>
              </div>

              {!editable && (
                <>
                  <div className="col-span-3">
                    <Field label="Total Soles">
                      <ReadVal value={fmtNum(totalSolesCab)} />
                    </Field>
                  </div>
                  <div className="col-span-3">
                    <Field label="Total Dólares">
                      <ReadVal value={fmtNum(totalDolaresCab)} />
                    </Field>
                  </div>
                </>
              )}

            </div>

            {/* Tabla de items */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-800 text-[10px] font-black text-slate-300 uppercase">
                    <th className="px-4 py-2 w-10 text-center">N</th>
                    <th className="px-4 py-2 w-32">Codigo</th>
                    <th className="px-4 py-2">Descripcion</th>
                    <th className="px-4 py-2 w-16 text-center">UM</th>
                    <th className="px-4 py-2 w-20 text-center">Cant.</th>
                    <th className="px-4 py-2 w-24 text-right">Valor</th>
                    <th className="px-4 py-2 w-28 text-right">Total</th>
                    {editable && <th className="px-4 py-2 w-10"></th>}
                  </tr>

                  {editable && (
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <td></td>
                      <td className="px-2 py-1.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              if (!form.almacen) {
                                toast.warning("Debe seleccionar un almacén antes de buscar productos");
                                return;
                              }
                              setBusqQuery("");
                              setOpenBuscador(true);
                            }}
                            className="shrink-0 bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            bus.
                          </button>
                          <input type="text" value={newItem.codigo}
                            onChange={(e) => setNewItem((p) => ({ ...p, codigo: e.target.value }))}
                            className="w-full text-[11px] font-bold border border-slate-300 rounded px-2 py-1" />
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={newItem.descripcion}
                          onChange={(e) => setNewItem((p) => ({ ...p, descripcion: e.target.value }))}
                          className="w-full text-[11px] border border-slate-300 rounded px-2 py-1 uppercase" />
                        {operacion === "S" && newItem._stock != null && (
                          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                            Stock disp: {newItem._stock}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={newItem.um}
                          onChange={(e) => setNewItem((p) => ({ ...p, um: e.target.value }))}
                          className="w-full text-[11px] text-center border border-slate-300 rounded py-1" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={newItem.cant}
                          onChange={(e) => setNewItem((p) => ({ ...p, cant: e.target.value }))}
                          className="w-full text-[11px] text-center border border-slate-300 rounded py-1" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={newItem.valor}
                          onChange={(e) => setNewItem((p) => ({ ...p, valor: e.target.value }))}
                          className="w-full text-[11px] text-right border border-slate-300 rounded py-1" />
                      </td>
                      <td className="px-4 py-1.5 text-right text-[11px] font-black text-amber-600">
                        {(Number(newItem.cant || 0) * Number(newItem.valor || 0)).toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5">
                        <button onClick={addItem} className="p-1 bg-teal-500 hover:bg-teal-600 text-white rounded">
                          <Plus size={14} />
                        </button>
                      </td>
                    </tr>
                  )}
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.filter(it => Number(it.cant) > 0).map((it, idx) => (
                    <tr key={it.id} className="hover:bg-slate-50 text-xs">
                      <td className="px-4 py-2 text-center text-slate-400 font-bold">{it.id_detalle || idx + 1}</td>
                      <td className="px-4 py-2 font-bold text-slate-700">{it.codigo}</td>

                      {editable
                        ? <td className="px-2 py-1">
                            <input type="text" value={it.descripcion}
                              onChange={(e) => updateItem(it.id, "descripcion", e.target.value)}
                              className="w-full text-[11px] border-b border-slate-200 bg-transparent uppercase px-1" />
                          </td>
                        : <td className="px-4 py-2 uppercase text-slate-600">{it.descripcion}</td>}

                      <td className="px-4 py-2 text-center text-slate-500">{it.um}</td>

                      {editable
                        ? <>
                            <td className="px-2 py-1">
                              <input type="number" value={it.cant}
                                onChange={(e) => updateItem(it.id, "cant", e.target.value)}
                                className="w-full text-[11px] text-center border-b border-slate-200 bg-transparent" />
                            </td>
                            <td className="px-2 py-1">
                              <input type="number" value={it.valor}
                                onChange={(e) => updateItem(it.id, "valor", e.target.value)}
                                className="w-full text-[11px] text-right border-b border-slate-200 bg-transparent" />
                            </td>
                          </>
                        : <>
                            <td className="px-4 py-2 text-center font-bold">{it.cant}</td>
                            <td className="px-4 py-2 text-right">{Number(it.valor).toFixed(2)}</td>
                          </>}

                      <td className="px-4 py-2 text-right font-black text-slate-700">
                        {Number(it.total).toFixed(2)}
                      </td>
                      {editable && (
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => removeItem(it.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {items.length === 0 && (
                    <tr>
                      <td colSpan={editable ? 8 : 7}
                        className="px-4 py-10 text-center text-xs text-slate-400">
                        Sin items
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-500">
                      Total ítems ({monedaLabel(form.moneda)}):
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-black text-amber-600">
                      {fmtNum(editable ? totalGeneral : totalSolesCab)}
                    </td>
                    {editable && <td></td>}
                  </tr>
                  {editable && (
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400">
                        Equivalente (TC {form.tc || "--"})
                      </td>
                      <td className="px-4 py-2 text-right text-xs font-bold text-slate-700">
                        S/ {fmtNum(totalSolesCab)} &nbsp;|&nbsp; $ {fmtNum(totalDolaresCab)}
                      </td>
                      <td></td>
                    </tr>
                  )}
                  {!editable && (
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400">
                        Soles / Dólares (movimiento)
                      </td>
                      <td className="px-4 py-2 text-right text-xs font-bold text-slate-700">
                        S/ {fmtNum(totalSolesCab)} &nbsp;|&nbsp; $ {fmtNum(totalDolaresCab)}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

          </div>
        )}

        {/* FOOTER */}
        {!loading && (
          <div className="shrink-0 px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center gap-3">
            <div>
              {esVer && getNumReg() && !anulado && (
                <Button
                  variant="outline"
                  onClick={handleAnular}
                  disabled={saving}
                  className="text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 gap-2">
                  <Ban size={14} /> Anular
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Cerrar
              </Button>

              {esVer && getNumReg() && !anulado && (
                <Button
                  variant="outline"
                  onClick={() => setModo("E")}
                  className="text-xs font-bold gap-2">
                  <Pencil size={14} /> Editar
                </Button>
              )}

              {esNuevo && (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className={`${colorBtn} text-white text-xs font-bold uppercase tracking-widest px-8 rounded-xl shadow-lg gap-2`}>
                  <Save size={14} />
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              )}

              {esEditar && (
                <Button
                  onClick={handleUpdate}
                  disabled={saving}
                  className={`${colorBtn} text-white text-xs font-bold uppercase tracking-widest px-8 rounded-xl shadow-lg gap-2`}>
                  <Save size={14} />
                  {saving ? "Actualizando..." : "Actualizar"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* BUSCADOR DE PRODUCTOS */}
        {openBuscador && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-[580px] max-h-[480px] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-teal-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Buscar Producto</span>
                </div>
                <button onClick={() => setOpenBuscador(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-3 bg-slate-50 border-b border-slate-200">
                <input
                  autoFocus
                  type="text"
                  value={busqQuery}
                  onChange={(e) => setBusqQuery(e.target.value)}
                  className="w-full border border-slate-300 p-2.5 text-xs rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  placeholder="Código o nombre del producto..." />
                {form.almacen && (
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                    📦 Stock mostrado para: <span className="font-bold text-slate-600">{form.almacen_nombre || `Almacén ${form.almacen}`}</span>
                  </p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {loadingProductos && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!loadingProductos && productosLista.map((p) => {
                  const stockVal = p.stock != null ? Number(p.stock) : null;
                  const stockColor = stockVal == null ? "bg-slate-100 text-slate-400"
                    : stockVal <= 0 ? "bg-red-100 text-red-700"
                    : stockVal <= 5 ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700";
                  return (
                    <div
                      key={p.id_producto || p.codigo}
                      onClick={() => selectProducto(p)}
                      className="px-4 py-2.5 text-xs hover:bg-teal-50/70 cursor-pointer flex items-center gap-3 transition-colors group">
                      <span className="font-bold text-slate-700 w-28 shrink-0 group-hover:text-teal-700 transition-colors">{p.codigo}</span>
                      <span className="text-slate-600 truncate flex-1">{p.nombre}</span>
                      <span className="text-slate-400 shrink-0 w-10 text-center">{p.unidad}</span>
                      {stockVal != null && (
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${stockColor}`}>
                          {stockVal}
                        </span>
                      )}
                    </div>
                  );
                })}
                {!loadingProductos && productosLista.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-8">Sin resultados</p>
                )}
              </div>
            </div>
          </div>
        )}

        <NuevoClienteMiniModal
          open={openClienteModal}
          onClose={() => setOpenClienteModal(false)}
          onCreated={(c) => {
            setForm((p) => ({ ...p, cor_id: c.id_cliente, razon_social: c.nombre }));
            queryClient.invalidateQueries({ queryKey: ["almacenes_new"] });
            buscarClientes("");
          }}
        />
        <NuevoAlmacenMiniModal
          open={openAlmacenModal}
          onClose={() => setOpenAlmacenModal(false)}
          onCreated={(a) => {
            setForm((p) => ({ ...p, almacen: String(a.idalmacen), almacen_nombre: a.nombre }));
            queryClient.invalidateQueries({ queryKey: ["almacenes_new"] });
          }}
        />

    </>
  );

  if (asPage) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[calc(100vh-8rem)] overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-white rounded-2xl flex flex-col max-h-[95vh]">
        {content}
      </DialogContent>
    </Dialog>
  );
}

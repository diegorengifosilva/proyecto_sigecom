import React, { useState, useEffect } from "react";
import logoImg from "@/assets/logo.png";
import api from "@/services/api";
import SelectField from "@/components/ui/SelectField";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Package,
  Trash2,
  Plus,
  X
} from "lucide-react";

export default function NuevaLogisticaModal({ open, onClose, logistica, operacion = "E", modo = "N" }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    moneda: "Soles",
    operacion: operacion,
  });
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ codigo: "", descripcion: "", um: "", cant: "", valor: "" });

  const [openBuscador, setOpenBuscador] = useState(false);
  const [busquedaQuery, setBusquedaQuery] = useState("");
  const [productosLista, setProductosLista] = useState([]);
  const [loadingBuscador, setLoadingBuscador] = useState(false);

  const [openCliente, setOpenCliente] = useState(false);
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteLista, setClienteLista] = useState([]);
  const [loadingCliente, setLoadingCliente] = useState(false);

  const totalGeneral = items.reduce((acc, item) => acc + Number(item.total || 0), 0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewItemChange = (field, value) => {
    setNewItem((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddNewItem = () => {
    if (!newItem.codigo && !newItem.descripcion) return;
    const cant = Number(newItem.cant || 0);
    const valor = Number(newItem.valor || 0);
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        codigo: newItem.codigo,
        descripcion: newItem.descripcion,
        um: newItem.um,
        cant: cant,
        valor: valor,
        total: cant * valor,
      },
    ]);
    setNewItem({ codigo: "", descripcion: "", um: "", cant: "", valor: "" });
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const fetchNextNumReg = async () => {
    try {
      const { data } = await api.get("logistica/dashboard/next-num-reg/");
      setForm((prev) => ({ ...prev, numero: data.num_reg_formatted }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogisticaDetalle = async (num_reg) => {
    setLoading(true);
    try {
      const res = await api.get(`logistica/dashboard/modal/${num_reg}/`);
      const cab = res.data.cabecera || {};
      setForm({
        ...cab,
        moneda: cab.moneda === "Dolares" ? "Dolares" : "Soles",
        tc: Number(cab.tipo_cambio || 0),
        numero: cab.numero,
      });
      setItems((res.data.items || []).map((item, idx) => ({
        id: idx + 1,
        codigo: item.codigo,
        descripcion: item.nombre,
        um: item.unidad,
        cant: Number(item.cantidad),
        valor: Number(item.valor_unitario),
        total: Number(item.total),
      })));
    } catch (err) {
      toast.error("Error al cargar el detalle");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (logistica?.num_reg) {
      fetchLogisticaDetalle(logistica.num_reg);
    } else {
      fetchNextNumReg();
      setForm(prev => ({ ...prev, operacion }));
    }
  }, [open, logistica?.num_reg, operacion]);

  const handleSave = async () => {
    if (items.length === 0) {
      toast.warning("Debe agregar al menos un ítem");
      return;
    }
    setSaving(true);
    try {
      await api.post("logistica/movimiento/", { ...form, items, ope: operacion });
      toast.success(`${operacion === "E" ? "Entrada" : "Salida"} guardada correctamente`);
      onClose();
    } catch (error) {
      toast.error("Error al guardar el registro");
    } finally {
      setSaving(false);
    }
  };

  const fetchProductos = async (q) => {
    setLoadingBuscador(true);
    try {
      const res = await api.get(`logistica/dashboard/productos/?q=${q}`);
      setProductosLista(res.data || []);
    } finally {
      setLoadingBuscador(false);
    }
  };

  useEffect(() => {
    if (!openBuscador) return;
    const t = setTimeout(() => fetchProductos(busquedaQuery), 400);
    return () => clearTimeout(t);
  }, [busquedaQuery, openBuscador]);

  const fetchClientes = async (q) => {
    setLoadingCliente(true);
    try {
      const res = await api.get("core/clientes/", { params: { q } });
      setClienteLista(res.data || []);
    } finally {
      setLoadingCliente(false);
    }
  };

  useEffect(() => {
    if (!openCliente) return;
    const t = setTimeout(() => fetchClientes(clienteQuery), 400);
    return () => clearTimeout(t);
  }, [clienteQuery, openCliente]);

  const handleSeleccionarProducto = (p) => {
    setNewItem({
      codigo: p.codigo || "",
      descripcion: p.nombre || "",
      um: p.unidad || "",
      cant: "",
      valor: Number(p.precio || 0),
    });
    setOpenBuscador(false);
  };

  const almacenesOptions = [
    { id: "000", nombre: "Almacen Principal" },
    { id: "001", nombre: "Almacen Equipos de Proteccion" },
  ];

  const ReferenciaOptions = [
    { id: "P", nombre: "Proveedor/Cliente" },
    { id: "D", nombre: "Dependencia" },
  ];

  const movimientoOptions = [
    { id: "01", nombre: "Orden de Compra" },
    { id: "05", nombre: "Nota de Entrada" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-white rounded-2xl flex flex-col max-h-[95vh]">
        <div className="shrink-0 bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 text-white rounded-lg"><Package size={20} /></div>
            <img src={logoImg} alt="Logo" className="h-8 w-auto" />
            <div>
              <h3 className="text-sm font-black text-white uppercase">{operacion === "E" ? "Entrada" : "Salida"} de Almacén</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase">SIGECOM Logística</p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-bold border border-slate-700">
            ID: {form.numero || "-"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          <div className="grid grid-cols-12 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha</label>
              <input type="date" name="fecha" value={form.fecha || ""} onChange={handleInputChange} className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2" />
            </div>
            <div className="col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Almacén</label>
              <SelectField id="almacen" value={form.almacen || ""} onChange={handleInputChange} options={almacenesOptions} />
            </div>
            <div className="col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Moneda</label>
              <select name="moneda" value={form.moneda || "Soles"} onChange={handleInputChange} className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-white">
                <option value="Soles">Soles</option>
                <option value="Dolares">Dólares</option>
              </select>
            </div>
            <div className="col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Referencia</label>
              <SelectField id="referencia" value={form.referencia || ""} onChange={handleInputChange} options={ReferenciaOptions} />
            </div>
            <div className="col-span-4 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo Movimiento</label>
              <SelectField id="tipo_movimiento" value={form.tipo_movimiento || ""} onChange={handleInputChange} options={movimientoOptions} />
            </div>
            <div className="col-span-8 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Razón Social</label>
              <div className="relative">
                <input type="text" value={form.razon_social || ""} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 pr-10" />
                <button onClick={() => setOpenCliente(true)} className="absolute right-2 top-1/2 -translate-y-1/2 text-teal-600">🔍</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800 text-[10px] font-black text-slate-300 uppercase">
                  <th className="px-4 py-2 w-12 text-center">Nro</th>
                  <th className="px-4 py-2 w-32">Código</th>
                  <th className="px-4 py-2">Descripción</th>
                  <th className="px-4 py-2 w-16 text-center">UM</th>
                  <th className="px-4 py-2 w-16 text-center">Cant</th>
                  <th className="px-4 py-2 w-24 text-right">Valor</th>
                  <th className="px-4 py-2 w-24 text-right">Total</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
                <tr className="bg-slate-100">
                  <td></td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => setOpenBuscador(true)} className="bg-slate-300 px-1 rounded text-[10px]">»</button>
                      <input type="text" value={newItem.codigo} onChange={(e) => handleNewItemChange("codigo", e.target.value)} className="w-full text-[11px] font-bold border border-slate-300 rounded px-2" />
                    </div>
                  </td>
                  <td className="px-2 py-2"><input type="text" value={newItem.descripcion} onChange={(e) => handleNewItemChange("descripcion", e.target.value)} className="w-full text-[11px] border border-slate-300 rounded px-2 uppercase" /></td>
                  <td className="px-2 py-2"><input type="text" value={newItem.um} onChange={(e) => handleNewItemChange("um", e.target.value)} className="w-full text-[11px] text-center border border-slate-300 rounded" /></td>
                  <td className="px-2 py-2"><input type="number" value={newItem.cant} onChange={(e) => handleNewItemChange("cant", e.target.value)} className="w-full text-[11px] text-center border border-slate-300 rounded" /></td>
                  <td className="px-2 py-2"><input type="number" value={newItem.valor} onChange={(e) => handleNewItemChange("valor", e.target.value)} className="w-full text-[11px] text-right border border-slate-300 rounded" /></td>
                  <td className="px-4 py-2 text-right text-[11px] font-black">{(Number(newItem.cant || 0) * Number(newItem.valor || 0)).toFixed(2)}</td>
                  <td className="px-2 py-2"><button onClick={handleAddNewItem} className="p-1 bg-teal-500 text-white rounded"><Plus size={14} /></button></td>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 text-xs">
                    <td className="px-4 py-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-4 py-2 font-bold">{item.codigo}</td>
                    <td className="px-4 py-2 uppercase">{item.descripcion}</td>
                    <td className="px-4 py-2 text-center">{item.um}</td>
                    <td className="px-4 py-2 text-center font-bold">{item.cant}</td>
                    <td className="px-4 py-2 text-right">{item.valor.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-black">{item.total.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center"><button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right text-[10px] uppercase">Total General:</td>
                  <td className="px-4 py-3 text-right text-sm text-amber-600">{totalGeneral.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="shrink-0 px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="text-xs font-bold uppercase tracking-widest text-slate-500">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold uppercase tracking-widest px-8 rounded-xl shadow-lg shadow-teal-100">
            {saving ? "Guardando..." : "Guardar Registro"}
          </Button>
        </div>

        {openBuscador && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[400px] flex flex-col border border-slate-200">
              <div className="px-4 py-3 bg-slate-800 text-white flex justify-between items-center rounded-t-xl">
                <span className="text-[11px] font-black uppercase">Buscar Producto</span>
                <button onClick={() => setOpenBuscador(false)}><X size={16} /></button>
              </div>
              <div className="p-4"><input autoFocus type="text" value={busquedaQuery} onChange={(e) => setBusquedaQuery(e.target.value)} className="w-full border p-2 text-xs rounded-lg" placeholder="Código o nombre..." /></div>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {productosLista.map(p => (
                  <div key={p.codigo} onClick={() => handleSeleccionarProducto(p)} className="p-2 border-b text-xs hover:bg-teal-50 cursor-pointer flex justify-between">
                    <span className="font-bold">{p.codigo}</span>
                    <span>{p.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {openCliente && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[400px] flex flex-col border border-slate-200">
              <div className="px-4 py-3 bg-slate-800 text-white flex justify-between items-center rounded-t-xl">
                <span className="text-[11px] font-black uppercase">Buscar Cliente</span>
                <button onClick={() => setOpenCliente(false)}><X size={16} /></button>
              </div>
              <div className="p-4"><input autoFocus type="text" value={clienteQuery} onChange={(e) => setClienteQuery(e.target.value)} className="w-full border p-2 text-xs rounded-lg" placeholder="Nombre o RUC..." /></div>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {clienteLista.map(c => (
                  <div key={c.codigo} onClick={() => { setForm({ ...form, razon_social: c.nombre }); setOpenCliente(false); }} className="p-2 border-b text-xs hover:bg-teal-50 cursor-pointer flex justify-between">
                    <span className="font-bold">{c.ruc || "-"}</span>
                    <span>{c.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useEffect } from "react";
import api from "@/services/api";
import SelectField from "../../components/ui/SelectField";
import InputField from "../../components/ui/InputField";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import TablaRittal from "./tables/TablaRittal";
import TablaPhoenix from "./tables/TablaPhoenix";
import TablaOtros from "./tables/TablaOtros";   // OTROS
import TablaAlmLista from "./tables/TablaAlmLista";   // SCHNEIDER / LS

function RegistroItemBuscadorModal({ open, onClose, onSelect, item, num_reg }) {
  const [cantidad, setCantidad] = useState(1);
  const [proveedores, setProveedores] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const toNumber = v => Number(v) || 0;
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [codigoItemOpen, setCodigoItemOpen] = useState(false);
  const [endpointCodigoItem, setEndpointCodigoItem] = useState(null);
  const [tcamb, setTcamb] = useState(1);
  const [tcambCargado, setTcambCargado] = useState(false);
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
    utilidad: "",
    porcentaje: "",
    costoTotal: "",
    ventaPrecio: "",
    ventaTotal: "",
    utilidadTotal: "",
  });
  const [form, setForm] = useState(getEmptyForm());
  const resetForm = () => {
    setForm(getEmptyForm());
  };

  useEffect(() => {
    if (!open || !num_reg) return;

    const fetchCotizacion = async () => {
      const res = await api.get(`/cotizaciones/cotizacion_detalle/${num_reg}/`);
      setTcamb(Number(res.data.tcamb) || 1);
    };
    fetchCotizacion();
  }, [open, num_reg]);

  const fetchItems = async (texto = "") => {
    setLoading(true);

    try {
      const endpoint = resolverEndpointPorProveedor(form.proveedor) || "/items/";

      const search = texto
        ? texto.trim().toUpperCase()
        : "";

      const res = await api.get(endpoint, {
        params: search ? { search } : { limit: 15 }
      });

      setResults(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error cargando items", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // ==============
  // PROVEEDORES
  // ==============
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const res = await api.get("/core/tipo_marca/");
        setProveedores(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Error cargando proveedores", error);
        setProveedores([]);
      }
    };

    fetchProveedores();
  }, []);

  const proveedorOptions = [
    ...proveedores.map(p => ({
      id: p.codigo,
      nombre: p.nombre
    }))
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(prev => {
      const next = { ...prev, [name]: value };

      const cantidad = toNumber(next.cantidad);
      const costo = toNumber(next.costoPrecio);
      let utilidad = toNumber(next.utilidad);

      const costoTotal = costo * cantidad;

      // 🔹 Porcentaje editable → recalcula utilidad
      if (name === "porcentaje" && costoTotal > 0) {
        utilidad = (toNumber(next.porcentaje) * costoTotal) / 100;
        next.utilidad = utilidad.toFixed(2);
      }

      // 🔹 Utilidad editable → recalcula porcentaje
      if (name === "utilidad" && costoTotal > 0) {
        next.porcentaje = ((utilidad / costoTotal) * 100).toFixed(2);
      }

      const ventaPrecio = costo + utilidad;
      const ventaTotal = ventaPrecio * cantidad;
      const utilidadTotal = utilidad * cantidad;

      next.costoTotal = costoTotal.toFixed(2);
      next.ventaPrecio = ventaPrecio.toFixed(2);
      next.ventaTotal = ventaTotal.toFixed(2);
      next.utilidadTotal = utilidadTotal.toFixed(2);

      return next;
    });
  };

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

  // ==========================
  // BÚSQUEDA CON DEBOUNCE
  // ==========================
  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(() => {
      fetchItems(query.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, form.proveedor, open]);

  //=========
  // RITTAL
  //=========
  const handleSelectRittal = (item) => {
    onSelect(item); // ya viene todo calculado
    toast.success("Ítem agregado");
  };

  //==================
  // PHOENIX CONTACT
  //==================
  const handleSelectPhoenix = (item) => {
    onSelect(item); // ya viene todo calculado
    toast.success("Ítem agregado");
  };

  //=========
  // LS / SCHNEIDER
  //=========
  const handleSelectAlm = (item) => {
    onSelect(item); // ya viene todo calculado
    toast.success("Ítem agregado");
  };

  //=========
  // OTROS
  //=========
  const handleSelectOtros = (item) => {
    onSelect(item); // ya viene todo calculado
    toast.success("Ítem agregado");
  };

  // ==============
  // RENDER TABLA
  // ==============
  const renderTabla = () => {
    switch (form.proveedor) {
      // RITTAL
      case "03":
        return (
          <TablaRittal
            registros={results}
            loading={loading}
            tcamb={tcamb}
            cantidad={cantidad}
            proveedor={form.proveedor}
            onSelect={handleSelectRittal}
          />
        );

      // PHOENIX CONTACT
      case "05":
        return (
          <TablaPhoenix
            registros={results}
            loading={loading}
            tcamb={tcamb}
            cantidad={cantidad}
            proveedor={form.proveedor}
            onSelect={handleSelectPhoenix}
          />
        );

      // SCHNEIDER / LS
      case "06":
        return (
          <TablaAlmLista
            registros={results}
            loading={loading}
            tcamb={tcamb}
            cantidad={cantidad}
            proveedor={form.proveedor}
            onSelect={handleSelectAlm}
          />
        );

      case "07":
        return (
          <TablaAlmLista
            registros={results}
            loading={loading}
            tcamb={tcamb}
            cantidad={cantidad}
            proveedor={form.proveedor}
            onSelect={handleSelectAlm}
          />
        );

      // OTROS
      case "99":
        return (
          <TablaOtros
            registros={results}
            loading={loading}
            tcamb={tcamb}
            cantidad={cantidad}
            proveedor={form.proveedor}
            onSelect={handleSelectOtros}
          />
        );
      default:
        return <div className="text-center py-6 text-sm text-neutral-500">Proveedor no soportado</div>;
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">

        {/* HEADER MODERNO */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <Search size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Búsqueda de ítems de suministro
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Catálogo general de productos y proveedores
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL (p-2 para mantener consistencia) */}
        <div className="p-2 space-y-2">

          {/* PANEL DE FILTROS ESTILIZADO */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 shadow-inner">
            <div className="grid grid-cols-4 gap-4 items-end">

              {/* CANTIDAD */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-tight ml-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                />
              </div>

              {/* PROVEEDOR */}
              <div className="space-y-1.5">
                <SelectField
                  inline
                  size="sm"
                  label="Proveedor"
                  name="proveedor"
                  value={form.proveedor}
                  onChange={handleChange}
                  options={proveedorOptions}
                  className="text-xs font-semibold"
                />
              </div>

              {/* BUSCADOR */}
              <div className="col-span-2 space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-tight ml-1">
                  Buscar ítem
                </label>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={14} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Escriba código o descripción…"
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN DEL PANEL */}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200/60">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-xl transition-all"
              >
                Salir
              </Button>
              <Button
                variant="ghost"
                onClick={() => fetchItems(query.trim())}
                className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-teal-700 hover:bg-teal-100 rounded-xl transition-all"
              >
                Buscar
              </Button>
            </div>
          </div>

          {/* ÁREA DE TABLA / RESULTADOS */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm min-h-[300px]">
            {renderTabla()}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

export default RegistroItemBuscadorModal;

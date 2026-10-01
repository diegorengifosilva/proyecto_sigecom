import React, { useEffect, useState } from "react";
import InputField from "../../components/ui/InputField";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Shapes, FileEdit, Calculator, TrendingUp, ChevronsRight } from "lucide-react";
import CodigoTipoGastoModal from "./CodigoTipoGastoModal";
import { roundMoney, moneyTotal } from "@/utils/money";

function RegistroItemOtrosModal({ open, onClose, onConfirm, codigoTipoGasto, item }) {
  const [form, setForm] = useState({
    codigoTipoGasto: "",
    concepto: "",
    cantidad: 1,
    precio: 0,
    utilidad: 0,
    porcentaje: 20,
    total: 0,
    ventaPrecio: 0,
    ventaTotal: 0,
    utilidadTotal: 0,
  });
  const [codigoTipoGastoOpen, setCodigoTipoGastoOpen] = useState(false);
  const toNumber = v => Number(v) || 0;

  // ==========================
  // RESET / CARGA DATOS EXISTENTES
  // ==========================
  useEffect(() => {
    if (!open) return;

    if (item) {
      // ✏️ MODO EDICIÓN
      setForm({
        id: item.id ?? item.num,   // opcional, solo referencia visual
        num: item.num,             // 🔴 ESTA ES LA CLAVE REAL
        codigoTipoGasto: item.cod || codigoTipoGasto || "",
        concepto: item.des || "",
        cantidad: item.can ?? 1,
        precio: item.puc ?? 0,
        utilidad: item.tou ?? 0,
        porcentaje: item.cau ?? 20,
        total: item.toc ?? 0,
        ventaPrecio: item.val ?? 0,
        ventaTotal: item.tot ?? 0,
        utilidadTotal: toNumber(item.tou) * toNumber(item.can),
      });
    } else {
      // ➕ MODO NUEVO
      setForm({
        codigoTipoGasto: codigoTipoGasto || "",
        concepto: "",
        cantidad: 1,
        precio: 0.00,
        utilidad: 0.00,
        porcentaje: 20.00,
        total: 0.00,
        ventaPrecio: 0.00,
        ventaTotal: 0.00,
        utilidadTotal: 0.00,
      });
    }
  }, [open, codigoTipoGasto, item]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(prev => {
      const actualizado = { ...prev, [name]: value };
      return calcularValores(actualizado, name);
    });
  };

  const handleSubmit = () => {
    if (!form.concepto.trim()) return;
    onConfirm(form);
    onClose();
  };

  const calcularValores = (data, campoModificado = null) => {
    const next = { ...data };

    const cantidad = toNumber(next.cantidad);
    const precio = toNumber(next.precio);
    let utilidad = toNumber(next.utilidad);
    let porcentaje = toNumber(next.porcentaje);

    // ==========================================
    // 1️⃣ REGLA DE ORO: EL PORCENTAJE ES EL MASTER
    // ==========================================

    // Si cambia el PRECIO o cambia el PORCENTAJE -> Recalculamos UTILIDAD
    if (campoModificado === "precio" || campoModificado === "porcentaje" || campoModificado === null) {
      utilidad = roundMoney((precio * porcentaje) / 100);
      next.utilidad = utilidad;
    } 
    
    else if (campoModificado === "utilidad") {
      if (precio > 0) {
        porcentaje = roundMoney((utilidad / precio) * 100);
        next.porcentaje = porcentaje;
      }
    }

    next.total = moneyTotal(precio, cantidad);
    next.ventaPrecio = roundMoney(Number(precio) + Number(utilidad));
    next.ventaTotal = moneyTotal(next.ventaPrecio, cantidad);
    next.utilidadTotal = moneyTotal(utilidad, cantidad);

    return next;
  };


  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
        
        {/* HEADER MODERNO */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <Shapes size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Registro Item - Otros Gastos
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Gastos misceláneos y conceptos no clasificados
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO FORMULARIO */}
        <div className="p-2 space-y-2">
          
          {/* SECCIÓN 1: DEFINICIÓN DEL GASTO */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
            <div className="flex items-center gap-2">
              <FileEdit size={14} className="text-teal-600" />
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Definición del Concepto</span>
            </div>

            <InputField
              inline size="sm" label="Tipo Gasto:" name="codigoTipoGasto"
              value={form.codigoTipoGasto} onChange={handleChange}
              className="text-xs font-semibold focus:ring-teal-500/20"
              trailingIcon={
                <button
                  type="button"
                  className="ml-1 text-[#0d767e] hover:scale-110 transition-transform"
                  onClick={() => setCodigoTipoGastoOpen(true)}
                >
                  <ChevronsRight size={16} />
                </button>
              }
            />

            <div className="flex items-start gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[85px] pt-1">
                Concepto:
              </label>
              <textarea
                name="concepto" value={form.concepto} onChange={handleChange} rows={2}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-2 py-1.5 resize-none min-h-[40px] focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all bg-white"
                placeholder="Describa el gasto..."
              />
            </div>
          </div>

          {/* SECCIÓN 2: CÁLCULOS Y MARGEN */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* INPUTS DE COSTO */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-center gap-2 mb-1">
                <Calculator size={14} className="text-teal-600" />
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Costos Base</span>
              </div>
              <InputField inline size="sm" type="number" label="Cantidad:" name="cantidad" value={form.cantidad} onChange={handleChange} />
              <InputField inline size="sm" label="Precio Unitario:" name="precio" value={form.precio} onChange={handleChange} />
              <InputField inline size="sm" label="Utilidad:" name="utilidad" value={form.utilidad} onChange={handleChange} />
              <InputField inline size="sm" label="Porcentaje:" name="porcentaje" value={form.porcentaje} onChange={handleChange} />
            </div>

            {/* TOTALES DE VENTA */}
            <div className="bg-[#0d767e]/5 border border-[#0d767e]/10 rounded-2xl p-4 space-y-2 shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-[#0d767e]" />
                <span className="text-[11px] font-black text-[#0d767e] uppercase tracking-tight">Resultados de Venta</span>
              </div>
              <div className="space-y-1">
                <InputField inline size="sm" label="Costo Total:" value={form.total} readOnly className="bg-transparent border-none text-[11px]" />
                <InputField inline size="sm" label="Precio Venta:" value={form.ventaPrecio} readOnly className="bg-transparent border-none text-[11px]" />
                <InputField inline size="sm" label="Utilidad Total:" value={form.utilidadTotal} readOnly className="bg-transparent border-none font-bold text-teal-700 text-[11px]" />
                <div className="pt-2 mt-2 border-t border-[#0d767e]/10">
                   <InputField inline size="sm" label="Venta Total:" value={form.ventaTotal} readOnly className="bg-transparent border-none font-black text-[#0d767e] text-sm" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
          <Button
            variant="ghost" onClick={onClose}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-xl transition-all"
          >
            Salir
          </Button>
          <Button
            variant="ghost" onClick={handleSubmit}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-teal-700 hover:bg-teal-100 rounded-xl transition-all"
          >
            Aceptar
          </Button>
        </div>

        <CodigoTipoGastoModal
          open={codigoTipoGastoOpen}
          onClose={() => setCodigoTipoGastoOpen(false)}
          onSelect={(registro) =>
            setForm(prev => {
              const actualizado = {
                ...prev,
                codigoTipoGasto: registro.codigo,
                concepto: registro.nombre,
                porcentaje: 20,
              };
              return calcularValores(actualizado, "porcentaje");
            })
          }

        />
      </DialogContent>
    </Dialog>
  );
}

export default RegistroItemOtrosModal;

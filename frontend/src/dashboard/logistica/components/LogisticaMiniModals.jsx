import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import { toast } from "react-toastify";

const CLIENTE_VACIO = {
  nombre: "",
  ruc: "",
  iniciales: "",
  direccion: "",
  tipo: 1,
  forma_pago: "",
  pagina_web: "",
  representante_legal: "",
  ubicacion: "",
  activo: "1",
};

export function MiniModal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="px-4 py-3 bg-slate-800 text-white flex justify-between items-center rounded-t-xl">
          <span className="text-[11px] font-black uppercase">{title}</span>
          <button onClick={onClose} className="hover:text-slate-300"><X size={16} /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-4 py-3 border-t bg-slate-50 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

export function NuevoClienteMiniModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(CLIENTE_VACIO);
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre?.trim()) { toast.warning("Ingrese el nombre del cliente"); return; }
    if (!form.direccion?.trim()) { toast.warning("Ingrese la dirección"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("core/clientes/", form);
      toast.success("Cliente registrado");
      onCreated(data.data || data);
      onClose();
      setForm(CLIENTE_VACIO);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al registrar cliente");
    } finally { setSaving(false); }
  };

  return (
    <MiniModal
      title="Nuevo Cliente / Proveedor"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="text-xs">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="text-xs bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Razón Social *</label>
          <input className="w-full border rounded-lg px-2 py-1.5 mt-0.5" value={form.nombre}
            onChange={(e) => setF("nombre", e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">RUC</label>
          <input className="w-full border rounded-lg px-2 py-1.5 mt-0.5" value={form.ruc}
            onChange={(e) => setF("ruc", e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Iniciales</label>
          <input className="w-full border rounded-lg px-2 py-1.5 mt-0.5" value={form.iniciales}
            onChange={(e) => setF("iniciales", e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Dirección *</label>
          <input className="w-full border rounded-lg px-2 py-1.5 mt-0.5" value={form.direccion}
            onChange={(e) => setF("direccion", e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Forma de pago</label>
          <input className="w-full border rounded-lg px-2 py-1.5 mt-0.5" value={form.forma_pago}
            onChange={(e) => setF("forma_pago", e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Ubicación</label>
          <input className="w-full border rounded-lg px-2 py-1.5 mt-0.5" value={form.ubicacion}
            onChange={(e) => setF("ubicacion", e.target.value)} />
        </div>
      </div>
    </MiniModal>
  );
}

export function NuevoAlmacenMiniModal({ open, onClose, onCreated }) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  const handleSave = async () => {
    if (!nombre.trim()) { toast.warning("Ingrese el nombre del almacén"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("logistica/almacenes/", { nombre, direccion, activo: "1" });
      toast.success("Almacén registrado");
      onCreated(data);
      onClose();
      setNombre("");
      setDireccion("");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al registrar almacén");
    } finally { setSaving(false); }
  };

  return (
    <MiniModal
      title="Nuevo Almacén"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="text-xs">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="text-xs bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre *</label>
          <input className="w-full border rounded-lg px-2 py-1.5 mt-0.5" value={nombre}
            onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Dirección</label>
          <input className="w-full border rounded-lg px-2 py-1.5 mt-0.5" value={direccion}
            onChange={(e) => setDireccion(e.target.value)} />
        </div>
      </div>
    </MiniModal>
  );
}

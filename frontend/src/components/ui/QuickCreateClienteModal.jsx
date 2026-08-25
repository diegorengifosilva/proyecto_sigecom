import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Building2, CornerDownLeft } from "lucide-react";
import api from "@/services/api";
import { toast } from "../../utils/toast";
import { generarIniciales } from "@/utils/formatters";

export default function QuickCreateClienteModal({ open, onClose, onSave, initialName = "", coords, numReg }) {
  const [formData, setFormData] = useState({
    nombre: "",
    ruc: "",
    direccion: "",
    tipo: 0, // 0 = Cliente, 1 = Proveedor, 2 = Cliente / Proveedor
    forma_pago: "Contado",
    ubicacion: "", // Rubro
    representante_legal: "",
    iniciales: "",
    activo: "1"
  });

  const [loading, setLoading] = useState(false);

  // Input refs for keyboard navigation and auto-focus
  const nombreRef = useRef(null);
  const rucRef = useRef(null);
  const tipoRef = useRef(null);
  const direccionRef = useRef(null);
  const formaPagoRef = useRef(null);
  const ubicacionRef = useRef(null);

  const fieldsRef = [nombreRef, rucRef, tipoRef, direccionRef, formaPagoRef, ubicacionRef];

  useEffect(() => {
    if (open) {
      const initNombre = initialName || "";
      setFormData({
        nombre: initNombre,
        ruc: "",
        direccion: "",
        tipo: 0,
        forma_pago: "Contado",
        ubicacion: "",
        representante_legal: "",
        iniciales: generarIniciales(initNombre),
        activo: "1"
      });

      // Auto-focus en Nombre / Razón Social al abrir
      setTimeout(() => {
        if (nombreRef.current) {
          nombreRef.current.focus();
          if (initNombre) {
            nombreRef.current.setSelectionRange(initNombre.length, initNombre.length);
          }
        }
      }, 60);
    }
  }, [open, initialName]);

  // Handle global Escape key listener on popup card
  useEffect(() => {
    if (!open) return;
    const handleGlobalKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [open, onClose]);

  const handleNombreChange = (e) => {
    const val = e.target.value;
    const autoIniciales = generarIniciales(val);

    setFormData(prev => ({
      ...prev,
      nombre: val,
      iniciales: autoIniciales
    }));
  };

  if (!open) return null;

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }
    if (!formData.ruc || formData.ruc.trim().length !== 11) {
      toast.error("El RUC debe tener exactamente 11 dígitos");
      return;
    }
    if (!formData.direccion.trim()) {
      toast.error("La dirección es obligatoria");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        nombre: formData.nombre.trim(),
        ruc: formData.ruc.trim(),
        direccion: formData.direccion.trim(),
        tipo: parseInt(formData.tipo),
        forma_pago: formData.forma_pago.trim() || "Contado",
        num_reg: numReg || "",
        activo: "1"
      };

      const res = await api.post("core/clientes/", payload);
      const nuevoCliente = res.data?.data || res.data;
      toast.success("Empresa/Cliente creado con éxito");

      if (onSave) {
        onSave(nuevoCliente);
      }
      onClose();
    } catch (err) {
      console.error("Error al crear cliente:", err);
      toast.error(err.response?.data?.error || "Error al crear el cliente");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === 2 && tipoRef.current?.showPicker) {
        try {
          tipoRef.current.showPicker();
        } catch (err) {
          handleSubmit();
        }
      } else {
        handleSubmit();
      }
      return;
    }

    const target = e.target;
    const isText = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
    const selStart = isText ? target.selectionStart : 0;
    const valLen = isText ? (target.value || "").length : 0;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (index === 0) fieldsRef[1].current?.focus();
      else if (index === 1 || index === 2) fieldsRef[3].current?.focus();
      else if (index === 3) fieldsRef[4].current?.focus();
      else if (index === 4 || index === 5) fieldsRef[0].current?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index === 0) fieldsRef[5].current?.focus();
      else if (index === 1 || index === 2) fieldsRef[0].current?.focus();
      else if (index === 3) fieldsRef[1].current?.focus();
      else if (index === 4 || index === 5) fieldsRef[3].current?.focus();
    } else if (e.key === "ArrowRight") {
      if (index === 1) {
        e.preventDefault();
        fieldsRef[2].current?.focus();
      } else if (index === 4) {
        e.preventDefault();
        fieldsRef[5].current?.focus();
      } else if (isText && selStart === valLen) {
        if (index === 0) { e.preventDefault(); fieldsRef[1].current?.focus(); }
        else if (index === 2) { e.preventDefault(); fieldsRef[3].current?.focus(); }
        else if (index === 3) { e.preventDefault(); fieldsRef[4].current?.focus(); }
      }
    } else if (e.key === "ArrowLeft") {
      if (index === 2) {
        e.preventDefault();
        fieldsRef[1].current?.focus();
      } else if (index === 5) {
        e.preventDefault();
        fieldsRef[4].current?.focus();
      } else if (isText && selStart === 0) {
        if (index === 1) { e.preventDefault(); fieldsRef[0].current?.focus(); }
        else if (index === 3) { e.preventDefault(); fieldsRef[2].current?.focus(); }
        else if (index === 4) { e.preventDefault(); fieldsRef[3].current?.focus(); }
      }
    }
  };

  const portalContainer = document.getElementById("cotizacion-nueva-modal-portals");
  const portalTarget = portalContainer || document.body;
  const dialogRect = portalContainer ? portalContainer.getBoundingClientRect() : null;
  const positionType = portalContainer ? "absolute" : "fixed";

  let leftPos = coords?.left ? Math.min(window.innerWidth - 480, Math.max(10, coords.left)) : Math.max(10, window.innerWidth / 2 - 230);
  let topPos = coords?.top ? coords.top + 6 : 100;

  if (dialogRect) {
    leftPos = leftPos - dialogRect.left;
    topPos = topPos - dialogRect.top;
  }

  return createPortal(
    <div
      style={{
        position: positionType,
        top: `${topPos}px`,
        left: `${leftPos}px`,
        width: "460px",
        zIndex: 99999,
        pointerEvents: "auto",
      }}
      className="bg-white/98 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.25)] border border-slate-200 p-4 animate-in fade-in zoom-in-95 duration-150 text-left font-sans text-slate-800 pointer-events-auto quick-create-cliente-modal"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* HEADER COMPACTO Y ELEGANTE */}
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
            <Building2 size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Nuevo Cliente / Empresa
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Creación rápida • Enter para guardar • Esc para cerrar
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={loading}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          title="Cerrar (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      {/* CUERPO ESPACIOSO Y BIEN DISTRIBUIDO */}
      <div className="grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto custom-scrollbar pr-0.5">
        {/* Nombre / Razón Social */}
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            Nombre / Razón Social *
          </label>
          <input
            ref={nombreRef}
            type="text"
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none uppercase transition-all"
            placeholder="EJ: EMPRESA INGENIERIA S.A.C."
            value={formData.nombre}
            onChange={handleNombreChange}
            onKeyDown={(e) => handleFieldKeyDown(e, 0)}
          />
        </div>

        {/* RUC */}
        <div className="col-span-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            RUC (11 dígitos) *
          </label>
          <input
            ref={rucRef}
            type="text"
            maxLength={11}
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-mono transition-all"
            placeholder="20123456789"
            value={formData.ruc}
            onChange={e => setFormData({ ...formData, ruc: e.target.value.replace(/\D/g, "") })}
            onKeyDown={(e) => handleFieldKeyDown(e, 1)}
          />
        </div>

        {/* Tipo */}
        <div className="col-span-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            Tipo *
          </label>
          <select
            ref={tipoRef}
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all cursor-pointer"
            value={formData.tipo}
            onChange={e => setFormData({ ...formData, tipo: parseInt(e.target.value) })}
            onKeyDown={(e) => handleFieldKeyDown(e, 2)}
          >
            <option value={0}>Cliente</option>
            <option value={1}>Proveedor</option>
            <option value={2}>Cliente / Proveedor</option>
          </select>
        </div>

        {/* Dirección */}
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            Dirección *
          </label>
          <input
            ref={direccionRef}
            type="text"
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none uppercase transition-all"
            placeholder="AV. PRINCIPAL 123 - LIMA"
            value={formData.direccion}
            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
            onKeyDown={(e) => handleFieldKeyDown(e, 3)}
          />
        </div>

        {/* Forma de Pago */}
        <div className="col-span-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            Forma de Pago *
          </label>
          <input
            ref={formaPagoRef}
            type="text"
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none uppercase transition-all"
            placeholder="Contado / Crédito 30 días"
            value={formData.forma_pago}
            onChange={e => setFormData({ ...formData, forma_pago: e.target.value })}
            onKeyDown={(e) => handleFieldKeyDown(e, 4)}
          />
        </div>

        {/* Rubro */}
        <div className="col-span-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            Rubro / Ubicación
          </label>
          <input
            ref={ubicacionRef}
            type="text"
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none uppercase transition-all"
            placeholder="Industrial / Minería"
            value={formData.ubicacion}
            onChange={e => setFormData({ ...formData, ubicacion: e.target.value })}
            onKeyDown={(e) => handleFieldKeyDown(e, 5)}
          />
        </div>
      </div>
    </div>,
    portalTarget
  );
}
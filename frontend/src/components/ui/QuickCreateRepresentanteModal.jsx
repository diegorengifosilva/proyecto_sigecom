import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Save, UserCheck, CornerDownLeft } from "lucide-react";
import api from "@/services/api";
import { toast } from "../../utils/toast";

export default function QuickCreateRepresentanteModal({ open, onClose, onSave, clienteId, clienteNombre = "", coords, initialName = "", numReg }) {
  const [formData, setFormData] = useState({
    nombre_representante: "",
    cargo: "",
    telefono: "",
    movil: "",
    email: "",
    direccion: "",
    activo: 1
  });

  const [loading, setLoading] = useState(false);

  // Input refs for keyboard navigation and auto-focus
  const nombreRef = useRef(null);
  const cargoRef = useRef(null);
  const emailRef = useRef(null);
  const telefonoRef = useRef(null);
  const movilRef = useRef(null);
  const direccionRef = useRef(null);

  const fieldsRef = [nombreRef, cargoRef, emailRef, telefonoRef, movilRef, direccionRef];

  useEffect(() => {
    if (open) {
      setFormData({
        nombre_representante: initialName || "",
        cargo: "",
        telefono: "",
        movil: "",
        email: "",
        direccion: "",
        activo: 1
      });

      // Auto-focus en Nombre Completo al abrir
      setTimeout(() => {
        if (nombreRef.current) {
          nombreRef.current.focus();
          if (initialName) {
            nombreRef.current.setSelectionRange(initialName.length, initialName.length);
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

  if (!open) return null;

  const handleSubmit = async () => {
    if (!clienteId) {
      toast.error("Debe seleccionar un cliente antes de crear un representante");
      return;
    }
    if (!formData.nombre_representante.trim()) {
      toast.error("El nombre del representante es obligatorio");
      return;
    }
    if (!formData.cargo.trim()) {
      toast.error("El cargo es obligatorio");
      return;
    }
    if (!formData.telefono.trim() && !formData.movil.trim()) {
      toast.error("Debe ingresar al menos un teléfono o móvil de contacto");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("El correo electrónico es obligatorio");
      return;
    }
    if (!formData.direccion.trim()) {
      toast.error("La dirección es obligatoria");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        id_cliente: parseInt(clienteId),
        nombre_representante: formData.nombre_representante.trim(),
        cargo: formData.cargo.trim(),
        telefono: formData.telefono.trim(),
        movil: formData.movil.trim() || formData.telefono.trim(),
        email: formData.email.trim(),
        direccion: formData.direccion.trim(),
        num_reg: numReg || "",
        activo: 1
      };

      const res = await api.post("core/representantes/", payload);
      const nuevoRep = res.data?.data || res.data;
      toast.success("Representante creado con éxito");

      if (onSave) {
        onSave(nuevoRep);
      }
      onClose();
    } catch (err) {
      console.error("Error al crear representante:", err);
      toast.error(err.response?.data?.error || "Error al crear el representante");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
      return;
    }

    const target = e.target;
    const isText = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
    const selStart = isText ? target.selectionStart : 0;
    const valLen = isText ? (target.value || "").length : 0;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (index === 0) fieldsRef[1].current?.focus();
      else if (index === 1) fieldsRef[3].current?.focus();
      else if (index === 2) fieldsRef[4].current?.focus();
      else if (index === 3 || index === 4) fieldsRef[5].current?.focus();
      else if (index === 5) fieldsRef[0].current?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index === 0) fieldsRef[5].current?.focus();
      else if (index === 1 || index === 2) fieldsRef[0].current?.focus();
      else if (index === 3) fieldsRef[1].current?.focus();
      else if (index === 4) fieldsRef[2].current?.focus();
      else if (index === 5) fieldsRef[3].current?.focus();
    } else if (e.key === "ArrowRight") {
      if (index === 1) {
        e.preventDefault();
        fieldsRef[2].current?.focus();
      } else if (index === 3) {
        e.preventDefault();
        fieldsRef[4].current?.focus();
      } else if (isText && selStart === valLen) {
        if (index === 0) { e.preventDefault(); fieldsRef[1].current?.focus(); }
        else if (index === 2) { e.preventDefault(); fieldsRef[3].current?.focus(); }
        else if (index === 4) { e.preventDefault(); fieldsRef[5].current?.focus(); }
      }
    } else if (e.key === "ArrowLeft") {
      if (index === 2) {
        e.preventDefault();
        fieldsRef[1].current?.focus();
      } else if (index === 4) {
        e.preventDefault();
        fieldsRef[3].current?.focus();
      } else if (isText && selStart === 0) {
        if (index === 1) { e.preventDefault(); fieldsRef[0].current?.focus(); }
        else if (index === 3) { e.preventDefault(); fieldsRef[2].current?.focus(); }
        else if (index === 5) { e.preventDefault(); fieldsRef[4].current?.focus(); }
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
      className="bg-white/98 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.25)] border border-slate-200 p-4 animate-in fade-in zoom-in-95 duration-150 text-left font-sans text-slate-800 pointer-events-auto quick-create-rep-modal"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* HEADER COMPACTO Y ELEGANTE */}
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <UserCheck size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Nuevo Representante
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[240px]">
              Empresa ID: #{clienteId} • Enter para guardar • Esc para cerrar
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
        {/* Nombre Representante */}
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            Nombre Completo *
          </label>
          <input
            ref={nombreRef}
            type="text"
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none uppercase transition-all"
            placeholder="EJ: ING. CARLOS MENDOZA"
            value={formData.nombre_representante}
            onChange={e => setFormData({ ...formData, nombre_representante: e.target.value })}
            onKeyDown={(e) => handleFieldKeyDown(e, 0)}
          />
        </div>

        {/* Cargo */}
        <div className="col-span-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            Cargo *
          </label>
          <input
            ref={cargoRef}
            type="text"
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none uppercase transition-all"
            placeholder="Gerente Proyectos"
            value={formData.cargo}
            onChange={e => setFormData({ ...formData, cargo: e.target.value })}
            onKeyDown={(e) => handleFieldKeyDown(e, 1)}
          />
        </div>

        {/* Email */}
        <div className="col-span-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            Correo Electrónico *
          </label>
          <input
            ref={emailRef}
            type="email"
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
            placeholder="contacto@empresa.com"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            onKeyDown={(e) => handleFieldKeyDown(e, 2)}
          />
        </div>

        {/* Teléfono */}
        <div className="col-span-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            Teléfono Fijo / Anexo *
          </label>
          <input
            ref={telefonoRef}
            type="text"
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-mono transition-all"
            placeholder="01 4556677"
            value={formData.telefono}
            onChange={e => setFormData({ ...formData, telefono: e.target.value })}
            onKeyDown={(e) => handleFieldKeyDown(e, 3)}
          />
        </div>

        {/* Móvil */}
        <div className="col-span-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            Celular / Móvil *
          </label>
          <input
            ref={movilRef}
            type="text"
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-mono transition-all"
            placeholder="988 776 655"
            value={formData.movil}
            onChange={e => setFormData({ ...formData, movil: e.target.value })}
            onKeyDown={(e) => handleFieldKeyDown(e, 4)}
          />
        </div>

        {/* Dirección */}
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            Dirección *
          </label>
          <input
            ref={direccionRef}
            type="text"
            className="w-full border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none uppercase transition-all"
            placeholder="OFICINA PRINCIPAL - LIMA"
            value={formData.direccion}
            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
            onKeyDown={(e) => handleFieldKeyDown(e, 5)}
          />
        </div>
      </div>
    </div>,
    portalTarget
  );
}



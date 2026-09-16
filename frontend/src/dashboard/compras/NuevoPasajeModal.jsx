import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plane,
  Bus,
  Coins,
  Loader,
  Save,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Lock,
  Users,
  Plus,
  Trash2,
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import EmpresaTransporteAutocomplete from "@/components/compras/EmpresaTransporteAutocomplete";
import CiudadAutocomplete from "@/components/ui/CiudadAutocomplete";
import DniUsuarioAutocomplete from "@/components/compras/DniUsuarioAutocomplete";
import useFormArrowNavigation from "@/hook/useFormArrowNavigation";

export default function NuevoPasajeModal({
  open,
  onClose,
  idApertura,
  aperturaData,
  category,
  disponible: propDisponible,
  categoryBudget: propBudget,
  categoryProgrammed: propProgrammed,
  defaultTransporte = "A",
  onSuccess,
}) {
  const { authUser: user } = useAuth();
  const { handleFormKeyDown } = useFormArrowNavigation();
  const [submitting, setSubmitting] = useState(false);
  const [loadingTC, setLoadingTC] = useState(false);

  const getTodayDate = () => new Date().toISOString().split("T")[0];
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(" ")[0].substring(0, 5);
  };

  const isAereo = (defaultTransporte || "A") === "A";

  const [formData, setFormData] = useState({
    transporte: defaultTransporte || "A",
    modo: 2, // 1: Solo Ida, 2: Retorno, 3: Ida y Vuelta
    id_empresa: null,
    empresa: "",
    lugar_origen: "",
    lugar_destino: "",
    fecha_salida: getTodayDate(),
    hora_salida: "",
    fecha_retorno: "",
    hora_retorno: "",
    tipo_moneda: isAereo ? "D" : "S",
    tipo_cambio: "3.7500",
    monto_dolares: "",
    monto_soles: "",
    concepto: "Pasaje Aereo / Terrestre",
    observacion: "",
  });

  // Estado de Pasajeros / Colaboradores que viajarán
  const [pasajeros, setPasajeros] = useState([]);
  const [newDniPasajero, setNewDniPasajero] = useState("");
  const [newNombrePasajero, setNewNombrePasajero] = useState("");
  const [newIdUsuarioPasajero, setNewIdUsuarioPasajero] = useState(null);
  const [newObsPasajero, setNewObsPasajero] = useState("");

  const inputDniRef = useRef(null);
  const inputNombreRef = useRef(null);
  const inputObsRef = useRef(null);

  // Métricas presupuestales de la categoría seleccionada
  const resolvedPresupuesto = propBudget !== undefined ? Number(propBudget) : (
    category?.budgetKeys ? category.budgetKeys.reduce((sum, key) => sum + Number(aperturaData?.[key] || 0), 0) : 0
  );
  const resolvedProgramado = propProgrammed !== undefined ? Number(propProgrammed) : (
    (aperturaData?.solicitudes || []).filter(s => {
      const gasto = Number(s.tipo_gasto !== undefined && s.tipo_gasto !== null ? s.tipo_gasto : s.tipo_movimiento);
      if (category?.id === "suministros") return gasto === 1 || gasto === 2;
      if (category?.id === "mano_obra") return gasto === 3;
      if (category?.id === "costo_servicios") return gasto === 4;
      if (category?.id === "otros") return gasto === 5 || (gasto < 1 || gasto > 5 || !gasto);
      return (category?.gastoIds || category?.movIds || []).includes(gasto);
    }).reduce((sum, s) => sum + Number(s.monto_dolares || 0), 0)
  );
  const resolvedDisponible = propDisponible !== undefined ? Number(propDisponible) : Math.max(0, resolvedPresupuesto - resolvedProgramado);
  const maxDisponibleUSD = Math.max(0, Number(resolvedDisponible || 0));
  const tcActual = parseFloat(formData?.tipo_cambio) || 3.75;
  const maxDisponiblePEN = maxDisponibleUSD * tcActual;

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      const aereo = (defaultTransporte || "A") === "A";
      setFormData({
        transporte: defaultTransporte || "A",
        modo: 2,
        id_empresa: null,
        empresa: "",
        lugar_origen: "",
        lugar_destino: "",
        fecha_salida: getTodayDate(),
        hora_salida: "",
        fecha_retorno: "",
        hora_retorno: "",
        tipo_moneda: aereo ? "D" : "S", // Pasajes aéreos por defecto en Dólares (D)
        tipo_cambio: "",
        monto_dolares: "",
        monto_soles: "",
        concepto: "Pasaje Aereo / Terrestre",
        observacion: "",
      });

      setPasajeros([]);
      setNewDniPasajero("");
      setNewNombrePasajero("");
      setNewIdUsuarioPasajero(null);
      setNewObsPasajero("");

      // Consultar API de Tipo de Cambio SUNAT del día
      const fetchTipoCambioSunat = async () => {
        try {
          setLoadingTC(true);
          const res = await api.get("cotizaciones/tipo-cambio-sunat/");
          if (res?.data) {
            const tcSunat = res.data.compra || res.data.venta || res.data.tipo_cambio;
            if (tcSunat) {
              const tcFormatted = Number(tcSunat).toFixed(4);
              setFormData((prev) => {
                const tc = parseFloat(tcFormatted) || 3.75;
                let soles = prev.monto_soles;
                let dolares = prev.monto_dolares;

                if (prev.tipo_moneda === "D" && dolares) {
                  soles = tc > 0 ? (parseFloat(dolares) * tc).toFixed(2) : "0.00";
                } else if (prev.tipo_moneda === "S" && soles) {
                  dolares = tc > 0 ? (parseFloat(soles) / tc).toFixed(2) : "0.00";
                }

                return {
                  ...prev,
                  tipo_cambio: tcFormatted,
                  monto_soles: soles,
                  monto_dolares: dolares,
                };
              });
            }
          }
        } catch (error) {
          console.warn("No se pudo obtener el tipo de cambio SUNAT en vivo:", error);
        } finally {
          setLoadingTC(false);
        }
      };

      fetchTipoCambioSunat();
    }
  }, [open, defaultTransporte]);

  if (!open) return null;

  const isDolares = formData.tipo_moneda === "D";

  const handleMonedaChange = (moneda) => {
    const tc = parseFloat(formData.tipo_cambio) || 3.75;
    setFormData((prev) => {
      let soles = prev.monto_soles;
      let dolares = prev.monto_dolares;

      if (moneda === "S" && dolares) {
        soles = tc > 0 ? (parseFloat(dolares) * tc).toFixed(2) : "0.00";
      } else if (moneda === "D" && soles) {
        dolares = tc > 0 ? (parseFloat(soles) / tc).toFixed(2) : "0.00";
      }

      return {
        ...prev,
        tipo_moneda: moneda,
        monto_soles: soles,
        monto_dolares: dolares,
      };
    });
  };

  const handleMontoSolesChange = (e) => {
    const val = e.target.value;
    const tc = parseFloat(formData.tipo_cambio) || 3.75;
    const num = parseFloat(val);

    if (!isNaN(num) && maxDisponibleUSD > 0 && tc > 0) {
      const equivUSD = num / tc;
      if (equivUSD > maxDisponibleUSD + 0.009) {
        const cappedSoles = (maxDisponibleUSD * tc).toFixed(2);
        toast.warning(
          `No se puede exceder el saldo disponible ($${maxDisponibleUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} / S/ ${cappedSoles}). El monto se ajustó al máximo posible.`
        );
        setFormData((prev) => ({
          ...prev,
          monto_soles: cappedSoles,
          monto_dolares: maxDisponibleUSD.toFixed(2),
        }));
        return;
      }
    } else if (!isNaN(num) && maxDisponibleUSD <= 0 && num > 0) {
      toast.error("No hay saldo disponible en este rubro ($0.00). No se pueden registrar gastos.");
      setFormData((prev) => ({
        ...prev,
        monto_soles: "0.00",
        monto_dolares: "0.00",
      }));
      return;
    }

    const converted = !isNaN(num) && tc > 0 ? (num / tc).toFixed(2) : "";

    setFormData((prev) => ({
      ...prev,
      monto_soles: val,
      monto_dolares: converted,
    }));
  };

  const handleMontoDolaresChange = (e) => {
    const val = e.target.value;
    const tc = parseFloat(formData.tipo_cambio) || 3.75;
    const num = parseFloat(val);

    if (!isNaN(num) && maxDisponibleUSD > 0) {
      if (num > maxDisponibleUSD + 0.009) {
        const cappedUSD = maxDisponibleUSD.toFixed(2);
        const cappedSoles = (maxDisponibleUSD * tc).toFixed(2);
        toast.warning(
          `No se puede exceder el saldo disponible ($${cappedUSD} / S/ ${cappedSoles}). El monto se ajustó al máximo posible.`
        );
        setFormData((prev) => ({
          ...prev,
          monto_dolares: cappedUSD,
          monto_soles: cappedSoles,
        }));
        return;
      }
    } else if (!isNaN(num) && maxDisponibleUSD <= 0 && num > 0) {
      toast.error("No hay saldo disponible en este rubro ($0.00). No se pueden registrar gastos.");
      setFormData((prev) => ({
        ...prev,
        monto_dolares: "0.00",
        monto_soles: "0.00",
      }));
      return;
    }

    const converted = !isNaN(num) && tc > 0 ? (num * tc).toFixed(2) : "";

    setFormData((prev) => ({
      ...prev,
      monto_dolares: val,
      monto_soles: converted,
    }));
  };

  const handleTipoCambioChange = (e) => {
    const tcVal = e.target.value;
    const tc = parseFloat(tcVal) || 0;

    setFormData((prev) => {
      let dolares = prev.monto_dolares;
      let soles = prev.monto_soles;

      if (prev.tipo_moneda === "S" && soles && tc > 0) {
        dolares = (parseFloat(soles) / tc).toFixed(2);
      } else if (prev.tipo_moneda === "D" && dolares && tc > 0) {
        soles = (parseFloat(dolares) * tc).toFixed(2);
      }

      return {
        ...prev,
        tipo_cambio: tcVal,
        monto_soles: soles,
        monto_dolares: dolares,
      };
    });
  };

  const handleAddPasajero = () => {
    const dniClean = (newDniPasajero || "").trim();
    const nombreClean = (newNombrePasajero || "").trim();
    const obsClean = (newObsPasajero || "").trim();

    if (!nombreClean && !dniClean) {
      toast.warning("Ingrese al menos el DNI o el Nombre del colaborador.");
      if (inputDniRef.current) inputDniRef.current.focus();
      return;
    }

    if (dniClean && pasajeros.some((p) => p.dni && p.dni === dniClean)) {
      toast.warning(`El colaborador con DNI ${dniClean} ya está en la lista.`);
      return;
    }

    const nuevo = {
      temp_id: Date.now() + Math.random(),
      id_usuario: newIdUsuarioPasajero || null,
      dni: dniClean,
      nombre: nombreClean || (dniClean ? `Pasajero DNI ${dniClean}` : "Pasajero"),
      observacion: obsClean,
    };

    setPasajeros((prev) => [...prev, nuevo]);
    setNewDniPasajero("");
    setNewNombrePasajero("");
    setNewIdUsuarioPasajero(null);
    setNewObsPasajero("");

    // Limpiar explícitamente los campos del formulario y reenfocar en DNI limpio
    setTimeout(() => {
      if (inputDniRef.current) {
        inputDniRef.current.value = "";
        inputDniRef.current.focus();
      }
      if (inputNombreRef.current) {
        inputNombreRef.current.value = "";
      }
      if (inputObsRef.current) {
        inputObsRef.current.value = "";
      }
    }, 20);
  };

  const handleRemovePasajero = (tempId) => {
    setPasajeros((prev) => prev.filter((p) => p.temp_id !== tempId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.concepto.trim()) {
      formData.concepto = "Pasaje Aereo / Terrestre";
    }
    if (!formData.empresa.trim()) {
      toast.error("Debe ingresar el nombre de la empresa de transporte o aerolínea.");
      return;
    }
    if (!formData.lugar_origen.trim() || !formData.lugar_destino.trim()) {
      toast.error("Debe especificar lugar de origen y destino.");
      return;
    }

    const mDolares = parseFloat(formData.monto_dolares) || 0.0;
    if (maxDisponibleUSD <= 0) {
      toast.error("No hay saldo disponible en este rubro para registrar gastos.");
      return;
    }
    if (mDolares > maxDisponibleUSD + 0.009) {
      toast.error(`El monto solicitado ($${mDolares.toFixed(2)}) supera el saldo disponible ($${maxDisponibleUSD.toFixed(2)}).`);
      return;
    }

    setSubmitting(true);
    try {
      let salidaIso = null;
      if (formData.fecha_salida) {
        salidaIso = `${formData.fecha_salida}T${formData.hora_salida || "08:00"}:00`;
      }

      let retornoIso = null;
      if (formData.fecha_retorno) {
        retornoIso = `${formData.fecha_retorno}T${formData.hora_retorno || "18:00"}:00`;
      }

      const resolvedAreaId = aperturaData?.id_area || aperturaData?.id_registro?.id_area || null;

      let autoGastoId = 4;
      if (category?.id === "suministros") {
        autoGastoId = 2;
      } else if (category?.id === "mano_obra") {
        autoGastoId = 3;
      } else if (category?.id === "costo_servicios") {
        autoGastoId = 4;
      } else if (category?.id === "otros") {
        autoGastoId = 5;
      } else if (category?.gastoIds && category.gastoIds.length > 0) {
        autoGastoId = category.gastoIds[0];
      } else if (category?.movIds && category.movIds.length > 0) {
        autoGastoId = category.movIds[0];
      }

      const payload = {
        id_apertura: idApertura ? Number(idApertura) : null,
        nivel_grupo: 1,
        codigo: aperturaData?.cotizacion_codigo || aperturaData?.codigo || "",
        tipo_gasto: autoGastoId,
        tipo_movimiento: "02",
        id_solicitante: user?.id || user?.id_usuario || null,
        id_area: resolvedAreaId ? Number(resolvedAreaId) : null,
        id_estado: 0, // 0 = PENDIENTE DE ENVIO por defecto
        fecha: `${getTodayDate()}T${getCurrentTime()}:00`,
        transporte: defaultTransporte || "A", // Automático según el tipo (Aéreo / Terrestre)
        modo: parseInt(formData.modo) || 2,
        id_empresa: formData.id_empresa || null,
        empresa: formData.empresa.trim(),
        lugar_origen: formData.lugar_origen.trim().toUpperCase(),
        lugar_destino: formData.lugar_destino.trim().toUpperCase(),
        fecha_salida: salidaIso,
        fecha_retorno: retornoIso,
        tipo_moneda: formData.tipo_moneda,
        tipo_cambio: parseFloat(formData.tipo_cambio) || 3.75,
        monto_dolares: parseFloat(formData.monto_dolares) || 0.0,
        monto_soles: parseFloat(formData.monto_soles) || 0.0,
        concepto: formData.concepto.trim() || "Pasaje Aereo / Terrestre",
        observacion: formData.observacion?.trim() || "",
        pasajeros: pasajeros.map((p) => ({
          id_usuario: p.id_usuario || null,
          dni: p.dni || "",
          nombre: p.nombre || "",
          nombre_especial: !p.id_usuario ? p.nombre : null,
          observacion: p.observacion || "",
        })),
      };

      const res = await api.post("/compras/pasajes/crear/", payload);
      toast.success(res.data.message || "Solicitud de Pasaje creada con éxito.");
      onClose();
      if (onSuccess) {
        onSuccess(res.data.id_pasaje);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Error al crear la solicitud de pasaje.");
    } finally {
      setSubmitting(false);
    }
  };

  const headerBgClass = isAereo ? "bg-sky-700" : "bg-amber-600";
  const buttonBgClass = isAereo
    ? "bg-sky-700 hover:bg-sky-800 shadow-sky-700/20"
    : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20";
  const pillActiveBg = isAereo ? "bg-sky-700 text-white shadow-xs" : "bg-amber-600 text-white shadow-xs";
  const focusRing = isAereo ? "focus:border-sky-500 focus:ring-sky-500/20" : "focus:border-amber-500 focus:ring-amber-500/20";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className={`px-6 py-4 ${headerBgClass} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl border border-white/20 text-white flex items-center justify-center">
              {isAereo ? <Plane className="w-5 h-5 text-white" /> : <Bus className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wide">
                Nueva Solicitud de Pasaje {isAereo ? "Aéreo" : "Terrestre"}
              </h2>
              <p className="text-[11px] text-white/90 font-medium mt-0.5">
                Proyecto: <span className="font-bold underline">{aperturaData?.cotizacion_codigo || aperturaData?.codigo || "S/N"}</span>
                {category?.name && (
                  <> • Rubro: <span className="font-bold underline">{category.name}</span></>
                )}
                {" • Área: "}<span className="font-bold">{aperturaData?.area_nombre || aperturaData?.id_registro?.area_nombre || "General"}</span> • Apertura #{idApertura}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO */}
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="p-6 overflow-y-auto space-y-4 text-xs">

          {/* BANNER INFORMATIVO DE PRESUPUESTO Y DISPONIBLE */}
          <div className={`p-3.5 rounded-2xl border shadow-2xs flex flex-wrap items-center justify-between gap-3 ${
            isAereo
              ? "bg-gradient-to-r from-sky-50 via-cyan-50/40 to-sky-50 border-sky-200/80"
              : "bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50 border-amber-200/80"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                isAereo
                  ? "bg-sky-100 text-sky-700 border-sky-200"
                  : "bg-amber-100 text-amber-700 border-amber-200"
              }`}>
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider block ${
                  isAereo ? "text-sky-800" : "text-amber-800"
                }`}>
                  Partida: {category?.name || (isAereo ? "Gasto de Servicio" : "Otros")}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  Presupuesto: <b className="text-slate-800">${Number(resolvedPresupuesto || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Programado</span>
                <span className="text-xs font-bold text-slate-600">${Number(resolvedProgramado || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={`h-6 w-px ${isAereo ? "bg-sky-200" : "bg-amber-200"}`} />
              <div className="text-right">
                <span className={`text-[9px] font-black uppercase tracking-wider block ${
                  isAereo ? "text-sky-800" : "text-amber-800"
                }`}>Disponible</span>
                <span className={`text-sm font-black tracking-tight ${
                  maxDisponibleUSD <= 0 ? "text-rose-600" : (isAereo ? "text-sky-700" : "text-amber-700")
                }`}>
                  ${maxDisponibleUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
                  ≈ S/ {maxDisponiblePEN.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          
          {/* BARRA DE METADATOS AUTOMÁTICOS (SOLICITANTE, ÁREA, FECHA) */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Solicitante:</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                {user?.nombre_completo || user?.username || "Usuario autenticado"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Área:</span>
                <span className="font-bold text-slate-700">{aperturaData?.area_nombre || aperturaData?.id_registro?.area_nombre || "General"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Fecha:</span>
                <span className="font-bold text-slate-700">{getTodayDate()}</span>
              </div>
            </div>
          </div>

          {/* GRID PRINCIPAL: 2 BLOQUES (COLUMNAS 1 & 2: DATOS DEL VIAJE E IMPORTE | COLUMNA 3: COLABORADORES) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* BLOQUE IZQUIERDO (COLUMNAS 1 Y 2: DATOS DEL VIAJE E IMPORTE) */}
            <div className="lg:col-span-7 space-y-3">
              
              {/* CONCEPTO Y OBSERVACIÓN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Concepto del Gasto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Pasaje Aereo / Terrestre"
                    value={formData.concepto}
                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${focusRing} focus:ring-2 text-slate-800 font-semibold outline-hidden transition-all text-xs bg-slate-50/50`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Observación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Cambio de fecha, equipaje adicional..."
                    value={formData.observacion}
                    onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${focusRing} focus:ring-2 text-slate-800 font-medium outline-hidden transition-all text-xs`}
                  />
                </div>
              </div>

              {/* MODO DE VIAJE Y EMPRESA / AEROLÍNEA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Modo de Viaje
                  </label>
                  <select
                    value={formData.modo}
                    onChange={(e) => setFormData({ ...formData, modo: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${focusRing} focus:ring-2 text-slate-800 font-bold outline-hidden transition-all text-xs bg-slate-50/50`}
                  >
                    <option value={1}>Solo Ida</option>
                    <option value={2}>Retorno</option>
                    <option value={3}>Ida y Vuelta</option>
                  </select>
                </div>

                <div>
                  <EmpresaTransporteAutocomplete
                    tipo={formData.transporte || defaultTransporte || "A"}
                    label={isAereo ? "Aerolínea" : "Empresa de Transporte"}
                    labelClassName="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1"
                    placeholder={isAereo ? "Buscar aerolínea o escribir nombre..." : "Buscar empresa de transporte o escribir nombre..."}
                    required
                    value={formData.empresa}
                    onChange={(val) => setFormData((prev) => ({ ...prev, empresa: val }))}
                    onSelect={(item) => {
                      setFormData((prev) => ({
                        ...prev,
                        id_empresa: item.id_empresa || null,
                        empresa: item.nombre || prev.empresa,
                      }));
                    }}
                  />
                </div>
              </div>

              {/* ORIGEN Y DESTINO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CiudadAutocomplete
                  label="Lugar de Origen"
                  required
                  transporte={formData.transporte}
                  focusRing={focusRing}
                  placeholder={isAereo ? "Ej: LIM o LIMA" : "Ej: LIMA"}
                  value={formData.lugar_origen}
                  onChange={(val) => setFormData((prev) => ({ ...prev, lugar_origen: val }))}
                />

                <CiudadAutocomplete
                  label="Lugar de Destino"
                  required
                  transporte={formData.transporte}
                  focusRing={focusRing}
                  placeholder={isAereo ? "Ej: CUZ o CUSCO" : "Ej: HUANCAYO"}
                  value={formData.lugar_destino}
                  onChange={(val) => setFormData((prev) => ({ ...prev, lugar_destino: val }))}
                />
              </div>

              {/* FECHAS DE SALIDA Y RETORNO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Salida <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={formData.fecha_salida}
                      onChange={(e) => setFormData({ ...formData, fecha_salida: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 text-slate-800 font-medium text-xs bg-white"
                    />
                    <input
                      type="time"
                      value={formData.hora_salida}
                      onChange={(e) => setFormData({ ...formData, hora_salida: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 text-slate-800 font-medium text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Retorno (Opcional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={formData.fecha_retorno}
                      onChange={(e) => setFormData({ ...formData, fecha_retorno: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 text-slate-800 font-medium text-xs bg-white"
                    />
                    <input
                      type="time"
                      value={formData.hora_retorno}
                      onChange={(e) => setFormData({ ...formData, hora_retorno: e.target.value })}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 text-slate-800 font-medium text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* TARJETA IMPORTE Y MONEDA */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className={`w-3.5 h-3.5 ${isAereo ? "text-sky-600" : "text-amber-600"}`} />
                    Importe y Moneda
                  </span>

                  {/* Selector de Moneda */}
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleMonedaChange("S")}
                      className={`px-2.5 py-0.5 text-[10px] font-black rounded-md transition-all ${
                        formData.tipo_moneda === "S" ? pillActiveBg : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      SOLES (S/)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMonedaChange("D")}
                      className={`px-2.5 py-0.5 text-[10px] font-black rounded-md transition-all ${
                        formData.tipo_moneda === "D" ? pillActiveBg : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      DÓLARES ($)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* MONTO SOLES */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                      Monto Soles (PEN)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">S/</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        readOnly={isDolares}
                        value={formData.monto_soles}
                        onChange={handleMontoSolesChange}
                        className={`w-full pl-7 pr-7 py-1.5 rounded-lg border text-xs font-black outline-hidden transition-all ${
                          !isDolares
                            ? "bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-sky-500/20"
                            : "bg-slate-100/90 border-slate-200 text-slate-500 cursor-not-allowed"
                        }`}
                      />
                      {isDolares && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" title="Bloqueado: calculado automáticamente">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* TIPO DE CAMBIO SUNAT */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">
                        Tipo Cambio
                      </label>
                      {loadingTC ? (
                        <span className="flex items-center gap-1 text-[8.5px] font-bold text-slate-400">
                          <Loader className="w-2.5 h-2.5 animate-spin text-sky-500" />
                          SUNAT
                        </span>
                      ) : (
                        <span className="text-[8.5px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 uppercase">
                          SUNAT
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="3.7500"
                      value={formData.tipo_cambio}
                      onChange={handleTipoCambioChange}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 font-bold text-xs outline-hidden bg-white text-center focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>

                  {/* MONTO DÓLARES */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                      Monto Dólares (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        readOnly={!isDolares}
                        value={formData.monto_dolares}
                        onChange={handleMontoDolaresChange}
                        className={`w-full pl-7 pr-7 py-1.5 rounded-lg border text-xs font-black outline-hidden transition-all ${
                          isDolares
                            ? "bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-sky-500/20"
                            : "bg-slate-100/90 border-slate-200 text-slate-500 cursor-not-allowed"
                        }`}
                      />
                      {!isDolares && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" title="Bloqueado: calculado automáticamente">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BLOQUE DERECHO (3RA COLUMNA: COLABORADORES / PASAJEROS QUE VIAJARÁN) */}
            <div className="lg:col-span-5 flex flex-col h-full">
              <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 flex flex-col h-full space-y-2.5">
                
                {/* CABECERA DE LA COLUMNA DE PASAJEROS */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isAereo ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                        Pasajeros que Viajarán
                      </span>
                      <span className="text-[9.5px] text-slate-500 font-medium">
                        Colaboradores para este viaje
                      </span>
                    </div>
                  </div>
                  
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                    pasajeros.length > 0
                      ? isAereo
                        ? "bg-sky-100 text-sky-800 border-sky-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {pasajeros.length} {pasajeros.length === 1 ? "Colaborador" : "Colaboradores"}
                  </span>
                </div>

                {/* FORMULARIO RÁPIDO DE AGREGADO EN 2 FILAS OPTIMIZADAS */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Plus className="w-3 h-3 text-slate-600 stroke-[2.5]" />
                    Agregar Pasajero
                  </div>
                  
                  {/* Fila 1: DNI (Ancho fijo) | NOMBRE COMPLETO (Flex-1) */}
                  <div className="flex items-center gap-2">
                    <div className="w-28 sm:w-32 shrink-0">
                      <DniUsuarioAutocomplete
                        mode="dni"
                        value={newDniPasajero}
                        onChange={(val) => setNewDniPasajero(val)}
                        onSelect={(user) => {
                          setNewDniPasajero(user.dni || "");
                          setNewNombrePasajero(user.nombre_completo || "");
                          setNewIdUsuarioPasajero(user.id_usuario || null);
                          if (inputObsRef.current) inputObsRef.current.focus();
                        }}
                        placeholder="DNI..."
                        inputRef={inputDniRef}
                        inputClassName="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-black text-slate-900 outline-hidden focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPasajero();
                          }
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <DniUsuarioAutocomplete
                        mode="nombre"
                        value={newNombrePasajero}
                        onChange={(val) => setNewNombrePasajero(val)}
                        onSelect={(user) => {
                          setNewNombrePasajero(user.nombre_completo || "");
                          setNewDniPasajero(user.dni || "");
                          setNewIdUsuarioPasajero(user.id_usuario || null);
                          if (inputObsRef.current) inputObsRef.current.focus();
                        }}
                        placeholder="Nombre completo del pasajero..."
                        inputRef={inputNombreRef}
                        inputClassName="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-hidden focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPasajero();
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Fila 2: OBSERVACIÓN (Amplio, Flex-1) | BOTÓN [+] */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        ref={inputObsRef}
                        type="text"
                        placeholder="Observación del pasajero (asiento, equipaje, escala...)"
                        value={newObsPasajero}
                        onChange={(e) => setNewObsPasajero(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPasajero();
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 outline-hidden focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddPasajero}
                      className={`h-8.5 w-8.5 shrink-0 rounded-lg text-white font-black flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer ${
                        isAereo
                          ? "bg-sky-700 hover:bg-sky-800 shadow-sky-700/20"
                          : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                      }`}
                      title="Agregar Pasajero"
                    >
                      <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* TABLA / LISTA DINÁMICA DE PASAJEROS CON COLORES VIVOS Y LEGIBLES */}
                {pasajeros.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 px-3 bg-white/60 rounded-xl border border-dashed border-slate-200 text-center">
                    <Users className="w-6 h-6 text-slate-300 mb-1" />
                    <p className="text-[11px] font-semibold text-slate-500">
                      No hay colaboradores agregados
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Use el buscador de arriba para agregar viajeros
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex-1 min-h-[160px] max-h-[220px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-100/90 z-10">
                        <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700">
                          <th className="py-2 px-2.5 text-center w-7 text-slate-600">#</th>
                          <th className="py-2 px-2.5 w-24 text-slate-800">DNI</th>
                          <th className="py-2 px-2.5 text-slate-800">Colaborador</th>
                          <th className="py-2 px-2.5 text-slate-800">Obs</th>
                          <th className="py-2 px-2 text-center w-8 text-slate-800"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pasajeros.map((p, idx) => (
                          <tr key={p.temp_id} className="hover:bg-sky-50/50 transition-colors">
                            <td className="py-2 px-2.5 text-center font-black text-slate-600 text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2.5">
                              <span className="font-mono font-black text-slate-900 text-xs bg-slate-100 border border-slate-300/80 px-1.5 py-0.5 rounded shadow-2xs">
                                {p.dni || "-"}
                              </span>
                            </td>
                            <td className="py-2 px-2.5">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                                <span className="font-black text-slate-950 text-xs leading-tight">
                                  {p.nombre}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-2.5">
                              {p.observacion ? (
                                <span className="text-xs font-semibold text-amber-950 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  {p.observacion}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-bold">-</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePasajero(p.temp_id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Quitar de la lista"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2.5 ${buttonBgClass} text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer`}
            >
              {submitting ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Crear Solicitud
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

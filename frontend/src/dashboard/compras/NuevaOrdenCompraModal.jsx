import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Package,
  Calendar,
  Clock,
  User,
  Building2,
  MapPin,
  Phone,
  Truck,
  Coins,
  CreditCard,
  FileText,
  Loader,
  Save,
  Lock,
  Plus,
  Trash2,
  ShieldCheck
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import ProveedorAutocomplete from "@/components/compras/ProveedorAutocomplete";
import useFormArrowNavigation from "@/hook/useFormArrowNavigation";

export default function NuevaOrdenCompraModal({
  open,
  onClose,
  idApertura,
  category,
  aperturaData,
  disponible: propDisponible,
  categoryBudget: propBudget,
  categoryProgrammed: propProgrammed,
  onSuccess,
}) {
  const { authUser: user } = useAuth();
  const { handleFormKeyDown } = useFormArrowNavigation();
  const [submitting, setSubmitting] = useState(false);
  const [loadingTC, setLoadingTC] = useState(false);

  // Fechas y horas por defecto
  const getTodayDate = () => new Date().toISOString().split("T")[0];
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(" ")[0].substring(0, 5); // HH:MM
  };

  const [formData, setFormData] = useState({
    fecha_orden: getTodayDate(),
    tipo: "C", // 'C' = Compra, 'S' = Servicio
    empresa: "",
    direccion: "",
    contacto: "",
    entrega_lugar: "",
    tiempo_entrega: "",
    numero_orden: "",
    tipo_moneda: "D",
    tipo_cambio: "3.7500",
    monto_dolares: "",
    monto_soles: "",
    forma_pago: "",
    referencia: "",
  });

  // Estado de Partidas / Detalle de la Compra
  const [partidas, setPartidas] = useState([]);
  const [newCodigoPartida, setNewCodigoPartida] = useState("");
  const [newDescripcionPartida, setNewDescripcionPartida] = useState("");
  const [newCantidadPartida, setNewCantidadPartida] = useState(1);
  const [newValorPartida, setNewValorPartida] = useState("");

  const inputCodigoRef = useRef(null);
  const inputDescRef = useRef(null);
  const inputCantRef = useRef(null);
  const inputValorRef = useRef(null);

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
      const isServicio =
        category?.id === "costo_servicios" ||
        category?.name?.toLowerCase().includes("servicio") ||
        category?.name?.toLowerCase().includes("mano de obra") ||
        (category?.movIds && category.movIds.includes(4));

      const initialTipo = isServicio ? "S" : "C";
      const initialTC = aperturaData?.tipo_cambio ? String(aperturaData.tipo_cambio) : "3.7500";

      setFormData({
        fecha_orden: aperturaData?.fecha_orden ? aperturaData.fecha_orden.split(" ")[0] : getTodayDate(),
        tipo: initialTipo,
        empresa: "",
        direccion: "",
        contacto: "",
        entrega_lugar: "",
        tiempo_entrega: "",
        numero_orden: "",
        tipo_moneda: aperturaData?.tipo_moneda || "D",
        tipo_cambio: initialTC,
        monto_dolares: "",
        monto_soles: "",
        forma_pago: "",
        referencia: "",
      });

      setPartidas([]);
      setNewCodigoPartida("");
      setNewDescripcionPartida("");
      setNewCantidadPartida(1);
      setNewValorPartida("");

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
                if (!prev.tipo_cambio || prev.tipo_cambio === "" || prev.tipo_cambio === "0.00" || prev.tipo_cambio === "3.7500") {
                  return { ...prev, tipo_cambio: tcFormatted };
                }
                return prev;
              });
            }
          }
        } catch (err) {
          console.warn("No se pudo obtener TC SUNAT:", err);
        } finally {
          setLoadingTC(false);
        }
      };

      fetchTipoCambioSunat();
    }
  }, [open, category, aperturaData]);

  if (!open) return null;

  const isCompra = formData.tipo === "C";
  const isDolares = formData.tipo_moneda === "D";

  // Colores dinámicos según tipo (Compra: Emerald, Servicio: Teal)
  const themeHeaderBg = isCompra ? "bg-emerald-700" : "bg-teal-700";
  const themeBadgeBg = isCompra ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-teal-100 text-teal-800 border-teal-300";
  const themeFocusRing = isCompra ? "focus:border-emerald-500 focus:ring-emerald-500/20" : "focus:border-teal-500 focus:ring-teal-500/20";
  const pillActiveBg = isCompra ? "bg-emerald-700 text-white" : "bg-teal-700 text-white";

  // --- RECALCULAR TOTALES DESDE PARTIDAS ---
  const recalcularDesdePartidas = (listaPartidas, tcVal, monedaVal) => {
    if (!listaPartidas || listaPartidas.length === 0) return;
    const sumTotal = listaPartidas.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
    const tc = parseFloat(tcVal !== undefined ? tcVal : formData.tipo_cambio) || 3.75;
    const isDol = (monedaVal || formData.tipo_moneda) === "D";

    let sUSD = 0;
    let sPEN = 0;

    if (isDol) {
      sUSD = sumTotal;
      sPEN = tc > 0 ? sumTotal * tc : 0;
    } else {
      sPEN = sumTotal;
      sUSD = tc > 0 ? sumTotal / tc : 0;
    }

    if (maxDisponibleUSD > 0 && sUSD > maxDisponibleUSD + 0.009) {
      toast.warning(`El total de partidas ($${sUSD.toFixed(2)}) supera el saldo disponible ($${maxDisponibleUSD.toFixed(2)}).`);
    }

    setFormData((prev) => ({
      ...prev,
      monto_dolares: sUSD.toFixed(2),
      monto_soles: sPEN.toFixed(2),
    }));
  };

  // --- MANEJO DE CAMBIO DE MONEDA ---
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

    if (partidas.length > 0) {
      recalcularDesdePartidas(partidas, formData.tipo_cambio, moneda);
    }
  };

  // --- MANEJO DE MONTO SOLES ---
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

  // --- MANEJO DE MONTO DÓLARES ---
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

  // --- MANEJO DE TIPO DE CAMBIO ---
  const handleTipoCambioChange = (e) => {
    const val = e.target.value;
    const tc = parseFloat(val) || 0;

    setFormData((prev) => {
      let soles = prev.monto_soles;
      let dolares = prev.monto_dolares;

      if (prev.tipo_moneda === "D" && dolares && tc > 0) {
        soles = (parseFloat(dolares) * tc).toFixed(2);
      } else if (prev.tipo_moneda === "S" && soles && tc > 0) {
        dolares = (parseFloat(soles) / tc).toFixed(2);
      }

      return {
        ...prev,
        tipo_cambio: val,
        monto_soles: soles,
        monto_dolares: dolares,
      };
    });

    if (partidas.length > 0) {
      recalcularDesdePartidas(partidas, val);
    }
  };

  // --- GESTIÓN DE PARTIDAS (DETALLE DE LA COMPRA) ---
  const handleAddPartida = () => {
    const descClean = (newDescripcionPartida || "").trim();
    const codClean = (newCodigoPartida || "").trim();
    const cantNum = parseInt(newCantidadPartida) || 1;
    const valNum = parseFloat(newValorPartida) || 0.0;

    if (!descClean && !codClean) {
      toast.warning("Ingrese al menos el Código o la Descripción del ítem.");
      if (inputCodigoRef.current) inputCodigoRef.current.focus();
      return;
    }

    const totalItem = cantNum * valNum;

    const nuevaPartida = {
      temp_id: Date.now() + Math.random(),
      codigo: codClean,
      descripcion: descClean || (codClean ? `Ítem ${codClean}` : "Ítem"),
      cantidad: cantNum,
      valor: valNum,
      total: totalItem,
    };

    const nextPartidas = [...partidas, nuevaPartida];
    setPartidas(nextPartidas);
    setNewCodigoPartida("");
    setNewDescripcionPartida("");
    setNewCantidadPartida(1);
    setNewValorPartida("");

    recalcularDesdePartidas(nextPartidas);

    // Limpiar explícitamente y reenfocar en Código
    setTimeout(() => {
      if (inputCodigoRef.current) {
        inputCodigoRef.current.value = "";
        inputCodigoRef.current.focus();
      }
      if (inputDescRef.current) inputDescRef.current.value = "";
      if (inputValorRef.current) inputValorRef.current.value = "";
      if (inputCantRef.current) inputCantRef.current.value = "1";
    }, 20);
  };

  const handleRemovePartida = (tempId) => {
    const nextPartidas = partidas.filter((p) => p.temp_id !== tempId);
    setPartidas(nextPartidas);
    if (nextPartidas.length > 0) {
      recalcularDesdePartidas(nextPartidas);
    } else {
      setFormData((prev) => ({
        ...prev,
        monto_soles: "0.00",
        monto_dolares: "0.00",
      }));
    }
  };

  // Totales calculados de la tabla de partidas
  const totalPartidas = partidas.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
  const subtotalPartidas = totalPartidas / 1.18;
  const igvPartidas = totalPartidas - subtotalPartidas;
  const currencySymbol = isDolares ? "$" : "S/";

  // --- ENVÍO DEL FORMULARIO ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.empresa.trim()) {
      toast.error("Por favor ingrese el nombre de la Empresa / Proveedor.");
      return;
    }

    const mDolares = parseFloat(formData.monto_dolares) || 0.00;
    if (maxDisponibleUSD <= 0) {
      toast.error("No hay saldo disponible en este rubro para registrar gastos.");
      return;
    }
    if (mDolares > maxDisponibleUSD + 0.009) {
      toast.error(`El monto solicitado ($${mDolares.toFixed(2)}) supera el saldo disponible ($${maxDisponibleUSD.toFixed(2)}).`);
      return;
    }

    let autoGastoId = 2;
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

    setSubmitting(true);
    try {
      const resolvedAreaId = aperturaData?.id_area || aperturaData?.id_registro?.id_area || null;

      const payload = {
        id_apertura: idApertura ? Number(idApertura) : null,
        nivel_grupo: idApertura ? Number(idApertura) : 1,
        codigo: aperturaData?.cotizacion_codigo || "",
        fecha: getTodayDate(),
        hora: getCurrentTime(),
        fecha_orden: formData.fecha_orden,
        id_solicitante: null,
        id_area: resolvedAreaId ? Number(resolvedAreaId) : null,
        id_estado: 0,
        tipo: formData.tipo,
        tipo_gasto: autoGastoId,
        tipo_movimiento: "03",
        empresa: formData.empresa.trim(),
        direccion: formData.direccion.trim(),
        contacto: formData.contacto.trim(),
        entrega_lugar: formData.entrega_lugar.trim(),
        tiempo_entrega: formData.tiempo_entrega.trim(),
        numero_orden: formData.numero_orden ? formData.numero_orden.trim() : "",
        referencia: formData.referencia ? formData.referencia.trim() : "",
        concepto: formData.referencia ? `Solicitud ${formData.tipo === 'S' ? 'Servicio' : 'Compra'} - ${formData.referencia.trim()}` : `Solicitud ${formData.tipo === 'S' ? 'Servicio' : 'Compra'} - ${formData.empresa.trim()}`,
        tipo_moneda: formData.tipo_moneda,
        tipo_cambio: parseFloat(formData.tipo_cambio) || 3.75,
        monto_dolares: formData.monto_dolares || "0.00",
        monto_soles: formData.monto_soles || "0.00",
        detalles: partidas.map((p) => ({
          codigo: p.codigo,
          descripcion: p.descripcion,
          cantidad: p.cantidad,
          valor: p.valor,
          total: p.total,
        })),
      };

      const res = await api.post("compras/crear_solicitud/", payload);
      const newId = res.data.id_solicitud || res.data.data?.id_solicitud;

      toast.success(res.data.message || `Solicitud de ${formData.tipo === 'S' ? 'Servicio' : 'Compra'} creada exitosamente.`);
      if (onSuccess) onSuccess(newId);
      onClose();
    } catch (error) {
      console.error("Error al crear Solicitud de Compra/Servicio:", error);
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "No se pudo registrar la solicitud de orden de compra.";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* CABECERA VIBRANTE Y MODERNA */}
        <div className={`px-6 py-4 ${themeHeaderBg} text-white flex items-center justify-between shadow-xs transition-colors`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm uppercase tracking-wider">
                  {formData.tipo === "S" ? "Nueva Orden de Servicio" : "Nueva Orden de Compra"}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                  {formData.tipo === "S" ? "Servicio" : "Compra"}
                </span>
              </div>
              <p className="text-[11px] text-white/80 font-medium">
                Proyecto: <b className="text-white underline">{aperturaData?.cotizacion_codigo || "General"}</b>
                {" • "}
                Rubro: <span className="font-bold text-white">{category?.name || (isCompra ? "Suministros" : "Costo de Servicios")}</span>
                {aperturaData?.area_nombre && ` • Área: ${aperturaData.area_nombre}`}
                {idApertura && ` • Apertura #${idApertura}`}
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

        {/* CUERPO DEL FORMULARIO CON DESPLAZAMIENTO FLUIDO POR FLECHAS */}
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="p-5 md:p-6 overflow-y-auto space-y-4 text-xs">

          {/* BANNER INFORMATIVO DE PRESUPUESTO Y DISPONIBLE */}
          <div className={`p-3.5 rounded-2xl border shadow-2xs flex flex-wrap items-center justify-between gap-3 ${
            isCompra
              ? "bg-gradient-to-r from-emerald-50 via-teal-50/40 to-emerald-50 border-emerald-200/80"
              : "bg-gradient-to-r from-teal-50 via-cyan-50/40 to-teal-50 border-teal-200/80"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                isCompra
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-teal-100 text-teal-700 border-teal-200"
              }`}>
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider block ${
                  isCompra ? "text-emerald-800" : "text-teal-800"
                }`}>
                  Partida: {category?.name || (isCompra ? "Suministros" : "Servicios")}
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
              <div className={`h-6 w-px ${isCompra ? "bg-emerald-200" : "bg-teal-200"}`} />
              <div className="text-right">
                <span className={`text-[9px] font-black uppercase tracking-wider block ${
                  isCompra ? "text-emerald-800" : "text-teal-800"
                }`}>Disponible</span>
                <span className={`text-sm font-black tracking-tight ${
                  maxDisponibleUSD <= 0 ? "text-rose-600" : (isCompra ? "text-emerald-700" : "text-teal-700")
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

          {/* GRID PRINCIPAL: 2 BLOQUES (COLUMNAS 1 & 2: DATOS DE LA ORDEN | COLUMNA 3: DETALLE DE LA COMPRA / PARTIDAS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* BLOQUE IZQUIERDO (COLUMNAS 1 Y 2: DATOS GENERALES E IMPORTE) */}
            <div className="lg:col-span-7 space-y-3">
              
              {/* FILA 1: TIPO DE OPERACIÓN | FECHA DE LA ORDEN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Operación <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${themeFocusRing} focus:ring-2 text-slate-800 font-bold outline-hidden transition-all text-xs bg-slate-50/50`}
                  >
                    <option value="C">Compra de Bienes / Suministros</option>
                    <option value="S">Contratación de Servicios</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Fecha de la Orden <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_orden}
                    onChange={(e) => setFormData({ ...formData, fecha_orden: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${themeFocusRing} focus:ring-2 text-slate-800 font-medium outline-hidden transition-all text-xs bg-white`}
                  />
                </div>
              </div>

              {/* FILA 2: EMPRESA / PROVEEDOR | NÚMERO DE ORDEN (O/C) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <ProveedorAutocomplete
                    required
                    value={formData.empresa}
                    onChange={(val) => setFormData((prev) => ({ ...prev, empresa: val }))}
                    onSelect={(prov) => {
                      setFormData((prev) => ({
                        ...prev,
                        empresa: prov.nombre || prev.empresa,
                        direccion: prov.direccion || prev.direccion,
                        contacto: prov.contacto || prov.telefono || prev.contacto,
                      }));
                    }}
                    placeholder="Buscar proveedor o escribir nombre..."
                    label="Empresa / Proveedor"
                    labelClassName="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1"
                    inline={false}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Número de Orden (O/C) <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: OC-2026-001..."
                    value={formData.numero_orden}
                    onChange={(e) => setFormData({ ...formData, numero_orden: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${themeFocusRing} focus:ring-2 text-slate-800 font-medium outline-hidden transition-all text-xs bg-white`}
                  />
                </div>
              </div>

              {/* FILA 3: CONTACTO / ASESOR | DIRECCIÓN FISCAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Contacto / Asesor
                  </label>
                  <input
                    type="text"
                    placeholder="Asesor o contacto comercial..."
                    value={formData.contacto}
                    onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${themeFocusRing} focus:ring-2 text-slate-800 font-medium outline-hidden transition-all text-xs bg-white`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Dirección Fiscal / Sede
                  </label>
                  <input
                    type="text"
                    placeholder="Dirección fiscal o sede del proveedor..."
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${themeFocusRing} focus:ring-2 text-slate-800 font-medium outline-hidden transition-all text-xs bg-white`}
                  />
                </div>
              </div>

              {/* FILA 4: LUGAR DE ENTREGA | TIEMPO DE ENTREGA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Lugar de Entrega
                  </label>
                  <input
                    type="text"
                    placeholder="Almacén Central, Obra, etc..."
                    value={formData.entrega_lugar}
                    onChange={(e) => setFormData({ ...formData, entrega_lugar: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${themeFocusRing} focus:ring-2 text-slate-800 font-medium outline-hidden transition-all text-xs bg-white`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Tiempo de Entrega
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Inmediato, 3 a 5 días..."
                    value={formData.tiempo_entrega}
                    onChange={(e) => setFormData({ ...formData, tiempo_entrega: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${themeFocusRing} focus:ring-2 text-slate-800 font-medium outline-hidden transition-all text-xs bg-white`}
                  />
                </div>
              </div>

              {/* FILA 5: FORMA DE PAGO | REFERENCIA / JUSTIFICACIÓN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Forma de Pago
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Contado, Crédito 30 días..."
                    value={formData.forma_pago}
                    onChange={(e) => setFormData({ ...formData, forma_pago: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${themeFocusRing} focus:ring-2 text-slate-800 font-medium outline-hidden transition-all text-xs bg-white`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Referencia / Observación
                  </label>
                  <input
                    type="text"
                    placeholder="Referencia o justificación de la compra..."
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-200 ${themeFocusRing} focus:ring-2 text-slate-800 font-medium outline-hidden transition-all text-xs bg-white`}
                  />
                </div>
              </div>

              {/* TARJETA IMPORTE Y MONEDA (IDÉNTICA A PASAJES) */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className={`w-3.5 h-3.5 ${isCompra ? "text-emerald-600" : "text-teal-600"}`} />
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
                            ? "bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
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
                          <Loader className="w-2.5 h-2.5 animate-spin text-emerald-500" />
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
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 font-bold text-xs outline-hidden bg-white text-center focus:ring-2 focus:ring-emerald-500/20"
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
                            ? "bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
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

            {/* BLOQUE DERECHO (3RA COLUMNA: DETALLE DE LA COMPRA / PARTIDAS) */}
            <div className="lg:col-span-5 flex flex-col h-full">
              <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 flex flex-col h-full space-y-2.5">
                
                {/* CABECERA DE LA COLUMNA DE PARTIDAS */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isCompra ? "bg-emerald-100 text-emerald-700" : "bg-teal-100 text-teal-700"}`}>
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                        Detalle de la Compra
                      </span>
                      <span className="text-[9.5px] text-slate-500 font-medium">
                        Partidas o ítems de la orden
                      </span>
                    </div>
                  </div>
                  
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                    partidas.length > 0
                      ? themeBadgeBg
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {partidas.length} {partidas.length === 1 ? "Ítem" : "Ítems"}
                  </span>
                </div>

                {/* FORMULARIO RÁPIDO DE ADICIÓN EN 2 FILAS OPTIMIZADAS */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Plus className="w-3 h-3 text-slate-600 stroke-[2.5]" />
                    Agregar Partida / Ítem
                  </div>
                  
                  {/* Fila 1: CÓDIGO (Ancho fijo) | DESCRIPCIÓN (Flex-1) */}
                  <div className="flex items-center gap-2">
                    <div className="w-28 sm:w-32 shrink-0">
                      <input
                        ref={inputCodigoRef}
                        type="text"
                        placeholder="Código..."
                        value={newCodigoPartida}
                        onChange={(e) => setNewCodigoPartida(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPartida();
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-black text-slate-900 outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 uppercase placeholder:normal-case placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <input
                        ref={inputDescRef}
                        type="text"
                        placeholder="Descripción del bien o servicio..."
                        value={newDescripcionPartida}
                        onChange={(e) => setNewDescripcionPartida(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPartida();
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>
                  </div>

                  {/* Fila 2: CANTIDAD (Ancho fijo) | VALOR UNITARIO (Flex-1) | BOTÓN [+] */}
                  <div className="flex items-center gap-2">
                    <div className="w-20 sm:w-24 shrink-0">
                      <input
                        ref={inputCantRef}
                        type="number"
                        min="1"
                        placeholder="Cant."
                        value={newCantidadPartida}
                        onChange={(e) => setNewCantidadPartida(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPartida();
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-900 outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                          {currencySymbol}
                        </span>
                        <input
                          ref={inputValorRef}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newValorPartida}
                          onChange={(e) => setNewValorPartida(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddPartida();
                            }
                          }}
                          className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddPartida}
                      className={`h-8.5 w-8.5 shrink-0 rounded-lg text-white font-black flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer ${
                        isCompra
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                          : "bg-teal-600 hover:bg-teal-700 shadow-teal-600/20"
                      }`}
                      title="Agregar Partida (Enter)"
                    >
                      <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* TABLA / LISTA DINÁMICA DE PARTIDAS */}
                {partidas.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 px-3 bg-white/60 rounded-xl border border-dashed border-slate-200 text-center">
                    <Package className="w-6 h-6 text-slate-300 mb-1" />
                    <p className="text-[11px] font-semibold text-slate-500">
                      No hay partidas agregadas
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Use el formulario de arriba para agregar ítems a la orden
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex-1 min-h-[160px] max-h-[220px] flex flex-col justify-between">
                    <div className="overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-100/90 z-10">
                          <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700">
                            <th className="py-2 px-2 text-center w-7 text-slate-600">#</th>
                            <th className="py-2 px-2 w-20 text-slate-800">Código</th>
                            <th className="py-2 px-2 text-slate-800">Descripción</th>
                            <th className="py-2 px-2 text-center w-12 text-slate-800">Cant.</th>
                            <th className="py-2 px-2 text-right w-16 text-slate-800">Valor</th>
                            <th className="py-2 px-2 text-right w-20 text-slate-800">Total</th>
                            <th className="py-2 px-1 text-center w-7 text-slate-800"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {partidas.map((p, idx) => (
                            <tr key={p.temp_id} className="hover:bg-emerald-50/50 transition-colors">
                              <td className="py-2 px-2 text-center font-black text-slate-600 text-xs">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-2">
                                <span className="font-mono font-black text-slate-900 text-xs bg-slate-100 border border-slate-300/80 px-1 py-0.5 rounded shadow-2xs">
                                  {p.codigo || "-"}
                                </span>
                              </td>
                              <td className="py-2 px-2">
                                <span className="font-black text-slate-950 text-xs leading-tight block">
                                  {p.descripcion}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-slate-800">
                                {p.cantidad}
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-slate-600">
                                {currencySymbol} {Number(p.valor || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-2 text-right font-black text-emerald-800">
                                {currencySymbol} {Number(p.total || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePartida(p.temp_id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Quitar ítem"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Desglose de totales en el pie de la tabla */}
                    <div className="bg-slate-50 p-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-[10px] text-slate-500 font-medium">
                        Subtotal: <b>{currencySymbol} {subtotalPartidas.toFixed(2)}</b> (IGV: {currencySymbol} {igvPartidas.toFixed(2)})
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-700 text-xs uppercase">Total:</span>
                        <span className="font-black text-sm text-emerald-700">
                          {currencySymbol} {totalPartidas.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2.5 rounded-xl text-xs font-black text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
                isCompra
                  ? "bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/20"
                  : "bg-teal-700 hover:bg-teal-800 shadow-teal-700/20"
              }`}
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Crear Solicitud</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

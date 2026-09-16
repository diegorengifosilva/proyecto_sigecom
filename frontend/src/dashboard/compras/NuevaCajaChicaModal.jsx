import React, { useState, useEffect } from "react";
import {
  X,
  Wallet,
  Coins,
  Calendar,
  Building,
  User,
  CreditCard,
  FileText,
  Loader,
  AlertCircle,
  Save,
  Clock,
  Landmark,
  RefreshCw,
  Lock,
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import DestinatarioAutocomplete from "@/components/compras/DestinatarioAutocomplete";
import useFormArrowNavigation from "@/hook/useFormArrowNavigation";

export default function NuevaCajaChicaModal({
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
  const [usuarios, setUsuarios] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [tiposSolicitud, setTiposSolicitud] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingTC, setLoadingTC] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [destinatarioNombre, setDestinatarioNombre] = useState("");

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(" ")[0].substring(0, 5);
  };

  const [formData, setFormData] = useState({
    concepto: "",
    tipo_gasto: 3, // Default Mano de Obra
    tipo_moneda: "S",
    monto_soles: "",
    monto_dolares: "",
    tipo_cambio: "3.7500",
    id_destinatario: "",
    id_banco: "",
    numero_cuenta: "",
    tipo_solicitud: 4, // 4: Planilla de Movilidad (FK a tipo_solicitud)
    fecha: new Date().toISOString().split("T")[0],
    hora: getCurrentTime(),
    fecha_transferencia: new Date().toISOString().split("T")[0],
    fecha_liquidacion: "",
    observacion: "",
  });

  // Códigos de cabecera desde aperturaData
  const resolvedCodigo = aperturaData?.cotizacion_codigo || aperturaData?.codigo || "";
  const resolvedAreaNombre = aperturaData?.area_nombre || aperturaData?.area || aperturaData?.id_registro?.area_nombre || "";
  const resolvedAreaId = aperturaData?.id_area || aperturaData?.id_registro?.id_area || null;

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
  const tcActual = parseFloat(formData.tipo_cambio) || 3.75;
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

  // Carga inicial al abrir modal
  useEffect(() => {
    if (open) {
      // Determinar tipo_gasto según la categoría activa
      let initialGasto = 3;
      if (category?.id === "suministros") {
        initialGasto = 2;
      } else if (category?.id === "mano_obra") {
        initialGasto = 3;
      } else if (category?.id === "costo_servicios") {
        initialGasto = 4;
      } else if (category?.id === "otros") {
        initialGasto = 5;
      } else if (category?.gastoIds && category.gastoIds.length > 0) {
        initialGasto = category.gastoIds[0];
      } else if (category?.movIds && category.movIds.length > 0) {
        initialGasto = category.movIds[0];
      }

      setDestinatarioNombre("");
      setFormData((prev) => ({
        ...prev,
        concepto: "",
        tipo_gasto: initialGasto,
        tipo_moneda: "S",
        monto_soles: "",
        monto_dolares: "",
        id_destinatario: "",
        id_banco: "",
        numero_cuenta: "",
        tipo_solicitud: 4,
        fecha: new Date().toISOString().split("T")[0],
        hora: getCurrentTime(),
        fecha_transferencia: new Date().toISOString().split("T")[0],
        fecha_liquidacion: "",
        observacion: "",
      }));

      // Cargar usuarios activos y bancos
      const fetchInitialData = async () => {
        setLoadingOptions(true);
        try {
          const [resUsers, resBancos, resTipos] = await Promise.allSettled([
            api.get("/users/usuarios-activos/"),
            api.get("/users/bancos/"),
            api.get("/core/tipo_solicitud/"),
          ]);

          if (resUsers.status === "fulfilled" && Array.isArray(resUsers.value.data)) {
            setUsuarios(resUsers.value.data);
          }
          if (resBancos.status === "fulfilled" && Array.isArray(resBancos.value.data)) {
            setBancos(resBancos.value.data);
          }
          if (resTipos.status === "fulfilled" && Array.isArray(resTipos.value.data)) {
            setTiposSolicitud(resTipos.value.data);
          }
        } catch (error) {
          console.error("Error al cargar datos auxiliares:", error);
        } finally {
          setLoadingOptions(false);
        }
      };

      // Consultar Tipo de Cambio SUNAT de la misma API usada en Orden de Compra/Servicio
      const fetchTipoCambioSunat = async () => {
        try {
          setLoadingTC(true);
          const res = await api.get("cotizaciones/tipo-cambio-sunat/");
          if (res?.data) {
            const tcSunat = res.data.compra || res.data.venta || res.data.tipo_cambio;
            if (tcSunat) {
              const tcFormatted = Number(tcSunat).toFixed(4);
              setFormData((prev) => ({ ...prev, tipo_cambio: tcFormatted }));
            }
          }
        } catch (error) {
          console.warn("No se pudo obtener el tipo de cambio SUNAT:", error);
        } finally {
          setLoadingTC(false);
        }
      };

      fetchInitialData();
      fetchTipoCambioSunat();
    }
  }, [open, category]);

  if (!open) return null;

  // Manejo de cambios en moneda y montos
  const handleMonedaChange = (moneda) => {
    const tc = parseFloat(formData.tipo_cambio) || 3.75;
    setFormData((prev) => {
      let soles = prev.monto_soles;
      let dolares = prev.monto_dolares;

      if (moneda === "S" && dolares && !soles) {
        soles = (parseFloat(dolares) * tc).toFixed(2);
      } else if (moneda === "D" && soles && !dolares) {
        dolares = (parseFloat(soles) / tc).toFixed(2);
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
    const newTc = e.target.value;
    const tcNum = parseFloat(newTc) || 0;

    setFormData((prev) => {
      let soles = prev.monto_soles;
      let dolares = prev.monto_dolares;

      if (tcNum > 0) {
        if (prev.tipo_moneda === "S" && soles) {
          dolares = (parseFloat(soles) / tcNum).toFixed(2);
        } else if (prev.tipo_moneda === "D" && dolares) {
          soles = (parseFloat(dolares) * tcNum).toFixed(2);
        }
      }

      return {
        ...prev,
        tipo_cambio: newTc,
        monto_soles: soles,
        monto_dolares: dolares,
      };
    });
  };

  // Autocompletar datos bancarios al seleccionar destinatario con Autocomplete
  const handleDestinatarioSelect = (selectedUser) => {
    if (selectedUser) {
      const uId = selectedUser.id_usuario || selectedUser.id;
      const bId = selectedUser.id_banco || selectedUser.banco_id || "";
      const nro = selectedUser.nro_cuenta || selectedUser.numero_cuenta || "";
      const dName = selectedUser.nombre_completo || selectedUser.usuario || "";
      setDestinatarioNombre(dName);
      setFormData((prev) => ({
        ...prev,
        id_destinatario: uId,
        id_banco: bId || prev.id_banco || "",
        numero_cuenta: nro || prev.numero_cuenta || "",
      }));
    } else {
      setDestinatarioNombre("");
      setFormData((prev) => ({
        ...prev,
        id_destinatario: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.concepto.trim()) {
      toast.error("El concepto del gasto es obligatorio.");
      return;
    }

    const mSoles = parseFloat(formData.monto_soles) || 0;
    const mDolares = parseFloat(formData.monto_dolares) || 0;

    if (mSoles <= 0 && mDolares <= 0) {
      toast.error("Debe ingresar un monto válido mayor a 0.");
      return;
    }

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
      const fechaHora = formData.fecha && formData.hora ? `${formData.fecha} ${formData.hora}:00` : formData.fecha ? `${formData.fecha} 12:00:00` : null;

      const payload = {
        id_apertura: idApertura ? Number(idApertura) : null,
        nivel_grupo: 1,
        codigo: resolvedCodigo,
        id_area: resolvedAreaId ? Number(resolvedAreaId) : null,
        tipo_gasto: Number(formData.tipo_gasto || formData.tipo_movimiento) || 3,
        tipo_movimiento: "01",
        concepto: formData.concepto.trim(),
        tipo_moneda: formData.tipo_moneda,
        monto_soles: mSoles,
        monto_dolares: mDolares,
        tipo_cambio: parseFloat(formData.tipo_cambio) || 3.75,
        fecha: fechaHora,
        fecha_transferencia: formData.fecha_transferencia ? `${formData.fecha_transferencia} 00:00:00` : null,
        fecha_liquidacion: formData.fecha_liquidacion ? `${formData.fecha_liquidacion} 00:00:00` : null,
        tipo_solicitud: formData.tipo_solicitud ? Number(formData.tipo_solicitud) : 4,
        id_destinatario: formData.id_destinatario ? Number(formData.id_destinatario) : null,
        id_solicitante: user?.id_usuario || user?.id || null,
        id_estado: 0, // id_estado = 0 (Pendiente de Envío) por defecto
        id_banco: formData.id_banco ? Number(formData.id_banco) : null,
        numero_cuenta: formData.numero_cuenta ? formData.numero_cuenta.trim() : null,
        observacion: formData.observacion ? formData.observacion.trim() : "",
      };

      const res = await api.post("/caja_chica/solicitudes_caja_chica/", payload);
      const newId = res.data.id_registro_numero || res.data.id_caja_chica || (String(res.data.id_registro).includes('_') ? res.data.id_registro.split('_')[1] : res.data.id_registro);

      toast.success("Solicitud de Caja Chica creada exitosamente");
      if (onSuccess) onSuccess(newId);
      onClose();
    } catch (error) {
      console.error("Error al guardar Solicitud de Caja Chica:", error);
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "No se pudo registrar la solicitud de Caja Chica.";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const isDolares = formData.tipo_moneda === "D";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER CON CÓDIGO Y ÁREA */}
        <div className="px-6 py-4 bg-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">
                Nueva Solicitud de Caja Chica
              </h3>
              <p className="text-[11px] text-purple-200 font-medium">
                {resolvedCodigo ? `Código: ${resolvedCodigo}` : `Apertura #${idApertura}`}
                {resolvedAreaNombre ? ` • Área: ${resolvedAreaNombre}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-700">

          {/* BANNER INFORMATIVO DE PRESUPUESTO Y DISPONIBLE */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50/40 to-purple-50 p-3.5 rounded-2xl border border-purple-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block">
                  Partida: {category?.name || "Mano de Obra"}
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
              <div className="h-6 w-px bg-purple-200" />
              <div className="text-right">
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 block">Disponible</span>
                <span className={`text-sm font-black tracking-tight ${maxDisponibleUSD <= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  ${maxDisponibleUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
                  ≈ S/ {maxDisponiblePEN.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          
          {/* CONCEPTO DEL GASTO */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
              Concepto del Gasto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Viáticos y Hotel - R. Egoavil..."
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-800 font-medium outline-hidden transition-all text-xs"
            />
          </div>

          {/* FILA: SOLICITANTE, FECHA, HORA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* SOLICITANTE (CARGA AUTOMÁTICAMENTE EL USUARIO LOGEADO) */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Solicitante
              </label>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs truncate" title={user?.nombre_completo || user?.usuario || "Usuario Logeado"}>
                <User className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">{user?.nombre_completo || user?.usuario || "Usuario Logeado"}</span>
              </div>
            </div>

            {/* FECHA DE LA SOLICITUD */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Fecha
              </label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 text-slate-800 font-medium outline-hidden transition-all text-xs"
              />
            </div>

            {/* HORA */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Hora
              </label>
              <input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 text-slate-800 font-medium outline-hidden transition-all text-xs"
              />
            </div>
          </div>

          {/* VALORES ECONÓMICOS Y TIPO DE CAMBIO */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-purple-600" />
                Importe y Moneda
              </span>
              
              {/* Selector de Moneda */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleMonedaChange("S")}
                  className={`px-3 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                    !isDolares
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  SOLES (S/)
                </button>
                <button
                  type="button"
                  onClick={() => handleMonedaChange("D")}
                  className={`px-3 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                    isDolares
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  DÓLARES ($)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* MONTO SOLES (BLOQUEADO SI ES DÓLARES) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-[10px] uppercase font-bold ${isDolares ? "text-slate-400" : "text-slate-700 font-black"}`}>
                    Monto Soles (PEN)
                  </label>
                  {isDolares && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                      <Lock className="w-2.5 h-2.5" /> Bloqueado
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className={`absolute left-3 top-2.5 font-bold text-xs ${isDolares ? "text-slate-400" : "text-slate-600"}`}>S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    readOnly={isDolares}
                    value={formData.monto_soles}
                    onChange={handleMontoSolesChange}
                    className={`w-full pl-8 pr-8 py-2 rounded-xl border font-bold outline-hidden transition-all text-xs ${
                      isDolares
                        ? "bg-slate-100/90 border-slate-200 text-slate-500 cursor-not-allowed select-none"
                        : "bg-white border-slate-200 focus:border-purple-500 text-slate-800 shadow-xs"
                    }`}
                  />
                  {isDolares && (
                    <div className="absolute right-2.5 top-2.5 pointer-events-none">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* TIPO DE CAMBIO */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Tipo Cambio
                  </label>
                  {loadingTC && <Loader className="w-3 h-3 text-purple-600 animate-spin" />}
                </div>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.tipo_cambio}
                  onChange={handleTipoCambioChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 text-slate-800 font-bold outline-hidden transition-all text-xs bg-white"
                />
              </div>

              {/* MONTO DÓLARES (BLOQUEADO SI ES SOLES) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-[10px] uppercase font-bold ${!isDolares ? "text-slate-400" : "text-slate-700 font-black"}`}>
                    Monto Dólares (USD)
                  </label>
                  {!isDolares && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                      <Lock className="w-2.5 h-2.5" /> Bloqueado
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className={`absolute left-3 top-2.5 font-bold text-xs ${!isDolares ? "text-slate-400" : "text-slate-600"}`}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    readOnly={!isDolares}
                    value={formData.monto_dolares}
                    onChange={handleMontoDolaresChange}
                    className={`w-full pl-7 pr-8 py-2 rounded-xl border font-bold outline-hidden transition-all text-xs ${
                      !isDolares
                        ? "bg-slate-100/90 border-slate-200 text-slate-500 cursor-not-allowed select-none"
                        : "bg-white border-slate-200 focus:border-purple-500 text-slate-800 shadow-xs"
                    }`}
                  />
                  {!isDolares && (
                    <div className="absolute right-2.5 top-2.5 pointer-events-none">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* DATOS DE DESTINATARIO, BANCO Y N° CUENTA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            <DestinatarioAutocomplete
              label="Destinatario"
              placeholder="Buscar colaborador (ej. DIEG, DNI)..."
              value={destinatarioNombre}
              onSelect={handleDestinatarioSelect}
              onChange={(val) => setDestinatarioNombre(val)}
              tabIndex={1}
            />

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Banco
              </label>
              <select
                value={formData.id_banco}
                onChange={(e) => setFormData({ ...formData, id_banco: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-800 font-bold outline-hidden transition-all text-xs bg-white"
              >
                <option value="">-- Seleccionar Banco --</option>
                {bancos.map((b) => (
                  <option key={b.id_banco} value={b.id_banco}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                N° de Cuenta
              </label>
              <input
                type="text"
                placeholder="Ej: 191-xxxxxxx-0-xx"
                value={formData.numero_cuenta}
                onChange={(e) => setFormData({ ...formData, numero_cuenta: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-800 font-bold outline-hidden transition-all text-xs bg-white font-mono"
              />
            </div>
          </div>

          {/* TIPO DE SOLICITUD Y FECHAS DE TRANSFERENCIA/LIQUIDACIÓN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Solicitud
              </label>
              <select
                value={formData.tipo_solicitud || 4}
                onChange={(e) => setFormData({ ...formData, tipo_solicitud: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-800 font-medium outline-hidden transition-all text-xs bg-white"
              >
                {(tiposSolicitud.length > 0 ? tiposSolicitud : [
                  { id_tipo: 4, nombre: "Planilla de Movilidad" },
                  { id_tipo: 1, nombre: "Otros" },
                  { id_tipo: 2, nombre: "Movilidad" },
                  { id_tipo: 3, nombre: "Traslado" },
                ]).map((t) => (
                  <option key={t.id_tipo} value={t.id_tipo}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Fecha Transferencia
              </label>
              <input
                type="date"
                value={formData.fecha_transferencia}
                onChange={(e) => setFormData({ ...formData, fecha_transferencia: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-800 font-medium outline-hidden transition-all text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Fecha Liquidación (Aprox)
              </label>
              <input
                type="date"
                value={formData.fecha_liquidacion}
                onChange={(e) => setFormData({ ...formData, fecha_liquidacion: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-800 font-medium outline-hidden transition-all text-xs"
              />
            </div>
          </div>

          {/* OBSERVACIÓN */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
              Observaciones (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalles adicionales sobre la entrega o justificación..."
              value={formData.observacion}
              onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-800 font-medium outline-hidden transition-all text-xs resize-none"
            />
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
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
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

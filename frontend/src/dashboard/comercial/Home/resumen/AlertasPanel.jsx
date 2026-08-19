import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle, UserCheck, Bell, ShieldAlert, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AlertasPanel({ cotizaciones = [], alertas = [], mes = "%" }) {
  const navigate = useNavigate();

  const alerts = useMemo(() => {
    const list = [];
    const hoy = new Date();
    const hoyCero = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const targetMes = mes === "%" ? (new Date().getMonth() + 1) : Number(mes);

    // 1. Pendientes de Aprobación (estado_envio === 1 es "Pendiente de Aprobación")
    const pendAprob = cotizaciones.filter(c => {
      if (c.estado_envio !== 1) return false;
      const fecha = new Date(c.fecha || c.cotif);
      return (fecha.getMonth() + 1) === targetMes;
    });
    if (pendAprob.length > 0) {
      list.push({
        id: "pend_aprob",
        type: "danger",
        icon: <ShieldAlert size={14} className="text-red-500" />,
        text: `Hay ${pendAprob.length} cotizaciones pendientes de tu aprobación o revisión de gerencia.`,
        actionLabel: "Revisar Cotizaciones",
        action: () => navigate("/comercial/cotizaciones")
      });
    }

    // 2. Cotizaciones sin responsable técnico asignado
    const sinTecnico = cotizaciones.filter(c => {
      const faltoTecnico = !c.id_tecnico || !c.tecnico_nombre || c.tecnico_nombre === "Por asignar" || c.tecnico_nombre === "Por Asignar" || c.tecnico_nombre === "-";
      if (!faltoTecnico) return false;
      const fecha = new Date(c.fecha || c.cotif);
      return (fecha.getMonth() + 1) === targetMes;
    });
    if (sinTecnico.length > 0) {
      list.push({
        id: "sin_tecnico",
        type: "warning",
        icon: <UserCheck size={14} className="text-amber-500" />,
        text: `Se detectaron ${sinTecnico.length} cotizaciones activas sin responsable técnico asignado.`,
        actionLabel: "Asignar Técnicos",
        action: () => navigate("/comercial/cotizaciones")
      });
    }

    // 3. Oportunidades estancadas (sin emitir cotización, creadas hace más de 15 días)
    const estancadas = cotizaciones.filter(c => {
      const esOportunidad = c.id_estado === 11 || c.estado_nombre === "Oportunidad";
      if (!esOportunidad) return false;
      const creacion = new Date(c.fecha || c.cotif);
      if ((creacion.getMonth() + 1) !== targetMes) return false;
      const diffTime = hoy - creacion;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 15;
    });

    if (estancadas.length > 0) {
      const montoTotal = estancadas.reduce((acc, c) => acc + Number(c.tot_c || 0), 0);
      list.push({
        id: "estancadas",
        type: "warning",
        icon: <AlertTriangle size={14} className="text-amber-500" />,
        text: `${estancadas.length} oportunidades se encuentran estancadas hace más de 15 días (Valor: $${Number(montoTotal).toLocaleString("en-US", { maximumFractionDigits: 0 })}).`,
        actionLabel: "Ver Oportunidades",
        action: () => navigate("/comercial/oportunidades")
      });
    }

    // 4. Límite de Presentación (Oportunidades con deadline próximo/vencido en los próximos 2 días)
    const limitesOportunidad = cotizaciones.filter(c => {
      const esOportunidad = c.id_estado === 11 || c.estado_nombre === "Oportunidad";
      if (!esOportunidad || !c.fecha_limite) return false;
      const limitDate = new Date(c.fecha_limite);
      if ((limitDate.getMonth() + 1) !== targetMes) return false;
      const limitCero = new Date(limitDate.getFullYear(), limitDate.getMonth(), limitDate.getDate());
      const diffTime = limitCero - hoyCero;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 2;
    });

    limitesOportunidad.forEach(c => {
      const fechaFormat = new Date(c.fecha_limite).toLocaleDateString("es-ES");
      list.push({
        id: `limit-op-${c.id_registro}`,
        type: "danger",
        icon: <AlertTriangle size={14} className="text-red-500" />,
        text: `Límite de presentación próximo o vencido para la Oportunidad ${c.codigo || `REG-${c.id_registro}`} (${c.cliente_nombre || c.cliente || "S/N"}) - Fecha Límite: ${fechaFormat}.`,
        actionLabel: "Ver Oportunidad",
        action: () => navigate(`/comercial/oportunidades/${c.id_registro}`)
      });
    });

    // 5. Vencimiento de Validez de Oferta (Cotizaciones activas próximas a vencer/vencidas en los próximos 3 días)
    const validezCotizaciones = cotizaciones.filter(c => {
      const esCotizacion = c.id_estado !== 11 && c.estado_nombre !== "Oportunidad";
      const esActiva = c.id_estado !== 1 && c.estado_nombre !== "Adjudicado" && c.estado_nombre !== "Anulada" && c.estado_nombre !== "Rechazada";
      if (!esCotizacion || !esActiva || !c.fecha_validez_oferta) return false;
      const validezDate = new Date(c.fecha_validez_oferta);
      if ((validezDate.getMonth() + 1) !== targetMes) return false;
      const validezCero = new Date(validezDate.getFullYear(), validezDate.getMonth(), validezDate.getDate());
      const diffTime = validezCero - hoyCero;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    });

    validezCotizaciones.forEach(c => {
      const fechaFormat = new Date(c.fecha_validez_oferta).toLocaleDateString("es-ES");
      list.push({
        id: `validez-cot-${c.id_registro}`,
        type: "warning",
        icon: <AlertTriangle size={14} className="text-amber-500" />,
        text: `Vencimiento de Validez de Oferta próximo o vencido para la Cotización ${c.codigo || `REG-${c.id_registro}`} (${c.cliente_nombre || c.cliente || "S/N"}) - Vence: ${fechaFormat}.`,
        actionLabel: "Ver Cotización",
        action: () => navigate(`/comercial/cotizaciones/${c.id_registro}`)
      });
    });

    // 6. Visitas Técnicas programadas en las próximas 48 horas
    const visitasProximas = cotizaciones.filter(c => {
      if (!c.visita_tecnica) return false;
      const visitaDate = new Date(c.visita_tecnica);
      if ((visitaDate.getMonth() + 1) !== targetMes) return false;
      const diffTime = visitaDate - hoy;
      const diffHours = diffTime / (1000 * 60 * 60);
      return diffHours >= -2 && diffHours <= 48;
    });

    visitasProximas.forEach(c => {
      const isOportunidad = c.id_estado === 11 || c.estado_nombre === "Oportunidad";
      const path = isOportunidad ? "oportunidades" : "cotizaciones";
      const visitaFormat = new Date(c.visita_tecnica).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      list.push({
        id: `visita-${c.id_registro}`,
        type: "info",
        icon: <UserCheck size={14} className="text-cyan-500" />,
        text: `Visita Técnica Programada para el ${visitaFormat} en el registro ${c.codigo || `REG-${c.id_registro}`} (${c.cliente_nombre || c.cliente || "S/N"}).`,
        actionLabel: "Ver Registro",
        action: () => navigate(`/comercial/${path}/${c.id_registro}`)
      });
    });

    // 7. Recordatorios de Seguimiento Comercial Agendados (Activos y vencidos/hoy)
    const recordatoriosActivos = alertas.filter(a => {
      if (a.completo === "1" || a.completo === true) return false;
      if (!a.alerta_fecha) return false;
      const alertDateObj = new Date(a.alerta_fecha);
      if ((alertDateObj.getMonth() + 1) !== targetMes) return false;
      return alertDateObj <= hoy;
    });

    recordatoriosActivos.forEach(a => {
      const isOportunidad = a.id_estado === 11 || a.estado_nombre === "Oportunidad";
      const path = isOportunidad ? "oportunidades" : "cotizaciones";
      list.push({
        id: `msg-alert-${a.id_mensaje}`,
        type: "warning",
        icon: <Bell size={14} className="text-indigo-500" />,
        text: `Recordatorio de Agenda: "${a.mensaje}" para el registro ${a.cotizacion_codigo || 'S/N'} (${a.cliente_nombre}).`,
        actionLabel: "Ver Registro",
        action: () => navigate(`/comercial/${path}/${a.id_registro}`)
      });
    });

    return list;
  }, [cotizaciones, alertas, navigate, mes]);

  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4 space-y-3 font-sans w-full">
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
          <Bell size={13} className="text-indigo-600 animate-bounce" />
          Tareas Pendientes y Alertas Críticas
        </h3>
        <span className="text-[9px] font-black bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
          {alerts.length} alertas activas
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-all hover:translate-x-0.5 ${
              alert.type === "danger"
                ? "bg-rose-50/55 border-rose-100/70 text-rose-800"
                : alert.type === "info"
                ? "bg-cyan-50/55 border-cyan-100/70 text-cyan-800"
                : "bg-amber-50/40 border-amber-100/60 text-amber-800"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-100 mt-0.5">
                {alert.icon}
              </div>
              <p className="text-[10px] font-bold leading-normal uppercase tracking-tight">
                {alert.text}
              </p>
            </div>
            {alert.action && (
              <button
                onClick={alert.action}
                className="shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {alert.actionLabel}
                <ArrowRight size={10} />
              </button>
            )}
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="p-4 bg-emerald-50/40 border border-emerald-100/60 text-emerald-800 rounded-xl flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-wider">
              ¡Buen trabajo! No se registran alertas comerciales críticas ni tareas pendientes en este periodo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
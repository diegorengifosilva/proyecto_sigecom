// src/dashboard/automatizacion/AutomatizacionDashboard.jsx
import React, { useState, useMemo } from "react";
import { Cpu, Mail, Bell, CheckCircle2, Settings, AlertTriangle, ShieldCheck } from "lucide-react";

export default function AutomatizacionDashboard({ module = "comercial", anno, mes }) {
  // Configuración de reportes por correo (Comercial)
  const [reportsConfig, setReportsConfig] = useState({
    monthlyGoals: true,
    overdueOpps: false,
    weeklyExecutive: true,
  });

  // Reglas y Disparadores (Comercial)
  const [rulesConfig, setRulesConfig] = useState({
    pendingQuotesAlert: true,
    lowProbabilityWarn: true,
    autoFollowUpEmail: false,
  });

  // Configuración de reportes por correo (Logística)
  const [reportsConfigLog, setReportsConfigLog] = useState({
    leadTimeCompliance: true,
    supplierDelays: true,
    weeklyInventory: false,
  });

  // Reglas y Disparadores (Logística)
  const [rulesConfigLog, setRulesConfigLog] = useState({
    criticalStockAlert: true,
    longDelayTrigger: true,
    autoSupplierClaim: false,
  });

  const logs = useMemo(() => {
    if (module === "logistica") {
      return [
        { time: "2026-07-09 08:30:00", event: "Envío Automático: Desempeño de Proveedores", status: "success", target: "Gerencia de Compras" },
        { time: "2026-07-08 11:20:15", event: "Alerta: Stock Crítico - Cable Cobre AWG-10 (<5m)", status: "triggered", target: "Almacén Central" },
        { time: "2026-07-07 09:15:00", event: "Reclamo Automático Enviado: OC-2026-0042 retrasada", status: "success", target: "Proveedor Aceros Ind." },
        { time: "2026-07-01 00:05:00", event: "Sincronización mensual de Kardex y valorización", status: "success", target: "Sistema Core" },
      ];
    }
    return [
      { time: "2026-07-09 08:00:00", event: "Envío Automático: Consolidado Semanal de Ventas", status: "success", target: "Gerencia Comercial" },
      { time: "2026-07-08 10:30:15", event: "Alerta: COT-2026-0045 sin seguimiento (>10 días)", status: "triggered", target: "Ejecutivo Carlos R." },
      { time: "2026-07-07 14:00:00", event: "Notificación de Probabilidad Crítica: COT-2026-0012", status: "success", target: "Ejecutiva Lucía M." },
      { time: "2026-07-01 00:05:00", event: "Generación de Objetivos Mensuales del período", status: "success", target: "Sistema Core" },
    ];
  }, [module]);

  const handleToggleReport = (key) => {
    if (module === "logistica") {
      setReportsConfigLog(prev => ({ ...prev, [key]: !prev[key] }));
    } else {
      setReportsConfig(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleToggleRule = (key) => {
    if (module === "logistica") {
      setRulesConfigLog(prev => ({ ...prev, [key]: !prev[key] }));
    } else {
      setRulesConfig(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* HEADER DE AUTOMATIZACION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-2">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 tracking-tight">
            <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600">
              <Cpu size={16} />
            </div>
            Jarvis Automatizaciones
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-10">
            Reglas de negocio, alertas automáticas e historial de ejecución
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* CONFIGURACIONES */}
        <div className="flex flex-col gap-6">
          {/* REPORTE POR CORREO */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="text-emerald-500 w-4 h-4" />
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Reportes Programados</h3>
            </div>

            <div className="divide-y divide-gray-100">
              {module === "comercial" ? (
                <>
                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Reporte Mensual de Objetivos</h4>
                      <p className="text-[10px] text-gray-400">Envío consolidado del estado de metas del año ({anno}) al directorio.</p>
                    </div>
                    <button
                      onClick={() => handleToggleReport("monthlyGoals")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        reportsConfig.monthlyGoals ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Notificación de Oportunidades Vencidas</h4>
                      <p className="text-[10px] text-gray-400">Resumen matutino de solicitudes fuera de su fecha límite.</p>
                    </div>
                    <button
                      onClick={() => handleToggleReport("overdueOpps")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        reportsConfig.overdueOpps ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Resumen Semanal de Actividades</h4>
                      <p className="text-[10px] text-gray-400">Reporte del progreso de cotizaciones de todos los ejecutivos.</p>
                    </div>
                    <button
                      onClick={() => handleToggleReport("weeklyExecutive")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        reportsConfig.weeklyExecutive ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Cumplimiento de Lead Time</h4>
                      <p className="text-[10px] text-gray-400">Envío de reporte mensual de tiempos de respuesta de proveedores.</p>
                    </div>
                    <button
                      onClick={() => handleToggleReport("leadTimeCompliance")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        reportsConfigLog.leadTimeCompliance ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Alertas de Proveedores Atrasados</h4>
                      <p className="text-[10px] text-gray-400">Reporte consolidado de proveedores con órdenes de compra demoradas.</p>
                    </div>
                    <button
                      onClick={() => handleToggleReport("supplierDelays")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        reportsConfigLog.supplierDelays ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Resumen de Stock e Inventario</h4>
                      <p className="text-[10px] text-gray-400">Informe de valorización de almacén y rotación de Kardex.</p>
                    </div>
                    <button
                      onClick={() => handleToggleReport("weeklyInventory")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        reportsConfigLog.weeklyInventory ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* DISPARADORES DE ALERTAS */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="text-emerald-500 w-4 h-4" />
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Reglas & Triggers</h3>
            </div>

            <div className="divide-y divide-gray-100">
              {module === "comercial" ? (
                <>
                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Cotización Estancada (&gt;10 días)</h4>
                      <p className="text-[10px] text-gray-400">Notificar al ejecutivo si no registra actividad de seguimiento.</p>
                    </div>
                    <button
                      onClick={() => handleToggleRule("pendingQuotesAlert")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        rulesConfig.pendingQuotesAlert ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Aviso de Probabilidad Crítica (&lt;30%)</h4>
                      <p className="text-[10px] text-gray-400">Advertir a la gerencia sobre propuestas con baja probabilidad.</p>
                    </div>
                    <button
                      onClick={() => handleToggleRule("lowProbabilityWarn")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        rulesConfig.lowProbabilityWarn ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Seguimiento Automático a Clientes</h4>
                      <p className="text-[10px] text-gray-400">Enviar correo de seguimiento automático 7 días después de emitida.</p>
                    </div>
                    <button
                      onClick={() => handleToggleRule("autoFollowUpEmail")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        rulesConfig.autoFollowUpEmail ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Alerta de Stock Crítico (&lt;10 items)</h4>
                      <p className="text-[10px] text-gray-400">Emitir notificación cuando el stock en almacén baje de la meta.</p>
                    </div>
                    <button
                      onClick={() => handleToggleRule("criticalStockAlert")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        rulesConfigLog.criticalStockAlert ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Aviso de Retraso de Proveedor (&gt;5 días)</h4>
                      <p className="text-[10px] text-gray-400">Notificar de inmediato a adquisiciones si el proveedor se demora.</p>
                    </div>
                    <button
                      onClick={() => handleToggleRule("longDelayTrigger")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        rulesConfigLog.longDelayTrigger ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Reclamo Automático de OC Atrasada</h4>
                      <p className="text-[10px] text-gray-400">Enviar correo de reclamo por orden de compra fuera de plazo.</p>
                    </div>
                    <button
                      onClick={() => handleToggleRule("autoSupplierClaim")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center ${
                        rulesConfigLog.autoSupplierClaim ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* BITÁCORA DE EJECUCIÓN */}
        <div className="flex flex-col gap-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="text-emerald-500 w-4 h-4 animate-spin" />
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Bitácora Reciente</h3>
            </div>

            <div className="space-y-4">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-3 p-3.5 bg-slate-50/50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="shrink-0 mt-0.5">
                    {log.status === "success" ? (
                      <div className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={14} />
                      </div>
                    ) : (
                      <div className="p-1 rounded-full bg-amber-100 text-amber-700">
                        <AlertTriangle size={14} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-gray-700 line-clamp-1">{log.event}</h4>
                      <span className="text-[8px] font-black text-gray-400 uppercase shrink-0">{log.status === "success" ? "Completado" : "Disparado"}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">Objetivo: <span className="font-bold text-gray-700">{log.target}</span></p>
                    <span className="text-[8px] font-bold text-gray-400 block mt-1">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase">
            <span>Motor de Automatización Activo</span>
            <span className="flex items-center gap-1 text-emerald-600 font-black">
              <ShieldCheck size={12} />
              En ejecución
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
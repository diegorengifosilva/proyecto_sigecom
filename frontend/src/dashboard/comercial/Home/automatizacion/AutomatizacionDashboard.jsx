// src/dashboard/automatizacion/AutomatizacionDashboard.jsx
import React, { useState, useMemo } from "react";
import { Cpu, Mail, Bell, CheckCircle2, Settings, AlertTriangle, ShieldCheck, Play, Sparkles, Plus, Trash2, Sliders } from "lucide-react";
import { toast } from "react-toastify";

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

  // Umbrales interactivos de automatización
  const [probThreshold, setProbThreshold] = useState(30);
  const [daysThreshold, setDaysThreshold] = useState(10);
  const [stockThreshold, setStockThreshold] = useState(10);
  const [delayThreshold, setDelayThreshold] = useState(5);

  // Reglas personalizadas generadas por IA
  const [customRules, setCustomRules] = useState([]);
  const [newRulePrompt, setNewRulePrompt] = useState("");

  // Bitácora de ejecución dinámica
  const initialLogs = useMemo(() => {
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

  const [executionLogs, setExecutionLogs] = useState(initialLogs);

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

  // Ejecución manual de reportes/reglas
  const handleRunManual = (eventName, targetName) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newLog = {
      time: now,
      event: `Ejecución Manual: ${eventName}`,
      status: "success",
      target: targetName
    };
    setExecutionLogs(prev => [newLog, ...prev]);
    toast.success(`¡Ejecución manual exitosa! Enviado a ${targetName}`);
  };

  // Creación de regla con IA
  const handleCreateAiRule = (e) => {
    e.preventDefault();
    if (!newRulePrompt.trim()) return;

    const newRule = {
      id: "custom_" + Date.now(),
      title: newRulePrompt.charAt(0).toUpperCase() + newRulePrompt.slice(1),
      description: "Regla personalizada generada por V&C AI Copilot.",
      active: true
    };

    setCustomRules(prev => [...prev, newRule]);
    setNewRulePrompt("");

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setExecutionLogs(prev => [
      {
        time: now,
        event: `Regla acoplada por IA: ${newRule.title}`,
        status: "success",
        target: "V&C Copilot"
      },
      ...prev
    ]);
    toast.success("¡Regla IA generada y acoplada al motor de automatización!");
  };

  const handleToggleCustomRule = (id) => {
    setCustomRules(prev => prev.map(rule => rule.id === id ? { ...rule, active: !rule.active } : rule));
  };

  const handleDeleteCustomRule = (id, title) => {
    setCustomRules(prev => prev.filter(rule => rule.id !== id));
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setExecutionLogs(prev => [
      {
        time: now,
        event: `Regla eliminada: ${title}`,
        status: "triggered",
        target: "V&C Copilot"
      },
      ...prev
    ]);
    toast.info("Regla personalizada removida.");
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* HEADER DE AUTOMATIZACION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-1">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 tracking-tight">
            <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600 animate-pulse">
              <Cpu size={16} />
            </div>
            V&C AI • Automatizaciones
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-10">
            Reglas de negocio, alertas automáticas e historial de ejecución
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        
        {/* REPORTES PROGRAMADOS */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="text-emerald-500 w-4 h-4" />
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Reportes Programados</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {module === "comercial" ? (
              <>
                {/* REPORTE 1 */}
                <div className="group flex justify-between items-center py-3.5 transition-colors">
                  <div className="flex-1 pr-4">
                    <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2">
                      Reporte Mensual de Objetivos
                      <button 
                        onClick={() => handleRunManual("Consolidado Mensual", "Directorio Comercial")}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100"
                        title="Ejecutar y enviar ahora"
                      >
                        <Play size={10} fill="currentColor" />
                      </button>
                    </h4>
                    <p className="text-[10px] text-gray-400">Consolidado del estado de metas del año ({anno}) al directorio.</p>
                  </div>
                  <button
                    onClick={() => handleToggleReport("monthlyGoals")}
                    className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                      reportsConfig.monthlyGoals ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>

                {/* REPORTE 2 */}
                <div className="group flex justify-between items-center py-3.5 transition-colors">
                  <div className="flex-1 pr-4">
                    <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2">
                      Notificación de Oportunidades Vencidas
                      <button 
                        onClick={() => handleRunManual("Alerta de Oportunidades", "Equipo Comercial")}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100"
                        title="Ejecutar y enviar ahora"
                      >
                        <Play size={10} fill="currentColor" />
                      </button>
                    </h4>
                    <p className="text-[10px] text-gray-400">Resumen matutino de solicitudes fuera de su fecha límite.</p>
                  </div>
                  <button
                    onClick={() => handleToggleReport("overdueOpps")}
                    className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                      reportsConfig.overdueOpps ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>

                {/* REPORTE 3 */}
                <div className="group flex justify-between items-center py-3.5 transition-colors">
                  <div className="flex-1 pr-4">
                    <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2">
                      Resumen Semanal de Actividades
                      <button 
                        onClick={() => handleRunManual("Resumen Semanal", "Gerencia Comercial")}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100"
                        title="Ejecutar y enviar ahora"
                      >
                        <Play size={10} fill="currentColor" />
                      </button>
                    </h4>
                    <p className="text-[10px] text-gray-400">Reporte del progreso de cotizaciones de todos los ejecutivos.</p>
                  </div>
                  <button
                    onClick={() => handleToggleReport("weeklyExecutive")}
                    className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                      reportsConfig.weeklyExecutive ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="group flex justify-between items-center py-3.5 transition-colors">
                  <div className="flex-1 pr-4">
                    <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2">
                      Cumplimiento de Lead Time
                      <button 
                        onClick={() => handleRunManual("Lead Time Report", "Gerencia de Compras")}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100"
                        title="Ejecutar y enviar ahora"
                      >
                        <Play size={10} fill="currentColor" />
                      </button>
                    </h4>
                    <p className="text-[10px] text-gray-400">Tiempos de respuesta y demoras de proveedores.</p>
                  </div>
                  <button
                    onClick={() => handleToggleReport("leadTimeCompliance")}
                    className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                      reportsConfigLog.leadTimeCompliance ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>

                <div className="group flex justify-between items-center py-3.5 transition-colors">
                  <div className="flex-1 pr-4">
                    <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2">
                      Alertas de Proveedores Atrasados
                      <button 
                        onClick={() => handleRunManual("Retrasos Proveedores", "Adquisiciones")}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100"
                        title="Ejecutar y enviar ahora"
                      >
                        <Play size={10} fill="currentColor" />
                      </button>
                    </h4>
                    <p className="text-[10px] text-gray-400">Consolidado de proveedores con órdenes de compra demoradas.</p>
                  </div>
                  <button
                    onClick={() => handleToggleReport("supplierDelays")}
                    className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                      reportsConfigLog.supplierDelays ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>

                <div className="group flex justify-between items-center py-3.5 transition-colors">
                  <div className="flex-1 pr-4">
                    <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2">
                      Resumen de Stock e Inventario
                      <button 
                        onClick={() => handleRunManual("Kardex de Inventario", "Jefe de Almacén")}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100"
                        title="Ejecutar y enviar ahora"
                      >
                        <Play size={10} fill="currentColor" />
                      </button>
                    </h4>
                    <p className="text-[10px] text-gray-400">Informe de valorización de almacén y rotación de Kardex.</p>
                  </div>
                  <button
                    onClick={() => handleToggleReport("weeklyInventory")}
                    className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
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

        {/* REGLAS & TRIGGERS */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="text-emerald-500 w-4 h-4" />
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Reglas & Triggers</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {module === "comercial" ? (
              <>
                {/* REGLA 1 */}
                <div className="py-3.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Cotización Estancada (&gt;{daysThreshold} días)</h4>
                      <p className="text-[10px] text-gray-400">Notificar al ejecutivo si no registra actividad de seguimiento.</p>
                    </div>
                    <button
                      onClick={() => handleToggleRule("pendingQuotesAlert")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                        rulesConfig.pendingQuotesAlert ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                  {rulesConfig.pendingQuotesAlert && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                      <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                        <span>Límite de Inactividad</span>
                        <span className="text-indigo-655 font-bold">{daysThreshold} días</span>
                      </div>
                      <input 
                        type="range" 
                        min="3" 
                        max="30" 
                        value={daysThreshold}
                        onChange={(e) => setDaysThreshold(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  )}
                </div>

                {/* REGLA 2 (30% CONFIGURABLE) */}
                <div className="py-3.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Aviso de Probabilidad Crítica (&lt;{probThreshold}%)</h4>
                      <p className="text-[10px] text-gray-400">Advertir a la gerencia sobre propuestas con baja probabilidad.</p>
                    </div>
                    <button
                      onClick={() => handleToggleRule("lowProbabilityWarn")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                        rulesConfig.lowProbabilityWarn ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                  {rulesConfig.lowProbabilityWarn && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                      <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                        <span>Probabilidad de Alerta</span>
                        <span className="text-indigo-655 font-bold">{probThreshold}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="50" 
                        step="5"
                        value={probThreshold}
                        onChange={(e) => setProbThreshold(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  )}
                </div>

                {/* REGLA 3 */}
                <div className="flex justify-between items-center py-3.5">
                  <div className="flex-1 pr-4">
                    <h4 className="text-xs font-bold text-gray-700">Seguimiento Automático a Clientes</h4>
                    <p className="text-[10px] text-gray-400">Enviar correo de seguimiento automático 7 días después de emitida.</p>
                  </div>
                  <button
                    onClick={() => handleToggleRule("autoFollowUpEmail")}
                    className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                      rulesConfig.autoFollowUpEmail ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="py-3.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Alerta de Stock Crítico (&lt;{stockThreshold} items)</h4>
                      <p className="text-[10px] text-gray-400">Notificación si el stock baje del nivel mínimo.</p>
                    </div>
                    <button
                      onClick={() => handleToggleRule("criticalStockAlert")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                        rulesConfigLog.criticalStockAlert ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                  {rulesConfigLog.criticalStockAlert && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                      <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                        <span>Stock Mínimo Permitido</span>
                        <span className="text-indigo-655 font-bold">{stockThreshold} unidades</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="50" 
                        value={stockThreshold}
                        onChange={(e) => setStockThreshold(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  )}
                </div>

                <div className="py-3.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700">Aviso de Retraso de Proveedor (&gt;{delayThreshold} días)</h4>
                      <p className="text-[10px] text-gray-400">Notificar a compras si el proveedor excede el lead time.</p>
                    </div>
                    <button
                      onClick={() => handleToggleRule("longDelayTrigger")}
                      className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                        rulesConfigLog.longDelayTrigger ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                  {rulesConfigLog.longDelayTrigger && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                      <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                        <span>Límite de Atraso</span>
                        <span className="text-indigo-655 font-bold">{delayThreshold} días</span>
                      </div>
                      <input 
                        type="range" 
                        min="2" 
                        max="15" 
                        value={delayThreshold}
                        onChange={(e) => setDelayThreshold(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center py-3.5">
                  <div className="flex-1 pr-4">
                    <h4 className="text-xs font-bold text-gray-700">Reclamo Automático de OC Atrasada</h4>
                    <p className="text-[10px] text-gray-400">Enviar correo de reclamo por orden de compra fuera de plazo.</p>
                  </div>
                  <button
                    onClick={() => handleToggleRule("autoSupplierClaim")}
                    className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                      rulesConfigLog.autoSupplierClaim ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              </>
            )}

            {/* REGLAS PERSONALIZADAS DE IA */}
            {customRules.map((rule) => (
              <div key={rule.id} className="group/custom flex justify-between items-start py-3.5 border-t border-dashed border-gray-150 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex-1 pr-4">
                  <h4 className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full shrink-0" />
                    {rule.title}
                    <button 
                      onClick={() => handleDeleteCustomRule(rule.id, rule.title)}
                      className="opacity-0 group-hover/custom:opacity-100 transition-opacity p-0.5 text-gray-400 hover:text-red-500 rounded ml-1"
                      title="Eliminar regla personalizada"
                    >
                      <Trash2 size={11} />
                    </button>
                  </h4>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{rule.description}</p>
                </div>
                <button
                  onClick={() => handleToggleCustomRule(rule.id)}
                  className={`w-10 h-5.5 rounded-full p-1 transition-colors outline-none flex items-center shrink-0 ${
                    rule.active ? "bg-violet-500 justify-end" : "bg-gray-200 justify-start"
                  }`}
                >
                  <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* COPILOT AI RULE SANDBOX */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-indigo-950 shadow-md space-y-4">
          <div className="flex items-center gap-2 select-none">
            <Sparkles className="text-cyan-400 w-4 h-4 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">Crear Regla por IA</h3>
          </div>
          <form onSubmit={handleCreateAiRule} className="space-y-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder={module === "comercial" ? "Ej: Alerta si un negocio de Minería supera los $50k..." : "Ej: Notificar si el stock de AWG baja de 20 un..."}
                value={newRulePrompt}
                onChange={(e) => setNewRulePrompt(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs placeholder:text-slate-400 text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={!newRulePrompt.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95 shadow-lg shadow-cyan-500/10"
            >
              <Plus size={12} strokeWidth={3} />
              Generar Regla
            </button>
          </form>
        </div>

        {/* BITÁCORA DE EJECUCIÓN */}
        <div className="flex flex-col bg-white p-5 rounded-2xl border border-gray-200 shadow-sm justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="text-emerald-500 w-4 h-4 animate-spin" />
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Bitácora Reciente</h3>
            </div>

            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
              {executionLogs.map((log, idx) => (
                <div key={idx} className="flex gap-3 p-3.5 bg-slate-50/50 rounded-xl border border-gray-200 hover:border-indigo-150 transition-colors animate-in fade-in duration-350">
                  <div className="shrink-0 mt-0.5">
                    {log.status === "success" ? (
                      <div className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={13} />
                      </div>
                    ) : (
                      <div className="p-1 rounded-full bg-amber-100 text-amber-700">
                        <AlertTriangle size={13} />
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

          <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase select-none">
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
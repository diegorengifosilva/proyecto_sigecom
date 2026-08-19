import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, User, ArrowRight, ChevronLeft, ChevronRight, MapPin, ClipboardList, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CalendarioComercial({ cotizaciones = [], aperturas = [], alertas = [] }) {
  const navigate = useNavigate();
  const [selectedOffset, setSelectedOffset] = useState(0); // Para mover el bloque de días
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toDateString());

  // Genera un rango de 10 días alrededor del offset
  const days = useMemo(() => {
    const list = [];
    const today = new Date();
    // Empezamos 2 días antes de hoy + offset para dar contexto
    for (let i = -2; i < 8; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i + selectedOffset);
      list.push(d);
    }
    return list;
  }, [selectedOffset]);

  // Mapear cotizaciones, aperturas y recordatorios de seguimiento a eventos calendarizables
  const events = useMemo(() => {
    const list = [];
    
    // Cotizaciones y Oportunidades
    cotizaciones.forEach(c => {
      const isOportunidad = c.id_estado === 11 || c.estado_nombre === "Oportunidad";
      const recordType = isOportunidad ? "OPORTUNIDAD" : "COTIZACIÓN";
      
      const parts = [];
      if (c.cliente && c.cliente !== "-") parts.push(c.cliente);
      if (c.referencia && c.referencia !== "-") parts.push(c.referencia);
      const clientAndReference = parts.join(" - ") || "Sin Detalles";

      // 1. Visita Técnica
      if (c.visita_tecnica) {
        const dateObj = new Date(c.visita_tecnica);
        list.push({
          id: `vt-${c.id_registro || c.num_reg}`,
          type: "visita",
          recordType,
          date: dateObj,
          dateStr: dateObj.toDateString(),
          time: dateObj.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
          title: "Visita Técnica Programada",
          code: c.codigo || `REG-${c.num_reg || c.id_registro}`,
          clientAndReference,
          responsible: c.comercial_nombre || "Sin Asignar",
          raw: c
        });
      }
      // 2. Fecha Límite de Cotización
      if (c.fecha_limite) {
        const dateObj = new Date(c.fecha_limite);
        list.push({
          id: `fl-${c.id_registro || c.num_reg}`,
          type: "deadline",
          recordType,
          date: dateObj,
          dateStr: dateObj.toDateString(),
          time: "18:00",
          title: "Fecha Límite de Presentación",
          code: c.codigo || `REG-${c.num_reg || c.id_registro}`,
          clientAndReference,
          responsible: c.comercial_nombre || "Sin Asignar",
          raw: c
        });
      }
      // 3. Entrega Suministros
      if (c.fecha_entrega_suministros) {
        const dateObj = new Date(c.fecha_entrega_suministros);
        list.push({
          id: `es-${c.id_registro || c.num_reg}`,
          type: "suministros",
          recordType,
          date: dateObj,
          dateStr: dateObj.toDateString(),
          time: "18:00",
          title: "Plazo de Entrega Suministros",
          code: c.codigo || `REG-${c.num_reg || c.id_registro}`,
          clientAndReference,
          responsible: c.comercial_nombre || "Sin Asignar",
          raw: c
        });
      }
      // 4. Entrega Servicios
      if (c.fecha_entrega_servicios) {
        const dateObj = new Date(c.fecha_entrega_servicios);
        list.push({
          id: `se-${c.id_registro || c.num_reg}`,
          type: "servicios",
          recordType,
          date: dateObj,
          dateStr: dateObj.toDateString(),
          time: "18:00",
          title: "Plazo de Entrega Servicios",
          code: c.codigo || `REG-${c.num_reg || c.id_registro}`,
          clientAndReference,
          responsible: c.comercial_nombre || "Sin Asignar",
          raw: c
        });
      }
      // 5. Validez Oferta
      if (c.fecha_validez_oferta) {
        const dateObj = new Date(c.fecha_validez_oferta);
        list.push({
          id: `vo-${c.id_registro || c.num_reg}`,
          type: "validez",
          recordType,
          date: dateObj,
          dateStr: dateObj.toDateString(),
          time: "18:00",
          title: "Vencimiento Validez de Oferta",
          code: c.codigo || `REG-${c.num_reg || c.id_registro}`,
          clientAndReference,
          responsible: c.comercial_nombre || "Sin Asignar",
          raw: c
        });
      }
    });

    // Aperturas
    aperturas.forEach(ap => {
      const parts = [];
      if (ap.cliente_nombre && ap.cliente_nombre !== "-") parts.push(ap.cliente_nombre);
      if (ap.cotizacion_referencia && ap.cotizacion_referencia !== "-") parts.push(ap.cotizacion_referencia);
      const clientAndReference = parts.join(" - ") || "Sin Detalles";

      if (ap.fecha_entrega) {
        const dateObj = new Date(ap.fecha_entrega);
        list.push({
          id: `ap-${ap.id_apertura}`,
          type: "entrega_real",
          recordType: "APERTURA",
          date: dateObj,
          dateStr: dateObj.toDateString(),
          time: "18:00",
          title: "Fecha de Entrega Real",
          code: ap.numero_orden || `AP-${ap.id_apertura}`,
          clientAndReference,
          responsible: ap.id_registro?.comercial_nombre || "Sin Asignar",
          raw: ap,
          isApertura: true,
          cotizacion_id: ap.cotizacion_id || ap.id_registro?.id_registro || ap.id_registro
        });
      }
    });

    // Recordatorios de Seguimiento Comercial
    alertas.forEach(alert => {
      if (alert.alerta_fecha) {
        const dateObj = new Date(alert.alerta_fecha);
        const isOportunidad = alert.id_estado === 11 || alert.estado_nombre === "Oportunidad";
        const recordType = isOportunidad ? "OPORTUNIDAD" : "COTIZACIÓN";

        const parts = [];
        if (alert.cliente_nombre && alert.cliente_nombre !== "-") parts.push(alert.cliente_nombre);
        if (alert.cotizacion_referencia && alert.cotizacion_referencia !== "-") parts.push(alert.cotizacion_referencia);
        const clientAndRef = parts.join(" - ") || "Sin Detalles";
        const clientAndReference = `${clientAndRef} [SEGUIMIENTO: ${alert.mensaje}]`;

        list.push({
          id: `alert-${alert.id_mensaje}`,
          type: "seguimiento",
          recordType,
          date: dateObj,
          dateStr: dateObj.toDateString(),
          time: dateObj.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
          title: "Recordatorio de Agenda",
          code: alert.cotizacion_codigo || `REG-${alert.id_registro}`,
          clientAndReference,
          responsible: alert.comercial_nombre || "Sin Asignar",
          raw: alert,
          isSeguimiento: true,
          cotizacion_id: alert.id_registro,
          isOportunidad
        });
      }
    });

    return list;
  }, [cotizaciones, aperturas, alertas]);

  // Agrupa eventos por su fecha string para colocar puntitos indicadores en el mini calendario
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(e => {
      if (!map[e.dateStr]) map[e.dateStr] = [];
      map[e.dateStr].push(e);
    });
    return map;
  }, [events]);

  // Eventos específicos del día seleccionado
  const activeEvents = useMemo(() => {
    return eventsByDate[selectedDateStr] || [];
  }, [selectedDateStr, eventsByDate]);

  const handlePrevDays = () => setSelectedOffset(prev => prev - 5);
  const handleNextDays = () => setSelectedOffset(prev => prev + 5);

  const selectedDateObject = new Date(selectedDateStr);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5 font-sans w-full">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 p-1.5 rounded-xl text-indigo-600">
            <Calendar size={15} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Agenda y Calendario de Operaciones
            </h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              Visitas técnicas, plazos de entrega y seguimientos del periodo
            </p>
          </div>
        </div>

        {/* Mes y Controles de navegación */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/50">
            {selectedDateObject.toLocaleString("es-ES", { month: "long", year: "numeric" }).toUpperCase()}
          </span>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
            <button 
              onClick={handlePrevDays} 
              className="p-1 hover:bg-white hover:text-slate-800 rounded text-slate-500 transition-all"
              title="Días anteriores"
            >
              <ChevronLeft size={13} />
            </button>
            <button 
              onClick={handleNextDays} 
              className="p-1 hover:bg-white hover:text-slate-800 rounded text-slate-500 transition-all"
              title="Días siguientes"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* MINI CALENDARIO INTERACTIVO (SLIDER DE DÍAS) */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 py-1">
        {days.map((day, idx) => {
          const dStr = day.toDateString();
          const isSelected = dStr === selectedDateStr;
          const isToday = dStr === new Date().toDateString();
          const dayEvents = eventsByDate[dStr] || [];
          
          const hasVisitas = dayEvents.some(e => e.type === "visita");
          const hasDeadlines = dayEvents.some(e => e.type === "deadline");
          const hasSuministros = dayEvents.some(e => e.type === "suministros");
          const hasServicios = dayEvents.some(e => e.type === "servicios");
          const hasValidez = dayEvents.some(e => e.type === "validez");
          const hasEntregaReal = dayEvents.some(e => e.type === "entrega_real");
          const hasSeguimiento = dayEvents.some(e => e.type === "seguimiento");

          return (
            <button
              key={idx}
              onClick={() => setSelectedDateStr(dStr)}
              className={`p-2 rounded-2xl border flex flex-col items-center justify-between min-h-[60px] transition-all relative ${
                isSelected 
                  ? "bg-slate-900 border-slate-900 text-white shadow-sm scale-105"
                  : isToday
                  ? "bg-indigo-50/50 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  : "bg-slate-50/40 border-slate-200/60 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="text-[8px] font-black uppercase tracking-wider opacity-60">
                {day.toLocaleString("es-ES", { weekday: "short" })}
              </span>
              <span className="text-sm font-extrabold leading-none my-1">
                {day.getDate()}
              </span>

              {/* PUNTITOS INDICADORES DE EVENTOS */}
              <div className="flex gap-1 justify-center items-center h-1.5 w-full flex-wrap">
                {hasVisitas && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-cyan-400" : "bg-cyan-500"}`} />
                )}
                {hasDeadlines && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-rose-400" : "bg-rose-500"}`} />
                )}
                {hasSuministros && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-emerald-400" : "bg-emerald-500"}`} />
                )}
                {hasServicios && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-blue-400" : "bg-blue-500"}`} />
                )}
                {hasValidez && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-amber-400" : "bg-amber-500"}`} />
                )}
                {hasEntregaReal && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-violet-400" : "bg-violet-500"}`} />
                )}
                {hasSeguimiento && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-indigo-400" : "bg-indigo-500"}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* LISTADO DE EVENTOS DEL DÍA SELECCIONADO */}
      <div className="space-y-2 mt-2">
        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
          Eventos para el {selectedDateObject.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
        </h4>

        <div className="flex flex-col gap-2.5">
          <AnimatePresence mode="popLayout">
            {activeEvents.map((evt) => {
              const getTheme = (type) => {
                switch(type) {
                  case "visita":
                    return { bg: "bg-cyan-50/50 border-cyan-100/70 text-cyan-800", bullet: "bg-cyan-500" };
                  case "deadline":
                    return { bg: "bg-rose-50/30 border-rose-100/50 text-rose-800", bullet: "bg-rose-500" };
                  case "suministros":
                    return { bg: "bg-emerald-50/50 border-emerald-100/70 text-emerald-800", bullet: "bg-emerald-500" };
                  case "servicios":
                    return { bg: "bg-blue-50/50 border-blue-100/70 text-blue-800", bullet: "bg-blue-500" };
                  case "validez":
                    return { bg: "bg-amber-50/50 border-amber-100/70 text-amber-800", bullet: "bg-amber-500" };
                  case "entrega_real":
                    return { bg: "bg-violet-50/50 border-violet-100/70 text-violet-800", bullet: "bg-violet-500" };
                  case "seguimiento":
                    return { bg: "bg-indigo-50/50 border-indigo-100/70 text-indigo-800", bullet: "bg-indigo-500" };
                  default:
                    return { bg: "bg-slate-50/50 border-slate-100/70 text-slate-800", bullet: "bg-slate-500" };
                }
              };
              const theme = getTheme(evt.type);

              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className={`p-3.5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-left transition-all hover:shadow-sm ${theme.bg}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Indicador de Hora / Estado */}
                    <div className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center shrink-0 min-w-[50px]">
                      <Clock size={11} className="text-slate-400 mb-0.5" />
                      <span className="text-[9px] font-extrabold text-slate-700 tracking-tighter">
                        {evt.time}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Tipo de Registro Badge */}
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                          evt.recordType === "OPORTUNIDAD" ? "bg-cyan-100 text-cyan-800 border border-cyan-200" :
                          evt.recordType === "APERTURA" ? "bg-violet-100 text-violet-800 border border-violet-200" :
                          "bg-indigo-100 text-indigo-800 border border-indigo-200"
                        }`}>
                          {evt.recordType}
                        </span>

                        <span className={`w-1.5 h-1.5 rounded-full ${theme.bullet}`} />
                        
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-80">
                          {evt.title}
                        </span>
                        
                        <span className="text-[9px] font-mono bg-white px-2 py-0.5 rounded border border-slate-100/80 font-black text-slate-600">
                          {evt.code}
                        </span>
                      </div>

                      {/* Second Line: Cliente - Referencia */}
                      <p className="text-[10px] font-black uppercase tracking-tight text-slate-800">
                        {evt.clientAndReference}
                      </p>

                      {/* Third Line: Responsable */}
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                        <User size={10} />
                        <span className="uppercase">{evt.responsible}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botón de Acción */}
                  <button
                    onClick={() => {
                      if (evt.isApertura) {
                        navigate(`/comercial/aperturas/${evt.cotizacion_id || evt.raw.id_registro}`);
                      } else if (evt.isSeguimiento) {
                        const path = evt.isOportunidad ? "oportunidades" : "cotizaciones";
                        navigate(`/comercial/${path}/${evt.cotizacion_id}`);
                      } else {
                        const isOportunidad = evt.raw.estado_nombre === "Oportunidad" || evt.raw.id_estado === 11;
                        const path = isOportunidad ? "oportunidades" : "cotizaciones";
                        navigate(`/comercial/${path}/${evt.raw.num_reg || evt.raw.id_registro}`);
                      }
                    }}
                    className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-[9px] font-black uppercase tracking-wider rounded-xl shadow-sm text-indigo-600 transition-colors self-end md:self-center"
                  >
                    Ver Detalle
                    <ArrowRight size={10} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {activeEvents.length === 0 && (
            <div className="p-5 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-50/20">
              <ClipboardList size={16} className="text-slate-300 mb-1" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Sin actividades programadas para este día
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

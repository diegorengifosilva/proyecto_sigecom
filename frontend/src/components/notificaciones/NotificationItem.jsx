import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import { FileText, Package, AlertCircle, Info, Calendar } from "lucide-react";

export default function NotificationItem({ notif, refresh, setOpen }) {
  const navigate = useNavigate();

  const getColor = () => {
    if (notif.leido) return "bg-white border-l-4 border-slate-200 hover:bg-slate-50";
    
    switch (notif.tipo) {
      case "urgente":
        return "border-l-4 border-red-500 bg-red-50/40 hover:bg-red-50/80";
      case "atencion":
        return "border-l-4 border-amber-500 bg-amber-50/40 hover:bg-amber-50/80";
      default:
        return "border-l-4 border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60";
    }
  };

  const getIcon = () => {
    switch (notif.tipo) {
      case "urgente":
        return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
      case "atencion":
        return <Calendar className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-indigo-500 shrink-0" />;
    }
  };

  const handleClick = async () => {
    // 1. Marcar como leído si no lo está
    if (!notif.leido) {
      try {
        await api.post(`/notificaciones/${notif.id_notificacion}/marcar/`);
        refresh();
      } catch (error) {
        console.error("Error marcando como leída", error);
      }
    }

    // 2. Cerrar dropdown
    setOpen(false);

    // 3. Redirigir según el módulo y metadatos
    const meta = notif.metadata || {};
    if (notif.modulo === "comercial") {
      if (meta.id_registro) {
        if (meta.tipo_alerta === "limite_oportunidad") {
          navigate(`/sigecom/comercial/oportunidades/${meta.id_registro}`);
        } else {
          navigate(`/sigecom/comercial/cotizaciones/${meta.id_registro}`);
        }
      } else {
        navigate("/sigecom/comercial/cotizaciones");
      }
    } else if (notif.modulo === "logistica") {
      if (meta.tipo_alerta === "nuevo_movimiento" && meta.num_reg) {
        const route_type = meta.operacion === "E" ? "entradas" : "salidas";
        navigate(`/sigecom/logistica/${route_type}/${meta.num_reg}`);
      } else if (meta.tipo_alerta === "stock_critico") {
        navigate("/sigecom/logistica/tablas");
      } else {
        navigate("/sigecom/logistica/entradas");
      }
    }
  };

  const formatFecha = (fecStr) => {
    try {
      const d = new Date(fecStr);
      return d.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`px-4 py-3.5 cursor-pointer border-b border-slate-50 transition-all duration-200 flex gap-3 items-start ${getColor()}`}
    >
      <div className="mt-0.5">{getIcon()}</div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h4 className={`text-xs font-bold text-slate-800 leading-snug truncate ${notif.leido ? "font-semibold text-slate-500" : ""}`}>
            {notif.titulo}
          </h4>
          <span className="text-[9px] font-bold text-slate-400 shrink-0">
            {formatFecha(notif.fecha)}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-normal mt-1">
          {notif.descripcion}
        </p>

        <div className="flex items-center gap-1.5 mt-2">
          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
            notif.modulo === "comercial" 
              ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
          }`}>
            {notif.modulo}
          </span>
          {notif.cantidad > 0 && (
            <span className="text-[8px] font-bold text-slate-400">
              • {notif.cantidad} registros
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

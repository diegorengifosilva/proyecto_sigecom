import { Bell, CheckCheck, X } from "lucide-react";
import NotificationItem from "./NotificationItem";
import api from "../../services/api";
import { useState } from "react";

export default function NotificationDropdown({ notificaciones = [], loading, refresh, setOpen }) {
  const [filterUnread, setFilterUnread] = useState(false);

  const marcarTodasLeidas = async () => {
    try {
      await api.post("/notificaciones/marcar-todas/");
      refresh();
    } catch (error) {
      console.error("Error marcando todas como leídas", error);
    }
  };

  const filteredNotif = filterUnread ? notificaciones.filter(n => !n.leido) : notificaciones;
  const unreadCount = notificaciones.filter(n => !n.leido).length;

  return (
    <div className="absolute right-0 mt-3 w-[420px] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.12)] rounded-3xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header Superior */}
      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            Notificaciones
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] rounded-full font-black">
                {unreadCount}
              </span>
            )}
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Alertas y Sugerencias</p>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={marcarTodasLeidas}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
              title="Marcar todas como leídas"
            >
              <CheckCheck size={16} />
            </button>
          )}
          <button 
            onClick={() => setOpen(false)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-all"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-white">
        <button 
          onClick={() => setFilterUnread(false)}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all ${
            !filterUnread 
              ? "bg-slate-900 text-white" 
              : "bg-slate-50 text-slate-400 hover:text-slate-600"
          }`}
        >
          Todas
        </button>
        <button 
          onClick={() => setFilterUnread(true)}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all flex items-center gap-1 ${
            filterUnread 
              ? "bg-slate-900 text-white" 
              : "bg-slate-50 text-slate-400 hover:text-slate-600"
          }`}
        >
          No leídas
          {unreadCount > 0 && (
            <span className={`w-1.5 h-1.5 rounded-full ${filterUnread ? "bg-white" : "bg-indigo-600"}`} />
          )}
        </button>
      </div>

      {/* Body con Scroll Personalizado */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
        {loading && notificaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest animate-pulse">Sincronizando alertas...</p>
          </div>
        ) : filteredNotif.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
               <Bell className="text-slate-300" size={24} />
            </div>
            <p className="text-xs font-bold text-slate-700">Sin notificaciones</p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Todo está al día</p>
          </div>
        ) : (
          filteredNotif.map((notif) => (
            <NotificationItem
              key={notif.id_notificacion}
              notif={notif}
              refresh={refresh}
              setOpen={setOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}
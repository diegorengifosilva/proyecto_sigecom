import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";
import api from "../../services/api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef();

  const notifyNewAlerts = (list) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
    
    if (Notification.permission !== "granted") return;

    const notifiedStr = localStorage.getItem("notified_alerts") || "[]";
    let notifiedIds = [];
    try {
      notifiedIds = JSON.parse(notifiedStr);
    } catch (e) {
      notifiedIds = [];
    }

    const newNotifiedIds = [...notifiedIds];
    let triggered = false;

    list.forEach((notif) => {
      if (!notif.leido && !notifiedIds.includes(notif.id_notificacion)) {
        newNotifiedIds.push(notif.id_notificacion);
        triggered = true;
        
        new Notification(notif.titulo, {
          body: notif.descripcion,
        });
      }
    });

    if (triggered) {
      localStorage.setItem("notified_alerts", JSON.stringify(newNotifiedIds.slice(-100)));
    }
  };

  const fetchNotificaciones = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notificaciones/");
      setNotificaciones(res.data);
      notifyNewAlerts(res.data);
    } catch (error) {
      console.error("Error cargando notificaciones", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificaciones();
    
    // Solicitar permiso de notificaciones nativas al cargar
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Intervalo de auto-actualización cada 2 minutos
    const interval = setInterval(() => {
      fetchNotificaciones();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  // cerrar al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const noLeidas = notificaciones.filter(n => !n.leido).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-md transition"
      >
        <Bell size={18} />

        {noLeidas > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold animate-bounce">
            {noLeidas}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notificaciones={notificaciones}
          loading={loading}
          refresh={fetchNotificaciones}
          setOpen={setOpen}
        />
      )}
    </div>
  );
}
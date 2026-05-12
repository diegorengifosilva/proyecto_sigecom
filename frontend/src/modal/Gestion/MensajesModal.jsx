import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronsRight, Trash2, Calendar, User, SendHorizonal } from "lucide-react";

import axios from "axios";

export default function MensajesModal({ open, onClose, num_reg, onActualizarData }) {
  const [mensaje, setMensaje] = useState("");
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usuario, setUsuario] = useState(null);

  // ================
  // Cargar Usuario
  // ================
  const cargarUsuario = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get("/api/users/usuario-actual/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsuario(res.data.usuario);
    } catch (err) {
      console.error("Error cargando usuario actual", err);
      setUsuario("desconocido");
    }
  };

  // ========================
  // Cargar mensajes desde DB
  // ========================
  const cargarMensajes = async () => {
    if (!num_reg) return;

    try {
      setLoading(true);

      const token = localStorage.getItem("access_token");
      const res = await axios.get(`/api/cotizacion/${num_reg}/mensajes/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Mapear los datos para usar en el modal
      const mapped = res.data.map((m) => ({
        id: m.dat + m.cod, // clave única temporal
        dat: new Date(m.dat).toLocaleString(),
        msj: m.msj,
        cod: m.cod,
      }));

      setRegistros(mapped);
    } catch (err) {
      console.error("Error cargando mensajes:", err);
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // Agregar Mensaje
  // ========================
  const handleAgregar = () => {
    if (!mensaje.trim()) return;

    const nuevoMensaje = {
      id: Date.now(),
      dat: new Date().toLocaleString("sv-SE"),
      msj: mensaje,
      cod: usuario,
      act: "1",
      nuevo: true, // 🔑 clave
    };

    setRegistros(prev => [nuevoMensaje, ...prev]);
    setMensaje("");
  };

  // ==========
  // Guardar
  // ==========
  const handleGuardar = async () => {
    if (!num_reg) return;

    const nuevos = registros.filter(r => r.nuevo);
    if (nuevos.length === 0) {
      onClose();
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      const token = localStorage.getItem("access_token");

      for (const m of nuevos) {
        const payload = {
          num_reg,
          mensaje: {
            msj: m.msj,
            act: m.act,
          },
        };

        await axios.post(
          `${import.meta.env.VITE_API_URL}/cotizaciones/guardar/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      cargarMensajes();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error guardando mensajes");
    } finally {
      setSaving(false);
    }
  };

  // ========================
  // Eliminar mensaje
  // ========================
  const handleEliminar = async (id) => {
    try {
      setLoading(true);
      // Endpoint de eliminación, ajusta según tu backend
      await axios.delete(`/api/cotizaciones/${num_reg}/mensajes/${id}/`);
      setRegistros((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Error eliminando mensaje", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setMensaje("");
      cargarMensajes();
      cargarUsuario();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">

        {/* HEADER IDENTICO AL SISTEMA GESTIÓN */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <MessageSquare size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Mensajes de Cotización
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Historial interno de comentarios y observaciones
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-2 space-y-2">

          {/* INPUT + ACCIÓN EN PANEL PROTEGIDO */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Escriba un mensaje interno..."
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAgregar();
                    }
                  }}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white shadow-sm"
                />
              </div>

              <button
                onClick={handleAgregar}
                disabled={!mensaje.trim() || loading}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white transition-all shadow-md shadow-indigo-200 disabled:shadow-none shrink-0"
              >
                <SendHorizonal size={18} />
              </button>
            </div>
          </div>

          {/* TABLA DE MENSAJES */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm overflow-y-auto max-h-[350px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32 text-center">Fecha</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Mensaje / Observación</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 text-center">Usuario</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-400 font-medium text-[11px] uppercase tracking-tighter">
                      No hay mensajes registrados en este historial
                    </td>
                  </tr>
                ) : (
                  registros.map((r) => (
                    <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400">
                          <Calendar size={12} className="text-slate-300" />
                          {r.dat}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-700 leading-relaxed italic group-hover:not-italic group-hover:text-indigo-900 transition-all">
                          "{r.msj}"
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-tight">
                          <User size={10} />
                          {r.cod}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleEliminar(r.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER PREMIUM */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[11px] font-black uppercase tracking-widest text-red-700 hover:bg-red-100 border border-transparent hover:border-red-200 rounded-xl h-9 px-8 transition-all"
          >
            Cerrar
          </Button>

          <Button
            onClick={handleGuardar}
            disabled={saving}
            variant="ghost"
            className="text-[11px] font-black uppercase tracking-widest text-indigo-700 hover:bg-indigo-100 border border-transparent hover:border-indigo-200 rounded-xl h-9 px-8 transition-all"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </div>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

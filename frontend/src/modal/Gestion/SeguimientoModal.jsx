// src/dashboard/cotizaciones/SeguimientoModal.jsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LineChart, SendHorizonal, Trash2, Calendar, User, CheckCircle2 } from "lucide-react";

import axios from "axios";

export default function SeguimientoModal({ open, onClose, num_reg }) {
  const [mensaje, setMensaje] = useState("");
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usuario, setUsuario] = useState(null);

  // =======================
  // Cargar usuario actual
  // =======================
  const cargarUsuario = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get("/api/users/usuario-actual/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuario(res.data.usuario);
    } catch (err) {
      console.error("Error cargando usuario actual", err);
      setUsuario("desconocido");
    }
  };

  // =======================
  // Cargar seguimientos
  // =======================
  const cargarSeguimientos = async () => {
    if (!num_reg) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`/api/cotizacion/seguimientos/${num_reg}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Mapear para usar en la tabla
      const mapped = res.data.map((s) => ({
        id: s.dat + s.cod, // clave única temporal
        dat: new Date(s.dat).toLocaleString(),
        des: s.des,
        cod: s.cod,
        nuevo: false,
      }));

      setRegistros(mapped);
    } catch (err) {
      console.error("Error cargando seguimientos:", err);
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // Agregar seguimiento
  // =======================
  const handleAgregar = () => {
    if (!mensaje.trim() || !usuario) return;

    const nuevo = {
      id: Date.now(),
      dat: new Date().toLocaleString("sv-SE"),
      des: mensaje,
      cod: usuario,
      act: "1",
      nuevo: true, // clave para guardar
    };

    setRegistros((prev) => [nuevo, ...prev]);
    setMensaje("");
  };

  // =========
  // GUARDAR
  // =========
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
      const token = localStorage.getItem("access_token"); // 🔑 AQUÍ ESTABA EL FALTANTE

      if (!token) {
        alert("Sesión expirada. Vuelve a iniciar sesión.");
        return;
      }

      await Promise.all(
        nuevos.map(s =>
          axios.post(
            "/api/cotizaciones/guardar/",
            {
              num_reg,
              seguimiento: {
                des: s.des,
                act: s.act ?? "1",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );

      await cargarSeguimientos();
      onClose();

    } catch (err) {
      console.error("Error guardando seguimientos", err);
      alert("Error guardando seguimientos");
    } finally {
      setSaving(false);
    }
  };

  // =======================
  // ELIMINAR SEGUIMIENTO
  // =======================
  const handleEliminar = (id) => {
    setRegistros(prev =>
      prev.filter(r => r.id !== id)
    );
  };

  useEffect(() => {
    if (open) {
      setMensaje("");
      cargarSeguimientos();
      cargarUsuario();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">

        {/* HEADER IDENTICO AL SISTEMA GESTIÓN (Color Purple) */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <LineChart size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Seguimiento Comercial
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Log de actividades y contacto con el cliente
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
                  placeholder="Registrar nueva gestión (Ej: Se llamó al cliente, envió correo...)"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAgregar();
                    }
                  }}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white shadow-sm"
                />
              </div>

              <button
                onClick={handleAgregar}
                disabled={!mensaje.trim() || loading}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 text-white transition-all shadow-md shadow-purple-200 disabled:shadow-none shrink-0"
              >
                <SendHorizonal size={18} />
              </button>
            </div>
          </div>

          {/* TABLA DE SEGUIMIENTOS */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm overflow-y-auto max-h-[350px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32 text-center">Fecha</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalle de Gestión</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 text-center">Ejecutivo</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-400 font-medium text-[11px] uppercase tracking-tighter">
                      No hay actividades de seguimiento registradas
                    </td>
                  </tr>
                ) : (
                  registros.map((r) => (
                    <tr key={r.id} className="hover:bg-purple-50/30 transition-colors group">
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400">
                          <Calendar size={12} className="text-slate-300" />
                          {r.dat}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 size={12} className="mt-0.5 text-purple-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <p className="text-xs font-bold text-slate-700 leading-relaxed group-hover:text-purple-900 transition-all">
                            {r.des}
                          </p>
                        </div>
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
            Cancelar
          </Button>

          <Button
            onClick={handleGuardar}
            disabled={saving}
            variant="ghost"
            className="text-[11px] font-black uppercase tracking-widest text-purple-700 hover:bg-purple-100 border border-transparent hover:border-purple-200 rounded-xl h-9 px-8 transition-all"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </div>
            ) : (
              "Confirmar Seguimiento"
            )}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

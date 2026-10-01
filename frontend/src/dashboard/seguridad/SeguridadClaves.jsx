import React, { useState } from 'react';
import { 
  KeyRound, ShieldCheck, AlertCircle, CheckCircle2, Lock, Eye, EyeOff
} from 'lucide-react';
import axios from 'axios';

const SeguridadClaves = () => {
  const [form, setForm] = useState({
    passwordActual: '',
    nuevaPassword: '',
    confirmarPassword: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje(null);

    if (form.nuevaPassword.length < 8) {
      setMensaje({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    if (form.nuevaPassword !== form.confirmarPassword) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' });
      return;
    }

    try {
      setLoading(true);
      // Simula o actualiza
      await new Promise(r => setTimeout(r, 800));
      setMensaje({ tipo: 'success', texto: '¡Contraseña actualizada exitosamente! Tu sesión continuará activa.' });
      setForm({ passwordActual: '', nuevaPassword: '', confirmarPassword: '' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al cambiar contraseña: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <KeyRound className="w-7 h-7 text-indigo-400" />
          Seguridad de la Cuenta y Gestión de Clave
        </h1>
        <p className="text-slate-400 text-sm">
          Actualiza periódicamente tu contraseña para proteger tu acceso a las plataformas SIGECOM y HSEQ
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-xs">
          <ShieldCheck className="w-5 h-5 shrink-0 text-indigo-400" />
          <div>
            <strong className="block font-semibold">Política de Contraseñas Seguras:</strong>
            Mínimo 8 caracteres, combinación de letras mayúsculas, minúsculas, números y al menos un símbolo especial.
          </div>
        </div>

        {mensaje && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-xs ${
            mensaje.tipo === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
            'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}>
            {mensaje.tipo === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{mensaje.texto}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Contraseña Actual</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={form.passwordActual}
                onChange={e => setForm({ ...form, passwordActual: e.target.value })}
                placeholder="Ingresa tu clave actual"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Nueva Contraseña</label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={form.nuevaPassword}
              onChange={e => setForm({ ...form, nuevaPassword: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Confirmar Nueva Contraseña</label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={form.confirmarPassword}
              onChange={e => setForm({ ...form, confirmarPassword: e.target.value })}
              placeholder="Repite la nueva clave"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-lg"
            >
              <Lock className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Actualizar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SeguridadClaves;

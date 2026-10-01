import React, { useState, useEffect } from 'react';
import { 
  Users, ArrowRightLeft, CheckCircle2, UserCheck, 
  UserMinus, Search, RefreshCw, Send, Shield
} from 'lucide-react';
import axios from 'axios';

const IntegracionPersonas = () => {
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModalAlta, setShowModalAlta] = useState(false);
  const [showModalBaja, setShowModalBaja] = useState(false);
  const [search, setSearch] = useState('');

  const [formAlta, setFormAlta] = useState({
    dni: '',
    fullName: '',
    email: '',
    phone: '',
    roleTitle: 'Supervisor de Seguridad',
    areaName: 'Operaciones',
    hireDate: new Date().toISOString().split('T')[0]
  });

  const [formBaja, setFormBaja] = useState({
    dni: '',
    terminationDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/human-resources/employees/');
      setColaboradores(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAlta = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/hr-sync/employees', {
        employees: [formAlta]
      });
      alert(`¡Colaborador ${formAlta.fullName} sincronizado con éxito desde ERP!`);
      setShowModalAlta(false);
      fetchData();
    } catch (err) {
      alert('Error en sincronización de empleado: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleBaja = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/hr-sync/employees/deactivate', formBaja);
      alert(`Colaborador con DNI ${formBaja.dni} desactivado en el SIG.`);
      setShowModalBaja(false);
      fetchData();
    } catch (err) {
      alert('Error en desactivación: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filtrados = colaboradores.filter(c => 
    !search || 
    c.fullName?.toLowerCase().includes(search.toLowerCase()) || 
    c.dni?.includes(search) || 
    c.area?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-400" />
            Integración de Personal Comercial/ERP → RR. HH. & HSEQ
          </h1>
          <p className="text-slate-400 text-sm">
            Enlace unificado de nómina por DNI sin compartir ni transferir contraseñas comerciales
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModalBaja(true)}
            className="flex items-center gap-2 px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-lg text-sm font-semibold transition border border-rose-800/40"
          >
            <UserMinus className="w-4 h-4" /> Notificar Cese / Desactivación
          </button>
          <button
            onClick={() => setShowModalAlta(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition shadow-lg"
          >
            <ArrowRightLeft className="w-4 h-4" /> Sincronizar Colaborador
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{colaboradores.length}</div>
            <div className="text-xs text-slate-400">Padrón Enlazado en SIG</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-lg">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {colaboradores.filter(c => c.status === 'ACTIVE').length}
            </div>
            <div className="text-xs text-slate-400">Colaboradores Activos</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">DNI Hash</div>
            <div className="text-xs text-slate-400">Identificador Seguro Primario</div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por colaborador, DNI o área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Tabla de Colaboradores */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">DNI / Clave Enlace</th>
                <th className="py-3 px-4">Nombres y Apellidos</th>
                <th className="py-3 px-4">Área / Cargo</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Fecha Ingreso</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Cargando colaboradores sincronizados...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No se encontraron colaboradores
                  </td>
                </tr>
              ) : (
                filtrados.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono text-xs text-emerald-400 font-bold">
                      {c.dni}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {c.fullName}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="text-white">{c.area || 'General'}</div>
                      <div className="text-slate-400 text-[11px]">{c.cargo || 'Operativo'}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      <div>{c.email || '—'}</div>
                      <div className="text-[11px]">{c.phone || '—'}</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-400">
                      {c.hireDate || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {c.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Sincronizar Alta */}
      {showModalAlta && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-400" /> Sincronizar Colaborador (ERP → SIG)
            </h2>
            <form onSubmit={handleAlta} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">DNI (Identificador Único)</label>
                  <input
                    type="text"
                    required
                    value={formAlta.dni}
                    onChange={e => setFormAlta({ ...formAlta, dni: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Fecha de Ingreso</label>
                  <input
                    type="date"
                    required
                    value={formAlta.hireDate}
                    onChange={e => setFormAlta({ ...formAlta, hireDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Nombres y Apellidos Completos</label>
                <input
                  type="text"
                  required
                  value={formAlta.fullName}
                  onChange={e => setFormAlta({ ...formAlta, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Área Organizacional</label>
                  <input
                    type="text"
                    required
                    value={formAlta.areaName}
                    onChange={e => setFormAlta({ ...formAlta, areaName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Cargo / Puesto de Trabajo</label>
                  <input
                    type="text"
                    required
                    value={formAlta.roleTitle}
                    onChange={e => setFormAlta({ ...formAlta, roleTitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Email Corporativo</label>
                  <input
                    type="email"
                    value={formAlta.email}
                    onChange={e => setFormAlta({ ...formAlta, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Teléfono / Celular</label>
                  <input
                    type="text"
                    value={formAlta.phone}
                    onChange={e => setFormAlta({ ...formAlta, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalAlta(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-sm hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-semibold hover:bg-emerald-500"
                >
                  Sincronizar Alta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Desactivar Cese */}
      {showModalBaja && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-rose-400" /> Sincronizar Cese de Colaborador
            </h2>
            <form onSubmit={handleBaja} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">DNI del Colaborador Cesado</label>
                <input
                  type="text"
                  required
                  value={formBaja.dni}
                  onChange={e => setFormBaja({ ...formBaja, dni: e.target.value })}
                  placeholder="8 dígitos"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Fecha Efectiva de Cese</label>
                <input
                  type="date"
                  required
                  value={formBaja.terminationDate}
                  onChange={e => setFormBaja({ ...formBaja, terminationDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalBaja(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-500"
                >
                  Confirmar Desactivación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegracionPersonas;

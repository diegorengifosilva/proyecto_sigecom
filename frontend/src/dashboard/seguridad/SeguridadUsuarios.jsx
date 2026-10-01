import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Key, CheckCircle2, XCircle, 
  Search, Lock, RefreshCw, Eye, Edit2, ShieldAlert, Layers
} from 'lucide-react';
import axios from 'axios';

const MODULOS_SISTEMA = [
  { id: 'MOD_HSEQ', code: 'HSEQ_TRAINING', label: 'Capacitaciones & HSEQ' },
  { id: 'MOD_PROY', code: 'PROJECT_MANAGEMENT', label: 'Gestión de Proyectos' },
  { id: 'MOD_RRHH', code: 'HUMAN_RESOURCES', label: 'Recursos Humanos' },
  { id: 'MOD_EME', code: 'EMERGENCY_MANAGEMENT', label: 'Emergencias & Brigadas' },
  { id: 'MOD_SALUD', code: 'OCCUPATIONAL_HEALTH', label: 'Salud Ocupacional (EMO)' }
];

const SeguridadUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroRol, setFiltroRol] = useState('ALL');
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'USER',
    employeeId: '',
    modules: [
      { moduleId: 'MOD_HSEQ', level: 'USER' },
      { moduleId: 'MOD_PROY', level: 'USER' },
      { moduleId: 'MOD_RRHH', level: 'USER' },
      { moduleId: 'MOD_EME', level: 'USER' },
      { moduleId: 'MOD_SALUD', level: 'USER' }
    ]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, colabsRes] = await Promise.all([
        axios.get('/api/v1/security/users/'),
        axios.get('/api/v1/security/available-employees/').catch(() => ({ data: [] }))
      ]);
      setUsuarios(usersRes.data || []);
      setColaboradores(colabsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/security/users/', form);
      setShowModalCrear(false);
      setForm({
        username: '',
        password: '',
        role: 'USER',
        employeeId: '',
        modules: MODULOS_SISTEMA.map(m => ({ moduleId: m.id, level: 'USER' }))
      });
      fetchData();
    } catch (err) {
      alert('Error creando usuario: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleEstado = async (u) => {
    try {
      await axios.patch(`/api/v1/security/users/${u.id}/`, {
        isActive: !u.isActive
      });
      fetchData();
    } catch (err) {
      alert('Error actualizando estado: ' + err.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      await axios.patch(`/api/v1/security/users/${selectedUser.id}/`, {
        password: newPassword,
        mustChangePassword: true
      });
      alert(`Contraseña reseteada para ${selectedUser.username}. Deberá cambiarla al iniciar sesión.`);
      setShowModalPassword(false);
      setNewPassword('');
      fetchData();
    } catch (err) {
      alert('Error reseteando contraseña: ' + err.message);
    }
  };

  const filtrados = usuarios.filter(u => {
    const matchRol = filtroRol === 'ALL' || u.role === filtroRol;
    const matchSearch = !search || 
      u.username?.toLowerCase().includes(search.toLowerCase()) || 
      u.employeeName?.toLowerCase().includes(search.toLowerCase());
    return matchRol && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-400" />
            Administración Central de Usuarios y Permisos RBAC
          </h1>
          <p className="text-slate-400 text-sm">
            Control de cuentas institucionales, roles y niveles de acceso granular por módulo del SIG
          </p>
        </div>
        <button
          onClick={() => setShowModalCrear(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
        >
          <UserPlus className="w-4 h-4" /> Crear Nuevo Usuario
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{usuarios.length}</div>
            <div className="text-xs text-slate-400">Total Usuarios Registrados</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {usuarios.filter(u => u.isActive).length}
            </div>
            <div className="text-xs text-slate-400">Cuentas Activas</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 text-purple-400 rounded-lg">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {usuarios.filter(u => u.role === 'ADMIN').length}
            </div>
            <div className="text-xs text-slate-400">Administradores Globales</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {usuarios.filter(u => u.mustChangePassword).length}
            </div>
            <div className="text-xs text-slate-400">Pendientes Primer Cambio Clave</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por username o colaborador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['ALL', 'ADMIN', 'USER'].map(r => (
            <button
              key={r}
              onClick={() => setFiltroRol(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filtroRol === r ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {r === 'ALL' ? 'Todos los Roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Colaborador Vinculado</th>
                <th className="py-3 px-4">Rol Global</th>
                <th className="py-3 px-4">Acceso a Módulos</th>
                <th className="py-3 px-4">Estado Cuenta</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Cargando cuentas de usuario...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filtrados.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        {u.username}
                      </div>
                      {u.mustChangePassword && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                          <Lock className="w-3 h-3" /> Debe cambiar contraseña
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {u.employeeName ? (
                        <div className="text-white font-medium">{u.employeeName}</div>
                      ) : (
                        <span className="text-slate-500 italic">Cuenta de Sistema</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.modulePermissions && u.modulePermissions.length > 0 ? (
                          u.modulePermissions.map((mp, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-950 text-slate-300 rounded border border-slate-800">
                              {mp.moduleCode?.replace('_TRAINING', '') || mp.moduleCode}: {mp.level}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">Acceso Estándar</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleEstado(u)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition ${
                          u.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-rose-500/20 hover:text-rose-300' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-emerald-500/20 hover:text-emerald-300'
                        }`}
                      >
                        {u.isActive ? 'Activo' : 'Bloqueado'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setShowModalPassword(true);
                          }}
                          title="Resetear contraseña"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded transition"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Usuario */}
      {showModalCrear && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" /> Crear Cuenta de Usuario
            </h2>
            <form onSubmit={handleCrear} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Nombre de Usuario (Username)</label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    placeholder="jlopez"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Rol Global</label>
                  <select
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="USER">USER (Estándar)</option>
                    <option value="ADMIN">ADMIN (Administrador)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Contraseña Temporal</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Vincular a Colaborador (Opcional)</label>
                <select
                  value={form.employeeId}
                  onChange={e => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                >
                  <option value="">-- Sin vincular / Cuenta de sistema --</option>
                  {colaboradores.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} (DNI: {c.dni})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="text-xs text-slate-400 mb-1 block">Nivel de Acceso por Módulo</label>
                <div className="bg-slate-950 p-3 rounded-lg space-y-2 border border-slate-800">
                  {MODULOS_SISTEMA.map(m => {
                    const currentMod = form.modules.find(x => x.moduleId === m.id);
                    return (
                      <div key={m.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{m.label}</span>
                        <select
                          value={currentMod?.level || 'USER'}
                          onChange={e => {
                            const updated = form.modules.map(x => 
                              x.moduleId === m.id ? { ...x, level: e.target.value } : x
                            );
                            setForm({ ...form, modules: updated });
                          }}
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
                        >
                          <option value="USER">USER (Operativo)</option>
                          <option value="ADMIN">ADMIN (Total)</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalCrear(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-sm hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-500"
                >
                  Crear Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {showModalPassword && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" /> Resetear Contraseña
            </h2>
            <p className="text-xs text-slate-400">
              Usuario: <strong className="text-white">{selectedUser?.username}</strong>
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <p className="text-[11px] text-amber-400">
                Al resetearla, se marcará obligatoriedad de cambio de contraseña en su próximo inicio de sesión.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalPassword(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-500"
                >
                  Confirmar Reseteo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeguridadUsuarios;

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, ArrowRightLeft, CheckCircle2, AlertCircle, 
  Send, RefreshCw, Search, Building2, DollarSign, Calendar
} from 'lucide-react';
import axios from 'axios';

const IntegracionComercial = () => {
  const [proyectosOrigen, setProyectosOrigen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showModalSync, setShowModalSync] = useState(false);
  const [search, setSearch] = useState('');

  const [formSync, setFormSync] = useState({
    code: 'PRY-2026-AUTOSYNC',
    name: 'Mantenimiento Mayor de Tanques Criogénicos',
    clientName: 'COMPAÑÍA DE GAS DEL PERÚ S.A.',
    clientRuc: '20491238471',
    commercialQuotationId: 'COT-8812',
    commercialOpeningId: 'APE-4410',
    commercialClientId: 'CLI-102',
    purchaseOrderNumber: 'OC-2026-778',
    approvedBudget: 185000,
    currency: 'USD',
    status: 'AWARDED'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/proyectos-ev/catalog/');
      setProyectosOrigen(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDispararSync = async (e) => {
    e.preventDefault();
    try {
      setSyncing(true);
      const res = await axios.post('/api/v1/proyectos-ev/commercial-sync', formSync);
      alert(`¡Sincronización comercial exitosa! Código: ${formSync.code} - Proyecto ID: ${res.data.projectId}`);
      setShowModalSync(false);
      fetchData();
    } catch (err) {
      alert('Error en sincronización comercial: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const filtrados = proyectosOrigen.filter(p => 
    !search || 
    p.codigo?.toLowerCase().includes(search.toLowerCase()) || 
    p.nombre?.toLowerCase().includes(search.toLowerCase()) || 
    p.cliente?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-cyan-400" />
            Integración Comercial → Gestión de Proyectos
          </h1>
          <p className="text-slate-400 text-sm">
            Ingesta automática de cotizaciones adjudicadas (AWARDED) y apertura en proyectos operativos
          </p>
        </div>
        <button
          onClick={() => setShowModalSync(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition shadow-lg"
        >
          <ArrowRightLeft className="w-4 h-4" /> Disparar Sincronización Comercial
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-lg">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{proyectosOrigen.length}</div>
            <div className="text-xs text-slate-400">Proyectos Sincronizados</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">100%</div>
            <div className="text-xs text-slate-400">Trazabilidad Comercial</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">PEN / USD</div>
            <div className="text-xs text-slate-400">Multimoneda Homologada</div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Tabla de Proyectos Sincronizados */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Código Proyecto</th>
                <th className="py-3 px-4">Nombre / Descripción</th>
                <th className="py-3 px-4">Cliente Comercial</th>
                <th className="py-3 px-4">Etapa Operativa</th>
                <th className="py-3 px-4">Presupuesto</th>
                <th className="py-3 px-4">Estado Sincronización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Cargando proyectos integrados...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No se encontraron proyectos sincronizados
                  </td>
                </tr>
              ) : (
                filtrados.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono text-xs text-cyan-400 font-bold">
                      {p.codigo}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {p.nombre}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {p.cliente}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-950 text-cyan-400 border border-cyan-500/20 uppercase font-mono">
                        {p.etapa || 'inicio'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-emerald-400 font-semibold">
                      {p.presupuestoAprobado ? `$ ${Number(p.presupuestoAprobado).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> Enlazado (AWARDED)
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Disparar Sincronización */}
      {showModalSync && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-cyan-400" /> Disparar Evento Comercial (AWARDED → OPENED)
            </h2>
            <form onSubmit={handleDispararSync} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Código de Proyecto</label>
                  <input
                    type="text"
                    required
                    value={formSync.code}
                    onChange={e => setFormSync({ ...formSync, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">N° Orden de Compra</label>
                  <input
                    type="text"
                    value={formSync.purchaseOrderNumber}
                    onChange={e => setFormSync({ ...formSync, purchaseOrderNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Nombre del Proyecto</label>
                <input
                  type="text"
                  required
                  value={formSync.name}
                  onChange={e => setFormSync({ ...formSync, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Razón Social Cliente</label>
                  <input
                    type="text"
                    required
                    value={formSync.clientName}
                    onChange={e => setFormSync({ ...formSync, clientName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">RUC Cliente</label>
                  <input
                    type="text"
                    value={formSync.clientRuc}
                    onChange={e => setFormSync({ ...formSync, clientRuc: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Presupuesto Aprobado</label>
                  <input
                    type="number"
                    value={formSync.approvedBudget}
                    onChange={e => setFormSync({ ...formSync, approvedBudget: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Moneda</label>
                  <select
                    value={formSync.currency}
                    onChange={e => setFormSync({ ...formSync, currency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalSync(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-sm hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="px-4 py-2 bg-cyan-600 text-white rounded text-sm font-semibold hover:bg-cyan-500 disabled:opacity-50"
                >
                  {syncing ? 'Sincronizando...' : 'Enviar Sincronización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegracionComercial;

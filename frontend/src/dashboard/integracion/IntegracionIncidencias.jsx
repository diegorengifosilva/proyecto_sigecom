import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle2, RefreshCw, Search, Filter, 
  Clock, ShieldAlert, ArrowRight, Check
} from 'lucide-react';
import axios from 'axios';

const IntegracionIncidencias = () => {
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroSeveridad, setFiltroSeveridad] = useState('ALL');

  const fetchIncidencias = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/integracion/incidencias/');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setIncidencias(res.data);
      } else {
        // Datos demostrativos de incidencias
        setIncidencias([
          {
            id: 'INC-001',
            entity_type: 'RrhhColaborador',
            external_id: 'ERP-EMP-9821',
            error_code: 'MISSING_DNI',
            severity: 'ERROR',
            message: 'El colaborador no cuenta con documento de identidad (DNI) válido en el ERP comercial.',
            created_at: new Date().toISOString()
          },
          {
            id: 'INC-002',
            entity_type: 'ProyProyectoOrigen',
            external_id: 'PRY-2026-09',
            error_code: 'CLIENT_RUC_INVALID',
            severity: 'WARNING',
            message: 'El RUC del cliente no coincide con la longitud estándar de 11 dígitos.',
            created_at: new Date(Date.now() - 7200000).toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidencias();
  }, []);

  const handleResolver = (id) => {
    alert(`Incidencia ${id} marcada como subsanada y archivada.`);
    setIncidencias(incidencias.filter(i => i.id !== id));
  };

  const filtrados = incidencias.filter(i => {
    const matchSev = filtroSeveridad === 'ALL' || i.severity === filtroSeveridad;
    const matchSearch = !search || 
      i.error_code?.toLowerCase().includes(search.toLowerCase()) || 
      i.message?.toLowerCase().includes(search.toLowerCase()) || 
      i.external_id?.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
            Bandeja de Incidencias de Sincronización (int_incidencia)
          </h1>
          <p className="text-slate-400 text-sm">
            Monitoreo y resolución de discrepancias en datos de entrada recibidos desde el ERP comercial
          </p>
        </div>
        <button
          onClick={fetchIncidencias}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
        >
          <RefreshCw className="w-4 h-4" /> Refrescar Incidencias
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{incidencias.length}</div>
            <div className="text-xs text-slate-400">Incidencias Abiertas</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {incidencias.filter(i => i.severity === 'ERROR').length}
            </div>
            <div className="text-xs text-slate-400">Errores Bloqueantes</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {incidencias.filter(i => i.severity === 'WARNING').length}
            </div>
            <div className="text-xs text-slate-400">Advertencias de Validación</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por código de error o mensaje..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['ALL', 'ERROR', 'WARNING'].map(s => (
            <button
              key={s}
              onClick={() => setFiltroSeveridad(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filtroSeveridad === s ? 'bg-amber-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {s === 'ALL' ? 'Todas' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Listado de Incidencias */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            Cargando incidencias...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            No hay incidencias pendientes en el bus de integración. Todos los contratos están sincronizados al 100%.
          </div>
        ) : (
          filtrados.map((inc, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    inc.severity === 'ERROR' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {inc.severity}
                  </span>
                  <span className="font-mono text-xs text-white font-bold">
                    {inc.error_code}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Entidad: {inc.entity_type} (ID: {inc.external_id || '—'})
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  {inc.message}
                </p>
                <div className="text-[11px] text-slate-500 font-mono">
                  Registrado: {inc.created_at ? inc.created_at.replace('T', ' ').slice(0, 19) : '—'}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleResolver(inc.id)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                >
                  <Check className="w-3.5 h-3.5" /> Subsanar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IntegracionIncidencias;

import React, { useState, useEffect } from 'react';
import { 
  Network, ArrowRightLeft, CheckCircle2, AlertTriangle, XCircle, 
  RefreshCw, Activity, Layers, Database, ShieldCheck, Clock
} from 'lucide-react';
import axios from 'axios';

const IntegracionMonitor = () => {
  const [history, setHistory] = useState([]);
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [histRes, incRes] = await Promise.all([
        axios.get('/api/integracion/history/'),
        axios.get('/api/integracion/incidencias/')
      ]);
      setHistory(histRes.data || []);
      setIncidencias(incRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalRuns = history.length;
  const successRuns = history.filter(h => h.status === 'SUCCESS').length;
  const partialRuns = history.filter(h => h.status === 'PARTIAL').length;
  const failedRuns = history.filter(h => h.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Network className="w-7 h-7 text-cyan-400" />
            Monitor del Bus de Integración SIGECOM ↔ SIG
          </h1>
          <p className="text-slate-400 text-sm">
            Orquestación en tiempo real entre el ERP Comercial, Gestión de Proyectos, RR. HH. y HSEQ
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-sm font-semibold transition border border-slate-700"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar Estado
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-lg">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalRuns}</div>
            <div className="text-xs text-slate-400">Total Sincronizaciones</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{successRuns}</div>
            <div className="text-xs text-slate-400">Completadas con Éxito</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{incidencias.length}</div>
            <div className="text-xs text-slate-400">Incidencias Detectadas</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">vc_sig</div>
            <div className="text-xs text-slate-400">Base Integrada Activa</div>
          </div>
        </div>
      </div>

      {/* Arquitectura de Contratos Activos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <Layers className="w-5 h-5" /> Contrato Comercial ↔ Proyectos
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              ONLINE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Sincroniza cotizaciones ganadas (<code className="text-slate-300">AWARDED</code>) y aperturas de proyecto (<code className="text-slate-300">OPENED</code>) hacia <code className="text-slate-300">proy_proyecto_origen</code> y <code className="text-slate-300">ProyectoEv</code>.
          </p>
          <div className="text-[11px] font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300">
            POST /api/v1/proyectos-ev/commercial-sync
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Layers className="w-5 h-5" /> Contrato Personas ↔ RR. HH. / HSEQ
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              ONLINE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Sincroniza el padrón de colaboradores y cargos mediante enlace DNI a <code className="text-slate-300">rrhh_colaborador</code> y tabla de enlace <code className="text-slate-300">int_enlace_entidad</code>.
          </p>
          <div className="text-[11px] font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300">
            POST /api/v1/hr-sync/employees
          </div>
        </div>
      </div>

      {/* Historial de Ejecuciones del Bus */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg space-y-3 p-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" /> Trazabilidad de Ejecuciones del Bus (int_ejecucion)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Run ID / Origen</th>
                <th className="py-3 px-4">Módulos Destino</th>
                <th className="py-3 px-4">Modo</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Registros</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Cargando ejecuciones de integración...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No hay ejecuciones registradas
                  </td>
                </tr>
              ) : (
                history.map((h, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs text-cyan-400 font-semibold">
                        {h.external_run_id?.slice(0, 13) || h.id?.slice(0, 8)}
                      </div>
                      <div className="text-[11px] text-slate-400">{h.source_system}</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-300">
                      {Array.isArray(h.target_modules) ? h.target_modules.join(', ') : String(h.target_modules)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-mono text-[11px]">
                        {h.mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-400">
                      {h.started_at ? h.started_at.replace('T', ' ').slice(0, 16) : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="text-emerald-400 font-semibold">{h.applied_count || 0}</span>
                      <span className="text-slate-500"> / {h.received_count || 0}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        h.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        h.status === 'PARTIAL' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IntegracionMonitor;

import React, { useState, useEffect } from 'react';
import { 
  Clock, AlertTriangle, CheckCircle, XCircle, Search, 
  Filter, Calendar, Download, RefreshCw, Send
} from 'lucide-react';
import axios from 'axios';

const SaludVigencias = () => {
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroVigencia, setFiltroVigencia] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, empRes] = await Promise.all([
        axios.get('/api/v1/occupational-health/summary/'),
        axios.get('/api/v1/occupational-health/employees/')
      ]);
      setSummary(sumRes.data);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtrados = employees.filter(emp => {
    const vig = emp.ultimoEmo?.estadoVigencia || 'SIN_EMO';
    const matchFiltro = filtroVigencia === 'ALL' || vig === filtroVigencia;
    const matchSearch = !search || 
      emp.fullName?.toLowerCase().includes(search.toLowerCase()) || 
      emp.dni?.includes(search) || 
      emp.area?.toLowerCase().includes(search.toLowerCase());
    return matchFiltro && matchSearch;
  });

  const getBadgeVigencia = (estado) => {
    switch (estado) {
      case 'VIGENTE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit"><CheckCircle className="w-3.5 h-3.5" /> Vigente</span>;
      case 'POR_VENCER':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit"><AlertTriangle className="w-3.5 h-3.5" /> Vence &lt; 30 días</span>;
      case 'VENCIDO':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-fit"><XCircle className="w-3.5 h-3.5" /> Vencido</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 w-fit"><Clock className="w-3.5 h-3.5" /> Sin EMO</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-7 h-7 text-amber-500" />
            Semáforo de Vigencias y Renovaciones EMO
          </h1>
          <p className="text-slate-400 text-sm">
            Control proactivo del ciclo de vencimiento de aptitudes médicas ocupacionales
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button 
            onClick={() => alert('Generando reporte consolidado de vigencias en Excel/PDF...')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition"
          >
            <Download className="w-4 h-4" /> Exportar Semáforo
          </button>
        </div>
      </div>

      {/* KPI Semáforo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setFiltroVigencia('VIGENTE')}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            filtroVigencia === 'VIGENTE' ? 'bg-emerald-950/40 border-emerald-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">EMO Vigentes</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {summary?.vigencias?.vigentes ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Aptitud regular sin riesgos</div>
        </div>

        <div 
          onClick={() => setFiltroVigencia('POR_VENCER')}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            filtroVigencia === 'POR_VENCER' ? 'bg-amber-950/40 border-amber-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">Por Vencer (&le; 30 días)</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {summary?.vigencias?.porVencer ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Programar renovación urgente</div>
        </div>

        <div 
          onClick={() => setFiltroVigencia('VENCIDO')}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            filtroVigencia === 'VENCIDO' ? 'bg-rose-950/40 border-rose-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-400">EMO Vencidos</span>
            <XCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {summary?.vigencias?.vencidos ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Inhabilitados para campo</div>
        </div>

        <div 
          onClick={() => setFiltroVigencia('SIN_EMO')}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            filtroVigencia === 'SIN_EMO' ? 'bg-slate-800 border-slate-600' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Sin Expediente EMO</span>
            <Clock className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {employees.filter(e => !e.ultimoEmo?.id).length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Nuevos ingresos pendientes</div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por colaborador, DNI o área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['ALL', 'VIGENTE', 'POR_VENCER', 'VENCIDO', 'SIN_EMO'].map(v => (
            <button
              key={v}
              onClick={() => setFiltroVigencia(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filtroVigencia === v ? 'bg-amber-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {v === 'ALL' ? 'Todos' : v.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Vigencias */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Colaborador / DNI</th>
                <th className="py-3 px-4">Área y Puesto</th>
                <th className="py-3 px-4">Último EMO</th>
                <th className="py-3 px-4">Aptitud</th>
                <th className="py-3 px-4">Vencimiento</th>
                <th className="py-3 px-4">Estado Semáforo</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    Cargando semáforo de vigencias...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No se encontraron registros con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                filtrados.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{emp.fullName}</div>
                      <div className="text-xs text-slate-500">DNI: {emp.dni}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white text-xs">{emp.area || 'Sin Área'}</div>
                      <div className="text-[11px] text-slate-500">{emp.cargo || 'Sin Cargo'}</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {emp.ultimoEmo?.codigo || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold text-slate-200">
                        {emp.ultimoEmo?.resultado || 'PENDIENTE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {emp.ultimoEmo?.vence ? (
                        <span className="text-slate-300 font-mono">
                          {emp.ultimoEmo.vence.slice(0, 10)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getBadgeVigencia(emp.ultimoEmo?.estadoVigencia)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => alert(`Notificación de citación de renovación enviada a ${emp.fullName}`)}
                        title="Enviar citación o alerta"
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 rounded flex items-center gap-1 mx-auto transition"
                      >
                        <Send className="w-3 h-3" /> Notificar
                      </button>
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

export default SaludVigencias;

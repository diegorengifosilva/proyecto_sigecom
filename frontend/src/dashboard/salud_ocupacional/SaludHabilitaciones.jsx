import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, CheckCircle2, Clock, AlertTriangle, XCircle, 
  Plus, Calendar, Search, Building2, Download, FileCheck
} from 'lucide-react';
import axios from 'axios';

const SaludHabilitaciones = () => {
  const [habilitaciones, setHabilitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('ALL');
  const [form, setForm] = useState({
    colaboradorNombre: '',
    dni: '',
    clienteMinero: 'COMPAÑIA MINERA ANTAMINA S.A.',
    unidadOperativa: 'Mina Yanacancha',
    protocoloExigido: 'Anexo 16 - Gran Altura Geográfica (>4000 msnm)',
    resultadoMedico: 'APTO_SIN_RESTRICCION',
    fechaEmision: new Date().toISOString().split('T')[0],
    fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    codigoPase: `PASE-MED-${Math.floor(1000 + Math.random() * 9000)}`,
    estadoHabilitacion: 'APROBADO' // APROBADO, EN_REVISION, RECHAZADO, OBSERVADO
  });

  const fetchHabilitaciones = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/occupational-health/compat/habilitaciones/');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setHabilitaciones(res.data);
      } else {
        // Datos demostrativos de habilitaciones para clientes
        setHabilitaciones([
          {
            id: 'HAB-001',
            codigoPase: 'PASE-MED-9214',
            colaboradorNombre: 'Manuel Antonio Benites Torres',
            dni: '43981274',
            clienteMinero: 'COMPAÑIA MINERA ANTAMINA S.A.',
            unidadOperativa: 'Mina Yanacancha',
            protocoloExigido: 'Anexo 16 - Gran Altura Geográfica (>4000 msnm)',
            resultadoMedico: 'APTO_SIN_RESTRICCION',
            fechaEmision: '2026-02-10',
            fechaVencimiento: '2027-02-10',
            estadoHabilitacion: 'APROBADO'
          },
          {
            id: 'HAB-002',
            codigoPase: 'PASE-MED-8812',
            colaboradorNombre: 'Edgar Fernando Quispe Luna',
            dni: '47120934',
            clienteMinero: 'SOUTHERN PERU COPPER CORP.',
            unidadOperativa: 'Toquepala',
            protocoloExigido: 'Protocolo Mina / Espacios Confinados',
            resultadoMedico: 'APTO_CON_RESTRICCION',
            fechaEmision: '2026-01-20',
            fechaVencimiento: '2027-01-20',
            estadoHabilitacion: 'APROBADO'
          },
          {
            id: 'HAB-003',
            codigoPase: 'PASE-MED-7451',
            colaboradorNombre: 'César Augusto Ramírez Silva',
            dni: '40192837',
            clienteMinero: 'MINERA CHINALCO PERÚ S.A.',
            unidadOperativa: 'Toromocho',
            protocoloExigido: 'Anexo 16 Especial Hipoxia',
            resultadoMedico: 'OBSERVADO',
            fechaEmision: '2026-03-05',
            fechaVencimiento: '2026-04-05',
            estadoHabilitacion: 'EN_REVISION'
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
    fetchHabilitaciones();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/occupational-health/compat/habilitaciones/', {
        ...form,
        id: `HAB-${Date.now().toString().slice(-4)}`
      });
      setShowModal(false);
      fetchHabilitaciones();
    } catch (err) {
      alert('Error guardando habilitación: ' + err.message);
    }
  };

  const filtrados = habilitaciones.filter(h => {
    const matchCliente = filtroCliente === 'ALL' || h.clienteMinero?.includes(filtroCliente);
    const matchSearch = !search || 
      h.colaboradorNombre?.toLowerCase().includes(search.toLowerCase()) || 
      h.dni?.includes(search) || 
      h.codigoPase?.toLowerCase().includes(search.toLowerCase());
    return matchCliente && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
            Habilitaciones y Pases Médicos para Clientes
          </h1>
          <p className="text-slate-400 text-sm">
            Gestión de requisitos de acreditación médica según estándares de clientes industriales y mineros
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" /> Emitir Pase de Acreditación
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {habilitaciones.filter(h => h.estadoHabilitacion === 'APROBADO').length}
            </div>
            <div className="text-xs text-slate-400">Pases Aprobados</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {habilitaciones.filter(h => h.estadoHabilitacion === 'EN_REVISION').length}
            </div>
            <div className="text-xs text-slate-400">En Revisión / Auditoría</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">6</div>
            <div className="text-xs text-slate-400">Clientes Mineros Activos</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-lg">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-xs text-slate-400">Pases Bloqueados / Vencidos</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por colaborador, DNI o N° pase..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['ALL', 'ANTAMINA', 'SOUTHERN', 'CHINALCO'].map(c => (
            <button
              key={c}
              onClick={() => setFiltroCliente(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filtroCliente === c ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {c === 'ALL' ? 'Todos los Clientes' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Habilitaciones */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">N° Pase Médico</th>
                <th className="py-3 px-4">Colaborador / DNI</th>
                <th className="py-3 px-4">Cliente / Unidad</th>
                <th className="py-3 px-4">Protocolo Exigido</th>
                <th className="py-3 px-4">Aptitud</th>
                <th className="py-3 px-4">Vigencia Pase</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-center">Certificado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    Cargando acreditaciones médicas...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No se encontraron pases médicos registrados
                  </td>
                </tr>
              ) : (
                filtrados.map((h, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono text-xs text-emerald-400 font-semibold">
                      {h.codigoPase}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{h.colaboradorNombre}</div>
                      <div className="text-xs text-slate-500">DNI: {h.dni}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white text-xs">{h.clienteMinero}</div>
                      <div className="text-[11px] text-slate-400">{h.unidadOperativa}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {h.protocoloExigido}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold text-slate-200">
                        {h.resultadoMedico}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {h.fechaVencimiento}
                    </td>
                    <td className="py-3 px-4">
                      {h.estadoHabilitacion === 'APROBADO' ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Habilitado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          En Revisión
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => alert(`Generando credencial de acreditación médica ${h.codigoPase}`)}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded flex items-center gap-1 mx-auto transition"
                      >
                        <FileCheck className="w-3.5 h-3.5" /> Ficha Pase
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva Habilitación */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> Emitir Pase Médico para Cliente
            </h2>
            <form onSubmit={handleCrear} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Código de Pase</label>
                  <input
                    type="text"
                    required
                    value={form.codigoPase}
                    onChange={e => setForm({ ...form, codigoPase: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">DNI del Colaborador</label>
                  <input
                    type="text"
                    required
                    value={form.dni}
                    onChange={e => setForm({ ...form, dni: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Nombres y Apellidos</label>
                <input
                  type="text"
                  required
                  value={form.colaboradorNombre}
                  onChange={e => setForm({ ...form, colaboradorNombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Cliente Minero / Industrial</label>
                  <input
                    type="text"
                    value={form.clienteMinero}
                    onChange={e => setForm({ ...form, clienteMinero: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Sede / Unidad Operativa</label>
                  <input
                    type="text"
                    value={form.unidadOperativa}
                    onChange={e => setForm({ ...form, unidadOperativa: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Protocolo Exigido por el Cliente</label>
                <input
                  type="text"
                  value={form.protocoloExigido}
                  onChange={e => setForm({ ...form, protocoloExigido: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Resultado de Aptitud</label>
                  <select
                    value={form.resultadoMedico}
                    onChange={e => setForm({ ...form, resultadoMedico: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="APTO_SIN_RESTRICCION">Apto sin Restricción</option>
                    <option value="APTO_CON_RESTRICCION">Apto con Restricción</option>
                    <option value="OBSERVADO">Observado / Por Levantar</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Vencimiento del Pase</label>
                  <input
                    type="date"
                    value={form.fechaVencimiento}
                    onChange={e => setForm({ ...form, fechaVencimiento: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-sm hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-semibold hover:bg-emerald-500"
                >
                  Emitir Acreditación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaludHabilitaciones;

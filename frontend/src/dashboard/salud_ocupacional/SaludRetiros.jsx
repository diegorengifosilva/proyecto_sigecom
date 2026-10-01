import React, { useState, useEffect } from 'react';
import { 
  UserMinus, FileText, CheckCircle2, XCircle, AlertTriangle, 
  Plus, Calendar, Search, Download, Upload, ShieldCheck
} from 'lucide-react';
import axios from 'axios';

const SaludRetiros = () => {
  const [retiros, setRetiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    colaboradorNombre: '',
    dni: '',
    fechaCese: new Date().toISOString().split('T')[0],
    estadoExamen: 'CARTA_ENVIADA', // CARTA_ENVIADA, REALIZADO, DESISTIDO
    numeroCarta: `CR-2026-${Math.floor(100 + Math.random() * 900)}`,
    fechaNotificacion: new Date().toISOString().split('T')[0],
    clinicaAsignada: 'Clínica Ocupacional San Pablo',
    motivoDesistimiento: '',
    documentoAdjunto: 'carta_retiro_notificada.pdf'
  });

  const fetchRetiros = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/occupational-health/compat/retiros/');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setRetiros(res.data);
      } else {
        // Datos demostrativos de ceses y exámenes de retiro
        setRetiros([
          {
            id: 'RET-001',
            colaboradorNombre: 'Carlos Alberto Rojas Méndez',
            dni: '45892147',
            fechaCese: '2026-02-15',
            estadoExamen: 'REALIZADO',
            numeroCarta: 'CR-2026-104',
            fechaNotificacion: '2026-02-10',
            clinicaAsignada: 'IPRESS Salud Ocupacional Lima',
            documentoAdjunto: 'certificado_aptitud_retiro.pdf'
          },
          {
            id: 'RET-002',
            colaboradorNombre: 'Ana Lucía Morales Vega',
            dni: '70214589',
            fechaCese: '2026-03-01',
            estadoExamen: 'DESISTIDO',
            numeroCarta: 'CR-2026-108',
            fechaNotificacion: '2026-02-28',
            clinicaAsignada: 'Clínica San Pablo',
            motivoDesistimiento: 'Declaración jurada voluntaria de renuncia a EMO de retiro firmada.',
            documentoAdjunto: 'acta_desistimiento_firmada.pdf'
          },
          {
            id: 'RET-003',
            colaboradorNombre: 'Jorge Luis Paredes Castillo',
            dni: '41236598',
            fechaCese: '2026-03-10',
            estadoExamen: 'CARTA_ENVIADA',
            numeroCarta: 'CR-2026-112',
            fechaNotificacion: '2026-03-05',
            clinicaAsignada: 'Clínica San Pablo',
            documentoAdjunto: 'cargo_recepcion_notarial.pdf'
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
    fetchRetiros();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/occupational-health/compat/retiros/', {
        ...form,
        id: `RET-${Date.now().toString().slice(-4)}`
      });
      setShowModal(false);
      fetchRetiros();
    } catch (err) {
      alert('Error guardando registro de retiro: ' + err.message);
    }
  };

  const filtrados = retiros.filter(r => 
    !search || 
    r.colaboradorNombre?.toLowerCase().includes(search.toLowerCase()) || 
    r.dni?.includes(search) || 
    r.numeroCarta?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserMinus className="w-7 h-7 text-indigo-400" />
            Control de Exámenes Médicos de Retiro y Desistimientos
          </h1>
          <p className="text-slate-400 text-sm">
            Cumplimiento legal Ley 29783: Cartas de ofrecimiento, actas notariales y cartas de desistimiento
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" /> Registrar Ofrecimiento de Retiro
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {retiros.filter(r => r.estadoExamen === 'CARTA_ENVIADA').length}
            </div>
            <div className="text-xs text-slate-400">Cartas Notificadas en Plazo</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {retiros.filter(r => r.estadoExamen === 'REALIZADO').length}
            </div>
            <div className="text-xs text-slate-400">Exámenes Ejecutados</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {retiros.filter(r => r.estadoExamen === 'DESISTIDO').length}
            </div>
            <div className="text-xs text-slate-400">Desistimientos con Firma y Huella</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtro */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por colaborador, DNI o N° carta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">N° Carta / Código</th>
                <th className="py-3 px-4">Colaborador / DNI</th>
                <th className="py-3 px-4">Fecha Cese</th>
                <th className="py-3 px-4">Fecha Notificación</th>
                <th className="py-3 px-4">Clínica / Destino</th>
                <th className="py-3 px-4">Estado Legal</th>
                <th className="py-3 px-4 text-center">Expediente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    Cargando registros de retiro...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No se encontraron registros de examen de retiro
                  </td>
                </tr>
              ) : (
                filtrados.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono text-xs text-indigo-300 font-semibold">
                      {r.numeroCarta}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{r.colaboradorNombre}</div>
                      <div className="text-xs text-slate-500">DNI: {r.dni}</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">{r.fechaCese}</td>
                    <td className="py-3 px-4 text-xs font-mono">{r.fechaNotificacion}</td>
                    <td className="py-3 px-4 text-xs text-slate-400">{r.clinicaAsignada}</td>
                    <td className="py-3 px-4">
                      {r.estadoExamen === 'REALIZADO' ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Examen Realizado
                        </span>
                      ) : r.estadoExamen === 'DESISTIDO' ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Desistimiento Firmado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Notificado / Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => alert(`Descargando documento de respaldo: ${r.documentoAdjunto}`)}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded flex items-center gap-1 mx-auto transition"
                      >
                        <Download className="w-3 h-3" /> Sustento
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Ofrecimiento */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-indigo-400" /> Registrar Carta de Ofrecimiento EMO de Retiro
            </h2>
            <form onSubmit={handleCrear} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">N° Carta Notificada</label>
                  <input
                    type="text"
                    required
                    value={form.numeroCarta}
                    onChange={e => setForm({ ...form, numeroCarta: e.target.value })}
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
                <label className="text-xs text-slate-400">Nombres y Apellidos Completos</label>
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
                  <label className="text-xs text-slate-400">Fecha de Cese</label>
                  <input
                    type="date"
                    required
                    value={form.fechaCese}
                    onChange={e => setForm({ ...form, fechaCese: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Fecha de Notificación</label>
                  <input
                    type="date"
                    required
                    value={form.fechaNotificacion}
                    onChange={e => setForm({ ...form, fechaNotificacion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Estado de la Gestión</label>
                  <select
                    value={form.estadoExamen}
                    onChange={e => setForm({ ...form, estadoExamen: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="CARTA_ENVIADA">Carta Enviada / Notificada</option>
                    <option value="REALIZADO">Examen EMO Realizado</option>
                    <option value="DESISTIDO">Desistimiento Voluntario</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Clínica Ocupacional</label>
                  <input
                    type="text"
                    value={form.clinicaAsignada}
                    onChange={e => setForm({ ...form, clinicaAsignada: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              {form.estadoExamen === 'DESISTIDO' && (
                <div>
                  <label className="text-xs text-slate-400">Detalle o Folio de Desistimiento</label>
                  <textarea
                    rows="2"
                    value={form.motivoDesistimiento}
                    onChange={e => setForm({ ...form, motivoDesistimiento: e.target.value })}
                    placeholder="Declaración jurada de desistimiento debidamente firmada y con huella..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              )}

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
                  className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-500"
                >
                  Guardar Ofrecimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaludRetiros;

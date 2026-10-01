import React, { useState, useEffect } from 'react';
import { 
  FileEdit, AlertCircle, CheckCircle2, Search, Plus, 
  Calendar, ShieldAlert, History, UserCheck
} from 'lucide-react';
import axios from 'axios';

const SaludCorrecciones = () => {
  const [correcciones, setCorrecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    codigoExpediente: '',
    colaboradorNombre: '',
    motivoRectificacion: 'LEVANTAMIENTO_INTERCONSULTA',
    resultadoAnterior: 'OBSERVADO',
    resultadoNuevo: 'APTO_CON_RESTRICCION',
    justificacionMedica: '',
    medicoAuditor: 'Dra. Médica Ocupacional CMP 58214',
    fechaSolicitud: new Date().toISOString().split('T')[0]
  });

  const fetchCorrecciones = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/occupational-health/compat/correcciones/');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCorrecciones(res.data);
      } else {
        // Datos demostrativos de auditorías y rectificaciones
        setCorrecciones([
          {
            id: 'REC-001',
            codigoExpediente: 'EMO-2026-0045',
            colaboradorNombre: 'Manuel Benites Torres',
            motivoRectificacion: 'LEVANTAMIENTO_INTERCONSULTA',
            resultadoAnterior: 'OBSERVADO',
            resultadoNuevo: 'APTO_CON_RESTRICCION',
            justificacionMedica: 'Se adjuntó informe cardiológico favorable de ecocardiograma. Apto para gran altura con control trimestral.',
            medicoAuditor: 'Dra. Médica Ocupacional CMP 58214',
            fechaSolicitud: '2026-02-18',
            estado: 'APROBADA'
          },
          {
            id: 'REC-002',
            codigoExpediente: 'EMO-2026-0082',
            colaboradorNombre: 'Ana Lucía Morales',
            motivoRectificacion: 'ERROR_DIGITACION_CLINICA',
            resultadoAnterior: 'NO_APTO',
            resultadoNuevo: 'APTO',
            justificacionMedica: 'Clínica emitió fe de erratas formal por confusión en muestra de glucosa. Informe corregido adjunto.',
            medicoAuditor: 'Dr. Auditor SIGECOM',
            fechaSolicitud: '2026-03-02',
            estado: 'APROBADA'
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
    fetchCorrecciones();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/occupational-health/compat/correcciones/', {
        ...form,
        id: `REC-${Date.now().toString().slice(-4)}`,
        estado: 'APROBADA'
      });
      setShowModal(false);
      fetchCorrecciones();
    } catch (err) {
      alert('Error registrando rectificación: ' + err.message);
    }
  };

  const filtrados = correcciones.filter(c => 
    !search || 
    c.colaboradorNombre?.toLowerCase().includes(search.toLowerCase()) || 
    c.codigoExpediente?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileEdit className="w-7 h-7 text-amber-500" />
            Auditoría de Rectificaciones y Correcciones Médicas
          </h1>
          <p className="text-slate-400 text-sm">
            Trazabilidad inmutable de rectificaciones sobre expedientes EMO, adendas clínicas y fe de erratas
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" /> Solicitar Rectificación Médica
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por colaborador o código de expediente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          {filtrados.length} auditorías registradas
        </div>
      </div>

      {/* Listado de Correcciones */}
      <div className="space-y-3">
        {filtrados.map((rec, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                  {rec.id}
                </span>
                <span className="font-semibold text-white text-sm">
                  {rec.colaboradorNombre}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  (Expediente: {rec.codigoExpediente})
                </span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold w-fit">
                {rec.estado || 'APROBADA'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Resultado anterior:</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono font-semibold">
                  {rec.resultadoAnterior}
                </span>
              </div>
              <span className="text-slate-600">→</span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Nuevo resultado:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                  {rec.resultadoNuevo}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg text-xs text-slate-300 space-y-1">
              <span className="text-slate-500 font-medium">Justificación del Médico Auditor:</span>
              <p>{rec.justificacionMedica}</p>
            </div>

            <div className="text-xs text-slate-500 flex justify-between items-center border-t border-slate-800 pt-2">
              <span>Auditor responsable: <strong className="text-slate-400">{rec.medicoAuditor}</strong></span>
              <span>Fecha: {rec.fechaSolicitud}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nueva Rectificación */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-amber-500" /> Registrar Rectificación Médica Ocupacional
            </h2>
            <form onSubmit={handleCrear} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Código de Expediente EMO</label>
                  <input
                    type="text"
                    required
                    value={form.codigoExpediente}
                    onChange={e => setForm({ ...form, codigoExpediente: e.target.value })}
                    placeholder="EMO-2026-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Colaborador</label>
                  <input
                    type="text"
                    required
                    value={form.colaboradorNombre}
                    onChange={e => setForm({ ...form, colaboradorNombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Motivo de Rectificación</label>
                <select
                  value={form.motivoRectificacion}
                  onChange={e => setForm({ ...form, motivoRectificacion: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                >
                  <option value="LEVANTAMIENTO_INTERCONSULTA">Levantamiento de Observación por Interconsulta</option>
                  <option value="ERROR_DIGITACION_CLINICA">Fe de Erratas / Error Material de Clínica</option>
                  <option value="ADENDA_CRITERIO_MEDICO">Adenda de Restricciones Operativas</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Aptitud Anterior</label>
                  <select
                    value={form.resultadoAnterior}
                    onChange={e => setForm({ ...form, resultadoAnterior: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="OBSERVADO">OBSERVADO</option>
                    <option value="NO_APTO">NO APTO</option>
                    <option value="APTO_CON_RESTRICCION">APTO CON RESTRICCIÓN</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Nueva Aptitud Rectificada</label>
                  <select
                    value={form.resultadoNuevo}
                    onChange={e => setForm({ ...form, resultadoNuevo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="APTO">APTO</option>
                    <option value="APTO_CON_RESTRICCION">APTO CON RESTRICCIÓN</option>
                    <option value="NO_APTO">NO APTO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Justificación Médica y Sustento</label>
                <textarea
                  rows="3"
                  required
                  value={form.justificacionMedica}
                  onChange={e => setForm({ ...form, justificacionMedica: e.target.value })}
                  placeholder="Detallar informe especialista o documento oficial de la IPRESS..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
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
                  className="px-4 py-2 bg-amber-600 text-white rounded text-sm font-semibold hover:bg-amber-500"
                >
                  Registrar Rectificación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaludCorrecciones;

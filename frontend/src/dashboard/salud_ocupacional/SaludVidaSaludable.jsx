import React, { useState, useEffect } from 'react';
import { 
  Heart, Activity, Apple, Dumbbell, ShieldAlert, 
  Plus, Calendar, CheckCircle2, AlertTriangle, Users, Search, Award
} from 'lucide-react';
import axios from 'axios';

const SaludVidaSaludable = () => {
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('ALL');
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'ERGONOMIA',
    descripcion: '',
    poblacionObjetivo: 'Operaciones y Planta',
    fechaInicio: new Date().toISOString().split('T')[0],
    metaParticipantes: 30,
    responsable: 'Dra. Médica Ocupacional'
  });

  const fetchProgramas = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/occupational-health/compat/vida_saludable/');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setProgramas(res.data);
      } else {
        // Datos iniciales demostrativos de vigilancia médica
        setProgramas([
          {
            id: 'PROG-01',
            nombre: 'Programa de Vigilancia Osteomuscular y Ergonomía',
            tipo: 'ERGONOMIA',
            descripcion: 'Pausas activas y corrección postural en puestos de planta y oficinas.',
            poblacionObjetivo: 'Todos los colaboradores',
            fechaInicio: '2026-01-15',
            metaParticipantes: 50,
            inscritos: 42,
            estado: 'ACTIVO',
            responsable: 'Lic. Fisioterapia'
          },
          {
            id: 'PROG-02',
            nombre: 'Prevención de Riesgo Cardiovascular e Hipertensión',
            tipo: 'CARDIOVASCULAR',
            descripcion: 'Monitoreo de presión arterial, glucosa y perfil lipídico trimestral.',
            poblacionObjetivo: 'Colaboradores con IMC > 28 o > 40 años',
            fechaInicio: '2026-02-01',
            metaParticipantes: 25,
            inscritos: 22,
            estado: 'ACTIVO',
            responsable: 'Dra. Médica Ocupacional'
          },
          {
            id: 'PROG-03',
            nombre: 'Salud Mental y Manejo de Estrés Laboral',
            tipo: 'SALUD_MENTAL',
            descripcion: 'Talleres de resiliencia, bienestar psicológico y clima libre de acoso.',
            poblacionObjetivo: 'Jefaturas y personal de campo',
            fechaInicio: '2026-03-01',
            metaParticipantes: 40,
            inscritos: 35,
            estado: 'ACTIVO',
            responsable: 'Psicólogo Organizacional'
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
    fetchProgramas();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/occupational-health/compat/vida_saludable/', {
        ...form,
        id: `PROG-${Date.now().toString().slice(-4)}`,
        inscritos: 0,
        estado: 'ACTIVO'
      });
      setShowModal(false);
      fetchProgramas();
    } catch (err) {
      alert('Error guardando programa: ' + err.message);
    }
  };

  const filtrados = programas.filter(p => filtroTipo === 'ALL' || p.tipo === filtroTipo);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Heart className="w-7 h-7 text-rose-500" />
            Programas de Vida Saludable y Vigilancia Epidemiológica
          </h1>
          <p className="text-slate-400 text-sm">
            Monitoreo preventivo de ergonomía, riesgo cardiovascular, salud psicosocial y nutrición
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" /> Nuevo Programa Preventivo
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{programas.length}</div>
            <div className="text-xs text-slate-400">Programas Activos</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {programas.reduce((acc, p) => acc + (parseInt(p.inscritos) || 0), 0)}
            </div>
            <div className="text-xs text-slate-400">Colaboradores Beneficiados</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <Apple className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">88%</div>
            <div className="text-xs text-slate-400">Cumplimiento de Meta</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-sky-500/20 text-sky-400 rounded-lg">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-xs text-slate-400">Enfermedades Profesionales</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {['ALL', 'ERGONOMIA', 'CARDIOVASCULAR', 'SALUD_MENTAL', 'NUTRICION'].map(t => (
          <button
            key={t}
            onClick={() => setFiltroTipo(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filtroTipo === t ? 'bg-rose-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {t === 'ALL' ? 'Todos los Programas' : t}
          </button>
        ))}
      </div>

      {/* Listado de programas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map((p, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-4">
            <div className="flex items-start justify-between gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                p.tipo === 'ERGONOMIA' ? 'bg-blue-500/20 text-blue-400' :
                p.tipo === 'CARDIOVASCULAR' ? 'bg-red-500/20 text-red-400' :
                p.tipo === 'SALUD_MENTAL' ? 'bg-purple-500/20 text-purple-400' :
                'bg-emerald-500/20 text-emerald-400'
              }`}>
                {p.tipo}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {p.estado || 'ACTIVO'}
              </span>
            </div>

            <div>
              <h3 className="font-semibold text-white text-base leading-snug">{p.nombre}</h3>
              <p className="text-slate-400 text-xs mt-1 line-clamp-2">{p.descripcion}</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Población:</span>
                <span>{p.poblacionObjetivo}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Responsable:</span>
                <span>{p.responsable}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Avance de Inscritos:</span>
                <span className="font-semibold text-rose-400">{p.inscritos || 0} / {p.metaParticipantes}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full" 
                  style={{ width: `${Math.min(100, ((p.inscritos || 0) / (p.metaParticipantes || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Inicio: {p.fechaInicio}
              </span>
              <button 
                onClick={() => alert(`Detalles y registro de asistencia del programa ${p.nombre}`)}
                className="text-rose-400 hover:text-rose-300 font-semibold"
              >
                Ver participantes →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nuevo Programa */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" /> Crear Programa de Salud y Vigilancia
            </h2>
            <form onSubmit={handleCrear} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Nombre del Programa</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Taller de Higiene Postural y Pausas Activas"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Tipo de Programa</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm({ ...form, tipo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="ERGONOMIA">Ergonomía / Postural</option>
                    <option value="CARDIOVASCULAR">Riesgo Cardiovascular</option>
                    <option value="SALUD_MENTAL">Salud Psicosocial</option>
                    <option value="NUTRICION">Nutrición y Obesidad</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Meta de Participantes</label>
                  <input
                    type="number"
                    value={form.metaParticipantes}
                    onChange={e => setForm({ ...form, metaParticipantes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Población Objetivo</label>
                <input
                  type="text"
                  value={form.poblacionObjetivo}
                  onChange={e => setForm({ ...form, poblacionObjetivo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Descripción y Alcance</label>
                <textarea
                  rows="2"
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={form.fechaInicio}
                    onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Profesional Responsable</label>
                  <input
                    type="text"
                    value={form.responsable}
                    onChange={e => setForm({ ...form, responsable: e.target.value })}
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
                  className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-semibold hover:bg-rose-500"
                >
                  Guardar Programa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaludVidaSaludable;

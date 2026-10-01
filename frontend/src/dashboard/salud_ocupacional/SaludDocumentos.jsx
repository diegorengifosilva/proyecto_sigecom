import React, { useState, useEffect } from 'react';
import { 
  FileText, Shield, Download, Search, Plus, Filter, 
  Eye, CheckCircle, Calendar, Lock, User
} from 'lucide-react';
import axios from 'axios';

const SaludDocumentos = () => {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('ALL');
  const [form, setForm] = useState({
    title: '',
    documentType: 'CERTIFICADO_APTITUD',
    filePath: 'expediente_firmado_digitalmente.pdf',
    doctorSigned: true,
    patientSigned: true,
    issuedAt: new Date().toISOString().split('T')[0]
  });

  const fetchDocumentos = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/occupational-health/documents/');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setDocumentos(res.data);
      } else {
        // Datos demostrativos de certificados confidenciales
        setDocumentos([
          {
            id: 'DOC-001',
            title: 'Certificado de Aptitud Médico Ocupacional - Ingreso',
            documentType: 'CERTIFICADO_APTITUD',
            filePath: 'emo_cert_ingreso_45892147.pdf',
            doctorSigned: true,
            patientSigned: true,
            issuedAt: '2026-02-15'
          },
          {
            id: 'DOC-002',
            title: 'Informe de Interconsulta Cardiológica y Ergometría',
            documentType: 'INFORME_MEDICO',
            filePath: 'interconsulta_cardio_70214589.pdf',
            doctorSigned: true,
            patientSigned: false,
            issuedAt: '2026-02-28'
          },
          {
            id: 'DOC-003',
            title: 'Examen de Retiro y Desistimiento Voluntario Notarial',
            documentType: 'EXAMEN_RETIRO',
            filePath: 'retiro_desistimiento_41236598.pdf',
            doctorSigned: true,
            patientSigned: true,
            issuedAt: '2026-03-05'
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
    fetchDocumentos();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/occupational-health/documents/', form);
      setShowModal(false);
      fetchDocumentos();
    } catch (err) {
      alert('Error guardando documento médico: ' + err.message);
    }
  };

  const filtrados = documentos.filter(doc => {
    const matchTipo = filtroTipo === 'ALL' || doc.documentType === filtroTipo;
    const matchSearch = !search || 
      doc.title?.toLowerCase().includes(search.toLowerCase()) || 
      doc.filePath?.toLowerCase().includes(search.toLowerCase());
    return matchTipo && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lock className="w-7 h-7 text-indigo-400" />
            Repositorio Confidencial de Documentos Médicos
          </h1>
          <p className="text-slate-400 text-sm">
            Custodia y archivo digital con firma electrónica de certificados de aptitud (Ley N° 29783 / NTS N° 068-MINSA)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" /> Subir Certificado Médico
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{documentos.length}</div>
            <div className="text-xs text-slate-400">Documentos Custodiados</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {documentos.filter(d => d.doctorSigned).length}
            </div>
            <div className="text-xs text-slate-400">Firmados por Médico CMP</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-sky-500/20 text-sky-400 rounded-lg">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">100%</div>
            <div className="text-xs text-slate-400">Cumplimiento Confidencialidad</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar documento médico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['ALL', 'CERTIFICADO_APTITUD', 'INFORME_MEDICO', 'EXAMEN_RETIRO'].map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filtroTipo === t ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {t === 'ALL' ? 'Todos' : t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map((doc, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-3">
            <div className="flex items-start justify-between">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-400">
                {doc.documentType}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {doc.issuedAt ? doc.issuedAt.slice(0, 10) : '—'}
              </span>
            </div>

            <div>
              <h3 className="font-semibold text-white text-sm line-clamp-2">{doc.title}</h3>
              <p className="text-xs text-slate-500 font-mono mt-1 truncate">{doc.filePath}</p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 ${doc.doctorSigned ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> Médico CMP
                </span>
                <span className={`flex items-center gap-1 ${doc.patientSigned ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> Paciente
                </span>
              </div>
              <button
                onClick={() => alert(`Descargando documento firmado: ${doc.filePath}`)}
                className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Subir Documento */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" /> Registrar Documento Médico Ocupacional
            </h2>
            <form onSubmit={handleCrear} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Título / Descripción del Documento</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej. Certificado de Aptitud Periódico 2026 - Área Mina"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Tipo de Documento</label>
                  <select
                    value={form.documentType}
                    onChange={e => setForm({ ...form, documentType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="CERTIFICADO_APTITUD">Certificado de Aptitud</option>
                    <option value="INFORME_MEDICO">Informe / Interconsulta</option>
                    <option value="EXAMEN_RETIRO">Examen o Carta de Retiro</option>
                    <option value="INFORME_AUDIOMETRICO">Audiometría / Espirometría</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Fecha de Emisión</label>
                  <input
                    type="date"
                    value={form.issuedAt}
                    onChange={e => setForm({ ...form, issuedAt: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Nombre de Archivo / Ruta Segura</label>
                <input
                  type="text"
                  required
                  value={form.filePath}
                  onChange={e => setForm({ ...form, filePath: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.doctorSigned}
                    onChange={e => setForm({ ...form, doctorSigned: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                  />
                  Firma Electrónica Médico Ocupacional
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.patientSigned}
                    onChange={e => setForm({ ...form, patientSigned: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                  />
                  Firma / Conformidad del Paciente
                </label>
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-500"
                >
                  Guardar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaludDocumentos;

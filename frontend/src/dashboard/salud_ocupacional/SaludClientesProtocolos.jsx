import React, { useState, useEffect } from 'react';
import { 
  Building2, FileText, CheckCircle2, Plus, 
  Search, Stethoscope, Layers, ShieldCheck
} from 'lucide-react';
import axios from 'axios';

const SaludClientesProtocolos = () => {
  const [protocolos, setProtocolos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    nombreProtocolo: '',
    codigoCliente: 'ANTAMINA',
    clienteNombre: 'Compañía Minera Antamina S.A.',
    pruebasRequeridas: 'Audiometría, Espirometría, RX Tórax OIT, Electrocardiograma, Psicología, Gran Altura',
    vigenciaMeses: 12,
    normativaReferencia: 'Anexo 16 DS 024-2016-EM / R.M. 312-2011-MINSA'
  });

  const fetchProtocolos = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/occupational-health/compat/protocolos/');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setProtocolos(res.data);
      } else {
        // Catálogo demostrativo de protocolos corporativos
        setProtocolos([
          {
            id: 'PROT-01',
            nombreProtocolo: 'Protocolo Gran Altura Geográfica (>4,000 msnm) Anexo 16',
            codigoCliente: 'ANTAMINA',
            clienteNombre: 'Compañía Minera Antamina S.A.',
            pruebasRequeridas: 'Electrocardiograma, RX OIT, Oftalmología, Laboratorio completo, Audiometría, Test de Ruffier',
            vigenciaMeses: 12,
            normativaReferencia: 'DS 024-2016-EM Anexo 16'
          },
          {
            id: 'PROT-02',
            nombreProtocolo: 'Protocolo Mina / Espacios Confinados / Trabajos en Caliente',
            codigoCliente: 'SOUTHERN',
            clienteNombre: 'Southern Peru Copper Corporation',
            pruebasRequeridas: 'Audiometría de alta frecuencia, Espirometría, Plomo en sangre, Carboxihemoglobina',
            vigenciaMeses: 12,
            normativaReferencia: 'Estándar Interno SPCC & R.M. 312-2011-MINSA'
          },
          {
            id: 'PROT-03',
            nombreProtocolo: 'Protocolo Administrativo y Oficinas Centrales',
            codigoCliente: 'ESTANDAR_CORP',
            clienteNombre: 'Estándar Corporativo SIGECOM',
            pruebasRequeridas: 'Examen clínico general, Agudeza visual, Perfil lipídico y glucosa',
            vigenciaMeses: 24,
            normativaReferencia: 'Ley N° 29783 / Modificatoria Ley N° 31246'
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
    fetchProtocolos();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/occupational-health/compat/protocolos/', {
        ...form,
        id: `PROT-${Date.now().toString().slice(-4)}`
      });
      setShowModal(false);
      fetchProtocolos();
    } catch (err) {
      alert('Error guardando protocolo: ' + err.message);
    }
  };

  const filtrados = protocolos.filter(p => 
    !search || 
    p.nombreProtocolo?.toLowerCase().includes(search.toLowerCase()) || 
    p.clienteNombre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-sky-400" />
            Catálogo de Protocolos Médicos y Exigencias por Cliente
          </h1>
          <p className="text-slate-400 text-sm">
            Estandarización de perfiles y baterías de exámenes según normas y lineamientos de cada mandante
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" /> Nuevo Protocolo
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por protocolo o cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          {filtrados.length} protocolos configurados
        </div>
      </div>

      {/* Grid de Protocolos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map((p, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-4">
            <div className="flex items-start justify-between">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/20 text-sky-400 font-mono">
                {p.codigoCliente}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {p.vigenciaMeses} meses vigencia
              </span>
            </div>

            <div>
              <h3 className="font-semibold text-white text-base leading-snug">{p.nombreProtocolo}</h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" /> {p.clienteNombre}
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg text-xs space-y-2">
              <div className="text-slate-400 font-semibold flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-sky-400" /> Batería de Exámenes:
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {p.pruebasRequeridas}
              </p>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1 border-t border-slate-800 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Ref: {p.normativaReferencia}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nuevo Protocolo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" /> Crear Protocolo de Exigencia Médica
            </h2>
            <form onSubmit={handleCrear} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Nombre del Protocolo</label>
                <input
                  type="text"
                  required
                  value={form.nombreProtocolo}
                  onChange={e => setForm({ ...form, nombreProtocolo: e.target.value })}
                  placeholder="Ej. Protocolo Gran Altura Geográfica y Espacios Confinados"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Código Cliente</label>
                  <input
                    type="text"
                    required
                    value={form.codigoCliente}
                    onChange={e => setForm({ ...form, codigoCliente: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Vigencia (Meses)</label>
                  <input
                    type="number"
                    value={form.vigenciaMeses}
                    onChange={e => setForm({ ...form, vigenciaMeses: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Razón Social Cliente</label>
                <input
                  type="text"
                  required
                  value={form.clienteNombre}
                  onChange={e => setForm({ ...form, clienteNombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Batería de Pruebas Requeridas</label>
                <textarea
                  rows="3"
                  required
                  value={form.pruebasRequeridas}
                  onChange={e => setForm({ ...form, pruebasRequeridas: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Normativa / Referencia Legal</label>
                <input
                  type="text"
                  value={form.normativaReferencia}
                  onChange={e => setForm({ ...form, normativaReferencia: e.target.value })}
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
                  className="px-4 py-2 bg-sky-600 text-white rounded text-sm font-semibold hover:bg-sky-500"
                >
                  Guardar Protocolo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaludClientesProtocolos;

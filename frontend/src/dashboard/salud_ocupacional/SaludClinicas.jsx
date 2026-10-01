import React, { useState, useEffect } from 'react';
import { 
  Building, MapPin, Phone, Mail, CheckCircle2, 
  Plus, Search, ShieldCheck, ExternalLink, Star
} from 'lucide-react';
import axios from 'axios';

const SaludClinicas = () => {
  const [clinicas, setClinicas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    ruc: '',
    registroDigesa: '',
    direccion: '',
    ciudad: 'Lima',
    contacto: '',
    telefono: '',
    email: '',
    estado: 'HOMOLOGADA'
  });

  const fetchClinicas = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/occupational-health/compat/clinicas/');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setClinicas(res.data);
      } else {
        // Directorio demostrativo de IPRESS
        setClinicas([
          {
            id: 'IPRESS-01',
            nombre: 'Clínica Ocupacional San Pablo',
            ruc: '20100154871',
            registroDigesa: 'DIGESA-RES-4512-2024',
            direccion: 'Av. El Polo 789, Surco',
            ciudad: 'Lima',
            contacto: 'Dra. Patricia Valdivia',
            telefono: '(01) 610-3333',
            email: 'ocupacional@sanpablo.com.pe',
            estado: 'HOMOLOGADA'
          },
          {
            id: 'IPRESS-02',
            nombre: 'Centro Médico Pulso Salud Ocupacional',
            ruc: '20512894562',
            registroDigesa: 'DIGESA-RES-8821-2023',
            direccion: 'Av. Arequipa 2450, Lince',
            ciudad: 'Lima',
            contacto: 'Lic. Fernando Castillo',
            telefono: '(01) 719-5500',
            email: 'atencionempresas@pulsosalud.com',
            estado: 'HOMOLOGADA'
          },
          {
            id: 'IPRESS-03',
            nombre: 'Policlínico Ocupacional Arequipa Sur',
            ruc: '20458912301',
            registroDigesa: 'DIGESA-RES-1049-2024',
            direccion: 'Calle Mercaderes 120',
            ciudad: 'Arequipa',
            contacto: 'Dra. Elena Bustamante',
            telefono: '(054) 22-8899',
            email: 'saludocupacional@arequipasur.pe',
            estado: 'HOMOLOGADA'
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
    fetchClinicas();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/occupational-health/compat/clinicas/', {
        ...form,
        id: `IPRESS-${Date.now().toString().slice(-4)}`
      });
      setShowModal(false);
      fetchClinicas();
    } catch (err) {
      alert('Error guardando clínica: ' + err.message);
    }
  };

  const filtrados = clinicas.filter(c => 
    !search || 
    c.nombre?.toLowerCase().includes(search.toLowerCase()) || 
    c.ruc?.includes(search) || 
    c.ciudad?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building className="w-7 h-7 text-teal-400" />
            Directorio de Clínicas e IPRESS Ocupacionales Autorizadas
          </h1>
          <p className="text-slate-400 text-sm">
            Centros médicos con acreditación DIGESA / SUSALUD para toma de EMO de ingreso, periódico y retiro
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" /> Registrar Clínica Homologada
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUC o ciudad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          {filtrados.length} centros médicos acreditados
        </div>
      </div>

      {/* Grid de Clínicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map((c, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-4">
            <div className="flex items-start justify-between">
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {c.estado || 'HOMOLOGADA'}
              </span>
              <span className="text-xs text-slate-500 font-mono">RUC: {c.ruc}</span>
            </div>

            <div>
              <h3 className="font-semibold text-white text-base leading-snug">{c.nombre}</h3>
              <p className="text-xs text-teal-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {c.registroDigesa}
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg text-xs space-y-2">
              <div className="flex items-start gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>{c.direccion} ({c.ciudad})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{c.telefono}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{c.email}</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 flex justify-between items-center">
              <span>Contacto: {c.contacto}</span>
              <button
                onClick={() => alert(`Coordinar cita con ${c.nombre}`)}
                className="text-teal-400 hover:text-teal-300 font-medium"
              >
                Agendar cita →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nueva Clínica */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-teal-400" /> Registrar Centro Médico Ocupacional (IPRESS)
            </h2>
            <form onSubmit={handleCrear} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Razón Social / Nombre Comercial</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">RUC</label>
                  <input
                    type="text"
                    required
                    value={form.ruc}
                    onChange={e => setForm({ ...form, ruc: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Registro DIGESA / SUSALUD</label>
                  <input
                    type="text"
                    required
                    value={form.registroDigesa}
                    onChange={e => setForm({ ...form, registroDigesa: e.target.value })}
                    placeholder="DIGESA-RES-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Dirección Sede</label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={e => setForm({ ...form, direccion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Ciudad / Región</label>
                  <input
                    type="text"
                    value={form.ciudad}
                    onChange={e => setForm({ ...form, ciudad: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Contacto</label>
                  <input
                    type="text"
                    value={form.contacto}
                    onChange={e => setForm({ ...form, contacto: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Teléfono</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
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
                  className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-semibold hover:bg-teal-500"
                >
                  Guardar IPRESS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaludClinicas;

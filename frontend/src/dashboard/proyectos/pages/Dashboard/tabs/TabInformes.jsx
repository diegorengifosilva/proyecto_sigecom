import React, { useState, useEffect } from 'react';
import { informesService } from '../../../api';

const TIPOS_INFORME = [
  { value: 'resumen_ejecutivo', label: 'Resumen Ejecutivo', formato: 'pdf', icon: '[PDF]' },
  { value: 'avance_mensual', label: 'Informe de Avance Mensual', formato: 'pdf', icon: '[PDF]' },
  { value: 'riesgos', label: 'Informe de Riesgos', formato: 'pdf', icon: '[PDF]' },
  { value: 'costos_evm', label: 'Informe de Costos EVM', formato: 'excel', icon: '[XLS]' },
  { value: 'cronograma', label: 'Informe de Cronograma', formato: 'excel', icon: '[XLS]' },
  { value: 'general', label: 'Informe General del Proyecto', formato: 'pdf', icon: '[PDF]' },
];

const DEFAULT_SECCIONES = Object.freeze({
  cliente: true,
  equipo: true,
  riesgos: true,
  recursos: true,
  historial: true,
  iaNarrativa: true,
});

const IA_FALLBACK = 'IA deshabilitada. Configura GOOGLE_API_KEY en backend/apps/core/.env para habilitar la narrativa.';

export default function TabInformes({ proyecto }) {
  const [informes, setInformes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState('resumen_ejecutivo');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [secciones, setSecciones] = useState({ ...DEFAULT_SECCIONES });
  const [notaContexto, setNotaContexto] = useState('');
  const [detalleActivo, setDetalleActivo] = useState(null);

  useEffect(() => {
    if (proyecto?.id) {
      cargarInformes();
    }
  }, [proyecto?.id]);

  useEffect(() => {
    if (!showModal) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !generando) setShowModal(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [showModal, generando]);

  const cargarInformes = async () => {
    try {
      setLoading(true);
      const response = await informesService.listar(proyecto.id);
      setInformes(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error cargando informes:', err);
      setError('No se pudieron cargar los informes.');
    } finally {
      setLoading(false);
    }
  };

  const resetModalState = (tipoInfo) => {
    setTipoSeleccionado(tipoInfo.value);
    setNombre(`${tipoInfo.label} - ${new Date().toLocaleDateString('es-PE')}`);
    setDescripcion('');
    setFechaDesde('');
    setFechaHasta('');
    setNotaContexto('');
    setSecciones({ ...DEFAULT_SECCIONES });
  };

  const handleGenerar = async () => {
    if (!nombre.trim()) {
      alert('Por favor ingresa un nombre para el informe.');
      return;
    }

    setGenerando(true);
    setError(null);

    try {
      const tipoInfo = TIPOS_INFORME.find(t => t.value === tipoSeleccionado);
      const data = {
        tipo: tipoSeleccionado,
        formato: tipoInfo.formato,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        fecha_desde: fechaDesde || null,
        fecha_hasta: fechaHasta || null,
        configuracion: {
          preferencias: {
            secciones,
            nota: notaContexto.trim() || null,
          },
        },
      };

      await informesService.generar(proyecto.id, data);
      await cargarInformes();
      setShowModal(false);
      alert('Informe enviado para generacion.');
    } catch (err) {
      console.error('Error generando informe:', err);
      setError('No fue posible generar el informe: ' + (err.response?.data?.error || err.message));
    } finally {
      setGenerando(false);
    }
  };

  const handleDescargar = async (informe) => {
    try {
      const response = await informesService.descargar(proyecto.id, informe.id);
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = informe.nombre_archivo_generado || `informe_${informe.id}.${informe.formato === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error descargando informe:', err);
      alert('No se pudo descargar el informe.');
    }
  };

  const handleEliminar = async (informeId) => {
    if (!window.confirm('Estas seguro de eliminar este informe?')) return;
    try {
      await informesService.eliminar(proyecto.id, informeId);
      await cargarInformes();
    } catch (err) {
      console.error('Error eliminando informe:', err);
      alert('No se pudo eliminar el informe.');
    }
  };

  const handleAbrirModal = (tipoValue) => {
    const tipoInfo = TIPOS_INFORME.find(t => t.value === tipoValue) || TIPOS_INFORME[0];
    resetModalState(tipoInfo);
    setShowModal(true);
  };

  const handleToggleSeccion = (key) => {
    setSecciones(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderEstadoBadge = (estado) => {
    const map = {
      completado: { text: 'Completado', color: 'bg-green-100 text-green-800' },
      generando: { text: 'Generando', color: 'bg-yellow-100 text-yellow-800' },
      error: { text: 'Error', color: 'bg-red-100 text-red-800' },
    };
    const badge = map[estado] || map.completado;
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin registro';
    return new Date(fecha).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderKpiChips = (kpis = {}) => {
    const chips = [
      { label: 'CPI', value: kpis.cpi },
      { label: 'SPI', value: kpis.spi },
      {
        label: 'Avance',
        value: typeof kpis.avance_real === 'number' ? `${kpis.avance_real}%` : null,
      },
    ];
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"
          >
            {chip.label}: {chip.value ?? 'N/D'}
          </span>
        ))}
      </div>
    );
  };

  const renderAlertas = (alertas = []) => {
    if (!alertas.length) {
      return <p className="text-xs text-gray-500">Sin alertas registradas.</p>;
    }
    return (
      <ul className="space-y-1 text-xs text-gray-700">
        {alertas.slice(0, 3).map((alerta, idx) => (
          <li key={`${alerta.tipo}-${idx}`} className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-red-500"></span>
            <span><strong>{alerta.tipo?.toUpperCase()}:</strong> {alerta.detalle}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderIaSummary = (iaCfg) => {
    if (!iaCfg || iaCfg.habilitada === false) {
      return <p className="text-xs text-red-600">{IA_FALLBACK}</p>;
    }
    if (!iaCfg.estado) {
      return <p className="text-xs text-gray-500">IA en proceso...</p>;
    }
    const resumen = iaCfg.estado;
    return (
      <div className="text-xs text-gray-700 space-y-1">
        <p><strong>Estado sugerido:</strong> {resumen.estado_sugerido}</p>
        <p><strong>Riesgo:</strong> {resumen.nivel_riesgo}</p>
        {iaCfg.narrativa && (
          <p className="text-gray-500">
            {iaCfg.narrativa.length > 220 ? `${iaCfg.narrativa.slice(0, 220)}...` : iaCfg.narrativa}
          </p>
        )}
      </div>
    );
  };

  const renderHistorial = (historial = []) => {
    if (!historial.length) {
      return <p className="text-xs text-gray-500">Sin historial reciente.</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700">
        {historial.slice(0, 4).map((registro) => {
          const avanceValor =
            typeof registro.avance === 'number'
              ? `${registro.avance.toFixed(1)}%`
              : registro.avance
              ? `${registro.avance}%`
              : 'N/D';
          return (
            <div key={registro.fecha} className="p-3 border rounded-lg bg-slate-50">
              <p className="font-semibold text-gray-900">{registro.fecha}</p>
              <p>Avance: {avanceValor}</p>
              <p>SPI: {registro.spi ?? 'N/D'}</p>
              <p>CPI: {registro.cpi ?? 'N/D'}</p>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="p-4">Cargando informes...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Informes Ejecutivos</h2>
          <p className="text-sm text-gray-500">
            Reportes predictivos con contexto del cliente, riesgos y narrativa IA.
          </p>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => handleAbrirModal(tipoSeleccionado)}
        >
          Nuevo informe
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-xs">Cerrar</button>
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Seleccion rapida</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIPOS_INFORME.map((tipo) => (
            <button
              key={tipo.value}
              className="border rounded-lg p-4 text-left bg-white hover:shadow-md transition"
              onClick={() => handleAbrirModal(tipo.value)}
            >
              <p className="text-xs uppercase text-gray-500">{tipo.icon} | {tipo.formato.toUpperCase()}</p>
              <p className="text-base font-semibold text-gray-800 mt-1">{tipo.label}</p>
              <p className="text-xs text-gray-500 mt-2">Incluye metricas de cronograma, costos y riesgos.</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Historial de informes</h3>
        {informes.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg text-gray-500">
            <p className="text-lg font-semibold">Aun no hay informes</p>
            <p className="text-sm">Genera tu primer informe para validar la trazabilidad end-to-end.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {informes.map((informe) => {
              const cfg = informe.configuracion || {};
              const contexto = cfg.contexto || {};
              const cliente = contexto.cliente || {};
              const responsables = contexto.responsables || {};
              const alertas = cfg.alertas || contexto.alertas || [];
              const kpis = cfg.kpis || contexto.kpis || {};
              const historial = cfg.historial_kpi || contexto.historial_kpi || [];
              const iaCfg = cfg.ia;
              const riesgos = contexto.riesgos || [];

              return (
                <article key={informe.id} className="border rounded-xl bg-white p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1">
                      <p className="text-xs uppercase text-gray-500">
                        {informe.tipo_display} | {informe.formato_display}
                      </p>
                      <h4 className="text-lg font-semibold text-gray-900">{informe.nombre}</h4>
                      <p className="text-xs text-gray-500">Generado {formatFecha(informe.fecha_generacion)}</p>
                      {informe.descripcion && (
                        <p className="text-sm text-gray-600 mt-2">{informe.descripcion}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {renderEstadoBadge(informe.estado)}
                      <div className="flex gap-2 flex-wrap justify-end">
                        {informe.estado === 'completado' && (
                          <button
                            onClick={() => handleDescargar(informe)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700"
                          >
                            Descargar
                          </button>
                        )}
                        <button
                          onClick={() => setDetalleActivo(prev => prev === informe.id ? null : informe.id)}
                          className="px-3 py-1 border rounded text-xs font-semibold hover:bg-gray-50"
                        >
                          {detalleActivo === informe.id ? 'Ocultar detalle' : 'Ver detalle'}
                        </button>
                        <button
                          onClick={() => handleEliminar(informe.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>

                  {informe.estado === 'error' && (
                    <p className="text-xs text-red-600 mt-2">{informe.mensaje_error || 'Error al generar el informe.'}</p>
                  )}

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs uppercase text-gray-500">Cliente y responsables</p>
                      <p><strong>Cliente:</strong> {cliente.empresa || 'No definido'}</p>
                      <p><strong>PM:</strong> {responsables.pm || 'No asignado'}</p>
                      {cfg.preferencias?.nota && (
                        <p className="text-xs text-gray-500">Nota: {cfg.preferencias.nota}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">KPIs</p>
                      {renderKpiChips(kpis)}
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">IA Ejecutiva</p>
                      {renderIaSummary(iaCfg)}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs uppercase text-gray-500 mb-1">Alertas predictivas</p>
                    {renderAlertas(alertas)}
                  </div>

                  {detalleActivo === informe.id && (
                    <div className="mt-4 border-t pt-4 space-y-4 text-sm text-gray-700">
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">Historial KPI</h5>
                        {renderHistorial(historial)}
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">Riesgos destacados</h5>
                        {riesgos.length === 0 ? (
                          <p className="text-xs text-gray-500">Sin riesgos registrados.</p>
                        ) : (
                          <ul className="text-xs text-gray-700 list-disc pl-5 space-y-1">
                            {riesgos.slice(0, 3).map((riesgo) => (
                              <li key={riesgo.titulo}>
                                <strong>{riesgo.titulo}:</strong> exp {riesgo.exposicion} - resp {riesgo.responsable || 'N/D'}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {Array.isArray(cfg.ia?.estado?.recomendaciones) && cfg.ia.estado.recomendaciones.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-gray-800 mb-2">Recomendaciones IA</h5>
                          <ul className="list-disc pl-5 text-xs space-y-1">
                            {cfg.ia.estado.recomendaciones.slice(0, 4).map((rec, idx) => (
                              <li key={`${informe.id}-rec-${idx}`}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showModal && (
        <div className="project-report-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !generando) setShowModal(false);
        }}>
          <div className="project-report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
            <div className="project-report-modal__header">
              <div>
                <span>Generación documental</span>
                <h3 id="report-modal-title">Configurar informe</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="project-report-modal__close"
                aria-label="Cerrar configuración"
                disabled={generando}
              >
                ×
              </button>
            </div>

            <div className="project-report-modal__body">
              <div className="project-report-field project-report-field--wide">
                <label className="block text-sm font-semibold mb-2">Tipo de Informe</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={tipoSeleccionado}
                  onChange={(e) => setTipoSeleccionado(e.target.value)}
                >
                  {TIPOS_INFORME.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.icon} {tipo.label} ({tipo.formato.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="project-report-field project-report-field--wide">
                <label className="block text-sm font-semibold mb-2">Nombre del Informe *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Informe Mensual - Enero"
                />
              </div>

              <div className="project-report-field project-report-field--wide">
                <label className="block text-sm font-semibold mb-2">Descripcion (opcional)</label>
                <textarea
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Resumen ejecutivo para el comite..."
                />
              </div>

              <div className="project-report-dates">
                <div className="project-report-field">
                  <label className="block text-sm font-semibold mb-2">Fecha Desde</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                </div>
                <div className="project-report-field">
                  <label className="block text-sm font-semibold mb-2">Fecha Hasta</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                  />
                </div>
              </div>

              <div className="project-report-sections">
                <p className="text-sm font-semibold mb-3">Secciones a incluir</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {[
                    { key: 'cliente', label: 'Cliente y responsables' },
                    { key: 'equipo', label: 'Equipo clave' },
                    { key: 'riesgos', label: 'Riesgos priorizados' },
                    { key: 'recursos', label: 'Recursos y cargas' },
                    { key: 'historial', label: 'Historial KPI' },
                    { key: 'iaNarrativa', label: 'Narrativa IA' },
                  ].map((opcion) => (
                    <label key={opcion.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={secciones[opcion.key]}
                        onChange={() => handleToggleSeccion(opcion.key)}
                        className="h-4 w-4"
                      />
                      <span>{opcion.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="project-report-field project-report-field--wide">
                <label className="block text-sm font-semibold mb-2">Notas para IA o el equipo</label>
                <textarea
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  value={notaContexto}
                  onChange={(e) => setNotaContexto(e.target.value)}
                  placeholder="Ej: Citar a la junta directiva del cliente e incluir foco en riesgos ambientales."
                />
              </div>
            </div>

            <div className="project-report-modal__footer">
              <button
                onClick={() => setShowModal(false)}
                className="project-report-modal__cancel"
                disabled={generando}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerar}
                className="project-report-modal__generate"
                disabled={generando}
              >
                {generando ? 'Generando...' : 'Generar informe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





// src/pages/Dashboard/tabs/TabResumen.jsx
import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Tooltip } from 'react-tooltip';
import { proyectosService } from '../../../api';

const fmtMoney = (n, c = 'USD') =>
  new Intl.NumberFormat(c === 'USD' ? 'en-US' : 'es-PE', {
    style: 'currency',
    currency: c,
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(-2)}`;
};

export default function TabResumen({ proyecto }) {
  const [curvas, setCurvas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [iaAnalisis, setIaAnalisis] = useState(null);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaError, setIaError] = useState(null);
  const hoyDate = useMemo(() => new Date(), []);

  useEffect(() => {
    const cargarCurvas = async () => {
      if (!proyecto?.id) return;
      try {
        const response = await proyectosService.obtenerCurvas(proyecto.id);
        setCurvas(response.data);
      } catch (err) {
        console.error('Error cargando curvas:', err);
      } finally {
        setLoading(false);
      }
    };
    cargarCurvas();
  }, [proyecto?.id]);

  useEffect(() => {
    const analizarIA = async () => {
      if (!proyecto?.id) return;
      setIaLoading(true);
      setIaError(null);
      try {
        const resp = await proyectosService.analizarIA(proyecto.id);
        setIaAnalisis(resp.data?.analisis_ia || null);
      } catch (err) {
        console.error('Error análisis IA:', err);
        const detail = err?.response?.data?.error || 'IA no disponible (revisa GOOGLE_API_KEY).';
        setIaError(typeof detail === 'string' ? detail : 'IA no disponible.');
      } finally {
        setIaLoading(false);
      }
    };
    analizarIA();
  }, [proyecto?.id]);

  const moneda = proyecto?.moneda || 'USD';

  // Cálculos EVM
  const presupuestoGastos = Number(proyecto?.presupuesto_gastos || 0);
  const presupuestoHH = Number(proyecto?.presupuesto_hh || 0);
  const contingencia = Number(proyecto?.presupuesto_contingencia || 0);
  const utilidad = Number(proyecto?.presupuesto_utilidad || 0);
  const BAC = presupuestoGastos + presupuestoHH + contingencia + utilidad;
  const parseISODate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  };

  // Calcular avance real
  const calcularAvance = () => {
    if (!proyecto?.fecha_inicio || !proyecto?.fecha_fin) return 0;
    const inicio = new Date(proyecto.fecha_inicio);
    const fin = new Date(proyecto.fecha_fin);
    const hoy = hoyDate;

    if (hoy < inicio) return 0;
    if (hoy > fin) return 100;

    const total = fin - inicio;
    const transcurrido = hoy - inicio;
    return Math.round((transcurrido / total) * 100);
  };

  const avanceReal = calcularAvance();

  // Si hay curvas de la BD, usar la última
  const ultimaCurva = curvas.length > 0 ? curvas[curvas.length - 1] : null;

  const PV = ultimaCurva ? ultimaCurva.pv : (BAC * avanceReal) / 100;
  const EV = ultimaCurva ? ultimaCurva.ev : (BAC * avanceReal * 0.85) / 100; // Simulado: 85% de eficiencia
  const AC = Number(proyecto?.gasto_real || 0) + Number(proyecto?.costo_hh_real || 0);

  const CPI = AC > 0 ? EV / AC : 0;
  const SPI = PV > 0 ? EV / PV : 0;
  const CV = EV - AC;
  const SV = EV - PV;
  const EAC = CPI > 0 ? BAC / CPI : BAC;
  const ETC = EAC - AC;
  const VAC = BAC - EAC;

  // Gráfico de curva S
  const curvaSOpciones = useMemo(() => {
    // Generar datos de curva S simulados si no hay datos reales
    const hoyStr = hoyDate.toISOString().split('T')[0];
    let fechas = [];
    let pvData = [];
    let evData = [];
    let acData = [];
    const markLine = {
      name: 'Hoy',
      symbol: 'none',
      lineStyle: { type: 'dashed', color: '#6b7280' },
      label: {
        show: true,
        formatter: `Hoy\\n${new Date().toLocaleDateString()}`,
        color: '#374151',
      },
      data: [{ xAxis: hoyStr }],
    };

    if (curvas.length > 0) {
      const normalizadas = curvas
        .map((c) => ({
          ...c,
          fecha: parseISODate(c.fecha),
        }))
        .filter((c) => c.fecha)
        .sort((a, b) => a.fecha - b.fecha);

      let data = normalizadas.filter((c) => c.fecha <= hoyDate);
      if (!data.length && normalizadas.length) {
        data = [normalizadas[0]];
      }
      const ultima = data[data.length - 1];
      if (ultima && ultima.fecha < hoyDate) {
        data = [
          ...data,
          { ...ultima, fecha: hoyDate, fecha_original: ultima.fecha },
        ];
      }

      fechas = data.map((c) => c.fecha.toISOString().split('T')[0]);
      pvData = data.map((c) => c.pv);
      evData = data.map((c) => c.ev);
      acData = data.map((c) => c.ac);
    } else {
      // Generar curva S simulada basada en fechas del proyecto (cortada a hoy)
      if (proyecto?.fecha_inicio && proyecto?.fecha_fin) {
        const inicio = new Date(proyecto.fecha_inicio);
        const finPlan = new Date(proyecto.fecha_fin);
        const fin = finPlan > hoyDate ? hoyDate : finPlan;
        const dias = Math.max(1, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)));
        const puntos = Math.min(dias, 20); // Máximo 20 puntos

        for (let i = 0; i <= puntos; i++) {
          const fecha = new Date(inicio.getTime() + (i * (fin - inicio) / puntos));
          const iso = fecha.toISOString().split('T')[0];
          if (iso <= hoyStr) {
            fechas.push(iso);

            const progreso = i / puntos;
            // Curva S típica
            const curvaS = (1 / (1 + Math.exp(-10 * (progreso - 0.5))));

            pvData.push(Math.round(BAC * curvaS));
            evData.push(Math.round(BAC * curvaS * 0.9)); // EV ligeramente menor
            acData.push(Math.round(BAC * curvaS * 0.95)); // AC entre PV y EV
          }
        }
      }
    }

    return {
      title: {
        text: 'Curva S - Análisis de Valor Ganado',
        left: 'center',
        textStyle: { fontSize: 14 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['Valor Planificado (PV)', 'Valor Ganado (EV)', 'Costo Real (AC)'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: fechas,
        axisLabel: {
          formatter: (value) => {
            const [y, m, d] = value.split('-');
            return `${d}/${m}`;
          },
        },
      },
      yAxis: {
        type: 'value',
        name: `Costo (${moneda})`,
        axisLabel: {
          formatter: (value) => {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
            return value;
          },
        },
      },
      series: [
        {
          name: 'Valor Planificado (PV)',
          type: 'line',
          data: pvData,
          smooth: true,
          lineStyle: { width: 2, color: '#3b82f6' },
          itemStyle: { color: '#3b82f6' },
          markLine,
        },
        {
          name: 'Valor Ganado (EV)',
          type: 'line',
          data: evData,
          smooth: true,
          lineStyle: { width: 2, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          markLine,
        },
        {
          name: 'Costo Real (AC)',
          type: 'line',
          data: acData,
          smooth: true,
          lineStyle: { width: 2, color: '#ef4444' },
          itemStyle: { color: '#ef4444' },
          markLine,
        },
      ],
    };
  }, [curvas, proyecto, BAC, moneda]);

  const conclusionesIndices = useMemo(() => {
    const msgs = [];
    if (CPI) {
      msgs.push(CPI >= 1 ? `CPI ${CPI.toFixed(2)}: buen desempeño de costos.` : `CPI ${CPI.toFixed(2)}: sobrecosto frente al plan.`);
    }
    if (SPI) {
      msgs.push(SPI >= 1 ? `SPI ${SPI.toFixed(2)}: avance en plazo (adelantado/en línea).` : `SPI ${SPI.toFixed(2)}: retraso en el cronograma.`);
    }
    if (CV || SV) {
      msgs.push(`CV ${CV >= 0 ? 'positivo' : 'negativo'} (${fmtMoney(CV, moneda)}) y SV ${SV >= 0 ? 'positivo' : 'negativo'} (${fmtMoney(SV, moneda)}).`);
    }
    if (EAC && VAC) {
      msgs.push(`Proyección EAC: ${fmtMoney(EAC, moneda)}; variación a la conclusión (VAC): ${fmtMoney(VAC, moneda)}.`);
    }
    if (!msgs.length) msgs.push('Sin datos suficientes para conclusiones automáticas.');
    return msgs;
  }, [CPI, SPI, CV, SV, EAC, VAC, moneda]);

  const conclusionesIA = useMemo(() => {
    const mensajes = [];
    if (CPI) {
      mensajes.push(CPI >= 1 ? `CPI ${CPI.toFixed(2)}: el gasto va eficiente.` : `CPI ${CPI.toFixed(2)}: riesgo de sobrecosto.`);
    }
    if (SPI) {
      mensajes.push(SPI >= 1 ? `SPI ${SPI.toFixed(2)}: el cronograma va adelantado/en línea.` : `SPI ${SPI.toFixed(2)}: retraso frente al plan.`);
    }
    if (CV || SV) {
      mensajes.push(`CV ${CV >= 0 ? 'positivo' : 'negativo'} (${fmtMoney(CV, moneda)}) y SV ${SV >= 0 ? 'positivo' : 'negativo'} (${fmtMoney(SV, moneda)}) describen la salud costo/plazo.`);
    }
    if (!mensajes.length) mensajes.push('Sin datos suficientes para conclusiones automáticas.');
    return mensajes;
  }, [CPI, SPI, CV, SV, moneda]);

  // Gráfico de índices
  const indicesOpciones = {
    title: {
      text: 'Índices de Desempeño',
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['CPI', 'SPI', 'Línea Base (1.0)'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['CPI', 'SPI'],
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 2,
      interval: 0.25,
      axisLabel: {
        formatter: '{value}',
      },
    },
    series: [
      {
        name: 'Valor Actual',
        type: 'bar',
        data: [CPI, SPI],
        itemStyle: {
          color: (params) => {
            return params.value >= 1 ? '#10b981' : params.value >= 0.9 ? '#f59e0b' : '#ef4444';
          },
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}',
        },
      },
      {
        name: 'Línea Base (1.0)',
        type: 'line',
        data: [1.0, 1.0],
        lineStyle: { type: 'dashed', color: '#6b7280' },
        itemStyle: { color: '#6b7280' },
      },
    ],
  };

  const getSemaforo = (valor, umbralVerde = 1.0, umbralAmarillo = 0.9) => {
    if (valor >= umbralVerde) return { color: 'bg-green-100 text-green-800', icono: '✓', label: 'Óptimo' };
    if (valor >= umbralAmarillo) return { color: 'bg-yellow-100 text-yellow-800', icono: '⚠', label: 'Atención' };
    return { color: 'bg-red-100 text-red-800', icono: '✗', label: 'Crítico' };
  };

  const semaforoCPI = getSemaforo(CPI);
  const semaforoSPI = getSemaforo(SPI);

  if (loading) {
    return <div className="p-4">Cargando resumen ejecutivo...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Resumen Ejecutivo</h2>
        <div className="text-xs text-gray-500">
          Última actualización: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border p-4 text-center"
             data-tooltip-id="bac-tooltip"
             data-tooltip-content="BAC (Presupuesto hasta la Conclusión): Es el presupuesto total aprobado para el proyecto, incluyendo gastos, horas hombre, contingencia y utilidad">
          <div className="text-xs text-gray-600 mb-1">Presupuesto (BAC)</div>
          <div className="text-xl font-bold text-gray-800">{fmtMoney(BAC, moneda)}</div>
        </div>
        <div className="rounded-xl border p-4 text-center"
             data-tooltip-id="avance-tooltip"
             data-tooltip-content="Avance Real: Porcentaje de tiempo transcurrido del proyecto desde su inicio hasta hoy, basado en las fechas planificadas">
          <div className="text-xs text-gray-600 mb-1">Avance Real</div>
          <div className="text-xl font-bold text-blue-600">{avanceReal}%</div>
        </div>
        <div className={`rounded-xl border p-4 text-center ${semaforoCPI.color}`}
             data-tooltip-id="cpi-tooltip"
             data-tooltip-content="CPI (Índice de Desempeño de Costos): Mide la eficiencia del gasto. CPI > 1 = bajo presupuesto, CPI < 1 = sobre presupuesto, CPI = 1 = según lo planificado">
          <div className="text-xs font-medium mb-1">CPI {semaforoCPI.icono}</div>
          <div className="text-xl font-bold">{CPI.toFixed(2)}</div>
          <div className="text-xs">{semaforoCPI.label}</div>
        </div>
        <div className={`rounded-xl border p-4 text-center ${semaforoSPI.color}`}
             data-tooltip-id="spi-tooltip"
             data-tooltip-content="SPI (Índice de Desempeño del Cronograma): Mide si el proyecto va adelantado o retrasado. SPI > 1 = adelantado, SPI < 1 = retrasado, SPI = 1 = según lo planificado">
          <div className="text-xs font-medium mb-1">SPI {semaforoSPI.icono}</div>
          <div className="text-xl font-bold">{SPI.toFixed(2)}</div>
          <div className="text-xs">{semaforoSPI.label}</div>
        </div>
      </div>

      {/* Curva S */}
      <div className="rounded-xl border p-4 bg-white">
        <ReactECharts option={curvaSOpciones} style={{ height: '400px' }} />
        <div className="mt-3 space-y-1 text-sm text-gray-700">
          <div className="font-semibold text-gray-800">Conclusiones automáticas (corte al {new Date().toLocaleDateString()}):</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {conclusionesIA.map((m, idx) => (
              <li key={idx}>{m}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Análisis EVM Detallado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Valores Acumulados */}
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold mb-3">Valores Acumulados</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"
                  data-tooltip-id="pv-tooltip"
                  data-tooltip-content="PV (Valor Planificado): Es el presupuesto que se debería haber gastado hasta la fecha según el plan original del proyecto">
                <td className="py-2">Valor Planificado (PV)</td>
                <td className="py-2 text-right font-medium">{fmtMoney(PV, moneda)}</td>
              </tr>
              <tr className="border-b"
                  data-tooltip-id="ev-tooltip"
                  data-tooltip-content="EV (Valor Ganado): Es el valor del trabajo realmente completado hasta la fecha, expresado en términos del presupuesto">
                <td className="py-2">Valor Ganado (EV)</td>
                <td className="py-2 text-right font-medium">{fmtMoney(EV, moneda)}</td>
              </tr>
              <tr className="border-b"
                  data-tooltip-id="ac-tooltip"
                  data-tooltip-content="AC (Costo Real): Es el dinero que realmente se ha gastado en el proyecto hasta la fecha">
                <td className="py-2">Costo Real (AC)</td>
                <td className="py-2 text-right font-medium">{fmtMoney(AC, moneda)}</td>
              </tr>
              <tr className="border-b bg-blue-50"
                  data-tooltip-id="cv-tooltip"
                  data-tooltip-content="CV (Variación de Costo): Diferencia entre el valor ganado y el costo real. CV > 0 = bajo presupuesto, CV < 0 = sobre presupuesto">
                <td className="py-2 font-semibold">Variación de Costo (CV)</td>
                <td className={`py-2 text-right font-semibold ${CV >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtMoney(CV, moneda)}
                </td>
              </tr>
              <tr className="bg-blue-50"
                  data-tooltip-id="sv-tooltip"
                  data-tooltip-content="SV (Variación de Cronograma): Diferencia entre el valor ganado y el valor planificado. SV > 0 = adelantado, SV < 0 = retrasado">
                <td className="py-2 font-semibold">Variación de Cronograma (SV)</td>
                <td className={`py-2 text-right font-semibold ${SV >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtMoney(SV, moneda)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Proyecciones */}
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold mb-3">Proyecciones</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"
                  data-tooltip-id="bac-tooltip"
                  data-tooltip-content="BAC (Presupuesto hasta la Conclusión): Es el presupuesto total aprobado para el proyecto, incluyendo gastos, horas hombre, contingencia y utilidad">
                <td className="py-2">Presupuesto hasta la Conclusión (BAC)</td>
                <td className="py-2 text-right font-medium">{fmtMoney(BAC, moneda)}</td>
              </tr>
              <tr className="border-b"
                  data-tooltip-id="eac-tooltip"
                  data-tooltip-content="EAC (Estimado a la Conclusión): Es la proyección del costo total del proyecto al finalizar, calculado en base al desempeño actual (CPI)">
                <td className="py-2">Estimado a la Conclusión (EAC)</td>
                <td className="py-2 text-right font-medium">{fmtMoney(EAC, moneda)}</td>
              </tr>
              <tr className="border-b"
                  data-tooltip-id="etc-tooltip"
                  data-tooltip-content="ETC (Estimado para Terminar): Es el costo estimado para completar el trabajo restante del proyecto">
                <td className="py-2">Estimado para Terminar (ETC)</td>
                <td className="py-2 text-right font-medium">{fmtMoney(ETC, moneda)}</td>
              </tr>
              <tr className="border-b bg-blue-50"
                  data-tooltip-id="vac-tooltip"
                  data-tooltip-content="VAC (Variación a la Conclusión): Diferencia entre el presupuesto original (BAC) y el costo proyectado al finalizar (EAC). VAC > 0 = bajo presupuesto, VAC < 0 = sobre presupuesto">
                <td className="py-2 font-semibold">Variación a la Conclusión (VAC)</td>
                <td className={`py-2 text-right font-semibold ${VAC >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtMoney(VAC, moneda)}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-xs text-gray-600" colSpan={2}>
                  {VAC >= 0 ? 'Proyecto bajo presupuesto' : 'Proyecto sobre presupuesto'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Índices de Desempeño */}
      <div className="rounded-xl border p-4 bg-white">
        <ReactECharts option={indicesOpciones} style={{ height: '300px' }} />
      </div>

      {/* Conclusión IA para índices */}
      <div className="rounded-xl border p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800">Conclusiones IA</h3>
          <div className="text-xs text-gray-500">Corte: {new Date().toLocaleDateString()}</div>
        </div>
        {iaLoading && <div className="text-sm text-gray-500">Analizando con IA...</div>}
        {iaError && <div className="text-sm text-red-600">{iaError}</div>}
        {!iaLoading && !iaError && iaAnalisis && (
          <div className="space-y-2 text-sm text-gray-800">
            <div><strong>Estado sugerido:</strong> {iaAnalisis.estado_sugerido} — {iaAnalisis.estado_sugerido_explicacion}</div>
            <div><strong>Riesgo:</strong> {iaAnalisis.nivel_riesgo} — {iaAnalisis.nivel_riesgo_explicacion}</div>
            {Array.isArray(iaAnalisis.recomendaciones) && iaAnalisis.recomendaciones.length > 0 && (
              <div>
                <strong>Recomendaciones:</strong>
                <ul className="list-disc pl-5 space-y-0.5">
                  {iaAnalisis.recomendaciones.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Información del Proyecto */}
      <div className="rounded-xl border p-4 bg-gray-50">
        <h3 className="font-semibold mb-3">Información General</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-600">Cliente</div>
            <div className="font-medium">{proyecto?.cliente || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Estado</div>
            <div className="font-medium capitalize">{proyecto?.estado || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Fecha Inicio</div>
            <div className="font-medium">{fmtDate(proyecto?.fecha_inicio)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Fecha Fin</div>
            <div className="font-medium">{fmtDate(proyecto?.fecha_fin)}</div>
          </div>
        </div>
      </div>

      {/* Tooltips */}
      <Tooltip id="bac-tooltip" place="top" />
      <Tooltip id="avance-tooltip" place="top" />
      <Tooltip id="cpi-tooltip" place="top" />
      <Tooltip id="spi-tooltip" place="top" />
      <Tooltip id="pv-tooltip" place="top" />
      <Tooltip id="ev-tooltip" place="top" />
      <Tooltip id="ac-tooltip" place="top" />
      <Tooltip id="cv-tooltip" place="top" />
      <Tooltip id="sv-tooltip" place="top" />
      <Tooltip id="eac-tooltip" place="top" />
      <Tooltip id="etc-tooltip" place="top" />
      <Tooltip id="vac-tooltip" place="top" />
    </div>
  );
}





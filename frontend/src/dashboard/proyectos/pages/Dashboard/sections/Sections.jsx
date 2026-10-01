import React from "react";

/**
 * Pequeño andamiaje para las secciones del Dashboard que aún
 * no tienen la funcionalidad completa. Nos sirve para habilitar
 * la navegación y dejar claro qué se mostrará en cada vista.
 */
const SectionScaffold = ({ emoji, title, description, bullets = [] }) => (
  <div className="space-y-6">
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">
          {emoji}
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </header>

    {bullets.length > 0 && (
      <section className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-5 text-sm text-slate-700">
        <p className="mb-3 font-semibold text-slate-800">Próximas capacidades:</p>
        <ul className="list-disc space-y-1 pl-5">
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    )}
  </div>
);

// ====== Mis Proyectos ======

export const ProyectosCronograma = () => (
  <SectionScaffold
    emoji="📅"
    title="Cronograma Maestro"
    description="Visualizarás los cronogramas activos, líneas base y alertas de ruta crítica para toda la cartera."
    bullets={[
      "Resumen de versiones EDT/Gantt por proyecto",
      "Alertas de retrasos, holguras y dependencias críticas",
      "Accesos rápidos para editar o importar cronogramas",
    ]}
  />
);

export const ProyectosCostos = () => (
  <SectionScaffold
    emoji="💰"
    title="Panel de Costos y EVM"
    description="Comparativo de BAC, PV, EV, AC y tendencias de CPI/SPI entre proyectos."
    bullets={[
      "Indicadores EVM consolidados",
      "Pronósticos EAC / ETC automatizados",
      "Alertas de sobrecostos por disciplina o contrato",
    ]}
  />
);

export const ProyectosRecursos = () => (
  <SectionScaffold
    emoji="👥"
    title="Gestión de Recursos"
    description="Disponibilidad, carga y desempeño del pool de recursos asignados."
    bullets={[
      "Mapa de asignaciones vs capacidad",
      "Alertas de sobrecarga ociosidad",
      "Integración con las órdenes de trabajo del cronograma",
    ]}
  />
);

export const ProyectosAvance = () => (
  <SectionScaffold
    emoji="📊"
    title="Estado de Avance"
    description="Seguimiento de hitos, entregables y variaciones por proyecto."
    bullets={[
      "Cumplimiento de hitos contractuales",
      "Curvas de progreso físico y financiero",
      "Panel de impedimentos y acciones correctivas",
    ]}
  />
);

// ====== Evaluaciones Estratégicas ======

export const EvaluacionesNueva = () => (
  <SectionScaffold
    emoji="🧮"
    title="Nueva Evaluación Estratégica"
    description="Configura escenarios, alternativas y ejecuta Monte Carlo, IA y métodos financieros."
    bullets={[
      "Selección del escenario (pesos ROI/VPN/Impacto/Riesgo)",
      "Carga de alternativas con drivers cuantitativos y cualitativos",
      "Ejecución de métodos: VPN, TIR, Payback, IA generativa y Random Forest",
    ]}
  />
);

export const EvaluacionesHistorial = () => (
  <SectionScaffold
    emoji="🗂️"
    title="Historial de Evaluaciones"
    description="Repositorio de evaluaciones ejecutadas, conclusiones y versionado."
    bullets={[
      "Filtros por escenario, responsable y fecha",
      "Comparativo de scores y recomendaciones",
      "Exportación para comités de inversión",
    ]}
  />
);

export const EvaluacionesEscenarios = () => (
  <SectionScaffold
    emoji="🎯"
    title="Escenarios y Políticas"
    description="Define los pesos y supuestos para cada tipo de evaluación estratégica."
    bullets={[
      "Matrices de ponderación personalizadas",
      "Plantillas para perfiles conservador, agresivo o balanceado",
      "Control de versiones y escenarios predeterminados",
    ]}
  />
);

// ====== Gestión de Riesgos ======

export const RiesgosRegistrar = () => (
  <SectionScaffold
    emoji="⚠️"
    title="Registro de Riesgos"
    description="Alta de riesgos, análisis PxI y asignación de planes de respuesta."
    bullets={[
      "Matriz de probabilidad / impacto",
      "Clasificación por categoría y fase",
      "Planes de mitigación con responsables y fechas",
    ]}
  />
);

export const RiesgosImpacto = () => (
  <SectionScaffold
    emoji="🧭"
    title="Análisis de Impacto"
    description="Evaluación cuantitativa de escenarios con simulaciones y stress testing."
    bullets={[
      "Monitoreo de riesgos críticos vs tolerancia",
      "Análisis de correlación con CPI/SPI",
      "Generación de alertas para continuidad del negocio",
    ]}
  />
);

// ====== Reportes Ejecutivos ======

export const ReportesProyecto = () => (
  <SectionScaffold
    emoji="📝"
    title="Reportes por Proyecto"
    description="Generación y seguimiento de informes ejecutivos individuales."
    bullets={[
      "Selección de plantillas PDF/Excel",
      "Datos del cliente, equipo y KPIs clave",
      "Integración con IA para narrativas ejecutivas",
    ]}
  />
);

export const ReportesComparativo = () => (
  <SectionScaffold
    emoji="📈"
    title="Reportes Comparativos"
    description="Vista consolidada de la cartera para comités y PMO."
    bullets={[
      "Ranking de desempeño",
      "Análisis de capacidad y priorización",
      "Exportación a presentaciones ejecutivas",
    ]}
  />
);

export const ReportesExportar = () => (
  <SectionScaffold
    emoji="📤"
    title="Generar PDF / Word"
    description="Centro de distribución para exportar informes y minutas formales."
    bullets={[
      "Descarga directa desde plantillas corporativas",
      "Historial de versiones y aprobaciones",
      "Integración con firma digital y correo",
    ]}
  />
);

// ====== Riesgos / Reportes overview ======

export const RiesgosPanel = () => (
  <SectionScaffold
    emoji="🛡️"
    title="Gestión Integral de Riesgos"
    description="Resumen general de riesgos abiertos, severidad y acciones en curso."
  />
);

export const ReportesPanel = () => (
  <SectionScaffold
    emoji="📂"
    title="Centro de Reportes"
    description="Punto único para revisar, programar y distribuir reportes ejecutivos."
  />
);




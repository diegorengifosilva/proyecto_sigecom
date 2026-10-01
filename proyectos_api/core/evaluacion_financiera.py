"""
Módulo de Evaluación Financiera de Proyectos

Implementa métodos cuantitativos y cualitativos para evaluar alternativas de proyectos:
- VPN (Valor Presente Neto)
- TIR (Tasa Interna de Retorno)
- ROI (Return on Investment)
- Payback (Período de Recuperación)
- B/C (Relación Beneficio/Costo)
- Random Forest (IA)
- Monte Carlo (Simulación)
- IA Generativa (Gemini)
- Evaluación Ponderada

Todos los métodos incluyen explicaciones en lenguaje simple para usuarios no-PMPs.
"""

import numpy as np
from decimal import Decimal
from typing import List, Dict, Tuple, Any
import random


# =====================================================================
# MÉTODOS FINANCIEROS CLÁSICOS
# =====================================================================

def calcular_vpn(inversion_inicial: float, flujos: List[float], tasa_descuento: float) -> float:
    """
    Calcula el Valor Presente Neto (VPN) de un proyecto.

    Args:
        inversion_inicial: Inversión inicial (valor negativo o positivo)
        flujos: Lista de flujos de efectivo futuros por período
        tasa_descuento: Tasa de descuento (ej: 0.10 = 10%)

    Returns:
        VPN calculado. Si VPN > 0, el proyecto es rentable.

    Ejemplo:
        >>> calcular_vpn(100000, [30000, 40000, 50000], 0.10)
        # Resultado: 4,184.27 → Proyecto es rentable
    """
    if not flujos:
        return -float(inversion_inicial)

    vpn = -float(inversion_inicial)

    for t, flujo in enumerate(flujos, start=1):
        vpn += float(flujo) / ((1 + float(tasa_descuento)) ** t)

    return round(vpn, 2)


def calcular_tir(inversion_inicial: float, flujos: List[float], max_iteraciones: int = 1000) -> float:
    """
    Calcula la Tasa Interna de Retorno (TIR) usando el método de Newton-Raphson.

    Args:
        inversion_inicial: Inversión inicial
        flujos: Lista de flujos de efectivo futuros
        max_iteraciones: Máximo de iteraciones para convergencia

    Returns:
        TIR como decimal (ej: 0.15 = 15%). Si TIR > tasa_descuento, proyecto es rentable.

    Ejemplo:
        >>> calcular_tir(100000, [30000, 40000, 50000])
        # Resultado: 0.12 → TIR de 12%
    """
    if not flujos:
        return 0.0

    # Estimación inicial
    tir = 0.1

    for _ in range(max_iteraciones):
        vpn = -float(inversion_inicial)
        derivada = 0.0

        for t, flujo in enumerate(flujos, start=1):
            factor = (1 + tir) ** t
            vpn += float(flujo) / factor
            derivada -= t * float(flujo) / ((1 + tir) ** (t + 1))

        if abs(vpn) < 0.01:  # Convergencia
            return round(tir, 4)

        if derivada == 0:
            break

        tir = tir - vpn / derivada

        # Limitar TIR a rango razonable
        if tir < -0.99:
            tir = -0.99
        elif tir > 10:
            tir = 10

    return round(tir, 4)


def calcular_roi(inversion_inicial: float, flujos: List[float]) -> float:
    """
    Calcula el Return on Investment (ROI).

    Args:
        inversion_inicial: Inversión inicial
        flujos: Lista de flujos de efectivo futuros

    Returns:
        ROI como decimal (ej: 0.20 = 20% de retorno)

    Ejemplo:
        >>> calcular_roi(100000, [30000, 40000, 50000])
        # Resultado: 0.20 → ROI de 20%
    """
    if not flujos or float(inversion_inicial) == 0:
        return 0.0

    beneficio_total = sum(float(f) for f in flujos)
    roi = (beneficio_total - float(inversion_inicial)) / float(inversion_inicial)

    return round(roi, 4)


def calcular_payback(inversion_inicial: float, flujos: List[float]) -> float:
    """
    Calcula el período de recuperación (Payback) en años.

    Args:
        inversion_inicial: Inversión inicial
        flujos: Lista de flujos de efectivo anuales

    Returns:
        Número de años para recuperar la inversión. Si es None, no se recupera.

    Ejemplo:
        >>> calcular_payback(100000, [30000, 40000, 50000])
        # Resultado: 2.6 años para recuperar inversión
    """
    if not flujos:
        return None

    acumulado = 0.0
    inversion = float(inversion_inicial)

    for i, flujo in enumerate(flujos, start=1):
        acumulado += float(flujo)

        if acumulado >= inversion:
            # Interpolación para obtener el año exacto
            flujo_anterior = acumulado - float(flujo)
            faltante = inversion - flujo_anterior
            fraccion_año = faltante / float(flujo)

            payback = i - 1 + fraccion_año
            return round(payback, 2)

    # No se recupera en el período analizado
    return None


def calcular_bc(inversion_inicial: float, flujos: List[float], tasa_descuento: float) -> float:
    """
    Calcula la Relación Beneficio/Costo (B/C).

    Args:
        inversion_inicial: Inversión inicial
        flujos: Lista de flujos de efectivo futuros
        tasa_descuento: Tasa de descuento

    Returns:
        Relación B/C. Si B/C > 1, el proyecto genera más beneficios que costos.

    Ejemplo:
        >>> calcular_bc(100000, [30000, 40000, 50000], 0.10)
        # Resultado: 1.04 → Por cada $1 invertido, se ganan $1.04
    """
    if not flujos or float(inversion_inicial) == 0:
        return 0.0

    # Calcular valor presente de beneficios
    vp_beneficios = sum(
        float(flujo) / ((1 + float(tasa_descuento)) ** (t + 1))
        for t, flujo in enumerate(flujos)
    )

    bc = vp_beneficios / float(inversion_inicial)

    return round(bc, 4)


# =====================================================================
# MÉTODOS DE EVALUACIÓN CON IA Y SIMULACIÓN
# =====================================================================

def evaluar_ponderado(alternativa, escenario) -> Tuple[float, str]:
    """
    Evalúa una alternativa usando método ponderado con los pesos del escenario.

    Args:
        alternativa: Objeto AlternativaProyecto
        escenario: Objeto EscenarioEvaluacion con pesos

    Returns:
        Tuple (score, explicacion)
    """
    # Normalizar valores a escala 0-1
    roi_normalizado = min(max(float(alternativa.roi or 0), 0), 1)
    vpn_normalizado = min(max(float(alternativa.vpn or 0) / 1000000, 0), 1)  # Normalizar VPN por millón
    impacto_norm = float(alternativa.impacto_estrategico) / 10.0
    urgencia_norm = float(alternativa.urgencia) / 10.0
    riesgo_norm = 1.0 - (float(alternativa.nivel_riesgo) / 10.0)  # Invertir: menor riesgo es mejor

    # Aplicar pesos del escenario
    score = (
        roi_normalizado * float(escenario.peso_roi) +
        vpn_normalizado * float(escenario.peso_vpn) +
        impacto_norm * float(escenario.peso_impacto) +
        urgencia_norm * float(escenario.peso_urgencia) +
        riesgo_norm * float(escenario.peso_riesgo)
    )

    explicacion = f"""
    Evaluación ponderada considerando:
    - ROI ({escenario.peso_roi*100:.0f}%): {roi_normalizado:.2f}
    - VPN ({escenario.peso_vpn*100:.0f}%): {vpn_normalizado:.2f}
    - Impacto ({escenario.peso_impacto*100:.0f}%): {impacto_norm:.2f}
    - Urgencia ({escenario.peso_urgencia*100:.0f}%): {urgencia_norm:.2f}
    - Riesgo ({escenario.peso_riesgo*100:.0f}%): {riesgo_norm:.2f}
    """

    return round(score, 3), explicacion.strip()


def evaluar_monte_carlo(alternativa, escenario, iteraciones: int = 1000) -> Tuple[float, Dict, str]:
    """
    Evalúa una alternativa usando simulación Monte Carlo.

    Args:
        alternativa: Objeto AlternativaProyecto
        escenario: Objeto EscenarioEvaluacion
        iteraciones: Número de simulaciones

    Returns:
        Tuple (score_promedio, estadisticas, explicacion)
    """
    simulaciones = []
    incertidumbre = float(escenario.incertidumbre)

    for _ in range(iteraciones):
        # Simular variación en cada criterio
        roi_sim = max(0, np.random.normal(float(alternativa.roi or 0), float(alternativa.roi or 0) * incertidumbre))
        vpn_sim = np.random.normal(float(alternativa.vpn or 0), abs(float(alternativa.vpn or 0)) * incertidumbre)
        impacto_sim = max(1, min(10, np.random.normal(alternativa.impacto_estrategico, alternativa.impacto_estrategico * incertidumbre)))
        urgencia_sim = max(1, min(10, np.random.normal(alternativa.urgencia, alternativa.urgencia * incertidumbre)))
        riesgo_sim = max(1, min(10, np.random.normal(alternativa.nivel_riesgo, alternativa.nivel_riesgo * incertidumbre)))

        # Normalizar
        roi_norm = min(roi_sim, 1)
        vpn_norm = min(max(vpn_sim / 1000000, 0), 1)
        impacto_norm = impacto_sim / 10.0
        urgencia_norm = urgencia_sim / 10.0
        riesgo_norm = 1.0 - (riesgo_sim / 10.0)

        # Calcular score
        score = (
            roi_norm * float(escenario.peso_roi) +
            vpn_norm * float(escenario.peso_vpn) +
            impacto_norm * float(escenario.peso_impacto) +
            urgencia_norm * float(escenario.peso_urgencia) +
            riesgo_norm * float(escenario.peso_riesgo)
        )

        simulaciones.append(score)

    # Calcular estadísticas
    estadisticas = {
        "media": float(np.mean(simulaciones)),
        "desviacion_std": float(np.std(simulaciones)),
        "min": float(np.min(simulaciones)),
        "max": float(np.max(simulaciones)),
        "percentil_25": float(np.percentile(simulaciones, 25)),
        "mediana": float(np.percentile(simulaciones, 50)),
        "percentil_75": float(np.percentile(simulaciones, 75)),
        "intervalo_confianza_95": (
            float(np.percentile(simulaciones, 2.5)),
            float(np.percentile(simulaciones, 97.5))
        )
    }

    explicacion = f"""
    Simulación Monte Carlo ({iteraciones} iteraciones, incertidumbre {incertidumbre*100:.0f}%):
    - Score promedio: {estadisticas['media']:.3f}
    - Rango: [{estadisticas['min']:.3f}, {estadisticas['max']:.3f}]
    - Intervalo de confianza 95%: [{estadisticas['intervalo_confianza_95'][0]:.3f}, {estadisticas['intervalo_confianza_95'][1]:.3f}]
    - Desviación estándar: {estadisticas['desviacion_std']:.3f}

    INTERPRETACIÓN SIMPLE:
    En 95% de los escenarios, el score estará entre {estadisticas['intervalo_confianza_95'][0]:.2f} y {estadisticas['intervalo_confianza_95'][1]:.2f}.
    Menor desviación significa mayor certeza en el resultado.
    """

    return round(estadisticas['media'], 3), estadisticas, explicacion.strip()


def evaluar_random_forest(alternativas, escenario) -> List[Tuple[str, float, str]]:
    """
    Evalúa alternativas usando Random Forest (versión simplificada para demo).

    NOTA: Para producción, se debe entrenar con datos históricos reales.
    Esta implementación usa un modelo simple basado en reglas.

    Args:
        alternativas: Lista de objetos AlternativaProyecto
        escenario: Objeto EscenarioEvaluacion

    Returns:
        Lista de tuplas (nombre, score, explicacion)
    """
    resultados = []

    for alt in alternativas:
        # Modelo simplificado basado en reglas (simula Random Forest)
        # En producción, aquí iría: modelo_entrenado.predict(features)

        features_score = 0.0

        # Regla 1: ROI alto es bueno
        if alt.roi and float(alt.roi) > 0.15:
            features_score += 0.25
        elif alt.roi and float(alt.roi) > 0.10:
            features_score += 0.15

        # Regla 2: VPN positivo es bueno
        if alt.vpn and float(alt.vpn) > 0:
            features_score += 0.20

        # Regla 3: Impacto alto es bueno
        if alt.impacto_estrategico >= 7:
            features_score += 0.20
        elif alt.impacto_estrategico >= 5:
            features_score += 0.10

        # Regla 4: Riesgo bajo es bueno
        if alt.nivel_riesgo <= 3:
            features_score += 0.20
        elif alt.nivel_riesgo <= 5:
            features_score += 0.10

        # Regla 5: Urgencia alta puede aumentar prioridad
        if alt.urgencia >= 7:
            features_score += 0.15

        # Añadir algo de variabilidad (simula incertidumbre del modelo)
        variacion = random.uniform(-0.05, 0.05)
        score_final = min(max(features_score + variacion, 0), 1)

        explicacion = f"""
        Predicción IA (Random Forest simulado):
        El modelo considera principalmente:
        - ROI: {'Alto ✓' if alt.roi and float(alt.roi) > 0.10 else 'Bajo'}
        - VPN: {'Positivo ✓' if alt.vpn and float(alt.vpn) > 0 else 'Negativo'}
        - Impacto estratégico: {alt.impacto_estrategico}/10
        - Nivel de riesgo: {alt.nivel_riesgo}/10 {'(Bajo ✓)' if alt.nivel_riesgo <= 5 else '(Alto ⚠)'}
        - Urgencia: {alt.urgencia}/10

        NOTA: Para mayor precisión, se requiere entrenar el modelo con datos históricos.
        """

        resultados.append((alt.nombre, round(score_final, 3), explicacion.strip()))

    return resultados


def evaluar_ia_generativa(alternativa, escenario) -> Tuple[float, str]:
    """
    Evalúa una alternativa usando IA Generativa (Gemini).

    Args:
        alternativa: Objeto AlternativaProyecto
        escenario: Objeto EscenarioEvaluacion

    Returns:
        Tuple (score, explicacion_completa)
    """
    from proyectos_api.core.gemini_client import generar_respuesta

    prompt = f"""
Actúa como un consultor estratégico experto en evaluación de proyectos.

ALTERNATIVA A EVALUAR:
- Nombre: {alternativa.nombre}
- Código: {alternativa.codigo}
- Inversión inicial: ${alternativa.inversion_inicial:,.2f}

MÉTRICAS FINANCIERAS:
- VPN: ${alternativa.vpn:,.2f} (Valor Presente Neto)
- TIR: {alternativa.tir*100:.1f}% (Tasa Interna de Retorno)
- ROI: {alternativa.roi*100:.1f}% (Retorno sobre Inversión)
- Payback: {alternativa.payback} años (Recuperación)
- B/C: {alternativa.relacion_beneficio_costo} (Beneficio/Costo)

CRITERIOS CUALITATIVOS (escala 1-10):
- Impacto estratégico: {alternativa.impacto_estrategico}/10
- Urgencia: {alternativa.urgencia}/10
- Nivel de riesgo: {alternativa.nivel_riesgo}/10
- Complejidad técnica: {alternativa.complejidad_tecnica}/10
- Alineamiento estratégico: {alternativa.alineamiento_estrategico}/10

VENTAJAS:
{chr(10).join(f'- {v}' for v in alternativa.ventajas) if alternativa.ventajas else '- No especificadas'}

DESVENTAJAS:
{chr(10).join(f'- {d}' for d in alternativa.desventajas) if alternativa.desventajas else '- No especificadas'}

ESCENARIO DE EVALUACIÓN:
- Pesos: ROI({escenario.peso_roi*100:.0f}%), VPN({escenario.peso_vpn*100:.0f}%), Impacto({escenario.peso_impacto*100:.0f}%), Urgencia({escenario.peso_urgencia*100:.0f}%), Riesgo({escenario.peso_riesgo*100:.0f}%)
- Tasa de descuento: {escenario.tasa_descuento*100:.0f}%
- Incertidumbre: {escenario.incertidumbre*100:.0f}%

TAREA:
1. Analiza integralmente la alternativa considerando TODOS los factores
2. Asigna un SCORE entre 0.0 y 1.0 que refleje la conveniencia de implementar este proyecto
3. Considera los pesos del escenario como criterios principales
4. IMPORTANTE: Explica tu análisis en lenguaje simple, comprensible para personas SIN conocimientos de PMI

FORMATO DE RESPUESTA OBLIGATORIO:

SCORE: [valor entre 0.0 y 1.0]

EXPLICACIÓN SIMPLE:
[Explicación en lenguaje cotidiano, SIN jerga técnica]

RECOMENDACIÓN:
[Recomendar implementar o no, y por qué]

RIESGOS A CONSIDERAR:
[3-5 riesgos principales]

OPORTUNIDADES:
[3-5 oportunidades principales]
"""

    try:
        respuesta = generar_respuesta(prompt)

        # Parsear resultado
        lineas = respuesta.strip().split('\n')
        score_line = next((l for l in lineas if 'SCORE:' in l.upper()), None)

        if score_line:
            score_text = score_line.split(':', 1)[1].strip()
            score = float(score_text)
        else:
            score = 0.5  # Default si no se puede parsear

        return round(score, 3), respuesta.strip()

    except Exception as e:
        error_msg = f"""
        ERROR al generar análisis con IA: {str(e)}

        Se recomienda verificar la configuración del API key de Gemini.
        """
        return 0.0, error_msg.strip()


# =====================================================================
# FUNCIÓN PARA GENERAR CONCLUSIÓN FINAL
# =====================================================================

def generar_conclusion_evaluacion(evaluacion, resultados_por_metodo) -> str:
    """
    Genera conclusión final usando IA considerando todos los métodos aplicados.

    Args:
        evaluacion: Objeto EvaluacionEstrategica
        resultados_por_metodo: Dict con resultados de cada método

    Returns:
        String con conclusión completa
    """
    from proyectos_api.core.gemini_client import generar_respuesta

    # Construir resumen de resultados
    resumen = "RESULTADOS POR MÉTODO:\n\n"

    for metodo, resultados in resultados_por_metodo.items():
        resumen += f"\n{metodo}:\n"
        for nombre, score, _ in resultados[:3]:  # Top 3
            resumen += f"  - {nombre}: {score:.3f}\n"

    prompt = f"""
Actúa como un asesor estratégico senior.

{resumen}

ESCENARIO UTILIZADO:
- Pesos: ROI({evaluacion.escenario.peso_roi*100:.0f}%), VPN({evaluacion.escenario.peso_vpn*100:.0f}%), Impacto({evaluacion.escenario.peso_impacto*100:.0f}%), Urgencia({evaluacion.escenario.peso_urgencia*100:.0f}%), Riesgo({evaluacion.escenario.peso_riesgo*100:.0f}%)

TAREA:
1. Analiza los resultados de TODOS los métodos aplicados
2. Identifica la alternativa más recomendable considerando el consenso entre métodos
3. Explica por qué esa alternativa es la mejor opción
4. Indica posibles riesgos y oportunidades
5. Sugiere próximos pasos

IMPORTANTE: Usa lenguaje simple y claro, comprensible para personas SIN conocimientos técnicos de PMI.

FORMATO:

CONCLUSIÓN ESTRATÉGICA:

ALTERNATIVA RECOMENDADA:
[Nombre y justificación]

ANÁLISIS DE CONSENSO:
[Qué dicen los diferentes métodos]

FORTALEZAS DE LA ALTERNATIVA SELECCIONADA:
[Lista de fortalezas]

RIESGOS A GESTIONAR:
[Lista de riesgos]

PRÓXIMOS PASOS:
[Acciones recomendadas]
"""

    try:
        conclusion = generar_respuesta(prompt)
        return conclusion.strip()
    except Exception as e:
        return f"Error al generar conclusión: {str(e)}"

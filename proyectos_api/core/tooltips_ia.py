

# =====================================================================
# SISTEMA DE TOOLTIPS INTELIGENTES
# =====================================================================

# Diccionario base de KPIs con descripciones técnicas
KPIS_BASE = {
    # Métricas de Earned Value Management
    'CPI': {
        'nombre': 'Cost Performance Index',
        'formula': 'CPI = EV / AC',
        'rango_bueno': '> 1.0',
        'categoria': 'Costos'
    },
    'SPI': {
        'nombre': 'Schedule Performance Index',
        'formula': 'SPI = EV / PV',
        'rango_bueno': '> 1.0',
        'categoria': 'Cronograma'
    },
    'EV': {
        'nombre': 'Earned Value (Valor Ganado)',
        'formula': 'EV = % Avance × Presupuesto',
        'unidad': 'USD',
        'categoria': 'Costos'
    },
    'PV': {
        'nombre': 'Planned Value (Valor Planificado)',
        'formula': 'PV según cronograma base',
        'unidad': 'USD',
        'categoria': 'Cronograma'
    },
    'AC': {
        'nombre': 'Actual Cost (Costo Real)',
        'formula': 'AC = Suma de gastos reales',
        'unidad': 'USD',
        'categoria': 'Costos'
    },
    'CV': {
        'nombre': 'Cost Variance (Variación de Costo)',
        'formula': 'CV = EV - AC',
        'rango_bueno': '> 0',
        'unidad': 'USD',
        'categoria': 'Costos'
    },
    'SV': {
        'nombre': 'Schedule Variance (Variación de Cronograma)',
        'formula': 'SV = EV - PV',
        'rango_bueno': '> 0',
        'unidad': 'USD',
        'categoria': 'Cronograma'
    },
    'EAC': {
        'nombre': 'Estimate at Completion',
        'formula': 'EAC = BAC / CPI',
        'unidad': 'USD',
        'categoria': 'Pronóstico'
    },
    'ETC': {
        'nombre': 'Estimate to Complete',
        'formula': 'ETC = EAC - AC',
        'unidad': 'USD',
        'categoria': 'Pronóstico'
    },
    'VAC': {
        'nombre': 'Variance at Completion',
        'formula': 'VAC = BAC - EAC',
        'unidad': 'USD',
        'categoria': 'Pronóstico'
    },
    'TCPI': {
        'nombre': 'To-Complete Performance Index',
        'formula': 'TCPI = (BAC - EV) / (BAC - AC)',
        'rango_bueno': '< 1.0',
        'categoria': 'Pronóstico'
    },

    # Métricas de Evaluación Financiera
    'VPN': {
        'nombre': 'Valor Presente Neto',
        'formula': 'VPN = -Inversión + Σ(Flujo_t / (1+tasa)^t)',
        'rango_bueno': '> 0',
        'unidad': 'USD',
        'categoria': 'Evaluación'
    },
    'TIR': {
        'nombre': 'Tasa Interna de Retorno',
        'formula': 'Tasa donde VPN = 0',
        'rango_bueno': '> tasa_descuento',
        'unidad': '%',
        'categoria': 'Evaluación'
    },
    'ROI': {
        'nombre': 'Return on Investment',
        'formula': 'ROI = (Beneficios - Inversión) / Inversión',
        'unidad': '%',
        'categoria': 'Evaluación'
    },
    'Payback': {
        'nombre': 'Período de Recuperación',
        'formula': 'Tiempo hasta recuperar inversión',
        'unidad': 'años',
        'categoria': 'Evaluación'
    },
    'BC': {
        'nombre': 'Relación Beneficio/Costo',
        'formula': 'B/C = VP(Beneficios) / Inversión',
        'rango_bueno': '> 1.0',
        'categoria': 'Evaluación'
    }
}


def generar_tooltip_con_ia(nombre_kpi: str, valor=None, contexto=None) -> dict:
    """
    Genera un tooltip inteligente usando IA para un KPI específico.

    Args:
        nombre_kpi: Nombre del KPI (ej: 'CPI', 'SPI', 'VPN')
        valor: Valor actual del KPI (opcional)
        contexto: Contexto adicional del proyecto (opcional)

    Returns:
        dict con:
            - titulo: Nombre del KPI
            - explicacion_simple: Explicación en lenguaje cotidiano
            - que_es: Definición técnica
            - como_se_calcula: Fórmula y metodología
            - como_interpretarlo: Guía de interpretación
            - ejemplo_practico: Ejemplo concreto
            - que_hacer: Acciones recomendadas (si aplica)
    """

    # Obtener info base del KPI
    kpi_info = KPIS_BASE.get(nombre_kpi.upper(), {})

    if not kpi_info:
        return {
            'titulo': nombre_kpi,
            'explicacion_simple': f'KPI: {nombre_kpi}',
            'que_es': 'Indicador de proyecto',
            'como_se_calcula': 'N/A',
            'como_interpretarlo': 'Consultar documentación',
            'ejemplo_practico': '',
            'que_hacer': ''
        }

    # Construir prompt para IA
    prompt = f"""
Actúa como un experto en gestión de proyectos que explica conceptos a personas SIN conocimientos técnicos.

KPI: {kpi_info['nombre']} ({nombre_kpi})
Categoría: {kpi_info.get('categoria', 'General')}
Fórmula técnica: {kpi_info.get('formula', 'N/A')}
"""

    if valor is not None:
        prompt += f"Valor actual: {valor}\n"

    if contexto:
        prompt += f"Contexto: {contexto}\n"

    prompt += f"""
TAREA: Genera un tooltip educativo y práctico para este KPI.

FORMATO DE RESPUESTA OBLIGATORIO:

EXPLICACIÓN SIMPLE:
[En 1-2 frases, explica qué es este indicador usando lenguaje cotidiano, SIN jerga técnica. Como si le explicaras a alguien que nunca ha gestionado un proyecto.]

QUÉ ES:
[Definición técnica pero accesible. Máximo 3 frases.]

CÓMO SE CALCULA:
[Explica la fórmula de forma intuitiva. Si hay {kpi_info.get('formula')}, explícala paso a paso.]

CÓMO INTERPRETARLO:
"""

    if kpi_info.get('rango_bueno'):
        prompt += f"- Valores buenos: {kpi_info['rango_bueno']}\n"

    prompt += """[Explica qué significan valores altos, bajos, o específicos. Usa ejemplos concretos.]

EJEMPLO PRÁCTICO:
[Da un ejemplo numérico concreto y fácil de entender. Ej: "Si tu CPI es 0.85, significa que..."]
"""

    if valor is not None:
        prompt += f"""
QUÉ HACER CON ESTE VALOR ({valor}):
[Basándote en el valor actual, recomienda 2-3 acciones específicas]
"""

    try:
        from proyectos_api.core.gemini_client import generar_respuesta
        respuesta = generar_respuesta(prompt)

        # Parsear respuesta
        secciones = {}
        lineas = respuesta.strip().split('\n')

        seccion_actual = None
        contenido_actual = []

        for linea in lineas:
            linea_upper = linea.strip().upper()

            if 'EXPLICACIÓN SIMPLE:' in linea_upper:
                if seccion_actual:
                    secciones[seccion_actual] = '\n'.join(contenido_actual).strip()
                seccion_actual = 'explicacion_simple'
                contenido_actual = []
            elif 'QUÉ ES:' in linea_upper:
                if seccion_actual:
                    secciones[seccion_actual] = '\n'.join(contenido_actual).strip()
                seccion_actual = 'que_es'
                contenido_actual = []
            elif 'CÓMO SE CALCULA:' in linea_upper:
                if seccion_actual:
                    secciones[seccion_actual] = '\n'.join(contenido_actual).strip()
                seccion_actual = 'como_se_calcula'
                contenido_actual = []
            elif 'CÓMO INTERPRETARLO:' in linea_upper:
                if seccion_actual:
                    secciones[seccion_actual] = '\n'.join(contenido_actual).strip()
                seccion_actual = 'como_interpretarlo'
                contenido_actual = []
            elif 'EJEMPLO PRÁCTICO:' in linea_upper:
                if seccion_actual:
                    secciones[seccion_actual] = '\n'.join(contenido_actual).strip()
                seccion_actual = 'ejemplo_practico'
                contenido_actual = []
            elif 'QUÉ HACER' in linea_upper:
                if seccion_actual:
                    secciones[seccion_actual] = '\n'.join(contenido_actual).strip()
                seccion_actual = 'que_hacer'
                contenido_actual = []
            else:
                if linea.strip():
                    contenido_actual.append(linea.strip())

        # Agregar última sección
        if seccion_actual and contenido_actual:
            secciones[seccion_actual] = '\n'.join(contenido_actual).strip()

        return {
            'titulo': f"{kpi_info['nombre']} ({nombre_kpi})",
            'explicacion_simple': secciones.get('explicacion_simple', 'Indicador de proyecto'),
            'que_es': secciones.get('que_es', kpi_info['nombre']),
            'como_se_calcula': secciones.get('como_se_calcula', kpi_info.get('formula', 'N/A')),
            'como_interpretarlo': secciones.get('como_interpretarlo', 'Consultar con PM'),
            'ejemplo_practico': secciones.get('ejemplo_practico', ''),
            'que_hacer': secciones.get('que_hacer', ''),
            'categoria': kpi_info.get('categoria', 'General'),
            'formula_tecnica': kpi_info.get('formula', ''),
            'rango_bueno': kpi_info.get('rango_bueno', ''),
            'unidad': kpi_info.get('unidad', '')
        }

    except Exception as e:
        # Fallback: retornar tooltip básico sin IA
        return {
            'titulo': f"{kpi_info['nombre']} ({nombre_kpi})",
            'explicacion_simple': f"{kpi_info['nombre']}: {kpi_info.get('formula', 'Indicador de proyecto')}",
            'que_es': kpi_info['nombre'],
            'como_se_calcula': kpi_info.get('formula', 'N/A'),
            'como_interpretarlo': f"Valores buenos: {kpi_info.get('rango_bueno', 'Consultar con PM')}",
            'ejemplo_practico': f'Error al generar ejemplo: {str(e)}',
            'que_hacer': '',
            'categoria': kpi_info.get('categoria', 'General'),
            'formula_tecnica': kpi_info.get('formula', ''),
            'rango_bueno': kpi_info.get('rango_bueno', ''),
            'unidad': kpi_info.get('unidad', '')
        }


def generar_todos_tooltips() -> dict:
    """
    Genera tooltips para TODOS los KPIs de la aplicación.

    NOTA: Esta función puede tardar varios minutos ya que llama a la IA
    para cada KPI. Se recomienda cachear los resultados.

    Returns:
        dict: {nombre_kpi: tooltip_dict, ...}
    """
    tooltips = {}

    print(f"Generando tooltips para {len(KPIS_BASE)} KPIs...")

    for i, nombre_kpi in enumerate(KPIS_BASE.keys(), 1):
        print(f"  [{i}/{len(KPIS_BASE)}] Generando tooltip para {nombre_kpi}...")

        try:
            tooltip = generar_tooltip_con_ia(nombre_kpi)
            tooltips[nombre_kpi] = tooltip
        except Exception as e:
            print(f"  Error en {nombre_kpi}: {str(e)}")
            tooltips[nombre_kpi] = {
                'titulo': nombre_kpi,
                'explicacion_simple': f'Error al generar tooltip: {str(e)}',
                'error': str(e)
            }

    print(f"✓ {len(tooltips)} tooltips generados")

    return tooltips


def obtener_tooltip_kpi(nombre_kpi: str, usar_cache=True) -> dict:
    """
    Obtiene el tooltip de un KPI específico.

    Args:
        nombre_kpi: Nombre del KPI
        usar_cache: Si es False, regenera con IA. Si es True, usa cache (más rápido)

    Returns:
        dict con información del tooltip
    """
    nombre_kpi = nombre_kpi.upper()

    if not usar_cache:
        return generar_tooltip_con_ia(nombre_kpi)

    # Si se usa cache, retornar tooltip básico o generarlo
    # En producción, aquí se consultaría un cache (Redis, archivo, DB)
    return generar_tooltip_con_ia(nombre_kpi)

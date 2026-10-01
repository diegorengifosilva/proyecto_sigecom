"""
Cliente Gemini (placeholder) para mantener compatibilidad.
Cuando IA_PROVIDER=ollama, este módulo no se usa para generación, solo para utilidades.
"""

import os
from datetime import datetime
from dotenv import load_dotenv

from proyectos_api.core.ia_parser import parsear_analisis_proyecto

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")
IA_HABILITADA = bool(API_KEY and not API_KEY.endswith("ejemplo"))


def ia_disponible() -> bool:
    return IA_HABILITADA


def generar_respuesta(prompt: str, **kwargs) -> str:
    return (
        "IA (Gemini) no disponible en este entorno. Configura GOOGLE_API_KEY con facturación "
        "o usa IA_PROVIDER=ollama para desarrollo local."
    )


def obtener_metricas_ev_texto(proyecto):
    try:
        from proyectos_api.models import CurvaEv
        ultima_curva = CurvaEv.objects.filter(proyecto=proyecto).order_by('-fecha').first()
        if ultima_curva:
            cpi = ultima_curva.ev / ultima_curva.ac if ultima_curva.ac > 0 else 0
            spi = ultima_curva.ev / ultima_curva.pv if ultima_curva.pv > 0 else 0
            cv = ultima_curva.ev - ultima_curva.ac
            sv = ultima_curva.ev - ultima_curva.pv
            return f"""
- PV (Valor Planificado): ${ultima_curva.pv:,.2f}
- EV (Valor Ganado): ${ultima_curva.ev:,.2f}
- AC (Costo Actual): ${ultima_curva.ac:,.2f}
- CPI: {cpi:.2f}
- SPI: {spi:.2f}
- CV: ${cv:,.2f}
- SV: ${sv:,.2f}
- Fecha última actualización: {ultima_curva.fecha.strftime('%d/%m/%Y')}
"""
        return "No hay datos de métricas EV disponibles aún."
    except Exception as e:
        return f"Error al obtener métricas: {str(e)}"


def analizar_estado_proyecto(proyecto):
    """
    Fallback simple: devuelve un dict con estado y riesgo actuales,
    usando el parser para mantener el contrato de salida.
    """
    analisis_texto = f"""
ESTADO_SUGERIDO: {proyecto.estado or 'en_progreso'}
EXPLICACION_ESTADO: IA Gemini no disponible en este entorno.
NIVEL_RIESGO: MEDIO
EXPLICACION_RIESGO: IA Gemini no disponible en este entorno.
RECOMENDACIONES:
1. Configura GOOGLE_API_KEY con facturación o usa IA_PROVIDER=ollama para desarrollo.
ANALISIS_COMPLETO:
IA Gemini no disponible en este entorno.
"""
    return parsear_analisis_proyecto(analisis_texto)


def generar_analisis_informe(proyecto, tipo_informe='resumen_ejecutivo', contexto=None):
    return (
        "IA Gemini no disponible en este entorno. Configura GOOGLE_API_KEY con facturación "
        "o usa IA_PROVIDER=ollama para desarrollo."
    )

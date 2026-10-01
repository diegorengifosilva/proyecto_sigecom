"""
Proveedor de IA configurable.
Permite usar Gemini (producción) u Ollama local (pruebas sin costo).
"""

import os
import requests
from dotenv import load_dotenv

from proyectos_api.core import gemini_client
from proyectos_api.core.ia_parser import parsear_analisis_proyecto

load_dotenv()

IA_PROVIDER = os.getenv("IA_PROVIDER", "gemini").lower()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")


def _prompt_estado_proyecto(proyecto):
    """Construye el prompt estándar para análisis de estado."""
    metricas_texto = gemini_client.obtener_metricas_ev_texto(proyecto)
    return f"""
Actúa como un consultor PMI CERTIFICADO (PMP, PMI-ACP, PgMP) que debe explicar el estado de un proyecto a PERSONAS SIN CONOCIMIENTOS TÉCNICOS. Usa terminología de Project Management (PMI) de forma clara, sin jerga innecesaria, y con enfoque ejecutivo. NO incluyas etiquetas ni repitas secciones en el texto (no escribas “ESTADO_SUGERIDO:” dentro de las explicaciones, solo en la cabecera indicada abajo).

Tono y detalle:
- Riesgo BAJO: titular + 1 frase (máx. 20 palabras); máx. 2 recomendaciones concretas o “Sin recomendaciones”. Análisis completo: 1 frase.
- Riesgo MEDIO o ALTO: estado máx. 1 frase; riesgo máx. 2 frases (máx. 60 palabras). Recomendaciones máx. 5, concretas (acción + responsable + plazo). Análisis completo: 2-3 frases concisas.
- Estado sugerido: siempre breve (máx. 1 frase), indistintamente del riesgo.
- No repitas etiquetas ni secciones. Entrega cada campo una sola vez.
- Ignora texto irrelevante o de otros dominios; responde solo con información del proyecto y sus métricas (CPI, SPI, CV, SV, fechas, presupuesto).

DATOS DEL PROYECTO:
- Nombre: {proyecto.nombre}
- Código: {proyecto.codigo}
- Estado actual: {proyecto.estado}
- Presupuesto total: ${proyecto.presupuesto_total:,.2f}
- Fecha inicio: {proyecto.fecha_inicio}
- Fecha fin planificada: {proyecto.fecha_fin}
- Tipo: {proyecto.get_tipo_proyecto_display()}

MÉTRICAS TÉCNICAS (Earned Value Management):
{metricas_texto}

TAREAS:
1. Evalúa si el estado actual es correcto o debería cambiarse
2. Calcula el nivel de riesgo: BAJO, MEDIO, ALTO, CRÍTICO (criterio PMI)
3. Genera 5 recomendaciones ESPECÍFICAS y ACCIONABLES (incluye responsable y plazo)
4. Proporciona un análisis completo

FORMATO DE RESPUESTA OBLIGATORIO:

ESTADO_SUGERIDO: [en_planificacion|en_progreso|en_pausa|completado|cancelado]

EXPLICACION_ESTADO:
[Máx. 20 palabras. Lenguaje SIMPLE y breve. Sin jerga técnica.]

NIVEL_RIESGO: [BAJO|MEDIO|ALTO|CRITICO]

EXPLICACION_RIESGO:
[Riesgo BAJO: máx. 20 palabras. Riesgo MEDIO/ALTO: máx. 60 palabras. Claro y directo.]

RECOMENDACIONES:
Riesgo BAJO: máx. 2 ítems o “Sin recomendaciones”.
Riesgo MEDIO/ALTO: máx. 5 ítems.
1. [Acción concreta + responsable + plazo]
2. [Acción concreta + responsable + plazo]
3. [Acción concreta + responsable + plazo]
4. [Acción concreta + responsable + plazo]
5. [Acción concreta + responsable + plazo]

ANALISIS_COMPLETO:
[Riesgo BAJO: 1 frase. Riesgo MEDIO/ALTO: 2-3 frases concisas. No repitas campos previos.]

GLOSARIO:
CPI: [...]
SPI: [...]
EV: [...]
PV: [...]
AC: [...]
"""


def _analizar_con_ollama(prompt: str):
    """
    Llama a un modelo local en Ollama para evitar costo.
    """
    try:
        resp = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "stream": False,
                "messages": [
                    {
                        "role": "system",
                        "content": "Eres un consultor PMO certificado (PMP, PMI-ACP) que responde en español claro.",
                    },
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        # Ollama devuelve el texto en data["message"]["content"] o en "response"
        texto = (
            data.get("message", {}).get("content")
            or data.get("response")
            or ""
        )
        return texto
    except Exception as e:
        return f"Error al generar contenido con IA local (Ollama): {e}"


def analizar_estado_proyecto(proyecto):
    """
    Punto único de entrada para análisis IA.
    Respeta el contrato de salida usado por el frontend.
    """
    prompt = _prompt_estado_proyecto(proyecto)

    # Provider: Gemini (prod) o Ollama (dev sin costo)
    if IA_PROVIDER == "ollama":
        texto = _analizar_con_ollama(prompt)
        # Si falló el servidor local, avisa y no rompe el flujo
        if texto.startswith("Error al generar contenido"):
            return {
                "estado_sugerido": proyecto.estado or "en_progreso",
                "estado_sugerido_explicacion": texto,
                "nivel_riesgo": "DESCONOCIDO",
                "nivel_riesgo_explicacion": "Sin análisis automático (Ollama no disponible).",
                "recomendaciones": ["Arranca el servicio Ollama en localhost:11434 o revisa el modelo configurado."],
                "analisis_completo": texto,
                "glosario": {},
            }
        return parsear_analisis_proyecto(texto)

    # Default: Gemini
    return gemini_client.analizar_estado_proyecto(proyecto)

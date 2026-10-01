"""
Parser y saneador de salidas de IA (separado del proveedor).
Aplica limpieza de etiquetas, limita por oraciones y evita duplicados.
"""

import re
import unicodedata


def _limit_sentences(text, max_sent):
    partes = re.split(r'(?<=[.!?])\s+', text.strip())
    partes = [p for p in partes if p]
    if len(partes) <= max_sent:
        return text.strip()
    return " ".join(partes[:max_sent]).strip()


def _limit_and_close(text, max_sent):
    """Limita a N oraciones completas (sin partir frases) y asegura cierre con punto."""
    if not text:
        return ''
    limitado = _limit_sentences(text, max_sent)
    limitado = limitado.strip()
    if limitado and limitado[-1] not in '.!?':
        limitado += '.'
    return limitado


def _clean_tags(text):
    if not text:
        return ''
    patrones = [
        r'ESTADO_SUGERIDO[:\-\s]*',
        r'EXPLICACION_ESTADO[:\-\s]*',
        r'NIVEL_RIESGO[:\-\s]*',
        r'EXPLICACION_RIESGO[:\-\s]*',
        r'RECOMENDACIONES[:\-\s]*',
        r'ANALISIS_COMPLETO[:\-\s]*',
        r'GLOSARIO[:\-\s]*',
        r'EXPLANATION_STATE[:\-\s]*',
        r'EXPLANATION_RISK[:\-\s]*',
        r'RISK[:\-\s]*',
    ]
    limpio = text
    for p in patrones:
        limpio = re.sub(p, '', limpio, flags=re.IGNORECASE)
    return limpio.strip(" -:\n\t")


def _strip_meta_blocks(text):
    """Elimina líneas que arrastran etiquetas o secciones duplicadas."""
    if not text:
        return ''
    patrones = re.compile(r'(ESTADO|NIVEL_RIESGO|RECOMENDACIONES|ANALISIS_COMPLETO|EXPLICACION|EXPLANATION)', re.IGNORECASE)
    lineas = [l.strip() for l in text.splitlines() if l.strip() and not patrones.search(l)]
    return " ".join(lineas).strip()


def _strip_prefix_tokens(text, tokens):
    """Elimina tokens iniciales como estados o riesgos, iterativamente."""
    if not text:
        return ''
    out = text
    changed = True
    while changed:
        changed = False
        for t in tokens:
            if not t:
                continue
            nuevo = re.sub(rf'^\s*{re.escape(t)}\s*(—|-|–)?\s*', '', out, flags=re.IGNORECASE)
            if nuevo != out:
                out = nuevo
                changed = True
    return out.strip()


def parsear_analisis_proyecto(respuesta):
    """
    Parsea la respuesta de IA generativa a un dict estructurado.
    Limpia etiquetas y acota las explicaciones por oraciones completas.
    """
    def _normalize_estado(estado_raw):
        if not estado_raw:
            return 'en_progreso'
        tokens = re.split(r'[—\-–]|,|\s+', estado_raw.strip())
        for t in tokens:
            tl = t.lower()
            if tl in ['en_progreso', 'en_planificacion', 'en_pausa', 'completado', 'cancelado']:
                return tl
        return tokens[0].lower() if tokens else 'en_progreso'

    def _normalize_riesgo(riesgo_raw):
        if not riesgo_raw:
            return 'MEDIO'
        tokens = re.split(r'[—\-–]|,|\s+', riesgo_raw.strip())
        for t in tokens:
            tu = t.upper()
            if tu in ['BAJO', 'MEDIO', 'ALTO', 'CRITICO', 'CRÍTICO']:
                return 'CRITICO' if tu == 'CRÍTICO' else tu
        return riesgo_raw.upper()

    def _sanitize(result):
        # Normalizar estado y riesgo crudos
        estado_norm = _normalize_estado(result.get('estado_sugerido'))
        riesgo = _normalize_riesgo(result.get('nivel_riesgo'))
        result['estado_sugerido'] = estado_norm
        result['nivel_riesgo'] = riesgo
        estados_tokens = ['en_progreso', 'en_planificacion', 'en_pausa', 'completado', 'cancelado']
        riesgo_tokens = ['BAJO', 'MEDIO', 'ALTO', 'CRITICO', 'CRÍTICO']

        # Normalizar explicaciones: oraciones completas y breve
        def _after_first_dash(text):
            # Si hay "—" o "-" y lo de antes es ruido repetido, quedarnos con el resto
            for sep in ['—', '–', '-']:
                if sep in text:
                    partes = text.split(sep, 1)
                    if len(partes) == 2:
                        return partes[1].strip()
            return text

        estado_exp_raw = _strip_prefix_tokens(result.get('estado_sugerido_explicacion', ''), [estado_norm] + estados_tokens)
        estado_exp_raw = _after_first_dash(estado_exp_raw)
        result['estado_sugerido_explicacion'] = _clean_tags(_limit_and_close(estado_exp_raw, 3))
        if riesgo == 'BAJO':
            riesgo_exp_raw = _strip_prefix_tokens(result.get('nivel_riesgo_explicacion', ''), riesgo_tokens + estados_tokens)
            riesgo_exp_raw = _after_first_dash(riesgo_exp_raw)
            result['nivel_riesgo_explicacion'] = _clean_tags(_limit_and_close(riesgo_exp_raw, 1))
        else:
            riesgo_exp_raw = _strip_prefix_tokens(result.get('nivel_riesgo_explicacion', ''), riesgo_tokens + estados_tokens)
            riesgo_exp_raw = _after_first_dash(riesgo_exp_raw)
            result['nivel_riesgo_explicacion'] = _clean_tags(_limit_and_close(riesgo_exp_raw, 4))

        recs = result.get('recomendaciones') or []
        recs = [_clean_tags(r) for r in recs if r]
        # quitar duplicados y ruido
        vistos = set()
        recs_limpias = []
        for r in recs:
            clave = r.lower().strip()
            if not clave or clave in ('sin generadas', 'sin recomendaciones'):
                continue
            if clave in vistos:
                continue
            vistos.add(clave)
            recs_limpias.append(r)
        recs = recs_limpias
        if riesgo == 'BAJO' and not recs:
            recs = ['Sin recomendaciones']

        # Análisis completo: breve según riesgo
        analisis_raw = _strip_meta_blocks(result.get('analisis_completo', ''))
        if riesgo == 'BAJO':
            result['analisis_completo'] = _clean_tags(_limit_and_close(analisis_raw, 1))
        else:
            result['analisis_completo'] = _clean_tags(_limit_and_close(analisis_raw, 3))
        result['recomendaciones'] = recs
        # Fallback explicaciones si quedaron vacías
        if not result['estado_sugerido_explicacion']:
            result['estado_sugerido_explicacion'] = result.get('analisis_completo', '')
        if not result['nivel_riesgo_explicacion']:
            result['nivel_riesgo_explicacion'] = result.get('analisis_completo', '')
        return result

    try:
        lineas = respuesta.strip().split('\n')

        estado = ''
        estado_explicacion = ''
        riesgo = ''
        riesgo_explicacion = ''
        recomendaciones = []
        analisis = ''
        glosario = {}

        modo = None

        for linea in lineas:
            linea_norm = ''.join(
                c for c in unicodedata.normalize('NFD', linea)
                if unicodedata.category(c) != 'Mn'
            ).upper().strip()

            if 'ESTADO_SUGERIDO:' in linea_norm:
                estado = linea.split(':', 1)[1].strip()
            elif 'EXPLICACION_ESTADO:' in linea_norm:
                modo = 'estado_exp'
            elif 'NIVEL_RIESGO:' in linea_norm:
                modo = None
                riesgo = linea.split(':', 1)[1].strip()
            elif 'EXPLICACION_RIESGO:' in linea_norm:
                modo = 'riesgo_exp'
            elif 'RECOMENDACIONES:' in linea_norm:
                modo = 'recomendaciones'
            elif 'ANALISIS_COMPLETO:' in linea_norm:
                modo = 'analisis'
            elif 'GLOSARIO:' in linea_norm:
                modo = 'glosario'
            elif modo == 'estado_exp' and linea.strip():
                estado_explicacion += linea.strip() + ' '
            elif modo == 'riesgo_exp' and linea.strip():
                riesgo_explicacion += linea.strip() + ' '
            elif modo == 'recomendaciones' and linea.strip() and (linea.strip()[0].isdigit() or linea.strip().startswith('-')):
                rec = linea.strip().lstrip('0123456789.-) ')
                if rec:
                    recomendaciones.append(rec)
            elif modo == 'analisis' and linea.strip():
                analisis += linea.strip() + '\n'
            elif modo == 'glosario' and ':' in linea:
                partes = linea.split(':', 1)
                if len(partes) == 2:
                    termino = partes[0].strip()
                    definicion = partes[1].strip()
                    glosario[termino] = definicion

        saneado = _sanitize({
            'estado_sugerido': estado or 'en_progreso',
            'estado_sugerido_explicacion': estado_explicacion.strip() or analisis.strip() or respuesta,
            'nivel_riesgo': riesgo or 'MEDIO',
            'nivel_riesgo_explicacion': riesgo_explicacion.strip() or analisis.strip() or respuesta,
            'recomendaciones': recomendaciones if recomendaciones else ['Sin recomendaciones'],
            'analisis_completo': analisis.strip() or respuesta,
            'glosario': glosario
        })
        if not saneado.get('recomendaciones'):
            saneado['recomendaciones'] = ['Sin recomendaciones']
        return saneado
    except Exception as e:
        return {
            'estado_sugerido': 'en_progreso',
            'estado_sugerido_explicacion': 'Error al parsear',
            'nivel_riesgo': 'MEDIO',
            'nivel_riesgo_explicacion': f'Error: {str(e)}',
            'recomendaciones': ['Sin recomendaciones'],
            'analisis_completo': respuesta,
            'glosario': {}
        }

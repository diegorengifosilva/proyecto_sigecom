"""
Servicios de cálculo de cronogramas con soporte para EDT/Gantt.
Portado desde el frontend (EDTModal.jsx) a Python.

Incluye:
- Parsers de duración y dependencias
- Calendarios laborables (8+1, 10, 12 horas)
- Algoritmo de programación (forward/backward pass)
- Detección de ciclos en dependencias
"""

import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple


# ============================================
# EXPRESIONES REGULARES
# ============================================

DUR_RX = re.compile(r'^(\d+)([dhws])$', re.IGNORECASE)
LAG_RX = re.compile(r'([+-]\d+[dhws])$', re.IGNORECASE)


# ============================================
# CALENDARIOS LABORABLES
# ============================================

CALENDARS = {
    "8+1": {
        # Lun-Vie 8h + 1h almuerzo, Sáb 4h, Dom no laboral
        "days": {0: False, 1: True, 2: True, 3: True, 4: True, 5: True, 6: True},
        "shifts": [
            {"start": 9 * 60, "end": 13 * 60},   # 9am-1pm
            {"start": 14 * 60, "end": 18 * 60},  # 2pm-6pm
        ],
        "sat_shifts": [
            {"start": 9 * 60, "end": 13 * 60},   # Sábado 9am-1pm
        ],
    },
    "10": {
        # 10 horas/día continuo, todos los días
        "days": {0: True, 1: True, 2: True, 3: True, 4: True, 5: True, 6: True},
        "shifts": [
            {"start": 8 * 60, "end": 18 * 60},   # 8am-6pm (10h)
        ],
        "sat_shifts": None,
    },
    "12": {
        # 12 horas/día continuo, todos los días
        "days": {0: True, 1: True, 2: True, 3: True, 4: True, 5: True, 6: True},
        "shifts": [
            {"start": 7 * 60, "end": 19 * 60},   # 7am-7pm (12h)
        ],
        "sat_shifts": None,
    },
}


# ============================================
# FUNCIONES DE PARSEO
# ============================================

def parse_duration_to_minutes(value: str) -> int:
    """
    Convierte duración en formato texto a minutos.

    Formatos soportados:
    - 5d  → 5 días × 8 horas = 2400 minutos
    - 16h → 16 horas = 960 minutos
    - 2w  → 2 semanas × 5 días × 8 horas = 4800 minutos
    - 1s  → 1 semana (alias de 'w')

    Args:
        value: String con formato {número}{unidad} (ej: "5d", "16h")

    Returns:
        Duración en minutos
    """
    if not value:
        return 0

    match = DUR_RX.match(str(value).strip())
    if not match:
        return 0

    num = int(match.group(1))
    unit = match.group(2).lower()

    if unit == 'h':
        return num * 60
    elif unit == 'd':
        return num * 8 * 60  # 8 horas por día
    elif unit in ('w', 's'):  # week/semana
        return num * 5 * 8 * 60  # 5 días × 8 horas

    return 0


def parse_preds(pred_string: str) -> List[Dict]:
    """
    Parsea string de predecesoras en formato:
    "12,7:SS+1d,9:FF-8h"

    Formato por token:
    - item                → Predecesora tipo FS sin lag
    - item:TIPO           → Predecesora con tipo específico (FS/SS/FF/SF)
    - item:TIPO±lag       → Predecesora con lag positivo o negativo

    Args:
        pred_string: String con dependencias separadas por comas

    Returns:
        Lista de diccionarios con estructura:
        [
            {"item": 12, "tipo": "FS", "lag_min": 0},
            {"item": 7, "tipo": "SS", "lag_min": 480},
            {"item": 9, "tipo": "FF", "lag_min": -480},
        ]
    """
    if not pred_string:
        return []

    result = []
    tokens = [s.strip() for s in str(pred_string).split(',') if s.strip()]

    for token in tokens:
        item = None
        tipo = "FS"  # Default
        lag_min = 0

        # Extraer lag si existe
        lag_match = LAG_RX.search(token)
        if lag_match:
            lag_str = lag_match.group(0)
            lag_min = parse_duration_to_minutes(lag_str)
            token = LAG_RX.sub('', token).strip()

        # Separar item:tipo
        parts = token.split(':')
        try:
            item = int(parts[0])
        except ValueError:
            continue  # Skip invalid items

        if len(parts) > 1:
            tipo = parts[1].upper()
            # Validar tipo
            if tipo not in ('FS', 'SS', 'FF', 'SF'):
                tipo = 'FS'  # Fallback a FS

        result.append({
            "item": item,
            "tipo": tipo,
            "lag_min": lag_min,
        })

    return result


# ============================================
# FUNCIONES DE CALENDARIO LABORAL
# ============================================

def next_working_start(dt: datetime, cal_key: str = "8+1") -> datetime:
    """
    Encuentra el próximo momento de inicio de turno laboral.

    Si la fecha/hora cae en horario no laboral, avanza al siguiente
    inicio de turno.

    Args:
        dt: Fecha/hora a verificar
        cal_key: Tipo de calendario ("8+1", "10", "12")

    Returns:
        Próximo momento de inicio de turno laboral
    """
    cal = CALENDARS.get(cal_key, CALENDARS["8+1"])
    current = datetime(dt.year, dt.month, dt.day, dt.hour, dt.minute)

    max_iterations = 365  # Prevenir bucles infinitos
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        day = current.weekday()  # 0=Lunes, 6=Domingo
        working_today = cal["days"].get(day, False)

        # Determinar turnos del día
        shifts = cal["sat_shifts"] if day == 5 and cal["sat_shifts"] else cal["shifts"]

        if not working_today:
            # Día no laboral, avanzar al siguiente día
            current = current.replace(hour=0, minute=0, second=0, microsecond=0)
            current += timedelta(days=1)
            continue

        minutes = current.hour * 60 + current.minute

        # Verificar si está en algún turno o antes de uno
        for shift in shifts:
            if minutes <= shift["start"]:
                # Antes del turno, mover al inicio
                return current.replace(hour=0, minute=0, second=0, microsecond=0) + \
                       timedelta(minutes=shift["start"])
            if shift["start"] <= minutes < shift["end"]:
                # Ya está en horario laboral
                return current

        # Después de todos los turnos del día, avanzar al siguiente día
        current = current.replace(hour=0, minute=0, second=0, microsecond=0)
        current += timedelta(days=1)

    # Fallback: retornar la fecha original si no se pudo calcular
    return dt


def add_work_minutes(start: datetime, minutes_to_add: int, cal_key: str = "8+1") -> datetime:
    """
    Suma minutos laborables a una fecha, respetando el calendario.

    Args:
        start: Fecha/hora de inicio
        minutes_to_add: Minutos a sumar (pueden ser negativos)
        cal_key: Tipo de calendario ("8+1", "10", "12")

    Returns:
        Fecha/hora resultante después de sumar los minutos laborables
    """
    if minutes_to_add == 0:
        return start

    # Si es negativo, llamar recursivamente con valor positivo y restar
    if minutes_to_add < 0:
        # Para restar, usar lógica inversa
        # Por ahora simplificamos restando directamente
        return start - timedelta(minutes=abs(minutes_to_add))

    cal = CALENDARS.get(cal_key, CALENDARS["8+1"])
    dt = next_working_start(start, cal_key)
    remaining = minutes_to_add

    max_iterations = 10000  # Prevenir bucles infinitos
    iteration = 0

    while remaining > 0 and iteration < max_iterations:
        iteration += 1

        day = dt.weekday()
        shifts = cal["sat_shifts"] if day == 5 and cal["sat_shifts"] else cal["shifts"]
        mins = dt.hour * 60 + dt.minute

        seg_start = None
        seg_end = None

        # Encontrar en qué segmento estamos
        for shift in shifts:
            if mins <= shift["start"]:
                seg_start = shift["start"]
                seg_end = shift["end"]
                dt = dt.replace(hour=0, minute=0, second=0, microsecond=0) + \
                     timedelta(minutes=seg_start)
                break
            if shift["start"] <= mins < shift["end"]:
                seg_start = mins
                seg_end = shift["end"]
                break

        if seg_start is None:
            # Fuera de todos los turnos, avanzar al siguiente día
            dt = dt.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
            dt = next_working_start(dt, cal_key)
            continue

        # Calcular cuánto tiempo hay disponible en este segmento
        slot = seg_end - seg_start
        take = min(remaining, slot)

        # Avanzar el tiempo
        dt = dt + timedelta(minutes=take)
        remaining -= take

        if remaining > 0:
            # Todavía queda tiempo por agregar, pasar al siguiente día
            dt = dt.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
            dt = next_working_start(dt, cal_key)

    return dt


# ============================================
# DETECCIÓN DE CICLOS
# ============================================

def detect_cycles(tareas) -> bool:
    """
    Detecta dependencias circulares usando DFS (Depth-First Search).

    Args:
        tareas: QuerySet o lista de objetos Tarea

    Returns:
        True si hay ciclos, False si no hay
    """
    # Convertir a lista si es QuerySet
    tareas_list = list(tareas)
    n = len(tareas_list)

    # Índice por item
    idx_by_item = {t.item: i for i, t in enumerate(tareas_list)}

    # Construir grafo de adyacencias
    graph = [[] for _ in range(n)]

    for i, tarea in enumerate(tareas_list):
        preds = parse_preds(tarea.predecesoras)
        for p in preds:
            j = idx_by_item.get(p["item"])
            if j is not None:
                # j es predecesora de i → arista de j a i
                graph[j].append(i)

    # DFS para detectar ciclos
    # Color: 0=blanco (no visitado), 1=gris (en proceso), 2=negro (completado)
    color = [0] * n

    def has_cycle(v):
        color[v] = 1  # Marcar como gris (en proceso)

        for u in graph[v]:
            if color[u] == 1:  # Back edge = ciclo
                return True
            if color[u] == 0 and has_cycle(u):
                return True

        color[v] = 2  # Marcar como negro (completado)
        return False

    # Verificar desde todos los nodos
    for i in range(n):
        if color[i] == 0:
            if has_cycle(i):
                return True

    return False


# ============================================
# ALGORITMO DE PROGRAMACIÓN
# ============================================

def _natural_edt_key(edt: Optional[str]) -> Tuple:
    """
    Genera una llave comparable para ordenar EDTs de forma natural (1.2.10 > 1.2.2).
    """
    if not edt:
        return tuple()
    parts = []
    for token in edt.split('.'):
        if token.isdigit():
            parts.append(int(token))
        else:
            parts.append(token)
    return tuple(parts)


def compute_schedule(tareas_queryset, project_start: datetime) -> List:
    """
    Calcula el cronograma completo usando forward y backward pass.

    Forward Pass:
    - Calcula Early Start (ES) y Early Finish (EF) para cada tarea
    - Respeta dependencias y calendarios laborables

    Backward Pass:
    - Calcula Late Start (LS) y Late Finish (LF)
    - Identifica ruta crítica (holgura = 0)

    Args:
        tareas_queryset: QuerySet de modelo Tarea
        project_start: Fecha de inicio del proyecto

    Returns:
        Lista de tareas con fechas calculadas
    """
    tareas = list(tareas_queryset.order_by('nivel', 'item'))
    tareas.sort(key=lambda t: (_natural_edt_key(t.edt), t.item))
    n = len(tareas)

    if n == 0:
        return []

    # Índice por item
    idx_by_item = {t.item: i for i, t in enumerate(tareas)}

    # Arrays para cálculos
    es = [None] * n  # Early Start
    ef = [None] * n  # Early Finish
    ls = [None] * n  # Late Start
    lf = [None] * n  # Late Finish

    # ========== FORWARD PASS ==========

    for i, tarea in enumerate(tareas):
        # Tareas resumen se calculan después (rollup)
        if tarea.es_resumen:
            continue

        cal = tarea.calendario or "8+1"

        # Inicio por defecto
        st = tarea.inicio if tarea.inicio else project_start
        if not isinstance(st, datetime):
            st = datetime.combine(st, datetime.min.time()) if hasattr(st, 'year') else project_start

        # Procesar predecesoras
        preds = parse_preds(tarea.predecesoras)

        for p in preds:
            j = idx_by_item.get(p["item"])
            if j is None:
                continue

            p_start = es[j]
            p_finish = ef[j]

            if not p_start or not p_finish:
                continue

            # Calcular candidato según tipo de dependencia
            cand = st

            if p["tipo"] in ("FS", "SF"):
                # Finish-to-Start o Start-to-Finish: depende del fin de la predecesora
                cand = add_work_minutes(p_finish, p["lag_min"], cal)

            elif p["tipo"] == "SS":
                # Start-to-Start: depende del inicio de la predecesora
                cand = add_work_minutes(p_start, p["lag_min"], cal)

            elif p["tipo"] == "FF":
                # Finish-to-Finish: el fin de esta tarea depende del fin de la predecesora
                fin = add_work_minutes(p_finish, p["lag_min"], cal)
                dmin = 0 if tarea.es_hito else tarea.duracion_min
                cand = add_work_minutes(fin, -dmin, cal)

            # Tomar el inicio más tardío de todas las restricciones
            if cand > st:
                st = cand

        # Calcular fin
        dmin = 0 if tarea.es_hito else tarea.duracion_min
        fn = add_work_minutes(st, dmin, cal)

        es[i] = st
        ef[i] = fn

    # Rollup de tareas resumen basadas en sus hijos (EDT)
    edt_index = {t.edt: idx for idx, t in enumerate(tareas) if t.edt}
    children_map: Dict[str, List[int]] = {}
    for idx, tarea in enumerate(tareas):
        if not tarea.edt:
            continue
        parts = tarea.edt.split('.')
        while len(parts) > 1:
            parts = parts[:-1]
            parent_key = '.'.join(parts)
            children_map.setdefault(parent_key, []).append(idx)

    for parent_edt, child_indices in children_map.items():
        parent_idx = edt_index.get(parent_edt)
        if parent_idx is None:
            continue
        valid_children = [idx for idx in child_indices if es[idx] and ef[idx]]
        if not valid_children:
            continue
        start_values = [es[idx] for idx in valid_children if es[idx]]
        finish_values = [ef[idx] for idx in valid_children if ef[idx]]
        if start_values:
            es[parent_idx] = min(start_values)
            tareas[parent_idx].inicio = es[parent_idx]
        if finish_values:
            ef[parent_idx] = max(finish_values)
            tareas[parent_idx].fin = ef[parent_idx]

# ========== BACKWARD PASS ==========

    # Encontrar fin del proyecto (máximo EF)
    project_finish = project_start

    for d in ef:
        if d and d > project_finish:
            project_finish = d

    # Calcular Late Finish y Late Start
    for i in range(n - 1, -1, -1):
        if ef[i] is None:
            continue

        tarea = tareas[i]

        # Si no tiene sucesores, LF = project finish
        # Por simplicidad, establecemos LF como el fin del proyecto
        lf[i] = project_finish

        # Calcular LS
        dmin = 0 if tarea.es_hito else tarea.duracion_min
        ls[i] = add_work_minutes(lf[i], -dmin, tarea.calendario or "8+1")

    # Identificar críticas (holgura < 1 minuto)
    for i, tarea in enumerate(tareas):
        if es[i] and ls[i]:
            slack_seconds = abs((ls[i] - es[i]).total_seconds())
            slack_minutes = slack_seconds / 60

            tarea.holgura_total = int(slack_minutes)
            tarea.es_critica = slack_minutes < 1
            tarea.inicio = es[i]
            tarea.fin = ef[i]
        else:
            tarea.holgura_total = 0
            tarea.es_critica = False

    return tareas

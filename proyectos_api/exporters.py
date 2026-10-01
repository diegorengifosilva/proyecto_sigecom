"""
Exportador de cronogramas a formato MS Project XML
Compatible con Microsoft Project 2019+
"""

import xml.etree.ElementTree as ET
from datetime import datetime
from .services_cronograma import parse_preds


def export_to_msp_xml(cronograma_version):
    """
    Genera XML compatible con Microsoft Project.

    Basado en: https://docs.microsoft.com/en-us/office-project/xml-data-interchange

    Args:
        cronograma_version: Instancia de CronogramaVersion

    Returns:
        String con XML formateado
    """

    # Crear elemento raíz
    project = ET.Element('Project', {
        'xmlns': 'http://schemas.microsoft.com/project'
    })

    # ========== METADATA DEL PROYECTO ==========

    ET.SubElement(project, 'Title').text = cronograma_version.proyecto.nombre
    ET.SubElement(project, 'Subject').text = cronograma_version.nombre
    ET.SubElement(project, 'Author').text = str(cronograma_version.creado_por) if cronograma_version.creado_por else 'PMInsight'
    ET.SubElement(project, 'CreationDate').text = cronograma_version.fecha_creacion.isoformat()

    # Fechas del proyecto
    if cronograma_version.proyecto.fecha_inicio:
        ET.SubElement(project, 'StartDate').text = cronograma_version.proyecto.fecha_inicio.isoformat()
    if cronograma_version.proyecto.fecha_fin:
        ET.SubElement(project, 'FinishDate').text = cronograma_version.proyecto.fecha_fin.isoformat()

    # ========== CALENDARIO ==========

    calendars = ET.SubElement(project, 'Calendars')
    calendar = ET.SubElement(calendars, 'Calendar')
    ET.SubElement(calendar, 'UID').text = '1'
    ET.SubElement(calendar, 'Name').text = 'Estándar'
    ET.SubElement(calendar, 'IsBaseCalendar').text = '1'

    # WeekDays
    weekdays = ET.SubElement(calendar, 'WeekDays')

    # Domingo (no laboral)
    wd_sun = ET.SubElement(weekdays, 'WeekDay')
    ET.SubElement(wd_sun, 'DayType').text = '1'
    ET.SubElement(wd_sun, 'DayWorking').text = '0'

    # Lunes-Viernes (8+1: 9-13, 14-18)
    for day_type in range(2, 7):  # 2=Lunes ... 6=Viernes
        wd = ET.SubElement(weekdays, 'WeekDay')
        ET.SubElement(wd, 'DayType').text = str(day_type)
        ET.SubElement(wd, 'DayWorking').text = '1'

        working_times = ET.SubElement(wd, 'WorkingTimes')

        # Turno mañana
        wt1 = ET.SubElement(working_times, 'WorkingTime')
        ET.SubElement(wt1, 'FromTime').text = '09:00:00'
        ET.SubElement(wt1, 'ToTime').text = '13:00:00'

        # Turno tarde
        wt2 = ET.SubElement(working_times, 'WorkingTime')
        ET.SubElement(wt2, 'FromTime').text = '14:00:00'
        ET.SubElement(wt2, 'ToTime').text = '18:00:00'

    # Sábado (medio día: 9-13)
    wd_sat = ET.SubElement(weekdays, 'WeekDay')
    ET.SubElement(wd_sat, 'DayType').text = '7'
    ET.SubElement(wd_sat, 'DayWorking').text = '1'
    working_times_sat = ET.SubElement(wd_sat, 'WorkingTimes')
    wt_sat = ET.SubElement(working_times_sat, 'WorkingTime')
    ET.SubElement(wt_sat, 'FromTime').text = '09:00:00'
    ET.SubElement(wt_sat, 'ToTime').text = '13:00:00'

    # ========== TAREAS ==========

    tasks = ET.SubElement(project, 'Tasks')

    for tarea in cronograma_version.tareas.all().order_by('item'):
        task = ET.SubElement(tasks, 'Task')

        # IDs
        ET.SubElement(task, 'UID').text = str(tarea.item)
        ET.SubElement(task, 'ID').text = str(tarea.item)

        # Nombre
        ET.SubElement(task, 'Name').text = tarea.nombre

        # Tipo de tarea
        ET.SubElement(task, 'Type').text = '1'  # Fixed Duration
        ET.SubElement(task, 'IsNull').text = '0'

        # WBS (EDT)
        if tarea.edt:
            ET.SubElement(task, 'WBS').text = tarea.edt

        # Nivel jerárquico
        ET.SubElement(task, 'OutlineLevel').text = str(tarea.nivel)

        # Tarea resumen
        ET.SubElement(task, 'Summary').text = '1' if tarea.es_resumen else '0'

        # Hito
        ET.SubElement(task, 'Milestone').text = '1' if tarea.es_hito else '0'

        # Fechas
        if tarea.inicio:
            ET.SubElement(task, 'Start').text = tarea.inicio.isoformat()
        if tarea.fin:
            ET.SubElement(task, 'Finish').text = tarea.fin.isoformat()

        # Duración (formato MS Project: PT{minutes}M)
        if not tarea.es_resumen and not tarea.es_hito:
            ET.SubElement(task, 'Duration').text = f'PT{tarea.duracion_min}M'

        # Crítica
        ET.SubElement(task, 'Critical').text = '1' if tarea.es_critica else '0'

        # Predecesoras
        if tarea.predecesoras and not tarea.es_resumen:
            preds = parse_preds(tarea.predecesoras)

            if preds:
                predecessor_links = ET.SubElement(task, 'PredecessorLink')

                for pred in preds:
                    pred_link = ET.SubElement(predecessor_links, 'PredecessorLink')
                    ET.SubElement(pred_link, 'PredecessorUID').text = str(pred['item'])

                    # Tipo de dependencia
                    # MS Project: 0=FF, 1=FS, 2=SF, 3=SS
                    type_map = {'FF': '0', 'FS': '1', 'SF': '2', 'SS': '3'}
                    ET.SubElement(pred_link, 'Type').text = type_map.get(pred['tipo'], '1')

                    # Lag (en décimas de minuto para MS Project)
                    if pred['lag_min'] != 0:
                        # MS Project usa décimas de minuto (1 minuto = 600 unidades)
                        lag_units = pred['lag_min'] * 600
                        ET.SubElement(pred_link, 'LinkLag').text = str(int(lag_units))

    # ========== FORMATEAR XML ==========

    # Indentar para mejor legibilidad
    _indent_xml(project)

    # Convertir a string
    xml_string = ET.tostring(project, encoding='unicode', method='xml')

    # Agregar declaración XML
    xml_declaration = '<?xml version="1.0" encoding="UTF-8"?>\n'

    return xml_declaration + xml_string


def _indent_xml(elem, level=0):
    """
    Función auxiliar para indentar XML.
    Hace el XML más legible.
    """
    i = "\n" + level * "  "
    if len(elem):
        if not elem.text or not elem.text.strip():
            elem.text = i + "  "
        if not elem.tail or not elem.tail.strip():
            elem.tail = i
        for child in elem:
            _indent_xml(child, level + 1)
        if not child.tail or not child.tail.strip():
            child.tail = i
    else:
        if level and (not elem.tail or not elem.tail.strip()):
            elem.tail = i

"""
Generadores de Informes Ejecutivos
Soporta PDFs y Excel para diferentes tipos de informes
"""

import inspect
from decimal import Decimal
from io import BytesIO
from datetime import datetime, date

from django.core.files.base import ContentFile
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Importar cliente IA
from proyectos_api.core.gemini_client import generar_analisis_informe, ia_disponible
from proyectos_api.core.ia_provider import analizar_estado_proyecto


def _to_float(value):
    """Convierte cualquier valor numerico a float."""
    if value is None:
        return 0.0

    if isinstance(value, (int, float)):
        return float(value)

    if isinstance(value, Decimal):
        return float(value)

    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _safe_ratio(num, den):
    num_f = _to_float(num)
    den_f = _to_float(den)
    if den_f == 0:
        return 0.0
    return round(num_f / den_f, 2)


def construir_contexto_informe(proyecto):
    """
    Compila informacion ejecutiva para enriquecer informes y dashboards.
    """
    hoy = date.today()
    curva = proyecto.curva_s.order_by('-fecha').first()
    historial = list(proyecto.historial.order_by('-fecha_registro')[:10])
    miembros = list(proyecto.miembros.all())
    recursos = list(proyecto.recursos.all())
    riesgos = list(proyecto.riesgos.all().order_by('-exposicion')[:5])
    tareas_totales = proyecto.tareas.count()
    tareas_atrasadas = proyecto.tareas.filter(estado='atrasada').count()

    bac = _to_float(proyecto.presupuesto_total)
    ac = _to_float(proyecto.costo_real_total)
    ev = _to_float(curva.ev) if curva else 0.0
    pv = _to_float(curva.pv) if curva else bac

    if not ev and historial:
        ev = bac * (_to_float(historial[0].porcentaje_avance_fisico) / 100.0)
    if not pv and historial:
        pv = bac * (_to_float(historial[0].porcentaje_tiempo_transcurrido) / 100.0)

    cpi = _safe_ratio(ev, ac) if ac else 0.0
    spi = _safe_ratio(ev, pv) if pv else 0.0

    avance_real = _to_float(historial[0].porcentaje_avance_fisico) if historial else 0.0
    tiempo_transcurrido = _to_float(historial[0].porcentaje_tiempo_transcurrido) if historial else 0.0

    duracion = (proyecto.fecha_fin - proyecto.fecha_inicio).days if proyecto.fecha_inicio and proyecto.fecha_fin else 0
    dias_transcurridos = (hoy - proyecto.fecha_inicio).days if proyecto.fecha_inicio else 0
    dias_restantes = (proyecto.fecha_fin - hoy).days if proyecto.fecha_fin else 0

    recursos_activos = len([r for r in recursos if r.estado == 'activo'])
    recursos_sobrecargados = len([r for r in recursos if r.porcentaje_dedicacion and r.porcentaje_dedicacion > 100])
    dedicacion_prom = round(
        sum(r.porcentaje_dedicacion or 0 for r in recursos) / len(recursos),
        1
    ) if recursos else 0.0

    riesgos_serializados = [{
        'titulo': riesgo.titulo,
        'categoria': riesgo.get_categoria_display() if hasattr(riesgo, 'get_categoria_display') else '',
        'probabilidad': _to_float(riesgo.probabilidad),
        'impacto': _to_float(riesgo.impacto),
        'exposicion': _to_float(getattr(riesgo, 'exposicion', 0)),
        'estado': riesgo.get_estado_display() if hasattr(riesgo, 'get_estado_display') else '',
        'responsable': riesgo.responsable or ''
    } for riesgo in riesgos]

    historial_kpi = [{
        'fecha': registro.fecha_registro.isoformat(),
        'avance': _to_float(registro.porcentaje_avance_fisico),
        'spi': _to_float(registro.spi),
        'cpi': _to_float(registro.cpi),
        'riesgos_abiertos': int(registro.riesgos_abiertos or 0)
    } for registro in historial]

    kpis = {
        'bac': round(bac, 2),
        'ac': round(ac, 2),
        'ev': round(ev, 2),
        'pv': round(pv, 2),
        'cpi': round(cpi, 2),
        'spi': round(spi, 2),
        'cv': round(ev - ac, 2),
        'sv': round(ev - pv, 2),
        'avance_real': round(avance_real, 2),
        'avance_planeado': round(tiempo_transcurrido, 2),
        'hh_ejecutadas': round(_to_float(proyecto.costo_hh_real), 2),
    }

    alertas = []
    if cpi and cpi < 0.9:
        alertas.append({
            'tipo': 'costo',
            'detalle': f'CPI en {cpi:.2f}. Ajustar gastos y planeacion financiera.'
        })
    if spi and spi < 0.95:
        alertas.append({
            'tipo': 'cronograma',
            'detalle': f'SPI en {spi:.2f}. Revisar rutas criticas y holguras.'
        })
    if riesgos_serializados and riesgos_serializados[0]['exposicion'] >= 0.6:
        alertas.append({
            'tipo': 'riesgo',
            'detalle': f'Riesgo "{riesgos_serializados[0]["titulo"]}" con exposicion {riesgos_serializados[0]["exposicion"]}.'
        })
    if recursos_sobrecargados:
        alertas.append({
            'tipo': 'recursos',
            'detalle': f'{recursos_sobrecargados} recursos superan su dedicacion comprometida.'
        })
    if tareas_atrasadas:
        alertas.append({
            'tipo': 'cronograma',
            'detalle': f'{tareas_atrasadas} tareas de {tareas_totales} estan atrasadas.'
        })

    equipo = [{
        'nombre': miembro.nombre,
        'apellido': miembro.apellido,
        'rol': miembro.rol,
        'correo': miembro.correo
    } for miembro in miembros]

    recursos_lista = [{
        'nombre': recurso.nombre,
        'rol': recurso.rol,
        'estado': recurso.get_estado_display() if hasattr(recurso, 'get_estado_display') else recurso.estado,
        'dedicacion': recurso.porcentaje_dedicacion
    } for recurso in recursos[:6]]

    return {
        'cliente': {
            'empresa': proyecto.cliente or proyecto.entidad_cliente or 'No registrado',
            'contacto': {
                'nombre': proyecto.contacto_cliente_nombre or 'No indicado',
                'email': proyecto.contacto_cliente_email or '',
                'telefono': proyecto.contacto_cliente_telefono or ''
            },
            'ubicacion': proyecto.ubicacion or 'No definida',
        },
        'responsables': {
            'pm': proyecto.responsable or (proyecto.usuario.get_full_name() if proyecto.usuario else ''),
            'pm_email': proyecto.lider_email or (proyecto.usuario.email if proyecto.usuario else ''),
        },
        'cronograma': {
            'inicio': proyecto.fecha_inicio.isoformat() if proyecto.fecha_inicio else '',
            'fin': proyecto.fecha_fin.isoformat() if proyecto.fecha_fin else '',
            'duracion': duracion,
            'dias_transcurridos': dias_transcurridos,
            'dias_restantes': dias_restantes,
            'tareas_totales': tareas_totales,
            'tareas_atrasadas': tareas_atrasadas,
        },
        'recursos': {
            'total': len(recursos),
            'activos': recursos_activos,
            'dedicacion_promedio': dedicacion_prom,
            'lista': recursos_lista,
        },
        'equipo_clave': equipo,
        'riesgos': riesgos_serializados,
        'historial_kpi': historial_kpi,
        'kpis': kpis,
        'alertas': alertas,
        'ia_habilitada': ia_disponible(),
    }


def generar_excel_costos_evm(proyecto):
    """
    Genera un informe Excel con métricas de costos EVM
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Costos EVM"

    # Estilos
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)
    title_font = Font(bold=True, size=14)
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # Título
    ws['A1'] = f"INFORME DE COSTOS EVM - {proyecto.codigo}"
    ws['A1'].font = title_font
    ws.merge_cells('A1:F1')

    # Información del proyecto
    ws['A3'] = "Proyecto:"
    ws['B3'] = proyecto.nombre
    ws['A4'] = "Cliente:"
    ws['B4'] = proyecto.cliente or "—"
    ws['A5'] = "Fecha:"
    ws['B5'] = datetime.now().strftime('%d/%m/%Y')

    # Calcular métricas EVM
    presupuesto_gastos = float(proyecto.presupuesto_gastos or 0)
    presupuesto_hh = float(proyecto.presupuesto_hh or 0)
    contingencia = float(proyecto.presupuesto_contingencia or 0)
    utilidad = float(proyecto.presupuesto_utilidad or 0)
    BAC = presupuesto_gastos + presupuesto_hh + contingencia + utilidad

    # Avance real
    if proyecto.fecha_inicio and proyecto.fecha_fin:
        inicio = proyecto.fecha_inicio
        fin = proyecto.fecha_fin
        hoy = date.today()

        if hoy < inicio:
            avance = 0
        elif hoy > fin:
            avance = 100
        else:
            total_dias = (fin - inicio).days
            transcurridos = (hoy - inicio).days
            avance = int((transcurridos / total_dias) * 100) if total_dias > 0 else 0
    else:
        avance = 0

    # Obtener última curva
    ultima_curva = proyecto.curva_s.order_by('-fecha').first()

    PV = ultima_curva.pv if ultima_curva else (BAC * avance) / 100
    EV = ultima_curva.ev if ultima_curva else (BAC * avance * 0.85) / 100
    AC = float(proyecto.gasto_real or 0) + float(proyecto.costo_hh_real or 0)

    CPI = EV / AC if AC > 0 else 0
    SPI = EV / PV if PV > 0 else 0
    CV = EV - AC
    SV = EV - PV
    EAC = BAC / CPI if CPI > 0 else BAC
    ETC = EAC - AC
    VAC = BAC - EAC

    # Headers
    headers = ['Métrica', 'Valor', 'Descripción']
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=7, column=col)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = border

    # Datos
    datos = [
        ('BAC', f"${BAC:,.2f}", 'Presupuesto hasta la Conclusión'),
        ('PV', f"${PV:,.2f}", 'Valor Planificado'),
        ('EV', f"${EV:,.2f}", 'Valor Ganado'),
        ('AC', f"${AC:,.2f}", 'Costo Real'),
        ('', '', ''),
        ('CPI', f"{CPI:.2f}", 'Índice de Desempeño de Costos'),
        ('SPI', f"{SPI:.2f}", 'Índice de Desempeño del Cronograma'),
        ('', '', ''),
        ('CV', f"${CV:,.2f}", 'Variación de Costo'),
        ('SV', f"${SV:,.2f}", 'Variación de Cronograma'),
        ('', '', ''),
        ('EAC', f"${EAC:,.2f}", 'Estimado a la Conclusión'),
        ('ETC', f"${ETC:,.2f}", 'Estimado para Terminar'),
        ('VAC', f"${VAC:,.2f}", 'Variación a la Conclusión'),
    ]

    for idx, (metrica, valor, desc) in enumerate(datos, start=8):
        ws.cell(row=idx, column=1, value=metrica).border = border
        ws.cell(row=idx, column=2, value=valor).border = border
        ws.cell(row=idx, column=3, value=desc).border = border

        # Colorear según valores
        if metrica in ['CPI', 'SPI']:
            val_num = float(valor)
            if val_num >= 1:
                ws.cell(row=idx, column=2).fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
            elif val_num >= 0.9:
                ws.cell(row=idx, column=2).fill = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")
            else:
                ws.cell(row=idx, column=2).fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")

    # Ajustar anchos
    ws.column_dimensions['A'].width = 15
    ws.column_dimensions['B'].width = 20
    ws.column_dimensions['C'].width = 50

    # Guardar en buffer
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return buffer


def generar_excel_cronograma(proyecto):
    """
    Genera un informe Excel con el cronograma del proyecto
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Cronograma"

    # Estilos
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    title_font = Font(bold=True, size=14)
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # Título
    ws['A1'] = f"CRONOGRAMA DEL PROYECTO - {proyecto.codigo}"
    ws['A1'].font = title_font
    ws.merge_cells('A1:J1')

    # Información del proyecto
    ws['A3'] = "Proyecto:"
    ws['B3'] = proyecto.nombre
    ws['A4'] = "Fecha Generación:"
    ws['B4'] = datetime.now().strftime('%d/%m/%Y %H:%M')

    # Obtener cronograma activo
    cronograma = proyecto.cronogramas.filter(es_activa=True).first()

    if not cronograma:
        ws['A6'] = "No hay cronograma activo disponible"
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer

    # Headers
    headers = ['Item', 'EDT', 'Nivel', 'Nombre', 'Inicio', 'Fin', 'Duración (días)', 'Hito', 'Crítica', 'Predecesoras']
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=6, column=col)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = border

    # Datos de tareas
    tareas = cronograma.tareas.all().order_by('item')
    for idx, tarea in enumerate(tareas, start=7):
        ws.cell(row=idx, column=1, value=tarea.item).border = border
        ws.cell(row=idx, column=2, value=tarea.edt).border = border
        ws.cell(row=idx, column=3, value=tarea.nivel).border = border
        ws.cell(row=idx, column=4, value=tarea.nombre).border = border
        ws.cell(row=idx, column=5, value=tarea.inicio.strftime('%d/%m/%Y') if tarea.inicio else '—').border = border
        ws.cell(row=idx, column=6, value=tarea.fin.strftime('%d/%m/%Y') if tarea.fin else '—').border = border

        # Calcular duración en días
        if tarea.duracion_min:
            dias = tarea.duracion_min / (8 * 60)  # Convertir minutos a días (8h por día)
            ws.cell(row=idx, column=7, value=f"{dias:.1f}").border = border
        else:
            ws.cell(row=idx, column=7, value="0").border = border

        ws.cell(row=idx, column=8, value="Sí" if tarea.es_hito else "No").border = border
        ws.cell(row=idx, column=9, value="Sí" if tarea.es_critica else "No").border = border
        ws.cell(row=idx, column=10, value=tarea.predecesoras or "—").border = border

        # Colorear tareas críticas
        if tarea.es_critica:
            for col in range(1, 11):
                ws.cell(row=idx, column=col).fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")

    # Ajustar anchos
    ws.column_dimensions['A'].width = 8
    ws.column_dimensions['B'].width = 12
    ws.column_dimensions['C'].width = 8
    ws.column_dimensions['D'].width = 40
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 12
    ws.column_dimensions['G'].width = 15
    ws.column_dimensions['H'].width = 8
    ws.column_dimensions['I'].width = 10
    ws.column_dimensions['J'].width = 25

    # Guardar en buffer
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return buffer


def generar_pdf_resumen_ejecutivo(proyecto):
    """
    Genera PDF con resumen ejecutivo del proyecto
    Nota: Para implementación completa se requiere reportlab
    Por ahora retornamos un placeholder
    """
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(f"RESUMEN EJECUTIVO<br/>{proyecto.codigo}", title_style))
        elements.append(Spacer(1, 0.2*inch))

        # Información del proyecto
        info_data = [
            ['Proyecto:', proyecto.nombre],
            ['Cliente:', proyecto.cliente or '—'],
            ['Estado:', proyecto.estado],
            ['Fecha Inicio:', proyecto.fecha_inicio.strftime('%d/%m/%Y') if proyecto.fecha_inicio else '—'],
            ['Fecha Fin:', proyecto.fecha_fin.strftime('%d/%m/%Y') if proyecto.fecha_fin else '—'],
        ]

        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e5e7eb')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.3*inch))

        # Métricas EVM
        elements.append(Paragraph("MÉTRICAS DE VALOR GANADO", styles['Heading2']))
        elements.append(Spacer(1, 0.1*inch))

        # Calcular métricas
        BAC = float(proyecto.presupuesto_gastos or 0) + float(proyecto.presupuesto_hh or 0) + \
              float(proyecto.presupuesto_contingencia or 0) + float(proyecto.presupuesto_utilidad or 0)
        AC = float(proyecto.gasto_real or 0) + float(proyecto.costo_hh_real or 0)

        # Avance
        if proyecto.fecha_inicio and proyecto.fecha_fin:
            hoy = date.today()
            inicio = proyecto.fecha_inicio
            fin = proyecto.fecha_fin
            if hoy < inicio:
                avance = 0
            elif hoy > fin:
                avance = 100
            else:
                avance = int(((hoy - inicio).days / (fin - inicio).days) * 100) if (fin - inicio).days > 0 else 0
        else:
            avance = 0

        PV = (BAC * avance) / 100
        EV = (BAC * avance * 0.85) / 100  # Simplificado
        CPI = EV / AC if AC > 0 else 0
        SPI = EV / PV if PV > 0 else 0

        evm_data = [
            ['Métrica', 'Valor', 'Estado'],
            ['BAC (Presupuesto)', f"${BAC:,.2f}", ''],
            ['AC (Costo Real)', f"${AC:,.2f}", ''],
            ['PV (Valor Planificado)', f"${PV:,.2f}", ''],
            ['EV (Valor Ganado)', f"${EV:,.2f}", ''],
            ['CPI', f"{CPI:.2f}", '✓ Bueno' if CPI >= 1 else '⚠ Atención' if CPI >= 0.9 else '✗ Crítico'],
            ['SPI', f"{SPI:.2f}", '✓ Bueno' if SPI >= 1 else '⚠ Atención' if SPI >= 0.9 else '✗ Crítico'],
        ]

        evm_table = Table(evm_data, colWidths=[2*inch, 2*inch, 2*inch])
        evm_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        elements.append(evm_table)

        # Generar PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer

    except ImportError:
        # Si reportlab no está instalado, retornar un Excel simple como fallback
        return generar_excel_costos_evm(proyecto)


def generar_pdf_avance_mensual(proyecto):
    """
    Genera PDF con informe de avance mensual
    """
    # Por simplicidad, usar la misma estructura que resumen ejecutivo
    # En producción, agregaría secciones específicas de avance mensual
    return generar_pdf_resumen_ejecutivo(proyecto)


def generar_pdf_riesgos(proyecto):
    """
    Genera PDF con informe de riesgos del proyecto
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(f"INFORME DE RIESGOS<br/>{proyecto.codigo}", title_style))
        elements.append(Spacer(1, 0.2*inch))

        # Información del proyecto
        info_data = [
            ['Proyecto:', proyecto.nombre],
            ['Fecha:', datetime.now().strftime('%d/%m/%Y')],
        ]

        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e5e7eb')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.3*inch))

        # Obtener riesgos
        riesgos = proyecto.riesgos.all().order_by('-exposicion')

        if riesgos.exists():
            elements.append(Paragraph("RIESGOS IDENTIFICADOS", styles['Heading2']))
            elements.append(Spacer(1, 0.1*inch))

            riesgos_data = [['#', 'Título', 'Categoría', 'Probabilidad', 'Impacto', 'Exposición', 'Estado']]

            for idx, riesgo in enumerate(riesgos, 1):
                riesgos_data.append([
                    str(idx),
                    riesgo.titulo[:30],
                    riesgo.get_categoria_display(),
                    str(riesgo.probabilidad),
                    str(riesgo.impacto),
                    str(riesgo.exposicion),
                    riesgo.get_estado_display()
                ])

            riesgos_table = Table(riesgos_data, colWidths=[0.4*inch, 2*inch, 1*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1*inch])
            riesgos_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey)
            ]))
            elements.append(riesgos_table)
        else:
            elements.append(Paragraph("No hay riesgos registrados para este proyecto.", styles['Normal']))

        doc.build(elements)
        buffer.seek(0)
        return buffer

    except ImportError:
        # Fallback a Excel
        return generar_excel_simple_riesgos(proyecto)


def generar_excel_simple_riesgos(proyecto):
    """
    Genera Excel simple con riesgos (fallback si reportlab no disponible)
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Riesgos"

    ws['A1'] = f"INFORME DE RIESGOS - {proyecto.codigo}"
    ws['A1'].font = Font(bold=True, size=14)

    # Headers
    headers = ['Título', 'Categoría', 'Probabilidad', 'Impacto', 'Exposición', 'Estado', 'Responsable']
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=3, column=col)
        cell.value = header
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")

    # Datos
    riesgos = proyecto.riesgos.all().order_by('-exposicion')
    for idx, riesgo in enumerate(riesgos, start=4):
        ws.cell(row=idx, column=1, value=riesgo.titulo)
        ws.cell(row=idx, column=2, value=riesgo.get_categoria_display())
        ws.cell(row=idx, column=3, value=riesgo.probabilidad)
        ws.cell(row=idx, column=4, value=riesgo.impacto)
        ws.cell(row=idx, column=5, value=riesgo.exposicion)
        ws.cell(row=idx, column=6, value=riesgo.get_estado_display())
        ws.cell(row=idx, column=7, value=riesgo.responsable or '—')

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer



def generar_pdf_con_ia_resumen(proyecto, contexto=None, informe=None):
    """Genera un PDF ejecutivo enriquecido con IA y contexto del cliente."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, title=f"Informe IA - {proyecto.codigo}")
        contexto = contexto or construir_contexto_informe(proyecto)

        styles = getSampleStyleSheet()
        titulo_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        subtitulo_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2563eb'),
            spaceBefore=15,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=12
        )
        rec_style = ParagraphStyle(
            'Recommendation',
            parent=styles['Normal'],
            fontSize=11,
            leftIndent=20,
            bulletIndent=10,
            spaceAfter=8,
            textColor=colors.HexColor('#059669')
        )

        story = []
        cliente_info = (contexto or {}).get('cliente', {})
        responsables_info = (contexto or {}).get('responsables', {})

        story.append(Spacer(1, 1 * inch))
        story.append(Paragraph("INFORME EJECUTIVO CON ANALISIS IA", titulo_style))
        story.append(Spacer(1, 0.3 * inch))

        info_data = [
            ['Proyecto:', proyecto.nombre],
            ['Codigo:', proyecto.codigo],
            ['Cliente:', cliente_info.get('empresa', proyecto.cliente or 'No registrado')],
            ['Responsable PM:', responsables_info.get('pm') or proyecto.responsable or 'No asignado'],
            ['Fecha:', datetime.now().strftime('%d de %B de %Y')],
            ['Generado por:', 'IA Generativa (Google Gemini)']
        ]
        info_table = Table(info_data, colWidths=[2 * inch, 4 * inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(info_table)
        story.append(PageBreak())

        if contexto:
            story.append(Paragraph("FICHA EJECUTIVA DEL CLIENTE", subtitulo_style))
            story.append(Spacer(1, 0.1 * inch))
            ficha_data = [
                ['Cliente', cliente_info.get('empresa', 'No registrado')],
                ['Contacto cliente', f"{cliente_info.get('contacto', {}).get('nombre', 'No indicado')} ({cliente_info.get('contacto', {}).get('email', '')})"],
                ['Ubicacion', cliente_info.get('ubicacion', 'No definida')],
                ['PM responsable', responsables_info.get('pm', 'No asignado')],
                ['Correo PM', responsables_info.get('pm_email', '') or 'No indicado'],
            ]
            ficha_table = Table(ficha_data, colWidths=[2.2 * inch, 3.8 * inch])
            ficha_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0f2fe')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(ficha_table)

            story.append(Spacer(1, 0.2 * inch))
            story.append(Paragraph("METRICAS CLAVE AL CORTE", subtitulo_style))
            story.append(Spacer(1, 0.05 * inch))
            kpis = contexto.get('kpis', {})
            cronograma = contexto.get('cronograma', {})
            metricas_data = [
                ['Indicador', 'Valor', 'Lectura'],
                ['Avance real', f"{kpis.get('avance_real', 0):.1f}%", f"Plan {kpis.get('avance_planeado', 0):.1f}%"],
                ['CPI', f"{kpis.get('cpi', 0):.2f}", 'Costo vs plan'],
                ['SPI', f"{kpis.get('spi', 0):.2f}", 'Cronograma vs plan'],
                ['BAC', f"${kpis.get('bac', 0):,.2f}", 'Presupuesto aprobado'],
                ['AC', f"${kpis.get('ac', 0):,.2f}", 'Costo ejecutado'],
                ['Dias restantes', cronograma.get('dias_restantes', 0), f"Duracion {cronograma.get('duracion', 0)} dias"],
            ]
            metricas_table = Table(metricas_data, colWidths=[1.8 * inch, 1.6 * inch, 2.6 * inch])
            metricas_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1d4ed8')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5f5')),
            ]))
            story.append(metricas_table)

            story.append(Spacer(1, 0.2 * inch))
            story.append(Paragraph("ALERTAS PREDICTIVAS", subtitulo_style))
            alertas = contexto.get('alertas') or []
            if alertas:
                for alerta in alertas:
                    story.append(Paragraph(f"- {alerta['tipo'].upper()}: {alerta['detalle']}", normal_style))
            else:
                story.append(Paragraph("Sin alertas activas segun las metricas disponibles.", normal_style))

            story.append(Spacer(1, 0.2 * inch))
            story.append(Paragraph("EQUIPO Y RECURSOS CLAVE", subtitulo_style))
            equipo = contexto.get('equipo_clave', [])
            recursos = contexto.get('recursos', {})
            recursos_lista = recursos.get('lista', [])
            if equipo:
                for miembro in equipo[:6]:
                    story.append(Paragraph(
                        f"- {miembro['nombre']} {miembro['apellido']} - {miembro['rol']} ({miembro['correo']})",
                        normal_style
                    ))
            else:
                story.append(Paragraph("No se registraron miembros clave en este proyecto.", normal_style))

            if recursos_lista:
                story.append(Spacer(1, 0.1 * inch))
                recursos_data = [['Recurso', 'Rol', '% Dedicacion', 'Estado']]
                for recurso in recursos_lista:
                    recursos_data.append([
                        recurso['nombre'],
                        recurso['rol'],
                        f"{recurso.get('dedicacion', 0)}%",
                        recurso.get('estado', '')
                    ])
                recursos_table = Table(recursos_data, colWidths=[1.8 * inch, 1.6 * inch, 1.2 * inch, 1.2 * inch])
                recursos_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
                ]))
                story.append(recursos_table)

            if contexto.get('riesgos'):
                story.append(Spacer(1, 0.2 * inch))
                story.append(Paragraph("RIESGOS PRIORITARIOS", subtitulo_style))
                riesgos_data = [['Titulo', 'Prob.', 'Impacto', 'Exposicion', 'Responsable']]
                for riesgo in contexto['riesgos']:
                    riesgos_data.append([
                        riesgo['titulo'],
                        f"{riesgo['probabilidad']}",
                        f"{riesgo['impacto']}",
                        f"{riesgo['exposicion']}",
                        riesgo['responsable']
                    ])
                riesgos_table = Table(riesgos_data, colWidths=[2.5 * inch, 0.8 * inch, 0.8 * inch, 0.9 * inch, 1.0 * inch])
                riesgos_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
                ]))
                story.append(riesgos_table)

            if contexto.get('historial_kpi'):
                story.append(Spacer(1, 0.2 * inch))
                story.append(Paragraph("HISTORIAL DE INDICADORES", subtitulo_style))
                historial_data = [['Fecha', 'Avance', 'SPI', 'CPI', 'Riesgos abiertos']]
                for registro in contexto['historial_kpi']:
                    historial_data.append([
                        registro['fecha'],
                        f"{registro['avance']:.1f}%",
                        f"{registro['spi']:.2f}",
                        f"{registro['cpi']:.2f}",
                        registro['riesgos_abiertos'],
                    ])
                historial_table = Table(historial_data, colWidths=[1.3 * inch, 1.0 * inch, 0.9 * inch, 0.9 * inch, 1.5 * inch])
                historial_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4b5563')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#9ca3af')),
                ]))
                story.append(historial_table)

            story.append(PageBreak())

        story.append(Paragraph("ANALISIS GENERADO POR IA", subtitulo_style))
        story.append(Spacer(1, 0.2 * inch))
        analisis_ia_texto = generar_analisis_informe(
            proyecto,
            tipo_informe='resumen_ejecutivo',
            contexto=contexto
        )
        secciones = analisis_ia_texto.split('##')
        for seccion in secciones:
            if not seccion.strip():
                continue
            lineas = seccion.strip().split('\n')
            titulo_seccion = lineas[0].strip('#').strip()
            story.append(Paragraph(titulo_seccion, subtitulo_style))
            for linea in lineas[1:]:
                if not linea.strip():
                    continue
                if linea.strip().startswith('-'):
                    linea_clean = linea.strip().lstrip('-').strip()
                    story.append(Paragraph(f"- {linea_clean}", normal_style))
                else:
                    story.append(Paragraph(linea.strip(), normal_style))
            story.append(Spacer(1, 0.15 * inch))

        story.append(PageBreak())
        story.append(Paragraph("ANALISIS DETALLADO DEL ESTADO", subtitulo_style))
        story.append(Spacer(1, 0.2 * inch))
        analisis_estado = analizar_estado_proyecto(proyecto)
        estado_data = [
            ['Estado Actual:', proyecto.get_estado_display()],
            ['Estado Sugerido por IA:', analisis_estado['estado_sugerido'].replace('_', ' ').title()]
        ]
        estado_table = Table(estado_data, colWidths=[2.5 * inch, 3.5 * inch])
        estado_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#dbeafe')),
            ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#eff6ff')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#bfdbfe')),
        ]))
        story.append(estado_table)
        story.append(Spacer(1, 0.2 * inch))
        story.append(Paragraph("Explicacion del estado sugerido", subtitulo_style))
        story.append(Paragraph(analisis_estado['estado_sugerido_explicacion'], normal_style))

        story.append(Spacer(1, 0.2 * inch))
        story.append(Paragraph("RIESGO GLOBAL", subtitulo_style))
        riesgo_data = [
            ['Nivel de Riesgo', analisis_estado['nivel_riesgo']],
            ['Explicacion IA', analisis_estado['nivel_riesgo_explicacion']]
        ]
        riesgo_table = Table(riesgo_data, colWidths=[2.5 * inch, 3.5 * inch])
        riesgo_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fee2e2')),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(riesgo_table)
        story.append(Spacer(1, 0.15 * inch))
        story.append(Paragraph("Recomendaciones de la IA", subtitulo_style))
        story.append(Spacer(1, 0.1 * inch))
        for idx, rec in enumerate(analisis_estado['recomendaciones'], 1):
            story.append(Paragraph(f"{idx}. {rec}", rec_style))

        if analisis_estado.get('glosario'):
            story.append(PageBreak())
            story.append(Paragraph("GLOSARIO DE TERMINOS", subtitulo_style))
            story.append(Paragraph("<i>Para usuarios sin conocimientos en gestion de proyectos</i>", normal_style))
            story.append(Spacer(1, 0.2 * inch))
            glosario_data = [['Termino', 'Explicacion']]
            for termino, definicion in analisis_estado['glosario'].items():
                glosario_data.append([termino, definicion])
            glosario_table = Table(glosario_data, colWidths=[1.5 * inch, 4.5 * inch])
            glosario_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            story.append(glosario_table)

        doc.build(story)
        buffer.seek(0)
        metadata = {
            'contexto': contexto or {},
            'kpis': (contexto or {}).get('kpis', {}),
            'alertas': (contexto or {}).get('alertas', []),
            'historial_kpi': (contexto or {}).get('historial_kpi', []),
            'ia': {
                'habilitada': ia_disponible(),
                'narrativa': analisis_ia_texto[:2000] if isinstance(analisis_ia_texto, str) else '',
                'estado': analisis_estado,
            }
        }
        return buffer, metadata

    except ImportError as e:
        print(f"Reportlab no disponible: {e}")
        return generar_excel_costos_evm(proyecto)
    except Exception as e:
        print(f"Error generando PDF con IA: {e}")
        return generar_pdf_resumen_ejecutivo(proyecto)

# Mapeo de funciones generadoras
GENERADORES = {
    'resumen_ejecutivo': {
        'pdf': generar_pdf_con_ia_resumen,
    },
    'avance_mensual': {
        'pdf': generar_pdf_avance_mensual,
    },
    'riesgos': {
        'pdf': generar_pdf_riesgos,
    },
    'costos_evm': {
        'excel': generar_excel_costos_evm,
    },
    'cronograma': {
        'excel': generar_excel_cronograma,
    },
    'general': {
        'pdf': generar_pdf_resumen_ejecutivo,  # Reutilizar
    }
}



def generar_informe(informe_obj):
    """
    Genera y almacena el archivo del informe solicitado.
    """
    tipo = informe_obj.tipo
    formato = informe_obj.formato
    proyecto = informe_obj.proyecto
    contexto = construir_contexto_informe(proyecto)

    if tipo in GENERADORES and formato in GENERADORES[tipo]:
        generador = GENERADORES[tipo][formato]

        try:
            kwargs = {}
            firma = inspect.signature(generador)
            if 'contexto' in firma.parameters:
                kwargs['contexto'] = contexto
            if 'informe' in firma.parameters:
                kwargs['informe'] = informe_obj

            resultado = generador(proyecto, **kwargs)
            metadata = None
            if isinstance(resultado, tuple):
                buffer, metadata = resultado
            else:
                buffer = resultado

            informe_obj.archivo.save(
                informe_obj.nombre_archivo,
                ContentFile(buffer.read()),
                save=False
            )

            configuracion = dict(informe_obj.configuracion or {})
            if metadata:
                configuracion.update(metadata)
            elif tipo == 'resumen_ejecutivo' and contexto:
                configuracion.setdefault('contexto', contexto)

            informe_obj.estado = 'completado'
            if configuracion:
                informe_obj.configuracion = configuracion
            informe_obj.save()
            return True

        except Exception as e:
            informe_obj.estado = 'error'
            informe_obj.mensaje_error = str(e)
            informe_obj.save()
            return False
    else:
        informe_obj.estado = 'error'
        informe_obj.mensaje_error = f"Generador no disponible para {tipo} en formato {formato}"
        informe_obj.save()
        return False

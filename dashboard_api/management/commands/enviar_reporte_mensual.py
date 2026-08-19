import io
from datetime import datetime, timedelta
from decimal import Decimal
from collections import defaultdict
from django.core.management.base import BaseCommand
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.db.models import Q
from django.db.models.functions import ExtractMonth
from core.models import ObjetivoAnual, ObjetivoAnualArea
from cotizaciones_api.models import Cotizacion, CotizacionApertura
from users.models import Usuario
from dashboard_api.views import generar_reporte_mensual_excel, get_short_name

def obtener_resumen_reporte(anno, mes):
    # 1. Metas/Cuotas Anuales
    metas = {
        "MIN": {"min": Decimal("0.00"), "max": Decimal("0.00")},
        "IND": {"min": Decimal("0.00"), "max": Decimal("0.00")},
        "OIL": {"min": Decimal("0.00"), "max": Decimal("0.00")},
        "SFY": {"min": Decimal("0.00"), "max": Decimal("0.00")},
    }

    objetivo_anual = ObjetivoAnual.objects.filter(
        anno=anno,
        id_modulo=1,  # COMERCIAL
        activo=True
    ).first()

    areas_codes = {2: "MIN", 1: "IND", 4: "OIL", 8: "SFY"}
    if objetivo_anual:
        objetivos_db = ObjetivoAnualArea.objects.filter(
            id_objetivo=objetivo_anual
        )
        for obj in objetivos_db:
            code = areas_codes.get(obj.id_area_id)
            if code:
                metas[code]["min"] = obj.minimo or Decimal("0.00")
                metas[code]["max"] = obj.maximo or Decimal("0.00")

    # 2. Logrado por Área
    logrados = {
        "MIN": Decimal("0.00"),
        "IND": Decimal("0.00"),
        "OIL": Decimal("0.00"),
        "SFY": Decimal("0.00"),
    }
    
    # Pre-calculate achievements per area and seller
    # Key: (area_id, seller_id) -> Decimal
    vendedores_qs = Usuario.objects.filter(
        id_area=6,
        activo=1
    ).filter(
        id_usuario__in=Cotizacion.objects.values_list("id_comercial", flat=True)
    ).order_by("nombre_completo")
    
    achieved = {}
    for area_id, area_name in areas_codes.items():
        openings = CotizacionApertura.objects.filter(
            anno_a=str(anno),
            estado_orden__in=[1, 2, 3],
            id_registro__id_area=area_id
        )
        if mes != "%":
            openings = openings.annotate(
                m=ExtractMonth("fecha_orden")
            ).filter(
                Q(m__lte=mes) | Q(mes__lte=mes)
            )
        
        # Group openings by Cotizacion
        cot_openings = defaultdict(list)
        for ap in openings:
            if ap.id_registro:
                cot_openings[ap.id_registro].append(ap)
                
        area_total = Decimal("0.00")
        for cot, aps in cot_openings.items():
            tipo_moneda = cot.tipo_moneda
            tipo_cambio = cot.tipo_cambio or Decimal("3.70")
            if tipo_cambio <= 0:
                tipo_cambio = Decimal("3.70")
            factor = Decimal("1.00") / tipo_cambio if tipo_moneda == "S" else Decimal("1.00")
            
            val_pres = sum((ap.total_orden or Decimal("0.00")) * factor for ap in aps)
            costo = sum(
                ((ap.orden_compra_equipos or Decimal("0.00")) + 
                 (ap.orden_compra_materiales or Decimal("0.00")) + 
                 (ap.orden_compra_costo_servicios or Decimal("0.00")) + 
                 (ap.orden_compra_otros or Decimal("0.00"))) * factor 
                for ap in aps
            )
            hh = sum((ap.orden_compra_hh or Decimal("0.00")) * factor for ap in aps)
            imprevistos = sum((ap.orden_compra_entrega or Decimal("0.00")) * factor for ap in aps)
            utilidad = val_pres - (costo + hh + imprevistos)
            
            val_logrado = hh + utilidad
            area_total += val_logrado
            
            # Map achievements to individual seller
            if cot.id_comercial_id:
                seller_id = cot.id_comercial_id
                achieved[(area_id, seller_id)] = achieved.get((area_id, seller_id), Decimal("0.00")) + val_logrado
            
        logrados[area_name] = area_total

    # Combine into list (Dividing annual goals by 12 if monthly view)
    resumen = []
    tot_logrado = Decimal("0.00")
    tot_max = Decimal("0.00")
    tot_min = Decimal("0.00")
    
    area_names_map = {
        "MIN": "Minería",
        "IND": "Industria",
        "OIL": "Petroquímica",
        "SFY": "Seguridad de Maquinaria"
    }
    
    es_mensual = (mes != "%")
    
    for area in ["MIN", "IND", "OIL", "SFY"]:
        l = logrados[area]
        mx = metas[area]["max"]
        mn = metas[area]["min"]
        
        if es_mensual:
            mx = (mx / Decimal("12.00")) * Decimal(str(mes))
            mn = (mn / Decimal("12.00")) * Decimal(str(mes))
            
        tot_logrado += l
        tot_max += mx
        tot_min += mn
        
        resumen.append({
            "area": area_names_map[area],
            "logrado": l,
            "max": mx,
            "min": mn
        })
        
    # Calculate seller-specific metrics
    vendedores_logrado = []
    factor_v = Decimal("1.00") / Decimal(str(len(vendedores_qs))) if vendedores_qs.exists() else Decimal("0.00")
    
    for v in vendedores_qs:
        v_total = Decimal("0.00")
        for area_id in [2, 1, 4, 8]:
            v_total += achieved.get((area_id, v.id_usuario), Decimal("0.00"))
            
        v_max = tot_max * factor_v
        v_min = tot_min * factor_v
        
        vendedores_logrado.append({
            "nombre": v.nombre_completo,
            "logrado": v_total,
            "max": v_max,
            "min": v_min
        })
        
    return resumen, tot_logrado, tot_max, tot_min, vendedores_logrado

class Command(BaseCommand):
    help = 'Genera y envía automáticamente el reporte mensual SGC.REG-004 de OC con validación de fin de mes'

    def add_arguments(self, parser):
        parser.add_argument('--anno', type=int, default=None, help='Año para el reporte')
        parser.add_argument('--mes', type=str, default=None, help='Mes para el reporte (número o %)')
        parser.add_argument('--emails', type=str, default=None, help='Correos separados por coma')
        parser.add_argument('--force', action='store_true', help='Ignora validación de fin de mes y envía inmediatamente')

    def handle(self, *args, **options):
        # 1. Validación de Fin de Mes (solo para envíos programados automáticos sin fecha manual y sin --force)
        es_programado = (options['mes'] is None and options['anno'] is None)
        force = options['force']
        
        if es_programado and not force:
            hoy = datetime.now().date()
            manana = hoy + timedelta(days=1)
            # Si el mes de mañana es igual al de hoy, significa que hoy NO es el último día del mes
            if manana.month == hoy.month:
                self.stdout.write("Hoy no es el último día del mes. Omitiendo envío programado de fin de mes.")
                return

        anno = options['anno'] or datetime.now().year
        
        raw_mes = options['mes']
        if raw_mes is None:
            mes = datetime.now().month  # Default to current month
        else:
            try:
                mes = int(raw_mes)
            except ValueError:
                mes = "%"
        
        # Diciembre es tratado de forma especial como Cierre Anual
        es_diciembre = (mes == 12)
        
        # Correos por defecto
        emails_str = options['emails'] or getattr(settings, 'REPORT_RECIPIENTS', '')
        if not emails_str:
            emails = ['alertas_sigecom@empresa.com']
        else:
            emails = [email.strip() for email in emails_str.split(',') if email.strip()]

        self.stdout.write(f"Generando reporte para el año {anno}, mes {mes}...")
        
        # 1. Generar resumen de datos para la tabla HTML
        # Si es diciembre, calculamos el consolidado del año completo para el email
        mes_calc = "%" if es_diciembre else mes
        resumen_data, tot_logrado, tot_max, tot_min, vendedores_data = obtener_resumen_reporte(anno, mes_calc)
        
        # 2. Generar el libro Excel
        wb = generar_reporte_mensual_excel(anno, mes)
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        
        # 3. Crear cuerpo HTML
        meses_nombres = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
        }
        
        es_mensual = (mes != "%" and not es_diciembre)
        if es_diciembre:
            periodo_label = f"Cierre de Ciclo Comercial Anual {anno}"
            lbl_logrado = "Logrado Anual"
            lbl_max = "Objetivo Máximo Anual"
            lbl_min = "Objetivo Mínimo Anual"
            asunto_periodo = f"Cierre de Ciclo Comercial {anno}"
            cuerpo_texto_footer = "Se adjunta el reporte ejecutivo Excel con el cierre anual del ciclo comercial."
            header_email_title = f"Cierre de Ciclo Comercial {anno}"
        elif es_mensual:
            periodo_nombre = meses_nombres.get(mes, str(mes))
            periodo_label = f"{periodo_nombre} de {anno}"
            lbl_logrado = "Logrado"
            lbl_max = "Objetivo Máximo"
            lbl_min = "Objetivo Mínimo"
            asunto_periodo = f"{periodo_nombre} {anno}"
            cuerpo_texto_footer = "Se adjunta el reporte ejecutivo Excel detallado para revisión."
            header_email_title = "Seguimiento de Órdenes de Compra (SGC.REG-004)"
        else:
            periodo_label = f"Consolidado Anual {anno}"
            lbl_logrado = "Logrado Anual"
            lbl_max = "Objetivo Máximo Anual"
            lbl_min = "Objetivo Mínimo Anual"
            asunto_periodo = f"Consolidado {anno}"
            cuerpo_texto_footer = "Se adjunta el reporte ejecutivo Excel detallado para revisión."
            header_email_title = "Seguimiento de Órdenes de Compra (SGC.REG-004)"
        
        # Generar filas de la tabla
        def fmt_curr(val):
            return f"$ {val:,.2f}"

        table_rows_html = ""
        for item in resumen_data:
            table_rows_html += f"""
            <tr>
                <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; text-align: center;"><strong>{item['area']}</strong></td>
                <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; text-align: center; font-variant-numeric: tabular-nums;">{fmt_curr(item['logrado'])}</td>
                <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; text-align: center; font-variant-numeric: tabular-nums; color: #475569;">{fmt_curr(item['max'])}</td>
                <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; text-align: center; font-variant-numeric: tabular-nums; color: #475569;">{fmt_curr(item['min'])}</td>
            </tr>
            """
        
        # Fila de totales
        table_rows_html += f"""
        <tr style="font-weight: bold; background-color: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 2px double #cbd5e1;">
            <td style="padding: 12px; font-size: 14px; text-align: center;">TOTALES</td>
            <td style="padding: 12px; font-size: 14px; text-align: center; font-variant-numeric: tabular-nums; color: #0f172a;">{fmt_curr(tot_logrado)}</td>
            <td style="padding: 12px; font-size: 14px; text-align: center; font-variant-numeric: tabular-nums; color: #0f172a;">{fmt_curr(tot_max)}</td>
            <td style="padding: 12px; font-size: 14px; text-align: center; font-variant-numeric: tabular-nums; color: #0f172a;">{fmt_curr(tot_min)}</td>
        </tr>
        """

        # Generar filas de la tabla de vendedores
        table_vendedores_rows_html = ""
        tot_logrado_v = Decimal("0.00")
        tot_max_v = Decimal("0.00")
        
        for item in vendedores_data:
            pct_max = (float(item['logrado']) / float(item['max']) * 100) if item['max'] > 0 else 0
            table_vendedores_rows_html += f"""
            <tr>
                <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; text-align: left;"><strong>{item['nombre']}</strong></td>
                <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; text-align: center; font-variant-numeric: tabular-nums;">{fmt_curr(item['logrado'])}</td>
                <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; text-align: center; font-variant-numeric: tabular-nums; color: #475569;">{fmt_curr(item['max'])}</td>
                <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; text-align: center; font-variant-numeric: tabular-nums; color: #10b981; font-weight: bold;">{pct_max:.1f}%</td>
            </tr>
            """
            tot_logrado_v += item['logrado']
            tot_max_v += item['max']

        pct_max_v = (float(tot_logrado_v) / float(tot_max_v) * 100) if tot_max_v > 0 else 0
        table_vendedores_rows_html += f"""
        <tr style="font-weight: bold; background-color: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 2px double #cbd5e1;">
            <td style="padding: 12px; font-size: 14px; text-align: left;">TOTALES</td>
            <td style="padding: 12px; font-size: 14px; text-align: center; font-variant-numeric: tabular-nums; color: #0f172a;">{fmt_curr(tot_logrado_v)}</td>
            <td style="padding: 12px; font-size: 14px; text-align: center; font-variant-numeric: tabular-nums; color: #0f172a;">{fmt_curr(tot_max_v)}</td>
            <td style="padding: 12px; font-size: 14px; text-align: center; font-variant-numeric: tabular-nums; color: #10b981;">{pct_max_v:.1f}%</td>
        </tr>
        """

        html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
    <div style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 30px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);">
        <div style="border-bottom: 2px solid #237573; padding-bottom: 15px; margin-bottom: 25px;">
            <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0;">{header_email_title}</h1>
            <p style="font-size: 14px; color: #64748b; margin-top: 5px; margin-bottom: 0;"><strong>Periodo:</strong> {periodo_label}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
            <h2 style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Seguimiento por Área Comercial</h2>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                        <th style="color: #334155; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 10px 12px; text-align: center;">Área</th>
                        <th style="color: #334155; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 10px 12px; text-align: center;">{lbl_logrado}</th>
                        <th style="color: #334155; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 10px 12px; text-align: center;">{lbl_max}</th>
                        <th style="color: #334155; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 10px 12px; text-align: center;">{lbl_min}</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows_html}
                </tbody>
            </table>
        </div>

        <div style="margin-bottom: 25px;">
            <h2 style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Seguimiento por Vendedor Comercial</h2>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                        <th style="color: #334155; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 10px 12px; text-align: left;">Vendedor</th>
                        <th style="color: #334155; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 10px 12px; text-align: center;">Conseguido</th>
                        <th style="color: #334155; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 10px 12px; text-align: center;">Meta Prorrateada</th>
                        <th style="color: #334155; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 10px 12px; text-align: center;">% Avance</th>
                    </tr>
                </thead>
                <tbody>
                    {table_vendedores_rows_html}
                </tbody>
            </table>
        </div>
        
        <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-top: 25px; margin-bottom: 15px;">{cuerpo_texto_footer}</p>
        
        <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 25px;">Mensaje automático enviado desde el Módulo Comercial de SIGECOM 5.0</p>
    </div>
</body>
</html>
"""

        # Crear cuerpo de texto alternativo para clientes sin soporte HTML
        text_body = (
            f"{header_email_title}\n"
            f"Periodo: {periodo_label}\n\n"
            f"Resumen de montos logrados por área:\n"
        )
        for item in resumen_data:
            text_body += f"- {item['area']}: {lbl_logrado}: {fmt_curr(item['logrado'])} ({lbl_max}: {fmt_curr(item['max'])})\n"
        text_body += f"- TOTAL: {lbl_logrado}: {fmt_curr(tot_logrado)}\n\n"
        text_body += f"{cuerpo_texto_footer}\n\nSoporte SIGECOM"

        # 4. Enviar correo usando Módulo Comercial como Remitente
        filename_excel = f"SGC.REG-004 Seguimiento de OC {anno}.xlsx"
        
        if es_diciembre:
            subject = f"Reporte Anual: SGC.REG-004 Seguimiento de OC {anno} - Cierre de Ciclo Comercial"
        else:
            subject = f"Reporte Mensual: SGC.REG-004 Seguimiento de OC {anno} ({asunto_periodo})"
        
        # Formato de remitente amigable
        from_email_formatted = f"Módulo Comercial <{settings.DEFAULT_FROM_EMAIL}>"
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=from_email_formatted,
            to=emails
        )
        email.attach_alternative(html_body, "text/html")
        email.attach(
            filename=filename_excel,
            content=buffer.getvalue(),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
        self.stdout.write("Enviando correo...")
        email.send()
        self.stdout.write(self.style.SUCCESS(f"Reporte enviado con éxito a: {', '.join(emails)}"))


# ─── Librerías estándar ─────────────────────────────
import os
import io
import re
import json
import unicodedata
import pandas as pd
import platform
import subprocess
import logging
from decimal import Decimal, InvalidOperation
from html import unescape
from openpyxl import Workbook
from weasyprint import HTML
from pdf2docx import Converter
import tempfile
from pathlib import Path
import shutil
from docxtpl import DocxTemplate, RichText
import jinja2

from unidecode import unidecode

# ─── Librerías de terceros ──────────────────────────
from reportlab.pdfgen import canvas

from . import serializers
logger = logging.getLogger(__name__)

# ─── Django core ────────────────────────────────────
from django.conf import settings
from django.http import JsonResponse, HttpResponse, FileResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils import timezone
from django.db.models import Sum, Count, Q, F, Max, DecimalField, ExpressionWrapper, Func, F, Value, TextField, IntegerField
from django.db.models.functions import TruncDate, Coalesce, ExtractMonth, Lower
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.db import transaction, IntegrityError
from django.views.decorators.http import require_GET
from django.utils.dateparse import parse_date
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from django.views.decorators.clickjacking import xframe_options_exempt

from rest_framework_simplejwt.authentication import JWTAuthentication

# ─── Django REST Framework ──────────────────────────
from rest_framework.decorators import api_view, parser_classes, permission_classes, action, authentication_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status, viewsets, generics, filters, permissions
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.generics import RetrieveAPIView

from django.http import HttpResponse
from django.template.loader import render_to_string
from django.conf import settings

from django.shortcuts import render
from collections import OrderedDict
from string import ascii_uppercase
from copy import deepcopy
import calendar

CACHE_LIST_KEY = "liquidacion_list"
CACHE_DETAIL_PREFIX = "liquidacion_detail_"

# ─── Modelos y Serializers propios ─────────────────
from django.conf import settings
from datetime import date, datetime, timedelta
from django.utils.timezone import now
from .models import (
    Cotizacion,
    CotizacionSuministro,
    CotizacionServicio,
    CotizacionAdjunto,
    CotizacionMensaje,
    CotizacionCondicionGeneral,
    CotizacionSeguimiento,
    CotizacionApertura,
    alm_articulos,
    vc_tab_notas,
    vc_mov_orden,
    )

from users.models import (
    Usuario,
    Area,
    Cargo,
    )

from core.models import Cliente, Representante, Estado, TipoCotizacion, UnidadTiempo, TipoGasto

from .serializers import (
    CotizacionTablaSerializer,
    CotizacionSuministroSerializer,
    CotizacionServicioSerializer,
    CotizacionMensajeSerializer,
    CotizacionSeguimientoSerializer,
    CotizacionModalSerializer,
    CotizacionAutocompleteSerializer,
    OportunidadTablaSerializer,
    CotizacionSerializer,
    CotizacionAperturaSerializer,
    CotizacionAperturaTablaSerializer,
    AlmArticulosSerializer,
    NotasSerializer,
)

from users.serializers import (
    AreasSerializer,
    CargosSerializer,
    UsuarioSerializer,
)


PLANTILLAS_DIR = os.path.join(os.path.dirname(__file__), "plantillas")

def siguiente_version(cotin):
    import re
    match = re.search(r'([A-Z])', cotin)
    if not match:
        raise ValueError("No se encontró versión en el cotin")

    letra_actual = match.group(1)
    nueva_letra = chr(ord(letra_actual) + 1)

    return cotin.replace(letra_actual, nueva_letra, 1)

# ===== Obtener y asegurar token CSRF =====
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Establece una cookie CSRF en el cliente. 
    Útil para peticiones POST protegidas desde el frontend.
    """
    return JsonResponse({'message': 'CSRF token set correctly.'}, status=200)

def format_datetime(value, fmt="%Y-%m-%d %H:%M:%S"):
    if not value:
        return None
    if isinstance(value, str):
        return value
    from django.utils.timezone import is_aware, localtime
    try:
        if is_aware(value):
            value = localtime(value)
        return value.strftime(fmt)
    except Exception:
        return str(value)

#==============#
# COTIZACIONES #
#==============#
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lista_cotizaciones(request):
    try:
        # ============================================================
        # Parameters and Search Mapping
        # ============================================================
        anno = request.GET.get("anno", date.today().year)
        mes = request.GET.get("mes", "%")
        anno_desde = request.GET.get("anno_desde")
        anno_hasta = request.GET.get("anno_hasta")
        mes_desde = request.GET.get("mes_desde")
        mes_hasta = request.GET.get("mes_hasta")
        id_probabilidad = request.GET.get("probabilidad", "%")
        id_cliente = request.GET.get("cliente", "%")
        comercial_search = request.GET.get("comercial_search", "%")
        tecnico_search = request.GET.get("tecnico_search", "%")
        id_estado = request.GET.get("estado", "%")
        id_area = request.GET.get("area", "%")
        envio = request.GET.get("envio", "%")
        id_representante = request.GET.get("id_representante")

        CAMPOS_BUSQUEDA = {
            "id_registro": "id_registro",
            "codigo": "codigo",
            "fecha": "fecha",
            "cliente_nombre": "id_cliente__nombre",
            "referencia": "referencia",
            "representante": "representante_nombre",
            "total": "total_cotizacion",
            "probabilidad": "probabilidad",
        }

        campo = request.GET.get("campo")
        valor = request.GET.get("valor")
        fecha_inicio = request.GET.get("fechaInicio")
        fecha_fin = request.GET.get("fechaFin")

        personal = request.GET.get("personal", "false").lower() == "true"

        # ============================================================
        # Query base (Excluyendo ID_ESTADO = 11: Oportunidad, a menos que se solicite)
        # ============================================================
        incluir_oportunidades = request.GET.get("incluir_oportunidades", "false").lower() == "true"

        qs = Cotizacion.objects.select_related(
            'id_cliente', 'id_estado', 'id_comercial', 'id_tecnico', 'id_tipo',
            'id_unidad_tiempo_entrega_suministros',
            'id_unidad_tiempo_entrega_servicios',
            'id_unidad_tiempo_validez'
        )
        if not incluir_oportunidades:
            qs = qs.exclude(id_estado=11)

        # Filtros de Segmentación Estándar
        if anno_desde and anno_hasta and mes_desde and mes_hasta:
            try:
                periodo_min = int(anno_desde) * 100 + int(mes_desde)
                periodo_max = int(anno_hasta) * 100 + int(mes_hasta)
                qs = qs.filter(año_apertura__isnull=False, mes__isnull=False).annotate(
                    periodo_operativo=ExpressionWrapper(
                        F('año_apertura') * 100 + F('mes'),
                        output_field=IntegerField()
                    )
                ).filter(periodo_operativo__gte=periodo_min, periodo_operativo__lte=periodo_max)
            except (ValueError, TypeError):
                pass
        else:
            if anno != "%":
                qs = qs.filter(año_apertura=int(anno))
            if mes != "%":
                qs = qs.filter(mes=int(mes))
        if id_probabilidad != "%":
            qs = qs.filter(probabilidad=int(id_probabilidad))
        if id_cliente != "%":
            qs = qs.filter(id_cliente=id_cliente)
        if id_representante:
            qs = qs.filter(id_representante=id_representante)
        if id_area and id_area != "%":
            if "," in id_area:
                areas = [int(a.strip()) for a in id_area.split(",") if a.strip().isdigit()]
                qs = qs.filter(id_area__in=areas)
            else:
                try:
                    qs = qs.filter(id_area=int(id_area))
                except ValueError:
                    pass
        if envio != "%":
            qs = qs.filter(estado_envio=envio)

        # Filtro de Estado múltiple/único (respetando la exclusión implícita)
        if id_estado and id_estado != "%" and id_estado != "TODAS":
            parts = [e.strip() for e in id_estado.split(",") if e.strip()]
            if parts:
                q_filter = Q()
                for part in parts:
                    if part.isdigit():
                        q_filter |= Q(id_estado=int(part))
                    else:
                        q_filter |= Q(id_estado__nombre__iexact=part)
                qs = qs.filter(q_filter)

        # Filtros de Responsables
        if comercial_search != "%":
            qs = qs.filter(id_comercial__nombre_completo__icontains=comercial_search)
        if tecnico_search != "%":
            qs = qs.filter(id_tecnico__nombre_completo__icontains=tecnico_search)

        if fecha_inicio:
            qs = qs.filter(fecha__gte=fecha_inicio)
        if fecha_fin:
            qs = qs.filter(fecha__lte=fecha_fin)

        # ============================================================
        # Filtros complejos de Tiempos y Validez
        # ============================================================
        suministros_val = request.GET.get("suministros_val", "")
        suministros_uni = request.GET.get("suministros_uni", "D")
        servicios_val = request.GET.get("servicios_val", "")
        servicios_uni = request.GET.get("servicios_uni", "D")
        oferta_val = request.GET.get("oferta_val", "")
        oferta_uni = request.GET.get("oferta_uni", "D")

        import calendar
        hoy_date = date.today()

        def calculate_target_date(start_date, val, code):
            if not start_date or val is None or not code:
                return None
            f_date = start_date.date() if hasattr(start_date, "date") else start_date
            if not isinstance(f_date, date):
                return None
            code_upper = code.upper()
            try:
                if code_upper == 'D': return f_date + timedelta(days=val)
                elif code_upper == 'S': return f_date + timedelta(weeks=val)
                elif code_upper == 'Q': return f_date + timedelta(days=val * 15)
                elif code_upper == 'M':
                    month = f_date.month - 1 + val
                    year = f_date.year + month // 12
                    month = month % 12 + 1
                    day = min(f_date.day, calendar.monthrange(year, month)[1])
                    return date(year, month, day)
                elif code_upper == 'T':
                    month = f_date.month - 1 + (val * 3)
                    year = f_date.year + month // 12
                    month = month % 12 + 1
                    day = min(f_date.day, calendar.monthrange(year, month)[1])
                    return date(year, month, day)
                elif code_upper == 'A':
                    year = f_date.year + val
                    month = f_date.month
                    day = min(f_date.day, calendar.monthrange(year, month)[1])
                    return date(year, month, day)
            except Exception:
                pass
            return None

        if suministros_val and suministros_val.strip().isdigit():
            try:
                user_val = int(suministros_val.strip())
                limit_date = calculate_target_date(hoy_date, user_val, suministros_uni)
                if limit_date:
                    records_data = qs.values_list("id_registro", "fecha", "entrega_suministros", "id_unidad_tiempo_entrega_suministros__codigo")
                    matching_ids = [id_reg for id_reg, f_dt, val, code in records_data if (c_dt := calculate_target_date(f_dt, val, code)) and hoy_date <= c_dt <= limit_date]
                    qs = qs.filter(id_registro__in=matching_ids)
            except Exception as ex: logger.error(f"Error suministros: {str(ex)}")

        if servicios_val and servicios_val.strip().isdigit():
            try:
                user_val = int(servicios_val.strip())
                limit_date = calculate_target_date(hoy_date, user_val, servicios_uni)
                if limit_date:
                    records_data = qs.values_list("id_registro", "fecha", "entrega_servicios", "id_unidad_tiempo_entrega_servicios__codigo")
                    matching_ids = [id_reg for id_reg, f_dt, val, code in records_data if (c_dt := calculate_target_date(f_dt, val, code)) and hoy_date <= c_dt <= limit_date]
                    qs = qs.filter(id_registro__in=matching_ids)
            except Exception as ex: logger.error(f"Error servicios: {str(ex)}")

        if oferta_val and oferta_val.strip().isdigit():
            try:
                user_val = int(oferta_val.strip())
                limit_date = calculate_target_date(hoy_date, user_val, oferta_uni)
                if limit_date:
                    records_data = qs.values_list("id_registro", "fecha", "validez_oferta", "id_unidad_tiempo_validez__codigo")
                    matching_ids = [id_reg for id_reg, f_dt, val, code in records_data if (c_dt := calculate_target_date(f_dt, val, code)) and hoy_date <= c_dt <= limit_date]
                    qs = qs.filter(id_registro__in=matching_ids)
            except Exception as ex: logger.error(f"Error oferta: {str(ex)}")

        # Búsqueda Flexible
        if campo and valor not in (None, "", " "):
            if campo == "all":
                from datetime import datetime
                valor_clean = valor.lower().strip()
                
                # Envío
                q_envio = Q()
                if "enviado" in valor_clean:
                    q_envio = Q(estado_envio=2)
                elif "pendiente" in valor_clean:
                    q_envio = Q(estado_envio=1)
                
                # Áreas
                AREA_MAP = {
                    1: "Industria",
                    2: "Minería",
                    3: "Mantenimiento",
                    4: "Petroquímica",
                    8: "Seguridad de Maquinaria",
                }
                area_keys = [k for k, v in AREA_MAP.items() if valor_clean in v.lower()]
                q_area = Q(id_area__in=area_keys) if area_keys else Q()
                
                # Intentar convertir valor_clean a número para buscar por total, id_registro
                q_numero = Q()
                try:
                    clean_num_str = valor_clean.replace("$", "").replace(",", "").strip()
                    val_num = float(clean_num_str)
                    q_numero = Q(total_cotizacion=val_num) | Q(id_registro=int(val_num) if val_num.is_integer() else 0)
                except ValueError:
                    pass

                # Intentar parsear fecha
                q_fecha = Q()
                for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
                    try:
                        parsed_date = datetime.strptime(valor_clean, fmt).date()
                        q_fecha = Q(fecha=parsed_date)
                        break
                    except ValueError:
                        pass
                
                if valor_clean.isdigit() and len(valor_clean) == 4:
                    q_fecha = q_fecha | Q(fecha__year=int(valor_clean))

                qs = qs.filter(
                    Q(codigo__icontains=valor_clean) |
                    Q(referencia__icontains=valor_clean) |
                    Q(id_cliente__nombre__icontains=valor_clean) |
                    Q(representante_nombre__icontains=valor_clean) |
                    Q(id_estado__nombre__icontains=valor_clean) |
                    q_envio |
                    q_area |
                    q_numero |
                    q_fecha
                )
            else:
                campo_real = CAMPOS_BUSQUEDA.get(campo)
                if campo_real:
                    valor_norm = unidecode(valor.lower().strip())
                    qs = qs.filter(**{f"{campo_real}__icontains": valor_norm})

        # Guardamos el queryset sin filtro de personal para alertas
        qs_sin_personal = qs
        if personal:
            qs = qs.filter(id_comercial=request.user)

        # ============================================================
        # Metrics Processing (Dashboard)
        # ============================================================
        total_regs = qs.count()
        monto_soles = monto_dolares = este_mes_conteo = 0
        stats_estados = {"Pendiente": 0, "En Seguimiento": 0, "Adjudicado": 0, "Postergada": 0, "Perdida": 0, "Anulado": 0}
        stats_clientes = {}
        conteo_meses = [0] * 12

        for c in qs:
            monto = float(c.total_cotizacion or 0)
            if c.tipo_moneda == "D": monto_dolares += monto
            else: monto_soles += monto

            if c.fecha:
                conteo_meses[c.fecha.month - 1] += 1
                if c.fecha.month == hoy_date.month and c.fecha.year == hoy_date.year:
                    este_mes_conteo += 1

            est_nom = c.id_estado.nombre if c.id_estado else "Sin Estado"
            stats_estados[est_nom] = stats_estados.get(est_nom, 0) + 1

            cli_id = c.id_cliente_id or "S/C"
            cli_nom = c.id_cliente.nombre if c.id_cliente else (c.representante_nombre or "Desconocido")
            if cli_id not in stats_clientes:
                stats_clientes[cli_id] = {"nombre": cli_nom, "cantidad": 0, "total": 0}
            stats_clientes[cli_id]["cantidad"] += 1
            stats_clientes[cli_id]["total"] += monto

        clientes_lista = sorted([{"id": k, **v, "porcentaje": round((v["cantidad"]/total_regs)*100, 2) if total_regs else 0} for k, v in stats_clientes.items()], key=lambda x: x["cantidad"], reverse=True)[:10]

        dashboard_data = {
            "total": total_regs,
            "esteMes": este_mes_conteo,
            "montoTotalSoles": round(monto_soles, 2),
            "montoTotalDolares": round(monto_dolares, 2),
            "promedioSoles": round(monto_soles / total_regs, 2) if total_regs and monto_soles else 0,
            "estados": stats_estados,
            "porMes": conteo_meses,
            "clientes": clientes_lista,
        }

        AREA_MAP = {
            1: "Industria", 
            2: "Minería", 
            3: "Mantenimiento", 
            4: "Petroquímica", 
            8: "Seguridad"
        }
        
        def calc_date(start_dt, val, code):
            if not start_dt or val is None or not code:
                return None
            try:
                f_date = start_dt.date() if hasattr(start_dt, "date") else start_dt
                if not isinstance(f_date, date):
                    return None
                code_upper = str(code).upper()
                if code_upper == 'D':
                    return f_date + timedelta(days=val)
                elif code_upper in ('S', 'W'):
                    return f_date + timedelta(weeks=val)
                elif code_upper == 'Q':
                    return f_date + timedelta(days=val * 15)
                elif code_upper == 'M':
                    month = f_date.month - 1 + val
                    year = f_date.year + month // 12
                    month = month % 12 + 1
                    day = min(f_date.day, calendar.monthrange(year, month)[1])
                    return date(year, month, day)
                elif code_upper == 'T':
                    month = f_date.month - 1 + (val * 3)
                    year = f_date.year + month // 12
                    month = month % 12 + 1
                    day = min(f_date.day, calendar.monthrange(year, month)[1])
                    return date(year, month, day)
                elif code_upper == 'A':
                    year = f_date.year + val
                    month = f_date.month
                    day = min(f_date.day, calendar.monthrange(year, month)[1])
                    return date(year, month, day)
            except Exception:
                pass
            return None

        tabla_data = []
        ordered_qs = qs.order_by('-fecha', '-id_registro')
        from decimal import Decimal
        for c in ordered_qs:
            comercial_nombre = c.id_comercial.nombre_completo if c.id_comercial else "Por asignar"
            comercial_correo = c.id_comercial.correo if c.id_comercial else None
            comercial_movil_corporativo = c.id_comercial.movil_coorporativo if c.id_comercial else None
            comercial_movil_personal = c.id_comercial.movil_personal if c.id_comercial else None
            comercial_dni = c.id_comercial.dni if c.id_comercial else None

            tecnico_nombre = c.id_tecnico.nombre_completo if c.id_tecnico else "Por asignar"
            tecnico_correo = c.id_tecnico.correo if c.id_tecnico else None
            tecnico_movil_corporativo = c.id_tecnico.movil_coorporativo if c.id_tecnico else None
            tecnico_movil_personal = c.id_tecnico.movil_personal if c.id_tecnico else None

            cliente_nombre = c.id_cliente.nombre if c.id_cliente else (c.representante_nombre or "S/N")
            estado_nombre = c.id_estado.nombre if c.id_estado else None
            tipo_nombre = c.id_tipo.nombre if c.id_tipo else None
            area_nombre = AREA_MAP.get(c.id_area, "Otros")
            
            envio = 3 if c.estado_envio in (2, 3) else 2
            fecha_str = format_datetime(c.fecha)
            total_val = str(c.total_cotizacion) if isinstance(c.total_cotizacion, Decimal) else c.total_cotizacion

            sumi_code = c.id_unidad_tiempo_entrega_suministros.codigo if c.id_unidad_tiempo_entrega_suministros else None
            serv_code = c.id_unidad_tiempo_entrega_servicios.codigo if c.id_unidad_tiempo_entrega_servicios else None
            vali_code = c.id_unidad_tiempo_validez.codigo if c.id_unidad_tiempo_validez else None
            
            dt_sumi = calc_date(c.fecha, c.entrega_suministros, sumi_code)
            dt_serv = calc_date(c.fecha, c.entrega_servicios, serv_code)
            dt_vali = calc_date(c.fecha, c.validez_oferta, vali_code)

            tabla_data.append({
                "id_registro": c.id_registro,
                "codigo": c.codigo,
                "fecha": fecha_str,
                "numero": c.codigo,
                "referencia": c.referencia,
                "cliente_nombre": cliente_nombre,
                "representante_nombre": c.representante_nombre,
                "comercial_nombre": comercial_nombre,
                "comercial_correo": comercial_correo,
                "comercial_movil_corporativo": comercial_movil_corporativo,
                "comercial_movil_personal": comercial_movil_personal,
                "comercial_dni": comercial_dni,
                "tecnico_nombre": tecnico_nombre,
                "tecnico_correo": tecnico_correo,
                "tecnico_movil_corporativo": tecnico_movil_corporativo,
                "tecnico_movil_personal": tecnico_movil_personal,
                "estado_nombre": estado_nombre,
                "id_estado": c.id_estado_id,
                "tipo_nombre": tipo_nombre,
                "area_nombre": area_nombre,
                "total_cotizacion": total_val,
                "tipo_moneda": c.tipo_moneda,
                "probabilidad": c.probabilidad,
                "estado_envio": c.estado_envio,
                "envio": envio,
                "suministros_valor": c.entrega_suministros,
                "suministros_unidad": c.id_unidad_tiempo_entrega_suministros.nombre if c.id_unidad_tiempo_entrega_suministros else None,
                "servicios_valor": c.entrega_servicios,
                "servicios_unidad": c.id_unidad_tiempo_entrega_servicios.nombre if c.id_unidad_tiempo_entrega_servicios else None,
                "validez_valor": c.validez_oferta,
                "validez_unidad": c.id_unidad_tiempo_validez.nombre if c.id_unidad_tiempo_validez else None,
                "fijar": c.fijar,
                "visita_tecnica": format_datetime(c.visita_tecnica),
                "fecha_limite": format_datetime(c.fecha_limite),
                "id_comercial": c.id_comercial_id,
                "id_tecnico": c.id_tecnico_id,
                "fecha_entrega_suministros": format_datetime(dt_sumi),
                "fecha_entrega_servicios": format_datetime(dt_serv),
                "fecha_validez_oferta": format_datetime(dt_vali),
            })

        # Recordatorios de Seguimiento agendados
        alertas_qs = CotizacionMensaje.objects.filter(
            id_registro__in=qs_sin_personal,
            alerta="1",
            activo="1"
        )
        if personal:
            alertas_qs = alertas_qs.filter(Q(id_registro__id_comercial=request.user) | Q(id_usuario=request.user))
        alertas_qs = alertas_qs.select_related('id_registro', 'id_registro__id_cliente', 'id_registro__id_comercial', 'id_usuario')

        alertas_data = []
        for alert in alertas_qs:
            c_reg = alert.id_registro
            c_cliente = c_reg.id_cliente
            alertas_data.append({
                "id_mensaje": alert.id_mensaje,
                "id_registro": c_reg.id_registro,
                "cotizacion_codigo": c_reg.codigo,
                "cotizacion_referencia": c_reg.referencia,
                "cliente_nombre": c_cliente.nombre if c_cliente else (c_reg.representante_nombre or "S/N"),
                "comercial_nombre": alert.id_usuario.nombre_completo if alert.id_usuario else (c_reg.id_comercial.nombre_completo if c_reg.id_comercial else "Por asignar"),
                "id_comercial": alert.id_usuario_id if alert.id_usuario else c_reg.id_comercial_id,
                "mensaje": alert.mensaje,
                "alerta_fecha": format_datetime(alert.alerta_fecha),
                "completo": alert.completo,
                "estado_nombre": c_reg.id_estado.nombre if c_reg.id_estado else "Sin Estado",
                "id_estado": c_reg.id_estado_id,
            })

        return Response({
            "dashboard": dashboard_data,
            "tabla": tabla_data,
            "alertas_agendadas": alertas_data,
            "anno": anno
        })
    except Exception as e:
        return Response({"error": f"Error en Dashboard Cotizaciones: {str(e)}"}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ultima_cotizacion_cliente(request, id_cliente):
    try:
        cot = Cotizacion.objects.select_related(
            'id_cliente', 'id_estado', 'id_tipo',
            'id_unidad_tiempo_entrega_suministros',
            'id_unidad_tiempo_entrega_servicios',
            'id_unidad_tiempo_validez',
            'id_comercial', 'id_tecnico'
        ).filter(id_cliente=id_cliente).order_by('-id_registro').first()
        
        if not cot:
            return Response({"detail": "No se encontraron cotizaciones para este cliente."}, status=404)
        
        serializer = CotizacionAutocompleteSerializer(cot)
        return Response(serializer.data)
    except Exception as e:
        print(f"❌ Error en ultima_cotizacion_cliente: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tiempos_frecuentes(request):
    try:
        # Sanitizar parámetros para evitar errores con null/undefined del frontend
        id_cliente_raw = request.GET.get("id_cliente")
        id_tipo_raw = request.GET.get("id_tipo")

        id_cliente = int(id_cliente_raw) if id_cliente_raw and str(id_cliente_raw).isdigit() else None
        id_tipo = id_tipo_raw if id_tipo_raw and id_tipo_raw.strip() not in ("", "null", "undefined") else None

        # Fallbacks por defecto generales con unidad_frontend precargada
        defaults_suministros = [
            {"cantidad": 15, "unidad_codigo": "D", "unidad_nombre": "Días", "unidad_frontend": "D", "formateado": "15 Días"},
            {"cantidad": 30, "unidad_codigo": "D", "unidad_nombre": "Días", "unidad_frontend": "D", "formateado": "30 Días"},
            {"cantidad": 4, "unidad_codigo": "S", "unidad_nombre": "Semanas", "unidad_frontend": "S", "formateado": "4 Semanas"},
            {"cantidad": 6, "unidad_codigo": "S", "unidad_nombre": "Semanas", "unidad_frontend": "S", "formateado": "6 Semanas"},
        ]
        defaults_servicios = [
            {"cantidad": 3, "unidad_codigo": "D", "unidad_nombre": "Días", "unidad_frontend": "D", "formateado": "3 Días"},
            {"cantidad": 5, "unidad_codigo": "D", "unidad_nombre": "Días", "unidad_frontend": "D", "formateado": "5 Días"},
            {"cantidad": 7, "unidad_codigo": "D", "unidad_nombre": "Días", "unidad_frontend": "D", "formateado": "7 Días"},
            {"cantidad": 2, "unidad_codigo": "S", "unidad_nombre": "Semanas", "unidad_frontend": "S", "formateado": "2 Semanas"},
        ]

        def query_frecuencias(campo_valor, campo_unidad, base_filter):
            qs = (
                Cotizacion.objects.filter(**base_filter)
                .values(campo_valor, f'{campo_unidad}__codigo', f'{campo_unidad}__nombre')
                .annotate(count=Count('id_registro'))
                .order_by('-count')[:5]
            )
            
            result = []
            for r in qs:
                cant = r[campo_valor]
                cod = r[f'{campo_unidad}__codigo'] or "D"
                nom = r[f'{campo_unidad}__nombre'] or "Días"
                
                # Mapear código de unidad para el frontend
                fe_cod = "D"
                cod_lower = (cod or "").lower()
                if "s" in cod_lower:
                    fe_cod = "S"
                elif "m" in cod_lower:
                    fe_cod = "M"

                result.append({
                    "cantidad": cant,
                    "unidad_codigo": cod,
                    "unidad_nombre": nom,
                    "unidad_frontend": fe_cod,
                    "formateado": f"{cant} {nom}"
                })
            return result

        defaults_validez = [
            {"cantidad": 15, "unidad_codigo": "D", "unidad_nombre": "Días", "unidad_frontend": "D", "formateado": "15 Días"},
            {"cantidad": 30, "unidad_codigo": "D", "unidad_nombre": "Días", "unidad_frontend": "D", "formateado": "30 Días"},
            {"cantidad": 45, "unidad_codigo": "D", "unidad_nombre": "Días", "unidad_frontend": "D", "formateado": "45 Días"},
            {"cantidad": 60, "unidad_codigo": "D", "unidad_nombre": "Días", "unidad_frontend": "D", "formateado": "60 Días"},
        ]

        suministros_list = []
        servicios_list = []
        validez_list = []

        # 1. Intentar buscar por cliente + tipo
        if id_cliente and id_tipo:
            filter_sum = {
                "id_cliente": id_cliente,
                "id_tipo": id_tipo,
                "entrega_suministros__isnull": False,
                "entrega_suministros__gt": 0
            }
            suministros_list = query_frecuencias('entrega_suministros', 'id_unidad_tiempo_entrega_suministros', filter_sum)

            filter_ser = {
                "id_cliente": id_cliente,
                "id_tipo": id_tipo,
                "entrega_servicios__isnull": False,
                "entrega_servicios__gt": 0
            }
            servicios_list = query_frecuencias('entrega_servicios', 'id_unidad_tiempo_entrega_servicios', filter_ser)

            filter_val = {
                "id_cliente": id_cliente,
                "id_tipo": id_tipo,
                "validez_oferta__isnull": False,
                "validez_oferta__gt": 0
            }
            validez_list = query_frecuencias('validez_oferta', 'id_unidad_tiempo_validez', filter_val)

        # 2. Fallback 1: Buscar frecuencias globales del tipo de cotización
        if not suministros_list and id_tipo:
            filter_sum = {
                "id_tipo": id_tipo,
                "entrega_suministros__isnull": False,
                "entrega_suministros__gt": 0
            }
            suministros_list = query_frecuencias('entrega_suministros', 'id_unidad_tiempo_entrega_suministros', filter_sum)

        if not servicios_list and id_tipo:
            filter_ser = {
                "id_tipo": id_tipo,
                "entrega_servicios__isnull": False,
                "entrega_servicios__gt": 0
            }
            servicios_list = query_frecuencias('entrega_servicios', 'id_unidad_tiempo_entrega_servicios', filter_ser)

        if not validez_list and id_tipo:
            filter_val = {
                "id_tipo": id_tipo,
                "validez_oferta__isnull": False,
                "validez_oferta__gt": 0
            }
            validez_list = query_frecuencias('validez_oferta', 'id_unidad_tiempo_validez', filter_val)

        # 3. Fallback 2: Usar defaults predefinidos si no hay resultados
        if not suministros_list:
            suministros_list = defaults_suministros
        if not servicios_list:
            servicios_list = defaults_servicios
        if not validez_list:
            validez_list = defaults_validez

        return Response({
            "suministros": suministros_list,
            "servicios": servicios_list,
            "validez": validez_list
        })
    except Exception as e:
        print(f"❌ Error en tiempos_frecuentes: {str(e)}")
        return Response({"error": str(e)}, status=500)

def obtener_ultimo_valor_no_vacio_historial(id_registro, field_label):
    from cotizaciones_api.models import CotizacionSeguimiento
    import re
    
    # Buscar registros ordenados por id descendente
    logs = CotizacionSeguimiento.objects.filter(
        id_registro_id=id_registro,
        detalle__icontains=field_label
    ).order_by('-id_seguimiento')
    
    for log in logs:
        detalle = log.detalle or ""
        
        # Si el log más reciente es de eliminación, significa que el estado anterior era vacío
        if "eliminó" in detalle.lower() or "elimino" in detalle.lower():
            return "Vacío"
            
        val = None
        
        # Intentar buscar formato "Se actualizó [label] de 'old' a 'new'"
        match_upd = re.search(rf"Se actualizó {field_label} de '.*?' a '([^']+)'", detalle, re.IGNORECASE)
        if match_upd:
            val = match_upd.group(1)
        else:
            # Intentar buscar formato "Se agregó [genero] [label] 'new'"
            match_add = re.search(rf"Se agregó (?:\w+\s+)?{field_label} '([^']+)'", detalle, re.IGNORECASE)
            if match_add:
                val = match_add.group(1)
                
        if val and val != "Vacío" and val != "null" and val.strip() != "":
            return val
            
    return "Vacío"

def formatear_mensaje_cambio(label, old_val, new_val):
    femeninos = [
        "Área", "Moneda", "Probabilidad", "Forma de pago", "Validez de oferta", 
        "Fecha de recepción", "Fecha límite", "Fecha de visita técnica", "Fecha de emisión", "Referencia"
    ]
    # "Área" is grammatically masculine when using article because of tonic 'a' (el área).
    genero = "la" if (label in femeninos and label != "Área") else "el"
    
    is_old_empty = old_val is None or str(old_val).strip() in ["", "Vacío", "None"]
    is_new_empty = new_val is None or str(new_val).strip() in ["", "Vacío", "None"]
    
    if is_old_empty and not is_new_empty:
        # Se agregó
        if label.lower() == "representante":
            return f"Se actualizó representante de ' ' a '{new_val}'"
        return f"Se agregó {genero} {label.lower()} '{new_val}'"
    elif not is_old_empty and is_new_empty:
        # Se eliminó
        return f"Se eliminó {genero} {label.lower()}"
    else:
        # Se actualizó
        return f"Se actualizó {label.lower()} de '{old_val}' a '{new_val}'"

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def cotizacion_detalle(request, id_registro):
    try:
        from django.db.models import Prefetch

        suministros_qs = CotizacionSuministro.objects.select_related(
            'id_marca', 'id_tipo_gasto', 'id_unidad_tiempo_entrega'
        )
        servicios_qs = CotizacionServicio.objects.select_related(
            'id_area', 'id_tipo_gasto'
        )

        cot = Cotizacion.objects.select_related(
            'id_cliente', 'id_estado', 'id_tipo',
            'id_unidad_tiempo_entrega_suministros',
            'id_unidad_tiempo_entrega_servicios',
            'id_unidad_tiempo_validez'
        ).prefetch_related(
            Prefetch('suministros', queryset=suministros_qs),
            Prefetch('servicios', queryset=servicios_qs),
            'mensajes_rel',
            'seguimientos',
            'adjuntos'
        ).filter(id_registro=id_registro).first()

        if not cot:
            return Response({"error": "Cotización no encontrada"}, status=404)

        if request.method == "GET":
            serializer = CotizacionModalSerializer(cot)
            return Response(serializer.data)

        elif request.method == "PUT":
            if cot.estado_envio == 2:
                return Response(
                    {"error": "La cotización está congelada (ya fue enviada al cliente). No se admiten modificaciones."}, 
                    status=400
                )
            
            # ── GUARDAR SNAPSHOTS ANTES DEL GUARDADO ──
            fields_to_track = {
                'referencia': ('Referencia', str),
                'forma_pago': ('Forma de pago', str),
                'lugar': ('Lugar de entrega', str),
                'tipo_moneda': ('Moneda', lambda x: 'Dólares' if x == 'D' else 'Soles'),
                'tipo_cambio': ('Tipo de cambio', str),
                'igv': ('IGV', lambda x: 'Incluye' if x == 'I' else ('Incluye' if x == 'S' else 'No Incluye')),
                'entrega_suministros': ('Tiempo de entrega (Suministros)', str),
                'entrega_servicios': ('Tiempo de entrega (Servicios)', str),
                'validez_oferta': ('Validez de oferta', str),
                'probabilidad': ('Probabilidad', lambda x: 'Baja' if str(x) == '0' else ('Media' if str(x) == '1' else ('Alta' if str(x) == '2' else ('Muy Alta' if str(x) == '3' else str(x) if x is not None else 'Vacío')))),
                'comentario': ('Comentario', str),
            }

            old_vals = {}
            for field in fields_to_track:
                old_vals[field] = getattr(cot, field)

            old_area_id = cot.id_area
            old_tipo_id = cot.id_tipo_id
            old_cliente_id = cot.id_cliente_id
            old_rep_id = cot.id_representante_id
            old_comercial_id = cot.id_comercial_id
            old_tecnico_id = cot.id_tecnico_id
            old_est_id = cot.id_estado_id
            old_estado_op = cot.estado_oportunidad
            old_codigo = cot.codigo

            old_dates = {
                'recepcion_solicitud': cot.recepcion_solicitud,
                'fecha_limite': cot.fecha_limite,
                'visita_tecnica': cot.visita_tecnica,
                'emision_cotizacion': cot.emision_cotizacion
            }

            area_mapping = {1: "Industria", 2: "Minería", 3: "Mantenimiento", 4: "Petroquímica", 8: "Seguridad"}
            old_area_name = area_mapping.get(old_area_id, "Vacío")
            old_tipo_name = cot.id_tipo.nombre if cot.id_tipo else "Vacío"
            old_cliente_name = cot.id_cliente.nombre if cot.id_cliente else "Vacío"
            old_rep_name = cot.id_representante.nombre_representante if cot.id_representante else "Vacío"
            old_comercial_name = cot.id_comercial.nombre_completo if cot.id_comercial else "Vacío"
            old_tecnico_name = cot.id_tecnico.nombre_completo if cot.id_tecnico else "Vacío"
            old_estado_name = cot.id_estado.nombre if cot.id_estado else "Vacío"

            serializer = CotizacionSerializer(cot, data=request.data, partial=True)
            if serializer.is_valid():
                with transaction.atomic():
                    cot.refresh_from_db()
                    serializer.save()
                    cot.refresh_from_db()

                    # ── COMPARA Y REGISTRA EN TRAZABILIDAD ──
                    cambios = []
                    
                    for field, (label, formatter) in fields_to_track.items():
                        new_val = getattr(cot, field)
                        old_val = old_vals[field]
                        if new_val != old_val:
                            if not (new_val is None and old_val == "") and not (new_val == "" and old_val is None):
                                formatted_old = formatter(old_val) if old_val is not None else "Vacío"
                                formatted_new = formatter(new_val) if new_val is not None else "Vacío"
                                if formatted_old != formatted_new:
                                    cambios.append(formatear_mensaje_cambio(label, formatted_old, formatted_new))

                    # Omitir logs intermedios a "Vacío" y resolver los valores anteriores del historial
                    if cot.id_area != old_area_id:
                        new_area_name = area_mapping.get(cot.id_area, "Vacío")
                        resolved_old = old_area_name
                        if resolved_old == "Vacío" and new_area_name != "Vacío":
                            resolved_old = obtener_ultimo_valor_no_vacio_historial(cot.id_registro, "Área")
                        if resolved_old != new_area_name:
                            cambios.append(formatear_mensaje_cambio("Área", resolved_old, new_area_name))

                    if cot.id_tipo_id != old_tipo_id:
                        new_tipo_name = cot.id_tipo.nombre if cot.id_tipo else "Vacío"
                        resolved_old = old_tipo_name
                        if resolved_old == "Vacío" and new_tipo_name != "Vacío":
                            resolved_old = obtener_ultimo_valor_no_vacio_historial(cot.id_registro, "Tipo")
                        if resolved_old != new_tipo_name:
                            cambios.append(formatear_mensaje_cambio("Tipo", resolved_old, new_tipo_name))

                    if cot.id_cliente_id != old_cliente_id:
                        new_cliente_name = cot.id_cliente.nombre if cot.id_cliente else "Vacío"
                        resolved_old = old_cliente_name
                        if resolved_old == "Vacío" and new_cliente_name != "Vacío":
                            resolved_old = obtener_ultimo_valor_no_vacio_historial(cot.id_registro, "Cliente")
                        if resolved_old != new_cliente_name:
                            cambios.append(formatear_mensaje_cambio("Cliente", resolved_old, new_cliente_name))

                    if cot.id_representante_id != old_rep_id:
                        new_rep_name = cot.id_representante.nombre_representante if cot.id_representante else "Vacío"
                        resolved_old = old_rep_name
                        if resolved_old == "Vacío" and new_rep_name != "Vacío":
                            resolved_old = obtener_ultimo_valor_no_vacio_historial(cot.id_registro, "Representante")
                        if resolved_old != new_rep_name:
                            cambios.append(formatear_mensaje_cambio("Representante", resolved_old, new_rep_name))

                    if cot.id_comercial_id != old_comercial_id:
                        new_comercial_name = cot.id_comercial.nombre_completo if cot.id_comercial else "Vacío"
                        resolved_old = old_comercial_name
                        if resolved_old == "Vacío" and new_comercial_name != "Vacío":
                            resolved_old = obtener_ultimo_valor_no_vacio_historial(cot.id_registro, "Responsable Comercial")
                        if resolved_old != new_comercial_name:
                            cambios.append(formatear_mensaje_cambio("Responsable Comercial", resolved_old, new_comercial_name))

                    if cot.id_tecnico_id != old_tecnico_id:
                        new_tecnico_name = cot.id_tecnico.nombre_completo if cot.id_tecnico else "Vacío"
                        resolved_old = old_tecnico_name
                        if resolved_old == "Vacío" and new_tecnico_name != "Vacío":
                            resolved_old = obtener_ultimo_valor_no_vacio_historial(cot.id_registro, "Responsable Técnico")
                        if resolved_old != new_tecnico_name:
                            cambios.append(formatear_mensaje_cambio("Responsable Técnico", resolved_old, new_tecnico_name))

                    if cot.id_estado_id != old_est_id:
                        new_estado_name = cot.id_estado.nombre if cot.id_estado else "Vacío"
                        resolved_old = old_estado_name
                        if resolved_old == "Vacío" and new_estado_name != "Vacío":
                            resolved_old = obtener_ultimo_valor_no_vacio_historial(cot.id_registro, "Estado")
                        if resolved_old != new_estado_name:
                            cambios.append(formatear_mensaje_cambio("Estado", resolved_old, new_estado_name))

                    if cot.estado_oportunidad != old_estado_op:
                        opp_states_map = {1: "Pendiente", 2: "No Cotizado", 3: "Rechazado", 4: "Cotizado"}
                        old_opp = opp_states_map.get(old_estado_op, 'Desconocido')
                        new_opp = opp_states_map.get(cot.estado_oportunidad, 'Desconocido')
                        cambios.append(formatear_mensaje_cambio("Estado de Oportunidad", old_opp, new_opp))

                    for date_field, label in [
                        ('recepcion_solicitud', 'Fecha de recepción'),
                        ('fecha_limite', 'Fecha límite'),
                        ('visita_tecnica', 'Fecha de visita técnica'),
                        ('emision_cotizacion', 'Fecha de emisión')
                    ]:
                        old_date = old_dates[date_field]
                        new_date = getattr(cot, date_field)
                        
                        # Normalizar a hora local (si es aware) antes de formatear
                        old_local = timezone.localtime(old_date) if (old_date and timezone.is_aware(old_date)) else old_date
                        new_local = timezone.localtime(new_date) if (new_date and timezone.is_aware(new_date)) else new_date
                        
                        old_d_str = old_local.strftime('%d/%m/%Y %H:%M') if old_local else "Vacío"
                        new_d_str = new_local.strftime('%d/%m/%Y %H:%M') if new_local else "Vacío"
                        
                        if old_d_str != new_d_str:
                            cambios.append(formatear_mensaje_cambio(label, old_d_str, new_d_str))

                    # Si cambiaron campos clave (área, tipo, cliente), recalculamos el código
                    if (cot.id_area != old_area_id or 
                        cot.id_tipo_id != old_tipo_id or 
                        cot.id_cliente_id != old_cliente_id):
                        
                        cot.refresh_from_db(fields=['id_area', 'id_tipo', 'id_cliente', 'codigo'])
                        nuevo_codigo = calcular_codigo_dinamico(cot, cot.codigo)
                        if nuevo_codigo != cot.codigo:
                            # Evitar guardar código vacío o nulo
                            if nuevo_codigo and nuevo_codigo != "SIN CÓDIGO":
                                cot.codigo = nuevo_codigo
                                cot.save(update_fields=['codigo'])
                                
                                # Registrar hito en seguimiento con la categoría propia CÓDIGO
                                CotizacionSeguimiento.objects.create(
                                    id_registro=cot,
                                    detalle=f"CÓDIGO: Código actualizado de '{old_codigo or 'SIN CÓDIGO'}' a '{nuevo_codigo}'",
                                    id_usuario=request.user,
                                    activo='1'
                                )

                    for cambio in cambios:
                        CotizacionSeguimiento.objects.create(
                            id_registro=cot,
                            detalle=f"DATOS: {cambio}",
                            id_usuario=request.user,
                            activo='1'
                        )
                    actualizar_total_general_cotizacion(cot)

                # Return updated detail
                updated_cot = Cotizacion.objects.select_related(
                    'id_cliente', 'id_estado', 'id_tipo',
                    'id_unidad_tiempo_entrega_suministros',
                    'id_unidad_tiempo_entrega_servicios',
                    'id_unidad_tiempo_validez'
                ).filter(id_registro=id_registro).first()
                return Response(CotizacionModalSerializer(updated_cot).data)
            return Response(serializer.errors, status=400)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cotizacion_version(request, id_registro):
    """
    Endpoint ultraligero para polling de concurrencia en tiempo real.
    Retorna un hash de versión y timestamp para verificar cambios sin transferir datos pesados.
    """
    try:
        from django.db.models import Max
        import hashlib

        cot = Cotizacion.objects.filter(id_registro=id_registro).values(
            'id_registro', 'total_cotizacion', 'id_estado_id', 'estado_oportunidad', 'estado_envio',
            'descuento_monto', 'descuento_aplica'
        ).first()

        if not cot:
            return Response({"error": "Cotización no encontrada"}, status=404)

        seg = CotizacionSeguimiento.objects.filter(id_registro=id_registro).aggregate(
            max_id=Max('id_seguimiento'),
            max_fecha=Max('fecha')
        )

        sum_count = CotizacionSuministro.objects.filter(id_registro=id_registro).count()
        serv_count = CotizacionServicio.objects.filter(id_registro=id_registro).count()

        version_raw = f"{cot['id_registro']}_{cot['total_cotizacion']}_{cot['id_estado_id']}_{cot['estado_oportunidad']}_{cot['estado_envio']}_{cot['descuento_monto']}_{cot['descuento_aplica']}_{seg['max_id']}_{seg['max_fecha']}_{sum_count}_{serv_count}"
        version_hash = hashlib.md5(version_raw.encode('utf-8')).hexdigest()

        return Response({
            "id_registro": id_registro,
            "version": version_hash,
            "timestamp": seg['max_fecha']
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

def actualizar_total_general_cotizacion(cotizacion):
    """
    Recalcula el total_cotizacion de la cotización base, sumando:
    - Suministros (nivel=0): Sum(venta_total * cantidad)
    - Servicios (nivel=0): Sum(cotizado_total * cantidad_hombres)
    Aplica el descuento correspondiente de la cotización si existiera.
    """
    cotizacion.refresh_from_db()
    num_reg = cotizacion.id_registro

    # A. Actualizar jerárquicamente Suministros (nivel=0 <- nivel=1)
    grupos_sum = CotizacionSuministro.objects.filter(
        id_registro=num_reg
    ).values_list("codigo_grupo", flat=True).distinct()

    for cod_g in grupos_sum:
        sum_items = CotizacionSuministro.objects.filter(
            id_registro=num_reg,
            codigo_grupo=cod_g,
            nivel=1
        ).aggregate(total=Coalesce(Sum("venta_total"), Decimal("0.00")))["total"]

        CotizacionSuministro.objects.filter(
            id_registro=num_reg,
            codigo_grupo=cod_g,
            nivel=0
        ).update(venta_total=sum_items)

    # B. Actualizar jerárquicamente Servicios (nivel=1 <- nivel=2, nivel=0 <- nivel=1)
    servicios_nivel0 = CotizacionServicio.objects.filter(
        id_registro=num_reg,
        nivel=0
    )
    for s0 in servicios_nivel0:
        prefix = s0.codigo_servicio[:2] if s0.codigo_servicio else ""
        if not prefix:
            continue
        
        subgrupos = CotizacionServicio.objects.filter(
            id_registro=num_reg,
            nivel=1,
            codigo_servicio__startswith=prefix
        )
        
        total_servicio = Decimal("0.00")
        for sg in subgrupos:
            item_code = sg.codigo_servicio[:-1] + "2" if sg.codigo_servicio and len(sg.codigo_servicio) >= 2 else ""
            sum_items = CotizacionServicio.objects.filter(
                id_registro=num_reg,
                nivel=2,
                codigo_servicio=item_code
            ).aggregate(total=Coalesce(Sum("cotizado_total"), Decimal("0.00")))["total"]
            
            sg.cotizado_total = sum_items
            sg.save(update_fields=["cotizado_total"])
            total_servicio += sum_items
            
        s0.cotizado_total = total_servicio
        s0.save(update_fields=["cotizado_total"])
    
    # 1. Totales suministros
    total_suministros = CotizacionSuministro.objects.filter(
        id_registro=num_reg,
        nivel=0
    ).aggregate(
        total=Coalesce(
            Sum(
                ExpressionWrapper(
                    F("venta_total") * F("cantidad"),
                    output_field=DecimalField(max_digits=18, decimal_places=2),
                )
            ),
            Decimal("0.00")
        )
    )["total"]

    # 2. Totales servicios
    total_servicios = CotizacionServicio.objects.filter(
        id_registro=num_reg,
        nivel=0
    ).aggregate(
        total=Coalesce(
            Sum(
                ExpressionWrapper(
                    F("cotizado_total") * F("cantidad_hombres"),
                    output_field=DecimalField(max_digits=18, decimal_places=2),
                )
            ),
            Decimal("0.00")
        )
    )["total"]

    total_general = total_suministros + total_servicios

    # 3. Aplicar descuento guardado en la cotización
    if cotizacion.descuento_aplica == 1:
        importe_desc = cotizacion.descuento_monto or Decimal("0.00")
        if importe_desc > 0:
            if cotizacion.descuento_afecto == "T":
                total_general -= importe_desc
            elif cotizacion.descuento_afecto == "S":
                total_general = (total_suministros - importe_desc) + total_servicios
            elif cotizacion.descuento_afecto == "M":
                total_general = total_suministros + (total_servicios - importe_desc)

    if total_general < 0:
        total_general = Decimal("0.00")

    cotizacion.total_cotizacion = total_general
    cotizacion.save(update_fields=["total_cotizacion"])
    return total_general

def _obtener_nombre_suministro_padre(cot_id, codigo_grupo):
    padre = CotizacionSuministro.objects.filter(
        id_registro=cot_id,
        nivel=0,
        codigo_grupo=codigo_grupo
    ).first()
    return padre.nombre_grupo if (padre and padre.nombre_grupo) else "Suministro General"

def _obtener_nombre_servicio_padre(cot_id, codigo_servicio):
    if not codigo_servicio or len(codigo_servicio) < 2:
        return "Servicio General"
    prefix = codigo_servicio[:2]
    padre = CotizacionServicio.objects.filter(
        id_registro=cot_id,
        nivel=0,
        codigo_servicio__startswith=prefix
    ).first()
    return padre.nombre_servicio if (padre and padre.nombre_servicio) else "Servicio General"

def _obtener_categoria_servicio(tipo_gasto_id):
    if tipo_gasto_id == 3:
        return "MANO DE OBRA"
    elif tipo_gasto_id == 4:
        return "GASTO DE SERVICIO"
    return "OTROS"

@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def listar_suministros(request, id_registro):

    try:
        # Validación de seguridad por estado congelado
        cot = Cotizacion.objects.filter(id_registro=id_registro).first()
        if not cot:
            return Response({"error": "Cotización no encontrada"}, status=404)

        if request.method in ["POST", "PUT", "DELETE"] and cot.estado_envio == 2:
            return Response(
                {"error": "La cotización está congelada (ya fue enviada al cliente). No se admiten modificaciones."}, 
                status=400
            )
        # ======================
        # 📄 LISTAR
        # ======================
        if request.method == "GET":
            # Auto-ajuste de la longitud de la columna 'detalle' en la BD física
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("ALTER TABLE cotizaciones_seguimiento MODIFY COLUMN detalle VARCHAR(1000) NULL")
            except Exception:
                pass

            # Usamos select_related para traer los nombres de marca y gasto de una vez
            suministros = CotizacionSuministro.objects.select_related(
                'id_marca', 'id_tipo_gasto', 'id_unidad_tiempo_entrega'
            ).filter(id_registro=id_registro).order_by("orden", "id_suministro")

            serializer = CotizacionSuministroSerializer(suministros, many=True)
            return Response(serializer.data)

        # ======================
        # ➕ CREAR
        # ======================
        if request.method == "POST":
            data = request.data.copy()
            # Asignamos el ID del padre (la cotización)
            data["id_registro"] = id_registro 

            # Asignar automáticamente el orden si no viene o es nulo/cero
            if "orden" not in data or data.get("orden") is None or data.get("orden") == "" or data.get("orden") == 0:
                from django.db.models import Max
                max_orden = CotizacionSuministro.objects.filter(id_registro=id_registro).aggregate(Max('orden'))['orden__max']
                data["orden"] = (max_orden or 0) + 1

            serializer = CotizacionSuministroSerializer(data=data)
            if serializer.is_valid():
                sumin = serializer.save()
                actualizar_total_general_cotizacion(cot)
                
                # Registrar en la trazabilidad (Seguimiento)
                if sumin.nivel == 0:
                    detalle_log = f"Suministros: Agregar Suministro '{sumin.nombre_grupo or ''}'"
                else:
                    detalle_log = f"Suministros: Agregar item '{sumin.codigo_item or ''} - {sumin.descripcion or ''}'"
                
                CotizacionSeguimiento.objects.create(
                    id_registro=cot,
                    detalle=detalle_log,
                    id_usuario=request.user,
                    activo='1'
                )
                
                return Response(serializer.data, status=201)

            print("ERROR SERIALIZER POST SUMINISTROS:", serializer.errors)
            return Response(serializer.errors, status=400)

        # ======================
        # ✏️ ACTUALIZAR
        # ======================
        if request.method == "PUT":
            # Si es un reordenamiento por lote
            if isinstance(request.data, dict) and "reorder_items" in request.data:
                items_data = request.data.get("reorder_items", [])
                for item_info in items_data:
                    item_id = item_info.get("id_suministro")
                    new_orden = item_info.get("orden")
                    new_codigo_grupo = item_info.get("codigo_grupo")
                    
                    try:
                        suministro = CotizacionSuministro.objects.get(
                            id_suministro=item_id,
                            id_registro=id_registro
                        )
                        if new_orden is not None:
                            suministro.orden = new_orden
                        if new_codigo_grupo is not None:
                            suministro.codigo_grupo = new_codigo_grupo
                        suministro.save()
                    except CotizacionSuministro.DoesNotExist:
                        pass
                return Response({"message": "Orden actualizado correctamente"})

            # Buscamos por la nueva PK: id_suministro
            item_id = request.data.get("id_suministro")

            try:
                item_id = int(item_id)
            except (TypeError, ValueError):
                return Response({"error": "ID de suministro inválido"}, status=400)

            # Validamos que el suministro pertenezca a la cotización correcta
            suministro = CotizacionSuministro.objects.get(
                id_suministro=item_id,
                id_registro=id_registro
            )

            # Guardamos snapshot antes de la edición
            old_nombre_grupo = suministro.nombre_grupo
            old_codigo_item = suministro.codigo_item
            old_descripcion = suministro.descripcion
            old_cantidad = suministro.cantidad
            old_precio_venta = suministro.precio_venta
            old_venta_total = suministro.venta_total
            old_proveedor = suministro.proveedor
            old_observacion = suministro.observacion
            old_tipo_unidad = suministro.tipo_unidad

            data = request.data.copy()
            # Limpiamos data para evitar modificar las PKs por error
            data.pop("id_suministro", None)
            data.pop("id_registro", None)

            serializer = CotizacionSuministroSerializer(
                suministro,
                data=data,
                partial=True
            )

            if serializer.is_valid():
                sumin_updated = serializer.save()
                actualizar_total_general_cotizacion(cot)
                
                # Detectar cambios y registrar trazabilidad
                cambios = []
                if sumin_updated.nivel == 0:
                    if old_nombre_grupo != sumin_updated.nombre_grupo:
                        cambios.append(f"Nombre de grupo modificado de '{old_nombre_grupo or 'Vacío'}' a '{sumin_updated.nombre_grupo or 'Vacío'}'")
                    detalle_prefijo = f"Suministros: Editar Suministro '{sumin_updated.nombre_grupo or ''}':"
                else:
                    if old_codigo_item != sumin_updated.codigo_item:
                        cambios.append(f"Código de item modificado de '{old_codigo_item or 'Vacío'}' a '{sumin_updated.codigo_item or 'Vacío'}'")
                    if old_descripcion != sumin_updated.descripcion:
                        cambios.append(f"Descripción modificada de '{old_descripcion or 'Vacío'}' a '{sumin_updated.descripcion or 'Vacío'}'")
                    if old_cantidad != sumin_updated.cantidad:
                        cambios.append(f"Cantidad modificada de '{old_cantidad or 0}' a '{sumin_updated.cantidad or 0}'")
                    if old_precio_venta != sumin_updated.precio_venta:
                        cambios.append(f"Precio de venta modificado de '{old_precio_venta or 0}' a '{sumin_updated.precio_venta or 0}'")
                    if old_venta_total != sumin_updated.venta_total:
                        cambios.append(f"Venta total modificada de '{old_venta_total or 0}' a '{sumin_updated.venta_total or 0}'")
                    if old_proveedor != sumin_updated.proveedor:
                        cambios.append(f"Proveedor modificado de '{old_proveedor or 'Vacío'}' a '{sumin_updated.proveedor or 'Vacío'}'")
                    if old_observacion != sumin_updated.observacion:
                        cambios.append(f"Observación modificada de '{old_observacion or 'Vacío'}' a '{sumin_updated.observacion or 'Vacío'}'")
                    if old_tipo_unidad != sumin_updated.tipo_unidad:
                        cambios.append(f"Unidad modificada de '{old_tipo_unidad or 'Vacío'}' a '{sumin_updated.tipo_unidad or 'Vacío'}'")
                    detalle_prefijo = f"Suministros: Editar item '{sumin_updated.codigo_item or ''} - {sumin_updated.descripcion or ''}':"
                
                if cambios:
                    CotizacionSeguimiento.objects.create(
                        id_registro=cot,
                        detalle=f"{detalle_prefijo} {', '.join(cambios)}",
                        id_usuario=request.user,
                        activo='1'
                    )
                
                return Response(serializer.data)

            print("ERROR SERIALIZER PUT SUMINISTROS:", serializer.errors)
            return Response(serializer.errors, status=400)

        # ======================
        # 🗑️ ELIMINAR
        # ======================
        if request.method == "DELETE":
            item_id = request.query_params.get("id_suministro")
            try:
                item_id = int(item_id)
            except (TypeError, ValueError):
                return Response({"error": "ID de suministro inválido"}, status=400)

            suministro = CotizacionSuministro.objects.get(
                id_suministro=item_id,
                id_registro=id_registro
            )

            # Trazabilidad
            if suministro.nivel == 0:
                detalle_log = f"Suministros: Eliminar Suministro '{suministro.nombre_grupo or ''}'"
            else:
                detalle_log = f"Suministros: Eliminar item '{suministro.codigo_item or ''} - {suministro.descripcion or ''}'"

            # Si es cabecera de grupo (nivel=0), también eliminamos los items del grupo
            if suministro.nivel == 0:
                CotizacionSuministro.objects.filter(
                    id_registro=id_registro,
                    codigo_grupo=suministro.codigo_grupo
                ).exclude(id_suministro=item_id).delete()

            suministro.delete()
            actualizar_total_general_cotizacion(cot)

            CotizacionSeguimiento.objects.create(
                id_registro=cot,
                detalle=detalle_log,
                id_usuario=request.user,
                activo='1'
            )

            return Response({"message": "Suministro eliminado correctamente"}, status=200)

    except CotizacionSuministro.DoesNotExist:
        return Response({"error": "Suministro no encontrado en esta cotización"}, status=404)

    except Exception as e:
        import traceback
        tb_str = traceback.format_exc()
        try:
            with open("c:/proyecto_sigecom/backend_error_suministros.log", "w", encoding="utf-8") as f:
                f.write(tb_str)
        except Exception:
            pass
        return Response({"error": str(e), "traceback": tb_str}, status=500)

def clean_text(text):
    """Limpia espacios, tabulaciones, saltos de línea y decodifica HTML."""
    if not text:
        return ""
    # Decodifica entidades HTML
    text = unescape(text)
    # Reemplaza cualquier secuencia de espacios o saltos de línea por un solo espacio
    text = re.sub(r"\s+", " ", text)
    return text.strip()

@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def listar_servicios(request, id_registro):
    try:
        # Validación de seguridad por estado congelado
        cot = Cotizacion.objects.filter(id_registro=id_registro).first()
        if not cot:
            return Response({"error": "Cotización no encontrada"}, status=404)

        if request.method in ["POST", "PUT", "DELETE"] and cot.estado_envio == 2:
            return Response(
                {"error": "La cotización está congelada (ya fue enviada al cliente). No se admiten modificaciones."}, 
                status=400
            )
        # ======================
        # 📄 LISTAR (Jerárquico)
        # ======================
        if request.method == "GET":
            # Traemos todo de la cotización ordenado por orden y id_servicio
            todos_los_servicios = list(CotizacionServicio.objects.select_related(
                'id_tipo_gasto', 'id_area'
            ).filter(id_registro=id_registro).order_by("orden", "id_servicio"))

            # Mapeo de tipos de gasto (Nivel 1)
            tipo_map = {
                "4": "MANO DE OBRA",
                "5": "GASTOS DE SERVICIOS",
                "6": "OTROS",
            }

            resultado = []
            current_group = None
            current_subgroup_by_type = {}

            grupo_index = 0

            for s in todos_los_servicios:
                if s.nivel == 0:
                    grupo_index += 1
                    prefix_familia = f"{grupo_index:02d}"
                    code_level0 = f"{prefix_familia}000"
                    s_code = s.codigo_servicio or code_level0

                    current_group = {
                        "id_servicio": s.id_servicio,
                        "tituloGeneral": s.nombre_servicio or "",
                        "cantidad": str(s.cantidad_hombres or "1"),
                        "detalle": s.descripcion_servicio or "",
                        "orden": s.orden or 0,
                        "subgrupos": [],
                        "_prefix": prefix_familia
                    }
                    resultado.append(current_group)
                    current_subgroup_by_type = {}

                elif s.nivel == 1:
                    if not current_group:
                        continue

                    tipo_digito = "6"
                    if s.id_tipo_gasto_id == 3:
                        tipo_digito = "4"
                    elif s.id_tipo_gasto_id == 4:
                        tipo_digito = "5"
                    elif s.id_tipo_gasto_id == 5:
                        tipo_digito = "6"
                    else:
                        if s.codigo_servicio and len(s.codigo_servicio) > 3:
                            tipo_digito = s.codigo_servicio[3]
                        elif s.codigo_servicio and len(s.codigo_servicio) >= 3:
                            tipo_digito = s.codigo_servicio[2]

                    prefix_sub = f"{current_group['_prefix']}0{tipo_digito}1"
                    s_code = s.codigo_servicio or prefix_sub

                    sg_data = {
                        "id": s.id_servicio,
                        "titulo": s.nombre_servicio or "",
                        "tipoCodigo": f"0{tipo_digito}",
                        "tipoNombre": tipo_map.get(tipo_digito, "OTROS"),
                        "codigo_servicio": s_code,
                        "items": [],
                        "_tipo_digito": tipo_digito
                    }
                    current_group["subgrupos"].append(sg_data)
                    current_subgroup_by_type[tipo_digito] = sg_data

                elif s.nivel == 2:
                    if not current_group:
                        continue

                    tipo_digito = "6"
                    if s.id_tipo_gasto_id == 3:
                        tipo_digito = "4"
                    elif s.id_tipo_gasto_id == 4:
                        tipo_digito = "5"
                    elif s.id_tipo_gasto_id == 5:
                        tipo_digito = "6"
                    else:
                        if s.codigo_servicio and len(s.codigo_servicio) > 3:
                            tipo_digito = s.codigo_servicio[3]

                    if tipo_digito not in current_subgroup_by_type:
                        sg_existente = next((sg for sg in current_group["subgrupos"] if sg["_tipo_digito"] == tipo_digito), None)
                        if not sg_existente:
                            sub_name = tipo_map.get(tipo_digito, "OTROS")
                            prefix_sub = f"{current_group['_prefix']}0{tipo_digito}1"
                            
                            sg_existente = {
                                "id": f"virtual_{s.id_servicio}",
                                "titulo": sub_name,
                                "tipoCodigo": f"0{tipo_digito}",
                                "tipoNombre": sub_name,
                                "codigo_servicio": prefix_sub,
                                "items": [],
                                "_tipo_digito": tipo_digito
                            }
                            current_group["subgrupos"].append(sg_existente)
                        current_subgroup_by_type[tipo_digito] = sg_existente

                    prefix_item = f"{current_group['_prefix']}0{tipo_digito}2"
                    s_code = s.codigo_servicio or prefix_item

                    serialized_item = CotizacionServicioSerializer(s).data
                    serialized_item["codigo_servicio"] = s_code
                    current_subgroup_by_type[tipo_digito]["items"].append(serialized_item)

            for g in resultado:
                g.pop("_prefix", None)
                for sg in g["subgrupos"]:
                    sg.pop("_tipo_digito", None)

            return Response(resultado)

        # ======================
        # ➕ CREAR (Individual)
        # ======================
        if request.method == "POST":
            data = request.data.copy()
            data["id_registro"] = id_registro 

            # Asignar automáticamente el orden si no viene o es nulo/cero/vacío
            if "orden" not in data or data.get("orden") is None or data.get("orden") == "" or data.get("orden") == 0:
                from django.db.models import Max
                max_orden = CotizacionServicio.objects.filter(id_registro=id_registro).aggregate(Max('orden'))['orden__max']
                data["orden"] = (max_orden or 0) + 1

            serializer = CotizacionServicioSerializer(data=data)
            if serializer.is_valid():
                serv = serializer.save()
                actualizar_total_general_cotizacion(cot)
                
                # Registrar en la trazabilidad (Seguimiento)
                if serv.nivel == 0:
                    detalle_log = f"Servicios: Agregar Servicio '{serv.nombre_servicio or ''}'"
                elif serv.nivel == 1:
                    detalle_log = f"Servicios: Se agregó el subgrupo '{serv.nombre_servicio or ''}'"
                else:
                    detalle_log = f"Servicios: Agregar item '{serv.codigo_item or ''} - {serv.descripcion_item or ''}'"
                
                CotizacionSeguimiento.objects.create(
                    id_registro=cot,
                    detalle=detalle_log,
                    id_usuario=request.user,
                    activo='1'
                )
                
                return Response(serializer.data, status=201)

            print("SERIALIZER VALIDATION ERROR:", serializer.errors)
            return Response(serializer.errors, status=400)

        # ======================
        # ✏️ ACTUALIZAR (Individual)
        # ======================
        if request.method == "PUT":
            # Si es un reordenamiento por lote
            if isinstance(request.data, dict) and "reorder_items" in request.data:
                items_data = request.data.get("reorder_items", [])
                for item_info in items_data:
                    item_id = item_info.get("id_servicio")
                    new_orden = item_info.get("orden")
                    new_codigo_servicio = item_info.get("codigo_servicio")
                    
                    try:
                        servicio = CotizacionServicio.objects.get(
                            id_servicio=item_id,
                            id_registro=id_registro
                        )
                        if new_orden is not None:
                            servicio.orden = new_orden
                        if new_codigo_servicio is not None:
                            servicio.codigo_servicio = new_codigo_servicio
                        servicio.save()
                    except CotizacionServicio.DoesNotExist:
                        pass
                return Response({"message": "Orden actualizado correctamente"})

            item_id = request.data.get("id_servicio")
            
            # Validamos que el registro pertenezca a la cotización
            servicio_instancia = CotizacionServicio.objects.get(
                id_servicio=item_id,
                id_registro=id_registro
            )

            # Snapshots antes de la edición
            old_nombre_servicio = servicio_instancia.nombre_servicio
            old_descripcion_servicio = servicio_instancia.descripcion_servicio
            old_codigo_item = servicio_instancia.codigo_item
            old_descripcion_item = servicio_instancia.descripcion_item
            old_horas = servicio_instancia.horas
            old_cantidad_hombres = servicio_instancia.cantidad_hombres
            old_cantidad_dias = servicio_instancia.cantidad_dias
            old_cotizado_hombre_dia = servicio_instancia.cotizado_hombre_dia
            old_cotizado_total = servicio_instancia.cotizado_total

            data = request.data.copy()
            # Limpiamos para evitar inyectar IDs por error
            data.pop("id_servicio", None)
            data.pop("id_registro", None)

            serializer = CotizacionServicioSerializer(
                servicio_instancia,
                data=data,
                partial=True
            )

            if serializer.is_valid():
                serv_updated = serializer.save()
                actualizar_total_general_cotizacion(cot)
                
                # Detectar cambios
                cambios = []
                if serv_updated.nivel == 0:
                    if old_nombre_servicio != serv_updated.nombre_servicio:
                        cambios.append(f"Nombre de servicio modificado de '{old_nombre_servicio or 'Vacío'}' a '{serv_updated.nombre_servicio or 'Vacío'}'")
                    if old_descripcion_servicio != serv_updated.descripcion_servicio:
                        cambios.append(f"Descripción de servicio modificada de '{old_descripcion_servicio or 'Vacío'}' a '{serv_updated.descripcion_servicio or 'Vacío'}'")
                    detalle_prefijo = f"Servicios: Editar Servicio '{serv_updated.nombre_servicio or ''}':"
                elif serv_updated.nivel == 1:
                    if old_nombre_servicio != serv_updated.nombre_servicio:
                        cambios.append(f"Nombre de subgrupo modificado de '{old_nombre_servicio or 'Vacío'}' a '{serv_updated.nombre_servicio or 'Vacío'}'")
                    detalle_prefijo = f"Servicios: Se editó el subgrupo '{serv_updated.nombre_servicio or ''}':"
                else:
                    if old_codigo_item != serv_updated.codigo_item:
                        cambios.append(f"Código modificado de '{old_codigo_item or 'Vacío'}' a '{serv_updated.codigo_item or 'Vacío'}'")
                    if old_descripcion_item != serv_updated.descripcion_item:
                        cambios.append(f"Descripción modificada de '{old_descripcion_item or 'Vacío'}' a '{serv_updated.descripcion_item or 'Vacío'}'")
                    if old_horas != serv_updated.horas:
                        cambios.append(f"Horas modificadas de '{old_horas or 0}' a '{serv_updated.horas or 0}'")
                    if old_cantidad_hombres != serv_updated.cantidad_hombres:
                        cambios.append(f"Cant. Hombres modificado de '{old_cantidad_hombres or 0}' a '{serv_updated.cantidad_hombres or 0}'")
                    if old_cantidad_dias != serv_updated.cantidad_dias:
                        cambios.append(f"Días modificado de '{old_cantidad_dias or 0}' a '{serv_updated.cantidad_dias or 0}'")
                    if old_cotizado_hombre_dia != serv_updated.cotizado_hombre_dia:
                        cambios.append(f"Hombre/Día modificado de '{old_cotizado_hombre_dia or 0}' a '{serv_updated.cotizado_hombre_dia or 0}'")
                    if old_cotizado_total != serv_updated.cotizado_total:
                        cambios.append(f"Cotizado Total modificado de '{old_cotizado_total or 0}' a '{serv_updated.cotizado_total or 0}'")
                    detalle_prefijo = f"Servicios: Editar item '{serv_updated.codigo_item or ''} - {serv_updated.descripcion_item or ''}':"

                if cambios:
                    CotizacionSeguimiento.objects.create(
                        id_registro=cot,
                        detalle=f"{detalle_prefijo} {', '.join(cambios)}",
                        id_usuario=request.user,
                        activo='1'
                    )
                
                return Response(serializer.data)

            return Response(serializer.errors, status=400)

        # ======================
        # 🗑️ ELIMINAR (Individual/Cascada)
        # ======================
        if request.method == "DELETE":
            item_id = request.query_params.get("id_servicio")
            try:
                item_id = int(item_id)
            except (TypeError, ValueError):
                return Response({"error": "ID de servicio inválido"}, status=400)

            servicio = CotizacionServicio.objects.get(
                id_servicio=item_id,
                id_registro=id_registro
            )

            if servicio.nivel == 0:
                detalle_log = f"Servicios: Eliminar Servicio '{servicio.nombre_servicio or ''}'"
            elif servicio.nivel == 1:
                detalle_log = f"Servicios: Se eliminó el subgrupo '{servicio.nombre_servicio or ''}'"
            else:
                detalle_log = f"Servicios: Eliminar item '{servicio.codigo_item or ''} - {servicio.descripcion_item or ''}'"

            # Si es cabecera (nivel=0), eliminamos todo el grupo de servicios
            if servicio.nivel == 0:
                prefijo_familia = servicio.codigo_servicio[:2] if servicio.codigo_servicio else ""
                if prefijo_familia:
                    CotizacionServicio.objects.filter(
                        id_registro=id_registro,
                        codigo_servicio__startswith=prefijo_familia
                    ).exclude(id_servicio=item_id).delete()
            
            # Si es subgrupo (nivel=1), eliminamos todos sus items
            elif servicio.nivel == 1:
                prefijo_subgrupo = servicio.codigo_servicio[:4] if servicio.codigo_servicio else ""
                if prefijo_subgrupo:
                    CotizacionServicio.objects.filter(
                        id_registro=id_registro,
                        codigo_servicio__startswith=prefijo_subgrupo
                    ).exclude(id_servicio=item_id).delete()

            servicio.delete()
            actualizar_total_general_cotizacion(cot)

            CotizacionSeguimiento.objects.create(
                id_registro=cot,
                detalle=detalle_log,
                id_usuario=request.user,
                activo='1'
            )

            return Response({"message": "Servicio eliminado correctamente"}, status=200)

    except CotizacionServicio.DoesNotExist:
        return Response({"error": "Servicio no encontrado en esta cotización"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def gestionar_adjuntos(request, id_registro):
    # Mantenemos tu ruta física personalizada
    ruta_carpeta = r"C:\xampp\htdocs\vc\ocfiles"
    
    # Validación de seguridad por estado congelado
    cot = Cotizacion.objects.filter(id_registro=id_registro).first()
    if not cot:
        return Response({"error": "Cotización no encontrada"}, status=404)

    if request.method in ["POST", "DELETE"] and cot.estado_envio == 2:
        return Response(
            {"error": "La cotización está congelada (ya fue enviada al cliente). No se admiten modificaciones."}, 
            status=400
        )

    # --- MÉTODO POST: GUARDAR ---
    if request.method == "POST":
        archivo = request.FILES.get("archivo")
        descripcion_personalizada = request.POST.get("descripcion", "").strip()
        
        if not archivo:
            return Response({"ok": False, "error": "No se recibió archivo"}, status=400)

        try:
            # 1. Asegurar Carpeta
            if not os.path.exists(ruta_carpeta):
                os.makedirs(ruta_carpeta)
                
            # Usamos id_registro para el nombre físico del archivo
            nombre_fisico = f"{id_registro}_{archivo.name}"
            path_destino = os.path.join(ruta_carpeta, nombre_fisico)
            
            # 2. Guardado Físico
            with open(path_destino, "wb+") as destino:
                for chunk in archivo.chunks():
                    destino.write(chunk)

            # 3. Registro en tabla de Adjuntos
            cotizacion_instancia = Cotizacion.objects.get(id_registro=id_registro)
            
            nuevo_adjunto = CotizacionAdjunto.objects.create(
                id_registro=cotizacion_instancia,
                nombre=archivo.name,
                descripcion=descripcion_personalizada,
                ruta=path_destino,
                id_usuario=request.user,
                fecha=timezone.now(),
                activo='1'
            )

            # 4. Registro en SEGUIMIENTOS
            txt_historial = descripcion_personalizada if descripcion_personalizada else archivo.name
            CotizacionSeguimiento.objects.create(
                id_registro=cotizacion_instancia,
                detalle=f"Se adjuntó archivo: {txt_historial}",
                id_usuario=request.user,
                activo="1",
            )

            return Response({"ok": True, "id": nuevo_adjunto.id_adjuntos})
            
        except Cotizacion.DoesNotExist:
            return Response({"ok": False, "error": "La cotización no existe"}, status=404)
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

    # --- MÉTODO GET: LISTAR ---
    elif request.method == "GET":
        try:
            # Filtramos por id_registro
            adjuntos_db = CotizacionAdjunto.objects.filter(
                id_registro=id_registro, 
                activo='1'
            ).order_by('-fecha')
            
            archivos_lista = []
            for adj in adjuntos_db:
                nombre_usuario = adj.id_usuario.usuario if adj.id_usuario else "N/A"

                archivos_lista.append({
                    "id": adj.id_adjuntos,
                    "nombre": adj.nombre,
                    "description": adj.descripcion,
                    "fecha": adj.fecha.strftime('%d/%m/%Y %H:%M'),
                    "usuario": nombre_usuario,
                    # El path de descarga ahora también usa id_registro
                    "file_path": f"/api/cotizaciones/adjuntos/descargar/{id_registro}_{adj.nombre}/"
                })
            
            return Response({"ok": True, "archivos": archivos_lista})
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

    # --- MÉTODO DELETE: ELIMINAR (Lógico) ---
    elif request.method == "DELETE":
        try:
            id_adjunto = request.query_params.get("id")
            # Buscamos asegurando que pertenezca a la cotización actual
            adjunto = CotizacionAdjunto.objects.get(id_adjuntos=id_adjunto, id_registro=id_registro)
            
            # Borrado físico opcional (según tu lógica previa)
            if os.path.exists(adjunto.ruta):
                try:
                    os.remove(adjunto.ruta)
                except OSError:
                    pass # Evita que el endpoint falle si el archivo no está físicamente
            
            # Borrado físico (Hard Delete) como pidió el usuario
            adjunto.delete()

            # REGISTRO EN TRAZABILIDAD
            CotizacionSeguimiento.objects.create(
                id_registro_id=id_registro,
                detalle=f"Se eliminó adjunto: {adjunto.nombre}",
                id_usuario=request.user,
                activo="1"
            )
            
            return Response({"ok": True, "mensaje": "Archivo y registro eliminados permanentemente"})
        except CotizacionAdjunto.DoesNotExist:
            return Response({"ok": False, "error": "Adjunto no encontrado"}, status=404)
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

@api_view(["GET", "POST", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def gestionar_mensajes(request, id_registro):
    
    # --- MÉTODO POST: CREAR ---
    if request.method == "POST":
        msj_texto = request.data.get("msj", "").strip()
        tipo_envio = request.data.get("tipo", "N")
        es_alerta = request.data.get("alerta", "0") 
        fecha_alerta = request.data.get("alerta_fecha") 

        if not msj_texto:
            return Response({"ok": False, "error": "El mensaje no puede estar vacío"}, status=400)

        try:
            # Buscamos la cotización usando el id_registro del path
            cotizacion = Cotizacion.objects.get(id_registro=id_registro)
            
            estado_completo = "0" if es_alerta == "1" else "1"
            
            nuevo_msj = CotizacionMensaje.objects.create(
                id_registro=cotizacion,
                id_usuario=request.user,
                mensaje=msj_texto,
                alerta=es_alerta,
                alerta_fecha=fecha_alerta if es_alerta == "1" else None,
                alerta_completada=None,
                completo=estado_completo,
                activo="1",
                fecha=timezone.now()
            )
            
            # Registro en SEGUIMIENTOS
            txt_historial = f"REGISTRO: {msj_texto}"
            if es_alerta == "1" and fecha_alerta:
                txt_historial += f" [ALERTA: {fecha_alerta}]"

            CotizacionSeguimiento.objects.create(
                id_registro=cotizacion,
                detalle=txt_historial,
                id_usuario=request.user,
                activo="1",
                # fecha se genera auto_now_add
            )
            
            return Response({"ok": True, "id": nuevo_msj.id_mensaje})
        except Cotizacion.DoesNotExist:
            return Response({"ok": False, "error": "Cotización no encontrada"}, status=404)
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

    # --- MÉTODO GET: LISTAR ---
    elif request.method == "GET":
        try:
            # Filtramos mensajes usando el id_registro
            mensajes = CotizacionMensaje.objects.filter(
                id_registro=id_registro, 
                activo="1"
            ).order_by('fecha')
            
            serializer = CotizacionMensajeSerializer(mensajes, many=True)
            return Response({"ok": True, "registros": serializer.data})
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

    # --- MÉTODO PATCH: ACTUALIZAR ALERTA ---
    elif request.method == "PATCH":
        try:
            id_mensaje = request.data.get("id")
            # Filtramos el mensaje específico dentro de la cotización actual
            msj_obj = CotizacionMensaje.objects.filter(
                id_mensaje=id_mensaje, 
                id_registro=id_registro
            )

            if not msj_obj.exists():
                return Response({"ok": False, "error": "Mensaje no encontrado"}, status=404)

            if "completar" in request.data:
                msj_obj.update(
                    alerta_completada=timezone.now(),
                    completo="1"
                )
                # TRAZABILIDAD
                msj = msj_obj.first()
                CotizacionSeguimiento.objects.create(
                    id_registro_id=id_registro,
                    detalle=f"Alerta completada: {msj.mensaje}",
                    id_usuario=request.user,
                    activo="1"
                )
            
            elif "nueva_fecha" in request.data:
                nueva_f = request.data.get("nueva_fecha")
                msj = msj_obj.first()
                old_f = msj.alerta_fecha.strftime('%d/%m/%Y %H:%M') if msj.alerta_fecha else "N/A"
                
                msj_obj.update(
                    alerta_fecha=nueva_f, 
                    alerta_completada=None,
                    completo="0" 
                )
                # TRAZABILIDAD
                CotizacionSeguimiento.objects.create(
                    id_registro_id=id_registro,
                    detalle=f"Alerta reprogramada de {old_f} a {nueva_f}",
                    id_usuario=request.user,
                    activo="1"
                )

            return Response({"ok": True})
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

    # --- MÉTODO DELETE: ELIMINAR ---
    elif request.method == "DELETE":
        try:
            id_mensaje = request.query_params.get("id")
            msj_obj = CotizacionMensaje.objects.filter(
                id_mensaje=id_mensaje, 
                id_registro=id_registro
            )

            if not msj_obj.exists():
                return Response({"ok": False, "error": "Mensaje no encontrado"}, status=404)

            # Capturamos el contenido antes de eliminar para el historial
            msj_temp = msj_obj.first()
            contenido_msj = msj_temp.mensaje or "Sin contenido"

            # Borrado físico (Hard Delete) como pidió el usuario
            msj_obj.delete()

            # TRAZABILIDAD
            CotizacionSeguimiento.objects.create(
                id_registro_id=id_registro,
                detalle=f"Se eliminó registro: {contenido_msj}",
                id_usuario=request.user,
                activo="1"
            )
            
            return Response({"ok": True, "mensaje": "Mensaje eliminado permanentemente"})
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_seguimientos(request, id_registro):
    
    try:
        # 1. Filtramos por el nuevo campo id_registro
        # 2. Usamos activo='1' (nuevo estándar) en lugar de act='1'
        # 3. Ordenamos por fecha (cronológico)
        seguimientos = CotizacionSeguimiento.objects.filter(
            id_registro=id_registro,
            activo="1"
        ).order_by("fecha", "id_seguimiento")

        # El serializer ahora incluirá el 'usuario_nombre' y 'fecha_formateada'
        serializer = CotizacionSeguimientoSerializer(seguimientos, many=True)
        
        return Response({
            "ok": True,
            "seguimientos": serializer.data
        })

    except Exception as e:
        return Response({
            "ok": False,
            "error": str(e)
        }, status=500)

@api_view(["GET"])
def totales_descuento_view(request, num_reg):
    cot = Cotizacion.objects.get(id_registro=num_reg)

    total = cot.total_cotizacion or 0
    descuento_monto = cot.descuento_monto or 0  # <-- descuento guardado

    total_suministros = (
        CotizacionSuministro.objects
        .filter(id_registro=num_reg, nivel=0)
        .aggregate(
            total=Sum(F("venta_total") * F("cantidad"))
        )["total"] or 0
    )

    total_servicios = (
        CotizacionServicio.objects
        .filter(id_registro=num_reg, nivel=0)
        .aggregate(
            total=Sum(F("cotizado_total") * F("cantidad_hombres"))
        )["total"] or 0
    )

    return Response({
        "total": total,
        "suministros": total_suministros,
        "servicios": total_servicios,
        "tot_c": total,             # total base
        "des_m": descuento_monto,   # descuento guardado
    })

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def recalcular_totales_cotizacion(request, num_reg):
    """
    Recalcula el total de la cotización basado en suministros y servicios.
    Retorna el total actualizado.
    """
    try:
        cotizacion = Cotizacion.objects.get(id_registro=num_reg)
        total_general = actualizar_total_general_cotizacion(cotizacion)

        # Totales suministros (sin descuento)
        total_suministros = (
            CotizacionSuministro.objects
            .filter(id_registro=num_reg, nivel=0)
            .aggregate(total=Coalesce(Sum(F("venta_total") * F("cantidad")), Decimal("0.00")))["total"]
        )

        # Totales servicios (sin descuento)
        total_servicios = (
            CotizacionServicio.objects
            .filter(id_registro=num_reg, nivel=0)
            .aggregate(total=Coalesce(Sum(F("cotizado_total") * F("cantidad_hombres")), Decimal("0.00")))["total"]
        )

        return Response({
            "tot_c": total_general,
            "suministros": total_suministros,
            "servicios": total_servicios,
        })

    except Cotizacion.DoesNotExist:
        return Response({"error": "Cotización no encontrada"}, status=404)

#========================================================================================

##===============##
## OPORTUNIDADES ##
##===============##
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lista_oportunidades(request):
    try:
        # ============================================================
        # 1) Parámetros y Mapeo de búsqueda de Oportunidades
        # ============================================================
        anno = request.GET.get("anno", date.today().year)
        mes = request.GET.get("mes", "%")
        anno_desde = request.GET.get("anno_desde")
        anno_hasta = request.GET.get("anno_hasta")
        mes_desde = request.GET.get("mes_desde")
        mes_hasta = request.GET.get("mes_hasta")
        comercial_search = request.GET.get("comercial_search", "%")
        estado_oportunidad = request.GET.get("estado_oportunidad", "%") # 1, 2, 3 o 4
        id_area = request.GET.get("area", "%")

        # Mapeo de campos flexibles enfocado en columnas de Oportunidades
        CAMPOS_BUSQUEDA = {
            "id_registro": "id_registro",
            "codigo": "codigo",
            "cliente_nombre": "id_cliente__nombre",
            "representante": "representante_nombre",
            "referencia": "referencia",  # Descripción de la oportunidad
            "comentario": "comentario",
        }

        campo = request.GET.get("campo")
        valor = request.GET.get("valor")
        
        # Filtros dinámicos por rango para recepcion_solicitud
        fecha_inicio = request.GET.get("fechaInicio")
        fecha_fin = request.GET.get("fechaFin")

        personal = request.GET.get("personal", "false").lower() == "true"

        # ============================================================
        # 2) Query base mejorado (Histórico total basado en recepcion_solicitud)
        # ============================================================
        # Cambiamos .filter(id_estado=11) por la validación de que NO sea NULL
        qs = Cotizacion.objects.select_related(
            'id_cliente', 'id_comercial'
        ).filter(recepcion_solicitud__isnull=False)

        if personal:
            qs = qs.filter(id_comercial=request.user)

        # Filtro de Periodo Operacional
        if anno_desde and anno_hasta and mes_desde and mes_hasta:
            try:
                periodo_min = int(anno_desde) * 100 + int(mes_desde)
                periodo_max = int(anno_hasta) * 100 + int(mes_hasta)
                qs = qs.filter(año_apertura__isnull=False, mes__isnull=False).annotate(
                    periodo_operativo=ExpressionWrapper(
                        F('año_apertura') * 100 + F('mes'),
                        output_field=IntegerField()
                    )
                ).filter(periodo_operativo__gte=periodo_min, periodo_operativo__lte=periodo_max)
            except (ValueError, TypeError):
                pass
        else:
            if anno != "%":
                qs = qs.filter(año_apertura=int(anno))
            if mes != "%":
                qs = qs.filter(mes=int(mes))

        # Filtro de Estado de Oportunidad interna (1=Pendiente, 2=No Cotizado, etc.)
        if estado_oportunidad and estado_oportunidad != "%":
            if "," in estado_oportunidad:
                estados = [int(e.strip()) for e in estado_oportunidad.split(",") if e.strip().isdigit()]
                qs = qs.filter(estado_oportunidad__in=estados)
            else:
                try:
                    qs = qs.filter(estado_oportunidad=int(estado_oportunidad))
                except ValueError:
                    pass
        if id_area and id_area != "%":
            if "," in id_area:
                areas = [int(a.strip()) for a in id_area.split(",") if a.strip().isdigit()]
                qs = qs.filter(id_area__in=areas)
            else:
                try:
                    qs = qs.filter(id_area=int(id_area))
                except ValueError:
                    pass

        # Filtro Responsable Comercial asignado
        if comercial_search != "%":
            qs = qs.filter(id_comercial__nombre_completo__icontains=comercial_search)

        # Rango de fechas basado en la recepción de la solicitud
        if fecha_inicio:
            qs = qs.filter(recepcion_solicitud__gte=fecha_inicio)
        if fecha_fin:
            qs = qs.filter(recepcion_solicitud__lte=fecha_fin)

        # Búsqueda Flexible Normalizada
        if campo and valor not in (None, "", " "):
            campo_real = CAMPOS_BUSQUEDA.get(campo)
            if campo_real:
                valor_norm = unidecode(valor.lower().strip())
                qs = qs.filter(**{f"{campo_real}__icontains": valor_norm})

        # ============================================================
        # 3) Dashboard Métricas Cortas para Oportunidades
        # ============================================================
        total_regs = qs.count()
        hoy_date = date.today()
        este_mes_conteo = 0
        
        # Estadísticas internas del pipeline (1 a 4)
        stats_pipeline = {
            "Pendiente": 0,    # 1
            "No Cotizado": 0,  # 2
            "Rechazado": 0,    # 3
            "Cotizado": 0      # 4
        }
        
        MAPPING_ESTADOS = {1: "Pendiente", 2: "No Cotizado", 3: "Rechazado", 4: "Cotizado"}
        conteo_meses = [0] * 12

        for c in qs:
            # Conteo mensual basado en recepción de la solicitud
            if c.recepcion_solicitud:
                # El campo puede ser un objeto datetime, extraemos solo el mes para el índice de la lista
                mes_idx = c.recepcion_solicitud.month - 1
                conteo_meses[mes_idx] += 1
                
                if c.recepcion_solicitud.month == hoy_date.month and c.recepcion_solicitud.year == hoy_date.year:
                    este_mes_conteo += 1

            # Distribución por pipeline (Manejo del default 1 si viene vacío)
            est_int = c.estado_oportunidad or 1
            nom_est = MAPPING_ESTADOS.get(est_int, "Pendiente")
            stats_pipeline[nom_est] = stats_pipeline.get(nom_est, 0) + 1

        dashboard_data = {
            "total": total_regs,
            "esteMes": este_mes_conteo,
            "pipeline": stats_pipeline,
            "porMes": conteo_meses
        }

        # ============================================================
        # 4) Respuesta con Serialización manual ultra-rápida
        # ============================================================
        tabla_data = []
        ordered_qs = qs.order_by('-recepcion_solicitud', '-id_registro')
        for c in ordered_qs:
            comercial_nombre = c.id_comercial.nombre_completo if c.id_comercial else "Por asignar"
            comercial_correo = c.id_comercial.correo if c.id_comercial else None
            comercial_movil_corporativo = c.id_comercial.movil_coorporativo if c.id_comercial else None
            comercial_movil_personal = c.id_comercial.movil_personal if c.id_comercial else None
            cliente_nombre = c.id_cliente.nombre if c.id_cliente else (c.representante_nombre or "S/N")

            tabla_data.append({
                "id_registro": c.id_registro,
                "codigo": c.codigo,
                "recepcion_solicitud": format_datetime(c.recepcion_solicitud),
                "cliente_nombre": cliente_nombre,
                "representante_nombre": c.representante_nombre,
                "referencia": c.referencia,
                "visita_tecnica": format_datetime(c.visita_tecnica),
                "fecha_limite": format_datetime(c.fecha_limite),
                "emision_cotizacion": format_datetime(c.emision_cotizacion),
                "estado_oportunidad": c.estado_oportunidad,
                "comercial_nombre": comercial_nombre,
                "comercial_correo": comercial_correo,
                "comercial_movil_corporativo": comercial_movil_corporativo,
                "comercial_movil_personal": comercial_movil_personal,
                "comentario": c.comentario,
                "fijar": c.fijar,
            })

        return Response({
            "dashboard": dashboard_data,
            "tabla": tabla_data,
            "anno": anno
        })

    except Exception as e:
        return Response({"error": f"Error en Dashboard Oportunidades: {str(e)}"}, status=500)

#========================================================================================

##==========##
## APETURAS ##
##==========##
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lista_aperturas(request):
    try:
        # ============================================================
        # Parámetros y Mapeo de Búsqueda Flexible
        # ============================================================
        anno = request.GET.get("anno", date.today().year)
        mes = request.GET.get("mes", "%")
        anno_desde = request.GET.get("anno_desde")
        anno_hasta = request.GET.get("anno_hasta")
        mes_desde = request.GET.get("mes_desde")
        mes_hasta = request.GET.get("mes_hasta")
        id_cliente = request.GET.get("cliente", "%")
        id_estado_orden = request.GET.get("estado_orden", "%")  # Filtro por estado de orden (1, 2, 3...)
        prio = request.GET.get("prio", "%")
        envio = request.GET.get("envio", "%")
        id_area = request.GET.get("area", "%")

        CAMPOS_BUSQUEDA = {
            "id_apertura": "id_apertura",
            "numero_orden": "numero_orden",
            "cotizacion_codigo": "id_registro__codigo",
            "cliente_nombre": "id_registro__id_cliente__nombre",
            "referencia": "id_registro__referencia",
            "total_orden": "total_orden",
            "totfa": "totfa",
            "salfa": "salfa",
        }

        campo = request.GET.get("campo")
        valor = request.GET.get("valor")
        fecha_inicio = request.GET.get("fechaInicio")  # Filtra por fecha_orden
        fecha_fin = request.GET.get("fechaFin")

        # ============================================================
        # Query Base Optimizada (Evita consultas N+1 en cascada)
        # ============================================================
        # Viajamos desde apertura -> cotización padre -> cliente de la cotización
        qs = CotizacionApertura.objects.select_related(
            'orden_plazo_unidad',
            'id_registro',
            'id_registro__id_cliente',
            'id_registro__id_estado',
            'id_registro__id_comercial'
        )

        # Filtros de Segmentación Estándar
        if anno_desde and anno_hasta and mes_desde and mes_hasta:
            try:
                periodo_min = int(anno_desde) * 100 + int(mes_desde)
                periodo_max = int(anno_hasta) * 100 + int(mes_hasta)
                qs = qs.filter(anno__isnull=False, mes__isnull=False).annotate(
                    periodo_operativo=ExpressionWrapper(
                        F('anno') * 100 + F('mes'),
                        output_field=IntegerField()
                    )
                ).filter(periodo_operativo__gte=periodo_min, periodo_operativo__lte=periodo_max)
            except (ValueError, TypeError):
                pass
        else:
            if anno != "%":
                qs = qs.filter(anno=int(anno))
            if mes != "%":
                qs = qs.filter(mes=int(mes))
        if id_cliente != "%":
            qs = qs.filter(id_registro__id_cliente_id=id_cliente)
        if id_estado_orden and id_estado_orden != "%":
            if "," in id_estado_orden:
                estados = [int(e.strip()) for e in id_estado_orden.split(",") if e.strip().isdigit()]
                qs = qs.filter(estado_orden__in=estados)
            else:
                try:
                    qs = qs.filter(estado_orden=int(id_estado_orden))
                except ValueError:
                    pass
        if prio != "%":
            qs = qs.filter(prio=str(prio))
        if envio != "%":
            qs = qs.filter(envio=int(envio))
        if id_area and id_area != "%":
            if "," in id_area:
                areas = [int(a.strip()) for a in id_area.split(",") if a.strip().isdigit()]
                qs = qs.filter(id_registro__id_area__in=areas)
            else:
                try:
                    qs = qs.filter(id_registro__id_area=int(id_area))
                except ValueError:
                    pass

        if fecha_inicio:
            qs = qs.filter(fecha_orden__gte=fecha_inicio)
        if fecha_fin:
            qs = qs.filter(fecha_orden__lte=fecha_fin)

        # ============================================================
        # Filtros Complejos de Plazos de la Orden
        # ============================================================
        plazo_val = request.GET.get("plazo_val", "")
        plazo_uni = request.GET.get("plazo_uni", "D")  # D, S, M, etc.
        hoy_date = date.today()

        def calculate_target_date(start_date, val, code):
            if not start_date or val is None or not code:
                return None
            f_date = start_date.date() if hasattr(start_date, "date") else start_date
            if not isinstance(f_date, date):
                return None
            code_upper = code.upper()
            try:
                if code_upper == 'D': return f_date + timedelta(days=val)
                elif code_upper == 'S': return f_date + timedelta(weeks=val)
                elif code_upper == 'Q': return f_date + timedelta(days=val * 15)
                elif code_upper == 'M':
                    month = f_date.month - 1 + val
                    year = f_date.year + month // 12
                    month = month % 12 + 1
                    day = min(f_date.day, calendar.monthrange(year, month)[1])
                    return date(year, month, day)
                elif code_upper == 'T':
                    month = f_date.month - 1 + (val * 3)
                    year = f_date.year + month // 12
                    month = month % 12 + 1
                    day = min(f_date.day, calendar.monthrange(year, month)[1])
                    return date(year, month, day)
                elif code_upper == 'A':
                    year = f_date.year + val
                    month = f_date.month
                    day = min(f_date.day, calendar.monthrange(year, month)[1])
                    return date(year, month, day)
            except Exception:
                pass
            return None

        if plazo_val and plazo_val.strip().isdigit():
            try:
                user_val = int(plazo_val.strip())
                limit_date = calculate_target_date(hoy_date, user_val, plazo_uni)
                if limit_date:
                    records_data = qs.values_list(
                        "id_apertura", "fecha_orden", "orden_plazo_valor", "orden_plazo_unidad__codigo"
                    )
                    matching_ids = [
                        id_ap for id_ap, f_dt, val, code in records_data 
                        if f_dt and val is not None and code and 
                        (c_dt := calculate_target_date(f_dt, val, code)) and hoy_date <= c_dt <= limit_date
                    ]
                    qs = qs.filter(id_apertura__in=matching_ids)
            except Exception as ex:
                logger.error(f"Error en filtro de plazos apertura: {str(ex)}")

        # Búsqueda Flexible por Campo Seleccionado
        if campo and valor not in (None, "", " "):
            campo_real = CAMPOS_BUSQUEDA.get(campo)
            if campo_real:
                valor_norm = unidecode(valor.lower().strip())
                qs = qs.filter(**{f"{campo_real}__icontains": valor_norm})

        # ============================================================
        # Procesamiento de Métricas (Dashboard)
        # ============================================================
        total_regs = qs.count()
        monto_soles = monto_dolares = este_mes_conteo = 0
        
        # Estructura de estados según las órdenes
        stats_estados = {"Pendiente": 0, "Aprobada": 0, "Facturada": 0, "Anulada": 0, "Desconocido": 0}
        MAPEO_ESTADOS = {1: "Pendiente", 2: "Aprobada", 3: "Facturada", 4: "Anulada"}
        
        stats_clientes = {}
        conteo_meses = [0] * 12

        for ap in qs:
            # Procesamos montos financieros basados en la orden (Heredando la moneda del padre)
            monto = float(ap.total_orden or 0)
            moneda_padre = ap.id_registro.tipo_moneda if ap.id_registro else "S"
            
            if moneda_padre == "D":
                monto_dolares += monto
            else:
                monto_soles += monto

            # Registro de tiempos
            if ap.fecha_orden:
                conteo_meses[ap.fecha_orden.month - 1] += 1
                if ap.fecha_orden.month == hoy_date.month and ap.fecha_orden.year == hoy_date.year:
                    este_mes_conteo += 1

            # Clasificación de estados de orden
            est_nom = MAPEO_ESTADOS.get(ap.estado_orden, "Desconocido")
            stats_estados[est_nom] = stats_estados.get(est_nom, 0) + 1

            # Segmentación de clientes top por órdenes de apertura consumidas
            if ap.id_registro:
                cli_id = ap.id_registro.id_cliente_id or "S/C"
                cli_nom = ap.id_registro.id_cliente.nombre if ap.id_registro.id_cliente else (ap.id_registro.representante_nombre or "Desconocido")
            else:
                cli_id = "S/C"
                cli_nom = "Sin Cotización Asociada"

            if cli_id not in stats_clientes:
                stats_clientes[cli_id] = {"nombre": cli_nom, "cantidad": 0, "total": 0}
            stats_clientes[cli_id]["cantidad"] += 1
            stats_clientes[cli_id]["total"] += monto

        # Formatear y ordenar el Top 10 Clientes
        clientes_lista = sorted(
            [
                {
                    "id": k, 
                    **v, 
                    "porcentaje": round((v["cantidad"] / total_regs) * 100, 2) if total_regs else 0
                } 
                for k, v in stats_clientes.items()
            ], 
            key=lambda x: x["cantidad"], 
            reverse=True
        )[:10]

        dashboard_data = {
            "total": total_regs,
            "esteMes": este_mes_conteo,
            "montoTotalSoles": round(monto_soles, 2),
            "montoTotalDolares": round(monto_dolares, 2),
            "promedioSoles": round(monto_soles / total_regs, 2) if total_regs and monto_soles else 0,
            "promedioDolares": round(monto_dolares / total_regs, 2) if total_regs and monto_dolares else 0,
            "estados": stats_estados,
            "porMes": conteo_meses,
            "clientes": clientes_lista,
        }

        # Serialización limpia del listado de la tabla manual ultra-rápida
        tabla_data = []
        ordered_qs = qs.order_by('-anno', '-mes', '-id_apertura')
        from decimal import Decimal
        AREA_MAP = {1: "Industria", 2: "Minería", 3: "Mantenimiento", 4: "Petroquímica", 8: "Seguridad"}
        for ap in ordered_qs:
            estado_orden_nombre = "Pendiente" if ap.estado_orden == 1 else ("Aprobada" if ap.estado_orden == 2 else ("Facturada" if ap.estado_orden == 3 else ("Anulada" if ap.estado_orden == 4 else "Desconocido")))
            plazo_unidad = ap.orden_plazo_unidad.nombre if ap.orden_plazo_unidad else None
            
            cotizacion_id = ap.id_registro.id_registro if ap.id_registro else None
            cotizacion_codigo = ap.id_registro.codigo if ap.id_registro else None
            cotizacion_referencia = ap.id_registro.referencia if ap.id_registro else None
            
            cliente_id = ap.id_registro.id_cliente_id if ap.id_registro else None
            cliente_nombre = ap.id_registro.id_cliente.nombre if (ap.id_registro and ap.id_registro.id_cliente) else (ap.id_registro.representante_nombre if ap.id_registro else "S/N")
            area_nombre = AREA_MAP.get(ap.id_registro.id_area, "Otros") if ap.id_registro else "Otros"
            
            if ap.id_registro:
                id_registro_data = {
                    "codigo": ap.id_registro.codigo,
                    "referencia": ap.id_registro.referencia,
                    "id_cliente": ap.id_registro.id_cliente_id,
                    "cliente_nombre": ap.id_registro.id_cliente.nombre if ap.id_registro.id_cliente else (ap.id_registro.representante_nombre or "S/N"),
                    "id_area": ap.id_registro.id_area,
                    "area_nombre": AREA_MAP.get(ap.id_registro.id_area, "Otros"),
                    "fijar": ap.id_registro.fijar,
                    "comercial_nombre": ap.id_registro.id_comercial.nombre_completo if ap.id_registro.id_comercial else "Por asignar",
                    "comercial_dni": ap.id_registro.id_comercial.dni if ap.id_registro.id_comercial else "",
                    "id_comercial": ap.id_registro.id_comercial_id,
                }
            else:
                id_registro_data = None

            total_orden_val = str(ap.total_orden) if isinstance(ap.total_orden, Decimal) else ap.total_orden
            totfa_val = str(ap.totfa) if isinstance(ap.totfa, Decimal) else ap.totfa
            salfa_val = str(ap.salfa) if isinstance(ap.salfa, Decimal) else ap.salfa

            tabla_data.append({
                "id_apertura": ap.id_apertura,
                "anno": ap.anno,
                "mes": ap.mes,
                "fecha_orden": format_datetime(ap.fecha_orden),
                "fecha_factura": format_datetime(ap.fecha_factura),
                "fecha_entrega": format_datetime(ap.fecha_entrega),
                "numero_orden": ap.numero_orden,
                "id_registro": id_registro_data,
                "total_orden": total_orden_val,
                "estado_orden": ap.estado_orden,
                "estado_orden_nombre": estado_orden_nombre,
                "orden_plazo_valor": ap.orden_plazo_valor,
                "plazo_unidad": plazo_unidad,
                "totfa": totfa_val,
                "salfa": salfa_val,
                "cotizacion_id": cotizacion_id,
                "cotizacion_codigo": cotizacion_codigo,
                "cotizacion_referencia": cotizacion_referencia,
                "cliente_id": cliente_id,
                "cliente_nombre": cliente_nombre,
                "area_nombre": area_nombre,
                "prio": ap.prio,
                "id_comercial": ap.id_registro.id_comercial_id if ap.id_registro else None,
            })

        return Response({"dashboard": dashboard_data, "tabla": tabla_data, "anno": anno})

    except Exception as e:
        logger.error(f"Error en Dashboard Aperturas: {str(e)}", exc_info=True)
        return Response({"error": f"Error en Dashboard Aperturas: {str(e)}"}, status=500)

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def apertura_detalle(request, id_apertura):
    try:
        try:
            apertura = CotizacionApertura.objects.select_related(
                'orden_plazo_unidad',
                'id_registro',
                'id_registro__id_cliente',
                'id_registro__id_estado'
            ).get(id_apertura=id_apertura)
        except CotizacionApertura.DoesNotExist:
            return Response({"error": "Apertura no encontrada"}, status=404)

        if request.method == 'GET':
            serializer = CotizacionAperturaSerializer(apertura)
            from compras_api.models import SolicitudOrdenCompra, SolicitudPasajes
            from django.db.models import Q
            
            solicitudes_qs = SolicitudOrdenCompra.objects.filter(Q(id_apertura=id_apertura) | Q(nivel_grupo=id_apertura) | Q(nivel_grupo=str(id_apertura)))
            pasajes_qs = SolicitudPasajes.objects.filter(Q(id_apertura=id_apertura) | Q(nivel_grupo=id_apertura) | Q(nivel_grupo=str(id_apertura)))
            
            rel_solicitudes = []
            for s in solicitudes_qs:
                rel_solicitudes.append({
                    "id_registro": s.id_solicitud,
                    "id_solicitud": s.id_solicitud,
                    "codigo": s.codigo,
                    "fecha": s.fecha.strftime("%Y-%m-%d") if s.fecha else None,
                    "concepto": s.concepto or s.referencia or "Solicitud de Compra",
                    "num": s.num or 1,
                    "nivel_grupo": s.nivel_grupo,
                    "tipo_movimiento": s.tipo_movimiento_id,
                    "monto_soles": float(s.monto_soles or 0.00),
                    "monto_dolares": float(s.monto_dolares or 0.00),
                    "tipo_moneda": s.tipo_moneda or "S",
                    "estado_nombre": s.id_estado.nombre if s.id_estado else "Pendiente",
                    "tipo_gasto": s.tipo_gasto or "03",
                    "tipo": s.tipo or "Suministro"
                })
                
            for p in pasajes_qs:
                rel_solicitudes.append({
                    "id_registro": p.id_pasaje,
                    "id_solicitud": p.id_pasaje,
                    "codigo": p.codigo or p.cog,
                    "fecha": p.fecha.strftime("%Y-%m-%d") if p.fecha else None,
                    "concepto": p.concepto or f"Pasaje {p.lugar_origen} a {p.lugar_destino}",
                    "num": 5, # Map to Otros
                    "nivel_grupo": p.nivel_grupo or 5,
                    "tipo_movimiento": p.tipo_movimiento_id or 5,
                    "monto_soles": float(p.monto_soles or 0.00),
                    "monto_dolares": float(p.monto_dolares or 0.00),
                    "tipo_moneda": p.tipo_moneda or "S",
                    "estado_nombre": p.id_estado.nombre if p.id_estado else "Pendiente",
                    "tipo_gasto": p.tipo_gasto or "02",
                    "tipo": p.transporte or "Pasaje"
                })
                
            cotizacion_id = apertura.id_registro_id
            tipos_gasto_presentes = []
            if cotizacion_id:
                from .models import CotizacionSuministro, CotizacionServicio
                suministros_gastos = set(CotizacionSuministro.objects.filter(id_registro_id=cotizacion_id).values_list('id_tipo_gasto_id', flat=True))
                servicios_gastos = set(CotizacionServicio.objects.filter(id_registro_id=cotizacion_id).values_list('id_tipo_gasto_id', flat=True))
                tipos_gasto_presentes = [tg for tg in list(suministros_gastos.union(servicios_gastos)) if tg is not None]

            data = serializer.data
            data["solicitudes"] = rel_solicitudes
            data["tipos_gasto_presentes"] = tipos_gasto_presentes
            return Response(data)

        elif request.method == 'DELETE':
            apertura.delete()
            return Response({"message": "Orden de compra eliminada correctamente"}, status=200)

        elif request.method in ['PUT', 'PATCH']:
            data = request.data
            
            if 'numero_orden' in data:
                apertura.numero_orden = data['numero_orden']
            if 'fecha_orden' in data:
                apertura.fecha_orden = data['fecha_orden']
            
            if 'fecha_entrega' in data:
                apertura.fecha_entrega = data['fecha_entrega']
            elif 'fecha_real_entrega' in data:
                apertura.fecha_entrega = data['fecha_real_entrega']
                
            if 'fecha_factura' in data:
                apertura.fecha_factura = data['fecha_factura']
            elif 'fecha_recepcion' in data:
                apertura.fecha_factura = data['fecha_recepcion']
                
            if 'mes_entrega' in data:
                apertura.mes_entrega = data['mes_entrega']
            elif 'orden_devengo_mes' in data:
                apertura.mes_entrega = data['orden_devengo_mes']
                
            if 'estado_orden' in data:
                apertura.estado_orden = data['estado_orden']
            elif 'orden_compra_estado' in data:
                apertura.estado_orden = data['orden_compra_estado']
                
            if 'prio' in data:
                apertura.prio = data['prio']
            if 'envio' in data:
                apertura.envio = data['envio']
            if 'oobs' in data:
                apertura.oobs = data['oobs']
            if 'orden_adjunta' in data:
                apertura.orden_adjunta = data['orden_adjunta']
            if 'responsables' in data:
                responsables_val = data['responsables']
                apertura.responsables = responsables_val
                if apertura.id_registro_id:
                    CotizacionApertura.objects.filter(id_registro=apertura.id_registro_id).update(responsables=responsables_val)
                
            if 'orden_plazo_valor' in data:
                apertura.orden_plazo_valor = data['orden_plazo_valor']
            elif 'orden_plazo' in data:
                apertura.orden_plazo_valor = data['orden_plazo']
                
            if 'orden_plazo_unidad' in data:
                val_unidad = data['orden_plazo_unidad']
                if val_unidad in (0, '0', '', None):
                    apertura.orden_plazo_unidad_id = None
                else:
                    apertura.orden_plazo_unidad_id = val_unidad

            if 'total_orden' in data:
                apertura.total_orden = data['total_orden']
            if 'presupuesto' in data:
                apertura.presupuesto = data['presupuesto']
                
            if 'orden_compra_equipos' in data:
                apertura.orden_compra_equipos = data['orden_compra_equipos']
            if 'orden_compra_materiales' in data:
                apertura.orden_compra_materiales = data['orden_compra_materiales']
            if 'orden_compra_hh' in data:
                apertura.orden_compra_hh = data['orden_compra_hh']
            if 'orden_compra_entrega' in data:
                apertura.orden_compra_entrega = data['orden_compra_entrega']
            if 'orden_compra_costo_servicios' in data:
                apertura.orden_compra_costo_servicios = data['orden_compra_costo_servicios']
            if 'orden_compra_otros' in data:
                apertura.orden_compra_otros = data['orden_compra_otros']

            if 'poceq' in data:
                apertura.poceq = data['poceq']
            if 'pocma' in data:
                apertura.pocma = data['pocma']
            if 'pocrh' in data:
                apertura.pocrh = data['pocrh']
            if 'pocse' in data:
                apertura.pocse = data['pocse']
            if 'pocot' in data:
                apertura.pocot = data['pocot']
            if 'pger' in data:
                apertura.pger = data['pger']
            if 'doc' in data:
                apertura.doc = data['doc']
            if 'ti1' in data:
                apertura.ti1 = data['ti1']
                
            if 'totfa' in data:
                apertura.totfa = data['totfa']
            if 'salfa' in data:
                apertura.salfa = data['salfa']
            if 'uti_des' in data:
                apertura.uti_des = data['uti_des']
                
            # Recalcular Fecha de Entrega en base a la Fecha de Emisión y el Plazo de Entrega
            if apertura.fecha_orden and apertura.orden_plazo_valor is not None:
                import datetime
                from django.utils.dateparse import parse_datetime, parse_date
                fo = apertura.fecha_orden
                if isinstance(fo, str):
                    dt = parse_datetime(fo)
                    if not dt:
                        d = parse_date(fo)
                        if d:
                            dt = datetime.datetime.combine(d, datetime.time.min)
                    fo = dt
                if fo:
                    try:
                        apertura.fecha_entrega = fo + datetime.timedelta(days=int(apertura.orden_plazo_valor))
                    except Exception as dt_err:
                        logger.error(f"Error calculating fecha_entrega: {dt_err}")

            apertura.save()
            
            serializer = CotizacionAperturaSerializer(apertura)
            return Response(serializer.data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e), "traceback": traceback.format_exc()}, status=500)

def sync_apertura_oc_file(apertura):
    try:
        from django.conf import settings
        ruta_carpeta = os.path.join(settings.BASE_DIR, 'cotizaciones_api', 'ocfiles')
        extensiones = ['.pdf', '.xlsx', '.xls', '.docx', '.doc']
        path_completo = None
        ext_encontrada = None
        id_apertura_str = str(int(apertura.id_apertura)).strip()
        
        for ext in extensiones:
            path_test = os.path.join(ruta_carpeta, f"{id_apertura_str}{ext}")
            if os.path.exists(path_test):
                path_completo = path_test
                ext_encontrada = ext
                break

        if not path_completo:
            return False

        texto_completo = extract_text_from_file(path_completo, ext_encontrada)
        if not texto_completo:
            return False

        texto_metadata = extract_text_from_file(path_completo, ext_encontrada, max_pages=2)

        changed = False
        nro_orden = extract_order_number(texto_metadata)
        if nro_orden and apertura.numero_orden != nro_orden:
            apertura.numero_orden = nro_orden
            changed = True
        
        total_ext = extract_total_amount(texto_metadata)
        if total_ext and abs(Decimal(str(total_ext)) - (apertura.total_orden or Decimal('0'))) > Decimal('0.01'):
            apertura.total_orden = Decimal(str(total_ext))
            changed = True

        if apertura.id_registro_id:
            matched_supplies, matched_services = match_apertura_items(texto_completo, apertura.id_registro_id)
            new_doc = ",".join(matched_supplies) if matched_supplies else ""
            new_ti1 = ",".join(matched_services) if matched_services else ""
            
            if apertura.doc != new_doc or apertura.ti1 != new_ti1 or changed:
                apertura.doc = new_doc
                apertura.ti1 = new_ti1
                recalculate_apertura_costs(apertura)
                changed = True

        if changed:
            apertura.save()
            return True

    except Exception as ex:
        logger.error(f"Error auto-syncing OC for apertura {apertura.id_apertura}: {ex}", exc_info=True)
    return False

def cleanup_duplicate_aperturas(id_registro):
    try:
        aperturas = list(CotizacionApertura.objects.filter(id_registro=id_registro).order_by('id_apertura'))
        if len(aperturas) <= 1:
            return

        by_num = {}
        for ap in aperturas:
            num = (ap.numero_orden or "").strip()
            if num:
                by_num.setdefault(num, []).append(ap)

        for num, group in by_num.items():
            if len(group) > 1:
                primary = next((a for a in group if a.orden_adjunta), group[0])
                for dupe in group:
                    if dupe.id_apertura != primary.id_apertura:
                        if not primary.orden_adjunta and dupe.orden_adjunta:
                            primary.orden_adjunta = dupe.orden_adjunta
                        if not primary.doc and dupe.doc:
                            primary.doc = dupe.doc
                        if not primary.ti1 and dupe.ti1:
                            primary.ti1 = dupe.ti1
                        if (not primary.total_orden or primary.total_orden == 0) and dupe.total_orden:
                            primary.total_orden = dupe.total_orden
                        primary.save()
                        dupe.delete()

        remaining = list(CotizacionApertura.objects.filter(id_registro=id_registro).order_by('id_apertura'))
        if len(remaining) > 1:
            has_real_filled = any(bool(a.orden_adjunta) or (a.total_orden and Decimal(str(a.total_orden)) > 0) or bool(a.numero_orden) for a in remaining)
            if has_real_filled:
                for a in remaining:
                    if not a.orden_adjunta and not a.numero_orden and (not a.total_orden or a.total_orden == 0):
                        a.delete()
    except Exception as e:
        logger.error(f"Error cleaning up duplicate aperturas for {id_registro}: {e}", exc_info=True)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def aperturas_por_registro(request, id_registro):
    try:
        aperturas = CotizacionApertura.objects.select_related(
            'orden_plazo_unidad',
            'id_registro',
            'id_registro__id_cliente',
            'id_registro__id_estado',
            'id_registro__id_tipo',
            'id_registro__id_comercial',
            'id_registro__id_tecnico',
            'id_registro__id_unidad_tiempo_entrega_suministros',
            'id_registro__id_unidad_tiempo_entrega_servicios',
            'id_registro__id_unidad_tiempo_validez'
        ).filter(id_registro=id_registro)
        
        if not aperturas.exists():
            try:
                aperturadef = CotizacionApertura.objects.get(id_apertura=id_registro)
                if aperturadef.id_registro_id:
                    aperturas = CotizacionApertura.objects.select_related(
                        'orden_plazo_unidad',
                        'id_registro',
                        'id_registro__id_cliente',
                        'id_registro__id_estado',
                        'id_registro__id_tipo',
                        'id_registro__id_comercial',
                        'id_registro__id_tecnico',
                        'id_registro__id_unidad_tiempo_entrega_suministros',
                        'id_registro__id_unidad_tiempo_entrega_servicios',
                        'id_registro__id_unidad_tiempo_validez'
                    ).filter(id_registro=aperturadef.id_registro_id)
            except CotizacionApertura.DoesNotExist:
                pass
        
        if not aperturas.exists():
            return Response([])
        

        target_id_registro = aperturas.first().id_registro_id if aperturas.exists() else id_registro
        if target_id_registro:
            cleanup_duplicate_aperturas(target_id_registro)
            aperturas = CotizacionApertura.objects.select_related(
                'orden_plazo_unidad',
                'id_registro',
                'id_registro__id_cliente',
                'id_registro__id_estado',
                'id_registro__id_tipo',
                'id_registro__id_comercial',
                'id_registro__id_tecnico',
                'id_registro__id_unidad_tiempo_entrega_suministros',
                'id_registro__id_unidad_tiempo_entrega_servicios',
                'id_registro__id_unidad_tiempo_validez'
            ).filter(id_registro=target_id_registro)

        serializer = CotizacionAperturaSerializer(aperturas, many=True)
        return Response(serializer.data)
    except Exception as e:
        import traceback
        return Response({"error": str(e), "traceback": traceback.format_exc()}, status=500)

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([IsAuthenticated])
def crear_nueva_oc(request, id_registro):
    try:
        try:
            cotizacion = Cotizacion.objects.get(id_registro=id_registro)
        except Cotizacion.DoesNotExist:
            return Response({"error": "Cotización no encontrada"}, status=404)
            
        empty_ap = CotizacionApertura.objects.filter(
            id_registro=id_registro,
            orden_adjunta="",
            numero_orden="",
            total_orden=0
        ).first()

        if empty_ap:
            nueva_apertura = empty_ap
            nueva_apertura.estado_orden = 1
            nueva_apertura.save()
        else:
            aperturas_existentes = CotizacionApertura.objects.filter(id_registro=id_registro)
            responsables = aperturas_existentes.first().responsables if aperturas_existentes.exists() else ""
            from django.utils import timezone
            nueva_apertura = CotizacionApertura.objects.create(
                id_registro=cotizacion,
                anno=timezone.now().year,
                mes=timezone.now().month,
                envio=1,
                prio='0',
                estado_orden=1,
                total_orden=0,
                presupuesto=0,
                responsables=responsables or ""
            )
        
        archivo = request.FILES.get("archivo")
        if archivo:
            from django.conf import settings
            ruta_carpeta = os.path.join(settings.BASE_DIR, 'cotizaciones_api', 'ocfiles')
            if not os.path.exists(ruta_carpeta):
                os.makedirs(ruta_carpeta)

            ext = os.path.splitext(archivo.name)[1].lower()
            if not ext:
                ext = '.pdf'

            nombre_fisico = f"{nueva_apertura.id_apertura}{ext}"
            path_destino = os.path.join(ruta_carpeta, nombre_fisico)

            with open(path_destino, "wb+") as destino:
                for chunk in archivo.chunks():
                    destino.write(chunk)

            url_descarga = f"/api/cotizaciones/ocfiles/ver/{nueva_apertura.id_apertura}/"
            nueva_apertura.orden_adjunta = url_descarga
            nueva_apertura.fecha_orden = timezone.now()

            try:
                texto_completo = extract_text_from_file(path_destino, ext)
                texto_metadata = extract_text_from_file(path_destino, ext, max_pages=2)
                
                if texto_metadata:
                    nro_orden = extract_order_number(texto_metadata)
                    if nro_orden:
                        nueva_apertura.numero_orden = nro_orden
                    total_ext = extract_total_amount(texto_metadata)
                    if total_ext:
                        nueva_apertura.total_orden = Decimal(str(total_ext))
                    
                if texto_completo and nueva_apertura.id_registro_id:
                    matched_supplies, matched_services = match_apertura_items(texto_completo, nueva_apertura.id_registro_id)
                    nueva_apertura.doc = ",".join(matched_supplies) if matched_supplies else ""
                    nueva_apertura.ti1 = ",".join(matched_services) if matched_services else ""
                    recalculate_apertura_costs(nueva_apertura)
            except Exception as ocr_err:
                logger.error(f"Error procesando OCR en crear_nueva_oc: {ocr_err}", exc_info=True)
            
            nueva_apertura.save()

        cleanup_duplicate_aperturas(id_registro)

        aperturas_all = CotizacionApertura.objects.select_related(
            'orden_plazo_unidad',
            'id_registro',
            'id_registro__id_cliente',
            'id_registro__id_estado'
        ).filter(id_registro=id_registro)
        serializer = CotizacionAperturaSerializer(aperturas_all, many=True)
        return Response(serializer.data, status=201)
    except Exception as e:
        import traceback
        return Response({"error": str(e), "traceback": traceback.format_exc()}, status=500)

# Helper functions for automatic OC extraction & matching
def extract_text_from_file(file_path, file_extension, max_pages=None):
    text = ""
    file_extension = file_extension.lower()
    if file_extension == '.pdf':
        try:
            import fitz
            doc = fitz.open(file_path)
            pages = doc
            if max_pages is not None:
                pages = doc[:max_pages]
            for page in pages:
                text += page.get_text() + "\n"
        except Exception as e:
            logger.error(f"Error reading PDF: {e}")
    elif file_extension in ['.xlsx', '.xls']:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
            for i, sheet in enumerate(wb.worksheets):
                if max_pages is not None and i >= max_pages:
                    break
                for row in sheet.iter_rows(values_only=True):
                    row_text = " ".join([str(val) for val in row if val is not None])
                    text += row_text + "\n"
        except Exception as e:
            logger.error(f"Error reading Excel: {e}")
    elif file_extension in ['.docx', '.doc']:
        try:
            import docx
            doc = docx.Document(file_path)
            paragraphs = doc.paragraphs
            if max_pages is not None:
                paragraphs = doc.paragraphs[:100]
            for paragraph in paragraphs:
                text += paragraph.text + "\n"
            
            tables = doc.tables
            if max_pages is not None:
                tables = doc.tables[:5]
            for table in tables:
                for row in table.rows:
                    for cell in row.cells:
                        text += cell.text + " "
                    text += "\n"
        except Exception as e:
            logger.error(f"Error reading Word document: {e}")
    return text

def clean_numeric_value(val_str):
    if not val_str:
        return 0.0
    val_str = val_str.strip()
    if ',' in val_str and '.' in val_str:
        if val_str.rfind(',') > val_str.rfind('.'):
            val_str = val_str.replace('.', '').replace(',', '.')
        else:
            val_str = val_str.replace(',', '')
    elif ',' in val_str:
        parts = val_str.split(',')
        if len(parts) == 2 and len(parts[1]) == 2:
            val_str = val_str.replace(',', '.')
        else:
            val_str = val_str.replace(',', '')
    val_str = re.sub(r'[^\d\.\-]', '', val_str)
    try:
        return float(val_str)
    except ValueError:
        return 0.0

def extract_order_number(text):
    if not text:
        return None
        
    address_keywords = {"AV.", "AVENIDA", "JR.", "JIRON", "CALLE", "URB.", "URBANIZACION", "MZA.", "LOTE", "TELEF", "FAX", "PANAMA", "CATALINA", "VICTORIA", "LIMA", "DIRECCION", "DIR.", "DOMICILIO", "PROVINCIA", "DISTRITO"}
    ruc_keywords = {"RUC", "R.U.C.", "R.U.C", "REGISTRO UNICO DE CONTRIBUYENTES", "CONTRIBUYENTE"}
    phone_keywords = {"CELULAR", "CEL", "TELEFONO", "TLF", "TLFN", "ANEXO", "CONTACTO", "RPM"}
    
    # Pre-split into lines and inspect candidates
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    candidates = []
    
    for idx, line in enumerate(lines):
        line_upper = line.upper()
        # Skip lines that look like addresses
        if any(kw in line_upper for kw in address_keywords):
            continue
            
        # Search for integer sequences of length 4 to 12
        for match in re.finditer(r'\b\d{4,12}\b', line):
            num = match.group(0)
            
            # 1. EXCLUDE RUCs COMPLETELY (11 digits starting with 1 or 2)
            if len(num) == 11 and num[0] in {'1', '2'}:
                continue
                
            # Exclude sequences that match current/adjacent year numbers unless heavily scored
            is_year = num in {"2023", "2024", "2025", "2026", "2027", "2028"}
            
            # Base score based on length (PO numbers are typically 8 to 10 digits)
            if len(num) in {8, 9, 10}:
                score = 30 + len(num)
            elif len(num) == 11 or len(num) == 12:
                score = 15 + len(num)
            else:
                score = len(num)
                
            if is_year:
                score = 1
                
            # 2. PROXIMITY TO ORDER KEYWORDS
            order_keywords = {
                "PEDIDO", "ORDEN", "PURCHASE", "O/C", "OC", "OS", "O/S", "PO", 
                "P.O.", "O.C.", "O.S.", "CONTRATO", "LICITACION", "NRO. PEDIDO", 
                "NRO PEDIDO", "NUMERO PEDIDO", "N° PEDIDO", "N° PEDIDO", 
                "N° ORDEN", "N° ORDEN", "NUMERO ORDEN", "NRO ORDEN"
            }
            
            has_order_kw_same = any(okw in line_upper for okw in order_keywords)
            has_order_kw_prev = idx > 0 and any(okw in lines[idx-1].upper() for okw in order_keywords)
            
            if has_order_kw_same:
                score += 100
            elif has_order_kw_prev:
                score += 80
                
            # 3. NEGATIVE PENALTIES
            # Penalty if RUC label is on the same line
            if any(rkw in line_upper for rkw in ruc_keywords):
                score -= 120
                
            # Penalty if phone/contact keywords are on same line
            if any(pkw in line_upper for pkw in phone_keywords):
                score -= 80
                
            # Position boost: closer to the top is better
            if idx < len(lines) * 0.3:
                score += 15
            elif idx < len(lines) * 0.5:
                score += 5
                
            candidates.append((num, score))
            
    if candidates:
        # Sort by score descending, then by length descending
        candidates.sort(key=lambda x: (x[1], len(x[0])), reverse=True)
        return candidates[0][0]

    # Fallback to standard regex patterns if no candidates found
    text_clean_spaces = re.sub(r'[ \t]+', ' ', text)
    patterns = [
        r'\b(?:PEDIDO|SOLICITUD\s+DE\s+PEDIDO|PEDIDO\s+DE\s+COMPRA|PURCHASE\s+ORDER|ORDER\s+NO|ORDER\s+NUMBER|ORDER\s+#|ORDEN\s+DE\s+(?:COMPR?R?A|SERVICIOS?)|ORDEN\s+(?:COMPR?R?A|SERVICIOS?)|DOCUMENTO\s+DE\s+COMPRA|DOC\.\s*COMPRA|O/C|P\.O\.|O\.C\.|O\.S\.|O/S|OC|OS|PO)(?:\b|\s|\.)\s*(?:NRO|N[O°º\.]|NUMERO|NUM|NUMBER|NO\.)?\s*[:\-#]?\s*([A-Z0-9\-_]+(?:\s*-\s*[A-Z0-9\-_]+)*)',
        r'\b(?:NRO|N[O°º\.]|NUMERO|NUM|NRO\.|NUM\.)\s*[:\-#]?\s*([A-Z0-9\-_]+(?:\s*-\s*[A-Z0-9\-_]+)*)',
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text_clean_spaces, re.IGNORECASE):
            val = match.group(1).strip()
            val = val.split('\n')[0].strip()
            val = re.sub(r'^[^\w]+|[^\w]+$', '', val).strip()
            val_upper = val.upper()
            if any(kw in val_upper for kw in address_keywords):
                continue
            if len(val) >= 4 and len(val) <= 40:
                if re.search(r'\d', val):
                    chunks = re.split(r'[\-_/\u2010-\u2015\s]+', val)
                    for chunk in chunks:
                        chunk_clean = chunk.strip()
                        if chunk_clean.isdigit() and len(chunk_clean) >= 6:
                            if len(chunk_clean) == 11 and (chunk_clean.startswith("10") or chunk_clean.startswith("20")):
                                continue
                            return chunk_clean
                    for chunk in chunks:
                        chunk_clean = chunk.strip()
                        if chunk_clean.isdigit() and len(chunk_clean) >= 4:
                            if len(chunk_clean) == 11 and (chunk_clean.startswith("10") or chunk_clean.startswith("20")):
                                continue
                            return chunk_clean
                    return val
    return None

def extract_total_amount(text):
    text_upper = text.upper()
    for match in re.finditer(r'\bTOTAL\b', text_upper):
        start_idx = match.start()
        if start_idx >= 4:
            prefix = text_upper[start_idx-4:start_idx]
            if "SUB" in prefix:
                continue
        window = text[start_idx:start_idx+120]
        num_match = re.search(r'(?:USD|US\$|S/\.|\$|EUR|PEN)\s*([\d\.,]+)', window, re.IGNORECASE)
        if num_match:
            val = clean_numeric_value(num_match.group(1))
            if val > 0:
                return val
        num_match = re.search(r'\b([\d\.,]+\.\d{2})\b|\b([\d\.,]+,\d{2})\b', window)
        if num_match:
            matched_str = num_match.group(1) or num_match.group(2)
            val = clean_numeric_value(matched_str)
            if val > 0:
                return val
    return None

def remove_accents(input_str):
    import unicodedata
    if not input_str:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', str(input_str))
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

def normalize_match_string(s):
    if not s:
        return ''
    return re.sub(r'[^A-Z0-9]', '', remove_accents(s).upper())

_fuzzy_match_cache = {}

def fuzzy_word_match(w1, w2):
    if w1 == w2:
        return True
    if abs(len(w1) - len(w2)) >= 3:
        return False
    if len(w1) < 4 or len(w2) < 4:
        return False
    
    key = (w1, w2) if w1 < w2 else (w2, w1)
    if key in _fuzzy_match_cache:
        return _fuzzy_match_cache[key]
        
    import difflib
    ratio = difflib.SequenceMatcher(None, w1, w2).ratio()
    res = (ratio >= 0.80)
    _fuzzy_match_cache[key] = res
    return res

def check_description_match(desc, text_upper):
    if not desc:
        return False
    
    desc_clean = remove_accents(desc).upper().strip()
    text_clean = remove_accents(text_upper).upper()
    
    if desc_clean in {"MATERIALES", "EQUIPOS", "SERVICIOS", "GASTOS", "OTROS", "COMPRA", "VENTA", "TOTAL", "GENERAL"}:
        return False
    
    import re as regularexpr
    words = [w.strip() for w in regularexpr.split(r'[^A-Z0-9]', desc_clean) if len(w.strip()) >= 3]
    stopwords = {"DEL", "CON", "PARA", "COMO", "ESTE", "ESTA", "SOLO", "TIPO", "PARA", "LAS", "LOS", "UNA", "UNO", "POR", "SIN", "MAS", "QUE"}
    words = [w for w in words if w not in stopwords]
    if not words:
        return False
    
    words_set = set(words)
    lines = [line.strip() for line in text_clean.split('\n') if line.strip()]
    
    # Generate single lines and 2-line combinations to handle line wraps
    candidates = []
    for i in range(len(lines)):
        candidates.append(lines[i])
        if i < len(lines) - 1:
            candidates.append(lines[i] + " " + lines[i+1])
            
    for candidate in candidates:
        # Performance pre-filter: the candidate line must share at least one exact substring
        # matching a word from our description to avoid doing expensive regex and fuzzy checks.
        if not any(w in candidate for w in words):
            continue
            
        candidate_words = set(w.strip() for w in regularexpr.split(r'[^A-Z0-9]', candidate) if len(w.strip()) >= 3)
        
        if len(words) == 1:
            w = words[0]
            if w in {"MATERIALES", "EQUIPOS", "SERVICIOS", "GASTOS", "OTROS", "COMPRA", "VENTA", "TOTAL", "GENERAL"}:
                continue
            if w in candidate_words or any(fuzzy_word_match(w, tw) for tw in candidate_words):
                return True
        else:
            matched_count = sum(1 for w in words if (w in candidate_words or any(fuzzy_word_match(w, tw) for tw in candidate_words)))
            if (matched_count / len(words)) >= 0.5:
                return True
                
    return False

def check_keyword_overlap(supply_name, service_text):
    if not supply_name or not service_text:
        return False
    import re
    s_words = [w.strip() for w in re.split(r'[^A-Z0-9]', remove_accents(supply_name).upper()) if len(w.strip()) >= 3]
    srv_words = [w.strip() for w in re.split(r'[^A-Z0-9]', remove_accents(service_text).upper()) if len(w.strip()) >= 3]
    
    stopwords = {"DEL", "CON", "PARA", "COMO", "ESTE", "ESTA", "SOLO", "TIPO", "LAS", "LOS", "UNA", "UNO", "POR", "SIN", "MAS", "QUE", "SERVICIO", "ARMADO", "MONTAJE", "INSTALACION", "MANTENIMIENTO"}
    s_words = [w for w in s_words if w not in stopwords]
    srv_words = [w for w in srv_words if w not in stopwords]
    
    if not s_words or not srv_words:
        return False
        
    for sw in s_words:
        match_found = False
        for srv_w in srv_words:
            if sw == srv_w:
                match_found = True
                break
            if len(sw) >= 4 and len(srv_w) >= 4 and sw[:4] == srv_w[:4]:
                match_found = True
                break
        
        if match_found:
            if sw in {"TABLERO", "TAB"}:
                other_s_words = [w for w in s_words if w not in {"TABLERO", "TAB"}]
                if not other_s_words:
                    return True
                for osw in other_s_words:
                    for srv_w in srv_words:
                        if osw == srv_w or (len(osw) >= 4 and len(srv_w) >= 4 and osw[:4] == srv_w[:4]):
                            return True
            else:
                return True
    return False

def match_apertura_items(text, id_registro):
    _fuzzy_match_cache.clear()
    supplies = CotizacionSuministro.objects.filter(id_registro=id_registro)
    services = CotizacionServicio.objects.filter(id_registro=id_registro)

    all_supply_groups = list(set(str(item.codigo_grupo) for item in supplies if item.codigo_grupo))
    
    service_headers = {item.codigo_servicio[:2]: item for item in services if item.nivel == 0 and item.codigo_servicio}
    all_service_ids = list(set(str(item.id_servicio) for item in services if item.nivel == 0))

    norm_text = normalize_match_string(text)
    text_upper = text.upper()

    # 1. CASO SUMINISTROS (Título de grupo, Código de ítem, Descripción u Observación)
    matched_supply_groups = set()
    for item in supplies:
        if item.nivel == 0:
            matched = check_description_match(item.nombre_grupo, text_upper)
            if matched:
                matched_supply_groups.add(str(item.codigo_grupo))
        elif item.nivel == 1:
            norm_code = normalize_match_string(item.codigo_item)
            matched_code = len(norm_code) >= 4 and norm_code in norm_text
            matched_desc = check_description_match(item.descripcion, text_upper) or check_description_match(item.observacion, text_upper)
            if matched_code or matched_desc:
                matched_supply_groups.add(str(item.codigo_grupo))

    # 2. CASO SERVICIOS (Título de servicio, Detalle de servicio, Código de ítem o Descripción)
    matched_service_ids = set()
    for item in services:
        if item.nivel == 0:
            match_name = check_description_match(item.nombre_servicio, text_upper)
            match_desc = check_description_match(item.descripcion_servicio, text_upper)
            if match_name or match_desc:
                matched_service_ids.add(str(item.id_servicio))
        elif item.nivel == 2:
            prefix = item.codigo_servicio[:2] if item.codigo_servicio else ''
            if not prefix or prefix not in service_headers:
                continue
            
            norm_code = normalize_match_string(item.codigo_item)
            matched_code = len(norm_code) >= 4 and norm_code in norm_text
            if matched_code:
                matched_service_ids.add(str(service_headers[prefix].id_servicio))

    # 2.5. CASO CRUZADO: Si se detectaron suministros, buscar servicios relacionados
    if matched_supply_groups:
        matched_supply_names = []
        for item in supplies:
            if item.nivel == 0 and str(item.codigo_grupo) in matched_supply_groups:
                if item.nombre_grupo:
                    matched_supply_names.append(item.nombre_grupo)
                    
        for item in services:
            if item.nivel == 0 and str(item.id_servicio) not in matched_service_ids:
                for s_name in matched_supply_names:
                    if check_keyword_overlap(s_name, item.nombre_servicio or "") or check_keyword_overlap(s_name, item.descripcion_servicio or ""):
                        matched_service_ids.add(str(item.id_servicio))
                        break

    # 3. RETORNO DE ÍTEMS DETECTADOS (Si no hay coincidencias, se retorna vacío para no autoseleccionar todo)
    if not matched_supply_groups and not matched_service_ids:
        return [], []

    return list(matched_supply_groups), list(matched_service_ids)


def recalculate_apertura_costs(apertura):
    supplies = CotizacionSuministro.objects.filter(id_registro=apertura.id_registro)
    services = CotizacionServicio.objects.filter(id_registro=apertura.id_registro)

    def is_suministro_checked(doc_val, group_code):
        if doc_val is None:
            return True
        codes = [s.strip() for s in str(doc_val).split(',') if s.strip()]
        return str(group_code) in codes

    def is_servicio_checked(ti1_val, service_id):
        if ti1_val is None:
            return True
        ids = [s.strip() for s in str(ti1_val).split(',') if s.strip()]
        return str(service_id) in ids

    # Recalculate supplies costs
    equipos_cost = Decimal('0.00')
    equipos_sale = Decimal('0.00')
    materiales_cost = Decimal('0.00')
    materiales_sale = Decimal('0.00')

    suministros_por_grupo = {}
    for item in supplies:
        if item.nivel == 0:
            if item.codigo_grupo not in suministros_por_grupo:
                suministros_por_grupo[item.codigo_grupo] = {'header': item, 'items': []}
            else:
                suministros_por_grupo[item.codigo_grupo]['header'] = item
        elif item.nivel == 1:
            if item.codigo_grupo not in suministros_por_grupo:
                suministros_por_grupo[item.codigo_grupo] = {'header': None, 'items': [item]}
            else:
                suministros_por_grupo[item.codigo_grupo]['items'].append(item)

    for g_code, g_data in suministros_por_grupo.items():
        if is_suministro_checked(apertura.doc, g_code):
            header = g_data['header']
            qty = Decimal(str(header.cantidad)) if (header and header.cantidad is not None) else Decimal('1')
            is_materiales = 'MT' in str(g_code) or (header and header.id_tipo_gasto_id == 2)
            if not is_materiales and g_data['items']:
                is_materiales = any(it.id_tipo_gasto_id == 2 for it in g_data['items'])
            
            for item in g_data['items']:
                cost = Decimal(str(item.costo_total or 0)) * qty
                sale = Decimal(str(item.venta_total or 0)) * qty
                if is_materiales:
                    materiales_cost += cost
                    materiales_sale += sale
                else:
                    equipos_cost += cost
                    equipos_sale += sale

    # Recalculate services costs
    hh_cost = Decimal('0.00')
    hh_sale = Decimal('0.00')
    servicios_cost = Decimal('0.00')
    servicios_sale = Decimal('0.00')
    otros_cost = Decimal('0.00')
    otros_sale = Decimal('0.00')

    servicios_por_grupo = {}
    for item in services:
        prefix = item.codigo_servicio[:2] if item.codigo_servicio else ''
        if not prefix:
            continue
        if prefix not in servicios_por_grupo:
            servicios_por_grupo[prefix] = {'header': None, 'subgrupos': {}}
        
        if item.nivel == 0:
            servicios_por_grupo[prefix]['header'] = item
        elif item.nivel == 1:
            if item.codigo_servicio not in servicios_por_grupo[prefix]['subgrupos']:
                servicios_por_grupo[prefix]['subgrupos'][item.codigo_servicio] = {'sub_header': item, 'items': []}
            else:
                servicios_por_grupo[prefix]['subgrupos'][item.codigo_servicio]['sub_header'] = item
        elif item.nivel == 2:
            sub_code = item.codigo_servicio[:-1] + '1' if item.codigo_servicio else ''
            if sub_code:
                if sub_code not in servicios_por_grupo[prefix]['subgrupos']:
                    servicios_por_grupo[prefix]['subgrupos'][sub_code] = {'sub_header': None, 'items': [item]}
                else:
                    servicios_por_grupo[prefix]['subgrupos'][sub_code]['items'].append(item)

    for prefix, g_data in servicios_por_grupo.items():
        header = g_data['header']
        if not header:
            continue
        if is_servicio_checked(apertura.ti1, header.id_servicio):
            qty = Decimal(str(header.cantidad_hombres or 1))
            for sub_code, sub_data in g_data['subgrupos'].items():
                sub_header = sub_data['sub_header']
                id_gasto = sub_header.id_tipo_gasto_id if sub_header else None
                tipo_code = sub_code[2:4] if len(sub_code) >= 4 else ''
                
                is_mo = tipo_code == '04' or id_gasto in (3, 4)
                is_gastos = tipo_code == '05' or id_gasto in (4, 5)
                is_otros = tipo_code == '06' or id_gasto in (5, 6)
                if not (is_mo or is_gastos or is_otros) and sub_data['items']:
                    is_mo = any(it.id_tipo_gasto_id in (3, 4) for it in sub_data['items'])
                    is_gastos = any(it.id_tipo_gasto_id in (4, 5) for it in sub_data['items'])
                    is_otros = any(it.id_tipo_gasto_id in (5, 6) for it in sub_data['items'])

                for item in sub_data['items']:
                    item_cost = Decimal(str(item.costo_total or 0)) * qty
                    item_sale = Decimal(str(item.cotizado_total or 0)) * qty

                    if is_mo:
                        hh_cost += item_cost
                        hh_sale += item_sale
                    elif is_gastos:
                        servicios_cost += item_cost
                        servicios_sale += item_sale
                    elif is_otros:
                        otros_cost += item_cost
                        otros_sale += item_sale

    total_orden = equipos_sale + materiales_sale + hh_sale + servicios_sale + otros_sale
    costs_sum = equipos_cost + materiales_cost + hh_cost + Decimal(str(apertura.orden_compra_entrega or 0)) + servicios_cost + otros_cost
    uti_des = total_orden - costs_sum

    apertura.orden_compra_equipos = equipos_cost.quantize(Decimal('0.01'))
    apertura.orden_compra_materiales = materiales_cost.quantize(Decimal('0.01'))
    apertura.orden_compra_hh = hh_cost.quantize(Decimal('0.01'))
    apertura.orden_compra_costo_servicios = servicios_cost.quantize(Decimal('0.01'))
    apertura.orden_compra_otros = otros_cost.quantize(Decimal('0.01'))
    apertura.total_orden = total_orden.quantize(Decimal('0.01'))
    apertura.uti_des = uti_des.quantize(Decimal('0.01'))

    # ── Recalcular Plazo de Entrega (Tiempo de Entrega) en base a los ítems activos ──
    cotizacion = apertura.id_registro
    if cotizacion:
        # Check if there are checked supplies
        has_checked_supplies = False
        for g_code in suministros_por_grupo.keys():
            if is_suministro_checked(apertura.doc, g_code):
                has_checked_supplies = True
                break
                
        # Check if there are checked services
        has_checked_services = False
        for prefix, g_data in servicios_por_grupo.items():
            header = g_data['header']
            if header and is_servicio_checked(apertura.ti1, header.id_servicio):
                has_checked_services = True
                break
                
        def convert_to_days(val, unidad_obj):
            if not val or not unidad_obj:
                return 0
            nombre = (unidad_obj.nombre or "").upper()
            try:
                val_float = float(val)
            except (ValueError, TypeError):
                return 0
            if "DÍA" in nombre or "DIA" in nombre:
                return val_float
            elif "SEMANA" in nombre:
                return val_float * 7
            elif "MES" in nombre:
                return val_float * 30
            elif "AÑO" in nombre or "ANO" in nombre:
                return val_float * 365
            return val_float

        plazo_dias = 0
        if has_checked_supplies and cotizacion.entrega_suministros:
            plazo_dias += convert_to_days(cotizacion.entrega_suministros, cotizacion.id_unidad_tiempo_entrega_suministros)
        if has_checked_services and cotizacion.entrega_servicios:
            plazo_dias += convert_to_days(cotizacion.entrega_servicios, cotizacion.id_unidad_tiempo_entrega_servicios)
            
        if plazo_dias > 0:
            apertura.orden_plazo_valor = int(plazo_dias)
            ut_dias = UnidadTiempo.objects.filter(id_tiempo=1).first() or UnidadTiempo.objects.filter(nombre__icontains="DIA").first() or UnidadTiempo.objects.filter(nombre__icontains="DÍA").first()
            if ut_dias:
                apertura.orden_plazo_unidad = ut_dias
                
            # Recalcular Fecha de Entrega en base a la Fecha de Emisión y el Plazo de Entrega
            if apertura.fecha_orden:
                from datetime import timedelta
                apertura.fecha_entrega = apertura.fecha_orden + timedelta(days=int(plazo_dias))

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subir_oc_apertura(request, id_apertura):
    try:
        apertura = CotizacionApertura.objects.get(id_apertura=id_apertura)
    except CotizacionApertura.DoesNotExist:
        return Response({"error": "Apertura no encontrada"}, status=404)

    archivo = request.FILES.get("archivo")
    if not archivo:
        return Response({"error": "No se recibió ningún archivo"}, status=400)

    try:
        from django.conf import settings
        
        # Siempre lo guardamos en 'ocfiles' con el id_apertura de la base de datos
        ruta_carpeta = os.path.join(settings.BASE_DIR, 'cotizaciones_api', 'ocfiles')
        if not os.path.exists(ruta_carpeta):
            os.makedirs(ruta_carpeta)

        ext = os.path.splitext(archivo.name)[1].lower()
        if not ext:
            ext = '.pdf'

        nombre_fisico = f"{id_apertura}{ext}"
        path_destino = os.path.join(ruta_carpeta, nombre_fisico)

        with open(path_destino, "wb+") as destino:
            for chunk in archivo.chunks():
                destino.write(chunk)

        # URL de visualización de la orden usando id_apertura
        url_descarga = f"/api/cotizaciones/ocfiles/ver/{id_apertura}/"
        
        apertura.orden_adjunta = url_descarga
        apertura.fecha_orden = timezone.now()

        # --- AUTOMATIZACION DE LECTURA Y VINCULACION ---
        try:
            texto_completo = extract_text_from_file(path_destino, ext)
            texto_metadata = extract_text_from_file(path_destino, ext, max_pages=2)
            
            if texto_metadata:
                # 1. Extraer número de orden
                nro_orden = extract_order_number(texto_metadata)
                if nro_orden:
                    apertura.numero_orden = nro_orden
                
                # 2. Extraer total
                total_ext = extract_total_amount(texto_metadata)
                if total_ext:
                    apertura.total_orden = Decimal(str(total_ext))
                
            if texto_completo and apertura.id_registro_id:
                # 3. Extraer e identificar ítems
                matched_supplies, matched_services = match_apertura_items(texto_completo, apertura.id_registro_id)
                apertura.doc = ",".join(matched_supplies) if matched_supplies else ""
                apertura.ti1 = ",".join(matched_services) if matched_services else ""
                
                # 4. Recalcular costos
                recalculate_apertura_costs(apertura)
        except Exception as ocr_err:
            logger.error(f"Error procesando OCR/Lectura de OC automatizada: {ocr_err}", exc_info=True)
        
        apertura.save()

        # Serializamos y devolvemos la apertura actualizada
        serializer = CotizacionAperturaSerializer(apertura)

        return Response({
            "ok": True,
            "orden_adjunta": url_descarga,
            "tiene_archivo_fisico": True,
            "extension_archivo_fisico": ext,
            "message": f"Orden de compra procesada y vinculada correctamente.",
            "apertura": serializer.data
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reprocesar_oc_apertura(request, id_apertura):
    try:
        apertura = CotizacionApertura.objects.get(id_apertura=id_apertura)
    except CotizacionApertura.DoesNotExist:
        return Response({"error": "Apertura no encontrada"}, status=404)

    try:
        from django.conf import settings
        ruta_carpeta = os.path.join(settings.BASE_DIR, 'cotizaciones_api', 'ocfiles')
        
        extensiones = ['.pdf', '.xlsx', '.xls', '.docx', '.doc']
        path_completo = None
        ext_encontrada = None
        id_apertura_str = str(int(id_apertura)).strip()
        
        for ext in extensiones:
            path_test = os.path.join(ruta_carpeta, f"{id_apertura_str}{ext}")
            if os.path.exists(path_test):
                path_completo = path_test
                ext_encontrada = ext
                break

        if not path_completo:
            return Response({"error": "No se encontró ningún archivo físico de Orden de Compra guardado para este registro."}, status=404)

        apertura.fecha_orden = timezone.now()
        texto_completo = extract_text_from_file(path_completo, ext_encontrada)
        texto_metadata = extract_text_from_file(path_completo, ext_encontrada, max_pages=2)
        
        if texto_completo:
            nro_orden = extract_order_number(texto_metadata)
            if nro_orden:
                apertura.numero_orden = nro_orden
            
            total_ext = extract_total_amount(texto_metadata)
            if total_ext:
                apertura.total_orden = Decimal(str(total_ext))

            if apertura.id_registro_id:
                matched_supplies, matched_services = match_apertura_items(texto_completo, apertura.id_registro_id)
                apertura.doc = ",".join(matched_supplies) if matched_supplies else ""
                apertura.ti1 = ",".join(matched_services) if matched_services else ""
                
                recalculate_apertura_costs(apertura)

        apertura.save()
        serializer = CotizacionAperturaSerializer(apertura)

        return Response({
            "ok": True,
            "message": "Orden de Compra re-procesada y vinculada correctamente.",
            "apertura": serializer.data
        })
    except Exception as e:
        logger.error(f"Error re-procesando OC {id_apertura}: {e}", exc_info=True)
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
@xframe_options_exempt
def ver_oc_pdf(request, id_apertura):
    import os
    from django.http import FileResponse
    from django.conf import settings
    
    # Sanitizar y convertir id_apertura a string
    id_apertura_str = str(int(id_apertura)).strip()
    
    ruta_carpeta = os.path.join(settings.BASE_DIR, 'cotizaciones_api', 'ocfiles')
    
    # Extensiones a buscar
    extensiones = ['.pdf', '.xlsx', '.xls', '.docx', '.doc']
    path_completo = None
    ext_encontrada = None
    
    for ext in extensiones:
        path_test = os.path.join(ruta_carpeta, f"{id_apertura_str}{ext}")
        if os.path.exists(path_test):
            path_completo = path_test
            ext_encontrada = ext
            break
            
    if not path_completo:
        return Response({"error": f"No se encontró archivo de orden para id_apertura '{id_apertura_str}' en ocfiles"}, status=404)
        
    try:
        content_types = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
        }
        content_type = content_types.get(ext_encontrada, 'application/octet-stream')
        
        response = FileResponse(open(path_completo, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{id_apertura_str}{ext_encontrada}"'
        return response
    except Exception as e:
        return Response({"error": str(e)}, status=500)

#========================================================================================

##=========##
## GUARDAR ##
##=========##
@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def guardar_cotizacion(request):
    with transaction.atomic():
        origen = request.data.get("origen", "C")

        print("[INFO] Guardar desde dashboard:", origen)
        
        #if origen == "O":
            #return guardar_desde_oportunidad(request)
        
        # Capturamos el id_registro o num_reg que viene del frontend
        id_registro_frontend = request.data.get("id_registro") or request.data.get("num_reg")
        cotizacion = None

        # =========================
        # 1️⃣ BUSCAR O CREAR
        # =========================
        if id_registro_frontend:
            # Intentamos buscar si ya existe para ACTUALIZAR
            cotizacion = Cotizacion.objects.filter(id_registro=id_registro_frontend).select_for_update().first()

        if not cotizacion:
            # SI NO EXISTE: Es una creación nueva.
            hoy = timezone.now()
            nuevo_id = obtener_siguiente_num_reg()
            
            fecha_val = request.data.get("fecha")
            if not fecha_val or str(fecha_val).strip() == "":
                fecha_val = None
            
            cotizacion = Cotizacion.objects.create(
                id_registro=nuevo_id,
                anno=hoy.year,
                mes=hoy.month,
                fecha=fecha_val,
                estado_envio=1,
                saldo=Decimal("0.00"),
                total_cotizacion=Decimal("0.00"),
                igv="N",
                año_apertura=hoy.year,
            )
            es_creacion = True
        else:
            es_creacion = False

        # =========================
        # 2️⃣ ACTUALIZAR DATOS (EXCEPTO id_registro)
        # =========================
        data = request.data.copy()
        if "fecha" in data and (data["fecha"] is None or str(data["fecha"]).strip() == ""):
            data["fecha"] = None
        
        # Mapeo de campos del frontend al modelo nuevo
        # 1. Resolve id_cliente (FK)
        id_cli_val = data.get("id_cliente")
        cliente_obj = None
        if id_cli_val and str(id_cli_val).strip() not in ["", "null", "undefined"]:
            try:
                cliente_obj = Cliente.objects.filter(pk=int(id_cli_val)).first()
            except (ValueError, TypeError):
                pass
        if not cliente_obj:
            cod_cli = data.get("cliente_codigo") or data.get("empre")
            if cod_cli:
                cliente_obj = Cliente.objects.filter(Q(ruc=cod_cli) | Q(codigo=cod_cli)).first()
        data["id_cliente"] = cliente_obj.pk if cliente_obj else None

        # 2. Resolve id_representante (FK)
        id_rep_val = data.get("id_representante") or data.get("codir")
        rep_obj = None
        if id_rep_val and str(id_rep_val).strip() not in ["", "null", "undefined"]:
            try:
                rep_obj = Representante.objects.filter(pk=int(id_rep_val)).first()
            except (ValueError, TypeError):
                pass
        data["id_representante"] = rep_obj.pk if rep_obj else None

        # 3. Resolve id_tipo (FK)
        tipo_val = data.get("id_tipo") or data.get("cotit")
        tipo_obj = None
        if tipo_val and str(tipo_val).strip() not in ["", "null", "undefined"]:
            try:
                tipo_obj = TipoCotizacion.objects.filter(Q(id_tipo=tipo_val) | Q(nombre__iexact=tipo_val)).first()
            except (ValueError, TypeError):
                pass
        data["id_tipo"] = tipo_obj.pk if tipo_obj else None
        
        # 4. Resolve id_estado (FK)
        est_val = data.get("id_estado") or data.get("estado_codigo") or "11"
        est_obj = None
        if est_val and str(est_val).strip() not in ["", "null", "undefined"]:
            try:
                if str(est_val).isdigit():
                    est_obj = Estado.objects.filter(pk=int(est_val)).first()
                else:
                    est_obj = Estado.objects.filter(nombre__iexact=est_val).first()
            except (ValueError, TypeError):
                pass
        data["id_estado"] = est_obj.pk if est_obj else None

        cotit = data.get("cotit")
        if cotit == "V":
            data["tipo_venta"] = data.get("tven")
        else:
            data["tipo_venta"] = None

        id_area_val = data.get("area_codigo")
        if id_area_val and str(id_area_val).strip() not in ["", "null", "undefined"]:
            try:
                data["id_area"] = int(id_area_val)
            except (ValueError, TypeError):
                data["id_area"] = None
        else:
            data["id_area"] = None

        prob_val = data.get("prob")
        if prob_val and str(prob_val).strip() not in ["", "null", "undefined"]:
            try:
                data["probabilidad"] = int(prob_val)
            except (ValueError, TypeError):
                data["probabilidad"] = 0
        else:
            data["probabilidad"] = 0
        
        # Moneda y Tipo Cambio
        if data.get("tmone"):
            data["tipo_moneda"] = data.get("tmone")
        elif not data.get("tipo_moneda"):
            data["tipo_moneda"] = "D"

        tcamb_val = data.get("tipo_cambio") or data.get("tcamb")
        if tcamb_val is not None and str(tcamb_val).strip() not in ["", "null", "undefined", "0"]:
            try:
                data["tipo_cambio"] = Decimal(str(tcamb_val))
            except (InvalidOperation, TypeError, ValueError):
                data["tipo_cambio"] = Decimal("3.362")
        else:
            data["tipo_cambio"] = Decimal("3.362")
        
        # Plazo
        plazo_val = data.get("plazo")
        if plazo_val and str(plazo_val).strip() not in ["", "null", "undefined"]:
            try:
                data["entrega_suministros"] = int(plazo_val)
            except (ValueError, TypeError):
                data["entrega_suministros"] = 0
        else:
            data["entrega_suministros"] = 0

        ut_sum = UnidadTiempo.objects.filter(codigo=data.get("tot_d")).first()
        data["id_unidad_tiempo_entrega_suministros"] = ut_sum.id_tiempo if ut_sum else None
        
        por_c_val = data.get("por_c")
        if por_c_val and str(por_c_val).strip() not in ["", "null", "undefined"]:
            try:
                data["entrega_servicios"] = int(por_c_val)
            except (ValueError, TypeError):
                data["entrega_servicios"] = 0
        else:
            data["entrega_servicios"] = 0

        ut_ser = UnidadTiempo.objects.filter(codigo=data.get("tot_s")).first()
        data["id_unidad_tiempo_entrega_servicios"] = ut_ser.id_tiempo if ut_ser else None
        
        valid_val = data.get("valid")
        if valid_val and str(valid_val).strip() not in ["", "null", "undefined"]:
            try:
                data["validez_oferta"] = int(valid_val)
            except (ValueError, TypeError):
                data["validez_oferta"] = 0
        else:
            data["validez_oferta"] = 0

        ut_val = UnidadTiempo.objects.filter(codigo=data.get("acu_s")).first()
        data["id_unidad_tiempo_validez"] = ut_val.id_tiempo if ut_val else None

        data["representante_nombre"] = data.get("nombr")
        data["representante_cargo"] = data.get("cargo") or data.get("cargr")
        data["representante_telefono"] = data.get("teler")
        data["representante_movil"] = data.get("movir")
        data["representante_correo"] = data.get("mailr")

        # Mapeo de campos de Oportunidad
        if data.get("f_recp"):
            data["recepcion_solicitud"] = data.get("f_recp")
        elif es_creacion:
            data["recepcion_solicitud"] = timezone.now()

        data["fecha_limite"] = data.get("f_limite") if data.get("f_limite") else None
        data["emision_cotizacion"] = data.get("f_emi") if data.get("f_emi") else None
        data["visita_tecnica"] = data.get("f_visita") if data.get("f_visita") else None

        estado_op = data.get("estado_op")
        if estado_op is not None and str(estado_op).strip() != "":
            data["estado_oportunidad"] = int(estado_op)
        elif es_creacion:
            data["estado_oportunidad"] = 1

        if data.get("coment"):
            data["comentario"] = data.get("coment")
        
        # Comercial
        comercial_user = None
        if data.get("codic"):
            comercial_user = Usuario.objects.filter(dni=data.get("codic")).first()
        if not comercial_user and data.get("nombc"):
            comercial_user = Usuario.objects.filter(nombre_completo=data.get("nombc")).first()
            
        if comercial_user:
            data["id_comercial"] = comercial_user.pk
        elif "id_comercial" in data and data.get("id_comercial") not in [None, "", "null", "undefined"]:
            try:
                data["id_comercial"] = int(data.get("id_comercial"))
            except ValueError:
                data["id_comercial"] = None
        else:
            data["id_comercial"] = None

        # Técnico
        tecnico_user = None
        if data.get("codit"):
            tecnico_user = Usuario.objects.filter(dni=data.get("codit")).first()
        if not tecnico_user and data.get("nombt"):
            tecnico_user = Usuario.objects.filter(nombre_completo=data.get("nombt")).first()
            
        if tecnico_user:
            data["id_tecnico"] = tecnico_user.pk
        elif "id_tecnico" in data and data.get("id_tecnico") not in [None, "", "null", "undefined"]:
            try:
                data["id_tecnico"] = int(data.get("id_tecnico"))
            except ValueError:
                data["id_tecnico"] = None
        else:
            data["id_tecnico"] = None
        
        data["id_creador"] = request.user.pk
        
        data.pop("id_registro", None)
        data.pop("num_reg", None)

        if "acu_e" not in data:
            data.pop("acu_e", None)

        serializer = CotizacionSerializer(
            cotizacion,
            data=data,
            partial=True
        )
        if not serializer.is_valid():
            print("❌ ERROR DE VALIDACIÓN EN COTIZACION:", serializer.errors)
            logger.error("❌ ERROR DE VALIDACIÓN EN COTIZACION: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()

        # Asegurar valores por defecto y snapshot
        if cotizacion.fecha:
            cotizacion.anno = cotizacion.fecha.year
            cotizacion.mes = cotizacion.fecha.month
            cotizacion.año_apertura = cotizacion.fecha.year
        else:
            hoy = timezone.now()
            cotizacion.anno = hoy.year
            cotizacion.mes = hoy.month
            cotizacion.año_apertura = hoy.year
            
        cotizacion.igv = cotizacion.igv or "N"

        if not cotizacion.codigo:
            cotizacion.codigo = calcular_codigo_dinamico(cotizacion)

        cotizacion.save()

        # =========================
        # 4️⃣ SUMINISTROS
        # =========================
        suministros = request.data.get("suministros", {})
        tipo_venta_general = cotizacion.tipo_venta 

        CotizacionSuministro.objects.filter(id_registro=cotizacion).delete()

        TIPO_MAP = {"01": "01", "02": "02"}
        num_contador = 1
        grupo_index = 1

        for _, grupo in suministros.items():
            cog = grupo.get("cog") or grupo.get("id")
            if not cog:
                tipo = grupo.get("tipo", "01")
                tipo_code = TIPO_MAP.get(tipo, "01")
                cog = f"{grupo_index:02d}{tipo_code}"
                grupo_index += 1

            try:
                codigo_grupo_val = int(cog[:2])
            except Exception:
                codigo_grupo_val = grupo_index

            cantidad_grupo = Decimal(str(grupo.get("cantidad", 0)))
            total_grupo = Decimal(str(grupo.get("total", 0)))
            costo_envio_valor = Decimal(str(grupo.get("costoEnvio", 0)))

            # =====================
            # CABECERA (nig = 0)
            # =====================
            CotizacionSuministro.objects.create(
                id_registro=cotizacion,
                codigo_grupo=codigo_grupo_val,
                nombre_grupo=grupo.get("titulo"),
                nivel=0,
                orden=num_contador,
                codigo_item="0",
                descripcion=grupo.get("titulo") or "",
                cantidad=int(cantidad_grupo),
                venta_total=total_grupo,
                costo_envio_total=costo_envio_valor if tipo_venta_general == "T" else Decimal("0.00"),
                costo_envio_unidad=costo_envio_valor if tipo_venta_general == "P" else Decimal("0.00"),
                costo_con_envio=Decimal("0.00"),
                costo_precio=Decimal("0.00"),
                costo_total=Decimal("0.00"),
                porcentaje_envio=Decimal("0.00"),
                costo_envio=Decimal("0.00"),
                porcentaje_utilidad=Decimal("0.00"),
                utilidad=Decimal("0.00"),
                precio_venta=Decimal("0.00"),
            )
            num_contador += 1

            # =====================
            # ITEMS (nig = 1)
            # =====================
            for item in grupo.get("items", []):
                CotizacionSuministro.objects.create(
                    id_registro=cotizacion,
                    codigo_grupo=codigo_grupo_val,
                    nombre_grupo="",
                    nivel=1,
                    orden=num_contador,
                    codigo_item=item.get("cod"),
                    descripcion=item.get("des"),
                    observacion=item.get("obs"),
                    proveedor=item.get("pro"),
                    tipo_unidad=item.get("enu"),
                    cantidad=int(Decimal(str(item.get("can", 0)))),
                    tiempo_entrega=int(Decimal(str(item.get("ent", 0)))) if item.get("ent") else None,
                    
                    costo_precio=Decimal(str(item.get("puc", 0))),
                    costo_total=Decimal(str(item.get("toc", 0))),
                    costo_envio_total=Decimal("0.00"),
                    costo_envio_unidad=Decimal("0.00"),
                    
                    costo_envio=Decimal(str(item.get("cost_env", 0))),
                    porcentaje_envio=Decimal(str(item.get("por_env", 0))),
                    costo_con_envio=Decimal(str(item.get("cost_c_env", 0))),
                    
                    porcentaje_utilidad=Decimal(str(item.get("cau", 0))),
                    utilidad=Decimal(str(item.get("tou", 0))),
                    precio_venta=Decimal(str(item.get("val", 0))),
                    venta_total=Decimal(str(item.get("tot", 0))),
                )
                num_contador += 1
        
        # =========================
        # 5️⃣ SERVICIOS
        # =========================
        servicios = request.data.get("servicios", {})

        if isinstance(servicios, list):
            servicios = {str(i): s for i, s in enumerate(servicios)}

        # Limpieza total (igual que suministros)
        CotizacionServicio.objects.filter(id_registro=cotizacion).delete()

        for _, servicio in servicios.items():

            # =====================
            # CABECERA SERVICIO (nig = 0)
            # =====================
            cog_servicio = f"{grupo_index:02d}000"
            total_servicio = Decimal("0.00")
            cantidad_servicio = Decimal(str(servicio.get("cantidad", 1)))

            CotizacionServicio.objects.create(
                id_registro=cotizacion,
                codigo_servicio=cog_servicio,
                nombre_servicio=servicio.get("tituloGeneral") or servicio.get("nombre", ""),
                nivel=0,
                orden=num_contador,
                codigo_item="0",
                cantidad_hombres=int(cantidad_servicio),
                cotizado_total=Decimal("0.00"),
                descripcion_servicio=servicio.get("detalle", ""),
            )

            num_servicio = num_contador
            num_contador += 1

            # =====================
            # SUBGRUPOS (nig = 1)
            # =====================
            for sub in servicio.get("subgrupos", []):
                tipo = sub.get("titulo", "OTROS")
                tipo_code = sub.get("tipoCodigo", "06")  # 🔹 usamos el tipo que envía frontend
                total_sub = Decimal("0.00")

                cog_sub = f"{grupo_index:02d}{tipo_code}1"
                
                tg = TipoGasto.objects.filter(codigo=tipo_code).first()

                CotizacionServicio.objects.create(
                    id_registro=cotizacion,
                    codigo_servicio=cog_sub,
                    nombre_servicio=tipo,
                    nivel=1,
                    orden=num_contador,
                    codigo_item="0",
                    cantidad_hombres=0,
                    cotizado_total=Decimal("0.00"),
                    id_tipo_gasto=tg,
                )

                num_sub = num_contador
                num_contador += 1

                # =====================
                # ITEMS (nig = 2)
                # =====================
                for item in sub.get("items", []):
                    total_item = Decimal(str(item.get("tot", 0)))
                    cog_item = f"{grupo_index:02d}{tipo_code}2"

                    CotizacionServicio.objects.create(
                        id_registro=cotizacion,
                        codigo_servicio=cog_item,
                        nombre_servicio="",
                        nivel=2,
                        orden=num_contador,
                        codigo_item=(
                            f"{item.get('personalCodigo','')} - {item.get('personal','')}"
                            if tipo == "MANO DE OBRA"
                            else item.get("cod", "")
                        ),
                        descripcion_item=item.get("des", ""),
                        horas=int(Decimal(str(item.get("pro", 8)))),
                        cantidad_hombres=int(Decimal(str(item.get("can", 1)))),
                        costo_hombre_dia=Decimal(str(item.get("puc", 0))),
                        cantidad_dias=int(Decimal(str(item.get("tde", 1)))),
                        costo_total=Decimal(str(item.get("toc", 0))),
                        porcentaje=Decimal(str(item.get("cau", 0))),
                        utilidad=Decimal(str(item.get("tou", 0))),
                        cotizado_hombre_dia=Decimal(str(item.get("val", 0))),
                        cotizado_total=total_item,
                        id_tipo_gasto=tg,
                    )

                    total_sub += total_item
                    total_servicio += total_item
                    num_contador += 1

                # actualizar subtotal
                CotizacionServicio.objects.filter(
                    id_registro=cotizacion,
                    orden=num_sub,
                    nivel=1
                ).update(cotizado_total=total_sub)

            # actualizar total servicio
            CotizacionServicio.objects.filter(
                id_registro=cotizacion,
                orden=num_servicio,
                nivel=0
            ).update(cotizado_total=total_servicio)

            grupo_index += 1

        # =========================
        # 6️⃣ MENSAJES
        # =========================
        mensaje_data = request.data.get("mensaje")

        if mensaje_data and mensaje_data.get("msj"):
            CotizacionMensaje.objects.create(
                id_registro=cotizacion,
                id_usuario=request.user,
                mensaje=mensaje_data.get("msj"),
                activo=mensaje_data.get("act", "1"),
            )

        # =========================
        # 7️⃣ SEGUIMIENTOS
        # =========================
        seguimiento_data = request.data.get("seguimiento")  # 🔑 similar a "mensaje"

        if seguimiento_data and seguimiento_data.get("des"):
            # Crear nuevo registro en CotizacionSeguimiento
            CotizacionSeguimiento.objects.create(
                id_registro=cotizacion,
                detalle=seguimiento_data.get("des"),
                id_usuario=request.user,
                activo=seguimiento_data.get("act", "1"),
            )

        # =========================
        # 8️⃣ TOTAL GENERAL + DESCUENTO
        # =========================
        descuento = request.data.get("descuento", {})
        aplicar = descuento.get("aplicar", False)
        aplica_a = descuento.get("aplicaA")
        importe_desc = Decimal(str(descuento.get("importe", 0)))
        porcentaje_desc = Decimal(str(descuento.get("porcentaje", 0)))

        # Totales base
        total_suministros = sum(
            Decimal(str(grupo.get("total", 0))) *
            Decimal(str(grupo.get("cantidad", 1)))
            for grupo in suministros.values()
        )

        total_servicios = sum(
            Decimal(str(grupo.get("total", 0)))
            for grupo in servicios.values()
        )

        total_general = total_suministros + total_servicios

        # Aplicar descuento
        if aplicar and importe_desc > 0:
            if aplica_a == "TOTAL":
                total_general -= importe_desc
            elif aplica_a == "SUMINISTROS":
                total_general = (total_suministros - importe_desc) + total_servicios
            elif aplica_a == "SERVICIOS":
                total_general = total_suministros + (total_servicios - importe_desc)

        if total_general < 0:
            total_general = Decimal("0.00")

        # 👉 ASIGNAR TODO
        cotizacion.total_cotizacion = total_general
        cotizacion.descuento_aplica = 1 if aplicar else 0

        if aplica_a == "TOTAL":
            cotizacion.descuento_afecto = "T"
        elif aplica_a == "SUMINISTROS":
            cotizacion.descuento_afecto = "S"
        elif aplica_a == "SERVICIOS":
            cotizacion.descuento_afecto = "M"
        else:
            cotizacion.descuento_afecto = None

        cotizacion.descuento_porcentaje = porcentaje_desc
        cotizacion.descuento_monto = importe_desc

        # 👉 AHORA SÍ guardar
        cotizacion.save(update_fields=[
            "total_cotizacion", "descuento_aplica", "descuento_afecto", "descuento_porcentaje", "descuento_monto",
        ])

        actualizar_total_general_cotizacion(cotizacion)

        return Response(
            {
                "message": "Cotización guardada correctamente",
                "num_reg": cotizacion.id_registro,
                "codigo": cotizacion.codigo,
                "cotizacion": {
                    "num_reg": cotizacion.id_registro,
                    "id_registro": cotizacion.id_registro,
                    "numero": cotizacion.codigo,
                    "codigo": cotizacion.codigo
                }
            },
            status=status.HTTP_200_OK if not es_creacion else status.HTTP_201_CREATED
        )

# NUM_REG COTIZACION
def obtener_siguiente_num_reg():
    with transaction.atomic():
        ultimo = (
            Cotizacion.objects
            .select_for_update()
            .aggregate(max_reg=Max("id_registro"))
        )["max_reg"]

        if ultimo is not None:
            return ultimo + 1

        return 1

#========================================================================================

##===========##
## BUSQUEDAS ##
##===========##
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def buscar_encargados_por_empresa(request, empresa):
    q = request.GET.get("q", "").strip()

    # Filtramos en Representante
    encargados = Representante.objects.filter(
        empresa=empresa,    # El campo 'empresa' de la DB coincide con el ID del cliente
        activo="1"          # IMPORTANTE: En tu modelo es CharField, usamos "1" no True
    ).filter(
        Q(representante__icontains=q) |
        Q(codigo__icontains=q)
    ).values(
        "codigo",
        "representante",
        "cargo",
        "telefono",
        "movil",
        "email",
        "empresa"
    )

    return Response(list(encargados))

#========================================================================================

##=========##
## GESTION ##
##=========##
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def condiciones_generales(request, id_registro):
    """
    GET:  Retorna la descripción de la tabla independiente cotizaciones_condiciones_generales.
    POST: Crea o actualiza el registro en la tabla independiente.
    """
    try:
        # 1. Verificar que la cotización padre existe usando el nuevo id_registro
        cot = Cotizacion.objects.filter(id_registro=id_registro).first()
        if not cot:
            return Response({"error": f"No se encontró la cotización ID #{id_registro}"}, status=404)

        # 2. Obtener o preparar el registro de condiciones
        # Usamos id_registro=cot porque en el modelo de condiciones es un OneToOneField a Cotizacion
        try:
            condicion_obj, created = CotizacionCondicionGeneral.objects.get_or_create(
                id_registro=cot
            )
        except CotizacionCondicionGeneral.MultipleObjectsReturned:
            # Si hay duplicados, nos quedamos con el primero y eliminamos los demás
            duplicados = list(CotizacionCondicionGeneral.objects.filter(id_registro=cot).order_by('id_condicion_general'))
            condicion_obj = duplicados[0]
            # Eliminar los demás duplicados
            for dup in duplicados[1:]:
                dup.delete()
            created = False

        if request.method == "GET":
            return Response({
                "id_registro": cot.id_registro,
                "codigo": cot.codigo, # Incluimos el código (antes cotin) para mayor utilidad
                "condiciones": condicion_obj.descripcion or "",
                "ultima_actualizacion": condicion_obj.fecha
            }, status=200)

        # 3. POST -> Actualizar la tabla independiente
        if request.method == "POST":
            contenido = request.data.get("condiciones", "")
            if isinstance(contenido, str):
                contenido = contenido.strip()

            old_desc = condicion_obj.descripcion or ""
            with transaction.atomic():
                condicion_obj.descripcion = contenido
                condicion_obj.save()

                if old_desc != contenido:
                    from django.utils import timezone
                    from datetime import timedelta
                    cinco_minutos_atras = timezone.now() - timedelta(minutes=5)
                    log_reciente = CotizacionSeguimiento.objects.filter(
                        id_registro=cot,
                        detalle="CONDICIONES GENERALES: Se actualizaron las condiciones generales de la cotización.",
                        id_usuario=request.user,
                        fecha__gte=cinco_minutos_atras
                    ).first()

                    if log_reciente:
                        CotizacionSeguimiento.objects.filter(id_seguimiento=log_reciente.id_seguimiento).update(fecha=timezone.now())
                    else:
                        CotizacionSeguimiento.objects.create(
                            id_registro=cot,
                            detalle="CONDICIONES GENERALES: Se actualizaron las condiciones generales de la cotización.",
                            id_usuario=request.user,
                            activo='1'
                        )

            return Response({
                "status": "ok",
                "msg": "Condiciones guardadas correctamente en la tabla independiente.",
                "id_registro": cot.id_registro,
                "condiciones": condicion_obj.descripcion or ""
            }, status=200)

    except Exception as e:
        import traceback
        print(f"Error en condiciones_generales (ID: {id_registro}):", traceback.format_exc())
        return Response({"error": str(e)}, status=500)

def calcular_codigo_dinamico(cot, codigo_actual=None):
    """
    Calcula el código dinámico de la cotización. Si ya existe un código previo
    y el área no ha cambiado, conserva la base y actualiza iniciales y tipo.
    Si no, genera uno totalmente nuevo.
    """
    if not cot.id_cliente:
        return ""
    if codigo_actual and '-' in codigo_actual:
        parts = codigo_actual.split('-')
        if len(parts) == 3:
            base_version, iniciales, tipo_char = parts
            
            # El año es de 2 dígitos (pos 0, 1). El área es el carácter pos 2.
            area_str = str(cot.id_area) if cot.id_area else ""
            if len(base_version) >= 3 and base_version[2] == area_str:
                # Cliente iniciales
                nueva_iniciales = "SINC"
                if cot.id_cliente:
                    nueva_iniciales = cot.id_cliente.iniciales or "SINC"
                
                # Tipo char
                nuevo_tipo = "S"
                if cot.id_tipo:
                    nuevo_tipo = cot.id_tipo_id
                
                return f"{base_version}-{nueva_iniciales}-{nuevo_tipo}"
                
    return _calcular_nuevo_codigo(cot)

# FALTA
def _calcular_nuevo_codigo(cot):
    """
    Calcula el código único (COTIN) para una cotización sin guardarlo.
    Formato: YYAreaCorrVersion-INICIALES-TIPO (ej: 252185A-YURA-S)
    """
    if not cot.id_cliente:
        return ""
    # 1. AÑO (Últimos 2 dígitos)
    year_full = cot.anno or timezone.now().year
    year_str = str(year_full)[-2:]

    # 2. ÁREA
    area_id = cot.id_area
    area_str = str(area_id) if area_id else ""

    # 3. CORRELATIVO (Basado en año + área)
    qs_codigos = (
        Cotizacion.objects
        .filter(anno=year_full, id_area=area_id, codigo__isnull=False)
        .exclude(codigo="")
        .values_list("codigo", flat=True)
    )

    max_corr = 0
    prefix_len = len(year_str) + len(area_str)

    for cod in qs_codigos:
        try:
            # Extraemos los 3 dígitos después del prefijo (año+área)
            # Formato esperado: [YY][Area][000]...
            corr_part = cod[prefix_len : prefix_len + 3]
            max_corr = max(max_corr, int(corr_part))
        except (ValueError, IndexError):
            continue

    correlativo = max_corr + 1
    correlativo_str = str(correlativo).zfill(3)

    # 4. BASE DEL CÓDIGO (YY + Area + Corr)
    base_codigo = f"{year_str}{area_str}{correlativo_str}"

    # 5. VERSIÓN (A, B, C...)
    existentes_mismo_base = (
        Cotizacion.objects
        .filter(codigo__startswith=base_codigo)
        .values_list("codigo", flat=True)
    )

    if not existentes_mismo_base:
        version = "A"
    else:
        # Buscamos la letra después de la base
        letras = []
        for c in existentes_mismo_base:
            if len(c) > len(base_codigo):
                letras.append(c[len(base_codigo)])
        
        if not letras:
            version = "A"
        else:
            idx_max = ascii_uppercase.index(max(letras))
            version = ascii_uppercase[idx_max + 1] if idx_max + 1 < len(ascii_uppercase) else "?"

    # 6. CLIENTE (Iniciales)
    iniciales = "SINC"
    if cot.id_cliente:
        iniciales = cot.id_cliente.iniciales or "SINC"

    # 7. TIPO (ID char de TipoCotizacion)
    tipo_char = "S"
    if cot.id_tipo:
        tipo_char = cot.id_tipo_id # El ID es el char (ej: 'S', 'P')

    # 8. CONSTRUCCIÓN FINAL
    return f"{base_codigo}{version}-{iniciales}-{tipo_char}"

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def generar_codigo_cotizacion(request, id_registro):
    """
    Genera o previsualiza el código único (COTIN) para una cotización.
    Formato: YYAreaCorrVersion-INICIALES-TIPO (ej: 252185A-YURA-S)
    GET:  Retorna una vista previa del código (con soporte para overrides en tiempo real).
    POST: Genera, guarda y retorna el código.
    """
    try:
        if id_registro == 0:
            cot = Cotizacion()
        else:
            cot = Cotizacion.objects.select_related('id_cliente', 'id_tipo').get(id_registro=id_registro)

        # Capturar parámetros de override
        override_area = request.GET.get("id_area") if "id_area" in request.GET else (request.data.get("id_area") if request.data and "id_area" in request.data else None)
        override_tipo = request.GET.get("id_tipo") if "id_tipo" in request.GET else (request.data.get("id_tipo") if request.data and "id_tipo" in request.data else None)
        override_cliente = request.GET.get("id_cliente") if "id_cliente" in request.GET else (request.data.get("id_cliente") if request.data and "id_cliente" in request.data else None)

        has_overrides = (override_area is not None) or (override_tipo is not None) or (override_cliente is not None)

        # Aplicar temporalmente los overrides
        if override_area is not None:
            if override_area in ("", "null", "None"):
                cot.id_area = None
            else:
                try:
                    cot.id_area = int(override_area)
                except (ValueError, TypeError):
                    cot.id_area = None

        if override_tipo is not None:
            if override_tipo in ("", "null", "None"):
                cot.id_tipo = None
            else:
                from core.models import TipoCotizacion
                tipo_obj = TipoCotizacion.objects.filter(id_tipo=override_tipo).first()
                if tipo_obj:
                    cot.id_tipo = tipo_obj
                else:
                    cot.id_tipo = None

        if override_cliente is not None:
            if override_cliente in ("", "null", "None"):
                cot.id_cliente = None
            else:
                from core.models import Cliente
                try:
                    cliente_obj = Cliente.objects.filter(id_cliente=int(override_cliente)).first()
                    cot.id_cliente = cliente_obj
                except (ValueError, TypeError):
                    cot.id_cliente = None

        # Si ya tiene un código guardado y no se ha especificado ningún override, devolvemos el guardado
        if cot.codigo and not has_overrides:
            return Response({
                "ok": True,
                "codigo": cot.codigo,
                "exists": True
            }, status=status.HTTP_200_OK)

        # Calculamos el código dinámico usando el helper
        codigo_final = calcular_codigo_dinamico(cot, cot.codigo)

        # 9. GUARDADO (Solo en POST y si no es un simple preview con overrides)
        if request.method == "POST" and not has_overrides:
            with transaction.atomic():
                cot.codigo = codigo_final
                cot.save(update_fields=["codigo"])
                
                # Registrar hito en seguimiento
                CotizacionSeguimiento.objects.create(
                    id_registro=cot,
                    detalle=f"Se generó el código comercial: {codigo_final}",
                    id_usuario=request.user,
                    activo='1'
                )

        return Response({
            "ok": True,
            "codigo": codigo_final,
            "preview": request.method == "GET" or has_overrides
        }, status=status.HTTP_200_OK)

    except Cotizacion.DoesNotExist:
        return Response({
            "ok": False,
            "error": f"Cotización con ID {id_registro} no encontrada."
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        print(f"Error en generar_codigo_cotizacion:", traceback.format_exc())
        return Response({
            "ok": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def eliminar_cotizacion(request, id_registro):
    try:
        tipo_borrado = request.GET.get("tipo") or (request.data.get("tipo") if hasattr(request, 'data') and isinstance(request.data, dict) else None)

        with transaction.atomic():
            cotizacion = Cotizacion.objects.filter(id_registro=id_registro).first()
            if not cotizacion:
                return Response({"error": "La cotización no existe"}, status=404)

            # CASO 1: APERTURA (Borra solo la apertura y revierte cotización a estado Cotización)
            if tipo_borrado == "apertura":
                CotizacionApertura.objects.filter(id_registro=id_registro).delete()
                cotizacion.id_estado_id = 2  # Pendiente / Cotización
                cotizacion.estado_envio = 1  # Editable
                cotizacion.save()
                return Response({"message": "Apertura eliminada correctamente"}, status=200)

            # CASO 2: COTIZACIÓN (Borra cotización y apertura. Si fue originada de Oportunidad, vuelve a Oportunidad)
            if tipo_borrado == "cotizacion":
                CotizacionApertura.objects.filter(id_registro=id_registro).delete()
                CotizacionSuministro.objects.filter(id_registro=id_registro).delete()
                CotizacionServicio.objects.filter(id_registro=id_registro).delete()
                CotizacionMensaje.objects.filter(id_registro=id_registro).delete()
                CotizacionSeguimiento.objects.filter(id_registro=id_registro).delete()
                CotizacionAdjunto.objects.filter(id_registro=id_registro).delete()
                CotizacionCondicionGeneral.objects.filter(id_registro=id_registro).delete()

                if cotizacion.estado_oportunidad is not None and int(cotizacion.estado_oportunidad) != 0:
                    cotizacion.id_estado_id = 11  # Oportunidad
                    cotizacion.estado_oportunidad = 1  # Pendiente
                    cotizacion.estado_envio = 0
                    cotizacion.save()
                    return Response({"message": "Cotización y apertura eliminadas. El registro retornó a Oportunidad."}, status=200)
                else:
                    cotizacion.delete()
                    return Response({"message": "Cotización y apertura eliminadas correctamente."}, status=200)

            # CASO 3: OPORTUNIDAD (Borra oportunidad, cotización y apertura completamente de la BD)
            import re
            base_log = CotizacionSeguimiento.objects.filter(
                id_registro=id_registro,
                detalle__contains="generada a partir del registro base"
            ).first()

            if base_log:
                match = re.search(r"registro base\s+([A-Za-z0-9\-]+)", base_log.detalle)
                if match:
                    base_codigo = match.group(1).strip()
                    base_cotizacion = Cotizacion.objects.filter(codigo=base_codigo).first()
                    if base_cotizacion:
                        es_version = "Nueva versión" in base_log.detalle
                        tipo_accion = "nueva versión" if es_version else "copia"
                        coti_codigo = cotizacion.codigo or f"REG-{cotizacion.id_registro}"
                        
                        CotizacionSeguimiento.objects.create(
                            id_registro=base_cotizacion,
                            detalle=f"Se eliminó la {tipo_accion} de esta cotización con código {coti_codigo}",
                            id_usuario=request.user if request.user and request.user.is_authenticated else None,
                            activo='1'
                        )

            CotizacionSuministro.objects.filter(id_registro=id_registro).delete()
            CotizacionServicio.objects.filter(id_registro=id_registro).delete()
            CotizacionMensaje.objects.filter(id_registro=id_registro).delete()
            CotizacionSeguimiento.objects.filter(id_registro=id_registro).delete()
            CotizacionAdjunto.objects.filter(id_registro=id_registro).delete()
            CotizacionCondicionGeneral.objects.filter(id_registro=id_registro).delete()
            CotizacionApertura.objects.filter(id_registro=id_registro).delete()

            cotizacion.delete()

        return Response({"message": "Oportunidad, cotización y apertura eliminadas completamente"}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@csrf_exempt
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def enviar_cotizacion_aprobacion(request, id_registro):

    try:
        revert = request.query_params.get("revert", "false").lower() in ["true", "1"]
        with transaction.atomic():
            # Buscamos por la nueva PK: id_registro
            cotizacion = Cotizacion.objects.filter(id_registro=id_registro).first()

            if not cotizacion:
                return Response({"error": "La cotización no existe"}, status=404)

            if revert:
                if cotizacion.estado_envio == 2:
                    cotizacion.estado_envio = 1
                elif cotizacion.estado_envio == 1:
                    return Response(
                        {"error": "La cotización ya está en estado Pendiente de Envío"}, 
                        status=400
                    )
                else:
                    return Response(
                        {"error": f"Estado de envío actual ({cotizacion.estado_envio}) inválido para revertir"}, 
                        status=400
                    )
            else:
                # Control estricto del nuevo flujo simplificado
                if cotizacion.estado_envio == 1:
                    cotizacion.estado_envio = 2
                elif cotizacion.estado_envio == 2:
                    return Response(
                        {"error": "La cotización ya fue enviada al cliente anteriormente"}, 
                        status=400
                    )
                else:
                    # Por si acaso quedó un registro huérfano con valor nulo o inconsistente en la migración
                    return Response(
                        {"error": f"Estado de envío actual ({cotizacion.estado_envio}) inválido para avanzar"}, 
                        status=400
                    )

            # Guardamos explícitamente solo el campo afectado por rendimiento
            cotizacion.save(update_fields=["estado_envio"])

        msg = "Cotización cambiada a Pendiente de Envío exitosamente" if revert else "Cotización enviada al cliente exitosamente"
        return Response(
            {
                "message": msg,
                "nuevo_estado": cotizacion.estado_envio
            }, 
            status=200
        )

    except Exception as e:
        return Response({"error": str(e)}, status=500)




@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def descuento_cotizacion(request, num_reg):

    num_reg = str(num_reg)

    cot = Cotizacion.objects.filter(id_registro=num_reg).first()

    if not cot:
        return Response({}, status=404)

    # ============================
    # 🔹 GET → OBTENER
    # ============================
    if request.method == "GET":

        afecto_map = {
            "T": "t",
            "S": "su",
            "M": "ser",
        }

        return Response({
            "aplicar": bool(cot.descuento_aplica),
            "afecto": afecto_map.get(cot.descuento_afecto, "t"),
            "porcentaje": str(cot.descuento_porcentaje or ""),
            "importe": str(cot.descuento_monto or ""),
        })

    # ============================
    # 🔹 POST → GUARDAR + RECALCULAR TOTAL
    # ============================

    data = request.data

    afecto_reverse = {
        "t": "T",
        "su": "S",
        "ser": "M",
    }

    # ----------------------------
    # 📌 Guardar descuento
    # ----------------------------

    aplicar = bool(data.get("aplicar"))

    afecto_front = data.get("afecto", "t")

    cot.descuento_aplica = 1 if aplicar else 0
    cot.descuento_afecto = afecto_reverse.get(afecto_front, "T")

    cot.descuento_porcentaje = data.get("porcentaje") or None
    cot.descuento_monto = data.get("importe") or None

    # ----------------------------
    # 🔁 RECALCULAR TOTALES
    # ----------------------------

    total_suministros = CotizacionSuministro.objects.filter(
        id_registro=num_reg,
        nivel=0
    ).aggregate(
        total=Coalesce(
            Sum(
                ExpressionWrapper(
                    F("venta_total") * F("cantidad"),
                    output_field=DecimalField(max_digits=18, decimal_places=2),
                )
            ),
            Decimal("0.00")
        )
    )["total"]

    total_servicios = CotizacionServicio.objects.filter(
        id_registro=num_reg,
        nivel=0
    ).aggregate(
        total=Coalesce(
            Sum("cotizado_total"),
            Decimal("0.00")
        )
    )["total"]

    total_general = total_suministros + total_servicios

    # ----------------------------
    # 🔻 Aplicar descuento
    # ----------------------------

    importe_desc = Decimal(str(data.get("importe") or 0))

    if aplicar and importe_desc > 0:

        if afecto_front == "t":
            total_general -= importe_desc

        elif afecto_front == "su":
            total_general = (total_suministros - importe_desc) + total_servicios

        elif afecto_front == "ser":
            total_general = total_suministros + (total_servicios - importe_desc)

    if total_general < 0:
        total_general = Decimal("0.00")

    cot.total_cotizacion = total_general

    # ----------------------------
    # 💾 Guardar todo
    # ----------------------------

    cot.save(update_fields=[
        "total_cotizacion",
        "descuento_aplica",
        "descuento_afecto",
        "descuento_porcentaje",
        "descuento_monto",
    ])

    try:
        u_obj = request.user if (request.user and request.user.is_authenticated) else None
        if aplicar:
            afecto_str = "el TOTAL"
            if afecto_front == "su":
                afecto_str = "SUMINISTROS"
            elif afecto_front == "ser":
                afecto_str = "SERVICIOS"
                
            simbolo_moneda = "S/." if cot.tipo_moneda == "S" else "$"
            try:
                monto_dec = Decimal(str(data.get("importe") or 0))
                monto_str = f"{simbolo_moneda}{monto_dec:,.2f}"
            except Exception:
                monto_str = f"{simbolo_moneda}0.00"
            
            pct_val = data.get("porcentaje")
            
            if pct_val:
                detalle_log = f"DESCUENTOS: Se aplicó un descuento del {pct_val}% ({monto_str}) para {afecto_str}"
            else:
                detalle_log = f"DESCUENTOS: Se aplicó un descuento de {monto_str} para {afecto_str}"
        else:
            detalle_log = "DESCUENTOS: Se desactivó el descuento"

        CotizacionSeguimiento.objects.create(
            id_registro=cot,
            detalle=detalle_log,
            id_usuario=u_obj,
            activo='1'
        )
    except Exception as e:
        print(f"Error registrando seguimiento de descuento: {str(e)}")

    return Response({"ok": True})

def build_cotizacion_pdf_context(num_reg):

    # =========================
    # CABECERA (solo campos usados)
    # =========================
    try:
        cotizacion = (
            Cotizacion.objects
            .select_related(
                "id_cliente",
                "id_representante",
                "id_comercial",
                "id_tecnico",
                "id_unidad_tiempo_entrega_suministros",
                "id_unidad_tiempo_entrega_servicios",
                "id_unidad_tiempo_validez",
            )
            .get(id_registro=num_reg)
        )
    except (Cotizacion.DoesNotExist, ValueError):
        cotizacion = (
            Cotizacion.objects
            .select_related(
                "id_cliente",
                "id_representante",
                "id_comercial",
                "id_tecnico",
                "id_unidad_tiempo_entrega_suministros",
                "id_unidad_tiempo_entrega_servicios",
                "id_unidad_tiempo_validez",
            )
            .filter(codigo=str(num_reg))
            .first()
        )

    if not cotizacion:
        return None

    # =========================
    # BUSCAR NOMBRE DEL CLIENTE (Lógica directa)
    # =========================
    nombre_cliente_final = ""
    if cotizacion.id_cliente:
        nombre_cliente_final = cotizacion.id_cliente.nombre
    else:
        nombre_cliente_final = cotizacion.representante_nombre or ""

    # =========================
    # DETALLES
    # =========================
    suministros_qs = (
        CotizacionSuministro.objects
        .select_related("id_marca", "id_unidad_tiempo_entrega")
        .filter(id_registro=num_reg)
        .order_by("codigo_grupo", "nivel", "orden")
        .iterator()
    )

    servicios_qs = (
        CotizacionServicio.objects
        .select_related("id_area")
        .filter(id_registro=num_reg)
        .order_by("codigo_servicio", "nivel", "orden")
        .iterator()
    )

    # =========
    # FECHA
    # =========
    MESES_ES = {
        1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
        7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic"
    }

    # Se utiliza la fecha de generación del reporte en lugar de la fecha de la cotización
    f = timezone.localtime()
    fecha_formateada = f"{f.day:02d} {MESES_ES[f.month]} {f.year}"
        
    # =========================
    # CABECERA CONTEXT
    # =========================
    cabecera = {
        "numero": cotizacion.codigo,
        "num_reg": cotizacion.id_registro,
        "fecha": fecha_formateada,
        "referencia": cotizacion.referencia,
        "cliente": nombre_cliente_final,
        "atencion": {
            "nombre": cotizacion.representante_nombre,
            "cargo": cotizacion.representante_cargo,
            "telefono": cotizacion.representante_telefono or cotizacion.representante_movil,
            "correo": cotizacion.representante_correo,
        },
        "comercial": {
            "nombre": cotizacion.id_comercial.nombre_completo if cotizacion.id_comercial else "",
            "telefono": cotizacion.id_comercial.telefono if cotizacion.id_comercial else "",
            "movil1": cotizacion.id_comercial.movil_coorporativo if cotizacion.id_comercial else "",
            "movil2": cotizacion.id_comercial.movil_personal if cotizacion.id_comercial else "",
            "movil3": "",
            "correo": cotizacion.id_comercial.correo if cotizacion.id_comercial else "",
        },
        "tecnico": {
            "nombre": cotizacion.id_tecnico.nombre_completo if cotizacion.id_tecnico else "",
            "telefono": cotizacion.id_tecnico.telefono if cotizacion.id_tecnico else "",
            "movil1": cotizacion.id_tecnico.movil_coorporativo if cotizacion.id_tecnico else "",
            "movil2": cotizacion.id_tecnico.movil_personal if cotizacion.id_tecnico else "",
            "movil3": "",
            "correo": cotizacion.id_tecnico.correo if cotizacion.id_tecnico else "",
        },
        "tiempo_entrega": {
            "suministros": {
                "cantidad": cotizacion.entrega_suministros or 0,
                "tipo": cotizacion.id_unidad_tiempo_entrega_suministros.nombre if cotizacion.id_unidad_tiempo_entrega_suministros else "",
            },
            "servicios": {
                "cantidad": cotizacion.entrega_servicios or 0,
                "tipo": cotizacion.id_unidad_tiempo_entrega_servicios.nombre if cotizacion.id_unidad_tiempo_entrega_servicios else "",
            },
        },
        "forma_pago": cotizacion.forma_pago,
        "lugar_entrega": cotizacion.lugar,
        "moneda": "Dólares" if cotizacion.tipo_moneda == "D" else "Soles",
        "moneda_simbolo": "USD" if cotizacion.tipo_moneda == "D" else "PEN",
        "incluye_igv": cotizacion.igv == "S",
        "validez": {
            "cantidad": cotizacion.validez_oferta or 0,
            "tipo": cotizacion.id_unidad_tiempo_validez.nombre if cotizacion.id_unidad_tiempo_validez else "",
        },
    }

    # =========================
    # CONVERSIÓN MONEDA
    # =========================
    def convertir(valor, cotizacion):
        if cotizacion.tipo_moneda == "S" and cotizacion.tipo_cambio:
            return (valor or Decimal("0.00")) * cotizacion.tipo_cambio
        return valor or Decimal("0.00")

    # =========================
    # SUMINISTROS
    # =========================
    grupos = OrderedDict()

    for s in suministros_qs:

        if s.codigo_grupo is None:
            continue

        if s.nivel == 0:

            can = s.cantidad or Decimal("1.00")
            tot = convertir(s.venta_total, cotizacion)

            grupos[s.codigo_grupo] = {
                "cog": s.codigo_grupo,
                "titulo": s.nombre_grupo,
                "mov": s.id_marca.nombre if s.id_marca else "",
                "entrega": s.tiempo_entrega or 0,
                "unidad_entrega": s.id_unidad_tiempo_entrega.nombre if s.id_unidad_tiempo_entrega else "",
                "cantidad": can,
                "total": tot,
                "total_grupo": tot * can,
                "subtotal_pu_items": Decimal("0.00"),
                "subtotal_tot_items": Decimal("0.00"),
                "total_por_grupo": s.total_por_grupo == 1,
                "items": [],
            }

        elif s.nivel == 1 and s.codigo_grupo in grupos:

            pu = convertir(s.precio_venta, cotizacion)
            tot = convertir(s.venta_total, cotizacion)

            entrega_unidad = ""
            if s.id_unidad_tiempo_entrega:
                cod = s.id_unidad_tiempo_entrega.codigo.upper()
                val = s.tiempo_entrega or 0
                if cod.startswith('D'):
                    entrega_unidad = "Días" if val != 1 else "Día"
                elif cod.startswith('S'):
                    entrega_unidad = "Semanas" if val != 1 else "Semana"
                elif cod.startswith('M'):
                    entrega_unidad = "Meses" if val != 1 else "Mes"
                else:
                    entrega_unidad = s.id_unidad_tiempo_entrega.nombre
            else:
                entrega_unidad = ""

            grupos[s.codigo_grupo]["items"].append({
                "codigo": s.codigo_item,
                "descripcion": s.descripcion,
                "unidad": s.tipo_unidad,
                "entrega": s.tiempo_entrega or 0,
                "unidad_entrega": entrega_unidad,
                "cantidad": s.cantidad or 0,
                "precio_unitario": pu,
                "total": tot,
            })

            grupos[s.codigo_grupo]["subtotal_pu_items"] += pu
            grupos[s.codigo_grupo]["subtotal_tot_items"] += tot

    suministros = list(grupos.values())
    total_suministros = sum(
        (g["total_grupo"] for g in suministros),
        Decimal("0.00"),
    )

    # =========================
    # SERVICIOS
    # =========================
    servicios_grupos = OrderedDict()

    for s in servicios_qs:

        if not s.codigo_servicio:
            continue

        if s.nivel == 0:

            can = s.cantidad_hombres or Decimal("1.00")
            tot = convertir(s.cotizado_total, cotizacion)

            servicios_grupos[s.codigo_servicio] = {
                "cog": s.codigo_servicio,
                "titulo": s.nombre_servicio,
                "mov": s.id_area.nombre if s.id_area else "",
                "cantidad": can,
                "total": tot,
                "total_servicio": tot * can,
                "detalle": s.descripcion_servicio or "",
                "subtotal_pu_items": Decimal("0.00"),
                "subtotal_tot_items": Decimal("0.00"),
                "items": [],
            }

        elif s.nivel == 2:
            # Subitems of nivel 2 only
            # Find the matching parent group by prefix (first 2 characters of code)
            prefix = s.codigo_servicio[:2]
            # Find if there is a group whose code starts with this prefix
            matching_parent_code = next((k for k in servicios_grupos.keys() if k.startswith(prefix)), None)
            if matching_parent_code:
                tot = convertir(s.cotizado_total, cotizacion)
                pu = convertir(s.cotizado_hombre_dia or s.costo_hombre_dia, cotizacion)

                servicios_grupos[matching_parent_code]["items"].append({
                    "codigo": s.codigo_item or "",
                    "descripcion": s.descripcion_item or "",
                    "proveedor": "",
                    "unidad": "",
                    "cantidad": s.cantidad_hombres or Decimal("0.00"),
                    "precio_unitario": pu,
                    "total": tot,
                })
                servicios_grupos[matching_parent_code]["subtotal_pu_items"] += pu
                servicios_grupos[matching_parent_code]["subtotal_tot_items"] += tot

    servicios = list(servicios_grupos.values())

    total_servicios = sum(
        (s["total_servicio"] for s in servicios),
        Decimal("0.00"),
    )

    # =========================
    # CONTEXT FINAL
    # =========================
    descuento = convertir(cotizacion.descuento_monto, cotizacion) if cotizacion.descuento_aplica == 1 else Decimal("0.00")
    total_final = convertir(cotizacion.total_cotizacion, cotizacion)

    # =========================
    # ÍNDICE DINÁMICO
    # =========================
    indice = []
    contador = 1

    # 1
    indice.append({
        "numero": contador,
        "titulo": "Presupuesto General"
    })
    contador += 1

    # SUMINISTROS
    for g in suministros:
        indice.append({
            "numero": contador,
            "titulo": f"Detalle Suministro: {g['titulo']}"
        })
        contador += 1

    # SERVICIOS
    for s in servicios:
        indice.append({
            "numero": contador,
            "titulo": f"Detalle Servicio: {s['titulo']}"
        })
        contador += 1

    # CONDICIONES
    indice.append({
        "numero": contador,
        "titulo": "Condiciones Generales y Garantías"
    })

    # =========================
    # NUMERACIÓN DE SECCIONES
    # =========================
    secciones = {
        "presupuesto": 1,
    }

    contador = 1

    # Suministros
    for g in suministros:
        g["seccion"] = contador
        contador += 1

    # Servicios
    for s in servicios:
        s["seccion"] = contador
        contador += 1

    # Condiciones
    secciones["condiciones"] = contador

    # =========================
    # CONDICIONES GENERALES
    # =========================
    condiciones = ""
    condicion_obj = CotizacionCondicionGeneral.objects.filter(id_registro=cotizacion).first()
    if condicion_obj and condicion_obj.descripcion:
        condiciones = condicion_obj.descripcion
    elif cotizacion.condiciones_generales:
        condiciones = cotizacion.condiciones_generales

    return {
        "cabecera": cabecera,
        "suministros": suministros,
        "servicios": servicios,
        "totales": {
            "suministros": total_suministros,
            "servicios": total_servicios,
            "descuento": descuento,
            "total_cotizacion": total_final,
            "moneda": cabecera["moneda"],
            "moneda_simbolo": cabecera["moneda_simbolo"],
            "incluye_igv": cabecera["incluye_igv"],
        },
        "condiciones_generales": {
            "condiciones": condiciones,
        },
        "indice": indice,
        "secciones": secciones,
    }

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cotizacion_pdf_context(request, num_reg):
    context = build_cotizacion_pdf_context(num_reg)

    if not context:
        return Response({"error": "Cotización no existe"}, status=404)

    return Response(context)

@csrf_exempt
@xframe_options_exempt
def cotizacion_pdf_preview(request, num_reg):
    context = build_cotizacion_pdf_context(num_reg)

    if not context:
        return HttpResponse("Cotización no existe", status=404)

    response = render(request, "reportes/cotizacion_pdf.html", context)
    if 'X-Frame-Options' in response:
        del response['X-Frame-Options']
    response['X-Frame-Options'] = 'ALLOWALL'
    return response

@csrf_exempt
@xframe_options_exempt
def cotizacion_reporte_html(request, num_reg):
    context = build_cotizacion_pdf_context(num_reg)

    if not context:
        return HttpResponse("Cotización no existe", status=404)

    response = render(request, "reportes/cotizacion_pdf.html", context)
    if 'X-Frame-Options' in response:
        del response['X-Frame-Options']
    response['X-Frame-Options'] = 'ALLOWALL'
    return response

from html.parser import HTMLParser

class HTMLToRichTextParser(HTMLParser):
    def __init__(self, rt_obj, default_color=None, default_size=None):
        super().__init__()
        self.rt = rt_obj
        self.default_color = default_color
        self.default_size = default_size
        
        self.bold_stack = 0
        self.italic_stack = 0
        self.underline_stack = 0
        self.indent_level = 0
        self.in_list = False
        self.current_style_indent = 0
        self.line_prefix_needed = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        
        if tag in ('strong', 'b'):
            self.bold_stack += 1
        elif tag in ('em', 'i'):
            self.italic_stack += 1
        elif tag in ('u',):
            self.underline_stack += 1
        elif tag in ('ul', 'ol'):
            self.indent_level += 1
            self.in_list = True
        elif tag == 'li':
            # Check for Quill indent classes
            cls = attrs_dict.get('class', '')
            li_indent = 0
            if 'ql-indent-' in cls:
                match = re.search(r'ql-indent-(\d+)', cls)
                if match:
                    li_indent = int(match.group(1))
            
            # Print indent prefix
            level = self.indent_level + li_indent
            prefix = ""
            if level > 1:
                prefix = "    " * (level - 1)
            prefix += " • "
            self.rt.add(prefix, color=self.default_color, size=self.default_size)
            self.line_prefix_needed = False
        elif tag == 'p':
            cls = attrs_dict.get('class', '')
            p_indent = 0
            if 'ql-indent-' in cls:
                match = re.search(r'ql-indent-(\d+)', cls)
                if match:
                    p_indent = int(match.group(1))
            
            style = attrs_dict.get('style', '')
            if 'padding-left' in style or 'margin-left' in style:
                match = re.search(r'(?:padding|margin)-left:\s*(\d+)', style)
                if match:
                    p_indent += max(1, int(match.group(1)) // 30)
            
            if p_indent > 0:
                prefix = "    " * p_indent
                self.rt.add(prefix, color=self.default_color, size=self.default_size)
            self.line_prefix_needed = False
        elif tag == 'br':
            self.rt.add('\n')

    def handle_endtag(self, tag):
        if tag in ('strong', 'b'):
            self.bold_stack = max(0, self.bold_stack - 1)
        elif tag in ('em', 'i'):
            self.italic_stack = max(0, self.italic_stack - 1)
        elif tag in ('u',):
            self.underline_stack = max(0, self.underline_stack - 1)
        elif tag in ('ul', 'ol'):
            self.indent_level = max(0, self.indent_level - 1)
            if self.indent_level == 0:
                self.in_list = False
        elif tag == 'li':
            self.rt.add('\n')
        elif tag == 'p':
            self.rt.add('\n')

    def handle_data(self, data):
        clean_text = data.replace('\r', '').replace('\n', ' ')
        if not clean_text:
            return
            
        self.rt.add(
            clean_text,
            bold=self.bold_stack > 0,
            italic=self.italic_stack > 0,
            underline=self.underline_stack > 0,
            color=self.default_color,
            size=self.default_size
        )

def descargar_cotizacion_word(request, num_reg):
    # Asumimos que build_cotizacion_pdf_context ya trae toda la data necesaria
    context = build_cotizacion_pdf_context(num_reg)
    if not context:
        return HttpResponse("La cotización no existe", status=404)

    # --- PALETA DE COLORES CEBRA ---
    COLOR_GRIS_CLARO = "#FFFFFF"  # Fila A (Grisáceo)
    COLOR_AZUL_SUAVE = "#FEFEFF"  # Fila B (Azulado)
    # ------------------------------

    template_path = os.path.join(settings.BASE_DIR, 'cotizaciones_api', 'templates', 'reportes', 'plantilla_word.docx')
    
    try:
        import zipfile
        import io
        import re

        with open(template_path, 'rb') as f:
            template_bytes = f.read()

        in_memory_zip = io.BytesIO(template_bytes)
        out_memory_zip = io.BytesIO()

        with zipfile.ZipFile(in_memory_zip, 'r') as z_in:
            with zipfile.ZipFile(out_memory_zip, 'w', zipfile.ZIP_DEFLATED) as z_out:
                for item in z_in.infolist():
                    data = z_in.read(item.filename)
                    if item.filename == 'word/document.xml':
                        doc_xml = data.decode('utf-8')
                        
                        # 0. Remove numbering from PRESUPUESTO GENERAL above the table in document XML
                        doc_xml = re.sub(
                            r'\{\{\s*secciones\.presupuesto\s*\}\}(?:<[^>]+>)*\s*\.\-\s*(?:<[^>]+>)*PRESUPUESTO(?:<[^>]+>)*\s*GENERAL',
                            'PRESUPUESTO GENERAL',
                            doc_xml,
                            flags=re.IGNORECASE
                        )

                        # 1. Add DETALLE SUMINISTRO and DETALLE SERVICIO labels based on loop iteration headers
                        def patch_loop_detalle(xml, loop_iterable, replacement_label):
                            pattern = r'\{%\s*for\s+\w+\s+in\s+' + loop_iterable + r'\s*%\}'
                            match = re.search(pattern, xml)
                            if match:
                                start_pos = match.end()
                                # Find the first occurrence of "DETALLE:" after this loop start
                                detalle_match = re.search(r'DETALLE:', xml[start_pos:], re.IGNORECASE)
                                if detalle_match:
                                    pos = start_pos + detalle_match.start()
                                    xml = xml[:pos] + replacement_label + xml[pos + len("DETALLE:"):]
                            return xml

                        doc_xml = patch_loop_detalle(doc_xml, 'suministros', 'DETALLE SUMINISTRO:')
                        doc_xml = patch_loop_detalle(doc_xml, 'servicios', 'DETALLE SERVICIO:')
                        
                        # 2. Wrap discount row in conditional check
                        doc_xml = re.sub(
                            r'<w:tr\b[^>]*>(?:(?!</?w:tr\b).)*DESCUENTO(?:(?!</?w:tr\b).)*</w:tr>',
                            r'{% if totales.descuento and totales.descuento > 0 %}\g<0>{% endif %}',
                            doc_xml,
                            flags=re.DOTALL | re.IGNORECASE
                        )
                        
                        # 3. Wrap item.numero print tags in conditional logic to avoid TypeError with 0/None
                        doc_xml = re.sub(
                            r'\{\{\s*([^}]+?item\.numero[^}]+?)\s*\}\}',
                            r'{% if item.numero %}{{\1}}{% endif %}',
                            doc_xml
                        )
                        
                        data = doc_xml.encode('utf-8')
                    z_out.writestr(item, data)

        out_memory_zip.seek(0)
        doc = DocxTemplate(out_memory_zip)
        moneda = context['totales'].get('moneda', 'Dólares')

        def formatear_moneda(valor):
            simbolo = "$" if moneda == "Dólares" else "S/."
            return f"{simbolo} {valor:,.2f}"
        
        # 0. Inicializamos contador global para alternancia de colores
        fila_idx = 0

        # 1. Procesamiento de suministros
        for g in context.get('suministros', []):
            # Asignación de color para el sombreado de la fila
            g['bg_color'] = COLOR_AZUL_SUAVE if fila_idx % 2 == 0 else COLOR_GRIS_CLARO
            fila_idx += 1
            
            g['total_g_f'] = formatear_moneda(g.get('total_grupo', 0))
            g['subtotal_f'] = formatear_moneda(g.get('subtotal_tot_items', 0))
            g['unitario_f'] = formatear_moneda(g.get('total', 0))
            g['cant_f'] = f"{g.get('cantidad', 0):,.0f}"
            
            g['filas'] = g.get('items', [])
            for item in g['filas']:
                ent_val = item.get('entrega') or 0
                uni_val = item.get('unidad_entrega') or 'Días'
                item['entrega'] = ent_val
                item['unidad_entrega'] = uni_val
                desc = item.get('descripcion', '') or ''
                # Limpieza de HTML básico para descripciones de items
                item['desc_f'] = RichText(desc.replace('<br>', '\n').replace('<br/>', '\n'))
                item['precio_f'] = formatear_moneda(item.get('precio_unitario', 0))
                item['total_f'] = formatear_moneda(item.get('total', 0))
                item['cant_f'] = f"{item.get('cantidad', 0):,.0f}"

        # 2. Procesamiento de servicios
        for s in context.get('servicios', []):
            # Continuamos la alternancia basándonos en el contador global
            s['bg_color'] = COLOR_AZUL_SUAVE if fila_idx % 2 == 0 else COLOR_GRIS_CLARO
            fila_idx += 1
            
            s['total_g_f'] = formatear_moneda(s.get('total_servicio', 0))
            s['unitario_f'] = formatear_moneda(s.get('total', 0))
            s['cant_f'] = f"{s.get('cantidad', 0):,.0f}"
            
            detalle_raw = s.get('detalle', '') or ''
            rt = RichText()
            
            parser = HTMLToRichTextParser(rt)
            parser.feed(unescape(detalle_raw))
            
            s['detalle'] = rt
            s['detalle_f'] = rt

        # 2.5 Procesamiento de Condiciones Generales (Estilo para Cuadro Dinámico)
        cond_raw = context.get('condiciones_generales', {}).get('condiciones', '') or ''
        rt_cond = RichText()

        COLOR_PRO = "444444"
        TAMANO_PRO = 18  # 9pt

        if cond_raw:
            parser = HTMLToRichTextParser(rt_cond, default_color=COLOR_PRO, default_size=TAMANO_PRO)
            parser.feed(unescape(cond_raw))

        context['condiciones_generales']['condiciones'] = rt_cond
        context['condiciones_generales']['texto_f'] = rt_cond

        # 3. Procesamiento de totales finales
        t = context['totales']
        t['desc_f'] = formatear_moneda(t.get('descuento', 0))
        t['total_f'] = formatear_moneda(t.get('total_cotizacion', 0))
        
        # Renderizado único del documento
        doc.render(context)

        # Preparación de la respuesta de descarga
        buffer = io.BytesIO()
        doc.save(buffer)
        content = buffer.getvalue()
        buffer.close()

        # Extraemos cabecera del context para facilitar la lectura
        cabecera = context.get('cabecera', {})
        nro = cabecera.get('numero') or num_reg
        ref = cabecera.get('referencia')

        response = HttpResponse(
            content,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
        # Usamos f-string para armar el nombre dinámico
        response['Content-Disposition'] = f'attachment; filename="{nro}_{ref}.docx"'
        return response

    except Exception as e:
        return HttpResponse(f"Error técnico en el servidor: {str(e)}", status=500) 

@xframe_options_exempt
def cotizacion_pdf(request, num_reg):
    context = build_cotizacion_pdf_context(num_reg)

    if not context:
        return HttpResponse("Cotización no existe", status=404)

    # 📌 Definimos la carpeta base de assets para evitar repetir código
    assets_dir = Path(settings.BASE_DIR) / "frontend" / "src" / "assets"

    # 📌 Rutas de Imágenes Principales
    context["logo_path"] = (assets_dir / "logo.png").as_uri()
    context["header_path"] = (assets_dir / "encabezado-reporte.png").as_uri()

    # 📌 Rutas del Nuevo Pie de Página (Basado en tus archivos)
    context["footer_bg_path"] = (assets_dir / "pie pagina-reporte.png").as_uri()
    context["sgs_path"] = (assets_dir / "sgs.png").as_uri()
    context["homologada_path"] = (assets_dir / "empresa homologada.png").as_uri()
    context["mega_path"] = (assets_dir / "mega.png").as_uri()
    context["correo_path"] = (assets_dir / "correo cormercial.png").as_uri()

    html_string = render_to_string("reportes/cotizacion_pdf.html", context)

    # Generación del PDF
    html = HTML(
        string=html_string, 
        base_url=settings.BASE_DIR.as_uri()
    )

    # Extraemos cabecera del context para facilitar la lectura
    cabecera = context.get('cabecera', {})
    nro = cabecera.get('numero') or num_reg
    ref = cabecera.get('referencia')
    
    response = HttpResponse(content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{nro}_{ref}.pdf"'

    # Nota: Usamos optimización de imágenes para evitar que el PDF pese demasiado
    html.write_pdf(response)
    if 'X-Frame-Options' in response:
        del response['X-Frame-Options']
    response['X-Frame-Options'] = 'ALLOWALL'
    return response

@csrf_exempt
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def asignar_regus(request, num_reg):
    """
    Actualiza los campos 'regus' y 'referencia' de una cotización según num_reg.
    """
    try:
        cotizacion = Cotizacion.objects.get(num_reg=num_reg)
    except Cotizacion.DoesNotExist:
        return Response(
            {"detail": "Cotización no encontrada"},
            status=404
        )

    # Obtener datos del request
    regus = request.data.get("regus")
    referencia = request.data.get("referencia")

    if not regus and not referencia:
        return Response(
            {"detail": "Debe enviar al menos 'regus' o 'referencia' para actualizar"},
            status=400
        )

    campos_a_actualizar = []

    if regus:
        cotizacion.regus = regus
        campos_a_actualizar.append("regus")

    if referencia:
        cotizacion.referencia = referencia
        campos_a_actualizar.append("referencia")

    cotizacion.save(update_fields=campos_a_actualizar)

    return Response(
        {
            "message": "Cotización actualizada correctamente",
            "num_reg": cotizacion.num_reg,
            "regus": cotizacion.regus,
            "referencia": cotizacion.referencia,
        },
        status=200
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_nueva_version_cotizacion(request, id_registro):

    # Esta variable nos dirá exactamente en qué fase del proceso falló la base de datos
    fase_actual = "INICIO"

    try:
        with transaction.atomic():
            fase_actual = "BUSQUEDA_COTIZACION_BASE"
            print(f"🔹 [{fase_actual}] Buscando cotización base ID: {id_registro}")
            base = Cotizacion.objects.filter(id_registro=id_registro).first()
            if not base:
                return Response({
                    "ok": False, 
                    "error": f"La cotización con ID {id_registro} no existe"
                }, status=status.HTTP_404_NOT_FOUND)

            if not base.codigo:
                return Response({
                    "ok": False,
                    "error": "La cotización aún no tiene código principal (COTIN). No se puede generar una nueva versión."
                }, status=status.HTTP_400_BAD_REQUEST)

            fase_actual = "GENERACION_CORRELATIVO"
            print(f"🔹 [{fase_actual}] Generando versión correlativa para: {base.codigo}")
            nuevo_codigo_version = siguiente_version(base.codigo)

            fase_actual = "LECTURA_TOKEN"
            print("🔹 Extrayendo usuario desde el Token JWT")
            jwt_auth = JWTAuthentication()
            header = jwt_auth.get_header(request)
            raw_token = jwt_auth.get_raw_token(header)
            validated_token = jwt_auth.get_validated_token(raw_token)
            usuario_codigo = validated_token.get("user_id")

            fase_actual = "INSERTAR_CABECERA_COTIZACION"
            print(f"🔹 [{fase_actual}] Clonando cabecera principal")
            
            # Para la cabecera limpiamos la PK explícitamente usando diccionarios limpios
            datos_cabecera = {k: v for k, v in base.__dict__.items() if not k.startswith('_')}
            datos_cabecera.pop('id_registro', None) # Forzar AutoIncrement nativo
            
            nueva_coti = Cotizacion(**datos_cabecera)
            nueva_coti.id_registro = obtener_siguiente_num_reg()
            nueva_coti.codigo = nuevo_codigo_version
            nueva_coti.id_estado_id = 2  # Estado inicial: Cotización (Pendiente)
            nueva_coti.estado_oportunidad = 4  # Cotizado
            nueva_coti.envio = 0
            nueva_coti.estado_envio = 1  # Forzar estado a Pendiente de Envío (editable)
            
            # El responsable comercial de la nueva versión cambia al comercial que la está generando
            usuario_generador = Usuario.objects.using("default").filter(usuario=usuario_codigo).first()
            if usuario_generador:
                nueva_coti.id_comercial = usuario_generador
                nueva_coti.id_comercial_id = usuario_generador.id_usuario
            
            nueva_coti.regus = usuario_codigo
            nueva_coti.fecha = now()
            
            try:
                nueva_coti.save()
            except IntegrityError as e:
                raise IntegrityError(f"Error de integridad en el modelo [Cotizacion]: {str(e)}")

            # =====================================================
            # 🔹 1. REPLICAR SUMINISTROS
            # =====================================================
            fase_actual = "INSERTAR_SUMINISTROS"
            print(f"🔹 [{fase_actual}] Procesando ítems...")
            suministros_origen = CotizacionSuministro.objects.filter(id_registro=base.id_registro)
            nuevos_suministros = []

            for s in suministros_origen:
                datos = {k: v for k, v in s.__dict__.items() if not k.startswith('_')}
                # Quitamos cualquier posible nombre de llave primaria
                datos.pop('id_suministro', None)
                datos.pop('id', None)
                datos['id_registro_id'] = nueva_coti.id_registro  # Asociamos al nuevo ID parent
                nuevos_suministros.append(CotizacionSuministro(**datos))

            if nuevos_suministros:
                try:
                    CotizacionSuministro.objects.bulk_create(nuevos_suministros)
                except IntegrityError as e:
                    raise IntegrityError(f"Error de duplicidad en lote del modelo [CotizacionSuministro]: {str(e)}")

            # =====================================================
            # 🔹 2. REPLICAR SERVICIOS
            # =====================================================
            fase_actual = "INSERTAR_SERVICIOS"
            print(f"🔹 [{fase_actual}] Procesando mano de obra/servicios...")
            servicios_origen = CotizacionServicio.objects.filter(id_registro=base.id_registro)
            nuevos_servicios = []

            for s in servicios_origen:
                datos = {k: v for k, v in s.__dict__.items() if not k.startswith('_')}
                datos.pop('id_servicio', None)
                datos.pop('id', None)
                datos['id_registro_id'] = nueva_coti.id_registro
                nuevos_servicios.append(CotizacionServicio(**datos))

            if nuevos_servicios:
                try:
                    CotizacionServicio.objects.bulk_create(nuevos_servicios)
                except IntegrityError as e:
                    raise IntegrityError(f"Error de duplicidad en lote del modelo [CotizacionServicio]: {str(e)}")

            # =====================================================
            # 🔹 3. REPLICAR ADJUNTOS (Corregido con el campo id_adjuntos)
            # =====================================================
            fase_actual = "INSERTAR_ADJUNTOS"
            print(f"🔹 [{fase_actual}] Copiando referencias de archivos...")
            adjuntos_origen = CotizacionAdjunto.objects.filter(id_registro=base.id_registro)
            nuevos_adjuntos = []

            for a in adjuntos_origen:
                datos = {k: v for k, v in a.__dict__.items() if not k.startswith('_')}
                
                # 🌟 AQUÍ ESTABA EL DETALLE: El campo real es en plural 'id_adjuntos'
                datos.pop('id_adjuntos', None) 
                
                datos['id_registro_id'] = nueva_coti.id_registro
                nuevos_adjuntos.append(CotizacionAdjunto(**datos))

            if nuevos_adjuntos:
                try:
                    CotizacionAdjunto.objects.bulk_create(nuevos_adjuntos)
                except IntegrityError as e:
                    raise IntegrityError(f"Error de duplicidad en lote del modelo [CotizacionAdjunto]: {str(e)}")

            # =====================================================
            # 🔹 4. REPLICAR MENSAJES
            # =====================================================
            fase_actual = "INSERTAR_MENSAJES"
            print(f"🔹 [{fase_actual}] Duplicando historial de bitácora...")
            # Mensajes: usar el campo 'fecha' en vez de 'dat'
            mensajes_origen = CotizacionMensaje.objects.filter(id_registro=base.id_registro).order_by("fecha")
            nuevos_mensajes = []
            offset_ms = 0

            for m in mensajes_origen:
                datos = {k: v for k, v in m.__dict__.items() if not k.startswith('_')}
                datos.pop('id_mensaje', None)
                datos.pop('id', None)
                datos['id_registro_id'] = nueva_coti.id_registro
                datos['fecha'] = now() + timedelta(milliseconds=offset_ms)
                nuevos_mensajes.append(CotizacionMensaje(**datos))
                offset_ms += 1

            if nuevos_mensajes:
                try:
                    CotizacionMensaje.objects.bulk_create(nuevos_mensajes)
                except IntegrityError as e:
                    raise IntegrityError(f"Error de duplicidad en lote del modelo [CotizacionMensaje]: {str(e)}")

            # =====================================================
            # 🔹 5. REPLICAR SEGUIMIENTO
            # =====================================================
            fase_actual = "INSERTAR_SEGUIMIENTO"
            print(f"🔹 [{fase_actual}] Replicando hitos...")
            # Seguimiento: usar el campo 'fecha' en vez de 'dat'
            seguimiento_origen = CotizacionSeguimiento.objects.filter(id_registro=base.id_registro).order_by("fecha")
            nuevos_seguimientos = []
            offset_ms = 0

            for seg in seguimiento_origen:
                datos = {k: v for k, v in seg.__dict__.items() if not k.startswith('_')}
                datos.pop('id_seguimiento', None)
                datos.pop('id', None)
                datos['id_registro_id'] = nueva_coti.id_registro
                datos['fecha'] = now() + timedelta(milliseconds=offset_ms)
                nuevos_seguimientos.append(CotizacionSeguimiento(**datos))
                offset_ms += 1

            # Añadimos un hito de auditoría indicando la creación de la nueva versión
            nuevo_hito_auditoria = CotizacionSeguimiento(
                id_registro_id=nueva_coti.id_registro,
                detalle=f"Nueva versión {nueva_coti.codigo} generada a partir del registro base {base.codigo}",
                id_usuario=request.user,
                activo='1'
            )
            nuevos_seguimientos.append(nuevo_hito_auditoria)

            if nuevos_seguimientos:
                try:
                    CotizacionSeguimiento.objects.bulk_create(nuevos_seguimientos)
                except IntegrityError as e:
                    raise IntegrityError(f"Error de duplicidad en lote del modelo [CotizacionSeguimiento]: {str(e)}")



        # Si todo corre perfecto en el bloque atómico:
        return Response({
            "ok": True,
            "message": "Nueva versión comercial creada correctamente.",
            "data": {
                "id_registro_nuevo": nueva_coti.id_registro,
                "codigo_nuevo": nueva_coti.codigo,
                "id_registro_origen": base.id_registro
            }
        }, status=status.HTTP_201_CREATED)

    except IntegrityError as ie:
        print(f"❌ ERR [IntegrityError] en Fase: {fase_actual} -> {str(ie)}")
        return Response({
            "ok": False,
            "error": "Error de restricción o duplicidad en la base de datos.",
            "fase_error": fase_actual,
            "detalle": str(ie)
        }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        print(f"❌ ERR [Exception] en Fase: {fase_actual} -> {str(e)}")
        return Response({
            "ok": False,
            "error": "Error inesperado al procesar la clonación.",
            "fase_error": fase_actual,
            "detalle": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generar_copiar_cotizacion(request, id_registro):
    """
    Crea una copia de la cotización indicada.
    La copia se genera con estado inicial: Borrador (id_estado=2).
    Acepta datos en el body para actualizar en la copia y genera el código COTIN.
    """
    fase_actual = "INICIO"
    try:
        with transaction.atomic():
            fase_actual = "BUSQUEDA_COTIZACION_BASE"
            print(f"🔹 [{fase_actual}] Buscando cotización base ID: {id_registro}")
            base = Cotizacion.objects.filter(id_registro=id_registro).first()
            if not base:
                return Response({
                    "ok": False,
                    "error": f"La cotización con ID {id_registro} no existe"
                }, status=status.HTTP_404_NOT_FOUND)

            fase_actual = "LECTURA_TOKEN"
            print("🔹 Extrayendo usuario desde el Token JWT")
            from rest_framework_simplejwt.authentication import JWTAuthentication
            jwt_auth = JWTAuthentication()
            header = jwt_auth.get_header(request)
            raw_token = jwt_auth.get_raw_token(header)
            validated_token = jwt_auth.get_validated_token(raw_token)
            usuario_codigo = validated_token.get("user_id")

            fase_actual = "INSERTAR_CABECERA_COTIZACION"
            print(f"🔹 [{fase_actual}] Clonando cabecera principal")
            
            # Limpiamos PK y campos específicos
            datos_cabecera = {k: v for k, v in base.__dict__.items() if not k.startswith('_')}
            datos_cabecera.pop('id_registro', None)
            nueva_coti = Cotizacion(**datos_cabecera)
            nueva_coti.id_registro = obtener_siguiente_num_reg()
            nueva_coti.codigo = None # Temporalmente None
            nueva_coti.id_estado_id = 2  # Estado inicial: Cotización (Pendiente)
            nueva_coti.estado_oportunidad = 4  # Cotizado
            nueva_coti.estado_envio = 1
            
            # El responsable comercial de la copia cambia al comercial que la está generando
            usuario_generador = Usuario.objects.using("default").filter(usuario=usuario_codigo).first()
            if usuario_generador:
                nueva_coti.id_comercial = usuario_generador
                nueva_coti.id_comercial_id = usuario_generador.id_usuario
                
            nueva_coti.regus = usuario_codigo
            nueva_coti.fecha = now()

            # Aplicar valores enviados desde el frontend si existen
            nueva_coti.referencia = request.data.get('referencia', nueva_coti.referencia)
            
            # Para los FK, asignamos el ID directamente
            if 'id_area' in request.data:
                nueva_coti.id_area = request.data.get('id_area')
            if 'id_cliente' in request.data:
                nueva_coti.id_cliente_id = request.data.get('id_cliente')
            if 'id_representante' in request.data:
                nueva_coti.id_representante_id = request.data.get('id_representante')
            if 'id_tipo' in request.data:
                nueva_coti.id_tipo_id = request.data.get('id_tipo')
                if nueva_coti.id_tipo_id != "V":
                    nueva_coti.tipo_venta = None
            if 'tipo_venta' in request.data:
                nueva_coti.tipo_venta = request.data.get('tipo_venta')

            # Si no se envió referencia, generamos una por defecto
            if not request.data.get('referencia'):
                if base.referencia:
                    nueva_coti.referencia = f"{base.referencia} - COPIA"
                else:
                    nueva_coti.referencia = f"COPIA DE REGISTRO {id_registro}"
            
            nueva_coti.save()

            # =====================================================
            # 🔹 GENERAR CÓDIGO COMERCIAL AUTOMÁTICO
            # =====================================================
            fase_actual = "GENERAR_CODIGO_AUTOMATICO"
            try:
                codigo_generado = _calcular_nuevo_codigo(nueva_coti)
                nueva_coti.codigo = codigo_generado
                nueva_coti.save(update_fields=["codigo"])
                print(f"🔹 Código generado para la copia: {codigo_generado}")
            except Exception as e:
                print(f"⚠️ No se pudo generar el código automático: {str(e)}")
                raise ValidationError(f"No se pudo generar el código automático. Verifique los datos: {str(e)}")

            # =====================================================
            # 🔹 1. REPLICAR SUMINISTROS
            # =====================================================
            fase_actual = "INSERTAR_SUMINISTROS"
            suministros_origen = CotizacionSuministro.objects.filter(id_registro=base.id_registro).order_by('orden', 'id_suministro')
            nuevos_suministros = []

            for idx, s in enumerate(suministros_origen, 1):
                datos = {k: v for k, v in s.__dict__.items() if not k.startswith('_')}
                datos.pop('id_suministro', None)
                datos.pop('id', None)
                datos['id_registro_id'] = nueva_coti.id_registro
                datos['orden'] = idx
                nuevos_suministros.append(CotizacionSuministro(**datos))

            if nuevos_suministros:
                CotizacionSuministro.objects.bulk_create(nuevos_suministros)

            # =====================================================
            # 🔹 2. REPLICAR SERVICIOS
            # =====================================================
            fase_actual = "INSERTAR_SERVICIOS"
            servicios_origen = CotizacionServicio.objects.filter(id_registro=base.id_registro).order_by('orden', 'id_servicio')
            nuevos_servicios = []

            for idx, s in enumerate(servicios_origen, 1):
                datos = {k: v for k, v in s.__dict__.items() if not k.startswith('_')}
                datos.pop('id_servicio', None)
                datos.pop('id', None)
                datos['id_registro_id'] = nueva_coti.id_registro
                datos['orden'] = idx
                nuevos_servicios.append(CotizacionServicio(**datos))

            if nuevos_servicios:
                CotizacionServicio.objects.bulk_create(nuevos_servicios)

            # =====================================================
            # 🔹 3. REPLICAR ADJUNTOS
            # =====================================================
            fase_actual = "INSERTAR_ADJUNTOS"
            adjuntos_origen = CotizacionAdjunto.objects.filter(id_registro=base.id_registro)
            nuevos_adjuntos = []

            for a in adjuntos_origen:
                datos = {k: v for k, v in a.__dict__.items() if not k.startswith('_')}
                datos.pop('id_adjuntos', None) 
                datos['id_registro_id'] = nueva_coti.id_registro
                nuevos_adjuntos.append(CotizacionAdjunto(**datos))

            if nuevos_adjuntos:
                CotizacionAdjunto.objects.bulk_create(nuevos_adjuntos)

            # =====================================================
            # 🔹 4. REPLICAR MENSAJES
            # =====================================================
            fase_actual = "INSERTAR_MENSAJES"
            mensajes_origen = CotizacionMensaje.objects.filter(id_registro=base.id_registro).order_by("fecha")
            nuevos_mensajes = []
            offset_ms = 0
            for m in mensajes_origen:
                datos = {k: v for k, v in m.__dict__.items() if not k.startswith('_')}
                datos.pop('id_mensaje', None)
                datos.pop('id', None)
                datos['id_registro_id'] = nueva_coti.id_registro
                datos['fecha'] = now() + timedelta(milliseconds=offset_ms)
                nuevos_mensajes.append(CotizacionMensaje(**datos))
                offset_ms += 1

            if nuevos_mensajes:
                CotizacionMensaje.objects.bulk_create(nuevos_mensajes)

            # =====================================================
            # 🔹 5. REPLICAR SEGUIMIENTO
            # =====================================================
            fase_actual = "INSERTAR_SEGUIMIENTO"
            seguimiento_origen = CotizacionSeguimiento.objects.filter(id_registro=base.id_registro).order_by("fecha")
            nuevos_seguimientos = []
            offset_ms = 0
            for seg in seguimiento_origen:
                datos = {k: v for k, v in seg.__dict__.items() if not k.startswith('_')}
                datos.pop('id_seguimiento', None)
                datos.pop('id', None)
                datos['id_registro_id'] = nueva_coti.id_registro
                datos['fecha'] = now() + timedelta(milliseconds=offset_ms)
                nuevos_seguimientos.append(CotizacionSeguimiento(**datos))
                offset_ms += 1

            # Hito de auditoría
            nuevo_hito_auditoria = CotizacionSeguimiento(
                id_registro_id=nueva_coti.id_registro,
                detalle=f"Copia {nueva_coti.codigo or '(Sin Código)'} generada a partir del registro base {base.codigo or '(Sin Código)'}",
                id_usuario=request.user,
                activo='1'
            )
            nuevos_seguimientos.append(nuevo_hito_auditoria)

            if nuevos_seguimientos:
                CotizacionSeguimiento.objects.bulk_create(nuevos_seguimientos)



        return Response({
            "ok": True,
            "message": "Copia de cotización creada correctamente sin COTIN.",
            "data": {
                "id_registro_nuevo": nueva_coti.id_registro,
                "codigo_nuevo": nueva_coti.codigo, # será None
                "id_registro_origen": base.id_registro
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"❌ ERR [generar_copiar_cotizacion] Fase: {fase_actual} -> {str(e)}")
        return Response({
            "ok": False,
            "error": "Error al procesar la copia.",
            "fase_error": fase_actual,
            "detalle": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def cambiar_estado_cotizacion(request, num_reg):
    """
    Cambia el estado de una cotización al estado indicado.
    Ejemplo: 1 → 3, 3 → 2, etc.
    """
    try:
        estado_codigo = request.data.get("id_estado")

        if estado_codigo is None:
            return Response(
                {"error": "Debe enviar estado_codigo"},
                status=400
            )

        with transaction.atomic():
            cotizacion = Cotizacion.objects.filter(num_reg=num_reg).first()

            if not cotizacion:
                return Response(
                    {"error": "La cotización no existe"},
                    status=404
                )

            # Validar que el estado exista y esté activo
            estado = Estado.objects.filter(
                codigo=estado_codigo,
                activo=True
            ).first()

            if not estado:
                return Response(
                    {"error": "Estado inválido o inactivo"},
                    status=400
                )

            cotizacion.estado_codigo = estado.codigo
            cotizacion.save()

        return Response(
            {"message": "Estado de la cotización actualizado correctamente"},
            status=200
        )

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=500
        )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_fijar_cotizacion(request, id_registro):
    try:
        cotizacion = Cotizacion.objects.get(id_registro=id_registro)
        # Toggle between 0 and 1
        cotizacion.fijar = 1 if cotizacion.fijar == 0 else 0
        cotizacion.save(update_fields=['fijar'])
        return Response({
            "ok": True,
            "fijar": cotizacion.fijar,
            "message": "Estado de anclaje actualizado exitosamente"
        })
    except Cotizacion.DoesNotExist:
        return Response({"error": "La cotización/oportunidad no existe"}, status=404)
    except Exception as e:
        return Response({"error": f"Error al anclar registro: {str(e)}"}, status=500)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pasar_a_cotizacion(request, id_registro):
    try:
        with transaction.atomic():
            cotizacion = Cotizacion.objects.filter(id_registro=id_registro).first()
            if not cotizacion:
                return Response({"error": "Registro no encontrado"}, status=404)
            
            # Cambiar estado_oportunidad a 4 (Cotizado) e id_estado a 2 (Pendiente)
            cotizacion.estado_oportunidad = 4
            cotizacion.id_estado_id = 2
            cotizacion.estado_envio = 1
            
            # Registrar fecha de paso a cotización
            hoy = timezone.now()
            cotizacion.fecha = hoy.date()
            cotizacion.emision_cotizacion = hoy.date()
            cotizacion.anno = hoy.year
            cotizacion.mes = hoy.month
            cotizacion.año_apertura = hoy.year
            cotizacion.save()
            
            # Recalcular el código si es necesario
            cotizacion.codigo = calcular_codigo_dinamico(cotizacion, cotizacion.codigo)
            cotizacion.save()
            
            # Registrar en la trazabilidad (Seguimiento)
            CotizacionSeguimiento.objects.create(
                id_registro=cotizacion,
                detalle="Transición: Oportunidad -> Cotización",
                id_usuario=request.user,
                activo='1'
            )
            
        return Response({
            "message": "Pasado a cotización con éxito", 
            "codigo": cotizacion.codigo,
            "id_estado": cotizacion.id_estado_id,
            "estado_oportunidad": cotizacion.estado_oportunidad
        }, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pasar_a_apertura(request, id_registro):
    try:
        with transaction.atomic():
            cotizacion = Cotizacion.objects.filter(id_registro=id_registro).first()
            if not cotizacion:
                return Response({"error": "Cotización no encontrada"}, status=404)
            
            # Validar que exista al menos 1 suministro o 1 servicio
            suministros_count = cotizacion.suministros.count()
            servicios_count = cotizacion.servicios.count()
            if suministros_count == 0 and servicios_count == 0:
                return Response(
                    {"error": "No se puede pasar a apertura una cotización sin suministros ni servicios. Debe agregar al menos uno."},
                    status=400
                )
            
            # Cambiar id_estado a 1 (Adjudicado) y estado_envio a 2 (Congelada/Enviada)
            cotizacion.id_estado_id = 1
            cotizacion.estado_envio = 2
            cotizacion.save()
            
            # Crear la apertura inicial si no existe
            apertura = CotizacionApertura.objects.filter(id_registro=cotizacion).first()
            if not apertura:
                apertura = CotizacionApertura.objects.create(
                    id_registro=cotizacion,
                    anno=timezone.now().year,
                    mes=timezone.now().month,
                    envio=1, # Pendiente
                    prio='0', # Normal
                    total_orden=cotizacion.total_cotizacion or 0,
                    presupuesto=cotizacion.total_cotizacion or 0,
                    responsables=""
                )
            
            # Crear la notificación de Adjudicado para el usuario comercial
            try:
                from notificaciones_api.models import Notificacion
                if cotizacion.id_comercial:
                    Notificacion.objects.create(
                        usuario=cotizacion.id_comercial,
                        tipo="informativo",
                        id_modulo_id=1,
                        titulo="Cotización Adjudicada",
                        descripcion=f"La cotización {cotizacion.codigo or cotizacion.id_registro} ha sido Adjudicada. Se inició la Apertura de orden con presupuesto de S/. {cotizacion.total_cotizacion or 0}.",
                        referencia_id=f"coti_adjudicada_{cotizacion.id_registro}",
                        metadata={"id_registro": cotizacion.id_registro, "codigo": cotizacion.codigo, "tipo_alerta": "cotizacion_adjudicada"}
                    )
            except Exception as notif_err:
                logger.error(f"Error al crear notificacion de adjudicacion: {notif_err}")
            
            # Registrar en la trazabilidad (Seguimiento)
            CotizacionSeguimiento.objects.create(
                id_registro=cotizacion,
                detalle="Transición: Cotización -> Apertura (Adjudicado)",
                id_usuario=request.user,
                activo='1'
            )
                
        return Response({
            "message": "Pasado a apertura con éxito",
            "id_estado": cotizacion.id_estado_id,
            "estado_envio": cotizacion.estado_envio
        }, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def retornar_cotizacion(request, num_reg):
    """
    Retorna una cotización a estado editable.
    Acción: estado_envio = 0
    """

    try:
        with transaction.atomic():
            cotizacion = Cotizacion.objects.filter(id_registro=num_reg).first()

            if not cotizacion:
                return Response(
                    {"error": "La cotización no existe"},
                    status=404
                )

            # 🔒 Opcional: validar que esté enviada
            if cotizacion.estado_envio == 0:
                return Response(
                    {"message": "La cotización ya está en estado editable"},
                    status=200
                )

            cotizacion.estado_envio = 0
            cotizacion.save(update_fields=["estado_envio"])

        return Response(
            {"message": "La cotización fue retornada correctamente"},
            status=200
        )

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=500
        )















# (Las vistas y generadores de notificaciones se trasladaron a la app notificaciones_api)

#========================================================================================

##================##
## DATOS DE BD_VC ##
##================##

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_alm_articulos(request):
    search = request.GET.get("search", "").strip()
    proveedor = request.GET.get("proveedor")  # OTROS | Schneider | LS Industrial Systems
    limit = int(request.GET.get("limit", 15))

    queryset = alm_articulos.objects.all()

    # =========================
    # FILTRO POR PROVEEDOR
    # =========================
    if proveedor == "OTROS":
        queryset = queryset.filter(proveedor__isnull=True)
    elif proveedor:
        queryset = queryset.filter(proveedor__iexact=proveedor)

    # =========================
    # BUSQUEDA
    # =========================
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search)
        )

    queryset = queryset.order_by("nombre")[:limit]

    serializer = AlmArticulosSerializer(queryset, many=True)
    return Response(serializer.data)

# Usuario
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_usuario(request):
    """
    Retorna los datos del usuario autenticado actual.
    """
    try:
        usuario = Usuario.objects.get(usuario=request.user.username)
        serializer = UsuarioSerializer(usuario)
        return Response(serializer.data)
    except Usuario.DoesNotExist:
        return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

# vc_tab_notas
@api_view(["GET", "POST", "PUT"])
@permission_classes([IsAuthenticated])
def lista_notas(request):
    # --- GET: Listar todas las notas ---
    if request.method == "GET":
        try:
            notas = vc_tab_notas.objects.all().order_by("codigo")
            serializer = NotasSerializer(notas, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error_db": str(e)}, status=500)
    
    # --- POST: Crear una nueva nota ---
    elif request.method == "POST":
        serializer = NotasSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # --- PUT: Actualizar nota técnica ---
    elif request.method == "PUT":
        codigo = request.data.get("codigo")
        try:
            nota = vc_tab_notas.objects.get(pk=codigo)
            # partial=True permite actualizar nombre o estado por separado
            serializer = NotasSerializer(nota, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except vc_tab_notas.DoesNotExist:
            return Response(
                {"error": "Nota técnica no encontrada"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
#========================================================================================

##==========##
## REPORTES ##
##==========##
@csrf_exempt
@xframe_options_exempt
def reporte_cotizaciones_dashboard_html(request):
    tipo_reporte = request.GET.get("tipo_reporte", "cotizaciones")  # cotizaciones, oportunidades, aperturas

    # =========================
    # Filtros Comunes
    # =========================
    anno = request.GET.get("anno", date.today().year)
    mes = request.GET.get("mes", "%")
    anno_desde = request.GET.get("anno_desde")
    anno_hasta = request.GET.get("anno_hasta")
    mes_desde = request.GET.get("mes_desde")
    mes_hasta = request.GET.get("mes_hasta")
    id_cliente = request.GET.get("cliente", "%")
    envio = request.GET.get("envio", "%")
    campo = request.GET.get("campo")
    valor = request.GET.get("valor")
    fecha_inicio = request.GET.get("fechaInicio")
    fecha_fin = request.GET.get("fechaFin")

    # Mapeo de búsqueda flexible general
    CAMPOS_BUSQUEDA = {
        "id_registro": "id_registro",
        "codigo": "codigo",
        "fecha": "fecha",
        "cliente_nombre": "id_cliente__nombre",
        "referencia": "referencia",
        "representante": "representante_nombre",
        "total": "total_cotizacion",
        "probabilidad": "probabilidad",
    }

    AREA_MAP = {
        1: "Industria",
        2: "Minería",
        3: "Mantenimiento",
        4: "Petroquímica",
        8: "Seguridad de Maquinaria",
    }

    resultados = []
    total_general = Decimal("0.00")

    if tipo_reporte == "aperturas":
        # ==========================================
        # Flujo: APERTURAS
        # ==========================================
        id_estado_orden = request.GET.get("estado_orden", "%")
        prio = request.GET.get("prio", "%")

        qs = CotizacionApertura.objects.select_related(
            'id_registro', 'id_registro__id_cliente', 'id_registro__id_estado'
        )

        if anno_desde and anno_hasta and mes_desde and mes_hasta:
            try:
                periodo_min = int(anno_desde) * 100 + int(mes_desde)
                periodo_max = int(anno_hasta) * 100 + int(mes_hasta)
                qs = qs.filter(anno__isnull=False, mes__isnull=False).annotate(
                    periodo_operativo=ExpressionWrapper(
                        F('anno') * 100 + F('mes'),
                        output_field=IntegerField()
                    )
                ).filter(periodo_operativo__gte=periodo_min, periodo_operativo__lte=periodo_max)
            except (ValueError, TypeError):
                pass
        else:
            if anno and anno != "%":
                qs = qs.filter(anno=int(anno))
            if mes and mes != "%":
                qs = qs.filter(mes=int(mes))

        if id_cliente and id_cliente != "%":
            qs = qs.filter(id_registro__id_cliente_id=id_cliente)
        if id_estado_orden and id_estado_orden != "%":
            qs = qs.filter(estado_orden=int(id_estado_orden))
        if prio and prio != "%":
            qs = qs.filter(prio=str(prio))
        if envio and envio != "%":
            qs = qs.filter(envio=int(envio))

        if fecha_inicio:
            qs = qs.filter(fecha_orden__gte=fecha_inicio)
        if fecha_fin:
            qs = qs.filter(fecha_orden__lte=fecha_fin)

        if campo and valor not in (None, "", " "):
            CAMPOS_BUSQUEDA_APERTURA = {
                "id_apertura": "id_apertura",
                "numero_orden": "numero_orden",
                "cotizacion_codigo": "id_registro__codigo",
                "cliente_nombre": "id_registro__id_cliente__nombre",
                "referencia": "id_registro__referencia",
                "total_orden": "total_orden",
            }
            if campo == "all":
                from django.db.models import Q
                valor_clean = valor.lower().strip()
                qs = qs.filter(
                    Q(numero_orden__icontains=valor_clean) |
                    Q(id_registro__codigo__icontains=valor_clean) |
                    Q(id_registro__id_cliente__nombre__icontains=valor_clean) |
                    Q(id_registro__referencia__icontains=valor_clean)
                )
            else:
                campo_real = CAMPOS_BUSQUEDA_APERTURA.get(campo)
                if campo_real:
                    qs = qs.filter(**{f"{campo_real}__icontains": valor})

        # Agrupación por área de la cotización asociada
        data = (
            qs.values("id_registro__id_area")
            .annotate(
                cantidad=Count("id_apertura"),
                importe=Sum("total_orden")
            )
            .order_by("id_registro__id_area")
        )

        for row in data:
            id_area_val = row["id_registro__id_area"]
            importe = row["importe"] or Decimal("0.00")
            total_general += importe
            
            try:
                area_key = int(id_area_val) if id_area_val is not None else None
            except (ValueError, TypeError):
                area_key = id_area_val

            resultados.append({
                "area": AREA_MAP.get(area_key, "Sin Área"),
                "cantidad": row["cantidad"],
                "importe": round(importe, 2),
            })

        titulo = "Reporte de Aperturas"
        tipo_registro_label = "APERTURAS"

    else:
        # ==========================================
        # Flujo: COTIZACIONES / OPORTUNIDADES
        # ==========================================
        comercial_search = request.GET.get("comercial_search", "%")
        tecnico_search = request.GET.get("tecnico_search", "%")
        id_probabilidad = request.GET.get("probabilidad", "%")
        id_estado = request.GET.get("estado", "%")
        id_area = request.GET.get("area", "%")
        id_representante = request.GET.get("id_representante")

        if tipo_reporte == "oportunidades":
            estado_oportunidad = request.GET.get("estado_oportunidad", "%")
            qs = Cotizacion.objects.select_related(
                'id_cliente', 'id_estado', 'id_comercial', 'id_tecnico', 'id_tipo'
            ).filter(recepcion_solicitud__isnull=False)
            
            if estado_oportunidad and estado_oportunidad != "%":
                qs = qs.filter(estado_oportunidad=int(estado_oportunidad))
            
            titulo = "Reporte de Oportunidades"
            tipo_registro_label = "OPORTUNIDADES"
        else:
            qs = Cotizacion.objects.select_related(
                'id_cliente', 'id_estado', 'id_comercial', 'id_tecnico', 'id_tipo'
            ).exclude(id_estado=11)
            
            titulo = "Reporte de Cotizaciones"
            tipo_registro_label = "COTIZACIONES"

        # Aplicar filtros de periodos
        if anno_desde and anno_hasta and mes_desde and mes_hasta:
            try:
                periodo_min = int(anno_desde) * 100 + int(mes_desde)
                periodo_max = int(anno_hasta) * 100 + int(mes_hasta)
                qs = qs.filter(año_apertura__isnull=False, mes__isnull=False).annotate(
                    periodo_operativo=ExpressionWrapper(
                        F('año_apertura') * 100 + F('mes'),
                        output_field=IntegerField()
                    )
                ).filter(periodo_operativo__gte=periodo_min, periodo_operativo__lte=periodo_max)
            except (ValueError, TypeError):
                pass
        else:
            if anno and anno != "%":
                qs = qs.filter(año_apertura=int(anno))
            if mes and mes != "%":
                qs = qs.filter(mes=int(mes))

        if id_probabilidad and id_probabilidad != "%":
            qs = qs.filter(probabilidad=int(id_probabilidad))
        if id_cliente and id_cliente != "%":
            qs = qs.filter(id_cliente=id_cliente)
        if id_representante:
            qs = qs.filter(id_representante=id_representante)
        if id_area and id_area != "%":
            qs = qs.filter(id_area=id_area)
        if envio and envio != "%":
            qs = qs.filter(estado_envio=envio)

        if id_estado and id_estado != "%":
            estados = [e.strip() for e in id_estado.split(",") if e]
            if estados:
                if estados[0].isdigit():
                    qs = qs.filter(id_estado__in=[int(e) for e in estados]) if len(estados) > 1 else qs.filter(id_estado=int(estados[0]))
                else:
                    qs = qs.filter(id_estado__nombre__iexact=estados[0]) if len(estados) == 1 else qs.filter(id_estado__nombre__in=estados)

        if comercial_search and comercial_search != "%":
            qs = qs.filter(id_comercial__nombre_completo__icontains=comercial_search)
        if tecnico_search and tecnico_search != "%":
            qs = qs.filter(id_tecnico__nombre_completo__icontains=tecnico_search)

        if fecha_inicio:
            if tipo_reporte == "oportunidades":
                qs = qs.filter(recepcion_solicitud__gte=fecha_inicio)
            else:
                qs = qs.filter(fecha__gte=fecha_inicio)
        if fecha_fin:
            if tipo_reporte == "oportunidades":
                qs = qs.filter(recepcion_solicitud__lte=fecha_fin)
            else:
                qs = qs.filter(fecha__lte=fecha_fin)

        if campo and valor not in (None, "", " "):
            if campo == "all":
                from django.db.models import Q
                from datetime import datetime
                valor_clean = valor.lower().strip()
                
                q_envio = Q()
                if "enviado" in valor_clean:
                    q_envio = Q(estado_envio=2)
                elif "pendiente" in valor_clean:
                    q_envio = Q(estado_envio=1)
                
                area_keys = [k for k, v in AREA_MAP.items() if valor_clean in v.lower()]
                q_area = Q(id_area__in=area_keys) if area_keys else Q()
                
                q_numero = Q()
                try:
                    clean_num_str = valor_clean.replace("$", "").replace(",", "").strip()
                    val_num = float(clean_num_str)
                    q_numero = Q(total_cotizacion=val_num) | Q(id_registro=int(val_num) if val_num.is_integer() else 0)
                except ValueError:
                    pass

                q_fecha = Q()
                for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
                    try:
                        parsed_date = datetime.strptime(valor_clean, fmt).date()
                        q_fecha = Q(fecha=parsed_date)
                        break
                    except ValueError:
                        pass
                
                if valor_clean.isdigit() and len(valor_clean) == 4:
                    q_fecha = q_fecha | Q(fecha__year=int(valor_clean))

                qs = qs.filter(
                    Q(codigo__icontains=valor_clean) |
                    Q(referencia__icontains=valor_clean) |
                    Q(id_cliente__nombre__icontains=valor_clean) |
                    Q(representante_nombre__icontains=valor_clean) |
                    Q(id_estado__nombre__icontains=valor_clean) |
                    q_envio |
                    q_area |
                    q_numero |
                    q_fecha
                )
            else:
                campo_real = CAMPOS_BUSQUEDA.get(campo)
                if campo_real:
                    qs = qs.filter(**{f"{campo_real}__icontains": valor})

        # Agrupación por área
        data = (
            qs.values("id_area")
            .annotate(
                cantidad=Count("id_registro"),
                importe=Sum("total_cotizacion")
            )
            .order_by("id_area")
        )

        for row in data:
            id_area_val = row["id_area"]
            importe = row["importe"] or Decimal("0.00")
            total_general += importe
            
            try:
                area_key = int(id_area_val) if id_area_val is not None else None
            except (ValueError, TypeError):
                area_key = id_area_val

            resultados.append({
                "area": AREA_MAP.get(area_key, "Sin Área"),
                "cantidad": row["cantidad"],
                "importe": round(importe, 2),
            })

    context = {
        "resultados": resultados,
        "total_general": round(total_general, 2),
        "titulo": titulo,
        "tipo_registro_label": tipo_registro_label,
        "filtros": {
            "anno": anno,
            "mes": mes,
            "cliente": id_cliente,
            "campo": campo,
            "valor": valor,
        }
    }

    response = render(request, "reportes/reporte_cotizaciones_dashboard.html", context)
    if 'X-Frame-Options' in response:
        del response['X-Frame-Options']
    response['X-Frame-Options'] = 'ALLOWALL'
    return response

@csrf_exempt
@xframe_options_exempt
def reporte_suministros_html(request, id_registro):
    try:
        cotizacion = Cotizacion.objects.get(id_registro=id_registro)
    except (Cotizacion.DoesNotExist, ValueError):
        cotizacion = get_object_or_404(Cotizacion, codigo=str(id_registro))

    # Filtramos usando el campo id_registro de la cotización encontrada
    suministros = (
        CotizacionSuministro.objects
        .filter(id_registro=cotizacion.id_registro)
        .order_by("codigo_grupo", "nivel", "orden")
    )

    if not suministros.exists():
        return HttpResponse(
            "No existen suministros para esta cotización",
            status=404
        )

    grupos = OrderedDict()

    # ==========================================
    # ÚTIL: PARSE CODIGO GRUPO (Homologado)
    # ==========================================
    def parse_codigo_grupo(cod_grupo):
        cod_str = str(cod_grupo).zfill(4)
        tipo_code = cod_str[2:]  # 01 = EQUIPOS, 02 = MATERIALES

        return {
            "01": "EQUIPOS",
            "02": "MATERIALES",
        }.get(tipo_code, "OTROS")

    # ==========================================
    # AGRUPAR POR NUEVO CAMPO: codigo_grupo
    # ==========================================
    tipo_moneda = cotizacion.tipo_moneda
    tipo_cambio = cotizacion.tipo_cambio or Decimal("1.00")
    factor = tipo_cambio if tipo_moneda == "S" else Decimal("1.00")
    moneda_simbolo = "S/." if tipo_moneda == "S" else "$"

    for row in suministros:
        c_grupo = row.codigo_grupo

        if c_grupo not in grupos:
            grupos[c_grupo] = {
                "tipo": parse_codigo_grupo(c_grupo),
                "titulo": "",
                "items": []
            }

        # CABECERA DEL GRUPO (nivel == 0)
        if row.nivel == 0:
            grupos[c_grupo]["titulo"] = row.nombre_grupo or ""

        # ÍTEMS ASOCIADOS AL GRUPO (nivel > 0)
        elif row.nivel > 0:
            utilidad_total = (row.utilidad or Decimal("0")) * (row.cantidad or Decimal("0"))

            grupos[c_grupo]["items"].append({
                "item": len(grupos[c_grupo]["items"]) + 1,
                "cod": row.codigo_item,
                "des": row.descripcion,
                "pro": row.proveedor,
                "can": int(row.cantidad or 0),
                "val": round((row.costo_precio or Decimal("0")) * factor, 2),   # Costo Unitario
                "tot": round((row.costo_total or Decimal("0")) * factor, 2),    # Costo Total Neto
                "puc": round((row.precio_venta or Decimal("0")) * factor, 2),   # Precio Venta Unitario
                "toc": round((row.venta_total or Decimal("0")) * factor, 2),    # Venta Total
                "utilidad": round(utilidad_total * factor, 2),
            })

    context = {
        "id_registro": id_registro,  # <--- Alineado con el nuevo parámetro
        "grupos": grupos,
        "moneda": moneda_simbolo,
    }

    # 1. Generamos la respuesta del renderizado
    response = render(
        request,
        "reportes/reporte_suministros.html",
        context
    )
    
    # 2. Eliminamos explícitamente cualquier restricción de Frame para esta vista
    if 'X-Frame-Options' in response:
        del response['X-Frame-Options']
        
    # Alternativa ultra segura para navegadores modernos en entornos locales cruzados:
    response['X-Frame-Options'] = 'ALLOWALL' 
    
    return response
 
@csrf_exempt
@xframe_options_exempt
def reporte_servicios_html(request, id_registro):
    try:
        cotizacion = Cotizacion.objects.get(id_registro=id_registro)
    except (Cotizacion.DoesNotExist, ValueError):
        cotizacion = get_object_or_404(Cotizacion, codigo=str(id_registro))

    # 1. Filtramos usando la nueva relación id_registro de la cotización encontrada
    servicios = (
        CotizacionServicio.objects
        .filter(id_registro=cotizacion.id_registro)
        .order_by("codigo_servicio", "nivel", "orden")
    )

    if not servicios.exists():
        return HttpResponse(
            "No existen servicios para esta cotización",
            status=404
        )

    grupos = OrderedDict()

    # ==========================================
    # AGRUPAR POR GRUPO (SERVICIO) Y SUBGRUPO
    # ==========================================
    tipo_moneda = cotizacion.tipo_moneda
    tipo_cambio = cotizacion.tipo_cambio or Decimal("1.00")
    factor = tipo_cambio if tipo_moneda == "S" else Decimal("1.00")
    moneda_simbolo = "S/." if tipo_moneda == "S" else "$"

    for row in servicios:
        # Usamos codigo_servicio como clave de grupo principal (equivalente al antiguo cog)
        c_servicio_key = row.codigo_servicio or "SIN_CODIGO"

        # --- NIVEL 0: Grupo Principal (Datos del Servicio) ---
        if row.nivel == 0:
            grupos[c_servicio_key] = {
                "titulo": row.nombre_servicio or "",
                "subgrupos": OrderedDict(),
                "total_val": Decimal("0.00"),       # Costo Hombre Día
                "total_tot": Decimal("0.00"),       # Costo Total
                "total_puc": Decimal("0.00"),       # Cotizado Hombre Día
                "total_toc": Decimal("0.00"),       # Cotizado Total
                "total_utilidad": Decimal("0.00"),
            }

        # --- NIVEL 1: Subgrupo (Tipo Gasto / Categoría) ---
        elif row.nivel == 1:
            # Intentamos resolver el nombre a través de la relación id_tipo_gasto si existe
            if row.id_tipo_gasto:
                tipo = str(row.id_tipo_gasto.nombre).upper() # Asegura compatibilidad con tu HTML (MANO DE OBRA, etc.)
            else:
                tipo = "OTROS"

            # Validamos que exista un grupo principal contenedor por seguridad
            if not grupos:
                continue
                
            ultimo_grupo_key = list(grupos.keys())[-1]
            grupos[ultimo_grupo_key]["subgrupos"][c_servicio_key] = {
                "tipo": tipo,
                "items": [],
                "sub_total_val": Decimal("0.00"),
                "sub_total_tot": Decimal("0.00"),
                "sub_total_puc": Decimal("0.00"),
                "sub_total_toc": Decimal("0.00"),
                "sub_total_utilidad": Decimal("0.00"),
            }

        # --- NIVEL 2: Ítems del Subgrupo ---
        elif row.nivel == 2:
            if not grupos:
                continue
            
            ultimo_grupo_key = list(grupos.keys())[-1]
            if not grupos[ultimo_grupo_key]["subgrupos"]:
                continue
                
            ultimo_subgrupo_key = list(grupos[ultimo_grupo_key]["subgrupos"].keys())[-1]

            # El cálculo de utilidad usa los nuevos nombres de campos monetarios
            # Utilidad total = utilidad unitaria * cantidad de dias (siguiendo tu lógica previa)
            utilidad_total = (row.utilidad or Decimal("0")) * (row.cantidad_dias or Decimal("0"))

            item_data = {
                "item": len(grupos[ultimo_grupo_key]["subgrupos"][ultimo_subgrupo_key]["items"]) + 1,
                "cod": row.codigo_item,
                "des": row.descripcion_item,
                "pro": f"{row.cantidad_hombres or 0} Pers. / {row.horas or 0} Hrs.", # Armamos el formato para la columna prov/obs
                "can": int(row.cantidad_hombres or 0),
                "dias": int(row.cantidad_dias or 0),
                "val": round((row.costo_hombre_dia or Decimal("0")) * factor, 2),   # Costo unitario por día
                "tot": round((row.costo_total or Decimal("0")) * factor, 2),        # Costo Total Neto
                "puc": round((row.cotizado_hombre_dia or Decimal("0")) * factor, 2),# Precio Venta Unitario por día
                "toc": round((row.cotizado_total or Decimal("0")) * factor, 2),     # Venta Total
                "utilidad": round(utilidad_total * factor, 2),
            }

            # Guardar ítem en la estructura
            grupos[ultimo_grupo_key]["subgrupos"][ultimo_subgrupo_key]["items"].append(item_data)

            # Acumular sumatorias en el Subgrupo
            sg = grupos[ultimo_grupo_key]["subgrupos"][ultimo_subgrupo_key]
            sg["sub_total_val"] += Decimal(str(item_data["val"]))
            sg["sub_total_tot"] += Decimal(str(item_data["tot"]))
            sg["sub_total_puc"] += Decimal(str(item_data["puc"]))
            sg["sub_total_toc"] += Decimal(str(item_data["toc"]))
            sg["sub_total_utilidad"] += Decimal(str(item_data["utilidad"]))

            # Acumular sumatorias en el Grupo Principal
            g = grupos[ultimo_grupo_key]
            g["total_val"] += Decimal(str(item_data["val"]))
            g["total_tot"] += Decimal(str(item_data["tot"]))
            g["total_puc"] += Decimal(str(item_data["puc"]))
            g["total_toc"] += Decimal(str(item_data["toc"]))
            g["total_utilidad"] += Decimal(str(item_data["utilidad"]))

    # Ajustado al nuevo parámetro id_registro para que el HTML renderice el título
    context = {
        "num_reg": id_registro,
        "grupos": grupos,
        "moneda": moneda_simbolo
    }

    # 2. Renderizado e inyección manual de cabeceras de bypass de Iframe
    response = render(
        request,
        "reportes/reporte_servicios.html",
        context
    )
    
    if 'X-Frame-Options' in response:
        del response['X-Frame-Options']
        
    response['X-Frame-Options'] = 'ALLOWALL'
    
    return response

from django.db import connection

def sp_select_tabla_call(num_reg, area, tipo):
    with connection.cursor() as cursor:
        cursor.execute("CALL sp_select_tabla(%s, %s, %s)", [num_reg, area, tipo])
        row = cursor.fetchone()
        if row and row[0]:
            try:
                costo_str, ganancia_str = row[0].split("-")
                return Decimal(costo_str), Decimal(ganancia_str)
            except Exception:
                # Si el formato no es el esperado
                return Decimal("0"), Decimal("0")
        # Si no hay fila o es None
        return Decimal("0"), Decimal("0")

def sumatoria_costos(queryset):

    total_expr = ExpressionWrapper(
        F("tot") * F("can"),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )

    agg = queryset.aggregate(
        costo=Coalesce(Sum("toc"), Decimal("0")),
        total=Coalesce(Sum(total_expr), Decimal("0")),
    )

    ganancia = agg["total"] - agg["costo"]

    return agg["costo"], ganancia

@csrf_exempt
@xframe_options_exempt
def reporte_detallado_cotizacion(request, id_registro):
    # 1. Obtener la cotización principal usando el nuevo ID secuencial o el código fallback
    try:
        cotizacion = Cotizacion.objects.get(id_registro=id_registro)
    except (Cotizacion.DoesNotExist, ValueError):
        cotizacion = get_object_or_404(Cotizacion, codigo=str(id_registro))
        
    id_registro = cotizacion.id_registro
    id_area_cotizacion = cotizacion.id_area  # Área de la cotización para segmentar HH

    # Obtener diccionarios de cantidades
    # Para Suministros (código_grupo -> cantidad)
    cantidades_suministros = dict(
        CotizacionSuministro.objects.filter(
            id_registro_id=id_registro,
            nivel=0
        ).values_list("codigo_grupo", "cantidad")
    )

    # Para Servicios (prefijo de código_servicio -> cantidad_hombres)
    servicios_nivel0 = CotizacionServicio.objects.filter(
        id_registro_id=id_registro,
        nivel=0
    ).values_list("codigo_servicio", "cantidad_hombres")
    
    cantidades_servicios = {}
    for cod, cant in servicios_nivel0:
        if cod and len(cod) >= 2:
            prefijo = cod[:2]
            cantidades_servicios[prefijo] = cant or 1

    # ==========================================================
    # SUMINISTROS (Suministros con nivel=1 donde el TipoGasto sea Equipos o Materiales)
    # ==========================================================
    qs_suministros = CotizacionSuministro.objects.filter(
        id_registro_id=id_registro,
        nivel=1,
        id_tipo_gasto_id__in=[1, 2]
    )

    costo_suministros = Decimal("0.00")
    total_suministros = Decimal("0.00")
    for item in qs_suministros:
        cant_grupo = Decimal(str(cantidades_suministros.get(item.codigo_grupo, 1) or 1))
        costo_suministros += (item.costo_total or Decimal("0.00")) * cant_grupo
        total_suministros += (item.venta_total or Decimal("0.00")) * cant_grupo

    # ==========================================================
    # HH PROPIOS (Servicios nivel=2 pertenecientes al área de la cotización)
    # ==========================================================
    qs_hh_propios = CotizacionServicio.objects.filter(
        id_registro_id=id_registro,
        nivel=2,
        id_tipo_gasto_id=3,
    )

    costo_hh_propios = Decimal("0.00")
    total_hh_propios = Decimal("0.00")
    
    for item in qs_hh_propios:
        prefijo = (item.codigo_servicio or "")[:2]
        cant_grupo = Decimal(str(cantidades_servicios.get(prefijo, 1) or 1))
        
        costo_hh_propios += (item.costo_total or Decimal("0.00")) * cant_grupo
        total_hh_propios += (item.cotizado_total or Decimal("0.00")) * cant_grupo

    # ==========================================================
    # COSTO SERVICIOS / SUBCONTRATOS (Tipo Gasto Servicios/Subcontratos)
    # ==========================================================
    qs_servicios = CotizacionServicio.objects.filter(
        id_registro_id=id_registro,
        nivel=2,
        id_tipo_gasto_id=4
    )
    
    costo_servicios = Decimal("0.00")
    total_servicios = Decimal("0.00")
    
    for item in qs_servicios:
        prefijo = (item.codigo_servicio or "")[:2]
        cant_grupo = Decimal(str(cantidades_servicios.get(prefijo, 1) or 1))
        
        costo_servicios += (item.costo_total or Decimal("0.00")) * cant_grupo
        total_servicios += (item.cotizado_total or Decimal("0.00")) * cant_grupo

    # ==========================================================
    # GASTOS ENTREGA / LOGÍSTICA (En pausa - Lógica por definir)
    # ==========================================================
    costo_gastos_entrega = Decimal("0.00")
    total_gastos_entrega = Decimal("0.00")

    # ==========================================================
    # IMPREVISTOS
    # ==========================================================
    qs_imprevistos = CotizacionServicio.objects.filter(
        id_registro_id=id_registro,
        nivel=2,
        id_tipo_gasto_id=5
    )
    
    costo_imprevistos = Decimal("0.00")
    total_imprevistos = Decimal("0.00")
    
    for item in qs_imprevistos:
        prefijo = (item.codigo_servicio or "")[:2]
        cant_grupo = Decimal(str(cantidades_servicios.get(prefijo, 1) or 1))
        
        costo_imprevistos += (item.costo_total or Decimal("0.00")) * cant_grupo
        total_imprevistos += (item.cotizado_total or Decimal("0.00")) * cant_grupo

    # ==========================================================
    # DESCUENTOS (Usa las nuevas propiedades de la Cabecera)
    # ==========================================================
    costo_descuento = Decimal("0.00")
    total_descuento = Decimal("0.00")
    
    if cotizacion.descuento_aplica == 1:
        costo_descuento = cotizacion.descuento_monto or Decimal("0.00")
        total_descuento = -costo_descuento

    # ==========================================================
    # APLICACIÓN DE MONEDA / TIPO CAMBIO
    # ==========================================================
    tipo_moneda = cotizacion.tipo_moneda
    tipo_cambio = cotizacion.tipo_cambio or Decimal("1.00")
    factor = tipo_cambio if tipo_moneda == "S" else Decimal("1.00")
    moneda_simbolo = "S/." if tipo_moneda == "S" else "$"

    costo_suministros = round(costo_suministros * factor, 2)
    total_suministros = round(total_suministros * factor, 2)
    ganancia_suministros = total_suministros - costo_suministros

    costo_hh_propios = round(costo_hh_propios * factor, 2)
    total_hh_propios = round(total_hh_propios * factor, 2)
    ganancia_hh_propios = total_hh_propios - costo_hh_propios

    costo_servicios = round(costo_servicios * factor, 2)
    total_servicios = round(total_servicios * factor, 2)
    ganancia_servicios = total_servicios - costo_servicios

    costo_gastos_entrega = round(costo_gastos_entrega * factor, 2)
    total_gastos_entrega = round(total_gastos_entrega * factor, 2)
    ganancia_gastos_entrega = total_gastos_entrega - costo_gastos_entrega

    costo_imprevistos = round(costo_imprevistos * factor, 2)
    total_imprevistos = round(total_imprevistos * factor, 2)
    ganancia_imprevistos = total_imprevistos - costo_imprevistos

    costo_descuento = round(costo_descuento * factor, 2)
    total_descuento = round(total_descuento * factor, 2)
    ganancia_descuento = Decimal("0.00")

    # ==========================================================
    # CONSTRUCCIÓN DE LA TABLA FINAL
    # ==========================================================
    datos = [
        {"concepto": "SUMINISTROS", "costo": costo_suministros, "ganancia": ganancia_suministros, "total": total_suministros},
        {"concepto": "HH PROPIOS", "costo": costo_hh_propios, "ganancia": ganancia_hh_propios, "total": total_hh_propios},
        {"concepto": "COSTO SERVICIOS", "costo": costo_servicios, "ganancia": ganancia_servicios, "total": total_servicios},
        {"concepto": "GASTOS ENTREGA", "costo": costo_gastos_entrega, "ganancia": ganancia_gastos_entrega, "total": total_gastos_entrega},
        {"concepto": "IMPREVISTOS", "costo": costo_imprevistos, "ganancia": ganancia_imprevistos, "total": total_imprevistos},
        {"concepto": "DESCUENTO", "costo": costo_descuento, "ganancia": ganancia_descuento, "total": total_descuento},
    ]

    # Cálculos horizontales y verticales rápidos
    total_costo_final = sum(d["costo"] for d in datos if d["concepto"] != "DESCUENTO") + costo_descuento
    total_ganancia_final = sum(d["ganancia"] for d in datos)
    total_venta_final = sum(d["total"] for d in datos)

    context = {
        "id_registro": id_registro,
        "codigo_cotizacion": cotizacion.codigo,
        "titulo": "REPORTE DETALLADO",
        "datos": datos,
        "total_costo": total_costo_final,
        "total_ganancia": total_ganancia_final,
        "total_final": total_venta_final,
        "moneda": moneda_simbolo,
    }

    return render(
        request,
        "reportes/reporte_detallado_cotizacion.html",
        context,
    )

@csrf_exempt
@xframe_options_exempt
def reporte_resumen_cotizacion(request, id_registro):
    # Conseguimos la cotización principal usando la nueva PK autoincremental o el código fallback
    try:
        cotizacion = Cotizacion.objects.get(id_registro=id_registro)
    except (Cotizacion.DoesNotExist, ValueError):
        cotizacion = get_object_or_404(Cotizacion, codigo=str(id_registro))
        
    id_registro = cotizacion.id_registro
    codigo_cotizacion = cotizacion.codigo or f"REG-{id_registro}"
    tipo_moneda = cotizacion.tipo_moneda
    tipo_cambio = cotizacion.tipo_cambio or Decimal("1.00")
    factor = tipo_cambio if tipo_moneda == "S" else Decimal("1.00")
    moneda = "S/." if tipo_moneda == "S" else "$"

    # Obtener diccionarios de cantidades para Suministros
    cantidades_suministros = dict(
        CotizacionSuministro.objects.filter(
            id_registro_id=id_registro,
            nivel=0
        ).values_list("codigo_grupo", "cantidad")
    )

    # Para Servicios (prefijo de código_servicio -> cantidad_hombres)
    servicios_nivel0 = CotizacionServicio.objects.filter(
        id_registro_id=id_registro,
        nivel=0
    ).values_list("codigo_servicio", "cantidad_hombres")
    
    cantidades_servicios = {}
    for cod, cant in servicios_nivel0:
        if cod and len(cod) >= 2:
            prefijo = cod[:2]
            cantidades_servicios[prefijo] = cant or 1

    # 1. EQUIPOS & MATERIALES (Mapeados desde CotizacionSuministro)
    qs_suministros = CotizacionSuministro.objects.filter(id_registro_id=id_registro, nivel=1)

    # Equipos (id_tipo_gasto_id = 1)
    qs_equipos = qs_suministros.filter(id_tipo_gasto_id=1)
    costo_equipos = Decimal("0.00")
    venta_equipos = Decimal("0.00")
    for item in qs_equipos:
        cant_grupo = Decimal(str(cantidades_suministros.get(item.codigo_grupo, 1) or 1))
        costo_equipos += (item.costo_total or Decimal("0.00")) * cant_grupo
        venta_equipos += (item.venta_total or Decimal("0.00")) * cant_grupo
    ganancia_equipos = venta_equipos - costo_equipos

    # Materiales (id_tipo_gasto_id = 2)
    qs_materiales = qs_suministros.filter(id_tipo_gasto_id=2)
    costo_materiales = Decimal("0.00")
    venta_materiales = Decimal("0.00")
    for item in qs_materiales:
        cant_grupo = Decimal(str(cantidades_suministros.get(item.codigo_grupo, 1) or 1))
        costo_materiales += (item.costo_total or Decimal("0.00")) * cant_grupo
        venta_materiales += (item.venta_total or Decimal("0.00")) * cant_grupo
    ganancia_materiales = venta_materiales - costo_materiales

    # 2. MANO DE OBRA (id_tipo_gasto_id = 3)
    qs_hh = CotizacionServicio.objects.filter(id_registro_id=id_registro, nivel=2, id_tipo_gasto_id=3)
    costo_hh_propios = Decimal("0.00")
    venta_hh_propios = Decimal("0.00")
    for item in qs_hh:
        prefijo = (item.codigo_servicio or "")[:2]
        cant_grupo = Decimal(str(cantidades_servicios.get(prefijo, 1) or 1))
        costo_hh_propios += (item.costo_total or Decimal("0.00")) * cant_grupo
        venta_hh_propios += (item.cotizado_total or Decimal("0.00")) * cant_grupo
    ganancia_hh_propios = venta_hh_propios - costo_hh_propios

    # 3. GASTOS SERVICIO (id_tipo_gasto_id = 4)
    qs_terceros = CotizacionServicio.objects.filter(id_registro_id=id_registro, nivel=2, id_tipo_gasto_id=4)
    costo_servicios = Decimal("0.00")
    venta_servicios = Decimal("0.00")
    for item in qs_terceros:
        prefijo = (item.codigo_servicio or "")[:2]
        cant_grupo = Decimal(str(cantidades_servicios.get(prefijo, 1) or 1))
        costo_servicios += (item.costo_total or Decimal("0.00")) * cant_grupo
        venta_servicios += (item.cotizado_total or Decimal("0.00")) * cant_grupo
    ganancia_servicios = venta_servicios - costo_servicios

    # 4. GASTOS DE ENTREGA / LOGÍSTICA (Temporalmente en 0.00)
    costo_gastos_entrega = Decimal("0.00")
    venta_gastos_entrega = Decimal("0.00")
    ganancia_gastos_entrega = Decimal("0.00")

    # 5. IMPREVISTOS / OTROS (id_tipo_gasto_id = 5)
    qs_imprevistos = CotizacionServicio.objects.filter(id_registro_id=id_registro, nivel=2, id_tipo_gasto_id=5)
    costo_imprevistos = Decimal("0.00")
    venta_imprevistos = Decimal("0.00")
    for item in qs_imprevistos:
        prefijo = (item.codigo_servicio or "")[:2]
        cant_grupo = Decimal(str(cantidades_servicios.get(prefijo, 1) or 1))
        costo_imprevistos += (item.costo_total or Decimal("0.00")) * cant_grupo
        venta_imprevistos += (item.cotizado_total or Decimal("0.00")) * cant_grupo
    ganancia_imprevistos = venta_imprevistos - costo_imprevistos

    # -----------------------------------------------------------------
    # CONSTRUCCIÓN DEL ESTRUCTURADO CONSOLIDADO (Costo vs Utilidad)
    # -----------------------------------------------------------------
    resumen = [
        {"concepto": "GASTOS", "importe": (costo_equipos + costo_servicios + costo_materiales) * factor},
        {"concepto": "GANANCIAS", "importe": (ganancia_equipos + ganancia_materiales + 
                                             ganancia_hh_propios + ganancia_imprevistos + 
                                             ganancia_gastos_entrega + ganancia_servicios) * factor},
        {"concepto": "HH PROPIOS", "importe": costo_hh_propios * factor},
        {"concepto": "IMPREVISTOS", "importe": costo_imprevistos * factor},
        {"concepto": "GASTOS ENTREGA", "importe": costo_gastos_entrega * factor},
    ]

    total_final = sum(d["importe"] for d in resumen)

    context = {
        "id_registro": id_registro,
        "codigo_cotizacion": codigo_cotizacion,
        "titulo": "REPORTE RESUMEN",
        "resumen": resumen,
        "total_final": total_final,
        "moneda": moneda,
    }

    return render(request, "reportes/reporte_resumen_cotizacion.html", context)

@csrf_exempt
@xframe_options_exempt
def reporte_venta_total_html(request, num_reg):
    try:
        cotizacion = Cotizacion.objects.get(id_registro=num_reg)
    except (Cotizacion.DoesNotExist, ValueError):
        cotizacion = get_object_or_404(Cotizacion, codigo=str(num_reg))

    tipo_moneda = cotizacion.tipo_moneda
    tipo_cambio = cotizacion.tipo_cambio or Decimal("1.00")
    factor = tipo_cambio if tipo_moneda == "S" else Decimal("1.00")
    moneda_simbolo = "S/." if tipo_moneda == "S" else "$"

    suministros = (
        CotizacionSuministro.objects
        .filter(id_registro=cotizacion.id_registro)
        .order_by("codigo_grupo", "nivel", "orden")
    )

    if not suministros.exists():
        return HttpResponse("No existen suministros para esta cotización", status=404)

    grupos = OrderedDict()

    for row in suministros:
        if row.codigo_grupo not in grupos:
            grupos[row.codigo_grupo] = {
                "titulo_grupo": "", 
                "total_venta_grupo": Decimal("0.00"),
                "envio_grupo": Decimal("0.00"),
                "items": []
            }

        # CABECERA DEL GRUPO (nivel = 0)
        if row.nivel == 0:
            grupos[row.codigo_grupo]["titulo_grupo"] = row.nombre_grupo or "SIN TITULO"
            grupos[row.codigo_grupo]["envio_grupo"] = (row.costo_envio_total or Decimal("0.00")) * factor
            grupos[row.codigo_grupo]["total_venta_grupo"] = (row.venta_total or Decimal("0.00")) * factor

        # ITEMS DETALLE (nivel > 0)
        else:
            subtotal_venta = row.venta_total or Decimal("0.00")
            subtotal_costo = row.costo_total or Decimal("0.00")
            
            grupos[row.codigo_grupo]["items"].append({
                "cod": row.codigo_item,
                "des": row.descripcion,
                "can": row.cantidad or Decimal("0"),
                "puc": (row.costo_precio or Decimal("0.00")) * factor,
                "toc": (row.costo_total or Decimal("0.00")) * factor,
                "por_env": row.porcentaje_envio or Decimal("0.00"),
                "env_u": (row.costo_envio or Decimal("0.00")) * factor,
                "cce": (row.costo_con_envio or Decimal("0.00")) * factor,
                "util_porc": row.porcentaje_utilidad or Decimal("0.00"),
                "tou": (row.utilidad or Decimal("0.00")) * factor,
                "val": (row.precio_venta or Decimal("0.00")) * factor,
                "tot": subtotal_venta * factor,
                "util_money": (subtotal_venta - subtotal_costo) * factor
            })

    context = {
        "num_reg": num_reg,
        "titulo": "REPORTE DETALLADO DE SUMINISTROS (VENTA TOTAL)",
        "grupos": grupos,
        "fecha": datetime.now(),
        "moneda": moneda_simbolo
    }

    return render(request, "reportes/reporte_venta_total.html", context)

@csrf_exempt
@xframe_options_exempt
def reporte_venta_parcial_html(request, num_reg):
    try:
        cotizacion = Cotizacion.objects.get(id_registro=num_reg)
    except (Cotizacion.DoesNotExist, ValueError):
        cotizacion = get_object_or_404(Cotizacion, codigo=str(num_reg))

    tipo_moneda = cotizacion.tipo_moneda
    tipo_cambio = cotizacion.tipo_cambio or Decimal("1.00")
    factor = tipo_cambio if tipo_moneda == "S" else Decimal("1.00")
    moneda_simbolo = "S/." if tipo_moneda == "S" else "$"

    suministros = (
        CotizacionSuministro.objects
        .filter(id_registro=cotizacion.id_registro)
        .order_by("codigo_grupo", "nivel", "orden")
    )

    if not suministros.exists():
        return HttpResponse("No existen suministros para este reporte", status=404)

    grupos = OrderedDict()

    for row in suministros:
        if row.codigo_grupo not in grupos:
            grupos[row.codigo_grupo] = {
                "titulo_grupo": "", 
                "envio_grupo": Decimal("0.00"),
                "total_venta_grupo": Decimal("0.00"),
                "items": []
            }

        # CABECERA DEL GRUPO (nivel = 0)
        if row.nivel == 0:
            grupos[row.codigo_grupo]["titulo_grupo"] = row.nombre_grupo or "SIN TITULO"
            grupos[row.codigo_grupo]["envio_grupo"] = (row.costo_envio_total or Decimal("0.00")) * factor
            grupos[row.codigo_grupo]["total_venta_grupo"] = (row.venta_total or Decimal("0.00")) * factor

        # ITEMS DEL DETALLE (nivel > 0)
        else:
            grupos[row.codigo_grupo]["items"].append({
                "cod": row.codigo_item,
                "des": row.descripcion,
                "can": row.cantidad or Decimal("0"),
                "puc": (row.costo_precio or Decimal("0.00")) * factor,
                "toc": (row.costo_total or Decimal("0.00")) * factor,
                "env_u": (row.costo_envio or Decimal("0.00")) * factor,
                "cce": (row.costo_con_envio or Decimal("0.00")) * factor,
                "util_porc": row.porcentaje_utilidad or Decimal("0.00"),
                "util_money": (row.utilidad or Decimal("0.00")) * factor,
                "val": (row.precio_venta or Decimal("0.00")) * factor,
                "tot": (row.venta_total or Decimal("0.00")) * factor
            })

    context = {
        "num_reg": num_reg,
        "titulo": "REPORTE DE SUMINISTROS (VENTA PARCIAL)",
        "grupos": grupos,
        "fecha": datetime.now(),
        "moneda": moneda_simbolo
    }
    
    return render(request, "reportes/reporte_venta_parcial.html", context)

#========================================================================================

##===============##
## FUNCION TEXTO ##
##===============##
from bs4 import BeautifulSoup

def html_to_text(html):
    if not html:
        return ""

    soup = BeautifulSoup(html, "html.parser")

    # Reemplaza <li> por "- texto"
    for li in soup.find_all("li"):
        li.insert_before("- ")
        li.append("\n")

    # Convierte <p> en saltos de línea
    for p in soup.find_all("p"):
        p.append("\n")

    text = soup.get_text()
    return text.strip()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def periodos_registrados(request):
    try:
        # Obtener los años distintos de año_apertura
        anos = list(Cotizacion.objects.filter(año_apertura__isnull=False).values_list('año_apertura', flat=True).distinct().order_by('-año_apertura'))
        if not anos:
            anos = [date.today().year]
            
        # Obtener los meses distintos de mes
        meses = list(Cotizacion.objects.filter(mes__isnull=False).values_list('mes', flat=True).distinct().order_by('mes'))
        if not meses:
            meses = list(range(1, 13))
            
        return Response({
            "anos": anos,
            "meses": meses
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_tipo_cambio_sunat(request):
    import requests
    from django.core.cache import cache
    
    cache_key = "tipo_cambio_sunat_data"
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    fallback_data = {"compra": 3.398, "venta": 3.408, "fecha": timezone.now().strftime("%Y-%m-%d")}
    try:
        res = requests.get("https://api.apis.net.pe/v1/tipo-cambio-sunat", timeout=3.0)
        if res.status_code == 200:
            val = res.json()
            data = {
                "compra": val.get("compra", 3.398),
                "venta": val.get("venta", 3.408),
                "fecha": val.get("fecha", fallback_data["fecha"])
            }
            # Cache it for 2 hours (7200 seconds)
            cache.set(cache_key, data, 7200)
            return Response(data)
    except Exception as e:
        logger.error("Error fetching SUNAT exchange rate: %s", str(e))
        print("Error fetching SUNAT exchange rate:", str(e))

    return Response(fallback_data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def vistas_analisis_api(request):
    from .models import VistaAnalisis
    if request.method == "GET":
        vistas = VistaAnalisis.objects.filter(id_usuario=request.user)
        data = [{
            "id_vista": v.id_vista,
            "nombre": v.nombre,
            "dimensions": v.dimensions,
            "metrica": v.metrica,
            "created_at": v.created_at.strftime("%Y-%m-%d %H:%M:%S") if v.created_at else None
        } for v in vistas]
        return Response(data)

    elif request.method == "POST":
        nombre = request.data.get("nombre")
        dimensions = request.data.get("dimensions")
        metrica = request.data.get("metrica")
        
        if not nombre or not dimensions or not metrica:
            return Response({"error": "Faltan campos requeridos"}, status=status.HTTP_400_BAD_REQUEST)
            
        vista = VistaAnalisis.objects.create(
            nombre=nombre,
            dimensions=dimensions,
            metrica=metrica,
            id_usuario=request.user
        )
        return Response({
            "id_vista": vista.id_vista,
            "nombre": vista.nombre,
            "dimensions": vista.dimensions,
            "metrica": vista.metrica
        }, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def vista_analisis_delete_api(request, id_vista):
    from .models import VistaAnalisis
    try:
        vista = VistaAnalisis.objects.get(pk=id_vista, id_usuario=request.user)
        vista.delete()
        return Response({"message": "Vista eliminada correctamente"})
    except VistaAnalisis.DoesNotExist:
        return Response({"error": "La vista no existe o no tienes permiso para eliminarla"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def descargar_plantilla_suministros(request):
    from openpyxl import Workbook
    from openpyxl.utils import get_column_letter
    from core.models import Producto, UnidadMedida
    import random
    
    wb = Workbook()
    
    # Load all active units of measure from the database
    unidades_validas = list(UnidadMedida.objects.filter(activo=1))
    
    # Sheet 1: Main Template
    ws = wb.active
    ws.title = "Plantilla Importación"
    
    headers = [
        "MARCA",
        "CODIGO",
        "DESCRIPCION",
        "CANTIDAD",
        "COSTO UNITARIO",
        "UTILIDAD",
        "UNIDAD MEDIDA",
        "TIEMPOS ENTREGA"
    ]
    ws.append(headers)
    
    # Style headers: RGB(35, 117, 115) -> Hex 237573
    fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
    font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    align = Alignment(horizontal="center", vertical="center")
    
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = fill
        cell.font = font
        cell.alignment = align
        
    # Column widths
    widths = [20, 20, 45, 10, 16, 10, 16, 18]
    for idx, width in enumerate(widths, 1):
        col_letter = get_column_letter(idx)
        ws.column_dimensions[col_letter].width = width

    # Balanced query: Fetch 7 random products per active brand to guarantee representation
    from core.models import TipoMarca
    marcas = TipoMarca.objects.filter(activo="1").order_by("nombre")
    selected_products = []
    
    for m in marcas:
        brand_prods = Producto.objects.filter(activo=1, id_marca=m).order_by('?')[:7]
        selected_products.extend(list(brand_prods))
        
    random.shuffle(selected_products)
    final_products = selected_products[:35]
    
    # Fallback to fill up to 35 items if needed
    if len(final_products) < 30:
        needed = 35 - len(final_products)
        fallback_prods = Producto.objects.filter(activo=1).exclude(
            id_producto__in=[p.id_producto for p in final_products]
        ).order_by('?')[:needed]
        final_products.extend(list(fallback_prods))
        
    for p in final_products:
        marca_name = p.id_marca.nombre if p.id_marca else "Otros"
        codigo = p.codigo if p.codigo else ""
        nombre = p.nombre.strip() if p.nombre else ""
        cantidad = random.choice([1, 2, 5, 10])
        
        # Prevent 0.0 costs by assigning a realistic random value
        costo_unit = float(p.precio_dolares) if p.precio_dolares and float(p.precio_dolares) > 0.0 else round(random.uniform(15.0, 185.0), 2)
        
        utilidad = 15.0
        
        # Load unit of measure from database
        um_obj = p.id_medida if p.id_medida else (random.choice(unidades_validas) if unidades_validas else None)
        um = um_obj.codigo.strip() if um_obj and um_obj.codigo else "UNI"
        
        entrega = random.choice([0, 1, 5, 10])
        
        ws.append([
            marca_name,
            codigo,
            nombre,
            cantidad,
            costo_unit,
            utilidad,
            um,
            entrega
        ])
        
    # Prepare HTTP response
    response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response["Content-Disposition"] = 'attachment; filename="Plantilla_Importacion_Suministros.xlsx"'
    
    wb.save(response)
    return response
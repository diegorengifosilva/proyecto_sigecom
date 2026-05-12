
# â”€â”€â”€ LibrerÃ­as estÃ¡ndar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

# â”€â”€â”€ LibrerÃ­as de terceros â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
from reportlab.pdfgen import canvas

from . import serializers
logger = logging.getLogger(__name__)

# â”€â”€â”€ Django core â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils import timezone
from django.db.models import Sum, Count, Q, F, Max, DecimalField, ExpressionWrapper
from django.db.models.functions import TruncDate, Coalesce
from django.db.models.functions import ExtractMonth

from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.db import transaction
from django.views.decorators.http import require_GET
from django.utils.dateparse import parse_date
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

from rest_framework_simplejwt.authentication import JWTAuthentication

# â”€â”€â”€ Django REST Framework â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
import os

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import LogisticaDashboard
from .serializers import OrdenOCSerializer

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q

from .models import VcMovOrdenSoli, VcMovOrdenSoliD
from .serializers import OrdenOCSerializer

from django.shortcuts import render
from collections import OrderedDict
from string import ascii_uppercase
from copy import deepcopy

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q


CACHE_LIST_KEY = "liquidacion_list"
CACHE_DETAIL_PREFIX = "liquidacion_detail_"

# ——— Modelos y Serializers propios —————————————————————————————
from django.conf import settings
from datetime import date, datetime, timedelta
from django.utils.timezone import now
from .models import (
    LogisticaDashboard,
    LogisticaDashboardDetalle,
    VcMovOrdenSoli,
    AlmTabUmed,
    DashboardCotizacion,
    vc_tab_estado,
    vc_mov_cotizaciones,
    cont_cias,
    CotiSuministros,
    CotiServicios,
    CotiMensajes,
    CotiSeguimiento,
    vc_tab_tproveedor,
    vc_tab_categorias,
    vc_tab_tgastos,
    vc_tab_tgastos_d,
    vc_tab_rittal,
    vc_tab_rockwell,
    vc_tab_ceyesa,
    vc_tab_hoffman,
    alm_articulos,
    sis_alm_tab_almacen,
    sis_alm_tab_grupo,
    sis_alm_tab_articulos,
    sis_alm_tab_ccosto,
)

from users.models import (
    Usuario,
    Area,
    Cargo,
    )
from core.models import Cliente, Representante

from .serializers import (
    DashboardCotizacionTablaSerializer,
    OrdenOCSerializer,
    EstadoSerializer,
    CotizacionesSerializer,
    ContCiasSerializer,
    DashboardCotizacionModalSerializer,
    CotiSuministrosSerializer,
    CotiServiciosSerializer,
    CotiMensajesSerializer,
    CotiSeguimientoSerializer,
    DashboardCotizacionSerializer,
    ProveedoresSerializer,
    CategoriasSerializer,
    TGastosSerializer,
    TGastosDSerializer,
    RittalSerializer,
    RockwellSerializer,
    CeyesaSerializer,
    HoffmanSerializer,
    AlmArticulosSerializer,
    AlmacenSerializer,
    GrupoAnaliticoSerializer,
    ArticuloSerializer,
    AlmTabUmedSerializer,
    CcostoSerializer,
)

from users.serializers import (
    AreasSerializer,
    CargosSerializer,
    UsuarioSerializer,
)

from django.db.models.functions import Cast
from django.db.models import CharField


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

#========================================================================================


###########################################################3


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def logistica_kardex_base_view(request):
    """
    Devuelve los movimientos planos para el kardex de un producto:
    - Une sis_alm_mov_es (cabecera) con sis_alm_mov_es_det (detalle)
    - Filtra por año, mes (<=) y código de producto
    - El cálculo de ingreso/salida/saldo se hace en el frontend.
    """

    try:
        from datetime import date

        # ==========================
        # 1) Parámetros
        # ==========================
        # Si no mandas anno/mes, se consideran "todos"
        anno = request.GET.get("anno", "%")   # ej: "2026" o "%"
        mes  = request.GET.get("mes", "%")    # ej: "03" o "%"
        cod  = request.GET.get("cod", "%")    # código de producto
        tmo  = request.GET.get("tmo", "S")    # no se usa aquí, solo lo reenvías al front

        # ==========================
        # 2) Cabeceras (sis_alm_mov_es)
        # ==========================
        cab_qs = LogisticaDashboard.objects.all()

        # Solo filtra por año si anno != "%"
        if anno != "%":
            cab_qs = cab_qs.filter(fec__year=anno)

        # Solo filtra por mes si mes != "%"
        if mes != "%":
            cab_qs = cab_qs.filter(fec__month__lte=mes)

        # Obtenemos todos los num_reg válidos
        cab_map = {c.num_reg: c for c in cab_qs}
        num_regs = list(cab_map.keys())

        if not num_regs:
            return Response([], status=200)

        # ==========================
        # 3) Detalle (sis_alm_mov_es_det) filtrado por producto
        # ==========================
        det_qs = LogisticaDashboardDetalle.objects.filter(
            num_reg__in=num_regs
        )

        if cod != "%":
            # Si el código es exacto (EV399-4), mejor usar iexact
            det_qs = det_qs.filter(cod__iexact=cod)
            # Si quisieras "contiene", usa cod__icontains=cod

        # Ordenar igual que en el PHP: por fecha de cabecera ascendente
        detalles = sorted(
            list(det_qs),
            key=lambda d: (
                cab_map[d.num_reg].fec if d.num_reg in cab_map else None,
                d.num_reg,
            ),
        )

        # ==========================
        # 4) Construir lista de movimientos planos
        # ==========================
        movimientos = []
        for det in detalles:
            cab = cab_map.get(det.num_reg)
            if not cab:
                continue

            movimientos.append({
                "fec": cab.fec.strftime("%Y-%m-%d") if cab.fec else None,
                "ope": det.ope,               # tipo (E/S)
                "dor": cab.dor,               # referencia
                "tmo": cab.tmo,               # moneda del movimiento
                "tc": float(cab.tc or 0),     # tipo de cambio
                "nom": det.nom,
                "cod": det.cod,
                "can": float(det.can or 0),
                "val": float(det.val or 0),
                "tot": float(det.tot or 0),
            })

        return Response(movimientos, status=200)

    except Exception as e:
        import traceback
        print("Error en logistica_kardex_base_view:", traceback.format_exc())
        return Response({"error": str(e)}, status=500)

#========================================================================================


from django.http import HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML
from io import BytesIO
import os

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reporte_kardex_pdf(request):
    try:
        from django.templatetags.static import static
        # 1. FILTROS (igual que logistica_kardex_base_view)
        anno = request.GET.get("anno", "%")
        mes = request.GET.get("mes", "%")
        cod = request.GET.get("cod", "%")
        moneda = request.GET.get("moneda", "S")  # ← S o D

        # 2. MISMA LÓGICA que kardex_base
        cab_qs = LogisticaDashboard.objects.all()
        
        if anno != "%":
            cab_qs = cab_qs.filter(fec__year=anno)
        if mes != "%":
            cab_qs = cab_qs.filter(fec__month__lte=mes)

        num_regs = list(cab_qs.values_list('num_reg', flat=True))
        if not num_regs:
            return HttpResponse("Sin datos", status=404)

        det_qs = LogisticaDashboardDetalle.objects.filter(num_reg__in=num_regs)
        if cod != "%":
            det_qs = det_qs.filter(cod__iexact=cod)

        cab_map = {c.num_reg: c for c in cab_qs}
        detalles = sorted(list(det_qs), key=lambda d: cab_map.get(d.num_reg, {}).fec)
        
        # 3. CALCULAR MONTOS por MONEDA (🚀 NUEVO)
        movimientos = []
        saldo_cant = 0
        saldo_precio = 0
        
        for det in detalles:
            cab = cab_map.get(det.num_reg)
            if not cab:
                continue

            can = float(det.can or 0)
            val = float(det.val or 0)  # precio unitario
            tot = float(det.tot or 0)  # total
            
            tc = float(cab.tc or 1)  # tipo de cambio

            # ✅ CONVERTIR según MONEDA
            if moneda == "D" and cab.tmo == "S":  # Soles → Dólares
                val_dolar = val / tc
                tot_dolar = tot / tc
            elif moneda == "S" and cab.tmo == "D":  # Dólares → Soles
                val_dolar = val * tc
                tot_dolar = tot * tc
            else:  # Misma moneda
                val_dolar = val
                tot_dolar = tot

            # Actualizar saldos acumulativos
            if det.ope == 'E':  # Entrada
                saldo_cant += can
                saldo_precio = val_dolar  # Precio promedio simplificado
            else:  # Salida
                saldo_cant -= can

            saldo_total = saldo_cant * saldo_precio

            movimiento = {
                'fecha': cab.fec.strftime('%d/%m/%Y'),
                'tipo': 'E' if det.ope == 'E' else 'S',
                'referencia': cab.dor or '',
                
                # Ingreso
                'ingreso_cant': can if det.ope == 'E' else 0,
                'ingreso_precio': val_dolar if det.ope == 'E' else 0,
                'ingreso_total': tot_dolar if det.ope == 'E' else 0,
                
                # Salida  
                'salida_cant': can if det.ope == 'S' else 0,
                'salida_precio': val_dolar if det.ope == 'S' else 0,
                'salida_total': tot_dolar if det.ope == 'S' else 0,
                
                # Saldos ACUMULATIVOS
                'saldo_cant': saldo_cant,
                'saldo_precio': saldo_precio,
                'saldo_total': saldo_total,
            }
            movimientos.append(movimiento)

        # 4. CONTEXTO para template
        context = {
            "rows": movimientos,
            "titulo": f"KARDEX - {cod}",
            "moneda": "S/ " if moneda == "S" else "$ ",
            "logo_url": request.build_absolute_uri(static("img/logo.png")),
        }

        # 5. PDF
        html_string = render_to_string("reportes/reporte_kardex_dashboard.html", context)
        html = HTML(string=html_string, base_url=request.build_absolute_uri("/"))
        pdf_buffer = BytesIO()
        html.write_pdf(pdf_buffer)
        pdf_buffer.seek(0)

        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="kardex_{cod}_{moneda}.pdf"'
        return response

    except Exception as e:
        print(f"Error PDF: {e}")
        return HttpResponse("Error generando PDF", status=500)

#=========================#
# LOGISTICA #
#=========================#
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def logistica_dashboard_view(request):
    """
    Dashboard inicial de LogÃ­stica
    VersiÃ³n base: filtros + mÃ©tricas + tabla
    """

    try:
        from datetime import date

        # ======================================================
        # 1) ParÃ¡metros
        # ======================================================
        anno = request.GET.get("anno", "%")
        mes = request.GET.get("mes", "%")
        proveedor = request.GET.get("proveedor", "%")
        tipo = request.GET.get("tipo", "%")
        estado = request.GET.get("estado", "%")
        almacen = request.GET.get("almacen", "%")
        tipo_cambio = request.GET.get("tipo_cambio", "%")  # valor por defecto si no se envÃ­a
        moneda = request.GET.get("moneda", "%") 
        numero_doc = request.GET.get("numero_doc", "%") 
        responsable = request.GET.get("responsable", "%") 
        nro_guia = request.GET.get("nro_guia", "%") 
        obs_doc = request.GET.get("obs_doc", "%") 
        codigo = request.GET.get("codigo", "%") 
        referencia = request.GET.get("referencia", "%") 
        tipo_movimiento = request.GET.get("tipo_movimiento", "%") 
        orden_compra = request.GET.get("orden_compra", "%")
        razon_social = request.GET.get("razon_social", "%")
        operacion = request.GET.get("operacion", "%")
        general = request.GET.get("general", "").strip()
        campo = request.GET.get("campo", "").strip()
        valor = request.GET.get("valor", "").strip()
        # ======================================================
        # ======================================================
        # 2) Query base
        # ======================================================
        qs = LogisticaDashboard.objects.all()

        # Filtra por columnas dedicadas anno/mes (más eficiente que extraer de fec)
        if anno != "%" and anno:
            qs = qs.filter(anno=anno)

        qs = qs.annotate(
            sol_str=Cast('sol', CharField()),
            dol_str=Cast('dol', CharField())
        )
        if razon_social != "%":
            qs = qs.filter(dor=razon_social)

        if operacion != "%":
            qs = qs.filter(ope=operacion)   # E = Entradas, S = Salidas

        if orden_compra != "%":
            qs = qs.filter(oco=orden_compra)

        if tipo_movimiento != "%":
            qs = qs.filter(tip=tipo_movimiento)

        if referencia != "%":
            qs = qs.filter(mov=referencia)

        if nro_guia != "%":
            qs = qs.filter(ngu=nro_guia)

        if obs_doc != "%":
            qs = qs.filter(nom2=obs_doc)

        if codigo != "%":
            qs = qs.filter(cod=codigo)

        if responsable != "%":
            qs = qs.filter(nom1=responsable)

        if numero_doc != "%":
            qs = qs.filter(nfa=numero_doc)

        if moneda != "%":
            qs = qs.filter(tmo=moneda)

        if tipo_cambio != "%":
            qs = qs.filter(tc=tipo_cambio)

        if almacen != "%":
            qs = qs.filter(alm=almacen)

        if mes != "%" and mes:
            qs = qs.filter(mes=mes.zfill(2))   # normalizar: "3" -> "03"

        if proveedor != "%":
            qs = qs.filter(cor=proveedor)

        if estado != "%":
            if estado == "ANULADO":
                qs = qs.filter(anulado="S")
            elif estado == "ACTIVO":
                qs = qs.exclude(anulado="S")

        
        if general:
            qs = qs.filter(
                Q(num_reg__icontains=general) |
                Q(fec__icontains=general) |
                Q(oco__icontains=general) |
                Q(nfa__icontains=general) |
                Q(ngu__icontains=general) |
                Q(cor__icontains=general) |
                Q(dor__icontains=general) |
                Q(tip__icontains=general) |
                Q(alm__icontains=general) |
                Q(tmo__icontains=general) |
                Q(sol_str__icontains=general) |
               Q(dol_str__icontains=general) |
                Q(reg__icontains=general) |
                Q(obs__icontains=general) |
                Q(ope__icontains=general) |
                Q(nom1__icontains=general) |
                Q(nom2__icontains=general) |
                Q(est__icontains=general) |
                Q(mov__icontains=general)
            )

            
        # ======================================================
        # 3) Dashboard Stats
        # ======================================================
        total = qs.count()

        hoy = date.today()
        este_mes = 0
        meses = [0] * 12

        total_soles = 0
        total_dolares = 0

        proveedores_stats = {}

        for r in qs:

            # Conteo por mes
            if r.fec:
                fec_obj = r.fec
                if isinstance(fec_obj, str):
                    from django.utils.dateparse import parse_date
                    fec_obj = parse_date(fec_obj)
                
                if fec_obj and hasattr(fec_obj, 'month'):
                    idx = fec_obj.month - 1
                    meses[idx] += 1
                    if fec_obj.month == hoy.month:
                        este_mes += 1

            # Montos
            total_soles += float(r.sol or 0)
            total_dolares += float(r.dol or 0)

            # Stats proveedor
            codigo = r.cor or "-"
            nombre = r.dor or "SIN NOMBRE"

            if codigo not in proveedores_stats:
                proveedores_stats[codigo] = {
                    "codigo": codigo,
                    "nombre": nombre,
                    "cantidad": 0,
                    "soles": 0,
                    "dolares": 0,
                }

            proveedores_stats[codigo]["cantidad"] += 1
            proveedores_stats[codigo]["soles"] += float(r.sol or 0)
            proveedores_stats[codigo]["dolares"] += float(r.dol or 0)

        # porcentajes
        for p in proveedores_stats.values():
            p["porcentaje"] = round((p["cantidad"] / total) * 100, 2) if total else 0

        dashboard_data = {
            "total": total,
            "esteMes": este_mes,
            "montoTotalSoles": round(total_soles, 2),
            "montoTotalDolares": round(total_dolares, 2),
            "promedioSoles": round(total_soles / total, 2) if total else 0,
            "promedioDolares": round(total_dolares / total, 2) if total else 0,
            "porMes": meses,
            "proveedores": list(proveedores_stats.values())
        }

        # ======================================================
        # 4) Tabla
        # ======================================================
        tabla = list(
            qs.order_by("-fec", "-num_reg").values(
                "num_reg",
                "fec",
                "oco",
                "nfa",
                "ngu",
                "cor",
                "dor",
                "tip",
                "alm",
                "tmo",
                "sol",
                "dol",
                "reg",
                "obs",
                "ope",
                "nom1",
                "nom2",
                "est",
                "mov",

            )
        )

        # ======================================================
        # 5) Respuesta
        # ======================================================
        return Response({
            "dashboard": dashboard_data,
            "tabla": tabla,
            "anno": anno,
            "mes": mes,
            "almacen":almacen,
            "referencia":referencia,
            "general": general,
             "general": general,
             "operacion":operacion,

        })

    except Exception as e:
        import traceback
        error_msg = str(e)
        error_trace = traceback.format_exc()
        logger.error(f"Error en logistica_dashboard_view: {error_msg}\n{error_trace}")
        return Response({
            "error": "Error interno en el servidor.",
            "details": error_msg,
            "trace": error_trace if settings.DEBUG else None
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def logistica_modal_view(request, num_reg):
    """
    Retorna los detalles completos de un movimiento logÃ­stico
    usando num_reg como clave principal.
    """

    try:
        # ==========================
        # 1ï¸âƒ£ CABECERA
        # ==========================
        cabecera = LogisticaDashboard.objects.filter(num_reg=num_reg).first()

        if not cabecera:
            return Response(
                {"error": f"No se encontrÃ³ el movimiento con nÃºmero {num_reg}"},
                status=404
            )

        # ==========================
        # 2ï¸âƒ£ DETALLE
        # ==========================
        detalles = LogisticaDashboardDetalle.objects.filter(num_reg=num_reg)

        total_soles = 0
        total_dolares = 0
        items = []

        for d in detalles:
            total_soles += float(d.sol or 0)
            total_dolares += float(d.dol or 0)

            items.append({
                "num_reg": d.num_reg,
                "codigo": d.cod,
                "nombre": d.nom,
                "unidad": d.um,
                "cantidad": d.can,
                "valor_unitario": float(d.val or 0),
                "total": float(d.tot or 0),
                "soles": float(d.sol or 0),
                "dolares": float(d.dol or 0),
                "observacion": d.obs,
                "operacion": d.ope,
            })

        # ==========================
        # 3ï¸âƒ£ RESPONSE FINAL
        # ==========================
        response_data = {
            "cabecera": {
                "numero": cabecera.num_reg,
                "fecha": cabecera.fec,
                "operacion": cabecera.ope,
                "referencia": cabecera.mov,
                "numero_doc": cabecera.nfa,
                "orden_compra": cabecera.oco,
                "almacen": cabecera.alm,
                "proveedor_codigo": cabecera.cor,
                "responsable": cabecera.nom1,
                "obs_doc": cabecera.nom2,
                "moneda": cabecera.tmo,
                "tipo_cambio": float(cabecera.tc or 0),
                "usuario": cabecera.reg,
                "observacion": cabecera.obs,
                "nro_guia": cabecera.ngu,
                "estado": cabecera.est,
                "anulado": cabecera.anulado,
                "tipo_movimiento": cabecera.tip,
                "razon_social": cabecera.dor,


            },
            "items": items,
            "resumen": {
                "totalItems": len(items),
                "totalSoles": round(total_soles, 2),
                "totalDolares": round(total_dolares, 2),
            }
        }

        return Response(response_data)

    except Exception as e:
        import traceback
        print("Error en logistica_modal_view:", traceback.format_exc())
        return Response({"error": str(e)}, status=500)
    


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def logistica_modal_view_sal(request, num_reg):
    """
    Retorna los detalles completos de un movimiento logÃ­stico
    usando num_reg como clave principal.
    """

    try:
        # ==========================
        # 1ï¸âƒ£ CABECERA
        # ==========================
        cabecera = LogisticaDashboard.objects.filter(num_reg=num_reg).first()

        if not cabecera:
            return Response(
                {"error": f"No se encontrÃ³ el movimiento con nÃºmero {num_reg}"},
                status=404
            )

        # ==========================
        # 2ï¸âƒ£ DETALLE
        # ==========================
        detalles = LogisticaDashboardDetalle.objects.filter(num_reg=num_reg)

        total_soles = 0
        total_dolares = 0
        items = []

        for d in detalles:
            total_soles += float(d.sol or 0)
            total_dolares += float(d.dol or 0)

            items.append({
                "num_reg": d.num_reg,
                "codigo": d.cod,
                "nombre": d.nom,
                "unidad": d.um,
                "cantidad": d.can,
                "valor_unitario": float(d.val or 0),
                "total": float(d.tot or 0),
                "soles": float(d.sol or 0),
                "dolares": float(d.dol or 0),
                "observacion": d.obs,
                "operacion": d.ope,
            })

        # ==========================
        # 3ï¸âƒ£ RESPONSE FINAL
        # ==========================
        response_data = {
            "cabecera": {
                "numero": cabecera.num_reg,
                "fecha": cabecera.fec,
                "operacion": cabecera.ope,
                "referencia": cabecera.mov,
                "numero_doc": cabecera.nfa,
                "orden_compra": cabecera.oco,
                "almacen": cabecera.alm,
                "proveedor_codigo": cabecera.cor,
                "responsable": cabecera.nom1,
                "obs_doc": cabecera.nom2,
                "moneda": cabecera.tmo,
                "tipo_cambio": float(cabecera.tc or 0),
                "usuario": cabecera.reg,
                "observacion": cabecera.obs,
                "nro_guia": cabecera.ngu,
                "estado": cabecera.est,
                "anulado": cabecera.anulado,
                "tipo_movimiento": cabecera.tip,
                "razon_social": cabecera.dor,


            },
            "items": items,
            "resumen": {
                "totalItems": len(items),
                "totalSoles": round(total_soles, 2),
                "totalDolares": round(total_dolares, 2),
            }
        }

        return Response(response_data)

    except Exception as e:
        import traceback
        print("Error en logistica_modal_view_sal:", traceback.format_exc())
        return Response({"error": str(e)}, status=500)
    

from django.db.models import Q, Max
from django.db.models.functions import Trim

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def logistica_productos_view(request):
    q = request.GET.get("q", "")

    # âœ… Normalizamos campos con TRIM
    productos = LogisticaDashboardDetalle.objects.annotate(
        cod_trim=Trim('cod'),
        nom_trim=Trim('nom'),
    )

    if q:
        productos = productos.filter(
            Q(cod_trim__icontains=q) | Q(nom_trim__icontains=q)
        )

    # âœ… Distinct por cÃ³digo+nombre ya recortados
    productos = (
        productos
        .values("cod_trim", "nom_trim")
        .annotate(um=Max("um"))
        .order_by("cod_trim")[:100]
    )

    data = [
        {
            "codigo": p["cod_trim"] or "",
            "nombre": p["nom_trim"] or "",
            "unidad": (p["um"] or "").strip(),
        }
        for p in productos
        if p["cod_trim"]
    ]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def logistica_umed_view(request):
    q = request.GET.get("q", "")

    # âœ… Sin filtro de activo para traer todos
    umed = AlmTabUmed.objects.all()

    if q:
        umed = umed.filter(
            Q(cod__icontains=q) | Q(nom__icontains=q) | Q(abr__icontains=q)
        )

    umed = umed.values("cod", "nom", "abr").order_by("cod")[:100]

    data = [
        {
            "codigo": u["cod"] or "",
            "nombre": u["nom"] or "",
            "abr":    u["abr"] or "",
        }
        for u in umed
        if u["cod"]  # â†  descarta filas con cod NULL
    ]

    return Response(data)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def logistica_areas_view(request):
    q = request.GET.get("q", "")

    areas = Area.objects.filter(activo="1")

    if q:
        areas = areas.filter(
            Q(nombre__icontains=q) | Q(nomp__icontains=q) | Q(responsable__icontains=q)
        )

    areas = areas.values("codigo", "nombre", "nomp", "responsable").order_by("nombre")[:100]

    data = [
        {
            "codigo":      str(a["codigo"]),
            "nombre":      a["nombre"]      or "",
            "nomp":        a["nomp"]        or "",
            "responsable": a["responsable"] or "",
        }
        for a in areas
        if a["nombre"]
    ]

    return Response(data)

def reporte_almacen_dashboard_html(request):
    """Reporte HTML de ENTRADAS de almacén (ope='E')."""
    anno = request.GET.get("anno", "%")
    mes = request.GET.get("mes", "%")
    referencia = request.GET.get("referencia", "%")
    almacen = request.GET.get("almacen", "%")
    operacion = request.GET.get("operacion", "%")

    data = LogisticaDashboard.objects.all()

    if anno and anno != "%":
        data = data.filter(anno=anno)

    if mes and mes != "%":
        data = data.filter(mes=mes.zfill(2))

    if referencia != "%":
        data = data.filter(mov=referencia)

    if almacen != "%":
        data = data.filter(alm=almacen)

    if operacion and operacion != "%":
        data = data.filter(ope=operacion)   # E = Entradas

    data = data.order_by("-fec", "-num_reg")
    total_soles = sum(float(r.sol or 0) for r in data)
    total_dolares = sum(float(r.dol or 0) for r in data)

    html = render_to_string("reportes/reporte_almacen.html", {
        "data": data,
        "anno": anno,
        "mes": mes,
        "almacen": almacen,
        "referencia": referencia,
        "operacion": operacion,
        "total_soles": round(total_soles, 2),
        "total_dolares": round(total_dolares, 2),
    })

    return HttpResponse(html)


def reporte_almacen_salidas_dashboard_html(request):
    """Reporte HTML de SALIDAS de almacén (ope='S')."""
    anno = request.GET.get("anno", "%")
    mes = request.GET.get("mes", "%")
    referencia = request.GET.get("referencia", "%")
    almacen = request.GET.get("almacen", "%")
    operacion = request.GET.get("operacion", "%")

    data = LogisticaDashboard.objects.all()

    if anno and anno != "%":
        data = data.filter(anno=anno)

    if mes and mes != "%":
        data = data.filter(mes=mes.zfill(2))

    if referencia != "%":
        data = data.filter(mov=referencia)

    if almacen != "%":
        data = data.filter(alm=almacen)

    if operacion and operacion != "%":
        data = data.filter(ope=operacion)   # S = Salidas

    data = data.order_by("-fec", "-num_reg")
    total_soles = sum(float(r.sol or 0) for r in data)
    total_dolares = sum(float(r.dol or 0) for r in data)

    html = render_to_string("reportes/reporte_almacen_salidas.html", {
        "data": data,
        "anno": anno,
        "mes": mes,
        "almacen": almacen,
        "referencia": referencia,
        "operacion": operacion,
        "total_soles": round(total_soles, 2),
        "total_dolares": round(total_dolares, 2),
    })

    return HttpResponse(html)


from django.db.models import Max

# def get_next_num_reg():
#     max_id = LogisticaDashboard.objects.aggregate(Max('num_reg'))['num_reg__max']
#     return (max_id or 0) + 1

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Max
from .models import TipoCambio, LogisticaDashboard, LogisticaDashboardDetalle
from datetime import datetime

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def logistica_movimiento(request):
    try:
        data = request.data
        print("ðŸ”µ REQUEST:", data)

        # ==========================
        # VALIDACIONES INICIALES
        # ==========================
        ope = data.get("ope")
        if ope not in ["E", "S"]:
            return Response({"error": "OperaciÃ³n invÃ¡lida"}, status=400)

        items = data.get("items", [])
        if not items:
            return Response({"error": "No hay items para insertar"}, status=400)

        moneda = data.get("moneda")

        # ==========================
        # FECHA / MES / AÃ‘O
        # ==========================
        fecha_str = data.get("fecha")
        if not fecha_str:
            return Response({"error": "Fecha requerida"}, status=400)

        fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        mes = str(fecha.month).zfill(2)
        anno = str(fecha.year)

        # ==========================
        # TIPO DE CAMBIO
        # ==========================
        tc = float(data.get("tc") or 0)

        # ðŸ”¥ Si no viene TC, buscar en cont_tcambio
        if tc <= 0:
            tcambio = (
                TipoCambio.objects
                .filter(fec=fecha, activo='1')
                .order_by('-hor')
                .first()
            )

            if tcambio:
                tc = float(tcambio.com or 0)
                print(f"ðŸ’± TC obtenido de BD: {tc}")
            else:
                return Response(
                    {"error": f"No existe tipo de cambio para la fecha {fecha}"},
                    status=400
                )

        # ValidaciÃ³n final
        if moneda == "Dolares" and tc <= 0:
            return Response({"error": "Tipo de cambio invÃ¡lido"}, status=400)

        # ==========================
        # CALCULAR TOTALES CABECERA
        # ==========================
        total_soles = 0
        total_dolares = 0

        for item in items:
            total = float(item.get("total") or 0)

            if moneda == "Soles":
                total_soles += total
                total_dolares += total / tc if tc > 0 else 0

            elif moneda == "Dolares":
                total_dolares += total
                total_soles += total * tc

        # ==========================
        # CREAR CABECERA
        # ==========================
        cabecera = LogisticaDashboard.objects.create(
            ope=ope,
            fec=fecha,  # âœ… corregido
            oco=data.get("orden_compra"),
            nfa=data.get("numero_doc"),
            ngu=data.get("nro_guia"),
            cor=data.get("numero_doc"),
            dor=data.get("razon_social"),
            alm=data.get("almacen"),
            tmo=moneda,
            tc=tc,
            mes=mes,
            anno=anno,
            reg=data.get("reg"),
            obs=data.get("obs_doc"),
            nom1=data.get("responsable"),
            nom2=data.get("nom2"),
            sol=round(total_soles, 2),
            dol=round(total_dolares, 2),
            tip=data.get("tipo_movimiento"),
            mov=data.get("referencia"),
            est="0",
        )

        num_reg = cabecera.num_reg
        print(f"âœ… CABECERA CREADA: {num_reg}")

        # ==========================
        # INSERTAR DETALLE
        # ==========================
        print("ðŸŸ¡ INSERTANDO DETALLE...")

        for index, item in enumerate(items, start=1):
            total = float(item.get("total") or 0)

            if moneda == "Soles":
                soles = total
                dolares = total / tc if tc > 0 else 0

            elif moneda == "Dolares":
                dolares = total
                soles = total * tc

            else:
                soles = 0
                dolares = 0

            print(f"ðŸ‘‰ ITEM {index}: total={total}, S/={soles}, $={dolares}")

            LogisticaDashboardDetalle.objects.create(
                num_reg=num_reg,
                num=index,
                ope=ope,
                cod=item.get("codigo"),
                nom=item.get("descripcion"),
                um=item.get("um"),
                can=float(item.get("cant") or 0),
                val=float(item.get("valor") or 0),
                tot=round(total, 2),
                sol=round(soles, 2),
                dol=round(dolares, 2),
                obs=item.get("orden_compra"),
            )

        print("âœ… TODO INSERTADO CORRECTAMENTE")

        return Response({
            "message": "Movimiento registrado correctamente",
            "num_reg": num_reg,
            "ope": ope,
            "total_soles": round(total_soles, 2),
            "total_dolares": round(total_dolares, 2),
        })

    except Exception as e:
        import traceback
        print("❌ ERROR:", traceback.format_exc())
        return Response({"error": str(e)}, status=500)

from openpyxl import Workbook
from django.http import HttpResponse
from datetime import datetime

def formatear_fecha(f):
    if not f:
        return ""
    if isinstance(f, str):
        try:
            f = datetime.strptime(f, "%Y-%m-%d")
        except:
            return f
    return f.strftime("%d/%m/%Y")

def _filtrar_reporte_almacen(data, anno="%", mes="%", referencia="%", almacen="%", operacion="%"):
    if anno and anno != "%":
        try:
            data = data.filter(fec__year=int(anno))
        except ValueError:
            pass

    if mes and mes != "%":
        try:
            data = data.filter(fec__month=int(mes))
        except ValueError:
            pass

    if referencia and referencia != "%":
        data = data.filter(mov=referencia)

    if almacen and almacen != "%":
        data = data.filter(alm=almacen)

    if operacion and operacion != "%":
        data = data.filter(ope=operacion)

    return data

def exportar_excel_almacen(request):
    anno = request.GET.get("anno", "%")
    mes = request.GET.get("mes", "%")
    referencia = request.GET.get("referencia", "%")
    almacen = request.GET.get("almacen", "%")
    operacion = request.GET.get("operacion", "%")

    import io
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from django.http import HttpResponse
    from django.utils.timezone import localtime, now
    current_time = timezone.localtime()
    wb = Workbook()
    ws = wb.active
    ws.title = "Reporte Movimientos"

    # --- CABECERA CORPORATIVA ---
    ws.merge_cells('A1:B1')
    ws['A1'] = "VC CORPORATION"
    ws['A1'].font = Font(name='Arial Black', size=16, color="FF35A39C")
    ws['A1'].alignment = Alignment(horizontal='left')

    ws['A2'] = "OPTIMIZACIÓN Y AUTOMATIZACIÓN DE PROCESOS"
    ws['A2'].font = Font(name='Arial', size=8, bold=True, color="666666")

    # Título Dinámico
    titulo = "REPORTE DE MOVIMIENTOS"
    if operacion == "E": titulo = "REPORTE DE ENTRADAS"
    elif operacion == "S": titulo = "REPORTE DE SALIDAS"

    ws.merge_cells('C1:I1')
    ws['C1'] = titulo
    ws['C1'].font = Font(name='Arial', size=14, bold=True)
    ws['C1'].alignment = Alignment(horizontal='center', vertical='center')

    # Fecha de generación
    ws.merge_cells('J2:K2')
    ws['J2'] = f"Fecha: {current_time.strftime('%d/%m/%Y %H:%M')}"
    ws['J2'].font = Font(name='Arial', size=9, italic=True)
    ws['J2'].alignment = Alignment(horizontal='right')

    # --- ESTILOS DE TABLA ---
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name='Arial', bold=True, color="FFFFFF")
    total_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    even_row_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    thin_border = Border(
        left=Side(style='thin', color="CBD5E1"), 
        right=Side(style='thin', color="CBD5E1"), 
        top=Side(style='thin', color="CBD5E1"), 
        bottom=Side(style='thin', color="CBD5E1")
    )

    # HEADERS en Fila 4
    headers = ["N°", "Fecha", "OC", "Factura", "Guía", "Proveedor", "Tipo", "Almacén", "Moneda", "Soles", "Dólares"]
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col_num)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = thin_border

    # Anchos de columna
    column_widths = [20, 30, 20, 14, 14, 38, 12, 12, 10, 14, 14]
    for i, width in enumerate(column_widths, 1):
        ws.column_dimensions[ws.cell(row=4, column=i).column_letter].width = width

    # --- DATOS ---
    data_qs = LogisticaDashboard.objects.all()
    data_qs = _filtrar_reporte_almacen(
        data=data_qs,
        anno=anno,
        mes=mes,
        referencia=referencia,
        almacen=almacen,
        operacion=operacion,
    ).order_by("-fec", "-num_reg")

    total_soles = 0
    total_dolares = 0
    
    current_row = 5
    for r in data_qs:
        row_data = [
            r.num_reg,
            r.fec.strftime('%d/%m/%Y') if r.fec else "",
            r.oco or "",
            r.nfa or "",
            r.ngu or "",
            r.dor or "",
            r.tip or "",
            r.alm or "",
            r.tmo or "",
            float(r.sol or 0),
            float(r.dol or 0)
        ]
        
        for col_num, value in enumerate(row_data, 1):
            cell = ws.cell(row=current_row, column=col_num)
            cell.value = value
            cell.border = thin_border
            cell.font = Font(name='Arial', size=9)
            
            # Alineación específica
            if col_num in [6, 8]:  # Proveedor, Almacén
                cell.alignment = left_align
            else:
                cell.alignment = center_align
            
            # Color de fila alterna
            if current_row % 2 == 0:
                cell.fill = even_row_fill

        # Formato moneda
        ws.cell(row=current_row, column=10).number_format = '"S/ " #,##0.00'
        ws.cell(row=current_row, column=11).number_format = '"$ " #,##0.00'

        total_soles += float(r.sol or 0)
        total_dolares += float(r.dol or 0)
        current_row += 1

    # --- FILA DE TOTALES ---
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=9)
    total_label_cell = ws.cell(row=current_row, column=1)
    total_label_cell.value = "TOTALES"
    total_label_cell.font = Font(bold=True)
    total_label_cell.alignment = Alignment(horizontal='right', vertical='center')

    # Valores de totales
    cell_soles = ws.cell(row=current_row, column=10)
    cell_soles.value = total_soles
    cell_soles.font = Font(bold=True)
    cell_soles.number_format = '"S/ " #,##0.00'
    cell_soles.alignment = center_align

    cell_dolares = ws.cell(row=current_row, column=11)
    cell_dolares.value = total_dolares
    cell_dolares.font = Font(bold=True)
    cell_dolares.number_format = '"$ " #,##0.00'
    cell_dolares.alignment = center_align

    for col in range(1, 12):
        ws.cell(row=current_row, column=col).fill = total_fill
        ws.cell(row=current_row, column=col).border = thin_border

    # --- RESPUESTA ---
    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)
    
    filename = f"Reporte_{titulo.replace(' ', '_')}_{current_time.strftime('%Y%m%d_%H%M%S')}.xlsx"

    response = HttpResponse(
        excel_buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def exportar_excel_entradas(request):
    return exportar_excel_almacen(request)

###################################################################3

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buscar_ordenes_oc(request):
    """
    GET /logistica/dashboard/ordenes-oc/?proveedor=...&numero=...
    - proveedor: RUC o razÃ³n social
    - numero: nÃºmero de orden
    """
    proveedor = (request.query_params.get('proveedor') or '').strip()
    numero = (request.query_params.get('numero') or '').strip()

    qs = VcMovOrdenSoli.objects.filter(adoc='ORDEN DE COMPRA')

    if proveedor:
        qs = qs.filter(Q(luo__icontains=proveedor))

    if numero:
        qs = qs.filter(den__icontains=numero)

    qs = qs.order_by('-fec')[:50]

    serializer = OrdenOCSerializer(qs, many=True)
    return Response(serializer.data)


# views.py
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalle_orden_compra(request, reg):
    print("â–¶ detalle_orden_compra reg =", reg)  # debug

    try:
        items = (
            VcMovOrdenSoliD.objects
            .filter(reg=reg)
            .order_by('num')
        )

        print("â–¶ cantidad items =", items.count())

        data = [
            {
                "num": it.num,
                "codigo": it.cod or "",
                "descripcion": it.nom or "",
                "um": it.alm or "UND",
                "cant": float(it.can or 0),
                "valor": float(it.val or 0),
                "total": float(it.tot or 0),
            }
            for it in items
        ]

        return Response(data)

    except Exception as e:
        import traceback
        print("âŒ ERROR detalle_orden_compra:", e)
        traceback.print_exc()
        return Response(
            {"detail": "Error en detalle_orden_compra", "error": str(e)},
            status=500,
        )


#========================================================================================

##===========##
## BUSQUEDAS ##
##===========##
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def buscar_encargados_por_empresa(request, empresa):
    q = request.GET.get("q", "").strip()

    encargados = Representante.objects.filter(
        empresa=empresa,
        activo=True
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
##==========##
## ADJUNTOS ##
##==========##
@csrf_exempt
def subir_archivo(request):
    if request.method == "POST":
        print("FILES recibidos:", request.FILES)
        archivo = request.FILES.get("archivo")
        nombre_guardar = request.POST.get("nombre")  # <--- esto es lo nuevo

        if archivo:
            ruta = r"C:\Users\VC-23031\PROYECTOS\Adj"
            try:
                # usa el nombre que enviaste desde React
                with open(os.path.join(ruta, nombre_guardar), "wb+") as destino:
                    for chunk in archivo.chunks():
                        destino.write(chunk)
                return JsonResponse({"ok": True, "archivo": nombre_guardar})
            except Exception as e:
                print("Error al escribir archivo:", e)
                return JsonResponse({"ok": False, "error": str(e)})
        else:
            return JsonResponse({"ok": False, "error": "No se recibiÃ³ archivo"})
    return JsonResponse({"ok": False, "error": "MÃ©todo no permitido"})

@csrf_exempt
def listar_adjuntos(request, num_reg):
    carpeta = r"C:\Users\VC-23031\PROYECTOS\Adj"
    try:
        archivos = []
        # Itera los archivos de la carpeta
        for nombre in os.listdir(carpeta):
            if nombre.startswith(str(num_reg)):  # solo archivos que empiezan con num_reg
                archivos.append({
                    "nombre": nombre,               # nombre completo guardado en disco
                    "displayName": nombre[len(str(num_reg)) + 1:],  # quitar prefijo para mostrar
                })
        return JsonResponse({"ok": True, "archivos": archivos})
    except Exception as e:
        return JsonResponse({"ok": False, "error": str(e)})

@csrf_exempt
def eliminar_archivo(request):
    if request.method == "POST":
        nombre = request.POST.get("nombre")

        if not nombre:
            return JsonResponse({"ok": False, "error": "Nombre no recibido"})

        ruta = r"C:\Users\VC-23031\PROYECTOS\Adj"
        path = os.path.join(ruta, nombre)

        if not os.path.exists(path):
            return JsonResponse({"ok": False, "error": "Archivo no existe"})

        try:
            os.remove(path)
            return JsonResponse({"ok": True})
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)})

    return JsonResponse({"ok": False, "error": "MÃ©todo no permitido"})


from pathlib import Path
from django.conf import settings
from django.http import HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML


@csrf_exempt
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def asignar_regus(request, num_reg):
    """
    Actualiza los campos 'regus' y 'referencia' de una cotizaciÃ³n segÃºn num_reg.
    """
    try:
        cotizacion = DashboardCotizacion.objects.get(num_reg=num_reg)
    except DashboardCotizacion.DoesNotExist:
        return Response(
            {"detail": "CotizaciÃ³n no encontrada"},
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
            "message": "CotizaciÃ³n actualizada correctamente",
            "num_reg": cotizacion.num_reg,
            "regus": cotizacion.regus,
            "referencia": cotizacion.referencia,
        },
        status=200
    )



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generar_codigo_view(request, numero):
    """
    Retorna el cÃ³digo (cotin) asociado a la cotizaciÃ³n.
    Si la cotizaciÃ³n no existe â†’ 404
    """
    try:
        cot = DashboardCotizacion.objects.filter(numero=numero).first()
        if not cot:
            return Response(
                {"error": f"No se encontrÃ³ la cotizaciÃ³n #{numero}"},
                status=404
            )

        return Response({
            "numero": cot.numero,
            "codigo": cot.numero  # Es lo mismo que cotin
        })

    except Exception as e:
        import traceback
        print("Error en generar_codigo_view:", traceback.format_exc())
        return Response({"error": str(e)}, status=500)


##================##
## DATOS DE BD_VC ##
##================##

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_excel_proveedores(request):
    q = (request.GET.get("q", "") or "").strip()
    activo_param = (request.GET.get("activo", "todos") or "").strip()
    tipo_param = (request.GET.get("tipo", "") or "").strip()

    clientes = Cliente.objects.all()

    # Filtros igual que lista_clientes
    if activo_param not in ("", "%", "todos", "ALL", "all", "Todos"):
        if str(activo_param).lower() in ("1", "true", "t", "activo"):
            clientes = clientes.filter(activo=True)
        elif str(activo_param).lower() in ("0", "false", "f", "inactivo"):
            clientes = clientes.filter(activo=False)

    if tipo_param:
        clientes = clientes.filter(tipo=tipo_param)

    if q:
        clientes = clientes.filter(
            Q(codigo__icontains=q)
            | Q(nombre__icontains=q)
            | Q(iniciales__icontains=q)
            | Q(ruc__icontains=q)
            | Q(tipo__icontains=q)
            | Q(pro__icontains=q)
        )

    clientes = clientes.order_by("nombre")

    if not clientes.exists():
        return Response({"detail": "No hay datos para exportar con los filtros seleccionados."}, status=status.HTTP_400_BAD_REQUEST)

    import io
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from django.http import HttpResponse
    from django.utils.timezone import localtime, now

    wb = Workbook()
    ws = wb.active
    ws.title = "Reporte Proveedores"

    # --- CABECERA CORPORATIVA ---
    ws.merge_cells('A1:B1')
    ws['A1'] = "VC CORPORATION"
    ws['A1'].font = Font(name='Arial Black', size=16, color="FF35A39C")
    ws['A1'].alignment = Alignment(horizontal='left')

    ws['A2'] = "OPTIMIZACIÓN Y AUTOMATIZACIÓN DE PROCESOS"
    ws['A2'].font = Font(name='Arial', size=8, bold=True, color="666666")

    ws.merge_cells('C1:F1')
    ws['C1'] = "REPORTE DE PROVEEDORES"
    ws['C1'].font = Font(name='Arial', size=14, bold=True)
    ws['C1'].alignment = Alignment(horizontal='center', vertical='center')

    # Fecha de generación
    current_time = localtime(now())
    ws['G2'] = f"Fecha: {current_time.strftime('%d/%m/%Y %H:%M')}"
    ws['G2'].font = Font(name='Arial', size=9, italic=True)
    ws['G2'].alignment = Alignment(horizontal='right')

    # --- ESTILOS DE TABLA ---
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name='Arial', bold=True, color="FFFFFF")
    even_row_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    thin_border = Border(
        left=Side(style='thin', color="CBD5E1"), 
        right=Side(style='thin', color="CBD5E1"), 
        top=Side(style='thin', color="CBD5E1"), 
        bottom=Side(style='thin', color="CBD5E1")
    )

    # HEADERS en Fila 4
    headers = ["CÓDIGO", "NOMBRE / RAZÓN SOCIAL", "INICIALES", "RUC", "TIPO", "ACTIVIDAD", "ESTADO"]
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col_num)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = thin_border

    # Anchos de columna
    column_widths = [15, 45, 12, 15, 12, 35, 12]
    for i, width in enumerate(column_widths, 1):
        ws.column_dimensions[ws.cell(row=4, column=i).column_letter].width = width

    # --- DATOS ---
    current_row = 5
    for r in clientes:
        tipo_desc = r.tipo
        if r.tipo == "0": tipo_desc = "Cliente"
        elif r.tipo == "01": tipo_desc = "Cliente/Prov"
        elif r.tipo == "1": tipo_desc = "Proveedor"

        row_data = [
            r.codigo,
            r.nombre.upper(),
            r.iniciales or "",
            r.ruc or "",
            tipo_desc,
            r.pro or "",
            "ACTIVO" if r.activo else "INACTIVO"
        ]
        
        for col_num, value in enumerate(row_data, 1):
            cell = ws.cell(row=current_row, column=col_num)
            cell.value = value
            cell.border = thin_border
            cell.font = Font(name='Arial', size=9)
            
            # Alineación específica
            if col_num in [2, 6]:  # Nombre, Actividad
                cell.alignment = left_align
            else:
                cell.alignment = center_align
            
            # Color de fila alterna
            if current_row % 2 == 0:
                cell.fill = even_row_fill
        
        current_row += 1

    # --- RESPUESTA ---
    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)
    
    filename = f"Reporte_Proveedores_{current_time.strftime('%Y%m%d_%H%M%S')}.xlsx"

    response = HttpResponse(
        excel_buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
# vc_tab_estado
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_estados(request):
    estados = vc_tab_estado.objects.filter(activo=True, cot=1).order_by("nombre")
    serializer = EstadoSerializer(estados, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_categorias(request):
    categorias = vc_tab_categorias.objects.filter(activo="1").order_by("nombre")
    serializer = CategoriasSerializer(categorias, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_tgasto(request):
    tgasto = vc_tab_tgastos.objects.filter(activo="1").order_by("codigo")
    serializer = TGastosSerializer(tgasto, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_tgasto_d(request):
    tgasto_d = vc_tab_tgastos_d.objects.filter(activo="1").order_by("nombre")
    serializer = TGastosDSerializer(tgasto_d, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_rittal(request):
    search = request.GET.get("search")
    limit = int(request.GET.get("limit", 15))

    queryset = vc_tab_rittal.objects.filter(activo="1")

    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search)
        )

    queryset = queryset.order_by("nombre")[:limit]
    serializer = RittalSerializer(queryset, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_rockwell(request):
    search = (request.GET.get("search") or "").strip()
    limit = int(request.GET.get("limit", 15))

    queryset = vc_tab_rockwell.objects.filter(activo="1")

    if search:
        queryset = queryset.filter(
            Q(codigo__icontains=search) |
            Q(codigo2__icontains=search) |
            Q(descripcion__icontains=search) |
            Q(ds__icontains=search)
        )

    queryset = queryset.order_by("codigo")[:limit]

    serializer = RockwellSerializer(queryset, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_ceyesa(request):
    search = request.GET.get("search")
    limit = int(request.GET.get("limit", 15))

    queryset = vc_tab_ceyesa.objects.filter(activo="1")

    if search:
        queryset = queryset.filter(
            Q(descripcion__icontains=search) |
            Q(codigo__icontains=search)
        )

    queryset = queryset.order_by("codigo")[:limit]
    serializer = CeyesaSerializer(queryset, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_hoffman(request):
    search = request.GET.get("search")
    limit = int(request.GET.get("limit", 15))

    queryset = vc_tab_hoffman.objects.filter(activo="1")

    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search)
        )

    queryset = queryset.order_by("nombre")[:limit]
    serializer = HoffmanSerializer(queryset, many=True)
    return Response(serializer.data)

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

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_proveedores(request):
    proveedores = vc_tab_tproveedor.objects.filter(activo="1").order_by("nombre")
    serializer = ProveedoresSerializer(proveedores, many=True)
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

##==========##
## REPORTES ##
##==========##


##============##
## AÃ‘O ACTUAL ##
##============##
@api_view(["GET"])
def anno_actual(request):
    try:
        cia = cont_cias.objects.get(cod="001")
        return Response({"anno": cia.anno})
    except cont_cias.DoesNotExist:
        return Response({"anno": timezone.now().year})


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

    # Convierte <p> en saltos de lÃ­nea
    for p in soup.find_all("p"):
        p.append("\n")

    text = soup.get_text()
    return text.strip()

##===============##
##   ALMACENES   ##
##===============##

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_almacenes(request):
    q = (request.GET.get("q", "") or "").strip()
    activo_param = (request.GET.get("activo", "todos") or "").strip()

    almacenes = sis_alm_tab_almacen.objects.all()

    if activo_param not in ("", "%", "todos", "ALL", "all", "Todos"):
        if str(activo_param).lower() in ("1", "true", "t", "activo"):
            almacenes = almacenes.filter(activo="1")
        elif str(activo_param).lower() in ("0", "false", "f", "inactivo"):
            almacenes = almacenes.filter(activo="0")

    if q:
        almacenes = almacenes.filter(
            Q(cod__icontains=q)
            | Q(nom__icontains=q)
            | Q(res__icontains=q)
        )

    almacenes = almacenes.order_by("cod")[:100]
    serializer = AlmacenSerializer(almacenes, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_almacen(request):
    data = request.data.copy()
    
    if not data.get('cod'):
        max_cod = -1
        todos = sis_alm_tab_almacen.objects.values_list('cod', flat=True)
        for c in todos:
            if c and str(c).isdigit():
                val = int(c)
                if val > max_cod:
                    max_cod = val
        data['cod'] = str(max_cod + 1).zfill(3)

    serializer = AlmacenSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def actualizar_almacen(request, cod):
    try:
        almacen = sis_alm_tab_almacen.objects.get(cod=cod)
    except sis_alm_tab_almacen.DoesNotExist:
        return Response({"detail": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = AlmacenSerializer(almacen, data=request.data, partial=(request.method == "PATCH"))
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_excel_almacenes(request):
    q = (request.GET.get("q", "") or "").strip()
    activo_param = (request.GET.get("activo", "todos") or "").strip()

    almacenes = sis_alm_tab_almacen.objects.all()

    if activo_param not in ("", "%", "todos", "ALL", "all", "Todos"):
        if str(activo_param).lower() in ("1", "true", "t", "activo"):
            almacenes = almacenes.filter(activo="1")
        elif str(activo_param).lower() in ("0", "false", "f", "inactivo"):
            almacenes = almacenes.filter(activo="0")

    if q:
        almacenes = almacenes.filter(
            Q(cod__icontains=q)
            | Q(nom__icontains=q)
            | Q(res__icontains=q)
        )

    almacenes = almacenes.order_by("cod")

    import io
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from django.http import HttpResponse
    from django.utils.timezone import localtime, now

    wb = Workbook()
    ws = wb.active
    ws.title = "Almacenes"

    # --- DISEÑO DE CABECERA (LOGO TIPO) ---
    ws.merge_cells('A1:B1')
    ws['A1'] = "VC CORPORATION"
    ws['A1'].font = Font(name='Arial Black', size=16, color="FF35A39C")
    ws['A1'].alignment = Alignment(horizontal='left')

    ws['A2'] = "OPTIMIZACIÓN Y AUTOMATIZACIÓN DE PROCESOS"
    ws['A2'].font = Font(name='Arial', size=8, bold=True, color="666666")

    ws.merge_cells('C1:F1')
    ws['C1'] = "REPORTE DE ALMACENES"
    ws['C1'].font = Font(name='Arial', size=14, bold=True)
    ws['C1'].alignment = Alignment(horizontal='center', vertical='center')

    # Fecha de generación
    current_time = localtime(now())
    ws['F2'] = f"Fecha: {current_time.strftime('%d/%m/%Y %H:%M')}"
    ws['F2'].font = Font(name='Arial', size=9, italic=True)
    ws['F2'].alignment = Alignment(horizontal='right')

    # --- ENCABEZADOS DE TABLA ---
    headers = ["CÓDIGO", "NOMBRE", "RESPONSABLE", "TELÉFONO", "DIRECCIÓN", "ESTADO"]
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name='Arial', bold=True, color="FFFFFF")
    header_alignment = Alignment(horizontal='center', vertical='center')
    thin_border = Border(
        left=Side(style='thin'), 
        right=Side(style='thin'), 
        top=Side(style='thin'), 
        bottom=Side(style='thin')
    )

    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col_num)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = header_alignment
        cell.border = thin_border

    # --- DATOS ---
    for row_num, a in enumerate(almacenes, 5):
        estado_str = "ACTIVO" if str(a.activo) == "1" else "INACTIVO"
        
        row_data = [
            a.cod or "",
            (a.nom or "").upper(),
            a.res or "",
            a.tel or "",
            a.dir or "",
            estado_str
        ]
        
        for col_num, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col_num)
            cell.value = value
            cell.border = thin_border
            cell.font = Font(name='Arial', size=10)
            
            if col_num in [1, 4, 6]: 
                cell.alignment = Alignment(horizontal='center')
            else:
                cell.alignment = Alignment(horizontal='left')

    # --- AJUSTE DE ANCHO DE COLUMNAS ---
    column_widths = [10, 40, 25, 15, 40, 12]
    # Usamos letras fijas A, B, C, D, E, F para mayor compatibilidad
    for i, col_letter in enumerate(['A', 'B', 'C', 'D', 'E', 'F']):
        ws.column_dimensions[col_letter].width = column_widths[i]

    # --- RESPUESTA ---
    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)
    
    filename = f"Reporte_Almacenes_{current_time.strftime('%Y%m%d_%H%M%S')}.xlsx"

    response = HttpResponse(
        excel_buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response

##===================##
## GRUPO ANALITICO  ##
##===================##

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_grupos_analiticos(request):
    q = (request.GET.get("q", "") or "").strip()
    activo_param = (request.GET.get("activo", "todos") or "").strip()

    grupos = sis_alm_tab_grupo.objects.all()

    if activo_param not in ("", "%", "todos", "ALL", "all", "Todos"):
        if str(activo_param).lower() in ("1", "true", "t", "activo"):
            grupos = grupos.filter(activo="1")
        elif str(activo_param).lower() in ("0", "false", "f", "inactivo"):
            grupos = grupos.filter(activo="0")

    if q:
        grupos = grupos.filter(
            Q(cod__icontains=q)
            | Q(nom__icontains=q)
        )

    grupos = grupos.order_by("cod")[:100]
    serializer = GrupoAnaliticoSerializer(grupos, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_grupo_analitico(request):
    data = request.data.copy()
    
    if not data.get('cod'):
        max_cod = -1
        todos = sis_alm_tab_grupo.objects.values_list('cod', flat=True)
        for c in todos:
            if c and str(c).isdigit():
                val = int(c)
                if val > max_cod:
                    max_cod = val
        # El DDL dice que cod es varchar(12), pero el usuario quiere como almacenes (zfill 3)
        data['cod'] = str(max_cod + 1).zfill(3)

    serializer = GrupoAnaliticoSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def actualizar_grupo_analitico(request, cod):
    try:
        grupo = sis_alm_tab_grupo.objects.get(cod=cod)
    except sis_alm_tab_grupo.DoesNotExist:
        return Response({"detail": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = GrupoAnaliticoSerializer(grupo, data=request.data, partial=(request.method == "PATCH"))
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_excel_grupos_analiticos(request):
    q = (request.GET.get("q", "") or "").strip()
    activo_param = (request.GET.get("activo", "todos") or "").strip()

    grupos = sis_alm_tab_grupo.objects.all()

    if activo_param not in ("", "%", "todos", "ALL", "all", "Todos"):
        if str(activo_param).lower() in ("1", "true", "t", "activo"):
            grupos = grupos.filter(activo="1")
        elif str(activo_param).lower() in ("0", "false", "f", "inactivo"):
            grupos = grupos.filter(activo="0")

    if q:
        grupos = grupos.filter(
            Q(cod__icontains=q)
            | Q(nom__icontains=q)
        )

    grupos = grupos.order_by("cod")

    import io
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from django.http import HttpResponse
    from django.utils.timezone import localtime, now

    wb = Workbook()
    ws = wb.active
    ws.title = "Grupo Analitico"

    # --- DISEÑO DE CABECERA ---
    ws.merge_cells('A1:B1')
    ws['A1'] = "VC CORPORATION"
    ws['A1'].font = Font(name='Arial Black', size=16, color="FF35A39C")
    ws['A1'].alignment = Alignment(horizontal='left')

    ws['A2'] = "OPTIMIZACIÓN Y AUTOMATIZACIÓN DE PROCESOS"
    ws['A2'].font = Font(name='Arial', size=8, bold=True, color="666666")

    ws.merge_cells('C1:D1')
    ws['C1'] = "REPORTE DE GRUPOS ANALÍTICOS"
    ws['C1'].font = Font(name='Arial', size=14, bold=True)
    ws['C1'].alignment = Alignment(horizontal='center', vertical='center')

    # Fecha de generación
    current_time = localtime(now())
    ws['D2'] = f"Fecha: {current_time.strftime('%d/%m/%Y %H:%M')}"
    ws['D2'].font = Font(name='Arial', size=9, italic=True)
    ws['D2'].alignment = Alignment(horizontal='right')

    # --- ENCABEZADOS DE TABLA ---
    headers = ["CÓDIGO", "NOMBRE", "ESTADO"]
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name='Arial', bold=True, color="FFFFFF")
    header_alignment = Alignment(horizontal='center', vertical='center')
    thin_border = Border(
        left=Side(style='thin'), 
        right=Side(style='thin'), 
        top=Side(style='thin'), 
        bottom=Side(style='thin')
    )

    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col_num)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = header_alignment
        cell.border = thin_border

    # --- DATOS ---
    for row_num, g in enumerate(grupos, 5):
        estado_str = "ACTIVO" if str(g.activo) == "1" else "INACTIVO"
        
        row_data = [
            g.cod or "",
            (g.nom or "").upper(),
            estado_str
        ]
        
        for col_num, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col_num)
            cell.value = value
            cell.border = thin_border
            cell.font = Font(name='Arial', size=10)
            
            if col_num in [1, 3]: 
                cell.alignment = Alignment(horizontal='center')
            else:
                cell.alignment = Alignment(horizontal='left')

    # --- AJUSTE DE ANCHO DE COLUMNAS ---
    column_widths = [15, 60, 15]
    for i, col_letter in enumerate(['A', 'B', 'C']):
        ws.column_dimensions[col_letter].width = column_widths[i]

    # --- RESPUESTA ---
    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)
    
    filename = f"Reporte_Grupos_Analiticos_{current_time.strftime('%Y%Y%m%d_%H%M%S')}.xlsx"

    response = HttpResponse(
        excel_buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response

##===================##
##    PRODUCTOS      ##
##===================##

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_unidades_medida(request):
    unidades = AlmTabUmed.objects.all().order_by("nom")
    serializer = AlmTabUmedSerializer(unidades, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_articulos(request):
    q = (request.GET.get("q", "") or "").strip()
    activo_param = (request.GET.get("activo", "todos") or "").strip()
    grupo_param = (request.GET.get("grupo", "todos") or "").strip()
    
    # Nuevos parámetros para búsqueda por campo específico
    campo = request.GET.get("campo", "").strip()
    valor = request.GET.get("valor", "").strip()

    articulos = sis_alm_tab_articulos.objects.all()

    if activo_param not in ("", "%", "todos", "ALL", "all", "Todos"):
        if str(activo_param).lower() in ("1", "true", "t", "activo"):
            articulos = articulos.filter(activo="1")
        elif str(activo_param).lower() in ("0", "false", "f", "inactivo"):
            articulos = articulos.filter(activo="0")
    
    if grupo_param != "todos":
        articulos = articulos.filter(gru=grupo_param)

    # Búsqueda por campo específico (si se proporciona)
    if campo and valor:
        lookup = {
            "Registro": "reg",
            "Codigo": "cod",
            "Nombre": "nom",
            "Grupo": "gru",
            "UM": "um",
            "Marca": "det",
            "Cantidad": "can",
            "Estado": "est",
            "Codigo Fabricante": "ocod",
            "Proveedor": "pro",
            "Activo": "activo",
        }.get(campo)
        
        if lookup:
            filter_kwargs = {f"{lookup}__icontains": valor}
            articulos = articulos.filter(**filter_kwargs)
    elif q:
        # Búsqueda general original
        articulos = articulos.filter(
            Q(cod__icontains=q)
            | Q(nom__icontains=q)
            | Q(ocod__icontains=q)
        )

    # Paginación básica para evitar saturar el navegador si hay miles de productos
    limit = 500
    articulos = articulos.order_by("reg")[:limit]
    serializer = ArticuloSerializer(articulos, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_articulo(request):
    data = request.data.copy()
    
    if not data.get('cod'):
        max_cod = -1
        # Buscamos el máximo código numérico existente
        todos = sis_alm_tab_articulos.objects.values_list('cod', flat=True)
        for c in todos:
            if c and str(c).isdigit():
                try:
                    val = int(c)
                    if val > max_cod:
                        max_cod = val
                except ValueError:
                    continue
        data['cod'] = str(max_cod + 1).zfill(3)

    serializer = ArticuloSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def actualizar_articulo(request, reg):
    try:
        articulo = sis_alm_tab_articulos.objects.get(reg=reg)
    except sis_alm_tab_articulos.DoesNotExist:
        return Response({"detail": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = ArticuloSerializer(articulo, data=request.data, partial=(request.method == "PATCH"))
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def eliminar_articulo(request, reg):
    try:
        articulo = sis_alm_tab_articulos.objects.get(reg=reg)
        articulo.delete()
        return Response({"detail": "Eliminado correctamente"}, status=status.HTTP_200_OK)
    except sis_alm_tab_articulos.DoesNotExist:
        return Response({"detail": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_excel_articulos(request):
    q = (request.GET.get("q", "") or "").strip()
    activo_param = (request.GET.get("activo", "todos") or "").strip()
    grupo_param = (request.GET.get("grupo", "todos") or "").strip()

    articulos = sis_alm_tab_articulos.objects.all()

    if activo_param not in ("", "%", "todos", "ALL", "all", "Todos"):
        if str(activo_param).lower() in ("1", "true", "t", "activo"):
            articulos = articulos.filter(activo="1")
        elif str(activo_param).lower() in ("0", "false", "f", "inactivo"):
            articulos = articulos.filter(activo="0")
    
    if grupo_param != "todos":
        articulos = articulos.filter(gru=grupo_param)

    if q:
        articulos = articulos.filter(
            Q(cod__icontains=q)
            | Q(nom__icontains=q)
        )

    articulos = articulos.order_by("reg")

    # Limitamos para el excel también si es muy grande
    articulos = articulos[:2000] 

    import io
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from django.http import HttpResponse
    from django.utils.timezone import localtime, now

    wb = Workbook()
    ws = wb.active
    ws.title = "Productos"

    # --- DISEÑO DE CABECERA ---
    ws.merge_cells('A1:B1')
    ws['A1'] = "VC CORPORATION"
    ws['A1'].font = Font(name='Arial Black', size=16, color="FF35A39C")
    ws['A1'].alignment = Alignment(horizontal='left')

    ws['A2'] = "OPTIMIZACIÓN Y AUTOMATIZACIÓN DE PROCESOS"
    ws['A2'].font = Font(name='Arial', size=8, bold=True, color="666666")

    ws.merge_cells('C1:G1')
    ws['C1'] = "REPORTE DE PRODUCTOS / ARTÍCULOS"
    ws['C1'].font = Font(name='Arial', size=14, bold=True)
    ws['C1'].alignment = Alignment(horizontal='center', vertical='center')

    # Fecha de generación
    current_time = localtime(now())
    ws['H2'] = f"Fecha: {current_time.strftime('%d/%m/%Y %H:%M')}"
    ws['H2'].font = Font(name='Arial', size=9, italic=True)
    ws['H2'].alignment = Alignment(horizontal='right')

    # --- ENCABEZADOS DE TABLA ---
    headers = ["REG", "CÓDIGO", "NOMBRE", "GRUPO", "U.M.", "STOCK", "P. SOLES", "ESTADO"]
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name='Arial', bold=True, color="FFFFFF")
    header_alignment = Alignment(horizontal='center', vertical='center')
    thin_border = Border(
        left=Side(style='thin'), 
        right=Side(style='thin'), 
        top=Side(style='thin'), 
        bottom=Side(style='thin')
    )

    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col_num)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = header_alignment
        cell.border = thin_border

    # Cargar nombres de grupos para mostrar en el Excel
    dict_grupos = {g.cod: g.nom for g in sis_alm_tab_grupo.objects.all()}

    # --- DATOS ---
    for row_num, a in enumerate(articulos, 5):
        estado_str = "ACTIVO" if str(a.activo) == "1" else "INACTIVO"
        grupo_nom = dict_grupos.get(a.gru, a.gru)
        
        row_data = [
            a.reg,
            a.cod or "",
            (a.nom or "").upper(),
            grupo_nom,
            a.um or "",
            a.can or 0,
            a.sol or 0,
            estado_str
        ]
        
        for col_num, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col_num)
            cell.value = value
            cell.border = thin_border
            cell.font = Font(name='Arial', size=10)
            
            if col_num in [1, 2, 5, 8]: 
                cell.alignment = Alignment(horizontal='center')
            elif col_num in [6, 7]:
                cell.alignment = Alignment(horizontal='right')
                cell.number_format = '#,##0.00'
            else:
                cell.alignment = Alignment(horizontal='left')

    # --- AJUSTE DE ANCHO DE COLUMNAS ---
    column_widths = [10, 15, 60, 25, 10, 10, 12, 12]
    for i, col_letter in enumerate(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']):
        ws.column_dimensions[col_letter].width = column_widths[i]

    # --- RESPUESTA ---
    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)
    
    filename = f"Reporte_Productos_{current_time.strftime('%Y%Y%m%d_%H%M%S')}.xlsx"

    response = HttpResponse(
        excel_buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response

# ========================================================================================
# CENTROS DE COSTO
# ========================================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_ccostos(request):
    """
    Lista los centros de costo con soporte para filtrado por campo y valor.
    """
    activo = request.query_params.get("activo", "todos")
    campo = request.query_params.get("campo")
    valor = request.query_params.get("valor")

    queryset = sis_alm_tab_ccosto.objects.all()

    if activo != "todos":
        queryset = queryset.filter(activo=activo)

    if campo and valor:
        lookup = {
            "Codigo": "cod__icontains",
            "Nombre": "nom__icontains",
        }.get(campo)
        
        if lookup:
            queryset = queryset.filter(**{lookup: valor})

    serializer = CcostoSerializer(queryset.order_by("cod"), many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_ccosto(request):
    serializer = CcostoSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def actualizar_ccosto(request, cod):
    ccosto = get_object_or_404(sis_alm_tab_ccosto, cod=cod)
    serializer = CcostoSerializer(ccosto, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def eliminar_ccosto(request, cod):
    ccosto = get_object_or_404(sis_alm_tab_ccosto, cod=cod)
    ccosto.delete()
    return Response({"detail": "Centro de costo eliminado."}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_excel_ccostos(request):
    """Exporta el catálogo de centros de costo a Excel."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from django.http import HttpResponse

    activo = request.GET.get("activo", "todos")
    campo  = request.GET.get("campo", "")
    valor  = request.GET.get("valor", "")

    qs = sis_alm_tab_ccosto.objects.all().order_by("cod")
    if activo != "todos":
        qs = qs.filter(activo=activo)
    if campo and valor:
        lookup = {"Codigo": "cod__icontains", "Nombre": "nom__icontains"}.get(campo)
        if lookup:
            qs = qs.filter(**{lookup: valor})

    WHITE          = "FFFFFF"
    COLOR_HEADER   = "1E293B"
    COLOR_SUBHEAD  = "334155"
    COLOR_ACCENT   = "2563EB"
    COLOR_ROW_ALT  = "F8FAFC"
    thin = Side(style="thin", color="E2E8F0")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Centros de Costo"

    ws.merge_cells("A1:C1")
    c = ws["A1"]
    c.value = "VC CORPORATION S.A.C."
    c.font = Font(name="Calibri", bold=True, size=14, color=WHITE)
    c.fill = PatternFill("solid", fgColor=COLOR_HEADER)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:C2")
    c = ws["A2"]
    c.value = "CATÁLOGO DE CENTROS DE COSTO"
    c.font = Font(name="Calibri", bold=True, size=11, color=WHITE)
    c.fill = PatternFill("solid", fgColor=COLOR_ACCENT)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 22

    for col, h in enumerate(["CÓDIGO", "NOMBRE", "ACTIVO"], start=1):
        c = ws.cell(row=3, column=col, value=h)
        c.font = Font(name="Calibri", bold=True, size=10, color=WHITE)
        c.fill = PatternFill("solid", fgColor=COLOR_SUBHEAD)
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = border
    ws.row_dimensions[3].height = 18

    for row_idx, u in enumerate(qs, start=4):
        fill = PatternFill("solid", fgColor=COLOR_ROW_ALT if row_idx % 2 == 0 else WHITE)
        for col, val in enumerate([u.cod, u.nom or "", "Sí" if str(u.activo) == "1" else "No"], start=1):
            c = ws.cell(row=row_idx, column=col, value=val)
            c.font = Font(name="Calibri", size=10)
            c.fill = fill
            c.alignment = Alignment(vertical="center")
            c.border = border

    ws.column_dimensions["A"].width = 14
    ws.column_dimensions["B"].width = 40
    ws.column_dimensions["C"].width = 12

    response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response["Content-Disposition"] = 'attachment; filename="centros_costo.xlsx"'
    wb.save(response)
    return response



# ============================================================
# UNIDADES DE MEDIDA  (alm_umed)
# ============================================================
from .models import AlmUmed

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_unidades_medida(request):
    """Lista todas las unidades de medida con búsqueda por código o nombre."""
    q = request.GET.get("q", "").strip()
    qs = AlmUmed.objects.all().order_by("cod")
    if q:
        from django.db.models import Q
        qs = qs.filter(Q(cod__icontains=q) | Q(nom__icontains=q) | Q(abr__icontains=q))

    data = [
        {"cod": u.cod, "nom": u.nom or "", "abr": u.abr or ""}
        for u in qs
    ]
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_unidad_medida(request):
    """Crea una nueva unidad de medida."""
    cod = (request.data.get("cod") or "").strip().upper()
    nom = (request.data.get("nom") or "").strip().upper()
    abr = (request.data.get("abr") or "").strip().upper()

    if not cod:
        return Response({"error": "El código es requerido."}, status=400)
    if not nom:
        return Response({"error": "El nombre es requerido."}, status=400)
    if AlmUmed.objects.filter(cod=cod).exists():
        return Response({"error": f"Ya existe una unidad con código '{cod}'."}, status=400)

    umed = AlmUmed.objects.create(cod=cod, nom=nom, abr=abr)
    return Response({"cod": umed.cod, "nom": umed.nom, "abr": umed.abr}, status=201)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def actualizar_unidad_medida(request, cod):
    """Actualiza nombre y abreviatura de una unidad de medida."""
    umed = get_object_or_404(AlmUmed, cod=cod)
    nom = (request.data.get("nom") or "").strip().upper()
    abr = (request.data.get("abr") or "").strip().upper()

    if not nom:
        return Response({"error": "El nombre es requerido."}, status=400)

    umed.nom = nom
    umed.abr = abr
    umed.save()
    return Response({"cod": umed.cod, "nom": umed.nom, "abr": umed.abr})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def eliminar_unidad_medida(request, cod):
    """Elimina una unidad de medida."""
    umed = get_object_or_404(AlmUmed, cod=cod)
    umed.delete()
    return Response({"detail": "Unidad de medida eliminada."}, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_excel_unidades_medida(request):
    """Exporta el catálogo de unidades de medida a Excel (openpyxl)."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from django.http import HttpResponse

    q = request.GET.get("q", "").strip()
    qs = AlmUmed.objects.all().order_by("cod")
    if q:
        from django.db.models import Q
        qs = qs.filter(Q(cod__icontains=q) | Q(nom__icontains=q) | Q(abr__icontains=q))

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Unidades de Medida"

    # --- Paleta corporativa ---
    COLOR_HEADER   = "1E293B"   # slate-900
    COLOR_SUBHEAD  = "334155"   # slate-700
    COLOR_ACCENT   = "2563EB"   # blue-600
    COLOR_ROW_ALT  = "F8FAFC"   # slate-50
    WHITE          = "FFFFFF"

    thin = Side(style="thin", color="E2E8F0")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    # ---- Fila 1: Empresa ----
    ws.merge_cells("A1:C1")
    c = ws["A1"]
    c.value = "VC CORPORATION S.A.C."
    c.font = Font(name="Calibri", bold=True, size=14, color=WHITE)
    c.fill = PatternFill("solid", fgColor=COLOR_HEADER)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    # ---- Fila 2: Título ----
    ws.merge_cells("A2:C2")
    c = ws["A2"]
    c.value = "CATÁLOGO DE UNIDADES DE MEDIDA"
    c.font = Font(name="Calibri", bold=True, size=11, color=WHITE)
    c.fill = PatternFill("solid", fgColor=COLOR_ACCENT)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 22

    # ---- Fila 3: encabezados columnas ----
    headers = ["CÓDIGO", "NOMBRE", "ABREVIATURA"]
    for col, h in enumerate(headers, start=1):
        c = ws.cell(row=3, column=col, value=h)
        c.font = Font(name="Calibri", bold=True, size=10, color=WHITE)
        c.fill = PatternFill("solid", fgColor=COLOR_SUBHEAD)
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = border
    ws.row_dimensions[3].height = 18

    # ---- Datos ----
    for row_idx, u in enumerate(qs, start=4):
        fill = PatternFill("solid", fgColor=COLOR_ROW_ALT) if row_idx % 2 == 0 else PatternFill("solid", fgColor=WHITE)
        row_data = [u.cod, u.nom or "", u.abr or ""]
        for col, val in enumerate(row_data, start=1):
            c = ws.cell(row=row_idx, column=col, value=val)
            c.font = Font(name="Calibri", size=10)
            c.fill = fill
            c.alignment = Alignment(vertical="center", wrap_text=True)
            c.border = border

    # Anchos de columna
    ws.column_dimensions["A"].width = 12
    ws.column_dimensions["B"].width = 35
    ws.column_dimensions["C"].width = 18

    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = 'attachment; filename="unidades_medida.xlsx"'
    wb.save(response)
    return response


# ============================================================
# DOCUMENTOS ALMACÉN  (sis_alm_tab_doc)
# ============================================================
from .models import SisAlmTabDoc

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lista_doc_almacen(request):
    """Lista todos los documentos de almacén con búsqueda."""
    q      = request.GET.get("q", "").strip()
    activo = request.GET.get("activo", "todos")

    qs = SisAlmTabDoc.objects.all().order_by("cod")

    if activo != "todos":
        qs = qs.filter(activo=activo)

    if q:
        from django.db.models import Q
        qs = qs.filter(Q(cod__icontains=q) | Q(nom__icontains=q))

    data = [{"cod": d.cod, "nom": d.nom or "", "activo": d.activo or "0"} for d in qs]
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_doc_almacen(request):
    """Crea un nuevo documento de almacén."""
    cod    = (request.data.get("cod") or "").strip()
    nom    = (request.data.get("nom") or "").strip()
    activo = "1" if request.data.get("activo") in [True, "1", 1, "true", "True"] else "0"

    if not cod:
        return Response({"error": "El código es requerido."}, status=400)
    if not nom:
        return Response({"error": "El nombre es requerido."}, status=400)
    if SisAlmTabDoc.objects.filter(cod=cod).exists():
        return Response({"error": f"Ya existe un documento con código '{cod}'."}, status=400)

    doc = SisAlmTabDoc.objects.create(cod=cod, nom=nom, activo=activo)
    return Response({"cod": doc.cod, "nom": doc.nom, "activo": doc.activo}, status=201)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def actualizar_doc_almacen(request, cod):
    """Actualiza nombre y estado de un documento de almacén."""
    doc    = get_object_or_404(SisAlmTabDoc, cod=cod)
    nom    = (request.data.get("nom") or "").strip()
    activo = "1" if request.data.get("activo") in [True, "1", 1, "true", "True"] else "0"

    if not nom:
        return Response({"error": "El nombre es requerido."}, status=400)

    doc.nom    = nom
    doc.activo = activo
    doc.save()
    return Response({"cod": doc.cod, "nom": doc.nom, "activo": doc.activo})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def eliminar_doc_almacen(request, cod):
    """Elimina un documento de almacén."""
    doc = get_object_or_404(SisAlmTabDoc, cod=cod)
    doc.delete()
    return Response({"detail": "Documento eliminado."}, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_excel_doc_almacen(request):
    """Exporta el catálogo de documentos de almacén a Excel."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from django.http import HttpResponse

    q      = request.GET.get("q", "").strip()
    activo = request.GET.get("activo", "todos")

    qs = SisAlmTabDoc.objects.all().order_by("cod")
    if activo != "todos":
        qs = qs.filter(activo=activo)
    if q:
        from django.db.models import Q
        qs = qs.filter(Q(cod__icontains=q) | Q(nom__icontains=q))

    WHITE         = "FFFFFF"
    COLOR_HEADER  = "1E293B"
    COLOR_SUBHEAD = "334155"
    COLOR_ACCENT  = "2563EB"
    COLOR_ROW_ALT = "F8FAFC"
    thin   = Side(style="thin", color="E2E8F0")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Documentos Almacén"

    ws.merge_cells("A1:C1")
    c = ws["A1"]
    c.value = "VC CORPORATION S.A.C."
    c.font  = Font(name="Calibri", bold=True, size=14, color=WHITE)
    c.fill  = PatternFill("solid", fgColor=COLOR_HEADER)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:C2")
    c = ws["A2"]
    c.value = "CATÁLOGO DE DOCUMENTOS DE ALMACÉN"
    c.font  = Font(name="Calibri", bold=True, size=11, color=WHITE)
    c.fill  = PatternFill("solid", fgColor=COLOR_ACCENT)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 22

    for col, h in enumerate(["CÓDIGO", "NOMBRE / DESCRIPCIÓN", "ACTIVO"], start=1):
        c = ws.cell(row=3, column=col, value=h)
        c.font  = Font(name="Calibri", bold=True, size=10, color=WHITE)
        c.fill  = PatternFill("solid", fgColor=COLOR_SUBHEAD)
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = border
    ws.row_dimensions[3].height = 18

    for row_idx, d in enumerate(qs, start=4):
        fgColor = COLOR_ROW_ALT if row_idx % 2 == 0 else WHITE
        fill = PatternFill("solid", fgColor=fgColor)
        for col, val in enumerate([d.cod, d.nom or "", "Sí" if d.activo == "1" else "No"], start=1):
            c = ws.cell(row=row_idx, column=col, value=val)
            c.font  = Font(name="Calibri", size=10)
            c.fill  = fill
            c.alignment = Alignment(vertical="center")
            c.border = border

    ws.column_dimensions["A"].width = 10
    ws.column_dimensions["B"].width = 45
    ws.column_dimensions["C"].width = 12

    response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response["Content-Disposition"] = 'attachment; filename="documentos_almacen.xlsx"'
    wb.save(response)
    return response

# ============================================================
# CÓDIGO DE BARRAS (productos)
# ============================================================
from .models import alm_articulos

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_excel_barras(request):
    """Genera un reporte de Código de Barras filtrado por inicio/fin."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from django.http import HttpResponse

    codigo_inicial = request.GET.get("codigoInicial", "").strip()
    codigo_final = request.GET.get("codigoFinal", "").strip()
    solo_barras = request.GET.get("soloCodigoBarras") in ["true", "1", True]

    qs = alm_articulos.objects.filter(activo="1").order_by("cod")
    
    if codigo_inicial and codigo_final:
        qs = qs.filter(cod__gte=codigo_inicial, cod__lte=codigo_final)
    elif codigo_inicial:
        qs = qs.filter(cod__gte=codigo_inicial)
    elif codigo_final:
        qs = qs.filter(cod__lte=codigo_final)

    WHITE         = "FFFFFF"
    COLOR_HEADER  = "1E293B"
    COLOR_SUBHEAD = "334155"
    COLOR_ACCENT  = "059669" # Emerald
    COLOR_ROW_ALT = "F8FAFC"
    
    thin   = Side(style="thin", color="E2E8F0")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Códigos de Barras"

    ws.merge_cells("A1:C1")
    c = ws["A1"]
    c.value = "VC CORPORATION S.A.C."
    c.font  = Font(name="Calibri", bold=True, size=14, color=WHITE)
    c.fill  = PatternFill("solid", fgColor=COLOR_HEADER)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:C2")
    c = ws["A2"]
    if solo_barras:
        c.value = "LISTADO DE CÓDIGO DE BARRAS (MODO SOLO BARRAS)"
    else:
        c.value = "REPORTE DE CÓDIGO DE BARRAS"
    c.font  = Font(name="Calibri", bold=True, size=11, color=WHITE)
    c.fill  = PatternFill("solid", fgColor=COLOR_ACCENT)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 22

    for col, h in enumerate(["CÓDIGO DE BARRAS", "DESCRIPCIÓN", "ESTADO"], start=1):
        c = ws.cell(row=3, column=col, value=h)
        c.font  = Font(name="Calibri", bold=True, size=10, color=WHITE)
        c.fill  = PatternFill("solid", fgColor=COLOR_SUBHEAD)
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = border
    ws.row_dimensions[3].height = 18

    for row_idx, d in enumerate(qs, start=4):
        fgColor = COLOR_ROW_ALT if row_idx % 2 == 0 else WHITE
        fill = PatternFill("solid", fgColor=fgColor)
        
        # Formateado con asteriscos para fuentes 3of9
        codigo_formateado = f"*{d.cod}*"
        descripcion = d.nom or ""
        if solo_barras:
            descripcion = "---"

        for col, val in enumerate([codigo_formateado, descripcion, "Disponible"], start=1):
            c = ws.cell(row=row_idx, column=col, value=val)
            c.font  = Font(name="Calibri", size=10)
            c.fill  = fill
            c.alignment = Alignment(vertical="center")
            c.border = border

    ws.column_dimensions["A"].width = 25
    ws.column_dimensions["B"].width = 50
    ws.column_dimensions["C"].width = 12

    response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response["Content-Disposition"] = 'attachment; filename="reporte_barras.xlsx"'
    wb.save(response)
    return response

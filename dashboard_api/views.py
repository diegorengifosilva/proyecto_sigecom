from datetime import datetime
from decimal import Decimal
from django.db.models import Sum, Count, Avg, ExpressionWrapper, F, DecimalField
from django.db.models.functions import Coalesce, ExtractMonth
from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import Usuario
from core.models import Cliente, ObjetivoAnual, ObjetivoAnualArea
from cotizaciones_api.models import Cotizacion, CotizacionServicio, CotizacionApertura
from dashboard_api.serializers import ObjetivoAnualSerializer

@api_view(["GET", "POST", "PUT"])
@permission_classes([IsAuthenticated])
def objetivos_anuales(request):
    usuario_codigo = request.user.usuario

    # =================
    # LISTAR (Global)
    # =================
    if request.method == "GET":
        anno = request.query_params.get("anno")

        if not anno:
            return Response({"error": "Debe enviar el año"}, status=status.HTTP_400_BAD_REQUEST)

        objetivos = ObjetivoAnual.objects.prefetch_related("areas").filter(
            anno=anno,
            activo=True
        )

        if objetivos.exists():
            serializer = ObjetivoAnualSerializer(objetivos, many=True)
            return Response(serializer.data)
        else:
            return Response(
                {"message": "No existen objetivos activos para ese año"},
                status=status.HTTP_200_OK
            )

    # =================
    # CREAR (Global)
    # =================
    if request.method == "POST":
        anno_post = request.data.get("anno")
        ObjetivoAnual.objects.filter(
            anno=anno_post,
            activo=True
        ).update(activo=False)

        serializer = ObjetivoAnualSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(id_usuario=request.user) 
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # =================
    # ACTUALIZAR
    # =================
    if request.method == "PUT":
        anno = request.data.get("anno")
        try:
            objetivo = ObjetivoAnual.objects.get(
                anno=anno,
                activo=True
            )
        except ObjetivoAnual.DoesNotExist:
            return Response({"error": "No existe ese objetivo"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ObjetivoAnualSerializer(objetivo, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def logrado_dashboard(request):
    anno = int(request.GET.get("anno", datetime.now().year))
    mes_actual_param = request.GET.get("mes", "")
    if not mes_actual_param or mes_actual_param == "%":
        mes_actual = datetime.now().month
    else:
        try:
            mes_actual = int(mes_actual_param)
        except ValueError:
            mes_actual = datetime.now().month

    print(f"DEBUG: Año = {anno}, Mes actual = {mes_actual}")

    # Cotizaciones aprobadas del año (estado_envio = 2)
    cotizaciones_anuales = Cotizacion.objects.filter(
        anno=anno,
        estado_envio=2,
    )
    print(f"DEBUG: Cotizaciones anuales encontradas = {cotizaciones_anuales.count()}")

    # Cotizaciones del mes actual
    cotizaciones_mensuales = cotizaciones_anuales.filter(
        mes=mes_actual
    )
    print(f"DEBUG: Cotizaciones mensuales encontradas = {cotizaciones_mensuales.count()}")

    utilidad_expr = ExpressionWrapper(
        F("utilidad") * F("cantidad_hombres") * F("costo_hombre_dia"),
        output_field=DecimalField(max_digits=18, decimal_places=2),
    )

    def calcular_logrado(cotizaciones):
        total_hh = Decimal("0.00")
        total_utilidad = Decimal("0.00")

        ids_registro = [coti.id_registro for coti in cotizaciones]
        if not ids_registro:
            return Decimal("0.00")

        # HH PROPIOS
        hh_agg = CotizacionServicio.objects.filter(
            id_registro__in=ids_registro,
            codigo_servicio__regex=r"^\d{3}4",
            nivel=2,
        ).aggregate(
            total=Coalesce(Sum("cotizado_total"), Decimal("0.00"), output_field=DecimalField(max_digits=18, decimal_places=2))
        )
        total_hh = hh_agg["total"]

        # UTILIDAD
        utilidad_agg = CotizacionServicio.objects.filter(
            id_registro__in=ids_registro,
        ).aggregate(
            total=Coalesce(Sum(utilidad_expr), Decimal("0.00"))
        )
        total_utilidad = utilidad_agg["total"]

        return total_hh + total_utilidad

    total_anual = calcular_logrado(cotizaciones_anuales)
    total_mensual = calcular_logrado(cotizaciones_mensuales)

    print(f"DEBUG: Total anual = {total_anual}, Total mensual = {total_mensual}")

    return JsonResponse({
        "anual": float(total_anual),
        "mensual": float(total_mensual),
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def kpis_dashboard(request):
    anno = int(request.GET.get("anno", datetime.now().year))
    mes_actual_param = request.GET.get("mes", "")
    if not mes_actual_param or mes_actual_param == "%":
        mes_actual_num = datetime.now().month
    else:
        try:
            mes_actual_num = int(mes_actual_param)
        except ValueError:
            mes_actual_num = datetime.now().month
    
    # Manejo de mes anterior para variaciones
    mes_anterior_num = 12 if mes_actual_num == 1 else mes_actual_num - 1
    anno_para_mes_anterior = anno - 1 if mes_actual_num == 1 else anno

    # ==========================================
    # 1. QUERIES BASE (Cotizaciones y Ventas)
    # ==========================================
    # Cotizaciones (Ofertas)
    qs_cot_anual = Cotizacion.objects.filter(anno=anno)
    qs_cot_mes = qs_cot_anual.filter(mes=mes_actual_num)
    qs_cot_prev = Cotizacion.objects.filter(anno=anno_para_mes_anterior, mes=mes_anterior_num)

    # Ventas Reales (Órdenes de Compra Adjudicadas estado_orden=1)
    qs_ventas_anual = CotizacionApertura.objects.filter(anno=anno, estado_orden=1)
    qs_ventas_mes = qs_ventas_anual.annotate(m=ExtractMonth("fecha_orden")).filter(m=mes_actual_num)
    qs_ventas_prev = CotizacionApertura.objects.filter(anno=anno_para_mes_anterior, estado_orden=1)\
                        .annotate(m=ExtractMonth("fecha_orden")).filter(m=mes_anterior_num)

    # ==========================================
    # 2. CÁLCULOS DE MÉTRICAS
    # ==========================================
    def get_monto(qs, field="total_cotizacion"):
        return qs.aggregate(total=Coalesce(Sum(field), Decimal("0.00")))["total"]

    def calc_var(actual, anterior):
        if anterior and anterior != 0:
            return round(((float(actual) - float(anterior)) / float(anterior)) * 100, 1)
        return 0

    # --- KPI 1: Cantidad de Cotizaciones ---
    cant_mes = qs_cot_mes.count()
    cant_anual = qs_cot_anual.count()
    var_cant = calc_var(cant_mes, qs_cot_prev.count())

    # --- KPI 2: Monto Cotizado ---
    monto_cot_mes = get_monto(qs_cot_mes)
    monto_cot_anual = get_monto(qs_cot_anual)
    var_monto_cot = calc_var(monto_cot_mes, get_monto(qs_cot_prev))

    # --- KPI 3: Ventas Reales (OC) ---
    monto_v_mes = get_monto(qs_ventas_mes, "total_orden")
    monto_v_anual = get_monto(qs_ventas_anual, "total_orden")
    var_v = calc_var(monto_v_mes, get_monto(qs_ventas_prev, "total_orden"))

    # --- KPI 4: Efectividad (% Conversión de Monto) ---
    def calc_efec(venta, coti):
        return round((float(venta) / float(coti) * 100), 1) if coti > 0 else 0

    efec_mes = calc_efec(monto_v_mes, monto_cot_mes)
    efec_anual = calc_efec(monto_v_anual, monto_cot_anual)

    # ==========================================
    # 3. RESPUESTA ESTRUCTURADA PARA EL FRONTEND
    # ==========================================
    return JsonResponse({
        "total_cotizaciones": {
            "anual": cant_anual,
            "variacion": var_cant
        },
        "cotizaciones_mes": cant_mes,
        "monto_total": {
            "anual": float(monto_cot_anual),
            "variacion": var_monto_cot
        },
        "monto_mes": float(monto_cot_mes),
        "ventas_reales_anual": float(monto_v_anual),
        "ventas_reales_mes": float(monto_v_mes),
        "ventas_variacion": var_v,
        "porcentaje_aprobacion": efec_anual,
        "porcentaje_aprobacion_mes": efec_mes,
        "ticket_promedio": float(monto_v_anual / qs_ventas_anual.count()) if qs_ventas_anual.count() > 0 else 0
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tendencias_dashboard(request):
    anno_buscado = str(request.GET.get("anno", datetime.now().year))

    base = Cotizacion.objects.filter(anno=int(anno_buscado))
    base = aplicar_filtros(base, request)

    # --- LÓGICA DE VENTAS REALES (OC) ---
    ventas_reales_qs = (
        CotizacionApertura.objects.filter(
            anno=int(anno_buscado), 
            estado_orden=1
        )
        .annotate(mes_num=ExtractMonth("fecha_orden"))
        .values("mes_num")
        .annotate(total_oc=Coalesce(Sum("total_orden"), Decimal("0.00")))
    )
    
    ventas_reales_dict = {
        str(item["mes_num"]).zfill(2): item["total_oc"] 
        for item in ventas_reales_qs
    }

    # ============================
    # 1️⃣ VENTAS MENSUALES
    # ============================
    cotizaciones_raw = (
        base.values("mes")
        .annotate(
            total=Coalesce(Sum("total_cotizacion"), Decimal("0.00")),
            cantidad=Count("id_registro")
        )
        .order_by("mes")
    )
    
    cot_mensuales_dict = {str(item["mes"]).zfill(2): item for item in cotizaciones_raw}
    
    ventas_mensuales = []
    for m in range(1, 13):
        mes_str = str(m).zfill(2)
        cot_data = cot_mensuales_dict.get(mes_str, {})
        
        ventas_mensuales.append({
            "mes": mes_str,
            "total": float(cot_data.get("total") or 0),
            "oc": float(ventas_reales_dict.get(mes_str) or 0),
            "cantidad": cot_data.get("cantidad") or 0
        })

    # ============================
    # 2️⃣ TOP VENTAS COMERCIAL
    # ============================
    dnis_permitidos = ['43662598', '20068421', '70942025']
    usuarios_qs = Usuario.objects.filter(dni__in=dnis_permitidos).values('dni', 'nombre_completo', 'usuario')
    mapa_usuarios = {u['dni']: (u['nombre_completo'] or u['usuario']).strip().upper() for u in usuarios_qs}

    cotizados_raw = (
        base.filter(estado_envio=2, id_comercial__dni__in=dnis_permitidos)
        .values("id_comercial__dni")
        .annotate(
            monto_cotizado=Coalesce(Sum("total_cotizacion"), Decimal("0.00")),
            cantidad_cot=Count("id_registro")
        )
    )
    dict_cotizados = {item['id_comercial__dni']: item for item in cotizados_raw}

    base_vendedores = base.filter(id_comercial__dni__in=dnis_permitidos)
    
    ventas_raw = (
        CotizacionApertura.objects.filter(
            id_registro__in=base_vendedores, 
            estado_orden=1
        )
        .exclude(total_orden__isnull=True)
        .values('id_registro') 
        .annotate(total_venta_cotin=Sum('total_orden'))
    )
    dict_ventas_monto = {item['id_registro']: item['total_venta_cotin'] for item in ventas_raw}

    ranking_comercial_unificado = []
    for dni, data_cot in dict_cotizados.items():
        nombre_vendedor = mapa_usuarios.get(dni, f"DNI: {dni}")
        ids_vendedor = base_vendedores.filter(id_comercial__dni=dni).values_list('id_registro', flat=True)
        
        venta_total = sum(float(dict_ventas_monto.get(cid, 0) or 0) for cid in ids_vendedor)
        monto_cotizado = float(data_cot['monto_cotizado'])
        cantidad = data_cot['cantidad_cot']

        ranking_comercial_unificado.append({
            "vendedor": nombre_vendedor,
            "monto": venta_total,
            "cotizado": monto_cotizado,
            "cantidad": cantidad,
            "ticket_promedio": venta_total / cantidad if cantidad > 0 else 0,
            "color": "#008B8B" 
        })

    ranking_comercial = sorted(ranking_comercial_unificado, key=lambda x: x['monto'], reverse=True)

    # ============================
    # 3️⃣ EMBUDO
    # ============================
    embudo = [
        {"etapa": "Cotizadas", "valor": base.count()},
        {"etapa": "Aprobadas", "valor": base.filter(estado_envio=2).count()},
    ]

    # ============================
    # 4️⃣ DISTRIBUCIÓN POR ÁREA
    # ============================
    AREA_MAP = {1: "IND", 2: "MIN", 4: "OIL", 8: "SFY"}
    areas_cotizadas_raw = base.values("id_area").exclude(id_area=3).annotate(
        total_proyectos=Count("id_registro"),
        monto_cotizado=Coalesce(Sum("total_cotizacion"), Decimal("0.00"))
    )

    areas_final = []
    for a in areas_cotizadas_raw:
        cod_area = a["id_area"]
        if cod_area not in AREA_MAP: continue
            
        venta_real_area = CotizacionApertura.objects.filter(
            id_registro__id_area=cod_area,
            id_registro__in=base,
            estado_orden=1
        ).aggregate(total=Sum('total_orden'))['total'] or Decimal("0.00")

        areas_final.append({
            "area": AREA_MAP.get(cod_area),
            "total": a["total_proyectos"],
            "cotizado": float(a["monto_cotizado"]),
            "monto": float(venta_real_area)
        })

    areas_final = sorted(areas_final, key=lambda x: x['monto'], reverse=True)

    # ============================
    # 5️⃣ CLIENTES RECURRENTES
    # ============================
    agrupados_qs = (
        base.values("id_cliente")
        .annotate(
            total_cotizaciones=Count("id_registro"),
            monto_cotizado=Coalesce(Sum("total_cotizacion"), Decimal("0.00"))
        )
        .order_by("-total_cotizaciones")[:10]
    )

    codigos_top = [item["id_cliente"] for item in agrupados_qs if item["id_cliente"]]
    clientes_db = Cliente.objects.filter(id_cliente__in=codigos_top)
    mapa_nombres = {c.id_cliente: c.nombre.strip() for c in clientes_db}

    clientes_final = []
    for item in agrupados_qs:
        cli_id = item["id_cliente"]
        if not cli_id: continue
        
        nombre_real = mapa_nombres.get(cli_id) or f"ID: {cli_id}"

        venta_real_cliente = CotizacionApertura.objects.filter(
            id_registro__id_cliente_id=cli_id,
            id_registro__in=base,
            estado_orden=1
        ).aggregate(total=Sum('total_orden'))['total'] or Decimal("0.00")

        monto_c = float(item["monto_cotizado"])
        monto_v = float(venta_real_cliente)

        clientes_final.append({
            "codigo": str(cli_id),
            "nombre": nombre_real,
            "cotizaciones": item["total_cotizaciones"],
            "monto_cotizado": monto_c,
            "monto_real": monto_v,
            "conversion": round((monto_v / monto_c * 100), 1) if monto_c > 0 else 0
        })

    clientes_recurrentes = sorted(clientes_final, key=lambda x: x['monto_real'], reverse=True)

    return Response({
        "ventas_mensuales": list(ventas_mensuales),
        "ranking_comercial": ranking_comercial,
        "embudo": embudo,
        "areas": areas_final,
        "clientes_recurrentes": clientes_recurrentes,
    })

def aplicar_filtros(base, request):
    fecha_inicio = request.GET.get("fecha_inicio")
    fecha_fin = request.GET.get("fecha_fin")
    area = request.GET.get("area")
    usuario = request.GET.get("usuario")
    tipo = request.GET.get("tipo")

    if fecha_inicio and fecha_fin:
        base = base.filter(fecha__range=[fecha_inicio, fecha_fin])
    if area:
        try:
            base = base.filter(id_area=int(area))
        except ValueError:
            pass
    if usuario:
        base = base.filter(id_comercial__usuario=usuario)
    if tipo:
        base = base.filter(id_tipo=tipo)

    return base

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cotizaciones_analisis_view(request):
    try:
        from django.db.models import Sum, Count, Avg
        from datetime import date

        dimension = request.data.get("dimension")
        metrica = request.data.get("metrica", "monto")
        filtros = request.data.get("filtros", {})

        qs = Cotizacion.objects.all()

        anno = filtros.get("anno", date.today().year)
        mes = filtros.get("mes")

        qs = qs.filter(fecha__year=anno)

        if mes:
            qs = qs.filter(fecha__month=mes)

        DIMENSION_MAP = {
            "area": "id_area",
            "estado": "id_estado__nombre",
            "cliente": "id_cliente__nombre",
            "moneda": "tipo_moneda",
            "mes": "mes",
            "vendedor": "id_comercial__nombre_completo",
        }

        campo = DIMENSION_MAP.get(dimension)

        if not campo:
            return Response({"error": "Dimensión no válida"}, status=400)

        if metrica == "monto":
            agg = Sum("total_cotizacion")
        elif metrica == "cantidad":
            agg = Count("id_registro")
        elif metrica == "promedio":
            agg = Avg("total_cotizacion")
        else:
            agg = Sum("total_cotizacion")

        data = (
            qs.values(campo)
            .annotate(valor=agg)
            .order_by("-valor")
        )

        AREA_MAP_NAMES = {
            1: "Industria",
            2: "Minería",
            3: "Mantenimiento",
            4: "Petroquímica",
            8: "Seguridad de Maquinaria",
        }

        resultado = []

        for r in data:
            val = r[campo]
            if dimension == "area":
                val = AREA_MAP_NAMES.get(val, "Otros")

            resultado.append({
                dimension: val,
                "valor": round(float(r["valor"] or 0), 2)
            })

        return Response(resultado)

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=500)

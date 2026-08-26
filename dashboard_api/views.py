from datetime import datetime
from decimal import Decimal
from django.db.models import Sum, Count, Avg, ExpressionWrapper, F, DecimalField, Q
from django.db.models.functions import Coalesce, ExtractMonth
from django.http import JsonResponse, HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import Usuario
from core.models import Cliente, ObjetivoAnual, ObjetivoAnualArea
from cotizaciones_api.models import Cotizacion, CotizacionServicio, CotizacionApertura
from dashboard_api.serializers import ObjetivoAnualSerializer
def set_chart_title(chart, title_text, size_pt=12):
    from openpyxl.chart.title import Title
    from openpyxl.chart.text import Text, RichText
    from openpyxl.drawing.text import Paragraph, ParagraphProperties, CharacterProperties, Font as DrawingFont, RegularTextRun
    
    font = DrawingFont(typeface='Calibri')
    cp = CharacterProperties(sz=size_pt * 100, b=True, latin=font)
    p = Paragraph(pPr=ParagraphProperties(defRPr=cp), r=[RegularTextRun(t=title_text)])
    rich = RichText(p=[p])
    chart.title = Title(tx=Text(rich=rich), overlay=False)
def get_short_name(fullname):
    if not fullname:
        return ""
    name = fullname.strip()
    if "Bonilla" in name:
        return "Eduardo"
    if "Oncebay" in name:
        return "Luisa"
    if "Carbonel" in name:
        return "Claudia"
    if "Castillo" in name:
        return "Juan José"
    return name.split()[0]



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
            id_modulo=1,  # COMERCIAL
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
        if not anno_post:
            return Response({"error": "Debe enviar el año"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if any record (active or inactive) already exists for this year and module
        if ObjetivoAnual.objects.filter(anno=anno_post, id_modulo=1).exists():
            return Response(
                {"error": "Ya existen objetivos registrados para este año"},
                status=status.HTTP_400_BAD_REQUEST
            )

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
                id_modulo=1,  # COMERCIAL
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

    # Ventas Reales (CotizaciónApertura con estado_orden = 1)
    aperturas_anuales = CotizacionApertura.objects.filter(
        anno=anno,
        estado_orden=1,
    )

    personal = request.GET.get("personal", "false").lower() == "true"
    if personal:
        aperturas_anuales = aperturas_anuales.filter(
            id_registro__id_comercial=request.user
        )

    aperturas_mensuales = aperturas_anuales.annotate(
        m=ExtractMonth("fecha_orden")
    ).filter(
        Q(m=mes_actual) | Q(mes=mes_actual)
    )

    def calcular_logrado(aperturas):
        ids_registro = [ap.id_registro_id for ap in aperturas if ap.id_registro_id]
        if not ids_registro:
            return Decimal("0.00")

        # Obtener IDs únicos de cotizaciones asociadas a las ventas
        ids_registro = list(set(ids_registro))

        servicios = CotizacionServicio.objects.filter(
            id_registro_id__in=ids_registro
        ).select_related("id_registro")

        total_hh = Decimal("0.00")
        total_utilidad = Decimal("0.00")

        for s in servicios:
            cot = s.id_registro
            if not cot:
                continue

            tipo_moneda = cot.tipo_moneda
            tipo_cambio = cot.tipo_cambio or Decimal("3.70")
            if tipo_cambio <= 0:
                tipo_cambio = Decimal("3.70")

            # Convertir de PEN a USD para unificar la moneda del dashboard en dólares
            factor = Decimal("1.00") / tipo_cambio if tipo_moneda == "S" else Decimal("1.00")

            # HH PROPIOS: Código de servicio que empieza por 3 dígitos y el 4to es '4', en nivel 2
            is_hh_propio = False
            if s.nivel == 2 and s.codigo_servicio and len(s.codigo_servicio) >= 4:
                if s.codigo_servicio[:3].isdigit() and s.codigo_servicio[3] == '4':
                    is_hh_propio = True

            if is_hh_propio:
                monto_hh = (s.cotizado_total or Decimal("0.00")) * factor
                total_hh += monto_hh
            else:
                # Utilidad de otros servicios (nivel 2): utilidad * hombres * dias
                if s.nivel == 2:
                    utilidad_unit = s.utilidad or Decimal("0.00")
                    cant_hombres = s.cantidad_hombres or 0
                    cant_dias = s.cantidad_dias or 0
                    monto_utilidad = (utilidad_unit * cant_hombres * cant_dias) * factor
                    total_utilidad += monto_utilidad

        return total_hh + total_utilidad

    total_anual = calcular_logrado(aperturas_anuales)
    total_mensual = calcular_logrado(aperturas_mensuales)

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

    personal = request.GET.get("personal", "false").lower() == "true"

    # ==========================================
    # 1. QUERIES BASE (Cotizaciones y Ventas)
    # ==========================================
    # Cotizaciones (Ofertas)
    qs_cot_anual = Cotizacion.objects.filter(anno=anno)
    qs_cot_prev = Cotizacion.objects.filter(anno=anno_para_mes_anterior, mes=mes_anterior_num)

    # Ventas Reales (Órdenes de Compra Adjudicadas estado_orden=1)
    qs_ventas_anual = CotizacionApertura.objects.filter(anno=anno, estado_orden=1)
    qs_ventas_prev = CotizacionApertura.objects.filter(anno=anno_para_mes_anterior, estado_orden=1)

    if personal:
        qs_cot_anual = qs_cot_anual.filter(id_comercial=request.user)
        qs_cot_prev = qs_cot_prev.filter(id_comercial=request.user)
        qs_ventas_anual = qs_ventas_anual.filter(id_registro__id_comercial=request.user)
        qs_ventas_prev = qs_ventas_prev.filter(id_registro__id_comercial=request.user)

    qs_cot_mes = qs_cot_anual.filter(mes=mes_actual_num)
    qs_ventas_mes = qs_ventas_anual.annotate(m=ExtractMonth("fecha_orden")).filter(m=mes_actual_num)
    qs_ventas_prev = qs_ventas_prev.annotate(m=ExtractMonth("fecha_orden")).filter(m=mes_anterior_num)

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
    from collections import defaultdict
    anno_buscado = str(request.GET.get("anno", datetime.now().year))

    base = Cotizacion.objects.filter(anno=int(anno_buscado))
    base = aplicar_filtros(base, request)

    personal = request.GET.get("personal", "false").lower() == "true"
    if personal:
        base = base.filter(id_comercial=request.user)

    # --- LÓGICA DE VENTAS REALES (OC) CON LOGRADO COHERENTE CON EXCEL (hh + utilidad) ---
    ventas_reales_qs = (
        CotizacionApertura.objects.filter(
            anno=int(anno_buscado), 
            estado_orden=1
        ).select_related("id_registro")
    )
    if personal:
        ventas_reales_qs = ventas_reales_qs.filter(id_registro__id_comercial=request.user)

    ventas_reales_dict = defaultdict(Decimal)
    for ap in ventas_reales_qs:
        cot = ap.id_registro
        if not cot: continue
        tipo_moneda = cot.tipo_moneda
        tipo_cambio = cot.tipo_cambio or Decimal("3.70")
        if tipo_cambio <= 0:
            tipo_cambio = Decimal("3.70")
        factor = Decimal("1.00") / tipo_cambio if tipo_moneda == "S" else Decimal("1.00")

        val_pres = (ap.total_orden or Decimal("0.00")) * factor
        costo = (
            (ap.orden_compra_equipos or Decimal("0.00")) + 
            (ap.orden_compra_materiales or Decimal("0.00")) + 
            (ap.orden_compra_costo_servicios or Decimal("0.00")) + 
            (ap.orden_compra_otros or Decimal("0.00"))
        ) * factor
        hh = (ap.orden_compra_hh or Decimal("0.00")) * factor
        imprevistos = (ap.orden_compra_entrega or Decimal("0.00")) * factor
        utilidad = val_pres - (costo + hh + imprevistos)
        val_logrado = hh + utilidad

        # Extraer mes
        f_oc = ap.fecha_orden
        if f_oc:
            mes_num = f_oc.month
        else:
            mes_num = ap.mes or 1

        mes_str = str(mes_num).zfill(2)
        ventas_reales_dict[mes_str] += val_logrado

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
    # 2️⃣ TOP VENTAS COMERCIAL (Calculado globalmente para permitir comparación de promedio en radar)
    # ============================
    base_global = Cotizacion.objects.filter(anno=int(anno_buscado))
    base_global = aplicar_filtros(base_global, request)

    dnis_permitidos = ['43662598', '20068421', '70942025']
    usuarios_qs = Usuario.objects.filter(dni__in=dnis_permitidos).values('dni', 'nombre_completo', 'usuario')
    mapa_usuarios = {u['dni']: (u['nombre_completo'] or u['usuario']).strip().upper() for u in usuarios_qs}

    cotizados_raw = (
        base_global.filter(estado_envio=2, id_comercial__dni__in=dnis_permitidos)
        .values("id_comercial__dni")
        .annotate(
            monto_cotizado=Coalesce(Sum("total_cotizacion"), Decimal("0.00")),
            cantidad_cot=Count("id_registro")
        )
    )
    dict_cotizados = {item['id_comercial__dni']: item for item in cotizados_raw}

    base_vendedores = base_global.filter(id_comercial__dni__in=dnis_permitidos)
    
    # Obtener todas las aperturas de estos vendedores en estado_orden=1
    ventas_aperturas = (
        CotizacionApertura.objects.filter(
            id_registro__in=base_vendedores, 
            estado_orden=1
        ).select_related("id_registro")
    )
    
    dict_ventas_monto = defaultdict(Decimal)
    for ap in ventas_aperturas:
        cot = ap.id_registro
        if not cot: continue
        tipo_moneda = cot.tipo_moneda
        tipo_cambio = cot.tipo_cambio or Decimal("3.70")
        if tipo_cambio <= 0:
            tipo_cambio = Decimal("3.70")
        factor = Decimal("1.00") / tipo_cambio if tipo_moneda == "S" else Decimal("1.00")

        val_pres = (ap.total_orden or Decimal("0.00")) * factor
        costo = (
            (ap.orden_compra_equipos or Decimal("0.00")) + 
            (ap.orden_compra_materiales or Decimal("0.00")) + 
            (ap.orden_compra_costo_servicios or Decimal("0.00")) + 
            (ap.orden_compra_otros or Decimal("0.00"))
        ) * factor
        hh = (ap.orden_compra_hh or Decimal("0.00")) * factor
        imprevistos = (ap.orden_compra_entrega or Decimal("0.00")) * factor
        utilidad = val_pres - (costo + hh + imprevistos)
        val_logrado = hh + utilidad

        dict_ventas_monto[ap.id_registro_id] += val_logrado

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
            
        aperturas_area = CotizacionApertura.objects.filter(
            id_registro__id_area=cod_area,
            id_registro__in=base,
            estado_orden=1
        ).select_related("id_registro")
        
        venta_real_area = Decimal("0.00")
        for ap in aperturas_area:
            cot = ap.id_registro
            if not cot: continue
            tipo_moneda = cot.tipo_moneda
            tipo_cambio = cot.tipo_cambio or Decimal("3.70")
            if tipo_cambio <= 0:
                tipo_cambio = Decimal("3.70")
            factor = Decimal("1.00") / tipo_cambio if tipo_moneda == "S" else Decimal("1.00")

            val_pres = (ap.total_orden or Decimal("0.00")) * factor
            costo = (
                (ap.orden_compra_equipos or Decimal("0.00")) + 
                (ap.orden_compra_materiales or Decimal("0.00")) + 
                (ap.orden_compra_costo_servicios or Decimal("0.00")) + 
                (ap.orden_compra_otros or Decimal("0.00"))
            ) * factor
            hh = (ap.orden_compra_hh or Decimal("0.00")) * factor
            imprevistos = (ap.orden_compra_entrega or Decimal("0.00")) * factor
            utilidad = val_pres - (costo + hh + imprevistos)
            val_logrado = hh + utilidad
            
            venta_real_area += val_logrado

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

        aperturas_cliente = CotizacionApertura.objects.filter(
            id_registro__id_cliente_id=cli_id,
            id_registro__in=base,
            estado_orden=1
        ).select_related("id_registro")

        venta_real_cliente = Decimal("0.00")
        for ap in aperturas_cliente:
            cot = ap.id_registro
            if not cot: continue
            tipo_moneda = cot.tipo_moneda
            tipo_cambio = cot.tipo_cambio or Decimal("3.70")
            if tipo_cambio <= 0:
                tipo_cambio = Decimal("3.70")
            factor = Decimal("1.00") / tipo_cambio if tipo_moneda == "S" else Decimal("1.00")

            val_pres = (ap.total_orden or Decimal("0.00")) * factor
            costo = (
                (ap.orden_compra_equipos or Decimal("0.00")) + 
                (ap.orden_compra_materiales or Decimal("0.00")) + 
                (ap.orden_compra_costo_servicios or Decimal("0.00")) + 
                (ap.orden_compra_otros or Decimal("0.00"))
            ) * factor
            hh = (ap.orden_compra_hh or Decimal("0.00")) * factor
            imprevistos = (ap.orden_compra_entrega or Decimal("0.00")) * factor
            utilidad = val_pres - (costo + hh + imprevistos)
            val_logrado = hh + utilidad
            
            venta_real_cliente += val_logrado

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


def generar_reporte_mensual_excel(anno, mes=None):
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.chart import BarChart3D, PieChart3D, Reference, LineChart
    from openpyxl.chart.series import SeriesLabel, DataPoint
    from openpyxl.chart.data_source import StrRef
    from openpyxl.chart.plotarea import DataTable
    from openpyxl.chart.label import DataLabelList
    from collections import defaultdict

    if mes is None or mes == "":
        mes = datetime.now().month
        filtrar_por_mes = True
    elif mes == "%":
        mes = datetime.now().month
        filtrar_por_mes = False
    else:
        try:
            mes = int(mes)
        except (ValueError, TypeError):
            mes = datetime.now().month
        filtrar_por_mes = True

    def format_orders(orders_list):
        orders = sorted(list(set(filter(None, [str(o).strip() for o in orders_list]))))
        if not orders:
            return "S/N"
        if len(orders) == 1:
            return orders[0]
        return ", ".join(orders[:-1]) + " y " + orders[-1]


    wb = openpyxl.Workbook()
    # Remove default sheet
    default_sheet = wb.active
    wb.remove(default_sheet)

    areas_codes = {2: "MIN", 1: "IND", 4: "OIL", 8: "SFY"}
    area_titles = {
        "MIN": "MINERÍA",
        "IND": "INDUSTRIA",
        "OIL": "PETROQUÍMICA",
        "SFY": "SEGURIDAD DE MAQUINARIA"
    }
    tot_rows = {}
    kpi_rows = {}
    tot_main_rows = {}

    for area_id, area_name in areas_codes.items():
        openings = CotizacionApertura.objects.filter(
            anno_a=str(anno),
            estado_orden__in=[1, 2, 3],
            id_registro__id_area=area_id
        )
        if filtrar_por_mes:
            openings = openings.annotate(
                m=ExtractMonth("fecha_orden")
            ).filter(
                Q(m__lte=mes) | Q(mes__lte=mes)
            )
        openings = openings.select_related("id_registro", "id_registro__id_cliente", "id_registro__id_comercial")

        # Group openings by Cotizacion
        cot_openings = defaultdict(list)
        for ap in openings:
            if ap.id_registro:
                cot_openings[ap.id_registro].append(ap)

        ws = wb.create_sheet(title=area_name)
        ws.views.sheetView[0].showGridLines = True
        ws.append([f"ORDENES DE COMPRA {area_titles[area_name]}"])
        ws.merge_cells("A1:L1")
        ws.cell(1, 1).font = Font(name="Segoe UI", size=14, bold=True, color="1F4E78")
        ws.cell(1, 1).alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        headers = [
            "CÓDIGO", "CLIENTES", "Nº Orden", "PROYECTO", "FECHA O/C", "FECHA ENTREGA",
            "VALOR PRESUPUESTO $", "COSTO", "HH Propia", "IMPREVISTOS", "UTILIDAD", "Personal"
        ]
        ws.append(headers)

        for col_num in range(1, 13):
            cell = ws.cell(row=2, column=col_num)
            cell.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = Border(bottom=Side(border_style="medium", color="000000"))

        row_idx = 3
        for cot, aps in cot_openings.items():
            tipo_moneda = cot.tipo_moneda
            tipo_cambio = cot.tipo_cambio or Decimal("3.70")
            if tipo_cambio <= 0:
                tipo_cambio = Decimal("3.70")
            factor = Decimal("1.00") / tipo_cambio if tipo_moneda == "S" else Decimal("1.00")
            
            # Nº Orden list
            nro_orden = format_orders([ap.numero_orden for ap in aps])

            # Dates (write native date objects for Year/Month groupings in autofilter)
            f_oc = min(filter(None, [ap.fecha_orden for ap in aps]), default=None)
            f_ent = max(filter(None, [ap.fecha_entrega for ap in aps]), default=None)
            fecha_oc = f_oc.date() if f_oc else None
            fecha_entrega = f_ent.date() if f_ent else None

            # Values
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

            client_name = cot.id_cliente.nombre.strip() if cot.id_cliente else ""
            project_ref = cot.referencia.strip() if cot.referencia else ""
            commercial_name = get_short_name(cot.id_comercial.nombre_completo if cot.id_comercial else "")

            row_data = [
                cot.codigo, client_name, nro_orden, project_ref, fecha_oc, fecha_entrega,
                float(val_pres), float(costo), float(hh), float(imprevistos), float(utilidad),
                commercial_name
            ]
            ws.append(row_data)

            is_even = ((row_idx - 3) % 2 == 1)
            fill_row = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid") if is_even else None
            for col_num in range(1, 13):
                cell = ws.cell(row=row_idx, column=col_num)
                cell.font = Font(name="Segoe UI", size=9, color="27272A")
                cell.border = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                                     top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))
                if fill_row:
                    cell.fill = fill_row
                
                if col_num in [7, 8, 9, 10, 11]:
                    cell.number_format = '$ #,##0.00'
                    cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
                elif col_num in [5, 6]:
                    cell.number_format = 'dd-mm-yyyy'
                    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                else:
                    cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

            row_idx += 1

        tot_row_idx = row_idx
        tot_rows[area_name] = tot_row_idx

        # Apply auto-filter on the headers and data range (row 2 up to tot_row_idx-1)
        if tot_row_idx > 3:
            ws.auto_filter.ref = f"A2:L{tot_row_idx-1}"

        if tot_row_idx > 3:
            total_row = [
                "TOTAL", "", "", "", "", "",
                f"=SUM(G3:G{tot_row_idx-1})",
                f"=SUM(H3:H{tot_row_idx-1})",
                f"=SUM(I3:I{tot_row_idx-1})",
                f"=SUM(J3:J{tot_row_idx-1})",
                f"=SUM(K3:K{tot_row_idx-1})",
                ""
            ]
        else:
            total_row = [
                "TOTAL", "", "", "", "", "",
                0.0, 0.0, 0.0, 0.0, 0.0,
                ""
            ]
        ws.append(total_row)

        if tot_row_idx > 3:
            ws.merge_cells(start_row=tot_row_idx, start_column=1, end_row=tot_row_idx, end_column=6)

        for col_num in range(1, 13):
            cell = ws.cell(row=tot_row_idx, column=col_num)
            cell.font = Font(name="Segoe UI", size=10, bold=True, color="1E293B")
            cell.fill = PatternFill(fill_type=None)
            cell.border = Border(top=Side(style='thin', color='000000'), bottom=Side(style='double', color='000000'))
            if col_num in [7, 8, 9, 10, 11]:
                cell.number_format = '$ #,##0.00'
                cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
            elif col_num == 1:
                cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

        # ----------------------------------------------------
        # TABLAS DE RESUMEN LATERALES (Columnas M a P/Q)
        # ----------------------------------------------------
        companies_set = set()
        for cot in cot_openings.keys():
            if cot.id_cliente and cot.id_cliente.nombre:
                c_name = cot.id_cliente.nombre.strip()
                if c_name:
                    companies_set.add(c_name)
        monto_companies = sorted(list(companies_set))

        col_monto_emp = 14
        col_monto_val = 15
        col_cant_val = 16

        def style_cell(c_cell, font_name="Segoe UI", size=9, bold=False, italic=False, color=None, fill_color=None, border_type="thin", alignment_type="left", num_format=None):
            c_cell.font = Font(name=font_name, size=size, bold=bold, italic=italic, color=color)
            if fill_color:
                c_cell.fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
            elif border_type == "total":
                c_cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
            else:
                c_cell.fill = PatternFill(fill_type=None)
                
            thin_side = Side(style='thin', color='D9D9D9')
            black_thin = Side(style='thin', color='000000')
            double_side = Side(style='double', color='000000')
            
            if border_type == "thin":
                c_cell.border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
            elif border_type == "total":
                c_cell.border = Border(top=black_thin, bottom=double_side)
            elif border_type == "header":
                c_cell.border = Border(bottom=Side(border_style="medium", color="000000"))
            else:
                c_cell.border = Border()
                
            horiz = "left"
            if alignment_type == "center":
                horiz = "center"
            elif alignment_type == "right":
                horiz = "right"
            c_cell.alignment = Alignment(horizontal=horiz, vertical="center", wrap_text=True)
            
            if num_format:
                c_cell.number_format = num_format

        # Row 2 Headers (M is empty, N, O, P have headers)
        ws.cell(row=2, column=13, value="").border = Border()
        
        cell_n2 = ws.cell(row=2, column=col_monto_emp, value="Empresa")
        style_cell(cell_n2, size=10, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
        
        monto_lbl = "Monto O/C" if area_name != "SFY" else "Monto"
        cell_o2 = ws.cell(row=2, column=col_monto_val, value=monto_lbl)
        style_cell(cell_o2, size=10, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
        
        cant_lbl = "Cantidad"
        cell_p2 = ws.cell(row=2, column=col_cant_val, value=cant_lbl)
        style_cell(cell_p2, size=10, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")

        # Write companies list
        for idx, comp in enumerate(monto_companies):
            r = 3 + idx
            c_emp = ws.cell(row=r, column=col_monto_emp, value=comp)
            style_cell(c_emp, border_type="thin", alignment_type="left")
            
            c_val = ws.cell(row=r, column=col_monto_val, value=f'=SUMIF(B:B,"{comp}",G:G)')
            style_cell(c_val, border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            c_cval = ws.cell(row=r, column=col_cant_val, value=f'=COUNTIF(B:B,"{comp}")')
            style_cell(c_cval, border_type="thin", alignment_type="center", num_format='#,##0')

        end_row_list = 2 + len(monto_companies)
        tot_main_r = end_row_list + 1
        tot_main_rows[area_name] = tot_main_r

        # Write main table totals row below company list
        style_cell(ws.cell(row=tot_main_r, column=col_monto_emp), border_type="total")
        
        style_cell(ws.cell(row=tot_main_r, column=col_monto_val, value=f"=SUM(G3:G{tot_row_idx-1})"), bold=True, alignment_type="right", num_format='$ #,##0.00', border_type="total")
        
        style_cell(ws.cell(row=tot_main_r, column=col_cant_val, value=f"=COUNTA(A3:A{tot_row_idx-1})"), bold=True, alignment_type="center", num_format='#,##0', border_type="total")

        # Determine total row index (1 blank row between totals row and Monto Total row)
        total_row_idx = end_row_list + 3
            
        # Clean intermediate empty rows
        for r in range(end_row_list + 2, total_row_idx):
            for col_idx in [col_monto_emp, col_monto_val, col_cant_val]:
                ws.cell(row=r, column=col_idx).border = Border()
                ws.cell(row=r, column=col_idx).fill = PatternFill(fill_type=None)

        # Completely clean columns M (13) and Q (17) for all rows
        for r in range(2, total_row_idx + 35):
            ws.cell(row=r, column=13).border = Border()
            ws.cell(row=r, column=13).fill = PatternFill(fill_type=None)
            ws.cell(row=r, column=13).value = None
            ws.cell(row=r, column=17).border = Border()
            ws.cell(row=r, column=17).fill = PatternFill(fill_type=None)
            ws.cell(row=r, column=17).value = None

        # Write financial concept block and other sections
        if area_name == "MIN":
            # Row total_row_idx: Concepto Header
            r = total_row_idx
            ws.cell(row=r, column=13).border = Border()
            c_hdr1 = ws.cell(row=r, column=14, value="Concepto")
            style_cell(c_hdr1, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            c_hdr2 = ws.cell(row=r, column=15, value="Monto")
            style_cell(c_hdr2, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            ws.cell(row=r, column=16).border = Border()
            
            # Row total_row_idx + 1: Costo
            r = total_row_idx + 1
            style_cell(ws.cell(row=r, column=14, value="Costo"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(H3:H{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 2: HH Propia
            r = total_row_idx + 2
            style_cell(ws.cell(row=r, column=14, value="HH Propia"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(I3:I{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 3: Imprevisto
            r = total_row_idx + 3
            style_cell(ws.cell(row=r, column=14, value="Imprevisto"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(J3:J{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 4: Utilidad
            r = total_row_idx + 4
            style_cell(ws.cell(row=r, column=14, value="Utilidad"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(K3:K{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 5: Sum
            r = total_row_idx + 5
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+1}:O{total_row_idx+4})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 7: KPI MIN
            r = total_row_idx + 7
            c_kpi_lbl = ws.cell(row=r, column=14, value="KPI MIN")
            style_cell(c_kpi_lbl, bold=True, alignment_type="left")
            c_kpi_val = ws.cell(row=r, column=15, value=f"=O{total_row_idx+2}+O{total_row_idx+4}")
            style_cell(c_kpi_val, bold=True, alignment_type="right", num_format='$ #,##0.00', border_type="total")
            
            # Row total_row_idx + 8: NOW()
            r = total_row_idx + 8
            c_now = ws.cell(row=r, column=14, value="=NOW()")
            style_cell(c_now, italic=True, alignment_type="left", num_format='dd-mm-yyyy hh:mm')

        elif area_name == "OIL":
            # Row total_row_idx: Concepto Header
            r = total_row_idx
            c_hdr1 = ws.cell(row=r, column=14, value="Concepto")
            style_cell(c_hdr1, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            c_hdr2 = ws.cell(row=r, column=15, value="Monto")
            style_cell(c_hdr2, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            
            # Row total_row_idx + 1: costo
            r = total_row_idx + 1
            style_cell(ws.cell(row=r, column=14, value="costo"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(H3:H{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 2: HH Propia
            r = total_row_idx + 2
            style_cell(ws.cell(row=r, column=14, value="HH Propia"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(I3:I{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 3: Imprevisto
            r = total_row_idx + 3
            style_cell(ws.cell(row=r, column=14, value="Imprevisto"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(J3:J{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 4: Utilidad
            r = total_row_idx + 4
            style_cell(ws.cell(row=r, column=14, value="Utilidad"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(K3:K{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 5: Sum
            r = total_row_idx + 5
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+1}:O{total_row_idx+4})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')

            # Row total_row_idx + 7: KPI OIL
            r = total_row_idx + 7
            c_kpi_lbl = ws.cell(row=r, column=14, value="KPI OIL")
            style_cell(c_kpi_lbl, bold=True, alignment_type="left")
            c_kpi_val = ws.cell(row=r, column=15, value=f"=O{total_row_idx+2}+O{total_row_idx+4}")
            style_cell(c_kpi_val, bold=True, alignment_type="right", num_format='$ #,##0.00', border_type="total")
            
            # Row total_row_idx + 8: NOW()
            r = total_row_idx + 8
            c_now = ws.cell(row=r, column=14, value="=NOW()")
            style_cell(c_now, italic=True, alignment_type="left", num_format='dd-mm-yyyy hh:mm')

        elif area_name == "IND":
            # Row total_row_idx: Concepto Header
            r = total_row_idx
            c_hdr1 = ws.cell(row=r, column=14, value="Concepto")
            style_cell(c_hdr1, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            c_hdr2 = ws.cell(row=r, column=15, value="Monto")
            style_cell(c_hdr2, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            
            # Row total_row_idx + 1: costo
            r = total_row_idx + 1
            style_cell(ws.cell(row=r, column=14, value="costo"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(H3:H{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 2: HH Propia
            r = total_row_idx + 2
            style_cell(ws.cell(row=r, column=14, value="HH Propia"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(I3:I{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 3: Imprevisto
            r = total_row_idx + 3
            style_cell(ws.cell(row=r, column=14, value="Imprevisto"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(J3:J{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 4: Utilidad
            r = total_row_idx + 4
            style_cell(ws.cell(row=r, column=14, value="Utilidad"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(K3:K{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 5: Sum
            r = total_row_idx + 5
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+1}:O{total_row_idx+4})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 8: Por Facturar
            r = total_row_idx + 8
            style_cell(ws.cell(row=r, column=14, value="Por Facturar"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=0.00), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 9: Facturado
            r = total_row_idx + 9
            style_cell(ws.cell(row=r, column=14, value="Facturado"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=0.00), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 10: Sum Facturar/Facturado
            r = total_row_idx + 10
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+8}:O{total_row_idx+9})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 12: KPI IND
            r = total_row_idx + 12
            c_kpi_lbl = ws.cell(row=r, column=14, value="KPI IND")
            style_cell(c_kpi_lbl, bold=True, alignment_type="left")
            c_kpi_val = ws.cell(row=r, column=15, value=f"=O{total_row_idx+2}+O{total_row_idx+4}")
            style_cell(c_kpi_val, bold=True, alignment_type="right", num_format='$ #,##0.00', border_type="total")
            
            # Row total_row_idx + 13: NOW()
            r = total_row_idx + 13
            c_now = ws.cell(row=r, column=14, value="=NOW()")
            style_cell(c_now, italic=True, alignment_type="left", num_format='dd-mm-yyyy hh:mm')

        elif area_name == "SFY":
            # Row total_row_idx: Concepto Header
            r = total_row_idx
            c_hdr1 = ws.cell(row=r, column=14, value="Concepto")
            style_cell(c_hdr1, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            c_hdr2 = ws.cell(row=r, column=15, value="Monto")
            style_cell(c_hdr2, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            
            # Row total_row_idx + 1: costo
            r = total_row_idx + 1
            style_cell(ws.cell(row=r, column=14, value="costo"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(H3:H{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 2: HH Propia
            r = total_row_idx + 2
            style_cell(ws.cell(row=r, column=14, value="HH Propia"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(I3:I{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 3: Imprevisto
            r = total_row_idx + 3
            style_cell(ws.cell(row=r, column=14, value="Imprevisto"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(J3:J{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 4: Utilidad
            r = total_row_idx + 4
            style_cell(ws.cell(row=r, column=14, value="Utilidad"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(K3:K{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 5: Sum
            r = total_row_idx + 5
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+1}:O{total_row_idx+4})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 8: Por Facturar
            r = total_row_idx + 8
            style_cell(ws.cell(row=r, column=14, value="Por Facturar"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=0.00), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 9: Facturado
            r = total_row_idx + 9
            style_cell(ws.cell(row=r, column=14, value="Facturado"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=0.00), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 10: Sum
            r = total_row_idx + 10
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+8}:O{total_row_idx+9})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 12: KPI SFY
            r = total_row_idx + 12
            c_kpi_lbl = ws.cell(row=r, column=14, value="KPI SFY")
            style_cell(c_kpi_lbl, bold=True, alignment_type="left")
            c_kpi_val = ws.cell(row=r, column=15, value=f"=O{total_row_idx+2}+O{total_row_idx+4}")
            style_cell(c_kpi_val, bold=True, alignment_type="right", num_format='$ #,##0.00', border_type="total")
            
            # Row total_row_idx + 13: NOW()
            r = total_row_idx + 13
            c_now = ws.cell(row=r, column=14, value="=NOW()")
            style_cell(c_now, italic=True, alignment_type="left", num_format='dd-mm-yyyy hh:mm')

        # Adjust columns width dynamically with premium safety margins
        for col in ws.columns:
            col_num = col[0].column
            col_letter = get_column_letter(col_num)
            
            # Select proper minimum width based on column type
            min_width = 12
            if col_num == 1:    # A: Código
                min_width = 15
            elif col_num == 2:  # B: Clientes
                min_width = 28
            elif col_num == 3:  # C: Nº Orden
                min_width = 16
            elif col_num == 4:  # D: Proyecto
                min_width = 35
            elif col_num in [5, 6]: # E, F: Fechas
                min_width = 13
            elif col_num in [7, 8, 9, 10, 11]: # G, H, I, J, K: Currency values
                min_width = 18
            elif col_num == 12: # L: Personal
                min_width = 14
            elif col_num == 13: # M: Separador
                min_width = 12
            elif col_num in [14, 15, 16, 17, 18]: # N, O, P, Q, R: Summary tables
                min_width = 16
                
            max_len = 0
            for cell in col:
                val_str = str(cell.value or '')
                if val_str.startswith('='):
                    continue
                max_len = max(max_len, len(val_str))
            
            ws.column_dimensions[col_letter].width = max(max_len + 3, min_width)

        kpi_rows[area_name] = total_row_idx + (7 if area_name in ["MIN", "OIL"] else 12)

        # ----------------------------------------------------
        # GRÁFICOS DINÁMICOS
        # ----------------------------------------------------
        if len(monto_companies) > 0:
            chart_sector_lbl = {
                "MIN": ("Minera", "Minería", "Minería"),
                "IND": ("Industria", "Industria", "Industria"),
                "OIL": ("Petroquímica", "Petroquímica", "Petroquímica"),
                "SFY": ("Seguridad de Maquinaria", "Seguridad de Maquinaria", "Seguridad de Maquinaria")
            }
            sub_title_col, sub_title_pie, sub_title_concept = chart_sector_lbl.get(area_name, (area_name, area_name, area_name))
            
            # Gráfico de Columnas: Montos de OC por Empresa
            chart = BarChart3D()
            chart.type = "col"
            chart.style = 10
            set_chart_title(chart, f"Montos de OC por Empresa - {sub_title_col}", 12)
            
            data = Reference(ws, min_col=15, min_row=2, max_row=end_row_list)
            cats = Reference(ws, min_col=14, min_row=3, max_row=end_row_list)
            chart.add_data(data, titles_from_data=True)
            chart.set_categories(cats)
            chart.legend = None
            chart.plot_area.dTable = DataTable(showHorzBorder=True, showVertBorder=True, showOutline=True, showKeys=True)
            
            # Responsive sizing for the column chart (independent dimensions)
            chart.width = max(18, 10 + len(monto_companies) * 1.6)
            chart.height = max(11, 7 + len(monto_companies) * 0.6)
            
            # Force the vertical Y axis (values) to show despite having a DataTable
            chart.y_axis.delete = False
            
            ws.add_chart(chart, "R2")
            
            # Gráfico de Torta: % Montos de Ordenes de Compra por Cliente (independent dimensions)
            pie = PieChart3D()
            set_chart_title(pie, f"% Montos de OC por Cliente Sector {sub_title_pie}", 12)
            
            pie.add_data(data, titles_from_data=True)
            pie.set_categories(cats)
            pie.dataLabels = DataLabelList()
            pie.dataLabels.showCatName = True
            pie.dataLabels.showPercent = True
            pie.dataLabels.showVal = False
            pie.legend = None
            pie.width = max(17, 10 + len(monto_companies) * 0.9)
            pie.height = max(11, 7 + len(monto_companies) * 0.5)
            
            # Dynamic placement to guarantee a generous separation (leaves exactly 2 empty columns)
            cols_covered = int(chart.width / 1.7)
            pie_col = get_column_letter(18 + cols_covered + 2)
            ws.add_chart(pie, f"{pie_col}2")

            # Tercer Gráfico: Distribución de Ordenes de Compra por Concepto (larger fixed size)
            pie_concept = PieChart3D()
            set_chart_title(pie_concept, f"Distribución de Ordenes de compra {sub_title_concept}", 12)
            
            concept_data = Reference(ws, min_col=15, min_row=total_row_idx, max_row=total_row_idx + 4)
            concept_cats = Reference(ws, min_col=14, min_row=total_row_idx + 1, max_row=total_row_idx + 4)
            pie_concept.add_data(concept_data, titles_from_data=True)
            pie_concept.set_categories(concept_cats)
            
            pie_concept.dataLabels = DataLabelList()
            pie_concept.dataLabels.showCatName = True
            pie_concept.dataLabels.showVal = True
            pie_concept.dataLabels.showPercent = False
            pie_concept.legend = None
            pie_concept.width = 16
            pie_concept.height = 11
            
            # Calculate dynamic start row to prevent vertical overlap with the top charts
            chart_bottom_row = 2 + int(chart.height * 2.0)
            concept_start_row = max(total_row_idx + 10, chart_bottom_row + 2)
            ws.add_chart(pie_concept, f"N{concept_start_row}")

    # Sheet Objetivos
    objetivo_anual = ObjetivoAnual.objects.filter(
        anno=anno,
        id_modulo=1,  # COMERCIAL
        activo=True
    ).first()

    metas = {
        "MIN": {"min": Decimal("0.00"), "max": Decimal("0.00")},
        "IND": {"min": Decimal("0.00"), "max": Decimal("0.00")},
        "OIL": {"min": Decimal("0.00"), "max": Decimal("0.00")},
        "SFY": {"min": Decimal("0.00"), "max": Decimal("0.00")},
    }

    if objetivo_anual:
        objetivos_db = ObjetivoAnualArea.objects.filter(
            id_objetivo=objetivo_anual
        ).select_related("id_area")
        for obj in objetivos_db:
            code = areas_codes.get(obj.id_area_id)
            if code:
                metas[code]["min"] = obj.minimo or Decimal("0.00")
                metas[code]["max"] = obj.maximo or Decimal("0.00")

    ws_obj = wb.create_sheet(title="Objetivos")
    ws_obj.views.sheetView[0].showGridLines = True
    ws_obj.append(["COMPARTIVA DE OBJETIVOS Y METAS"])
    ws_obj.merge_cells("A1:J1")
    ws_obj.cell(1, 1).font = Font(name="Segoe UI", size=14, bold=True, color="1F4E78")
    ws_obj.cell(1, 1).alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    headers = [
        "ÁREA", "OBJETIVO ANUAL MÁXIMO", "OBJETIVO ANUAL MÍNIMO", "LOGRADO",
        "OBJETIVO MAX MENSUAL", "OBJETIVO MIN MENSUAL", "DIFERENCIA C/ MÍNIMO", "DIFERENCIA C/ MÁXIMO",
        "FALTANTE AL MÍNIMO", "FALTANTE AL MÁXIMO"
    ]
    ws_obj.append(headers)

    for col_num in range(1, 11):
        cell = ws_obj.cell(row=2, column=col_num)
        cell.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(bottom=Side(border_style="medium", color="000000"))

    areas = ["MIN", "IND", "OIL", "SFY"]
    for idx, area in enumerate(areas):
        r = idx + 3
        meta_min = metas[area]["min"]
        meta_max = metas[area]["max"]
        kpi_row = kpi_rows[area]
        logrado_formula = f"={area}!O{kpi_row}"

        row_data = [
            area, float(meta_max), float(meta_min), logrado_formula,
            f"=B{r}/12*{mes}", f"=C{r}/12*{mes}", f"=D{r}-F{r}", f"=D{r}-E{r}",
            f"=D{r}-C{r}", f"=D{r}-B{r}"
        ]
        ws_obj.append(row_data)

        for col_num in range(1, 11):
            cell = ws_obj.cell(row=r, column=col_num)
            cell.font = Font(name="Segoe UI", size=9, color="27272A")
            cell.border = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                                 top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))
            if r % 2 == 0:
                cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
            if col_num == 1:
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            else:
                cell.number_format = '$ #,##0.00'
                cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)

    tot_r = 7
    total_row = [
        "TOTALES", "=SUM(B3:B6)", "=SUM(C3:C6)", "=SUM(D3:D6)",
        "=SUM(E3:E6)", "=SUM(F3:F6)", "=D7-F7", "=D7-E7",
        "=D7-C7", "=D7-B7"
    ]
    ws_obj.append(total_row)

    for col_num in range(1, 11):
        cell = ws_obj.cell(row=tot_r, column=col_num)
        cell.font = Font(name="Segoe UI", size=10, bold=True, color="1E293B")
        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        cell.border = Border(top=Side(style='thin', color='000000'), bottom=Side(style='double', color='000000'))
        if col_num == 1:
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        else:
            cell.number_format = '$ #,##0.00'
            cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)

    # APLICAR FORMATO CONDICIONAL PARA COLUMNAS G, H, I, J (FILAS 3 A 7)
    # Definimos los bordes explícitos para evitar que Excel los remplace por blanco
    from openpyxl.formatting.rule import CellIsRule
    from openpyxl.styles.borders import Border, Side

    border_thin = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                         top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))
    
    border_tot = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                        top=Side(style='thin', color='000000'), bottom=Side(style='double', color='000000'))

    # Reglas para filas de datos 3 a 6 (borde delgado gris)
    rule_pos_36 = CellIsRule(operator='greaterThanOrEqual', formula=['0'], 
                             stopIfTrue=True,
                             fill=PatternFill(start_color="0070C0", end_color="0070C0", fill_type="solid"),
                             font=Font(color="FFFFFF", bold=True),
                             border=border_thin)
    rule_neg_36 = CellIsRule(operator='lessThan', formula=['0'], 
                             stopIfTrue=True,
                             fill=PatternFill(start_color="FF0000", end_color="FF0000", fill_type="solid"),
                             font=Font(color="FFFFFF", bold=True),
                             border=border_thin)

    # Reglas para fila 7 de totales (borde superior e inferior doble)
    rule_pos_7 = CellIsRule(operator='greaterThanOrEqual', formula=['0'], 
                            stopIfTrue=True,
                            fill=PatternFill(start_color="0070C0", end_color="0070C0", fill_type="solid"),
                            font=Font(color="FFFFFF", bold=True),
                            border=border_tot)
    rule_neg_7 = CellIsRule(operator='lessThan', formula=['0'], 
                            stopIfTrue=True,
                            fill=PatternFill(start_color="FF0000", end_color="FF0000", fill_type="solid"),
                            font=Font(color="FFFFFF", bold=True),
                            border=border_tot)

    ws_obj.conditional_formatting.add("G3:J6", rule_pos_36)
    ws_obj.conditional_formatting.add("G3:J6", rule_neg_36)
    ws_obj.conditional_formatting.add("G7:J7", rule_pos_7)
    ws_obj.conditional_formatting.add("G7:J7", rule_neg_7)

    # Set headers row height and styling for wrap text
    ws_obj.row_dimensions[2].height = 28
    
    # Standalone rows for Faltante al Min / Max (Leaving row 8 blank!)
    ws_obj.cell(row=9, column=3, value="Faltante al Mínimo")
    ws_obj.cell(row=9, column=4, value="=C7-D7")
    
    ws_obj.cell(row=10, column=3, value="Faltante al Máximo")
    ws_obj.cell(row=10, column=4, value="=B7-D7")
    
    for r in [9, 10]:
        cell_lbl = ws_obj.cell(row=r, column=3)
        cell_lbl.font = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
        cell_lbl.fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
        cell_lbl.alignment = Alignment(horizontal="center", vertical="center")
        cell_lbl.border = Border(left=Side(style='thin', color='000000'), right=Side(style='thin', color='000000'),
                                 top=Side(style='thin', color='000000'), bottom=Side(style='thin', color='000000'))
        
        cell_val = ws_obj.cell(row=r, column=4)
        cell_val.font = Font(name="Segoe UI", size=9, bold=True, color="27272A")
        cell_val.number_format = '$ #,##0.00'
        cell_val.alignment = Alignment(horizontal="right", vertical="center")
        cell_val.border = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                                 top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))
        
    # Avance y Faltante Table (Rows 13-19, leaving rows 11 and 12 blank!)
    ws_obj.merge_cells("B13:C13")
    ws_obj.merge_cells("D13:E13")
    
    cell_max_hdr = ws_obj.cell(row=13, column=2, value="MÁXIMO")
    cell_min_hdr = ws_obj.cell(row=13, column=4, value="MÍNIMO")
    
    for cell in [cell_max_hdr, cell_min_hdr]:
        cell.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    border_thin = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                         top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))
    
    for col_idx in [2, 3, 4, 5]:
        cell = ws_obj.cell(row=13, column=col_idx)
        cell.border = border_thin
        cell.fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
        
    sub_headers = {2: "Avance", 3: "Faltante", 4: "Avance", 5: "Faltante"}
    ws_obj.row_dimensions[14].height = 20
    for col_idx, text in sub_headers.items():
        cell = ws_obj.cell(row=14, column=col_idx, value=text)
        cell.font = Font(name="Segoe UI", size=9, bold=True, color="1E293B")
        cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border_thin

    row_mapping = {
        15: ("MIN", 3),
        16: ("IND", 4),
        17: ("OIL", 5),
        18: ("SFY", 6),
        19: ("V&C", 7)
    }
    
    font_normal = Font(name="Segoe UI", size=9, color="27272A")
    font_bold = Font(name="Segoe UI", size=10, bold=True, color="1E293B")
    fill_totals = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    border_totals = Border(top=Side(style='thin', color='000000'), bottom=Side(style='double', color='000000'))
    
    for r_idx, (area_lbl, target_row) in row_mapping.items():
        ws_obj.row_dimensions[r_idx].height = 22 if area_lbl == "V&C" else 20
        
        cell_lbl = ws_obj.cell(row=r_idx, column=1, value=area_lbl)
        if area_lbl == "V&C":
            cell_lbl.font = font_bold
            cell_lbl.fill = fill_totals
            cell_lbl.border = border_totals
        else:
            cell_lbl.font = font_normal
            cell_lbl.border = border_thin
            if r_idx % 2 == 0:
                cell_lbl.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        cell_lbl.alignment = Alignment(horizontal="center", vertical="center")
        
        cell_b = ws_obj.cell(row=r_idx, column=2, value=f"=(D{target_row}*100/E{target_row})%")
        cell_c = ws_obj.cell(row=r_idx, column=3, value=f"=IF(B{r_idx}>=1,0,1-B{r_idx})")
        cell_d = ws_obj.cell(row=r_idx, column=4, value=f"=(D{target_row}*100/F{target_row})%")
        cell_e = ws_obj.cell(row=r_idx, column=5, value=f"=IF(D{r_idx}>=1,0,1-D{r_idx})")
        
        for col_idx, cell in enumerate([cell_b, cell_c, cell_d, cell_e], start=2):
            cell.number_format = '0.0%'
            cell.alignment = Alignment(horizontal="right", vertical="center")
            
            if area_lbl == "V&C":
                cell.font = font_bold
                cell.fill = fill_totals
                cell.border = border_totals
            else:
                cell.font = font_normal
                cell.border = border_thin
                if r_idx % 2 == 0:
                    cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    # Write historical Logrado table in columns L (12) and M (13) starting at Row 2
    ws_obj.cell(row=2, column=12, value="Año").font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    ws_obj.cell(row=2, column=12).fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
    ws_obj.cell(row=2, column=12).alignment = Alignment(horizontal="center", vertical="center")
    ws_obj.cell(row=2, column=12).border = Border(bottom=Side(border_style="medium", color="000000"))

    ws_obj.cell(row=2, column=13, value="Logrado").font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    ws_obj.cell(row=2, column=13).fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
    ws_obj.cell(row=2, column=13).alignment = Alignment(horizontal="center", vertical="center")
    ws_obj.cell(row=2, column=13).border = Border(bottom=Side(border_style="medium", color="000000"))

    historical_data = {
        2014: 599213.69,
        2015: 791852.48,
        2016: 546600.85,
        2017: 586456.22,
        2018: 815521.11,
        2019: 706732.22,
        2020: 820464.89,
        2021: 475934.45,
        2022: 764082.81,
        2023: 832552.59,
        2024: 865726.08,
        2025: 787520.06,
    }
    
    logrado_table_data = []
    for y, val in sorted(historical_data.items()):
        if y < int(anno):
            logrado_table_data.append((y, val))
            
    # Dynamically query database for past years not in historical_data (e.g. 2026 onwards)
    start_db_year = max(historical_data.keys()) + 1
    for y in range(start_db_year, int(anno)):
        year_kpi = 0.0
        try:

            openings = CotizacionApertura.objects.filter(
                anno_a=str(y),
                estado_orden__in=[1, 2, 3]
            ).select_related("id_registro")
            
            cot_openings = defaultdict(list)
            for ap in openings:
                if ap.id_registro:
                    cot_openings[ap.id_registro].append(ap)
                    
            total_kpi = Decimal("0.00")
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
                total_kpi += (hh + utilidad)
            year_kpi = float(total_kpi)
        except Exception as ex:
            print("Error calculating historical year kpi:", ex)
        logrado_table_data.append((y, year_kpi))
        
    logrado_table_data.append((int(anno), "=D7"))

    for idx, (year_val, logrado_val) in enumerate(logrado_table_data):
        r = idx + 3
        cell_y = ws_obj.cell(row=r, column=12, value=year_val)
        cell_y.font = Font(name="Segoe UI", size=9, color="27272A")
        cell_y.alignment = Alignment(horizontal="center", vertical="center")
        cell_y.border = border_thin

        cell_l = ws_obj.cell(row=r, column=13, value=logrado_val)
        cell_l.font = Font(name="Segoe UI", size=9, color="27272A")
        cell_l.alignment = Alignment(horizontal="right", vertical="center")
        cell_l.border = border_thin
        cell_l.number_format = '$ #,##0.00'

        if r % 2 == 0:
            cell_y.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
            cell_l.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    # Set custom responsive columns widths to avoid wasted space
    ws_obj.column_dimensions["A"].width = 10
    for col_letter in ["B", "C", "D", "E", "F", "G", "H", "I", "J"]:
        ws_obj.column_dimensions[col_letter].width = 18
    ws_obj.column_dimensions["K"].width = 5   # Separator
    ws_obj.column_dimensions["L"].width = 12  # Año
    ws_obj.column_dimensions["M"].width = 18  # Logrado

    # ====================================================
    # GRÁFICOS DE LA PESTAÑA OBJETIVOS
    # ====================================================
    # 1. Gráfico 1: Monto Logrado por Año HH+UTILIDAD
    chart1 = BarChart3D()
    chart1.roundedCorners = True
    chart1.type = "col"
    chart1.style = 10
    set_chart_title(chart1, "Monto Logrado por Año HH+UTILIDAD", 12)
    chart1.y_axis.delete = True
    chart1.x_axis.delete = False  # Eje horizontal visible
    chart1.legend = None          # Sin leyenda
    chart1.y_axis.majorGridlines = None
    chart1.x_axis.majorGridlines = None
    chart1.plot_area.dTable = None

    # ETIQUETAS DE DATOS (Moneda sin clave de leyenda)
    chart1.dataLabels = DataLabelList()
    chart1.dataLabels.showVal = True
    chart1.dataLabels.showCatName = False
    chart1.dataLabels.showSerName = False
    chart1.dataLabels.showPercent = False
    chart1.dataLabels.showLegendKey = False
    chart1.dataLabels.numFmt = '$ #,##0.00'

    # Valores: Logrado (columna M/13) desde fila 2 (cabecera) hasta el final de los datos
    s_val1 = Reference(ws_obj, min_col=13, min_row=2, max_row=len(logrado_table_data) + 2)
    chart1.add_data(s_val1, titles_from_data=True)
    if len(chart1.series) > 0:
        chart1.series[0].graphicalProperties.solidFill = "237573" # Premium Teal

    # Categorías: Años (columna L/12) desde fila 3
    cats1 = Reference(ws_obj, min_col=12, min_row=3, max_row=len(logrado_table_data) + 2)
    chart1.set_categories(cats1)

    chart1.width = 15
    chart1.height = 7.5
    ws_obj.add_chart(chart1, "O2")  # Anclado en O2 según reporte (39).xlsx

    # 2. Gráfico 2: Avance objetivo Máximo al Mes en curso
    chart2 = BarChart3D()
    chart2.roundedCorners = True
    chart2.type = "col"
    chart2.grouping = "stacked"  # Apilado
    chart2.overlap = 100
    chart2.shape = "cylinder"    # DISEÑO DE CILINDROS 3D
    chart2.style = 10
    set_chart_title(chart2, f"Avance objetivo Máximo al Mes en curso ({mes}/12)", 12)
    chart2.y_axis.delete = True
    chart2.x_axis.delete = False
    chart2.legend = None          # Sin leyenda (evita confusión de colores)
    chart2.y_axis.majorGridlines = None
    chart2.x_axis.majorGridlines = None
    chart2.plot_area.dTable = None

    # ETIQUETAS DE DATOS (Porcentajes sin clave de leyenda)
    chart2.dataLabels = DataLabelList()
    chart2.dataLabels.showVal = True
    chart2.dataLabels.showCatName = False
    chart2.dataLabels.showSerName = False
    chart2.dataLabels.showPercent = False
    chart2.dataLabels.showLegendKey = False
    chart2.dataLabels.numFmt = '0%'  # Formato porcentaje entero para alineación al base

    # Valores: Avance y Faltante Máximo (columnas B y C, cols 2 y 3) desde fila 14 (subcabeceras) hasta fila 19 (V&C)
    s_val2 = Reference(ws_obj, min_col=2, max_col=3, min_row=14, max_row=19)
    chart2.add_data(s_val2, titles_from_data=True)

    # Categorías: Áreas (columna A/1) desde fila 15 a 19 (incluye V&C)
    cats2 = Reference(ws_obj, min_col=1, min_row=15, max_row=19)
    chart2.set_categories(cats2)

    # APLICAR PERSPECTIVA DE GIRO 3D PROFESIONAL (rotX maps to Giro Y = 10, rotY maps to Giro X = 40)
    from openpyxl.chart._3d import View3D
    chart2.view3D = View3D(rotX=10, rotY=40, rAngAx=False)
    chart2.view3D.perspective = 0
    chart2.view3D.depthPercent = 130

    # APLICAR COLORES CORPORATIVOS PROFESIONALES DE EXCEL CON MÁXIMO CONTRASTE PARA TEXTO NEGRO
    # MIN (Amarillo), IND (Naranja Suave), OIL (Teal/Celeste), SFY (Morado Suave), V&C (Verde Suave)
    colors_avance = ["FFFF99", "FCE4D6", "E0F7FA", "E2D5F3", "C6E0B4"]
    colors_faltante = ["FFFF00", "F8B17F", "00DFDA", "B19CD9", "93C588"]

    for s_idx, colors in enumerate([colors_avance, colors_faltante]):
        if s_idx < len(chart2.series):
            series = chart2.series[s_idx]
            for pt_idx, col in enumerate(colors):
                from openpyxl.chart.series import DataPoint
                dp = DataPoint(idx=pt_idx)
                dp.graphicalProperties.solidFill = col
                series.dPt.append(dp)

    chart2.width = 15
    chart2.height = 7.5  # Dimensiones de 15x7.5 cm según reporte (39).xlsx
    ws_obj.add_chart(chart2, "B22")

    # 3. Gráfico 3: Avance objetivo Mínimo al Mes en curso
    chart3 = BarChart3D()
    chart3.roundedCorners = True
    chart3.type = "col"
    chart3.grouping = "stacked"  # Apilado
    chart3.overlap = 100
    chart3.shape = "cylinder"    # DISEÑO DE CILINDROS 3D
    chart3.style = 10
    set_chart_title(chart3, f"Avance objetivo Mínimo al Mes en curso ({mes}/12)", 12)
    chart3.y_axis.delete = True
    chart3.x_axis.delete = False
    chart3.legend = None          # Sin leyenda
    chart3.y_axis.majorGridlines = None
    chart3.x_axis.majorGridlines = None
    chart3.plot_area.dTable = None

    # ETIQUETAS DE DATOS (Porcentajes sin clave de leyenda)
    chart3.dataLabels = DataLabelList()
    chart3.dataLabels.showVal = True
    chart3.dataLabels.showCatName = False
    chart3.dataLabels.showSerName = False
    chart3.dataLabels.showPercent = False
    chart3.dataLabels.showLegendKey = False
    chart3.dataLabels.numFmt = '0%'  # Formato porcentaje entero

    # Valores: Avance y Faltante Mínimo (columnas D y E, cols 4 y 5) desde fila 14 (subcabeceras) hasta fila 19 (V&C)
    s_val3 = Reference(ws_obj, min_col=4, max_col=5, min_row=14, max_row=19)
    chart3.add_data(s_val3, titles_from_data=True)
    chart3.set_categories(cats2)

    # APLICAR PERSPECTIVA DE GIRO 3D PROFESIONAL (rotX maps to Giro Y = 10, rotY maps to Giro X = 40)
    chart3.view3D = View3D(rotX=10, rotY=40, rAngAx=False)
    chart3.view3D.perspective = 0
    chart3.view3D.depthPercent = 130

    # APLICAR COLORES CORPORATIVOS PROFESIONALES
    for s_idx, colors in enumerate([colors_avance, colors_faltante]):
        if s_idx < len(chart3.series):
            series = chart3.series[s_idx]
            for pt_idx, col in enumerate(colors):
                from openpyxl.chart.series import DataPoint
                dp = DataPoint(idx=pt_idx)
                dp.graphicalProperties.solidFill = col
                series.dPt.append(dp)

    chart3.width = 15
    chart3.height = 7.5  # Dimensiones de 15x7.5 cm según reporte (39).xlsx
    ws_obj.add_chart(chart3, "H22")  # Anclado en H22 para reducir espacio horizontal

    # ====================================================
    # GRÁFICOS DE ANILLO KPI NATIVOS (DOUGHNUT CHARTS)
    # ====================================================
    from openpyxl.chart.pie_chart import DoughnutChart
    from openpyxl.chart.series import DataPoint
    from openpyxl.chart.label import DataLabelList
    from openpyxl.chart.reference import Reference
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    # Escribir tabla de datos para los gráficos KPI
    ws_obj.cell(row=39, column=2, value="Métrica")
    ws_obj.cell(row=39, column=3, value="Avance")
    ws_obj.cell(row=39, column=4, value="Faltante")
    
    ws_obj.cell(row=40, column=2, value="Avance MIN")
    ws_obj.cell(row=40, column=3, value="=D7/C7").number_format = '0%'
    ws_obj.cell(row=40, column=4, value="=MAX(0, 1-C40)").number_format = '0%'
    
    ws_obj.cell(row=41, column=2, value="Avance MAX")
    ws_obj.cell(row=41, column=3, value="=D7/B7").number_format = '0%'
    ws_obj.cell(row=41, column=4, value="=MAX(0, 1-C41)").number_format = '0%'

    # DEFINICIÓN DE ESTILOS Y FORMATOS CORPORATIVOS
    font_hdr = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
    fill_hdr = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
    align_center = Alignment(horizontal="center", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")
    
    font_data = Font(name="Segoe UI", size=9, color="27272A")
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    border_thin = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                         top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))

    # Formatear la tabla KPI (filas 39 a 41, columnas B a D)
    for c in [2, 3, 4]:
        cell_hdr = ws_obj.cell(row=39, column=c)
        cell_hdr.font = font_hdr
        cell_hdr.fill = fill_hdr
        cell_hdr.alignment = align_center
        cell_hdr.border = border_thin
        
    for r in [40, 41]:
        for c in [2, 3, 4]:
            cell = ws_obj.cell(row=r, column=c)
            cell.font = font_data
            cell.alignment = align_right if c in [3, 4] else align_center
            cell.border = border_thin
            if r % 2 == 0:
                cell.fill = fill_zebra

    # Establecer la altura para las filas de la tabla
    ws_obj.row_dimensions[39].height = 20
    ws_obj.row_dimensions[40].height = 20
    ws_obj.row_dimensions[41].height = 20

    # Limpiar alturas de filas antiguas para que Excel no muestre filas en blanco altas
    for r in range(42, 61):
        ws_obj.row_dimensions[r].height = None

    # Establecer anchos de columna óptimos para la tabla de datos KPI sin encoger las columnas de objetivos
    ws_obj.column_dimensions['B'].width = 18
    ws_obj.column_dimensions['C'].width = 20
    ws_obj.column_dimensions['D'].width = 20

    # --- GAUGE 1: AVANCE CON RESPECTO AL MÍNIMO ANUAL (PieChart3D) ---
    from openpyxl.chart.layout import Layout, ManualLayout
    from openpyxl.chart.legend import Legend
    from openpyxl.chart.shapes import GraphicalProperties
    
    gauge_min = PieChart3D()
    gauge_min.roundedCorners = True
    gauge_min.style = 10
    gauge_min.legend = Legend()
    gauge_min.legend.position = "b" # Leyenda abajo
    gauge_min.legend.overlay = True
    set_chart_title(gauge_min, "AVANCE CON RESPECTO AL MÍNIMO ANUAL", 11)
    
    ref_vals_min = Reference(ws_obj, min_col=3, max_col=4, min_row=40, max_row=40)
    ref_cats = Reference(ws_obj, min_col=3, max_col=4, min_row=39, max_row=39)
    
    gauge_min.add_data(ref_vals_min, from_rows=True)
    gauge_min.set_categories(ref_cats)
    
    # Configurar etiquetas de datos limpias (solo el valor % centrado, como en la captura)
    gauge_min.dataLabels = DataLabelList()
    gauge_min.dataLabels.showVal = True
    gauge_min.dataLabels.showPercent = False
    gauge_min.dataLabels.showCatName = False
    gauge_min.dataLabels.showSerName = False
    gauge_min.dataLabels.showLegendKey = True
    
    # Ajustar Vista 3D (tilted) para coincidir con cilindros
    gauge_min.view3D = View3D(rotX=10, rotY=40, rAngAx=False)
    gauge_min.view3D.perspective = 0
    gauge_min.view3D.depthPercent = 130
    
    # Ajustar Layout para centrar el pastel 3D
    gauge_min.layout = Layout(
        manualLayout=ManualLayout(
            x=0.08, y=0.1,
            h=0.72, w=0.84,
            xMode="edge", yMode="edge"
        )
    )
    
    # Colores corporativos Teal y Gris Claro
    dp0 = DataPoint(idx=0)
    dp0.graphicalProperties.solidFill = "237573"
    dp1 = DataPoint(idx=1)
    dp1.graphicalProperties.solidFill = "E2E8F0"
    
    gauge_min.series[0].dPt.append(dp0)
    gauge_min.series[0].dPt.append(dp1)
    
    gauge_min.width = 11
    gauge_min.height = 7.5
    ws_obj.add_chart(gauge_min, "F39")

    # --- GAUGE 2: AVANCE CON RESPECTO AL MÁXIMO ANUAL (PieChart3D) ---
    gauge_max = PieChart3D()
    gauge_max.roundedCorners = True
    gauge_max.style = 10
    gauge_max.legend = Legend()
    gauge_max.legend.position = "b" # Leyenda abajo
    gauge_max.legend.overlay = True
    set_chart_title(gauge_max, "AVANCE CON RESPECTO AL MÁXIMO ANUAL", 11)
    
    ref_vals_max = Reference(ws_obj, min_col=3, max_col=4, min_row=41, max_row=41)
    
    gauge_max.add_data(ref_vals_max, from_rows=True)
    gauge_max.set_categories(ref_cats)
    
    gauge_max.dataLabels = DataLabelList()
    gauge_max.dataLabels.showVal = True
    gauge_max.dataLabels.showPercent = False
    gauge_max.dataLabels.showCatName = False
    gauge_max.dataLabels.showSerName = False
    gauge_max.dataLabels.showLegendKey = True
    
    gauge_max.view3D = View3D(rotX=10, rotY=40, rAngAx=False)
    gauge_max.view3D.perspective = 0
    gauge_max.view3D.depthPercent = 130
    
    gauge_max.layout = Layout(
        manualLayout=ManualLayout(
            x=0.08, y=0.1,
            h=0.72, w=0.84,
            xMode="edge", yMode="edge"
        )
    )
    
    dp0_max = DataPoint(idx=0)
    dp0_max.graphicalProperties.solidFill = "237573"
    dp1_max = DataPoint(idx=1)
    dp1_max.graphicalProperties.solidFill = "E2E8F0"
    
    gauge_max.series[0].dPt.append(dp0_max)
    gauge_max.series[0].dPt.append(dp1_max)
    
    gauge_max.width = 11
    gauge_max.height = 7.5
    ws_obj.add_chart(gauge_max, "J39")
    

    vendedores_qs = Usuario.objects.filter(
        id_area=6,
        activo=1
    ).filter(
        id_usuario__in=Cotizacion.objects.values_list("id_comercial", flat=True)
    ).order_by('nombre_completo')
    
    vendedores_info = []
    for v in vendedores_qs:
        v_short = get_short_name(v.nombre_completo)
        vendedores_info.append({
            "nombre": v.nombre_completo,
            "short": v_short
        })

    ws_com = wb.create_sheet(title="Objetivos Com.")
    ws_com.views.sheetView[0].showGridLines = True
    
    # Premium styles
    font_segoe = Font(name="Segoe UI", size=9)
    font_bold = Font(name="Segoe UI", size=9, bold=True)
    font_hdr = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
    fill_hdr = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
    fill_sub = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    fill_even = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    border_thin = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )
    border_total = Border(
        top=Side(style='thin', color='000000'),
        bottom=Side(style='thin', color='000000')
    )
    border_double = Border(
        top=Side(style='thin', color='000000'),
        bottom=Side(style='double', color='000000')
    )

    area_blocks_com = [
        ("MIN", "MINERIA", 1),  # (code, sheet_name, area_idx)
        ("IND", "INDUSTRIA", 2),
        ("OIL", "PETROQUIMICA", 3),
        ("SFY", "SAFETY", 4)
    ]

    def style_com_cell(cell, font, fill=None, border=None, alignment=None, num_format=None):
        cell.font = font
        if fill is not None:
            cell.fill = fill
        if border is not None:
            cell.border = border
        if alignment is not None:
            cell.alignment = alignment
        if num_format is not None:
            cell.number_format = num_format

    mes_calc = mes if filtrar_por_mes else 12
    block_info = {}
    current_r = 1
    factor_participacion = 1.0 / max(1, len(vendedores_info))

    for code, area_sheet_name, area_idx in area_blocks_com:
        start_r = current_r
        
        # Headers Row start_r (Cols B to L)
        headers_row = ["NOMBRE", "MAX", "MIN", "PRO. TRA.", "Obj. Min Mensual", "Obj. Max Mensual", "Obj. Min Anual", "Obj. Max Anual", "Conseguido", "% Min Mensual", "% Max Mensual", "% Min Anual", "% Max Anual"]
        for idx, h in enumerate(headers_row):
            c_hdr = ws_com.cell(row=start_r, column=idx+2, value=h)
            style_com_cell(c_hdr, font_hdr, fill=fill_hdr, border=border_thin, alignment=Alignment(horizontal="center", vertical="center", wrap_text=True))
        
        # Salespeople (Cols B to N)
        for v_idx, v in enumerate(vendedores_info):
            r = start_r + 1 + v_idx
            is_even = (v_idx % 2 == 1)
            fill_cell = fill_even if is_even else None
            
            # Salesperson name
            c_name = ws_com.cell(row=r, column=2, value=v["nombre"])
            style_com_cell(c_name, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="left", vertical="center"))
            
            # PRO. TRA
            c_pro = ws_com.cell(row=r, column=5, value=factor_participacion)
            style_com_cell(c_pro, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="center", vertical="center"), num_format='0.00')
            
            # User Objectives Formulas (Monthly & Annual, Min & Max)
            top_v_r = start_r + 1
            c_omin_m = ws_com.cell(row=r, column=6, value=f"=D${top_v_r}*E{r}/12*{mes_calc}")
            c_omax_m = ws_com.cell(row=r, column=7, value=f"=C${top_v_r}*E{r}/12*{mes_calc}")
            c_omin_a = ws_com.cell(row=r, column=8, value=f"=D${top_v_r}*E{r}")
            c_omax_a = ws_com.cell(row=r, column=9, value=f"=C${top_v_r}*E{r}")
            
            style_com_cell(c_omin_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
            style_com_cell(c_omax_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
            style_com_cell(c_omin_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
            style_com_cell(c_omax_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
            
            # Conseguido: SUMIF HH Propia (Col I) + SUMIF Utilidad (Col K) for the salesperson short name
            v_short = v["short"]
            c_cons = ws_com.cell(row=r, column=10, value=f'=SUMIF({code}!L:L,"{v_short}",{code}!I:I)+SUMIF({code}!L:L,"{v_short}",{code}!K:K)')
            style_com_cell(c_cons, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
            
            # % Min/Max Mensual and % Min/Max Anual
            c_pmin_m = ws_com.cell(row=r, column=11, value=f"=IF(F{r}>0,J{r}/F{r},0)")
            c_pmax_m = ws_com.cell(row=r, column=12, value=f"=IF(G{r}>0,J{r}/G{r},0)")
            c_pmin_a = ws_com.cell(row=r, column=13, value=f"=IF(H{r}>0,J{r}/H{r},0)")
            c_pmax_a = ws_com.cell(row=r, column=14, value=f"=IF(I{r}>0,J{r}/I{r},0)")
            
            style_com_cell(c_pmin_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
            style_com_cell(c_pmax_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
            style_com_cell(c_pmin_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
            style_com_cell(c_pmax_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')

        # Totals Row (Cols B to N)
        tot_r = start_r + len(vendedores_info) + 1
        style_com_cell(ws_com.cell(row=tot_r, column=2, value="TOTAL"), font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="left"))
        style_com_cell(ws_com.cell(row=tot_r, column=3), font_bold, fill=fill_sub, border=border_total)
        style_com_cell(ws_com.cell(row=tot_r, column=4), font_bold, fill=fill_sub, border=border_total)
        
        c_tot_pro = ws_com.cell(row=tot_r, column=5, value=f"=SUM(E{start_r+1}:E{tot_r-1})")
        style_com_cell(c_tot_pro, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="center"), num_format='0.00')
        
        c_tot_min_m = ws_com.cell(row=tot_r, column=6, value=f"=SUM(F{start_r+1}:F{tot_r-1})")
        c_tot_max_m = ws_com.cell(row=tot_r, column=7, value=f"=SUM(G{start_r+1}:G{tot_r-1})")
        c_tot_min_a = ws_com.cell(row=tot_r, column=8, value=f"=SUM(H{start_r+1}:H{tot_r-1})")
        c_tot_max_a = ws_com.cell(row=tot_r, column=9, value=f"=SUM(I{start_r+1}:I{tot_r-1})")
        
        style_com_cell(c_tot_min_m, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='$ #,##0.00')
        style_com_cell(c_tot_max_m, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='$ #,##0.00')
        style_com_cell(c_tot_min_a, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='$ #,##0.00')
        style_com_cell(c_tot_max_a, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='$ #,##0.00')
        
        c_tot_cons = ws_com.cell(row=tot_r, column=10, value=f"=SUM(J{start_r+1}:J{tot_r-1})")
        style_com_cell(c_tot_cons, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='$ #,##0.00')
        
        c_tot_pmin_m = ws_com.cell(row=tot_r, column=11, value=f"=IF(F{tot_r}>0,J{tot_r}/F{tot_r},0)")
        c_tot_pmax_m = ws_com.cell(row=tot_r, column=12, value=f"=IF(G{tot_r}>0,J{tot_r}/G{tot_r},0)")
        c_tot_pmin_a = ws_com.cell(row=tot_r, column=13, value=f"=IF(H{tot_r}>0,J{tot_r}/H{tot_r},0)")
        c_tot_pmax_a = ws_com.cell(row=tot_r, column=14, value=f"=IF(I{tot_r}>0,J{tot_r}/I{tot_r},0)")
        
        style_com_cell(c_tot_pmin_m, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='0.0%')
        style_com_cell(c_tot_pmax_m, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='0.0%')
        style_com_cell(c_tot_pmin_a, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='0.0%')
        style_com_cell(c_tot_pmax_a, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='0.0%')

        # Style and set value for Column A cells
        for r_idx in range(start_r, tot_r + 1):
            cell_a = ws_com.cell(row=r_idx, column=1)
            cell_a.value = code if r_idx == start_r else None
            style_com_cell(
                cell_a,
                font_hdr,
                fill=fill_hdr,
                border=border_thin,
                alignment=Alignment(horizontal="center", vertical="center", textRotation=90)
            )
        ws_com.merge_cells(start_row=start_r, start_column=1, end_row=tot_r, end_column=1)

        # Target MAX & MIN cell values and merge (Cols C and D)
        top_v_r = start_r + 1
        last_v_r = tot_r - 1
        
        ws_com.cell(row=top_v_r, column=3, value=f"=Objetivos!B{area_idx+2}")
        ws_com.cell(row=top_v_r, column=4, value=f"=Objetivos!C{area_idx+2}")
        
        for r_idx in range(top_v_r, last_v_r + 1):
            is_even = ((r_idx - top_v_r) % 2 == 1)
            fill_cell = fill_even if is_even else None
            
            c_max = ws_com.cell(row=r_idx, column=3)
            c_min = ws_com.cell(row=r_idx, column=4)
            
            style_com_cell(c_max, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="center", vertical="center"), num_format='$ #,##0.00')
            style_com_cell(c_min, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="center", vertical="center"), num_format='$ #,##0.00')
            
        ws_com.merge_cells(start_row=top_v_r, start_column=3, end_row=last_v_r, end_column=3)
        ws_com.merge_cells(start_row=top_v_r, start_column=4, end_row=last_v_r, end_column=4)

        block_info[code] = {
            "start_r": start_r,
            "top_v_r": start_r + 1,
            "tot_r": tot_r,
            "v_rows": {v["nombre"]: start_r + 1 + v_idx for v_idx, v in enumerate(vendedores_info)}
        }
        current_r = tot_r + 3

    # Table 1: Area Summary (starts at current_r)
    start_area_summary_r = current_r
    
    # Premium Header styling for Table 1
    headers_t1 = ["Area", "Cuota Comercial", "Conseguido", "%"]
    for idx, val in enumerate(headers_t1):
        col_idx = idx + 2
        cell = ws_com.cell(row=start_area_summary_r, column=col_idx, value=val)
        style_com_cell(
            cell, 
            font_hdr, 
            fill=fill_hdr, 
            border=border_thin, 
            alignment=Alignment(horizontal="center", vertical="center", wrap_text=True)
        )

    summary_areas_rows = [
        ("Minería", start_area_summary_r + 1, f"=C{block_info['MIN']['top_v_r']}", f"=SUM(J{block_info['MIN']['top_v_r']}:J{block_info['MIN']['tot_r']-1})"),
        ("Industria", start_area_summary_r + 2, f"=C{block_info['IND']['top_v_r']}", f"=SUM(J{block_info['IND']['top_v_r']}:J{block_info['IND']['tot_r']-1})"),
        ("Petroquímica", start_area_summary_r + 3, f"=C{block_info['OIL']['top_v_r']}", f"=SUM(J{block_info['OIL']['top_v_r']}:J{block_info['OIL']['tot_r']-1})"),
        ("Safety", start_area_summary_r + 4, f"=C{block_info['SFY']['top_v_r']}", f"=SUM(J{block_info['SFY']['top_v_r']}:J{block_info['SFY']['tot_r']-1})")
    ]

    for row_idx, (label, r, cuota_f, cons_f) in enumerate(summary_areas_rows):
        is_even = (row_idx % 2 == 1)
        fill_cell = fill_even if is_even else None
        
        c_label = ws_com.cell(row=r, column=2, value=label)
        style_com_cell(c_label, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="left", vertical="center"))
        
        c_cuota = ws_com.cell(row=r, column=3, value=cuota_f)
        style_com_cell(c_cuota, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        
        c_cons = ws_com.cell(row=r, column=4, value=cons_f)
        style_com_cell(c_cons, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        
        c_pct = ws_com.cell(row=r, column=5, value=f"=IF(C{r}>0,D{r}/C{r},0)")
        style_com_cell(c_pct, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')

    # Total Row for Areas Summary
    tot_area_r = start_area_summary_r + 5
    
    c_tot_lbl = ws_com.cell(row=tot_area_r, column=2, value="Total")
    style_com_cell(c_tot_lbl, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="left", vertical="center"))
    
    c_tot_cuota = ws_com.cell(row=tot_area_r, column=3, value=f"=SUM(C{start_area_summary_r+1}:C{tot_area_r-1})")
    style_com_cell(c_tot_cuota, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    
    c_tot_cons = ws_com.cell(row=tot_area_r, column=4, value=f"=SUM(D{start_area_summary_r+1}:D{tot_area_r-1})")
    style_com_cell(c_tot_cons, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    
    c_tot_pct = ws_com.cell(row=tot_area_r, column=5, value=f"=IF(C{tot_area_r}>0,D{tot_area_r}/C{tot_area_r},0)")
    style_com_cell(c_tot_pct, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')

    # Table 2: Salesperson Summary (starts at tot_area_r + 3)
    start_v_summary_r = tot_area_r + 3
    
    # Premium Header styling for Table 2
    headers_t2 = ["Nombre Vendedor", "Obj. Min Mensual", "Obj. Max Mensual", "Obj. Min Anual", "Obj. Max Anual", "Conseguido", "% Min Mensual", "% Max Mensual", "% Min Anual", "% Max Anual"]
    for idx, val in enumerate(headers_t2):
        col_idx = idx + 2
        cell = ws_com.cell(row=start_v_summary_r, column=col_idx, value=val)
        style_com_cell(
            cell, 
            font_hdr, 
            fill=fill_hdr, 
            border=border_thin, 
            alignment=Alignment(horizontal="center", vertical="center", wrap_text=True)
        )
        
    for idx, v in enumerate(vendedores_info):
        r = start_v_summary_r + 1 + idx
        is_even = (idx % 2 == 1)
        fill_cell = fill_even if is_even else None
        
        c_name = ws_com.cell(row=r, column=2, value=v["nombre"])
        style_com_cell(c_name, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="left", vertical="center"))
        
        # Calculate sums across the 4 area blocks for this salesperson
        formula_min_m = "=" + "+".join(f"F{block_info[code]['v_rows'][v['nombre']]}" for code in ["MIN", "IND", "OIL", "SFY"])
        formula_max_m = "=" + "+".join(f"G{block_info[code]['v_rows'][v['nombre']]}" for code in ["MIN", "IND", "OIL", "SFY"])
        formula_min_a = "=" + "+".join(f"H{block_info[code]['v_rows'][v['nombre']]}" for code in ["MIN", "IND", "OIL", "SFY"])
        formula_max_a = "=" + "+".join(f"I{block_info[code]['v_rows'][v['nombre']]}" for code in ["MIN", "IND", "OIL", "SFY"])
        formula_cons  = "=" + "+".join(f"J{block_info[code]['v_rows'][v['nombre']]}" for code in ["MIN", "IND", "OIL", "SFY"])
        
        c_min_m = ws_com.cell(row=r, column=3, value=formula_min_m)
        c_max_m = ws_com.cell(row=r, column=4, value=formula_max_m)
        c_min_a = ws_com.cell(row=r, column=5, value=formula_min_a)
        c_max_a = ws_com.cell(row=r, column=6, value=formula_max_a)
        c_cons  = ws_com.cell(row=r, column=7, value=formula_cons)
        
        c_pmin_m = ws_com.cell(row=r, column=8, value=f"=IF(C{r}>0,G{r}/C{r},0)")
        c_pmax_m = ws_com.cell(row=r, column=9, value=f"=IF(D{r}>0,G{r}/D{r},0)")
        c_pmin_a = ws_com.cell(row=r, column=10, value=f"=IF(E{r}>0,G{r}/E{r},0)")
        c_pmax_a = ws_com.cell(row=r, column=11, value=f"=IF(F{r}>0,G{r}/F{r},0)")
        
        style_com_cell(c_min_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        style_com_cell(c_max_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        style_com_cell(c_min_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        style_com_cell(c_max_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        style_com_cell(c_cons, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        style_com_cell(c_pmin_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
        style_com_cell(c_pmax_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
        style_com_cell(c_pmin_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
        style_com_cell(c_pmax_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')

    # Total Row for Salesperson Summary
    tot_v_r = start_v_summary_r + 1 + len(vendedores_info)
    
    c_tot_v_lbl = ws_com.cell(row=tot_v_r, column=2, value="Total")
    style_com_cell(c_tot_v_lbl, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="left", vertical="center"))
    
    c_tot_min_m = ws_com.cell(row=tot_v_r, column=3, value=f"=SUM(C{start_v_summary_r+1}:C{tot_v_r-1})")
    c_tot_max_m = ws_com.cell(row=tot_v_r, column=4, value=f"=SUM(D{start_v_summary_r+1}:D{tot_v_r-1})")
    c_tot_min_a = ws_com.cell(row=tot_v_r, column=5, value=f"=SUM(E{start_v_summary_r+1}:E{tot_v_r-1})")
    c_tot_max_a = ws_com.cell(row=tot_v_r, column=6, value=f"=SUM(F{start_v_summary_r+1}:F{tot_v_r-1})")
    c_tot_cons  = ws_com.cell(row=tot_v_r, column=7, value=f"=SUM(G{start_v_summary_r+1}:G{tot_v_r-1})")
    
    c_tot_pmin_m = ws_com.cell(row=tot_v_r, column=8, value=f"=IF(C{tot_v_r}>0,G{tot_v_r}/C{tot_v_r},0)")
    c_tot_pmax_m = ws_com.cell(row=tot_v_r, column=9, value=f"=IF(D{tot_v_r}>0,G{tot_v_r}/D{tot_v_r},0)")
    c_tot_pmin_a = ws_com.cell(row=tot_v_r, column=10, value=f"=IF(E{tot_v_r}>0,G{tot_v_r}/E{tot_v_r},0)")
    c_tot_pmax_a = ws_com.cell(row=tot_v_r, column=11, value=f"=IF(F{tot_v_r}>0,G{tot_v_r}/F{tot_v_r},0)")
    
    style_com_cell(c_tot_min_m, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(c_tot_max_m, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(c_tot_min_a, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(c_tot_max_a, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(c_tot_cons, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(c_tot_pmin_m, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
    style_com_cell(c_tot_pmax_m, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
    style_com_cell(c_tot_pmin_a, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
    style_com_cell(c_tot_pmax_a, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')

    # ----------------------------------------------------
    # ADD CHART TO OBJETIVOS COM.
    # ----------------------------------------------------
    from openpyxl.chart import BarChart3D, Reference
    from openpyxl.chart.label import DataLabelList
    from openpyxl.chart.legend import Legend
    from openpyxl.chart._3d import View3D

    chart_com = BarChart3D()
    chart_com.roundedCorners = True
    chart_com.type = "col"
    chart_com.grouping = "clustered"
    chart_com.style = 10
    
    # Set Title
    set_chart_title(chart_com, "Seguimiento Objetivo Comercial", 12)
    
    # Define references for Y-values (Cuota Comercial and Conseguido)
    ref_data = Reference(ws_com, min_col=3, max_col=4, min_row=start_area_summary_r, max_row=start_area_summary_r + 4)
    cats = Reference(ws_com, min_col=2, min_row=start_area_summary_r + 1, max_row=start_area_summary_r + 4)
    
    chart_com.add_data(ref_data, titles_from_data=True)
    chart_com.set_categories(cats)

    # Style series solid fill colors
    if len(chart_com.series) > 0:
        chart_com.series[0].graphicalProperties.solidFill = "8FAADC"  # Soft Corporate Blue
    if len(chart_com.series) > 1:
        chart_com.series[1].graphicalProperties.solidFill = "237573"  # Premium Teal
        
    # Legend settings (at the top)
    chart_com.legend = Legend()
    chart_com.legend.position = "t"
    
    # Data Labels
    chart_com.dataLabels = DataLabelList()
    chart_com.dataLabels.showVal = True
    chart_com.dataLabels.showCatName = False
    chart_com.dataLabels.showSerName = False
    chart_com.dataLabels.showPercent = False
    chart_com.dataLabels.showLegendKey = False
    chart_com.dataLabels.numFmt = '$ #,##0.00'
    
    # Axes and Gridlines
    chart_com.y_axis.delete = True
    chart_com.x_axis.delete = False
    chart_com.y_axis.majorGridlines = None
    chart_com.x_axis.majorGridlines = None

    # Chart 3D View properties to make it match premium styling
    chart_com.view3D = View3D(rotX=10, rotY=40, rAngAx=False)
    chart_com.view3D.perspective = 0
    chart_com.view3D.depthPercent = 130

    # Dimensions (width and height)
    chart_com.width = 16.5
    chart_com.height = 8.5
    
    # Add chart anchored at M{start_area_summary_r}
    ws_com.add_chart(chart_com, f"M{start_area_summary_r}")

    # Column widths settings
    for col in ws_com.columns:
        col_num = col[0].column
        col_letter = get_column_letter(col_num)
        min_width = 16 if col_num in [3, 4, 6, 7, 8, 9, 10] else (20 if col_num == 2 else (6 if col_num == 1 else 12))
        max_len = 0
        for cell in col:
            val_str = str(cell.value or '')
            if val_str.startswith('='):
                continue
            max_len = max(max_len, len(val_str))
        ws_com.column_dimensions[col_letter].width = max(max_len + 3, min_width)

    # ----------------------------------------------------
    # SHEET 2012 - 2026: COMPARATIVA HISTÓRICA
    # ----------------------------------------------------
    import json
    import os
    hist_path = os.path.join(os.path.dirname(__file__), "historical_data.json")
    try:
        with open(hist_path, "r", encoding="utf-8") as f:
            hist_data = json.load(f)
    except Exception:
        hist_data = {"IND": {}, "MIN": {}, "OIL": {}, "SFY": {}}

    # Calculate 2015-anno monthly values dynamically from DB
    db_monthly_sums = {}
    for y in range(2015, anno + 1):
        for code in ["MIN", "IND", "OIL", "SFY"]:
            db_monthly_sums[(y, code)] = [Decimal("0.00")] * 12

    all_openings_db = CotizacionApertura.objects.filter(
        anno_a__in=[str(y) for y in range(2015, anno + 1)],
        estado_orden__in=[1, 2, 3]
    ).annotate(
        m=ExtractMonth("fecha_orden")
    ).select_related("id_registro")

    for ap in all_openings_db:
        area_code = areas_codes.get(ap.id_registro.id_area if ap.id_registro else None)
        if area_code:
            try:
                y = int(ap.anno_a)
            except (ValueError, TypeError):
                continue
            m = ap.m or ap.mes or (ap.id_registro.mes if ap.id_registro else None) or 1
            if 1 <= m <= 12 and 2015 <= y <= anno:
                db_monthly_sums[(y, area_code)][m-1] += (ap.total_orden or Decimal("0.00"))

    # Pre-calculate database sums for Table 2 (years comparison)
    years_db_data = {}
    for y in range(2015, anno + 1):
        openings_y = CotizacionApertura.objects.filter(
            anno_a=str(y),
            estado_orden__in=[1, 2, 3]
        ).select_related("id_registro")

        cot_openings_y = defaultdict(list)
        for ap in openings_y:
            if ap.id_registro:
                cot_openings_y[ap.id_registro].append(ap)

        total_monto_oc = Decimal("0.00")
        total_kpi = Decimal("0.00")
        total_qty = 0

        for cot, aps in cot_openings_y.items():
            total_qty += 1
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

            total_monto_oc += val_pres
            total_kpi += (hh + utilidad)

        years_db_data[y] = [float(total_monto_oc), float(total_kpi), total_qty]

    ws_hist = wb.create_sheet(title="2012 - 2026")
    ws_hist.views.sheetView[0].showGridLines = True
    
    font_segoe = Font(name="Segoe UI", size=9)
    font_bold = Font(name="Segoe UI", size=10, bold=True)
    font_hdr = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    fill_hdr = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
    fill_sub = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    border_thin = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )
    border_total = Border(
        top=Side(style='thin', color='000000'),
        bottom=Side(style='double', color='000000')
    )

    # 1. TABLE 1: Gerencias (Row 2 to 7)
    ws_hist.cell(row=2, column=1, value="Gerencia").font = font_hdr
    ws_hist.cell(row=2, column=1).fill = fill_hdr
    ws_hist.cell(row=2, column=1).alignment = Alignment(horizontal="center")
    
    ws_hist.cell(row=2, column=2, value="Monto OC").font = font_hdr
    ws_hist.cell(row=2, column=2).fill = fill_hdr
    ws_hist.cell(row=2, column=2).alignment = Alignment(horizontal="center")
    
    ws_hist.cell(row=2, column=3, value="Cantidad").font = font_hdr
    ws_hist.cell(row=2, column=3).fill = fill_hdr
    ws_hist.cell(row=2, column=3).alignment = Alignment(horizontal="center")

    areas_list = ["IND", "MIN", "OIL", "SFY"]
    for idx, area in enumerate(areas_list):
        r = idx + 3
        fill_cell = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid") if idx % 2 == 1 else None
        c_area = ws_hist.cell(row=r, column=1, value=area)
        c_area.font = font_segoe
        c_area.border = border_thin
        c_area.alignment = Alignment(horizontal="center")
        if fill_cell:
            c_area.fill = fill_cell
        
        m_row = tot_main_rows.get(area, 3)
        c_monto = ws_hist.cell(row=r, column=2, value=f"={area}!O{m_row}")
        c_monto.font = font_segoe
        c_monto.border = border_thin
        c_monto.number_format = '$ #,##0.00'
        c_monto.alignment = Alignment(horizontal="right")
        if fill_cell:
            c_monto.fill = fill_cell
        
        c_cant = ws_hist.cell(row=r, column=3, value=f"={area}!P{m_row}")
        c_cant.font = font_segoe
        c_cant.border = border_thin
        c_cant.alignment = Alignment(horizontal="center")
        if fill_cell:
            c_cant.fill = fill_cell

    # Row 7: Total
    r = 7
    c_tot_lbl = ws_hist.cell(row=r, column=1, value="Total")
    c_tot_lbl.font = font_bold
    c_tot_lbl.border = border_total
    c_tot_lbl.fill = fill_sub
    c_tot_lbl.alignment = Alignment(horizontal="center")
    
    c_tot_monto = ws_hist.cell(row=r, column=2, value="=SUM(B3:B6)")
    c_tot_monto.font = font_bold
    c_tot_monto.border = border_total
    c_tot_monto.fill = fill_sub
    c_tot_monto.number_format = '$ #,##0.00'
    c_tot_monto.alignment = Alignment(horizontal="right")
    
    c_tot_cant = ws_hist.cell(row=r, column=3, value="=SUM(C3:C6)")
    c_tot_cant.font = font_bold
    c_tot_cant.border = border_total
    c_tot_cant.fill = fill_sub
    c_tot_cant.alignment = Alignment(horizontal="center")

    # 2. TABLE 2: Years comparison (Row 2 to 17, Columns I to M)
    ws_hist.cell(row=2, column=9, value="Año").font = font_hdr
    ws_hist.cell(row=2, column=9).fill = fill_hdr
    ws_hist.cell(row=2, column=9).alignment = Alignment(horizontal="center")
    
    ws_hist.cell(row=2, column=10, value="Montos OC").font = font_hdr
    ws_hist.cell(row=2, column=10).fill = fill_hdr
    ws_hist.cell(row=2, column=10).alignment = Alignment(horizontal="center")
    
    ws_hist.cell(row=2, column=11, value="HH+Utilidad").font = font_hdr
    ws_hist.cell(row=2, column=11).fill = fill_hdr
    ws_hist.cell(row=2, column=11).alignment = Alignment(horizontal="center")
    
    ws_hist.cell(row=2, column=12, value="Objetivo Mínimo").font = font_hdr
    ws_hist.cell(row=2, column=12).fill = fill_hdr
    ws_hist.cell(row=2, column=12).alignment = Alignment(horizontal="center")
    
    ws_hist.cell(row=2, column=13, value="Cantidad").font = font_hdr
    ws_hist.cell(row=2, column=13).fill = fill_hdr
    ws_hist.cell(row=2, column=13).alignment = Alignment(horizontal="center")

    historical_objectives = {
        2014: 599213.69,
        2015: 791852.48,
        2016: 791852.48,
        2017: 786394.20,
        2018: 1015424.41,
        2019: 1016302.22,
        2020: 869409.41,
        2021: 864817.23,
        2022: 726996.85,
        2023: 872396.23,
        2024: 1046875.48,
        2025: 1046875.48
    }

    years_data = []
    years_data.append([2012, 856894.56, 0.0, None, 132])
    years_data.append([2013, 1173006.51, 0.0, None, 172])
    years_data.append([2014, 1469563.62, 766989.82, 599213.69, 198])

    for y in range(2015, anno):
        db_vals = years_db_data.get(y, [0.0, 0.0, 0])
        obj_min = historical_objectives.get(y, None)
        years_data.append([y, db_vals[0], db_vals[1], obj_min, db_vals[2]])

    for idx, row_vals in enumerate(years_data):
        r = idx + 3
        fill_cell = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid") if idx % 2 == 1 else None
        c_yr = ws_hist.cell(row=r, column=9, value=row_vals[0])
        c_yr.font = font_segoe
        c_yr.border = border_thin
        c_yr.alignment = Alignment(horizontal="center")
        if fill_cell:
            c_yr.fill = fill_cell
        
        c_monto = ws_hist.cell(row=r, column=10, value=row_vals[1])
        c_monto.font = font_segoe
        c_monto.border = border_thin
        c_monto.number_format = '$ #,##0.00'
        c_monto.alignment = Alignment(horizontal="right")
        if fill_cell:
            c_monto.fill = fill_cell
        
        c_hh = ws_hist.cell(row=r, column=11, value=row_vals[2])
        c_hh.font = font_segoe
        c_hh.border = border_thin
        c_hh.number_format = '$ #,##0.00'
        c_hh.alignment = Alignment(horizontal="right")
        if fill_cell:
            c_hh.fill = fill_cell
        
        c_obj = ws_hist.cell(row=r, column=12, value=row_vals[3])
        c_obj.font = font_segoe
        c_obj.border = border_thin
        if row_vals[3] is not None:
            c_obj.number_format = '$ #,##0.00'
            c_obj.alignment = Alignment(horizontal="right")
        if fill_cell:
            c_obj.fill = fill_cell
        
        c_cant = ws_hist.cell(row=r, column=13, value=row_vals[4])
        c_cant.font = font_segoe
        c_cant.border = border_thin
        c_cant.alignment = Alignment(horizontal="center")
        if fill_cell:
            c_cant.fill = fill_cell

    # Row current year
    r = len(years_data) + 3
    c_yr = ws_hist.cell(row=r, column=9, value=anno)
    c_yr.font = font_bold
    c_yr.border = border_total
    c_yr.fill = fill_sub
    c_yr.alignment = Alignment(horizontal="center")
    
    c_monto = ws_hist.cell(row=r, column=10, value="=B7")
    c_monto.font = font_bold
    c_monto.border = border_total
    c_monto.fill = fill_sub
    c_monto.number_format = '$ #,##0.00'
    c_monto.alignment = Alignment(horizontal="right")
    
    c_hh = ws_hist.cell(row=r, column=11, value="=Objetivos!D7")
    c_hh.font = font_bold
    c_hh.border = border_total
    c_hh.fill = fill_sub
    c_hh.number_format = '$ #,##0.00'
    c_hh.alignment = Alignment(horizontal="right")
    
    c_obj = ws_hist.cell(row=r, column=12, value="=Objetivos!C7")
    c_obj.font = font_bold
    c_obj.border = border_total
    c_obj.fill = fill_sub
    c_obj.number_format = '$ #,##0.00'
    c_obj.alignment = Alignment(horizontal="right")
    
    c_cant = ws_hist.cell(row=r, column=13, value="=C7")
    c_cant.font = font_bold
    c_cant.border = border_total
    c_cant.fill = fill_sub
    c_cant.alignment = Alignment(horizontal="center")

    # ----------------------------------------------------
    # GRÁFICOS TOP DE LA HOJA HISTÓRICA (2012 - 2026)
    # ----------------------------------------------------
    data_end_r_tbl2 = len(years_data) + 3

    # 1. Chart 2: Gráfico de Torta '% OC Área' (anclado en E2, al costado de la Tabla 1)
    pie_hist = PieChart3D()
    pie_hist.roundedCorners = True
    set_chart_title(pie_hist, "% OC Área", 12)
    pie_hist_data = Reference(ws_hist, min_col=2, min_row=2, max_row=6)
    pie_hist_cats = Reference(ws_hist, min_col=1, min_row=3, max_row=6)
    pie_hist.add_data(pie_hist_data, titles_from_data=True)
    pie_hist.set_categories(pie_hist_cats)
    
    # Colorear las rebanadas del gráfico de torta con colores específicos y variados
    # IND (Blue), MIN (Red), OIL (Green), SFY (Purple)
    slice_colors = ["4F81BD", "C0504D", "9BBB59", "8064A2"]
    for idx, color in enumerate(slice_colors):
        dp = DataPoint(idx=idx)
        dp.graphicalProperties.solidFill = color
        pie_hist.series[0].dPt.append(dp)
        
    pie_hist.dataLabels = DataLabelList()
    pie_hist.dataLabels.showCatName = True
    pie_hist.dataLabels.showPercent = True
    pie_hist.dataLabels.showVal = False
    pie_hist.legend = None
    pie_hist.width = 8.5
    pie_hist.height = 9.0
    ws_hist.add_chart(pie_hist, "E2")

    # 2. Chart 1: Gráfico de Columnas 'Evolución OC vs HH y Utilidad' (anclado en O2)
    bar_hist = BarChart3D()
    bar_hist.roundedCorners = True
    bar_hist.type = "col"
    bar_hist.style = 10
    set_chart_title(bar_hist, "Evolución OC vs HH y Utilidad", 12)
    bar_hist_data = Reference(ws_hist, min_col=10, min_row=2, max_col=11, max_row=data_end_r_tbl2)
    bar_hist_cats = Reference(ws_hist, min_col=9, min_row=3, max_row=data_end_r_tbl2)
    bar_hist.add_data(bar_hist_data, titles_from_data=True)
    if len(bar_hist.series) > 0:
        bar_hist.series[0].graphicalProperties.solidFill = "8FAADC" # Soft Blue
    if len(bar_hist.series) > 1:
        bar_hist.series[1].graphicalProperties.solidFill = "237573" # Teal
    bar_hist.set_categories(bar_hist_cats)
    bar_hist.legend = None
    bar_hist.y_axis.delete = False
    bar_hist.plot_area.dTable = DataTable(showHorzBorder=True, showVertBorder=True, showOutline=True, showKeys=True)
    
    # Responsivo
    bar_hist.width = max(18, 10 + len(years_data) * 1.2)
    bar_hist.height = 11
    ws_hist.add_chart(bar_hist, "O2")

    # 3. Chart 3: Gráfico de Líneas 'Evolución OC, Objetivos Minimos y HH+Utilidad' (anclado a la derecha de Chart 1)
    line_hist = LineChart()
    line_hist.roundedCorners = True
    line_hist.style = 13
    set_chart_title(line_hist, "Evolución OC, Objetivos Minimos y HH+Utilidad", 12)
    line_hist_data = Reference(ws_hist, min_col=10, min_row=2, max_col=12, max_row=data_end_r_tbl2)
    line_hist_cats = Reference(ws_hist, min_col=9, min_row=3, max_row=data_end_r_tbl2)
    line_hist.add_data(line_hist_data, titles_from_data=True)
    line_hist.set_categories(line_hist_cats)
    line_hist.legend = None
    line_hist.y_axis.delete = False
    line_hist.plot_area.dTable = DataTable(showHorzBorder=True, showVertBorder=True, showOutline=True, showKeys=True)
    
    # Personalizar los colores de las líneas para usar tonalidades bien variadas
    # Serie 0 (Montos OC) -> Teal (237573)
    # Serie 1 (HH+Utilidad) -> Azul Suave (8FAADC)
    # Serie 2 (Objetivo Mínimo) -> Morado Suave (8064A2)
    if len(line_hist.series) >= 3:
        line_hist.series[0].graphicalProperties.line.solidFill = "237573"
        line_hist.series[1].graphicalProperties.line.solidFill = "8FAADC"
        line_hist.series[2].graphicalProperties.line.solidFill = "8064A2"
        
    # Responsivo
    line_hist.width = max(18, 10 + len(years_data) * 1.2)
    line_hist.height = 11
    
    # Posicionar dejando 2 columnas libres de separación
    cols_covered = int(bar_hist.width / 1.7)
    chart3_col = get_column_letter(15 + cols_covered + 2)
    ws_hist.add_chart(line_hist, f"{chart3_col}2")

    # 3. Monthly details (Starts dynamically)
    month_names_hist = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]
    area_blocks = [
        ("INDUSTRIA", "IND"),
        ("MINERIA", "MIN"),
        ("PETROQUIMICA", "OIL"),
        ("SAFETY", "SFY")
    ]

    area_row_refs = {}
    current_r = max(len(years_data) + 3, 22) + 3
    for title, code in area_blocks:
        ws_hist.cell(row=current_r, column=1, value=title).font = font_bold
        ws_hist.merge_cells(start_row=current_r, start_column=1, end_row=current_r, end_column=14)
        
        ws_hist.cell(row=current_r+1, column=1, value="Año").font = font_hdr
        ws_hist.cell(row=current_r+1, column=1).fill = fill_hdr
        ws_hist.cell(row=current_r+1, column=1).alignment = Alignment(horizontal="center")
        
        for c_idx, m_name in enumerate(month_names_hist):
            cell = ws_hist.cell(row=current_r+1, column=c_idx+2, value=m_name)
            cell.font = font_hdr
            cell.fill = fill_hdr
            cell.alignment = Alignment(horizontal="center")
            
        cell_tot = ws_hist.cell(row=current_r+1, column=14, value="Total")
        cell_tot.font = font_hdr
        cell_tot.fill = fill_hdr
        cell_tot.alignment = Alignment(horizontal="center")

        # Years 2011 to anno
        area_hist = hist_data.get(code, {})
        years_range = list(range(2011, anno + 1))
        for yr_idx, y in enumerate(years_range):
            r = current_r + 2 + yr_idx
            
            c_y = ws_hist.cell(row=r, column=1, value=y)
            c_y.alignment = Alignment(horizontal="center")
            
            is_current = (y == anno)
            fill_cell = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid") if (yr_idx % 2 == 1 and not is_current) else None
            if is_current:
                area_row_refs[code] = r
                c_y.font = font_bold
                c_y.border = border_total
                c_y.fill = fill_sub
            else:
                c_y.font = font_segoe
                c_y.border = border_thin
                if fill_cell:
                    c_y.fill = fill_cell
            
            if y < 2015:
                y_m_vals = area_hist.get(str(y), [0.0]*12)
            else:
                y_m_vals = db_monthly_sums.get((y, code), [Decimal("0.00")]*12)
                
            for m_idx in range(12):
                c_m = ws_hist.cell(row=r, column=m_idx+2, value=float(y_m_vals[m_idx]))
                c_m.border = border_total if is_current else border_thin
                c_m.number_format = '$ #,##0.00'
                c_m.alignment = Alignment(horizontal="right")
                if is_current:
                    c_m.font = font_bold
                    c_m.fill = fill_sub
                else:
                    c_m.font = font_segoe
                    if fill_cell:
                        c_m.fill = fill_cell
                
            c_tot = ws_hist.cell(row=r, column=14, value=f"=SUM(B{r}:M{r})")
            c_tot.border = border_total if is_current else border_thin
            c_tot.number_format = '$ #,##0.00'
            c_tot.alignment = Alignment(horizontal="right")
            if is_current:
                c_tot.font = font_bold
                c_tot.fill = fill_sub
            else:
                c_tot.font = font_segoe
                if fill_cell:
                    c_tot.fill = fill_cell
                
        # ----------------------------------------------------
        # GRÁFICOS MENSUALES POR ÁREA
        # ----------------------------------------------------
        data_start_r = current_r + 2
        data_end_r = current_r + 2 + len(years_range) - 1
        
        # 1. Gráfico "Montos Ordenes Mes a Mes" (de columnas 3D)
        chart_a = BarChart3D()
        chart_a.roundedCorners = True
        chart_a.type = "col"
        chart_a.style = 10
        set_chart_title(chart_a, "Montos Ordenes Mes a Mes", 12)
        
        # Mostrar únicamente el Título del gráfico y la Tabla de datos para un diseño más limpio
        chart_a.y_axis.delete = True   # Ocultar eje Y de valores
        chart_a.x_axis.delete = True   # Ocultar eje X (redundante con los meses en la tabla de datos)
        chart_a.legend = None          # Ocultar la leyenda
        chart_a.y_axis.majorGridlines = None # Ocultar líneas de la cuadrícula
        chart_a.x_axis.majorGridlines = None
        chart_a.plot_area.dTable = DataTable(showHorzBorder=True, showVertBorder=True, showOutline=True, showKeys=True)
        
        for yr_idx, y in enumerate(years_range):
            row_num = data_start_r + yr_idx
            # Reference includes the year in column 1 and monthly columns 2-13
            s_val = Reference(ws_hist, min_col=1, max_col=13, min_row=row_num, max_row=row_num)
            chart_a.add_data(s_val, titles_from_data=True, from_rows=True)
            
        # Categorías: meses ENE a DIC
        # NOTA: set_categories debe llamarse DESPUÉS de add_data para asociar las etiquetas de los meses
        cats_a = Reference(ws_hist, min_col=2, max_col=13, min_row=current_r+1, max_row=current_r+1)
        chart_a.set_categories(cats_a)
        for s in chart_a.series:
            s.graphicalProperties.solidFill = "237573" # Teal
        
        # 2. Gráfico "Evolución por Área" (de columnas 3D, por año)
        chart_b = BarChart3D()
        chart_b.roundedCorners = True
        chart_b.type = "col"
        chart_b.style = 10
        
        evolucion_titles = {
            "IND": "Evolución OC Industria",
            "MIN": "Evolución OC Minería",
            "OIL": "Evolución Petroquímica",
            "SFY": "Evolución Anual Safety"
        }
        set_chart_title(chart_b, evolucion_titles.get(code, f"Evolución OC {title}"), 12)
        
        # Mostrar únicamente el Título del gráfico y la Tabla de datos para un diseño más limpio
        chart_b.y_axis.delete = True   # Ocultar eje Y de valores
        chart_b.x_axis.delete = True   # Ocultar eje X (redundante con los años en la tabla de datos)
        chart_b.legend = None          # Ocultar la leyenda
        chart_b.varyColors = True      # Pintar cada columna de un color distinto
        chart_b.gapWidth = 0           # Ancho del intervalo = 0% (columnas juntas sin espacio)
        chart_b.y_axis.majorGridlines = None # Ocultar líneas de la cuadrícula
        chart_b.x_axis.majorGridlines = None
        chart_b.plot_area.dTable = DataTable(showHorzBorder=True, showVertBorder=True, showOutline=True, showKeys=True)
        
        # Valores: la columna de "Total" (14 / N) incluyendo la cabecera (current_r + 1)
        s_val = Reference(ws_hist, min_col=14, min_row=current_r+1, max_row=data_end_r)
        chart_b.add_data(s_val, titles_from_data=True)
        
        # Categorías: los años de la columna 1 (A)
        # NOTA: set_categories debe llamarse DESPUÉS de add_data para asociar las etiquetas de los años
        cats_b = Reference(ws_hist, min_col=1, min_row=data_start_r, max_row=data_end_r)
        chart_b.set_categories(cats_b)
            
        # Largo (width) de 21.2 cm y alto (height) ajustado dinámicamente al tamaño de la tabla (con un mínimo de 7.5 cm del reporte base (25).xlsx)
        chart_b.width = 21.2
        chart_b.height = max(7.5, (len(years_range) + 1) * 0.53)
        ws_hist.add_chart(chart_b, f"P{current_r + 1}")
        
        # Posicionar el gráfico de Montos Ordenes Mes a Mes a la derecha de la Evolución por Área
        cols_covered = int(chart_b.width / 1.7)
        chart_a_col = get_column_letter(16 + cols_covered + 2)
        
        # Largo (width) de 33.73 cm y alto (height) calculado dinámicamente (con un mínimo de 7.5 cm del reporte base (25).xlsx)
        chart_a.width = 33.73
        chart_a.height = max(7.5, 5.77 + len(years_range) * 0.53)
        ws_hist.add_chart(chart_a, f"{chart_a_col}{current_r + 1}")
        
        # Avanzar al siguiente bloque dejando exactamente 2 filas de espacio en blanco debajo de la gráfica más alta (chart_a)
        current_r = current_r + round(chart_a.height / 0.53) + 3

    # ----------------------------------------------------
    # TABLA GENERAL Y GRÁFICOS AL FINAL
    # ----------------------------------------------------
    # Fila de Título
    ws_hist.cell(row=current_r, column=1, value="GENERAL").font = font_bold
    ws_hist.merge_cells(start_row=current_r, start_column=1, end_row=current_r, end_column=6)

    # Cabeceras de la tabla
    headers_gen = ["Mes", "Total", "MIN", "IND", "OIL", "SFY"]
    for c_idx, h_name in enumerate(headers_gen):
        cell = ws_hist.cell(row=current_r + 1, column=c_idx + 1, value=h_name)
        cell.font = font_hdr
        cell.fill = fill_hdr
        cell.alignment = Alignment(horizontal="center")

    month_names_full = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"
    ]

    gen_start_row = current_r + 2
    for m_idx, m_name in enumerate(month_names_full):
        r = gen_start_row + m_idx
        fill_cell = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid") if m_idx % 2 == 1 else None

        # Columna 1: Nombre del Mes
        c_month = ws_hist.cell(row=r, column=1, value=m_name)
        c_month.font = font_segoe
        c_month.border = border_thin
        c_month.alignment = Alignment(horizontal="center")
        if fill_cell:
            c_month.fill = fill_cell

        # Columna 2: SUM Total -> =SUM(C{r}:F{r})
        c_tot = ws_hist.cell(row=r, column=2, value=f"=SUM(C{r}:F{r})")
        c_tot.font = font_segoe
        c_tot.border = border_thin
        c_tot.number_format = '$ #,##0.00'
        c_tot.alignment = Alignment(horizontal="right")
        if fill_cell:
            c_tot.fill = fill_cell

        # Columnas 3 a 6: Referencias a las áreas para el año actual
        m_col_let = get_column_letter(2 + m_idx) # Ene = B, Feb = C, ..., Dic = M
        
        # MIN
        c_min = ws_hist.cell(row=r, column=3, value=f"={m_col_let}{area_row_refs.get('MIN', 0)}")
        c_min.font = font_segoe
        c_min.border = border_thin
        c_min.number_format = '$ #,##0.00'
        c_min.alignment = Alignment(horizontal="right")
        if fill_cell:
            c_min.fill = fill_cell

        # IND
        c_ind = ws_hist.cell(row=r, column=4, value=f"={m_col_let}{area_row_refs.get('IND', 0)}")
        c_ind.font = font_segoe
        c_ind.border = border_thin
        c_ind.number_format = '$ #,##0.00'
        c_ind.alignment = Alignment(horizontal="right")
        if fill_cell:
            c_ind.fill = fill_cell

        # OIL
        c_oil = ws_hist.cell(row=r, column=5, value=f"={m_col_let}{area_row_refs.get('OIL', 0)}")
        c_oil.font = font_segoe
        c_oil.border = border_thin
        c_oil.number_format = '$ #,##0.00'
        c_oil.alignment = Alignment(horizontal="right")
        if fill_cell:
            c_oil.fill = fill_cell

        # SFY
        c_sfy = ws_hist.cell(row=r, column=6, value=f"={m_col_let}{area_row_refs.get('SFY', 0)}")
        c_sfy.font = font_segoe
        c_sfy.border = border_thin
        c_sfy.number_format = '$ #,##0.00'
        c_sfy.alignment = Alignment(horizontal="right")
        if fill_cell:
            c_sfy.fill = fill_cell

    # 1. Gráfico 12: Evolución OC Mensual {anno}
    chart_tot = BarChart3D()
    chart_tot.roundedCorners = True
    chart_tot.type = "col"
    chart_tot.style = 10
    set_chart_title(chart_tot, f"Evolución OC Mensual {anno}", 12)
    chart_tot.y_axis.delete = True
    chart_tot.x_axis.delete = False  # EJE HORIZONTAL visible
    chart_tot.legend = None          # SIN LEYENDA
    chart_tot.y_axis.majorGridlines = None  # SIN LÍNEAS DE CUADRÍCULA
    chart_tot.x_axis.majorGridlines = None
    chart_tot.plot_area.dTable = None  # SIN TABLA DE DATOS

    # ETIQUETA DE DATOS
    chart_tot.dataLabels = DataLabelList()
    chart_tot.dataLabels.showVal = True
    chart_tot.dataLabels.showCatName = False
    chart_tot.dataLabels.showSerName = False
    chart_tot.dataLabels.showPercent = False
    chart_tot.dataLabels.showLegendKey = False  # SIN CUADRO DE LEYENDA EN ETIQUETAS
    chart_tot.dataLabels.numFmt = '$ #,##0.00'  # Formato moneda para las etiquetas de datos

    # Valores: Columna de Total (col 2/B) desde la cabecera (current_r+1) hasta Diciembre
    s_val = Reference(ws_hist, min_col=2, min_row=current_r + 1, max_row=gen_start_row + 11)
    chart_tot.add_data(s_val, titles_from_data=True)
    if len(chart_tot.series) > 0:
        chart_tot.series[0].graphicalProperties.solidFill = "237573" # Teal

    # Categorías: Meses (col 1/A)
    cats = Reference(ws_hist, min_col=1, min_row=gen_start_row, max_row=gen_start_row + 11)
    chart_tot.set_categories(cats)

    chart_tot.width = 21.2   # Ancho premium para evitar amontonamiento de datos y mantener los meses horizontales
    chart_tot.height = 10.07  # Alto premium (19 filas) para separar las etiquetas de datos verticalmente
    ws_hist.add_chart(chart_tot, f"I{current_r + 1}")  # Anclado en columna I para evitar rotación de meses

    # 2. Gráficos 13-16: Evolución OC Mensual por Área
    # Dejamos el espaciado vertical dinámico (anclados en la fila current_r + 22, i.e. 167)
    # Gaps horizontales de exactamente 1 columna libre para un diseño limpio y uniforme
    area_chart_details = [
        ("MIN", "Minería", f"A{current_r + 22}", 3),
        ("IND", "Industria", f"H{current_r + 22}", 4),  # Anchor H (Col 8)
        ("OIL", "Petroquímica", f"O{current_r + 22}", 5),  # Anchor O (Col 15)
        ("SFY", "Safety", f"AB{current_r + 22}", 6)  # Anchor AB (Col 28)
    ]

    for code, name, anchor, col_idx in area_chart_details:
        chart_area = BarChart3D()
        chart_area.roundedCorners = True
        chart_area.type = "col"
        chart_area.style = 10
        set_chart_title(chart_area, f"Evolución OC Mensual {name} {anno}", 12)
        chart_area.y_axis.delete = True
        chart_area.x_axis.delete = False
        chart_area.legend = None
        chart_area.y_axis.majorGridlines = None
        chart_area.x_axis.majorGridlines = None
        chart_area.plot_area.dTable = None

        # ETIQUETA DE DATOS
        chart_area.dataLabels = DataLabelList()
        chart_area.dataLabels.showVal = True
        chart_area.dataLabels.showCatName = False
        chart_area.dataLabels.showSerName = False
        chart_area.dataLabels.showPercent = False
        chart_area.dataLabels.showLegendKey = False  # SIN CUADRO DE LEYENDA EN ETIQUETAS
        chart_area.dataLabels.numFmt = '$ #,##0.00'

        s_val_area = Reference(ws_hist, min_col=col_idx, min_row=current_r + 1, max_row=gen_start_row + 11)
        chart_area.add_data(s_val_area, titles_from_data=True)
        
        area_colors = {
            "MIN": "237573", # Teal
            "IND": "8FAADC", # Soft Blue
            "OIL": "8064A2", # Soft Purple
            "SFY": "C0504D"  # Soft Red
        }
        if len(chart_area.series) > 0:
            chart_area.series[0].graphicalProperties.solidFill = area_colors.get(code, "237573")
            
        chart_area.set_categories(cats)

        chart_area.width = 15
        chart_area.height = 7.5
        ws_hist.add_chart(chart_area, anchor)

    for col in ws_hist.columns:
        col_num = col[0].column
        col_letter = get_column_letter(col_num)
        min_width = 16 if col_num > 1 else 12
        max_len = 0
        for cell in col:
            val_str = str(cell.value or '')
            if val_str.startswith('='):
                continue
            max_len = max(max_len, len(val_str))
        ws_hist.column_dimensions[col_letter].width = max(max_len + 3, min_width)

    # Reorder sheets to correct order: MIN, OIL, IND, SFY, 2012 - 2026, Objetivos, Objetivos Com.
    order = ["MIN", "OIL", "IND", "SFY", "2012 - 2026", "Objetivos", "Objetivos Com."]
    sheets_dict = {ws.title: ws for ws in wb.worksheets}
    new_sheets = []
    for title in order:
        if title in sheets_dict:
            new_sheets.append(sheets_dict[title])
    # Add any other sheets not in the list
    for ws in wb.worksheets:
        if ws.title not in order:
            new_sheets.append(ws)
    wb._sheets = new_sheets

    # SALVAGUARDA GLOBAL DE ANCHOS DE COLUMNAS CONTRA ###
    from openpyxl.utils import get_column_letter
    for sheet in wb.worksheets:
        for col in sheet.columns:
            col_num = col[0].column
            col_letter = get_column_letter(col_num)
            max_len = 0
            for cell in col:
                # Omitir filas de cabecera (1 y 2) para el cálculo dinámico de anchos
                # ya que sus títulos largos están configurados con "Ajustar texto" (wrap text)
                if cell.row in [1, 2]:
                    continue
                val = cell.value
                if val is None:
                    continue
                val_str = str(val)
                if val_str.startswith('='):
                    max_len = max(max_len, 14)
                else:
                    max_len = max(max_len, len(val_str))
            
            if max_len > 0:
                current_width = sheet.column_dimensions[col_letter].width
                if col_num == 1:
                    safe_width = max(max_len + 3, 10) # Mantener la columna A de Área compacta (ancho 10)
                else:
                    safe_width = max(max_len + 4, 13)
                
                if sheet.title in ["Objetivos", "Objetivos Com."]:
                    if col_num in [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13]: # B to J, L, M
                        safe_width = max(safe_width, 18)
    return wb


@api_view(["GET"])
def exportar_mensual(request):
    anno = int(request.GET.get("anno", datetime.now().year))
    mes_param = request.GET.get("mes", "")
    wb = generar_reporte_mensual_excel(anno, mes_param)

    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="SGC.REG-004 Seguimiento de OC {anno}.xlsx"'
    wb.save(response)
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_anual(request):
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.chart import BarChart3D, PieChart3D, Reference
    from openpyxl.chart.plotarea import DataTable
    from openpyxl.chart.label import DataLabelList
    from collections import defaultdict

    anno = int(request.GET.get("anno", datetime.now().year))

    def format_orders(orders_list):
        orders = sorted(list(set(filter(None, [str(o).strip() for o in orders_list]))))
        if not orders:
            return "S/N"
        if len(orders) == 1:
            return orders[0]
        return ", ".join(orders[:-1]) + " y " + orders[-1]



    wb = openpyxl.Workbook()
    # Remove default sheet
    default_sheet = wb.active
    wb.remove(default_sheet)

    areas_codes = {2: "MIN", 1: "IND", 4: "OIL", 8: "SFY"}
    area_titles = {
        "MIN": "MINERÍA",
        "IND": "INDUSTRIA",
        "OIL": "PETROQUÍMICA",
        "SFY": "SEGURIDAD DE MAQUINARIA"
    }
    tot_rows = {}
    kpi_rows = {}
    tot_main_rows = {}

    for area_id, area_name in areas_codes.items():
        openings = CotizacionApertura.objects.filter(
            anno_a=str(anno),
            estado_orden__in=[1, 2, 3],
            id_registro__id_area=area_id
        ).select_related("id_registro", "id_registro__id_cliente", "id_registro__id_comercial")

        # Group openings by Cotizacion
        cot_openings = defaultdict(list)
        for ap in openings:
            if ap.id_registro:
                cot_openings[ap.id_registro].append(ap)

        ws = wb.create_sheet(title=area_name)
        ws.views.sheetView[0].showGridLines = True
        ws.append([f"ORDENES DE COMPRA {area_titles[area_name]}"])
        ws.merge_cells("A1:L1")
        ws.cell(1, 1).font = Font(name="Segoe UI", size=14, bold=True, color="1F4E78")
        ws.cell(1, 1).alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        headers = [
            "CÓDIGO", "CLIENTES", "Nº Orden", "PROYECTO", "FECHA O/C", "FECHA ENTREGA",
            "VALOR PRESUPUESTO $", "COSTO", "HH Propia", "IMPREVISTOS", "UTILIDAD", "Personal"
        ]
        ws.append(headers)

        for col_num in range(1, 13):
            cell = ws.cell(row=2, column=col_num)
            cell.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = Border(bottom=Side(border_style="medium", color="000000"))

        row_idx = 3
        for cot, aps in cot_openings.items():
            tipo_moneda = cot.tipo_moneda
            tipo_cambio = cot.tipo_cambio or Decimal("3.70")
            if tipo_cambio <= 0:
                tipo_cambio = Decimal("3.70")
            factor = Decimal("1.00") / tipo_cambio if tipo_moneda == "S" else Decimal("1.00")
            
            # Nº Orden list
            nro_orden = format_orders([ap.numero_orden for ap in aps])

            # Dates (write native date objects for Year/Month groupings in autofilter)
            f_oc = min(filter(None, [ap.fecha_orden for ap in aps]), default=None)
            f_ent = max(filter(None, [ap.fecha_entrega for ap in aps]), default=None)
            fecha_oc = f_oc.date() if f_oc else None
            fecha_entrega = f_ent.date() if f_ent else None

            # Values
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

            client_name = cot.id_cliente.nombre.strip() if cot.id_cliente else ""
            project_ref = cot.referencia.strip() if cot.referencia else ""
            commercial_name = get_short_name(cot.id_comercial.nombre_completo if cot.id_comercial else "")

            row_data = [
                cot.codigo, client_name, nro_orden, project_ref, fecha_oc, fecha_entrega,
                float(val_pres), float(costo), float(hh), float(imprevistos), float(utilidad),
                commercial_name
            ]
            ws.append(row_data)

            for col_num in range(1, 13):
                cell = ws.cell(row=row_idx, column=col_num)
                cell.font = Font(name="Segoe UI", size=9, color="27272A")
                cell.border = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                                     top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))
                
                if col_num in [7, 8, 9, 10, 11]:
                    cell.number_format = '$ #,##0.00'
                    cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
                elif col_num in [5, 6]:
                    cell.number_format = 'dd-mm-yyyy'
                    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                else:
                    cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

            row_idx += 1

        tot_row_idx = row_idx
        tot_rows[area_name] = tot_row_idx

        # Apply auto-filter on the headers and data range (row 2 up to tot_row_idx-1)
        if tot_row_idx > 3:
            ws.auto_filter.ref = f"A2:L{tot_row_idx-1}"

        if tot_row_idx > 3:
            total_row = [
                "TOTAL", "", "", "", "", "",
                f"=SUM(G3:G{tot_row_idx-1})",
                f"=SUM(H3:H{tot_row_idx-1})",
                f"=SUM(I3:I{tot_row_idx-1})",
                f"=SUM(J3:J{tot_row_idx-1})",
                f"=SUM(K3:K{tot_row_idx-1})",
                ""
            ]
        else:
            total_row = [
                "TOTAL", "", "", "", "", "",
                0.0, 0.0, 0.0, 0.0, 0.0,
                ""
            ]
        ws.append(total_row)

        if tot_row_idx > 3:
            ws.merge_cells(start_row=tot_row_idx, start_column=1, end_row=tot_row_idx, end_column=6)

        for col_num in range(1, 13):
            cell = ws.cell(row=tot_row_idx, column=col_num)
            cell.font = Font(name="Segoe UI", size=10, bold=True, color="1E293B")
            cell.fill = PatternFill(fill_type=None)
            cell.border = Border(top=Side(style='thin', color='000000'), bottom=Side(style='double', color='000000'))
            if col_num in [7, 8, 9, 10, 11]:
                cell.number_format = '$ #,##0.00'
                cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
            elif col_num == 1:
                cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

        # ----------------------------------------------------
        # TABLAS DE RESUMEN LATERALES (Columnas M a P/Q)
        # ----------------------------------------------------
        companies_set = set()
        for cot in cot_openings.keys():
            if cot.id_cliente and cot.id_cliente.nombre:
                c_name = cot.id_cliente.nombre.strip()
                if c_name:
                    companies_set.add(c_name)
        monto_companies = sorted(list(companies_set))

        col_monto_emp = 14
        col_monto_val = 15
        col_cant_val = 16

        def style_cell(c_cell, font_name="Segoe UI", size=9, bold=False, italic=False, color=None, fill_color=None, border_type="thin", alignment_type="left", num_format=None):
            c_cell.font = Font(name=font_name, size=size, bold=bold, italic=italic, color=color)
            if fill_color:
                c_cell.fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
            elif border_type == "total":
                c_cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
            else:
                c_cell.fill = PatternFill(fill_type=None)

            c_cell.alignment = Alignment(horizontal=alignment_type, vertical="center", wrap_text=True)
            if num_format:
                c_cell.number_format = num_format

            if border_type == "header":
                c_cell.border = Border(bottom=Side(border_style="medium", color="000000"))
            elif border_type == "total":
                c_cell.border = Border(top=Side(style='thin', color='000000'), bottom=Side(style='double', color='000000'))
            elif border_type == "thin":
                c_cell.border = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                                      top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))

        # Header for Summary Table (Row 2, cols N-P)
        style_cell(ws.cell(row=2, column=col_monto_emp, value="Empresa"), bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
        style_cell(ws.cell(row=2, column=col_monto_val, value="Monto O/C"), bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
        style_cell(ws.cell(row=2, column=col_cant_val, value="Cantidad"), bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")

        # Fill Summary Table with values
        for idx, comp in enumerate(monto_companies):
            r = idx + 3
            style_cell(ws.cell(row=r, column=col_monto_emp, value=comp), border_type="thin")
            
            # Monto O/C formula referencing main table SUMIF
            formula_monto = f'=SUMIF(B3:B{tot_row_idx-1}, "{comp}", G3:G{tot_row_idx-1})'
            style_cell(ws.cell(row=r, column=col_monto_val, value=formula_monto), alignment_type="right", num_format='$ #,##0.00', border_type="thin")
            
            # Cantidad formula referencing main table COUNTIF
            formula_cant = f'=COUNTIF(B3:B{tot_row_idx-1}, "{comp}")'
            style_cell(ws.cell(row=r, column=col_cant_val, value=formula_cant), alignment_type="center", num_format='#,##0', border_type="thin")

        end_row_list = 2 + len(monto_companies)
        tot_main_r = end_row_list + 1
        tot_main_rows[area_name] = tot_main_r

        # Write main table totals row below company list
        style_cell(ws.cell(row=tot_main_r, column=col_monto_emp), border_type="total")
        
        style_cell(ws.cell(row=tot_main_r, column=col_monto_val, value=f"=SUM(G3:G{tot_row_idx-1})"), bold=True, alignment_type="right", num_format='$ #,##0.00', border_type="total")
        
        style_cell(ws.cell(row=tot_main_r, column=col_cant_val, value=f"=COUNTA(A3:A{tot_row_idx-1})"), bold=True, alignment_type="center", num_format='#,##0', border_type="total")

        # Determine total row index (1 blank row between totals row and Monto Total row)
        total_row_idx = end_row_list + 3
            
        # Clean intermediate empty rows
        for r in range(end_row_list + 2, total_row_idx):
            for col_idx in [col_monto_emp, col_monto_val, col_cant_val]:
                ws.cell(row=r, column=col_idx).border = Border()
                ws.cell(row=r, column=col_idx).fill = PatternFill(fill_type=None)

        # Completely clean columns M (13) and Q (17) for all rows
        for r in range(2, total_row_idx + 35):
            ws.cell(row=r, column=13).border = Border()
            ws.cell(row=r, column=13).fill = PatternFill(fill_type=None)
            ws.cell(row=r, column=13).value = None
            ws.cell(row=r, column=17).border = Border()
            ws.cell(row=r, column=17).fill = PatternFill(fill_type=None)
            ws.cell(row=r, column=17).value = None

        # Write financial concept block and other sections
        if area_name == "MIN":
            # Row total_row_idx: Concepto Header
            r = total_row_idx
            ws.cell(row=r, column=13).border = Border()
            c_hdr1 = ws.cell(row=r, column=14, value="Concepto")
            style_cell(c_hdr1, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            c_hdr2 = ws.cell(row=r, column=15, value="Monto")
            style_cell(c_hdr2, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            ws.cell(row=r, column=16).border = Border()
            
            # Row total_row_idx + 1: Costo
            r = total_row_idx + 1
            style_cell(ws.cell(row=r, column=14, value="Costo"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(H3:H{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 2: HH Propia
            r = total_row_idx + 2
            style_cell(ws.cell(row=r, column=14, value="HH Propia"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(I3:I{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 3: Imprevisto
            r = total_row_idx + 3
            style_cell(ws.cell(row=r, column=14, value="Imprevisto"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(J3:J{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 4: Utilidad
            r = total_row_idx + 4
            style_cell(ws.cell(row=r, column=14, value="Utilidad"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(K3:K{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 5: Sum
            r = total_row_idx + 5
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+1}:O{total_row_idx+4})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 7: KPI MIN
            r = total_row_idx + 7
            c_kpi_lbl = ws.cell(row=r, column=14, value="KPI MIN")
            style_cell(c_kpi_lbl, bold=True, alignment_type="left")
            c_kpi_val = ws.cell(row=r, column=15, value=f"=O{total_row_idx+2}+O{total_row_idx+4}")
            style_cell(c_kpi_val, bold=True, alignment_type="right", num_format='$ #,##0.00', border_type="total")
            
            # Row total_row_idx + 8: NOW()
            r = total_row_idx + 8
            c_now = ws.cell(row=r, column=14, value="=NOW()")
            style_cell(c_now, italic=True, alignment_type="left", num_format='dd-mm-yyyy hh:mm')

        elif area_name == "OIL":
            # Row total_row_idx: Concepto Header
            r = total_row_idx
            c_hdr1 = ws.cell(row=r, column=14, value="Concepto")
            style_cell(c_hdr1, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            c_hdr2 = ws.cell(row=r, column=15, value="Monto")
            style_cell(c_hdr2, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            
            # Row total_row_idx + 1: costo
            r = total_row_idx + 1
            style_cell(ws.cell(row=r, column=14, value="costo"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(H3:H{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 2: HH Propia
            r = total_row_idx + 2
            style_cell(ws.cell(row=r, column=14, value="HH Propia"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(I3:I{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 3: Imprevisto
            r = total_row_idx + 3
            style_cell(ws.cell(row=r, column=14, value="Imprevisto"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(J3:J{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 4: Utilidad
            r = total_row_idx + 4
            style_cell(ws.cell(row=r, column=14, value="Utilidad"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(K3:K{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 5: Sum
            r = total_row_idx + 5
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+1}:O{total_row_idx+4})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')

            # Row total_row_idx + 7: KPI OIL
            r = total_row_idx + 7
            c_kpi_lbl = ws.cell(row=r, column=14, value="KPI OIL")
            style_cell(c_kpi_lbl, bold=True, alignment_type="left")
            c_kpi_val = ws.cell(row=r, column=15, value=f"=O{total_row_idx+2}+O{total_row_idx+4}")
            style_cell(c_kpi_val, bold=True, alignment_type="right", num_format='$ #,##0.00', border_type="total")
            
            # Row total_row_idx + 8: NOW()
            r = total_row_idx + 8
            c_now = ws.cell(row=r, column=14, value="=NOW()")
            style_cell(c_now, italic=True, alignment_type="left", num_format='dd-mm-yyyy hh:mm')

        elif area_name == "IND":
            # Row total_row_idx: Concepto Header
            r = total_row_idx
            c_hdr1 = ws.cell(row=r, column=14, value="Concepto")
            style_cell(c_hdr1, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            c_hdr2 = ws.cell(row=r, column=15, value="Monto")
            style_cell(c_hdr2, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            
            # Row total_row_idx + 1: costo
            r = total_row_idx + 1
            style_cell(ws.cell(row=r, column=14, value="costo"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(H3:H{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 2: HH Propia
            r = total_row_idx + 2
            style_cell(ws.cell(row=r, column=14, value="HH Propia"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(I3:I{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 3: Imprevisto
            r = total_row_idx + 3
            style_cell(ws.cell(row=r, column=14, value="Imprevisto"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(J3:J{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 4: Utilidad
            r = total_row_idx + 4
            style_cell(ws.cell(row=r, column=14, value="Utilidad"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(K3:K{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 5: Sum
            r = total_row_idx + 5
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+1}:O{total_row_idx+4})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 8: Por Facturar
            r = total_row_idx + 8
            style_cell(ws.cell(row=r, column=14, value="Por Facturar"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=0.00), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 9: Facturado
            r = total_row_idx + 9
            style_cell(ws.cell(row=r, column=14, value="Facturado"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=0.00), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 10: Sum Facturar/Facturado
            r = total_row_idx + 10
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+8}:O{total_row_idx+9})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 12: KPI IND
            r = total_row_idx + 12
            c_kpi_lbl = ws.cell(row=r, column=14, value="KPI IND")
            style_cell(c_kpi_lbl, bold=True, alignment_type="left")
            c_kpi_val = ws.cell(row=r, column=15, value=f"=O{total_row_idx+2}+O{total_row_idx+4}")
            style_cell(c_kpi_val, bold=True, alignment_type="right", num_format='$ #,##0.00', border_type="total")
            
            # Row total_row_idx + 13: NOW()
            r = total_row_idx + 13
            c_now = ws.cell(row=r, column=14, value="=NOW()")
            style_cell(c_now, italic=True, alignment_type="left", num_format='dd-mm-yyyy hh:mm')

        elif area_name == "SFY":
            # Row total_row_idx: Concepto Header
            r = total_row_idx
            c_hdr1 = ws.cell(row=r, column=14, value="Concepto")
            style_cell(c_hdr1, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            c_hdr2 = ws.cell(row=r, column=15, value="Monto")
            style_cell(c_hdr2, bold=True, color="FFFFFF", fill_color="237573", alignment_type="center", border_type="header")
            
            # Row total_row_idx + 1: costo
            r = total_row_idx + 1
            style_cell(ws.cell(row=r, column=14, value="costo"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(H3:H{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 2: HH Propia
            r = total_row_idx + 2
            style_cell(ws.cell(row=r, column=14, value="HH Propia"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(I3:I{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 3: Imprevisto
            r = total_row_idx + 3
            style_cell(ws.cell(row=r, column=14, value="Imprevisto"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(J3:J{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 4: Utilidad
            r = total_row_idx + 4
            style_cell(ws.cell(row=r, column=14, value="Utilidad"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(K3:K{tot_row_idx-1})"), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 5: Sum
            r = total_row_idx + 5
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+1}:O{total_row_idx+4})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 8: Por Facturar
            r = total_row_idx + 8
            style_cell(ws.cell(row=r, column=14, value="Por Facturar"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=0.00), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 9: Facturado
            r = total_row_idx + 9
            style_cell(ws.cell(row=r, column=14, value="Facturado"), border_type="thin")
            style_cell(ws.cell(row=r, column=15, value=0.00), border_type="thin", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 10: Sum
            r = total_row_idx + 10
            ws.cell(row=r, column=14).border = Border(top=Side(style='thin', color='000000'))
            style_cell(ws.cell(row=r, column=15, value=f"=SUM(O{total_row_idx+8}:O{total_row_idx+9})"), bold=True, border_type="total", alignment_type="right", num_format='$ #,##0.00')
            
            # Row total_row_idx + 12: KPI SFY
            r = total_row_idx + 12
            c_kpi_lbl = ws.cell(row=r, column=14, value="KPI SFY")
            style_cell(c_kpi_lbl, bold=True, alignment_type="left")
            c_kpi_val = ws.cell(row=r, column=15, value=f"=O{total_row_idx+2}+O{total_row_idx+4}")
            style_cell(c_kpi_val, bold=True, alignment_type="right", num_format='$ #,##0.00', border_type="total")
            
            # Row total_row_idx + 13: NOW()
            r = total_row_idx + 13
            c_now = ws.cell(row=r, column=14, value="=NOW()")
            style_cell(c_now, italic=True, alignment_type="left", num_format='dd-mm-yyyy hh:mm')

        # Adjust columns width dynamically with premium safety margins
        for col in ws.columns:
            col_num = col[0].column
            col_letter = get_column_letter(col_num)
            
            # Select proper minimum width based on column type
            min_width = 12
            if col_num == 1:    # A: Código
                min_width = 15
            elif col_num == 2:  # B: Clientes
                min_width = 28
            elif col_num == 3:  # C: Nº Orden
                min_width = 16
            elif col_num == 4:  # D: Proyecto
                min_width = 35
            elif col_num in [5, 6]: # E, F: Fechas
                min_width = 13
            elif col_num in [7, 8, 9, 10, 11]: # G, H, I, J, K: Currency values
                min_width = 18
            elif col_num == 12: # L: Personal
                min_width = 14
            elif col_num == 13: # M: Separador
                min_width = 12
            elif col_num in [14, 15, 16, 17, 18]: # N, O, P, Q, R: Summary tables
                min_width = 16
                
            max_len = 0
            for cell in col:
                val_str = str(cell.value or '')
                if val_str.startswith('='):
                    continue
                max_len = max(max_len, len(val_str))
            
            ws.column_dimensions[col_letter].width = max(max_len + 3, min_width)

        kpi_rows[area_name] = total_row_idx + (7 if area_name in ["MIN", "OIL"] else 12)

        # ----------------------------------------------------
        # GRÁFICOS DINÁMICOS
        # ----------------------------------------------------
        if len(monto_companies) > 0:
            chart_sector_lbl = {
                "MIN": ("Minera", "Minería", "Minería"),
                "IND": ("Industria", "Industria", "Industria"),
                "OIL": ("Petroquímica", "Petroquímica", "Petroquímica"),
                "SFY": ("Seguridad de Maquinaria", "Seguridad de Maquinaria", "Seguridad de Maquinaria")
            }
            sub_title_col, sub_title_pie, sub_title_concept = chart_sector_lbl.get(area_name, (area_name, area_name, area_name))
            
            # Gráfico de Columnas: Montos de OC por Empresa
            chart = BarChart3D()
            chart.type = "col"
            chart.style = 10
            set_chart_title(chart, f"Montos de OC por Empresa - {sub_title_col}", 12)
            
            data = Reference(ws, min_col=15, min_row=2, max_row=end_row_list)
            cats = Reference(ws, min_col=14, min_row=3, max_row=end_row_list)
            chart.add_data(data, titles_from_data=True)
            chart.set_categories(cats)
            chart.legend = None
            chart.plot_area.dTable = DataTable(showHorzBorder=True, showVertBorder=True, showOutline=True, showKeys=True)
            
            # Responsive sizing for the column chart (independent dimensions)
            chart.width = max(18, 10 + len(monto_companies) * 1.6)
            chart.height = max(11, 7 + len(monto_companies) * 0.6)
            
            # Force the vertical Y axis (values) to show despite having a DataTable
            chart.y_axis.delete = False
            
            ws.add_chart(chart, "R2")
            
            # Gráfico de Torta: % Montos de Ordenes de Compra por Cliente (independent dimensions)
            pie = PieChart3D()
            set_chart_title(pie, f"% Montos de OC por Cliente Sector {sub_title_pie}", 12)
            
            pie.add_data(data, titles_from_data=True)
            pie.set_categories(cats)
            pie.dataLabels = DataLabelList()
            pie.dataLabels.showCatName = True
            pie.dataLabels.showPercent = True
            pie.dataLabels.showVal = False
            pie.legend = None
            pie.width = max(17, 10 + len(monto_companies) * 0.9)
            pie.height = max(11, 7 + len(monto_companies) * 0.5)
            
            # Dynamic placement to guarantee a generous separation (leaves exactly 2 empty columns)
            cols_covered = int(chart.width / 1.7)
            pie_col = get_column_letter(18 + cols_covered + 2)
            ws.add_chart(pie, f"{pie_col}2")

            # Tercer Gráfico: Distribución de Ordenes de Compra por Concepto (larger fixed size)
            pie_concept = PieChart3D()
            set_chart_title(pie_concept, f"Distribución de Ordenes de compra {sub_title_concept}", 12)
            
            concept_data = Reference(ws, min_col=15, min_row=total_row_idx, max_row=total_row_idx + 4)
            concept_cats = Reference(ws, min_col=14, min_row=total_row_idx + 1, max_row=total_row_idx + 4)
            pie_concept.add_data(concept_data, titles_from_data=True)
            pie_concept.set_categories(concept_cats)
            
            pie_concept.dataLabels = DataLabelList()
            pie_concept.dataLabels.showCatName = True
            pie_concept.dataLabels.showVal = True
            pie_concept.dataLabels.showPercent = False
            pie_concept.legend = None
            pie_concept.width = 16
            pie_concept.height = 11
            
            # Calculate dynamic start row to prevent vertical overlap with the top charts
            chart_bottom_row = 2 + int(chart.height * 2.0)
            concept_start_row = max(total_row_idx + 10, chart_bottom_row + 2)
            ws.add_chart(pie_concept, f"N{concept_start_row}")

    # Sheet Objetivos
    objetivo_anual = ObjetivoAnual.objects.filter(
        anno=anno,
        id_modulo=1,  # COMERCIAL
        activo=True
    ).first()

    metas = {
        "MIN": {"min": Decimal("0.00"), "max": Decimal("0.00")},
        "IND": {"min": Decimal("0.00"), "max": Decimal("0.00")},
        "OIL": {"min": Decimal("0.00"), "max": Decimal("0.00")},
        "SFY": {"min": Decimal("0.00"), "max": Decimal("0.00")},
    }

    if objetivo_anual:
        objetivos_db = ObjetivoAnualArea.objects.filter(
            id_objetivo=objetivo_anual
        ).select_related("id_area")
        for obj in objetivos_db:
            code = areas_codes.get(obj.id_area_id)
            if code:
                metas[code]["min"] = obj.minimo or Decimal("0.00")
                metas[code]["max"] = obj.maximo or Decimal("0.00")

    # Evaluate target based on month elapsed
    is_current_year = (anno == datetime.now().year)
    mes_count = datetime.now().month if is_current_year else 12

    ws_obj = wb.create_sheet(title="Objetivos")
    ws_obj.views.sheetView[0].showGridLines = True
    ws_obj.append(["COMPARTIVA DE OBJETIVOS Y METAS"])
    ws_obj.merge_cells("A1:J1")
    ws_obj.cell(1, 1).font = Font(name="Segoe UI", size=14, bold=True, color="1F4E78")
    ws_obj.cell(1, 1).alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    headers = [
        "ÁREA", "OBJETIVO ANUAL MÁXIMO", "OBJETIVO ANUAL MÍNIMO", "LOGRADO",
        "OBJETIVO MAX MENSUAL", "OBJETIVO MIN MENSUAL", "DIFERENCIA C/ MÍNIMO", "DIFERENCIA C/ MÁXIMO",
        "FALTANTE AL MÍNIMO", "FALTANTE AL MÁXIMO"
    ]
    ws_obj.append(headers)

    for col_num in range(1, 11):
        cell = ws_obj.cell(row=2, column=col_num)
        cell.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(bottom=Side(border_style="medium", color="000000"))

    areas = ["MIN", "IND", "OIL", "SFY"]
    for idx, area in enumerate(areas):
        r = idx + 3
        meta_min = metas[area]["min"]
        meta_max = metas[area]["max"]
        kpi_row = kpi_rows[area]
        logrado_formula = f"={area}!O{kpi_row}"

        row_data = [
            area, float(meta_max), float(meta_min), logrado_formula,
            f"=B{r}/12*{mes_count}", f"=C{r}/12*{mes_count}", f"=D{r}-F{r}", f"=D{r}-E{r}",
            f"=D{r}-C{r}", f"=D{r}-B{r}"
        ]
        ws_obj.append(row_data)

        for col_num in range(1, 11):
            cell = ws_obj.cell(row=r, column=col_num)
            cell.font = Font(name="Segoe UI", size=9, color="27272A")
            cell.border = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                                 top=Side(style='thin', color='E2E8F0'), bottom=Side(style='E2E8F0', color='E2E8F0'))
            if r % 2 == 0:
                cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
            if col_num == 1:
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            else:
                cell.number_format = '$ #,##0.00'
                cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)

    tot_r = 7
    total_row = [
        "TOTALES", "=SUM(B3:B6)", "=SUM(C3:C6)", "=SUM(D3:D6)",
        "=SUM(E3:E6)", "=SUM(F3:F6)", "=D7-F7", "=D7-E7",
        "=D7-C7", "=D7-B7"
    ]
    ws_obj.append(total_row)

    for col_num in range(1, 11):
        cell = ws_obj.cell(row=tot_r, column=col_num)
        cell.font = Font(name="Segoe UI", size=10, bold=True, color="1E293B")
        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        cell.border = Border(top=Side(style='thin', color='000000'), bottom=Side(style='double', color='000000'))
        if col_num == 1:
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        else:
            cell.number_format = '$ #,##0.00'
            cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)

    # APLICAR FORMATO CONDICIONAL PARA COLUMNAS G, H, I, J (FILAS 3 A 7)
    # Definimos los bordes explícitos para evitar que Excel los remplace por blanco
    from openpyxl.formatting.rule import CellIsRule
    from openpyxl.styles.borders import Border, Side

    border_thin = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                         top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))
    
    border_tot = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                        top=Side(style='thin', color='000000'), bottom=Side(style='double', color='000000'))

    # Reglas para filas de datos 3 a 6 (borde delgado gris)
    rule_pos_36 = CellIsRule(operator='greaterThanOrEqual', formula=['0'], 
                             stopIfTrue=True,
                             fill=PatternFill(start_color="0070C0", end_color="0070C0", fill_type="solid"),
                             font=Font(color="FFFFFF", bold=True),
                             border=border_thin)
    rule_neg_36 = CellIsRule(operator='lessThan', formula=['0'], 
                             stopIfTrue=True,
                             fill=PatternFill(start_color="FF0000", end_color="FF0000", fill_type="solid"),
                             font=Font(color="FFFFFF", bold=True),
                             border=border_thin)

    # Reglas para fila 7 de totales (borde superior e inferior doble)
    rule_pos_7 = CellIsRule(operator='greaterThanOrEqual', formula=['0'], 
                            stopIfTrue=True,
                            fill=PatternFill(start_color="0070C0", end_color="0070C0", fill_type="solid"),
                            font=Font(color="FFFFFF", bold=True),
                            border=border_tot)
    rule_neg_7 = CellIsRule(operator='lessThan', formula=['0'], 
                            stopIfTrue=True,
                            fill=PatternFill(start_color="FF0000", end_color="FF0000", fill_type="solid"),
                            font=Font(color="FFFFFF", bold=True),
                            border=border_tot)

    ws_obj.conditional_formatting.add("G3:J6", rule_pos_36)
    ws_obj.conditional_formatting.add("G3:J6", rule_neg_36)
    ws_obj.conditional_formatting.add("G7:J7", rule_pos_7)
    ws_obj.conditional_formatting.add("G7:J7", rule_neg_7)

    # Set headers row height and styling for wrap text
    ws_obj.row_dimensions[2].height = 28
    
    # Standalone rows for Faltante al Min / Max (Leaving row 8 blank!)
    ws_obj.cell(row=9, column=3, value="Faltante al Mínimo")
    ws_obj.cell(row=9, column=4, value="=C7-D7")
    
    ws_obj.cell(row=10, column=3, value="Faltante al Máximo")
    ws_obj.cell(row=10, column=4, value="=B7-D7")
    
    for r in [9, 10]:
        cell_lbl = ws_obj.cell(row=r, column=3)
        cell_lbl.font = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
        cell_lbl.fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
        cell_lbl.alignment = Alignment(horizontal="center", vertical="center")
        cell_lbl.border = Border(left=Side(style='thin', color='000000'), right=Side(style='thin', color='000000'),
                                 top=Side(style='thin', color='000000'), bottom=Side(style='thin', color='000000'))
        
        cell_val = ws_obj.cell(row=r, column=4)
        cell_val.font = Font(name="Segoe UI", size=9, bold=True, color="27272A")
        cell_val.number_format = '$ #,##0.00'
        cell_val.alignment = Alignment(horizontal="right", vertical="center")
        cell_val.border = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                                 top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))
        
    # Avance y Faltante Table (Rows 13-19, leaving rows 11 and 12 blank!)
    ws_obj.merge_cells("B13:C13")
    ws_obj.merge_cells("D13:E13")
    
    cell_max_hdr = ws_obj.cell(row=13, column=2, value="MÁXIMO")
    cell_min_hdr = ws_obj.cell(row=13, column=4, value="MÍNIMO")
    
    for cell in [cell_max_hdr, cell_min_hdr]:
        cell.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    border_thin = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                         top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))
    
    for col_idx in [2, 3, 4, 5]:
        cell = ws_obj.cell(row=13, column=col_idx)
        cell.border = border_thin
        cell.fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
        
    sub_headers = {2: "Avance", 3: "Faltante", 4: "Avance", 5: "Faltante"}
    ws_obj.row_dimensions[14].height = 20
    for col_idx, text in sub_headers.items():
        cell = ws_obj.cell(row=14, column=col_idx, value=text)
        cell.font = Font(name="Segoe UI", size=9, bold=True, color="1E293B")
        cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border_thin

    row_mapping = {
        15: ("MIN", 3),
        16: ("IND", 4),
        17: ("OIL", 5),
        18: ("SFY", 6),
        19: ("V&C", 7)
    }
    
    font_normal = Font(name="Segoe UI", size=9, color="27272A")
    font_bold = Font(name="Segoe UI", size=10, bold=True, color="1E293B")
    fill_totals = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    border_totals = Border(top=Side(style='thin', color='000000'), bottom=Side(style='double', color='000000'))
    
    for r_idx, (area_lbl, target_row) in row_mapping.items():
        ws_obj.row_dimensions[r_idx].height = 22 if area_lbl == "V&C" else 20
        
        cell_lbl = ws_obj.cell(row=r_idx, column=1, value=area_lbl)
        if area_lbl == "V&C":
            cell_lbl.font = font_bold
            cell_lbl.fill = fill_totals
            cell_lbl.border = border_totals
        else:
            cell_lbl.font = font_normal
            cell_lbl.border = border_thin
            if r_idx % 2 == 0:
                cell_lbl.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        cell_lbl.alignment = Alignment(horizontal="center", vertical="center")
        
        cell_b = ws_obj.cell(row=r_idx, column=2, value=f"=(D{target_row}*100/E{target_row})%")
        cell_c = ws_obj.cell(row=r_idx, column=3, value=f"=IF(B{r_idx}>=1,0,1-B{r_idx})")
        cell_d = ws_obj.cell(row=r_idx, column=4, value=f"=(D{target_row}*100/F{target_row})%")
        cell_e = ws_obj.cell(row=r_idx, column=5, value=f"=IF(D{r_idx}>=1,0,1-D{r_idx})")
        
        for col_idx, cell in enumerate([cell_b, cell_c, cell_d, cell_e], start=2):
            cell.number_format = '0.0%'
            cell.alignment = Alignment(horizontal="right", vertical="center")
            
            if area_lbl == "V&C":
                cell.font = font_bold
                cell.fill = fill_totals
                cell.border = border_totals
            else:
                cell.font = font_normal
                cell.border = border_thin
                if r_idx % 2 == 0:
                    cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    # Write historical Logrado table in columns L (12) and M (13) starting at Row 2
    ws_obj.cell(row=2, column=12, value="Año").font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    ws_obj.cell(row=2, column=12).fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
    ws_obj.cell(row=2, column=12).alignment = Alignment(horizontal="center", vertical="center")
    ws_obj.cell(row=2, column=12).border = Border(bottom=Side(border_style="medium", color="000000"))

    ws_obj.cell(row=2, column=13, value="Logrado").font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    ws_obj.cell(row=2, column=13).fill = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
    ws_obj.cell(row=2, column=13).alignment = Alignment(horizontal="center", vertical="center")
    ws_obj.cell(row=2, column=13).border = Border(bottom=Side(border_style="medium", color="000000"))

    historical_data = {
        2014: 599213.69,
        2015: 791852.48,
        2016: 546600.85,
        2017: 586456.22,
        2018: 815521.11,
        2019: 706732.22,
        2020: 820464.89,
        2021: 475934.45,
        2022: 764082.81,
        2023: 832552.59,
        2024: 865726.08,
        2025: 787520.06,
    }
    
    logrado_table_data = []
    for y, val in sorted(historical_data.items()):
        if y < int(anno):
            logrado_table_data.append((y, val))
            
    # Dynamically query database for past years not in historical_data (e.g. 2026 onwards)
    start_db_year = max(historical_data.keys()) + 1
    for y in range(start_db_year, int(anno)):
        year_kpi = 0.0
        try:

            openings = CotizacionApertura.objects.filter(
                anno_a=str(y),
                estado_orden__in=[1, 2, 3]
            ).select_related("id_registro")
            
            cot_openings = defaultdict(list)
            for ap in openings:
                if ap.id_registro:
                    cot_openings[ap.id_registro].append(ap)
                    
            total_kpi = Decimal("0.00")
            for cot, aps in cot_openings.items():
                val_pres = cot.total_cotizacion or Decimal("0.00")
                costo = sum(
                    ((ap.orden_compra_equipos or Decimal("0.00")) + 
                     (ap.orden_compra_materiales or Decimal("0.00")) + 
                     (ap.orden_compra_costo_servicios or Decimal("0.00")) + 
                     (ap.orden_compra_otros or Decimal("0.00"))) 
                    for ap in aps
                )
                hh = sum(ap.orden_compra_hh or Decimal("0.00") for ap in aps)
                imprevistos = sum(ap.orden_compra_entrega or Decimal("0.00") for ap in aps)
                utilidad = val_pres - (costo + hh + imprevistos)
                total_kpi += (hh + utilidad)
            year_kpi = float(total_kpi)
        except Exception as ex:
            print("Error calculating historical year kpi:", ex)
        logrado_table_data.append((y, year_kpi))
        
    logrado_table_data.append((int(anno), "=D7"))

    for idx, (year_val, logrado_val) in enumerate(logrado_table_data):
        r = idx + 3
        cell_y = ws_obj.cell(row=r, column=12, value=year_val)
        cell_y.font = Font(name="Segoe UI", size=9, color="27272A")
        cell_y.alignment = Alignment(horizontal="center", vertical="center")
        cell_y.border = border_thin

        cell_l = ws_obj.cell(row=r, column=13, value=logrado_val)
        cell_l.font = Font(name="Segoe UI", size=9, color="27272A")
        cell_l.alignment = Alignment(horizontal="right", vertical="center")
        cell_l.border = border_thin
        cell_l.number_format = '$ #,##0.00'

        if r % 2 == 0:
            cell_y.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
            cell_l.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    # Set custom responsive columns widths to avoid wasted space
    ws_obj.column_dimensions["A"].width = 10
    for col_letter in ["B", "C", "D", "E", "F", "G", "H", "I", "J"]:
        ws_obj.column_dimensions[col_letter].width = 18
    ws_obj.column_dimensions["K"].width = 5   # Separator
    ws_obj.column_dimensions["L"].width = 12  # Año
    ws_obj.column_dimensions["M"].width = 18  # Logrado

    # ====================================================
    # GRÁFICOS DE LA PESTAÑA OBJETIVOS
    # ====================================================
    # 1. Gráfico 1: Monto Logrado por Año HH+UTILIDAD
    chart1 = BarChart3D()
    chart1.type = "col"
    chart1.style = 10
    set_chart_title(chart1, "Monto Logrado por Año HH+UTILIDAD", 12)
    chart1.y_axis.delete = True
    chart1.x_axis.delete = False  # Eje horizontal visible
    chart1.legend = None          # Sin leyenda
    chart1.y_axis.majorGridlines = None
    chart1.x_axis.majorGridlines = None
    chart1.plot_area.dTable = None

    # ETIQUETAS DE DATOS (Moneda sin clave de leyenda)
    chart1.dataLabels = DataLabelList()
    chart1.dataLabels.showVal = True
    chart1.dataLabels.showCatName = False
    chart1.dataLabels.showSerName = False
    chart1.dataLabels.showPercent = False
    chart1.dataLabels.showLegendKey = False
    chart1.dataLabels.numFmt = '$ #,##0.00'

    # Valores: Logrado (columna M/13) desde fila 2 (cabecera) hasta el final de los datos
    s_val1 = Reference(ws_obj, min_col=13, min_row=2, max_row=len(logrado_table_data) + 2)
    chart1.add_data(s_val1, titles_from_data=True)

    # Categorías: Años (columna L/12) desde fila 3
    cats1 = Reference(ws_obj, min_col=12, min_row=3, max_row=len(logrado_table_data) + 2)
    chart1.set_categories(cats1)

    chart1.width = 15
    chart1.height = 7.5
    ws_obj.add_chart(chart1, "O2")  # Anclado en O2 según reporte (39).xlsx

    # 2. Gráfico 2: Avance objetivo Máximo al Mes en curso
    chart2 = BarChart3D()
    chart2.type = "col"
    chart2.grouping = "stacked"  # Apilado
    chart2.overlap = 100
    chart2.shape = "cylinder"    # DISEÑO DE CILINDROS 3D
    chart2.style = 10
    set_chart_title(chart2, f"Avance objetivo Máximo al Mes en curso ({mes_count}/12)", 12)
    chart2.y_axis.delete = True
    chart2.x_axis.delete = False
    chart2.y_axis.majorGridlines = None
    chart2.x_axis.majorGridlines = None
    chart2.plot_area.dTable = None
    
    # ETIQUETAS DE DATOS (Porcentajes sin clave de leyenda)
    chart2.dataLabels = DataLabelList()
    chart2.dataLabels.showVal = True
    chart2.dataLabels.showCatName = False
    chart2.dataLabels.showSerName = False
    chart2.dataLabels.showPercent = False
    chart2.dataLabels.showLegendKey = False
    chart2.dataLabels.numFmt = '0%'  # Formato porcentaje entero

    # Valores: Avance y Faltante Máximo (columnas B y C, cols 2 y 3) desde fila 14 (subcabeceras) hasta fila 19 (V&C)
    s_val2 = Reference(ws_obj, min_col=2, max_col=3, min_row=14, max_row=19)
    chart2.add_data(s_val2, titles_from_data=True)

    # Categorías: Áreas (columna A/1) desde fila 15 a 19 (incluye V&C)
    cats2 = Reference(ws_obj, min_col=1, min_row=15, max_row=19)
    chart2.set_categories(cats2)

    # DESACTIVAR LEYENDA (Para evitar confusión de colores)
    chart2.legend = None

    # APLICAR PERSPECTIVA DE GIRO 3D (rotX maps to Giro Y = 10, rotY maps to Giro X = 40)
    from openpyxl.chart._3d import View3D
    chart2.view3D = View3D(rotX=10, rotY=40, rAngAx=False)
    chart2.view3D.perspective = 0
    chart2.view3D.depthPercent = 130

    # APLICAR COLORES CORPORATIVOS PROFESIONALES DE EXCEL CON MÁXIMO CONTRASTE PARA TEXTO NEGRO
    # MIN (Amarillo), IND (Naranja Suave), OIL (Teal/Celeste), SFY (Morado Suave), V&C (Verde Suave)
    colors_avance = ["FFFF99", "FCE4D6", "E0F7FA", "E2D5F3", "C6E0B4"]
    colors_faltante = ["FFFF00", "F8B17F", "00DFDA", "B19CD9", "93C588"]

    for s_idx, colors in enumerate([colors_avance, colors_faltante]):
        if s_idx < len(chart2.series):
            series = chart2.series[s_idx]
            for pt_idx, col in enumerate(colors):
                from openpyxl.chart.series import DataPoint
                dp = DataPoint(idx=pt_idx)
                dp.graphicalProperties.solidFill = col
                series.dPt.append(dp)

    chart2.width = 15
    chart2.height = 7.5  # Dimensiones de 15x7.5 cm según reporte (39).xlsx
    ws_obj.add_chart(chart2, "B22")

    # 3. Gráfico 3: Avance objetivo Mínimo al Mes en curso
    chart3 = BarChart3D()
    chart3.type = "col"
    chart3.grouping = "stacked"  # Apilado
    chart3.overlap = 100
    chart3.shape = "cylinder"    # DISEÑO DE CILINDROS 3D
    chart3.style = 10
    set_chart_title(chart3, f"Avance objetivo Mínimo al Mes en curso ({mes_count}/12)", 12)
    chart3.y_axis.delete = True
    chart3.x_axis.delete = False
    chart3.legend = None          # Sin leyenda
    chart3.y_axis.majorGridlines = None
    chart3.x_axis.majorGridlines = None
    chart3.plot_area.dTable = None

    # ETIQUETAS DE DATOS (Porcentajes sin clave de leyenda)
    chart3.dataLabels = DataLabelList()
    chart3.dataLabels.showVal = True
    chart3.dataLabels.showCatName = False
    chart3.dataLabels.showSerName = False
    chart3.dataLabels.showPercent = False
    chart3.dataLabels.showLegendKey = False
    chart3.dataLabels.numFmt = '0%'  # Formato porcentaje entero

    # Valores: Avance y Faltante Mínimo (columnas D y E, cols 4 y 5) desde fila 14 (subcabeceras) hasta fila 19 (V&C)
    s_val3 = Reference(ws_obj, min_col=4, max_col=5, min_row=14, max_row=19)
    chart3.add_data(s_val3, titles_from_data=True)
    chart3.set_categories(cats2)

    # APLICAR PERSPECTIVA DE GIRO 3D (rotX maps to Giro Y = 10, rotY maps to Giro X = 40)
    chart3.view3D = View3D(rotX=10, rotY=40, rAngAx=False)
    chart3.view3D.perspective = 0
    chart3.view3D.depthPercent = 130

    # APLICAR COLORES CORPORATIVOS PROFESIONALES
    for s_idx, colors in enumerate([colors_avance, colors_faltante]):
        if s_idx < len(chart3.series):
            series = chart3.series[s_idx]
            for pt_idx, col in enumerate(colors):
                from openpyxl.chart.series import DataPoint
                dp = DataPoint(idx=pt_idx)
                dp.graphicalProperties.solidFill = col
                series.dPt.append(dp)

    chart3.width = 15
    chart3.height = 7.5  # Dimensiones de 15x7.5 cm según reporte (39).xlsx
    ws_obj.add_chart(chart3, "H22")  # Anclado en H22 para reducir espacio horizontal

    # ====================================================
    # GRÁFICOS DE ANILLO KPI NATIVOS (DOUGHNUT CHARTS)
    # ====================================================
    from openpyxl.chart.pie_chart import DoughnutChart
    from openpyxl.chart.series import DataPoint
    from openpyxl.chart.label import DataLabelList
    from openpyxl.chart.reference import Reference
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    # Escribir tabla de datos para los gráficos KPI
    ws_obj.cell(row=39, column=2, value="Métrica")
    ws_obj.cell(row=39, column=3, value="Avance")
    ws_obj.cell(row=39, column=4, value="Faltante")
    
    ws_obj.cell(row=40, column=2, value="Avance MIN")
    ws_obj.cell(row=40, column=3, value="=D7/C7").number_format = '0%'
    ws_obj.cell(row=40, column=4, value="=MAX(0, 1-C40)").number_format = '0%'
    
    ws_obj.cell(row=41, column=2, value="Avance MAX")
    ws_obj.cell(row=41, column=3, value="=D7/B7").number_format = '0%'
    ws_obj.cell(row=41, column=4, value="=MAX(0, 1-C41)").number_format = '0%'

    # DEFINICIÓN DE ESTILOS Y FORMATOS CORPORATIVOS
    font_hdr = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
    fill_hdr = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
    align_center = Alignment(horizontal="center", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")
    
    font_data = Font(name="Segoe UI", size=9, color="27272A")
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    border_thin = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                         top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))

    # Formatear la tabla KPI (filas 39 a 41, columnas B a D)
    for c in [2, 3, 4]:
        cell_hdr = ws_obj.cell(row=39, column=c)
        cell_hdr.font = font_hdr
        cell_hdr.fill = fill_hdr
        cell_hdr.alignment = align_center
        cell_hdr.border = border_thin
        
    for r in [40, 41]:
        for c in [2, 3, 4]:
            cell = ws_obj.cell(row=r, column=c)
            cell.font = font_data
            cell.alignment = align_right if c in [3, 4] else align_center
            cell.border = border_thin
            if r % 2 == 0:
                cell.fill = fill_zebra

    # Establecer la altura para las filas de la tabla
    ws_obj.row_dimensions[39].height = 20
    ws_obj.row_dimensions[40].height = 20
    ws_obj.row_dimensions[41].height = 20

    # Limpiar alturas de filas antiguas para que Excel no muestre filas en blanco altas
    for r in range(42, 61):
        ws_obj.row_dimensions[r].height = None

    # Establecer anchos de columna óptimos para la tabla de datos KPI sin encoger las columnas de objetivos
    ws_obj.column_dimensions['B'].width = 18
    ws_obj.column_dimensions['C'].width = 20
    ws_obj.column_dimensions['D'].width = 20

    # --- GAUGE 1: AVANCE CON RESPECTO AL MÍNIMO ANUAL (PieChart3D) ---
    from openpyxl.chart.layout import Layout, ManualLayout
    from openpyxl.chart.legend import Legend
    from openpyxl.chart.shapes import GraphicalProperties
    
    gauge_min = PieChart3D()
    gauge_min.style = 10
    gauge_min.legend = Legend()
    gauge_min.legend.position = "b" # Leyenda abajo
    gauge_min.legend.overlay = True
    set_chart_title(gauge_min, "AVANCE CON RESPECTO AL MÍNIMO ANUAL", 11)
    
    ref_vals_min = Reference(ws_obj, min_col=3, max_col=4, min_row=40, max_row=40)
    ref_cats = Reference(ws_obj, min_col=3, max_col=4, min_row=39, max_row=39)
    
    gauge_min.add_data(ref_vals_min, from_rows=True)
    gauge_min.set_categories(ref_cats)
    
    # Configurar etiquetas de datos limpias (solo el valor % centrado, como en la captura)
    gauge_min.dataLabels = DataLabelList()
    gauge_min.dataLabels.showVal = True
    gauge_min.dataLabels.showPercent = False
    gauge_min.dataLabels.showCatName = False
    gauge_min.dataLabels.showSerName = False
    gauge_min.dataLabels.showLegendKey = True
    
    # Ajustar Vista 3D (tilted) para coincidir con cilindros
    gauge_min.view3D = View3D(rotX=10, rotY=40, rAngAx=False)
    gauge_min.view3D.perspective = 0
    gauge_min.view3D.depthPercent = 130
    
    # Ajustar Layout para centrar el pastel 3D
    gauge_min.layout = Layout(
        manualLayout=ManualLayout(
            x=0.08, y=0.1,
            h=0.72, w=0.84,
            xMode="edge", yMode="edge"
        )
    )
    
    # Colores corporativos Teal y Gris Claro
    dp0 = DataPoint(idx=0)
    dp0.graphicalProperties.solidFill = "237573"
    dp1 = DataPoint(idx=1)
    dp1.graphicalProperties.solidFill = "E2E8F0"
    
    gauge_min.series[0].dPt.append(dp0)
    gauge_min.series[0].dPt.append(dp1)
    
    gauge_min.width = 11
    gauge_min.height = 7.5
    ws_obj.add_chart(gauge_min, "F39")

    # --- GAUGE 2: AVANCE CON RESPECTO AL MÁXIMO ANUAL (PieChart3D) ---
    gauge_max = PieChart3D()
    gauge_max.style = 10
    gauge_max.legend = Legend()
    gauge_max.legend.position = "b" # Leyenda abajo
    gauge_max.legend.overlay = True
    set_chart_title(gauge_max, "AVANCE CON RESPECTO AL MÁXIMO ANUAL", 11)
    
    ref_vals_max = Reference(ws_obj, min_col=3, max_col=4, min_row=41, max_row=41)
    
    gauge_max.add_data(ref_vals_max, from_rows=True)
    gauge_max.set_categories(ref_cats)
    
    gauge_max.dataLabels = DataLabelList()
    gauge_max.dataLabels.showVal = True
    gauge_max.dataLabels.showPercent = False
    gauge_max.dataLabels.showCatName = False
    gauge_max.dataLabels.showSerName = False
    gauge_max.dataLabels.showLegendKey = True
    
    gauge_max.view3D = View3D(rotX=10, rotY=40, rAngAx=False)
    gauge_max.view3D.perspective = 0
    gauge_max.view3D.depthPercent = 130
    
    gauge_max.layout = Layout(
        manualLayout=ManualLayout(
            x=0.08, y=0.1,
            h=0.72, w=0.84,
            xMode="edge", yMode="edge"
        )
    )
    
    dp0_max = DataPoint(idx=0)
    dp0_max.graphicalProperties.solidFill = "237573"
    dp1_max = DataPoint(idx=1)
    dp1_max.graphicalProperties.solidFill = "E2E8F0"
    
    gauge_max.series[0].dPt.append(dp0_max)
    gauge_max.series[0].dPt.append(dp1_max)
    
    gauge_max.width = 11
    gauge_max.height = 7.5
    ws_obj.add_chart(gauge_max, "J39")
    


    # Sheet Objetivos Com.
    vendedores_info = []
    for v in vendedores:
        v_short = get_short_name(v.nombre_completo)
        vendedores_info.append({
            "nombre": v.nombre_completo,
            "short": v_short,
            "id": v.id_usuario
        })

    # Calculate achieved sales per seller and area for the entire year
    achieved = {}
    for area_id, area_name in areas_codes.items():
        for v in vendedores_info:
            openings_v = CotizacionApertura.objects.filter(
                anno_a=str(anno),
                estado_orden__in=[1, 2, 3],
                id_registro__id_area=area_id,
                id_registro__id_comercial_id=v["id"]
            ).select_related("id_registro")
            
            cot_openings_v = defaultdict(list)
            for ap in openings_v:
                if ap.id_registro:
                    cot_openings_v[ap.id_registro].append(ap)
                    
            seller_area_total = Decimal("0.00")
            for cot, aps in cot_openings_v.items():
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
                
                seller_area_total += (hh + utilidad)
                
            achieved[(area_id, v["id"])] = seller_area_total

    ws_com = wb.create_sheet(title="Objetivos Com.")
    ws_com.views.sheetView[0].showGridLines = True

    # Premium styles
    font_segoe = Font(name="Segoe UI", size=9)
    font_bold = Font(name="Segoe UI", size=9, bold=True)
    font_hdr = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
    fill_hdr = PatternFill(start_color="237573", end_color="237573", fill_type="solid")
    fill_sub = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    fill_even = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    border_thin = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )
    border_total = Border(
        top=Side(style='thin', color='000000'),
        bottom=Side(style='thin', color='000000')
    )
    border_double = Border(
        top=Side(style='thin', color='000000'),
        bottom=Side(style='double', color='000000')
    )

    area_blocks_com = [
        ("MIN", "MINERIA", 1),
        ("IND", "INDUSTRIA", 2),
        ("OIL", "PETROQUIMICA", 3),
        ("SFY", "SAFETY", 4)
    ]

    def style_com_cell(cell, font, fill=None, border=None, alignment=None, num_format=None):
        cell.font = font
        if fill is not None:
            cell.fill = fill
        if border is not None:
            cell.border = border
        if alignment is not None:
            cell.alignment = alignment
        if num_format is not None:
            cell.number_format = num_format

    mes_calc = 12
    block_info = {}
    current_r = 1
    factor_participacion = 1.0 / max(1, len(vendedores_info))

    for code, area_sheet_name, area_idx in area_blocks_com:
        start_r = current_r
        
        # Headers Row start_r (Cols B to L)
        headers_row = ["NOMBRE", "MAX", "MIN", "PRO. TRA.", "Obj. Min Mensual", "Obj. Max Mensual", "Obj. Min Anual", "Obj. Max Anual", "Conseguido", "% Min Anual", "% Max Anual"]
        for idx, h in enumerate(headers_row):
            c_hdr = ws_com.cell(row=start_r, column=idx+2, value=h)
            style_com_cell(c_hdr, font_hdr, fill=fill_hdr, border=border_thin, alignment=Alignment(horizontal="center", vertical="center", wrap_text=True))
        
        # Salespeople (Cols B to L)
        for v_idx, v in enumerate(vendedores_info):
            r = start_r + 1 + v_idx
            is_even = (v_idx % 2 == 1)
            fill_cell = fill_even if is_even else None
            
            c_name = ws_com.cell(row=r, column=2, value=v["nombre"])
            style_com_cell(c_name, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="left", vertical="center"))
            
            c_pro = ws_com.cell(row=r, column=5, value=factor_participacion)
            style_com_cell(c_pro, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="center", vertical="center"), num_format='0.00')
            
            top_v_r = start_r + 1
            c_omin_m = ws_com.cell(row=r, column=6, value=f"=D${top_v_r}*E{r}/12*{mes_calc}")
            c_omax_m = ws_com.cell(row=r, column=7, value=f"=C${top_v_r}*E{r}/12*{mes_calc}")
            c_omin_a = ws_com.cell(row=r, column=8, value=f"=D${top_v_r}*E{r}")
            c_omax_a = ws_com.cell(row=r, column=9, value=f"=C${top_v_r}*E{r}")
            
            style_com_cell(c_omin_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
            style_com_cell(c_omax_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
            style_com_cell(c_omin_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
            style_com_cell(c_omax_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
            
            cons_val = achieved.get((area_idx_map := {1: 2, 2: 1, 3: 4, 4: 8}[area_idx], v["id"]), Decimal("0.00"))
            c_cons = ws_com.cell(row=r, column=10, value=float(cons_val))
            style_com_cell(c_cons, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
            
            c_pmin = ws_com.cell(row=r, column=11, value=f"=IF(H{r}>0,J{r}/H{r},0)")
            c_pmax = ws_com.cell(row=r, column=12, value=f"=IF(I{r}>0,J{r}/I{r},0)")
            style_com_cell(c_pmin, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
            style_com_cell(c_pmax, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')

        tot_r = start_r + len(vendedores_info) + 1
        style_com_cell(ws_com.cell(row=tot_r, column=2, value="TOTAL"), font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="left"))
        style_com_cell(ws_com.cell(row=tot_r, column=3), font_bold, fill=fill_sub, border=border_total)
        style_com_cell(ws_com.cell(row=tot_r, column=4), font_bold, fill=fill_sub, border=border_total)
        
        c_tot_pro = ws_com.cell(row=tot_r, column=5, value=f"=SUM(E{start_r+1}:E{tot_r-1})")
        style_com_cell(c_tot_pro, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="center"), num_format='0.00')
        
        c_tot_min_m = ws_com.cell(row=tot_r, column=6, value=f"=SUM(F{start_r+1}:F{tot_r-1})")
        c_tot_max_m = ws_com.cell(row=tot_r, column=7, value=f"=SUM(G{start_r+1}:G{tot_r-1})")
        c_tot_min_a = ws_com.cell(row=tot_r, column=8, value=f"=SUM(H{start_r+1}:H{tot_r-1})")
        c_tot_max_a = ws_com.cell(row=tot_r, column=9, value=f"=SUM(I{start_r+1}:I{tot_r-1})")
        
        style_com_cell(c_tot_min_m, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='$ #,##0.00')
        style_com_cell(c_tot_max_m, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='$ #,##0.00')
        style_com_cell(c_tot_min_a, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='$ #,##0.00')
        style_com_cell(c_tot_max_a, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='$ #,##0.00')
        
        c_tot_cons = ws_com.cell(row=tot_r, column=10, value=f"=SUM(J{start_r+1}:J{tot_r-1})")
        style_com_cell(c_tot_cons, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='$ #,##0.00')
        
        c_tot_pmin = ws_com.cell(row=tot_r, column=11, value=f"=IF(H{tot_r}>0,J{tot_r}/H{tot_r},0)")
        c_tot_pmax = ws_com.cell(row=tot_r, column=12, value=f"=IF(I{tot_r}>0,J{tot_r}/I{tot_r},0)")
        style_com_cell(c_tot_pmin, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='0.0%')
        style_com_cell(c_tot_pmax, font_bold, fill=fill_sub, border=border_total, alignment=Alignment(horizontal="right"), num_format='0.0%')

        for r_idx in range(start_r, tot_r + 1):
            cell_a = ws_com.cell(row=r_idx, column=1)
            cell_a.value = code if r_idx == start_r else None
            style_com_cell(
                cell_a,
                font_hdr,
                fill=fill_hdr,
                border=border_thin,
                alignment=Alignment(horizontal="center", vertical="center", textRotation=90)
            )
        ws_com.merge_cells(start_row=start_r, start_column=1, end_row=tot_r, end_column=1)

        top_v_r = start_r + 1
        last_v_r = tot_r - 1
        
        ws_com.cell(row=top_v_r, column=3, value=f"=Objetivos!B{area_idx+2}")
        ws_com.cell(row=top_v_r, column=4, value=f"=Objetivos!C{area_idx+2}")
        
        for r_idx in range(top_v_r, last_v_r + 1):
            is_even = ((r_idx - top_v_r) % 2 == 1)
            fill_cell = fill_even if is_even else None
            
            c_max = ws_com.cell(row=r_idx, column=3)
            c_min = ws_com.cell(row=r_idx, column=4)
            
            style_com_cell(c_max, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="center", vertical="center"), num_format='$ #,##0.00')
            style_com_cell(c_min, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="center", vertical="center"), num_format='$ #,##0.00')
            
        ws_com.merge_cells(start_row=top_v_r, start_column=3, end_row=last_v_r, end_column=3)
        ws_com.merge_cells(start_row=top_v_r, start_column=4, end_row=last_v_r, end_column=4)

        block_info[code] = {
            "start_r": start_r,
            "top_v_r": start_r + 1,
            "tot_r": tot_r,
            "v_rows": {v["nombre"]: start_r + 1 + v_idx for v_idx, v in enumerate(vendedores_info)}
        }
        current_r = tot_r + 3

    # Table 1: Area Summary
    start_area_summary_r = current_r
    headers_t1 = ["Area", "Cuota Comercial", "Conseguido", "%"]
    for idx, val in enumerate(headers_t1):
        col_idx = idx + 2
        cell = ws_com.cell(row=start_area_summary_r, column=col_idx, value=val)
        style_com_cell(cell, font_hdr, fill=fill_hdr, border=border_thin, alignment=Alignment(horizontal="center", vertical="center", wrap_text=True))

    summary_areas_rows = [
        ("Minería", start_area_summary_r + 1, f"=C{block_info['MIN']['top_v_r']}", f"=SUM(J{block_info['MIN']['top_v_r']}:J{block_info['MIN']['tot_r']-1})"),
        ("Industria", start_area_summary_r + 2, f"=C{block_info['IND']['top_v_r']}", f"=SUM(J{block_info['IND']['top_v_r']}:J{block_info['IND']['tot_r']-1})"),
        ("Petroquímica", start_area_summary_r + 3, f"=C{block_info['OIL']['top_v_r']}", f"=SUM(J{block_info['OIL']['top_v_r']}:J{block_info['OIL']['tot_r']-1})"),
        ("Safety", start_area_summary_r + 4, f"=C{block_info['SFY']['top_v_r']}", f"=SUM(J{block_info['SFY']['top_v_r']}:J{block_info['SFY']['tot_r']-1})")
    ]

    for row_idx, (label, r, cuota_f, cons_f) in enumerate(summary_areas_rows):
        is_even = (row_idx % 2 == 1)
        fill_cell = fill_even if is_even else None
        
        c_label = ws_com.cell(row=r, column=2, value=label)
        style_com_cell(c_label, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="left", vertical="center"))
        
        c_cuota = ws_com.cell(row=r, column=3, value=cuota_f)
        style_com_cell(c_cuota, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        
        c_cons = ws_com.cell(row=r, column=4, value=cons_f)
        style_com_cell(c_cons, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        
        c_pct = ws_com.cell(row=r, column=5, value=f"=IF(C{r}>0,D{r}/C{r},0)")
        style_com_cell(c_pct, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')

    tot_area_r = start_area_summary_r + 5
    style_com_cell(ws_com.cell(row=tot_area_r, column=2, value="Total"), font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="left", vertical="center"))
    style_com_cell(ws_com.cell(row=tot_area_r, column=3, value=f"=SUM(C{start_area_summary_r+1}:C{tot_area_r-1})"), font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(ws_com.cell(row=tot_area_r, column=4, value=f"=SUM(D{start_area_summary_r+1}:D{tot_area_r-1})"), font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(ws_com.cell(row=tot_area_r, column=5, value=f"=IF(C{tot_area_r}>0,D{tot_area_r}/C{tot_area_r},0)"), font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')

    # Table 2: Salesperson Summary
    start_v_summary_r = tot_area_r + 3
    headers_t2 = ["Nombre Vendedor", "Obj. Min Mensual", "Obj. Max Mensual", "Obj. Min Anual", "Obj. Max Anual", "Conseguido", "% Min Mensual", "% Max Mensual", "% Min Anual", "% Max Anual"]
    for idx, val in enumerate(headers_t2):
        col_idx = idx + 2
        cell = ws_com.cell(row=start_v_summary_r, column=col_idx, value=val)
        style_com_cell(cell, font_hdr, fill=fill_hdr, border=border_thin, alignment=Alignment(horizontal="center", vertical="center", wrap_text=True))
        
    for idx, v in enumerate(vendedores_info):
        r = start_v_summary_r + 1 + idx
        is_even = (idx % 2 == 1)
        fill_cell = fill_even if is_even else None
        
        c_name = ws_com.cell(row=r, column=2, value=v["nombre"])
        style_com_cell(c_name, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="left", vertical="center"))
        
        # Calculate sums across the 4 area blocks for this salesperson
        formula_min_m = "=" + "+".join(f"F{block_info[code]['v_rows'][v['nombre']]}" for code in ["MIN", "IND", "OIL", "SFY"])
        formula_max_m = "=" + "+".join(f"G{block_info[code]['v_rows'][v['nombre']]}" for code in ["MIN", "IND", "OIL", "SFY"])
        formula_min_a = "=" + "+".join(f"H{block_info[code]['v_rows'][v['nombre']]}" for code in ["MIN", "IND", "OIL", "SFY"])
        formula_max_a = "=" + "+".join(f"I{block_info[code]['v_rows'][v['nombre']]}" for code in ["MIN", "IND", "OIL", "SFY"])
        formula_cons  = "=" + "+".join(f"J{block_info[code]['v_rows'][v['nombre']]}" for code in ["MIN", "IND", "OIL", "SFY"])
        
        c_min_m = ws_com.cell(row=r, column=3, value=formula_min_m)
        c_max_m = ws_com.cell(row=r, column=4, value=formula_max_m)
        c_min_a = ws_com.cell(row=r, column=5, value=formula_min_a)
        c_max_a = ws_com.cell(row=r, column=6, value=formula_max_a)
        c_cons  = ws_com.cell(row=r, column=7, value=formula_cons)
        
        c_pmin_m = ws_com.cell(row=r, column=8, value=f"=IF(C{r}>0,G{r}/C{r},0)")
        c_pmax_m = ws_com.cell(row=r, column=9, value=f"=IF(D{r}>0,G{r}/D{r},0)")
        c_pmin_a = ws_com.cell(row=r, column=10, value=f"=IF(E{r}>0,G{r}/E{r},0)")
        c_pmax_a = ws_com.cell(row=r, column=11, value=f"=IF(F{r}>0,G{r}/F{r},0)")
        
        style_com_cell(c_min_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        style_com_cell(c_max_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        style_com_cell(c_min_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        style_com_cell(c_max_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        style_com_cell(c_cons, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
        style_com_cell(c_pmin_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
        style_com_cell(c_pmax_m, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
        style_com_cell(c_pmin_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
        style_com_cell(c_pmax_a, font_segoe, fill=fill_cell, border=border_thin, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')

    tot_v_r = start_v_summary_r + 1 + len(vendedores_info)
    style_com_cell(ws_com.cell(row=tot_v_r, column=2, value="Total"), font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="left", vertical="center"))
    style_com_cell(ws_com.cell(row=tot_v_r, column=3, value=f"=SUM(C{start_v_summary_r+1}:C{tot_v_r-1})"), font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(ws_com.cell(row=tot_v_r, column=4, value=f"=SUM(D{start_v_summary_r+1}:D{tot_v_r-1})"), font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(ws_com.cell(row=tot_v_r, column=5, value=f"=SUM(E{start_v_summary_r+1}:E{tot_v_r-1})"), font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(ws_com.cell(row=tot_v_r, column=6, value=f"=SUM(F{start_v_summary_r+1}:F{tot_v_r-1})"), font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(ws_com.cell(row=tot_v_r, column=7, value=f"=SUM(G{start_v_summary_r+1}:G{tot_v_r-1})"), font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    
    c_tot_pmin_m = ws_com.cell(row=tot_v_r, column=8, value=f"=IF(C{tot_v_r}>0,G{tot_v_r}/C{tot_v_r},0)")
    c_tot_pmax_m = ws_com.cell(row=tot_v_r, column=9, value=f"=IF(D{tot_v_r}>0,G{tot_v_r}/D{tot_v_r},0)")
    c_tot_pmin_a = ws_com.cell(row=tot_v_r, column=10, value=f"=IF(E{tot_v_r}>0,G{tot_v_r}/E{tot_v_r},0)")
    c_tot_pmax_a = ws_com.cell(row=tot_v_r, column=11, value=f"=IF(F{tot_v_r}>0,G{tot_v_r}/F{tot_v_r},0)")
    
    style_com_cell(c_tot_min_m, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(c_tot_max_m, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(c_tot_min_a, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(c_tot_max_a, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(c_tot_cons, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='$ #,##0.00')
    style_com_cell(c_tot_pmin_m, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
    style_com_cell(c_tot_pmax_m, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
    style_com_cell(c_tot_pmin_a, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')
    style_com_cell(c_tot_pmax_a, font_bold, fill=fill_sub, border=border_double, alignment=Alignment(horizontal="right", vertical="center"), num_format='0.0%')

    # Add Chart
    from openpyxl.chart import BarChart3D, Reference
    from openpyxl.chart.label import DataLabelList
    from openpyxl.chart.legend import Legend

    chart_com = BarChart3D()
    chart_com.roundedCorners = True
    chart_com.type = "col"
    chart_com.grouping = "clustered"
    chart_com.style = 10
    set_chart_title(chart_com, "Seguimiento Objetivo Comercial", 12)
    
    ref_data = Reference(ws_com, min_col=3, max_col=4, min_row=start_area_summary_r, max_row=start_area_summary_r + 4)
    cats = Reference(ws_com, min_col=2, min_row=start_area_summary_r + 1, max_row=start_area_summary_r + 4)
    
    chart_com.add_data(ref_data, titles_from_data=True)
    chart_com.set_categories(cats)

    if len(chart_com.series) > 0:
        chart_com.series[0].graphicalProperties.solidFill = "8FAADC"
    if len(chart_com.series) > 1:
        chart_com.series[1].graphicalProperties.solidFill = "237573"
        
    chart_com.legend = Legend()
    chart_com.legend.position = "t"
    chart_com.dataLabels = DataLabelList()
    chart_com.dataLabels.showVal = True
    chart_com.dataLabels.showCatName = False
    chart_com.dataLabels.showSerName = False
    chart_com.dataLabels.showPercent = False
    
    chart_com.width = 16
    chart_com.height = 11
    ws_com.add_chart(chart_com, f"K{start_area_summary_r}") # Anclado en I28
    
    for col in ws_com.columns:
        col_num = col[0].column
        col_letter = get_column_letter(col_num)
        min_width = 16 if col_num in [3, 4, 6, 7, 8] else (20 if col_num == 2 else 12)
        max_len = 0
        for cell in col:
            val_str = str(cell.value or '')
            if val_str.startswith('='):
                continue
            max_len = max(max_len, len(val_str))
        ws_com.column_dimensions[col_letter].width = max(max_len + 3, min_width)

    # 4. Sheet Resumen Anual (Evolutivo)
    ws_res = wb.create_sheet(title="Resumen Anual")
    ws_res.views.sheetView[0].showGridLines = True
    ws_res.append([f"EVOLUTIVO MENSUAL DE OC {anno}"])
    ws_res.merge_cells("A1:F1")
    ws_res.cell(1, 1).font = Font(name="Segoe UI", size=14, bold=True, color="1F4E78")
    ws_res.cell(1, 1).alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    headers_res = ["MES", "MIN", "IND", "OIL", "SFY", "Monto OC"]
    ws_res.append(headers_res)

    for col_num in range(1, 7):
        cell = ws_res.cell(row=2, column=col_num)
        cell.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(bottom=Side(border_style="medium", color="000000"))

    meses_nombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    
    openings_anuales = CotizacionApertura.objects.filter(
        anno_a=str(anno),
        estado_orden__in=[1, 2, 3]
    ).annotate(
        m=ExtractMonth("fecha_orden")
    ).select_related("id_registro")

    resumen_dict = {
        m: {2: Decimal("0.00"), 1: Decimal("0.00"), 4: Decimal("0.00"), 8: Decimal("0.00")}
        for m in range(1, 13)
    }

    for ap in openings_anuales:
        cot = ap.id_registro
        if not cot:
            continue
        m = ap.m or cot.mes or 1
        if m < 1 or m > 12:
            continue
        factor = Decimal("1.00")
        resumen_dict[m][cot.id_area_id] = resumen_dict[m].get(cot.id_area_id, Decimal("0.00")) + (ap.total_orden or Decimal("0.00")) * factor

    for m in range(1, 13):
        row_num = m + 2
        min_val = float(resumen_dict[m][2])
        ind_val = float(resumen_dict[m][1])
        oil_val = float(resumen_dict[m][4])
        sfy_val = float(resumen_dict[m][8])
        row_cells = [
            meses_nombres[m-1], min_val, ind_val, oil_val, sfy_val,
            f"=SUM(B{row_num}:E{row_num})"
        ]
        ws_res.append(row_cells)

        for col_num in range(1, 7):
            cell = ws_res.cell(row=row_num, column=col_num)
            cell.font = Font(name="Segoe UI", size=9, color="27272A")
            cell.border = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
                                 top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))
            if row_num % 2 == 0:
                cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
            if col_num == 1:
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            else:
                cell.number_format = '$ #,##0.00'
                cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)

    total_row_idx = 15
    total_cells = [
        "TOTAL", "=SUM(B3:B14)", "=SUM(C3:C14)", "=SUM(D3:D14)", "=SUM(E3:E14)",
        "=SUM(F3:F14)"
    ]
    ws_res.append(total_cells)
    for col_num in range(1, 7):
        cell = ws_res.cell(row=total_row_idx, column=col_num)
        cell.font = Font(name="Segoe UI", size=10, bold=True, color="1E293B")
        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        cell.border = Border(top=Side(style='thin', color='000000'), bottom=Side(style='double', color='000000'))
        if col_num == 1:
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        else:
            cell.number_format = '$ #,##0.00'
            cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)

    for col in ws_res.columns:
        col_num = col[0].column
        col_letter = get_column_letter(col_num)
        min_width = 16 if col_num > 1 else 12
        max_len = 0
        for cell in col:
            val_str = str(cell.value or '')
            if val_str.startswith('='):
                continue
            max_len = max(max_len, len(val_str))
        ws_res.column_dimensions[col_letter].width = max(max_len + 3, min_width)

    # SALVAGUARDA GLOBAL DE ANCHOS DE COLUMNAS CONTRA ###
    from openpyxl.utils import get_column_letter
    for sheet in wb.worksheets:
        for col in sheet.columns:
            col_num = col[0].column
            col_letter = get_column_letter(col_num)
            max_len = 0
            for cell in col:
                # Omitir filas de cabecera (1 y 2) para el cálculo dinámico de anchos
                # ya que sus títulos largos están configurados con "Ajustar texto" (wrap text)
                if cell.row in [1, 2]:
                    continue
                val = cell.value
                if val is None:
                    continue
                val_str = str(val)
                if val_str.startswith('='):
                    max_len = max(max_len, 14)
                else:
                    max_len = max(max_len, len(val_str))
            
            if max_len > 0:
                current_width = sheet.column_dimensions[col_letter].width
                if col_num == 1:
                    safe_width = max(max_len + 3, 10) # Mantener la columna A de Área compacta (ancho 10)
                else:
                    safe_width = max(max_len + 4, 13)
                
                if sheet.title in ["Objetivos", "Objetivos Com."]:
                    if col_num in [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13]: # B to J, L, M
                        safe_width = max(safe_width, 18)
                if current_width is None or current_width < safe_width:
                    sheet.column_dimensions[col_letter].width = safe_width

    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename=reporte_anual.xlsx'
    wb.save(response)
    return response

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resumen_comercial_dashboard(request):
    try:
        raw_request = request._request if hasattr(request, '_request') else request
        
        res_objetivos = objetivos_anuales(raw_request)
        res_logrado = logrado_dashboard(raw_request)
        res_kpis = kpis_dashboard(raw_request)
        res_tendencias = tendencias_dashboard(raw_request)
        
        import json
        def get_data(res):
            if hasattr(res, 'data'):
                return res.data
            elif hasattr(res, 'content'):
                try:
                    return json.loads(res.content.decode('utf-8'))
                except Exception:
                    return None
            return None

        if res_objetivos.status_code >= 400:
            return res_objetivos
        if res_logrado.status_code >= 400:
            return res_logrado
        if res_kpis.status_code >= 400:
            return res_kpis
        if res_tendencias.status_code >= 400:
            return res_tendencias
            
        return Response({
            "objetivos": get_data(res_objetivos),
            "logrado": get_data(res_logrado),
            "kpis": get_data(res_kpis),
            "tendencias": get_data(res_tendencias),
        })
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

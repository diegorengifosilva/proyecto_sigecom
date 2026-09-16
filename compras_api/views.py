from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.db.models import Sum, Avg, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import SolicitudOrdenCompra, SolicitudPasajes, SolicitudPasajesDetalle
from .serializers import (
    SolicitudOrdenCompraSerializer,
    SolicitudPasajesSerializer,
    SolicitudPasajesDetalleSerializer
)
from cotizaciones_api.models import Cotizacion, CotizacionSuministro, CotizacionServicio
from cotizaciones_api.serializers import CotizacionSuministroSerializer, CotizacionServicioSerializer
from core.models import EmpresaTransporte
from users.models import Usuario
import datetime

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lista_programacion(request):
    """
    Retorna la lista de programaciones de compras y estadísticas asociadas.
    """
    from cotizaciones_api.models import CotizacionApertura
    
    anno = request.GET.get('anno')
    mes = request.GET.get('mes')

    hoy = timezone.now()
    if not anno or not anno.isdigit():
        target_year = hoy.year
    else:
        target_year = int(anno)

    target_month = int(mes) if mes and mes.isdigit() else None

    # Consulta de aperturas
    aperturas_qs = CotizacionApertura.objects.all().select_related(
        'id_registro',
        'id_registro__id_cliente',
        'id_registro__id_tipo'
    )
    aperturas_qs = aperturas_qs.filter(anno=target_year)
    if target_month:
        aperturas_qs = aperturas_qs.filter(mes=target_month)
        
    aperturas_qs = aperturas_qs.order_by('-fecha_orden', '-id_apertura')

    area_mapping = {
        1: "Industria", 
        2: "Minería", 
        3: "Mantenimiento", 
        4: "Petroquímica", 
        8: "Seguridad"
    }

    from collections import defaultdict
    from compras_api.models import SolicitudOrdenCompra, SolicitudPasajes
    from caja_chica_api.models import SolicitudCajaChica

    aperturas_list = list(aperturas_qs[:2000])
    ap_ids = [ap.id_apertura for ap in aperturas_list]
    ap_codigos = [ap.id_registro.codigo for ap in aperturas_list if ap.id_registro and ap.id_registro.codigo]
    ap_by_code = {ap.id_registro.codigo: ap.id_apertura for ap in aperturas_list if ap.id_registro and ap.id_registro.codigo}

    # Sumar todas las solicitudes de gasto emitidas/asociadas a cada proyecto (excluyendo anuladas id_estado=5)
    ejecutado_map = defaultdict(float)

    if ap_ids:
        query_filter = Q(id_apertura__in=ap_ids)
        if ap_codigos:
            query_filter |= Q(codigo__in=ap_codigos)

        ocs = SolicitudOrdenCompra.objects.filter(query_filter).exclude(id_estado=5).values('id_apertura', 'codigo', 'monto_dolares')
        pas = SolicitudPasajes.objects.filter(query_filter).exclude(id_estado=5).values('id_apertura', 'codigo', 'monto_dolares')
        ccs = SolicitudCajaChica.objects.filter(query_filter).exclude(id_estado=5).values('id_apertura', 'codigo', 'monto_dolares')

        for item in list(ocs) + list(pas) + list(ccs):
            monto = float(item.get('monto_dolares') or 0.0)
            aid = item.get('id_apertura')
            if (not aid or aid not in ap_ids) and item.get('codigo'):
                aid = ap_by_code.get(item.get('codigo'))
            if aid:
                ejecutado_map[aid] += monto

    tabla = []
    for ap in aperturas_list:
        coti = ap.id_registro
        
        # Código & Referencia
        codigo = coti.codigo if coti else "S/N"
        referencia = coti.referencia if coti else "S/N"
        
        # Empresa
        empresa = "S/N"
        if coti:
            if coti.id_cliente:
                empresa = coti.id_cliente.nombre
            else:
                empresa = coti.representante_nombre or "S/N"
                
        # Área
        area = "Otros"
        if coti and coti.id_area:
            area = area_mapping.get(coti.id_area, "Otros")
            
        # Tipo
        tipo = "Otros"
        if coti and coti.id_tipo:
            tipo = coti.id_tipo.nombre
            
        # Fórmulas del Módulo de Programación:
        # 1. Programado = Presupuesto total aprobado de la Apertura
        programado = round(float(ap.presupuesto or 0.00), 2)
        # 2. Ejecutado = Suma de todas las Solicitudes de Gasto (OC, Pasajes, Caja Chica)
        ejecutado = round(ejecutado_map.get(ap.id_apertura, 0.00), 2)
        # 3. Saldo = Programado - Ejecutado (piso mínimo estricto de 0.00)
        saldo = round(max(0.00, programado - ejecutado), 2)

        tabla.append({
            "id_registro": ap.id_apertura,
            "codigo": codigo,
            "referencia": referencia,
            "empresa": empresa,
            "area": area,
            "tipo": tipo,
            "programado": programado,
            "ejecutado": ejecutado,
            "saldo": saldo
        })

    # Calcular estadísticas
    total = len(tabla)
    monto_total_dolares = 0.0
    monto_total_soles = 0.0
    
    for ap in aperturas_qs:
        coti = ap.id_registro
        tc = float(coti.tipo_cambio or 1.0) if coti else 1.0
        if tc <= 0:
            tc = 1.0
            
        val = float(ap.presupuesto or 0.00) # programado
        
        if coti and coti.tipo_moneda == "D":
            monto_total_dolares += val
            monto_total_soles += val * tc
        else:
            monto_total_soles += val
            monto_total_dolares += val / tc
            
    promedio_dolares = monto_total_dolares / total if total > 0 else 0.00
    promedio_soles = monto_total_soles / total if total > 0 else 0.00

    current_month_str = hoy.strftime("%Y-%m")
    este_mes = sum(1 for ap in aperturas_qs if ap.fecha_orden and ap.fecha_orden.strftime("%Y-%m") == current_month_str)

    dashboard = {
        "total": total,
        "montoTotalDolares": round(monto_total_dolares, 2),
        "montoTotalSoles": round(monto_total_soles, 2),
        "esteMes": este_mes,
        "promedioDolares": round(promedio_dolares, 2),
        "promedioSoles": round(promedio_soles, 2)
    }

    return Response({
        "tabla": tabla,
        "dashboard": dashboard
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lista_atencion(request):
    """
    Retorna la lista unificada de solicitudes de compras y pasajes,
    junto con sus estadísticas calculadas dinámicamente.
    """
    # Obtener parámetros de filtrado
    anno = request.GET.get('anno')
    mes = request.GET.get('mes')

    # Si no se provee año, se asume el año actual
    hoy = timezone.now()
    if not anno or not anno.isdigit():
        target_year = hoy.year
    else:
        target_year = int(anno)

    target_month = int(mes) if mes and mes.isdigit() else None

    # --- 1. CONSULTA DE ÓRDENES DE COMPRA (ATENCIÓN: id_estado = 1) ---
    compras_qs = SolicitudOrdenCompra.objects.all().select_related('id_area', 'id_solicitante', 'id_estado')
    compras_qs = compras_qs.filter(id_estado=1)
    compras_qs = compras_qs.filter(fecha_orden__year=target_year)
    if target_month:
        compras_qs = compras_qs.filter(fecha_orden__month=target_month)
    compras_qs = compras_qs.order_by('-fecha_orden', '-id_solicitud')
    compras_data = SolicitudOrdenCompraSerializer(compras_qs[:1000], many=True).data

    # --- 2. CONSULTA DE PASAJES (ATENCIÓN: id_estado = 1) ---
    pasajes_qs = SolicitudPasajes.objects.all().select_related('id_area', 'id_solicitante', 'id_estado')
    pasajes_qs = pasajes_qs.filter(id_estado=1)
    pasajes_qs = pasajes_qs.filter(
        Q(fecha_salida__year=target_year) |
        Q(fecha_salida__isnull=True, fecha__year=target_year)
    )
    if target_month:
        pasajes_qs = pasajes_qs.filter(
            Q(fecha_salida__month=target_month) |
            Q(fecha_salida__isnull=True, fecha__month=target_month)
        )
    pasajes_qs = pasajes_qs.order_by('-fecha_salida', '-id_pasaje')
    pasajes_data = SolicitudPasajesSerializer(pasajes_qs[:1000], many=True).data

    # --- 3. UNIFICACIÓN Y ORDENACIÓN ---
    combined_list = list(compras_data) + list(pasajes_data)
    # Ordenar por fecha de forma descendente (más recientes primero)
    combined_list.sort(key=lambda x: x.get('fecha') or '', reverse=True)
    # Ordenar de forma estable por id_estado de forma ascendente (mantiene orden de fecha descendente)
    combined_list.sort(key=lambda x: x.get('id_estado') if x.get('id_estado') is not None else 99)

    # --- 4. CÁLCULO DE ESTADÍSTICAS ---
    total = len(combined_list)
    
    monto_total_soles = sum(float(item.get('monto_pen') or 0.00) for item in combined_list)
    monto_total_dolares = sum(float(item.get('monto_usd') or 0.00) for item in combined_list)
    
    soles_items = [float(item.get('monto_pen')) for item in combined_list if float(item.get('monto_pen') or 0.00) > 0.00]
    dolares_items = [float(item.get('monto_usd')) for item in combined_list if float(item.get('monto_usd') or 0.00) > 0.00]
    
    promedio_soles = sum(soles_items) / len(soles_items) if soles_items else 0.00
    promedio_dolares = sum(dolares_items) / len(dolares_items) if dolares_items else 0.00

    current_month_str = hoy.strftime("%Y-%m")
    este_mes = sum(1 for item in combined_list if item.get('fecha') and item.get('fecha').startswith(current_month_str))

    dashboard = {
        "total": total,
        "montoTotalDolares": round(monto_total_dolares, 2),
        "montoTotalSoles": round(monto_total_soles, 2),
        "esteMes": este_mes,
        "promedioDolares": round(promedio_dolares, 2),
        "promedioSoles": round(promedio_soles, 2)
    }

    return Response({
        "tabla": combined_list[:2000],
        "dashboard": dashboard
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lista_liquidaciones(request):
    """
    Retorna la lista de liquidaciones de compras y pasajes y estadísticas asociadas,
    filtradas por los estados de liquidación (2, 3, 4, 5).
    """
    anno = request.GET.get('anno')
    mes = request.GET.get('mes')

    hoy = timezone.now()
    if not anno or not anno.isdigit():
        target_year = hoy.year
    else:
        target_year = int(anno)

    target_month = int(mes) if mes and mes.isdigit() else None

    # --- 1. CONSULTA DE ÓRDENES DE COMPRA (LIQUIDACIÓN: id_estado in [2, 3, 4, 5]) ---
    compras_qs = SolicitudOrdenCompra.objects.all().select_related('id_area', 'id_solicitante', 'id_estado')
    compras_qs = compras_qs.filter(id_estado__in=[2, 3, 4, 5])
    compras_qs = compras_qs.filter(fecha_orden__year=target_year)
    if target_month:
        compras_qs = compras_qs.filter(fecha_orden__month=target_month)
    compras_qs = compras_qs.order_by('-fecha_orden', '-id_solicitud')
    compras_data = SolicitudOrdenCompraSerializer(compras_qs[:1000], many=True).data

    # --- 2. CONSULTA DE PASAJES (LIQUIDACIÓN: id_estado in [2, 3, 4, 5]) ---
    pasajes_qs = SolicitudPasajes.objects.all().select_related('id_area', 'id_solicitante', 'id_estado')
    pasajes_qs = pasajes_qs.filter(id_estado__in=[2, 3, 4, 5])
    pasajes_qs = pasajes_qs.filter(
        Q(fecha_salida__year=target_year) |
        Q(fecha_salida__isnull=True, fecha__year=target_year)
    )
    if target_month:
        pasajes_qs = pasajes_qs.filter(
            Q(fecha_salida__month=target_month) |
            Q(fecha_salida__isnull=True, fecha__month=target_month)
        )
    pasajes_qs = pasajes_qs.order_by('-fecha_salida', '-id_pasaje')
    pasajes_data = SolicitudPasajesSerializer(pasajes_qs[:1000], many=True).data

    # --- 3. UNIFICACIÓN Y ORDENACIÓN ---
    combined_list = list(compras_data) + list(pasajes_data)
    combined_list.sort(key=lambda x: x.get('fecha') or '', reverse=True)
    combined_list.sort(key=lambda x: x.get('id_estado') if x.get('id_estado') is not None else 99)

    # --- 4. CÁLCULO DE ESTADÍSTICAS ---
    total = len(combined_list)
    
    monto_total_soles = sum(float(item.get('monto_pen') or 0.00) for item in combined_list)
    monto_total_dolares = sum(float(item.get('monto_usd') or 0.00) for item in combined_list)
    
    soles_items = [float(item.get('monto_pen')) for item in combined_list if float(item.get('monto_pen') or 0.00) > 0.00]
    dolares_items = [float(item.get('monto_usd')) for item in combined_list if float(item.get('monto_usd') or 0.00) > 0.00]
    
    promedio_soles = sum(soles_items) / len(soles_items) if soles_items else 0.00
    promedio_dolares = sum(dolares_items) / len(dolares_items) if dolares_items else 0.00

    current_month_str = hoy.strftime("%Y-%m")
    este_mes = sum(1 for item in combined_list if item.get('fecha') and item.get('fecha').startswith(current_month_str))

    dashboard = {
        "total": total,
        "montoTotalDolares": round(monto_total_dolares, 2),
        "montoTotalSoles": round(monto_total_soles, 2),
        "esteMes": este_mes,
        "promedioDolares": round(promedio_dolares, 2),
        "promedioSoles": round(promedio_soles, 2)
    }

    return Response({
        "tabla": combined_list[:2000],
        "dashboard": dashboard
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalle_solicitud_compra(request, id_solicitud):
    """
    Retorna los detalles de una SolicitudOrdenCompra específica, junto con los 
    ítems/partidas propios registrados para esta orden.
    """
    solicitud = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_solicitud)
    serializer = SolicitudOrdenCompraSerializer(solicitud)
    data = serializer.data
    
    suministros = []
    servicios = []
    
    # Obtener únicamente los detalles registrados para esta orden específica
    detalles_qs = solicitud.detalles.all()
    if detalles_qs.exists():
        from .serializers import SolicitudOrdenCompraDetalleSerializer
        tipo_solicitud = (solicitud.tipo or "C").strip().upper()
        if tipo_solicitud in ('S', 'SERVICIO'):
            for item in detalles_qs:
                servicios.append({
                    "id_servicio": item.id_detalle,
                    "codigo_item": item.codigo or "",
                    "descripcion_item": item.descripcion or "",
                    "horas": item.cantidad or 0,
                    "cantidad_hombres": 1,
                    "cotizado_hombre_dia": float(item.valor or 0.00),
                    "cotizado_total": float(item.total or 0.00)
                })
        else:
            suministros = SolicitudOrdenCompraDetalleSerializer(detalles_qs, many=True).data
                
    data['suministros'] = suministros
    data['servicios'] = servicios

    if solicitud.id_apertura_id:
        from .presupuesto_service import obtener_resumen_presupuesto
        resumen = obtener_resumen_presupuesto(
            solicitud.id_apertura_id,
            tipo_gasto_id=solicitud.tipo_gasto_id or 2,
            exclude_id=solicitud.id_solicitud,
            exclude_tipo='compra'
        )
        if resumen:
            monto_actual = float(solicitud.monto_dolares or 0.0)
            resumen["monto_actual"] = monto_actual
            resumen["disponible_maximo"] = round(resumen["disponible_rubro"] + monto_actual, 2)
            data["presupuesto_info"] = resumen

    return Response(data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def atender_solicitud_compra(request, id_solicitud):
    """
    Cambia el estado de una SolicitudOrdenCompra a 'Atendido, Pendiente de Liquidacion' (id_estado = 2).
    """
    solicitud = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_solicitud)
    from core.models import EstadoSolicitud
    try:
        estado_atendido = EstadoSolicitud.objects.get(id_estado=2)
        solicitud.id_estado = estado_atendido
        solicitud.save(update_fields=['id_estado'])
        return Response({
            "message": "Solicitud atendida con éxito.",
            "estado": estado_atendido.nombre,
            "id_estado": 2,
            "data": SolicitudOrdenCompraSerializer(solicitud).data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"No se pudo cambiar el estado: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agregar_detalle_compra(request, id_solicitud):
    solicitud = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_solicitud)
    codigo = request.data.get('codigo', '')
    descripcion = request.data.get('descripcion', '')
    try:
        cantidad = int(request.data.get('cantidad', 1))
    except (ValueError, TypeError):
        cantidad = 1
    try:
        valor = float(request.data.get('valor', 0.00))
    except (ValueError, TypeError):
        valor = 0.00
    
    total = cantidad * valor

    # Validar disponibilidad presupuestal antes de agregar el detalle
    if solicitud.id_apertura_id:
        from .presupuesto_service import validar_monto_disponible
        detalles_qs = solicitud.detalles.all()
        current_sum = sum(float(it.total or 0.0) for it in detalles_qs)
        new_sum = current_sum + total
        tc = float(solicitud.tipo_cambio or 1.0)
        tc = tc if tc > 0 else 1.0
        new_monto_usd = new_sum if solicitud.tipo_moneda == 'D' else (new_sum / tc)

        valido, disponible, err_msg, _ = validar_monto_disponible(
            solicitud.id_apertura_id,
            tipo_gasto_id=solicitud.tipo_gasto_id or 2,
            nuevo_monto_dolares=new_monto_usd,
            exclude_id=solicitud.id_solicitud,
            exclude_tipo='compra'
        )
        if not valido:
            return Response({"error": err_msg, "disponible": disponible}, status=status.HTTP_400_BAD_REQUEST)

    from .models import SolicitudOrdenCompraDetalle
    detalle = SolicitudOrdenCompraDetalle.objects.create(
        id_registro=solicitud,
        codigo=codigo,
        descripcion=descripcion,
        cantidad=cantidad,
        valor=valor,
        total=total
    )
    
    actualizar_totales_solicitud(solicitud)
    
    from .serializers import SolicitudOrdenCompraDetalleSerializer
    return Response({
        "message": "Detalle agregado con éxito.",
        "item": SolicitudOrdenCompraDetalleSerializer(detalle).data
    }, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'POST'])
@permission_classes([IsAuthenticated])
def editar_detalle_compra(request, id_detalle):
    from .models import SolicitudOrdenCompraDetalle
    detalle = get_object_or_404(SolicitudOrdenCompraDetalle, id_detalle=id_detalle)
    solicitud = detalle.id_registro
    
    if 'codigo' in request.data:
        detalle.codigo = request.data.get('codigo')
    if 'descripcion' in request.data:
        detalle.descripcion = request.data.get('descripcion')
    if 'cantidad' in request.data:
        try:
            detalle.cantidad = int(request.data.get('cantidad'))
        except (ValueError, TypeError):
            pass
    if 'valor' in request.data:
        try:
            detalle.valor = float(request.data.get('valor'))
        except (ValueError, TypeError):
            pass
            
    nuevo_total_item = (detalle.cantidad or 0) * (detalle.valor or 0.00)

    # Validar disponibilidad presupuestal antes de guardar la edición del detalle
    if solicitud.id_apertura_id:
        from .presupuesto_service import validar_monto_disponible
        otros_detalles = solicitud.detalles.exclude(id_detalle=detalle.id_detalle)
        new_sum = sum(float(it.total or 0.0) for it in otros_detalles) + nuevo_total_item
        tc = float(solicitud.tipo_cambio or 1.0)
        tc = tc if tc > 0 else 1.0
        new_monto_usd = new_sum if solicitud.tipo_moneda == 'D' else (new_sum / tc)

        valido, disponible, err_msg, _ = validar_monto_disponible(
            solicitud.id_apertura_id,
            tipo_gasto_id=solicitud.tipo_gasto_id or 2,
            nuevo_monto_dolares=new_monto_usd,
            exclude_id=solicitud.id_solicitud,
            exclude_tipo='compra'
        )
        if not valido:
            return Response({"error": err_msg, "disponible": disponible}, status=status.HTTP_400_BAD_REQUEST)

    detalle.total = nuevo_total_item
    detalle.save()
    
    actualizar_totales_solicitud(solicitud)
    
    from .serializers import SolicitudOrdenCompraDetalleSerializer
    return Response({
        "message": "Detalle actualizado con éxito.",
        "item": SolicitudOrdenCompraDetalleSerializer(detalle).data
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_detalle_compra(request, id_detalle):
    from .models import SolicitudOrdenCompraDetalle
    detalle = get_object_or_404(SolicitudOrdenCompraDetalle, id_detalle=id_detalle)
    solicitud = detalle.id_registro
    detalle.delete()
    
    actualizar_totales_solicitud(solicitud)
    
    return Response({
        "message": "Detalle eliminado con éxito."
    }, status=status.HTTP_200_OK)


def actualizar_totales_solicitud(solicitud):
    detalles = solicitud.detalles.all()
    total_items = sum(float(item.total or 0.00) for item in detalles)
    
    tipo_cambio = float(solicitud.tipo_cambio or 1.0)
    if tipo_cambio <= 0:
        tipo_cambio = 1.0
        
    if solicitud.tipo_moneda == "D":
        solicitud.monto_dolares = total_items
        solicitud.monto_soles = total_items * tipo_cambio
    else:
        solicitud.monto_soles = total_items
        solicitud.monto_dolares = total_items / tipo_cambio
        
    solicitud.save()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def anular_solicitud_compra(request, id_solicitud):
    from core.models import EstadoSolicitud
    solicitud = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_solicitud)
    estado_anulado = get_object_or_404(EstadoSolicitud, id_estado=5)
    solicitud.id_estado = estado_anulado
    solicitud.save()
    return Response({"message": "Solicitud anulada con éxito."}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_solicitud_compra(request, id_solicitud):
    solicitud = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_solicitud)
    id_apertura = solicitud.id_apertura_id
    solicitud.detalles.all().delete()
    solicitud.delete()
    return Response({
        "message": "Solicitud eliminada con éxito.",
        "id_apertura": id_apertura
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_solicitud_compra(request):
    """
    Crea una nueva Solicitud de Orden de Compra o Servicio.
    """
    from core.models import EstadoSolicitud, TipoGasto
    from cotizaciones_api.models import CotizacionApertura
    from users.models import Area, Usuario

    data = request.data
    
    # 1. Estado inicial (0 = Pendiente de Envio)
    id_estado_val = data.get('id_estado')
    estado = None
    if id_estado_val is not None and str(id_estado_val).strip() != '':
        estado = EstadoSolicitud.objects.filter(id_estado=id_estado_val).first()
    if not estado:
        estado = EstadoSolicitud.objects.filter(id_estado=0).first()

    # 2. Solicitante
    solicitante = None
    id_solicitante = data.get('id_solicitante')
    if id_solicitante:
        solicitante = Usuario.objects.filter(id_usuario=id_solicitante).first()
    if not solicitante and request.user.is_authenticated:
        if isinstance(request.user, Usuario):
            solicitante = request.user
        else:
            solicitante = Usuario.objects.filter(id_usuario=request.user.pk).first()

    # 3. Apertura
    apertura = None
    id_apertura = data.get('id_apertura')
    if id_apertura:
        apertura = CotizacionApertura.objects.filter(id_apertura=id_apertura).first()

    # 4. Área (Heredada prioritariamente de la cotización padre de la apertura)
    area = None
    id_area = data.get('id_area')
    if id_area:
        try:
            area = Area.objects.filter(id_area=int(id_area)).first()
        except (ValueError, TypeError):
            pass
    if not area and apertura and apertura.id_registro:
        coti_area = getattr(apertura.id_registro, 'id_area', None)
        if isinstance(coti_area, Area):
            area = coti_area
        elif coti_area:
            try:
                area = Area.objects.filter(id_area=int(coti_area)).first()
            except (ValueError, TypeError):
                pass
    if not area:
        area = Area.objects.first()

    # 5. Tipo de Gasto (Partida / FK a TipoGasto)
    tipo_gasto_id = data.get('tipo_gasto') or data.get('tipo_movimiento')
    tipo_gasto_obj = None
    if tipo_gasto_id:
        try:
            tipo_gasto_obj = TipoGasto.objects.filter(id_tipo_gasto=int(tipo_gasto_id)).first()
        except (ValueError, TypeError):
            pass
    if not tipo_gasto_obj:
        tipo_gasto_obj = TipoGasto.objects.filter(id_tipo_gasto=2).first()

    # 6. Fechas
    fecha_str = data.get('fecha')
    hora_str = data.get('hora')
    fecha_dt = timezone.now()
    if fecha_str:
        try:
            if hora_str:
                naive_dt = datetime.datetime.strptime(f"{fecha_str} {hora_str}", "%Y-%m-%d %H:%M")
            else:
                naive_dt = datetime.datetime.strptime(fecha_str, "%Y-%m-%d")
            fecha_dt = timezone.make_aware(naive_dt) if timezone.is_naive(naive_dt) else naive_dt
        except Exception:
            pass

    fecha_orden_str = data.get('fecha_orden')
    fecha_orden_dt = fecha_dt
    if fecha_orden_str:
        try:
            naive_dt = datetime.datetime.strptime(fecha_orden_str, "%Y-%m-%d")
            fecha_orden_dt = timezone.make_aware(naive_dt) if timezone.is_naive(naive_dt) else naive_dt
        except Exception:
            pass

    # 7. Monedas y Montos
    tipo_moneda = data.get('tipo_moneda', 'D')
    if tipo_moneda in ['Dolares', 'DOLARES', 'USD', 'D']:
        tipo_moneda = 'D'
    else:
        tipo_moneda = 'S'

    tc = float(data.get('tipo_cambio') or 3.75)
    monto_soles = float(data.get('monto_soles') or 0.00)
    monto_dolares = float(data.get('monto_dolares') or 0.00)

    if tipo_moneda == 'S' and monto_soles > 0 and monto_dolares == 0 and tc > 0:
        monto_dolares = round(monto_soles / tc, 2)
    elif tipo_moneda == 'D' and monto_dolares > 0 and monto_soles == 0 and tc > 0:
        monto_soles = round(monto_dolares * tc, 2)

    # Validar disponibilidad presupuestal
    if apertura:
        from .presupuesto_service import validar_monto_disponible
        valido, disponible, err_msg, _ = validar_monto_disponible(
            apertura.id_apertura,
            tipo_gasto_id=tipo_gasto_obj.id_tipo_gasto if tipo_gasto_obj else 2,
            nuevo_monto_dolares=monto_dolares
        )
        if not valido:
            return Response({"error": err_msg, "disponible": disponible}, status=status.HTTP_400_BAD_REQUEST)

    # 8. Tipo ('C' para Compra o 'S' para Servicio)
    tipo_val = data.get('tipo', 'C')
    if str(tipo_val).strip().upper() in ['S', 'SERVICIO']:
        tipo_val = 'S'
    else:
        tipo_val = 'C'

    # 9. Código
    codigo = data.get('codigo')
    if not codigo and apertura and apertura.id_registro and hasattr(apertura.id_registro, 'codigo'):
        codigo = apertura.id_registro.codigo

    # 10. Concepto
    tipo_nombre = "Servicio" if tipo_val == 'S' else "Compra"
    ref = (data.get('referencia') or '').strip()
    if ref:
        concepto_final = f"Solicitud {tipo_nombre} - {ref}"
    else:
        concepto_final = data.get('concepto') or f"Solicitud {tipo_nombre} - {data.get('empresa', '').strip() or codigo or ''}"

    # 11. Generar id_registro secuencial unificado
    from core.id_generator import obtener_siguiente_id_registro
    siguiente_id = obtener_siguiente_id_registro()

    # 12. Crear Solicitud
    solicitud = SolicitudOrdenCompra.objects.create(
        id_solicitud=siguiente_id,
        id_apertura=apertura,
        nivel_grupo=data.get('nivel_grupo') or (apertura.id_apertura if apertura else 1),
        num=data.get('num') or 1,
        fecha=fecha_dt,
        fecha_orden=fecha_orden_dt,
        id_area=area,
        codigo=codigo,
        id_solicitante=solicitante,
        id_estado=estado,
        numero_orden=data.get('numero_orden') or '',
        tipo=tipo_val,
        tipo_gasto=tipo_gasto_obj,
        tipo_movimiento='03',
        empresa=data.get('empresa') or '',
        direccion=data.get('direccion') or '',
        contacto=data.get('contacto') or '',
        entrega_lugar=data.get('entrega_lugar') or '',
        tiempo_entrega=data.get('tiempo_entrega') or '',
        referencia=data.get('referencia') or '',
        concepto=concepto_final,
        tipo_moneda=tipo_moneda,
        tipo_cambio=tc,
        monto_soles=monto_soles,
        monto_dolares=monto_dolares,
    )

    # 13. Persistir detalles / partidas si fueron enviados en el modal
    detalles = data.get('detalles') or data.get('partidas') or []
    from .models import SolicitudOrdenCompraDetalle
    for item in detalles:
        cod = str(item.get('codigo') or '').strip()
        desc = str(item.get('descripcion') or item.get('item') or '').strip()
        try:
            cant = int(item.get('cantidad') or 1)
        except (ValueError, TypeError):
            cant = 1
        try:
            val = float(item.get('valor') or item.get('precio') or 0.00)
        except (ValueError, TypeError):
            val = 0.00
        tot = float(item.get('total') or (cant * val))
        if desc or cod or val > 0:
            SolicitudOrdenCompraDetalle.objects.create(
                id_registro=solicitud,
                codigo=cod,
                descripcion=desc,
                cantidad=cant,
                valor=val,
                total=tot
            )

    if detalles:
        actualizar_totales_solicitud(solicitud)

    return Response({
        "message": "Solicitud de Orden de Compra/Servicio creada con éxito.",
        "id_solicitud": solicitud.id_solicitud,
        "data": SolicitudOrdenCompraSerializer(solicitud).data
    }, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def editar_solicitud_compra(request, id_solicitud):
    """
    Permite editar campos individuales o generales de la SolicitudOrdenCompra
    únicamente cuando se encuentra en estado 'Pendiente de Envio' (id_estado = 0).
    """
    solicitud = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_solicitud)
    data = request.data

    if solicitud.id_estado_id not in (0, None):
        return Response({
            "error": "La orden solo puede ser modificada cuando se encuentra en estado PENDIENTE DE ENVÍO."
        }, status=status.HTTP_400_BAD_REQUEST)

    campos_actualizados = []

    if 'empresa' in data:
        solicitud.empresa = str(data.get('empresa') or '').strip()
        campos_actualizados.append('empresa')

    if 'direccion' in data:
        solicitud.direccion = str(data.get('direccion') or '').strip()
        campos_actualizados.append('direccion')

    if 'contacto' in data:
        solicitud.contacto = str(data.get('contacto') or '').strip()
        campos_actualizados.append('contacto')

    if 'referencia' in data:
        solicitud.referencia = str(data.get('referencia') or '').strip()
        campos_actualizados.append('referencia')

    if 'numero_orden' in data:
        solicitud.numero_orden = str(data.get('numero_orden') or '').strip()
        campos_actualizados.append('numero_orden')

    if 'tipo' in data:
        val_t = str(data.get('tipo') or '').strip().upper()
        solicitud.tipo = 'S' if val_t in ('S', 'SERVICIO') else 'C'
        campos_actualizados.append('tipo')

    if 'tiempo_entrega' in data:
        solicitud.tiempo_entrega = str(data.get('tiempo_entrega') or '').strip()
        campos_actualizados.append('tiempo_entrega')

    if 'entrega_lugar' in data:
        solicitud.entrega_lugar = str(data.get('entrega_lugar') or '').strip()
        campos_actualizados.append('entrega_lugar')

    if 'concepto' in data:
        solicitud.concepto = str(data.get('concepto') or '').strip()
        campos_actualizados.append('concepto')

    if 'tipo_gasto' in data or 'tipo_movimiento' in data:
        tg_id = data.get('tipo_gasto') or data.get('tipo_movimiento')
        if tg_id:
            try:
                tg_obj = TipoGasto.objects.filter(id_tipo_gasto=int(tg_id)).first()
                if tg_obj:
                    solicitud.tipo_gasto = tg_obj
                    campos_actualizados.append('tipo_gasto')
            except (ValueError, TypeError):
                pass

    if 'fecha_orden' in data:
        fecha_val = data.get('fecha_orden')
        if fecha_val:
            try:
                from django.utils.dateparse import parse_date, parse_datetime
                import datetime as dt_module
                dt = parse_datetime(fecha_val) or parse_date(fecha_val)
                if dt:
                    if not hasattr(dt, 'hour'):
                        dt = dt_module.datetime.combine(dt, dt_module.time.min)
                    solicitud.fecha_orden = dt
                    campos_actualizados.append('fecha_orden')
            except Exception:
                pass

    recalcular = False
    if 'tipo_moneda' in data:
        tm = str(data.get('tipo_moneda') or '').strip().upper()
        solicitud.tipo_moneda = 'D' if tm in ('D', 'USD', 'DOLARES', 'DÓLARES') else 'S'
        recalcular = True
        campos_actualizados.append('tipo_moneda')

    if 'tipo_cambio' in data:
        try:
            tc_val = float(data.get('tipo_cambio') or 0.0)
            if tc_val > 0:
                solicitud.tipo_cambio = tc_val
                recalcular = True
                campos_actualizados.append('tipo_cambio')
        except (ValueError, TypeError):
            pass

    solicitud.save()

    if recalcular:
        actualizar_totales_solicitud(solicitud)

    return Response({
        "message": "Orden actualizada con éxito.",
        "campos": campos_actualizados,
        "data": SolicitudOrdenCompraSerializer(solicitud).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enviar_solicitud_compra(request, id_solicitud):
    """
    Pasa la orden al estado 'Enviado, Pendiente de Atencion' (id_estado = 1),
    bloqueando la edición directa hasta que se revierta o se atienda.
    """
    solicitud = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_solicitud)
    from core.models import EstadoSolicitud
    try:
        estado_enviado = EstadoSolicitud.objects.get(id_estado=1)
        solicitud.id_estado = estado_enviado
        solicitud.save(update_fields=['id_estado'])
        return Response({
            "message": "Orden enviada con éxito.",
            "estado": estado_enviado.nombre,
            "id_estado": 1,
            "data": SolicitudOrdenCompraSerializer(solicitud).data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"No se pudo enviar la orden: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def revertir_solicitud_compra(request, id_solicitud):
    """
    Retorna la orden al estado 'Pendiente de Envio' (id_estado = 0) para permitir
    nuevas correcciones y edición de campos mediante doble clic.
    """
    solicitud = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_solicitud)
    from core.models import EstadoSolicitud
    try:
        estado_pendiente = EstadoSolicitud.objects.get(id_estado=0)
        solicitud.id_estado = estado_pendiente
        solicitud.save()
        return Response({
            "message": "Orden retornada a PENDIENTE DE ENVÍO para edición.",
            "estado": estado_pendiente.nombre,
            "data": SolicitudOrdenCompraSerializer(solicitud).data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"No se pudo revertir el estado: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


# =========================================================================
# VISTAS DE PASAJES (TRAVEL REQUESTS)
# =========================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalle_solicitud_pasaje(request, id_pasaje):
    """
    Retorna los datos completos de una SolicitudPasajes junto a sus pasajeros.
    """
    pasaje = get_object_or_404(SolicitudPasajes, id_pasaje=id_pasaje)
    serializer = SolicitudPasajesSerializer(pasaje)
    data = serializer.data

    if pasaje.id_apertura_id:
        from .presupuesto_service import obtener_resumen_presupuesto
        resumen = obtener_resumen_presupuesto(
            pasaje.id_apertura_id,
            tipo_gasto_id=pasaje.tipo_gasto_id or 4,
            exclude_id=pasaje.id_pasaje,
            exclude_tipo='pasaje'
        )
        if resumen:
            monto_actual = float(pasaje.monto_dolares or 0.0)
            resumen["monto_actual"] = monto_actual
            resumen["disponible_maximo"] = round(resumen["disponible_rubro"] + monto_actual, 2)
            data["presupuesto_info"] = resumen

    return Response(data, status=status.HTTP_200_OK)


@api_view(['PUT', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def editar_solicitud_pasaje(request, id_pasaje):
    """
    Permite editar campos de la SolicitudPasajes únicamente cuando se encuentra
    en estado 'Pendiente de Envio' (id_estado = 0).
    """
    pasaje = get_object_or_404(SolicitudPasajes, id_pasaje=id_pasaje)
    data = request.data

    if pasaje.id_estado_id not in (0, None):
        return Response({
            "error": "El pasaje solo puede ser modificado cuando se encuentra en estado PENDIENTE DE ENVÍO."
        }, status=status.HTTP_400_BAD_REQUEST)

    campos_actualizados = []

    if 'id_empresa' in data or 'empresa' in data:
        emp_val = data.get('id_empresa') or data.get('empresa')
        emp_obj = None
        if isinstance(emp_val, int) or (isinstance(emp_val, str) and str(emp_val).isdigit()):
            emp_obj = EmpresaTransporte.objects.filter(id_empresa=int(emp_val)).first()
        elif emp_val:
            emp_obj = EmpresaTransporte.objects.filter(nombre__iexact=str(emp_val).strip()).first()
            if not emp_obj:
                emp_obj = EmpresaTransporte.objects.filter(nombre__icontains=str(emp_val).strip()).first()
        pasaje.id_empresa = emp_obj
        campos_actualizados.append('id_empresa')

    if 'transporte' in data:
        t_val = str(data.get('transporte') or '').strip().upper()
        pasaje.transporte = 'T' if t_val in ('T', 'TERRESTRE') else 'A'
        campos_actualizados.append('transporte')

    if 'modo' in data:
        try:
            pasaje.modo = int(data.get('modo') or 1)
            campos_actualizados.append('modo')
        except (ValueError, TypeError):
            pass

    if 'lugar_origen' in data:
        pasaje.lugar_origen = str(data.get('lugar_origen') or '').strip().upper()
        campos_actualizados.append('lugar_origen')

    if 'lugar_destino' in data:
        pasaje.lugar_destino = str(data.get('lugar_destino') or '').strip().upper()
        campos_actualizados.append('lugar_destino')

    if 'concepto' in data:
        pasaje.concepto = str(data.get('concepto') or '').strip()
        campos_actualizados.append('concepto')

    if 'observacion' in data:
        pasaje.observacion = str(data.get('observacion') or '').strip()
        campos_actualizados.append('observacion')

    # Fechas y horas
    if 'fecha_salida' in data:
        fs = data.get('fecha_salida')
        if fs:
            try:
                from django.utils.dateparse import parse_date, parse_datetime
                dt = parse_datetime(fs) or parse_date(fs)
                if dt:
                    if not hasattr(dt, 'hour'):
                        dt = datetime.datetime.combine(dt, datetime.time(8, 0))
                    pasaje.fecha_salida = dt
                    campos_actualizados.append('fecha_salida')
            except Exception:
                pass
        else:
            pasaje.fecha_salida = None
            campos_actualizados.append('fecha_salida')

    if 'fecha_retorno' in data:
        fr = data.get('fecha_retorno')
        if fr:
            try:
                from django.utils.dateparse import parse_date, parse_datetime
                dt = parse_datetime(fr) or parse_date(fr)
                if dt:
                    if not hasattr(dt, 'hour'):
                        dt = datetime.datetime.combine(dt, datetime.time(18, 0))
                    pasaje.fecha_retorno = dt
                    campos_actualizados.append('fecha_retorno')
            except Exception:
                pass
        else:
            pasaje.fecha_retorno = None
            campos_actualizados.append('fecha_retorno')

    # Cálculos monetarios
    if 'tipo_moneda' in data:
        tm = str(data.get('tipo_moneda') or '').strip().upper()
        pasaje.tipo_moneda = 'D' if tm in ('D', 'USD', 'DOLARES', 'DÓLARES') else 'S'
        campos_actualizados.append('tipo_moneda')

    if 'tipo_cambio' in data:
        try:
            tc_val = float(data.get('tipo_cambio') or 0.0)
            if tc_val > 0:
                pasaje.tipo_cambio = tc_val
                campos_actualizados.append('tipo_cambio')
        except (ValueError, TypeError):
            pass

    tc = float(pasaje.tipo_cambio or 1.0)
    if tc <= 0:
        tc = 1.0

    if 'monto_dolares' in data and 'monto_soles' not in data:
        try:
            m_usd = float(data.get('monto_dolares') or 0.0)
            nuevo_usd = m_usd
            nuevo_pen = round(m_usd * tc, 2)
        except (ValueError, TypeError):
            nuevo_usd = float(pasaje.monto_dolares or 0.0)
            nuevo_pen = float(pasaje.monto_soles or 0.0)
    elif 'monto_soles' in data and 'monto_dolares' not in data:
        try:
            m_pen = float(data.get('monto_soles') or 0.0)
            nuevo_pen = m_pen
            nuevo_usd = round(m_pen / tc, 2)
        except (ValueError, TypeError):
            nuevo_usd = float(pasaje.monto_dolares or 0.0)
            nuevo_pen = float(pasaje.monto_soles or 0.0)
    elif 'tipo_cambio' in data and not ('monto_soles' in data or 'monto_dolares' in data):
        if pasaje.tipo_moneda == 'D':
            nuevo_usd = float(pasaje.monto_dolares or 0.0)
            nuevo_pen = round(nuevo_usd * tc, 2)
        else:
            nuevo_pen = float(pasaje.monto_soles or 0.0)
            nuevo_usd = round(nuevo_pen / tc, 2)
    else:
        nuevo_usd = None
        nuevo_pen = None

    if nuevo_usd is not None and pasaje.id_apertura_id:
        from .presupuesto_service import validar_monto_disponible
        valido, disponible, err_msg, _ = validar_monto_disponible(
            pasaje.id_apertura_id,
            tipo_gasto_id=pasaje.tipo_gasto_id or 4,
            nuevo_monto_dolares=nuevo_usd,
            exclude_id=pasaje.id_pasaje,
            exclude_tipo='pasaje'
        )
        if not valido:
            return Response({"error": err_msg, "disponible": disponible}, status=status.HTTP_400_BAD_REQUEST)

    if nuevo_usd is not None:
        pasaje.monto_dolares = nuevo_usd
        pasaje.monto_soles = nuevo_pen
        campos_actualizados.extend(['monto_dolares', 'monto_soles'])

    pasaje.save()

    return Response({
        "message": "Pasaje actualizado con éxito.",
        "campos": campos_actualizados,
        "data": SolicitudPasajesSerializer(pasaje).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enviar_solicitud_pasaje(request, id_pasaje):
    """
    Pasa la solicitud de pasajes al estado 'Enviado, Pendiente de Atencion' (id_estado = 1).
    """
    pasaje = get_object_or_404(SolicitudPasajes, id_pasaje=id_pasaje)
    from core.models import EstadoSolicitud
    try:
        estado_enviado = EstadoSolicitud.objects.get(id_estado=1)
        pasaje.id_estado = estado_enviado
        pasaje.save(update_fields=['id_estado'])
        return Response({
            "message": "Solicitud de pasaje enviada con éxito.",
            "estado": estado_enviado.nombre,
            "id_estado": 1,
            "data": SolicitudPasajesSerializer(pasaje).data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"No se pudo enviar la solicitud: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def revertir_solicitud_pasaje(request, id_pasaje):
    """
    Retorna la solicitud de pasaje al estado 'Pendiente de Envio' (id_estado = 0) para permitir edición.
    """
    pasaje = get_object_or_404(SolicitudPasajes, id_pasaje=id_pasaje)
    from core.models import EstadoSolicitud
    try:
        estado_pendiente = EstadoSolicitud.objects.get(id_estado=0)
        pasaje.id_estado = estado_pendiente
        pasaje.save(update_fields=['id_estado'])
        return Response({
            "message": "Solicitud de pasaje retornada a PENDIENTE DE ENVÍO para edición.",
            "estado": estado_pendiente.nombre,
            "id_estado": 0,
            "data": SolicitudPasajesSerializer(pasaje).data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"No se pudo revertir el estado: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def atender_solicitud_pasaje(request, id_pasaje):
    """
    Pasa el pasaje a estado 'Atendido, Pendiente de Liquidacion' (id_estado = 2).
    """
    pasaje = get_object_or_404(SolicitudPasajes, id_pasaje=id_pasaje)
    from core.models import EstadoSolicitud
    try:
        estado_atendido = EstadoSolicitud.objects.get(id_estado=2)
        pasaje.id_estado = estado_atendido
        pasaje.save(update_fields=['id_estado'])
        return Response({
            "message": "Pasaje atendido con éxito.",
            "estado": estado_atendido.nombre,
            "id_estado": 2,
            "data": SolicitudPasajesSerializer(pasaje).data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"No se pudo cambiar el estado: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def anular_solicitud_pasaje(request, id_pasaje):
    """
    Anula la solicitud de pasajes (id_estado = 5).
    """
    pasaje = get_object_or_404(SolicitudPasajes, id_pasaje=id_pasaje)
    from core.models import EstadoSolicitud
    try:
        estado_anulado = EstadoSolicitud.objects.get(id_estado=5)
        pasaje.id_estado = estado_anulado
        pasaje.save(update_fields=['id_estado'])
        return Response({
            "message": "Solicitud de pasaje anulada con éxito.",
            "estado": estado_anulado.nombre,
            "id_estado": 5,
            "data": SolicitudPasajesSerializer(pasaje).data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"No se pudo anular la solicitud: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_solicitud_pasaje(request, id_pasaje):
    """
    Elimina permanentemente una solicitud de pasajes y sus pasajeros.
    """
    pasaje = get_object_or_404(SolicitudPasajes, id_pasaje=id_pasaje)
    id_apertura = pasaje.id_apertura_id
    pasaje.detalles.all().delete()
    pasaje.delete()
    return Response({
        "message": "Solicitud de pasaje eliminada con éxito.",
        "id_apertura": id_apertura
    }, status=status.HTTP_200_OK)


# --- Gestión de Pasajeros ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agregar_pasajero_pasaje(request, id_pasaje):
    """
    Agrega un pasajero a la SolicitudPasajes.
    """
    pasaje = get_object_or_404(SolicitudPasajes, id_pasaje=id_pasaje)
    data = request.data
    from users.models import Usuario

    id_usuario = data.get('id_usuario')
    usuario_obj = None
    if id_usuario:
        try:
            usuario_obj = Usuario.objects.get(id_usuario=id_usuario)
        except Usuario.DoesNotExist:
            pass

    dni_search = str(data.get('dni') or '').strip()
    if not usuario_obj and dni_search:
        usuario_obj = Usuario.objects.filter(dni=dni_search).first()

    nombre_especial = str(data.get('nombre_especial') or data.get('nombre') or '').strip()
    observacion = str(data.get('observacion') or '').strip()

    if not usuario_obj and not nombre_especial:
        return Response({"error": "Debe indicar un usuario o nombre de pasajero."}, status=status.HTTP_400_BAD_REQUEST)

    detalle = SolicitudPasajesDetalle.objects.create(
        id_registro=pasaje,
        id_usuario=usuario_obj,
        nombre_especial=nombre_especial if not usuario_obj else None,
        observacion=observacion
    )

    return Response({
        "message": "Pasajero agregado con éxito.",
        "data": SolicitudPasajesDetalleSerializer(detalle).data
    }, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'POST'])
@permission_classes([IsAuthenticated])
def editar_pasajero_pasaje(request, id_detalle):
    """
    Edita los datos de un pasajero existente.
    """
    detalle = get_object_or_404(SolicitudPasajesDetalle, id_detalle=id_detalle)
    data = request.data
    from users.models import Usuario

    if 'id_usuario' in data:
        id_u = data.get('id_usuario')
        if id_u:
            try:
                detalle.id_usuario = Usuario.objects.get(id_usuario=id_u)
            except Usuario.DoesNotExist:
                pass
        else:
            detalle.id_usuario = None

    if 'dni' in data and not detalle.id_usuario:
        dni_search = str(data.get('dni') or '').strip()
        if dni_search:
            u = Usuario.objects.filter(dni=dni_search).first()
            if u:
                detalle.id_usuario = u

    if 'nombre_especial' in data:
        detalle.nombre_especial = str(data.get('nombre_especial') or '').strip() or None
    elif 'nombre' in data and not detalle.id_usuario:
        detalle.nombre_especial = str(data.get('nombre') or '').strip() or None

    if 'observacion' in data:
        detalle.observacion = str(data.get('observacion') or '').strip()

    detalle.save()

    return Response({
        "message": "Pasajero actualizado con éxito.",
        "data": SolicitudPasajesDetalleSerializer(detalle).data
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_pasajero_pasaje(request, id_detalle):
    """
    Elimina un pasajero de la solicitud.
    """
    detalle = get_object_or_404(SolicitudPasajesDetalle, id_detalle=id_detalle)
    detalle.delete()
    return Response({"message": "Pasajero eliminado con éxito."}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_solicitud_pasaje(request):
    """
    Crea una nueva SolicitudPasajes desde el módulo de programación de compras.
    """
    data = request.data
    from cotizaciones_api.models import CotizacionApertura
    from core.models import EstadoSolicitud, TipoGasto
    from users.models import Area, Usuario
    from django.db.models import Max

    id_apertura = data.get('id_apertura')
    if not id_apertura:
        return Response({"error": "Debe especificar el id_apertura de la cotización."}, status=status.HTTP_400_BAD_REQUEST)

    apertura = get_object_or_404(CotizacionApertura, id_apertura=id_apertura)

    from core.id_generator import obtener_siguiente_id_registro
    nuevo_id_pasaje = obtener_siguiente_id_registro()

    estado_pendiente = EstadoSolicitud.objects.filter(id_estado=0).first()

    area_obj = None
    if data.get('id_area'):
        try:
            area_obj = Area.objects.filter(id_area=int(data.get('id_area'))).first()
        except (ValueError, TypeError):
            pass
    if not area_obj and apertura and apertura.id_registro:
        coti_area = getattr(apertura.id_registro, 'id_area', None)
        if isinstance(coti_area, Area):
            area_obj = coti_area
        elif coti_area:
            try:
                area_obj = Area.objects.filter(id_area=int(coti_area)).first()
            except (ValueError, TypeError):
                pass
    if not area_obj:
        area_obj = Area.objects.first()

    codigo = data.get('codigo')
    if not codigo and apertura and apertura.id_registro and hasattr(apertura.id_registro, 'codigo'):
        codigo = apertura.id_registro.codigo
    if not codigo:
        codigo = apertura.numero_orden or f"AP-{apertura.id_apertura}"

    solicitante_obj = None
    if data.get('id_solicitante'):
        solicitante_obj = Usuario.objects.filter(id_usuario=data.get('id_solicitante')).first()
    if not solicitante_obj:
        solicitante_obj = request.user

    tipo_gasto_id = data.get('tipo_gasto') or data.get('tipo_movimiento')
    tipo_gasto_obj = None
    if tipo_gasto_id:
        try:
            tipo_gasto_obj = TipoGasto.objects.filter(id_tipo_gasto=int(tipo_gasto_id)).first()
        except (ValueError, TypeError):
            pass
    if not tipo_gasto_obj:
        tipo_gasto_obj = TipoGasto.objects.filter(id_tipo_gasto=4).first()

    num_val = data.get('num')
    cog_val = data.get('cog')
    if not num_val:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COALESCE(MAX(num), 0) FROM solicitud_pasajes")
            row = cursor.fetchone()
            max_num = row[0] if row and row[0] else 0
            num_val = max_num + 1
    else:
        try:
            num_val = int(num_val)
        except (ValueError, TypeError):
            num_val = 1

    if not cog_val:
        cog_val = f"05{str(num_val).zfill(3)}"

    tipo_moneda = str(data.get('tipo_moneda') or 'D').upper()
    if tipo_moneda not in ('D', 'S'):
        tipo_moneda = 'D'

    try:
        tc = float(data.get('tipo_cambio') or 3.75)
    except (ValueError, TypeError):
        tc = 3.75

    monto_usd = float(data.get('monto_dolares') or 0.0)
    monto_pen = float(data.get('monto_soles') or 0.0)

    if tipo_moneda == 'D' and monto_usd > 0 and monto_pen == 0:
        monto_pen = round(monto_usd * tc, 2)
    elif tipo_moneda == 'S' and monto_pen > 0 and monto_usd == 0:
        monto_usd = round(monto_pen / tc, 2)

    # Validar disponibilidad presupuestal para pasajes
    if apertura:
        from .presupuesto_service import validar_monto_disponible
        valido, disponible, err_msg, _ = validar_monto_disponible(
            apertura.id_apertura,
            tipo_gasto_id=tipo_gasto_obj.id_tipo_gasto if tipo_gasto_obj else 4,
            nuevo_monto_dolares=monto_usd
        )
        if not valido:
            return Response({"error": err_msg, "disponible": disponible}, status=status.HTTP_400_BAD_REQUEST)

    from django.utils.dateparse import parse_date, parse_datetime
    fecha_salida = None
    if data.get('fecha_salida'):
        try:
            dt = parse_datetime(data.get('fecha_salida')) or parse_date(data.get('fecha_salida'))
            if dt and not hasattr(dt, 'hour'):
                dt = datetime.datetime.combine(dt, datetime.time(8, 0))
            fecha_salida = dt
        except Exception:
            pass

    fecha_retorno = None
    if data.get('fecha_retorno'):
        try:
            dt = parse_datetime(data.get('fecha_retorno')) or parse_date(data.get('fecha_retorno'))
            if dt and not hasattr(dt, 'hour'):
                dt = datetime.datetime.combine(dt, datetime.time(18, 0))
            fecha_retorno = dt
        except Exception:
            pass

    empresa_obj = None
    if data.get('id_empresa'):
        try:
            empresa_obj = EmpresaTransporte.objects.filter(id_empresa=int(data.get('id_empresa'))).first()
        except (ValueError, TypeError):
            pass
    if not empresa_obj and data.get('empresa'):
        empresa_obj = EmpresaTransporte.objects.filter(nombre__iexact=str(data.get('empresa')).strip()).first()
        if not empresa_obj:
            empresa_obj = EmpresaTransporte.objects.filter(nombre__icontains=str(data.get('empresa')).strip()).first()

    transporte_val = str(data.get('transporte') or 'A').upper()
    default_concepto = "Pasaje Aéreo" if transporte_val == 'A' else "Pasaje Terrestre"
    observacion_val = str(data.get('observacion') or '').strip()
    concepto_val = str(data.get('concepto') or '').strip()
    if not concepto_val or concepto_val in ('Pasaje Aereo / Terrestre', 'Pasaje Aereo/Terrestre', 'Pasaje', 'Pasaje Aéreo', 'Pasaje Terrestre'):
        concepto_val = f"{default_concepto} - {observacion_val}" if observacion_val else default_concepto
    elif observacion_val and observacion_val not in concepto_val and (concepto_val.startswith("Pasaje Aéreo") or concepto_val.startswith("Pasaje Terrestre") or concepto_val.startswith("Pasaje")):
        concepto_val = f"{concepto_val} - {observacion_val}"

    solicitud = SolicitudPasajes.objects.create(
        id_pasaje=nuevo_id_pasaje,
        id_apertura=apertura,
        nivel_grupo=1,
        cog=cog_val,
        num=num_val,
        fecha=timezone.now(),
        id_area=area_obj,
        codigo=codigo,
        id_solicitante=solicitante_obj,
        modo=int(data.get('modo') or 2),
        id_empresa=empresa_obj,
        tipo_moneda=tipo_moneda,
        monto_soles=monto_pen,
        tipo_cambio=tc,
        monto_dolares=monto_usd,
        concepto=concepto_val,
        observacion=observacion_val,
        transporte=transporte_val,
        id_estado=estado_pendiente,
        lugar_origen=str(data.get('lugar_origen') or 'LIMA').strip().upper(),
        lugar_destino=str(data.get('lugar_destino') or 'PROVINCIA').strip().upper(),
        fecha_salida=fecha_salida,
        fecha_retorno=fecha_retorno,
        tipo_gasto=tipo_gasto_obj,
        tipo_movimiento='02',
    )

    pasajeros = data.get('pasajeros') or []
    for p in pasajeros:
        id_u = p.get('id_usuario')
        u_obj = None
        if id_u:
            try:
                u_obj = Usuario.objects.filter(id_usuario=int(id_u)).first()
            except (ValueError, TypeError):
                pass
        if not u_obj and p.get('dni'):
            u_obj = Usuario.objects.filter(dni=str(p.get('dni')).strip()).first()

        nombre_esp = p.get('nombre_especial') or p.get('nombre') or p.get('nombre_completo')
        SolicitudPasajesDetalle.objects.create(
            id_registro=solicitud,
            id_usuario=u_obj,
            nombre_especial=nombre_esp if not u_obj else None,
            observacion=str(p.get('observacion') or '').strip()
        )

    return Response({
        "message": "Solicitud de Pasajes creada con éxito.",
        "id_pasaje": solicitud.id_pasaje,
        "data": SolicitudPasajesSerializer(solicitud).data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def duplicar_solicitud(request, tipo, id_registro):
    """
    Duplica una solicitud (compra, pasaje o caja chica), clonando partidas/pasajeros
    con un nuevo id_registro, fecha de hoy, y estado 0 (Borrador / Pendiente de Envío).
    """
    from core.id_generator import obtener_siguiente_id_registro
    from core.models import EstadoSolicitud
    estado_borrador = EstadoSolicitud.objects.filter(id_estado=0).first()

    tipo_str = str(tipo).lower().strip()
    if tipo_str in ['compra', 'orden_compra', 'orden', 'suministro', 'servicio']:
        original = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_registro)
        nuevo_id = obtener_siguiente_id_registro()

        solicitante_val = request.user if getattr(request.user, 'is_authenticated', False) and hasattr(request.user, 'id_usuario') else original.id_solicitante

        nueva = SolicitudOrdenCompra.objects.create(
            id_solicitud=nuevo_id,
            id_apertura=original.id_apertura,
            codigo=original.codigo,
            id_area=original.id_area,
            id_solicitante=solicitante_val,
            num=original.num,
            nivel_grupo=original.nivel_grupo,
            fecha=timezone.now(),
            fecha_orden=timezone.now(),
            concepto=f"{original.concepto} (Copia)" if original.concepto and "(Copia)" not in original.concepto else original.concepto,
            tipo=original.tipo,
            referencia=original.referencia,
            id_empresa=original.id_empresa,
            empresa=original.empresa,
            direccion=original.direccion,
            contacto=original.contacto,
            entrega_lugar=original.entrega_lugar,
            tiempo_entrega=original.tiempo_entrega,
            tipo_moneda=original.tipo_moneda,
            tipo_cambio=original.tipo_cambio,
            monto_soles=original.monto_soles,
            monto_dolares=original.monto_dolares,
            id_estado=estado_borrador,
            id_tipo_gasto=original.id_tipo_gasto,
            tipo_movimiento=original.tipo_movimiento,
            tipo_gasto=original.tipo_gasto,
            observacion=original.observacion,
        )

        from .models import SolicitudOrdenCompraDetalle
        detalles = SolicitudOrdenCompraDetalle.objects.filter(id_registro=original)
        for d in detalles:
            SolicitudOrdenCompraDetalle.objects.create(
                id_registro=nueva,
                codigo=d.codigo,
                descripcion=d.descripcion,
                cantidad=d.cantidad,
                valor=d.valor,
                total=d.total
            )

        actualizar_totales_solicitud(nueva)

        return Response({
            "message": "Solicitud de compra duplicada exitosamente.",
            "id_registro": nueva.id_solicitud,
            "data": SolicitudOrdenCompraSerializer(nueva).data
        }, status=status.HTTP_201_CREATED)

    elif tipo_str in ['pasaje', 'pasajes', 'aereo', 'terrestre']:
        original = get_object_or_404(SolicitudPasajes, id_pasaje=id_registro)
        nuevo_id = obtener_siguiente_id_registro()

        solicitante_val = request.user if getattr(request.user, 'is_authenticated', False) and hasattr(request.user, 'id_usuario') else original.id_solicitante

        nueva = SolicitudPasajes.objects.create(
            id_pasaje=nuevo_id,
            id_apertura=original.id_apertura,
            nivel_grupo=original.nivel_grupo,
            cog=original.cog,
            num=original.num,
            fecha=timezone.now(),
            id_area=original.id_area,
            codigo=original.codigo,
            id_solicitante=solicitante_val,
            modo=original.modo,
            id_empresa=original.id_empresa,
            tipo_moneda=original.tipo_moneda,
            monto_soles=original.monto_soles,
            tipo_cambio=original.tipo_cambio,
            monto_dolares=original.monto_dolares,
            concepto=f"{original.concepto} (Copia)" if original.concepto and "(Copia)" not in original.concepto else original.concepto,
            observacion=original.observacion,
            transporte=original.transporte,
            id_estado=estado_borrador,
            lugar_origen=original.lugar_origen,
            lugar_destino=original.lugar_destino,
            fecha_salida=original.fecha_salida,
            fecha_retorno=original.fecha_retorno,
            tipo_gasto=original.tipo_gasto,
            tipo_movimiento=original.tipo_movimiento,
        )

        from .models import SolicitudPasajesDetalle
        pasajeros = SolicitudPasajesDetalle.objects.filter(id_registro=original)
        for p in pasajeros:
            SolicitudPasajesDetalle.objects.create(
                id_registro=nueva,
                id_usuario=p.id_usuario,
                nombre_especial=p.nombre_especial,
                observacion=p.observacion
            )

        return Response({
            "message": "Solicitud de pasaje duplicada exitosamente.",
            "id_registro": nueva.id_pasaje,
            "data": SolicitudPasajesSerializer(nueva).data
        }, status=status.HTTP_201_CREATED)

    elif tipo_str in ['caja_chica', 'caja', 'cajachica']:
        from caja_chica_api.models import SolicitudCajaChica
        from caja_chica_api.serializers import SolicitudCajaChicaSerializer
        original = get_object_or_404(SolicitudCajaChica, id_registro=id_registro)
        nuevo_id = obtener_siguiente_id_registro()

        solicitante_val = request.user if getattr(request.user, 'is_authenticated', False) and hasattr(request.user, 'id_usuario') else original.id_solicitante

        nueva = SolicitudCajaChica.objects.create(
            id_registro=nuevo_id,
            id_apertura=original.id_apertura,
            codigo=original.codigo,
            fecha=timezone.now(),
            id_area=original.id_area,
            id_solicitante=solicitante_val,
            id_destinatario=original.id_destinatario,
            num=original.num,
            nivel_grupo=original.nivel_grupo,
            concepto=f"{original.concepto} (Copia)" if original.concepto and "(Copia)" not in original.concepto else original.concepto,
            observacion=original.observacion,
            tipo_moneda=original.tipo_moneda,
            tipo_cambio=original.tipo_cambio,
            monto_soles=original.monto_soles,
            monto_dolares=original.monto_dolares,
            id_estado=estado_borrador,
            tipo_gasto=original.tipo_gasto,
            tipo_movimiento=original.tipo_movimiento,
        )

        return Response({
            "message": "Solicitud de caja chica duplicada exitosamente.",
            "id_registro": nueva.id_registro,
            "data": SolicitudCajaChicaSerializer(nueva).data
        }, status=status.HTTP_201_CREATED)

    return Response({"error": f"Tipo de solicitud no válido: {tipo}"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def duplicar_solicitud_compra(request, id_solicitud):
    return duplicar_solicitud(request, tipo='compra', id_registro=id_solicitud)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def duplicar_solicitud_pasaje(request, id_pasaje):
    return duplicar_solicitud(request, tipo='pasaje', id_registro=id_pasaje)




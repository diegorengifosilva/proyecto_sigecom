from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Avg, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import SolicitudOrdenCompra, SolicitudPasajes
from .serializers import (
    SolicitudOrdenCompraSerializer,
    SolicitudPasajesSerializer
)
from cotizaciones_api.models import Cotizacion, CotizacionSuministro, CotizacionServicio
from cotizaciones_api.serializers import CotizacionSuministroSerializer, CotizacionServicioSerializer
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

    tabla = []
    for ap in aperturas_qs[:2000]:
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
            
        programado = float(ap.presupuesto or 0.00)
        ejecutado = float(ap.total_orden or 0.00)
        saldo = programado - ejecutado

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

    # --- 1. CONSULTA DE ÓRDENES DE COMPRA ---
    compras_qs = SolicitudOrdenCompra.objects.all().select_related('id_area', 'id_solicitante', 'id_estado')
    compras_qs = compras_qs.filter(fecha_orden__year=target_year)
    if target_month:
        compras_qs = compras_qs.filter(fecha_orden__month=target_month)
    compras_qs = compras_qs.order_by('-fecha_orden', '-id_solicitud')
    compras_data = SolicitudOrdenCompraSerializer(compras_qs[:1000], many=True).data

    # --- 2. CONSULTA DE PASAJES ---
    pasajes_qs = SolicitudPasajes.objects.all().select_related('id_area', 'id_solicitante', 'id_estado')
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
    filtradas por los estados de liquidación (2, 3, 4).
    """
    anno = request.GET.get('anno')
    mes = request.GET.get('mes')

    hoy = timezone.now()
    if not anno or not anno.isdigit():
        target_year = hoy.year
    else:
        target_year = int(anno)

    target_month = int(mes) if mes and mes.isdigit() else None

    # --- 1. CONSULTA DE ÓRDENES DE COMPRA (LIQUIDACIÓN: id_estado in [2, 3, 4]) ---
    compras_qs = SolicitudOrdenCompra.objects.all().select_related('id_area', 'id_solicitante', 'id_estado')
    compras_qs = compras_qs.filter(id_estado__in=[2, 3, 4])
    compras_qs = compras_qs.filter(fecha_orden__year=target_year)
    if target_month:
        compras_qs = compras_qs.filter(fecha_orden__month=target_month)
    compras_qs = compras_qs.order_by('-fecha_orden', '-id_solicitud')
    compras_data = SolicitudOrdenCompraSerializer(compras_qs[:1000], many=True).data

    # --- 2. CONSULTA DE PASAJES (LIQUIDACIÓN: id_estado in [2, 3, 4]) ---
    pasajes_qs = SolicitudPasajes.objects.all().select_related('id_area', 'id_solicitante', 'id_estado')
    pasajes_qs = pasajes_qs.filter(id_estado__in=[2, 3, 4])
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
    suministros y servicios asociados. Prioriza los detalles de la tabla 
    solicitud_orden_compra_detalle y cae en retrocompatibilidad con Cotizacion si no existen.
    """
    solicitud = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_solicitud)
    serializer = SolicitudOrdenCompraSerializer(solicitud)
    data = serializer.data
    
    suministros = []
    servicios = []
    
    # Intentar obtener de la nueva tabla de detalles primero
    detalles_qs = solicitud.detalles.all()
    if detalles_qs.exists():
        from .serializers import SolicitudOrdenCompraDetalleSerializer
        # Si la solicitud es tipo 'Servicio', mapeamos los detalles al formato de servicios para el frontend
        tipo_solicitud = (solicitud.tipo or "Suministro").strip().upper()
        if tipo_solicitud in ('S', 'SERVICIO'):
            for item in detalles_qs:
                servicios.append({
                    "id_servicio": item.id_detalle,
                    "codigo_item": item.codigo or "SERV",
                    "descripcion_item": item.descripcion or "SERVICIO GENERAL",
                    "horas": item.cantidad or 0,
                    "cantidad_hombres": 1,
                    "cotizado_hombre_dia": float(item.valor or 0.00),
                    "cotizado_total": float(item.total or 0.00)
                })
        else:
            suministros = SolicitudOrdenCompraDetalleSerializer(detalles_qs, many=True).data
    else:
        # Fallback a cotización original
        if solicitud.codigo:
            try:
                coti = Cotizacion.objects.filter(codigo=solicitud.codigo).first()
                if coti:
                    suministros_qs = CotizacionSuministro.objects.filter(id_registro=coti)
                    servicios_qs = CotizacionServicio.objects.filter(id_registro=coti)
                    
                    suministros = CotizacionSuministroSerializer(suministros_qs, many=True).data
                    servicios = CotizacionServicioSerializer(servicios_qs, many=True).data
            except Exception:
                pass
                
    data['suministros'] = suministros
    data['servicios'] = servicios
    return Response(data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def atender_solicitud_compra(request, id_solicitud):
    """
    Cambia el estado de una SolicitudOrdenCompra a 'Adjudicado' (ID 1),
    que representa que ha sido atendida.
    """
    solicitud = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_solicitud)
    from core.models import EstadoSolicitud
    try:
        estado_atendido = EstadoSolicitud.objects.get(id_estado=2)
        solicitud.id_estado = estado_atendido
        solicitud.save()
        return Response({"message": "Solicitud atendida con éxito.", "estado": "Atendido, Pendiente de Liquidacion"}, status=status.HTTP_200_OK)
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
            
    detalle.total = (detalle.cantidad or 0) * (detalle.valor or 0.00)
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
    solicitud.detalles.all().delete()
    solicitud.delete()
    return Response({"message": "Solicitud eliminada con éxito."}, status=status.HTTP_200_OK)

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
    usuario = request.user.usuario if hasattr(request.user, 'usuario') else request.user.username
    
    tabla = [
        {
            "id_registro": 1,
            "codigo": "PRG-26-0001",
            "referencia": "Adquisición de Equipos de Cómputo - Área TI",
            "empresa": "V&C IMPORT S.A.C.",
            "area": "TI",
            "tipo": "Equipos",
            "programado": 20000.00,
            "ejecutado": 15400.00,
            "saldo": 4600.00,
            "regus": usuario
        },
        {
            "id_registro": 2,
            "codigo": "PRG-26-0002",
            "referencia": "Suministros de Oficina Semestral",
            "empresa": "V&C SERVICIOS SRL",
            "area": "Administración",
            "tipo": "Suministros",
            "programado": 5000.00,
            "ejecutado": 3500.00,
            "saldo": 1500.00,
            "regus": usuario
        },
        {
            "id_registro": 3,
            "codigo": "PRG-26-0003",
            "referencia": "Renovación de Licencias de Software CAD",
            "empresa": "V&C IMPORT S.A.C.",
            "area": "Ingeniería",
            "tipo": "Licencias",
            "programado": 15000.00,
            "ejecutado": 12000.00,
            "saldo": 3000.00,
            "regus": usuario
        }
    ]
    
    dashboard = {
        "total": len(tabla),
        "montoTotalDolares": 40000.00,
        "montoTotalSoles": 30900.00,
        "esteMes": len(tabla),
        "promedioDolares": 13333.33,
        "promedioSoles": 10300.00
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
    combined_list.sort(key=lambda x: x.get('fecha') or '', reverse=True)

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
    Retorna la lista de liquidaciones de compras y estadísticas asociadas.
    """
    usuario = request.user.usuario if hasattr(request.user, 'usuario') else request.user.username
    
    tabla = [
        {
            "id_registro": 21,
            "nro_solicitud": "SOL-26-0112",
            "fecha": "2026-07-10",
            "codigo": "LQD-0001",
            "tipo": "Viáticos",
            "area": "Ventas",
            "nombre": "MARIA GOMEZ",
            "concepto": "Reembolso Viáticos Visita Planta Arequipa",
            "monto_usd": 0.00,
            "monto_pen": 1250.00,
            "regus": usuario
        },
        {
            "id_registro": 22,
            "nro_solicitud": "SOL-26-0113",
            "fecha": "2026-07-14",
            "codigo": "LQD-0002",
            "tipo": "Caja Chica",
            "area": "Administración",
            "nombre": "MARIO ESPINOZA",
            "concepto": "Gasto Caja Chica Oficina Principal",
            "monto_usd": 0.00,
            "monto_pen": 540.00,
            "regus": usuario
        },
        {
            "id_registro": 23,
            "nro_solicitud": "SOL-26-0114",
            "fecha": "2026-07-20",
            "codigo": "LQD-0003",
            "tipo": "Pasajes",
            "area": "Operaciones",
            "nombre": "LUCIA RAMIREZ",
            "concepto": "Liquidación de Pasajes Terrestres Técnicos",
            "monto_usd": 350.00,
            "monto_pen": 0.00,
            "regus": usuario
        }
    ]
    
    dashboard = {
        "total": len(tabla),
        "montoTotalDolares": 350.00,
        "montoTotalSoles": 1790.00,
        "esteMes": len(tabla),
        "promedioDolares": 350.00,
        "promedioSoles": 895.00
    }
    
    return Response({
        "tabla": tabla,
        "dashboard": dashboard
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalle_solicitud_compra(request, id_solicitud):
    """
    Retorna los detalles de una SolicitudOrdenCompra específica, junto con los 
    suministros y servicios asociados a su cotización (código).
    """
    solicitud = get_object_or_404(SolicitudOrdenCompra, id_solicitud=id_solicitud)
    serializer = SolicitudOrdenCompraSerializer(solicitud)
    data = serializer.data
    
    suministros = []
    servicios = []
    
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
    from core.models import Estado
    try:
        estado_adjudicado = Estado.objects.get(id_estado=1)
        solicitud.id_estado = estado_adjudicado
        solicitud.save()
        return Response({"message": "Solicitud atendida con éxito.", "estado": "Adjudicado"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"No se pudo cambiar el estado: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

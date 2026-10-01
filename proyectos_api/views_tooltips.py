"""
ViewSet para Tooltips Inteligentes con IA

Endpoint principal:
- GET /api/tooltips/kpi/{nombre_kpi}/ - Obtener tooltip de un KPI específico
- GET /api/tooltips/todos/ - Obtener todos los tooltips (cachear resultado)
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.cache import cache

from proyectos_api.core.tooltips_ia import (
    generar_tooltip_con_ia,
    generar_todos_tooltips,
    obtener_tooltip_kpi,
    KPIS_BASE
)


@api_view(['GET'])
@permission_classes([AllowAny])
def obtener_tooltip_view(request, nombre_kpi):
    """
    GET /api/tooltips/kpi/{nombre_kpi}/

    Obtiene el tooltip inteligente para un KPI específico.

    Query params opcionales:
    - valor: Valor actual del KPI (para análisis contextual)
    - contexto: Contexto adicional del proyecto
    - usar_cache: true/false (default: true)

    Ejemplo:
    GET /api/tooltips/kpi/CPI/?valor=0.85&contexto=Proyecto%20de%20construcción
    """
    try:
        # Obtener parámetros
        valor = request.GET.get('valor', None)
        if valor:
            try:
                valor = float(valor)
            except ValueError:
                return Response({
                    'success': False,
                    'error': 'El parámetro "valor" debe ser un número'
                }, status=status.HTTP_400_BAD_REQUEST)

        contexto = request.GET.get('contexto', None)
        usar_cache = request.GET.get('usar_cache', 'true').lower() == 'true'

        # Verificar que el KPI existe
        nombre_kpi_upper = nombre_kpi.upper()
        if nombre_kpi_upper not in KPIS_BASE:
            return Response({
                'success': False,
                'error': f'KPI "{nombre_kpi}" no encontrado',
                'kpis_disponibles': list(KPIS_BASE.keys())
            }, status=status.HTTP_404_NOT_FOUND)

        # Intentar obtener del cache (si usar_cache=true y no hay valor específico)
        cache_key = f'tooltip_{nombre_kpi_upper}'
        if usar_cache and valor is None and contexto is None:
            tooltip = cache.get(cache_key)
            if tooltip:
                return Response({
                    'success': True,
                    'kpi': nombre_kpi_upper,
                    'tooltip': tooltip,
                    'from_cache': True
                })

        # Generar tooltip con IA
        tooltip = generar_tooltip_con_ia(nombre_kpi, valor=valor, contexto=contexto)

        # Cachear resultado (solo si no tiene valor/contexto específico)
        if valor is None and contexto is None:
            cache.set(cache_key, tooltip, timeout=86400)  # 24 horas

        return Response({
            'success': True,
            'kpi': nombre_kpi_upper,
            'tooltip': tooltip,
            'from_cache': False
        })

    except Exception as e:
        import traceback
        traceback.print_exc()

        return Response({
            'success': False,
            'error': f'Error al generar tooltip: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def generar_todos_tooltips_view(request):
    """
    GET /api/tooltips/todos/

    Genera tooltips para TODOS los KPIs.

    Query params:
    - regenerar: true/false (default: false) - Forzar regeneración ignorando cache

    NOTA: Esta operación puede tardar varios minutos.
    Los resultados se cachean por 7 días.

    Ejemplo:
    GET /api/tooltips/todos/
    GET /api/tooltips/todos/?regenerar=true
    """
    try:
        regenerar = request.GET.get('regenerar', 'false').lower() == 'true'

        cache_key = 'tooltips_todos_kpis'

        # Verificar cache
        if not regenerar:
            tooltips = cache.get(cache_key)
            if tooltips:
                return Response({
                    'success': True,
                    'mensaje': 'Tooltips obtenidos del cache',
                    'total_kpis': len(tooltips),
                    'tooltips': tooltips,
                    'from_cache': True
                })

        # Generar todos los tooltips (puede tardar)
        tooltips = generar_todos_tooltips()

        # Cachear por 7 días
        cache.set(cache_key, tooltips, timeout=604800)

        return Response({
            'success': True,
            'mensaje': f'Tooltips generados para {len(tooltips)} KPIs',
            'total_kpis': len(tooltips),
            'tooltips': tooltips,
            'from_cache': False
        })

    except Exception as e:
        import traceback
        traceback.print_exc()

        return Response({
            'success': False,
            'error': f'Error al generar tooltips: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def listar_kpis_disponibles(request):
    """
    GET /api/tooltips/kpis/

    Lista todos los KPIs disponibles con su información básica.
    """
    kpis_info = []

    for nombre_kpi, info in KPIS_BASE.items():
        kpis_info.append({
            'codigo': nombre_kpi,
            'nombre': info['nombre'],
            'categoria': info.get('categoria', 'General'),
            'formula': info.get('formula', 'N/A'),
            'unidad': info.get('unidad', ''),
            'rango_bueno': info.get('rango_bueno', '')
        })

    return Response({
        'success': True,
        'total_kpis': len(kpis_info),
        'kpis': kpis_info
    })

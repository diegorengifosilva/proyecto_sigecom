# proyecto_cotizaciones/backend/urls.py

import os
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse, Http404
from cotizaciones_api.views_frontend import FrontendAppView
from integracion_api.views import commercial_sync_view

def serve_cliente_logo(request, path):
    from core.views import resolve_cliente_logo_path

    file_path = resolve_cliente_logo_path(path)
    if file_path:
        return FileResponse(open(file_path, "rb"), content_type="image/png")

    # Fallback a 00000.png si el logo específico no existe aún
    default_path = resolve_cliente_logo_path("00000.png")
    if default_path:
        return FileResponse(open(default_path, "rb"), content_type="image/png")

    raise Http404("Logo no encontrado")

urlpatterns = [
    # Servir imágenes de logos de clientes directamente desde c:\xampp\htdocs\sigecom\clientes\
    path('clientes/<path:path>', serve_cliente_logo, name='serve_cliente_logo'),

    # API de Usuarios e Identidad
    path('api/users/', include('users.urls')),
    
    # API para generales
    path('api/core/', include('core.urls')),
 
    # APIs de Negocio
    path('api/cotizaciones/', include('cotizaciones_api.urls')),
    path('api/compras/', include('compras_api.urls')),
    path('api/logistica/', include('logistica_api.urls')),
    path('api/dashboard/', include('dashboard_api.urls')),
    path('api/notificaciones/', include('notificaciones_api.urls')),
    path('api/caja_chica/', include('caja_chica_api.urls')),
    path('api/buzon/', include('buzon_api.urls')),
    path('api/hseq/', include('hseq_api.urls')),
    path('api/proyectos/', include('proyectos_api.urls')),
    path('api/proyectos-ev/', include('proyectos_api.urls')),
    path('api/rrhh/', include('rrhh_api.urls')),
    path('api/emergencias/', include('emergencias_api.urls')),
    path('api/salud-ocupacional/', include('salud_ocupacional_api.urls')),
    path('api/seguridad/', include('seguridad_api.urls')),
    path('api/integracion/', include('integracion_api.urls')),
    
    # Alias de compatibilidad directa con contratos HSEQ
    path('api/v1/occupational-health/', include('salud_ocupacional_api.urls')),
    path('api/v1/human-resources/', include('rrhh_api.urls')),
    path('api/human-resources/', include('rrhh_api.urls')),
    path('api/brigades/', include('emergencias_api.urls')),
    path('api/v1/emergency/', include('emergencias_api.urls')),
    path('api/v1/hr-sync/', include('integracion_api.urls_hr_sync')),
    path('api/v1/proyectos-ev/commercial-sync', commercial_sync_view),
    path('api/proyectos-ev/commercial-sync', commercial_sync_view),

    # Django admin
    path('admin/', admin.site.urls),

    # Catch-all para React SPA
    re_path(r'^.*$', FrontendAppView.as_view(), name='frontend'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

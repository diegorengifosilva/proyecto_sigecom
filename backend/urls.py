# proyecto_cotizaciones/backend/urls.py

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from cotizaciones_api.views_frontend import FrontendAppView

urlpatterns = [
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

    # Django admin
    path('admin/', admin.site.urls),

    # Catch-all para React SPA
    re_path(r'^.*$', FrontendAppView.as_view(), name='frontend'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
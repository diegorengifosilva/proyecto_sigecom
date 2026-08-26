from django.urls import path
from . import views

urlpatterns = [
    path('objetivos/', views.objetivos_anuales, name='objetivos_anuales'),
    path('logrado/', views.logrado_dashboard, name='logrado_dashboard'),
    path('kpis/', views.kpis_dashboard, name='kpis_dashboard'),
    path('tendencias/', views.tendencias_dashboard, name='tendencias_dashboard'),
    path('analisis/', views.cotizaciones_analisis_view, name='cotizaciones-analisis'),
    path('exportar/mensual/', views.exportar_mensual, name='exportar_mensual'),
    path('exportar/anual/', views.exportar_anual, name='exportar_anual'),
    path('resumen_comercial/', views.resumen_comercial_dashboard, name='resumen_comercial_dashboard'),
]

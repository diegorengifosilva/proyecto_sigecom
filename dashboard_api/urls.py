from django.urls import path
from . import views

urlpatterns = [
    path('objetivos/', views.objetivos_anuales, name='objetivos_anuales'),
    path('logrado/', views.logrado_dashboard, name='logrado_dashboard'),
    path('kpis/', views.kpis_dashboard, name='kpis_dashboard'),
    path('tendencias/', views.tendencias_dashboard, name='tendencias_dashboard'),
    path('analisis/', views.cotizaciones_analisis_view, name='cotizaciones-analisis'),
]

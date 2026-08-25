from django.urls import path
from . import views

urlpatterns = [
    path('sugerencias/', views.sugerencia_queja_list, name='sugerencia_queja_list'),
    path('sugerencias/<int:pk>/', views.sugerencia_queja_detail, name='sugerencia_queja_detail'),
    path('sugerencias/<int:pk>/trazabilidad/', views.sugerencia_trazabilidad, name='sugerencia_trazabilidad'),
    path('sugerencias/<int:pk>/adjuntos/', views.sugerencia_adjuntos, name='sugerencia_adjuntos'),
    path('adjuntos/<int:pk>/', views.sugerencia_adjunto_detail, name='sugerencia_adjunto_detail'),
    path('adjuntos/<int:pk>/descargar/', views.descargar_adjunto, name='descargar_adjunto'),
    path('sugerencias/<int:pk>/reporte/', views.sugerencia_reporte_html, name='sugerencia_reporte_html'),
    path('gerencias/', views.lista_gerencias, name='lista_gerencias'),
]

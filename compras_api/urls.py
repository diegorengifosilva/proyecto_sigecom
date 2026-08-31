from django.urls import path
from . import views

urlpatterns = [
    path('lista_programacion/', views.lista_programacion, name='lista_programacion'),
    path('lista_atencion/', views.lista_atencion, name='lista_atencion'),
    path('lista_liquidaciones/', views.lista_liquidaciones, name='lista_liquidaciones'),
    path('atencion/<int:id_solicitud>/', views.detalle_solicitud_compra, name='detalle_solicitud_compra'),
    path('atencion/<int:id_solicitud>/atender/', views.atender_solicitud_compra, name='atender_solicitud_compra'),
    path('atencion/<int:id_solicitud>/detalles/agregar/', views.agregar_detalle_compra, name='agregar_detalle_compra'),
    path('detalles/<int:id_detalle>/editar/', views.editar_detalle_compra, name='editar_detalle_compra'),
    path('detalles/<int:id_detalle>/eliminar/', views.eliminar_detalle_compra, name='eliminar_detalle_compra'),
    path('atencion/<int:id_solicitud>/anular/', views.anular_solicitud_compra, name='anular_solicitud_compra'),
    path('atencion/<int:id_solicitud>/eliminar/', views.eliminar_solicitud_compra, name='eliminar_solicitud_compra'),
]

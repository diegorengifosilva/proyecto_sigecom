from django.urls import path
from . import views

urlpatterns = [
    path('lista_programacion/', views.lista_programacion, name='lista_programacion'),
    path('lista_atencion/', views.lista_atencion, name='lista_atencion'),
    path('lista_liquidaciones/', views.lista_liquidaciones, name='lista_liquidaciones'),
    path('atencion/<int:id_solicitud>/', views.detalle_solicitud_compra, name='detalle_solicitud_compra'),
    path('atencion/<int:id_solicitud>/editar/', views.editar_solicitud_compra, name='editar_solicitud_compra'),
    path('atencion/<int:id_solicitud>/enviar/', views.enviar_solicitud_compra, name='enviar_solicitud_compra'),
    path('atencion/<int:id_solicitud>/revertir/', views.revertir_solicitud_compra, name='revertir_solicitud_compra'),
    path('atencion/<int:id_solicitud>/atender/', views.atender_solicitud_compra, name='atender_solicitud_compra'),
    path('atencion/<int:id_solicitud>/detalles/agregar/', views.agregar_detalle_compra, name='agregar_detalle_compra'),
    path('detalles/<int:id_detalle>/editar/', views.editar_detalle_compra, name='editar_detalle_compra'),
    path('detalles/<int:id_detalle>/eliminar/', views.eliminar_detalle_compra, name='eliminar_detalle_compra'),
    path('atencion/<int:id_solicitud>/anular/', views.anular_solicitud_compra, name='anular_solicitud_compra'),
    path('atencion/<int:id_solicitud>/eliminar/', views.eliminar_solicitud_compra, name='eliminar_solicitud_compra'),
    path('atencion/<int:id_solicitud>/duplicar/', views.duplicar_solicitud_compra, name='duplicar_solicitud_compra'),
    path('crear_solicitud/', views.crear_solicitud_compra, name='crear_solicitud_compra'),

    # Rutas para Pasajes
    path('pasajes/<int:id_pasaje>/', views.detalle_solicitud_pasaje, name='detalle_solicitud_pasaje'),
    path('pasajes/<int:id_pasaje>/editar/', views.editar_solicitud_pasaje, name='editar_solicitud_pasaje'),
    path('pasajes/<int:id_pasaje>/enviar/', views.enviar_solicitud_pasaje, name='enviar_solicitud_pasaje'),
    path('pasajes/<int:id_pasaje>/revertir/', views.revertir_solicitud_pasaje, name='revertir_solicitud_pasaje'),
    path('pasajes/<int:id_pasaje>/atender/', views.atender_solicitud_pasaje, name='atender_solicitud_pasaje'),
    path('pasajes/<int:id_pasaje>/anular/', views.anular_solicitud_pasaje, name='anular_solicitud_pasaje'),
    path('pasajes/<int:id_pasaje>/eliminar/', views.eliminar_solicitud_pasaje, name='eliminar_solicitud_pasaje'),
    path('pasajes/<int:id_pasaje>/duplicar/', views.duplicar_solicitud_pasaje, name='duplicar_solicitud_pasaje'),
    path('pasajes/<int:id_pasaje>/pasajeros/agregar/', views.agregar_pasajero_pasaje, name='agregar_pasajero_pasaje'),
    path('pasajes/pasajeros/<int:id_detalle>/editar/', views.editar_pasajero_pasaje, name='editar_pasajero_pasaje'),
    path('pasajes/pasajeros/<int:id_detalle>/eliminar/', views.eliminar_pasajero_pasaje, name='eliminar_pasajero_pasaje'),
    path('pasajes/crear/', views.crear_solicitud_pasaje, name='crear_solicitud_pasaje'),

    # Ruta genérica de duplicación para compra, pasaje o caja chica
    path('solicitudes/<str:tipo>/<int:id_registro>/duplicar/', views.duplicar_solicitud, name='duplicar_solicitud'),
]

# proyecto_cotizaciones/cotizaciones_api/urls.py

from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from cotizaciones_api.views_frontend import FrontendAppView

# Registramos ViewSets en el router
router = DefaultRouter()
# router.register(r'cotizaciones', views.CotizacionViewSet, basename='cotizaciones')
# router.register(r'aprobaciones', views.AprobacionCotizacionViewSet, basename='aprobaciones')

urlpatterns = [
    # CSRF
    path('csrf/', views.get_csrf_token, name='get_csrf_token'),

    # COTIZACIONES
    path('lista_cotizaciones/', views.lista_cotizaciones, name="lista_cotizaciones"),
    path('lista_aperturas/', views.lista_aperturas, name='lista_aperturas'),
    path('apertura_detalle/<int:id_apertura>/', views.apertura_detalle, name='apertura_detalle'),
    path('apertura_detalle/<int:id_apertura>/subir_oc/', views.subir_oc_apertura, name='subir_oc_apertura'),
    path('ocfiles/ver/<int:id_apertura>/', views.ver_oc_pdf, name='ver_oc_pdf'),
    path('aperturas_por_registro/<int:id_registro>/', views.aperturas_por_registro, name='aperturas_por_registro'),
    path('aperturas_por_registro/<int:id_registro>/nueva_oc/', views.crear_nueva_oc, name='crear_nueva_oc'),
    path('cotizacion_detalle/<int:id_registro>/', views.cotizacion_detalle, name='cotizacion_detalle'),
    path('ultima_cotizacion_cliente/<int:id_cliente>/', views.ultima_cotizacion_cliente, name='ultima_cotizacion_cliente'),
    path('tiempos-frecuentes/', views.tiempos_frecuentes, name='tiempos_frecuentes'),
    path('periodos/', views.periodos_registrados, name='periodos_registrados'),
    path('lista_suministros/<int:id_registro>/', views.listar_suministros, name='listar_suministros'),
    path("lista_servicios/<int:id_registro>/", views.listar_servicios, name="listar_servicios"),
    path('adjuntos/<int:id_registro>/', views.gestionar_adjuntos, name='gestionar_adjuntos'),
    path('mensajes/<int:id_registro>/', views.gestionar_mensajes, name='gestionar_mensajes'),
    path("seguimientos/<int:id_registro>/", views.listar_seguimientos, name="listar_seguimiento"),


    path("<int:num_reg>/totales-descuento/", views.totales_descuento_view, name="totales_descuento"),
    path("<int:num_reg>/recalcular-totales/", views.recalcular_totales_cotizacion, name="recalcular_totales_cotizacion"),

    # OPORTUNIDADES
    path('lista_oportunidades/', views.lista_oportunidades, name='lista_oportunidades'),
    #path('cotizaciones/oportunidades', views.oportunidades_dashboard_view, name="oportunidades_dashboard_view"),
    #path('oportunidades/modal/<str:num_reg>/', views.oportunidad_detalle_view, name='oportunidad_detalle_view'),
    
    

    # BUSQUEDA
    path('core/clientes/<str:empresa>/encargados/', views.buscar_encargados_por_empresa, name='buscar_encargados_por_empresa'),

    # GESTION
    #path("cotizaciones/<str:num_reg>/condiciones-generales/", views.condiciones_generales, name="condiciones_generales"),
    path("condiciones-generales/<int:id_registro>/", views.condiciones_generales, name="condiciones_generales"),
    #path("cotizaciones/<str:numero>/generar-codigo/", views.generar_codigo_view, name="generar_codigo"),
    #path("cotizaciones/generar_codigo/<str:num_reg>/", views.generar_codigo_cotizacion, name="generar_codigo_cotizacion"),
    path("generar-codigo/<int:id_registro>/", views.generar_codigo_cotizacion, name="generar_codigo_cotizacion"),
    path("nueva-version/<int:id_registro>/", views.crear_nueva_version_cotizacion, name="nueva-version"),
    path("<str:num_reg>/asignar-regus/", views.asignar_regus, name="asignar_regus"),
    path("<int:id_registro>/generar-copia/", views.generar_copiar_cotizacion, name="generar_copiar_cotizacion"),
    path("eliminar/<int:id_registro>/", views.eliminar_cotizacion, name="eliminar_cotizacion"),
    #path("cotizaciones/<int:num_reg>/enviar-aprobacion/", views.enviar_cotizacion_aprobacion, name="enviar_cotizacion_aprobacion"),
    path("enviar-aprobacion/<int:id_registro>/", views.enviar_cotizacion_aprobacion, name="enviar_cotizacion_aprobacion"),
    path("<int:num_reg>/cambiar-estado/", views.cambiar_estado_cotizacion, name="cambiar_estado_cotizacion"),
    path("<int:id_registro>/pasar-a-cotizacion/", views.pasar_a_cotizacion, name="pasar_a_cotizacion"),
    path("<int:id_registro>/pasar-a-apertura/", views.pasar_a_apertura, name="pasar_a_apertura"),
    path("<int:id_registro>/toggle-fijar/", views.toggle_fijar_cotizacion, name="toggle_fijar_cotizacion"),
    path("<int:num_reg>/retornar/", views.retornar_cotizacion, name="retornar_cotizacion"),
    path("<str:num_reg>/pdf-context/", views.cotizacion_pdf_context, name="cotizacion_pdf_context"),
    path("<str:num_reg>/pdf-preview/", views.cotizacion_pdf_preview, name="cotizacion_pdf_preview"),
    path("<str:num_reg>/pdf/", views.cotizacion_pdf, name="cotizacion_pdf",),
    path('<str:num_reg>/reporte-html/', views.cotizacion_reporte_html, name='cotizacion_reporte_html'),
    path('cotizacion/word/<str:num_reg>/', views.descargar_cotizacion_word, name='descargar_cotizacion_word'),
    path("<str:num_reg>/descuento/", views.descuento_cotizacion, name="obtener_descuento_cotizacion"),

    # OBJETIVOS


    # (Las rutas de notificaciones se trasladaron a su propio módulo api/notificaciones/)

    # DB_VC
    path("alm-articulos/", views.lista_alm_articulos, name="lista_alm_articulos"),
    
    # GUARDAR COTIZACIÓN
    path("guardar/", views.guardar_cotizacion, name="guardar_cotizacion"),
    path("tipo-cambio-sunat/", views.get_tipo_cambio_sunat, name="tipo_cambio_sunat"),

    # REPORTES
    path("reportes/reporte_cotizaciones_dashboard_html/", views.reporte_cotizaciones_dashboard_html, name="reporte_cotizaciones_dashboard_html"),
    path('reporte-suministros-html/<str:id_registro>/', views.reporte_suministros_html, name='reporte_suministros_html'),
    path('reporte-servicios-html/<str:id_registro>/', views.reporte_servicios_html, name='reporte_servicios_html'),
    path("reporte-detallado/<str:id_registro>/", views.reporte_detallado_cotizacion, name="reporte_detallado_cotizacion"),
    path("reporte-resumen/<str:id_registro>/", views.reporte_resumen_cotizacion, name="reporte_resumen_cotizacion"),
    path("reportes/reporte_venta_total/<str:num_reg>/", views.reporte_venta_total_html, name="reporte_venta_total_html"),
    path("reportes/reporte_venta_parcial/<str:num_reg>/", views.reporte_venta_parcial_html, name="reporte_venta_parcial_html"),

    # SEGUIMIENTO DE COTIZACIONES
    # path("dashboard/seguimiento-cotizaciones/", views.lista_seguimiento_cotizaciones, name="lista_seguimiento_cotizaciones"),

    # Todas las rutas de ViewSets bajo /api/
    path('', include(router.urls)),

]

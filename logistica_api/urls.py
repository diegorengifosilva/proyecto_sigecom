from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()

urlpatterns = [
    # DASHBOARD LOGÍSTICA
    path('dashboard/', views.logistica_dashboard_view, name="logistica_dashboard_view"),
    path('dashboard/almacenes/', views.lista_almacenes_new, name="lista_almacenes_new"),
    path('almacenes/', views.crear_almacen_new, name="crear_almacen_new"),
    path('almacenes/<int:idalmacen>/', views.actualizar_almacen_new, name="actualizar_almacen_new"),
    path('almacenes/<int:idalmacen>/eliminar/', views.eliminar_almacen_new, name="eliminar_almacen_new"),
    
    # GRUPOS ANALÍTICOS (tabla grupo)
    path('grupos-analiticos/', views.lista_grupos, name="lista_grupos"),
    path('grupos-analiticos/crear/', views.lista_grupos, name="crear_grupo"),
    path('grupos-analiticos/<int:idgrupo>/', views.actualizar_grupo, name="actualizar_grupo"),
    path('grupos-analiticos/<int:idgrupo>/eliminar/', views.eliminar_grupo, name="eliminar_grupo"),
    
    # ARTÍCULOS / PRODUCTOS (tabla sis_alm_tab_articulos)
    path('articulos/', views.lista_articulos, name="lista_articulos"),
    path('articulos/crear/', views.crear_articulo, name="crear_articulo"),
    path('articulos/<int:reg>/', views.actualizar_articulo, name="actualizar_articulo"),
    path('articulos/<int:reg>/eliminar/', views.eliminar_articulo, name="eliminar_articulo"),
    
    # CENTROS DE COSTO (tabla costo_almacen)
    path('centros-costo/', views.lista_costos_almacen_new, name="lista_costos_almacen_new"),
    path('centros-costo/crear/', views.lista_costos_almacen_new, name="crear_costo_almacen"),
    path('centros-costo/<int:idcosto_almacen>/', views.actualizar_costo_almacen_new, name="actualizar_costo_almacen_new"),
    path('centros-costo/<int:idcosto_almacen>/eliminar/', views.eliminar_costo_almacen_new, name="eliminar_costo_almacen_new"),
    
    # DOCUMENTOS ALMACÉN (tabla documento_almacen)
    path('documentos/', views.lista_documentos_almacen_new, name="lista_documentos_almacen_new"),
    path('documentos/crear/', views.lista_documentos_almacen_new, name="crear_documento_almacen"),
    path('documentos/<int:iddocumento_almacen>/', views.actualizar_documento_almacen_new, name="actualizar_documento_almacen_new"),
    path('documentos/<int:iddocumento_almacen>/eliminar/', views.eliminar_documento_almacen_new, name="eliminar_documento_almacen_new"),
    
    path('usuarios/', views.buscar_usuarios_logistica, name="buscar_usuarios_logistica"),
    path('tipo-cambio/', views.logistica_tipo_cambio_view, name="logistica_tipo_cambio"),
    path('dashboard/modal/<str:num_reg>/', views.logistica_modal_view, name="logistica_modal_view"),
    
    # KARDEX Y REPORTES LOGÍSTICA
    path('kardex_base/', views.logistica_kardex_base_view, name='logistica_kardex_base_view'),
    path('kardex-base/', views.logistica_kardex_base_view, name='kardex_base_data'),
    path('cotizaciones/reportes/reporte_kardex_pdf/', views.reporte_kardex_pdf, name='reporte_kardex_pdf'),
    path('cotizaciones/reportes/reporte_almacen_dashboard_html/', views.reporte_almacen_dashboard_html, name='reporte_almacen_dashboard_html'),
    path('cotizaciones/reportes/reporte_almacen_salidas_dashboard_html/', views.reporte_almacen_salidas_dashboard_html, name='reporte_almacen_salidas_dashboard_html'),
    
    # PRODUCTOS Y CATÁLOGOS LOGÍSTICA
    path('dashboard/productos/', views.logistica_productos_view, name="logistica_productos"),
    path('dashboard/umed/', views.logistica_umed_view, name="logistica_umed"),
    path('stock/', views.logistica_stock_view, name="logistica_stock"),
    path('movimiento/', views.logistica_movimiento, name='logistica_movimiento'),
    path('movimiento/<int:num_reg>/', views.logistica_movimiento_update, name='logistica_movimiento_update'),
    path('movimiento/<int:num_reg>/anular/', views.logistica_movimiento_anular, name='logistica_movimiento_anular'),
    path('dashboard/ordenes-oc/', views.buscar_ordenes_oc, name='buscar_ordenes_oc'),
    path('dashboard/ordenes-oc/<int:reg>/items/', views.detalle_orden_compra, name='detalle_orden_compra'),
    
    # EXPORTACIÓN
    path('exportar_excel_entradas/', views.exportar_excel_entradas),
    path('exportar_excel_almacen/', views.exportar_excel_almacen),

    # ViewSets (si los hubiera)
    path('', include(router.urls)),
]
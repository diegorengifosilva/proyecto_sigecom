from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()

urlpatterns = [
    # DASHBOARD LOGÍSTICA
    path('logistica/dashboard/', views.logistica_dashboard_view, name="logistica_dashboard_view"),
    path('logistica/dashboard/modal/<str:num_reg>/', views.logistica_modal_view, name="logistica_modal_view"),
    
    # KARDEX Y REPORTES LOGÍSTICA
    path('logistica/kardex_base/', views.logistica_kardex_base_view, name='logistica_kardex_base_view'),
    path('logistica/kardex-base/', views.logistica_kardex_base_view, name='kardex_base_data'),
    path('cotizaciones/reportes/reporte_kardex_pdf/', views.reporte_kardex_pdf, name='reporte_kardex_pdf'),
    path('cotizaciones/reportes/reporte_almacen_dashboard_html/', views.reporte_almacen_dashboard_html, name='reporte_almacen_dashboard_html'),
    path('cotizaciones/reportes/reporte_almacen_salidas_dashboard_html/', views.reporte_almacen_salidas_dashboard_html, name='reporte_almacen_salidas_dashboard_html'),
    
    # PRODUCTOS Y CATÁLOGOS LOGÍSTICA
    path('logistica/dashboard/productos/', views.logistica_productos_view, name="logistica_productos"),
    path('logistica/dashboard/umed/', views.logistica_umed_view, name="logistica_umed"),
    path('logistica/movimiento/', views.logistica_movimiento, name='logistica_movimiento'),
    path('logistica/dashboard/ordenes-oc/', views.buscar_ordenes_oc, name='buscar_ordenes_oc'),
    path('logistica/dashboard/ordenes-oc/<int:reg>/items/', views.detalle_orden_compra, name='detalle_orden_compra'),
    
    # EXPORTACIÓN
    path('exportar_excel_entradas/', views.exportar_excel_entradas),
    path('exportar_excel_almacen/', views.exportar_excel_almacen),

    # ViewSets (si los hubiera)
    path('', include(router.urls)),
]

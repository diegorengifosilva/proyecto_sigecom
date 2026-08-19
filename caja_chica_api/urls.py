# SIGECOM_5/caja_chica_api/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import (
    get_csrf_token,
    guardar_documento,
    guardar_solicitud,
    aprobar_solicitud_view,
    set_monto_diario_view,
    exportar_reporte_excel,
    arqueos_view,
    solicitudes_dashboard_view,
    solicitudes_pendientes_view,
    detalle_liquidacion_view,
    presentar_liquidacion,    
    solicitudes_pendientes_aprobacion_view,
    listar_documentos_solicitud,
    login_usuario,
    usuario_actual,
    SolicitudGastoHistorialViewSet,
    SolicitudGastoViewSetCRUD,
    CajaDiariaView,
    HistorialCajaDiariaView, 
    SolicitudesAprobadasView,
    ArqueoCajaViewSet,
    SolicitudList,
    NotificacionListView,
    EstadoCajaViewSet,
    GuiaSalidaViewSet,
    ActividadListView,
    SolicitudDetailView
)
from caja_chica_api.views_debug import tesseract_debug

# Registramos ViewSets en el router
router = DefaultRouter()
router.register(r'solicitudes', SolicitudGastoViewSetCRUD, basename="solicitud")
router.register(r'arqueos', ArqueoCajaViewSet, basename="arqueo")
router.register(r'estado_caja', EstadoCajaViewSet, basename="estado_caja")
router.register(r'guias', GuiaSalidaViewSet, basename="guia")

urlpatterns = [
    path('csrf/', get_csrf_token, name='get_csrf_token'),

    # LOGIN Y USUARIO (Compatibilidad)
    path("login/", login_usuario, name="login_usuario"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("usuario_actual/", usuario_actual, name="usuario_actual"),
    path('usuarios/actual/', usuario_actual, name='usuario-actual'),
    path('home-stats/', views.caja_chica_home_stats, name='caja_chica_home_stats'),

    # SOLICITUD DE GASTO
    path('solicitudes/dashboard/', solicitudes_dashboard_view, name='solicitudes-dashboard'),
    path('solicitudes/guardar-solicitud/', guardar_solicitud, name='guardar_solicitud'),
    path('mis_solicitudes/', views.mis_solicitudes, name='mis_solicitudes'),
    path('mis_solicitudes/<int:solicitud_id>/', views.detalle_solicitud, name='detalle_solicitud'),
    path('mis_solicitudes/<int:solicitud_id>/estado/', views.actualizar_estado_solicitud, name='actualizar_estado_solicitud'),
    path('mis_solicitudes/<int:pk>/historial_estados/', SolicitudGastoHistorialViewSet.as_view({'get': 'historial_estados'}), name='solicitud-historial'),

    # ATENCIÓN DE SOLICITUDES
    path('solicitudes/pendientes/', solicitudes_pendientes_view, name='solicitudes_pendientes'),
    path('solicitudes/<int:pk>/', SolicitudDetailView.as_view(), name='solicitud_detalle'),

    # LIQUIDACIONES
    path('liquidaciones_pendientes/', views.liquidaciones_pendientes, name='liquidaciones_pendientes'),
    path('documentos/procesar/', views.procesar_documento, name='procesar_documento'),
    path('documentos/test-ocr/', views.test_ocr, name='test_ocr'),
    path('documentos/guardar/', views.guardar_documento, name='guardar_documento'),
    path('documentos/solicitud/<int:solicitud_id>/', views.obtener_documentos_por_solicitud, name='obtener_documentos_por_solicitud'),
    path('liquidaciones/presentar/', views.presentar_liquidacion, name='presentar_liquidacion'),
    path('listar_documentos/<int:solicitud_id>/', views.listar_documentos_solicitud, name='listar_documentos'),

    # APROBACIÓN DE LIQUIDACIÓN
    path('solicitudes_pendientes_aprobacion/', views.solicitudes_pendientes_aprobacion_view, name='solicitudes_pendientes_aprobacion'),
    path('liquidaciones/<int:liquidacion_id>/detalle/', detalle_liquidacion_view, name='detalle-liquidacion'),
    path("liquidaciones/<int:liquidacion_id>/accion/", views.actualizar_estado_liquidacion, name="actualizar_estado_liquidacion"),
    
    # CAJA CHICA
    path('caja_diaria/', CajaDiariaView.as_view(), name='caja_diaria'),

    # DECISION
    path('solicitudes/<int:pk>/decision/', views.solicitud_decision_view, name='solicitud-decision'),

    # DEBUG Y EXTRAS
    path('debug/tesseract/', tesseract_debug),
    path('solicitudes/aprobar/<int:solicitud_id>/', aprobar_solicitud_view, name='aprobar-solicitud'),
    path('caja/monto-diario/', set_monto_diario_view, name='set-monto-diario'),
    path('caja_diaria/historial/', HistorialCajaDiariaView.as_view(), name='historial-caja-diaria'),
    path('solicitudes/aprobadas/', SolicitudesAprobadasView.as_view(), name='solicitudes-aprobadas'),
    path('solicitudes/exportar_excel/', exportar_reporte_excel, name='exportar_reporte_excel'),
    path('arqueos/', arqueos_view, name='arqueos'),
    path('solicitudes/lista/', SolicitudList.as_view(), name='solicitud-lista'),
    path('notificaciones/', NotificacionListView.as_view(), name='notificaciones-list'),
    path('liquidaciones-aprobacion/', views.liquidaciones_aprobacion, name='liquidaciones_aprobacion'),
    path('liquidaciones/<int:pk>/accion/', views.liquidacion_accion, name='liquidacion_accion'),
    path('registro_actividades/', ActividadListView.as_view(), name='registro_actividades'),
    path('reportes/exportar_excel/', views.exportar_reportes_excel, name='exportar_reportes_excel'),
    path('reportes/exportar_pdf/', views.exportar_reportes_pdf, name='exportar_reportes_pdf'),

    # Todas las rutas de ViewSets bajo /api/caja_chica/
    path('', include(router.urls)),
]

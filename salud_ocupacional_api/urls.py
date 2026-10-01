from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OccupationalHealthSummaryView, EmoExpedienteViewSet, register_aptitude,
    occupational_employees, EmoDocumentoMedicoViewSet, drive_sync_runs,
    drive_sync_files, compat_collection
)

router = DefaultRouter()
router.register(r'cases', EmoExpedienteViewSet, basename='emo-cases')
router.register(r'documents', EmoDocumentoMedicoViewSet, basename='emo-documents')

urlpatterns = [
    # Resumen Médico / KPIs
    path('summary/', OccupationalHealthSummaryView.as_view(), name='emo-summary'),

    # Colaboradores y su estado EMO
    path('employees/', occupational_employees, name='emo-employees'),

    # Registro de aptitud médica en un expediente
    path('cases/<str:pk>/aptitude/', register_aptitude, name='emo-register-aptitude'),

    # Sincronización Drive
    path('drive-sync/runs/', drive_sync_runs, name='emo-drive-runs'),
    path('drive-sync/files/', drive_sync_files, name='emo-drive-files'),

    # Colecciones y catálogos (clínicas, protocolos, etc.)
    path('compat/<str:resource>/', compat_collection, name='emo-compat-collection'),

    # Router
    path('', include(router.urls)),
]

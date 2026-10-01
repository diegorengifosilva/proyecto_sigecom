from django.urls import path
from .views import (
    commercial_sync_view, hr_sync_employees_view, hr_sync_deactivate_view,
    integration_history, integration_incidencias
)

urlpatterns = [
    # Sincronización Comercial -> Proyectos
    path('commercial-sync/', commercial_sync_view, name='int-commercial-sync'),

    # Sincronización Personas -> RRHH
    path('hr-sync/employees/', hr_sync_employees_view, name='int-hr-sync-employees'),
    path('hr-sync/employees/deactivate/', hr_sync_deactivate_view, name='int-hr-sync-deactivate'),

    # Trazabilidad e historial
    path('history/', integration_history, name='int-history'),
    path('incidencias/', integration_incidencias, name='int-incidencias'),
]

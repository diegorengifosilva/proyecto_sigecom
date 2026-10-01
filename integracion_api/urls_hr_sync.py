from django.urls import path
from .views import hr_sync_employees_view, hr_sync_deactivate_view, integration_history

urlpatterns = [
    path('employees', hr_sync_employees_view, name='v1-hr-sync-employees'),
    path('employees/deactivate', hr_sync_deactivate_view, name='v1-hr-sync-deactivate'),
    path('history', integration_history, name='v1-hr-sync-history'),
]

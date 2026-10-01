from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SegUsuarioViewSet, list_modules, employees_without_account,
    SegAuditoriaViewSet
)

router = DefaultRouter()
router.register(r'users', SegUsuarioViewSet, basename='seg-users')
router.register(r'auditoria', SegAuditoriaViewSet, basename='seg-auditoria')

urlpatterns = [
    # Módulos corporativos
    path('modules/', list_modules, name='seg-modules'),

    # Colaboradores sin cuenta
    path('available-employees/', employees_without_account, name='seg-available-employees'),

    # Router
    path('', include(router.urls)),
]

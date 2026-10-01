from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmergenciasOverviewView, EmeBrigadistaViewSet, candidates_for_brigade,
    EmeProgramaViewSet, reschedule_program, EmeReporteViewSet,
    EmeAccionViewSet, EmeEquipoViewSet, EmeInspeccionViewSet,
    EmePlantillaViewSet
)

router = DefaultRouter()
router.register(r'members', EmeBrigadistaViewSet, basename='eme-members')
router.register(r'program', EmeProgramaViewSet, basename='eme-program')
router.register(r'reports', EmeReporteViewSet, basename='eme-reports')
router.register(r'actions', EmeAccionViewSet, basename='eme-actions')
router.register(r'equipment', EmeEquipoViewSet, basename='eme-equipment')
router.register(r'inspections', EmeInspeccionViewSet, basename='eme-inspections')
router.register(r'templates', EmePlantillaViewSet, basename='eme-templates')

urlpatterns = [
    # Dashboard / Overview
    path('overview/', EmergenciasOverviewView.as_view(), name='eme-overview'),

    # Candidatos a brigadistas
    path('candidates/', candidates_for_brigade, name='eme-candidates'),

    # Reprogramar simulacro
    path('program/<str:pk>/reschedule/', reschedule_program, name='eme-reschedule'),

    # Router
    path('', include(router.urls)),
]

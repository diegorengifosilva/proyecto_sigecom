from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RrhhSummaryView, RrhhColaboradorViewSet, employee_dossier,
    workplace_training_data, RrhhProcesoSeleccionViewSet,
    recruitment_summary, RrhhPostulanteViewSet, update_candidate_emo,
    finalize_recruitment, hr_configuration, RrhhRecursoOficialViewSet,
    my_information
)

router = DefaultRouter()
router.register(r'employees', RrhhColaboradorViewSet, basename='rrhh-employees')
router.register(r'recruitment/processes', RrhhProcesoSeleccionViewSet, basename='rrhh-recruitment-processes')
router.register(r'recruitment/candidates', RrhhPostulanteViewSet, basename='rrhh-recruitment-candidates')
router.register(r'official-assets', RrhhRecursoOficialViewSet, basename='rrhh-official-assets')

urlpatterns = [
    # Dashboard RRHH
    path('summary/', RrhhSummaryView.as_view(), name='rrhh-summary'),

    # Legajo y Workplace Training
    path('employees/<str:pk>/dossier/', employee_dossier, name='rrhh-employee-dossier'),
    path('employees/<str:pk>/workplace-training-data/', workplace_training_data, name='rrhh-workplace-training'),

    # Reclutamiento y Selección
    path('recruitment/summary/', recruitment_summary, name='rrhh-recruitment-summary'),
    path('recruitment/candidates/<str:pk>/emo/', update_candidate_emo, name='rrhh-update-candidate-emo'),
    path('recruitment/processes/<str:pk>/finalize/', finalize_recruitment, name='rrhh-finalize-recruitment'),

    # Configuración de Estructura (Áreas, Cargos, MOF)
    path('configuration/', hr_configuration, name='rrhh-configuration'),

    # Portal "Mi Información"
    path('me/', my_information, name='rrhh-my-information'),

    # Router
    path('', include(router.urls)),
]

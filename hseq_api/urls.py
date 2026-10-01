from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardSummaryView, CapacitacionesViewSet, AsignacionesViewSet,
    EvaluacionesViewSet, CertificacionesTarViewSet, InduccionesViewSet,
    EncuestasViewSet, publish_training, unlock_exam, record_manual_score,
    my_trainings, my_induction, employees_list, employee_dossier,
    submit_exam_attempt, complete_induction_requirement,
    competencies_matrix, catalogs
)

router = DefaultRouter()
router.register(r'trainings', CapacitacionesViewSet, basename='training')
router.register(r'assignments', AsignacionesViewSet, basename='assignment')
router.register(r'evaluations', EvaluacionesViewSet, basename='evaluation')
router.register(r'tar-certificates', CertificacionesTarViewSet, basename='tar-certificate')
router.register(r'onboarding', InduccionesViewSet, basename='onboarding')
router.register(r'surveys', EncuestasViewSet, basename='survey')

urlpatterns = [
    # 1. Dashboard
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='hseq-dashboard-summary'),

    # 2. Capacitaciones acciones adicionales
    path('trainings/<str:pk>/publish/', publish_training, name='hseq-publish-training'),

    # 3. Asignaciones y notas
    path('assignments/<str:pk>/unlock-exam/', unlock_exam, name='hseq-unlock-exam'),
    path('assignments/<str:pk>/record-score/', record_manual_score, name='hseq-record-score'),

    # 4. Portal del Colaborador
    path('my-trainings/', my_trainings, name='hseq-my-trainings'),
    path('my-induction/', my_induction, name='hseq-my-induction'),

    # 5. Colaboradores y Legajos
    path('employees/', employees_list, name='hseq-employees-list'),
    path('employees/<str:pk>/dossier/', employee_dossier, name='hseq-employee-dossier'),

    # 6. Exámenes
    path('evaluations/<str:pk>/attempt/', submit_exam_attempt, name='hseq-submit-attempt'),

    # 7. Inducciones
    path('onboarding/requirements/<str:req_id>/complete/', complete_induction_requirement, name='hseq-complete-requirement'),

    # 8. Competencias
    path('competencies/matrix/', competencies_matrix, name='hseq-competencies-matrix'),

    # 9. Catálogos generales
    path('catalogs/', catalogs, name='hseq-catalogs'),

    # Router CRUD endpoints
    path('', include(router.urls)),
]

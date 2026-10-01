from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProyectoEvViewSet, HistorialEvViewSet, TareaEvViewSet, CurvaEvViewSet,
    ProyectoDashboardView, CurvasProyectoView, CargarCronogramaExcelView,
    CronogramaProyectoView,
    GastoRealViewSet, HorasHombreRealViewSet, AvanceFisicoViewSet, AvanceFinancieroViewSet, MiembroEquipoEvViewSet,
    RiesgoViewSet, CambioViewSet, RecursoProyectoViewSet, AsignacionRecursoTareaViewSet,
    ChecklistCalidadViewSet, ItemChecklistViewSet, ComunicacionViewSet, CompraViewSet, NotaViewSet,
    InformeEjecutivoViewSet
)
from .views_cronograma import CronogramaVersionViewSet, TareaViewSet, DocumentoProyectoViewSet
from .views_tooltips import obtener_tooltip_view, generar_todos_tooltips_view, listar_kpis_disponibles
from .views_evaluaciones import (
    EscenarioEvaluacionViewSet,
    AlternativaProyectoViewSet,
    EvaluacionEstrategicaViewSet,
    ResultadoMetodoEvaluacionViewSet
)

router = DefaultRouter()
router.register(r'proyectos', ProyectoEvViewSet, basename='proyectos')
router.register(r'historiales', HistorialEvViewSet, basename='historiales')
router.register(r'tareas-ev', TareaEvViewSet, basename='tareas-ev')  # Renombrado para evitar conflicto
router.register(r'curvas', CurvaEvViewSet, basename='curvas')
router.register(r'gastos-reales', GastoRealViewSet)
router.register(r'horas-hombre', HorasHombreRealViewSet)
router.register(r'avance-fisico', AvanceFisicoViewSet)
router.register(r'avance-financiero', AvanceFinancieroViewSet)
router.register(r'equipo', MiembroEquipoEvViewSet, basename='equipo')

# Endpoints para cronogramas EDT/Gantt
router.register(r'cronogramas', CronogramaVersionViewSet, basename='cronogramas')
router.register(r'tareas', TareaViewSet, basename='tareas')
router.register(r'documentos', DocumentoProyectoViewSet, basename='documentos')

# Endpoints para Evaluaciones Estratégicas
router.register(r'evaluaciones/escenarios', EscenarioEvaluacionViewSet, basename='escenarios')
router.register(r'evaluaciones/alternativas', AlternativaProyectoViewSet, basename='alternativas')
router.register(r'evaluaciones/evaluaciones', EvaluacionEstrategicaViewSet, basename='evaluaciones-estrategicas')
router.register(r'evaluaciones/resultados', ResultadoMetodoEvaluacionViewSet, basename='resultados-evaluacion')

urlpatterns = [
    path('', include(router.urls)),
    
    # Endpoints legacy y alternativos
    path('<int:pk>/dashboard/', ProyectoDashboardView.as_view(), name='proyecto-dashboard'),
    path('<int:pk>/proyectos/', ProyectoDashboardView.as_view(), name='proyecto-dashboard-proyectos-alt'),
    path('<int:pk>/curvas/', CurvasProyectoView.as_view(), name='proyecto-curvas'),
    path('proyectos/<int:pk>/curvas/', CurvasProyectoView.as_view(), name='proyecto-curvas-proyectos'),
    path('proyectos/<int:pk>/cronograma/', CronogramaProyectoView.as_view(), name='cronograma-proyecto'),
    path('api/proyectos/<int:proyecto_id>/cargar_cronograma/', CargarCronogramaExcelView.as_view(), name="cargar_cronograma_excel"),
    
    # Endpoints anidados para cronogramas por proyecto
    path('proyectos/<int:proyecto_pk>/cronogramas/', 
         CronogramaVersionViewSet.as_view({'get': 'list', 'post': 'create'}), 
         name='proyecto-cronogramas-list'),
    path('proyectos/<int:proyecto_pk>/cronogramas/<int:pk>/', 
         CronogramaVersionViewSet.as_view({
             'get': 'retrieve', 
             'put': 'update', 
             'patch': 'partial_update', 
             'delete': 'destroy'
         }), 
         name='proyecto-cronograma-detail'),
    path('proyectos/<int:proyecto_pk>/cronogramas/<int:pk>/calcular/', 
         CronogramaVersionViewSet.as_view({'post': 'calcular'}), 
         name='cronograma-calcular'),
    path('proyectos/<int:proyecto_pk>/cronogramas/<int:pk>/export_msp/', 
         CronogramaVersionViewSet.as_view({'get': 'export_msp'}), 
         name='cronograma-export-msp'),
    path('proyectos/<int:proyecto_pk>/cronogramas/<int:pk>/export_xlsx/',
         CronogramaVersionViewSet.as_view({'get': 'export_xlsx'}),
         name='cronograma-export-xlsx'),
    path('proyectos/<int:proyecto_pk>/cronogramas/plantilla_excel/',
         CronogramaVersionViewSet.as_view({'get': 'plantilla_excel'}),
         name='cronograma-plantilla-excel'),
    path('proyectos/<int:proyecto_pk>/cronogramas/importar_excel/',
         CronogramaVersionViewSet.as_view({'post': 'importar_excel'}),
         name='cronograma-importar-excel'),

    # ===== RIESGOS =====
    path('proyectos/<int:proyecto_pk>/riesgos/',
         RiesgoViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='proyecto-riesgos-list'),
    path('proyectos/<int:proyecto_pk>/riesgos/<int:pk>/',
         RiesgoViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='proyecto-riesgo-detail'),

    # ===== CAMBIOS =====
    path('proyectos/<int:proyecto_pk>/cambios/',
         CambioViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='proyecto-cambios-list'),
    path('proyectos/<int:proyecto_pk>/cambios/<int:pk>/',
         CambioViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='proyecto-cambio-detail'),

    # ===== RECURSOS =====
    path('proyectos/<int:proyecto_pk>/recursos/',
         RecursoProyectoViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='proyecto-recursos-list'),
    path('proyectos/<int:proyecto_pk>/recursos/<int:pk>/',
         RecursoProyectoViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='proyecto-recurso-detail'),

    path('proyectos/<int:proyecto_pk>/asignaciones/',
         AsignacionRecursoTareaViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='proyecto-asignaciones-list'),
    path('proyectos/<int:proyecto_pk>/asignaciones/<int:pk>/',
         AsignacionRecursoTareaViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='proyecto-asignacion-detail'),

    # ===== CALIDAD =====
    path('proyectos/<int:proyecto_pk>/checklists/',
         ChecklistCalidadViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='proyecto-checklists-list'),
    path('proyectos/<int:proyecto_pk>/checklists/<int:pk>/',
         ChecklistCalidadViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='proyecto-checklist-detail'),

    path('proyectos/<int:proyecto_pk>/checklists/<int:checklist_pk>/items/',
         ItemChecklistViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='checklist-items-list'),
    path('proyectos/<int:proyecto_pk>/checklists/<int:checklist_pk>/items/<int:pk>/',
         ItemChecklistViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='checklist-item-detail'),

    # ===== COMUNICACIONES =====
    path('proyectos/<int:proyecto_pk>/comunicaciones/',
         ComunicacionViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='proyecto-comunicaciones-list'),
    path('proyectos/<int:proyecto_pk>/comunicaciones/<int:pk>/',
         ComunicacionViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='proyecto-comunicacion-detail'),

    # ===== COMPRAS =====
    path('proyectos/<int:proyecto_pk>/compras/',
         CompraViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='proyecto-compras-list'),
    path('proyectos/<int:proyecto_pk>/compras/<int:pk>/',
         CompraViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='proyecto-compra-detail'),

    # ===== NOTAS =====
    path('proyectos/<int:proyecto_pk>/notas/',
         NotaViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='proyecto-notas-list'),
    path('proyectos/<int:proyecto_pk>/notas/<int:pk>/',
         NotaViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='proyecto-nota-detail'),

    # ===== INFORMES EJECUTIVOS =====
    path('proyectos/<int:proyecto_pk>/informes/',
         InformeEjecutivoViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='proyecto-informes-list'),
    path('proyectos/<int:proyecto_pk>/informes/<int:pk>/',
         InformeEjecutivoViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='proyecto-informe-detail'),
    path('proyectos/<int:proyecto_pk>/informes/<int:pk>/descargar/',
         InformeEjecutivoViewSet.as_view({'get': 'descargar'}),
         name='informe-descargar'),

    # ===== TOOLTIPS INTELIGENTES CON IA =====
    path('tooltips/kpi/<str:nombre_kpi>/', obtener_tooltip_view, name='tooltip-kpi'),
    path('tooltips/todos/', generar_todos_tooltips_view, name='tooltips-todos'),
    path('tooltips/kpis/', listar_kpis_disponibles, name='tooltips-kpis-lista'),
]

import uuid
from decimal import Decimal
from django.utils import timezone
from django.db.models import Count, Q, Avg
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    RrhhArea, RrhhCargo, RrhhPerfilCompetencia, RrhhCompetencia, RrhhPerfilCompetenciaDetalle,
    RrhhColaborador, HseqProgramaAnual, HseqPilar, HseqCapacitacion,
    HseqEvidenciaCapacitacion, HseqAsignacionCapacitacion, HseqEncuestaCapacitacion,
    HseqEvaluacion, HseqPreguntaEvaluacion, HseqOpcionPregunta,
    HseqIntentoEvaluacion, HseqRespuestaIntento, HseqCertificadoTar,
    HseqProcesoInduccion, HseqRequisitoInduccion, HseqRegistroColaborador
)
from .serializers import (
    RrhhColaboradorSerializer, HseqPilarSerializer, HseqProgramaAnualSerializer,
    HseqPerfilCompetenciaSerializer, HseqCapacitacionSerializer,
    HseqAsignacionCapacitacionSerializer, HseqEvaluacionSerializer,
    HseqPreguntaEvaluacionSerializer, HseqCertificadoTarSerializer,
    HseqProcesoInduccionSerializer, HseqEncuestaCapacitacionSerializer,
    HseqCompetenciaSerializer
)


# ===========================================================================
# 1. DASHBOARD HSEQ
# ===========================================================================

class DashboardSummaryView(APIView):
    """
    Retorna métricas ejecutivas de HSEQ: personal activo, capacitaciones planificadas,
    asignaciones pendientes, tasa de aprobación, avance por pilar y colaboradores en riesgo.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        active_employees = RrhhColaborador.objects.filter(status='ACTIVE').count()
        trainings_planned = HseqCapacitacion.objects.filter(
            status__in=['PLANNED', 'CONFIRMED'], management_owner='HSEQ'
        ).count()

        # Asignaciones HSEQ
        assignments = HseqAsignacionCapacitacion.objects.filter(
            applicability_status='APPLIES',
            training__management_owner='HSEQ'
        )
        applicable_count = assignments.count()
        approved_count = assignments.filter(status='APPROVED').count()
        failed_count = assignments.filter(status='FAILED').count()
        pending_count = assignments.filter(status__in=['PENDING', 'IN_PROGRESS']).count()
        overdue_count = assignments.filter(
            Q(status='OVERDUE') | Q(due_date__lt=now, status__in=['PENDING', 'IN_PROGRESS'])
        ).count()

        approval_rate = round((approved_count / applicable_count * 100), 1) if applicable_count > 0 else 0

        # Programa anual
        program = HseqProgramaAnual.objects.order_by('-year').first()
        general_target = float(program.general_target) if program and program.general_target else 80.0
        program_year = program.year if program else now.year

        # Avance por pilar
        pillars = HseqPilar.objects.all().order_by('name')
        by_pillar = []
        for p in pillars:
            p_assignments = HseqAsignacionCapacitacion.objects.filter(
                training__pillar=p,
                applicability_status='APPLIES',
                training__management_owner='HSEQ'
            )
            p_app = p_assignments.count()
            p_apr = p_assignments.filter(status='APPROVED').count()
            p_rate = round((p_apr / p_app * 100), 1) if p_app > 0 else 0
            by_pillar.append({
                'code': p.code,
                'name': p.name,
                'applicable': p_app,
                'approved': p_apr,
                'approvalRate': p_rate
            })

        # Avance por área
        areas = RrhhArea.objects.all().order_by('name')
        completion_by_area = []
        for a in areas:
            a_assignments = HseqAsignacionCapacitacion.objects.filter(
                employee__area=a,
                employee__status='ACTIVE',
                applicability_status='APPLIES',
                training__management_owner='HSEQ'
            )
            a_app = a_assignments.count()
            a_apr = a_assignments.filter(status='APPROVED').count()
            a_rate = round((a_apr / a_app * 100), 1) if a_app > 0 else 0
            if a_app > 0:
                completion_by_area.append({
                    'name': a.name,
                    'applicable': a_app,
                    'approved': a_apr,
                    'completionRate': a_rate
                })

        # Colaboradores en riesgo (con cursos desaprobados o vencidos)
        risk_assignments = assignments.filter(
            Q(status='FAILED') | Q(due_date__lt=now, status__in=['PENDING', 'IN_PROGRESS'])
        ).values('employee__id', 'employee__full_name', 'employee__area__name').annotate(
            critical_count=Count('id'),
            failed=Count('id', filter=Q(status='FAILED'))
        ).order_by('-critical_count')[:10]

        employees_at_risk = [
            {
                'employeeId': r['employee__id'],
                'fullName': r['employee__full_name'],
                'area': r['employee__area__name'] or 'Sin Área',
                'criticalCount': r['critical_count'],
                'failed': r['failed']
            } for r in risk_assignments
        ]

        # Resumen de certificados TAR
        tar_expired = HseqCertificadoTar.objects.filter(expires_at__lt=now).count()
        tar_warning = HseqCertificadoTar.objects.filter(
            expires_at__gte=now,
            expires_at__lte=now + timezone.timedelta(days=30)
        ).count()

        return Response({
            'activeEmployees': active_employees,
            'trainingsPlanned': trainings_planned,
            'pendingAssignments': pending_count,
            'approvalRate': approval_rate,
            'applicableAssignments': applicable_count,
            'approvedAssignments': approved_count,
            'generalTarget': general_target,
            'year': program_year,
            'failedAssignments': failed_count,
            'overdueAssignments': overdue_count,
            'byPillar': by_pillar,
            'completionByArea': completion_by_area,
            'employeesAtRisk': employees_at_risk,
            'tarSummary': {
                'alerts': tar_expired + tar_warning,
                'critical': tar_warning,
                'expired': tar_expired
            }
        })


# ===========================================================================
# 2. CAPACITACIONES (PROGRAMA Y SESIONES)
# ===========================================================================

class CapacitacionesViewSet(viewsets.ModelViewSet):
    queryset = HseqCapacitacion.objects.all().order_by('-created_at')
    serializer_class = HseqCapacitacionSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        month = self.request.query_params.get('month')
        pillar_id = self.request.query_params.get('pillarId')
        status_param = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        owner = self.request.query_params.get('owner', 'HSEQ')

        if owner:
            qs = qs.filter(management_owner=owner)
        if month:
            qs = qs.filter(planned_month=month)
        if pillar_id:
            qs = qs.filter(pillar_id=pillar_id)
        if status_param:
            qs = qs.filter(status=status_param)
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(code__icontains=search))
        return qs

    def perform_create(self, serializer):
        if not serializer.validated_data.get('code'):
            count = HseqCapacitacion.objects.count() + 1
            year = timezone.now().year
            code = f"CAP-{year}-{count:03d}"
            serializer.save(id=str(uuid.uuid4()), code=code)
        else:
            serializer.save(id=str(uuid.uuid4()))


@api_view(['POST'])
@permission_classes([AllowAny])
def publish_training(request, pk):
    try:
        training = HseqCapacitacion.objects.get(pk=pk)
        training.status = 'CONFIRMED'
        training.published_at = timezone.now()
        training.save()

        # Asignar automáticamente a todos los colaboradores activos si no tienen asignación
        active_employees = RrhhColaborador.objects.filter(status='ACTIVE')
        created_count = 0
        for emp in active_employees:
            _, created = HseqAsignacionCapacitacion.objects.get_or_create(
                employee=emp,
                training=training,
                defaults={
                    'id': str(uuid.uuid4()),
                    'applicability_status': 'APPLIES',
                    'status': 'PENDING',
                    'due_date': timezone.now() + timezone.timedelta(days=training.regularization_days or 30)
                }
            )
            if created:
                created_count += 1

        return Response({
            'message': 'Capacitación publicada exitosamente.',
            'assignedEmployees': created_count
        })
    except HseqCapacitacion.DoesNotExist:
        return Response({'error': 'Capacitación no encontrada'}, status=status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 3. ASIGNACIONES Y SEGUIMIENTO
# ===========================================================================

class AsignacionesViewSet(viewsets.ModelViewSet):
    queryset = HseqAsignacionCapacitacion.objects.all().select_related('employee', 'training').order_by('-created_at')
    serializer_class = HseqAsignacionCapacitacionSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        training_id = self.request.query_params.get('trainingId')
        employee_id = self.request.query_params.get('employeeId')
        status_param = self.request.query_params.get('status')
        search = self.request.query_params.get('search')

        if training_id:
            qs = qs.filter(training_id=training_id)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if status_param:
            if status_param == 'OVERDUE':
                qs = qs.filter(Q(status='OVERDUE') | Q(due_date__lt=timezone.now(), status__in=['PENDING', 'IN_PROGRESS']))
            else:
                qs = qs.filter(status=status_param)
        if search:
            qs = qs.filter(
                Q(employee__full_name__icontains=search) |
                Q(employee__dni__icontains=search) |
                Q(training__title__icontains=search)
            )
        return qs


@api_view(['POST'])
@permission_classes([AllowAny])
def unlock_exam(request, pk):
    """Desbloquea el examen para una asignación específica al registrar asistencia."""
    try:
        assignment = HseqAsignacionCapacitacion.objects.get(pk=pk)
        assignment.exam_unlocked_at = timezone.now()
        assignment.registration_applied_at = timezone.now()
        assignment.status = 'IN_PROGRESS'
        assignment.save()
        return Response({'message': 'Examen desbloqueado y asistencia registrada.'})
    except HseqAsignacionCapacitacion.DoesNotExist:
        return Response({'error': 'Asignación no encontrada'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def record_manual_score(request, pk):
    """Permite al supervisor HSEQ registrar manualmente una nota de evaluación."""
    try:
        assignment = HseqAsignacionCapacitacion.objects.get(pk=pk)
        score = Decimal(str(request.data.get('score', 0)))
        min_score = assignment.training.evaluacion.minimum_score if hasattr(assignment.training, 'evaluacion') else Decimal('16')

        assignment.best_score = score
        assignment.attempt_count = (assignment.attempt_count or 0) + 1
        assignment.status = 'APPROVED' if score >= min_score else 'FAILED'
        assignment.save()

        return Response({
            'message': 'Calificación registrada exitosamente.',
            'status': assignment.status,
            'bestScore': str(assignment.best_score)
        })
    except HseqAsignacionCapacitacion.DoesNotExist:
        return Response({'error': 'Asignación no encontrada'}, status=status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 4. PORTAL DEL COLABORADOR: MI CAPACITACIÓN & MI INDUCCIÓN
# ===========================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def my_trainings(request):
    """
    Retorna los cursos asignados al colaborador consultado (por query param dni o usuario logueado).
    """
    dni = request.query_params.get('dni')
    if not dni and request.user.is_authenticated:
        dni = getattr(request.user, 'dni', None) or request.user.username

    if not dni:
        # Modo demostración / primer colaborador activo si no hay usuario especificado
        emp = RrhhColaborador.objects.filter(status='ACTIVE').first()
    else:
        emp = RrhhColaborador.objects.filter(dni=dni).first()

    if not emp:
        return Response({'error': 'Colaborador no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    assignments = HseqAsignacionCapacitacion.objects.filter(
        employee=emp,
        applicability_status='APPLIES'
    ).select_related('training', 'training__pillar').order_by('status', '-created_at')

    serializer = HseqAsignacionCapacitacionSerializer(assignments, many=True)
    return Response({
        'employee': RrhhColaboradorSerializer(emp).data,
        'assignments': serializer.data
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def my_induction(request):
    """Retorna el proceso de inducción y checklist de requisitos del colaborador."""
    dni = request.query_params.get('dni')
    if not dni and request.user.is_authenticated:
        dni = getattr(request.user, 'dni', None) or request.user.username

    emp = RrhhColaborador.objects.filter(dni=dni).first() if dni else RrhhColaborador.objects.filter(status='ACTIVE').first()
    if not emp:
        return Response({'error': 'Colaborador no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    process = HseqProcesoInduccion.objects.filter(employee=emp).order_by('-initiated_at').first()
    if not process:
        return Response({'employee': RrhhColaboradorSerializer(emp).data, 'process': None, 'requirements': []})

    serializer = HseqProcesoInduccionSerializer(process)
    return Response({
        'employee': RrhhColaboradorSerializer(emp).data,
        'process': serializer.data
    })


# ===========================================================================
# 5. COLABORADORES Y LEGAJOS HSEQ
# ===========================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def employees_list(request):
    search = request.query_params.get('search')
    area_id = request.query_params.get('areaId')
    status_param = request.query_params.get('status', 'ACTIVE')

    qs = RrhhColaborador.objects.all().select_related('area', 'position', 'profile')
    if status_param:
        qs = qs.filter(status=status_param)
    if area_id:
        qs = qs.filter(area_id=area_id)
    if search:
        qs = qs.filter(Q(full_name__icontains=search) | Q(dni__icontains=search) | Q(email__icontains=search))

    serializer = RrhhColaboradorSerializer(qs[:100], many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def employee_dossier(request, pk):
    """Expediente HSEQ completo del colaborador."""
    try:
        emp = RrhhColaborador.objects.select_related('area', 'position', 'profile').get(pk=pk)
        assignments = HseqAsignacionCapacitacion.objects.filter(employee=emp).select_related('training')
        tar_certs = HseqCertificadoTar.objects.filter(employee=emp).order_by('-issued_at')
        induction = HseqProcesoInduccion.objects.filter(employee=emp).order_by('-initiated_at').first()

        return Response({
            'employee': RrhhColaboradorSerializer(emp).data,
            'assignments': HseqAsignacionCapacitacionSerializer(assignments, many=True).data,
            'tarCertificates': HseqCertificadoTarSerializer(tar_certs, many=True).data,
            'induction': HseqProcesoInduccionSerializer(induction).data if induction else None
        })
    except RrhhColaborador.DoesNotExist:
        return Response({'error': 'Colaborador no encontrado'}, status=status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 6. EVALUACIONES Y EXÁMENES INTERNOS
# ===========================================================================

class EvaluacionesViewSet(viewsets.ModelViewSet):
    queryset = HseqEvaluacion.objects.all().order_by('-created_at')
    serializer_class = HseqEvaluacionSerializer
    permission_classes = [AllowAny]
    pagination_class = None


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_exam_attempt(request, pk):
    """
    Rinde un intento de examen y califica automáticamente según las opciones correctas.
    Regla: nota aprobatoria >= minimum_score (por defecto 16).
    """
    try:
        evaluacion = HseqEvaluacion.objects.get(pk=pk)
        employee_id = request.data.get('employeeId')
        answers = request.data.get('answers', [])  # list of { questionId, selectedOptionId }

        emp = RrhhColaborador.objects.get(pk=employee_id)

        # Crear intento
        intento = HseqIntentoEvaluacion.objects.create(
            id=str(uuid.uuid4()),
            evaluation=evaluacion,
            employee=emp,
            status='IN_PROGRESS',
            source='INTERNAL'
        )

        total_score = Decimal('0')
        for ans in answers:
            q_id = ans.get('questionId')
            opt_id = ans.get('selectedOptionId')
            pregunta = HseqPreguntaEvaluacion.objects.filter(pk=q_id).first()
            if not pregunta:
                continue

            opcion = HseqOpcionPregunta.objects.filter(pk=opt_id, question=pregunta).first()
            is_correct = opcion.is_correct if opcion else False
            points = pregunta.points if is_correct else Decimal('0')
            total_score += points

            HseqRespuestaIntento.objects.create(
                id=str(uuid.uuid4()),
                attempt=intento,
                question=pregunta,
                value=str(opt_id),
                is_correct=is_correct,
                points=points
            )

        intento.score = total_score
        intento.submitted_at = timezone.now()
        is_approved = total_score >= evaluacion.minimum_score
        intento.status = 'APPROVED' if is_approved else 'FAILED'
        intento.save()

        # Actualizar asignación del colaborador
        assignment = HseqAsignacionCapacitacion.objects.filter(
            employee=emp,
            training=evaluacion.training
        ).first()

        if assignment:
            assignment.attempt_count = (assignment.attempt_count or 0) + 1
            if assignment.best_score is None or total_score > assignment.best_score:
                assignment.best_score = total_score
            if is_approved:
                assignment.status = 'APPROVED'
            elif assignment.status != 'APPROVED':
                assignment.status = 'FAILED'
            assignment.save()

        return Response({
            'message': 'Evaluación calificada exitosamente.',
            'score': float(total_score),
            'minimumScore': float(evaluacion.minimum_score),
            'status': intento.status,
            'approved': is_approved
        })
    except (HseqEvaluacion.DoesNotExist, RrhhColaborador.DoesNotExist) as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 7. CERTIFICACIONES TAR (TRABAJOS DE ALTO RIESGO)
# ===========================================================================

class CertificacionesTarViewSet(viewsets.ModelViewSet):
    queryset = HseqCertificadoTar.objects.all().select_related('employee').order_by('-expires_at')
    serializer_class = HseqCertificadoTarSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        cert_type = self.request.query_params.get('type')
        employee_id = self.request.query_params.get('employeeId')
        search = self.request.query_params.get('search')
        filter_status = self.request.query_params.get('status')
        now = timezone.now()

        if cert_type:
            qs = qs.filter(type=cert_type)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if filter_status == 'EXPIRED':
            qs = qs.filter(expires_at__lt=now)
        elif filter_status == 'WARNING':
            qs = qs.filter(expires_at__gte=now, expires_at__lte=now + timezone.timedelta(days=30))
        elif filter_status == 'VALID':
            qs = qs.filter(expires_at__gt=now + timezone.timedelta(days=30))
        if search:
            qs = qs.filter(
                Q(employee__full_name__icontains=search) |
                Q(employee__dni__icontains=search) |
                Q(certificate_code__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(id=str(uuid.uuid4()))


# ===========================================================================
# 8. INDUCCIÓN Y REINDUCCIÓN CORPORATIVA
# ===========================================================================

class InduccionesViewSet(viewsets.ModelViewSet):
    queryset = HseqProcesoInduccion.objects.all().select_related('employee').order_by('-initiated_at')
    serializer_class = HseqProcesoInduccionSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def perform_create(self, serializer):
        instance = serializer.save(id=str(uuid.uuid4()))
        # Crear los requisitos estándar por defecto
        standard_reqs = [
            ('HSEQ-POL', 'Política Integrada de Gestión HSEQ', 'POLICY'),
            ('HSEQ-RISST', 'Reglamento Interno de Seguridad y Salud (RISST)', 'REGULATION'),
            ('HSEQ-IPERC', 'Matriz IPERC y Mapa de Riesgos', 'IPERC'),
            ('HSEQ-EMERG', 'Plan de Respuesta a Emergencias', 'EMERGENCY'),
            ('HSEQ-EXAM', 'Evaluación de Inducción General', 'EVALUATION'),
        ]
        for code, label, cat in standard_reqs:
            HseqRequisitoInduccion.objects.create(
                id=str(uuid.uuid4()),
                process=instance,
                code=code,
                label=label,
                category=cat,
                status='PENDING'
            )


@api_view(['POST'])
@permission_classes([AllowAny])
def complete_induction_requirement(request, req_id):
    try:
        req = HseqRequisitoInduccion.objects.get(pk=req_id)
        req.status = 'COMPLETED'
        req.completed_at = timezone.now()
        req.save()

        # Verificar si todos los requisitos del proceso se completaron
        process = req.process
        all_completed = not process.requisitos.filter(~Q(status='COMPLETED')).exists()
        if all_completed:
            process.status = 'HR_WORKPLACE_TRAINING'
            process.hseq_completed_at = timezone.now()
            process.save()

        return Response({
            'message': 'Requisito marcado como completado.',
            'allCompleted': all_completed,
            'processStatus': process.status
        })
    except HseqRequisitoInduccion.DoesNotExist:
        return Response({'error': 'Requisito no encontrado'}, status=status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 9. MATRIZ DE COMPETENCIAS
# ===========================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def competencies_matrix(request):
    profiles = RrhhPerfilCompetencia.objects.filter(is_active=True).prefetch_related('detalles__competency')
    competencies = RrhhCompetencia.objects.all().order_by('name')
    return Response({
        'profiles': HseqPerfilCompetenciaSerializer(profiles, many=True).data,
        'competencies': HseqCompetenciaSerializer(competencies, many=True).data
    })


# ===========================================================================
# 10. ENCUESTAS DE CAPACITACIÓN
# ===========================================================================

class EncuestasViewSet(viewsets.ModelViewSet):
    queryset = HseqEncuestaCapacitacion.objects.all().select_related('employee', 'assignment__training').order_by('-submitted_at')
    serializer_class = HseqEncuestaCapacitacionSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def perform_create(self, serializer):
        serializer.save(id=str(uuid.uuid4()))


# ===========================================================================
# 11. CONFIGURACIÓN Y CATÁLOGOS
# ===========================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def catalogs(request):
    pillars = HseqPilar.objects.all().order_by('name')
    areas = RrhhArea.objects.all().order_by('name')
    positions = RrhhCargo.objects.all().order_by('name')
    programs = HseqProgramaAnual.objects.all().order_by('-year')

    return Response({
        'pillars': HseqPilarSerializer(pillars, many=True).data,
        'areas': [{'id': a.id, 'name': a.name} for a in areas],
        'positions': [{'id': p.id, 'name': p.name} for p in positions],
        'programs': HseqProgramaAnualSerializer(programs, many=True).data
    })

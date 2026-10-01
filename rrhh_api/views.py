import uuid
from datetime import datetime, date
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

from .models import (
    RrhhArea, RrhhCargo, RrhhPerfilCompetencia, RrhhCompetencia,
    RrhhPerfilCompetenciaDetalle, RrhhColaborador, RrhhDocumentoColaborador,
    RrhhProcesoSeleccion, RrhhPostulante, RrhhTareaSeleccion,
    RrhhDocumentoSeleccion, RrhhAceptacionDocumento, RrhhRecursoOficial,
    RrhhMofCargo, RrhhRemuneracion
)
from .serializers import (
    RrhhAreaSerializer, RrhhCargoSerializer, RrhhPerfilCompetenciaSerializer,
    RrhhCompetenciaSerializer, RrhhColaboradorSerializer,
    RrhhDocumentoColaboradorSerializer, RrhhProcesoSeleccionSerializer,
    RrhhPostulanteSerializer, RrhhTareaSeleccionSerializer,
    RrhhDocumentoSeleccionSerializer, RrhhAceptacionDocumentoSerializer,
    RrhhRecursoOficialSerializer, RrhhRemuneracionSerializer,
    RrhhMofCargoSerializer
)


class RrhhSummaryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        now = timezone.now()
        first_day_of_month = date(now.year, now.month, 1)

        total_activos = RrhhColaborador.objects.filter(status='ACTIVE').count()
        total_cesados = RrhhColaborador.objects.filter(status='INACTIVE').count()
        
        ingresos_mes = RrhhColaborador.objects.filter(
            hire_date__gte=first_day_of_month,
            status='ACTIVE'
        ).count()
        
        ceses_mes = RrhhColaborador.objects.filter(
            termination_date__gte=first_day_of_month,
            status='INACTIVE'
        ).count()

        # Distribución por áreas
        por_area_raw = (
            RrhhColaborador.objects.filter(status='ACTIVE')
            .values('area_id')
            .annotate(total=Count('id'))
            .order_by('-total')
        )
        areas_dict = {a.id: a.name for a in RrhhArea.objects.all()}
        distribucion_areas = [
            {
                'areaId': item['area_id'],
                'areaNombre': areas_dict.get(item['area_id'], 'Sin Área'),
                'total': item['total']
            }
            for item in por_area_raw
        ]

        # Distribución por categoría (Planilla vs RxH)
        por_categoria = list(
            RrhhColaborador.objects.filter(status='ACTIVE')
            .values('worker_category')
            .annotate(total=Count('id'))
        )

        # Procesos de selección activos
        vacantes_activas = RrhhProcesoSeleccion.objects.filter(status='OPEN').count()
        postulantes_en_proceso = RrhhPostulante.objects.exclude(status__in=['REJECTED', 'HIRED']).count()

        return Response({
            'totalActivos': total_activos,
            'totalCesados': total_cesados,
            'ingresosMes': ingresos_mes,
            'cesesMes': ceses_mes,
            'tasaRotacion': round((ceses_mes / max(total_activos, 1)) * 100, 2),
            'distribucionAreas': distribucion_areas,
            'distribucionCategorias': por_categoria,
            'vacantesActivas': vacantes_activas,
            'postulantesEnProceso': postulantes_en_proceso,
        })


class RrhhColaboradorViewSet(viewsets.ModelViewSet):
    queryset = RrhhColaborador.objects.all().order_by('full_name')
    serializer_class = RrhhColaboradorSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        status_param = self.request.query_params.get('status', 'ACTIVE')
        area_id = self.request.query_params.get('areaId')

        if status_param and status_param != 'ALL':
            qs = qs.filter(status=status_param)
        if area_id:
            qs = qs.filter(area_id=area_id)
        if search:
            qs = qs.filter(
                Q(dni__icontains=search) |
                Q(full_name__icontains=search) |
                Q(email__icontains=search)
            )
        return qs


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def employee_dossier(request, pk):
    try:
        colaborador = RrhhColaborador.objects.get(id=pk)
    except RrhhColaborador.DoesNotExist:
        return Response({'detail': 'Colaborador no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    documentos = RrhhDocumentoColaborador.objects.filter(employee_id=pk)
    remuneraciones = RrhhRemuneracion.objects.filter(employee_id=pk).order_by('-effective_from')
    
    cargo = RrhhCargo.objects.filter(id=colaborador.position_id).first() if colaborador.position_id else None
    area = RrhhArea.objects.filter(id=colaborador.area_id).first() if colaborador.area_id else None
    perfil = RrhhPerfilCompetencia.objects.filter(id=colaborador.profile_id).first() if colaborador.profile_id else None

    mof = RrhhMofCargo.objects.filter(position_id=colaborador.position_id).first() if colaborador.position_id else None

    return Response({
        'colaborador': RrhhColaboradorSerializer(colaborador).data,
        'area': RrhhAreaSerializer(area).data if area else None,
        'cargo': RrhhCargoSerializer(cargo).data if cargo else None,
        'perfil': RrhhPerfilCompetenciaSerializer(perfil).data if perfil else None,
        'mof': RrhhMofCargoSerializer(mof).data if mof else None,
        'documentos': RrhhDocumentoColaboradorSerializer(documentos, many=True).data,
        'remuneraciones': RrhhRemuneracionSerializer(remuneraciones, many=True).data,
    })


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.AllowAny])
def workplace_training_data(request, pk):
    colaborador = RrhhColaborador.objects.filter(id=pk).first()
    if not colaborador:
        return Response({'detail': 'Colaborador no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({
            'employeeId': colaborador.id,
            'fullName': colaborador.full_name,
            'directManagerId': colaborador.direct_manager_id,
            'hireDate': colaborador.hire_date,
            'status': colaborador.status,
            'trainingCompleted': True if colaborador.source_system == 'VALIDATED' else False
        })
    elif request.method == 'PATCH':
        data = request.data
        if 'directManagerId' in data:
            colaborador.direct_manager_id = data['directManagerId']
        if 'status' in data:
            colaborador.status = data['status']
        colaborador.save()
        return Response({'success': True, 'colaborador': RrhhColaboradorSerializer(colaborador).data})


class RrhhProcesoSeleccionViewSet(viewsets.ModelViewSet):
    queryset = RrhhProcesoSeleccion.objects.all().order_by('-created_at')
    serializer_class = RrhhProcesoSeleccionSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        if status_param:
            qs = qs.filter(status=status_param)
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(code__icontains=search))
        return qs


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def recruitment_summary(request):
    total = RrhhProcesoSeleccion.objects.count()
    abiertos = RrhhProcesoSeleccion.objects.filter(status='OPEN').count()
    cerrados = RrhhProcesoSeleccion.objects.filter(status='CLOSED').count()
    postulantes = RrhhPostulante.objects.count()
    en_evaluacion = RrhhPostulante.objects.filter(status='IN_EVALUATION').count()
    ofertas_enviadas = RrhhPostulante.objects.filter(offer_sent_at__isnull=False).count()
    contratados = RrhhPostulante.objects.filter(status='HIRED').count()

    return Response({
        'totalProcesos': total,
        'abiertos': abiertos,
        'cerrados': cerrados,
        'totalPostulantes': postulantes,
        'enEvaluacion': en_evaluacion,
        'ofertasEnviadas': ofertas_enviadas,
        'contratados': contratados
    })


class RrhhPostulanteViewSet(viewsets.ModelViewSet):
    queryset = RrhhPostulante.objects.all().order_by('-created_at')
    serializer_class = RrhhPostulanteSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        process_id = self.request.query_params.get('processId')
        status_param = self.request.query_params.get('status')
        if process_id:
            qs = qs.filter(process_id=process_id)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


@api_view(['PATCH'])
@permission_classes([permissions.AllowAny])
def update_candidate_emo(request, pk):
    postulante = RrhhPostulante.objects.filter(id=pk).first()
    if not postulante:
        return Response({'detail': 'Postulante no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    for field in ['emo_status', 'emo_result', 'emo_clinic', 'emo_notes', 'emo_type', 'emo_client', 'emo_project', 'emo_protocol']:
        if field in data:
            setattr(postulante, field, data[field])
    
    if 'emo_scheduled_at' in data and data['emo_scheduled_at']:
        postulante.emo_scheduled_at = data['emo_scheduled_at']
    if 'emo_evaluated_at' in data and data['emo_evaluated_at']:
        postulante.emo_evaluated_at = data['emo_evaluated_at']
        
    postulante.save()
    return Response(RrhhPostulanteSerializer(postulante).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def finalize_recruitment(request, pk):
    """
    Finaliza el proceso de selección y da de alta formal al candidato contratado en rrhh_colaborador.
    """
    proceso = RrhhProcesoSeleccion.objects.filter(id=pk).first()
    if not proceso:
        return Response({'detail': 'Proceso de selección no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    candidate_id = request.data.get('candidateId')
    postulante = RrhhPostulante.objects.filter(id=candidate_id, process_id=pk).first()
    if not postulante:
        return Response({'detail': 'Postulante seleccionado no encontrado'}, status=status.HTTP_400_BAD_REQUEST)

    hire_date = request.data.get('hireDate', date.today())
    
    # Crear o actualizar colaborador
    colaborador, created = RrhhColaborador.objects.update_or_create(
        dni=postulante.dni,
        defaults={
            'full_name': postulante.full_name,
            'personal_email': postulante.email,
            'personal_phone': postulante.phone,
            'area_id': proceso.area_id,
            'position_id': proceso.position_id,
            'hire_date': hire_date,
            'status': 'ACTIVE',
            'worker_category': 'PAYROLL',
            'source_system': 'RECRUITMENT'
        }
    )

    # Actualizar postulante y proceso
    postulante.status = 'HIRED'
    postulante.save()

    proceso.status = 'CLOSED'
    proceso.closed_at = timezone.now()
    proceso.hired_employee_id = colaborador.id
    proceso.save()

    return Response({
        'success': True,
        'message': f'Colaborador {colaborador.full_name} contratado exitosamente.',
        'employeeId': colaborador.id,
        'procesoId': proceso.id
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def hr_configuration(request):
    areas = RrhhArea.objects.all().order_by('name')
    cargos = RrhhCargo.objects.all().order_by('name')
    perfiles = RrhhPerfilCompetencia.objects.filter(is_active=True).order_by('name')
    mofs = RrhhMofCargo.objects.all()

    return Response({
        'areas': RrhhAreaSerializer(areas, many=True).data,
        'cargos': RrhhCargoSerializer(cargos, many=True).data,
        'perfiles': RrhhPerfilCompetenciaSerializer(perfiles, many=True).data,
        'mofs': RrhhMofCargoSerializer(mofs, many=True).data
    })


class RrhhRecursoOficialViewSet(viewsets.ModelViewSet):
    queryset = RrhhRecursoOficial.objects.filter(is_active=True).order_by('-uploaded_at')
    serializer_class = RrhhRecursoOficialSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def my_information(request):
    dni = request.query_params.get('dni')
    if not dni:
        # Colaborador por defecto o primer activo para demo
        colaborador = RrhhColaborador.objects.filter(status='ACTIVE').first()
    else:
        colaborador = RrhhColaborador.objects.filter(dni=dni).first()

    if not colaborador:
        return Response({'detail': 'Ficha de colaborador no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    documentos = RrhhDocumentoColaborador.objects.filter(employee_id=colaborador.id, visible_to_employee=True)
    remuneraciones = RrhhRemuneracion.objects.filter(employee_id=colaborador.id).order_by('-effective_from')
    area = RrhhArea.objects.filter(id=colaborador.area_id).first() if colaborador.area_id else None
    cargo = RrhhCargo.objects.filter(id=colaborador.position_id).first() if colaborador.position_id else None

    return Response({
        'colaborador': RrhhColaboradorSerializer(colaborador).data,
        'area': RrhhAreaSerializer(area).data if area else None,
        'cargo': RrhhCargoSerializer(cargo).data if cargo else None,
        'documentos': RrhhDocumentoColaboradorSerializer(documentos, many=True).data,
        'remuneraciones': RrhhRemuneracionSerializer(remuneraciones, many=True).data
    })

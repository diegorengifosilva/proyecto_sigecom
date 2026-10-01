import uuid
from datetime import datetime, date
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

from .models import (
    EmeBrigadista, EmeAptitudMedica, EmePrograma, EmeReporte,
    EmeEvidencia, EmeAccion, EmeEquipo, EmeInspeccion, EmePlantilla
)
from .serializers import (
    EmeBrigadistaSerializer, EmeAptitudMedicaSerializer, EmeProgramaSerializer,
    EmeReporteSerializer, EmeEvidenciaSerializer, EmeAccionSerializer,
    EmeEquipoSerializer, EmeInspeccionSerializer, EmePlantillaSerializer
)
from rrhh_api.models import RrhhColaborador, RrhhArea, RrhhCargo


class EmergenciasOverviewView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        now = timezone.now()
        year = now.year

        total_brigadistas = EmeBrigadista.objects.filter(is_active=True).count()
        por_tipo = list(
            EmeBrigadista.objects.filter(is_active=True)
            .values('brigade_type')
            .annotate(total=Count('id'))
        )

        # Aptitud médica
        aptos = EmeAptitudMedica.objects.filter(status='APTO').count()
        aptos_restriccion = EmeAptitudMedica.objects.filter(status='APTO_CON_RESTRICCIONES').count()
        no_aptos = EmeAptitudMedica.objects.filter(status='NO_APTO').count()

        # Programa de simulacros
        simulacros_total = EmePrograma.objects.filter(year=year).count()
        simulacros_ejecutados = EmePrograma.objects.filter(year=year, status='EXECUTED').count()
        simulacros_pendientes = EmePrograma.objects.filter(year=year, status__in=['PLANNED', 'RESCHEDULED']).count()

        # Acciones correctivas
        acciones_abiertas = EmeAccion.objects.filter(status__in=['OPEN', 'IN_PROGRESS']).count()
        acciones_cerradas = EmeAccion.objects.filter(status='CLOSED').count()

        # Equipos
        equipos_total = EmeEquipo.objects.count()
        equipos_operativos = EmeEquipo.objects.filter(status='OPERATIVO').count()
        equipos_mantenimiento = EmeEquipo.objects.exclude(status='OPERATIVO').count()

        return Response({
            'totalBrigadistas': total_brigadistas,
            'distribucionBrigadas': por_tipo,
            'aptitudMedica': {
                'aptos': aptos,
                'aptosConRestriccion': aptos_restriccion,
                'noAptos': no_aptos,
                'sinEvaluacion': max(0, total_brigadistas - (aptos + aptos_restriccion + no_aptos))
            },
            'simulacros': {
                'total': simulacros_total,
                'ejecutados': simulacros_ejecutados,
                'pendientes': simulacros_pendientes,
                'cumplimiento': round((simulacros_ejecutados / max(simulacros_total, 1)) * 100, 1)
            },
            'acciones': {
                'abiertas': acciones_abiertas,
                'cerradas': acciones_cerradas
            },
            'equipos': {
                'total': equipos_total,
                'operativos': equipos_operativos,
                'mantenimiento': equipos_mantenimiento
            }
        })


class EmeBrigadistaViewSet(viewsets.ModelViewSet):
    queryset = EmeBrigadista.objects.all().order_by('-created_at')
    serializer_class = EmeBrigadistaSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status', 'ACTIVE')
        brigade_type = self.request.query_params.get('brigadeType')
        search = self.request.query_params.get('search')

        if status_param and status_param != 'ALL':
            qs = qs.filter(is_active=(status_param.upper() == 'ACTIVE'))
        if brigade_type:
            qs = qs.filter(brigade_type=brigade_type)
        if search:
            # Buscar en colaboradores
            colabs = RrhhColaborador.objects.filter(
                Q(full_name__icontains=search) | Q(dni__icontains=search)
            ).values_list('id', flat=True)
            qs = qs.filter(employee_id__in=colabs)

        return qs


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def candidates_for_brigade(request):
    search = request.query_params.get('search', '')
    active_brigadista_ids = EmeBrigadista.objects.filter(is_active=True).values_list('employee_id', flat=True)
    
    colabs = RrhhColaborador.objects.filter(status='ACTIVE').exclude(id__in=active_brigadista_ids)
    if search:
        colabs = colabs.filter(Q(full_name__icontains=search) | Q(dni__icontains=search))
    
    colabs = colabs.order_by('full_name')[:30]
    
    results = []
    for c in colabs:
        area = RrhhArea.objects.filter(id=c.area_id).first() if c.area_id else None
        cargo = RrhhCargo.objects.filter(id=c.position_id).first() if c.position_id else None
        apt = EmeAptitudMedica.objects.filter(employee_id=c.id).first()
        results.append({
            'id': c.id,
            'dni': c.dni,
            'fullName': c.full_name,
            'area': area.name if area else None,
            'cargo': cargo.name if cargo else None,
            'aptitud': apt.status if apt else 'SIN_EVALUACION'
        })
    return Response(results)


class EmeProgramaViewSet(viewsets.ModelViewSet):
    queryset = EmePrograma.objects.all().order_by('planned_at')
    serializer_class = EmeProgramaSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        year = self.request.query_params.get('year')
        status_param = self.request.query_params.get('status')
        if year:
            qs = qs.filter(year=int(year))
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


@api_view(['PATCH'])
@permission_classes([permissions.AllowAny])
def reschedule_program(request, pk):
    item = EmePrograma.objects.filter(id=pk).first()
    if not item:
        return Response({'detail': 'Actividad no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    new_date = request.data.get('scheduledAt')
    reason = request.data.get('reason', 'Reprogramación solicitada')
    if new_date:
        item.current_scheduled_at = new_date
    item.last_reschedule_reason = reason
    item.reschedule_count += 1
    item.status = 'RESCHEDULED'
    item.save()
    return Response(EmeProgramaSerializer(item).data)


class EmeReporteViewSet(viewsets.ModelViewSet):
    queryset = EmeReporte.objects.all().order_by('-event_at')
    serializer_class = EmeReporteSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        report_type = self.request.query_params.get('reportType')
        if report_type:
            qs = qs.filter(report_type=report_type)
        return qs


class EmeAccionViewSet(viewsets.ModelViewSet):
    queryset = EmeAccion.objects.all().order_by('-due_at')
    serializer_class = EmeAccionSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        report_id = self.request.query_params.get('reportId')
        status_param = self.request.query_params.get('status')
        if report_id:
            qs = qs.filter(report_id=report_id)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class EmeEquipoViewSet(viewsets.ModelViewSet):
    queryset = EmeEquipo.objects.all().order_by('code')
    serializer_class = EmeEquipoSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        equipo_type = self.request.query_params.get('type')
        status_param = self.request.query_params.get('status')
        if equipo_type:
            qs = qs.filter(type=equipo_type)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class EmeInspeccionViewSet(viewsets.ModelViewSet):
    queryset = EmeInspeccion.objects.all().order_by('-planned_at')
    serializer_class = EmeInspeccionSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class EmePlantillaViewSet(viewsets.ModelViewSet):
    queryset = EmePlantilla.objects.filter(is_active=True).order_by('code')
    serializer_class = EmePlantillaSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

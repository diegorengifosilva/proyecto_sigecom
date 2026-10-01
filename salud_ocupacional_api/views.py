import json
import uuid
from datetime import datetime, date, timedelta
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

from .models import (
    EmoExpediente, EmoDocumentoMedico, EmoArchivoDrive,
    EmoSincronizacionDrive, EmoRegistroColeccion
)
from .serializers import (
    EmoExpedienteSerializer, EmoDocumentoMedicoSerializer,
    EmoArchivoDriveSerializer, EmoSincronizacionDriveSerializer,
    EmoRegistroColeccionSerializer
)
from rrhh_api.models import RrhhColaborador, RrhhArea, RrhhCargo


class OccupationalHealthSummaryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        now = timezone.now().date()
        in_30_days = now + timedelta(days=30)

        total_expedientes = EmoExpediente.objects.count()

        # Aptitudes de últimos expedientes
        aptos = EmeExpedientes_by_aptitud('APTO')
        con_restriccion = EmeExpedientes_by_aptitud('APTO_CON_RESTRICCION')
        no_aptos = EmeExpedientes_by_aptitud('NO_APTO')
        observados = EmeExpedientes_by_aptitud('OBSERVADO')

        # Vigencias
        vencidos = EmoExpediente.objects.filter(expires_at__date__lt=now).count()
        por_vencer = EmoExpediente.objects.filter(
            expires_at__date__gte=now,
            expires_at__date__lte=in_30_days
        ).count()
        vigentes = EmoExpediente.objects.filter(expires_at__date__gt=in_30_days).count()

        # Distribución por tipo de EMO
        por_tipo = list(
            EmoExpediente.objects.values('emo_type')
            .annotate(total=Count('id'))
        )

        return Response({
            'totalExpedientes': total_expedientes,
            'aptitudes': {
                'aptos': aptos,
                'aptosConRestriccion': con_restriccion,
                'noAptos': no_aptos,
                'observados': observados
            },
            'vigencias': {
                'vigentes': vigentes,
                'porVencer': por_vencer,
                'vencidos': vencidos
            },
            'distribucionTipos': por_tipo,
            'documentosRegistrados': EmoDocumentoMedico.objects.count()
        })


def EmeExpedientes_by_aptitud(aptitud_code):
    return EmoExpediente.objects.filter(aptitude_result__icontains=aptitud_code).count()


class EmoExpedienteViewSet(viewsets.ModelViewSet):
    queryset = EmoExpediente.objects.all().order_by('-scheduled_at')
    serializer_class = EmoExpedienteSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        emo_type = self.request.query_params.get('emoType')
        search = self.request.query_params.get('search')
        employee_id = self.request.query_params.get('employeeId')

        if status_param:
            qs = qs.filter(status=status_param)
        if emo_type:
            qs = qs.filter(emo_type=emo_type)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if search:
            colabs = RrhhColaborador.objects.filter(
                Q(full_name__icontains=search) | Q(dni__icontains=search)
            ).values_list('id', flat=True)
            qs = qs.filter(Q(code__icontains=search) | Q(employee_id__in=colabs))
        return qs


@api_view(['PATCH'])
@permission_classes([permissions.AllowAny])
def register_aptitude(request, pk):
    expediente = EmoExpediente.objects.filter(id=pk).first()
    if not expediente:
        return Response({'detail': 'Expediente no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    if 'aptitudeResult' in data:
        expediente.aptitude_result = data['aptitudeResult']
    if 'operationalRestrictions' in data:
        expediente.operational_restrictions = data['operationalRestrictions']
    if 'brigadeRestrictionsCompatible' in data:
        expediente.brigade_restrictions_compatible = bool(data['brigadeRestrictionsCompatible'])
    if 'clinicalObservations' in data:
        expediente.clinical_observations = data['clinicalObservations']
    if 'doctorName' in data:
        expediente.doctor_name = data['doctorName']
    if 'issuedAt' in data and data['issuedAt']:
        expediente.issued_at = data['issuedAt']
    if 'expiresAt' in data and data['expiresAt']:
        expediente.expires_at = data['expiresAt']
    
    expediente.status = 'EVALUATED'
    expediente.save()
    return Response(EmoExpedienteSerializer(expediente).data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def occupational_employees(request):
    search = request.query_params.get('search', '')
    colabs = RrhhColaborador.objects.filter(status='ACTIVE')
    if search:
        colabs = colabs.filter(Q(full_name__icontains=search) | Q(dni__icontains=search))

    colabs = colabs.order_by('full_name')[:50]
    results = []
    today = timezone.now().date()

    for c in colabs:
        area = RrhhArea.objects.filter(id=c.area_id).first() if c.area_id else None
        cargo = RrhhCargo.objects.filter(id=c.position_id).first() if c.position_id else None
        ultimo_emo = EmoExpediente.objects.filter(employee_id=c.id).order_by('-scheduled_at').first()

        estado_vigencia = 'SIN_EMO'
        if ultimo_emo and ultimo_emo.expires_at:
            exp_date = ultimo_emo.expires_at.date() if isinstance(ultimo_emo.expires_at, datetime) else ultimo_emo.expires_at
            if exp_date < today:
                estado_vigencia = 'VENCIDO'
            elif exp_date <= today + timedelta(days=30):
                estado_vigencia = 'POR_VENCER'
            else:
                estado_vigencia = 'VIGENTE'

        results.append({
            'id': c.id,
            'dni': c.dni,
            'fullName': c.full_name,
            'area': area.name if area else None,
            'cargo': cargo.name if cargo else None,
            'ultimoEmo': {
                'id': ultimo_emo.id if ultimo_emo else None,
                'codigo': ultimo_emo.code if ultimo_emo else None,
                'resultado': ultimo_emo.aptitude_result if ultimo_emo else None,
                'restricciones': ultimo_emo.operational_restrictions if ultimo_emo else None,
                'vence': ultimo_emo.expires_at if ultimo_emo else None,
                'estadoVigencia': estado_vigencia
            }
        })

    return Response(results)


class EmoDocumentoMedicoViewSet(viewsets.ModelViewSet):
    queryset = EmoDocumentoMedico.objects.all().order_by('-issued_at')
    serializer_class = EmoDocumentoMedicoSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        case_id = self.request.query_params.get('caseId')
        employee_id = self.request.query_params.get('employeeId')
        if case_id:
            qs = qs.filter(occupational_emo_case_id=case_id)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def drive_sync_runs(request):
    runs = EmoSincronizacionDrive.objects.all().order_by('-started_at')[:20]
    return Response(EmoSincronizacionDriveSerializer(runs, many=True).data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def drive_sync_files(request):
    files = EmoArchivoDrive.objects.all().order_by('-drive_modified_at')[:50]
    return Response(EmoArchivoDriveSerializer(files, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def compat_collection(request, resource):
    """
    Manejo de catálogos y colecciones operativas (clínicas, protocolos, clientes)
    """
    if request.method == 'GET':
        registros = EmoRegistroColeccion.objects.filter(collection=resource)
        items = []
        for r in registros:
            try:
                parsed = json.loads(r.data)
                parsed['id'] = r.id
                items.append(parsed)
            except Exception:
                items.append({'id': r.id, 'data': r.data})
        return Response(items)
    elif request.method == 'POST':
        item = EmoRegistroColeccion.objects.create(
            collection=resource,
            data=json.dumps(request.data)
        )
        return Response({'success': True, 'id': item.id}, status=status.HTTP_201_CREATED)

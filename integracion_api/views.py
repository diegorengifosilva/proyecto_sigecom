import json
import uuid
from datetime import datetime, date, timedelta
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

from .models import ProyProyectoOrigen, IntEjecucion, IntEnlaceEntidad, IntIncidencia
from .serializers import (
    ProyProyectoOrigenSerializer, IntEjecucionSerializer,
    IntEnlaceEntidadSerializer, IntIncidenciaSerializer
)
from rrhh_api.models import RrhhColaborador, RrhhArea, RrhhCargo
from proyectos_api.models import ProyectoEv


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def commercial_sync_view(request):
    """
    Sincronización Comercial -> Proyectos (Contrato commercial-project-opening-contract.md)
    """
    data = request.data
    external_run_id = str(uuid.uuid4())
    
    run = IntEjecucion.objects.create(
        external_run_id=external_run_id,
        source_system='SIGECOM_COMERCIAL',
        target_modules=['PROJECT_MANAGEMENT'],
        mode='DIRECT_API',
        status='IN_PROGRESS',
        received_count=1
    )

    try:
        quote_id_raw = data.get('commercialQuotationId') or data.get('commercialQuoteId') or data.get('id', 1)
        try:
            quote_id_num = int(''.join(filter(str.isdigit, str(quote_id_raw))) or 1)
        except Exception:
            quote_id_num = 1

        opening_id_num = int(data.get('commercialOpeningId') or quote_id_num)
        client_id_num = int(data.get('commercialClientId') or 1)

        project_code = data.get('code') or data.get('projectCode') or f"PRY-{quote_id_raw}"
        normalized_code = project_code.strip().upper().replace(" ", "")
        project_name = data.get('name') or data.get('projectName') or f"Proyecto {project_code}"
        client_name = data.get('clientName') or data.get('client_name') or 'Cliente Comercial'
        client_ruc = data.get('clientRuc') or data.get('client_ruc')
        po_number = data.get('purchaseOrderNumber') or data.get('order_number')
        order_total = data.get('orderTotal') or data.get('total') or 0
        budget = data.get('approvedBudget') or data.get('budget') or order_total
        currency = data.get('currency', 'PEN')

        # 1. Guardar en proy_proyecto_origen
        origen, created = ProyProyectoOrigen.objects.update_or_create(
            code=project_code,
            defaults={
                'normalized_code': normalized_code,
                'name': project_name,
                'commercial_opening_id': opening_id_num,
                'commercial_quotation_id': quote_id_num,
                'commercial_client_id': client_id_num,
                'client_name': client_name,
                'client_ruc': client_ruc,
                'purchase_order_number': po_number,
                'currency': currency,
                'order_total': order_total,
                'approved_budget': budget,
                'source_payload': json.dumps(data),
                'status': 'AWARDED'
            }
        )

        # 2. Sincronizar en ProyectoEv
        proyecto_ev = ProyectoEv.objects.filter(codigo=project_code).first()
        today = date.today()
        user_id = request.user.id if (request.user and request.user.is_authenticated) else 1
        if not proyecto_ev:
            proyecto_ev = ProyectoEv.objects.create(
                codigo=project_code,
                nombre=project_name,
                descripcion=data.get('description', f"Proyecto importado desde Comercial {quote_id_raw}"),
                presupuesto_gastos=budget or 100000.00,
                presupuesto_aprobado=float(budget or 100000.00),
                moneda=currency,
                cliente=client_name,
                estado='Planificación',
                etapa_actual='planificacion',
                fecha_inicio=today,
                fecha_fin=today + timedelta(days=90),
                usuario_id=user_id
            )
        else:
            proyecto_ev.nombre = project_name
            proyecto_ev.cliente = client_name
            if budget:
                proyecto_ev.presupuesto_gastos = budget
                proyecto_ev.presupuesto_aprobado = float(budget)
            proyecto_ev.save()

        # 3. Registrar enlace
        IntEnlaceEntidad.objects.update_or_create(
            source_system='SIGECOM_COMERCIAL',
            source_entity='cotizacion',
            source_external_id=str(quote_id_raw),
            target_module='PROJECT_MANAGEMENT',
            defaults={
                'run_id': run.id,
                'canonical_entity': 'Proyecto',
                'canonical_id': str(proyecto_ev.id),
                'target_entity_id': origen.id,
                'metadata': {'commercialQuotationId': quote_id_raw, 'projectCode': project_code},
                'active': True
            }
        )

        run.status = 'SUCCESS'
        run.applied_count = 1
        msg = f"Proyecto {project_code} sincronizado exitosamente con ID {proyecto_ev.id}."
        run.summary = {'message': msg, 'projectId': proyecto_ev.id, 'code': project_code}
        run.completed_at = timezone.now()
        run.save()

        return Response({
            'success': True,
            'message': msg,
            'projectId': proyecto_ev.id,
            'projectCode': project_code,
            'origenId': origen.id
        }, status=status.HTTP_200_OK)

    except Exception as e:
        run.status = 'FAILED'
        run.error_count = 1
        run.summary = {'error': str(e)}
        run.completed_at = timezone.now()
        run.save()

        IntIncidencia.objects.create(
            run_id=run.id,
            severity='ERROR',
            code='COMMERCIAL_SYNC_FAIL',
            message=str(e),
            details={'payload': data, 'error': str(e)}
        )

        return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def hr_sync_employees_view(request):
    """
    Sincronización Personas -> RRHH / HSEQ (Contrato README-sincronizacion-comercial-personas.md)
    """
    data = request.data
    employees_data = data.get('employees', [])
    if isinstance(data, list):
        employees_data = data

    run = IntEjecucion.objects.create(
        external_run_id=str(uuid.uuid4()),
        source_system='SIGECOM_PERSONAS',
        target_modules=['HUMAN_RESOURCES', 'HSEQ_TRAINING'],
        mode='BATCH_SYNC',
        status='IN_PROGRESS',
        received_count=len(employees_data)
    )

    applied = 0
    warnings = 0
    errors = 0

    for emp in employees_data:
        dni = emp.get('dni')
        full_name = emp.get('fullName') or emp.get('full_name') or f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()

        if not dni:
            warnings += 1
            IntIncidencia.objects.create(
                run_id=run.id,
                severity='WARNING',
                code='MISSING_DNI',
                message=f"Registro omitido: falta DNI para {full_name}",
                details={'raw': emp, 'reason': 'MISSING_DNI'}
            )
            continue

        try:
            # Buscar área si se proporciona
            area_id = None
            if emp.get('areaName'):
                area_obj, _ = RrhhArea.objects.get_or_create(name=emp.get('areaName'))
                area_id = area_obj.id

            cargo_id = None
            if emp.get('positionName') or emp.get('cargo'):
                pos_name = emp.get('positionName') or emp.get('cargo')
                cargo_obj, _ = RrhhCargo.objects.get_or_create(name=pos_name)
                cargo_id = cargo_obj.id

            colaborador, _ = RrhhColaborador.objects.update_or_create(
                dni=str(dni).strip(),
                defaults={
                    'full_name': full_name or 'Colaborador Sincronizado',
                    'email': emp.get('email'),
                    'personal_phone': emp.get('phone'),
                    'hire_date': emp.get('hireDate') or emp.get('hire_date') or date.today(),
                    'status': 'ACTIVE',
                    'area_id': area_id,
                    'position_id': cargo_id,
                    'source_system': 'SIGECOM_PERSONAS'
                }
            )

            IntEnlaceEntidad.objects.update_or_create(
                source_system='SIGECOM_PERSONAS',
                source_entity='usuario',
                source_external_id=str(emp.get('id', dni)),
                target_module='HUMAN_RESOURCES',
                defaults={
                    'run_id': run.id,
                    'canonical_entity': 'Colaborador',
                    'canonical_id': colaborador.id,
                    'target_entity_id': colaborador.id,
                    'metadata': {'dni': str(dni).strip(), 'fullName': full_name},
                    'active': True
                }
            )
            applied += 1

        except Exception as ex:
            errors += 1
            IntIncidencia.objects.create(
                run_id=run.id,
                severity='ERROR',
                code='EMPLOYEE_SYNC_ERROR',
                message=str(ex),
                details={'raw': emp, 'error': str(ex)}
            )

    run.applied_count = applied
    run.warning_count = warnings
    run.error_count = errors
    run.status = 'SUCCESS' if errors == 0 else ('PARTIAL' if applied > 0 else 'FAILED')
    summary_text = f"Sincronizados {applied} colaboradores. Alertas: {warnings}, Errores: {errors}."
    run.summary = {'applied': applied, 'warnings': warnings, 'errors': errors, 'text': summary_text}
    run.completed_at = timezone.now()
    run.save()

    return Response({
        'success': run.status in ['SUCCESS', 'PARTIAL'],
        'runId': run.id,
        'summary': run.summary,
        'applied': applied,
        'warnings': warnings,
        'errors': errors
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def hr_sync_deactivate_view(request):
    """
    Desactiva colaboradores cesados en SIGECOM
    """
    dni = request.data.get('dni')
    employee_id = request.data.get('employeeId')
    termination_date = request.data.get('terminationDate', date.today())

    colaborador = None
    if dni:
        colaborador = RrhhColaborador.objects.filter(dni=dni).first()
    elif employee_id:
        colaborador = RrhhColaborador.objects.filter(id=employee_id).first()

    if not colaborador:
        return Response({'detail': 'Colaborador no encontrado para desactivar'}, status=status.HTTP_404_NOT_FOUND)

    colaborador.status = 'INACTIVE'
    colaborador.termination_date = termination_date
    colaborador.save()

    return Response({
        'success': True,
        'message': f"Colaborador {colaborador.full_name} desactivado con fecha {termination_date}."
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def integration_history(request):
    runs = IntEjecucion.objects.all().order_by('-started_at')[:30]
    return Response(IntEjecucionSerializer(runs, many=True).data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def integration_incidencias(request):
    incidencias = IntIncidencia.objects.all().order_by('-created_at')[:50]
    return Response(IntIncidenciaSerializer(incidencias, many=True).data)

import uuid
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth.hashers import make_password

from .models import SegUsuario, SegModulo, SegUsuarioModulo, SegAuditoria
from .serializers import (
    SegUsuarioSerializer, SegModuloSerializer, SegUsuarioModuloSerializer,
    SegAuditoriaSerializer
)
from rrhh_api.models import RrhhColaborador


class SegUsuarioViewSet(viewsets.ModelViewSet):
    queryset = SegUsuario.objects.all().order_by('-created_at')
    serializer_class = SegUsuarioSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        search = self.request.query_params.get('search')
        is_active = self.request.query_params.get('isActive')

        if role:
            qs = qs.filter(role=role)
        if is_active is not None:
            qs = qs.filter(is_active=(is_active.lower() == 'true'))
        if search:
            colabs = RrhhColaborador.objects.filter(
                Q(full_name__icontains=search) | Q(dni__icontains=search)
            ).values_list('id', flat=True)
            qs = qs.filter(Q(username__icontains=search) | Q(employee_id__in=colabs))
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data
        username = data.get('username')
        password = data.get('password', 'Temporal123*')
        role = data.get('role', 'USER')
        employee_id = data.get('employeeId')
        modules_access = data.get('modules', [])

        if SegUsuario.objects.filter(username=username).exists():
            return Response({'detail': 'El nombre de usuario ya está registrado'}, status=status.HTTP_400_BAD_REQUEST)

        user = SegUsuario.objects.create(
            username=username,
            password_hash=make_password(password),
            role=role,
            employee_id=employee_id,
            is_active=True,
            must_change_password=True
        )

        for mod in modules_access:
            SegUsuarioModulo.objects.create(
                account_id=user.id,
                module_id=mod.get('moduleId'),
                level=mod.get('level', 'USER')
            )

        # Registrar auditoría
        SegAuditoria.objects.create(
            action='CREATE_USER',
            entity_type='SegUsuario',
            entity_id=user.id,
            metadata=f"Usuario {username} creado con rol {role}"
        )

        return Response(SegUsuarioSerializer(user).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        data = request.data

        if 'role' in data:
            user.role = data['role']
        if 'isActive' in data:
            user.is_active = bool(data['isActive'])
        if 'mustChangePassword' in data:
            user.must_change_password = bool(data['mustChangePassword'])
        if 'password' in data and data['password']:
            user.password_hash = make_password(data['password'])
            user.token_version += 1
        user.save()

        if 'modules' in data:
            SegUsuarioModulo.objects.filter(account_id=user.id).delete()
            for mod in data['modules']:
                SegUsuarioModulo.objects.create(
                    account_id=user.id,
                    module_id=mod.get('moduleId'),
                    level=mod.get('level', 'USER')
                )

        return Response(SegUsuarioSerializer(user).data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def list_modules(request):
    modules = SegModulo.objects.all().order_by('name')
    return Response(SegModuloSerializer(modules, many=True).data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def employees_without_account(request):
    assigned_ids = SegUsuario.objects.filter(employee_id__isnull=False).values_list('employee_id', flat=True)
    unassigned = RrhhColaborador.objects.filter(status='ACTIVE').exclude(id__in=assigned_ids).order_by('full_name')[:50]
    
    return Response([
        {
            'id': c.id,
            'dni': c.dni,
            'fullName': c.full_name,
            'email': c.email or c.personal_email
        }
        for c in unassigned
    ])


class SegAuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SegAuditoria.objects.all().order_by('-created_at')
    serializer_class = SegAuditoriaSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        action = self.request.query_params.get('action')
        entity_type = self.request.query_params.get('entityType')
        if action:
            qs = qs.filter(action=action)
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        return qs[:100]

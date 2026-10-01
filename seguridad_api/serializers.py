from rest_framework import serializers
from .models import SegUsuario, SegModulo, SegUsuarioModulo, SegAuditoria
from rrhh_api.models import RrhhColaborador


class SegModuloSerializer(serializers.ModelSerializer):
    class Meta:
        model = SegModulo
        fields = '__all__'


class SegUsuarioModuloSerializer(serializers.ModelSerializer):
    modulo_codigo = serializers.SerializerMethodField()
    modulo_nombre = serializers.SerializerMethodField()

    class Meta:
        model = SegUsuarioModulo
        fields = '__all__'

    def get_modulo_codigo(self, obj):
        mod = SegModulo.objects.filter(id=obj.module_id).first()
        return mod.code if mod else None

    def get_modulo_nombre(self, obj):
        mod = SegModulo.objects.filter(id=obj.module_id).first()
        return mod.name if mod else None


class SegUsuarioSerializer(serializers.ModelSerializer):
    colaborador_nombre = serializers.SerializerMethodField()
    colaborador_dni = serializers.SerializerMethodField()
    modulos = serializers.SerializerMethodField()

    class Meta:
        model = SegUsuario
        fields = [
            'id', 'username', 'role', 'is_active', 'token_version',
            'last_login_at', 'must_change_password', 'employee_id',
            'created_at', 'updated_at', 'colaborador_nombre',
            'colaborador_dni', 'modulos'
        ]

    def get_colaborador_nombre(self, obj):
        if obj.employee_id:
            c = RrhhColaborador.objects.filter(id=obj.employee_id).first()
            return c.full_name if c else None
        return None

    def get_colaborador_dni(self, obj):
        if obj.employee_id:
            c = RrhhColaborador.objects.filter(id=obj.employee_id).first()
            return c.dni if c else None
        return None

    def get_modulos(self, obj):
        relaciones = SegUsuarioModulo.objects.filter(account_id=obj.id)
        return SegUsuarioModuloSerializer(relaciones, many=True).data


class SegAuditoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SegAuditoria
        fields = '__all__'

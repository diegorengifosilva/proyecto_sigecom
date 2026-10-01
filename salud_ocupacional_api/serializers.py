from rest_framework import serializers
from .models import (
    EmoExpediente, EmoDocumentoMedico, EmoArchivoDrive,
    EmoSincronizacionDrive, EmoRegistroColeccion
)
from rrhh_api.models import RrhhColaborador, RrhhArea, RrhhCargo


class EmoExpedienteSerializer(serializers.ModelSerializer):
    colaborador_nombre = serializers.SerializerMethodField()
    colaborador_dni = serializers.SerializerMethodField()
    colaborador_area = serializers.SerializerMethodField()
    colaborador_cargo = serializers.SerializerMethodField()
    documentos_count = serializers.SerializerMethodField()

    class Meta:
        model = EmoExpediente
        fields = '__all__'

    def get_colaborador_nombre(self, obj):
        c = RrhhColaborador.objects.filter(id=obj.employee_id).first()
        return c.full_name if c else 'No identificado'

    def get_colaborador_dni(self, obj):
        c = RrhhColaborador.objects.filter(id=obj.employee_id).first()
        return c.dni if c else None

    def get_colaborador_area(self, obj):
        c = RrhhColaborador.objects.filter(id=obj.employee_id).first()
        if c and c.area_id:
            area = RrhhArea.objects.filter(id=c.area_id).first()
            return area.name if area else None
        return None

    def get_colaborador_cargo(self, obj):
        c = RrhhColaborador.objects.filter(id=obj.employee_id).first()
        if c and c.position_id:
            cargo = RrhhCargo.objects.filter(id=c.position_id).first()
            return cargo.name if cargo else None
        return None

    def get_documentos_count(self, obj):
        return EmoDocumentoMedico.objects.filter(occupational_emo_case_id=obj.id).count()


class EmoDocumentoMedicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmoDocumentoMedico
        fields = '__all__'


class EmoArchivoDriveSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmoArchivoDrive
        fields = '__all__'


class EmoSincronizacionDriveSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmoSincronizacionDrive
        fields = '__all__'


class EmoRegistroColeccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmoRegistroColeccion
        fields = '__all__'

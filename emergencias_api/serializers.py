from rest_framework import serializers
from .models import (
    EmeBrigadista, EmeAptitudMedica, EmePrograma, EmeReporte,
    EmeEvidencia, EmeAccion, EmeEquipo, EmeInspeccion, EmePlantilla
)
from rrhh_api.models import RrhhColaborador, RrhhArea, RrhhCargo


class EmeBrigadistaSerializer(serializers.ModelSerializer):
    colaborador_nombre = serializers.SerializerMethodField()
    colaborador_dni = serializers.SerializerMethodField()
    colaborador_area = serializers.SerializerMethodField()
    colaborador_cargo = serializers.SerializerMethodField()
    aptitud_medica = serializers.SerializerMethodField()

    class Meta:
        model = EmeBrigadista
        fields = '__all__'

    def get_colaborador_nombre(self, obj):
        colab = RrhhColaborador.objects.filter(id=obj.employee_id).first()
        return colab.full_name if colab else 'No asignado'

    def get_colaborador_dni(self, obj):
        colab = RrhhColaborador.objects.filter(id=obj.employee_id).first()
        return colab.dni if colab else None

    def get_colaborador_area(self, obj):
        colab = RrhhColaborador.objects.filter(id=obj.employee_id).first()
        if colab and colab.area_id:
            area = RrhhArea.objects.filter(id=colab.area_id).first()
            return area.name if area else None
        return None

    def get_colaborador_cargo(self, obj):
        colab = RrhhColaborador.objects.filter(id=obj.employee_id).first()
        if colab and colab.position_id:
            cargo = RrhhCargo.objects.filter(id=colab.position_id).first()
            return cargo.name if cargo else None
        return None

    def get_aptitud_medica(self, obj):
        apt = EmeAptitudMedica.objects.filter(employee_id=obj.employee_id).first()
        if apt:
            return {
                'status': apt.status,
                'restrictions': apt.restrictions,
                'validUntil': apt.valid_until
            }
        return {'status': 'SIN_EVALUACION', 'restrictions': None, 'validUntil': None}


class EmeAptitudMedicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmeAptitudMedica
        fields = '__all__'


class EmeProgramaSerializer(serializers.ModelSerializer):
    evidencias_count = serializers.SerializerMethodField()

    class Meta:
        model = EmePrograma
        fields = '__all__'

    def get_evidencias_count(self, obj):
        return EmeEvidencia.objects.filter(program_item_id=obj.id).count()


class EmeReporteSerializer(serializers.ModelSerializer):
    acciones_count = serializers.SerializerMethodField()
    evidencias_count = serializers.SerializerMethodField()

    class Meta:
        model = EmeReporte
        fields = '__all__'

    def get_acciones_count(self, obj):
        return EmeAccion.objects.filter(report_id=obj.id).count()

    def get_evidencias_count(self, obj):
        return EmeEvidencia.objects.filter(report_id=obj.id).count()


class EmeEvidenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmeEvidencia
        fields = '__all__'


class EmeAccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmeAccion
        fields = '__all__'


class EmeEquipoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmeEquipo
        fields = '__all__'


class EmeInspeccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmeInspeccion
        fields = '__all__'


class EmePlantillaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmePlantilla
        fields = '__all__'

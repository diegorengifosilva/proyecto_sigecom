from rest_framework import serializers
from .models import (
    RrhhArea, RrhhCargo, RrhhPerfilCompetencia, RrhhCompetencia,
    RrhhPerfilCompetenciaDetalle, RrhhColaborador, RrhhDocumentoColaborador,
    RrhhProcesoSeleccion, RrhhPostulante, RrhhTareaSeleccion,
    RrhhDocumentoSeleccion, RrhhAceptacionDocumento, RrhhRecursoOficial,
    RrhhMofCargo, RrhhRemuneracion, RrhhLoteSincronizacion,
    RrhhRegistroSincronizacion
)


class RrhhAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhArea
        fields = '__all__'


class RrhhCargoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhCargo
        fields = '__all__'


class RrhhPerfilCompetenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhPerfilCompetencia
        fields = '__all__'


class RrhhCompetenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhCompetencia
        fields = '__all__'


class RrhhPerfilCompetenciaDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhPerfilCompetenciaDetalle
        fields = '__all__'


class RrhhColaboradorSerializer(serializers.ModelSerializer):
    area_nombre = serializers.SerializerMethodField()
    cargo_nombre = serializers.SerializerMethodField()

    class Meta:
        model = RrhhColaborador
        fields = '__all__'

    def get_area_nombre(self, obj):
        if obj.area_id:
            area = RrhhArea.objects.filter(id=obj.area_id).first()
            return area.name if area else None
        return None

    def get_cargo_nombre(self, obj):
        if obj.position_id:
            cargo = RrhhCargo.objects.filter(id=obj.position_id).first()
            return cargo.name if cargo else None
        return None


class RrhhDocumentoColaboradorSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhDocumentoColaborador
        fields = '__all__'


class RrhhProcesoSeleccionSerializer(serializers.ModelSerializer):
    area_nombre = serializers.SerializerMethodField()
    cargo_nombre = serializers.SerializerMethodField()
    candidatos_count = serializers.SerializerMethodField()

    class Meta:
        model = RrhhProcesoSeleccion
        fields = '__all__'

    def get_area_nombre(self, obj):
        if obj.area_id:
            area = RrhhArea.objects.filter(id=obj.area_id).first()
            return area.name if area else None
        return None

    def get_cargo_nombre(self, obj):
        if obj.position_id:
            cargo = RrhhCargo.objects.filter(id=obj.position_id).first()
            return cargo.name if cargo else None
        return None

    def get_candidatos_count(self, obj):
        return RrhhPostulante.objects.filter(process_id=obj.id).count()


class RrhhPostulanteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhPostulante
        fields = '__all__'


class RrhhTareaSeleccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhTareaSeleccion
        fields = '__all__'


class RrhhDocumentoSeleccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhDocumentoSeleccion
        fields = '__all__'


class RrhhAceptacionDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhAceptacionDocumento
        fields = '__all__'


class RrhhRecursoOficialSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhRecursoOficial
        fields = '__all__'


class RrhhMofCargoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhMofCargo
        fields = '__all__'


class RrhhRemuneracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhRemuneracion
        fields = '__all__'


class RrhhLoteSincronizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhLoteSincronizacion
        fields = '__all__'


class RrhhRegistroSincronizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhRegistroSincronizacion
        fields = '__all__'

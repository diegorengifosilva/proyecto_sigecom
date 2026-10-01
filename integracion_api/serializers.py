from rest_framework import serializers
from .models import ProyProyectoOrigen, IntEjecucion, IntEnlaceEntidad, IntIncidencia


class ProyProyectoOrigenSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProyProyectoOrigen
        fields = '__all__'


class IntEjecucionSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntEjecucion
        fields = '__all__'


class IntEnlaceEntidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntEnlaceEntidad
        fields = '__all__'


class IntIncidenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntIncidencia
        fields = '__all__'

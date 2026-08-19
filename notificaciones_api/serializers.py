from rest_framework import serializers
from .models import Notificacion

class NotificacionSerializer(serializers.ModelSerializer):
    modulo = serializers.SerializerMethodField()

    class Meta:
        model = Notificacion
        fields = [
            'id_notificacion',
            'tipo',
            'modulo',
            'id_modulo',
            'titulo',
            'descripcion',
            'leido',
            'fecha',
            'cantidad',
            'referencia_id',
            'metadata'
        ]

    def get_modulo(self, obj):
        return obj.id_modulo.nombre.lower() if obj.id_modulo else ""

from rest_framework import serializers
from .models import SugerenciaQueja
from core.models import Gerencia

class GerenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gerencia
        fields = ['id_gerencia', 'nombre', 'id_encargado', 'activo']

class SugerenciaQuejaSerializer(serializers.ModelSerializer):
    area_nombre = serializers.ReadOnlyField(source='id_area.nombre')
    gerencia_nombre = serializers.ReadOnlyField(source='id_gerencia.nombre')
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = SugerenciaQueja
        fields = [
            'id_registro',
            'anno',
            'mes',
            'fecha',
            'asunto',
            'descripcion',
            'solucion',
            'id_area',
            'area_nombre',
            'id_gerencia',
            'gerencia_nombre',
            'id_usuario',
            'usuario_nombre',
            'estado',
            'anonimo',
            'tipo',
            'prioridad',
        ]

    def get_usuario_nombre(self, obj):
        # Si es anónimo, protegemos la identidad del usuario en el frontend
        if obj.anonimo == 1:
            return "Anónimo"
        return obj.id_usuario.nombre_completo if obj.id_usuario else "Usuario Desconocido"

from .models import SugerenciaAdjunto, SugerenciaSeguimiento

class SugerenciaAdjuntoSerializer(serializers.ModelSerializer):
    subido_por_nombre = serializers.ReadOnlyField(source='subido_por.nombre_completo')
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = SugerenciaAdjunto
        fields = ['id_adjunto', 'id_registro', 'archivo', 'nombre', 'fecha_subida', 'subido_por', 'subido_por_nombre', 'archivo_url']

    def get_archivo_url(self, obj):
        request = self.context.get('request')
        path = f"/api/buzon/adjuntos/{obj.id_adjunto}/descargar/"
        if request:
            return request.build_absolute_uri(path)
        return path

class SugerenciaSeguimientoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre_completo')

    class Meta:
        model = SugerenciaSeguimiento
        fields = ['id_seguimiento', 'id_registro', 'detalle', 'fecha', 'usuario', 'usuario_nombre']

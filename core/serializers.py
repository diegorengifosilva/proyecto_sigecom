# core/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Cliente,
    Representante
)
from django.utils.timezone import localtime
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from decimal import Decimal
from datetime import timezone
from django.utils.dateparse import parse_datetime

class ClienteSerializer(serializers.ModelSerializer):
    activo = serializers.CharField(max_length=1, required=False)

    class Meta:
        model = Cliente
        fields = "__all__"

    def to_representation(self, instance):
        """Lógica de SALIDA (JSON para React)"""
        # Obtenemos la representación estándar (ahora segura gracias al conversor en settings.py)
        representation = super().to_representation(instance)
        
        # 1. Relleno de ceros en el ID (ej: 00256)
        representation['id_cliente_formateado'] = str(instance.id_cliente).zfill(5)
        
        # 2. Convertimos el "1"/"0" de la DB a booleano para el Switch de React
        representation['activo'] = instance.activo == "1"
        
        # Nota: La limpieza de fechas '0000-00-00' ya ocurre en el motor de DB (settings.py)
            
        return representation

    def to_internal_value(self, data):
        """Lógica de ENTRADA (De React a la DB)"""
        resource_data = data.copy()
        
        if 'activo' in resource_data:
            val = resource_data['activo']
            # Convertimos true/false o "1"/"0" al formato de la DB
            resource_data['activo'] = "1" if val is True or val == "1" else "0"
            
        return super().to_internal_value(resource_data)

class RepresentanteSerializer(serializers.ModelSerializer):
    # Campo calculado para mostrar el ID con ceros (ej: 00012)
    id_rep_formateado = serializers.SerializerMethodField()
    
    # Traer el nombre de la empresa para facilitar la vista en React
    nombre_empresa = serializers.ReadOnlyField(source='id_cliente.nombre')

    class Meta:
        model = Representante
        fields = [
            'id_representante', 
            'id_rep_formateado',
            'id_cliente', 
            'nombre_empresa',
            'nombre_representante', 
            'cargo', 
            'telefono', 
            'movil', 
            'email', 
            'direccion', 
            'activo'
        ]

    def get_id_rep_formateado(self, obj):
        # Mantenemos la lógica de ceros a la izquierda
        return str(obj.id_representante).zfill(5)

    def to_representation(self, instance):
        """Lógica de SALIDA: JSON para React"""
        representation = super().to_representation(instance)
        
        # Convertimos el activo (int) a booleano para los switches de React (1 -> True)
        representation['activo'] = instance.activo == 1
        
        return representation

    def to_internal_value(self, data):
        """Lógica de ENTRADA: De React a la base de datos"""
        resource_data = data.copy()
        
        # Convertimos de vuelta a Integer para MySQL (True -> 1)
        if 'activo' in resource_data:
            val = resource_data['activo']
            resource_data['activo'] = 1 if val is True or val == 1 or str(val) == "1" else 0
            
        return super().to_internal_value(resource_data)

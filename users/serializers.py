# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
import uuid
from .models import (
    Usuario,
    Area,
    Cargo,
)
from django.contrib.auth import get_user_model
from django.utils.timezone import localtime
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from decimal import Decimal
from datetime import timezone

User = get_user_model()

# Usuario
class UsuarioSerializer(serializers.ModelSerializer):
    # Acceso a relaciones
    area_nombre = serializers.ReadOnlyField(source='id_area.nombre')
    cargo_nombre = serializers.ReadOnlyField(source='id_cargo.nombre')
    
    # Nuevos campos para el banco
    # 1. Obtenemos el nombre del banco a través de la relación id_banco
    banco_nombre = serializers.ReadOnlyField(source='id_banco.nombre')
    # 2. Obtenemos el ID (esto es lo que causaba el error)
    banco_id = serializers.ReadOnlyField(source='id_banco.id_banco')

    class Meta:
        model = Usuario
        fields = [
            'id_usuario', 
            'usuario', 
            'nombre_completo', 
            'correo', 
            'dni', 
            'id_area', 
            'area_nombre', 
            'id_cargo', 
            'cargo_nombre', 
            'id_banco',      # El ID de la relación (ForeignKey)
            'banco_id',      # Campo declarado arriba (DEBE estar aquí)
            'banco_nombre',  # Nombre del banco para el frontend
            'nro_cuenta', 
            'activo'
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        nombre = data.get("nombre_completo") or ""
        if nombre.strip().upper() == "PEDRO EDUARDO BONILLA CORNEJO":
            data["nombre_completo"] = "Eduardo Bonilla Cornejo"
        elif nombre.strip().upper() == "ANA CLAUDIA CARBONEL GOMERO":
            data["nombre_completo"] = "Claudia Carbonel Gomero"
        return data

# Token Perzonalizado para login
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['user_id'] = user.usuario
        nombre = (user.nombre_completo or '').strip()
        if nombre.upper() == "PEDRO EDUARDO BONILLA CORNEJO":
            nombre = "Eduardo Bonilla Cornejo"
        elif nombre.upper() == "ANA CLAUDIA CARBONEL GOMERO":
            nombre = "Claudia Carbonel Gomero"
        token['nombre'] = nombre
        # Usamos los IDs de las relaciones para el token
        token['id_area'] = user.id_area.id_area if user.id_area else None
        token['id_cargo'] = user.id_cargo.id_cargo if user.id_cargo else None
        return token

# Area
class AreasSerializer(serializers.ModelSerializer):
    std = serializers.CharField(allow_null=True, required=False, allow_blank=True)

    class Meta:
        model = Area
        fields = "__all__"

# Cargo
class CargosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cargo
        fields = "__all__"


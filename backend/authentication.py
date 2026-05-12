# proyecto_cotizaciones\backend\authentication.py

from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model

from users.models import Usuario

User = get_user_model()

class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        """
        Sobrescribe la obtención del usuario.
        """
        user_id = validated_token.get("user_id")

        if not user_id:
            return None

        try:
            return Usuario.objects.using("default").get(usuario=user_id)
        except Usuario.DoesNotExist:
            return None

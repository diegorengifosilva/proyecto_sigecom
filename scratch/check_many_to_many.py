import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import Usuario
from users.serializers import UsuarioSerializer

try:
    user = Usuario.objects.first()
    print("User found:", user.nombre_completo)
    serializer = UsuarioSerializer(user)
    print("Serialized data:", serializer.data)
except Exception as e:
    import traceback
    traceback.print_exc()

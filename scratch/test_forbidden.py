import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from users.views import gestionar_usuario_modulos
from users.models import Usuario

# Get user 1
user = Usuario.objects.using("default").get(pk=1)

# Mock request
factory = RequestFactory()
request = factory.post('/api/users/usuarios/1/modulos/', {'modulos': ['COMERCIAL']}, content_type='application/json')
request.user = user

print("Calling gestionar_usuario_modulos directly in django context:")
try:
    response = gestionar_usuario_modulos(request, id_usuario=1)
    print("Response status:", response.status_code)
    print("Response data:", response.data if hasattr(response, 'data') else response.content)
except Exception as e:
    import traceback
    traceback.print_exc()

import os
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from users.models import Usuario

# Get user
try:
    usuario = Usuario.objects.using("default").get(usuario="diego.rengifo")
    print(f"Generating token programmatically for {usuario.usuario}...")
    refresh = RefreshToken()
    access = refresh.access_token
    refresh["user_id"] = usuario.usuario
    access["user_id"] = usuario.usuario
    token = str(access)
except Exception as e:
    print("Could not generate token:", e)
    token = None

if token:
    base_url = "http://192.168.1.23:8000/api/"
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Testing GET users/usuarios-activos/...")
    r_get = requests.get(base_url + "users/usuarios-activos/", headers=headers)
    print("GET status:", r_get.status_code)
    
    print("Testing POST users/usuarios/1/modulos/...")
    r_post = requests.post(base_url + "users/usuarios/1/modulos/", json={"modulos": ["COMERCIAL"]}, headers=headers)
    print("POST status:", r_post.status_code)
    print("POST response headers:", r_post.headers)
    print("POST response body:", r_post.text)
else:
    print("No token generated.")

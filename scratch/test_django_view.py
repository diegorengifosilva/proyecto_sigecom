import os
import sys

sys.path.append(r"c:\Users\VC-23031\PROYECTOS\SIGECOM_5")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from cotizaciones_api.views import listar_suministros
from cotizaciones_api.models import CotizacionSuministro

User = get_user_model()
admin_user = User.objects.first()

factory = APIRequestFactory()

# Mock PUT payload simulating the exact fields the frontend sends.
payload = {
    "id_suministro": 196611,
    "id_registro": 2026000280,
    "codigo_grupo": 1,
    "codigo_item": "S/C",
    "descripcion": "A",
    "cantidad": 4,
    "costo_precio": 2126.16,
    "porcentaje_utilidad": 10.00,
    "utilidad": 220.12,
    "precio_venta": 2421.28,
    "venta_total": 9685.12,
    "proveedor": "",
    "tipo_unidad": "UNI",
    "observacion": "",
    "costo_envio": 75.00,
    "porcentaje_envio": 25.00,
    "costo_con_envio": 2201.16,
    "tiempo_entrega": None,
    "id_unidad_tiempo_entrega": "",
    "orden": 2,
    "id_marca": ""
}

request = factory.put('/api/cotizaciones/lista_suministros/2026000280/', data=payload, format='json')
force_authenticate(request, user=admin_user)

# Call view
response = listar_suministros(request, '2026000280')
print("Status Code:", response.status_code)
print("Response Data:", response.data)

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from cotizaciones_api.serializers import CotizacionServicioSerializer
from core.models import TipoGasto

print("Checking TipoGasto IDs:")
for tg in TipoGasto.objects.all():
    print(f"ID: {tg.id_tipo_gasto}, Nombre: {tg.nombre}")

# Test serializer validation with id_tipo_gasto = 4
data = {
    "id_registro": 2026000279,
    "nivel": 1,
    "codigo_servicio": "01051",
    "nombre_servicio": "GASTOS SERVICIO",
    "id_tipo_gasto": 4,
    "orden": 1
}

serializer = CotizacionServicioSerializer(data=data)
print("\nValidation is_valid() for id_tipo_gasto 4:")
print(serializer.is_valid())
if not serializer.is_valid():
    print("Errors:", serializer.errors)

# Test serializer validation with id_tipo_gasto = 5
data["id_tipo_gasto"] = 5
data["codigo_servicio"] = "01061"
data["nombre_servicio"] = "OTROS"
serializer = CotizacionServicioSerializer(data=data)
print("\nValidation is_valid() for id_tipo_gasto 5:")
print(serializer.is_valid())
if not serializer.is_valid():
    print("Errors:", serializer.errors)

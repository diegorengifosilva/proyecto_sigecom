import os
import django
import sys

# Setup Django environment
sys.path.append(r"c:\Users\VC-23031\PROYECTOS\SIGECOM_5")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from cotizaciones_api.serializers import CotizacionServicioSerializer

# Test sub-payload
payload = {
    "nivel": 1,
    "codigo_servicio": "01041",
    "nombre_servicio": "MANO DE OBRA",
    "id_tipo_gasto": 3,
    "id_registro": 2026000279
}

serializer = CotizacionServicioSerializer(data=payload)
is_valid = serializer.is_valid()
print("IS VALID:", is_valid)
if not is_valid:
    print("ERRORS:", serializer.errors)

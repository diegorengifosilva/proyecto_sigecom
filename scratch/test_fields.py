import os
import sys
import django

sys.path.append(r"c:\Users\VC-23031\PROYECTOS\SIGECOM_5")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from cotizaciones_api.models import CotizacionSuministro
from cotizaciones_api.serializers import CotizacionSuministroSerializer

item = CotizacionSuministro.objects.filter(id_suministro=196611).first()

def test_payload(name, extra_data):
    payload = {
        "id_suministro": item.id_suministro,
        "id_registro": item.id_registro_id,
        "codigo_grupo": item.codigo_grupo,
        "codigo_item": item.codigo_item,
        "descripcion": item.descripcion,
        "cantidad": item.cantidad,
        "costo_precio": item.costo_precio,
        "porcentaje_utilidad": item.porcentaje_utilidad,
        "utilidad": item.utilidad,
        "precio_venta": item.precio_venta,
        "venta_total": item.venta_total,
        "proveedor": item.proveedor,
        "tipo_unidad": item.tipo_unidad,
        "observacion": item.observacion,
        "costo_envio": item.costo_envio,
        "porcentaje_envio": item.porcentaje_envio,
        "costo_con_envio": item.costo_con_envio,
        "orden": item.orden
    }
    payload.update(extra_data)
    ser = CotizacionSuministroSerializer(item, data=payload, partial=True)
    if not ser.is_valid():
        print(f"FAIL '{name}':", ser.errors)
    else:
        print(f"SUCCESS '{name}'")

# Test 1: empty string for IntegerField (tiempo_entrega)
test_payload("tiempo_entrega as empty string", {"tiempo_entrega": ""})

# Test 2: NaN as string for DecimalField (costo_envio)
test_payload("costo_envio as NaN", {"costo_envio": "NaN"})

# Test 3: empty string for id_marca (ForeignKey)
test_payload("id_marca as empty string", {"id_marca": ""})

# Test 4: id_unidad_tiempo_entrega as empty string (ForeignKey)
test_payload("id_unidad_tiempo_entrega as empty string", {"id_unidad_tiempo_entrega": ""})

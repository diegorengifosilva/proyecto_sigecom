import os
import sys
import django

sys.path.append(r"c:\Users\VC-23031\PROYECTOS\SIGECOM_5")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from cotizaciones_api.models import CotizacionSuministro
from cotizaciones_api.serializers import CotizacionSuministroSerializer

# Test 1: Group PUT payload (196609)
group = CotizacionSuministro.objects.filter(id_suministro=196609).first()
if group:
    print("\n--- TESTING GROUP 196609 ---")
    payload = {
        "id_suministro": group.id_suministro,
        "id_registro": group.id_registro_id,
        "codigo_grupo": group.codigo_grupo,
        "nombre_grupo": group.nombre_grupo,
        "nivel": 0,
        "cantidad": group.cantidad,
        "venta_total": float(group.venta_total) if group.venta_total else 0.0,
        "orden": group.orden,
        "costo_envio": float(group.costo_envio) if group.costo_envio else 0.0,
        "costo_envio_total": float(group.costo_envio_total) if group.costo_envio_total else 0.0,
        "costo_envio_unidad": float(group.costo_envio_unidad) if group.costo_envio_unidad else 0.0,
    }
    
    # We do PUT which corresponds to CotizacionSuministroSerializer(group, data=payload, partial=True)
    ser = CotizacionSuministroSerializer(group, data=payload, partial=True)
    if not ser.is_valid():
        print("Group validation failed:", ser.errors)
    else:
        print("Group is valid!")

# Test 2: Item PUT payload (196611)
item = CotizacionSuministro.objects.filter(id_suministro=196611).first()
if item:
    print("\n--- TESTING ITEM 196611 ---")
    
    # Let's test different edge cases for FK fields (id_marca, id_unidad_tiempo_entrega)
    cases = [
        {"name": "null values", "id_marca": None, "id_unidad_tiempo_entrega": None},
        {"name": "empty string values", "id_marca": "", "id_unidad_tiempo_entrega": ""},
        {"name": "string 'null' values", "id_marca": "null", "id_unidad_tiempo_entrega": "null"},
        {"name": "missing keys", "omit": True}
    ]
    
    for case in cases:
        print(f"\nCase: {case['name']}")
        payload = {
            "id_suministro": item.id_suministro,
            "id_registro": item.id_registro_id,
            "codigo_grupo": item.codigo_grupo,
            "codigo_item": item.codigo_item,
            "descripcion": item.descripcion,
            "cantidad": item.cantidad,
            "costo_precio": float(item.costo_precio) if item.costo_precio else 0.0,
            "porcentaje_utilidad": float(item.porcentaje_utilidad) if item.porcentaje_utilidad else 0.0,
            "utilidad": float(item.utilidad) if item.utilidad else 0.0,
            "precio_venta": float(item.precio_venta) if item.precio_venta else 0.0,
            "venta_total": float(item.venta_total) if item.venta_total else 0.0,
            "proveedor": item.proveedor,
            "tipo_unidad": item.tipo_unidad,
            "observacion": item.observacion,
            "costo_envio": float(item.costo_envio) if item.costo_envio else 0.0,
            "porcentaje_envio": float(item.porcentaje_envio) if item.porcentaje_envio else 0.0,
            "costo_con_envio": float(item.costo_con_envio) if item.costo_con_envio else 0.0,
            "tiempo_entrega": item.tiempo_entrega,
            "orden": item.orden
        }
        if "omit" not in case:
            payload["id_marca"] = case["id_marca"]
            payload["id_unidad_tiempo_entrega"] = case["id_unidad_tiempo_entrega"]
            
        ser = CotizacionSuministroSerializer(item, data=payload, partial=True)
        if not ser.is_valid():
            print(f"Validation failed for case '{case['name']}':", ser.errors)
        else:
            print(f"Case '{case['name']}' is valid!")

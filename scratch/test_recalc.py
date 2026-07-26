import os
import sys
import django
from decimal import Decimal

sys.path.append(r"c:\Users\VC-23031\PROYECTOS\SIGECOM_5")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from cotizaciones_api.models import CotizacionSuministro
from cotizaciones_api.serializers import CotizacionSuministroSerializer

items = list(CotizacionSuministro.objects.filter(id_registro='2026000280').order_by('orden'))

print(f"Total database items: {len(items)}")

# Let's map db items to frontend-like state, run recalculation, and serialize
# For quote 2026000280, type is isVenta = True, tipo_venta = 'T' (Venta Total)
tipo_venta = 'T'

group_row = None
item_rows = []

for it in items:
    if it.nivel == 0:
        group_row = it
    else:
        item_rows.append(it)

if group_row:
    print(f"Group: {group_row.nombre_grupo}, cost_envio={group_row.costo_envio or group_row.costo_envio_total or 0}")
    
    # Prorrateo logic:
    # 1. totalCostoItems = sum(costo_precio * cantidad)
    totalCostoItems = sum(float(it.costo_precio or 0) * float(it.cantidad or 0) for it in item_rows)
    groupCostoEnvio = float(group_row.costo_envio or group_row.costo_envio_total or 0)
    print(f"totalCostoItems = {totalCostoItems}, groupCostoEnvio = {groupCostoEnvio}")
    
    # Recalculate each item
    for it in item_rows:
        costoPrecio = float(it.costo_precio or 0)
        cantidad = float(it.cantidad or 0)
        
        # percentage and cost envio
        if totalCostoItems > 0:
            porcentajeEnvio = (costoPrecio / totalCostoItems) * 100
        else:
            porcentajeEnvio = 0
            
        costoEnvio = (porcentajeEnvio / 100.0) * groupCostoEnvio
        costoConEnvio = costoPrecio + costoEnvio
        
        # Rounding
        porcentajeEnvio = round(porcentajeEnvio, 2)
        costoEnvio = round(costoEnvio, 2)
        costoConEnvio = round(costoConEnvio, 2)
        
        porcentajeUtil = float(it.porcentaje_utilidad or 0)
        utilidadUnit = (costoConEnvio * porcentajeUtil) / 100.0
        utilidad = round(utilidadUnit, 2)
        
        ventaPrecio = costoConEnvio + utilidad
        ventaPrecio = round(ventaPrecio, 2)
        
        venta_total = round(ventaPrecio * cantidad, 2)
        costo_total = round(costoPrecio * cantidad, 2)
        
        # Built payload for PUT item
        payloadItem = {
            "id_suministro": it.id_suministro,
            "id_registro": 2026000280,
            "codigo_grupo": it.codigo_grupo,
            "codigo_item": it.codigo_item,
            "descripcion": it.descripcion,
            "cantidad": int(cantidad),
            "costo_precio": costoPrecio,
            "porcentaje_utilidad": porcentajeUtil,
            "utilidad": utilidad,
            "precio_venta": ventaPrecio,
            "venta_total": venta_total,
            "id_marca": it.id_marca_id,
            "proveedor": it.proveedor,
            "tipo_unidad": it.tipo_unidad,
            "observacion": it.observacion,
            "costo_envio": costoEnvio,
            "porcentaje_envio": porcentajeEnvio,
            "costo_con_envio": costoConEnvio,
            "tiempo_entrega": it.tiempo_entrega,
            "id_unidad_tiempo_entrega": it.id_unidad_tiempo_entrega_id,
            "orden": it.orden,
            
            # Missing fields that we should include:
            "costo_total": costo_total,
            "costo_envio_total": round(costoEnvio * cantidad, 2),
            "costo_envio_unidad": costoEnvio
        }
        
        # Run through DRF serializer to check validation
        ser = CotizacionSuministroSerializer(it, data=payloadItem, partial=True)
        if not ser.is_valid():
            print(f"Validation failed for item {it.id_suministro}: {ser.errors}")
        else:
            print(f"Item {it.id_suministro} payload is valid!")
            
    # Group PUT payload
    total_venta_items = sum(round((costoConEnvio + round((costoConEnvio * float(it.porcentaje_utilidad or 0)) / 100.0, 2)) * float(it.cantidad or 0), 2) for it in item_rows)
    payloadGroup = {
        "id_suministro": group_row.id_suministro,
        "id_registro": 2026000280,
        "codigo_grupo": group_row.codigo_grupo,
        "nombre_grupo": group_row.nombre_grupo,
        "nivel": 0,
        "cantidad": group_row.cantidad,
        "venta_total": total_venta_items * group_row.cantidad,
        "orden": group_row.orden,
        "costo_envio": groupCostoEnvio,
        "costo_envio_total": groupCostoEnvio if tipo_venta == "T" else 0.0,
        "costo_envio_unidad": groupCostoEnvio if tipo_venta == "P" else 0.0
    }
    ser = CotizacionSuministroSerializer(group_row, data=payloadGroup, partial=True)
    if not ser.is_valid():
        print(f"Validation failed for group {group_row.id_suministro}: {ser.errors}")
    else:
        print(f"Group {group_row.id_suministro} payload is valid!")

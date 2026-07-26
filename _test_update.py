import django
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from logistica_api.models import LogisticaDashboardDetalle
from logistica_api.movimiento_helpers import build_movimiento_detalle_response
from logistica_api.views import _actualizar_detalles

num_reg = 1000004587
data = build_movimiento_detalle_response(num_reg)
items = []
for it in data["items"]:
    items.append({
        "id_detalle": it["id_detalle"],
        "id_producto": it["id_producto"],
        "codigo": it["codigo"],
        "descripcion": it["descripcion"],
        "id_unidad_medida": it["id_unidad_medida"],
        "um_id": it["id_unidad_medida"],
        "um": it["unidad"],
        "cant": it["cantidad"],
        "cantidad": it["cantidad"],
        "valor": it["valor_unitario"],
        "valor_unitario": it["valor_unitario"],
        "total": it["total"],
        "observacion": it.get("observacion") or "",
    })

print("items", len(items), "first id_detalle", items[0]["id_detalle"])
_actualizar_detalles(num_reg, items, "S", 3.75)
print("OK updated", LogisticaDashboardDetalle.objects.filter(num_reg=num_reg).count(), "rows")

import os
import django
import sys

# Setup django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.db.models import Count
from cotizaciones_api.models import Cotizacion

def get_histogram_suministros():
    print("--- HISTOGRAMA SUMINISTROS (VENTAS) ---")
    results = (
        Cotizacion.objects.filter(entrega_suministros__isnull=False)
        .values('entrega_suministros', 'id_unidad_tiempo_entrega_suministros__nombre')
        .annotate(count=Count('id_registro'))
        .order_by('-count')[:10]
    )
    for r in results:
        print(f"{r['entrega_suministros']} {r['id_unidad_tiempo_entrega_suministros__nombre']}: {r['count']} veces")

def get_histogram_servicios():
    print("\n--- HISTOGRAMA SERVICIOS ---")
    results = (
        Cotizacion.objects.filter(entrega_servicios__isnull=False)
        .values('entrega_servicios', 'id_unidad_tiempo_entrega_servicios__nombre')
        .annotate(count=Count('id_registro'))
        .order_by('-count')[:10]
    )
    for r in results:
        print(f"{r['entrega_servicios']} {r['id_unidad_tiempo_entrega_servicios__nombre']}: {r['count']} veces")

if __name__ == "__main__":
    get_histogram_suministros()
    get_histogram_servicios()

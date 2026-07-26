import os
import django
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.db.models import Count
from cotizaciones_api.models import Cotizacion

def get_histogram_by_client_and_type():
    # Let's find the top clients with the most quotes
    top_clients = (
        Cotizacion.objects.values('id_cliente', 'id_cliente__nombre')
        .annotate(total=Count('id_registro'))
        .order_by('-total')[:5]
    )
    
    for client in top_clients:
        client_id = client['id_cliente']
        client_name = client['id_cliente__nombre']
        if not client_id:
            continue
        print(f"\n================ CLIENT: {client_name} (ID: {client_id}) ================")
        
        for tipo_id in ['P', 'S', 'V']:
            print(f"  --- TYPE: {tipo_id} ---")
            # Suministros
            sumin_results = (
                Cotizacion.objects.filter(
                    id_cliente=client_id, 
                    id_tipo=tipo_id, 
                    entrega_suministros__isnull=False,
                    entrega_suministros__gt=0
                )
                .values('entrega_suministros', 'id_unidad_tiempo_entrega_suministros__codigo')
                .annotate(count=Count('id_registro'))
                .order_by('-count')[:3]
            )
            # Servicios
            serv_results = (
                Cotizacion.objects.filter(
                    id_cliente=client_id, 
                    id_tipo=tipo_id, 
                    entrega_servicios__isnull=False,
                    entrega_servicios__gt=0
                )
                .values('entrega_servicios', 'id_unidad_tiempo_entrega_servicios__codigo')
                .annotate(count=Count('id_registro'))
                .order_by('-count')[:3]
            )
            
            print("    Suministros frecuentas:")
            for r in sumin_results:
                print(f"      {r['entrega_suministros']} {r['id_unidad_tiempo_entrega_suministros__codigo']}: {r['count']} veces")
            if not sumin_results:
                print("      Ninguno")
                
            print("    Servicios frecuentes:")
            for r in serv_results:
                print(f"      {r['entrega_servicios']} {r['id_unidad_tiempo_entrega_servicios__codigo']}: {r['count']} veces")
            if not serv_results:
                print("      Ninguno")

if __name__ == "__main__":
    get_histogram_by_client_and_type()

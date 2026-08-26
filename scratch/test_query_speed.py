import os
import sys
import django
import time

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from cotizaciones_api.models import Cotizacion
from django.db.models import Q

def test():
    t0 = time.time()
    
    # Simulate list query for 2026
    anno = 2026
    qs = Cotizacion.objects.select_related(
        'id_cliente', 'id_estado', 'id_comercial', 'id_tecnico', 'id_tipo',
        'id_unidad_tiempo_entrega_suministros',
        'id_unidad_tiempo_entrega_servicios',
        'id_unidad_tiempo_validez'
    ).filter(año_apertura=anno)
    
    count = qs.count()
    t1 = time.time()
    print(f"Total cotizaciones count for {anno}: {count}")
    print(f"Time to run count query: {(t1 - t0) * 1000:.2f} ms")
    
    # Force query execution and timing
    t_fetch_start = time.time()
    items = list(qs)
    t_fetch_end = time.time()
    print(f"Time to fetch all records from database into memory: {(t_fetch_end - t_fetch_start) * 1000:.2f} ms")
    
    # Measure aggregation time (dashboard calculations)
    t_dash_start = time.time()
    total_regs = len(items)
    monto_soles = 0
    monto_dolares = 0
    este_mes_conteo = 0
    stats_estados = {}
    stats_clientes = {}
    conteo_meses = [0] * 12
    
    for c in items:
        monto = float(c.total_cotizacion or 0)
        if c.tipo_moneda == "D":
            monto_dolares += monto
        else:
            monto_soles += monto
            
        if c.fecha:
            conteo_meses[c.fecha.month - 1] += 1
            
        est_nom = c.id_estado.nombre if c.id_estado else "Sin Estado"
        stats_estados[est_nom] = stats_estados.get(est_nom, 0) + 1
        
    t_dash_end = time.time()
    print(f"Time to compute dashboard stats in Python: {(t_dash_end - t_dash_start) * 1000:.2f} ms")
    
    # Measure serialization time (building tabla_data)
    t_ser_start = time.time()
    tabla_data = []
    
    # Mock AREA_MAP and format_datetime
    AREA_MAP = {1: "Industria", 2: "Minería", 3: "Mantenimiento", 4: "Petroquímica", 8: "Seguridad"}
    
    for c in items:
        comercial_nombre = c.id_comercial.nombre_completo if c.id_comercial else "Por asignar"
        cliente_nombre = c.id_cliente.nombre if c.id_cliente else (c.representante_nombre or "S/N")
        estado_nombre = c.id_estado.nombre if c.id_estado else None
        tipo_nombre = c.id_tipo.nombre if c.id_tipo else None
        area_nombre = AREA_MAP.get(c.id_area, "Otros")
        
        tabla_data.append({
            "id_registro": c.id_registro,
            "codigo": c.codigo,
            "cliente_nombre": cliente_nombre,
            "comercial_nombre": comercial_nombre,
            "estado_nombre": estado_nombre,
            "tipo_nombre": tipo_nombre,
            "area_nombre": area_nombre,
            "total_cotizacion": str(c.total_cotizacion),
            "tipo_moneda": c.tipo_moneda,
        })
        
    t_ser_end = time.time()
    print(f"Time to serialize to JSON-ready list: {(t_ser_end - t_ser_start) * 1000:.2f} ms")
    print(f"Total execution time (backend equivalent): {(t_ser_end - t0) * 1000:.2f} ms")
    print(f"Number of SQL queries made: {len(connection.queries)}")
    
    # Print individual queries
    for q in connection.queries:
        print(f"SQL: {q['sql'][:120]}... took {float(q['time'])*1000:.2f}ms")

if __name__ == '__main__':
    test()

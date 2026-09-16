from django.db import connection
import datetime

def obtener_siguiente_id_registro(cantidad=1):
    """
    Calcula el siguiente id_registro secuencial unificado
    comparando el valor máximo entre las 3 tablas que provienen de la legacy vc_mov_orden_soli:
      - solicitud_orden_compra
      - solicitud_pasajes
      - solicitud_caja_chica
    
    Retorna un solo int si cantidad=1, o una lista de ints si cantidad > 1.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT GREATEST(
                COALESCE((SELECT MAX(id_registro) FROM solicitud_orden_compra), 0),
                COALESCE((SELECT MAX(id_registro) FROM solicitud_caja_chica), 0),
                COALESCE((SELECT MAX(id_registro) FROM solicitud_pasajes), 0)
            )
        """)
        row = cursor.fetchone()
        max_id = row[0] if row and row[0] else 0
        current_year = datetime.datetime.now().year
        base_prefix = current_year * 10000
        start_id = base_prefix if max_id < base_prefix else max_id
        
        if cantidad == 1:
            return start_id + 1
        return [start_id + i for i in range(1, cantidad + 1)]

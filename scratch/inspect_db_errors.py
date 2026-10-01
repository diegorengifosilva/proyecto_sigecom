import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connections

with connections['vc_sig'].cursor() as cursor:
    cursor.execute("DESCRIBE proy_proyecto_origen")
    rows = cursor.fetchall()
    print("=== proy_proyecto_origen columns ===")
    for r in rows:
        print(r)

from integracion_api.models import IntIncidencia
print("\n=== Recent Incidencias ===")
for inc in IntIncidencia.objects.order_by('-created_at')[:5]:
    print(f"Code: {inc.code}, Msg: {inc.message}, Details: {inc.details}")

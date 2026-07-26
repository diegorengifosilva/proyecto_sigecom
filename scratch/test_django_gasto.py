import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import TipoGasto

print("--- Django ORM TipoGasto ---")
try:
    for tg in TipoGasto.objects.all():
        print(f"ID: {tg.id_tipo_gasto}, CODIGO: {tg.codigo}, NOMBRE: {tg.nombre}, ACTIVO: {tg.activo}")
except Exception as e:
    print("ERROR:", e)

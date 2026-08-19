import os
import sys
import django

# Add root folder to sys.path
sys.path.append("C:\\Users\\VC-23031\\PROYECTOS\\SIGECOM_5")

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from users.models import Area

print("AREAS:")
for area in Area.objects.all():
    print(f"ID: {area.id_area} | Nombre: {area.nombre} | Activo: {area.activo}")

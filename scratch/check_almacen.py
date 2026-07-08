import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from logistica_api.models import AlmacenNew
from users.models import Usuario

print("Almacenes con usuario_id_usuario:")
for a in AlmacenNew.objects.all():
    u = Usuario.objects.filter(id_usuario=a.usuario_id_usuario).first()
    user_name = u.nombre_completo if u else "NOT FOUND"
    print(f"  ID:{a.idalmacen} | {a.nombre} | usuario_id:{a.usuario_id_usuario} | user: {user_name} | activo: {a.activo}")

print()
print("Usuarios activos (primeros 10):")
for u in Usuario.objects.filter(activo=1)[:10]:
    print(f"  id_usuario:{u.id_usuario} | {u.nombre_completo}")

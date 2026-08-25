import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import Usuario

print("Checking if user 2297 exists:")
exists = Usuario.objects.filter(id_usuario=2297).exists()
print("User 2297 exists:", exists)

print("\nListing some users in the DB to check IDs:")
for u in Usuario.objects.all().order_by('id_usuario')[:15]:
    print(f"ID: {u.id_usuario} | Usuario: {u.usuario} | Nombre: {u.nombre_completo}")

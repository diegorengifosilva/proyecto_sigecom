from django.core.management.base import BaseCommand
from users.models import Usuario
from notificaciones_api.views import generar_notificaciones_usuario

class Command(BaseCommand):
    help = "Evalúa y genera notificaciones comerciales para todos los usuarios activos, disparando los correos automáticos correspondientes."

    def handle(self, *args, **options):
        self.stdout.write("Iniciando evaluación de alertas y notificaciones comerciales...")
        
        # Obtener todos los usuarios comerciales activos
        usuarios = Usuario.objects.filter(activo=1)
        
        procesados = 0
        errores = 0
        
        for usuario in usuarios:
            try:
                # Llamar a la función generadora
                # Esto limpiará alertas antiguas (>30d leídas) e insertará nuevas si corresponden
                generar_notificaciones_usuario(usuario)
                self.stdout.write(self.style.SUCCESS(f"-> Alertas evaluadas con éxito para el usuario: {usuario.usuario}"))
                procesados += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error procesando usuario {usuario.usuario}: {str(e)}"))
                errores += 1
                
        self.stdout.write(self.style.SUCCESS(f"\n¡Proceso completado!"))
        self.stdout.write(f"Usuarios procesados exitosamente: {procesados}")
        if errores > 0:
            self.stdout.write(self.style.WARNING(f"Usuarios con errores: {errores}"))

from django.apps import AppConfig

class NotificacionesApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notificaciones_api'

    def ready(self):
        import notificaciones_api.signals

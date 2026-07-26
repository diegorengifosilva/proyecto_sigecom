from django.apps import AppConfig


class CotizacionesApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cotizaciones_api'

    def ready(self):
        import cotizaciones_api.signals

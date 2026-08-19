# SIGECOM_5\backend\db_router.py

class VCRouter:
    """
    Fuerza a que todas las operaciones sean de solo lectura.
    Compatible con configuración de una sola base de datos ('default').
    """

    def db_for_read(self, model, **hints):
        return "default"

    def db_for_write(self, model, **hints):
        # Cambia 'None' por 'default' para permitir guardar datos
        return "default"

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # Permitir migraciones solo para la app de notificaciones, caja_chica_api y django internals
        if app_label in ["notificaciones_api", "caja_chica_api", "auth", "contenttypes", "sessions", "admin", "messages"]:
            return True
        # Evita migraciones sobre las DB legacy
        return False

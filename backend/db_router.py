# SIGECOM_5\backend\db_router.py

class VCRouter:
    """
    Fuerza a que todas las operaciones sean de solo lectura.
    Compatible con configuración de una sola base de datos ('default').
    """

    SIG_APPS = [
        'hseq_api', 'proyectos_api', 'rrhh_api', 'emergencias_api',
        'salud_ocupacional_api', 'seguridad_api', 'integracion_api'
    ]

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.SIG_APPS:
            return 'vc_sig'
        return "default"

    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.SIG_APPS:
            return 'vc_sig'
        return "default"

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label in self.SIG_APPS:
            # Evita migraciones sobre vc_sig porque las tablas son administradas externamente
            return False
        # Permitir migraciones solo para la app de notificaciones, caja_chica_api, buzon_api y django internals
        if app_label in ["notificaciones_api", "caja_chica_api", "buzon_api", "auth", "contenttypes", "sessions", "admin", "messages"]:
            return db == "default"
        # Evita migraciones sobre las DB legacy
        return False

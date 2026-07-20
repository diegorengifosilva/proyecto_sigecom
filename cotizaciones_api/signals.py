# cotizaciones_api/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from cotizaciones_api.models import Cotizacion, CotizacionSuministro, CotizacionServicio, CotizacionMensaje, CotizacionSeguimiento
from cotizaciones_api.services.legacy_sync import disparar_sincronizacion_legada, disparar_eliminacion_legada

@receiver(post_save, sender=Cotizacion)
def on_cotizacion_post_save(sender, instance, created, **kwargs):
    """
    Escucha la creación/actualización de la cotización y dispara
    la sincronización en segundo plano con la base legado.
    """
    disparar_sincronizacion_legada(instance.id_registro)

@receiver(post_delete, sender=Cotizacion)
def on_cotizacion_post_delete(sender, instance, **kwargs):
    """
    Escucha la eliminación de la cotización y dispara
    la eliminación en segundo plano en la base legado.
    """
    if instance.id_registro:
        disparar_eliminacion_legada(instance.id_registro)

@receiver(post_save, sender=CotizacionSuministro)
def on_suministro_post_save(sender, instance, created, **kwargs):
    """
    Escucha cambios en suministros y dispara la sincronización del padre.
    """
    if instance.id_registro_id:
        disparar_sincronizacion_legada(instance.id_registro_id)

@receiver(post_save, sender=CotizacionServicio)
def on_servicio_post_save(sender, instance, created, **kwargs):
    """
    Escucha cambios en servicios y dispara la sincronización del padre.
    """
    if instance.id_registro_id:
        disparar_sincronizacion_legada(instance.id_registro_id)

@receiver(post_save, sender=CotizacionMensaje)
def on_mensaje_post_save(sender, instance, created, **kwargs):
    """
    Escucha cambios en mensajes y dispara la sincronización del padre.
    """
    if instance.id_registro_id:
        disparar_sincronizacion_legada(instance.id_registro_id)

@receiver(post_save, sender=CotizacionSeguimiento)
def on_seguimiento_post_save(sender, instance, created, **kwargs):
    """
    Escucha cambios en seguimientos y dispara la sincronización del padre.
    """
    if instance.id_registro_id:
        disparar_sincronizacion_legada(instance.id_registro_id)

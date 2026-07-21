# cotizaciones_api/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from cotizaciones_api.models import Cotizacion, CotizacionSuministro, CotizacionServicio, CotizacionMensaje, CotizacionSeguimiento, CotizacionCondicionGeneral
from core.models import Cliente, Representante, TipoMarca, TipoPersonal, TipoGastoDetalle, Producto
from users.models import Usuario
from cotizaciones_api.services.legacy_sync import (
    disparar_sincronizacion_legada,
    disparar_eliminacion_legada,
    disparar_sincronizacion_cliente_legado,
    disparar_eliminacion_cliente_legado,
    disparar_sincronizacion_representante_legado,
    disparar_eliminacion_representante_legado,
    disparar_sincronizacion_marca_legado,
    disparar_eliminacion_marca_legado,
    disparar_sincronizacion_tipo_personal_legado,
    disparar_eliminacion_tipo_personal_legado,
    disparar_sincronizacion_gasto_detalle_legado,
    disparar_eliminacion_gasto_detalle_legado,
    disparar_sincronizacion_usuario_legado,
    disparar_eliminacion_usuario_legado,
    disparar_sincronizacion_producto_legado,
    disparar_eliminacion_producto_legado,
    disparar_sincronizacion_condicion_legada,
    disparar_eliminacion_condicion_legada,
)






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

@receiver(post_save, sender=Cliente)
def on_cliente_post_save(sender, instance, created, **kwargs):
    """
    Escucha la creación/actualización del cliente y dispara
    la sincronización en segundo plano con la base legado.
    """
    if instance.id_cliente:
        disparar_sincronizacion_cliente_legado(instance.id_cliente)

@receiver(post_delete, sender=Cliente)
def on_cliente_post_delete(sender, instance, **kwargs):
    """
    Escucha la eliminación del cliente y dispara
    la eliminación en segundo plano en la base legado.
    """
    if instance.id_cliente:
        disparar_eliminacion_cliente_legado(instance.id_cliente)

@receiver(post_save, sender=Representante)
def on_representante_post_save(sender, instance, created, **kwargs):
    """
    Escucha la creación/actualización del representante y dispara
    la sincronización en segundo plano con la base legado.
    """
    if instance.id_representante:
        disparar_sincronizacion_representante_legado(instance.id_representante)

@receiver(post_delete, sender=Representante)
def on_representante_post_delete(sender, instance, **kwargs):
    """
    Escucha la eliminación del representante y dispara
    la eliminación en segundo plano en la base legado.
    """
    if instance.id_representante:
        disparar_eliminacion_representante_legado(instance.id_representante, instance.id_cliente_id)

@receiver(post_save, sender=TipoMarca)
def on_tipo_marca_post_save(sender, instance, created, **kwargs):
    """
    Escucha la creación/actualización de la marca (TipoMarca) y dispara
    la sincronización en segundo plano con la base legado.
    """
    if instance.id_marca:
        disparar_sincronizacion_marca_legado(instance.id_marca)

@receiver(post_delete, sender=TipoMarca)
def on_tipo_marca_post_delete(sender, instance, **kwargs):
    """
    Escucha la eliminación de la marca (TipoMarca) y dispara
    la eliminación en segundo plano en la base legado.
    """
    if instance.id_marca:
        disparar_eliminacion_marca_legado(instance.id_marca)

@receiver(post_save, sender=TipoPersonal)
def on_tipo_personal_post_save(sender, instance, created, **kwargs):
    """
    Escucha la creación/actualización del tipo de personal y dispara
    la sincronización en segundo plano con la base legado.
    """
    if instance.id_personal:
        disparar_sincronizacion_tipo_personal_legado(instance.id_personal)

@receiver(post_delete, sender=TipoPersonal)
def on_tipo_personal_post_delete(sender, instance, **kwargs):
    """
    Escucha la eliminación del tipo de personal y dispara
    la eliminación en segundo plano en la base legado.
    """
    if instance.codigo:
        disparar_eliminacion_tipo_personal_legado(instance.codigo)

@receiver(post_save, sender=TipoGastoDetalle)
def on_gasto_detalle_post_save(sender, instance, created, **kwargs):
    """
    Escucha la creación/actualización del detalle de tipo de gasto y dispara
    la sincronización en segundo plano con la base legado.
    """
    if instance.id_gasto_detalle:
        disparar_sincronizacion_gasto_detalle_legado(instance.id_gasto_detalle)

@receiver(post_delete, sender=TipoGastoDetalle)
def on_gasto_detalle_post_delete(sender, instance, **kwargs):
    """
    Escucha la eliminación del detalle de tipo de gasto y dispara
    la eliminación en segundo plano en la base legado.
    """
    if instance.codigo:
        disparar_eliminacion_gasto_detalle_legado(instance.codigo)

@receiver(post_save, sender=Usuario)
def on_usuario_post_save(sender, instance, created, **kwargs):
    """
    Escucha la creación/actualización de usuario y dispara
    la sincronización en segundo plano con la base legado.
    """
    if instance.id_usuario:
        disparar_sincronizacion_usuario_legado(instance.id_usuario)

@receiver(post_delete, sender=Usuario)
def on_usuario_post_delete(sender, instance, **kwargs):
    """
    Escucha la eliminación de usuario y dispara
    la eliminación en segundo plano en la base legado.
    """
    if instance.usuario:
        disparar_eliminacion_usuario_legado(instance.usuario)

@receiver(post_save, sender=Producto)
def on_producto_post_save(sender, instance, created, **kwargs):
    """
    Escucha la creación/actualización del producto y dispara
    la sincronización en segundo plano hacia la tabla legado correspondiente según su marca.
    """
    if instance.id_producto:
        disparar_sincronizacion_producto_legado(instance.id_producto)

@receiver(post_delete, sender=Producto)
def on_producto_post_delete(sender, instance, **kwargs):
    """
    Escucha la eliminación del producto y dispara
    la eliminación en segundo plano en la tabla legado correspondiente según su marca.
    """
    if instance.codigo:
        marca_nombre = instance.id_marca.nombre if instance.id_marca else ""
        disparar_eliminacion_producto_legado(instance.codigo, marca_nombre)








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


@receiver(post_save, sender=CotizacionCondicionGeneral)
def on_condicion_post_save(sender, instance, created, **kwargs):
    """
    Escucha cambios en las condiciones generales de la cotización y dispara
    la sincronización de la columna acu_e en segundo plano.
    """
    if instance.id_registro_id:
        disparar_sincronizacion_condicion_legada(instance.id_registro_id)


@receiver(post_delete, sender=CotizacionCondicionGeneral)
def on_condicion_post_delete(sender, instance, **kwargs):
    """
    Escucha la eliminación de las condiciones generales de la cotización y dispara
    la actualización de la columna acu_e en segundo plano.
    """
    if instance.id_registro_id:
        disparar_eliminacion_condicion_legada(instance.id_registro_id)


from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from simple_history.models import HistoricalRecords
from django.contrib.auth.hashers import check_password, make_password
import datetime

#========================================================================================

##==============##
## COTIZACIONES ##
##==============##
class Cotizacion(models.Model):
    # ── IDENTIFICADORES Y PERIODOS ─────────────────────────────
    id_registro = models.AutoField(primary_key=True)
    anno = models.IntegerField(null=True, blank=True) # year(4) en MySQL
    mes = models.IntegerField(null=True, blank=True)
    codigo = models.CharField(max_length=45, null=True, blank=True) # Antes 'cotin'
    
    # ── TIPADO Y FECHAS ─────────────────────────────
    # Relación con la tabla tipo_coti
    id_tipo = models.ForeignKey(
        'core.TipoCotizacion', on_delete=models.PROTECT, db_column='id_tipo', null=True
    )
    tipo_venta = models.CharField(max_length=45, null=True, blank=True) # T=Total, P=Parcial
    fecha = models.DateTimeField(default=timezone.now, null=True, blank=True) # Antes 'cotif'
    referencia = models.CharField(max_length=200, null=True, blank=True) # Antes 'refer'

    # ── CLIENTE Y REPRESENTANTE ─────────────────────────────
    id_cliente = models.ForeignKey(
        'core.Cliente', on_delete=models.PROTECT, db_column='id_cliente', null=True
    )
    id_representante = models.ForeignKey(
        'core.Representante', on_delete=models.PROTECT, db_column='id_representante', null=True
    )
    # Campos de respaldo (Snapshot) para cuando el representante cambie en el maestro
    representante_nombre = models.CharField(max_length=100, null=True, blank=True)
    representante_cargo = models.CharField(max_length=100, null=True, blank=True)
    representante_telefono = models.CharField(max_length=100, null=True, blank=True)
    representante_movil = models.CharField(max_length=100, null=True, blank=True)
    representante_correo = models.CharField(max_length=100, null=True, blank=True)

    # ── PERSONAL INTERNO ─────────────────────────────
    id_comercial = models.ForeignKey(
        'users.Usuario', on_delete=models.PROTECT, db_column='id_comercial', 
        related_name='cotizaciones_comercial', null=True
    )
    id_tecnico = models.ForeignKey(
        'users.Usuario', on_delete=models.PROTECT, db_column='id_tecnico', 
        related_name='cotizaciones_tecnico', null=True
    )
    id_creador = models.ForeignKey(
        'users.Usuario', on_delete=models.PROTECT, db_column='id_creador', 
        related_name='cotizaciones_creadas', null=True
    )

    # ── CONDICIONES COMERCIALES ─────────────────────────────
    forma_pago = models.CharField(max_length=100, null=True, blank=True)
    lugar = models.CharField(max_length=50, null=True, blank=True)
    tipo_moneda = models.CharField(max_length=45, default='S') # S=Soles, D=Dólares
    igv = models.CharField(max_length=1, null=True, blank=True) # S/N
    tipo_cambio = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)

    # ── TIEMPOS (USANDO LA NUEVA TABLA UNIDADTIEMPO) ─────────────
    entrega_suministros = models.IntegerField(null=True, blank=True)
    id_unidad_tiempo_entrega_suministros = models.ForeignKey(
        'core.UnidadTiempo', on_delete=models.PROTECT, 
        db_column='id_unidad_tiempo_entrega_suministros', null=True, related_name='suministros'
    )
    
    entrega_servicios = models.IntegerField(null=True, blank=True)
    id_unidad_tiempo_entrega_servicios = models.ForeignKey(
        'core.UnidadTiempo', on_delete=models.PROTECT, 
        db_column='id_unidad_tiempo_entrega_servicios', null=True, related_name='servicios'
    )
    
    validez_oferta = models.IntegerField(null=True, blank=True)
    id_unidad_tiempo_validez = models.ForeignKey(
        'core.UnidadTiempo', on_delete=models.PROTECT, 
        db_column='id_unidad_tiempo_validez', null=True, related_name='validez'
    )

    # ── TOTALES Y ESTADOS ─────────────────────────────
    condiciones_generales = models.TextField(db_column='condiciones_generales', null=True, blank=True)
    total_cotizacion = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    saldo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    id_estado = models.ForeignKey(
        'core.Estado', on_delete=models.PROTECT, db_column='id_estado', null=True
    )
    id_area = models.IntegerField(null=True, blank=True) # Relación con tabla área
    estado_envio = models.IntegerField(null=True, blank=True) # 0 o 1
    sincronizado_old_db = models.IntegerField(default=0, db_column='sincronizado_old_db')

    # ── DESCUENTOS ─────────────────────────────
    descuento_aplica = models.IntegerField(default=0) # 0=No, 1=Si
    descuento_afecto = models.CharField(max_length=1, null=True, blank=True) # T, M, S
    descuento_monto = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    descuento_porcentaje = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # ── KPI / SEGUIMIENTO ─────────────────────────────
    año_apertura = models.IntegerField(null=True, blank=True)
    mensajes = models.IntegerField(null=True, blank=True)
    seguimiento = models.IntegerField(null=True, blank=True)
    probabilidad = models.IntegerField(null=True, blank=True)
    fijar = models.IntegerField(default=0, db_column='fijar')

    # ── OPORTUNIDADES ─────────────────────────────
    recepcion_solicitud = models.DateTimeField(null=True, blank=True)
    visita_tecnica = models.DateTimeField(null=True, blank=True)
    fecha_limite = models.DateTimeField(null=True, blank=True)
    emision_cotizacion = models.DateTimeField(null=True, blank=True)
    estado_oportunidad = models.IntegerField(default=1, null=True, blank=True)
    comentario = models.TextField(null=True, blank=True)

    class Meta:
        managed = False # Cambiar a True si vas a migrar datos de la vieja a la nueva
        db_table = 'cotizaciones'
        indexes = [
            models.Index(fields=['id_cliente', 'id_tipo']),
        ]

    def __str__(self):
        return f"Cotización {self.codigo} - {self.id_cliente}"

class CotizacionSuministro(models.Model):
    # ── IDENTIFICADOR (Nueva PK Auto-incremental) ──
    id_suministro = models.AutoField(primary_key=True)
    
    # ── RELACIÓN PADRE (Vínculo con Cotización) ──
    id_registro = models.ForeignKey(
        'Cotizacion', 
        on_delete=models.CASCADE, 
        db_column='id_registro', 
        related_name='suministros'
    )

    # ── LLAVES FORÁNEAS (Relacionales) ──
    id_tipo_gasto = models.ForeignKey(
        'core.TipoGasto', 
        on_delete=models.PROTECT, 
        db_column='id_tipo_gasto', 
        null=True, blank=True
    )
    id_marca = models.ForeignKey(
        'core.TipoMarca', 
        on_delete=models.PROTECT, 
        db_column='id_marca', 
        null=True, blank=True
    )
    id_unidad_tiempo_entrega = models.ForeignKey(
        'core.UnidadTiempo', 
        on_delete=models.PROTECT, 
        db_column='id_unidad_tiempo_entrega', 
        null=True, blank=True
    )

    # ── CAMPOS DE GRUPO Y ESTRUCTURA ──
    codigo_grupo = models.IntegerField()
    nombre_grupo = models.CharField(max_length=500, null=True, blank=True)
    nivel = models.IntegerField(null=True, blank=True) # 0=Nombre Grupo, 1=Items
    orden = models.IntegerField(default=0, null=True, blank=True)
    
    # ── INFORMACIÓN DEL ITEM ──
    codigo_item = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=5000)
    observacion = models.CharField(max_length=3000, null=True, blank=True)
    proveedor = models.CharField(max_length=100, null=True, blank=True)
    tipo_unidad = models.CharField(max_length=45, null=True, blank=True)
    cantidad = models.IntegerField(null=True, blank=True)
    
    # ── TIEMPOS ──
    tiempo_entrega = models.IntegerField(null=True, blank=True)

    # ── CAMPOS ECONÓMICOS (Decimales) ──
    costo_precio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    costo_total = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    costo_envio_total = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    costo_envio_unidad = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    porcentaje_envio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    costo_envio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    costo_con_envio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    porcentaje_utilidad = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    utilidad = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    venta_total = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    total_por_grupo = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'cotizaciones_suministros'
        verbose_name = "Suministro"
        verbose_name_plural = "Suministros"

    def __str__(self):
        return f"{self.id_registro} - {self.descripcion}"

class CotizacionServicio(models.Model):
    id_servicio = models.AutoField(primary_key=True)
    id_registro = models.ForeignKey(
        'Cotizacion', 
        on_delete=models.CASCADE, 
        db_column='id_registro',
        related_name='servicios'
    )
    # Relaciones con tablas maestras
    id_tipo_gasto = models.ForeignKey(
        'core.TipoGasto',
        on_delete=models.SET_NULL,
        db_column='id_tipo_gasto',
        null=True, blank=True
    )
    id_area = models.ForeignKey(
        'users.Area',
        on_delete=models.SET_NULL,
        db_column='id_area',
        null=True, blank=True
    )
    
    # Datos del Servicio (Nivel 0)
    codigo_servicio = models.CharField(max_length=100, null=True, blank=True)
    nombre_servicio = models.CharField(max_length=100, null=True, blank=True)
    nivel = models.IntegerField(null=True, blank=True) # 0=Servicio, 1=Tipo Gasto, 2=Item
    orden = models.IntegerField(null=True, blank=True, default=0)
    
    # Datos del Ítem (Nivel 2)
    codigo_item = models.CharField(max_length=100, null=True, blank=True)
    descripcion_item = models.CharField(max_length=255, null=True, blank=True)
    
    # Cálculos y Cantidades
    horas = models.IntegerField(null=True, blank=True)
    cantidad_hombres = models.IntegerField(null=True, blank=True)
    costo_hombre_dia = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cantidad_dias = models.IntegerField(null=True, blank=True)
    
    # Valores Monetarios (Costo)
    costo_total = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    porcentaje = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    utilidad = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Valores Monetarios (Cotizado/Venta)
    cotizado_hombre_dia = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cotizado_total = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Descripciones largas
    descripcion_servicio = models.TextField(db_column='descripcion_servicio', null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'cotizaciones_servicios'
        ordering = ['orden', 'id_servicio']

    def __str__(self):
        return f"{self.id_registro} - {self.nombre_servicio or self.descripcion_item}"

class CotizacionAdjunto(models.Model):
    id_adjuntos = models.AutoField(primary_key=True, db_column='id_adjuntos')
    id_registro = models.ForeignKey(
        'Cotizacion', 
        on_delete=models.CASCADE, 
        db_column='id_registro', 
        related_name='adjuntos'
    )
    nombre = models.CharField(max_length=255, db_column='nombre')
    descripcion = models.TextField(null=True, blank=True, db_column='descripcion')
    fecha = models.DateTimeField(default=timezone.now, db_column='fecha')
    id_usuario = models.ForeignKey(
        'users.Usuario', 
        on_delete=models.PROTECT, 
        db_column='id_usuario'
    )
    # Si en la DB es varchar(255), usamos CharField. FileField es para cuando Django gestiona el storage.
    ruta = models.CharField(max_length=255, db_column='ruta')
    activo = models.CharField(max_length=1, default='1', db_column='activo')

    class Meta:
        managed = False
        db_table = 'cotizaciones_adjuntos'

class CotizacionMensaje(models.Model):
    id_mensaje = models.AutoField(primary_key=True)
    # Relación con el padre
    id_registro = models.ForeignKey(
        'Cotizacion', 
        on_delete=models.CASCADE, 
        db_column='id_registro', 
        related_name='mensajes_rel'
    )
    fecha = models.DateTimeField(default=timezone.now)
    # Relación con el usuario que escribe
    id_usuario = models.ForeignKey(
        'users.Usuario', 
        on_delete=models.PROTECT, 
        db_column='id_usuario',
        null=True,
        blank=True
    )
    mensaje = models.TextField(null=True, blank=True)
    
    # Sistema de Alertas
    alerta = models.CharField(max_length=1, default='0') # '1' para Sí, '0' para No
    alerta_fecha = models.DateTimeField(null=True, blank=True)
    alerta_completada = models.DateTimeField(null=True, blank=True)
    
    completo = models.CharField(max_length=1, default='0') # '1' Completado, '0' Pendiente
    activo = models.CharField(max_length=1, default='1')

    class Meta:
        managed = False
        db_table = 'cotizaciones_mensajes' # Verifica si es 'mensajes' o 'messages' según tu SQL
        ordering = ['-fecha']

    def __str__(self):
        return f"Msj {self.id_mensaje} - Cot: {self.id_registro_id}"

class CotizacionSeguimiento(models.Model):
    id_seguimiento = models.AutoField(primary_key=True)
    # Relación con la cotización padre
    id_registro = models.ForeignKey(
        'Cotizacion', 
        on_delete=models.CASCADE, 
        db_column='id_registro',
        related_name='seguimientos'
    )
    fecha = models.DateTimeField(auto_now_add=True)
    detalle = models.CharField(max_length=500, null=True, blank=True) # Ajustado para mensajes largos
    # Relación con el usuario (ID entero)
    id_usuario = models.ForeignKey(
        'users.Usuario', 
        on_delete=models.PROTECT, 
        db_column='id_usuario',
        null=True,
        blank=True
    )
    activo = models.CharField(max_length=1, default='1')

    class Meta:
        managed = False
        db_table = 'cotizaciones_seguimiento'
        ordering = ['-fecha']

    def save(self, *args, **kwargs):
        if self.detalle and len(self.detalle) > 1000:
            self.detalle = self.detalle[:997] + "..."
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Seguimiento {self.id_seguimiento} - Cot: {self.id_registro_id}"

class CotizacionCondicionGeneral(models.Model):
    # Usamos id_condicion_general como PK manual si ya existe en SQL
    id_condicion_general = models.AutoField(primary_key=True)
    
    # La relación con la tabla padre 'cotizaciones'
    # db_column='id_registro' asegura que coincida con el nombre en SQL
    id_registro = models.OneToOneField(
        'Cotizacion', 
        on_delete=models.CASCADE, 
        db_column='id_registro',
        related_name='condiciones_extendidas'
    )
    
    descripcion = models.TextField(db_column='descripcion', blank=True, null=True)
    fecha = models.DateTimeField(db_column='fecha', auto_now=True)

    class Meta:
        managed = False  # Ponemos False porque la tabla ya existe en SQL
        db_table = 'cotizaciones_condiciones_generales'

#========================================================================================
##=====================##
## APERTURA COTIZACION ##
##=====================##
class CotizacionApertura(models.Model):
    # ── IDENTIFICADORES Y RELACIONES PRINCIPALES ────────────────
    id_apertura = models.AutoField(primary_key=True, db_column='id_apertura')
    
    # FK hacia tu modelo Cotizacion recién refactorizado
    id_registro = models.ForeignKey(
        'Cotizacion', 
        on_delete=models.CASCADE, 
        db_column='id_registro', 
        null=True, 
        blank=True,
        related_name='aperturas'
    )

    # ── PERIODOS Y DATOS DE LA ORDEN ───────────────────────────
    anno = models.IntegerField(null=True, blank=True, db_column='anno')  # year(4) en MySQL
    mes = models.IntegerField(null=True, blank=True, db_column='mes')
    numero_orden = models.CharField(max_length=70, null=True, blank=True, db_column='numero_orden')
    estado_orden = models.IntegerField(null=True, blank=True, default=1, db_column='estado_orden')

    # ── FECHAS PROCESO ─────────────────────────────────────────
    fecha_orden = models.DateTimeField(null=True, blank=True, db_column='fecha_orden')
    fecha_entrega = models.DateTimeField(null=True, blank=True, db_column='fecha_entrega')
    mes_entrega = models.IntegerField(null=True, blank=True, db_column='mes_entrega')
    fecha_factura = models.DateTimeField(null=True, blank=True, db_column='fecha_factura')

    # ── PLAZOS (RELACIÓN CON UNIDAD DE TIEMPO) ─────────────────
    orden_plazo_valor = models.IntegerField(null=True, blank=True, db_column='orden_plazo_valor')
    orden_plazo_unidad = models.ForeignKey(
        'core.UnidadTiempo', 
        on_delete=models.SET_NULL, 
        db_column='orden_plazo_unidad', 
        null=True, 
        blank=True,
        related_name='plazos_apertura'
    )

    # ── VALORES ECONÓMICOS Y DESGLOSE COMPRAS ──────────────────
    total_orden = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='total_orden')
    presupuesto = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='presupuesto')
    
    orden_compra_equipos = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='orden_compra_equipos')
    orden_compra_materiales = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='orden_compra_materiales')
    orden_compra_hh = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='orden_compra_hh')
    orden_compra_entrega = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='orden_compra_entrega')
    orden_compra_costo_servicios = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='orden_compra_costo_servicios')
    orden_compra_otros = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='orden_compra_otros')
    
    totfa = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='totfa')
    salfa = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='salfa')
    uti_des = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='uti_des')

    # ── DOCUMENTACIÓN ADJUNTA Y RESPONSABLES ───────────────────
    orden_adjunta = models.CharField(max_length=255, null=True, blank=True, db_column='orden_adjunta')
    responsables = models.TextField(null=True, blank=True, db_column='responsables')
    oobs = models.CharField(max_length=255, null=True, blank=True, db_column='oobs')
    doc = models.CharField(max_length=50, null=True, blank=True, db_column='doc')
    
    # Snapshot/Históricos de documentos adjuntos
    do1 = models.CharField(max_length=255, null=True, blank=True, db_column='do1')
    do2 = models.CharField(max_length=255, null=True, blank=True, db_column='do2')
    do3 = models.CharField(max_length=255, null=True, blank=True, db_column='do3')
    ti1 = models.CharField(max_length=255, null=True, blank=True, db_column='ti1')
    ti2 = models.CharField(max_length=255, null=True, blank=True, db_column='ti2')
    ti3 = models.CharField(max_length=255, null=True, blank=True, db_column='ti3')

    # ── DESCUENTOS Y CONTROLES ADICIONALES ─────────────────────
    des_a = models.CharField(max_length=1, null=True, blank=True, db_column='des_a')
    des_t = models.CharField(max_length=1, null=True, blank=True, db_column='des_t')
    des_m = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='des_m')
    des_p = models.DecimalField(max_digits=11, decimal_places=2, null=True, blank=True, db_column='des_p')
    
    anno_a = models.CharField(max_length=4, default='2026', null=True, blank=True, db_column='anno_a')
    prio = models.CharField(max_length=1, default='0', null=True, blank=True, db_column='prio')

    # Indicators / Flags de procesos
    poceq = models.IntegerField(default=1, null=True, blank=True, db_column='poceq')
    pocma = models.IntegerField(default=1, null=True, blank=True, db_column='pocma')
    pocrh = models.IntegerField(default=0, null=True, blank=True, db_column='pocrh')
    pocse = models.IntegerField(default=0, null=True, blank=True, db_column='pocse')
    pocot = models.IntegerField(default=0, null=True, blank=True, db_column='pocot')
    pger = models.IntegerField(default=1, null=True, blank=True, db_column='pger')
    
    envio = models.IntegerField(null=True, blank=True, db_column='envio')
    pres = models.IntegerField(default=0, null=True, blank=True, db_column='pres')

    class Meta:
        managed = False  # Mantenlo en False si la base de datos ya maneja la estructura real
        db_table = 'cotizaciones_apertura'

    def __str__(self):
        return f"Apertura {self.id_apertura} - Orden: {self.numero_orden or 'S/N'}"

#========================================================================================

# (El modelo Notificacion se trasladó a su propia app de notificaciones_api)

#========================================================================================

##================##
## DATOS DE BD_VC ##
##================##

# alm_articulos
class alm_articulos(models.Model):
    codigo = models.CharField(max_length=30, primary_key=True)  # Código del cliente o registro
    nombre = models.CharField(max_length=200, blank=True, null=True)
    grupo = models.CharField(max_length=5, blank=True, null=True)
    um = models.CharField(max_length=10, blank=True, null=True)
    descripcion = models.CharField(max_length=100, blank=True, null=True)
    precio_s = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    precio_d = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    cantidad = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    ocodigo = models.CharField(max_length=15, blank=True, null=True)
    stock_min = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    stock_max = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    descuento = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    proveedor = models.CharField(max_length=70, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo

    class Meta:
        managed = False
        db_table = "alm_articulos"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.nombre})"




class ObjetivoAnual(models.Model):
    anno = models.IntegerField(unique=True)
    encargado = models.CharField(max_length=150, blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "objetivo_anual"

    def __str__(self):
        return f"Objetivo {self.anno}"

class ObjetivoAnualArea(models.Model):
    objetivo = models.ForeignKey(
        ObjetivoAnual,
        related_name="areas",
        on_delete=models.CASCADE
    )

    area = models.CharField(max_length=50)
    minimo = models.DecimalField(max_digits=15, decimal_places=2)
    maximo = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = "objetivo_anual_area"
        unique_together = ("objetivo", "area")

    def __str__(self):
        return f"{self.area} - {self.objetivo.anno}"
    objetivo = models.ForeignKey(
        ObjetivoAnual,
        related_name="areas",
        on_delete=models.CASCADE
    )

    area = models.CharField(max_length=50)
    minimo = models.DecimalField(max_digits=15, decimal_places=2)
    maximo = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = "objetivo_anual_area"
        unique_together = ("objetivo", "area")

    def __str__(self):
        return f"{self.area} - {self.objetivo.anno}"

# vc_tab_notas
class vc_tab_notas(models.Model):
    codigo = models.CharField(max_length=2, primary_key=True)
    nombre = models.TextField(blank=True, null=True) # Usamos TextField porque en la imagen es tipo 'text'
    activo = models.CharField(max_length=1, default="S") # 'S' para Activo, 'N' para Inactivo según varchar(1)

    class Meta:
        managed = False
        db_table = "vc_tab_notas"

    def __str__(self):
        return self.nombre if self.nombre else f"Nota {self.codigo}"

    def get_nombre(self):
        return self.nombre if self.nombre else ""

# vc_mov_orden
class vc_mov_orden(models.Model):
    # --- IDENTIFICACIÓN PRINCIPAL ---
    num = models.CharField(max_length=10, primary_key=True) # Nro de Orden / Cotización
    fec = models.DateField(default=timezone.now)           # Fecha de Emisión
    tip = models.CharField(max_length=2, blank=True, null=True) # Tipo de Movimiento

    # --- DATOS DEL CLIENTE ---
    codcli = models.CharField(max_length=5)                 # Código de Cliente
    nomcli = models.CharField(max_length=150, blank=True, null=True) # Nombre/Razón Social
    ruccli = models.CharField(max_length=20, blank=True, null=True) # RUC Cliente
    dircli = models.CharField(max_length=200, blank=True, null=True) # Dirección

    # --- DETALLES Y COMENTARIOS ---
    det = models.TextField(blank=True, null=True)           # Glosa / Detalle General
    obs = models.TextField(blank=True, null=True)           # Observaciones adicionales
    
    # --- VALORES MONETARIOS ---
    mon = models.CharField(max_length=3, default='S/.')     # Moneda (S/. o US$)
    tc  = models.DecimalField(max_digits=10, decimal_places=3, default=0.000) # Tipo de Cambio
    imp = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)  # Importe (Subtotal)
    igv = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)  # IGV
    tot = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)  # Total Final (Venta)
    
    # --- ESTADOS Y CONTROL ---
    est = models.CharField(max_length=2) # Estado (Ej: '01' Pendiente, '05' Cerrado, '00' Anulado)
    con = models.CharField(max_length=2, blank=True, null=True) # Condición de Pago
    
    # --- ASIGNACIÓN Y VENDEDORES ---
    usu = models.CharField(max_length=20, blank=True, null=True) # Usuario/Vendedor asignado
    are = models.CharField(max_length=20, blank=True, null=True) # Área que genera la orden
    
    # --- FECHAS DE SEGUIMIENTO ---
    freg = models.DateTimeField(auto_now_add=True) # Fecha de registro en sistema
    fent = models.DateField(blank=True, null=True) # Fecha de entrega/cierre pactada
    
    # --- CAMPOS DINÁMICOS / EXTRAS (Siguiendo tu patrón o1, o2...) ---
    o1 = models.CharField(max_length=100, blank=True, null=True)
    o2 = models.CharField(max_length=100, blank=True, null=True)
    o3 = models.CharField(max_length=100, blank=True, null=True)
    o4 = models.CharField(max_length=100, blank=True, null=True)
    o5 = models.CharField(max_length=100, blank=True, null=True)
    o6 = models.CharField(max_length=100, blank=True, null=True)
    o7 = models.CharField(max_length=100, blank=True, null=True)
    o8 = models.CharField(max_length=100, blank=True, null=True)

    # --- CAMPOS NUMÉRICOS DE APOYO ---
    n1 = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    n2 = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    # --- DATOS PARA GRAFICO ---
    otot = models.DecimalField(max_digits=11, decimal_places=2, default=0.00)
    ofec = models.DateField(blank=True, null=True)
    cotin = models.CharField(max_length=70, blank=True, null=True)
    anno_a = models.CharField(max_length=4, blank=True, null=True, db_column="anno_a", default="2026")
    oesta = models.CharField(max_length=1, blank=True, null=True)

    class Meta:
        managed = False  # Importante: No modifica la tabla real de la DB
        db_table = "vc_mov_orden"
        ordering = ["-fec", "-num"]

    def __str__(self):
        return f"{self.num} | {self.nomcli} | {self.tot}"

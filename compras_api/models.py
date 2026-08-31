from django.db import models

class SolicitudOrdenCompra(models.Model):
    id_solicitud = models.AutoField(primary_key=True, db_column='id_registro')
    nivel_grupo = models.IntegerField(null=True, blank=True)
    cog = models.CharField(max_length=100, null=True, blank=True)
    num = models.IntegerField(null=True, blank=True)
    fecha = models.DateTimeField(null=True, blank=True)
    id_area = models.ForeignKey('users.Area', on_delete=models.PROTECT, db_column='id_area', null=True, blank=True)
    id_apertura = models.ForeignKey(
        'cotizaciones_api.CotizacionApertura', 
        on_delete=models.SET_NULL, 
        db_column='id_apertura', 
        null=True, 
        blank=True,
        related_name='solicitudes_compra'
    )
    codigo = models.CharField(max_length=100, null=True, blank=True)
    id_solicitante = models.ForeignKey('users.Usuario', on_delete=models.PROTECT, db_column='id_solicitante', null=True, blank=True)
    referencia = models.CharField(max_length=500, null=True, blank=True)
    numero_orden = models.CharField(max_length=100, null=True, blank=True)
    tipo = models.CharField(max_length=45, null=True, blank=True)
    tiempo_entrega = models.CharField(max_length=100, null=True, blank=True)
    tipo_moneda = models.CharField(max_length=45, null=True, blank=True)
    monto_soles = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    tipo_cambio = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000, null=True, blank=True)
    monto_dolares = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    concepto = models.CharField(max_length=1000, null=True, blank=True)
    fecha_orden = models.DateTimeField(null=True, blank=True)
    direccion = models.CharField(max_length=500, null=True, blank=True)
    id_estado = models.ForeignKey('core.EstadoSolicitud', on_delete=models.PROTECT, db_column='id_estado', null=True, blank=True)
    empresa = models.CharField(max_length=255, null=True, blank=True)
    contacto = models.CharField(max_length=255, null=True, blank=True)
    fecha_salida = models.DateTimeField(null=True, blank=True)
    entrega_lugar = models.CharField(max_length=500, null=True, blank=True)
    tipo_movimiento = models.ForeignKey('core.TipoGasto', on_delete=models.SET_NULL, db_column='tipo_movimiento', null=True, blank=True, related_name='solicitudes_compra_mov')
    tipo_gasto = models.CharField(max_length=45, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'solicitud_orden_compra'

    @property
    def id_registro(self):
        return self.id_solicitud

    def __str__(self):
        return f"Solicitud {self.codigo or self.id_solicitud} - {self.referencia or ''}"


class SolicitudPasajes(models.Model):
    id_pasaje = models.AutoField(primary_key=True, db_column='id_registro')
    nivel_grupo = models.IntegerField(null=True, blank=True)
    cog = models.CharField(max_length=100, null=True, blank=True)
    num = models.IntegerField(null=True, blank=True)
    fecha = models.DateTimeField(null=True, blank=True)
    id_area = models.ForeignKey('users.Area', on_delete=models.PROTECT, db_column='id_area', null=True, blank=True)
    id_apertura = models.ForeignKey(
        'cotizaciones_api.CotizacionApertura', 
        on_delete=models.SET_NULL, 
        db_column='id_apertura', 
        null=True, 
        blank=True,
        related_name='solicitudes_pasajes'
    )
    codigo = models.CharField(max_length=100, null=True, blank=True)
    id_solicitante = models.ForeignKey('users.Usuario', on_delete=models.PROTECT, db_column='id_solicitante', null=True, blank=True)
    modo = models.IntegerField(null=True, blank=True)
    empresa = models.CharField(max_length=255, null=True, blank=True)
    tipo_moneda = models.CharField(max_length=45, null=True, blank=True)
    monto_soles = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    tipo_cambio = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000, null=True, blank=True)
    monto_dolares = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    concepto = models.CharField(max_length=1000, null=True, blank=True)
    transporte = models.CharField(max_length=45, null=True, blank=True)
    id_estado = models.ForeignKey('core.EstadoSolicitud', on_delete=models.PROTECT, db_column='id_estado', null=True, blank=True)
    lugar_origen = models.CharField(max_length=255, null=True, blank=True)
    lugar_destino = models.CharField(max_length=255, null=True, blank=True)
    fecha_salida = models.DateTimeField(null=True, blank=True)
    fecha_retorno = models.DateTimeField(null=True, blank=True)
    tipo_movimiento = models.ForeignKey('core.TipoGasto', on_delete=models.SET_NULL, db_column='tipo_movimiento', null=True, blank=True, related_name='solicitudes_pasajes_mov')
    tipo_gasto = models.CharField(max_length=45, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'solicitud_pasajes'

    @property
    def id_registro(self):
        return self.id_pasaje

    def __str__(self):
        return f"Pasaje {self.cog or self.codigo or self.id_pasaje} - {self.lugar_origen} a {self.lugar_destino}"


class SolicitudOrdenCompraDetalle(models.Model):
    id_detalle = models.AutoField(primary_key=True)
    id_registro = models.ForeignKey(
        SolicitudOrdenCompra, 
        on_delete=models.CASCADE, 
        db_column='id_registro', 
        related_name='detalles'
    )
    codigo = models.CharField(max_length=100, null=True, blank=True)
    descripcion = models.CharField(max_length=500, null=True, blank=True)
    cantidad = models.IntegerField(default=0, null=True, blank=True)
    valor = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'solicitud_orden_compra_detalle'

    def __str__(self):
        return f"Detalle OC {self.id_registro_id} - {self.descripcion or ''}"


class SolicitudPasajesDetalle(models.Model):
    id_detalle = models.AutoField(primary_key=True)
    id_registro = models.ForeignKey(
        SolicitudPasajes, 
        on_delete=models.CASCADE, 
        db_column='id_registro', 
        related_name='detalles'
    )
    id_usuario = models.ForeignKey(
        'users.Usuario', 
        on_delete=models.SET_NULL, 
        db_column='id_usuario', 
        null=True, 
        blank=True
    )
    nombre_especial = models.CharField(max_length=255, null=True, blank=True)
    observacion = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'solicitud_pasajes_detalle'

    def __str__(self):
        return f"Detalle Pasaje {self.id_registro_id} - User: {self.id_usuario_id or self.nombre_especial or ''}"



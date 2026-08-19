from django.db import models

class SolicitudOrdenCompra(models.Model):
    id_solicitud = models.AutoField(primary_key=True)
    id_registro = models.IntegerField()
    nivel_grupo = models.IntegerField(null=True, blank=True)
    codigo = models.CharField(max_length=100, null=True, blank=True)
    num = models.IntegerField(null=True, blank=True)
    fecha = models.DateTimeField(null=True, blank=True)
    id_area = models.ForeignKey('users.Area', on_delete=models.PROTECT, db_column='id_area', null=True, blank=True)
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
    id_estado = models.ForeignKey('core.Estado', on_delete=models.PROTECT, db_column='id_estado', null=True, blank=True)
    empresa = models.CharField(max_length=255, null=True, blank=True)
    contacto = models.CharField(max_length=255, null=True, blank=True)
    fecha_salida = models.DateTimeField(null=True, blank=True)
    entrega_lugar = models.CharField(max_length=500, null=True, blank=True)
    tipo_movimiento = models.CharField(max_length=45, null=True, blank=True)
    tipo_gasto = models.CharField(max_length=45, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'solicitud_orden_compra'

    def __str__(self):
        return f"Solicitud {self.codigo or self.id_solicitud} - {self.referencia or ''}"

class SolicitudPasajes(models.Model):
    id_pasaje = models.AutoField(primary_key=True)
    id_registro = models.IntegerField()
    nivel_grupo = models.IntegerField(null=True, blank=True)
    cog = models.CharField(max_length=100, null=True, blank=True)
    num = models.IntegerField(null=True, blank=True)
    fecha = models.DateTimeField(null=True, blank=True)
    id_area = models.ForeignKey('users.Area', on_delete=models.PROTECT, db_column='id_area', null=True, blank=True)
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
    id_estado = models.ForeignKey('core.Estado', on_delete=models.PROTECT, db_column='id_estado', null=True, blank=True)
    lugar_origen = models.CharField(max_length=255, null=True, blank=True)
    lugar_destino = models.CharField(max_length=255, null=True, blank=True)
    fecha_salida = models.DateTimeField(null=True, blank=True)
    fecha_retorno = models.DateTimeField(null=True, blank=True)
    tipo_movimiento = models.CharField(max_length=45, null=True, blank=True)
    tipo_gasto = models.CharField(max_length=45, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'solicitud_pasajes'

    def __str__(self):
        return f"Pasaje {self.cog or self.codigo or self.id_pasaje} - {self.lugar_origen} a {self.lugar_destino}"



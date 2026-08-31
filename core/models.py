from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from simple_history.models import HistoricalRecords
from django.contrib.auth.hashers import check_password, make_password
import datetime


class Rubro(models.Model):
    id_rubro = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=255)
    activo = models.IntegerField(default=1)

    class Meta:
        managed = False
        db_table = 'rubro'

    def __str__(self):
        return self.nombre

class Cliente(models.Model):
    id_cliente = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    iniciales = models.CharField(max_length=45, blank=True, null=True)
    id_rubro = models.ForeignKey(
        Rubro, 
        on_delete=models.SET_NULL, 
        db_column='id_rubro', 
        blank=True, 
        null=True
    )
    ruc = models.CharField(max_length=45, blank=True, null=True)
    direccion = models.CharField(max_length=600)
    tipo = models.IntegerField(blank=True, null=True)
    forma_pago = models.CharField(max_length=100, blank=True, null=True)
    fecha_ingreso = models.DateTimeField(blank=True, null=True)
    pagina_web = models.CharField(max_length=100, blank=True, null=True)
    representante_legal = models.CharField(max_length=100, blank=True, null=True)
    ubicacion = models.CharField(max_length=100, blank=True, null=True)
    logo = models.CharField(max_length=100, blank=True, null=True)
    activo = models.CharField(max_length=1, default='1')

    class Meta:
        managed = False
        db_table = 'clientes'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.ruc} - {self.nombre}"

class Representante(models.Model):
    # Campo primario autoincremental
    id_representante = models.AutoField(primary_key=True)
    
    # Relación real con Cliente. 
    # 'id_cliente' en la DB nueva es un INT que apunta al id_cliente de la tabla clientes.
    id_cliente = models.ForeignKey(
        Cliente, 
        on_delete=models.CASCADE, 
        db_column='id_cliente', 
        related_name='representantes'
    )
    
    # Datos del representante ajustados a los nuevos límites de varchar(100)
    nombre_representante = models.CharField(max_length=100)
    cargo = models.CharField(max_length=100, blank=True, null=True)
    telefono = models.CharField(max_length=100, blank=True, null=True)
    movil = models.CharField(max_length=100, blank=True, null=True)
    email = models.CharField(max_length=100, blank=True, null=True)
    direccion = models.CharField(max_length=100, blank=True, null=True)
    
    # Activo en la nueva tabla es INT (1 o 0) según tu log
    activo = models.IntegerField(default=1)

    class Meta:
        managed = False  # Mantenemos False ya que la tabla existe en tu MySQL
        db_table = 'representantes'
        ordering = ['nombre_representante']

    def __str__(self):
        return f"{self.nombre_representante} - {self.id_cliente.nombre}"

class Estado(models.Model):
    id_estado = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=45)
    activo = models.IntegerField(default=1)
    cotizaciones = models.IntegerField(default=0)
    orden_compra = models.IntegerField(default=0)
    facturacion = models.IntegerField(default=0)

    class Meta:
        managed = False
        db_table = 'estados'

    def __str__(self):
        return self.nombre

class EstadoSolicitud(models.Model):
    id_estado = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=255)
    activo = models.IntegerField(default=1, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'estado_solicitud'

    def __str__(self):
        return self.nombre

class TipoCotizacion(models.Model):
    id_tipo = models.CharField(max_length=1, primary_key=True)
    nombre = models.CharField(max_length=45)
    activo = models.IntegerField(default=1)

    class Meta:
        managed = False  
        db_table = 'tipo_coti'

    def __str__(self):
        return f"{self.id_tipo} - {self.nombre}"

class UnidadTiempo(models.Model):
    # PK autoincremental según tu esquema
    id_tiempo = models.AutoField(primary_key=True)
    
    # El código corto (ej: 'DI', 'ME')
    codigo = models.CharField(max_length=2)
    
    # El nombre descriptivo (ej: 'Días', 'Meses')
    nombre = models.CharField(max_length=50)
    
    # Campo activo como entero (1=Activo, 0=Inactivo)
    activo = models.IntegerField(default=1)

    class Meta:
        managed = False  # Mantenemos False por seguridad de tus tablas en MySQL
        db_table = 'unidad_tiempo'
        verbose_name = 'Unidad de Tiempo'
        verbose_name_plural = 'Unidades de Tiempo'

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

class UnidadMedida(models.Model):
    id_medida = models.AutoField(primary_key=True)
    codigo = models.CharField(max_length=20, null=True, blank=True)
    nombre = models.CharField(max_length=100)
    # En la nueva DB activo es int(1) con default 1
    activo = models.IntegerField(default=1, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'unidad_medida'
        ordering = ['nombre']
        verbose_name = "Unidad de Medida"
        verbose_name_plural = "Unidades de Medida"

    def __str__(self):
        return self.nombre

class TipoGasto(models.Model):
    # ── IDENTIFICADOR (Nuevo PK Auto-incremental) ──
    id_tipo_gasto = models.AutoField(primary_key=True)
    
    # ── DATOS DEL TIPO ──
    # El antiguo 'codigo' ya no es PK, ahora es un campo de referencia
    codigo = models.CharField(max_length=2)
    
    # Ampliamos el max_length a 1000 según tu nueva estructura de BD
    nombre = models.CharField(max_length=1000)
    
    # ── ESTADO (Refactorizado de VARCHAR a INT) ──
    # 0 = Inactivo, 1 = Activo
    activo = models.IntegerField(default=1, null=True, blank=True)

    class Meta:
        managed = False  # Mantenemos False para usar tu tabla de MySQL ya creada
        db_table = 'tipo_gasto'
        verbose_name = "Tipo de Gasto"
        verbose_name_plural = "Tipos de Gasto"

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

class TipoMarca(models.Model):
    # ── IDENTIFICADOR (PK Auto-incremental) ──
    id_marca = models.AutoField(primary_key=True)
    
    # ── DATOS DE LA MARCA ──
    # Se elimina el campo 'codigo' ya que no figura en la nueva estructura de tabla
    nombre = models.CharField(max_length=45)
    
    # Según tu descripción técnica de la tabla nueva, sigue siendo varchar
    # Aunque el comentario de tu imagen dice 'int', mantengo varchar(45) por el 'Field Type'
    activo = models.CharField(max_length=45)

    class Meta:
        managed = False  # Apunta a la tabla ya existente en proyecto_sigecom
        db_table = 'tipo_marca'
        verbose_name = "Marca"
        verbose_name_plural = "Marcas"

    def __str__(self):
        return self.nombre

class TipoPersonal(models.Model):
    id_personal = models.AutoField(primary_key=True)
    codigo = models.CharField(max_length=45)
    nombre = models.CharField(max_length=1000)
    costo_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    costo_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Relación con la tabla de áreas
    id_area = models.ForeignKey(
        'users.Area', 
        on_delete=models.PROTECT, 
        db_column='id_area'
    )
    
    # En la nueva DB activo es int(11) con default 1
    activo = models.IntegerField(default=1)

    class Meta:
        managed = False
        db_table = 'tipo_personal'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

class TipoGastoDetalle(models.Model):
    id_gasto_detalle = models.AutoField(primary_key=True)
    codigo = models.CharField(max_length=10)
    nombre = models.CharField(max_length=1000)
    
    # Relación con la tabla principal de tipos de gasto
    id_tipo_gasto = models.ForeignKey(
        'TipoGasto', # Asegúrate de que este sea el nombre de tu modelo padre
        on_delete=models.CASCADE,
        db_column='id_tipo_gasto'
    )
    
    # Nuevo estándar: int(11) con default 1
    activo = models.IntegerField(default=1)

    class Meta:
        managed = False
        db_table = 'tipo_gasto_detalle'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

class Producto(models.Model):
    id_producto = models.AutoField(primary_key=True)
    # Relación con la tabla tipo_marca
    id_marca = models.ForeignKey(
        'TipoMarca', 
        on_delete=models.PROTECT, 
        db_column='id_marca'
    )
    codigo = models.CharField(max_length=30)
    codigo2 = models.CharField(max_length=60, null=True, blank=True)
    nombre = models.TextField()
    contenido_valor = models.DecimalField(max_digits=10, decimal_places=2, default=1.00, null=True, blank=True)
    # Relación con la tabla unidad_media
    id_medida = models.ForeignKey(
        'UnidadMedida', 
        on_delete=models.PROTECT, 
        db_column='id_medida',
        null=True, 
        blank=True
    )
    descripcion = models.TextField(null=True, blank=True)
    precio_soles = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, null=True, blank=True)
    precio_dolares = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, null=True, blank=True)
    cantidad = models.IntegerField(default=0, null=True, blank=True)
    stock_min = models.IntegerField(default=0, null=True, blank=True)
    stock_max = models.IntegerField(default=0, null=True, blank=True)
    descuento = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, null=True, blank=True)
    proveedor = models.CharField(max_length=100, null=True, blank=True)
    activo = models.IntegerField(default=1)

    class Meta:
        managed = False
        db_table = 'producto'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

class Nota(models.Model):
    id_nota = models.AutoField(primary_key=True)
    # codigo es único en la nueva DB
    codigo = models.CharField(max_length=2, unique=True)
    descripcion = models.TextField() # Corresponde a longtext
    # tinyint(1) en MySQL se mapea como IntegerField o BooleanField
    activo = models.IntegerField(default=1)

    class Meta:
        managed = False
        db_table = 'notas'
        ordering = ['codigo']

    def __str__(self):
        return f"{self.codigo} - {self.descripcion[:50]}..."

class Modulo(models.Model):
    id_modulo = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=255)
    activo = models.IntegerField(default=1)

    class Meta:
        managed = False
        db_table = 'modulos'

    def __str__(self):
        return self.nombre

class ObjetivoAnual(models.Model):
    id_objetivo = models.AutoField(primary_key=True)
    anno = models.PositiveIntegerField(db_column='anno')    
    id_modulo = models.ForeignKey(
        Modulo,
        on_delete=models.SET_NULL,
        db_column='id_modulo',
        blank=True,
        null=True
    )
    minimo = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    maximo = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    id_usuario = models.ForeignKey(
        'users.Usuario', 
        on_delete=models.PROTECT, 
        db_column='id_usuario' 
    )
    activo = models.BooleanField(default=True, null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        managed = False
        db_table = "objetivo_anual"
        # Ahora el constraint de unicidad es por año + módulo (permite N módulos por año)
        unique_together = ("anno", "id_modulo")

    def __str__(self):
        modulo_str = f" - Módulo: {self.id_modulo.nombre}" if self.id_modulo else " - General"
        return f"Objetivo {self.anno}{modulo_str} - Min: S/{self.minimo} / Max: S/{self.maximo}"

class ObjetivoAnualArea(models.Model):
    id_objetivo_anno = models.AutoField(primary_key=True)
    
    id_objetivo = models.ForeignKey(
        ObjetivoAnual,
        related_name="areas",
        on_delete=models.CASCADE,
        db_column='id_objetivo'
    )
    
    id_area = models.ForeignKey(
        'users.Area',
        on_delete=models.PROTECT,
        db_column='id_area'
    )
    
    minimo = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0.00, 
        null=True, 
        blank=True
    )
    
    maximo = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0.00, 
        null=True, 
        blank=True
    )

    class Meta:
        managed = False
        db_table = "objetivo_anual_area"
        unique_together = ("id_objetivo", "id_area")

    def __str__(self):
        return f"{self.id_area.nombre} - Objetivo Anual {self.id_objetivo.anno}"

class Gerencia(models.Model):
    id_gerencia = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=255)
    id_encargado = models.ForeignKey(
        'users.Usuario', 
        on_delete=models.SET_NULL, 
        db_column='id_encargado',
        blank=True, 
        null=True
    )
    activo = models.IntegerField(default=1)

    class Meta:
        managed = False
        db_table = 'gerencia'

    def __str__(self):
        return self.nombre



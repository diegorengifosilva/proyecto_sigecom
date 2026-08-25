from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from simple_history.models import HistoricalRecords
from django.contrib.auth.hashers import check_password, make_password
import datetime


class Area(models.Model):
    id_area = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    responsable = models.CharField(max_length=100)
    telefono = models.CharField(max_length=45, blank=True, null=True)
    correlativo = models.IntegerField(blank=True, null=True)
    activo = models.IntegerField()  # int(11) NO NULL

    class Meta:
        managed = False
        db_table = "areas"

    def __str__(self):
        return self.nombre

class Cargo(models.Model):
    id_cargo = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    nombre_ingles = models.CharField(max_length=100, blank=True, null=True)
    nivel = models.IntegerField(blank=True, null=True)
    activo = models.CharField(max_length=45, blank=True, null=True) # En tu tabla es varchar(45)

    class Meta:
        managed = False
        db_table = "cargos"

    def __str__(self):
        return self.nombre

class Banco(models.Model):
    id_banco = models.AutoField(primary_key=True)
    codigo = models.CharField(max_length=2, unique=True)
    nombre = models.CharField(max_length=150)
    activo = models.IntegerField(default=1)

    class Meta:
        managed = False
        db_table = "bancos"

    def __str__(self):
        return self.nombre

class Usuario(models.Model):
    # Identificadores y Seguridad
    id_usuario = models.AutoField(primary_key=True)
    usuario = models.CharField(max_length=100, unique=True)
    contrasena = models.CharField(max_length=100, db_column='contrasena')
    
    # Información Personal
    nombre_completo = models.CharField(max_length=100)
    dni = models.CharField(max_length=8, blank=True, null=True)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    genero = models.CharField(max_length=1, blank=True, null=True)
    estado_civil = models.CharField(max_length=11, blank=True, null=True)
    direccion = models.CharField(max_length=200, blank=True, null=True)
    
    # Contacto
    correo = models.CharField(max_length=100, blank=True, null=True) # Corporativo
    correo_personal = models.CharField(max_length=100, blank=True, null=True)
    telefono = models.CharField(max_length=100, blank=True, null=True)
    movil_personal = models.CharField(max_length=100, blank=True, null=True)
    movil_coorporativo = models.CharField(max_length=100, blank=True, null=True)
    
    # Laboral / Relaciones
    id_area = models.ForeignKey('Area', on_delete=models.PROTECT, db_column='id_area')
    id_cargo = models.ForeignKey('Cargo', on_delete=models.PROTECT, db_column='id_cargo')
    fecha_ingreso = models.DateField(blank=True, null=True)
    activo = models.IntegerField(default=1) # 0=Inactivo, 1=Activo

    # NUEVA RELACIÓN MUCHOS A MUCHOS (N:M)
    modulos = models.ManyToManyField(
        'core.Modulo',
        through='UsuarioModulo',
        through_fields=('id_usuario', 'id_modulo'),
        related_name='usuarios',
        blank=True
    )

    # Financiero
    id_banco = models.ForeignKey('Banco', on_delete=models.PROTECT, db_column='id_banco')
    nro_cuenta = models.CharField(max_length=100, blank=True, null=True)
    afp = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "usuarios"

    # ==============================
    # Compatibilidad SimpleJWT
    # ==============================
    USERNAME_FIELD = "usuario"
    REQUIRED_FIELDS = ['nombre_completo', 'correo']

    @property
    def is_authenticated(self): return True

    @property
    def is_anonymous(self): return False

    @property
    def is_active(self): return self.activo == 1

    def get_username(self): return self.usuario

    @property
    def password(self): return self.contrasena

    def set_password(self, raw_password):
        self.contrasena = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.contrasena)

    def __str__(self):
        return self.nombre_completo

class UsuarioModulo(models.Model):
    id_usuario_modulo = models.AutoField(primary_key=True)
    id_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='id_usuario')
    id_modulo = models.ForeignKey('core.Modulo', on_delete=models.CASCADE, db_column='id_modulo')

    class Meta:
        managed = False
        db_table = 'usuario_modulo'
        unique_together = ('id_usuario', 'id_modulo')


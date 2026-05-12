from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from simple_history.models import HistoricalRecords
from django.contrib.auth.hashers import check_password, make_password
import datetime

class Cliente(models.Model):
    id_cliente = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    iniciales = models.CharField(max_length=45, blank=True, null=True)
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

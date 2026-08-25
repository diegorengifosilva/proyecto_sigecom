from django.db import models
from users.models import Usuario, Area

class SugerenciaQueja(models.Model):
    id_registro = models.AutoField(primary_key=True)
    anno = models.IntegerField(blank=True, null=True)
    mes = models.IntegerField(blank=True, null=True)
    fecha = models.DateTimeField(blank=True, null=True)
    asunto = models.CharField(max_length=255, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    solucion = models.TextField(blank=True, null=True)
    
    # Foreign keys
    id_area = models.ForeignKey(Area, on_delete=models.SET_NULL, db_column='id_area', blank=True, null=True)
    id_gerencia = models.ForeignKey('core.Gerencia', on_delete=models.SET_NULL, db_column='id_gerencia', blank=True, null=True)
    id_usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, db_column='id_usuario', blank=True, null=True)
    
    estado = models.CharField(max_length=45, blank=True, null=True, default='PENDIENTE')
    anonimo = models.IntegerField(default=0)  # 0=NO, 1=Si
    tipo = models.CharField(max_length=1, default='S')  # S=Sugerencia, Q=Queja
    prioridad = models.IntegerField(default=1)  # 1=Baja, 2=Media, 3=Alta

    class Meta:
        managed = False
        db_table = 'sugerencias_quejas'

    def __str__(self):
        return f"{self.tipo} - {self.asunto or 'Sin Asunto'} ({self.id_registro})"

import os
from django.conf import settings
from django.core.files.storage import FileSystemStorage

BUZON_ADJUNTOS_DIR = os.path.join(settings.BASE_DIR, 'buzon_api', 'adjuntos')
os.makedirs(BUZON_ADJUNTOS_DIR, exist_ok=True)
buzon_storage = FileSystemStorage(location=BUZON_ADJUNTOS_DIR)

class SugerenciaAdjunto(models.Model):
    id_adjunto = models.AutoField(primary_key=True)
    id_registro = models.ForeignKey(SugerenciaQueja, on_delete=models.CASCADE, db_column='id_registro', related_name='adjuntos')
    archivo = models.FileField(storage=buzon_storage, upload_to="")
    nombre = models.CharField(max_length=255)
    fecha_subida = models.DateTimeField(auto_now_add=True)
    subido_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, db_column='id_usuario', blank=True, null=True)

    class Meta:
        db_table = 'sugerencias_adjuntos'

    def __str__(self):
        return f"Adjunto {self.nombre} para {self.id_registro_id}"

class SugerenciaSeguimiento(models.Model):
    id_seguimiento = models.AutoField(primary_key=True)
    id_registro = models.ForeignKey(SugerenciaQueja, on_delete=models.CASCADE, db_column='id_registro', related_name='seguimientos')
    detalle = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, db_column='id_usuario', blank=True, null=True)

    class Meta:
        db_table = 'sugerencias_seguimientos'

    def __str__(self):
        return f"Seguimiento {self.id_seguimiento} para {self.id_registro_id}"

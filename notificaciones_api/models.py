from django.db import models
from django.conf import settings

class Notificacion(models.Model):
    TIPO_CHOICES = (
        ("urgente", "Urgente"),
        ("atencion", "Atención"),
        ("informativo", "Informativo"),
    )
    
    MODULO_CHOICES = (
        ("comercial", "Comercial"),
        ("logistica", "Logística"),
    )

    id_notificacion = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notificaciones_usuario"
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    modulo = models.CharField(max_length=20, choices=MODULO_CHOICES)
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField()
    leido = models.BooleanField(default=False)
    fecha = models.DateTimeField(auto_now_add=True)
    cantidad = models.IntegerField(default=0)
    referencia_id = models.CharField(max_length=100, blank=True, null=True) # ID de cotizacion o movimiento
    metadata = models.JSONField(blank=True, null=True)

    class Meta:
        db_table = "notificaciones"
        ordering = ["-fecha"]

    def __str__(self):
        return f"[{self.modulo.upper()}] {self.titulo} - User: {self.usuario.usuario}"

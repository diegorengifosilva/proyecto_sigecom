from django.db import models
from django.conf import settings

ETAPAS_PROYECTO = [
    ("inicio", "Inicio"),
    ("planificacion", "Planificación"),
    ("ejecucion", "Ejecución"),
    ("monitoreo", "Monitoreo y Control"),
    ("cierre", "Cierre"),
]

ESTADOS_PROYECTO = [
    ("Apertura", "Apertura"),
    ("Inicio", "Inicio"),
    ("Planificación", "Planificación"),
    ("Ejecución", "Ejecución"),
    ("Cierre", "Cierre"),
    ("Cerrado", "Cerrado"),
    ("Pausado", "Pausado"),
]

TIPOS_PROYECTO = [
    ("infraestructura", "Infraestructura"),
    ("tecnologia", "Tecnología"),
    ("servicios", "Servicios"),
    ("construccion", "Construcción"),
    ("mineria", "Minería"),
    ("automatizacion", "Automatización Industrial"),
    ("otro", "Otro"),
]

MODALIDADES = [
    ("suma_alzada", "Suma Alzada"),
    ("costo_reembolsable", "Costo Reembolsable"),
    ("llave_en_mano", "Llave en Mano"),
    ("mixto", "Mixto"),
]

MONEDAS = [
    ("USD", "Dólar Estadounidense"),
    ("PEN", "Sol Peruano"),
]

UNIDADES_NEGOCIO = [
    ("Minería", "Minería"),
    ("Petroquímica", "Petroquímica"),
    ("Industria", "Industria"),
    ("Safety", "Safety"),
]

class ProyectoEv(models.Model):
    """
    Modelo ampliado de Proyecto con campos para gestión completa.
    Compatible con frontend de PMInsight.
    """
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="proyectos")

    # Identificación y básicos
    codigo = models.CharField(max_length=50, unique=True)  # NUEVO: Código único del proyecto
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    cliente = models.CharField(max_length=255, blank=True, null=True)  # NUEVO: Nombre del cliente

    # Información estratégica
    tipo_proyecto = models.CharField(max_length=50, choices=TIPOS_PROYECTO, default="infraestructura")
    unidad_negocio = models.CharField(max_length=100, choices=UNIDADES_NEGOCIO, default="Minería")  # NUEVO
    ubicacion = models.CharField(max_length=255, blank=True, null=True)
    modalidad_contratacion = models.CharField(max_length=50, choices=MODALIDADES, default="suma_alzada")

    # Responsables
    entidad_cliente = models.CharField(max_length=255, blank=True, null=True)
    responsable = models.CharField(max_length=255, blank=True, null=True)
    lider_email = models.EmailField(blank=True, null=True)  # NUEVO: Email del líder del proyecto

    # Contacto del cliente - NUEVO
    contacto_cliente_nombre = models.CharField(max_length=255, blank=True, null=True)
    contacto_cliente_email = models.EmailField(blank=True, null=True)
    contacto_cliente_telefono = models.CharField(max_length=50, blank=True, null=True)

    # Cronograma base
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    fecha_base_aprobada = models.DateField(null=True, blank=True)

    # Estado y etapa
    etapa_actual = models.CharField(max_length=20, choices=ETAPAS_PROYECTO, default="inicio")
    estado = models.CharField(max_length=20, choices=ESTADOS_PROYECTO, default="Apertura")  # ACTUALIZADO

    # Presupuesto ampliado - NUEVO sistema de presupuestos
    moneda = models.CharField(max_length=3, choices=MONEDAS, default="USD")
    presupuesto_gastos = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)  # Base de gastos
    presupuesto_hh = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)      # Presupuesto HH
    presupuesto_contingencia = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)  # Contingencia
    presupuesto_utilidad = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)      # Utilidad

    # Presupuesto legacy (mantener compatibilidad)
    presupuesto_estimado = models.FloatField(default=0.0)
    presupuesto_aprobado = models.FloatField(default=0.0)

    # Costos reales acumulados - NUEVO
    gasto_real = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)     # Suma de gastos reales
    costo_hh_real = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)  # Suma de HH reales

    # Datos adicionales como JSON strings - NUEVO
    gastos = models.TextField(blank=True, null=True)  # JSON array de gastos
    hh = models.TextField(blank=True, null=True)      # JSON array de registros HH
    notas = models.TextField(blank=True, null=True)   # JSON array de notas

    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    @property
    def presupuesto_total(self):
        """Calcula el presupuesto total sumando todos los componentes"""
        return float(
            self.presupuesto_gastos +
            self.presupuesto_hh +
            self.presupuesto_contingencia +
            self.presupuesto_utilidad
        )

    @property
    def costo_real_total(self):
        """Calcula el costo real total"""
        return float(self.gasto_real + self.costo_hh_real)

    @property
    def saldo(self):
        """Calcula el saldo disponible"""
        return self.presupuesto_total - self.costo_real_total

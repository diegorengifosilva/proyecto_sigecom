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
    ("activo", "Activo"),
    ("pausado", "Pausado"),
    ("finalizado", "Finalizado"),
    ("cancelado", "Cancelado"),
]

TIPOS_PROYECTO = [
    ("infraestructura", "Infraestructura"),
    ("tecnologia", "Tecnología"),
    ("servicios", "Servicios"),
    ("otro", "Otro"),
]

MODALIDADES = [
    ("suma_alzada", "Suma Alzada"),
    ("costo_reembolsable", "Costo Reembolsable"),
    ("llave_en_mano", "Llave en Mano"),
    ("mixto", "Mixto"),
]

class ProyectoEv(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="proyectos")

    # Información estratégica
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    tipo_proyecto = models.CharField(max_length=50, choices=TIPOS_PROYECTO, default="infraestructura")
    ubicacion = models.CharField(max_length=255, blank=True, null=True)
    modalidad_contratacion = models.CharField(max_length=50, choices=MODALIDADES, default="suma_alzada")
    entidad_cliente = models.CharField(max_length=255, blank=True, null=True)
    responsable = models.CharField(max_length=255, blank=True, null=True)

    # Cronograma base
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    fecha_base_aprobada = models.DateField(null=True, blank=True)

    etapa_actual = models.CharField(max_length=20, choices=ETAPAS_PROYECTO, default="inicio")
    estado = models.CharField(max_length=20, choices=ESTADOS_PROYECTO, default="activo")

    # Presupuesto
    presupuesto_estimado = models.FloatField(default=0.0)
    presupuesto_aprobado = models.FloatField(default=0.0)

    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nombre
    

class HistorialEv(models.Model):
    proyecto = models.ForeignKey(ProyectoEv, on_delete=models.CASCADE, related_name="historial")
    fecha_registro = models.DateField(auto_now_add=True)

    # Avance físico y temporal
    porcentaje_avance_fisico = models.FloatField(default=0.0)  # EV relacionado
    porcentaje_tiempo_transcurrido = models.FloatField(default=0.0)

    # EVM: valores base
    valor_ganado = models.FloatField(default=0.0)        # EV
    valor_planificado = models.FloatField(default=0.0)   # PV
    costo_real = models.FloatField(default=0.0)          # AC

    # Métricas derivadas
    desviacion_costo = models.FloatField(default=0.0)    # CV = EV - AC
    desviacion_tiempo = models.FloatField(default=0.0)   # SV = EV - PV
    spi = models.FloatField(default=0.0)                 # EV / PV
    cpi = models.FloatField(default=0.0)                 # EV / AC

    # Riesgos acumulados o activos
    riesgos_abiertos = models.IntegerField(default=0)
    severidad_media_riesgos = models.FloatField(default=0.0)

    # Reprogramaciones
    cantidad_reprogramaciones = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.proyecto.nombre} ({self.fecha_registro})"
    
class TareaEv(models.Model):
    ESTADOS_TAREA = [
        ("pendiente", "Pendiente"),
        ("en_progreso", "En Progreso"),
        ("finalizada", "Finalizada"),
        ("atrasada", "Atrasada"),
    ]
    TIPOS_RESPONSABLE = [
        ("persona", "Persona / Colaborador"),
        ("area", "Area / Unidad"),
        ("proveedor", "Proveedor externo"),
    ]

    proyecto = models.ForeignKey(ProyectoEv, on_delete=models.CASCADE, related_name='tareas')
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    responsable = models.CharField(max_length=255, blank=True, null=True)
    area = models.CharField(max_length=120, blank=True, null=True)
    rol = models.CharField(max_length=120, blank=True, null=True)
    tipo_responsable = models.CharField(
        max_length=20,
        choices=TIPOS_RESPONSABLE,
        default='persona'
    )

    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    duracion = models.IntegerField(default=0)  # en días
    peso = models.FloatField(default=0.0)  # % avance que aporta al proyecto
    estado = models.CharField(max_length=20, choices=ESTADOS_TAREA, default='pendiente')

    avance_real = models.FloatField(default=0.0)  # % de avance de esta tarea

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.titulo} ({self.proyecto.nombre})"
    

class CurvaEv(models.Model):
    proyecto = models.ForeignKey(ProyectoEv, on_delete=models.CASCADE, related_name='curva_s')

    fecha = models.DateField()
    pv = models.FloatField(default=0.0)  # Planned Value
    ev = models.FloatField(default=0.0)  # Earned Value
    ac = models.FloatField(default=0.0)  # Actual Cost

    fuente = models.CharField(max_length=100, default='calculado')  # o 'manual'
    comentario = models.TextField(blank=True, null=True)

    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('proyecto', 'fecha')  # evita duplicados por día

    def __str__(self):
        return f"{self.proyecto.nombre} - {self.fecha}"

class GastoReal(models.Model):
    proyecto = models.ForeignKey('ProyectoEv', on_delete=models.CASCADE, related_name='gastos_reales')
    descripcion = models.CharField(max_length=255)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    fecha = models.DateField()
    categoria = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.descripcion} - S/. {self.monto}"

class HorasHombreReal(models.Model):
    tarea = models.ForeignKey('TareaEv', on_delete=models.CASCADE, related_name='horas_reales')
    fecha = models.DateField()
    horas = models.DecimalField(max_digits=6, decimal_places=2)
    recurso = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.tarea.nombre} - {self.horas} h"

class AvanceFisico(models.Model):
    proyecto = models.ForeignKey('ProyectoEv', on_delete=models.CASCADE, related_name='avances_fisicos')
    fecha = models.DateField()
    porcentaje = models.DecimalField(max_digits=5, decimal_places=2)

class AvanceFinanciero(models.Model):
    proyecto = models.ForeignKey('ProyectoEv', on_delete=models.CASCADE, related_name='avances_financieros')
    fecha = models.DateField()
    monto_acumulado = models.DecimalField(max_digits=12, decimal_places=2)

class MiembroEquipoEv(models.Model):
    proyecto = models.ForeignKey(ProyectoEv, on_delete=models.CASCADE, related_name='miembros')
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    correo = models.EmailField()
    rol = models.CharField(max_length=100)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} {self.apellido} - {self.rol}"

# ============================================
# NUEVOS MODELOS PARA CRONOGRAMA EDT/GANTT
# ============================================

class CronogramaVersion(models.Model):
    """
    Versiones de cronogramas de un proyecto.
    Permite mantener historial de versiones del EDT/Gantt.
    """
    proyecto = models.ForeignKey(ProyectoEv, on_delete=models.CASCADE, related_name='cronogramas')
    nombre = models.CharField(max_length=100, help_text="Nombre de la versión (ej: Cronograma v1, v2)")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    es_activa = models.BooleanField(default=True, help_text="Versión activa del cronograma")
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='cronogramas_creados'
    )

    class Meta:
        ordering = ['-fecha_creacion']
        verbose_name = 'Versión de Cronograma'
        verbose_name_plural = 'Versiones de Cronogramas'
        indexes = [
            models.Index(fields=['proyecto', '-fecha_creacion']),
        ]

    def __str__(self):
        return f"{self.proyecto.nombre} - {self.nombre}"


class Tarea(models.Model):
    """
    Tarea de cronograma con soporte completo para EDT/Gantt.
    Incluye niveles jerárquicos, dependencias, calendarios y cálculos de programación.
    """
    NIVELES = [
        (1, 'Nivel 1'),
        (2, 'Nivel 2'),
        (3, 'Nivel 3'),
        (4, 'Nivel 4'),
    ]

    CALENDARIOS = [
        ('8+1', '8+1 (Lun-Vie 8h+1h almuerzo, Sáb 4h)'),
        ('10', '10 horas/día continuo'),
        ('12', '12 horas/día continuo'),
    ]

    # Relación con versión de cronograma
    version = models.ForeignKey(
        CronogramaVersion,
        on_delete=models.CASCADE,
        related_name='tareas',
        help_text="Versión del cronograma a la que pertenece"
    )

    # Identificación y jerarquía
    item = models.IntegerField(help_text="Número de ítem/tarea")
    edt = models.CharField(
        max_length=50,
        blank=True,
        help_text="Código EDT/WBS (ej: 1.2.3)"
    )
    nivel = models.IntegerField(
        choices=NIVELES,
        default=3,
        help_text="Nivel jerárquico (1-4)"
    )

    # Información básica
    nombre = models.CharField(max_length=255, help_text="Nombre de la tarea")
    descripcion = models.TextField(blank=True, help_text="Descripción detallada")

    # Programación (calculado por el sistema)
    inicio = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha/hora de inicio (calculado)"
    )
    fin = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha/hora de fin (calculado)"
    )

    # Duración y calendario
    duracion_min = models.IntegerField(
        default=0,
        help_text="Duración en MINUTOS (no días)"
    )
    calendario = models.CharField(
        max_length=10,
        choices=CALENDARIOS,
        default='8+1',
        help_text="Tipo de calendario laboral"
    )

    # Propiedades especiales
    es_hito = models.BooleanField(
        default=False,
        help_text="Es un hito (duración = 0)"
    )

    # Dependencias
    predecesoras = models.TextField(
        blank=True,
        help_text="Formato: 12,7:SS+1d,9:FF-8h (item:TIPO±lag)"
    )

    # Visualización
    mostrar = models.BooleanField(
        default=True,
        help_text="Mostrar en Gantt"
    )
    timeline = models.BooleanField(
        default=False,
        help_text="Mostrar en Timeline"
    )

    # Campos calculados
    es_resumen = models.BooleanField(
        default=False,
        help_text="Es tarea resumen (calculado según jerarquía)"
    )
    es_critica = models.BooleanField(
        default=False,
        help_text="Está en ruta crítica (holgura = 0)"
    )
    holgura_total = models.IntegerField(
        default=0,
        help_text="Holgura total en minutos"
    )

    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['item']
        unique_together = ['version', 'item']
        verbose_name = 'Tarea de Cronograma'
        verbose_name_plural = 'Tareas de Cronograma'
        indexes = [
            models.Index(fields=['version', 'item']),
            models.Index(fields=['version', 'es_critica']),
            models.Index(fields=['version', 'nivel']),
        ]

    def __str__(self):
        return f"{self.item} - {self.nombre}"


class DocumentoProyecto(models.Model):
    """
    Documentos y archivos adjuntos del proyecto.
    Soporta imágenes, PDFs, planos, etc.
    """
    TIPOS = [
        ('imagen', 'Imagen'),
        ('documento', 'Documento'),
        ('plano', 'Plano'),
        ('excel', 'Excel'),
        ('pdf', 'PDF'),
        ('otro', 'Otro'),
    ]

    proyecto = models.ForeignKey(
        ProyectoEv,
        on_delete=models.CASCADE,
        related_name='documentos'
    )
    nombre = models.CharField(max_length=255)
    archivo = models.FileField(
        upload_to='proyectos/%Y/%m/%d/',
        help_text="Archivo subido"
    )
    tipo = models.CharField(
        max_length=20,
        choices=TIPOS,
        default='documento'
    )
    descripcion = models.TextField(blank=True)

    # Metadata
    fecha_subida = models.DateTimeField(auto_now_add=True)
    subido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='documentos_subidos'
    )
    tamano_bytes = models.BigIntegerField(default=0)

    class Meta:
        ordering = ['-fecha_subida']
        verbose_name = 'Documento de Proyecto'
        verbose_name_plural = 'Documentos de Proyectos'

    def __str__(self):
        return f"{self.nombre} ({self.proyecto.nombre})"

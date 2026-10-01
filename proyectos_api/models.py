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
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="proyectos_ev", db_constraint=False)

    # Identificación y básicos
    codigo = models.CharField(max_length=50, unique=True)  # Código único del proyecto
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    cliente = models.CharField(max_length=255, blank=True, null=True)  # Nombre del cliente

    # Información estratégica
    tipo_proyecto = models.CharField(max_length=50, choices=TIPOS_PROYECTO, default="infraestructura")
    unidad_negocio = models.CharField(max_length=100, choices=UNIDADES_NEGOCIO, default="Minería")
    ubicacion = models.CharField(max_length=255, blank=True, null=True)
    modalidad_contratacion = models.CharField(max_length=50, choices=MODALIDADES, default="suma_alzada")

    # Responsables
    entidad_cliente = models.CharField(max_length=255, blank=True, null=True)
    responsable = models.CharField(max_length=255, blank=True, null=True)
    lider_email = models.EmailField(blank=True, null=True)  # Email del líder del proyecto

    # Contacto del cliente
    contacto_cliente_nombre = models.CharField(max_length=255, blank=True, null=True)
    contacto_cliente_email = models.EmailField(blank=True, null=True)
    contacto_cliente_telefono = models.CharField(max_length=50, blank=True, null=True)

    # Cronograma base
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    fecha_base_aprobada = models.DateField(null=True, blank=True)

    # Estado y etapa
    etapa_actual = models.CharField(max_length=20, choices=ETAPAS_PROYECTO, default="inicio")
    estado = models.CharField(max_length=20, choices=ESTADOS_PROYECTO, default="Apertura")

    # Presupuesto ampliado
    moneda = models.CharField(max_length=3, choices=MONEDAS, default="USD")
    presupuesto_gastos = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)  # Base de gastos
    presupuesto_hh = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)      # Presupuesto HH
    presupuesto_contingencia = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)  # Contingencia
    presupuesto_utilidad = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)      # Utilidad

    # Presupuesto legacy (mantener compatibilidad)
    presupuesto_estimado = models.FloatField(default=0.0)
    presupuesto_aprobado = models.FloatField(default=0.0)

    # Costos reales acumulados
    gasto_real = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)     # Suma de gastos reales
    costo_hh_real = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)  # Suma de HH reales

    # Datos adicionales como JSON strings
    gastos = models.TextField(blank=True, null=True)  # JSON array de gastos
    hh = models.TextField(blank=True, null=True)      # JSON array de registros HH
    notas = models.TextField(blank=True, null=True)   # JSON array de notas

    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    # Cache IA (último análisis generativo)
    analisis_ia_cache = models.JSONField(null=True, blank=True, help_text="Último análisis IA generado")
    analisis_ia_fecha = models.DateTimeField(null=True, blank=True, help_text="Fecha/hora del último análisis IA")

    class Meta:
        db_table = "proyectos_ev_proyectoev"
        managed = False
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
    class Meta:
        db_table = "proyectos_ev_historialev"
        managed = False


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
    class Meta:
        db_table = "proyectos_ev_tareaev"
        managed = False


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
        db_table = "proyectos_ev_curvaev"
        managed = False
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
    class Meta:
        db_table = "proyectos_ev_gastoreal"
        managed = False


class HorasHombreReal(models.Model):
    tarea = models.ForeignKey('TareaEv', on_delete=models.CASCADE, related_name='horas_reales')
    fecha = models.DateField()
    horas = models.DecimalField(max_digits=6, decimal_places=2)
    recurso = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.tarea.titulo} - {self.horas} h"
    class Meta:
        db_table = "proyectos_ev_horashombrereal"
        managed = False


class AvanceFisico(models.Model):
    proyecto = models.ForeignKey('ProyectoEv', on_delete=models.CASCADE, related_name='avances_fisicos')
    fecha = models.DateField()
    porcentaje = models.DecimalField(max_digits=5, decimal_places=2)
    class Meta:
        db_table = "proyectos_ev_avancefisico"
        managed = False


class AvanceFinanciero(models.Model):
    proyecto = models.ForeignKey('ProyectoEv', on_delete=models.CASCADE, related_name='avances_financieros')
    fecha = models.DateField()
    monto_acumulado = models.DecimalField(max_digits=12, decimal_places=2)
    class Meta:
        db_table = "proyectos_ev_avancefinanciero"
        managed = False


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
# MODELOS PARA CRONOGRAMA EDT/GANTT
# ============================================
    class Meta:
        db_table = "proyectos_ev_miembroequipoev"
        managed = False


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
        related_name='cronogramas_proyecto_creados', db_constraint=False
    )

    class Meta:
        db_table = "proyectos_ev_cronogramaversion"
        managed = False
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
        db_table = "proyectos_ev_tarea"
        managed = False
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
        related_name='documentos_proyecto_subidos', db_constraint=False
    )
    tamano_bytes = models.BigIntegerField(default=0)

    class Meta:
        db_table = "proyectos_ev_documentoproyecto"
        managed = False
        ordering = ['-fecha_subida']
        verbose_name = 'Documento de Proyecto'
        verbose_name_plural = 'Documentos de Proyectos'

    def __str__(self):
        return f"{self.nombre} ({self.proyecto.nombre})"


# ============================================
# MODELOS PARA GESTIÓN DE RIESGOS
# ============================================

class Riesgo(models.Model):
    """
    Riesgo del proyecto con matriz Probabilidad x Impacto.
    """
    PROBABILIDADES = [
        (1, 'Muy Baja'),
        (2, 'Baja'),
        (3, 'Media'),
        (4, 'Alta'),
        (5, 'Muy Alta'),
    ]

    IMPACTOS = [
        (1, 'Muy Bajo'),
        (2, 'Bajo'),
        (3, 'Medio'),
        (4, 'Alto'),
        (5, 'Muy Alto'),
    ]

    ESTADOS = [
        ('identificado', 'Identificado'),
        ('en_monitoreo', 'En Monitoreo'),
        ('mitigado', 'Mitigado'),
        ('materializado', 'Materializado'),
        ('cerrado', 'Cerrado'),
    ]

    CATEGORIAS = [
        ('tecnico', 'Técnico'),
        ('financiero', 'Financiero'),
        ('cronograma', 'Cronograma'),
        ('recursos', 'Recursos Humanos'),
        ('legal', 'Legal'),
        ('ambiental', 'Ambiental'),
        ('seguridad', 'Seguridad'),
        ('otro', 'Otro'),
    ]

    proyecto = models.ForeignKey(
        ProyectoEv,
        on_delete=models.CASCADE,
        related_name='riesgos'
    )

    # Identificación
    codigo = models.CharField(max_length=50, help_text="Código único del riesgo (ej: R-001)")
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField()
    categoria = models.CharField(max_length=50, choices=CATEGORIAS, default='otro')

    # Matriz PxI
    probabilidad = models.IntegerField(choices=PROBABILIDADES, default=3)
    impacto = models.IntegerField(choices=IMPACTOS, default=3)
    exposicion = models.IntegerField(default=0, help_text="P x I (calculado)")

    # Gestión
    estado = models.CharField(max_length=20, choices=ESTADOS, default='identificado')
    responsable = models.CharField(max_length=255, blank=True)
    fecha_identificacion = models.DateField(auto_now_add=True)
    fecha_revision = models.DateField(null=True, blank=True)

    # Respuesta al riesgo
    estrategia_respuesta = models.TextField(
        blank=True,
        help_text="Evitar, Transferir, Mitigar, Aceptar"
    )
    plan_mitigacion = models.TextField(blank=True)
    plan_contingencia = models.TextField(blank=True)

    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "proyectos_ev_riesgo"
        managed = False
        ordering = ['-exposicion', '-fecha_creacion']
        verbose_name = 'Riesgo'
        verbose_name_plural = 'Riesgos'
        unique_together = ['proyecto', 'codigo']

    def save(self, *args, **kwargs):
        # Calcular exposición automáticamente
        self.exposicion = self.probabilidad * self.impacto
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.codigo} - {self.titulo}"

    @property
    def nivel_riesgo(self):
        """Devuelve el nivel del riesgo: Bajo, Medio, Alto, Crítico"""
        if self.exposicion <= 4:
            return 'Bajo'
        elif self.exposicion <= 9:
            return 'Medio'
        elif self.exposicion <= 16:
            return 'Alto'
        else:
            return 'Crítico'


# ============================================
# MODELOS PARA CONTROL DE CAMBIOS
# ============================================

class Cambio(models.Model):
    """
    Solicitud de cambio en el proyecto con flujo de aprobación.
    """
    TIPOS = [
        ('alcance', 'Cambio de Alcance'),
        ('cronograma', 'Cambio de Cronograma'),
        ('costo', 'Cambio de Costo'),
        ('calidad', 'Cambio de Calidad'),
        ('recurso', 'Cambio de Recursos'),
        ('otro', 'Otro'),
    ]

    ESTADOS = [
        ('solicitado', 'Solicitado'),
        ('en_revision', 'En Revisión'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
        ('implementado', 'Implementado'),
        ('cancelado', 'Cancelado'),
    ]

    PRIORIDADES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
        ('critica', 'Crítica'),
    ]

    proyecto = models.ForeignKey(
        ProyectoEv,
        on_delete=models.CASCADE,
        related_name='cambios'
    )

    # Identificación
    numero = models.CharField(max_length=50, help_text="Número de cambio (ej: CC-001)")
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPOS, default='alcance')
    prioridad = models.CharField(max_length=20, choices=PRIORIDADES, default='media')

    # Solicitante
    solicitante = models.CharField(max_length=255)
    fecha_solicitud = models.DateField(auto_now_add=True)

    # Impactos
    impacto_alcance = models.TextField(blank=True)
    impacto_cronograma = models.TextField(blank=True)
    impacto_costo = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    impacto_calidad = models.TextField(blank=True)

    # Aprobación
    estado = models.CharField(max_length=20, choices=ESTADOS, default='solicitado')
    aprobador = models.CharField(max_length=255, blank=True)
    fecha_aprobacion = models.DateField(null=True, blank=True)
    justificacion_decision = models.TextField(blank=True)

    # Implementación
    fecha_implementacion = models.DateField(null=True, blank=True)
    responsable_implementacion = models.CharField(max_length=255, blank=True)
    notas_implementacion = models.TextField(blank=True)

    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "proyectos_ev_cambio"
        managed = False
        ordering = ['-fecha_solicitud']
        verbose_name = 'Cambio'
        verbose_name_plural = 'Cambios'
        unique_together = ['proyecto', 'numero']

    def __str__(self):
        return f"{self.numero} - {self.titulo}"


# ============================================
# MODELOS PARA RECURSOS
# ============================================

class RecursoProyecto(models.Model):
    """
    Recurso humano asignado al proyecto.
    """
    TIPOS = [
        ('interno', 'Interno'),
        ('externo', 'Externo'),
        ('subcontratado', 'Subcontratado'),
    ]

    ESTADOS = [
        ('asignado', 'Asignado'),
        ('activo', 'Activo'),
        ('liberado', 'Liberado'),
        ('suspendido', 'Suspendido'),
    ]

    proyecto = models.ForeignKey(
        ProyectoEv,
        on_delete=models.CASCADE,
        related_name='recursos'
    )

    # Información personal
    nombre = models.CharField(max_length=255)
    email = models.EmailField()
    telefono = models.CharField(max_length=50, blank=True)

    # Rol y tipo
    rol = models.CharField(max_length=100, help_text="Ej: Ingeniero, Técnico, PM, etc.")
    tipo = models.CharField(max_length=20, choices=TIPOS, default='interno')

    # Disponibilidad y costo
    porcentaje_dedicacion = models.IntegerField(
        default=100,
        help_text="% de tiempo dedicado al proyecto (0-100)"
    )
    costo_hora = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.0,
        help_text="Costo por hora del recurso"
    )

    # Asignación
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='asignado')

    # Habilidades y notas
    habilidades = models.TextField(blank=True, help_text="Habilidades y certificaciones")
    notas = models.TextField(blank=True)

    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "proyectos_ev_recursoproyecto"
        managed = False
        ordering = ['nombre']
        verbose_name = 'Recurso'
        verbose_name_plural = 'Recursos'

    def __str__(self):
        return f"{self.nombre} - {self.rol}"


class AsignacionRecursoTarea(models.Model):
    """
    Asignación de un recurso a una tarea específica del cronograma.
    """
    recurso = models.ForeignKey(
        RecursoProyecto,
        on_delete=models.CASCADE,
        related_name='asignaciones'
    )
    tarea = models.ForeignKey(
        Tarea,
        on_delete=models.CASCADE,
        related_name='asignaciones_recursos'
    )

    # Esfuerzo
    horas_estimadas = models.DecimalField(max_digits=8, decimal_places=2, default=0.0)
    horas_reales = models.DecimalField(max_digits=8, decimal_places=2, default=0.0)

    # Auditoría
    fecha_asignacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "proyectos_ev_asignacionrecursotarea"
        managed = False
        unique_together = ['recurso', 'tarea']
        verbose_name = 'Asignación Recurso-Tarea'
        verbose_name_plural = 'Asignaciones Recurso-Tarea'

    def __str__(self):
        return f"{self.recurso.nombre} → {self.tarea.nombre}"


# ============================================
# MODELOS PARA CALIDAD
# ============================================

class ChecklistCalidad(models.Model):
    """
    Checklist de calidad para el proyecto.
    """
    TIPOS = [
        ('entrada', 'Criterio de Entrada'),
        ('proceso', 'Control de Proceso'),
        ('salida', 'Criterio de Salida'),
        ('aceptacion', 'Criterio de Aceptación'),
    ]

    proyecto = models.ForeignKey(
        ProyectoEv,
        on_delete=models.CASCADE,
        related_name='checklists_calidad'
    )

    nombre = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=TIPOS, default='proceso')
    descripcion = models.TextField(blank=True)

    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    creado_por = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "proyectos_ev_checklistcalidad"
        managed = False
        ordering = ['nombre']
        verbose_name = 'Checklist de Calidad'
        verbose_name_plural = 'Checklists de Calidad'

    def __str__(self):
        return f"{self.nombre} ({self.proyecto.nombre})"


class ItemChecklist(models.Model):
    """
    Ítem individual de un checklist de calidad.
    """
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('cumple', 'Cumple'),
        ('no_cumple', 'No Cumple'),
        ('no_aplica', 'No Aplica'),
    ]

    checklist = models.ForeignKey(
        ChecklistCalidad,
        on_delete=models.CASCADE,
        related_name='items'
    )

    orden = models.IntegerField(default=0)
    descripcion = models.TextField()
    criterio_aceptacion = models.TextField(blank=True)

    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    responsable = models.CharField(max_length=255, blank=True)
    fecha_verificacion = models.DateField(null=True, blank=True)
    observaciones = models.TextField(blank=True)

    class Meta:
        db_table = "proyectos_ev_itemchecklist"
        managed = False
        ordering = ['orden']
        verbose_name = 'Ítem de Checklist'
        verbose_name_plural = 'Ítems de Checklist'

    def __str__(self):
        return f"{self.checklist.nombre} - Ítem {self.orden}"


# ============================================
# MODELOS PARA COMUNICACIONES
# ============================================

class Comunicacion(models.Model):
    """
    Registro de comunicaciones del proyecto.
    """
    TIPOS = [
        ('reunion', 'Reunión'),
        ('email', 'Email'),
        ('informe', 'Informe'),
        ('acta', 'Acta'),
        ('presentacion', 'Presentación'),
        ('otro', 'Otro'),
    ]

    ESTADOS = [
        ('planificada', 'Planificada'),
        ('realizada', 'Realizada'),
        ('cancelada', 'Cancelada'),
    ]

    proyecto = models.ForeignKey(
        ProyectoEv,
        on_delete=models.CASCADE,
        related_name='comunicaciones'
    )

    tipo = models.CharField(max_length=20, choices=TIPOS, default='reunion')
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)

    # Participantes
    emisor = models.CharField(max_length=255)
    destinatarios = models.TextField(help_text="Lista de destinatarios separados por comas")

    # Fechas
    fecha_planificada = models.DateField()
    fecha_realizada = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='planificada')

    # Contenido
    agenda = models.TextField(blank=True)
    acuerdos = models.TextField(blank=True)
    siguiente_pasos = models.TextField(blank=True)

    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "proyectos_ev_comunicacion"
        managed = False
        ordering = ['-fecha_planificada']
        verbose_name = 'Comunicación'
        verbose_name_plural = 'Comunicaciones'

    def __str__(self):
        return f"{self.tipo.upper()}: {self.titulo}"


# ============================================
# MODELOS PARA COMPRAS/ADQUISICIONES
# ============================================

class Compra(models.Model):
    """
    Orden de compra o contrato del proyecto.
    """
    TIPOS = [
        ('orden_compra', 'Orden de Compra'),
        ('contrato', 'Contrato'),
        ('servicio', 'Orden de Servicio'),
    ]

    ESTADOS = [
        ('borrador', 'Borrador'),
        ('solicitado', 'Solicitado'),
        ('aprobado', 'Aprobado'),
        ('emitido', 'Emitido'),
        ('recibido', 'Recibido'),
        ('cerrado', 'Cerrado'),
        ('cancelado', 'Cancelado'),
    ]

    proyecto = models.ForeignKey(
        ProyectoEv,
        on_delete=models.CASCADE,
        related_name='compras'
    )

    # Identificación
    numero = models.CharField(max_length=50, help_text="Número de OC o contrato")
    tipo = models.CharField(max_length=20, choices=TIPOS, default='orden_compra')
    descripcion = models.TextField()

    # Proveedor
    proveedor = models.CharField(max_length=255)
    contacto_proveedor = models.CharField(max_length=255, blank=True)

    # Montos
    moneda = models.CharField(max_length=3, choices=MONEDAS, default='USD')
    monto_total = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    monto_pagado = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)

    # Fechas
    fecha_solicitud = models.DateField(auto_now_add=True)
    fecha_aprobacion = models.DateField(null=True, blank=True)
    fecha_emision = models.DateField(null=True, blank=True)
    fecha_entrega_estimada = models.DateField(null=True, blank=True)
    fecha_entrega_real = models.DateField(null=True, blank=True)

    # Estado y responsables
    estado = models.CharField(max_length=20, choices=ESTADOS, default='borrador')
    solicitante = models.CharField(max_length=255)
    aprobador = models.CharField(max_length=255, blank=True)

    # Notas
    terminos_condiciones = models.TextField(blank=True)
    notas = models.TextField(blank=True)

    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "proyectos_ev_compra"
        managed = False
        ordering = ['-fecha_solicitud']
        verbose_name = 'Compra/Contrato'
        verbose_name_plural = 'Compras/Contratos'
        unique_together = ['proyecto', 'numero']

    def __str__(self):
        return f"{self.numero} - {self.proveedor}"

    @property
    def saldo_pendiente(self):
        return float(self.monto_total - self.monto_pagado)


# ============================================
# MODELOS PARA NOTAS
# ============================================

class Nota(models.Model):
    """
    Nota individual del proyecto con CRUD completo.
    """
    CATEGORIAS = [
        ('general', 'General'),
        ('reunion', 'Reunión'),
        ('decision', 'Decisión'),
        ('problema', 'Problema'),
        ('pendiente', 'Pendiente'),
        ('otro', 'Otro'),
    ]

    proyecto = models.ForeignKey(
        ProyectoEv,
        on_delete=models.CASCADE,
        related_name='notas_individuales'
    )

    titulo = models.CharField(max_length=255, blank=True)
    contenido = models.TextField()
    categoria = models.CharField(max_length=20, choices=CATEGORIAS, default='general')

    autor = models.CharField(max_length=255)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    es_importante = models.BooleanField(default=False)

    class Meta:
        db_table = "proyectos_ev_nota"
        managed = False
        ordering = ['-fecha_actualizacion']
        verbose_name = 'Nota'
        verbose_name_plural = 'Notas'

    def __str__(self):
        return f"{self.titulo or 'Nota sin título'} ({self.fecha_creacion.strftime('%Y-%m-%d')})"


# ============================================
# MODELOS PARA INFORMES EJECUTIVOS
# ============================================

class InformeEjecutivo(models.Model):
    """
    Informe ejecutivo generado del proyecto.
    Soporta múltiples formatos (PDF, Excel) y tipos de informes.
    """
    TIPOS = [
        ('resumen_ejecutivo', 'Resumen Ejecutivo'),
        ('avance_mensual', 'Informe de Avance Mensual'),
        ('riesgos', 'Informe de Riesgos'),
        ('costos_evm', 'Informe de Costos EVM'),
        ('cronograma', 'Informe de Cronograma'),
        ('general', 'Informe General del Proyecto'),
    ]

    FORMATOS = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
    ]

    ESTADOS = [
        ('generando', 'Generando'),
        ('completado', 'Completado'),
        ('error', 'Error'),
    ]

    proyecto = models.ForeignKey(
        ProyectoEv,
        on_delete=models.CASCADE,
        related_name='informes'
    )

    tipo = models.CharField(max_length=30, choices=TIPOS)
    formato = models.CharField(max_length=10, choices=FORMATOS)
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)

    # Archivo generado
    archivo = models.FileField(upload_to='informes/%Y/%m/', null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='generando')
    mensaje_error = models.TextField(blank=True)

    # Metadata
    generado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, db_constraint=False,
        on_delete=models.SET_NULL,
        null=True,
        related_name='informes_proyecto_generados'
    )
    fecha_generacion = models.DateTimeField(auto_now_add=True)
    fecha_desde = models.DateField(null=True, blank=True, help_text="Fecha inicio del período del informe")
    fecha_hasta = models.DateField(null=True, blank=True, help_text="Fecha fin del período del informe")

    # Configuración del informe (JSON)
    configuracion = models.JSONField(
        default=dict,
        blank=True,
        help_text="Configuración adicional del informe (secciones a incluir, filtros, etc.)"
    )

    class Meta:
        db_table = "proyectos_ev_informeejecutivo"
        managed = False
        ordering = ['-fecha_generacion']
        verbose_name = 'Informe Ejecutivo'
        verbose_name_plural = 'Informes Ejecutivos'

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.proyecto.codigo} ({self.fecha_generacion.strftime('%Y-%m-%d')})"

    @property
    def nombre_archivo(self):
        """Genera nombre de archivo basado en tipo y fecha"""
        fecha = self.fecha_generacion.strftime('%Y%m%d')
        extension = 'pdf' if self.formato == 'pdf' else 'xlsx'
        return f"{self.proyecto.codigo}_{self.tipo}_{fecha}.{extension}"


# =====================================================================
# MÓDULO DE EVALUACIONES ESTRATÉGICAS
# =====================================================================

class EscenarioEvaluacion(models.Model):
    """
    Escenario de evaluación con pesos y parámetros para métodos de evaluación.
    Define las condiciones bajo las cuales se evaluarán alternativas de proyectos.
    """
    nombre = models.CharField(
        max_length=200,
        help_text="Nombre descriptivo del escenario (ej: 'Escenario Conservador', 'Escenario Optimista')"
    )
    descripcion = models.TextField(
        blank=True,
        null=True,
        help_text="Descripción detallada del escenario y sus condiciones"
    )

    # Pesos para criterios de evaluación (deben sumar 1.0 o 100%)
    peso_roi = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.25,
        help_text="Peso para ROI (Return on Investment) - Retorno de inversión"
    )
    peso_vpn = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.25,
        help_text="Peso para VPN (Valor Presente Neto)"
    )
    peso_impacto = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.20,
        help_text="Peso para impacto estratégico del proyecto"
    )
    peso_urgencia = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.15,
        help_text="Peso para urgencia de implementación"
    )
    peso_riesgo = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.15,
        help_text="Peso para nivel de riesgo (menor riesgo es mejor)"
    )

    # Parámetros adicionales
    tasa_descuento = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.10,
        help_text="Tasa de descuento para cálculos financieros (ej: 0.10 = 10%)"
    )
    tolerancia_costo = models.IntegerField(
        default=5,
        help_text="Tolerancia al costo (escala 1-10, donde 10 es alta tolerancia)"
    )
    incertidumbre = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.15,
        help_text="Nivel de incertidumbre para simulaciones Monte Carlo (ej: 0.15 = 15%)"
    )

    # Configuración de IA
    usar_ia_generativa = models.BooleanField(
        default=True,
        help_text="Usar IA generativa (Gemini) para análisis cualitativo"
    )
    usar_random_forest = models.BooleanField(
        default=True,
        help_text="Usar Random Forest para predicción"
    )
    usar_monte_carlo = models.BooleanField(
        default=True,
        help_text="Usar simulación Monte Carlo"
    )

    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="escenarios_evaluacion"
    )
    es_predeterminado = models.BooleanField(
        default=False,
        help_text="Marcar como escenario predeterminado"
    )

    class Meta:
        db_table = "proyectos_ev_escenarioevaluacion"
        managed = False
        ordering = ['-fecha_creacion']
        verbose_name = 'Escenario de Evaluación'
        verbose_name_plural = 'Escenarios de Evaluación'

    def __str__(self):
        return f"{self.nombre} (ROI:{self.peso_roi}, VPN:{self.peso_vpn}, Impacto:{self.peso_impacto})"

    def validar_pesos(self):
        """Valida que los pesos sumen aproximadamente 1.0"""
        total = float(self.peso_roi + self.peso_vpn + self.peso_impacto +
                     self.peso_urgencia + self.peso_riesgo)
        return 0.98 <= total <= 1.02  # Tolerancia de 2% por redondeo


class AlternativaProyecto(models.Model):
    """
    Alternativa de proyecto para evaluación estratégica.
    Representa una opción de inversión o proyecto candidato a ser evaluado.
    """
    nombre = models.CharField(
        max_length=255,
        help_text="Nombre de la alternativa de proyecto"
    )
    codigo = models.CharField(
        max_length=50,
        unique=True,
        help_text="Código único de la alternativa"
    )
    descripcion = models.TextField(
        blank=True,
        null=True,
        help_text="Descripción detallada de la alternativa"
    )

    # Datos financieros
    inversion_inicial = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Inversión inicial requerida (en USD o moneda local)"
    )
    flujos_futuros = models.JSONField(
        default=list,
        help_text="Lista de flujos de efectivo futuros por período (ej: [10000, 15000, 20000])"
    )
    tasa_retorno_esperada = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Tasa de retorno esperada (ej: 0.15 = 15%)"
    )

    # Métricas calculadas (se calculan automáticamente)
    vpn = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Valor Presente Neto calculado"
    )
    tir = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Tasa Interna de Retorno calculada"
    )
    roi = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Return on Investment calculado"
    )
    payback = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Período de recuperación en años"
    )
    relacion_beneficio_costo = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Relación Beneficio/Costo"
    )

    # Criterios cualitativos (escala 1-10)
    impacto_estrategico = models.IntegerField(
        default=5,
        help_text="Impacto estratégico (1=bajo, 10=alto)"
    )
    urgencia = models.IntegerField(
        default=5,
        help_text="Urgencia de implementación (1=baja, 10=alta)"
    )
    nivel_riesgo = models.IntegerField(
        default=5,
        help_text="Nivel de riesgo (1=muy bajo, 10=muy alto)"
    )
    complejidad_tecnica = models.IntegerField(
        default=5,
        help_text="Complejidad técnica (1=simple, 10=muy compleja)"
    )
    alineamiento_estrategico = models.IntegerField(
        default=5,
        help_text="Alineamiento con estrategia organizacional (1=bajo, 10=alto)"
    )

    # Listas de ventajas y desventajas
    ventajas = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de ventajas de la alternativa"
    )
    desventajas = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de desventajas de la alternativa"
    )

    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="alternativas_proyecto"
    )

    class Meta:
        db_table = "proyectos_ev_alternativaproyecto"
        managed = False
        ordering = ['-fecha_creacion']
        verbose_name = 'Alternativa de Proyecto'
        verbose_name_plural = 'Alternativas de Proyecto'

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    def calcular_metricas_financieras(self, tasa_descuento=0.10):
        """
        Calcula VPN, TIR, ROI, Payback y B/C automáticamente.
        """
        from proyectos_api.core.evaluacion_financiera import calcular_vpn, calcular_tir, calcular_roi, calcular_payback, calcular_bc

        self.vpn = calcular_vpn(self.inversion_inicial, self.flujos_futuros, tasa_descuento)
        self.tir = calcular_tir(self.inversion_inicial, self.flujos_futuros)
        self.roi = calcular_roi(self.inversion_inicial, self.flujos_futuros)
        self.payback = calcular_payback(self.inversion_inicial, self.flujos_futuros)
        self.relacion_beneficio_costo = calcular_bc(self.inversion_inicial, self.flujos_futuros, tasa_descuento)
        self.save()


class EvaluacionEstrategica(models.Model):
    """
    Registro de una evaluación estratégica completa.
    Relaciona múltiples alternativas evaluadas bajo un escenario específico.
    """
    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('en_proceso', 'En Proceso'),
        ('completada', 'Completada'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
    ]

    nombre = models.CharField(
        max_length=255,
        help_text="Nombre de la evaluación estratégica"
    )
    descripcion = models.TextField(
        blank=True,
        null=True,
        help_text="Descripción y objetivo de la evaluación"
    )

    # Relaciones
    escenario = models.ForeignKey(
        EscenarioEvaluacion,
        on_delete=models.PROTECT,
        related_name="evaluaciones",
        help_text="Escenario utilizado para la evaluación"
    )
    alternativas = models.ManyToManyField(
        AlternativaProyecto,
        related_name="evaluaciones",
        help_text="Alternativas evaluadas"
    )
    proyecto_asociado = models.ForeignKey(
        ProyectoEv,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evaluaciones_estrategicas",
        help_text="Proyecto al que pertenece esta evaluación (opcional)"
    )

    # Estado y metadata
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='borrador'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_evaluacion = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha en que se ejecutó la evaluación"
    )
    fecha_aprobacion = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha de aprobación/rechazo"
    )

    # Usuario y aprobadores
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="evaluaciones_estrategicas"
    )
    aprobador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evaluaciones_aprobadas"
    )

    # Resultados consolidados
    alternativa_recomendada = models.ForeignKey(
        AlternativaProyecto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recomendada_en",
        help_text="Alternativa con mejor puntaje global"
    )
    puntaje_mejor_alternativa = models.DecimalField(
        max_digits=5,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Puntaje de la mejor alternativa"
    )

    # Análisis de IA
    conclusion_ia = models.TextField(
        blank=True,
        null=True,
        help_text="Conclusión generada por IA generativa"
    )
    recomendaciones_ia = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de recomendaciones generadas por IA"
    )

    # Configuración de métodos utilizados
    metodos_aplicados = models.JSONField(
        default=list,
        help_text="Lista de métodos aplicados (ej: ['Monte Carlo', 'IA Generativa', 'Ponderado'])"
    )

    class Meta:
        db_table = "proyectos_ev_evaluacionestrategica"
        managed = False
        ordering = ['-fecha_creacion']
        verbose_name = 'Evaluación Estratégica'
        verbose_name_plural = 'Evaluaciones Estratégicas'

    def __str__(self):
        return f"{self.nombre} ({self.get_estado_display()})"


class ResultadoMetodoEvaluacion(models.Model):
    """
    Resultado de aplicar un método de evaluación específico a una alternativa.
    Almacena el puntaje y detalles del análisis por método.
    """
    METODOS_CHOICES = [
        ('vpn', 'Valor Presente Neto'),
        ('tir', 'Tasa Interna de Retorno'),
        ('roi', 'Return on Investment'),
        ('payback', 'Período de Recuperación'),
        ('bc', 'Relación Beneficio/Costo'),
        ('ponderado', 'Evaluación Ponderada'),
        ('monte_carlo', 'Simulación Monte Carlo'),
        ('random_forest', 'IA Random Forest'),
        ('ia_generativa', 'IA Generativa (Gemini)'),
        ('reglas', 'Reglas de Negocio'),
    ]

    evaluacion = models.ForeignKey(
        EvaluacionEstrategica,
        on_delete=models.CASCADE,
        related_name="resultados"
    )
    alternativa = models.ForeignKey(
        AlternativaProyecto,
        on_delete=models.CASCADE,
        related_name="resultados_evaluacion"
    )

    # Método y resultado
    metodo = models.CharField(
        max_length=30,
        choices=METODOS_CHOICES,
        help_text="Método de evaluación aplicado"
    )
    puntaje = models.DecimalField(
        max_digits=15,
        decimal_places=3,
        help_text="Puntaje obtenido (puede ser VPN, score normalizado, etc.)"
    )
    puntaje_normalizado = models.DecimalField(
        max_digits=5,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Puntaje normalizado entre 0 y 1 para comparación"
    )

    # Análisis cualitativo
    comentario = models.TextField(
        blank=True,
        null=True,
        help_text="Comentario o explicación del resultado"
    )
    explicacion_simple = models.TextField(
        blank=True,
        null=True,
        help_text="Explicación en lenguaje simple para no-PMPs"
    )

    # Estadísticas adicionales (para Monte Carlo)
    estadisticas_adicionales = models.JSONField(
        default=dict,
        blank=True,
        help_text="Estadísticas extra (media, desv std, percentiles, etc.)"
    )

    # Metadata
    fecha_calculo = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "proyectos_ev_resultadometodoevaluacion"
        managed = False
        ordering = ['-puntaje_normalizado']
        unique_together = ['evaluacion', 'alternativa', 'metodo']
        verbose_name = 'Resultado de Método de Evaluación'
        verbose_name_plural = 'Resultados de Métodos de Evaluación'

    def __str__(self):
        return f"{self.alternativa.codigo} - {self.get_metodo_display()}: {self.puntaje}"

from django.contrib import admin
from .models import GastoReal, HorasHombreReal, AvanceFisico, AvanceFinanciero, MiembroEquipoEv

admin.site.register(GastoReal)
admin.site.register(HorasHombreReal)
admin.site.register(AvanceFisico)
admin.site.register(AvanceFinanciero)

@admin.register(MiembroEquipoEv)
class MiembroEquipoEvAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'apellido', 'correo', 'rol', 'proyecto', 'creado_en')
# ============================================
# ADMIN PARA CRONOGRAMAS EDT/GANTT
# ============================================

from .models import CronogramaVersion, Tarea, DocumentoProyecto, ProyectoEv, HistorialEv, TareaEv, CurvaEv, InformeEjecutivo

@admin.register(ProyectoEv)
class ProyectoEvAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'usuario', 'tipo_proyecto', 'estado', 'fecha_inicio', 'fecha_fin')
    list_filter = ('estado', 'tipo_proyecto', 'etapa_actual')
    search_fields = ('nombre', 'descripcion', 'entidad_cliente')
    date_hierarchy = 'fecha_creacion'

@admin.register(CronogramaVersion)
class CronogramaVersionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'proyecto', 'es_activa', 'creado_por', 'fecha_creacion')
    list_filter = ('es_activa', 'fecha_creacion')
    search_fields = ('nombre', 'proyecto__nombre')
    date_hierarchy = 'fecha_creacion'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('proyecto', 'creado_por')

@admin.register(Tarea)
class TareaAdmin(admin.ModelAdmin):
    list_display = ('item', 'nombre', 'version', 'nivel', 'duracion_min', 'es_hito', 'es_critica')
    list_filter = ('nivel', 'es_hito', 'es_resumen', 'es_critica', 'calendario')
    search_fields = ('nombre', 'edt', 'descripcion')
    ordering = ('version', 'item')
    
    fieldsets = (
        ('Identificación', {
            'fields': ('version', 'item', 'edt', 'nivel', 'nombre', 'descripcion')
        }),
        ('Programación', {
            'fields': ('inicio', 'fin', 'duracion_min', 'calendario', 'es_hito')
        }),
        ('Dependencias', {
            'fields': ('predecesoras',)
        }),
        ('Visualización', {
            'fields': ('mostrar', 'timeline')
        }),
        ('Calculados (solo lectura)', {
            'fields': ('es_resumen', 'es_critica', 'holgura_total'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('es_resumen', 'es_critica', 'holgura_total', 'inicio', 'fin')

@admin.register(DocumentoProyecto)
class DocumentoProyectoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'proyecto', 'tipo', 'subido_por', 'fecha_subida', 'tamano_kb')
    list_filter = ('tipo', 'fecha_subida')
    search_fields = ('nombre', 'descripcion', 'proyecto__nombre')
    date_hierarchy = 'fecha_subida'
    
    readonly_fields = ('fecha_subida', 'subido_por', 'tamano_bytes')
    
    def tamano_kb(self, obj):
        return f"{obj.tamano_bytes / 1024:.1f} KB"
    tamano_kb.short_description = 'Tamaño'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('proyecto', 'subido_por')

@admin.register(HistorialEv)
class HistorialEvAdmin(admin.ModelAdmin):
    list_display = ('proyecto', 'fecha_registro', 'porcentaje_avance_fisico', 'cpi', 'spi')
    list_filter = ('fecha_registro',)
    search_fields = ('proyecto__nombre',)

@admin.register(TareaEv)
class TareaEvAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'responsable', 'area', 'tipo_responsable', 'proyecto', 'estado', 'fecha_inicio', 'fecha_fin', 'avance_real')
    list_filter = ('estado', 'tipo_responsable', 'fecha_inicio')
    search_fields = ('titulo', 'descripcion', 'proyecto__nombre', 'responsable', 'area')

@admin.register(CurvaEv)
class CurvaEvAdmin(admin.ModelAdmin):
    list_display = ('proyecto', 'fecha', 'pv', 'ev', 'ac', 'fuente')
    list_filter = ('fuente', 'fecha')
    search_fields = ('proyecto__nombre',)

@admin.register(InformeEjecutivo)
class InformeEjecutivoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'proyecto', 'tipo', 'formato', 'estado', 'generado_por', 'fecha_generacion')
    list_filter = ('tipo', 'formato', 'estado', 'fecha_generacion')
    search_fields = ('nombre', 'descripcion', 'proyecto__nombre')
    date_hierarchy = 'fecha_generacion'
    readonly_fields = ('fecha_generacion', 'generado_por', 'estado')

    fieldsets = (
        ('Información Básica', {
            'fields': ('proyecto', 'tipo', 'formato', 'nombre', 'descripcion')
        }),
        ('Período del Informe', {
            'fields': ('fecha_desde', 'fecha_hasta')
        }),
        ('Resultado', {
            'fields': ('estado', 'archivo', 'mensaje_error')
        }),
        ('Metadata', {
            'fields': ('generado_por', 'fecha_generacion', 'configuracion'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('proyecto', 'generado_por')

# =====================================================================
# ADMIN PARA EVALUACIONES ESTRATÉGICAS
# =====================================================================

from .models import EscenarioEvaluacion, AlternativaProyecto, EvaluacionEstrategica, ResultadoMetodoEvaluacion

@admin.register(EscenarioEvaluacion)
class EscenarioEvaluacionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'peso_roi', 'peso_vpn', 'peso_impacto', 'tasa_descuento', 'es_predeterminado', 'fecha_creacion')
    list_filter = ('es_predeterminado', 'usar_ia_generativa', 'usar_monte_carlo')
    search_fields = ('nombre', 'descripcion')
    date_hierarchy = 'fecha_creacion'
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'descripcion', 'usuario', 'es_predeterminado')
        }),
        ('Pesos de Criterios', {
            'fields': ('peso_roi', 'peso_vpn', 'peso_impacto', 'peso_urgencia', 'peso_riesgo'),
            'description': 'Los pesos deben sumar aproximadamente 1.0 (100%)'
        }),
        ('Parámetros Financieros', {
            'fields': ('tasa_descuento', 'tolerancia_costo', 'incertidumbre')
        }),
        ('Métodos a Utilizar', {
            'fields': ('usar_ia_generativa', 'usar_random_forest', 'usar_monte_carlo')
        }),
    )

@admin.register(AlternativaProyecto)
class AlternativaProyectoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'inversion_inicial', 'vpn', 'tir', 'roi', 'impacto_estrategico', 'nivel_riesgo')
    list_filter = ('impacto_estrategico', 'nivel_riesgo', 'urgencia')
    search_fields = ('codigo', 'nombre', 'descripcion')
    date_hierarchy = 'fecha_creacion'
    
    fieldsets = (
        ('Identificación', {
            'fields': ('codigo', 'nombre', 'descripcion', 'usuario')
        }),
        ('Datos Financieros', {
            'fields': ('inversion_inicial', 'flujos_futuros', 'tasa_retorno_esperada')
        }),
        ('Métricas Calculadas', {
            'fields': ('vpn', 'tir', 'roi', 'payback', 'relacion_beneficio_costo'),
            'classes': ('collapse',),
            'description': 'Se calculan automáticamente al llamar calcular_metricas_financieras()'
        }),
        ('Criterios Cualitativos (1-10)', {
            'fields': ('impacto_estrategico', 'urgencia', 'nivel_riesgo', 'complejidad_tecnica', 'alineamiento_estrategico')
        }),
        ('Ventajas y Desventajas', {
            'fields': ('ventajas', 'desventajas'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')

@admin.register(EvaluacionEstrategica)
class EvaluacionEstrategicaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'escenario', 'estado', 'alternativa_recomendada', 'puntaje_mejor_alternativa', 'fecha_evaluacion')
    list_filter = ('estado', 'fecha_creacion', 'fecha_evaluacion')
    search_fields = ('nombre', 'descripcion')
    date_hierarchy = 'fecha_creacion'
    filter_horizontal = ('alternativas',)
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'descripcion', 'usuario', 'estado')
        }),
        ('Configuración', {
            'fields': ('escenario', 'alternativas', 'proyecto_asociado', 'metodos_aplicados')
        }),
        ('Resultados', {
            'fields': ('alternativa_recomendada', 'puntaje_mejor_alternativa', 'conclusion_ia', 'recomendaciones_ia'),
            'classes': ('collapse',)
        }),
        ('Aprobación', {
            'fields': ('aprobador', 'fecha_aprobacion'),
            'classes': ('collapse',)
        }),
        ('Fechas', {
            'fields': ('fecha_creacion', 'fecha_evaluacion'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('fecha_creacion', 'fecha_evaluacion')

@admin.register(ResultadoMetodoEvaluacion)
class ResultadoMetodoEvaluacionAdmin(admin.ModelAdmin):
    list_display = ('evaluacion', 'alternativa', 'metodo', 'puntaje', 'puntaje_normalizado', 'fecha_calculo')
    list_filter = ('metodo', 'fecha_calculo')
    search_fields = ('evaluacion__nombre', 'alternativa__nombre', 'alternativa__codigo')
    date_hierarchy = 'fecha_calculo'
    
    fieldsets = (
        ('Relaciones', {
            'fields': ('evaluacion', 'alternativa', 'metodo')
        }),
        ('Puntajes', {
            'fields': ('puntaje', 'puntaje_normalizado')
        }),
        ('Análisis', {
            'fields': ('comentario', 'explicacion_simple', 'estadisticas_adicionales'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('fecha_calculo',)
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('evaluacion', 'alternativa')

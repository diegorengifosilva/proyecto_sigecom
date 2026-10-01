from rest_framework import serializers
from .models import (
    ProyectoEv, HistorialEv, TareaEv, CurvaEv, GastoReal, HorasHombreReal,
    AvanceFisico, AvanceFinanciero, MiembroEquipoEv, CronogramaVersion, Tarea,
    DocumentoProyecto, Riesgo, Cambio, RecursoProyecto, AsignacionRecursoTarea,
    ChecklistCalidad, ItemChecklist, Comunicacion, Compra, Nota, InformeEjecutivo,
    EscenarioEvaluacion, AlternativaProyecto, EvaluacionEstrategica, ResultadoMetodoEvaluacion
)

# Serializador de notas (se usa en ProyectoEvSerializer y más abajo)
class NotaSerializer(serializers.ModelSerializer):
    """Serializer para notas del proyecto"""

    autor = serializers.CharField(required=False, allow_blank=True, default='Anónimo')

    class Meta:
        model = Nota
        fields = [
            'id', 'proyecto', 'titulo', 'contenido', 'categoria',
            'autor', 'es_importante',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'proyecto', 'fecha_creacion', 'fecha_actualizacion']

    def _default_autor(self):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            name = f"{user.first_name} {user.last_name}".strip() or user.email or user.username
            return name or 'Anónimo'
        return 'Anónimo'

    def create(self, validated_data):
        if not validated_data.get('autor'):
            validated_data['autor'] = self._default_autor()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not validated_data.get('autor'):
            validated_data['autor'] = instance.autor or self._default_autor()
        return super().update(instance, validated_data)

class ProyectoEvSerializer(serializers.ModelSerializer):
    notas = NotaSerializer(many=True, read_only=True, source='notas_individuales')
    notas_count = serializers.IntegerField(read_only=True, source='notas_individuales.count')

    class Meta:
        model = ProyectoEv
        fields = '__all__'
        read_only_fields = ['usuario']


class HistorialEvSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialEv
        fields = '__all__'

class TareaEvSerializer(serializers.ModelSerializer):
    class Meta:
        model = TareaEv
        fields = '__all__'

class CurvaEvSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurvaEv
        fields = '__all__'

class GastoRealSerializer(serializers.ModelSerializer):
    class Meta:
        model = GastoReal
        fields = '__all__'

class HorasHombreRealSerializer(serializers.ModelSerializer):
    class Meta:
        model = HorasHombreReal
        fields = '__all__'

class AvanceFisicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvanceFisico
        fields = '__all__'

class AvanceFinancieroSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvanceFinanciero
        fields = '__all__'

class MiembroEquipoEvSerializer(serializers.ModelSerializer):
    class Meta:
        model = MiembroEquipoEv
        fields = '__all__'
# ============================================
# SERIALIZERS PARA CRONOGRAMA EDT/GANTT
# ============================================

class TareaSerializer(serializers.ModelSerializer):
    """Serializer para tareas de cronograma con todos los campos EDT/Gantt"""
    
    class Meta:
        model = Tarea
        fields = [
            'id', 'version', 'item', 'edt', 'nivel', 'nombre', 'descripcion',
            'inicio', 'fin', 'duracion_min', 'calendario', 'es_hito',
            'predecesoras', 'mostrar', 'timeline', 'es_resumen', 'es_critica',
            'holgura_total', 'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'inicio', 'fin', 'es_resumen', 'es_critica', 'holgura_total', 'fecha_creacion', 'fecha_actualizacion']


class CronogramaVersionSerializer(serializers.ModelSerializer):
    """Serializer para versiones de cronograma con tareas anidadas"""
    
    tareas = TareaSerializer(many=True, read_only=True)
    tareas_data = serializers.ListField(write_only=True, required=False)
    
    class Meta:
        model = CronogramaVersion
        fields = [
            'id', 'proyecto', 'nombre', 'fecha_creacion', 'fecha_modificacion',
            'es_activa', 'creado_por', 'tareas', 'tareas_data'
        ]
        read_only_fields = ['id', 'proyecto', 'fecha_creacion', 'fecha_modificacion', 'creado_por']
    
    def create(self, validated_data):
        tareas_data = validated_data.pop('tareas_data', [])
        cronograma = CronogramaVersion.objects.create(**validated_data)
        
        # Crear tareas asociadas
        for tarea_data in tareas_data:
            Tarea.objects.create(version=cronograma, **tarea_data)
        
        return cronograma
    
    def update(self, instance, validated_data):
        tareas_data = validated_data.pop('tareas_data', None)
        
        # Actualizar cronograma
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Si se proporcionan tareas, reemplazarlas
        if tareas_data is not None:
            # Eliminar tareas existentes
            instance.tareas.all().delete()
            
            # Crear nuevas tareas
            for tarea_data in tareas_data:
                Tarea.objects.create(version=instance, **tarea_data)
        
        return instance


class DocumentoProyectoSerializer(serializers.ModelSerializer):
    """Serializer para documentos/archivos del proyecto"""
    
    subido_por_nombre = serializers.SerializerMethodField()
    archivo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentoProyecto
        fields = [
            'id', 'proyecto', 'nombre', 'archivo', 'archivo_url', 'tipo',
            'descripcion', 'fecha_subida', 'subido_por', 'subido_por_nombre',
            'tamano_bytes'
        ]
        read_only_fields = ['id', 'fecha_subida', 'subido_por', 'tamano_bytes', 'archivo_url', 'subido_por_nombre']
    
    def get_subido_por_nombre(self, obj):
        if obj.subido_por:
            return f"{obj.subido_por.first_name} {obj.subido_por.last_name}".strip() or obj.subido_por.email
        return None
    
    def get_archivo_url(self, obj):
        if obj.archivo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.archivo.url)
            return obj.archivo.url
        return None


# ============================================
# SERIALIZERS PARA RIESGOS
# ============================================

class RiesgoSerializer(serializers.ModelSerializer):
    """Serializer para gestión de riesgos con matriz PxI"""

    nivel_riesgo = serializers.ReadOnlyField()

    class Meta:
        model = Riesgo
        fields = [
            'id', 'proyecto', 'codigo', 'titulo', 'descripcion', 'categoria',
            'probabilidad', 'impacto', 'exposicion', 'nivel_riesgo',
            'estado', 'responsable', 'fecha_identificacion', 'fecha_revision',
            'estrategia_respuesta', 'plan_mitigacion', 'plan_contingencia',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'exposicion', 'nivel_riesgo', 'fecha_creacion', 'fecha_actualizacion']


# ============================================
# SERIALIZERS PARA CONTROL DE CAMBIOS
# ============================================

class CambioSerializer(serializers.ModelSerializer):
    """Serializer para control de cambios"""

    class Meta:
        model = Cambio
        fields = [
            'id', 'proyecto', 'numero', 'titulo', 'descripcion', 'tipo', 'prioridad',
            'solicitante', 'fecha_solicitud',
            'impacto_alcance', 'impacto_cronograma', 'impacto_costo', 'impacto_calidad',
            'estado', 'aprobador', 'fecha_aprobacion', 'justificacion_decision',
            'fecha_implementacion', 'responsable_implementacion', 'notas_implementacion',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'fecha_solicitud', 'fecha_creacion', 'fecha_actualizacion']


# ============================================
# SERIALIZERS PARA RECURSOS
# ============================================

class AsignacionRecursoTareaSerializer(serializers.ModelSerializer):
    """Serializer para asignación de recursos a tareas"""

    recurso_nombre = serializers.CharField(source='recurso.nombre', read_only=True)
    tarea_nombre = serializers.CharField(source='tarea.nombre', read_only=True)

    class Meta:
        model = AsignacionRecursoTarea
        fields = [
            'id', 'recurso', 'recurso_nombre', 'tarea', 'tarea_nombre',
            'horas_estimadas', 'horas_reales', 'fecha_asignacion'
        ]
        read_only_fields = ['id', 'fecha_asignacion']


class RecursoProyectoSerializer(serializers.ModelSerializer):
    """Serializer para recursos del proyecto"""

    asignaciones = AsignacionRecursoTareaSerializer(many=True, read_only=True)

    class Meta:
        model = RecursoProyecto
        fields = [
            'id', 'proyecto', 'nombre', 'email', 'telefono',
            'rol', 'tipo', 'porcentaje_dedicacion', 'costo_hora',
            'fecha_inicio', 'fecha_fin', 'estado',
            'habilidades', 'notas', 'asignaciones',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']


# ============================================
# SERIALIZERS PARA CALIDAD
# ============================================

class ItemChecklistSerializer(serializers.ModelSerializer):
    """Serializer para ítems de checklist"""

    class Meta:
        model = ItemChecklist
        fields = [
            'id', 'checklist', 'orden', 'descripcion', 'criterio_aceptacion',
            'estado', 'responsable', 'fecha_verificacion', 'observaciones'
        ]
        read_only_fields = ['id']


class ChecklistCalidadSerializer(serializers.ModelSerializer):
    """Serializer para checklists de calidad"""

    items = ItemChecklistSerializer(many=True, read_only=True)
    items_data = serializers.ListField(write_only=True, required=False)

    class Meta:
        model = ChecklistCalidad
        fields = [
            'id', 'proyecto', 'nombre', 'tipo', 'descripcion',
            'fecha_creacion', 'creado_por', 'items', 'items_data'
        ]
        read_only_fields = ['id', 'fecha_creacion']

    def create(self, validated_data):
        items_data = validated_data.pop('items_data', [])
        checklist = ChecklistCalidad.objects.create(**validated_data)

        for item_data in items_data:
            ItemChecklist.objects.create(checklist=checklist, **item_data)

        return checklist

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items_data', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                ItemChecklist.objects.create(checklist=instance, **item_data)

        return instance


# ============================================
# SERIALIZERS PARA COMUNICACIONES
# ============================================

class ComunicacionSerializer(serializers.ModelSerializer):
    """Serializer para comunicaciones del proyecto"""

    class Meta:
        model = Comunicacion
        fields = [
            'id', 'proyecto', 'tipo', 'titulo', 'descripcion',
            'emisor', 'destinatarios',
            'fecha_planificada', 'fecha_realizada', 'estado',
            'agenda', 'acuerdos', 'siguiente_pasos',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']


# ============================================
# SERIALIZERS PARA COMPRAS
# ============================================

class CompraSerializer(serializers.ModelSerializer):
    """Serializer para compras y contratos"""

    saldo_pendiente = serializers.ReadOnlyField()

    class Meta:
        model = Compra
        fields = [
            'id', 'proyecto', 'numero', 'tipo', 'descripcion',
            'proveedor', 'contacto_proveedor',
            'moneda', 'monto_total', 'monto_pagado', 'saldo_pendiente',
            'fecha_solicitud', 'fecha_aprobacion', 'fecha_emision',
            'fecha_entrega_estimada', 'fecha_entrega_real',
            'estado', 'solicitante', 'aprobador',
            'terminos_condiciones', 'notas',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'fecha_solicitud', 'saldo_pendiente', 'fecha_creacion', 'fecha_actualizacion']


# ============================================
# SERIALIZERS PARA INFORMES EJECUTIVOS
# ============================================

class InformeEjecutivoSerializer(serializers.ModelSerializer):
    """Serializer para informes ejecutivos"""

    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    formato_display = serializers.CharField(source='get_formato_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    nombre_archivo_generado = serializers.CharField(source='nombre_archivo', read_only=True)
    generado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = InformeEjecutivo
        fields = [
            'id', 'proyecto', 'tipo', 'tipo_display', 'formato', 'formato_display',
            'nombre', 'descripcion', 'archivo', 'estado', 'estado_display',
            'mensaje_error', 'generado_por', 'generado_por_nombre',
            'fecha_generacion', 'fecha_desde', 'fecha_hasta',
            'configuracion', 'nombre_archivo_generado'
        ]
        read_only_fields = ['id', 'proyecto', 'fecha_generacion', 'generado_por', 'estado', 'archivo']

    def get_generado_por_nombre(self, obj):
        if obj.generado_por:
            return f"{obj.generado_por.first_name} {obj.generado_por.last_name}".strip() or obj.generado_por.email
        return None

# =====================================================================
# SERIALIZERS PARA EVALUACIONES ESTRATÉGICAS
# =====================================================================

class EscenarioEvaluacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscenarioEvaluacion
        fields = '__all__'
        read_only_fields = ['usuario', 'fecha_creacion']


class AlternativaProyectoSerializer(serializers.ModelSerializer):
    metricas_calculadas = serializers.SerializerMethodField()

    class Meta:
        model = AlternativaProyecto
        fields = '__all__'
        read_only_fields = ['usuario', 'fecha_creacion', 'fecha_actualizacion', 'vpn', 'tir', 'roi', 'payback', 'relacion_beneficio_costo']

    def get_metricas_calculadas(self, obj):
        """Retorna las métricas financieras calculadas"""
        return {
            'vpn': float(obj.vpn) if obj.vpn else None,
            'tir': float(obj.tir) if obj.tir else None,
            'roi': float(obj.roi) if obj.roi else None,
            'payback': float(obj.payback) if obj.payback else None,
            'relacion_bc': float(obj.relacion_beneficio_costo) if obj.relacion_beneficio_costo else None
        }


class ResultadoMetodoEvaluacionSerializer(serializers.ModelSerializer):
    alternativa_nombre = serializers.CharField(source='alternativa.nombre', read_only=True)
    alternativa_codigo = serializers.CharField(source='alternativa.codigo', read_only=True)
    metodo_display = serializers.CharField(source='get_metodo_display', read_only=True)

    class Meta:
        model = ResultadoMetodoEvaluacion
        fields = '__all__'
        read_only_fields = ['fecha_calculo']


class EvaluacionEstrategicaSerializer(serializers.ModelSerializer):
    escenario_nombre = serializers.CharField(source='escenario.nombre', read_only=True)
    alternativa_recomendada_nombre = serializers.CharField(source='alternativa_recomendada.nombre', read_only=True)
    resultados = ResultadoMetodoEvaluacionSerializer(many=True, read_only=True)
    numero_alternativas = serializers.SerializerMethodField()

    class Meta:
        model = EvaluacionEstrategica
        fields = '__all__'
        read_only_fields = ['usuario', 'fecha_creacion', 'fecha_evaluacion', 'alternativa_recomendada', 'puntaje_mejor_alternativa', 'conclusion_ia', 'recomendaciones_ia']

    def get_numero_alternativas(self, obj):
        return obj.alternativas.count()


# Serializer para ejecutar evaluación (POST)
class EjecutarEvaluacionSerializer(serializers.Serializer):
    """Serializer para ejecutar una evaluación estratégica"""
    metodos = serializers.MultipleChoiceField(
        choices=['vpn', 'ponderado', 'monte_carlo', 'ia_generativa', 'random_forest'],
        required=True,
        help_text="Métodos de evaluación a aplicar"
    )
    iteraciones_monte_carlo = serializers.IntegerField(
        default=1000,
        min_value=100,
        max_value=10000,
        required=False,
        help_text="Número de iteraciones para Monte Carlo"
    )
    recalcular_metricas = serializers.BooleanField(
        default=True,
        required=False,
        help_text="Recalcular métricas financieras antes de evaluar"
    )

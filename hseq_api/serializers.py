from rest_framework import serializers
from .models import (
    RrhhArea, RrhhCargo, RrhhPerfilCompetencia, RrhhCompetencia, RrhhPerfilCompetenciaDetalle,
    RrhhColaborador, RrhhDocumentoColaborador,
    HseqProgramaAnual, HseqPilar, HseqCapacitacion, HseqEvidenciaCapacitacion,
    HseqAsignacionCapacitacion, HseqEncuestaCapacitacion, HseqEvaluacion,
    HseqPreguntaEvaluacion, HseqOpcionPregunta, HseqIntentoEvaluacion,
    HseqRespuestaIntento, HseqCertificadoTar, HseqProcesoInduccion,
    HseqRequisitoInduccion, HseqNotificacionInduccion, HseqRecursoInduccion,
    HseqRegistroColaborador
)


# ---------------------------------------------------------------------------
# Serializers RRHH Base
# ---------------------------------------------------------------------------

class RrhhAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhArea
        fields = ['id', 'name']


class RrhhCargoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhCargo
        fields = ['id', 'name']


class RrhhColaboradorSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source='area.name', read_only=True)
    position_name = serializers.CharField(source='position.name', read_only=True)
    profile_name = serializers.CharField(source='profile.name', read_only=True, default='')

    class Meta:
        model = RrhhColaborador
        fields = [
            'id', 'dni', 'full_name', 'email', 'personal_email', 'birth_date',
            'corporate_phone', 'personal_phone', 'address', 'status', 'worker_category',
            'hire_date', 'termination_date', 'area_name', 'position_name', 'profile_name',
            'direct_manager_id', 'created_at', 'updated_at'
        ]


# ---------------------------------------------------------------------------
# Serializers HSEQ
# ---------------------------------------------------------------------------

class HseqPilarSerializer(serializers.ModelSerializer):
    class Meta:
        model = HseqPilar
        fields = ['id', 'code', 'name']


class HseqProgramaAnualSerializer(serializers.ModelSerializer):
    class Meta:
        model = HseqProgramaAnual
        fields = ['id', 'year', 'management_owner', 'name', 'minimum_score', 'general_target']


class HseqCompetenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RrhhCompetencia
        fields = ['id', 'code', 'name', 'description']


class HseqPerfilCompetenciaDetalleSerializer(serializers.ModelSerializer):
    competency = HseqCompetenciaSerializer(read_only=True)

    class Meta:
        model = RrhhPerfilCompetenciaDetalle
        fields = ['id', 'competency', 'is_required', 'requirement_moment', 'validity_months', 'allows_validation']


class HseqPerfilCompetenciaSerializer(serializers.ModelSerializer):
    detalles = HseqPerfilCompetenciaDetalleSerializer(many=True, read_only=True)
    colaboradores_count = serializers.IntegerField(source='colaboradores.count', read_only=True, default=0)

    class Meta:
        model = RrhhPerfilCompetencia
        fields = ['id', 'name', 'description', 'is_active', 'detalles', 'colaboradores_count']


class HseqEvidenciaCapacitacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HseqEvidenciaCapacitacion
        fields = ['id', 'training_id', 'original_name', 'storage_name', 'mime_type', 'size_bytes', 'uploaded_at']


class HseqCapacitacionSerializer(serializers.ModelSerializer):
    pillar_name = serializers.CharField(source='pillar.name', read_only=True)
    pillar_code = serializers.CharField(source='pillar.code', read_only=True)
    program_name = serializers.CharField(source='annual_program.name', read_only=True)
    program_year = serializers.IntegerField(source='annual_program.year', read_only=True)
    competency_name = serializers.CharField(source='competency.name', read_only=True, default='')
    evidencias = HseqEvidenciaCapacitacionSerializer(many=True, read_only=True)
    has_evaluation = serializers.SerializerMethodField()
    assignments_count = serializers.SerializerMethodField()
    approved_count = serializers.SerializerMethodField()

    class Meta:
        model = HseqCapacitacion
        fields = [
            'id', 'code', 'title', 'description', 'planned_month', 'published_at',
            'regularization_days', 'management_owner', 'executed_at', 'duration_minutes',
            'location', 'considerations', 'status', 'modality', 'video_url', 'registration_url',
            'evaluation_url', 'activity_type', 'responsible', 'comments',
            'annual_program_id', 'pillar_id', 'competency_id',
            'pillar_name', 'pillar_code', 'program_name', 'program_year', 'competency_name',
            'evidencias', 'has_evaluation', 'assignments_count', 'approved_count',
            'created_at', 'updated_at'
        ]

    def get_has_evaluation(self, obj):
        return hasattr(obj, 'evaluacion') and obj.evaluacion is not None

    def get_assignments_count(self, obj):
        return obj.asignaciones.filter(applicability_status='APPLIES').count()

    def get_approved_count(self, obj):
        return obj.asignaciones.filter(applicability_status='APPLIES', status='APPROVED').count()


class HseqAsignacionCapacitacionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_dni = serializers.CharField(source='employee.dni', read_only=True)
    employee_area = serializers.CharField(source='employee.area.name', read_only=True)
    employee_position = serializers.CharField(source='employee.position.name', read_only=True)
    training_code = serializers.CharField(source='training.code', read_only=True)
    training_title = serializers.CharField(source='training.title', read_only=True)
    training_modality = serializers.CharField(source='training.modality', read_only=True)
    training_video_url = serializers.CharField(source='training.video_url', read_only=True)
    has_survey = serializers.SerializerMethodField()

    class Meta:
        model = HseqAsignacionCapacitacion
        fields = [
            'id', 'employee_id', 'training_id', 'applicability_status', 'status',
            'due_date', 'best_score', 'attempt_count', 'reason_code',
            'registration_applied_at', 'exam_unlocked_at',
            'employee_name', 'employee_dni', 'employee_area', 'employee_position',
            'training_code', 'training_title', 'training_modality', 'training_video_url',
            'has_survey', 'created_at', 'updated_at'
        ]

    def get_has_survey(self, obj):
        return hasattr(obj, 'encuesta') and obj.encuesta is not None


class HseqOpcionPreguntaSerializer(serializers.ModelSerializer):
    class Meta:
        model = HseqOpcionPregunta
        fields = ['id', 'label', 'is_correct']


class HseqPreguntaEvaluacionSerializer(serializers.ModelSerializer):
    opciones = HseqOpcionPreguntaSerializer(many=True, read_only=True)

    class Meta:
        model = HseqPreguntaEvaluacion
        fields = ['id', 'prompt', 'type', 'points', 'order_index', 'is_active', 'version', 'opciones']


class HseqEvaluacionSerializer(serializers.ModelSerializer):
    training_code = serializers.CharField(source='training.code', read_only=True)
    training_title = serializers.CharField(source='training.title', read_only=True)
    preguntas = HseqPreguntaEvaluacionSerializer(many=True, read_only=True)
    total_questions = serializers.SerializerMethodField()

    class Meta:
        model = HseqEvaluacion
        fields = [
            'id', 'title', 'minimum_score', 'max_attempts', 'duration_minutes',
            'is_published', 'training_id', 'training_code', 'training_title',
            'preguntas', 'total_questions', 'created_at', 'updated_at'
        ]

    def get_total_questions(self, obj):
        return obj.preguntas.filter(is_active=True).count()


class HseqCertificadoTarSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_dni = serializers.CharField(source='employee.dni', read_only=True)
    employee_area = serializers.CharField(source='employee.area.name', read_only=True)
    employee_position = serializers.CharField(source='employee.position.name', read_only=True)

    class Meta:
        model = HseqCertificadoTar
        fields = [
            'id', 'employee_id', 'type', 'certificate_code', 'provider', 'verification_url',
            'issued_at', 'expires_at', 'original_name', 'storage_name', 'mime_type', 'size_bytes',
            'source_category', 'notes', 'uploaded_by', 'uploaded_at',
            'employee_name', 'employee_dni', 'employee_area', 'employee_position'
        ]


class HseqRequisitoInduccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HseqRequisitoInduccion
        fields = [
            'id', 'process_id', 'code', 'label', 'category', 'status',
            'training_assignment_id', 'employee_document_id', 'attempt_limit',
            'acknowledged_at', 'downloaded_at', 'viewed_at', 'completed_at',
            'metadata', 'created_at', 'updated_at'
        ]


class HseqProcesoInduccionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_dni = serializers.CharField(source='employee.dni', read_only=True)
    employee_area = serializers.CharField(source='employee.area.name', read_only=True)
    employee_position = serializers.CharField(source='employee.position.name', read_only=True)
    requisitos = HseqRequisitoInduccionSerializer(many=True, read_only=True)

    class Meta:
        model = HseqProcesoInduccion
        fields = [
            'id', 'employee_id', 'type', 'trigger', 'status', 'initiated_at', 'due_at',
            'completed_at', 'valid_until', 'position_name_snapshot', 'previous_position_name',
            'requested_by', 'client_request', 'notes', 'hseq_completed_at',
            'workplace_training_due_at', 'workplace_training_at', 'workplace_training_status',
            'employee_name', 'employee_dni', 'employee_area', 'employee_position',
            'requisitos', 'created_at', 'updated_at'
        ]


class HseqEncuestaCapacitacionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    training_title = serializers.CharField(source='assignment.training.title', read_only=True)

    class Meta:
        model = HseqEncuestaCapacitacion
        fields = [
            'id', 'assignment_id', 'employee_id', 'topic_rating', 'trainer_rating',
            'understanding_rating', 'materials_rating', 'connection_rating',
            'expectations_met', 'knowledge_application', 'comments', 'submitted_at',
            'employee_name', 'training_title'
        ]

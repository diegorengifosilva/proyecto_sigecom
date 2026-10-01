import uuid
from django.db import models


# ---------------------------------------------------------------------------
# Modelos de Recursos Humanos (rrhh_*) en vc_sig
# ---------------------------------------------------------------------------

class RrhhArea(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    name = models.CharField(max_length=191, unique=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'rrhh_area'
        verbose_name = 'Área RRHH'

    def __str__(self):
        return self.name


class RrhhCargo(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    name = models.CharField(max_length=191, unique=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'rrhh_cargo'
        verbose_name = 'Cargo RRHH'

    def __str__(self):
        return self.name


class RrhhPerfilCompetencia(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    name = models.CharField(max_length=191, unique=True)
    description = models.CharField(max_length=191, null=True, blank=True)
    is_active = models.BooleanField(db_column='isActive', default=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'rrhh_perfil_competencia'
        verbose_name = 'Perfil de Competencias'

    def __str__(self):
        return self.name


class RrhhCompetencia(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    code = models.CharField(max_length=191, unique=True)
    name = models.CharField(max_length=191)
    description = models.CharField(max_length=191, null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'rrhh_competencia'
        verbose_name = 'Competencia'

    def __str__(self):
        return f"{self.code} - {self.name}"


class RrhhPerfilCompetenciaDetalle(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    profile = models.ForeignKey(RrhhPerfilCompetencia, on_delete=models.DO_NOTHING, db_column='profileId', related_name='detalles')
    competency = models.ForeignKey(RrhhCompetencia, on_delete=models.DO_NOTHING, db_column='competencyId', related_name='perfiles')
    is_required = models.BooleanField(db_column='isRequired', default=True)
    requirement_moment = models.CharField(db_column='requirementMoment', max_length=191)
    validity_months = models.IntegerField(db_column='validityMonths', null=True, blank=True)
    allows_validation = models.BooleanField(db_column='allowsValidation', default=False)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'rrhh_perfil_competencia_detalle'
        unique_together = (('profile', 'competency'),)


class RrhhColaborador(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    dni = models.CharField(max_length=191, unique=True)
    full_name = models.CharField(db_column='fullName', max_length=191)
    email = models.CharField(max_length=191, unique=True)
    personal_email = models.CharField(db_column='personalEmail', max_length=191, null=True, blank=True)
    birth_date = models.DateTimeField(db_column='birthDate', null=True, blank=True)
    corporate_phone = models.CharField(db_column='corporatePhone', max_length=191, null=True, blank=True)
    personal_phone = models.CharField(db_column='personalPhone', max_length=191, null=True, blank=True)
    address = models.CharField(max_length=191, null=True, blank=True)
    source_system = models.CharField(db_column='sourceSystem', max_length=191, default='HUMAN_RESOURCES')
    source_updated_at = models.DateTimeField(db_column='sourceUpdatedAt', null=True, blank=True)
    hire_date = models.DateTimeField(db_column='hireDate')
    termination_date = models.DateTimeField(db_column='terminationDate', null=True, blank=True)
    status = models.CharField(max_length=20, default='ACTIVE')  # ACTIVE, INACTIVE
    worker_category = models.CharField(db_column='workerCategory', max_length=20, default='PAYROLL')
    employer_name = models.CharField(db_column='employerName', max_length=191, null=True, blank=True)
    direct_manager_id = models.CharField(db_column='directManagerId', max_length=191, null=True, blank=True)
    area = models.ForeignKey(RrhhArea, on_delete=models.DO_NOTHING, db_column='areaId', related_name='colaboradores')
    position = models.ForeignKey(RrhhCargo, on_delete=models.DO_NOTHING, db_column='positionId', related_name='colaboradores')
    profile = models.ForeignKey(RrhhPerfilCompetencia, on_delete=models.DO_NOTHING, db_column='profileId', null=True, blank=True, related_name='colaboradores')
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'rrhh_colaborador'
        verbose_name = 'Colaborador'

    def __str__(self):
        return f"{self.dni} - {self.full_name}"


class RrhhDocumentoColaborador(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    employee = models.ForeignKey(RrhhColaborador, on_delete=models.DO_NOTHING, db_column='employeeId', related_name='documentos')
    type = models.CharField(max_length=191)
    period = models.CharField(max_length=191, null=True, blank=True)
    title = models.CharField(max_length=191)
    original_name = models.CharField(db_column='originalName', max_length=191)
    storage_name = models.CharField(db_column='storageName', max_length=191, unique=True)
    mime_type = models.CharField(db_column='mimeType', max_length=191)
    size_bytes = models.IntegerField(db_column='sizeBytes')
    visible_to_employee = models.BooleanField(db_column='visibleToEmployee', default=True)
    uploaded_at = models.DateTimeField(db_column='uploadedAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'rrhh_documento_colaborador'


# ---------------------------------------------------------------------------
# Modelos del Módulo HSEQ (hseq_*) en vc_sig
# ---------------------------------------------------------------------------

class HseqProgramaAnual(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    year = models.IntegerField()
    management_owner = models.CharField(db_column='managementOwner', max_length=191, default='HSEQ')
    name = models.CharField(max_length=191)
    minimum_score = models.DecimalField(db_column='minimumScore', max_digits=65, decimal_places=30, default=16)
    general_target = models.DecimalField(db_column='generalTarget', max_digits=65, decimal_places=30, default=80)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'hseq_programa_anual'
        verbose_name = 'Programa Anual HSEQ'

    def __str__(self):
        return f"{self.name} ({self.year})"


class HseqPilar(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    code = models.CharField(max_length=191, unique=True)
    name = models.CharField(max_length=191)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'hseq_pilar'
        verbose_name = 'Pilar HSEQ'

    def __str__(self):
        return f"{self.code} - {self.name}"


class HseqCapacitacion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    code = models.CharField(max_length=191, unique=True)
    title = models.CharField(max_length=191)
    description = models.TextField(null=True, blank=True)
    planned_month = models.IntegerField(db_column='plannedMonth')
    published_at = models.DateTimeField(db_column='publishedAt', null=True, blank=True)
    regularization_days = models.IntegerField(db_column='regularizationDays', default=30)
    management_owner = models.CharField(db_column='managementOwner', max_length=191, default='HSEQ')
    executed_at = models.DateTimeField(db_column='executedAt', null=True, blank=True)
    duration_minutes = models.IntegerField(db_column='durationMinutes', null=True, blank=True)
    location = models.CharField(max_length=191, null=True, blank=True)
    considerations = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=50, default='DRAFT')  # DRAFT, PLANNED, CONFIRMED, RESCHEDULED, EXECUTED, CLOSED, CANCELLED
    modality = models.CharField(max_length=50, null=True, blank=True)  # PRESENCIAL, VIRTUAL, ASINCRONO
    video_url = models.CharField(db_column='videoUrl', max_length=500, null=True, blank=True)
    registration_url = models.CharField(db_column='registrationUrl', max_length=500, null=True, blank=True)
    evaluation_url = models.CharField(db_column='evaluationUrl', max_length=500, null=True, blank=True)
    activity_type = models.CharField(db_column='activityType', max_length=50, default='TRAINING')
    responsible = models.CharField(max_length=191, null=True, blank=True)
    source_sheet = models.CharField(db_column='sourceSheet', max_length=191, null=True, blank=True)
    source_row = models.IntegerField(db_column='sourceRow', null=True, blank=True)
    source_mark = models.CharField(db_column='sourceMark', max_length=191, null=True, blank=True)
    comments = models.TextField(null=True, blank=True)
    annual_program = models.ForeignKey(HseqProgramaAnual, on_delete=models.DO_NOTHING, db_column='annualProgramId', related_name='capacitaciones')
    pillar = models.ForeignKey(HseqPilar, on_delete=models.DO_NOTHING, db_column='pillarId', related_name='capacitaciones')
    competency = models.ForeignKey(RrhhCompetencia, on_delete=models.DO_NOTHING, db_column='competencyId', null=True, blank=True, related_name='capacitaciones')
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'hseq_capacitacion'
        verbose_name = 'Capacitación HSEQ'

    def __str__(self):
        return f"{self.code} - {self.title}"


class HseqEvidenciaCapacitacion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    training = models.ForeignKey(HseqCapacitacion, on_delete=models.CASCADE, db_column='trainingId', related_name='evidencias')
    original_name = models.CharField(db_column='originalName', max_length=191)
    storage_name = models.CharField(db_column='storageName', max_length=191, unique=True)
    mime_type = models.CharField(db_column='mimeType', max_length=191)
    size_bytes = models.IntegerField(db_column='sizeBytes')
    uploaded_at = models.DateTimeField(db_column='uploadedAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'hseq_evidencia_capacitacion'


class HseqAsignacionCapacitacion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    employee = models.ForeignKey(RrhhColaborador, on_delete=models.DO_NOTHING, db_column='employeeId', related_name='asignaciones_hseq')
    training = models.ForeignKey(HseqCapacitacion, on_delete=models.DO_NOTHING, db_column='trainingId', related_name='asignaciones')
    applicability_status = models.CharField(db_column='applicabilityStatus', max_length=50, default='APPLIES')  # APPLIES, NOT_APPLICABLE, EXEMPT
    status = models.CharField(max_length=50, default='PENDING')  # PENDING, IN_PROGRESS, APPROVED, FAILED, OVERDUE, VALIDATED
    due_date = models.DateTimeField(db_column='dueDate', null=True, blank=True)
    best_score = models.DecimalField(db_column='bestScore', max_digits=65, decimal_places=30, null=True, blank=True)
    attempt_count = models.IntegerField(db_column='attemptCount', default=0)
    reason_code = models.CharField(db_column='reasonCode', max_length=191, null=True, blank=True)
    registration_applied_at = models.DateTimeField(db_column='registrationAppliedAt', null=True, blank=True)
    registration_snapshot = models.TextField(db_column='registrationSnapshot', null=True, blank=True)
    exam_unlocked_at = models.DateTimeField(db_column='examUnlockedAt', null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'hseq_asignacion_capacitacion'
        unique_together = (('employee', 'training'),)


class HseqEncuestaCapacitacion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    assignment = models.OneToOneField(HseqAsignacionCapacitacion, on_delete=models.DO_NOTHING, db_column='assignmentId', related_name='encuesta')
    employee = models.ForeignKey(RrhhColaborador, on_delete=models.DO_NOTHING, db_column='employeeId', related_name='encuestas_hseq')
    topic_rating = models.IntegerField(db_column='topicRating')
    trainer_rating = models.IntegerField(db_column='trainerRating')
    understanding_rating = models.IntegerField(db_column='understandingRating')
    materials_rating = models.IntegerField(db_column='materialsRating')
    connection_rating = models.IntegerField(db_column='connectionRating')
    expectations_met = models.BooleanField(db_column='expectationsMet')
    knowledge_application = models.CharField(db_column='knowledgeApplication', max_length=191)
    comments = models.TextField(null=True, blank=True)
    submitted_at = models.DateTimeField(db_column='submittedAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'hseq_encuesta_capacitacion'


class HseqEvaluacion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    title = models.CharField(max_length=191)
    minimum_score = models.DecimalField(db_column='minimumScore', max_digits=65, decimal_places=30, default=16)
    max_attempts = models.IntegerField(db_column='maxAttempts', null=True, blank=True)
    duration_minutes = models.IntegerField(db_column='durationMinutes', null=True, blank=True)
    is_published = models.BooleanField(db_column='isPublished', default=False)
    training = models.OneToOneField(HseqCapacitacion, on_delete=models.DO_NOTHING, db_column='trainingId', related_name='evaluacion')
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'hseq_evaluacion'


class HseqPreguntaEvaluacion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    evaluation = models.ForeignKey(HseqEvaluacion, on_delete=models.CASCADE, db_column='evaluationId', related_name='preguntas')
    prompt = models.CharField(max_length=500)
    type = models.CharField(max_length=50, default='MULTIPLE_CHOICE')
    points = models.DecimalField(max_digits=65, decimal_places=30, default=5)
    order_index = models.IntegerField(db_column='orderIndex', default=1)
    is_active = models.BooleanField(db_column='isActive', default=True)
    version = models.IntegerField(default=1)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'hseq_pregunta_evaluacion'


class HseqOpcionPregunta(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    question = models.ForeignKey(HseqPreguntaEvaluacion, on_delete=models.CASCADE, db_column='questionId', related_name='opciones')
    label = models.CharField(max_length=500)
    is_correct = models.BooleanField(db_column='isCorrect', default=False)

    class Meta:
        managed = False
        db_table = 'hseq_opcion_pregunta'


class HseqIntentoEvaluacion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    evaluation = models.ForeignKey(HseqEvaluacion, on_delete=models.DO_NOTHING, db_column='evaluationId', related_name='intentos')
    employee = models.ForeignKey(RrhhColaborador, on_delete=models.DO_NOTHING, db_column='employeeId', related_name='intentos_evaluacion')
    started_at = models.DateTimeField(db_column='startedAt', auto_now_add=True)
    submitted_at = models.DateTimeField(db_column='submittedAt', null=True, blank=True)
    score = models.DecimalField(max_digits=65, decimal_places=30, null=True, blank=True)
    status = models.CharField(max_length=50, default='IN_PROGRESS')  # IN_PROGRESS, APPROVED, FAILED
    source = models.CharField(max_length=50, default='INTERNAL')  # INTERNAL, MANUAL, GOOGLE_FORMS, IMPORT
    external_response_id = models.CharField(db_column='externalResponseId', max_length=191, null=True, blank=True, unique=True)
    evidence_url = models.CharField(db_column='evidenceUrl', max_length=500, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'hseq_intento_evaluacion'


class HseqRespuestaIntento(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    attempt = models.ForeignKey(HseqIntentoEvaluacion, on_delete=models.CASCADE, db_column='attemptId', related_name='respuestas')
    question = models.ForeignKey(HseqPreguntaEvaluacion, on_delete=models.DO_NOTHING, db_column='questionId', related_name='respuestas_intento')
    value = models.TextField()  # JSON o string con respuesta
    is_correct = models.BooleanField(db_column='isCorrect', null=True, blank=True)
    points = models.DecimalField(max_digits=65, decimal_places=30, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'hseq_respuesta_intento'
        unique_together = (('attempt', 'question'),)


class HseqCertificadoTar(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    employee = models.ForeignKey(RrhhColaborador, on_delete=models.DO_NOTHING, db_column='employeeId', related_name='certificados_tar')
    type = models.CharField(max_length=50)  # HEIGHT, ELECTRICAL_RISK, LOTO, HOT_WORK, SCAFFOLDING
    certificate_code = models.CharField(db_column='certificateCode', max_length=191, null=True, blank=True)
    provider = models.CharField(max_length=191, null=True, blank=True)
    verification_url = models.CharField(db_column='verificationUrl', max_length=500, null=True, blank=True)
    issued_at = models.DateTimeField(db_column='issuedAt')
    expires_at = models.DateTimeField(db_column='expiresAt')
    original_name = models.CharField(db_column='originalName', max_length=191)
    storage_name = models.CharField(db_column='storageName', max_length=191, unique=True)
    mime_type = models.CharField(db_column='mimeType', max_length=191, default='application/pdf')
    size_bytes = models.IntegerField(db_column='sizeBytes')
    source_path = models.CharField(db_column='sourcePath', max_length=500, null=True, blank=True)
    source_category = models.CharField(db_column='sourceCategory', max_length=191, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    uploaded_by = models.CharField(db_column='uploadedBy', max_length=191, null=True, blank=True)
    uploaded_at = models.DateTimeField(db_column='uploadedAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'hseq_certificado_tar'


class HseqProcesoInduccion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    employee = models.ForeignKey(RrhhColaborador, on_delete=models.DO_NOTHING, db_column='employeeId', related_name='procesos_induccion')
    type = models.CharField(max_length=50)  # INITIAL, REINDUCTION
    trigger = models.CharField(max_length=50)  # HIRE, EXPIRATION, POSITION_CHANGE, REINFORCEMENT, CLIENT_REQUEST, ANNUAL_REGULARIZATION
    status = models.CharField(max_length=50, default='PENDING')  # PENDING, IN_PROGRESS, HSEQ_DOCUMENTS, HR_WORKPLACE_TRAINING, COMPLETED, OBSERVED
    initiated_at = models.DateTimeField(db_column='initiatedAt', auto_now_add=True)
    due_at = models.DateTimeField(db_column='dueAt', null=True, blank=True)
    completed_at = models.DateTimeField(db_column='completedAt', null=True, blank=True)
    valid_until = models.DateTimeField(db_column='validUntil', null=True, blank=True)
    position_name_snapshot = models.CharField(db_column='positionNameSnapshot', max_length=191)
    previous_position_name = models.CharField(db_column='previousPositionName', max_length=191, null=True, blank=True)
    requested_by = models.CharField(db_column='requestedBy', max_length=191, null=True, blank=True)
    client_request = models.CharField(db_column='clientRequest', max_length=191, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    survey_response = models.TextField(db_column='surveyResponse', null=True, blank=True)
    hseq_completion_reported_at = models.DateTimeField(db_column='hseqCompletionReportedAt', null=True, blank=True)
    hseq_completed_at = models.DateTimeField(db_column='hseqCompletedAt', null=True, blank=True)
    workplace_training_due_at = models.DateTimeField(db_column='workplaceTrainingDueAt', null=True, blank=True)
    workplace_training_at = models.DateTimeField(db_column='workplaceTrainingAt', null=True, blank=True)
    workplace_training_status = models.CharField(db_column='workplaceTrainingStatus', max_length=50, default='PENDING')
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'hseq_proceso_induccion'


class HseqRequisitoInduccion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    process = models.ForeignKey(HseqProcesoInduccion, on_delete=models.CASCADE, db_column='processId', related_name='requisitos')
    code = models.CharField(max_length=191)
    label = models.CharField(max_length=191)
    category = models.CharField(max_length=191)
    status = models.CharField(max_length=50, default='PENDING')  # PENDING, IN_PROGRESS, COMPLETED, FAILED, BLOCKED, OBSERVED
    training_assignment_id = models.CharField(db_column='trainingAssignmentId', max_length=191, null=True, blank=True)
    employee_document_id = models.CharField(db_column='employeeDocumentId', max_length=191, null=True, blank=True)
    attempt_limit = models.IntegerField(db_column='attemptLimit', default=2)
    acknowledged_at = models.DateTimeField(db_column='acknowledgedAt', null=True, blank=True)
    downloaded_at = models.DateTimeField(db_column='downloadedAt', null=True, blank=True)
    viewed_at = models.DateTimeField(db_column='viewedAt', null=True, blank=True)
    completed_at = models.DateTimeField(db_column='completedAt', null=True, blank=True)
    metadata = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'hseq_requisito_induccion'
        unique_together = (('process', 'code'),)


class HseqNotificacionInduccion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    employee = models.ForeignKey(RrhhColaborador, on_delete=models.CASCADE, db_column='employeeId', related_name='notificaciones_induccion')
    process_id = models.CharField(db_column='processId', max_length=191, null=True, blank=True)
    audience = models.CharField(max_length=191)
    category = models.CharField(max_length=191)
    title = models.CharField(max_length=191)
    message = models.TextField()
    status = models.CharField(max_length=50, default='PENDING')
    due_at = models.DateTimeField(db_column='dueAt', null=True, blank=True)
    read_at = models.DateTimeField(db_column='readAt', null=True, blank=True)
    dedupe_key = models.CharField(db_column='dedupeKey', max_length=191, unique=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'hseq_notificacion_induccion'


class HseqRecursoInduccion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    code = models.CharField(max_length=191)
    version = models.IntegerField()
    title = models.CharField(max_length=191)
    original_name = models.CharField(db_column='originalName', max_length=191)
    storage_name = models.CharField(db_column='storageName', max_length=191, unique=True)
    mime_type = models.CharField(db_column='mimeType', max_length=191)
    size_bytes = models.IntegerField(db_column='sizeBytes')
    is_active = models.BooleanField(db_column='isActive', default=True)
    uploaded_by = models.CharField(db_column='uploadedBy', max_length=191, null=True, blank=True)
    uploaded_at = models.DateTimeField(db_column='uploadedAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'hseq_recurso_induccion'
        unique_together = (('code', 'version'),)


class HseqRegistroColaborador(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    employee = models.OneToOneField(RrhhColaborador, on_delete=models.DO_NOTHING, db_column='employeeId', related_name='registro_hseq')
    status = models.CharField(max_length=50, default='PENDING')  # PENDING, IN_PROGRESS, COMPLETED, OBSERVED
    general_induction_at = models.DateTimeField(db_column='generalInductionAt', null=True, blank=True)
    specific_induction_at = models.DateTimeField(db_column='specificInductionAt', null=True, blank=True)
    policies_briefing_at = models.DateTimeField(db_column='policiesBriefingAt', null=True, blank=True)
    internal_regulations_delivered_at = models.DateTimeField(db_column='internalRegulationsDeliveredAt', null=True, blank=True)
    initial_requirements_validated_at = models.DateTimeField(db_column='initialRequirementsValidatedAt', null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'hseq_registro_colaborador'

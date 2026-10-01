import uuid
from django.db import models


class EmeBrigadista(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    employee_id = models.CharField(db_column='employeeId', max_length=191)
    brigade_type = models.CharField(db_column='brigadeType', max_length=191, default='PRIMEROS_AUXILIOS')
    role = models.CharField(max_length=191, default='BRIGADISTA')  # JEFE / BRIGADISTA
    is_active = models.BooleanField(db_column='isActive', default=True)
    joined_at = models.DateTimeField(db_column='joinedAt', auto_now_add=True)
    left_at = models.DateTimeField(db_column='leftAt', null=True, blank=True)
    last_monthly_review_at = models.DateTimeField(db_column='lastMonthlyReviewAt', null=True, blank=True)
    revision = models.IntegerField(default=1)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'eme_brigadista'
        verbose_name = 'Brigadista'


class EmeAptitudMedica(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    employee_id = models.CharField(db_column='employeeId', max_length=191)
    occupational_emo_case_id = models.CharField(db_column='occupationalEmoCaseId', max_length=191, null=True, blank=True)
    emo_reference = models.CharField(db_column='emoReference', max_length=191, null=True, blank=True)
    emo_issued_at = models.DateTimeField(db_column='emoIssuedAt', null=True, blank=True)
    emo_expires_at = models.DateTimeField(db_column='emoExpiresAt', null=True, blank=True)
    status = models.CharField(max_length=191, default='APTO')  # APTO / APTO_CON_RESTRICCIONES / NO_APTO
    validated_by_account_id = models.CharField(db_column='validatedByAccountId', max_length=191, null=True, blank=True)
    validated_at = models.DateTimeField(db_column='validatedAt', null=True, blank=True)
    signature_name = models.CharField(db_column='signatureName', max_length=191, null=True, blank=True)
    document_storage_name = models.CharField(db_column='documentStorageName', max_length=191, null=True, blank=True)
    observations = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'eme_aptitud_medica'
        verbose_name = 'Aptitud Médica Brigadista'


class EmePrograma(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    year = models.IntegerField(default=2026)
    activity_type = models.CharField(db_column='activityType', max_length=191, default='SIMULACRO')
    title = models.CharField(max_length=191)
    audience = models.CharField(max_length=191, null=True, blank=True)
    pillar = models.CharField(max_length=191, null=True, blank=True)
    planned_at = models.DateTimeField(db_column='plannedAt', null=True, blank=True)
    current_scheduled_at = models.DateTimeField(db_column='currentScheduledAt', null=True, blank=True)
    responsible = models.CharField(max_length=191, null=True, blank=True)
    status = models.CharField(max_length=191, default='PLANNED')  # PLANNED / EXECUTED / RESCHEDULED / CANCELLED
    last_reschedule_reason = models.TextField(db_column='lastRescheduleReason', null=True, blank=True)
    reschedule_count = models.IntegerField(db_column='rescheduleCount', default=0)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'eme_programa'
        verbose_name = 'Programa Anual de Emergencias'


class EmeReporte(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    report_type = models.CharField(db_column='reportType', max_length=191, default='SIMULACRO')
    code = models.CharField(max_length=191, unique=True)
    program_item_id = models.CharField(db_column='programItemId', max_length=191, null=True, blank=True)
    corporate_project_id = models.CharField(db_column='corporateProjectId', max_length=191, null=True, blank=True)
    project_code = models.CharField(db_column='projectCode', max_length=191, null=True, blank=True)
    project_name = models.CharField(db_column='projectName', max_length=191, null=True, blank=True)
    location = models.CharField(max_length=191, null=True, blank=True)
    event_at = models.DateTimeField(db_column='eventAt', null=True, blank=True)
    due_at = models.DateTimeField(db_column='dueAt', null=True, blank=True)
    author_employee_id = models.CharField(db_column='authorEmployeeId', max_length=191, null=True, blank=True)
    author_role = models.CharField(db_column='authorRole', max_length=191, null=True, blank=True)
    hseq_approver_id = models.CharField(db_column='hseqApproverId', max_length=191, null=True, blank=True)
    status = models.CharField(max_length=191, default='DRAFT')
    observations = models.TextField(null=True, blank=True)
    opportunities = models.TextField(null=True, blank=True)
    event_types = models.TextField(db_column='eventTypes', null=True, blank=True)
    objective = models.TextField(null=True, blank=True)
    scope = models.TextField(null=True, blank=True)
    started_at = models.DateTimeField(db_column='startedAt', null=True, blank=True)
    ended_at = models.DateTimeField(db_column='endedAt', null=True, blank=True)
    participant_count = models.IntegerField(db_column='participantCount', default=0)
    evacuation_seconds = models.IntegerField(db_column='evacuationSeconds', default=0)
    leader_name = models.CharField(db_column='leaderName', max_length=191, null=True, blank=True)
    involved_names = models.TextField(db_column='involvedNames', null=True, blank=True)
    chronology = models.TextField(null=True, blank=True)
    equipment_used = models.TextField(db_column='equipmentUsed', null=True, blank=True)
    positive_aspects = models.TextField(db_column='positiveAspects', null=True, blank=True)
    negative_aspects = models.TextField(db_column='negativeAspects', null=True, blank=True)
    recommendations = models.TextField(null=True, blank=True)
    lessons_learned = models.TextField(db_column='lessonsLearned', null=True, blank=True)
    result = models.CharField(max_length=191, default='SATISFACTORIO')
    form_data = models.TextField(db_column='formData', null=True, blank=True)
    document_storage_name = models.CharField(db_column='documentStorageName', max_length=191, null=True, blank=True)
    submitted_at = models.DateTimeField(db_column='submittedAt', null=True, blank=True)
    approved_at = models.DateTimeField(db_column='approvedAt', null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'eme_reporte'
        verbose_name = 'Reporte de Emergencia / Simulacro'


class EmeEvidencia(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    program_item_id = models.CharField(db_column='programItemId', max_length=191, null=True, blank=True)
    report_id = models.CharField(db_column='reportId', max_length=191, null=True, blank=True)
    evidence_type = models.CharField(db_column='evidenceType', max_length=191, default='FOTO')
    original_name = models.CharField(db_column='originalName', max_length=191)
    storage_name = models.CharField(db_column='storageName', max_length=191)
    mime_type = models.CharField(db_column='mimeType', max_length=191)
    size_bytes = models.IntegerField(db_column='sizeBytes', null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    uploaded_at = models.DateTimeField(db_column='uploadedAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'eme_evidencia'


class EmeAccion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    report_id = models.CharField(db_column='reportId', max_length=191)
    source_type = models.CharField(db_column='sourceType', max_length=191, default='SIMULACRO')
    description = models.TextField()
    immediate_correction = models.TextField(db_column='immediateCorrection', null=True, blank=True)
    responsible_employee_id = models.CharField(db_column='responsibleEmployeeId', max_length=191, null=True, blank=True)
    risk_level = models.CharField(db_column='riskLevel', max_length=191, default='MEDIO')
    due_at = models.DateTimeField(db_column='dueAt', null=True, blank=True)
    status = models.CharField(max_length=191, default='OPEN')  # OPEN / IN_PROGRESS / CLOSED
    closed_at = models.DateTimeField(db_column='closedAt', null=True, blank=True)
    evidence_storage_name = models.CharField(db_column='evidenceStorageName', max_length=191, null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'eme_accion'
        verbose_name = 'Plan de Acción Emergencias'


class EmeEquipo(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    code = models.CharField(max_length=191, unique=True)
    category = models.CharField(max_length=191, default='EXTINTOR')
    type = models.CharField(max_length=191)  # PQS / CO2 / ACETATO, etc.
    location = models.CharField(max_length=191)
    capacity = models.CharField(max_length=191, null=True, blank=True)
    serial = models.CharField(max_length=191, null=True, blank=True)
    inspection_card = models.CharField(db_column='inspectionCard', max_length=191, null=True, blank=True)
    last_maintenance_at = models.DateTimeField(db_column='lastMaintenanceAt', null=True, blank=True)
    hydrostatic_test_at = models.DateTimeField(db_column='hydrostaticTestAt', null=True, blank=True)
    hydrostatic_expires_at = models.DateTimeField(db_column='hydrostaticExpiresAt', null=True, blank=True)
    charge_expires_at = models.DateTimeField(db_column='chargeExpiresAt', null=True, blank=True)
    responsible = models.CharField(max_length=191, null=True, blank=True)
    status = models.CharField(max_length=191, default='OPERATIVO')  # OPERATIVO / MANTENIMIENTO / VENCIDO
    observations = models.TextField(null=True, blank=True)
    image_storage_name = models.CharField(db_column='imageStorageName', max_length=191, null=True, blank=True)
    last_inspected_at = models.DateTimeField(db_column='lastInspectedAt', null=True, blank=True)
    next_inspection_at = models.DateTimeField(db_column='nextInspectionAt', null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'eme_equipo'
        verbose_name = 'Equipo de Emergencia'


class EmeInspeccion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    title = models.CharField(max_length=191)
    category = models.CharField(max_length=191, default='EXTINTORES')
    location = models.CharField(max_length=191)
    responsible = models.CharField(max_length=191)
    frequency = models.CharField(max_length=191, default='MENSUAL')
    planned_at = models.DateTimeField(db_column='plannedAt', null=True, blank=True)
    executed_at = models.DateTimeField(db_column='executedAt', null=True, blank=True)
    status = models.CharField(max_length=191, default='PENDING')  # PENDING / CONFORME / OBSERVADO
    findings = models.TextField(null=True, blank=True)
    corrective_measure = models.TextField(db_column='correctiveMeasure', null=True, blank=True)
    evidence_storage_name = models.CharField(db_column='evidenceStorageName', max_length=191, null=True, blank=True)
    closed_at = models.DateTimeField(db_column='closedAt', null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'eme_inspeccion'
        verbose_name = 'Inspección de Emergencia'


class EmePlantilla(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    code = models.CharField(max_length=191)
    name = models.CharField(max_length=191)
    version = models.CharField(max_length=191, default='1.0')
    effective_at = models.DateTimeField(db_column='effectiveAt', null=True, blank=True)
    document_type = models.CharField(db_column='documentType', max_length=191, default='FORMATO')
    storage_name = models.CharField(db_column='storageName', max_length=191)
    is_active = models.BooleanField(db_column='isActive', default=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'eme_plantilla'
        verbose_name = 'Formato Controlado Emergencias'

import uuid
from django.db import models


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
    profile_id = models.CharField(db_column='profileId', max_length=191)
    competency_id = models.CharField(db_column='competencyId', max_length=191)
    is_required = models.BooleanField(db_column='isRequired', default=True)
    requirement_moment = models.CharField(db_column='requirementMoment', max_length=191, default='BEFORE_START')
    validity_months = models.IntegerField(db_column='validityMonths', null=True, blank=True)
    allows_validation = models.BooleanField(db_column='allowsValidation', default=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'rrhh_perfil_competencia_detalle'


class RrhhColaborador(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    dni = models.CharField(max_length=191, unique=True)
    full_name = models.CharField(db_column='fullName', max_length=191)
    email = models.CharField(max_length=191, null=True, blank=True)
    personal_email = models.CharField(db_column='personalEmail', max_length=191, null=True, blank=True)
    birth_date = models.DateTimeField(db_column='birthDate', null=True, blank=True)
    corporate_phone = models.CharField(db_column='corporatePhone', max_length=191, null=True, blank=True)
    personal_phone = models.CharField(db_column='personalPhone', max_length=191, null=True, blank=True)
    address = models.CharField(max_length=191, null=True, blank=True)
    source_system = models.CharField(db_column='sourceSystem', max_length=191, default='MANUAL')
    source_updated_at = models.DateTimeField(db_column='sourceUpdatedAt', null=True, blank=True)
    hire_date = models.DateTimeField(db_column='hireDate', null=True, blank=True)
    termination_date = models.DateTimeField(db_column='terminationDate', null=True, blank=True)
    status = models.CharField(max_length=191, default='ACTIVE')  # ACTIVE / INACTIVE
    worker_category = models.CharField(db_column='workerCategory', max_length=191, default='PAYROLL')
    employer_name = models.CharField(db_column='employerName', max_length=191, null=True, blank=True)
    direct_manager_id = models.CharField(db_column='directManagerId', max_length=191, null=True, blank=True)
    area_id = models.CharField(db_column='areaId', max_length=191, null=True, blank=True)
    position_id = models.CharField(db_column='positionId', max_length=191, null=True, blank=True)
    profile_id = models.CharField(db_column='profileId', max_length=191, null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'rrhh_colaborador'
        verbose_name = 'Colaborador RRHH'
        verbose_name_plural = 'Colaboradores RRHH'

    def __str__(self):
        return f"{self.dni} - {self.full_name}"


class RrhhDocumentoColaborador(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    employee_id = models.CharField(db_column='employeeId', max_length=191)
    type = models.CharField(max_length=191)
    period = models.CharField(max_length=191, null=True, blank=True)
    title = models.CharField(max_length=191)
    original_name = models.CharField(db_column='originalName', max_length=191)
    storage_name = models.CharField(db_column='storageName', max_length=191)
    mime_type = models.CharField(db_column='mimeType', max_length=191)
    size_bytes = models.IntegerField(db_column='sizeBytes', null=True, blank=True)
    visible_to_employee = models.BooleanField(db_column='visibleToEmployee', default=True)
    uploaded_at = models.DateTimeField(db_column='uploadedAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'rrhh_documento_colaborador'


class RrhhProcesoSeleccion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    code = models.CharField(max_length=191, unique=True)
    title = models.CharField(max_length=191)
    status = models.CharField(max_length=191, default='OPEN')
    vacancy_count = models.IntegerField(db_column='vacancyCount', default=1)
    employment_type = models.CharField(db_column='employmentType', max_length=191, default='FULL_TIME')
    work_location = models.CharField(db_column='workLocation', max_length=191, null=True, blank=True)
    requested_at = models.DateTimeField(db_column='requestedAt', null=True, blank=True)
    target_hire_date = models.DateField(db_column='targetHireDate', null=True, blank=True)
    closed_at = models.DateTimeField(db_column='closedAt', null=True, blank=True)
    request_reason = models.CharField(db_column='requestReason', max_length=191, null=True, blank=True)
    requirements = models.TextField(null=True, blank=True)
    internal_promotion = models.BooleanField(db_column='internalPromotion', default=False)
    internal_candidate_id = models.CharField(db_column='internalCandidateId', max_length=191, null=True, blank=True)
    is_simulation = models.BooleanField(db_column='isSimulation', default=False)
    requesting_manager_id = models.CharField(db_column='requestingManagerId', max_length=191, null=True, blank=True)
    area_id = models.CharField(db_column='areaId', max_length=191, null=True, blank=True)
    position_id = models.CharField(db_column='positionId', max_length=191, null=True, blank=True)
    hired_employee_id = models.CharField(db_column='hiredEmployeeId', max_length=191, null=True, blank=True)
    created_by = models.CharField(db_column='createdBy', max_length=191, null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)
    mof_asset_id = models.CharField(db_column='mofAssetId', max_length=191, null=True, blank=True)
    monthly_salary = models.DecimalField(db_column='monthlySalary', max_digits=12, decimal_places=2, null=True, blank=True)
    salary_currency = models.CharField(db_column='salaryCurrency', max_length=191, default='PEN')
    compensation_notes = models.TextField(db_column='compensationNotes', null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'rrhh_proceso_seleccion'


class RrhhPostulante(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    process_id = models.CharField(db_column='processId', max_length=191)
    full_name = models.CharField(db_column='fullName', max_length=191)
    dni = models.CharField(max_length=191)
    email = models.CharField(max_length=191, null=True, blank=True)
    phone = models.CharField(max_length=191, null=True, blank=True)
    source = models.CharField(max_length=191, default='DIRECT')
    status = models.CharField(max_length=191, default='APPLIED')
    interview_at = models.DateTimeField(db_column='interviewAt', null=True, blank=True)
    interview_mode = models.CharField(db_column='interviewMode', max_length=191, null=True, blank=True)
    interview_score = models.DecimalField(db_column='interviewScore', max_digits=5, decimal_places=2, null=True, blank=True)
    evaluation_score = models.DecimalField(db_column='evaluationScore', max_digits=5, decimal_places=2, null=True, blank=True)
    interview_notes = models.TextField(db_column='interviewNotes', null=True, blank=True)
    offer_sent_at = models.DateTimeField(db_column='offerSentAt', null=True, blank=True)
    offer_responded_at = models.DateTimeField(db_column='offerRespondedAt', null=True, blank=True)
    offer_accepted = models.BooleanField(db_column='offerAccepted', null=True, blank=True)
    rejection_reason = models.CharField(db_column='rejectionReason', max_length=191, null=True, blank=True)
    emo_status = models.CharField(db_column='emoStatus', max_length=191, default='PENDING')
    emo_scheduled_at = models.DateTimeField(db_column='emoScheduledAt', null=True, blank=True)
    emo_evaluated_at = models.DateTimeField(db_column='emoEvaluatedAt', null=True, blank=True)
    emo_result = models.CharField(db_column='emoResult', max_length=191, null=True, blank=True)
    emo_clinic = models.CharField(db_column='emoClinic', max_length=191, null=True, blank=True)
    emo_notes = models.TextField(db_column='emoNotes', null=True, blank=True)
    emo_type = models.CharField(db_column='emoType', max_length=191, null=True, blank=True)
    emo_client = models.CharField(db_column='emoClient', max_length=191, null=True, blank=True)
    emo_project = models.CharField(db_column='emoProject', max_length=191, null=True, blank=True)
    emo_protocol = models.CharField(db_column='emoProtocol', max_length=191, null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'rrhh_postulante'


class RrhhTareaSeleccion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    process_id = models.CharField(db_column='processId', max_length=191)
    code = models.CharField(max_length=191)
    title = models.CharField(max_length=191)
    owner_area = models.CharField(db_column='ownerArea', max_length=191, default='RRHH')
    status = models.CharField(max_length=191, default='PENDING')
    required = models.BooleanField(default=True)
    due_at = models.DateTimeField(db_column='dueAt', null=True, blank=True)
    completed_at = models.DateTimeField(db_column='completedAt', null=True, blank=True)
    completed_by = models.CharField(db_column='completedBy', max_length=191, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    metadata = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'rrhh_tarea_seleccion'


class RrhhDocumentoSeleccion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    process_id = models.CharField(db_column='processId', max_length=191)
    candidate_id = models.CharField(db_column='candidateId', max_length=191, null=True, blank=True)
    type = models.CharField(max_length=191)
    title = models.CharField(max_length=191)
    original_name = models.CharField(db_column='originalName', max_length=191)
    storage_name = models.CharField(db_column='storageName', max_length=191)
    mime_type = models.CharField(db_column='mimeType', max_length=191)
    size_bytes = models.IntegerField(db_column='sizeBytes', null=True, blank=True)
    uploaded_by = models.CharField(db_column='uploadedBy', max_length=191, null=True, blank=True)
    uploaded_at = models.DateTimeField(db_column='uploadedAt', auto_now_add=True)
    sha256 = models.CharField(max_length=191, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'rrhh_documento_seleccion'


class RrhhAceptacionDocumento(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    document_id = models.CharField(db_column='documentId', max_length=191)
    candidate_id = models.CharField(db_column='candidateId', max_length=191, null=True, blank=True)
    employee_id = models.CharField(db_column='employeeId', max_length=191, null=True, blank=True)
    action = models.CharField(max_length=191, default='ACCEPT')
    signer_name = models.CharField(db_column='signerName', max_length=191)
    signer_dni = models.CharField(db_column='signerDni', max_length=191)
    status = models.CharField(max_length=191, default='ACCEPTED')
    document_sha256 = models.CharField(db_column='documentSha256', max_length=191, null=True, blank=True)
    accepted_at = models.DateTimeField(db_column='acceptedAt', auto_now_add=True)
    ip_address = models.CharField(db_column='ipAddress', max_length=191, null=True, blank=True)
    user_agent = models.CharField(db_column='userAgent', max_length=191, null=True, blank=True)
    evidence = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'rrhh_aceptacion_documento'


class RrhhRecursoOficial(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    code = models.CharField(max_length=191)
    version = models.CharField(max_length=191, default='1.0')
    category = models.CharField(max_length=191)
    title = models.CharField(max_length=191)
    original_name = models.CharField(db_column='originalName', max_length=191)
    storage_name = models.CharField(db_column='storageName', max_length=191)
    mime_type = models.CharField(db_column='mimeType', max_length=191)
    size_bytes = models.IntegerField(db_column='sizeBytes', null=True, blank=True)
    sha256 = models.CharField(max_length=191, null=True, blank=True)
    is_active = models.BooleanField(db_column='isActive', default=True)
    uploaded_by = models.CharField(db_column='uploadedBy', max_length=191, null=True, blank=True)
    uploaded_at = models.DateTimeField(db_column='uploadedAt', auto_now_add=True)
    position_id = models.CharField(db_column='positionId', max_length=191, null=True, blank=True)
    scope_name = models.CharField(db_column='scopeName', max_length=191, null=True, blank=True)
    analysis = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'rrhh_recurso_oficial'


class RrhhMofCargo(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    asset_id = models.CharField(db_column='assetId', max_length=191)
    position_id = models.CharField(db_column='positionId', max_length=191)
    profile_name = models.CharField(db_column='profileName', max_length=191, null=True, blank=True)
    page_start = models.IntegerField(db_column='pageStart', default=1)
    page_end = models.IntegerField(db_column='pageEnd', default=1)
    confidence = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'rrhh_mof_cargo'


class RrhhRemuneracion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    employee_id = models.CharField(db_column='employeeId', max_length=191)
    recruitment_process_id = models.CharField(db_column='recruitmentProcessId', max_length=191, null=True, blank=True)
    monthly_amount = models.DecimalField(db_column='monthlyAmount', max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=191, default='PEN')
    effective_from = models.DateTimeField(db_column='effectiveFrom')
    notes = models.TextField(null=True, blank=True)
    is_simulation = models.BooleanField(db_column='isSimulation', default=False)
    created_by = models.CharField(db_column='createdBy', max_length=191, null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'rrhh_remuneracion'


class RrhhLoteSincronizacion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    external_batch_id = models.CharField(db_column='externalBatchId', max_length=191, null=True, blank=True)
    source_system = models.CharField(db_column='sourceSystem', max_length=191, default='SIGECOM')
    status = models.CharField(max_length=191, default='PENDING')
    received_count = models.IntegerField(db_column='receivedCount', default=0)
    applied_count = models.IntegerField(db_column='appliedCount', default=0)
    error_count = models.IntegerField(db_column='errorCount', default=0)
    errors = models.TextField(null=True, blank=True)
    received_at = models.DateTimeField(db_column='receivedAt', auto_now_add=True)
    completed_at = models.DateTimeField(db_column='completedAt', null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'rrhh_lote_sincronizacion'


class RrhhRegistroSincronizacion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    batch_id = models.CharField(db_column='batchId', max_length=191)
    external_id = models.CharField(db_column='externalId', max_length=191)
    employee_id = models.CharField(db_column='employeeId', max_length=191, null=True, blank=True)
    operation = models.CharField(max_length=191)
    payload = models.TextField(null=True, blank=True)
    applied = models.BooleanField(default=False)
    error_message = models.TextField(db_column='errorMessage', null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'rrhh_registro_sincronizacion'

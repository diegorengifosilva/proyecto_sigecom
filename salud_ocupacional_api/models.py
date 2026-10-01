import uuid
from django.db import models


class EmoExpediente(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    code = models.CharField(max_length=191, unique=True)
    employee_id = models.CharField(db_column='employeeId', max_length=191)
    emo_type = models.CharField(db_column='emoType', max_length=191, default='PERIODICO')  # INGRESO / PERIODICO / RETIRO / REUBICACION
    status = models.CharField(max_length=191, default='SCHEDULED')  # SCHEDULED / EVALUATED / CLOSED / CANCELLED
    clinic = models.CharField(max_length=191, null=True, blank=True)
    protocol = models.CharField(max_length=191, null=True, blank=True)
    client = models.CharField(max_length=191, null=True, blank=True)
    project = models.CharField(max_length=191, null=True, blank=True)
    scheduled_at = models.DateTimeField(db_column='scheduledAt', null=True, blank=True)
    issued_at = models.DateTimeField(db_column='issuedAt', null=True, blank=True)
    expires_at = models.DateTimeField(db_column='expiresAt', null=True, blank=True)
    aptitude_result = models.CharField(db_column='aptitudeResult', max_length=191, null=True, blank=True)  # APTO / APTO_CON_RESTRICCION / NO_APTO / OBSERVADO
    operational_restrictions = models.TextField(db_column='operationalRestrictions', null=True, blank=True)
    brigade_restrictions_compatible = models.BooleanField(db_column='brigadeRestrictionsCompatible', default=True)
    clinical_observations = models.TextField(db_column='clinicalObservations', null=True, blank=True)
    doctor_name = models.CharField(db_column='doctorName', max_length=191, null=True, blank=True)
    is_simulation = models.BooleanField(db_column='isSimulation', default=False)
    source_system = models.CharField(db_column='sourceSystem', max_length=191, default='MANUAL')
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'emo_expediente'
        verbose_name = 'Expediente EMO'
        verbose_name_plural = 'Expedientes EMO'


class EmoDocumentoMedico(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    employee_id = models.CharField(db_column='employeeId', max_length=191)
    occupational_emo_case_id = models.CharField(db_column='occupationalEmoCaseId', max_length=191, null=True, blank=True)
    type = models.CharField(max_length=191, default='CERTIFICADO_APTITUD')
    classification = models.CharField(max_length=191, default='CONFIDENCIAL')
    status = models.CharField(max_length=191, default='VALID')
    version = models.IntegerField(default=1)
    original_name = models.CharField(db_column='originalName', max_length=191)
    storage_name = models.CharField(db_column='storageName', max_length=191)
    storage_area = models.CharField(db_column='storageArea', max_length=191, default='HEALTH')
    mime_type = models.CharField(db_column='mimeType', max_length=191, default='application/pdf')
    size_bytes = models.BigIntegerField(db_column='sizeBytes', null=True, blank=True)
    sha256 = models.CharField(max_length=191, null=True, blank=True)
    issued_at = models.DateTimeField(db_column='issuedAt', null=True, blank=True)
    expires_at = models.DateTimeField(db_column='expiresAt', null=True, blank=True)
    clinic = models.CharField(max_length=191, null=True, blank=True)
    observation = models.TextField(null=True, blank=True)
    visible_to_employee = models.BooleanField(db_column='visibleToEmployee', default=True)
    previous_version_id = models.CharField(db_column='previousVersionId', max_length=191, null=True, blank=True)
    uploaded_by_account_id = models.CharField(db_column='uploadedByAccountId', max_length=191, null=True, blank=True)
    validated_by_account_id = models.CharField(db_column='validatedByAccountId', max_length=191, null=True, blank=True)
    validated_at = models.DateTimeField(db_column='validatedAt', null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'emo_documento_medico'
        verbose_name = 'Documento Médico EMO'


class EmoArchivoDrive(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    drive_file_id = models.CharField(db_column='driveFileId', max_length=191)
    sync_run_id = models.CharField(db_column='syncRunId', max_length=191)
    employee_id = models.CharField(db_column='employeeId', max_length=191, null=True, blank=True)
    occupational_emo_case_id = models.CharField(db_column='occupationalEmoCaseId', max_length=191, null=True, blank=True)
    name = models.CharField(max_length=191)
    mime_type = models.CharField(db_column='mimeType', max_length=191)
    relative_path = models.CharField(db_column='relativePath', max_length=191, null=True, blank=True)
    work_unit = models.CharField(db_column='workUnit', max_length=191, null=True, blank=True)
    size_bytes = models.BigIntegerField(db_column='sizeBytes', null=True, blank=True)
    md5_checksum = models.CharField(db_column='md5Checksum', max_length=191, null=True, blank=True)
    drive_modified_at = models.DateTimeField(db_column='driveModifiedAt', null=True, blank=True)
    storage_name = models.CharField(db_column='storageName', max_length=191, null=True, blank=True)
    status = models.CharField(max_length=191, default='DISCOVERED')  # DISCOVERED / DOWNLOADED / LINKED / EXCEPTION
    match_method = models.CharField(db_column='matchMethod', max_length=191, null=True, blank=True)
    exception_reason = models.TextField(db_column='exceptionReason', null=True, blank=True)
    source_web_view_url = models.CharField(db_column='sourceWebViewUrl', max_length=191, null=True, blank=True)
    downloaded_at = models.DateTimeField(db_column='downloadedAt', null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'emo_archivo_drive'


class EmoSincronizacionDrive(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    root_folder_id = models.CharField(db_column='rootFolderId', max_length=191)
    mode = models.CharField(max_length=191, default='AUTO')
    status = models.CharField(max_length=191, default='IN_PROGRESS')  # IN_PROGRESS / COMPLETED / FAILED
    discovered = models.IntegerField(default=0)
    downloaded = models.IntegerField(default=0)
    unchanged = models.IntegerField(default=0)
    linked = models.IntegerField(default=0)
    exceptions = models.IntegerField(default=0)
    bytes_processed = models.BigIntegerField(db_column='bytesProcessed', default=0)
    requested_by = models.CharField(db_column='requestedBy', max_length=191, null=True, blank=True)
    error_message = models.TextField(db_column='errorMessage', null=True, blank=True)
    started_at = models.DateTimeField(db_column='startedAt', auto_now_add=True)
    completed_at = models.DateTimeField(db_column='completedAt', null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'emo_sincronizacion_drive'


class EmoRegistroColeccion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    collection = models.CharField(max_length=191)  # clinics, protocols, clients, etc.
    data = models.TextField()  # JSON data
    is_demo = models.BooleanField(db_column='isDemo', default=False)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'emo_registro_coleccion'

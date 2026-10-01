import uuid
from django.db import models


class ProyProyectoOrigen(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    code = models.CharField(max_length=191, unique=True)
    normalized_code = models.CharField(db_column='normalizedCode', max_length=191, null=True, blank=True)
    name = models.CharField(max_length=191)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=191, default='ACTIVE')
    source_system = models.CharField(db_column='sourceSystem', max_length=191, default='SIGECOM')
    commercial_opening_id = models.BigIntegerField(db_column='commercialOpeningId', default=1)
    commercial_quotation_id = models.BigIntegerField(db_column='commercialQuotationId', default=1)
    commercial_opportunity_id = models.BigIntegerField(db_column='commercialOpportunityId', null=True, blank=True)
    commercial_client_id = models.BigIntegerField(db_column='commercialClientId', default=1)
    client_name = models.CharField(db_column='clientName', max_length=191, null=True, blank=True)
    client_ruc = models.CharField(db_column='clientRuc', max_length=191, null=True, blank=True)
    purchase_order_number = models.CharField(db_column='purchaseOrderNumber', max_length=191, null=True, blank=True)
    order_date = models.DateField(db_column='orderDate', null=True, blank=True)
    delivery_date = models.DateField(db_column='deliveryDate', null=True, blank=True)
    currency = models.CharField(max_length=191, default='PEN')
    order_total = models.DecimalField(db_column='orderTotal', max_digits=15, decimal_places=2, null=True, blank=True)
    approved_budget = models.DecimalField(db_column='approvedBudget', max_digits=15, decimal_places=2, null=True, blank=True)
    legacy_project_id = models.IntegerField(db_column='legacyProjectId', null=True, blank=True)
    source_payload = models.TextField(db_column='sourcePayload', null=True, blank=True)
    source_updated_at = models.DateTimeField(db_column='sourceUpdatedAt', null=True, blank=True)
    last_synced_at = models.DateTimeField(db_column='lastSyncedAt', auto_now=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'proy_proyecto_origen'
        verbose_name = 'Proyecto de Origen Comercial'


class IntEjecucion(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    external_run_id = models.CharField(db_column='externalRunId', max_length=191, null=True, blank=True)
    source_system = models.CharField(db_column='sourceSystem', max_length=191, default='SIGECOM')
    mode = models.CharField(max_length=191, default='AUTO')
    status = models.CharField(max_length=191, default='SUCCESS')  # SUCCESS / FAILED / PARTIAL
    target_modules = models.JSONField(db_column='targetModules', default=list)
    received_count = models.IntegerField(db_column='receivedCount', default=0)
    applied_count = models.IntegerField(db_column='appliedCount', default=0)
    warning_count = models.IntegerField(db_column='warningCount', default=0)
    error_count = models.IntegerField(db_column='errorCount', default=0)
    summary = models.JSONField(null=True, blank=True)
    started_at = models.DateTimeField(db_column='startedAt', auto_now_add=True)
    completed_at = models.DateTimeField(db_column='completedAt', null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'int_ejecucion'
        verbose_name = 'Ejecución de Integración'


class IntEnlaceEntidad(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    run_id = models.CharField(db_column='runId', max_length=191, null=True, blank=True)
    source_system = models.CharField(db_column='sourceSystem', max_length=191, default='SIGECOM')
    source_entity = models.CharField(db_column='sourceEntity', max_length=191)  # cotizacion / apertura / usuario / empleado
    source_external_id = models.CharField(db_column='sourceExternalId', max_length=191)
    canonical_entity = models.CharField(db_column='canonicalEntity', max_length=191)  # Proyecto / Colaborador
    canonical_id = models.CharField(db_column='canonicalId', max_length=191)
    target_module = models.CharField(db_column='targetModule', max_length=191)  # PROJECT_MANAGEMENT / HUMAN_RESOURCES
    target_entity_id = models.CharField(db_column='targetEntityId', max_length=191)
    payload_hash = models.CharField(db_column='payloadHash', max_length=191, null=True, blank=True)
    active = models.BooleanField(default=True)
    metadata = models.JSONField(null=True, blank=True)
    synced_at = models.DateTimeField(db_column='syncedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'int_enlace_entidad'
        verbose_name = 'Enlace de Entidad Sincronizada'


class IntIncidencia(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    run_id = models.CharField(db_column='runId', max_length=191, null=True, blank=True)
    severity = models.CharField(max_length=191, default='WARNING')  # INFO / WARNING / ERROR
    code = models.CharField(max_length=191)
    source_entity = models.CharField(db_column='sourceEntity', max_length=191, null=True, blank=True)
    source_external_id = models.CharField(db_column='sourceExternalId', max_length=191, null=True, blank=True)
    message = models.CharField(max_length=191)
    details = models.JSONField(null=True, blank=True)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'int_incidencia'
        verbose_name = 'Incidencia de Integración'


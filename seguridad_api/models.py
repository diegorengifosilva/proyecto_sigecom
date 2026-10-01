import uuid
from django.db import models


class SegUsuario(models.Model):
    ROLE_CHOICES = [
        ('SYSTEM_ADMIN', 'Super Administrador'),
        ('ADMIN', 'Administrador'),
        ('HSEQ_ADMIN', 'Administrador HSEQ'),
        ('HSEQ_AUDITOR', 'Auditor HSEQ'),
        ('HSEQ_SUPERVISOR', 'Supervisor HSEQ'),
        ('HR_ADMIN', 'Administrador RRHH'),
        ('USER', 'Usuario Estándar'),
        ('EMPLOYEE', 'Colaborador / Empleado'),
    ]

    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    username = models.CharField(max_length=191, unique=True)
    password_hash = models.CharField(db_column='passwordHash', max_length=191)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='USER')
    is_active = models.BooleanField(db_column='isActive', default=True)
    token_version = models.IntegerField(db_column='tokenVersion', default=1)
    last_login_at = models.DateTimeField(db_column='lastLoginAt', null=True, blank=True)
    must_change_password = models.BooleanField(db_column='mustChangePassword', default=False)
    employee_id = models.CharField(db_column='employeeId', max_length=191, null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'seg_usuario'
        verbose_name = 'Usuario de Seguridad'

    def __str__(self):
        return f"{self.username} ({self.role})"


class SegModulo(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    code = models.CharField(max_length=191, unique=True)
    name = models.CharField(max_length=191)
    description = models.CharField(max_length=191, null=True, blank=True)
    admin_route = models.CharField(db_column='adminRoute', max_length=191, null=True, blank=True)
    user_route = models.CharField(db_column='userRoute', max_length=191, null=True, blank=True)
    icon = models.CharField(max_length=191, null=True, blank=True)
    is_active = models.BooleanField(db_column='isActive', default=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'seg_modulo'
        verbose_name = 'Módulo Corporativo'

    def __str__(self):
        return f"{self.code} - {self.name}"


class SegUsuarioModulo(models.Model):
    LEVEL_CHOICES = [
        ('USER', 'Usuario'),
        ('ADMIN', 'Administrador'),
    ]

    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    account_id = models.CharField(db_column='accountId', max_length=191)
    module_id = models.CharField(db_column='moduleId', max_length=191)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='USER')
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updatedAt', auto_now=True)

    class Meta:
        managed = False
        db_table = 'seg_usuario_modulo'
        unique_together = (('account_id', 'module_id'),)


class SegAuditoria(models.Model):
    id = models.CharField(primary_key=True, max_length=191, default=uuid.uuid4)
    actor_id = models.CharField(db_column='actorId', max_length=191, null=True, blank=True)
    actor_role = models.CharField(db_column='actorRole', max_length=191, null=True, blank=True)
    action = models.CharField(max_length=191)  # CREATE / UPDATE / DELETE / LOGIN / SYNC
    entity_type = models.CharField(db_column='entityType', max_length=191, null=True, blank=True)
    entity_id = models.CharField(db_column='entityId', max_length=191, null=True, blank=True)
    request_id = models.CharField(db_column='requestId', max_length=191, null=True, blank=True)
    ip_address = models.CharField(db_column='ipAddress', max_length=191, null=True, blank=True)
    metadata = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt', auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'seg_auditoria'
        verbose_name = 'Registro de Auditoría'

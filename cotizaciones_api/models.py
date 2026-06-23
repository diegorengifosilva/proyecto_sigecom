from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from simple_history.models import HistoricalRecords
from django.contrib.auth.hashers import check_password, make_password
import datetime
from core.models import Representante

#========================================================================================

#========================================================================================

##============================##
## APROBACIÓN DE COTIZACIONES ##
##============================##
class DashboardCotizacion(models.Model):
    # ── DATOS PRINCIPALES ─────────────────────────────
    numero = models.CharField(max_length=70, db_column="cotin", blank=True, null=True)
    fecha = models.DateField(db_column="cotif", db_index=True, default=timezone.now)
    referencia = models.CharField(max_length=150, blank=True, null=True, db_column="refer")
    num_reg = models.AutoField(primary_key=True, db_column="num_reg")

    # ── CLIENTE ─────────────────────────────
    cliente_codigo = models.CharField(max_length=5, blank=True, null=True, db_column="empre")
    nombr = models.CharField(max_length=70, blank=True, null=True, db_column="nombr")
    cargr = models.CharField(max_length=70, blank=True, null=True, db_column="cargr")
    codir = models.CharField(max_length=5, blank=True, null=True, db_column="codir")
    teler = models.CharField(max_length=50, blank=True, null=True, db_column="teler")
    movir = models.CharField(max_length=50, blank=True, null=True, db_column="movir")
    mailr = models.CharField(max_length=50, blank=True, null=True, db_column="mailr")

    prob = models.CharField(max_length=1, blank=True, null=True, db_column="prob")
    cotit = models.CharField(max_length=1, blank=True, null=True, db_column="cotit")
    tven = models.CharField(max_length=1, blank=True, null=True, db_column="tven")

    # ── ÁREA ─────────────────────────────
    area_codigo = models.CharField(max_length=1, blank=True, null=True, db_column="area")

    # ── ESTADO ─────────────────────────────
    estado_codigo = models.CharField(max_length=1, blank=True, null=True, db_column="estad")

    # ── ENVÍO ─────────────────────────────
    envio = models.IntegerField(blank=True, null=True, db_column="envio", default="0")

    # ── IMPORTE ─────────────────────────────
    tot_c = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, db_column="tot_c")

    # ── PAGO / ENTREGA / MONEDA ─────────────
    fpago = models.CharField(max_length=50, blank=True, null=True, db_column="fpago")
    lugar = models.CharField(max_length=100, blank=True, null=True, db_column="lugar")
    entrp = models.IntegerField(blank=True, null=True, db_column="entrp")
    entrf = models.CharField(max_length=50, blank=True, null=True, db_column="entrf")
    tmone = models.CharField(max_length=20, blank=True, null=True, db_column="tmone")
    tcamb = models.DecimalField(max_digits=7, decimal_places=3, blank=True, null=True)
    igv = models.CharField(max_length=1, blank=True, null=True, db_column="igv")

    # ── ENTREGA SUMINISTROS ─────────────
    plazo = models.IntegerField(blank=True, null=True, db_column="plazo")      # antes era CharField, DB es int(3)
    tot_d = models.CharField(max_length=1, blank=True, null=True, db_column="tot_d")  # varchar(1)

    # ── ENTREGA SERVICIOS ─────────────
    por_c = models.IntegerField(blank=True, null=True, db_column="por_c")      # int(3)
    tot_s = models.CharField(max_length=1, blank=True, null=True, db_column="tot_s")  # varchar(1)

    # ── VALIDEZ OFERTA ─────────────
    valid = models.IntegerField(blank=True, null=True, db_column="valid")      # int(3)
    acu_s = models.CharField(max_length=1, blank=True, null=True, db_column="acu_s")  # varchar(1)

    # ── CONTACTOS ─────────────────────────────
    # Comercial
    codic = models.CharField(max_length=8, blank=True, null=True, db_column="codic")
    nombc = models.CharField(max_length=150, blank=True, null=True, db_column="nombc")
    telec = models.CharField(max_length=20, blank=True, null=True, db_column="telec")
    mov1c = models.CharField(max_length=20, blank=True, null=True, db_column="mov1c")
    mov2c = models.CharField(max_length=20, blank=True, null=True, db_column="mov2c")
    mov3c = models.CharField(max_length=20, blank=True, null=True, db_column="mov3c")
    mailc = models.CharField(max_length=100, blank=True, null=True, db_column="mailc")

    # Técnico
    codit = models.CharField(max_length=8, blank=True, null=True, db_column="codit")
    nombt = models.CharField(max_length=150, blank=True, null=True, db_column="nombt")
    telet = models.CharField(max_length=20, blank=True, null=True, db_column="telet")
    mov1t = models.CharField(max_length=20, blank=True, null=True, db_column="mov1t")
    mov2t = models.CharField(max_length=20, blank=True, null=True, db_column="mov2t")
    mov3t = models.CharField(max_length=20, blank=True, null=True, db_column="mov3t")
    mailt = models.CharField(max_length=100, blank=True, null=True, db_column="mailt")

    # ── ADICIONALES ─────────────────────────────
    acu_e = models.TextField(blank=True, null=True)
    sald = models.DecimalField(max_digits=11, decimal_places=2, blank=True, null=True, db_column="sald")
    anno = models.CharField(max_length=4, blank=True, null=True, db_column="anno")
    mes = models.CharField(max_length=2, blank=True, null=True, db_column="mes")
    regus = models.CharField(max_length=200, blank=True, null=True, db_column="regus")

    # ── DESCUENTOS ─────────────────────────────
    des_a = models.CharField(max_length=1, blank=True, null=True, db_column="des_a")
    des_t = models.CharField(max_length=1, blank=True, null=True, db_column="des_t")
    des_m = models.DecimalField(max_digits=11, decimal_places=2, blank=True, null=True, db_column="des_m")
    des_p = models.DecimalField(max_digits=11, decimal_places=2, blank=True, null=True, db_column="des_p")

    anno = models.CharField(max_length=4, blank=True, null=True, db_column="anno")
    mes = models.CharField(max_length=2, blank=True, null=True, db_column="mes")
    anno_a = models.CharField(max_length=4, blank=True, null=True, db_column="anno_a", default="2026")

    # ── PROPIEDADES DERIVADAS ─────────────────────────────
    @property
    def cliente_nombre(self):
        try:
            from cotizaciones_api.models import Cliente
            if not self.id_cliente:
                return self.nombr or "Sin Cliente"
            
            cliente = Cliente.objects.filter(codigo=self.id_cliente).first()
            if cliente:
                return cliente.nombre
            return self.nombr or ""
            
        except Exception:
            return self.nombr or ""

    @property
    def prob_nombre(self):
        mapping = {"0": "Baja", "1": "Media", "2": "Alta", "3": "Muy Alta"}
        return mapping.get(self.prob, "")

    @property
    def tipo_nombre(self):
        mapping = {"P": "Proyecto", "S": "Servicio", "V": "Venta"}
        return mapping.get(self.cotit, "")

    @property
    def area_nombre(self):
        mapping = {"1": "Industria", "2": "Mineria", "3": "Mantenimiento",
                   "4": "Petroquimica", "8": "Seguridad de Maquinaria"}
        return mapping.get(self.area_codigo, "")

    @property
    def estado_nombre(self):
        mapping = {"1": "Adjudicado", "2": "Pendiente", "3": "Perdida", "4": "Anulado",
                   "5": "Postergada", "6": "En Seguimiento"}
        return mapping.get(self.estado_codigo, "")

    @property
    def moneda_nombre(self):
        mapping = {"S": "Soles", "D": "Dólares"}
        return mapping.get(self.tmone, "")

    @property
    def unidad_suministro_nombre(self):
        mapping = {"D": "Dias", "S": "Semanas", "M": "Meses"}
        return mapping.get(self.tot_d, "")

    @property
    def unidad_servicio_nombre(self):
        mapping = {"D": "Dias", "S": "Semanas", "M": "Meses"}
        return mapping.get(self.tot_s, "")

    @property
    def unidad_validez_nombre(self):
        mapping = {"D": "Dias", "S": "Semanas", "M": "Meses"}
        return mapping.get(self.acu_s, "")

    @property
    def igv_nombre(self):
        mapping = {
            "S": "Incluye",
            "N": "No Incluye",
        }
        return mapping.get(self.igv, "")

    class Meta:
        managed = False
        db_table = "vc_mov_cotizaciones"
        verbose_name = "Cotización Dashboard"
        verbose_name_plural = "Cotizaciones Dashboard"
        ordering = ["-fecha", "-numero", ]

    def __str__(self):
        return f"Cotización #{self.numero} | {self.cliente_nombre} | {self.estado_nombre}"

class CotiSuministros(models.Model):
    num_reg = models.IntegerField(blank=True, null=True)
    cog = models.CharField(max_length=5, blank=True, null=True)
    nog = models.CharField(max_length=200, blank=True, null=True)
    nig = models.IntegerField(blank=True, null=True)
    num = models.IntegerField(primary_key=True)
    cod = models.CharField(max_length=60, blank=True, null=True)
    des = models.CharField(max_length=5000, blank=True, null=True)
    pro = models.CharField(max_length=50, blank=True, null=True)
    can = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    puc = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    toc = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    env_tot = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True) # Costo Envio Total
    env_par = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True) # Costo Envío por Item
    cost_env = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True) # Costo Envío
    por_env = models.DecimalField(max_digits=12, decimal_places=4, blank=True, null=True) # % Envío (4 decimales para precisión)
    cost_c_env = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True) # Costo Con Envío
    cau = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tou = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    val = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tot = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    mov = models.CharField(max_length=2, blank=True, null=True)
    tpr = models.CharField(max_length=2, blank=True, null=True)
    tde = models.CharField(max_length=50, blank=True, null=True)
    tog = models.CharField(max_length=1, blank=True, null=True)

    ent = models.IntegerField(blank=True, null=True)        # Tiempo (Número)
    enu = models.CharField(max_length=1, blank=True, null=True) # Unidad (D, S, M)
    obs = models.CharField(max_length=5000, blank=True, null=True) # Observación

    class Meta:
        db_table = 'vc_mov_cotizaciones_su'
        managed = False 

    def __str__(self):
        return f"Registro {self.num_reg} - Código {self.cod}"

class CotiServicios(models.Model):
    num_reg = models.IntegerField(blank=True, null=True)
    cog = models.CharField(max_length=5, blank=True, null=True)
    nog = models.CharField(max_length=200, blank=True, null=True)
    nig = models.IntegerField(blank=True, null=True)

    # Mantenemos num como PK igual que suministros
    num = models.IntegerField(primary_key=True)

    cod = models.CharField(max_length=60, blank=True, null=True)
    des = models.CharField(max_length=100, blank=True, null=True)
    pro = models.CharField(max_length=50, blank=True, null=True)

    can = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    puc = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    toc = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    cau = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tou = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    val = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tot = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    mov = models.CharField(max_length=2, blank=True, null=True)
    tpr = models.CharField(max_length=1, blank=True, null=True)

    # En servicios tde es DECIMAL según la BD real
    tde = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    # tog es longtext → TextField
    tog = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'vc_mov_cotizaciones_mo'
        managed = False

    def __str__(self):
        return f"Servicio {self.num_reg} - Código {self.cod}"

class CotiMensajes(models.Model):
    id_mensaje = models.AutoField(primary_key=True)
    num_reg = models.CharField(max_length=70)
    dat = models.DateTimeField(blank=True, null=True)
    cod = models.CharField(max_length=20)
    msj = models.CharField(max_length=500)
    tipo = models.CharField(max_length=1, default="N")   # N, L, C, M
    alerta = models.CharField(max_length=1, default="N") # S, N
    alerta_fecha = models.DateTimeField(null=True, blank=True) # La agenda exacta
    alerta_completada = models.DateTimeField(blank=True)    # Para el check de la notificación
    act = models.CharField(max_length=1, default="1")    # 1: Pendiente, 2: Completado

    class Meta:
        db_table = "vc_mov_cotizaciones_msj"
        ordering = ["-dat"]
        managed = False 

    def __str__(self):
        return f"{self.num_reg} - {self.cod} ({self.tipo})"
    
class CotiSeguimiento(models.Model):
    dat = models.DateTimeField(primary_key=True)
    num_reg = models.IntegerField()
    num = models.IntegerField()
    fec = models.CharField(max_length=25)  # 🔥 CAMBIO CLAVE
    hor = models.CharField(max_length=10)
    des = models.CharField(max_length=700)
    cod = models.CharField(max_length=30)
    act = models.CharField(max_length=1, default="1")

    class Meta:
        db_table = "vc_mov_cotizaciones_vi"
        managed = False
        ordering = ["-dat"]

    def __str__(self):
        return f"{self.num_reg} - {self.cod}"

class CotizacionAdjunto(models.Model):
    # 'id' se crea automáticamente como AutoField en Django
    id_registro = models.IntegerField()
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    usuario = models.CharField(max_length=100)
    ruta = models.CharField(max_length=500)

    class Meta:
        db_table = 'cotizaciones_adjuntos'
        managed = False  # Al haber creado la tabla manualmente en SQLyog

#========================================================================================

##===============##
## OPORTUNIDADES ##
##===============##
class DashboardOportunidad(models.Model):
    # ── IDENTIFICACIÓN ──────────────────────────
    num_reg = models.AutoField(primary_key=True, db_column="num_reg")
    num_reg_cot = models.IntegerField(db_column="num_reg_cot", blank=True, null=True)
    numero = models.CharField(max_length=70, db_column="cotin", blank=True, null=True) 
    fecha = models.DateField(db_column="cotif", blank=True, null=True)
    referencia = models.CharField(max_length=150, db_column="refer", blank=True, null=True)

    # ── SEGUIMIENTO (El núcleo) ──────────────────
    f_recp = models.DateField(db_column="f_recp", default=timezone.now)
    f_limite = models.DateField(db_column="f_limite", blank=True, null=True)
    f_emi = models.DateField(db_column="f_emi", blank=True, null=True)
    estado_op = models.IntegerField(db_column="estado_op", default=0)
    coment = models.TextField(db_column="coment", blank=True, null=True)
    
    # ── CLASIFICACIÓN Y ESTADO COMERCIAL ──────────
    prob = models.CharField(max_length=1, db_column="prob", blank=True, null=True)
    cotit = models.CharField(max_length=1, db_column="cotit", blank=True, null=True) # P/S/V
    tven = models.CharField(max_length=1, db_column="tven", blank=True, null=True)
    area_codigo = models.CharField(max_length=1, db_column="area", blank=True, null=True)
    estado_codigo = models.CharField(max_length=1, db_column="estad", blank=True, null=True) # Estado de coti (1-6)
    envio = models.IntegerField(db_column="envio", default=0)

    # ── CLIENTE Y CONTACTO ────────────────────────
    empre = models.CharField(max_length=10, db_column="empre", blank=True, null=True)
    nombr = models.CharField(max_length=150, db_column="nombr", blank=True, null=True)
    cargr = models.CharField(max_length=70, db_column="cargr", blank=True, null=True)
    codir = models.CharField(max_length=5, db_column="codir", blank=True, null=True)
    teler = models.CharField(max_length=50, db_column="teler", blank=True, null=True)
    movir = models.CharField(max_length=50, db_column="movir", blank=True, null=True)
    mailr = models.CharField(max_length=50, db_column="mailr", blank=True, null=True)

    # ── PAGO / MONEDA / TOTALES ──────────────────
    tot_c = models.DecimalField(max_digits=12, decimal_places=2, db_column="tot_c", blank=True, null=True)
    fpago = models.CharField(max_length=50, db_column="fpago", blank=True, null=True)
    lugar = models.CharField(max_length=100, db_column="lugar", blank=True, null=True)
    tmone = models.CharField(max_length=20, db_column="tmone", blank=True, null=True)
    tcamb = models.DecimalField(max_digits=7, decimal_places=3, db_column="tcamb", blank=True, null=True)
    igv = models.CharField(max_length=1, db_column="igv", blank=True, null=True)

    # ── TIEMPOS DE ENTREGA Y VALIDEZ ─────────────
    plazo = models.IntegerField(db_column="plazo", blank=True, null=True)
    tot_d = models.CharField(max_length=1, db_column="tot_d", blank=True, null=True)
    por_c = models.IntegerField(db_column="por_c", blank=True, null=True)
    tot_s = models.CharField(max_length=1, db_column="tot_s", blank=True, null=True)
    valid = models.IntegerField(db_column="valid", blank=True, null=True)
    acu_s = models.CharField(max_length=1, db_column="acu_s", blank=True, null=True)

    # ── RESPONSABLES (Comercial y Técnico) ────────
    codic = models.CharField(max_length=8, db_column="codic", blank=True, null=True)
    nombc = models.CharField(max_length=150, db_column="nombc", blank=True, null=True)
    codit = models.CharField(max_length=8, db_column="codit", blank=True, null=True)
    nombt = models.CharField(max_length=150, db_column="nombt", blank=True, null=True)

    # ── DESCUENTOS Y ADICIONALES ─────────────────
    des_a = models.CharField(max_length=1, db_column="des_a", blank=True, null=True)
    des_t = models.CharField(max_length=1, db_column="des_t", blank=True, null=True)
    des_m = models.DecimalField(max_digits=11, decimal_places=2, db_column="des_m", blank=True, null=True)
    des_p = models.DecimalField(max_digits=11, decimal_places=2, db_column="des_p", blank=True, null=True)
    acu_e = models.TextField(db_column="acu_e", blank=True, null=True)

    # ── METADATOS ───────────────────────────────
    regus = models.CharField(max_length=200, db_column="regus", blank=True, null=True)
    anno = models.CharField(max_length=4, db_column="anno", blank=True, null=True)
    mes = models.CharField(max_length=2, db_column="mes", blank=True, null=True)
    anno_a = models.CharField(max_length=4, db_column="anno_a", default="2026")

    # ── PROPIEDADES (Para Dashboard y Selects) ──
    @property
    def area_nombre(self):
        mapping = {"1": "Industria", "2": "Mineria", "3": "Mantenimiento", "4": "Petroquimica", "8": "Seguridad de Maquinaria"}
        return mapping.get(self.area, "")

    @property
    def estado_nombre(self):
        # 0: Pendiente, 1: No Cotizado, 2: Rechazado, 3: Cotizado
        mapping = {0: "PENDIENTE", 1: "NO COTIZADO", 2: "RECHAZADO", 3: "COTIZADO"}
        return mapping.get(self.estado_op, "PENDIENTE")

    @property
    def prob_nombre(self):
        mapping = {"0": "Baja", "1": "Media", "2": "Alta", "3": "Muy Alta"}
        return mapping.get(self.prob, "")

    @property
    def igv_nombre(self):
        return "Incluye" if self.igv == "S" else "No Incluye"

    class Meta:
        managed = False 
        db_table = "vc_mov_oportunidades"

#========================================================================================

##================##
## NOTIFICACIONES ##
##================##
class Notificacion(models.Model):

    TIPO_CHOICES = (
        ("urgente", "Urgente"),
        ("atencion", "Atención"),
        ("informativo", "Informativo"),
    )

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notificaciones"
    )

    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)

    titulo = models.CharField(max_length=255)
    descripcion = models.TextField()

    cantidad = models.IntegerField(default=0)

    leido = models.BooleanField(default=False)

    fecha = models.DateTimeField(auto_now_add=True)

    # Para futuro ML
    metadata = models.JSONField(blank=True, null=True)

    class Meta:
        ordering = ["-fecha"]

#========================================================================================

##================##
## DATOS DE BD_VC ##
##================##
  
# vc_tab_estado
class vc_tab_estado(models.Model):
    codigo = models.CharField(max_length=5, primary_key=True)
    nombre = models.CharField(max_length=100)
    cot = models.CharField(max_length=1)
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "vc_tab_estado"

    def __str__(self):
        return self.nombre

# vc_tab_tipo
class vc_tab_tipo(models.Model):
    codigo = models.CharField(max_length=10, primary_key=True, verbose_name="Código")
    nombre = models.CharField(max_length=100, verbose_name="Nombre")
    activo = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        db_table = 'vc_tab_tipo'
        verbose_name = 'Tipo'
        verbose_name_plural = 'Tipos'

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

# vc_mov_cotizaciones
class vc_mov_cotizaciones(models.Model):
    # Datos principales
    num_reg = models.IntegerField(blank=True, null=True)
    anno = models.IntegerField(default=timezone.now().year)
    mes = models.IntegerField(blank=True, null=True)
    cotin = models.IntegerField(primary_key=True)
    cotit = models.CharField(max_length=50, blank=True, null=True)
    cotif = models.DateField(blank=True, null=True)
    refer = models.CharField(max_length=150, blank=True, null=True)
    empre = models.CharField(max_length=20, blank=True, null=True)
    codir = models.CharField(max_length=10, blank=True, null=True)
    nombr = models.CharField(max_length=150, blank=True, null=True)
    cargr = models.CharField(max_length=50, blank=True, null=True)
    teler = models.CharField(max_length=20, blank=True, null=True)
    movir = models.CharField(max_length=20, blank=True, null=True)
    mailr = models.CharField(max_length=100, blank=True, null=True)
    
    # Contacto Comercial
    codic = models.CharField(max_length=10, blank=True, null=True)
    nombc = models.CharField(max_length=150, blank=True, null=True)
    telec = models.CharField(max_length=20, blank=True, null=True)
    mov1c = models.CharField(max_length=20, blank=True, null=True)
    mov2c = models.CharField(max_length=20, blank=True, null=True)
    mov3c = models.CharField(max_length=20, blank=True, null=True)
    mailc = models.CharField(max_length=100, blank=True, null=True)
    
    # Contacto Técnico
    codit = models.CharField(max_length=10, blank=True, null=True)
    nombt = models.CharField(max_length=150, blank=True, null=True)
    telet = models.CharField(max_length=20, blank=True, null=True)
    mov1t = models.CharField(max_length=20, blank=True, null=True)
    mov2t = models.CharField(max_length=20, blank=True, null=True)
    mov3t = models.CharField(max_length=20, blank=True, null=True)
    mailt = models.CharField(max_length=100, blank=True, null=True)

    # Pago / Entrega / Moneda
    fpago = models.CharField(max_length=50, blank=True, null=True)
    lugar = models.CharField(max_length=100, blank=True, null=True)
    plazo = models.CharField(max_length=50, blank=True, null=True)
    tmone = models.CharField(max_length=20, blank=True, null=True)
    igv = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    valid = models.IntegerField(blank=True, null=True)
    
    # Otros
    por_c = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    acu_e = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    acu_s = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tot_c = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tot_d = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    tot_s = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    estad = models.CharField(max_length=5, blank=True, null=True)
    ocomn = models.CharField(max_length=50, blank=True, null=True)
    ocomf = models.CharField(max_length=50, blank=True, null=True)
    area = models.CharField(max_length=10, blank=True, null=True)
    entrp = models.IntegerField(blank=True, null=True)
    entrf = models.CharField(max_length=50, blank=True, null=True)
    regus = models.CharField(max_length=50, blank=True, null=True)
    fecus = models.DateField(blank=True, null=True)
    envio = models.CharField(max_length=50, blank=True, null=True)
    tcamb = models.DecimalField(max_digits=10, decimal_places=3, blank=True, null=True)
    sald = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    des_a = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    des_t = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    des_m = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    des_p = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    anno_a = models.IntegerField(blank=True, null=True)
    msj = models.CharField(max_length=255, blank=True, null=True)
    seg = models.CharField(max_length=50, blank=True, null=True)
    prob = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "vc_mov_cotizaciones"
        ordering = ["-cotif"]

    # ─── Propiedades derivadas ───────────────────────
    @property
    def cliente_nombre(self):
        try:
            from cotizaciones_api.models import Representante
            if not self.empre:
                return self.nombr or ""
            cliente = Representante.objects.get(codigo=self.empre)
            return cliente.representante or self.nombr or ""
        except Representante.DoesNotExist:
            return self.nombr or ""
        except Exception:
            return self.nombr or ""
    
    @property
    def area_nombre(self):
        try:
            from cotizaciones_api.models import Area
            if not self.area:
                return ""
            area_obj = Area.objects.get(id_area=self.area)
            return area_obj.nombre
        except Exception:
            return ""

    @property
    def estado_nombre(self):
        try:
            from cotizaciones_api.models import vc_tab_estado
            if not self.estad:
                return ""
            estado_obj = vc_tab_estado.objects.get(codigo=self.estad)
            return estado_obj.nombre
        except Exception:
            return ""

    @property
    def tipo_nombre(self):
        """
        Devuelve el nombre del tipo (Servicio / Proyecto / Venta)
        según el código cotit y la tabla vc_tab_tipo.
        """
        try:
            from cotizaciones_api.models import vc_tab_tipo
            if not self.cotit:
                return ""
            tipo_obj = vc_tab_tipo.objects.get(codigo=self.cotit)
            return tipo_obj.nombre
        except vc_tab_tipo.DoesNotExist:
            return ""
        except Exception:
            return ""

    @property
    def mes(self):
        if self.cotif:
            return self.cotif.month
        return None

# vc_tab_tproveedor
class vc_tab_tproveedor(models.Model):
    codigo = models.CharField(max_length=2, primary_key=True)
    nombre = models.CharField(max_length=50, blank=True, null=True)
    activo = models.CharField(max_length=1, blank=True, null=True)

    class Meta:
        db_table = "vc_tab_tproveedor"
        managed = False

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

# vc_tab_categorias
class vc_tab_categorias(models.Model):
    codigo = models.CharField("Código", max_length=4, primary_key=True)
    nombre = models.CharField("Nombre", max_length=70, blank=True, null=True)
    cos_min = models.DecimalField("Costo Min", max_digits=10, decimal_places=2)
    cos_max = models.DecimalField("Costo Max", max_digits=10, decimal_places=2)
    cod_area = models.CharField("Código Área", max_length=1, blank=True, null=True)
    activo = models.CharField("Activo", max_length=1) 

    class Meta:
        db_table = "vc_tab_categorias"
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
    
# vc_tab_tgastos
class vc_tab_tgastos(models.Model):
    codigo = models.CharField("Código", max_length=2, primary_key=True)
    nombre = models.CharField("Nombre", max_length=50, blank=True, null=True)
    activo = models.CharField("Activo", max_length=1) 
    concepto = models.CharField("Concepto", max_length=1) 

    class Meta:
        db_table = "vc_tab_tgastos"
        verbose_name = "Tipo Gasto"
        verbose_name_plural = "Tipo Gasto"

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

# vc_tab_tgastos_d
class vc_tab_tgastos_d(models.Model):
    codigo = models.CharField("Código", max_length=5, primary_key=True)
    nombre = models.CharField("Nombre", max_length=100, blank=True, null=True)
    unimed = models.CharField("Unimed", max_length=5, blank=True, null=True)
    importe = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    cod_tipo = models.CharField("Cod_Tipo", max_length=2, blank=True, null=True)
    activo = models.CharField("Activo", max_length=1) 
    cantidad = models.IntegerField(max_length=10) 

    class Meta:
        db_table = "vc_tab_tgastos_d"
        verbose_name = "Tipo Gasto D"
        verbose_name_plural = "Tipo Gasto D"

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

# cont_cias
class cont_cias(models.Model):
    cod = models.CharField(primary_key=True, max_length=10)  # clave primaria real (ej. "001")
    anno = models.IntegerField(default=timezone.now().year)

    class Meta:
        db_table = "cont_cias"
        managed = False

# vc_tab_rittal
class vc_tab_rittal(models.Model):
    codigo = models.CharField(max_length=10, primary_key=True)  # Código del cliente o registro
    nombre = models.CharField(max_length=100, blank=True, null=True)
    grupo = models.CharField(max_length=5, blank=True, null=True)
    um = models.CharField(max_length=10, blank=True, null=True)
    descripcion = models.CharField(max_length=100, blank=True, null=True)
    precio_s = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    precio_d = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    cantidad = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    ocodigo = models.CharField(max_length=15, blank=True, null=True)
    stock_min = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    stock_max = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    descuento = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    proveedor = models.CharField(max_length=70, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo

    class Meta:
        managed = False
        db_table = "vc_tab_rittal"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.nombre})"

# vc_tab_rockwell
class vc_tab_rockwell(models.Model):
    codigo = models.CharField(max_length=60, primary_key=True)  # Código del cliente o registro
    codigo2 = models.CharField(max_length=60, blank=True, null=True)
    descripcion = models.CharField(max_length=100, blank=True, null=True)
    ds = models.CharField(max_length=2, blank=True, null=True)
    pgc = models.CharField(max_length=3, blank=True, null=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    proveedor = models.CharField(max_length=20, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo
    cprimario = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    x = models.CharField(max_length=1, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "vc_tab_rockwell"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.codigo2})"

# vc_tab_ceyesa
class vc_tab_ceyesa(models.Model):
    codigo = models.CharField(max_length=60, primary_key=True)  # Código del cliente o registro
    codigo2 = models.CharField(max_length=60, blank=True, null=True)
    descripcion = models.CharField(max_length=150, blank=True, null=True)
    ds = models.CharField(max_length=2, blank=True, null=True)
    pgc = models.CharField(max_length=3, blank=True, null=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    proveedor = models.CharField(max_length=20, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo
    cprimario = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "vc_tab_ceyesa"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.codigo2})"

# vc_tab_hoffman
class vc_tab_hoffman(models.Model):
    codigo = models.CharField(max_length=10, primary_key=True)  # Código del cliente o registro
    nombre = models.CharField(max_length=100, blank=True, null=True)
    grupo = models.CharField(max_length=5, blank=True, null=True)
    um = models.CharField(max_length=10, blank=True, null=True)
    descripcion = models.CharField(max_length=100, blank=True, null=True)
    precio_s = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    precio_d = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    cantidad = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    ocodigo = models.CharField(max_length=15, blank=True, null=True)
    stock_min = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    stock_max = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    descuento = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    proveedor = models.CharField(max_length=70, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo

    class Meta:
        managed = False
        db_table = "vc_tab_hoffman"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.nombre})"

# alm_articulos
class alm_articulos(models.Model):
    codigo = models.CharField(max_length=30, primary_key=True)  # Código del cliente o registro
    nombre = models.CharField(max_length=200, blank=True, null=True)
    grupo = models.CharField(max_length=5, blank=True, null=True)
    um = models.CharField(max_length=10, blank=True, null=True)
    descripcion = models.CharField(max_length=100, blank=True, null=True)
    precio_s = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    precio_d = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    cantidad = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    ocodigo = models.CharField(max_length=15, blank=True, null=True)
    stock_min = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    stock_max = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    descuento = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    proveedor = models.CharField(max_length=70, blank=True, null=True)
    activo = models.BooleanField(default=True)  # Indicador de activo/inactivo

    class Meta:
        managed = False
        db_table = "alm_articulos"
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.nombre})"

class ObjetivoAnual(models.Model):
    anno = models.IntegerField(unique=True)
    encargado = models.CharField(max_length=150, blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "objetivo_anual"

    def __str__(self):
        return f"Objetivo {self.anno}"

class ObjetivoAnualArea(models.Model):
    objetivo = models.ForeignKey(
        ObjetivoAnual,
        related_name="areas",
        on_delete=models.CASCADE
    )

    area = models.CharField(max_length=50)
    minimo = models.DecimalField(max_digits=15, decimal_places=2)
    maximo = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = "objetivo_anual_area"
        unique_together = ("objetivo", "area")

    def __str__(self):
        return f"{self.area} - {self.objetivo.anno}"
    objetivo = models.ForeignKey(
        ObjetivoAnual,
        related_name="areas",
        on_delete=models.CASCADE
    )

    area = models.CharField(max_length=50)
    minimo = models.DecimalField(max_digits=15, decimal_places=2)
    maximo = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = "objetivo_anual_area"
        unique_together = ("objetivo", "area")

    def __str__(self):
        return f"{self.area} - {self.objetivo.anno}"

# vc_tab_notas
class vc_tab_notas(models.Model):
    codigo = models.CharField(max_length=2, primary_key=True)
    nombre = models.TextField(blank=True, null=True) # Usamos TextField porque en la imagen es tipo 'text'
    activo = models.CharField(max_length=1, default="S") # 'S' para Activo, 'N' para Inactivo según varchar(1)

    class Meta:
        managed = False
        db_table = "vc_tab_notas"

    def __str__(self):
        return self.nombre if self.nombre else f"Nota {self.codigo}"

    def get_nombre(self):
        return self.nombre if self.nombre else ""

# vc_mov_orden
class vc_mov_orden(models.Model):
    # --- IDENTIFICACIÓN PRINCIPAL ---
    num = models.CharField(max_length=10, primary_key=True) # Nro de Orden / Cotización
    fec = models.DateField(default=timezone.now)           # Fecha de Emisión
    tip = models.CharField(max_length=2, blank=True, null=True) # Tipo de Movimiento

    # --- DATOS DEL CLIENTE ---
    codcli = models.CharField(max_length=5)                 # Código de Cliente
    nomcli = models.CharField(max_length=150, blank=True, null=True) # Nombre/Razón Social
    ruccli = models.CharField(max_length=20, blank=True, null=True) # RUC Cliente
    dircli = models.CharField(max_length=200, blank=True, null=True) # Dirección

    # --- DETALLES Y COMENTARIOS ---
    det = models.TextField(blank=True, null=True)           # Glosa / Detalle General
    obs = models.TextField(blank=True, null=True)           # Observaciones adicionales
    
    # --- VALORES MONETARIOS ---
    mon = models.CharField(max_length=3, default='S/.')     # Moneda (S/. o US$)
    tc  = models.DecimalField(max_digits=10, decimal_places=3, default=0.000) # Tipo de Cambio
    imp = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)  # Importe (Subtotal)
    igv = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)  # IGV
    tot = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)  # Total Final (Venta)
    
    # --- ESTADOS Y CONTROL ---
    est = models.CharField(max_length=2) # Estado (Ej: '01' Pendiente, '05' Cerrado, '00' Anulado)
    con = models.CharField(max_length=2, blank=True, null=True) # Condición de Pago
    
    # --- ASIGNACIÓN Y VENDEDORES ---
    usu = models.CharField(max_length=20, blank=True, null=True) # Usuario/Vendedor asignado
    are = models.CharField(max_length=20, blank=True, null=True) # Área que genera la orden
    
    # --- FECHAS DE SEGUIMIENTO ---
    freg = models.DateTimeField(auto_now_add=True) # Fecha de registro en sistema
    fent = models.DateField(blank=True, null=True) # Fecha de entrega/cierre pactada
    
    # --- CAMPOS DINÁMICOS / EXTRAS (Siguiendo tu patrón o1, o2...) ---
    o1 = models.CharField(max_length=100, blank=True, null=True)
    o2 = models.CharField(max_length=100, blank=True, null=True)
    o3 = models.CharField(max_length=100, blank=True, null=True)
    o4 = models.CharField(max_length=100, blank=True, null=True)
    o5 = models.CharField(max_length=100, blank=True, null=True)
    o6 = models.CharField(max_length=100, blank=True, null=True)
    o7 = models.CharField(max_length=100, blank=True, null=True)
    o8 = models.CharField(max_length=100, blank=True, null=True)

    # --- CAMPOS NUMÉRICOS DE APOYO ---
    n1 = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    n2 = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    # --- DATOS PARA GRAFICO ---
    otot = models.DecimalField(max_digits=11, decimal_places=2, default=0.00)
    ofec = models.DateField(blank=True, null=True)
    cotin = models.CharField(max_length=70, blank=True, null=True)
    anno_a = models.CharField(max_length=4, blank=True, null=True, db_column="anno_a", default="2026")
    oesta = models.CharField(max_length=1, blank=True, null=True)

    class Meta:
        managed = False  # Importante: No modifica la tabla real de la DB
        db_table = "vc_mov_orden"
        ordering = ["-fec", "-num"]

    def __str__(self):
        return f"{self.num} | {self.nomcli} | {self.tot}"

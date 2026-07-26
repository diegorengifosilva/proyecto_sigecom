# logistica_api/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
import uuid
from .models import (
    DashboardCotizacion,
    CotiSuministros,
    CotiServicios,
    CotiMensajes,
    CotiSeguimiento,
    vc_tab_clientes,
    vc_tab_clientes_d,
    vc_tab_estado,
    vc_tab_categorias,
    vc_tab_tproveedor,
    vc_mov_cotizaciones,
    vc_tab_tgastos,
    vc_tab_tgastos_d,
    vc_tab_rittal,
    vc_tab_rockwell,
    vc_tab_ceyesa,
    vc_tab_hoffman,
    alm_articulos,
    sis_alm_tab_almacen,
    cont_cias,
    sis_alm_tab_grupo,
    sis_alm_tab_articulos,
    AlmTabUmed,
    sis_alm_tab_ccosto,
    AlmacenNew,
    Grupo,
    DocumentoAlmacen,
    CostoAlmacen,
)
from django.contrib.auth import get_user_model
from django.utils.timezone import localtime
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from decimal import Decimal
from datetime import timezone

User = get_user_model()

#========================================================================================

from .models import VcMovOrdenSoli

class OrdenOCSerializer(serializers.ModelSerializer):
    codigo  = serializers.CharField(source='den')
    cliente = serializers.CharField(source='luo')
    moneda  = serializers.CharField(source='tmo')  # ✅
    tcambio = serializers.DecimalField(source='tc', max_digits=7, decimal_places=3)
    monto_soles   = serializers.DecimalField(source='mos', max_digits=15, decimal_places=2)
    monto_dolares = serializers.DecimalField(source='mou', max_digits=11, decimal_places=2)

    class Meta:
        model = VcMovOrdenSoli
        fields = [
            'reg',
            'codigo',
            'cliente',
            'moneda',
            'tcambio',
            'monto_soles',
            'monto_dolares',
        ]


# Token Perzonalizado para login
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Reemplazamos el identificador por usuario
        token['user_id'] = user.usuario

        # Agregamos datos útiles al token
        token['nombre'] = user.nombre_completo or ''
        token['area'] = user.area or ''
        token['cargo'] = user.cargo or ''
        token['banco'] = user.ban or ''
        token['cuenta'] = user.banc or ''

        return token

#========================================================================================

##================##
## DATOS DE BD_VC ##
##================##
# vc_tab_estado
class EstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_estado
        fields = "__all__"

class ProveedoresSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_tproveedor
        fields = "__all__"

# vc_mov_cotizaciones
class CotizacionesSerializer(serializers.ModelSerializer):
    # Campos derivados para mostrar nombres legibles
    cliente_nombre = serializers.SerializerMethodField()
    area_nombre = serializers.SerializerMethodField()
    estado_nombre = serializers.SerializerMethodField()

    # Exponer IDs de FK si quieres (aunque en vc_mov_cotizaciones son strings)
    cliente_id = serializers.SerializerMethodField()
    area_id = serializers.SerializerMethodField()
    estado_id = serializers.SerializerMethodField()

    class Meta:
        model = vc_mov_cotizaciones
        fields = [
            "cotif",
            "cotin",
            "refer",
            "empre",
            "nombr",
            "area",
            "estad",
            "tot_c",
            "cliente_id",
            "cliente_nombre",
            "area_id",
            "area_nombre",
            "estado_id",
            "estado_nombre",
        ]

    # --------------------------
    # Métodos para campos legibles
    # --------------------------
    def get_cliente_nombre(self, obj):
        return obj.get_cliente_nombre()

    def get_area_nombre(self, obj):
        return obj.get_area_nombre()

    def get_estado_nombre(self, obj):
        return obj.get_estado_nombre()

    # --------------------------
    # Métodos para exponer los "IDs" de las relaciones
    # --------------------------
    def get_cliente_id(self, obj):
        return obj.empre

    def get_area_id(self, obj):
        return obj.area

    def get_estado_id(self, obj):
        return obj.estad

# vc_tab_categorias
class CategoriasSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_categorias
        fields = "__all__"

# vc_tab_tgastos
class TGastosSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_tgastos
        fields = "__all__"

# vc_tab_tgastos_d
class TGastosDSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_tgastos_d
        fields = "__all__"

# vc_tab_rittal
class RittalSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_rittal
        fields = "__all__"

# vc_tab_rockwell
class RockwellSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_rockwell
        fields = "__all__"

# vc_tab_ceyesa
class CeyesaSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_ceyesa
        fields = "__all__"

# vc_tab_hoffman
class HoffmanSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_hoffman
        fields = "__all__"

# alm_articulos
class AlmArticulosSerializer(serializers.ModelSerializer):
    class Meta:
        model = alm_articulos
        fields = "__all__"

# cont_cias
class ContCiasSerializer(serializers.ModelSerializer):
    class Meta:
        model = cont_cias
        fields = "__all__"

# sis_alm_tab_almacen
class AlmacenSerializer(serializers.ModelSerializer):
    class Meta:
        model = sis_alm_tab_almacen
        fields = "__all__"


class AlmacenNewSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlmacenNew
        fields = ["idalmacen", "nombre", "direccion", "activo", "usuario_id_usuario"]

# AlmTabUmed
class AlmTabUmedSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlmTabUmed
        fields = "__all__"

# sis_alm_tab_grupo
class GrupoAnaliticoSerializer(serializers.ModelSerializer):
    class Meta:
        model = sis_alm_tab_grupo
        fields = "__all__"

# sis_alm_tab_articulos
class ArticuloSerializer(serializers.ModelSerializer):
    # Opcional: podrías incluir nombres de grupo y um si lo deseas
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Limpiar valores null o strings vacíos si es necesario
        return representation

    class Meta:
        model = sis_alm_tab_articulos
        fields = "__all__"

# sis_alm_tab_ccosto
class CcostoSerializer(serializers.ModelSerializer):
    class Meta:
        model = sis_alm_tab_ccosto
        fields = "__all__"

# --- Missing serializers restored ---
class DashboardCotizacionSerializer(serializers.ModelSerializer):
    # ── Campos derivados (SOLO LECTURA) ─────────────────
    cliente_nombre = serializers.CharField(source="nombr", required=False, allow_blank=True)
    cargo = serializers.CharField(source="cargr", required=False, allow_blank=True)
    codir = serializers.CharField(required=False, allow_blank=True)
    area_nombre = serializers.SerializerMethodField(read_only=True)
    estado_nombre = serializers.SerializerMethodField(read_only=True)
    tipo_nombre = serializers.SerializerMethodField(read_only=True)
    prob_nombre = serializers.SerializerMethodField(read_only=True)
    moneda_nombre = serializers.SerializerMethodField(read_only=True)
    unidad_suministro_nombre = serializers.SerializerMethodField(read_only=True)
    unidad_servicio_nombre = serializers.SerializerMethodField(read_only=True)
    unidad_validez_nombre = serializers.SerializerMethodField(read_only=True)
    igv_nombre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DashboardCotizacion
        fields = "__all__"
        read_only_fields = [
            "numero",
            "num_reg",
            "envio",
            "tot_c",
        ]

    # ── Métodos derivados ───────────────────────────────
    def get_area_nombre(self, obj):
        return obj.area_nombre or ""

    def get_estado_nombre(self, obj):
        return obj.estado_nombre or ""

    def get_tipo_nombre(self, obj):
        return obj.tipo_nombre or ""

    def get_prob_nombre(self, obj):
        return obj.prob_nombre or ""

    def get_moneda_nombre(self, obj):
        return obj.moneda_nombre or ""

    def get_unidad_suministro_nombre(self, obj):
        return obj.unidad_suministro_nombre or ""

    def get_unidad_servicio_nombre(self, obj):
        return obj.unidad_servicio_nombre or ""

    def get_unidad_validez_nombre(self, obj):
        return obj.unidad_validez_nombre or ""

    def validate_igv(self, value):
        if value not in ["N", "S"]:
            return "N"
        return value

    def get_igv_nombre(self, obj):
        return obj.igv_nombre or ""

class DashboardCotizacionTablaSerializer(serializers.ModelSerializer):
    numero = serializers.SerializerMethodField()  # <-- aquí

    class Meta:
        model = DashboardCotizacion
        fields = [
            "fecha",         # Fecha
            "numero",        # Cotización
            "referencia",    # Referencia
            "cliente_nombre",# Cliente/Representante
            "area_nombre",   # Área
            "estado_nombre", # Estado
            "tot_c",         # Importe
            "envio",
            "prob",
            "num_reg",
            "nombt",
            "cliente_codigo",
            "nombr",
            "tmone",
            "cotit",
            "regus",
            "des_m",
        ]

    def get_numero(self, obj):
        # Si el número está vacío o nulo, devuelve una cadena vacía
        return obj.numero if obj.numero not in [None, ""] else ""

class DashboardCotizacionModalSerializer(serializers.ModelSerializer):
    # Campos derivados
    cliente_nombre = serializers.SerializerMethodField()
    cargo = serializers.SerializerMethodField()
    area_nombre = serializers.SerializerMethodField()
    estado_nombre = serializers.SerializerMethodField()
    tipo_nombre = serializers.SerializerMethodField()

    # Campos numéricos saneados
    tot_c = serializers.SerializerMethodField()
    igv = serializers.SerializerMethodField()
    valid = serializers.SerializerMethodField()

    class Meta:
        model = DashboardCotizacion
        fields = [
            # Campos normales
            "numero",
            "fecha",
            "referencia",
            "num_reg",
            "cliente_codigo",
            "nombr",
            "teler",
            "movir",
            "mailr",
            "prob",
            "tot_c",
            "cotit",
            "area_codigo",
            "fpago",
            "estado_codigo",
            "envio",
            "lugar",

            "plazo",
            "tot_d",
            "por_c",
            "tot_s",
            "valid",
            "acu_s",

            "acu_e",
            "entrf",
            "tmone",
            "tcamb",
            "igv",
            "nombc",
            "telec",
            "mov1c",
            "mov2c",
            "mov3c",
            "mailc",
            "nombt",
            "telet",
            "mov1t",
            "mov2t",
            "mov3t",
            "mailt",

            "des_a",
            "des_t",
            "des_m",
            "des_p",

            # Campos derivados
            "cliente_nombre",
            "cargo",
            "area_nombre",
            "estado_nombre",
            "tipo_nombre",  # <-- agregado
            "igv_nombre"
        ]
        read_only_fields = fields

    # ---------- Métodos derivados ----------
    def get_cliente_nombre(self, obj):
        return obj.cliente_nombre or ""

    def get_cargo(self, obj):
        try:
            if not obj.cliente_codigo:
                return obj.cargr or ""
            from logistica_api.models import vc_tab_clientes_d
            cliente = vc_tab_clientes_d.objects.get(codigo=obj.cliente_codigo)
            return cliente.cargo or obj.cargr or ""
        except Exception:
            return obj.cargr or ""

    def get_area_nombre(self, obj):
        return obj.area_nombre or ""

    def get_estado_nombre(self, obj):
        return obj.estado_nombre or ""

    def get_tipo_nombre(self, obj):
        try:
            return obj.tipo_nombre or ""
        except Exception:
            return ""

    def get_igv_nombre(self, obj):
        return obj.igv_nombre or ""
    
    # ---------- Saneamiento de decimales ----------
    def get_tot_c(self, obj):
        try:
            if obj.tot_c in [None, "", " "]:
                return 0
            return float(obj.tot_c)
        except Exception:
            return 0

    def get_igv(self, obj):
        try:
            if obj.igv in [None, "", " "]:
                return 0
            return float(obj.igv)
        except Exception:
            return 0

    def get_valid(self, obj):
        try:
            if obj.valid in [None, "", " "]:
                return 0
            return int(obj.valid)
        except Exception:
            return 0

class CotiSuministrosSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotiSuministros
        fields = "__all__"

class CotiServiciosSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotiServicios
        fields = "__all__"

class CotiMensajesSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotiMensajes
        fields = "__all__"

class CotiSeguimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotiSeguimiento
        fields = "__all__"

#========================================================================================

##================##
## DATOS DE BD_VC ##
##================##

# vc_tab_clientes
class ClientesSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_clientes
        fields = "__all__"


class GrupoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grupo
        fields = "__all__"


class DocumentoAlmacenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoAlmacen
        fields = "__all__"


class CostoAlmacenSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostoAlmacen
        fields = "__all__"


# vc_tab_estado

# cotizaciones_api/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
import uuid
from .models import (
    DashboardCotizacion,
    DashboardOportunidad,
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
    cont_cias,
    CotiSuministros,
    CotiServicios,
    CotiMensajes,
    CotiSeguimiento,
    ObjetivoAnual,
    ObjetivoAnualArea, 
    Notificacion,
    vc_tab_notas,
    vc_mov_orden,
)
from django.contrib.auth import get_user_model
from django.utils.timezone import localtime
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from decimal import Decimal
from datetime import timezone

User = get_user_model()

#========================================================================================

##============================##
## APROBACIÓN DE COTIZACIONES ##
##============================##
class DashboardCotizacionSerializer(serializers.ModelSerializer):
    # ── Campos derivados (SOLO LECTURA) ─────────────────
    cliente_nombre = serializers.CharField(required=False, allow_blank=True)
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
            "tven",
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
            from cotizaciones_api.models import Representante
            cliente = Representante.objects.get(codigo=obj.cliente_codigo)
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
        read_only_fields = ['num']

class CotiServiciosSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotiServicios
        fields = "__all__"
        read_only_fields = ['num']

class CotiMensajesSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotiMensajes
        fields = "__all__"

class CotiSeguimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotiSeguimiento
        fields = "__all__"

class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = "__all__"

#========================================================================================

##=============##
## OPORTUNIDAD ##
##=============##
class DashboardOportunidadTablaSerializer(serializers.ModelSerializer):
    # Usamos los nombres de las @property del modelo
    cliente_nombre = serializers.ReadOnlyField()
    area_nombre = serializers.ReadOnlyField()
    estado_nombre = serializers.ReadOnlyField() # Cambiado de estado_op_nombre a estado_nombre
    tipo_nombre = serializers.ReadOnlyField()

    class Meta:
        model = DashboardOportunidad
        fields = [
            "num_reg",
            "num_reg_cot",     # Para mostrar el número de cotización relacionado
            "f_recp",
            "numero",          # Antes era "numero"
            "referencia",          # Antes era "referencia"
            "cliente_nombre", 
            "area_nombre",
            "estado_nombre",
            "nombc",          # Responsable Comercial
            "cotit",          # Tipo V/S/P
            "tipo_nombre",
            "coment",
            "nombr",
            "teler",
        ]
        
class DashboardOportunidadSerializer(serializers.ModelSerializer):
    # ── CAMPOS DE LECTURA (Properties del modelo) ──
    cliente_nombre = serializers.ReadOnlyField()
    area_nombre = serializers.ReadOnlyField()
    estado_nombre = serializers.ReadOnlyField()
    tipo_nombre = serializers.ReadOnlyField()
    prob_nombre = serializers.ReadOnlyField() # Agregado para el Dashboard

    class Meta:
        model = DashboardOportunidad
        fields = "__all__"
        # 🚩 NOTA: Quitamos num_reg de read_only si queremos que el serializer 
        # lo reconozca en el get_or_create, pero lo ideal es manejarlo 
        # como está abajo para proteger la auditoría.
        read_only_fields = ["anno", "mes", "anno_a"]

    def validate(self, data):
        date_fields = ["f_recp", "f_limite", "f_emi", "fecha"]

        for field in date_fields:
            value = data.get(field)

            if isinstance(value, str) and "T" in value:
                data[field] = value.split("T")[0]

            if value == "":
                data[field] = None

        return data

    def to_representation(self, instance):
        """Limpia nulos para React y formatea decimales"""
        data = super().to_representation(instance)
        for field in data:
            if data[field] is None:
                # Mantenemos 0 para campos numéricos y "" para texto
                if field in ['tot_c', 'tcamb', 'des_m', 'des_p', 'plazo', 'valid']:
                    data[field] = 0
                else:
                    data[field] = ""
        return data

    def validate_prob(self, value):
        """Validación robusta de probabilidad"""
        if value not in ["0", "1", "2", "3"]:
            return "0"
        return value

    def validate_igv(self, value):
        """Normaliza el IGV a S o N"""
        if value in ["S", "N"]:
            return value
        return "S" if value is True else "N"

#========================================================================================

##================##
## DATOS DE BD_VC ##
##================##     

# vc_tab_estado
class EstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_estado
        fields = "__all__"

# vc_tab_tproveedor
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

class ObjetivoAnualAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjetivoAnualArea
        fields = ["area", "minimo", "maximo"]

class ObjetivoAnualSerializer(serializers.ModelSerializer):
    areas = ObjetivoAnualAreaSerializer(many=True)

    class Meta:
        model = ObjetivoAnual
        fields = ["id", "anno", "activo", "areas"]

    def create(self, validated_data):
        areas_data = validated_data.pop("areas")

        objetivo = ObjetivoAnual.objects.create(**validated_data)

        for area in areas_data:
            ObjetivoAnualArea.objects.create(
                objetivo=objetivo,
                **area
            )

        return objetivo

    def update(self, instance, validated_data):
        areas_data = validated_data.pop("areas", None)

        instance.anno = validated_data.get("anno", instance.anno)
        instance.activo = validated_data.get("activo", instance.activo)
        instance.save()

        if areas_data:
            for area in areas_data:
                ObjetivoAnualArea.objects.update_or_create(
                    objetivo=instance,
                    area=area["area"],
                    defaults={
                        "minimo": area["minimo"],
                        "maximo": area["maximo"]
                    }
                )

        return instance
    
# vc_tab_notas
class NotasSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_tab_notas
        fields = "__all__"

# vc_mov_orden
class OrdenSerializer(serializers.ModelSerializer):
    class Meta:
        model = vc_mov_orden
        fields = "__all__"

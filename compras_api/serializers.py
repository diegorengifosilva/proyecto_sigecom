from rest_framework import serializers
from .models import SolicitudOrdenCompra, SolicitudPasajes
from caja_chica_api.models import Solicitud as CajaChicaSolicitud

# 1. SERIALIZADOR DE ÓRDENES DE COMPRA
class SolicitudOrdenCompraSerializer(serializers.ModelSerializer):
    id_registro = serializers.SerializerMethodField()
    area = serializers.SerializerMethodField()
    regus = serializers.SerializerMethodField()
    fecha = serializers.SerializerMethodField()
    
    # Aliases para compatibilidad con el frontend
    nro_solicitud = serializers.CharField(source="codigo", read_only=True, default="")
    nombre = serializers.CharField(source="empresa", read_only=True, default="")
    monto_usd = serializers.SerializerMethodField()
    monto_pen = serializers.SerializerMethodField()
    estado_nombre = serializers.CharField(source="id_estado.nombre", read_only=True, default="")
    tipo = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudOrdenCompra
        fields = [
            'id_solicitud',
            'id_registro',
            'nivel_grupo',
            'codigo',
            'nro_solicitud',
            'num',
            'fecha',
            'id_area',
            'area',
            'id_solicitante',
            'regus',
            'referencia',
            'numero_orden',
            'tipo',
            'tiempo_entrega',
            'tipo_moneda',
            'monto_soles',
            'tipo_cambio',
            'monto_dolares',
            'monto_usd',
            'monto_pen',
            'concepto',
            'fecha_orden',
            'direccion',
            'id_estado',
            'estado_nombre',
            'empresa',
            'nombre',
            'contacto',
            'fecha_salida',
            'entrega_lugar',
            'tipo_movimiento',
            'tipo_gasto',
        ]

    def get_id_registro(self, obj):
        return f"compra_{obj.id_registro or obj.id_solicitud}"

    def get_area(self, obj):
        return obj.id_area.nombre if obj.id_area else ""

    def get_regus(self, obj):
        return obj.id_solicitante.usuario if obj.id_solicitante else ""

    def get_fecha(self, obj):
        val = obj.fecha or obj.fecha_orden
        if not val:
            return None
        return val.strftime("%Y-%m-%d")

    def get_tipo(self, obj):
        val = (obj.tipo or "Suministro").strip()
        if val.upper() in ('S', 'SERVICIO'):
            return "Servicio"
        return "Suministro"

    def get_monto_usd(self, obj):
        if obj.tipo_moneda in ('D', 'd', 'USD', 'usd'):
            return float(obj.monto_dolares or 0.00)
        return 0.00

    def get_monto_pen(self, obj):
        if obj.tipo_moneda in ('S', 's', 'PEN', 'pen'):
            return float(obj.monto_soles or 0.00)
        return 0.00


# 2. SERIALIZADOR DE PASAJES (TRAVEL REQUESTS)
class SolicitudPasajesSerializer(serializers.ModelSerializer):
    id_registro = serializers.SerializerMethodField()
    area = serializers.SerializerMethodField()
    regus = serializers.SerializerMethodField()
    fecha = serializers.SerializerMethodField()
    
    # Aliases para compatibilidad con el frontend
    nro_solicitud = serializers.CharField(source="cog", read_only=True, default="")
    codigo = serializers.CharField(read_only=True, default="")
    nombre = serializers.CharField(source="empresa", read_only=True, default="")
    monto_usd = serializers.SerializerMethodField()
    monto_pen = serializers.SerializerMethodField()
    estado_nombre = serializers.CharField(source="id_estado.nombre", read_only=True, default="")
    tipo = serializers.SerializerMethodField()
    referencia = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudPasajes
        fields = [
            'id_pasaje',
            'id_registro',
            'nivel_grupo',
            'cog',
            'codigo',
            'nro_solicitud',
            'num',
            'fecha',
            'id_area',
            'area',
            'id_solicitante',
            'regus',
            'referencia',
            'tipo',
            'tipo_moneda',
            'monto_soles',
            'tipo_cambio',
            'monto_dolares',
            'monto_usd',
            'monto_pen',
            'concepto',
            'transporte',
            'id_estado',
            'estado_nombre',
            'lugar_origen',
            'lugar_destino',
            'fecha_salida',
            'fecha_retorno',
            'tipo_movimiento',
            'tipo_gasto',
            'empresa',
            'nombre',
        ]

    def get_id_registro(self, obj):
        return f"pasaje_{obj.id_registro or obj.id_pasaje}"

    def get_area(self, obj):
        return obj.id_area.nombre if obj.id_area else ""

    def get_regus(self, obj):
        return obj.id_solicitante.usuario if obj.id_solicitante else ""

    def get_fecha(self, obj):
        val = obj.fecha or obj.fecha_salida
        if not val:
            return None
        return val.strftime("%Y-%m-%d")

    def get_referencia(self, obj):
        origen = (obj.lugar_origen or "").strip()
        destino = (obj.lugar_destino or "").strip()
        return f"Viaje: {origen} a {destino}".upper()

    def get_tipo(self, obj):
        transp_map = {"A": "Aéreo", "T": "Terrestre"}
        transp_name = transp_map.get(obj.transporte, obj.transporte or "Pasajes")
        return f"Pasajes ({transp_name})"

    def get_monto_usd(self, obj):
        if obj.tipo_moneda in ('D', 'd', 'USD', 'usd'):
            return float(obj.monto_dolares or 0.00)
        return 0.00

    def get_monto_pen(self, obj):
        if obj.tipo_moneda in ('S', 's', 'PEN', 'pen'):
            return float(obj.monto_soles or 0.00)
        return 0.00


# 3. SERIALIZADOR DE CAJA CHICA (DUMMY/PRE-EXISTING CAJA CHICA SOLICITUD)
class CajaChicaSolicitudSerializer(serializers.ModelSerializer):
    id_registro = serializers.SerializerMethodField()
    nro_solicitud = serializers.CharField(source="numero_solicitud", read_only=True)
    codigo = serializers.CharField(source="tipo_solicitud", read_only=True)
    fecha = serializers.SerializerMethodField()
    area = serializers.CharField(read_only=True)
    nombre = serializers.SerializerMethodField()
    concepto = serializers.CharField(source="concepto_gasto", read_only=True)
    monto_usd = serializers.DecimalField(source="total_dolares", max_digits=12, decimal_places=2, read_only=True)
    monto_pen = serializers.DecimalField(source="total_soles", max_digits=12, decimal_places=2, read_only=True)
    regus = serializers.CharField(source="solicitante.usuario", read_only=True, default="")
    tipo = serializers.SerializerMethodField()

    class Meta:
        model = CajaChicaSolicitud
        fields = [
            'id_registro',
            'nro_solicitud',
            'codigo',
            'fecha',
            'area',
            'nombre',
            'concepto',
            'monto_usd',
            'monto_pen',
            'regus',
            'tipo',
        ]

    def get_id_registro(self, obj):
        return f"caja_{obj.id}"

    def get_fecha(self, obj):
        return obj.fecha.strftime("%Y-%m-%d") if obj.fecha else None

    def get_nombre(self, obj):
        return obj.solicitante.nombre_completo if obj.solicitante else ""

    def get_tipo(self, obj):
        return f"Caja Chica ({obj.tipo_solicitud})"

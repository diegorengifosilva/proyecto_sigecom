from rest_framework import serializers
from .models import SolicitudOrdenCompra, SolicitudPasajes, SolicitudOrdenCompraDetalle, SolicitudPasajesDetalle
from caja_chica_api.models import Solicitud as CajaChicaSolicitud

# 1. SERIALIZADOR DE ÓRDENES DE COMPRA
class SolicitudOrdenCompraSerializer(serializers.ModelSerializer):
    id_registro = serializers.SerializerMethodField()
    id_registro_directo = serializers.SerializerMethodField()
    area = serializers.SerializerMethodField()
    regus = serializers.SerializerMethodField()
    fecha = serializers.SerializerMethodField()
    hora = serializers.SerializerMethodField()
    
    # Aliases para compatibilidad con el frontend
    nro_solicitud = serializers.CharField(source="codigo", read_only=True, default="")
    nombre = serializers.SerializerMethodField()
    monto_usd = serializers.SerializerMethodField()
    monto_pen = serializers.SerializerMethodField()
    estado_nombre = serializers.CharField(source="id_estado.nombre", read_only=True, default="")
    tipo = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudOrdenCompra
        fields = [
            'id_solicitud',
            'id_registro',
            'id_registro_directo',
            'id_apertura',
            'nivel_grupo',
            'codigo',
            'nro_solicitud',
            'num',
            'fecha',
            'hora',
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

    def get_id_registro_directo(self, obj):
        return obj.id_solicitud

    def get_area(self, obj):
        if obj.id_area:
            return obj.id_area.nombre
        if obj.id_apertura and obj.id_apertura.id_registro:
            coti_area = getattr(obj.id_apertura.id_registro, 'id_area', None)
            from users.models import Area
            area_id = coti_area.id_area if hasattr(coti_area, 'id_area') else coti_area
            if area_id:
                area_obj = Area.objects.filter(id_area=area_id).first()
                if area_obj:
                    return area_obj.nombre
        return ""

    def get_regus(self, obj):
        return obj.id_solicitante.usuario if obj.id_solicitante else ""

    def get_nombre(self, obj):
        return obj.id_solicitante.nombre_completo if obj.id_solicitante else ""

    def get_fecha(self, obj):
        val = obj.fecha
        if not val:
            return None
        return val.strftime("%Y-%m-%d")

    def get_hora(self, obj):
        val = obj.fecha
        if not val:
            return ""
        # Formato de 12 horas con am/pm en minúsculas (ej: 11:54 am)
        time_str = val.strftime("%I:%M %p").lower()
        if time_str.startswith('0'):
            time_str = time_str[1:]
        return time_str

    def get_tipo(self, obj):
        val = (obj.tipo or "Suministro").strip()
        if val.upper() in ('S', 'SERVICIO'):
            return "Servicio"
        return "Suministro"

    def get_monto_usd(self, obj):
        return float(obj.monto_dolares or 0.00)

    def get_monto_pen(self, obj):
        return float(obj.monto_soles or 0.00)



# 2. SERIALIZADOR DE DETALLES DE PASAJES (PASSENGERS)
class SolicitudPasajesDetalleSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.CharField(source='id_usuario.nombre_completo', read_only=True, default='')
    dni_usuario = serializers.CharField(source='id_usuario.dni', read_only=True, default='')
    dni = serializers.SerializerMethodField()
    nombre = serializers.SerializerMethodField()
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudPasajesDetalle
        fields = [
            'id_detalle',
            'id_registro',
            'id_usuario',
            'nombre_usuario',
            'dni_usuario',
            'dni',
            'nombre',
            'nombre_completo',
            'nombre_especial',
            'observacion',
        ]

    def get_dni(self, obj):
        if obj.id_usuario and obj.id_usuario.dni:
            return obj.id_usuario.dni
        return ""

    def get_nombre(self, obj):
        if obj.id_usuario and obj.id_usuario.nombre_completo:
            return obj.id_usuario.nombre_completo
        return obj.nombre_especial or ""

    def get_nombre_completo(self, obj):
        if obj.id_usuario and obj.id_usuario.nombre_completo:
            return obj.id_usuario.nombre_completo
        return obj.nombre_especial or ""


# 3. SERIALIZADOR DE PASAJES (TRAVEL REQUESTS)
class SolicitudPasajesSerializer(serializers.ModelSerializer):
    id_registro = serializers.SerializerMethodField()
    id_registro_directo = serializers.SerializerMethodField()
    area = serializers.SerializerMethodField()
    regus = serializers.SerializerMethodField()
    fecha = serializers.SerializerMethodField()
    hora = serializers.SerializerMethodField()
    
    # Aliases para compatibilidad con el frontend
    nro_solicitud = serializers.CharField(source="cog", read_only=True, default="")
    codigo = serializers.CharField(read_only=True, default="")
    nombre = serializers.SerializerMethodField()
    monto_usd = serializers.SerializerMethodField()
    monto_pen = serializers.SerializerMethodField()
    estado_nombre = serializers.CharField(source="id_estado.nombre", read_only=True, default="")
    tipo = serializers.SerializerMethodField()
    referencia = serializers.SerializerMethodField()
    modo_nombre = serializers.SerializerMethodField()
    transporte_nombre = serializers.SerializerMethodField()
    id_empresa = serializers.PrimaryKeyRelatedField(read_only=True)
    empresa = serializers.SerializerMethodField()
    empresa_nombre = serializers.SerializerMethodField()
    empresa_ruc = serializers.SerializerMethodField()
    detalles = SolicitudPasajesDetalleSerializer(many=True, read_only=True)

    class Meta:
        model = SolicitudPasajes
        fields = [
            'id_pasaje',
            'id_registro',
            'id_registro_directo',
            'id_apertura',
            'nivel_grupo',
            'cog',
            'codigo',
            'nro_solicitud',
            'num',
            'fecha',
            'hora',
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
            'observacion',
            'transporte',
            'transporte_nombre',
            'modo',
            'modo_nombre',
            'id_estado',
            'estado_nombre',
            'lugar_origen',
            'lugar_destino',
            'fecha_salida',
            'fecha_retorno',
            'tipo_movimiento',
            'tipo_gasto',
            'id_empresa',
            'empresa',
            'empresa_nombre',
            'empresa_ruc',
            'nombre',
            'detalles',
        ]

    def get_empresa(self, obj):
        return obj.id_empresa.nombre if obj.id_empresa else ""

    def get_empresa_nombre(self, obj):
        return obj.id_empresa.nombre if obj.id_empresa else ""

    def get_empresa_ruc(self, obj):
        return obj.id_empresa.ruc if obj.id_empresa else None

    def get_id_registro(self, obj):
        return f"pasaje_{obj.id_registro or obj.id_pasaje}"

    def get_id_registro_directo(self, obj):
        return obj.id_pasaje

    def get_area(self, obj):
        if obj.id_area:
            return obj.id_area.nombre
        if obj.id_apertura and obj.id_apertura.id_registro:
            coti_area = getattr(obj.id_apertura.id_registro, 'id_area', None)
            from users.models import Area
            area_id = coti_area.id_area if hasattr(coti_area, 'id_area') else coti_area
            if area_id:
                area_obj = Area.objects.filter(id_area=area_id).first()
                if area_obj:
                    return area_obj.nombre
        return ""

    def get_regus(self, obj):
        return obj.id_solicitante.usuario if obj.id_solicitante else ""

    def get_nombre(self, obj):
        return obj.id_solicitante.nombre_completo if obj.id_solicitante else ""

    def get_fecha(self, obj):
        val = obj.fecha
        if not val:
            return None
        return val.strftime("%Y-%m-%d")

    def get_hora(self, obj):
        val = obj.fecha
        if not val:
            return ""
        time_str = val.strftime("%I:%M %p").lower()
        if time_str.startswith('0'):
            time_str = time_str[1:]
        return time_str

    def get_referencia(self, obj):
        origen = (obj.lugar_origen or "").strip()
        destino = (obj.lugar_destino or "").strip()
        if origen and destino:
            return f"Viaje: {origen} a {destino}".upper()
        return (obj.concepto or "Viaje de Comisión").upper()

    def get_tipo(self, obj):
        transp_map = {"A": "Aéreo", "T": "Terrestre"}
        transp_name = transp_map.get(str(obj.transporte or "").upper(), "Aéreo")
        return f"Pasajes ({transp_name})"

    def get_transporte_nombre(self, obj):
        transp_map = {"A": "Aéreo", "T": "Terrestre"}
        return transp_map.get(str(obj.transporte or "").upper(), "Aéreo")

    def get_modo_nombre(self, obj):
        modo_map = {1: "Solo Ida", 2: "Retorno", 3: "Ida y Vuelta"}
        return modo_map.get(obj.modo, "Retorno" if obj.modo == 2 else "Solo Ida")

    def get_monto_usd(self, obj):
        return float(obj.monto_dolares or 0.00)

    def get_monto_pen(self, obj):
        return float(obj.monto_soles or 0.00)


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


class SolicitudOrdenCompraDetalleSerializer(serializers.ModelSerializer):
    codigo_item = serializers.CharField(source='codigo', read_only=True, default='')
    precio_venta = serializers.DecimalField(source='valor', max_digits=12, decimal_places=2, read_only=True)
    venta_total = serializers.DecimalField(source='total', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SolicitudOrdenCompraDetalle
        fields = [
            'id_detalle',
            'id_registro',
            'codigo',
            'codigo_item',
            'descripcion',
            'cantidad',
            'valor',
            'precio_venta',
            'total',
            'venta_total',
        ]

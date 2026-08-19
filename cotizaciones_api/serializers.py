# cotizaciones_api/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
import uuid
from .models import (
    Cotizacion,
    CotizacionSuministro,
    CotizacionServicio,
    CotizacionAdjunto,
    CotizacionMensaje,
    CotizacionSeguimiento,
    CotizacionApertura,

    alm_articulos,
    ObjetivoAnual,
    ObjetivoAnualArea, 
    vc_tab_notas,
    vc_mov_orden,
)
from django.contrib.auth import get_user_model
from django.utils.timezone import localtime
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from decimal import Decimal
from datetime import timezone
from core.models import Cliente, Representante, Estado, TipoCotizacion, UnidadTiempo

User = get_user_model()

class RawDateTimeField(serializers.DateTimeField):
    def to_representation(self, value):
        if not value:
            return None
        if isinstance(value, str):
            return value
        from django.utils.timezone import is_aware
        import datetime
        try:
            if is_aware(value):
                value = localtime(value)
            return value.strftime(self.format or "%Y-%m-%d %H:%M:%S")
        except Exception:
            return str(value)

#========================================================================================

class CotizacionSerializer(serializers.ModelSerializer):
    fecha = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", required=False, allow_null=True)
    # ── CAMPOS DE SOLO LECTURA (Basados en Relaciones FK) ──
    # Ya no necesitamos métodos pesados, usamos el 'source' para viajar por la FK
    cliente_nombre = serializers.SerializerMethodField() # Mantenemos MethodField por el fallback al representante
    cargo = serializers.CharField(source="representante_cargo", read_only=True)
    
    # Nombres desde tablas maestras
    estado_nombre = serializers.CharField(source="id_estado.nombre", read_only=True)
    tipo_nombre = serializers.CharField(source="id_tipo.nombre", read_only=True)
    
    # Unidades de tiempo (Navegamos 1 nivel: id_unidad... -> nombre)
    unidad_suministro_nombre = serializers.CharField(
        source="id_unidad_tiempo_entrega_suministros.nombre", read_only=True
    )
    unidad_servicio_nombre = serializers.CharField(
        source="id_unidad_tiempo_entrega_servicios.nombre", read_only=True
    )
    unidad_validez_nombre = serializers.CharField(
        source="id_unidad_tiempo_validez.nombre", read_only=True
    )

    # ── CAMPOS CON LÓGICA DE MAPEO ──
    area_nombre = serializers.SerializerMethodField()
    prob_nombre = serializers.SerializerMethodField()
    moneda_nombre = serializers.SerializerMethodField()
    igv_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = "__all__"
        # Protegemos campos internos o autocalculados
        read_only_fields = [
            "id_registro", 
            "codigo", 
            "estado_envio", 
            "total_cotizacion", 
            "saldo"
        ]

    # ── LÓGICA DE REPRESENTACIÓN ──

    def get_cliente_nombre(self, obj):
        # Prioridad 1: Tabla relacional de Clientes
        # Prioridad 2: Snapshot de representante (Legacy/Manual)
        if obj.id_cliente:
            return obj.id_cliente.nombre
        return obj.representante_nombre or ""

    def get_area_nombre(self, obj):
        # Mantenemos el mapeo manual ya que id_area es IntegerField
        mapping = {1: "Industria", 2: "Minería", 3: "Mantenimiento", 4: "Petroquímica", 8: "Seguridad"}
        return mapping.get(obj.id_area, "")

    def get_prob_nombre(self, obj):
        mapping = {0: "Baja", 1: "Media", 2: "Alta", 3: "Muy Alta"}
        return mapping.get(obj.probabilidad, "")

    def get_moneda_nombre(self, obj):
        return "Soles" if obj.tipo_moneda == "S" else "Dólares"

    def get_igv_nombre(self, obj):
        return "Incluye IGV" if obj.igv == "S" else "No Incluye IGV"

    # ── VALIDACIONES (Escritura) ──
    
    def validate_igv(self, value):
        """ Asegura integridad: solo aceptamos S o N """
        if value not in ["N", "S"]:
            return "N"
        return value

class CotizacionTablaSerializer(serializers.ModelSerializer):
    # ── 1. Declaración de campos ──
    cliente_nombre = serializers.SerializerMethodField() 
    estado_nombre = serializers.CharField(source="id_estado.nombre", read_only=True)
    tipo_nombre = serializers.CharField(source="id_tipo.nombre", read_only=True)
    envio = serializers.SerializerMethodField()

    # Responsable Comercial
    comercial_nombre = serializers.SerializerMethodField()
    comercial_correo = serializers.SerializerMethodField()
    comercial_movil_corporativo = serializers.SerializerMethodField()
    comercial_movil_personal = serializers.SerializerMethodField()

    # Responsable Técnico
    tecnico_nombre = serializers.SerializerMethodField()
    tecnico_correo = serializers.SerializerMethodField()
    tecnico_movil_corporativo = serializers.SerializerMethodField()
    tecnico_movil_personal = serializers.SerializerMethodField()
    
    # Tiempos y Validez
    suministros_valor = serializers.IntegerField(source="entrega_suministros", read_only=True)
    suministros_unidad = serializers.CharField(source="id_unidad_tiempo_entrega_suministros.nombre", read_only=True)
    
    servicios_valor = serializers.IntegerField(source="entrega_servicios", read_only=True)
    servicios_unidad = serializers.CharField(source="id_unidad_tiempo_entrega_servicios.nombre", read_only=True)
    
    validez_valor = serializers.IntegerField(source="validez_oferta", read_only=True)
    validez_unidad = serializers.CharField(source="id_unidad_tiempo_validez.nombre", read_only=True)

    numero = serializers.CharField(source="codigo", read_only=True)
    fecha = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    area_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = [
            "id_registro",
            "codigo",
            "fecha",
            "numero",
            "referencia",
            "cliente_nombre",
            "representante_nombre",
            "comercial_nombre",
            "comercial_correo",
            "comercial_movil_corporativo",
            "comercial_movil_personal",
            "tecnico_nombre",
            "tecnico_correo",
            "tecnico_movil_corporativo",
            "tecnico_movil_personal",
            "estado_nombre",
            "id_estado",
            "tipo_nombre",   
            "area_nombre",
            "total_cotizacion",
            "tipo_moneda",
            "probabilidad",
            "estado_envio",
            "envio",
            "suministros_valor",
            "suministros_unidad",
            "servicios_valor",
            "servicios_unidad",
            "validez_valor",
            "validez_unidad",
            "fijar",
        ]

    # ── 3. Lógica de Métodos ──
    def get_envio(self, obj):
        if obj.estado_envio in (2, 3):
            return 3
        return 2

    # RESPONSABLE COMERCIAL
    def get_comercial_nombre(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.nombre_completo
        return "Por asignar"

    def get_comercial_correo(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.correo
        return None

    def get_comercial_movil_corporativo(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.movil_coorporativo
        return None

    def get_comercial_movil_personal(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.movil_personal
        return None

    # RESPONSABLE TÉCNICO
    def get_tecnico_nombre(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.nombre_completo
        return "Por asignar"

    def get_tecnico_correo(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.correo
        return None

    def get_tecnico_movil_corporativo(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.movil_coorporativo
        return None

    def get_tecnico_movil_personal(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.movil_personal
        return None

    # CLIENTE
    def get_cliente_nombre(self, obj):
        if obj.id_cliente:
            return obj.id_cliente.nombre
        return obj.representante_nombre or "S/N"

    # AREA
    def get_area_nombre(self, obj):
        mapping = {
            1: "Industria", 
            2: "Minería", 
            3: "Mantenimiento", 
            4: "Petroquímica", 
            8: "Seguridad"
        }
        return mapping.get(obj.id_area, "Otros")

class CotizacionSuministroSerializer(serializers.ModelSerializer):
    # Traemos los nombres de las relaciones para no ver solo IDs en el detalle
    marca_nombre = serializers.CharField(source="id_marca.nombre", read_only=True)
    gasto_nombre = serializers.CharField(source="id_tipo_gasto.nombre", read_only=True)
    unidad_entrega_nombre = serializers.CharField(source="id_unidad_tiempo_entrega.nombre", read_only=True)

    class Meta:
        model = CotizacionSuministro
        fields = "__all__"

class CotizacionServicioSerializer(serializers.ModelSerializer):
    # Campos calculados o de lectura para el frontend
    area_nombre = serializers.ReadOnlyField(source='id_area.nombre')
    gasto_nombre = serializers.ReadOnlyField(source='id_tipo_gasto.nombre')

    class Meta:
        model = CotizacionServicio
        fields = [
            'id_servicio',
            'id_registro',
            'id_tipo_gasto',
            'id_area',
            'area_nombre',
            'gasto_nombre',
            'codigo_servicio',
            'nombre_servicio',
            'nivel',
            'orden',
            'codigo_item',
            'descripcion_item',
            'horas',
            'cantidad_hombres',
            'costo_hombre_dia',
            'cantidad_dias',
            'costo_total',
            'porcentaje',
            'utilidad',
            'cotizado_hombre_dia',
            'cotizado_total',
            'descripcion_servicio'
        ]
        # id_servicio es el nuevo PK autoincremental
        read_only_fields = ['id_servicio']

    def to_representation(self, instance):
        """
        Limpiamos los valores decimales para que no lleguen como strings 
        al frontend si prefieres manejarlos como números.
        """
        data = super().to_representation(instance)
        decimal_fields = [
            'costo_hombre_dia', 'costo_total', 'porcentaje', 'utilidad', 
            'cotizado_hombre_dia', 'cotizado_total'
        ]
        for field in decimal_fields:
            if data[field] is not None:
                data[field] = float(data[field])
        return data

class CotizacionAdjuntoSerializer(serializers.ModelSerializer):
    # Traemos el código del usuario (username) en lugar del nombre completo
    usuario_nombre = serializers.ReadOnlyField(source='id_usuario.usuario')
    
    fecha_formateada = serializers.DateTimeField(source='fecha', format="%d/%m/%Y %H:%M", read_only=True)
    
    class Meta:
        model = CotizacionAdjunto
        fields = [
            'id_adjuntos', 'id_registro', 'nombre', 'descripcion', 
            'fecha', 'fecha_formateada', 'id_usuario', 'usuario_nombre', 
            'ruta', 'activo'
        ]

class CotizacionMensajeSerializer(serializers.ModelSerializer):
    # Traemos el código del usuario (username) en lugar del nombre completo
    usuario_nombre = serializers.ReadOnlyField(source='id_usuario.usuario')
    
    # Formateamos las fechas para que React no tenga que procesar strings complejos
    fecha_formateada = serializers.DateTimeField(
        source='fecha', 
        format="%d/%m/%Y %H:%M", 
        read_only=True
    )
    
    alerta_fecha_formateada = serializers.DateTimeField(
        source='alerta_fecha', 
        format="%d/%m/%Y %H:%M", 
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = CotizacionMensaje
        fields = [
            'id_mensaje', 
            'id_registro', 
            'fecha', 
            'fecha_formateada',
            'id_usuario', 
            'usuario_nombre', 
            'mensaje', 
            'alerta', 
            'alerta_fecha', 
            'alerta_fecha_formateada',
            'alerta_completada', 
            'completo', 
            'activo'
        ]
        # Opcional: proteger campos que el cliente no debería enviar manualmente
        read_only_fields = ['id_mensaje', 'fecha', 'activo']

class CotizacionSeguimientoSerializer(serializers.ModelSerializer):
    # Traemos el código del usuario (username) en lugar del nombre completo
    usuario_nombre = serializers.ReadOnlyField(source='id_usuario.usuario')
    
    # Formateamos la fecha para que el frontend la pinte sin procesar
    fecha_formateada = serializers.DateTimeField(
        source='fecha', 
        format="%d/%m/%Y %H:%M", 
        read_only=True
    )

    class Meta:
        model = CotizacionSeguimiento
        fields = [
            'id_seguimiento', 
            'id_registro', 
            'fecha', 
            'fecha_formateada', 
            'detalle', 
            'id_usuario', 
            'usuario_nombre', 
            'activo'
        ]
        # Campos que el frontend no debería poder modificar
        read_only_fields = ['id_seguimiento', 'fecha', 'activo']

class CotizacionModalSerializer(serializers.ModelSerializer):
    fecha = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    recepcion_solicitud = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    visita_tecnica = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    fecha_limite = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    emision_cotizacion = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    # ── Campos derivados de relaciones (Nombres legibles) ──
    cliente_nombre = serializers.SerializerMethodField()
    estado_nombre = serializers.CharField(source="id_estado.nombre", read_only=True)
    tipo_nombre = serializers.CharField(source="id_tipo.nombre", read_only=True)
    area_nombre = serializers.SerializerMethodField()
    igv_nombre = serializers.SerializerMethodField()

    comercial_nombre = serializers.SerializerMethodField()
    comercial_correo = serializers.SerializerMethodField()
    comercial_movil_corporativo = serializers.SerializerMethodField()
    comercial_movil_personal = serializers.SerializerMethodField()
    comercial_telefono = serializers.SerializerMethodField()
    comercial_dni = serializers.SerializerMethodField()

    tecnico_nombre = serializers.SerializerMethodField()
    tecnico_correo = serializers.SerializerMethodField()
    tecnico_movil_corporativo = serializers.SerializerMethodField()
    tecnico_movil_personal = serializers.SerializerMethodField()
    tecnico_telefono = serializers.SerializerMethodField()
    tecnico_dni = serializers.SerializerMethodField()

    # ── SUMINISTROS ──
    suministros = CotizacionSuministroSerializer(many=True, read_only=True)

    # ── SERVICIOS ──
    servicios = CotizacionServicioSerializer(many=True, read_only=True)

    # ── MENSAJES ──
    mensajes = CotizacionMensajeSerializer(many=True, read_only=True, source="mensajes_rel")

    # ── SEGUIMIENTO ──
    seguimiento = CotizacionSeguimientoSerializer(many=True, read_only=True, source="seguimientos")

    # ── ADJUNTOS ──
    adjuntos = CotizacionAdjuntoSerializer(many=True, read_only=True)
    envio = serializers.SerializerMethodField()
    has_apertura = serializers.SerializerMethodField()
    has_oportunidad = serializers.SerializerMethodField()
    has_cotizacion = serializers.SerializerMethodField()
    
    # Nombres de unidades de tiempo
    unidad_suministro_nombre = serializers.CharField(
        source="id_unidad_tiempo_entrega_suministros.nombre", read_only=True
    )
    unidad_servicio_nombre = serializers.CharField(
        source="id_unidad_tiempo_entrega_servicios.nombre", read_only=True
    )
    unidad_validez_nombre = serializers.CharField(
        source="id_unidad_tiempo_validez.nombre", read_only=True
    )

    class Meta:
        model = Cotizacion
        fields = [
            # Identificación
            "id_registro", "codigo", "fecha", "referencia", "año_apertura",
            
            # Cliente y Representante (Snapshot)
            "id_cliente", "cliente_nombre", "id_representante",
            "representante_nombre", "representante_cargo", 
            "representante_telefono", "representante_movil", "representante_correo",
            
            # Personal
            "id_comercial", "id_tecnico", "id_creador",
            "comercial_nombre", "comercial_correo", "comercial_movil_corporativo", "comercial_movil_personal", "comercial_telefono", "comercial_dni",
            "tecnico_nombre", "tecnico_correo", "tecnico_movil_corporativo", "tecnico_movil_personal", "tecnico_telefono", "tecnico_dni",
            
            # Comercial y Totales
            "forma_pago", "lugar", "tipo_moneda", "tipo_cambio",
            "igv", "igv_nombre", "total_cotizacion", "saldo",
            
            # Tiempos y Unidades
            "entrega_suministros", "id_unidad_tiempo_entrega_suministros", "unidad_suministro_nombre",
            "entrega_servicios", "id_unidad_tiempo_entrega_servicios", "unidad_servicio_nombre",
            "validez_oferta", "id_unidad_tiempo_validez", "unidad_validez_nombre",
            
            # Estado y Área
            "id_estado", "estado_nombre", "id_area", "area_nombre",
            "id_tipo", "tipo_nombre", "tipo_venta", "estado_envio", "envio",
            
            # Seguimiento y Descuentos
            "probabilidad", "seguimiento", "mensajes",
            "descuento_aplica", "descuento_afecto", "descuento_monto", "descuento_porcentaje",
            "condiciones_generales",

            # Oportunidades
            "recepcion_solicitud", "visita_tecnica", "fecha_limite", "emision_cotizacion",
            "estado_oportunidad", "comentario",

            # SUMINISTROS
            "suministros",

            # SERVICIOS
            "servicios",

            # MENSAJES
            "mensajes",

            # SEGUIMIENTO
            "seguimiento",

            # ADJUNTOS
            "adjuntos",
            "has_apertura",
            "has_oportunidad",
            "has_cotizacion"
        ]
        read_only_fields = fields

    # ── Métodos de Lógica ──
    def get_has_oportunidad(self, obj):
        return obj.recepcion_solicitud is not None

    def get_has_cotizacion(self, obj):
        return obj.id_estado_id != 11

    def get_has_apertura(self, obj):
        return obj.aperturas.exists()

    def get_envio(self, obj):
        if obj.estado_envio in (2, 3):
            return 3
        return 2

    def get_cliente_nombre(self, obj):
        if obj.id_cliente:
            return obj.id_cliente.nombre
        return obj.representante_nombre or ""

    def get_area_nombre(self, obj):
        mapping = {1: "Industria", 2: "Minería", 3: "Mantenimiento", 4: "Petroquímica", 8: "Seguridad"}
        return mapping.get(obj.id_area, "")

    def get_igv_nombre(self, obj):
        return "Incluye IGV" if obj.igv == "S" else "No Incluye IGV"

    def get_comercial_nombre(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.nombre_completo
        return ""

    def get_comercial_correo(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.correo
        return ""

    def get_comercial_movil_corporativo(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.movil_coorporativo
        return ""

    def get_comercial_movil_personal(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.movil_personal
        return ""

    def get_comercial_telefono(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.telefono
        return ""

    def get_comercial_dni(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.dni
        return ""

    def get_tecnico_nombre(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.nombre_completo
        return ""

    def get_tecnico_correo(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.correo
        return ""

    def get_tecnico_movil_corporativo(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.movil_coorporativo
        return ""

    def get_tecnico_movil_personal(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.movil_personal
        return ""

    def get_tecnico_telefono(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.telefono
        return ""

    def get_tecnico_dni(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.dni
        return ""

class CotizacionAutocompleteSerializer(serializers.ModelSerializer):
    fecha = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    # ── Campos derivados de relaciones (Nombres legibles) ──
    cliente_nombre = serializers.SerializerMethodField()
    estado_nombre = serializers.CharField(source="id_estado.nombre", read_only=True)
    tipo_nombre = serializers.CharField(source="id_tipo.nombre", read_only=True)
    area_nombre = serializers.SerializerMethodField()
    igv_nombre = serializers.SerializerMethodField()

    comercial_nombre = serializers.SerializerMethodField()
    comercial_correo = serializers.SerializerMethodField()
    comercial_movil_corporativo = serializers.SerializerMethodField()
    comercial_movil_personal = serializers.SerializerMethodField()
    comercial_telefono = serializers.SerializerMethodField()
    comercial_dni = serializers.SerializerMethodField()

    tecnico_nombre = serializers.SerializerMethodField()
    tecnico_correo = serializers.SerializerMethodField()
    tecnico_movil_corporativo = serializers.SerializerMethodField()
    tecnico_movil_personal = serializers.SerializerMethodField()
    tecnico_telefono = serializers.SerializerMethodField()
    tecnico_dni = serializers.SerializerMethodField()
    
    # Nombres de unidades de tiempo
    unidad_suministro_nombre = serializers.CharField(
        source="id_unidad_tiempo_entrega_suministros.nombre", read_only=True
    )
    unidad_servicio_nombre = serializers.CharField(
        source="id_unidad_tiempo_entrega_servicios.nombre", read_only=True
    )
    unidad_validez_nombre = serializers.CharField(
        source="id_unidad_tiempo_validez.nombre", read_only=True
    )

    class Meta:
        model = Cotizacion
        fields = [
            # Identificación
            "id_registro", "codigo", "fecha", "referencia", "año_apertura",
            
            # Cliente y Representante (Snapshot)
            "id_cliente", "cliente_nombre", "id_representante",
            "representante_nombre", "representante_cargo", 
            "representante_telefono", "representante_movil", "representante_correo",
            
            # Personal
            "id_comercial", "id_tecnico", "id_creador",
            "comercial_nombre", "comercial_correo", "comercial_movil_corporativo", "comercial_movil_personal", "comercial_telefono", "comercial_dni",
            "tecnico_nombre", "tecnico_correo", "tecnico_movil_corporativo", "tecnico_movil_personal", "tecnico_telefono", "tecnico_dni",
            
            # Comercial y Totales
            "forma_pago", "lugar", "tipo_moneda", "tipo_cambio",
            "igv", "igv_nombre", "total_cotizacion", "saldo",
            
            # Tiempos y Unidades
            "entrega_suministros", "id_unidad_tiempo_entrega_suministros", "unidad_suministro_nombre",
            "entrega_servicios", "id_unidad_tiempo_entrega_servicios", "unidad_servicio_nombre",
            "validez_oferta", "id_unidad_tiempo_validez", "unidad_validez_nombre",
            
            # Estado y Área
            "id_estado", "estado_nombre", "id_area", "area_nombre",
            "id_tipo", "tipo_nombre", "tipo_venta", "estado_envio",
            
            # Seguimiento y Descuentos
            "probabilidad",
            "descuento_aplica", "descuento_afecto", "descuento_monto", "descuento_porcentaje",
            "condiciones_generales",
        ]
        read_only_fields = fields

    # ── Métodos de Lógica ──

    def get_cliente_nombre(self, obj):
        if obj.id_cliente:
            return obj.id_cliente.nombre
        return obj.representante_nombre or ""

    def get_area_nombre(self, obj):
        mapping = {1: "Industria", 2: "Minería", 3: "Mantenimiento", 4: "Petroquímica", 8: "Seguridad"}
        return mapping.get(obj.id_area, "")

    def get_igv_nombre(self, obj):
        return "Incluye IGV" if obj.igv == "S" else "No Incluye IGV"

    def get_comercial_nombre(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.nombre_completo
        return ""

    def get_comercial_correo(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.correo
        return ""

    def get_comercial_movil_corporativo(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.movil_coorporativo
        return ""

    def get_comercial_movil_personal(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.movil_personal
        return ""

    def get_comercial_telefono(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.telefono
        return ""

    def get_comercial_dni(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.dni
        return ""

    def get_tecnico_nombre(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.nombre_completo
        return ""

    def get_tecnico_correo(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.correo
        return ""

    def get_tecnico_movil_corporativo(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.movil_coorporativo
        return ""

    def get_tecnico_movil_personal(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.movil_personal
        return ""

    def get_tecnico_telefono(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.telefono
        return ""

    def get_tecnico_dni(self, obj):
        if obj.id_tecnico:
            return obj.id_tecnico.dni
        return ""

# (NotificacionSerializer se movió a su propio módulo de notificaciones)

#========================================================================================

##=============##
## OPORTUNIDAD ##
##=============##
class OportunidadTablaSerializer(serializers.ModelSerializer):
    # ── 1. Declaración de campos serializados o calculados ──
    cliente_nombre = serializers.SerializerMethodField()
    
    # Responsable Comercial (Heredado de tu lógica de usuarios)
    comercial_nombre = serializers.SerializerMethodField()
    comercial_correo = serializers.SerializerMethodField()
    comercial_movil_corporativo = serializers.SerializerMethodField()
    comercial_movil_personal = serializers.SerializerMethodField()

    # Formateo de las fechas nativas de Oportunidad
    recepcion_solicitud = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    visita_tecnica = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    fecha_limite = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    emision_cotizacion = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)

    class Meta:
        model = Cotizacion
        fields = [
            "id_registro",         # Clave primaria implícita para acciones e integraciones en el frontend
            "codigo",
            "recepcion_solicitud",
            "cliente_nombre",
            "representante_nombre",
            "referencia",          # Mapea con "DESCRIPCIÓN DE LA OPORTUNIDAD" del excel
            "visita_tecnica",
            "fecha_limite",
            "emision_cotizacion",
            "estado_oportunidad",
            "comercial_nombre",
            "comercial_correo",
            "comercial_movil_corporativo",
            "comercial_movil_personal",
            "comentario",
            "fijar",
        ]

    # ── 2. Lógica de Métodos (Getters) ──

    # CLIENTE
    def get_cliente_nombre(self, obj):
        if obj.id_cliente:
            return obj.id_cliente.nombre
        return obj.representante_nombre or "S/N"

    # RESPONSABLE COMERCIAL
    def get_comercial_nombre(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.nombre_completo
        return "Por asignar"

    def get_comercial_correo(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.correo
        return None

    def get_comercial_movil_corporativo(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.movil_coorporativo
        return None

    def get_comercial_movil_personal(self, obj):
        if obj.id_comercial:
            return obj.id_comercial.movil_personal
        return None

#========================================================================================

##=====================##
## APERTURA COTIZACION ##
##=====================##
class CotizacionCompletaSerializer(serializers.ModelSerializer):
    """Retorna absolutamente todos los campos del FK Cotizacion."""
    tipo_cotizacion_nombre = serializers.CharField(source="id_tipo.nombre", read_only=True)
    cliente_nombre = serializers.CharField(source="id_cliente.nombre", read_only=True)
    estado_nombre = serializers.CharField(source="id_estado.nombre", read_only=True)
    comercial_nombre = serializers.CharField(source="id_comercial.nombre_completo", read_only=True)
    tecnico_nombre = serializers.CharField(source="id_tecnico.nombre_completo", read_only=True)
    id_unidad_tiempo_entrega_suministros_nombre = serializers.CharField(source="id_unidad_tiempo_entrega_suministros.nombre", read_only=True)
    id_unidad_tiempo_entrega_servicios_nombre = serializers.CharField(source="id_unidad_tiempo_entrega_servicios.nombre", read_only=True)
    id_unidad_tiempo_validez_nombre = serializers.CharField(source="id_unidad_tiempo_validez.nombre", read_only=True)
    area_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = "__all__"

    def get_area_nombre(self, obj):
        if not obj.id_area:
            return "Otros"
        mapping = {
            1: "Industria", 
            2: "Minería", 
            3: "Mantenimiento", 
            4: "Petroquímica", 
            8: "Seguridad de Maquinaria"
        }
        return mapping.get(obj.id_area, "Otros")

class CotizacionAperturaSerializer(serializers.ModelSerializer):
    # ── FORMATEO DE FECHAS ──────────────────────────────────────
    fecha_orden = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", required=False, allow_null=True)
    fecha_entrega = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", required=False, allow_null=True)
    fecha_factura = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", required=False, allow_null=True)

    # ── SOBREESCRITURA CON EL OBJETO COMPLETO DE COTIZACIÓN ───
    id_registro = CotizacionCompletaSerializer(read_only=True)

    # ── CAMPOS DE SOLO LECTURA DESDE TABLAS MAESTRAS ───────────
    unidad_plazo_nombre = serializers.CharField(source="orden_plazo_unidad.nombre", read_only=True)
    
    # Datos heredados directo en la raíz (Mapeos existentes)
    cotizacion_codigo = serializers.CharField(source="id_registro.codigo", read_only=True)
    cotizacion_referencia = serializers.CharField(source="id_registro.referencia", read_only=True)

    # ── CAMPOS CON LÓGICA DE MAPEO (LECTURA) ────────────────────
    estado_orden_nombre = serializers.SerializerMethodField()
    prioridad_nombre = serializers.SerializerMethodField()
    tiene_archivo_fisico = serializers.SerializerMethodField()
    extension_archivo_fisico = serializers.SerializerMethodField()

    class Meta:
        model = CotizacionApertura
        fields = "__all__"
        read_only_fields = [
            "id_apertura",
            "uti_des"
        ]

    # ── LÓGICA DE REPRESENTACIÓN ────────────────────────────────
    def get_estado_orden_nombre(self, obj):
        mapping = {1: "Pendiente", 2: "Aprobada", 3: "Facturada", 4: "Anulada"}
        return mapping.get(obj.estado_orden, "Desconocido")

    def get_prioridad_nombre(self, obj):
        mapping = {"0": "Normal", "1": "Urgente", "2": "Crítica"}
        return mapping.get(str(obj.prio), "Normal")

    def get_tiene_archivo_fisico(self, obj):
        if not obj.id_apertura:
            return False
        import os
        from django.conf import settings
        ruta_carpeta = os.path.join(settings.BASE_DIR, 'cotizaciones_api', 'ocfiles')
        extensiones = ['.pdf', '.xlsx', '.xls', '.docx', '.doc']
        for ext in extensiones:
            if os.path.exists(os.path.join(ruta_carpeta, f"{obj.id_apertura}{ext}")):
                return True
        return False

    def get_extension_archivo_fisico(self, obj):
        if not obj.id_apertura:
            return None
        import os
        from django.conf import settings
        ruta_carpeta = os.path.join(settings.BASE_DIR, 'cotizaciones_api', 'ocfiles')
        extensiones = ['.pdf', '.xlsx', '.xls', '.docx', '.doc']
        for ext in extensiones:
            if os.path.exists(os.path.join(ruta_carpeta, f"{obj.id_apertura}{ext}")):
                return ext
        return None

class CotizacionCompactaSerializer(serializers.ModelSerializer):
    """
    Retorna únicamente los campos clave solicitados del FK Cotizacion
    con sus relaciones e IDs completamente resueltos en nombres legibles.
    """
    cliente_nombre = serializers.SerializerMethodField()
    area_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = ["codigo", "referencia", "id_cliente", "cliente_nombre", "id_area", "area_nombre", "fijar"]

    def get_cliente_nombre(self, obj):
        if obj.id_cliente:
            return obj.id_cliente.nombre
        return obj.representante_nombre or "S/N"

    def get_area_nombre(self, obj):
        mapping = {
            1: "Industria", 
            2: "Minería", 
            3: "Mantenimiento", 
            4: "Petroquímica", 
            8: "Seguridad"
        }
        return mapping.get(obj.id_area, "Otros")

class CotizacionAperturaTablaSerializer(serializers.ModelSerializer):
    # ── DATOS ASOCIADOS A LA APERTURA (REVISADOS SIN 'SOURCE') ──
    fecha_orden = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    fecha_factura = RawDateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    plazo_unidad = serializers.CharField(source="orden_plazo_unidad.nombre", read_only=True)
    estado_orden_nombre = serializers.SerializerMethodField()

    # ── SOBREESCRITURA CON EL OBJETO REDUCIDO Y TRADUCIDO ───────
    id_registro = CotizacionCompactaSerializer(read_only=True)

    # ── INFORMACIÓN DE LA COTIZACIÓN PADRE EN LA RAÍZ ───────────
    cotizacion_id = serializers.IntegerField(source="id_registro.id_registro", read_only=True)
    cotizacion_codigo = serializers.CharField(source="id_registro.codigo", read_only=True)
    cotizacion_referencia = serializers.CharField(source="id_registro.referencia", read_only=True)
    
    # ── INFORMACIÓN DEL CLIENTE (TRAÍDO VÍA COTIZACIÓN PADRE) ───
    cliente_id = serializers.IntegerField(source="id_registro.id_cliente.id_cliente", read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    
    # ── INFORMACIÓN DEL ÁREA TRADUCIDA EN LA RAÍZ ────────────────
    area_nombre = serializers.SerializerMethodField()

    class Meta:
        model = CotizacionApertura
        fields = [
            "id_apertura",
            "anno",
            "mes",
            "fecha_orden",
            "fecha_factura",
            "numero_orden",
            "id_registro",       # Retornará el JSON compacto con traducciones
            "total_orden",
            "estado_orden",
            "estado_orden_nombre",
            "orden_plazo_valor",
            "plazo_unidad",
            "totfa",
            "salfa",
            "cotizacion_id",
            "cotizacion_codigo",
            "cotizacion_referencia",
            "cliente_id",
            "cliente_nombre",
            "area_nombre",       # Traducido e inyectado en la raíz para facilitar tu Front-end
            "prio"
        ]

    # ── LÓGICA DE MÉTODOS SIMPLIFICADOS PARA TABLA ──────────────
    def get_estado_orden_nombre(self, obj):
        mapping = {1: "Pendiente", 2: "Aprobada", 3: "Facturada", 4: "Anulada"}
        return mapping.get(obj.estado_orden, "Desconocido")

    def get_cliente_nombre(self, obj):
        if obj.id_registro:
            if obj.id_registro.id_cliente:
                return obj.id_registro.id_cliente.nombre
            return obj.id_registro.representante_nombre or "S/N"
        return "S/N"

    def get_area_nombre(self, obj):
        if obj.id_registro:
            mapping = {
                1: "Industria", 
                2: "Minería", 
                3: "Mantenimiento", 
                4: "Petroquímica", 
                8: "Seguridad"
            }
            return mapping.get(obj.id_registro.id_area, "Otros")
        return "Otros"

#========================================================================================

##================##
## DATOS DE BD_VC ##
##================##     

# alm_articulos
class AlmArticulosSerializer(serializers.ModelSerializer):
    class Meta:
        model = alm_articulos
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

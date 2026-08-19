from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import date, timedelta
from django.utils import timezone
from django.db import models
from django.http import HttpResponse
import calendar

from .models import Notificacion
from .serializers import NotificacionSerializer
from cotizaciones_api.models import Cotizacion, CotizacionApertura
from logistica_api.models import LogisticaDashboard, LogisticaDashboardDetalle
from core.models import Producto

def calculate_target_date(start_date, val, code):
    if not start_date or val is None or not code:
        return None
    f_date = start_date.date() if hasattr(start_date, "date") else start_date
    if not isinstance(f_date, date):
        return None
    code_upper = code.upper()
    try:
        if code_upper in ('D', 'DI'): return f_date + timedelta(days=val)
        elif code_upper in ('S', 'SE'): return f_date + timedelta(weeks=val)
        elif code_upper in ('Q', 'QU'): return f_date + timedelta(days=val * 15)
        elif code_upper in ('M', 'ME'):
            month = f_date.month - 1 + val
            year = f_date.year + month // 12
            month = month % 12 + 1
            day = min(f_date.day, calendar.monthrange(year, month)[1])
            return date(year, month, day)
        elif code_upper in ('T', 'TR'):
            month = f_date.month - 1 + (val * 3)
            year = f_date.year + month // 12
            month = month % 12 + 1
            day = min(f_date.day, calendar.monthrange(year, month)[1])
            return date(year, month, day)
    except Exception:
        pass
    return None

def generar_notificaciones_usuario(usuario):
    # 0. Limpieza automática: eliminar notificaciones leídas de más de 30 días
    try:
        Notificacion.objects.filter(
            usuario=usuario,
            leido=True,
            fecha__lt=timezone.now() - timedelta(days=30)
        ).delete()
    except Exception as e:
        logger.error(f"Error en limpieza automatica de notificaciones: {e}")

    # 1. Determinar accesos a módulos
    is_admin = False
    if usuario.id_cargo and hasattr(usuario.id_cargo, 'nivel') and usuario.id_cargo.nivel is not None:
        is_admin = usuario.id_cargo.nivel <= 2
    
    cargo_name = usuario.id_cargo.nombre.lower() if usuario.id_cargo else ""
    if "admin" in cargo_name or "gerente" in cargo_name or "director" in cargo_name:
        is_admin = True

    has_total_access = usuario.usuario in ["diego.rengifo", "ronaldo.roman"] or is_admin

    area_name = usuario.id_area.nombre.lower() if usuario.id_area else ""
    has_comercial = has_total_access or usuario.usuario in ["eduardo.bonilla", "claudia.carbonel", "luisa.oncebay"] or "comercial" in area_name or "venta" in area_name
    has_logistica = has_total_access or "logistica" in area_name or "almacen" in area_name or "compras" in area_name

    hoy = date.today()

    if has_comercial:
        # A. Validez de Oferta (cotizaciones pendientes: id_estado_id = 2)
        # Filtramos por las cotizaciones creadas en 2026 asociadas al id_comercial
        cotis_pendientes = Cotizacion.objects.using("default").filter(
            id_estado_id=2,
            validez_oferta__isnull=False,
            anno=2026,
            id_comercial=usuario
        )

        for coti in cotis_pendientes:
            exp_date = calculate_target_date(coti.fecha, coti.validez_oferta, coti.id_unidad_tiempo_validez.codigo if coti.id_unidad_tiempo_validez else 'D')
            if exp_date:
                # Alerta por vencer (próximos 5 días)
                if hoy <= exp_date <= hoy + timedelta(days=5):
                    ref_id = f"coti_val_vence_{coti.id_registro}"
                    if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                        Notificacion.objects.create(
                            usuario=usuario,
                            tipo="atencion",
                            id_modulo_id=1,
                            titulo="Validez de oferta por vencer",
                            descripcion=f"La cotización {coti.codigo or coti.id_registro} para el cliente {coti.id_cliente.nombre if coti.id_cliente else 'S/C'} vence el {exp_date}.",
                            referencia_id=ref_id,
                            metadata={"id_registro": coti.id_registro, "codigo": coti.codigo, "tipo_alerta": "validez_vence"}
                        )
                # Alerta ya vencida (vencida en los últimos 7 días)
                elif exp_date < hoy <= exp_date + timedelta(days=7):
                    ref_id = f"coti_val_vencida_{coti.id_registro}"
                    if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                        Notificacion.objects.create(
                            usuario=usuario,
                            tipo="urgente",
                            id_modulo_id=1,
                            titulo="Cotización con oferta vencida",
                            descripcion=f"La oferta de la cotización {coti.codigo or coti.id_registro} expiró el {exp_date}.",
                            referencia_id=ref_id,
                            metadata={"id_registro": coti.id_registro, "codigo": coti.codigo, "tipo_alerta": "validez_vencida"}
                        )

        # B. Límite de Oportunidad (id_estado_id = 11, estado_oportunidad = 1)
        oportunidades = Cotizacion.objects.using("default").filter(
            id_estado_id=11,
            estado_oportunidad=1,
            fecha_limite__isnull=False,
            anno=2026,
            id_comercial=usuario
        )

        for op in oportunidades:
            limite_dt = op.fecha_limite.date() if hasattr(op.fecha_limite, "date") else op.fecha_limite
            if limite_dt:
                # 1. Alerta Crítica (Urgente, 2 días o menos)
                if hoy <= limite_dt <= hoy + timedelta(days=2):
                    ref_id = f"op_limite_critico_{op.id_registro}"
                    if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                        Notificacion.objects.create(
                            usuario=usuario,
                            tipo="urgente",
                            id_modulo_id=1,
                            titulo="Fecha límite de oportunidad CRÍTICA",
                            descripcion=f"La oportunidad {op.codigo or op.id_registro} vence en menos de 48 horas (límite: {limite_dt}). Por favor, priorizar la presentación.",
                            referencia_id=ref_id,
                            metadata={"id_registro": op.id_registro, "codigo": op.codigo, "tipo_alerta": "limite_oportunidad_critico"}
                        )
                # 2. Alerta Preventiva (Atención, 5 días o menos)
                elif hoy <= limite_dt <= hoy + timedelta(days=5):
                    ref_id = f"op_limite_preventivo_{op.id_registro}"
                    if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                        Notificacion.objects.create(
                            usuario=usuario,
                            tipo="atencion",
                            id_modulo_id=1,
                            titulo="Fecha límite de oportunidad por vencer",
                            descripcion=f"La oportunidad {op.codigo or op.id_registro} tiene fecha límite de presentación el {limite_dt} (en menos de 5 días).",
                            referencia_id=ref_id,
                            metadata={"id_registro": op.id_registro, "codigo": op.codigo, "tipo_alerta": "limite_oportunidad_preventivo"}
                        )

        # C. Alertas de Retraso / Inactividad de Cotizaciones
        # Filtramos cotizaciones pendientes del año 2026 del comercial correspondiente
        cotis_inactivas = Cotizacion.objects.using("default").filter(
            id_estado_id=2,
            anno=2026,
            id_comercial=usuario
        )

        for coti in cotis_inactivas:
            dias_transcurridos = (hoy - coti.fecha.date()).days
            
            # Verificar si han transcurrido múltiplos de 15 días (ej: 15, 30, 45, 60...)
            if dias_transcurridos > 0 and dias_transcurridos % 15 == 0:
                # Caso 1: Pendiente de Seguimiento (estado_envio == 2, es decir, enviada al cliente)
                if coti.estado_envio == 2:
                    ref_id = f"coti_delay_seg_{coti.id_registro}_{dias_transcurridos}"
                    if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                        Notificacion.objects.create(
                            usuario=usuario,
                            tipo="atencion",
                            id_modulo_id=1,
                            titulo="Cotización pendiente de seguimiento",
                            descripcion=f"La cotización {coti.codigo or coti.id_registro} lleva {dias_transcurridos} días en estado Pendiente. Se sugiere realizar seguimiento comercial.",
                            referencia_id=ref_id,
                            metadata={"id_registro": coti.id_registro, "codigo": coti.codigo, "tipo_alerta": "delay_coti_seguimiento"}
                        )
                # Caso 2: Pendiente de Envío (estado_envio es 1, 0 o None, no enviada al cliente)
                elif coti.estado_envio != 2:
                    ref_id = f"coti_delay_env_{coti.id_registro}_{dias_transcurridos}"
                    if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                        Notificacion.objects.create(
                            usuario=usuario,
                            tipo="atencion",
                            id_modulo_id=1,
                            titulo="Cotización pendiente de envío al cliente",
                            descripcion=f"La cotización {coti.codigo or coti.id_registro} fue creada hace {dias_transcurridos} días y aún figura como 'Pendiente de Envío'. Por favor, verificar y enviar al cliente.",
                            referencia_id=ref_id,
                            metadata={"id_registro": coti.id_registro, "codigo": coti.codigo, "tipo_alerta": "delay_coti_envio"}
                        )

        # D. Oportunidades sin cotización formal (> 7 días)
        ops_sin_coti = Cotizacion.objects.using("default").filter(
            id_estado_id=11,
            estado_oportunidad=1,
            anno=2026,
            fecha__lte=timezone.now() - timedelta(days=7),
            id_comercial=usuario
        )

        for op in ops_sin_coti:
            ref_id = f"op_no_convert_{op.id_registro}"
            if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                dias_abierta = (hoy - op.fecha.date()).days
                Notificacion.objects.create(
                    usuario=usuario,
                    tipo="informativo",
                    id_modulo_id=1,
                    titulo="Sugerencia: Convertir oportunidad",
                    descripcion=f"La oportunidad {op.codigo or op.id_registro} lleva {dias_abierta} días abierta sin emitirse como cotización. Se recomienda formalizar oferta.",
                    referencia_id=ref_id,
                    metadata={"id_registro": op.id_registro, "codigo": op.codigo, "tipo_alerta": "sugerencia_conversion"}
                )

        # E. Recordatorio de Visita Técnica programada (3 días de anticipación)
        oportunidades_visita = Cotizacion.objects.using("default").filter(
            id_estado_id=11,
            estado_oportunidad=1,
            visita_tecnica__isnull=False,
            anno=2026,
            id_comercial=usuario
        )

        for op in oportunidades_visita:
            visita_dt = op.visita_tecnica.date() if hasattr(op.visita_tecnica, "date") else op.visita_tecnica
            if visita_dt and visita_dt == hoy + timedelta(days=3):
                ref_id = f"op_visita_{op.id_registro}"
                if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                    Notificacion.objects.create(
                        usuario=usuario,
                        tipo="informativo",
                        id_modulo_id=1,
                        titulo="Recordatorio de Visita Técnica",
                        descripcion=f"En 3 días (el {visita_dt}) tienes programada la visita técnica para la oportunidad {op.codigo or op.id_registro} del cliente {op.id_cliente.nombre if op.id_cliente else 'S/C'}.",
                        referencia_id=ref_id,
                        metadata={"id_registro": op.id_registro, "codigo": op.codigo, "tipo_alerta": "visita_tecnica"}
                    )

        # F. Alertas del Bloque de Aperturas
        # Obtenemos las aperturas activas del comercial correspondiente
        aperturas_activas = CotizacionApertura.objects.using("default").filter(
            estado_orden__in=[1, 2, 3], # 1: Pendiente, 2: Aprobada, 3: Facturada
            id_registro__anno=2026,
            id_registro__id_comercial=usuario
        ).select_related('id_registro')
            
        for ap in aperturas_activas:
            coti = ap.id_registro
            if not coti:
                continue
                
            # Determinar fecha de inicio/apertura usando la trazabilidad
            seg = coti.seguimientos.filter(detalle__icontains="Apertura").order_by('fecha').first()
            f_apertura = seg.fecha.date() if seg else coti.fecha.date()
            dias_transcurridos = (hoy - f_apertura).days
            
            # 1. Apertura Pendiente Prolongada (estado_orden == 1, modulo 15 días)
            if ap.estado_orden == 1:
                if dias_transcurridos > 0 and dias_transcurridos % 15 == 0:
                    ref_id = f"ap_delay_pend_{ap.id_apertura}_{dias_transcurridos}"
                    if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                        Notificacion.objects.create(
                            usuario=usuario,
                            tipo="atencion",
                            id_modulo_id=1,
                            titulo="Orden de apertura pendiente prolongada",
                            descripcion=f"La orden de apertura para la cotización {coti.codigo or coti.id_registro} del cliente {coti.id_cliente.nombre if coti.id_cliente else 'S/C'} continúa en estado Pendiente después de {dias_transcurridos} días.",
                            referencia_id=ref_id,
                            metadata={"id_registro": coti.id_registro, "codigo": coti.codigo, "tipo_alerta": "apertura_pendiente_prolongada"}
                        )
            
            # 2. Apertura sin número de Orden de Compra (OC) registrado (modulo 7 días, desde el día 7)
            if not ap.numero_orden:
                if dias_transcurridos >= 7 and dias_transcurridos % 7 == 0:
                    ref_id = f"ap_no_oc_{ap.id_apertura}_{dias_transcurridos}"
                    if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                        Notificacion.objects.create(
                            usuario=usuario,
                            tipo="atencion",
                            id_modulo_id=1,
                            titulo="Orden de apertura sin OC registrada",
                            descripcion=f"La orden de apertura para la cotización {coti.codigo or coti.id_registro} del cliente {coti.id_cliente.nombre if coti.id_cliente else 'S/C'} no tiene un número de Orden de Compra (OC) registrado después de {dias_transcurridos} días.",
                            referencia_id=ref_id,
                            metadata={"id_registro": coti.id_registro, "codigo": coti.codigo, "tipo_alerta": "apertura_sin_oc"}
                        )
            
            # 3. Vencimiento de Fecha de Entrega Real (fecha_entrega)
            if ap.fecha_entrega:
                entrega_dt = ap.fecha_entrega.date() if hasattr(ap.fecha_entrega, "date") else ap.fecha_entrega
                if entrega_dt:
                    # A. Alerta Crítica (Urgente, 2 días o menos)
                    if hoy <= entrega_dt <= hoy + timedelta(days=2):
                        ref_id = f"ap_entrega_crit_{ap.id_apertura}"
                        if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                            Notificacion.objects.create(
                                usuario=usuario,
                                tipo="urgente",
                                id_modulo_id=1,
                                titulo="Plazo de Entrega Real CRÍTICO",
                                descripcion=f"CRÍTICO: El plazo de Entrega Real para la orden de apertura OC: {ap.numero_orden or coti.codigo} del cliente {coti.id_cliente.nombre if coti.id_cliente else 'S/C'} vence en menos de 48 horas (límite: {entrega_dt}).",
                                referencia_id=ref_id,
                                metadata={"id_registro": coti.id_registro, "codigo": coti.codigo, "tipo_alerta": "apertura_entrega_critico"}
                            )
                    # B. Alerta Preventiva (Atención, 5 días o menos)
                    elif hoy <= entrega_dt <= hoy + timedelta(days=5):
                        ref_id = f"ap_entrega_prev_{ap.id_apertura}"
                        if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                            Notificacion.objects.create(
                                usuario=usuario,
                                tipo="atencion",
                                id_modulo_id=1,
                                titulo="Plazo de Entrega Real por vencer",
                                descripcion=f"El plazo de Entrega Real para la orden de apertura OC: {ap.numero_orden or coti.codigo} del cliente {coti.id_cliente.nombre if coti.id_cliente else 'S/C'} vence el {entrega_dt} (en menos de 5 días).",
                                referencia_id=ref_id,
                                metadata={"id_registro": coti.id_registro, "codigo": coti.codigo, "tipo_alerta": "apertura_entrega_preventivo"}
                            )

    # GENERAR ALERTAS DE LOGÍSTICA
    if has_logistica:
        # A. Stock Crítico (Usando el modelo Producto de core)
        articulos_criticos = Producto.objects.using("default").filter(
            activo=1,
            stock_min__gt=0,
            cantidad__lt=models.F('stock_min')
        )[:30]
        
        for art in articulos_criticos:
            ref_id = f"stock_critico_{art.id_producto}"
            if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                Notificacion.objects.create(
                    usuario=usuario,
                    tipo="atencion",
                    id_modulo_id=2,
                    titulo=f"Stock crítico: {art.codigo or art.id_producto}",
                    descripcion=f"El artículo '{art.nombre}' está por debajo de su stock mínimo. Stock actual: {art.cantidad}, mínimo requerido: {art.stock_min}.",
                    referencia_id=ref_id,
                    metadata={"articulo_reg": art.id_producto, "articulo_cod": art.codigo, "tipo_alerta": "stock_critico"}
                )

        # B. Nuevos Movimientos de Almacén Recientes (últimos 2 días)
        movimientos_recientes = LogisticaDashboard.objects.using("default").filter(
            fec__gte=hoy - timedelta(days=2)
        )
        for mov in movimientos_recientes:
            ref_id = f"log_mov_{mov.num_reg}"
            if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                op_desc = "Entrada" if mov.ope == "E" else "Salida"
                simbolo = "S/." if mov.tmo == "S" else "US$"
                monto = mov.sol if mov.tmo == "S" else mov.dol
                Notificacion.objects.create(
                    usuario=usuario,
                    tipo="informativo",
                    id_modulo_id=2,
                    titulo=f"Nuevo movimiento de almacén: {op_desc}",
                    descripcion=f"Se registró una {op_desc.lower()} #{mov.num_reg} el {mov.fec} por un valor de {simbolo} {monto or 0.00}.",
                    referencia_id=ref_id,
                    metadata={"num_reg": mov.num_reg, "operacion": mov.ope, "tipo_alerta": "nuevo_movimiento"}
                )

        # C. Alertas / Sugerencias de Logística
        # 1. Almacén Inactivo (Si no hay movimientos en los últimos 7 días)
        hay_movimiento_reciente = LogisticaDashboard.objects.using("default").filter(
            fec__gte=hoy - timedelta(days=7)
        ).exists()
        
        if not hay_movimiento_reciente:
            ref_id = "log_inactividad_general"
            if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                Notificacion.objects.create(
                    usuario=usuario,
                    tipo="atencion",
                    id_modulo_id=2,
                    titulo="Almacén sin actividad reciente",
                    descripcion="No se han registrado entradas ni salidas de inventario en los últimos 7 días. Se sugiere revisar ordenes pendientes.",
                    referencia_id=ref_id,
                    metadata={"tipo_alerta": "inactividad_almacen"}
                )

        # 2. Sugerencias de Sobrestock / Stock Inactivo
        articulos_sobrestock = Producto.objects.using("default").filter(
            activo=1,
            cantidad__gt=80
        )[:5]
        
        for art in articulos_sobrestock:
            codigo_prod = art.codigo or str(art.id_producto)
            detalles_salida_recientes = LogisticaDashboardDetalle.objects.using("default").filter(
                cod=codigo_prod,
                num_reg__in=LogisticaDashboard.objects.using("default").filter(ope='S', fec__gte=hoy - timedelta(days=30)).values_list("num_reg", flat=True)
            ).exists()
            
            if not detalles_salida_recientes:
                ref_id = f"stock_inactivo_{art.id_producto}"
                if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                    Notificacion.objects.create(
                        usuario=usuario,
                        tipo="informativo",
                        id_modulo_id=2,
                        titulo="Sugerencia: Stock sin rotación",
                        descripcion=f"El artículo '{art.nombre}' tiene un stock acumulado de {art.cantidad} unidades y no registra salidas en los últimos 30 días.",
                        referencia_id=ref_id,
                        metadata={"articulo_reg": art.id_producto, "articulo_cod": art.codigo, "tipo_alerta": "stock_inactivo"}
                    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notificaciones_usuario(request):
    usuario = request.user
    
    # En la carga normal de la página (F5) no regeneramos notificaciones
    # para evitar duplicidad y mejorar el rendimiento de la aplicación.
    # Las notificaciones se calculan a través del comando enviar_alertas_diarias.

    notificaciones = Notificacion.objects.filter(usuario=usuario)[:30]
    serializer = NotificacionSerializer(notificaciones, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def marcar_notificacion(request, pk):
    try:
        notif = Notificacion.objects.get(pk=pk, usuario=request.user)
        notif.leido = True
        notif.save()
        return Response({"ok": True})
    except Notificacion.DoesNotExist:
        return Response({"error": "No encontrada"}, status=404)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notificaciones_no_leidas(request):
    # En la consulta de conteo no regeneramos notificaciones en local
    pass
        
    total = Notificacion.objects.filter(
        usuario=request.user,
        leido=False
    ).count()
    return Response({"total": total})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def marcar_todas_notificaciones(request):
    Notificacion.objects.filter(
        usuario=request.user,
        leido=False
    ).update(leido=True)
    return Response({"ok": True})

def tracking_pixel_notificacion(request, pk):
    try:
        notif = Notificacion.objects.get(pk=pk)
        if not notif.leido:
            notif.leido = True
            notif.save()
    except Notificacion.DoesNotExist:
        pass

    # GIF de 1x1 transparente
    pixel_data = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x4c\x01\x00\x3b'
    return HttpResponse(pixel_data, content_type="image/gif")

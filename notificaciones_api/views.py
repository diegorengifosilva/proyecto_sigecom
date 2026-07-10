from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import date, timedelta
from django.utils import timezone
from django.db import models
import calendar

from .models import Notificacion
from .serializers import NotificacionSerializer
from cotizaciones_api.models import Cotizacion
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

    # GENERAR ALERTAS COMERCIALES
    if has_comercial:
        # A. Validez de Oferta (cotizaciones pendientes: id_estado_id = 2)
        # Filtramos por las cotizaciones creadas en los últimos 90 días para evitar excesivas lecturas
        cotis_pendientes = Cotizacion.objects.using("default").filter(
            id_estado_id=2,
            validez_oferta__isnull=False,
            fecha__gte=timezone.now() - timedelta(days=90)
        )
        
        # Si no es acceso total, filtramos por sus propias cotizaciones
        if not has_total_access:
            cotis_pendientes = cotis_pendientes.filter(id_comercial=usuario)

        for coti in cotis_pendientes:
            exp_date = calculate_target_date(coti.fecha, coti.validez_oferta, coti.id_unidad_tiempo_validez.codigo if coti.id_unidad_tiempo_validez else 'D')
            if exp_date:
                # Alerta por vencer (próximos 3 días)
                if hoy <= exp_date <= hoy + timedelta(days=3):
                    ref_id = f"coti_val_{coti.id_registro}"
                    if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                        Notificacion.objects.create(
                            usuario=usuario,
                            tipo="atencion",
                            modulo="comercial",
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
                            modulo="comercial",
                            titulo="Cotización con oferta vencida",
                            descripcion=f"La oferta de la cotización {coti.codigo or coti.id_registro} expiró el {exp_date}.",
                            referencia_id=ref_id,
                            metadata={"id_registro": coti.id_registro, "codigo": coti.codigo, "tipo_alerta": "validez_vencida"}
                        )

        # B. Límite de Oportunidad (id_estado_id = 11, estado_oportunidad = 1)
        oportunidades = Cotizacion.objects.using("default").filter(
            id_estado_id=11,
            estado_oportunidad=1,
            fecha_limite__isnull=False
        )
        if not has_total_access:
            oportunidades = oportunidades.filter(id_comercial=usuario)

        for op in oportunidades:
            limite_dt = op.fecha_limite.date() if hasattr(op.fecha_limite, "date") else op.fecha_limite
            if limite_dt:
                if hoy <= limite_dt <= hoy + timedelta(days=2):
                    ref_id = f"op_limite_{op.id_registro}"
                    if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                        Notificacion.objects.create(
                            usuario=usuario,
                            tipo="urgente",
                            modulo="comercial",
                            titulo="Fecha límite de oportunidad por vencer",
                            descripcion=f"La oportunidad {op.codigo or op.id_registro} tiene fecha límite de presentación el {limite_dt}.",
                            referencia_id=ref_id,
                            metadata={"id_registro": op.id_registro, "codigo": op.codigo, "tipo_alerta": "limite_oportunidad"}
                        )

        # C. Sugerencias Comerciales / Alertas de Retraso
        # 1. Cotizaciones pendientes por mucho tiempo (> 15 días)
        cotis_demoradas = Cotizacion.objects.using("default").filter(
            id_estado_id=2,
            fecha__lte=timezone.now() - timedelta(days=15),
            fecha__gte=timezone.now() - timedelta(days=120)
        )
        if not has_total_access:
            cotis_demoradas = cotis_demoradas.filter(id_comercial=usuario)

        for coti in cotis_demoradas:
            ref_id = f"coti_delay_{coti.id_registro}"
            if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                dias_pendientes = (hoy - coti.fecha.date()).days
                Notificacion.objects.create(
                    usuario=usuario,
                    tipo="atencion",
                    modulo="comercial",
                    titulo="Cotización pendiente prolongada",
                    descripcion=f"La cotización {coti.codigo or coti.id_registro} lleva {dias_pendientes} días en estado Pendiente. Se sugiere realizar seguimiento comercial.",
                    referencia_id=ref_id,
                    metadata={"id_registro": coti.id_registro, "codigo": coti.codigo, "tipo_alerta": "delay_coti"}
                )

        # 2. Oportunidades sin cotización formal (> 5 días)
        ops_sin_coti = Cotizacion.objects.using("default").filter(
            id_estado_id=11,
            estado_oportunidad=1,
            fecha__lte=timezone.now() - timedelta(days=5),
            fecha__gte=timezone.now() - timedelta(days=60)
        )
        if not has_total_access:
            ops_sin_coti = ops_sin_coti.filter(id_comercial=usuario)

        for op in ops_sin_coti:
            ref_id = f"op_no_convert_{op.id_registro}"
            if not Notificacion.objects.filter(usuario=usuario, referencia_id=ref_id).exists():
                dias_abierta = (hoy - op.fecha.date()).days
                Notificacion.objects.create(
                    usuario=usuario,
                    tipo="informativo",
                    modulo="comercial",
                    titulo="Sugerencia: Convertir oportunidad",
                    descripcion=f"La oportunidad {op.codigo or op.id_registro} lleva {dias_abierta} días abierta sin emitirse como cotización. Se recomienda formalizar oferta.",
                    referencia_id=ref_id,
                    metadata={"id_registro": op.id_registro, "codigo": op.codigo, "tipo_alerta": "sugerencia_conversion"}
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
                    modulo="logistica",
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
                    modulo="logistica",
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
                    modulo="logistica",
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
                        modulo="logistica",
                        titulo="Sugerencia: Stock sin rotación",
                        descripcion=f"El artículo '{art.nombre}' tiene un stock acumulado de {art.cantidad} unidades y no registra salidas en los últimos 30 días.",
                        referencia_id=ref_id,
                        metadata={"articulo_reg": art.id_producto, "articulo_cod": art.codigo, "tipo_alerta": "stock_inactivo"}
                    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notificaciones_usuario(request):
    usuario = request.user
    
    try:
        generar_notificaciones_usuario(usuario)
    except Exception as e:
        print(f"Error generando notificaciones: {e}")

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
    try:
        generar_notificaciones_usuario(request.user)
    except Exception:
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

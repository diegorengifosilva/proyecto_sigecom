# cotizaciones_api/services/legacy_sync.py
import logging
import threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from django.db import connections, transaction
from django.utils import timezone
from cotizaciones_api.models import Cotizacion, CotizacionSuministro, CotizacionServicio, CotizacionMensaje, CotizacionSeguimiento

logger = logging.getLogger(__name__)

# Executor global para tareas en segundo plano
SYNC_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="LegacySyncThread")

# Cerradura global por ID de cotización para evitar concurrencia en escrituras
_cotizacion_locks = defaultdict(threading.Lock)
_locks_lock = threading.Lock()

def get_lock_for_cotizacion(cotizacion_id: int):
    with _locks_lock:
        return _cotizacion_locks[cotizacion_id]


def _sincronizar_suministros_legados(cursor, cotizacion_id: int):
    """
    Elimina e inserta masivamente los suministros de una cotización en la BD legada.
    """
    # 1. Eliminar suministros antiguos de esta cotización
    cursor.execute("DELETE FROM backup_actual.vc_mov_cotizaciones_su WHERE num_reg = %s", [cotizacion_id])

    # 2. Obtener los suministros nuevos de la base local
    suministros = CotizacionSuministro.objects.filter(id_registro=cotizacion_id).order_by('orden')

    if not suministros.exists():
        return

    # 3. Preparar los datos mapeados
    suministros_data = []
    for sumin in suministros:
        # id_tipo_gasto -> mov: si es 1 pasa a '01', si es 2 pasa a '02'
        id_gasto = sumin.id_tipo_gasto_id
        mov = '01' if id_gasto == 1 else '02' if id_gasto == 2 else None

        # total_por_grupo -> tog: si es 1 pasa a '1', si es 0 pasa a '0'
        tog = '1' if sumin.total_por_grupo == 1 else '0'

        # Construcción de cog (4 dígitos): primeros 2 dígitos son el contador de grupo, segundos 2 dígitos dependen de id_tipo_gasto
        prefix = str(sumin.codigo_grupo or 0).zfill(2)
        suffix = '01' if id_gasto == 1 else '02' if id_gasto == 2 else '01'
        cog = prefix + suffix

        suministros_data.append((
            cotizacion_id,                           # num_reg
            cog[:5],                                 # cog
            (sumin.nombre_grupo or "")[:200],        # nog
            sumin.nivel,                             # nig
            sumin.orden,                             # num
            (sumin.codigo_item or "")[:60],          # cod
            (sumin.descripcion or "")[:5000],        # des
            (sumin.proveedor or "")[:50],            # pro
            sumin.cantidad,                          # can
            sumin.costo_precio,                      # puc
            sumin.costo_total,                       # toc
            sumin.porcentaje_utilidad,               # cau
            sumin.utilidad,                          # tou
            sumin.precio_venta,                      # val
            sumin.venta_total,                       # tot
            mov,                                     # mov
            str(sumin.id_marca_id or "")[:2],        # tpr
            (sumin.tipo_unidad or "")[:50],          # tde
            tog,                                     # tog
        ))

    # 4. Inserción masiva eficiente
    sql_sumin = """
        INSERT INTO backup_actual.vc_mov_cotizaciones_su (
            num_reg, cog, nog, nig, num, cod, des, pro, can, puc, toc, cau, tou, val, tot, mov, tpr, tde, tog
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
    """
    cursor.executemany(sql_sumin, suministros_data)
    logger.info(f"[SyncLegado] Replicados {len(suministros_data)} suministros para cotización ID {cotizacion_id}.")


def _sincronizar_servicios_legados(cursor, cotizacion_id: int):
    """
    Elimina e inserta masivamente los servicios de una cotización en la BD legada.
    """
    # 1. Eliminar servicios antiguos de esta cotización
    cursor.execute("DELETE FROM backup_actual.vc_mov_cotizaciones_mo WHERE num_reg = %s", [cotizacion_id])

    # 2. Obtener los servicios nuevos de la base local
    servicios = CotizacionServicio.objects.filter(id_registro=cotizacion_id).order_by('orden', 'id_servicio')

    if not servicios.exists():
        return

    # 3. Preparar los datos mapeados
    servicios_data = []
    for serv in servicios:
        # id_tipo_gasto -> mov: si es 1->'01', 2->'02', 3->'04', 4->'05', 5->'06'
        id_gasto = serv.id_tipo_gasto_id
        mov_map = {1: '01', 2: '02', 3: '04', 4: '05', 5: '06'}
        mov = mov_map.get(id_gasto, None)

        # nog: Si nivel == 0 se pasa nombre_servicio, de lo contrario string vacío
        nog = (serv.nombre_servicio or "")[:200] if serv.nivel == 0 else ""

        # id_area -> tpr como string, cantidad_dias -> tde como decimal
        tpr = str(serv.id_area_id or "")[:1]
        tde = serv.cantidad_dias

        servicios_data.append((
            cotizacion_id,                             # num_reg
            (serv.codigo_servicio or "")[:5],          # cog
            nog,                                       # nog
            serv.nivel,                                # nig
            serv.orden or 0,                           # num
            (serv.codigo_item or "")[:60],             # cod
            (serv.descripcion_item or "")[:100],       # des
            str(serv.horas or "")[:50],                # pro
            serv.cantidad_hombres,                     # can
            serv.costo_hombre_dia,                     # puc
            serv.costo_total,                          # toc
            serv.porcentaje,                           # cau
            serv.utilidad,                             # tou
            serv.cotizado_hombre_dia,                  # val
            serv.cotizado_total,                       # tot
            mov,                                       # mov
            tpr,                                       # tpr
            tde,                                       # tde
            serv.descripcion_servicio,                 # tog
        ))

    # 4. Inserción masiva eficiente
    sql_serv = """
        INSERT INTO backup_actual.vc_mov_cotizaciones_mo (
            num_reg, cog, nog, nig, num, cod, des, pro, can, puc, toc, cau, tou, val, tot, mov, tpr, tde, tog
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
    """
    cursor.executemany(sql_serv, servicios_data)
    logger.info(f"[SyncLegado] Replicados {len(servicios_data)} servicios para cotización ID {cotizacion_id}.")


def _sincronizar_mensajes_legados(cursor, cotizacion_id: int):
    """
    Elimina e inserta masivamente los mensajes de una cotización en la BD legada.
    """
    # 1. Eliminar mensajes antiguos de esta cotización
    cursor.execute("DELETE FROM backup_actual.vc_mov_cotizaciones_msj WHERE num_reg = %s", [str(cotizacion_id)])

    # 2. Obtener los mensajes nuevos de la base local
    mensajes = CotizacionMensaje.objects.filter(id_registro=cotizacion_id).select_related('id_usuario').order_by('fecha', 'id_mensaje')

    if not mensajes.exists():
        return

    # 3. Preparar los datos mapeados
    mensajes_data = []
    for msj_obj in mensajes:
        username = msj_obj.id_usuario.usuario if msj_obj.id_usuario else None
        mensajes_data.append((
            str(cotizacion_id),                     # num_reg
            msj_obj.fecha,                          # dat
            (username or "")[:20],                  # cod
            (msj_obj.mensaje or "")[:500],          # msj
            str(msj_obj.activo or "1")[:1],         # act
        ))

    # 4. Inserción masiva eficiente
    sql_msj = """
        INSERT INTO backup_actual.vc_mov_cotizaciones_msj (
            num_reg, dat, cod, msj, act
        ) VALUES (
            %s, %s, %s, %s, %s
        )
    """
    cursor.executemany(sql_msj, mensajes_data)
    logger.info(f"[SyncLegado] Replicados {len(mensajes_data)} mensajes para cotización ID {cotizacion_id}.")


def _sincronizar_seguimientos_legados(cursor, cotizacion_id: int):
    """
    Elimina e inserta masivamente los seguimientos de una cotización en la BD legada.
    """
    # 1. Eliminar seguimientos antiguos de esta cotización
    cursor.execute("DELETE FROM backup_actual.vc_mov_cotizaciones_vi WHERE num_reg = %s", [cotizacion_id])

    # 2. Obtener los seguimientos nuevos de la base local
    seguimientos = CotizacionSeguimiento.objects.filter(id_registro=cotizacion_id).select_related('id_usuario').order_by('fecha', 'id_seguimiento')

    if not seguimientos.exists():
        return

    # 3. Preparar los datos mapeados
    seguimientos_data = []
    for idx, seg in enumerate(seguimientos, 1):
        username = seg.id_usuario.usuario if seg.id_usuario else None
        dt_val = seg.fecha
        fec_val = dt_val.date()
        hor_val = dt_val.strftime('%H:%M:%S')[:10]

        seguimientos_data.append((
            cotizacion_id,                          # num_reg
            idx,                                    # num
            dt_val,                                 # dat
            fec_val,                                # fec
            hor_val,                                # hor
            (seg.detalle or "")[:700],              # des
            (username or "")[:30],                  # cod
            str(seg.activo or "1")[:1],             # act
        ))

    # 4. Inserción masiva eficiente
    sql_seg = """
        INSERT INTO backup_actual.vc_mov_cotizaciones_vi (
            num_reg, num, dat, fec, hor, des, cod, act
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s
        )
    """
    cursor.executemany(sql_seg, seguimientos_data)
    logger.info(f"[SyncLegado] Replicados {len(seguimientos_data)} seguimientos para cotización ID {cotizacion_id}.")


def _ejecutar_sincronizacion_legada(cotizacion_id: int):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Traduce la cotización de proyecto_sigecom.cotizaciones e inserta o actualiza
    en la tabla legado backup_actual.vc_mov_cotizaciones.
    """
    lock = get_lock_for_cotizacion(cotizacion_id)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando sincronización para cotización ID: {cotizacion_id}")

        # 1. Obtener la cotización con relaciones optimizadas
        cot = (
            Cotizacion.objects.filter(id_registro=cotizacion_id)
            .select_related("id_cliente", "id_representante", "id_comercial", "id_tecnico", "id_creador")
            .first()
        )

        if not cot:
            logger.warning(f"[SyncLegado] Cotización ID {cotizacion_id} no encontrada en base de datos local.")
            return

        # 2. Resolución de usuarios y sus equivalentes de texto plano (DNI/Username)
        comercial = cot.id_comercial
        codic = (comercial.dni or "")[:8] if comercial else ""
        nombc = (comercial.nombre_completo or "")[:70] if comercial else ""
        telec = (comercial.telefono or "")[:50] if comercial else ""
        mov1c = (comercial.movil_coorporativo or "")[:50] if comercial else ""
        mov2c = (comercial.movil_personal or "")[:50] if comercial else ""
        mailc = (comercial.correo or "")[:70] if comercial else ""

        tecnico = cot.id_tecnico
        codit = (tecnico.dni or "")[:8] if tecnico else ""
        nombt = (tecnico.nombre_completo or "")[:70] if tecnico else ""
        telet = (tecnico.telefono or "")[:50] if tecnico else ""
        mov1t = (tecnico.movil_coorporativo or "")[:50] if tecnico else ""
        mov2t = (tecnico.movil_personal or "")[:50] if tecnico else ""
        mailt = (tecnico.correo or "")[:70] if tecnico else ""

        creador = cot.id_creador
        regus = (creador.usuario or "")[:200] if creador else ""

        # 3. Traducción de unidades de tiempo a códigos legados ('D', 'S', 'M')
        # DI -> D (Días), SE -> S (Semanas), ME -> M (Meses)
        map_unidad = {'DI': 'D', 'SE': 'S', 'ME': 'M'}

        ut_sum = cot.id_unidad_tiempo_entrega_suministros
        tot_d = map_unidad.get(ut_sum.codigo, 'D') if ut_sum else 'D'

        ut_ser = cot.id_unidad_tiempo_entrega_servicios
        tot_s = map_unidad.get(ut_ser.codigo, 'D') if ut_ser else 'D'

        ut_val = cot.id_unidad_tiempo_validez
        acu_s = map_unidad.get(ut_val.codigo, 'D') if ut_val else 'D'

        # 4. Inversión de estados, áreas y mapeo de envío
        state_val = cot.id_estado_id
        estad = "0" if state_val == 10 else (str(state_val) if state_val is not None else "0")

        area_val = cot.id_area
        area = "0" if area_val == 10 else (str(area_val) if area_val is not None else "0")

        # Mapeo de estado_envio: 1 -> 0, 2 -> 3
        envio_map = {1: 0, 2: 3}
        envio_legacy = envio_map.get(cot.estado_envio, 0)

        # 5. Descuentos y fechas
        des_a = "S" if cot.descuento_aplica == 1 else "N"
        des_t = (cot.descuento_afecto or "N")[:1]
        des_m = cot.descuento_monto or 0.00
        des_p = cot.descuento_porcentaje or 0.00

        cotif = cot.fecha.date() if cot.fecha else timezone.now().date()
        fecus = timezone.now().date()

        # 6. Preparar sentencia SQL con ON DUPLICATE KEY UPDATE
        # Nota: Usamos INSERT INTO backup_actual.vc_mov_cotizaciones.
        sql = """
            INSERT INTO backup_actual.vc_mov_cotizaciones (
                num_reg, anno, mes, cotin, cotit, cotif, refer, empre, codir, nombr, cargr, teler, movir, mailr,
                codic, nombc, telec, mov1c, mov2c, mailc,
                codit, nombt, telet, mov1t, mov2t, mailt,
                fpago, lugar, plazo, tmone, igv, valid, por_c,
                tot_c, tot_d, tot_s, estad, area, regus, fecus, tcamb, sald,
                des_a, des_t, des_m, des_p, anno_a, msj, seg, prob, envio
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON DUPLICATE KEY UPDATE
                anno = VALUES(anno),
                mes = VALUES(mes),
                cotin = VALUES(cotin),
                cotit = VALUES(cotit),
                cotif = VALUES(cotif),
                refer = VALUES(refer),
                empre = VALUES(empre),
                codir = VALUES(codir),
                nombr = VALUES(nombr),
                cargr = VALUES(cargr),
                teler = VALUES(teler),
                movir = VALUES(movir),
                mailr = VALUES(mailr),
                codic = VALUES(codic),
                nombc = VALUES(nombc),
                telec = VALUES(telec),
                mov1c = VALUES(mov1c),
                mov2c = VALUES(mov2c),
                mailc = VALUES(mailc),
                codit = VALUES(codit),
                nombt = VALUES(nombt),
                telet = VALUES(telet),
                mov1t = VALUES(mov1t),
                mov2t = VALUES(mov2t),
                mailt = VALUES(mailt),
                fpago = VALUES(fpago),
                lugar = VALUES(lugar),
                plazo = VALUES(plazo),
                tmone = VALUES(tmone),
                igv = VALUES(igv),
                valid = VALUES(valid),
                por_c = VALUES(por_c),
                tot_c = VALUES(tot_c),
                tot_d = VALUES(tot_d),
                tot_s = VALUES(tot_s),
                estad = VALUES(estad),
                area = VALUES(area),
                regus = VALUES(regus),
                fecus = VALUES(fecus),
                tcamb = VALUES(tcamb),
                sald = VALUES(sald),
                des_a = VALUES(des_a),
                des_t = VALUES(des_t),
                des_m = VALUES(des_m),
                des_p = VALUES(des_p),
                anno_a = VALUES(anno_a),
                msj = VALUES(msj),
                seg = VALUES(seg),
                prob = VALUES(prob),
                envio = VALUES(envio);
        """

        params = (
            cot.id_registro,
            str(cot.anno or cotif.year)[:4],
            str(cot.mes or cotif.month).zfill(2)[:2],
            (cot.codigo or "")[:70],
            (cot.id_tipo_id or "")[:1],
            cotif,
            (cot.referencia or "")[:150],
            str(cot.id_cliente_id or "")[:5],
            str(cot.id_representante_id or "")[:5],
            (cot.representante_nombre or "")[:70],
            (cot.representante_cargo or "")[:70],
            (cot.representante_telefono or "")[:50],
            (cot.representante_movil or "")[:50],
            (cot.representante_correo or "")[:50],
            codic, nombc, telec, mov1c, mov2c, mailc,
            codit, nombt, telet, mov1t, mov2t, mailt,
            (cot.forma_pago or "")[:100],
            (cot.lugar or "")[:50],
            cot.entrega_suministros,
            (cot.tipo_moneda or "S")[:1],
            (cot.igv or "N")[:1],
            cot.validez_oferta,
            cot.entrega_servicios,
            cot.total_cotizacion or 0.00,
            tot_d[:1],
            tot_s[:1],
            estad[:1],
            area[:1],
            regus,
            fecus,
            cot.tipo_cambio or 1.000,
            cot.saldo or 0.00,
            des_a,
            des_t,
            des_m,
            des_p,
            str(cot.año_apertura or cotif.year)[:4],
            cot.mensajes,
            cot.seguimiento,
            str(cot.probabilidad or "0")[:1],
            envio_legacy,
        )

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            # A. Sincronizar cabecera
            cursor.execute(sql, params)

            # B. Sincronizar suministros asociados
            _sincronizar_suministros_legados(cursor, cot.id_registro)

            # C. Sincronizar servicios asociados
            _sincronizar_servicios_legados(cursor, cot.id_registro)

            # D. Sincronizar mensajes asociados
            _sincronizar_mensajes_legados(cursor, cot.id_registro)

            # E. Sincronizar seguimientos asociados
            _sincronizar_seguimientos_legados(cursor, cot.id_registro)

        # 7. Marcar como sincronizado localmente sin disparar de nuevo señales
        # Usamos .update() para evitar disparar señales recursivas de post_save
        Cotizacion.objects.filter(id_registro=cot.id_registro).update(sincronizado_old_db=1)
        logger.info(f"[SyncLegado] Sincronización exitosa (cabecera, suministros, servicios, mensajes y seguimientos) para cotización ID {cot.id_registro}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la sincronización de cotización ID {cotizacion_id}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_sincronizacion_legada(cotizacion_id: int):
    """
    Registra la tarea de sincronización para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_sincronizacion_legada, cotizacion_id))
        logger.debug(f"[SyncLegado] Tarea de sincronización registrada en on_commit para cotización ID: {cotizacion_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la sincronización para cotización ID {cotizacion_id}: {str(e)}", exc_info=True)


def _ejecutar_eliminacion_legada(cotizacion_id: int):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Elimina los registros correspondientes en la BD legada backup_actual.
    """
    lock = get_lock_for_cotizacion(cotizacion_id)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando eliminación legada para cotización ID: {cotizacion_id}")

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute("DELETE FROM backup_actual.vc_mov_cotizaciones_su WHERE num_reg = %s", [cotizacion_id])
            cursor.execute("DELETE FROM backup_actual.vc_mov_cotizaciones_mo WHERE num_reg = %s", [cotizacion_id])
            cursor.execute("DELETE FROM backup_actual.vc_mov_cotizaciones_msj WHERE num_reg = %s", [cotizacion_id])
            cursor.execute("DELETE FROM backup_actual.vc_mov_cotizaciones_vi WHERE num_reg = %s", [cotizacion_id])
            cursor.execute("DELETE FROM backup_actual.vc_mov_cotizaciones WHERE num_reg = %s", [cotizacion_id])

        logger.info(f"[SyncLegado] Eliminación legada exitosa para cotización ID {cotizacion_id}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la eliminación legada de cotización ID {cotizacion_id}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_eliminacion_legada(cotizacion_id: int):
    """
    Registra la tarea de eliminación para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_eliminacion_legada, cotizacion_id))
        logger.debug(f"[SyncLegado] Tarea de eliminación registrada en on_commit para cotización ID: {cotizacion_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la eliminación legada para cotización ID {cotizacion_id}: {str(e)}", exc_info=True)


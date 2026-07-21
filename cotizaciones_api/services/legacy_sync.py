# cotizaciones_api/services/legacy_sync.py
import logging
import threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from django.db import connections, transaction
from django.utils import timezone
from cotizaciones_api.models import Cotizacion, CotizacionSuministro, CotizacionServicio, CotizacionMensaje, CotizacionSeguimiento
from core.models import Cliente, Representante, TipoMarca, TipoPersonal, TipoGastoDetalle, Producto
from users.models import Usuario

logger = logging.getLogger(__name__)

# Executor global para tareas en segundo plano
SYNC_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="LegacySyncThread")

# Cerradura global por ID de cotización para evitar concurrencia en escrituras
_cotizacion_locks = defaultdict(threading.Lock)
_locks_lock = threading.Lock()

def get_lock_for_cotizacion(cotizacion_id: int):
    with _locks_lock:
        return _cotizacion_locks[cotizacion_id]

# Cerradura global por ID de cliente
_cliente_locks = defaultdict(threading.Lock)
_cliente_locks_lock = threading.Lock()

def get_lock_for_cliente(cliente_id: int):
    with _cliente_locks_lock:
        return _cliente_locks[cliente_id]

# Cerradura global por ID de representante
_representante_locks = defaultdict(threading.Lock)
_representante_locks_lock = threading.Lock()

def get_lock_for_representante(representante_id: int):
    with _representante_locks_lock:
        return _representante_locks[representante_id]

# Cerradura global por ID de marca
_marca_locks = defaultdict(threading.Lock)
_marca_locks_lock = threading.Lock()

def get_lock_for_marca(marca_id: int):
    with _marca_locks_lock:
        return _marca_locks[marca_id]

# Cerradura global por código de tipo de personal
_personal_locks = defaultdict(threading.Lock)
_personal_locks_lock = threading.Lock()

def get_lock_for_personal(codigo: str):
    with _personal_locks_lock:
        return _personal_locks[str(codigo)]

# Cerradura global por código de detalle de tipo de gasto
_gasto_detalle_locks = defaultdict(threading.Lock)
_gasto_detalle_locks_lock = threading.Lock()

def get_lock_for_gasto_detalle(codigo: str):
    with _gasto_detalle_locks_lock:
        return _gasto_detalle_locks[str(codigo)]

# Cerradura global por nombre de usuario
_usuario_locks = defaultdict(threading.Lock)
_usuario_locks_lock = threading.Lock()

def get_lock_for_usuario(username: str):
    with _usuario_locks_lock:
        return _usuario_locks[str(username)]

# Cerradura global por código de producto
_producto_locks = defaultdict(threading.Lock)
_producto_locks_lock = threading.Lock()

def get_lock_for_producto(codigo: str):
    with _producto_locks_lock:
        return _producto_locks[str(codigo)]









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
            str(sumin.id_marca_id or 0).zfill(2)[:2], # tpr
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


def _ejecutar_sincronizacion_cliente_legado(cliente_id: int):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Traduce el cliente local e inserta o actualiza
    en la tabla legado backup_actual.vc_tab_clientes.
    """
    lock = get_lock_for_cliente(cliente_id)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando sincronización de cliente ID: {cliente_id}")

        cliente = Cliente.objects.filter(id_cliente=cliente_id).first()
        if not cliente:
            logger.warning(f"[SyncLegado] Cliente ID {cliente_id} no encontrado en base de datos local.")
            return

        codigo = int(cliente.id_cliente)
        nombre = (cliente.nombre or "")[:70]
        iniciales = (cliente.iniciales or "")[:20]
        ruc = (cliente.ruc or "")[:15]
        direccion = (cliente.direccion or "")[:200]
        tipo = str(cliente.tipo if cliente.tipo is not None else "")[:2]
        forma_pago = (cliente.forma_pago or "")[:100]
        fecha = cliente.fecha_ingreso.date() if cliente.fecha_ingreso else None
        pagina_web = (cliente.pagina_web or "")[:100]
        representante_legal = (cliente.representante_legal or "")[:100]
        ubicacion = (cliente.ubicacion or "")[:100]
        logo = (cliente.logo or "")[:100]

        if isinstance(cliente.activo, int):
            activo_str = "1" if cliente.activo == 1 else "0"
        else:
            activo_str = str(cliente.activo if cliente.activo is not None else "1")[:1]
            if activo_str not in ("0", "1"):
                activo_str = "1"

        sql = """
            INSERT INTO backup_actual.vc_tab_clientes (
                codigo, nombre, iniciales, ruc, dir, tipo, fpago, fecha, web, rleg, ubic, logo, activo
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                iniciales = VALUES(iniciales),
                ruc = VALUES(ruc),
                dir = VALUES(dir),
                tipo = VALUES(tipo),
                fpago = VALUES(fpago),
                fecha = VALUES(fecha),
                web = VALUES(web),
                rleg = VALUES(rleg),
                ubic = VALUES(ubic),
                logo = VALUES(logo),
                activo = VALUES(activo);
        """

        params = (
            codigo, nombre, iniciales, ruc, direccion, tipo, forma_pago,
            fecha, pagina_web, representante_legal, ubicacion, logo, activo_str
        )

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute(sql, params)

        logger.info(f"[SyncLegado] Sincronización exitosa para cliente ID {cliente_id}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la sincronización del cliente ID {cliente_id}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_sincronizacion_cliente_legado(cliente_id: int):
    """
    Registra la tarea de sincronización del cliente para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_sincronizacion_cliente_legado, cliente_id))
        logger.debug(f"[SyncLegado] Tarea de sincronización registrada en on_commit para cliente ID: {cliente_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la sincronización para cliente ID {cliente_id}: {str(e)}", exc_info=True)


def _ejecutar_eliminacion_cliente_legado(cliente_id: int):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Elimina el registro del cliente en la BD legada backup_actual.vc_tab_clientes.
    """
    lock = get_lock_for_cliente(cliente_id)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando eliminación legada para cliente ID: {cliente_id}")

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute("DELETE FROM backup_actual.vc_tab_clientes WHERE codigo = %s", [cliente_id])

        logger.info(f"[SyncLegado] Eliminación legada exitosa para cliente ID {cliente_id}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la eliminación legada del cliente ID {cliente_id}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_eliminacion_cliente_legado(cliente_id: int):
    """
    Registra la tarea de eliminación del cliente para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_eliminacion_cliente_legado, cliente_id))
        logger.debug(f"[SyncLegado] Tarea de eliminación registrada en on_commit para cliente ID: {cliente_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la eliminación legada para cliente ID {cliente_id}: {str(e)}", exc_info=True)


def _ejecutar_sincronizacion_representante_legado(representante_id: int):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Traduce el representante local e inserta o actualiza
    en la tabla legado backup_actual.vc_tab_clientes_d.
    """
    lock = get_lock_for_representante(representante_id)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando sincronización de representante ID: {representante_id}")

        rep = Representante.objects.filter(id_representante=representante_id).first()
        if not rep:
            logger.warning(f"[SyncLegado] Representante ID {representante_id} no encontrado en base de datos local.")
            return

        codigo = int(rep.id_representante)
        empresa = str(rep.id_cliente_id or "")[:5]
        representante = (rep.nombre_representante or "")[:70]
        cargo = (rep.cargo or "")[:70]
        telefono = (rep.telefono or "")[:30]
        movil = (rep.movil or "")[:30]
        email = (rep.email or "")[:50]
        direccion = (rep.direccion or "")[:50]

        if isinstance(rep.activo, int):
            activo_str = "1" if rep.activo == 1 else "0"
        else:
            activo_str = str(rep.activo if rep.activo is not None else "1")[:1]
            if activo_str not in ("0", "1"):
                activo_str = "1"

        sql = """
            INSERT INTO backup_actual.vc_tab_clientes_d (
                codigo, empresa, representante, cargo, telefono, movil, email, direccion, activo
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON DUPLICATE KEY UPDATE
                empresa = VALUES(empresa),
                representante = VALUES(representante),
                cargo = VALUES(cargo),
                telefono = VALUES(telefono),
                movil = VALUES(movil),
                email = VALUES(email),
                direccion = VALUES(direccion),
                activo = VALUES(activo);
        """

        params = (
            codigo, empresa, representante, cargo, telefono, movil, email, direccion, activo_str
        )

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute(sql, params)

        logger.info(f"[SyncLegado] Sincronización exitosa para representante ID {representante_id}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la sincronización del representante ID {representante_id}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_sincronizacion_representante_legado(representante_id: int):
    """
    Registra la tarea de sincronización del representante para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_sincronizacion_representante_legado, representante_id))
        logger.debug(f"[SyncLegado] Tarea de sincronización registrada en on_commit para representante ID: {representante_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la sincronización para representante ID {representante_id}: {str(e)}", exc_info=True)


def _ejecutar_eliminacion_representante_legado(representante_id: int, cliente_id: int = None):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Elimina el registro del representante en la BD legada backup_actual.vc_tab_clientes_d.
    """
    lock = get_lock_for_representante(representante_id)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando eliminación legada para representante ID: {representante_id}")

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            if cliente_id is not None:
                cursor.execute(
                    "DELETE FROM backup_actual.vc_tab_clientes_d WHERE codigo = %s AND empresa = %s",
                    [representante_id, str(cliente_id)[:5]]
                )
            else:
                cursor.execute(
                    "DELETE FROM backup_actual.vc_tab_clientes_d WHERE codigo = %s",
                    [representante_id]
                )

        logger.info(f"[SyncLegado] Eliminación legada exitosa para representante ID {representante_id}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la eliminación legada del representante ID {representante_id}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_eliminacion_representante_legado(representante_id: int, cliente_id: int = None):
    """
    Registra la tarea de eliminación del representante para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_eliminacion_representante_legado, representante_id, cliente_id))
        logger.debug(f"[SyncLegado] Tarea de eliminación registrada en on_commit para representante ID: {representante_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la eliminación legada para representante ID {representante_id}: {str(e)}", exc_info=True)


def _ejecutar_sincronizacion_marca_legado(marca_id: int):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Traduce la marca local (TipoMarca) e inserta o actualiza
    en la tabla legado backup_actual.vc_tab_tproveedor.
    """
    lock = get_lock_for_marca(marca_id)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando sincronización de marca ID: {marca_id}")

        marca = TipoMarca.objects.filter(id_marca=marca_id).first()
        if not marca:
            logger.warning(f"[SyncLegado] Marca ID {marca_id} no encontrada en base de datos local.")
            return

        codigo = str(marca.id_marca or 0).zfill(2)[:2]
        nombre = (marca.nombre or "")[:50]

        if isinstance(marca.activo, int):
            activo_str = "1" if marca.activo == 1 else "0"
        else:
            activo_str = str(marca.activo if marca.activo is not None else "1").strip()[:1]
            if activo_str not in ("0", "1"):
                activo_str = "1"

        sql = """
            INSERT INTO backup_actual.vc_tab_tproveedor (
                codigo, nombre, activo
            ) VALUES (
                %s, %s, %s
            )
            ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                activo = VALUES(activo);
        """

        params = (codigo, nombre, activo_str)

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute(sql, params)

        logger.info(f"[SyncLegado] Sincronización exitosa para marca ID {marca_id}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la sincronización de la marca ID {marca_id}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_sincronizacion_marca_legado(marca_id: int):
    """
    Registra la tarea de sincronización de la marca para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_sincronizacion_marca_legado, marca_id))
        logger.debug(f"[SyncLegado] Tarea de sincronización registrada en on_commit para marca ID: {marca_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la sincronización para marca ID {marca_id}: {str(e)}", exc_info=True)


def _ejecutar_eliminacion_marca_legado(marca_id: int):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Elimina el registro de la marca en la BD legada backup_actual.vc_tab_tproveedor.
    """
    lock = get_lock_for_marca(marca_id)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando eliminación legada para marca ID: {marca_id}")

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            codigo = str(marca_id or 0).zfill(2)[:2]
            cursor.execute("DELETE FROM backup_actual.vc_tab_tproveedor WHERE codigo = %s", [codigo])


        logger.info(f"[SyncLegado] Eliminación legada exitosa para marca ID {marca_id}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la eliminación legada de la marca ID {marca_id}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_eliminacion_marca_legado(marca_id: int):
    """
    Registra la tarea de eliminación de la marca para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_eliminacion_marca_legado, marca_id))
        logger.debug(f"[SyncLegado] Tarea de eliminación registrada en on_commit para marca ID: {marca_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la eliminación legada para marca ID {marca_id}: {str(e)}", exc_info=True)


def _ejecutar_sincronizacion_tipo_personal_legado(personal_id: int):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Traduce el tipo de personal local (TipoPersonal) e inserta o actualiza
    en la tabla legado backup_actual.vc_tab_categorias.
    """
    personal = TipoPersonal.objects.filter(id_personal=personal_id).first()
    if not personal:
        logger.warning(f"[SyncLegado] TipoPersonal ID {personal_id} no encontrado en base de datos local.")
        return

    codigo = (personal.codigo or "").replace("-", "").strip()[:4]
    lock = get_lock_for_personal(codigo)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando sincronización de TipoPersonal ID: {personal_id} (Código: {codigo})")

        nombre = (personal.nombre or "")[:70]
        cos_min = personal.costo_min if personal.costo_min is not None else 0.00
        cos_max = personal.costo_max if personal.costo_max is not None else 0.00

        area_val = personal.id_area_id
        if area_val == 10 or area_val is None:
            cod_area = "0"
        else:
            cod_area = str(area_val)[:1]

        if isinstance(personal.activo, int):
            activo_str = "1" if personal.activo == 1 else "0"
        else:
            activo_str = str(personal.activo if personal.activo is not None else "1").strip()[:1]
            if activo_str not in ("0", "1"):
                activo_str = "1"

        sql = """
            INSERT INTO backup_actual.vc_tab_categorias (
                codigo, nombre, cos_min, cos_max, cod_area, activo
            ) VALUES (
                %s, %s, %s, %s, %s, %s
            )
            ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                cos_min = VALUES(cos_min),
                cos_max = VALUES(cos_max),
                cod_area = VALUES(cod_area),
                activo = VALUES(activo);
        """

        params = (codigo, nombre, cos_min, cos_max, cod_area, activo_str)

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute(sql, params)

        logger.info(f"[SyncLegado] Sincronización exitosa para TipoPersonal Código {codigo}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la sincronización de TipoPersonal Código {codigo}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_sincronizacion_tipo_personal_legado(personal_id: int):
    """
    Registra la tarea de sincronización de TipoPersonal para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_sincronizacion_tipo_personal_legado, personal_id))
        logger.debug(f"[SyncLegado] Tarea de sincronización registrada en on_commit para TipoPersonal ID: {personal_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la sincronización para TipoPersonal ID {personal_id}: {str(e)}", exc_info=True)


def _ejecutar_eliminacion_tipo_personal_legado(codigo: str):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Elimina el registro de la categoría en la BD legada backup_actual.vc_tab_categorias.
    """
    cod_clean = (codigo or "").replace("-", "").strip()[:4]

    lock = get_lock_for_personal(cod_clean)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando eliminación legada para TipoPersonal Código: {cod_clean}")

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute("DELETE FROM backup_actual.vc_tab_categorias WHERE codigo = %s", [cod_clean])

        logger.info(f"[SyncLegado] Eliminación legada exitosa para TipoPersonal Código {cod_clean}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la eliminación legada de TipoPersonal Código {cod_clean}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_eliminacion_tipo_personal_legado(codigo: str):
    """
    Registra la tarea de eliminación de TipoPersonal para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_eliminacion_tipo_personal_legado, codigo))
        logger.debug(f"[SyncLegado] Tarea de eliminación registrada en on_commit para TipoPersonal Código: {codigo}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la eliminación legada para TipoPersonal Código {codigo}: {str(e)}", exc_info=True)


def _ejecutar_sincronizacion_gasto_detalle_legado(gasto_detalle_id: int):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Traduce el detalle de tipo de gasto local (TipoGastoDetalle) e inserta o actualiza
    en la tabla legado backup_actual.vc_tab_tgastos_d.
    """
    gasto_det = TipoGastoDetalle.objects.filter(id_gasto_detalle=gasto_detalle_id).select_related('id_tipo_gasto').first()
    if not gasto_det:
        logger.warning(f"[SyncLegado] TipoGastoDetalle ID {gasto_detalle_id} no encontrado en base de datos local.")
        return

    codigo = (gasto_det.codigo or "").replace("-", "").strip()[:5]
    lock = get_lock_for_gasto_detalle(codigo)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando sincronización de TipoGastoDetalle ID: {gasto_detalle_id} (Código: {codigo})")

        nombre = (gasto_det.nombre or "")[:100]

        parent_gasto = gasto_det.id_tipo_gasto
        if parent_gasto and hasattr(parent_gasto, 'codigo') and parent_gasto.codigo:
            cod_tipo = str(parent_gasto.codigo)[:2]
        else:
            cod_tipo = str(gasto_det.id_tipo_gasto_id or 0).zfill(2)[:2]

        if isinstance(gasto_det.activo, int):
            activo_str = "1" if gasto_det.activo == 1 else "0"
        else:
            activo_str = str(gasto_det.activo if gasto_det.activo is not None else "1").strip()[:1]
            if activo_str not in ("0", "1"):
                activo_str = "1"

        sql = """
            INSERT INTO backup_actual.vc_tab_tgastos_d (
                codigo, nombre, unimed, importe, cod_tipo, activo, cantidad
            ) VALUES (
                %s, %s, NULL, NULL, %s, %s, NULL
            )
            ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                cod_tipo = VALUES(cod_tipo),
                activo = VALUES(activo);
        """

        params = (codigo, nombre, cod_tipo, activo_str)

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute(sql, params)

        logger.info(f"[SyncLegado] Sincronización exitosa para TipoGastoDetalle Código {codigo}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la sincronización de TipoGastoDetalle Código {codigo}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_sincronizacion_gasto_detalle_legado(gasto_detalle_id: int):
    """
    Registra la tarea de sincronización de TipoGastoDetalle para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_sincronizacion_gasto_detalle_legado, gasto_detalle_id))
        logger.debug(f"[SyncLegado] Tarea de sincronización registrada en on_commit para TipoGastoDetalle ID: {gasto_detalle_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la sincronización para TipoGastoDetalle ID {gasto_detalle_id}: {str(e)}", exc_info=True)


def _ejecutar_eliminacion_gasto_detalle_legado(codigo: str):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Elimina el registro del detalle de gasto en la BD legada backup_actual.vc_tab_tgastos_d.
    """
    cod_clean = (codigo or "").replace("-", "").strip()[:5]
    lock = get_lock_for_gasto_detalle(cod_clean)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando eliminación legada para TipoGastoDetalle Código: {cod_clean}")

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute("DELETE FROM backup_actual.vc_tab_tgastos_d WHERE codigo = %s", [cod_clean])

        logger.info(f"[SyncLegado] Eliminación legada exitosa para TipoGastoDetalle Código {cod_clean}.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la eliminación legada de TipoGastoDetalle Código {cod_clean}: {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_eliminacion_gasto_detalle_legado(codigo: str):
    """
    Registra la tarea de eliminación de TipoGastoDetalle para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_eliminacion_gasto_detalle_legado, codigo))
        logger.debug(f"[SyncLegado] Tarea de eliminación registrada en on_commit para TipoGastoDetalle Código: {codigo}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la eliminación legada para TipoGastoDetalle Código {codigo}: {str(e)}", exc_info=True)


def _ejecutar_sincronizacion_usuario_legado(usuario_id: int):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Traduce el usuario local (Usuario) e inserta o actualiza
    en la tabla legado backup_actual.seg_usuarios.
    """
    usr = Usuario.objects.filter(id_usuario=usuario_id).select_related('id_area', 'id_cargo').first()
    if not usr:
        logger.warning(f"[SyncLegado] Usuario ID {usuario_id} no encontrado en base de datos local.")
        return

    usuario_usu = (usr.usuario or "")[:30]
    lock = get_lock_for_usuario(usuario_usu)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando sincronización de Usuario ID: {usuario_id} (Usuario: {usuario_usu})")

        nomb_cort_usu = (usr.nombre_completo or "")[:100]
        email_usu = (usr.correo or "")[:100]
        email_o = (usr.correo_personal or "")[:100]
        fech_crea_usu = timezone.now()
        dni = (usr.dni or "")[:15]
        telefono = (usr.telefono or "")[:50]
        movil1 = (usr.movil_personal or "")[:50]
        movil2 = (usr.movil_coorporativo or "")[:50]
        fecha_nac = usr.fecha_nacimiento
        fecha_ing = usr.fecha_ingreso
        password_usu = (usr.contrasena or "")[:30]
        doc = (getattr(usr, 'documento', None) or "")[:3]
        direccion = (usr.direccion or "")[:200]
        estc = (usr.estado_civil or "")[:1]
        sex = (usr.genero or "")[:1]

        if isinstance(usr.activo, int):
            activo_str = "1" if usr.activo == 1 else "0"
        else:
            activo_str = str(usr.activo if usr.activo is not None else "1").strip()[:1]
            if activo_str not in ("0", "1"):
                activo_str = "1"

        area_val = usr.id_area_id
        if area_val == 10 or area_val is None:
            area = "0"
        else:
            area = str(area_val)[:1]

        cargo = str(usr.id_cargo_id or 0).zfill(3)[:3]

        sql = """
            INSERT INTO backup_actual.seg_usuarios (
                usuario_usu, nomb_cort_usu, email_usu, email_o, fech_crea_usu,
                dni, telefono, movil1, movil2, fecha_nac, fecha_ing,
                password_usu, doc, dir, estc, sex, activo, area, cargo
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON DUPLICATE KEY UPDATE
                nomb_cort_usu = VALUES(nomb_cort_usu),
                email_usu = VALUES(email_usu),
                email_o = VALUES(email_o),
                fech_crea_usu = VALUES(fech_crea_usu),
                dni = VALUES(dni),
                telefono = VALUES(telefono),
                movil1 = VALUES(movil1),
                movil2 = VALUES(movil2),
                fecha_nac = VALUES(fecha_nac),
                fecha_ing = VALUES(fecha_ing),
                password_usu = VALUES(password_usu),
                doc = VALUES(doc),
                dir = VALUES(dir),
                estc = VALUES(estc),
                sex = VALUES(sex),
                activo = VALUES(activo),
                area = VALUES(area),
                cargo = VALUES(cargo);
        """

        params = (
            usuario_usu, nomb_cort_usu, email_usu, email_o, fech_crea_usu,
            dni, telefono, movil1, movil2, fecha_nac, fecha_ing,
            password_usu, doc, direccion, estc, sex, activo_str, area, cargo
        )

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute(sql, params)

        logger.info(f"[SyncLegado] Sincronización exitosa para Usuario '{usuario_usu}'.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la sincronización de Usuario '{usuario_usu}': {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_sincronizacion_usuario_legado(usuario_id: int):
    """
    Registra la tarea de sincronización de Usuario para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_sincronizacion_usuario_legado, usuario_id))
        logger.debug(f"[SyncLegado] Tarea de sincronización registrada en on_commit para Usuario ID: {usuario_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la sincronización para Usuario ID {usuario_id}: {str(e)}", exc_info=True)


def _ejecutar_eliminacion_usuario_legado(username: str):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Elimina el registro de usuario en la BD legada backup_actual.seg_usuarios.
    """
    usr_clean = (username or "")[:30]
    lock = get_lock_for_usuario(usr_clean)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando eliminación legada para Usuario: {usr_clean}")

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute("DELETE FROM backup_actual.seg_usuarios WHERE usuario_usu = %s", [usr_clean])

        logger.info(f"[SyncLegado] Eliminación legada exitosa para Usuario '{usr_clean}'.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la eliminación legada de Usuario '{usr_clean}': {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_eliminacion_usuario_legado(username: str):
    """
    Registra la tarea de eliminación de Usuario para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_eliminacion_usuario_legado, username))
        logger.debug(f"[SyncLegado] Tarea de eliminación registrada en on_commit para Usuario: {username}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la eliminación legada para Usuario '{username}': {str(e)}", exc_info=True)


def _ejecutar_sincronizacion_producto_legado(producto_id: int):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Traduce el producto local (Producto) e inserta o actualiza
    en la tabla legado correspondiente (vc_tab_rittal, vc_tab_rockwell, vc_tab_hoffman o alm_articulos)
    según la marca del producto.
    """
    prod = Producto.objects.filter(id_producto=producto_id).select_related('id_marca', 'id_medida').first()
    if not prod:
        logger.warning(f"[SyncLegado] Producto ID {producto_id} no encontrado en base de datos local.")
        return

    marca_nombre = (prod.id_marca.nombre or "").strip() if prod.id_marca else ""
    marca_lower = marca_nombre.lower()

    if "rittal" in marca_lower:
        target_table = "vc_tab_rittal"
        max_cod_len = 10
        max_nom_len = 100
    elif "rockwell" in marca_lower:
        target_table = "vc_tab_rockwell"
        max_cod_len = 60
        max_nom_len = 150
    elif "hoffman" in marca_lower:
        target_table = "vc_tab_hoffman"
        max_cod_len = 10
        max_nom_len = 100
    else:
        target_table = "alm_articulos"
        max_cod_len = 30
        max_nom_len = 200

    codigo = (prod.codigo or "")[:max_cod_len]
    lock = get_lock_for_producto(codigo)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando sincronización de Producto ID: {producto_id} (Código: {codigo}) hacia tabla '{target_table}' (Marca: {marca_nombre})")

        activo_str = "1" if prod.activo == 1 else "0"

        if target_table == "vc_tab_rockwell":
            codigo2 = (prod.codigo2 or "")[:60]
            descripcion = (prod.descripcion or prod.nombre or "")[:150]
            precio = prod.precio_dolares or 0.00
            proveedor = (prod.proveedor or "")[:20]

            sql = """
                INSERT INTO backup_actual.vc_tab_rockwell (
                    codigo, codigo2, descripcion, precio, proveedor, activo
                ) VALUES (
                    %s, %s, %s, %s, %s, %s
                )
                ON DUPLICATE KEY UPDATE
                    codigo2 = VALUES(codigo2),
                    descripcion = VALUES(descripcion),
                    precio = VALUES(precio),
                    proveedor = VALUES(proveedor),
                    activo = VALUES(activo);
            """
            params = (codigo, codigo2, descripcion, precio, proveedor, activo_str)

        else:
            nombre = (prod.nombre or "")[:max_nom_len]
            um = (prod.id_medida.codigo if prod.id_medida and hasattr(prod.id_medida, 'codigo') and prod.id_medida.codigo else (prod.id_medida.nombre if prod.id_medida else ""))[:10]
            descripcion = (prod.descripcion or prod.nombre or "")[:100]
            precio_s = prod.precio_soles or 0.00
            precio_d = prod.precio_dolares or 0.00
            cantidad = prod.cantidad or 0
            ocodigo = (prod.codigo2 or "")[:15]
            stock_min = prod.stock_min or 0
            stock_max = prod.stock_max or 0
            descuento = prod.descuento or 0.00
            proveedor = (prod.proveedor or "")[:70]

            sql = f"""
                INSERT INTO backup_actual.{target_table} (
                    codigo, nombre, um, descripcion, precio_s, precio_d, cantidad, ocodigo, stock_min, stock_max, descuento, proveedor, activo
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre),
                    um = VALUES(um),
                    descripcion = VALUES(descripcion),
                    precio_s = VALUES(precio_s),
                    precio_d = VALUES(precio_d),
                    cantidad = VALUES(cantidad),
                    ocodigo = VALUES(ocodigo),
                    stock_min = VALUES(stock_min),
                    stock_max = VALUES(stock_max),
                    descuento = VALUES(descuento),
                    proveedor = VALUES(proveedor),
                    activo = VALUES(activo);
            """
            params = (
                codigo, nombre, um, descripcion, precio_s, precio_d,
                cantidad, ocodigo, stock_min, stock_max, descuento, proveedor, activo_str
            )

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute(sql, params)

        logger.info(f"[SyncLegado] Sincronización exitosa para Producto Código '{codigo}' en tabla '{target_table}'.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la sincronización de Producto Código '{codigo}' en '{target_table}': {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_sincronizacion_producto_legado(producto_id: int):
    """
    Registra la tarea de sincronización de Producto para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_sincronizacion_producto_legado, producto_id))
        logger.debug(f"[SyncLegado] Tarea de sincronización registrada en on_commit para Producto ID: {producto_id}")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la sincronización para Producto ID {producto_id}: {str(e)}", exc_info=True)


def _ejecutar_eliminacion_producto_legado(codigo: str, marca_nombre: str = ""):
    """
    Función de fondo que se ejecuta en un hilo secundario.
    Elimina el registro de producto en la BD legada según su marca.
    """
    marca_lower = (marca_nombre or "").lower()

    if "rittal" in marca_lower:
        target_table = "vc_tab_rittal"
        max_cod_len = 10
    elif "rockwell" in marca_lower:
        target_table = "vc_tab_rockwell"
        max_cod_len = 60
    elif "hoffman" in marca_lower:
        target_table = "vc_tab_hoffman"
        max_cod_len = 10
    else:
        target_table = "alm_articulos"
        max_cod_len = 30

    cod_clean = (codigo or "")[:max_cod_len]
    lock = get_lock_for_producto(cod_clean)
    lock.acquire()
    try:
        logger.info(f"[SyncLegado] Iniciando eliminación legada para Producto Código '{cod_clean}' en '{target_table}'")

        db_alias = "legacy" if "legacy" in connections else "default"
        with connections[db_alias].cursor() as cursor:
            cursor.execute(f"DELETE FROM backup_actual.{target_table} WHERE codigo = %s", [cod_clean])

        logger.info(f"[SyncLegado] Eliminación legada exitosa para Producto '{cod_clean}' en '{target_table}'.")

    except Exception as e:
        logger.error(f"[SyncLegado] Error durante la eliminación legada de Producto '{cod_clean}' en '{target_table}': {str(e)}", exc_info=True)
    finally:
        connections.close_all()
        lock.release()


def disparar_eliminacion_producto_legado(codigo: str, marca_nombre: str = ""):
    """
    Registra la tarea de eliminación de Producto para que se ejecute en segundo plano
    inmediatamente después de confirmarse el COMMIT en la base local.
    """
    try:
        transaction.on_commit(lambda: SYNC_EXECUTOR.submit(_ejecutar_eliminacion_producto_legado, codigo, marca_nombre))
        logger.debug(f"[SyncLegado] Tarea de eliminación registrada en on_commit para Producto Código '{codigo}' ({marca_nombre})")
    except Exception as e:
        logger.error(f"[SyncLegado] No se pudo encolar la eliminación legada para Producto Código '{codigo}': {str(e)}", exc_info=True)









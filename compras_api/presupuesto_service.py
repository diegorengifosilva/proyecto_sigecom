"""
Servicio centralizado para la consulta, cálculo y validación del Presupuesto,
Programado y Saldo Disponible en las aperturas de cotización del módulo de compras.
"""
import logging
from decimal import Decimal
from django.db.models import Q
from cotizaciones_api.models import CotizacionApertura
from compras_api.models import SolicitudOrdenCompra, SolicitudPasajes
from caja_chica_api.models import SolicitudCajaChica

logger = logging.getLogger(__name__)

# Mapeo de categorías por tipo_gasto
CATEGORIAS_CONFIG = {
    "suministros": {
        "nombre": "Suministros",
        "gasto_ids": [1, 2],
        "budget_fields": ["orden_compra_equipos", "orden_compra_materiales"],
    },
    "mano_obra": {
        "nombre": "Mano de Obra",
        "gasto_ids": [3],
        "budget_fields": ["orden_compra_hh"],
    },
    "costo_servicios": {
        "nombre": "Gasto de Servicio",
        "gasto_ids": [4],
        "budget_fields": ["orden_compra_costo_servicios"],
    },
    "otros": {
        "nombre": "Otros",
        "gasto_ids": [5],
        "budget_fields": ["orden_compra_otros"],
    },
}

def resolver_categoria(tipo_gasto_id):
    """
    Determina la clave de categoría a partir del ID de tipo de gasto.
    """
    try:
        tg = int(tipo_gasto_id)
    except (ValueError, TypeError):
        tg = 5

    if tg in (1, 2):
        return "suministros"
    elif tg == 3:
        return "mano_obra"
    elif tg == 4:
        return "costo_servicios"
    else:
        return "otros"


def obtener_resumen_presupuesto(id_apertura, tipo_gasto_id=None, exclude_id=None, exclude_tipo=None):
    """
    Calcula el presupuesto, monto programado y saldo disponible para una apertura,
    ya sea para un rubro específico (si tipo_gasto_id se define) o general.

    Permite excluir un registro específico (por ejemplo al editar un pasaje, orden o caja existente).
    """
    if not id_apertura:
        return None

    try:
        apertura = CotizacionApertura.objects.select_related('id_registro').get(id_apertura=id_apertura)
    except CotizacionApertura.DoesNotExist:
        return None

    coti_codigo = apertura.id_registro.codigo if (apertura.id_registro and hasattr(apertura.id_registro, 'codigo')) else None
    base_q = Q(id_apertura=id_apertura) | Q(nivel_grupo=id_apertura) | Q(nivel_grupo=str(id_apertura))
    query_filter = (base_q | Q(codigo=coti_codigo)) if coti_codigo else base_q

    # Consultar solicitudes asociadas excluyendo anuladas (id_estado = 5)
    oc_qs = SolicitudOrdenCompra.objects.filter(query_filter).exclude(id_estado=5)
    pasajes_qs = SolicitudPasajes.objects.filter(query_filter).exclude(id_estado=5)
    caja_qs = SolicitudCajaChica.objects.filter(query_filter).exclude(id_estado=5)

    # Excluir registro actual si estamos en edición
    if exclude_id and exclude_tipo:
        try:
            ex_id = int(exclude_id)
            if exclude_tipo == 'compra':
                oc_qs = oc_qs.exclude(id_solicitud=ex_id)
            elif exclude_tipo == 'pasaje':
                pasajes_qs = pasajes_qs.exclude(id_pasaje=ex_id)
            elif exclude_tipo in ('caja', 'caja_chica'):
                caja_qs = caja_qs.exclude(id_registro=ex_id)
        except (ValueError, TypeError):
            pass

    cat_key = resolver_categoria(tipo_gasto_id) if tipo_gasto_id is not None else None
    cat_cfg = CATEGORIAS_CONFIG.get(cat_key) if cat_key else None

    # Presupuesto del rubro
    if cat_cfg:
        presupuesto_rubro = sum(float(getattr(apertura, f, 0.0) or 0.0) for f in cat_cfg["budget_fields"])
        rubro_gasto_ids = cat_cfg["gasto_ids"]
        nombre_rubro = cat_cfg["nombre"]
    else:
        presupuesto_rubro = float(apertura.presupuesto or 0.0)
        rubro_gasto_ids = None
        nombre_rubro = "General"

    # Presupuesto total general de la apertura
    presupuesto_total = float(apertura.presupuesto or 0.0)
    if presupuesto_total <= 0:
        presupuesto_total = sum(
            float(getattr(apertura, f, 0.0) or 0.0)
            for cfg in CATEGORIAS_CONFIG.values()
            for f in cfg["budget_fields"]
        )

    # Calcular lo programado en el rubro
    programado_rubro = 0.0
    programado_total = 0.0

    for oc in oc_qs:
        monto = float(oc.monto_dolares or 0.0)
        tg = oc.tipo_gasto_id or 2
        programado_total += monto
        if rubro_gasto_ids is not None:
            if cat_key == "otros":
                if tg == 5 or (tg < 1 or tg > 5):
                    programado_rubro += monto
            elif tg in rubro_gasto_ids:
                programado_rubro += monto
        else:
            programado_rubro += monto

    for pas in pasajes_qs:
        monto = float(pas.monto_dolares or 0.0)
        tg = pas.tipo_gasto_id or 4
        programado_total += monto
        if rubro_gasto_ids is not None:
            if cat_key == "otros":
                if tg == 5 or (tg < 1 or tg > 5):
                    programado_rubro += monto
            elif tg in rubro_gasto_ids:
                programado_rubro += monto
        else:
            programado_rubro += monto

    for cc in caja_qs:
        monto = float(cc.monto_dolares or 0.0)
        tg = cc.tipo_gasto_id or 1
        programado_total += monto
        if rubro_gasto_ids is not None:
            if cat_key == "otros":
                if tg == 5 or (tg < 1 or tg > 5):
                    programado_rubro += monto
            elif tg in rubro_gasto_ids:
                programado_rubro += monto
        else:
            programado_rubro += monto

    # El disponible nunca puede ser menor a 0.00
    disponible_rubro = max(0.00, round(presupuesto_rubro - programado_rubro, 2))
    disponible_total = max(0.00, round(presupuesto_total - programado_total, 2))

    return {
        "id_apertura": apertura.id_apertura,
        "categoria": cat_key,
        "categoria_nombre": nombre_rubro,
        "presupuesto_rubro": round(presupuesto_rubro, 2),
        "programado_rubro": round(programado_rubro, 2),
        "disponible_rubro": disponible_rubro,
        "presupuesto_total": round(presupuesto_total, 2),
        "programado_total": round(programado_total, 2),
        "disponible_total": disponible_total,
    }


def validar_monto_disponible(id_apertura, tipo_gasto_id, nuevo_monto_dolares, exclude_id=None, exclude_tipo=None):
    """
    Valida si nuevo_monto_dolares excede el saldo disponible del rubro correspondiente.
    Retorna: (es_valido, disponible_rubro, mensaje_error, resumen)
    """
    try:
        monto_dolares = float(nuevo_monto_dolares or 0.0)
    except (ValueError, TypeError):
        return False, 0.00, "El monto en dólares ingresado no es válido.", None

    if not id_apertura:
        # Si no está vinculado a una apertura, no se bloquea por presupuesto
        return True, 999999999.00, None, None

    resumen = obtener_resumen_presupuesto(
        id_apertura, 
        tipo_gasto_id=tipo_gasto_id, 
        exclude_id=exclude_id, 
        exclude_tipo=exclude_tipo
    )
    if not resumen:
        return True, 999999999.00, None, None

    disponible = resumen["disponible_rubro"]
    categoria_nombre = resumen["categoria_nombre"]

    # Margen de tolerancia de 1 centavo para redondeos monetarios
    if monto_dolares > (disponible + 0.01):
        msg = (
            f"El monto solicitado (${monto_dolares:.2f}) excede el saldo disponible "
            f"(${disponible:.2f}) para la partida '{categoria_nombre}'. "
            f"El monto máximo permitido es ${disponible:.2f}."
        )
        return False, disponible, msg, resumen

    return True, disponible, None, resumen

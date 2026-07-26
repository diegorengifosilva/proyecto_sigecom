"""Helpers para cabecera/detalle de movimientos de almacén."""

from core.models import Producto, UnidadMedida
from users.models import Usuario

from .models import LogisticaDashboard, LogisticaDashboardDetalle

MONEDA_LABEL = {"S": "Soles", "D": "Dólares"}
MONEDA_DB_MAP = {
    "Soles": "S",
    "S": "S",
    "Dolares": "D",
    "Dólares": "D",
    "D": "D",
}


def moneda_to_db(value):
    return MONEDA_DB_MAP.get((value or "S").strip(), "S")


def moneda_from_db(value):
    return MONEDA_LABEL.get((value or "S").strip(), value or "Soles")


def _usuario_por_reg(reg_val):
    if reg_val is None or str(reg_val).strip() == "":
        return None
    try:
        uid = int(str(reg_val).strip())
        return Usuario.objects.filter(id_usuario=uid).first()
    except (TypeError, ValueError):
        return Usuario.objects.filter(usuario=str(reg_val).strip()).first()


def _producto_por_id(prod_id):
    if prod_id is None or str(prod_id).strip() == "":
        return None
    try:
        return Producto.objects.select_related("id_medida").filter(
            id_producto=int(str(prod_id).strip())
        ).first()
    except (TypeError, ValueError):
        return None


def _umed_por_id(um_id):
    if um_id is None or str(um_id).strip() == "":
        return None
    if str(um_id).strip().isdigit():
        return UnidadMedida.objects.filter(id_medida=int(str(um_id).strip())).first()
    return UnidadMedida.objects.filter(codigo=str(um_id).strip()).first()


def resolver_um_id_item(item, index=None, existing_um_by_idx=None, existing_um_by_id=None):
    """Devuelve idunidad_medida (FK numérico) válido para movimiento_detalle."""
    for raw in (item.get("id_unidad_medida"), item.get("um_id"), item.get("um")):
        umed = _umed_por_id(raw)
        if umed:
            return str(umed.id_medida)

    prod_id = item.get("id_producto") or item.get("producto_id")
    producto = _producto_por_id(prod_id)
    if producto and producto.id_medida_id:
        return str(producto.id_medida_id)

    det_id = item.get("id_detalle")
    if det_id and existing_um_by_id and det_id in existing_um_by_id:
        umed = _umed_por_id(existing_um_by_id[det_id])
        if umed:
            return str(umed.id_medida)

    if index and existing_um_by_idx and index in existing_um_by_idx:
        umed = _umed_por_id(existing_um_by_idx[index])
        if umed:
            return str(umed.id_medida)

    return None


def resolver_producto_id_item(item, existing_cod=None):
    """Devuelve producto_idproducto válido o conserva el existente en actualizaciones."""
    for raw in (item.get("id_producto"), item.get("producto_id")):
        pid = None
        try:
            if raw not in (None, "", []):
                pid = int(str(raw).strip())
        except (TypeError, ValueError):
            pid = None
        if pid and Producto.objects.filter(id_producto=pid).exists():
            return pid

    codigo = item.get("codigo")
    if codigo and str(codigo).strip():
        producto = Producto.objects.filter(codigo=str(codigo).strip()).first()
        if producto:
            return producto.id_producto

    if existing_cod not in (None, "", []):
        try:
            return int(str(existing_cod).strip())
        except (TypeError, ValueError):
            pass

    return None


def build_movimiento_detalle_response(num_reg):
    cabecera = (
        LogisticaDashboard.objects.select_related("cor", "alm")
        .filter(num_reg=num_reg)
        .first()
    )
    if not cabecera:
        return None

    usuario = _usuario_por_reg(cabecera.reg)
    detalles = LogisticaDashboardDetalle.objects.filter(num_reg=num_reg).order_by("id")

    items = []
    for d in detalles:
        producto = _producto_por_id(d.cod)
        umed = _umed_por_id(d.um)
        items.append({
            "id_detalle": d.id,
            "id_movimiento": d.num_reg,
            "id_producto": int(d.cod) if d.cod and str(d.cod).isdigit() else d.cod,
            "codigo": producto.codigo if producto else (
                str(d.cod) if d.cod and not str(d.cod).isdigit() else ""
            ),
            "nombre": producto.nombre if producto else (d.nom or ""),
            "descripcion": producto.nombre if producto else (d.nom or ""),
            "id_unidad_medida": umed.id_medida if umed else (
                int(d.um) if d.um and str(d.um).strip().isdigit() else None
            ),
            "unidad": umed.codigo if umed else (d.um or ""),
            "unidad_nombre": umed.nombre if umed else "",
            "cantidad": d.can,
            "valor_unitario": float(d.val or 0),
            "total": float(d.tot or 0),
            "soles": float(d.sol or 0),
            "dolares": float(d.dol or 0),
            "observacion": d.obs,
        })

    return {
        "cabecera": {
            "numero": cabecera.num_reg,
            "fecha": cabecera.fec,
            "operacion": cabecera.ope,
            "orden_compra": cabecera.oco,
            "numero_doc": cabecera.nfa,
            "nro_guia": cabecera.ngu,
            "almacen": cabecera.alm_id,
            "almacen_nombre": cabecera.alm.nombre if cabecera.alm else None,
            "cliente_id": cabecera.cor_id,
            "proveedor_codigo": cabecera.cor_id,
            "razon_social": cabecera.cor.nombre if cabecera.cor else None,
            "moneda": cabecera.tmo,
            "moneda_nombre": moneda_from_db(cabecera.tmo),
            "tipo_cambio": float(cabecera.tc or 0),
            "usuario_id": int(usuario.id_usuario) if usuario else (
                int(cabecera.reg) if cabecera.reg and str(cabecera.reg).isdigit() else cabecera.reg
            ),
            "responsable": usuario.nombre_completo if usuario else None,
            "responsable_usuario": usuario.usuario if usuario else None,
            "observacion": cabecera.nom2,
            "obs_doc": cabecera.nom2,
            "soles": float(cabecera.sol or 0),
            "dolares": float(cabecera.dol or 0),
            "referencia": cabecera.mov,
            "tipo_movimiento": cabecera.mov,
            "estado": cabecera.est,
            "anulado": "S" if cabecera.est == "2" else "N",
        },
        "items": items,
        "resumen": {
            "totalItems": len(items),
            "totalSoles": float(cabecera.sol or 0),
            "totalDolares": float(cabecera.dol or 0),
        },
    }

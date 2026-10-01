"""Ajustes de maquetación del Word de la propuesta económica."""
from __future__ import annotations

import re

from docx.oxml import OxmlElement
from docx.oxml.ns import qn

_TITLE_RE = re.compile(
    r"(PRESUPUESTO\s+GENERAL|DETALLE(?:\s+SUMINISTRO|\s+SERVICIO)?\s*:|CONDICIONES\s+GENERALES)",
    re.IGNORECASE,
)

# 240 twips = 1.0; 276 = 1.15; 360 = 1.5 (respecto a 12pt)
_LINE_SPACING_115 = "276"


def _el_text(el) -> str:
    return "".join(t.text or "" for t in el.iter(qn("w:t")))


def _first_paragraph(el):
    for p in el.iter(qn("w:p")):
        return p
    return None


def _is_blank_paragraph(p) -> bool:
    if p.tag != qn("w:p"):
        return False
    return not _el_text(p).strip()


def _is_section_title_table(tbl) -> bool:
    if tbl.tag != qn("w:tbl"):
        return False
    rows = tbl.findall(qn("w:tr"))
    if len(rows) != 1:
        return False
    cells = rows[0].findall(qn("w:tc"))
    if len(cells) != 1:
        return False
    return bool(_TITLE_RE.search(_el_text(tbl)))


def _ensure_ppr(p):
    pPr = p.find(qn("w:pPr"))
    if pPr is None:
        pPr = OxmlElement("w:pPr")
        p.insert(0, pPr)
    return pPr


def _set_keep_with_next(p, space_after: str | None = "80") -> None:
    pPr = _ensure_ppr(p)
    if pPr.find(qn("w:keepNext")) is None:
        pPr.append(OxmlElement("w:keepNext"))
    if pPr.find(qn("w:keepLines")) is None:
        pPr.append(OxmlElement("w:keepLines"))
    spacing = pPr.find(qn("w:spacing"))
    if spacing is None:
        spacing = OxmlElement("w:spacing")
        pPr.append(spacing)
    spacing.set(qn("w:before"), "0")
    if space_after is not None:
        spacing.set(qn("w:after"), space_after)
    spacing.set(qn("w:line"), _LINE_SPACING_115)
    spacing.set(qn("w:lineRule"), "auto")


def _ensure_trpr(tr):
    trPr = tr.find(qn("w:trPr"))
    if trPr is None:
        trPr = OxmlElement("w:trPr")
        tr.insert(0, trPr)
    return trPr


def _cant_split_row(tr) -> None:
    trPr = _ensure_trpr(tr)
    if trPr.find(qn("w:cantSplit")) is None:
        trPr.append(OxmlElement("w:cantSplit"))


def _keep_table_on_one_page(tbl, link_to_next: bool = False) -> None:
    """Evita cortar la tabla: filas no se parten y se mantienen con la siguiente."""
    rows = tbl.findall(qn("w:tr"))
    last_idx = len(rows) - 1
    for i, tr in enumerate(rows):
        _cant_split_row(tr)
        if i < last_idx or link_to_next:
            for p in tr.iter(qn("w:p")):
                _set_keep_with_next(p, space_after=None)


def _insert_gap_after_title(title_tbl) -> None:
    """Espacio entre la franja verde y la tabla, sin estirar la barra (como el PDF)."""
    spacer = OxmlElement("w:p")
    pPr = _ensure_ppr(spacer)
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:before"), "0")
    spacing.set(qn("w:after"), "0")
    spacing.set(qn("w:line"), "280")
    spacing.set(qn("w:lineRule"), "exact")
    pPr.append(spacing)
    if pPr.find(qn("w:keepNext")) is None:
        pPr.append(OxmlElement("w:keepNext"))
    title_tbl.addnext(spacer)


def apply_section_keep_together(document) -> None:
    """Título + tabla completa juntos, sin estirar la barra verde del título."""
    body = document.element.body
    children = list(body.iterchildren())
    i = 0
    while i < len(children):
        el = children[i]
        if not _is_section_title_table(el):
            i += 1
            continue

        j = i + 1
        blanks = []
        while j < len(children) and _is_blank_paragraph(children[j]):
            blanks.append(children[j])
            j += 1

        for p in el.iter(qn("w:p")):
            _set_keep_with_next(p, space_after="0")
        _keep_table_on_one_page(el, link_to_next=True)

        if j < len(children) and children[j].tag == qn("w:tbl"):
            next_tbl = children[j]
            for blank in blanks:
                if blank.getparent() is not None:
                    blank.getparent().remove(blank)
            _insert_gap_after_title(el)
            _keep_table_on_one_page(next_tbl, link_to_next=False)
            children = list(body.iterchildren())
            try:
                i = children.index(next_tbl) + 1
            except ValueError:
                i += 1
            continue

        i += 1


def _set_line_spacing_115(p) -> None:
    pPr = _ensure_ppr(p)
    spacing = pPr.find(qn("w:spacing"))
    if spacing is None:
        spacing = OxmlElement("w:spacing")
        pPr.append(spacing)
    spacing.set(qn("w:line"), _LINE_SPACING_115)
    spacing.set(qn("w:lineRule"), "auto")


def apply_rich_text_line_spacing(document) -> None:
    """Aplica interlineado 1.15 al texto enriquecido (condiciones y detalle de servicio)."""
    body = document.element.body
    for p in body.iter(qn("w:p")):
        if any(True for _ in p.iter(qn("w:br"))):
            _set_line_spacing_115(p)


def _set_cell_valign(cell, value: str = "center") -> None:
    tcPr = cell._tc.get_or_add_tcPr()
    v_align = tcPr.find(qn("w:vAlign"))
    if v_align is None:
        v_align = OxmlElement("w:vAlign")
        tcPr.append(v_align)
    v_align.set(qn("w:val"), value)


def _vmerge_column(table, start_row: int, end_row: int, col: int) -> None:
    """Une verticalmente una columna (estilo 4.0 / servicios)."""
    if end_row <= start_row:
        return
    for i in range(start_row, end_row + 1):
        cell = table.cell(i, col)
        tc_pr = cell._tc.get_or_add_tcPr()
        for old in tc_pr.findall(qn("w:vMerge")):
            tc_pr.remove(old)
        v_merge = OxmlElement("w:vMerge")
        if i == start_row:
            v_merge.set(qn("w:val"), "restart")
            _set_cell_valign(cell, "center")
        else:
            v_merge.set(qn("w:val"), "continue")
        tc_pr.append(v_merge)


def apply_total_por_grupo_merge(document, suministros) -> None:
    """Une Unitario y Total en el detalle de suministros cuando total_por_grupo está activo."""
    grupos = [g for g in (suministros or []) if (g.get("filas") or g.get("items"))]
    gi = 0
    for table in document.tables:
        if not table.rows:
            continue
        header = " ".join((c.text or "") for c in table.rows[0].cells)
        header_l = header.lower()
        if "entrega" not in header_l or "u.m" not in header_l:
            continue
        if gi >= len(grupos):
            break
        grupo = grupos[gi]
        gi += 1
        if not grupo.get("total_por_grupo"):
            continue
        n_items = len(grupo.get("filas") or grupo.get("items") or [])
        if n_items < 2:
            continue
        last_item_row = min(n_items, len(table.rows) - 1)
        if last_item_row < 1:
            continue
        col_unit = col_tot = None
        for i, cell in enumerate(table.rows[0].cells):
            text = (cell.text or "").strip().lower()
            if "unitario" in text:
                col_unit = i
            elif text.startswith("total") or "total (" in text:
                col_tot = i
        if col_unit is None or col_tot is None:
            continue
        _vmerge_column(table, 1, last_item_row, col_unit)
        _vmerge_column(table, 1, last_item_row, col_tot)

"""Ajustes de maquetación del Word de la propuesta económica."""
from __future__ import annotations

import re
from copy import deepcopy

from docx.oxml import OxmlElement
from docx.oxml.ns import qn

_TITLE_RE = re.compile(
    r"(PRESUPUESTO\s+GENERAL|DETALLE(?:\s+SUMINISTRO|\s+SERVICIO)?\s*:|CONDICIONES\s+GENERALES)",
    re.IGNORECASE,
)

# 240 twips = 1.0; 276 = 1.15; 360 = 1.5 (respecto a 12pt)
_LINE_SPACING_115 = "276"
_SPACE_AFTER_TITLE = "360"


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


def _set_keep_with_next(p) -> None:
    pPr = _ensure_ppr(p)
    if pPr.find(qn("w:keepNext")) is None:
        pPr.append(OxmlElement("w:keepNext"))
    if pPr.find(qn("w:keepLines")) is None:
        pPr.append(OxmlElement("w:keepLines"))
    # 360 twips = 18pt ≈ interlineado 1.5 respecto a título de 12pt
    spacing = pPr.find(qn("w:spacing"))
    if spacing is None:
        spacing = OxmlElement("w:spacing")
        pPr.append(spacing)
    spacing.set(qn("w:after"), _SPACE_AFTER_TITLE)
    spacing.set(qn("w:line"), _LINE_SPACING_115)
    spacing.set(qn("w:lineRule"), "auto")


def _cant_split_rows(tbl, count: int = 2) -> None:
    for tr in tbl.findall(qn("w:tr"))[:count]:
        trPr = tr.find(qn("w:trPr"))
        if trPr is None:
            trPr = OxmlElement("w:trPr")
            tr.insert(0, trPr)
        if trPr.find(qn("w:cantSplit")) is None:
            trPr.append(OxmlElement("w:cantSplit"))


def apply_section_keep_together(document) -> None:
    """Evita títulos huérfanos: el título viaja con el inicio de su tabla."""
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

        if j >= len(children) or children[j].tag != qn("w:tbl"):
            inner = _first_paragraph(el)
            if inner is not None:
                _set_keep_with_next(inner)
            i += 1
            continue

        next_tbl = children[j]
        title_p = _first_paragraph(el)
        if title_p is not None:
            moved = deepcopy(title_p)
            _set_keep_with_next(moved)
            next_tbl.addprevious(moved)

        parent = el.getparent()
        parent.remove(el)
        for blank in blanks:
            if blank.getparent() is not None:
                blank.getparent().remove(blank)

        _cant_split_rows(next_tbl, 1)

        children = list(body.iterchildren())
        try:
            i = children.index(next_tbl) + 1
        except ValueError:
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

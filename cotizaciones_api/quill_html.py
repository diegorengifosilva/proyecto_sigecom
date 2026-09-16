"""Convierte HTML de Quill (listas planas con ql-indent) a HTML anidado.

Quill 1.x guarda:
    <ol>
      <li>Uno</li>
      <li class="ql-indent-1">Dos</li>
      <li class="ql-indent-2">Tres</li>
    </ol>

El editor lo pinta como 1 / a / i gracias a contadores CSS. El reporte y SIGECOM 4.0
ven una sola <ol> y numeran 1 / 2 / 3. Anidar las listas corrige ambos.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup, NavigableString, Tag

_INDENT_RE = re.compile(r"ql-indent-(\d+)")
def _indent_of(li: Tag) -> int:
    classes = li.get("class") or []
    if isinstance(classes, str):
        classes = classes.split()
    for cls in classes:
        match = _INDENT_RE.search(cls)
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                return 0
    return 0


def _strip_indent_class(li: Tag) -> None:
    classes = li.get("class") or []
    if isinstance(classes, str):
        classes = classes.split()
    kept = [c for c in classes if not _INDENT_RE.search(c) and c != "ql-cursor"]
    if kept:
        li["class"] = kept
    elif li.has_attr("class"):
        del li["class"]


def _direct_lis(list_el: Tag) -> list[Tag]:
    return [child for child in list_el.children if isinstance(child, Tag) and child.name == "li"]


def _rebuild_flat_list(soup: BeautifulSoup, list_el: Tag, items: list[Tag]) -> Tag:
    list_type = list_el.name
    new_root = soup.new_tag(list_type)
    stack_lists: list[Tag] = [new_root]

    for li in items:
        indent = max(0, _indent_of(li))
        _strip_indent_class(li)
        li.extract()

        while len(stack_lists) > indent + 1:
            stack_lists.pop()

        while len(stack_lists) <= indent:
            parent_list = stack_lists[-1]
            siblings = _direct_lis(parent_list)
            last_li = siblings[-1] if siblings else None
            if last_li is None:
                last_li = soup.new_tag("li")
                parent_list.append(last_li)
            nested = soup.new_tag(list_type)
            last_li.append(nested)
            stack_lists.append(nested)

        stack_lists[indent].append(li)

    return new_root


def _nest_quill_lists(soup: BeautifulSoup) -> None:
    for list_el in list(soup.find_all(["ol", "ul"])):
        if not isinstance(list_el, Tag) or list_el.parent is None:
            continue
        items = _direct_lis(list_el)
        if not items:
            continue
        if not any(_indent_of(li) > 0 for li in items):
            continue
        new_root = _rebuild_flat_list(soup, list_el, items)
        list_el.replace_with(new_root)


def _unwrap_spans(soup: BeautifulSoup) -> None:
    for span in list(soup.find_all("span")):
        span.unwrap()


def _strip_styles_and_classes(soup: BeautifulSoup) -> None:
    for tag in soup.find_all(True):
        if tag.has_attr("style"):
            del tag["style"]
        if tag.has_attr("color"):
            del tag["color"]
        if tag.has_attr("class"):
            classes = tag.get("class") or []
            if isinstance(classes, str):
                classes = classes.split()
            kept = [c for c in classes if c.startswith("ql-align-")]
            if kept:
                tag["class"] = kept
            else:
                del tag["class"]


def _inline_to_legacy_tags(soup: BeautifulSoup) -> None:
    for strong in list(soup.find_all("strong")):
        strong.name = "b"
    for em in list(soup.find_all("em")):
        em.name = "i"


def _normalize_empty_paragraphs(soup: BeautifulSoup, *, legacy: bool) -> None:
    for p in list(soup.find_all("p")):
        text = p.get_text(strip=True)
        only_br = all(
            (isinstance(c, Tag) and c.name == "br")
            or (isinstance(c, NavigableString) and not str(c).strip())
            for c in p.contents
        )
        if text or not only_br:
            continue
        if legacy:
            p.clear()
            p.append("\xa0")
        else:
            continue


def _serialize(soup: BeautifulSoup, *, formatter: str = "minimal") -> str:
    if soup.body:
        return soup.body.decode_contents(formatter=formatter)
    if soup.html:
        return "".join(
            child.decode(formatter=formatter) if isinstance(child, Tag) else str(child)
            for child in soup.html.contents
        )
    return "".join(
        child.decode(formatter=formatter) if isinstance(child, Tag) else str(child)
        for child in soup.contents
    )


def _flatten_list_items(soup: BeautifulSoup, list_el: Tag, depth: int) -> list[Tag]:
    """Convierte un ol/ul (ya anidado) en párrafos con 1. / a. / i. o viñetas visibles."""
    out: list[Tag] = []
    list_type = list_el.name
    index = 0
    for li in _direct_lis(list_el):
        index += 1
        nested_lists = []
        inline = []
        for child in list(li.children):
            if isinstance(child, Tag) and child.name in ("ol", "ul"):
                nested_lists.append(child)
            else:
                inline.append(child)
        p = soup.new_tag("p")
        prefix = ("\xa0" * 4 * depth) + list_marker(list_type, depth, index).replace(" ", "\xa0")
        p.append(prefix)
        for node in inline:
            if isinstance(node, NavigableString):
                text = str(node)
                if text:
                    p.append(text)
            elif isinstance(node, Tag):
                p.append(node.extract())
        out.append(p)
        for nested in nested_lists:
            out.extend(_flatten_list_items(soup, nested, depth + 1))
    return out


def _lists_to_legacy_paragraphs(soup: BeautifulSoup) -> None:
    """SIGECOM 4.0 no numera ol anidados (los pinta como viñetas). Dejamos 1/a/i en el texto."""
    roots = [
        el
        for el in soup.find_all(["ol", "ul"])
        if isinstance(el, Tag) and el.parent is not None and not el.find_parent(["ol", "ul"])
    ]
    for list_el in roots:
        paras = _flatten_list_items(soup, list_el, 0)
        for para in reversed(paras):
            list_el.insert_after(para)
        list_el.decompose()


def transform_quill_html(html: str | None, *, legacy: bool = False) -> str:
    """Anida listas Quill. Si legacy=True, deja HTML que SIGECOM 4.0 puede pintar."""
    if html is None:
        return ""
    raw = str(html)
    if not raw.strip():
        return raw

    soup = BeautifulSoup(raw, "html.parser")
    _nest_quill_lists(soup)
    _unwrap_spans(soup)
    _strip_styles_and_classes(soup)
    _normalize_empty_paragraphs(soup, legacy=legacy)
    if legacy:
        _inline_to_legacy_tags(soup)
        _lists_to_legacy_paragraphs(soup)

    result = _serialize(soup, formatter="html" if legacy else "minimal").strip()
    return result


def quill_html_for_report(html: str | None) -> str:
    return transform_quill_html(html, legacy=False)


def quill_html_to_legacy(html: str | None) -> str:
    return transform_quill_html(html, legacy=True)


_ROMAN = (
    (100, "c"),
    (90, "xc"),
    (50, "l"),
    (40, "xl"),
    (10, "x"),
    (9, "ix"),
    (5, "v"),
    (4, "iv"),
    (1, "i"),
)


def to_roman(n: int) -> str:
    n = max(1, int(n))
    parts = []
    for value, glyph in _ROMAN:
        while n >= value:
            parts.append(glyph)
            n -= value
    return "".join(parts)


def list_marker(list_type: str, depth: int, index: int) -> str:
    """Marcador estilo Word: 1. / a. / i.  y  • / ◦ / ▪."""
    level = max(0, depth) % 3
    if list_type == "ol":
        if level == 0:
            return f"{index}. "
        if level == 1:
            letter = chr(ord("a") + (max(1, index) - 1) % 26)
            return f"{letter}. "
        return f"{to_roman(index)}. "
    bullets = ("• ", "◦ ", "▪ ")
    return bullets[level]

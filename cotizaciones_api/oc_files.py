import glob
import os

from django.conf import settings

PRIMARY_OC_DIR = r"C:\xampp\htdocs\sigecom\ocfiles"
LEGACY_OC_DIR = r"C:\xampp\htdocs\vc\ocfiles"
PROJECT_OC_DIR = os.path.join(settings.BASE_DIR, "cotizaciones_api", "ocfiles")

KNOWN_EXTS = [".pdf", ".xlsx", ".xls", ".docx", ".doc"]


def oc_search_dirs():
    """Retorna lista de carpetas donde buscar archivos OC (recientes y antiguas sin duplicados)."""
    dirs = [
        PRIMARY_OC_DIR,
        LEGACY_OC_DIR,
        getattr(settings, "OC_FILES_DIR", None),
        PROJECT_OC_DIR,
    ]
    unique = []
    for raw in dirs:
        if not raw:
            continue
        path = os.path.normpath(raw)
        if path not in unique:
            unique.append(path)
    return unique


def oc_save_dir():
    """Carpeta para OC nuevas: C:\\xampp\\htdocs\\sigecom\\ocfiles si existe XAMPP, si no la de cotizaciones_api."""
    if os.path.isdir(r"C:\xampp\htdocs\sigecom"):
        os.makedirs(PRIMARY_OC_DIR, exist_ok=True)
        return PRIMARY_OC_DIR
    if os.path.isdir(r"C:\xampp\htdocs"):
        os.makedirs(PRIMARY_OC_DIR, exist_ok=True)
        return PRIMARY_OC_DIR
    os.makedirs(PROJECT_OC_DIR, exist_ok=True)
    return PROJECT_OC_DIR


def sniff_ext(path):
    ext = os.path.splitext(path)[1].lower()
    if ext:
        return ext
    try:
        with open(path, "rb") as handle:
            magic = handle.read(8)
        if magic.startswith(b"%PDF"):
            return ".pdf"
        if magic[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
            return ".doc"
        if magic[:2] == b"PK":
            return ".xlsx"
    except OSError:
        pass
    return ".pdf"


def _id_str(id_apertura):
    try:
        return str(int(str(id_apertura).strip())).strip()
    except (TypeError, ValueError):
        return str(id_apertura).strip()


def resolve_oc_file(id_apertura):
    """Devuelve (ruta_absoluta, extension) o (None, None)."""
    id_str = _id_str(id_apertura)
    if not id_str:
        return None, None

    for carpeta in oc_search_dirs():
        if not os.path.isdir(carpeta):
            continue
        for ext in KNOWN_EXTS:
            path = os.path.join(carpeta, f"{id_str}{ext}")
            if os.path.isfile(path):
                return path, ext
        bare = os.path.join(carpeta, id_str)
        if os.path.isfile(bare):
            return bare, sniff_ext(bare)
        for match in glob.glob(os.path.join(carpeta, f"{id_str}.*")):
            if os.path.isfile(match):
                return match, os.path.splitext(match)[1].lower() or sniff_ext(match)
    return None, None


def delete_oc_files(id_apertura):
    """Elimina todos los archivos OC asociados a un id_apertura."""
    id_str = _id_str(id_apertura)
    if not id_str:
        return 0
    removed = 0
    seen = set()
    for carpeta in oc_search_dirs():
        if not os.path.isdir(carpeta):
            continue
        candidates = [os.path.join(carpeta, f"{id_str}{ext}") for ext in KNOWN_EXTS]
        candidates.append(os.path.join(carpeta, id_str))
        candidates.extend(glob.glob(os.path.join(carpeta, f"{id_str}.*")))
        for path in candidates:
            norm = os.path.normpath(path)
            if norm in seen or not os.path.isfile(norm):
                continue
            seen.add(norm)
            try:
                os.remove(norm)
                removed += 1
            except OSError:
                pass
    return removed

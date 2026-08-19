# caja_chica_api/ocr_utils.py

from PIL import Image
import cv2
import numpy as np
from pdf2image import convert_from_path
from concurrent.futures import ThreadPoolExecutor

# --------------------------
# Procesar imágenes de cámara
# --------------------------
def procesar_imagen_camara(imagen: Image.Image, debug: bool = False) -> Image.Image:
    """
    Optimiza fotos tomadas con cámara para OCR.
    - Redimensiona a máx. 1500 px ancho
    - Convierte a escala de grises
    - Aplica binarización adaptativa si la imagen tiene sombras
    Retorna una PIL.Image lista para Tesseract.
    """
    # 🔹 Redimensionar
    max_width = 1500
    if imagen.width > max_width:
        ratio = max_width / float(imagen.width)
        new_height = int(float(imagen.height) * ratio)
        imagen = imagen.resize((max_width, new_height), Image.LANCZOS)

    # 🔹 Escala de grises
    img_cv = cv2.cvtColor(np.array(imagen), cv2.COLOR_RGB2GRAY)

    # 🔹 Binarización adaptativa
    img_bin = cv2.adaptiveThreshold(
        img_cv, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 35, 11
    )

    if debug:
        print("✅ Imagen optimizada para OCR (cámara).")

    return Image.fromarray(img_bin)

# --------------------------
# Procesar PDFs
# --------------------------
def procesar_pdf(path_pdf: str, dpi: int = 150, debug: bool = False) -> list[Image.Image]:
    """
    Convierte un PDF a imágenes optimizadas para OCR.
    - Convierte a imágenes a 150 DPI (configurable)
    - Escala de grises
    - Procesa páginas en paralelo
    Retorna lista de PIL.Image (una por página).
    """

    # Convertir PDF a imágenes
    paginas = convert_from_path(path_pdf, dpi=dpi)

    def procesar_pagina(pagina: Image.Image) -> Image.Image:
        img_cv = cv2.cvtColor(np.array(pagina), cv2.COLOR_RGB2GRAY)
        return Image.fromarray(img_cv)

    # Procesar en paralelo
    with ThreadPoolExecutor() as executor:
        imagenes = list(executor.map(procesar_pagina, paginas))

    if debug:
        print(f"✅ {len(imagenes)} páginas procesadas desde PDF a {dpi} DPI.")

    return imagenes

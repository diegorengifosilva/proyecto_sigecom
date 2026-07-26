import re
with open(r"c:\Users\VC-23031\PROYECTOS\SIGECOM_5\frontend\src\dashboard\comercial\CotizacionDetalle.jsx", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f, 1):
        if "saveSuministros" in line or "saveServicios" in line:
            print(f"{idx}: {line.strip()}")

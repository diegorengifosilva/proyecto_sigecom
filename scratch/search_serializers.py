with open("cotizaciones_api/serializers.py", "r", encoding="utf-8", errors="ignore") as f:
    for idx, line in enumerate(f, 1):
        if "CotizacionApertura" in line or "class CotizacionAperturaSerializer" in line:
            print(f"Line {idx}: {line.strip()}")

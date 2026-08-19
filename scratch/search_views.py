with open("cotizaciones_api/views.py", "r", encoding="utf-8", errors="ignore") as f:
    for idx, line in enumerate(f, 1):
        if "reporte_cotizaciones_dashboard" in line:
            print(f"Match found at line {idx}: {line.strip()}")

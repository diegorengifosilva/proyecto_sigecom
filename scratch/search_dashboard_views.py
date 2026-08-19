with open("dashboard_api/views.py", "r", encoding="utf-8", errors="ignore") as f:
    for idx, line in enumerate(f, 1):
        if "orden_compra_" in line or "costo" in line.lower():
            if any(term in line for term in ["equipos", "materiales", "servicios", "otros", "costo"]):
                print(f"Match found at line {idx}: {line.strip()}")

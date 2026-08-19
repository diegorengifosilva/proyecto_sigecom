with open("frontend/src/dashboard/comercial/Comercial.jsx", "r", encoding="utf-8", errors="ignore") as f:
    for idx, line in enumerate(f, 1):
        if any(term in line.lower() for term in ["mensual", "reporte", "exportar", "costo"]):
            print(f"Line {idx}: {line.strip()}")

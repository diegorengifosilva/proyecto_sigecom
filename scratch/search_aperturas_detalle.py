with open("frontend/src/dashboard/comercial/AperturasDetalle.jsx", "r", encoding="utf-8", errors="ignore") as f:
    for idx, line in enumerate(f, 1):
        if any(term in line for term in ["orden_compra_equipos", "orden_compra_materiales", "orden_compra_costo_servicios", "orden_compra_otros"]):
            print(f"Line {idx}: {line.strip()}")

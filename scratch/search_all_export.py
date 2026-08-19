import os

search_terms = ["exportar", "reporte_mensual", "orden_compra_equipos"]
for root, dirs, files in os.walk("."):
    # skip node_modules, env, git
    if any(p in root for p in ["node_modules", "env", ".git", "__pycache__", "dist"]):
        continue
    for file in files:
        if file.endswith(".py") or file.endswith(".jsx") or file.endswith(".js"):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    for idx, line in enumerate(f, 1):
                        for term in search_terms:
                            if term in line:
                                print(f"{filepath} [{idx}]: {line.strip()}")
            except Exception as e:
                pass

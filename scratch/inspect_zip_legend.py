import zipfile
import re

with zipfile.ZipFile("reporte_mensual (32).xlsx", "r") as z:
    for name in z.namelist():
        if "drawings/drawing" in name or "charts/chart" in name:
            content = z.read(name).decode("utf-8", errors="ignore")
            if "Faltante" in content or "Avance" in content:
                print(f"\nFound in file: {name}")
                # Print occurrences of Faltante/Avance with some surrounding context
                for m in re.finditer(r"(Avance|Faltante)", content):
                    start = max(0, m.start() - 100)
                    end = min(len(content), m.end() + 100)
                    print(f"  Match: ... {content[start:end]} ...")

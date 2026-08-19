import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (50).xlsx", data_only=False)
ws = wb["Objetivos"]

chart = ws._charts[3] # Chart 4
print("=== Chart Attributes ===")
for attr in dir(chart):
    try:
        val = getattr(chart, attr)
        if val is not None and not attr.startswith("__") and not callable(val):
            print(f"{attr}: {val}")
    except Exception as e:
        pass

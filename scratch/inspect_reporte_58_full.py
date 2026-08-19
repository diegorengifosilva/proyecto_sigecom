import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (58).xlsx", data_only=True)
ws = wb["Objetivos"]

charts = ws._charts
chart = charts[3]

print("=== PieChart3D Attributes ===")
for attr in dir(chart):
    if not attr.startswith("_"):
        print(attr)

# Let's inspect the actual attributes that might contain 3D info
print("\n=== Specific Attributes ===")
for attr in ["view3D", "floor", "sideWall", "backWall", "ext", "plot_area"]:
    if hasattr(chart, attr):
        print(f"{attr}: {type(getattr(chart, attr))}")

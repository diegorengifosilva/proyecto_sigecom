import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (58).xlsx", data_only=True)
ws = wb["Objetivos"]

print("=== Cell Grid Values (Rows 37-43) ===")
for r in range(37, 44):
    row_vals = []
    for c in range(1, 15):
        val = ws.cell(row=r, column=c).value
        row_vals.append(str(val) if val is not None else "")
    print(f"Row {r:02d}: {row_vals}")

print("\n=== Row Heights ===")
for r in range(37, 44):
    print(f"Row {r}: {ws.row_dimensions[r].height}")

print("\n=== Charts ===")
for idx, chart in enumerate(ws._charts):
    print(f"Chart {idx}: Anchor={chart.anchor}, Width={chart.width}, Height={chart.height}, Type={type(chart).__name__}")

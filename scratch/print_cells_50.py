import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (50).xlsx", data_only=False)
ws = wb["Objetivos"]

print("=== Cells (Formulas) ===")
for r in range(35, 75):
    row_vals = [ws.cell(row=r, column=c).value for c in range(1, 15)]
    if any(val is not None for val in row_vals):
        print(f"Row {r:02d}: {row_vals}")

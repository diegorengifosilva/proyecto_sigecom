import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (58).xlsx", data_only=True)
ws = wb["Objetivos"]

print("=== Cell Grid Values ===")
for row in range(35, 45):
    row_vals = [ws.cell(row=row, column=col).value for col in range(1, 15)]
    print(f"Row {row}: {row_vals}")

print("\n=== Row Heights ===")
for row in range(35, 45):
    print(f"Row {row} height: {ws.row_dimensions[row].height}")

print("\n=== Column Widths ===")
for col_letter in ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"]:
    print(f"Col {col_letter} width: {ws.column_dimensions[col_letter].width}")

print("\n=== Charts ===")
for idx, chart in enumerate(ws._charts):
    print(f"Chart {idx}: Title={chart.title}, Anchor={chart.anchor}, Width={chart.width}, Height={chart.height}, Type={type(chart)}")

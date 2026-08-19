import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (58).xlsx", data_only=True)
ws = wb["Objetivos"]

print("=== Column Widths ===")
for col_num in range(1, 16):
    col_letter = openpyxl.utils.get_column_letter(col_num)
    print(f"Col {col_letter}: {ws.column_dimensions[col_letter].width}")

print("\n=== Row Heights ===")
for row in range(35, 45):
    print(f"Row {row}: {ws.row_dimensions[row].height}")

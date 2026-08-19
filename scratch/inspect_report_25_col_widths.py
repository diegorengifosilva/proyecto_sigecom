import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (25).xlsx")
ws = wb["2012 - 2026"]

print("--- Column Widths in sheet '2012 - 2026' ---")
for col_num in range(1, 45):
    col_letter = openpyxl.utils.get_column_letter(col_num)
    width = ws.column_dimensions[col_letter].width
    print(f"  Col {col_letter} ({col_num:02d}) | Width: {width}")

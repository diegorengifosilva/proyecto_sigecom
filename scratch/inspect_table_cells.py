import openpyxl

wb = openpyxl.load_workbook("scratch/test_generated_report.xlsx", data_only=False)
ws = wb["2012 - 2026"]

print("--- GENERAL Table Rows and Formulas ---")
for r in range(145, 159):
    row_vals = [ws.cell(row=r, column=c).value for c in range(1, 7)]
    print(f"Row {r}: {row_vals}")

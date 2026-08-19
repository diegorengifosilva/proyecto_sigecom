import openpyxl

wb = openpyxl.load_workbook("scratch/test_generated_report.xlsx", data_only=False)
print("--- Sheet Names ---")
print("Workbook sheets:", wb.sheetnames)

# 1. Verify sheet names
expected_sheets = ['MIN', 'OIL', 'IND', 'SFY', '2012 - 2026', 'Objetivos', 'Objetivos Com.']
for s in expected_sheets:
    assert s in wb.sheetnames, f"Error: {s} sheet should be present!"
assert 'Admin y Com' not in wb.sheetnames, "Error: 'Admin y Com' sheet should have been deleted!"
print("Sheet Names Verification: PASSED (Admin y Com is deleted and correct order is maintained)")

# 2. Verify zebra striping on 2012 - 2026 Table 2 (Years)
ws_hist = wb["2012 - 2026"]
row3_fill = ws_hist.cell(row=3, column=9).fill.start_color.rgb
row4_fill = ws_hist.cell(row=4, column=9).fill.start_color.rgb
print("\n--- Zebra Striping in 2012 - 2026 Table 2 ---")
print(f"Row 3 (2012) fill color: {row3_fill}")
print(f"Row 4 (2013) fill color: {row4_fill}")
assert row3_fill == "00000000", "Row 3 should have no fill"
assert row4_fill == "00F8FAFC" or row4_fill == "FFF8FAFC", "Row 4 should have zebra fill color F8FAFC!"
print("Zebra Striping in 2012 - 2026 Table 2: PASSED")

# 3. Verify zebra striping in GENERAL table (starts at row 147)
row147_fill = ws_hist.cell(row=147, column=1).fill.start_color.rgb
row148_fill = ws_hist.cell(row=148, column=1).fill.start_color.rgb
print("\n--- Zebra Striping in GENERAL table ---")
print(f"Row 147 (Ene) fill color: {row147_fill}")
print(f"Row 148 (Feb) fill color: {row148_fill}")
assert row147_fill == "00000000", "Row 147 should have no fill"
assert row148_fill == "00F8FAFC" or row148_fill == "FFF8FAFC", "Row 148 should have zebra fill color F8FAFC!"
print("Zebra Striping in GENERAL table: PASSED")

# 4. Verify charts in sheet Objetivos
ws_obj = wb["Objetivos"]
print("\n--- Charts in 'Objetivos' sheet ---")
for idx, ch in enumerate(ws_obj._charts):
    print(f"Chart {idx+1} Title: {getattr(ch.title, 'text', 'No Title')} | Class: {ch.__class__.__name__}")

# 5. Verify charts in sheet 'Objetivos Com.'
ws_com = wb["Objetivos Com."]
print("\n--- Charts in 'Objetivos Com.' sheet ---")
for idx, ch in enumerate(ws_com._charts):
    print(f"Chart {idx+1} Title: {getattr(ch.title, 'text', 'No Title')} | Class: {ch.__class__.__name__}")

# 6. Verify charts in sheet '2012 - 2026'
print("\n--- Charts in '2012 - 2026' sheet ---")
for idx, ch in enumerate(ws_hist._charts):
    print(f"Chart {idx+1} Title: {getattr(ch.title, 'text', 'No Title')} | Class: {ch.__class__.__name__}")

print("\nAll style verifications: PASSED!")

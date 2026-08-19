import openpyxl

wb = openpyxl.load_workbook("scratch/test_generated_report.xlsx", data_only=True)
ws = wb["Objetivos Com."]

print("\n--- Summary Tables in 'Objetivos Com.' ---")
# Print rows from 28 to 44
for r in range(28, 45):
    row_vals = []
    row_styles = []
    for c in range(2, 6):
        cell = ws.cell(row=r, column=c)
        row_vals.append(cell.value)
        # print cell color, bold font
        fill_color = cell.fill.start_color.rgb if cell.fill and cell.fill.fill_type else "No Fill"
        font_bold = cell.font.bold if cell.font else False
        num_fmt = cell.number_format
        row_styles.append(f"{fill_color}/{'Bold' if font_bold else 'Reg'}/{num_fmt}")
    print(f"Row {r:02d} Values: {row_vals}")
    print(f"Row {r:02d} Styles: {row_styles}")

print("\nCharts in 'Objetivos Com.':", len(ws._charts))
if len(ws._charts) > 0:
    chart = ws._charts[0]
    print("  Chart Class:", chart.__class__.__name__)
    print("  Title:", getattr(chart.title, "text", "No Title") if chart.title else "No Title")
    print("  Anchor:", chart.anchor)
    print("  Width:", chart.width)
    print("  Height:", chart.height)
    print("  Series Count:", len(chart.series))
    for idx, s in enumerate(chart.series):
        print(f"    Series {idx} Title: {s.title}")
        print(f"    Series {idx} solidFill: {s.graphicalProperties.solidFill.srgbClr if s.graphicalProperties.solidFill else 'None'}")
        if hasattr(s, "val") and s.val:
            print(f"    Series {idx} Val Ref:", s.val.numRef.f if getattr(s.val, "numRef", None) else "No numRef")
    if hasattr(chart, "categories") and chart.categories:
        print("  Categories Ref:", chart.categories.numRef.f if getattr(chart.categories, "numRef", None) else "No numRef categories")

import openpyxl

wb = openpyxl.load_workbook("scratch/test_generated_report.xlsx")
ws = wb["2012 - 2026"]

print(f"Total charts: {len(ws._charts)}")
for idx in range(11, 16):
    chart = ws._charts[idx]
    print(f"Chart {idx+1:02d} | Title: {chart.title.text if hasattr(chart.title, 'text') else 'None'} | Anchor: {chart.anchor} | Width: {chart.width} | Height: {chart.height}")

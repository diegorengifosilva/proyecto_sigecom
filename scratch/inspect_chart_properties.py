import openpyxl

wb = openpyxl.load_workbook("scratch/test_generated_report.xlsx")
ws = wb["2012 - 2026"]

print(f"Total charts: {len(ws._charts)}")
for idx in range(11, 16):
    chart = ws._charts[idx]
    print(f"\n[Chart {idx+1:02d}]")
    print(f"  Title: {chart.title.text if hasattr(chart.title, 'text') else 'None'}")
    print(f"  x_axis.delete: {chart.x_axis.delete}")
    print(f"  y_axis.delete: {chart.y_axis.delete}")
    print(f"  legend: {chart.legend}")
    print(f"  y_axis.majorGridlines: {chart.y_axis.majorGridlines}")
    print(f"  plot_area.dTable: {chart.plot_area.dTable}")
    print(f"  dataLabels: {chart.dataLabels}")
    if chart.dataLabels:
        print(f"    showVal: {chart.dataLabels.showVal}")
        print(f"    showCatName: {chart.dataLabels.showCatName}")
        print(f"    showPercent: {chart.dataLabels.showPercent}")

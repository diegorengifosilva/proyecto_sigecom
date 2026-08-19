import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (50).xlsx", data_only=False)
ws = wb["Objetivos"]

chart = ws._charts[3] # Chart 4
sub_doughnut = chart._charts[0]
series = sub_doughnut.series[0]

print("=== Subchart Doughnut Series 1 Properties ===")
print("cat:", series.cat)
print("val:", series.val)
print("dLbls:", series.dLbls)
if series.dLbls:
    print("  showVal:", series.dLbls.showVal)
    print("  showCatName:", series.dLbls.showCatName)
    print("  showSerName:", series.dLbls.showSerName)
    print("  showPercent:", series.dLbls.showPercent)
    print("  txPr (Text properties):", series.dLbls.txPr)
    if series.dLbls.txPr:
        print("    p paragraph count:", len(series.dLbls.txPr.p))
        
print("DataPoints in Doughnut Series 1:")
for dp in series.dPt:
    fill_val = "None"
    if dp.graphicalProperties and dp.graphicalProperties.solidFill:
        fill_val = dp.graphicalProperties.solidFill
    print(f"  DP {dp.idx}: fill={fill_val}")

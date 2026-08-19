import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (50).xlsx", data_only=False)
ws = wb["Objetivos"]

chart = ws._charts[3] # Chart 4
print("Chart 4 Style ID:", chart.style)

# Check if there are font settings in text properties
if hasattr(chart, "txPr") and chart.txPr:
    print("txPr found")
else:
    print("txPr is None/empty")
    
# Let's inspect subchart doughnut series dLbls
sub_doughnut = chart._charts[0]
series = sub_doughnut.series[0]
print("Series dLbls:", series.dLbls)
if series.dLbls and series.dLbls.txPr:
    print("Series dLbls has txPr")

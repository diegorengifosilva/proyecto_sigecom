import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (50).xlsx", data_only=False)
ws = wb["Objetivos"]

chart = ws._charts[3] # Chart 4
print("--- Chart 4 Styles ---")
print("style:", chart.style)

# Check graphicalProperties solidFill of Chart 4
if hasattr(chart, "graphicalProperties") and chart.graphicalProperties:
    gp = chart.graphicalProperties
    print("Chart Area Fill Type:", gp.solidFill)
    if gp.solidFill:
        print("  srgbClr:", getattr(gp.solidFill, "srgbClr", None))
        print("  schemeClr:", getattr(gp.solidFill, "schemeClr", None))
        if gp.solidFill.schemeClr:
            print("    schemeClr.val:", gp.solidFill.schemeClr.val)
            
# Check plot_area graphicalProperties solidFill of Chart 4
if hasattr(chart, "plot_area") and chart.plot_area:
    pa = chart.plot_area
    if hasattr(pa, "graphicalProperties") and pa.graphicalProperties:
        gp_pa = pa.graphicalProperties
        print("Plot Area Fill Type:", gp_pa.solidFill)
        
# Check legend and axis text properties
print("Legend:", chart.legend)
print("Title:", chart.title.text if chart.title else "None")

# Check if there are any custom shapes/drawings or text color settings
sub_chart = chart._charts[0]
print("Subchart type:", sub_chart.__class__.__name__)
if hasattr(sub_chart, "dataLabels") and sub_chart.dataLabels:
    dl = sub_chart.dataLabels
    print("Subchart dataLabels txPr:", dl.txPr)
    if dl.txPr:
        print("  txPr attributes:", dir(dl.txPr))

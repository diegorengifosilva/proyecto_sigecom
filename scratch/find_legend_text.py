import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (32).xlsx")
ws = wb["Objetivos"]

for idx, chart in enumerate(ws._charts):
    print(f"\n--- Chart {idx+1}: {chart.title.text if hasattr(chart.title, 'text') else 'None'} ---")
    
    # Check legend
    print(f"  Legend: {chart.legend}")
    if chart.legend:
        print(f"    Legend Position: {chart.legend.legendPos}")
        print(f"    Header/Layout: {getattr(chart.legend, 'layout', None)}")
        print(f"    Overlay: {chart.legend.overlay}")
        
    # Check y_axis
    if hasattr(chart, "y_axis") and chart.y_axis:
        print(f"  y_axis:")
        print(f"    Delete: {chart.y_axis.delete}")
        print(f"    Title: {chart.y_axis.title}")
        if chart.y_axis.title:
            print(f"      Text: {chart.y_axis.title.text}")
            
    # Check x_axis
    if hasattr(chart, "x_axis") and chart.x_axis:
        print(f"  x_axis:")
        print(f"    Delete: {chart.x_axis.delete}")
        print(f"    Title: {chart.x_axis.title}")
        
    # Check series names
    for s_idx, s in enumerate(chart.series):
        print(f"  Series {s_idx+1}:")
        if s.title:
            print(f"    Title: {s.title.text if hasattr(s.title, 'text') else s.title}")

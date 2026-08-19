import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (50).xlsx", data_only=False)
ws = wb["Objetivos"]

# The gauge charts are Chart 4 and 5 (index 3 and 4)
for idx in [3, 4]:
    chart = ws._charts[idx]
    print(f"\n--- Chart {idx+1} Properties ---")
    
    # Check chart area properties
    if hasattr(chart, "graphicalProperties") and chart.graphicalProperties:
        gp = chart.graphicalProperties
        print("Chart Area gp:")
        print("  solidFill:", gp.solidFill)
        print("  ln:", gp.ln)
        if gp.ln:
            print("    solidFill:", gp.ln.solidFill)
            print("    w:", gp.ln.w)
            
    # Check plot area properties
    if hasattr(chart, "plot_area") and chart.plot_area:
        pa = chart.plot_area
        if hasattr(pa, "graphicalProperties") and pa.graphicalProperties:
            pagp = pa.graphicalProperties
            print("Plot Area gp:")
            print("  solidFill:", pagp.solidFill)
            print("  ln:", pagp.ln)
            
    # Check legend properties
    print("Legend:", chart.legend)
    
    # Check title properties
    if hasattr(chart, "title") and chart.title:
        title = chart.title
        print("Title text:", title.text if hasattr(title, "text") else "None")
        if hasattr(title, "tx") and title.tx:
            print("  tx:", title.tx)
        if hasattr(title, "graphicalProperties") and title.graphicalProperties:
            print("  gp solidFill:", title.graphicalProperties.solidFill)
            
    # Check chart data labels
    if hasattr(chart, "dataLabels") and chart.dataLabels:
        dl = chart.dataLabels
        print("DataLabels:")
        print("  showVal:", dl.showVal)
        print("  showCatName:", dl.showCatName)
        print("  showSerName:", dl.showSerName)
        print("  showPercent:", dl.showPercent)
        
    # Check if there are nested charts
    if hasattr(chart, "_charts"):
        print(f"Nested charts count: {len(chart._charts)}")
        for sub_idx, sub in enumerate(chart._charts):
            print(f"  Subchart {sub_idx+1}: {sub.__class__.__name__}")
            if hasattr(sub, "graphicalProperties") and sub.graphicalProperties:
                print("    gp solidFill:", sub.graphicalProperties.solidFill)
            if hasattr(sub, "plot_area") and sub.plot_area:
                if hasattr(sub.plot_area, "graphicalProperties") and sub.plot_area.graphicalProperties:
                    print("    plot area gp solidFill:", sub.plot_area.graphicalProperties.solidFill)

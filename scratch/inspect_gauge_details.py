import openpyxl

wb = openpyxl.load_workbook("SGC.REG-004 Seguimiento de OC 2026.xlsx", data_only=False)
ws = wb["Objetivos"]

for chart_idx in [3, 4]: # Indices 3 and 4 (0-indexed) for Chart 4 and Chart 5
    chart = ws._charts[chart_idx]
    print(f"\n--- Chart {chart_idx+1}: {chart.__class__.__name__} ---")
    print(f"  Anchor: {getattr(chart, 'anchor', None)}")
    print(f"  Width: {chart.width}, Height: {chart.height}")
    
    # Check if there are multiple chart types plotted (combo chart)
    # openpyxl charts can have a list of charts in chart._charts or chart.chart
    print(f"  Contains chart objects: {getattr(chart, '_charts', 'None')}")
    
    # Check series in detail
    for s_idx, s in enumerate(chart.series):
        print(f"  Series {s_idx+1}:")
        print(f"    Title: {s.title}")
        print(f"    Val Ref: {s.val.numRef.f if hasattr(s, 'val') and s.val and hasattr(s.val, 'numRef') and s.val.numRef else 'None'}")
        print(f"    Cat Ref: {s.cat.strRef.f if hasattr(s, 'cat') and s.cat and hasattr(s.cat, 'strRef') and s.cat.strRef else 'None'}")
        print(f"    DataLabels: {s.dataLabels}")
        if hasattr(s, "graphicalProperties") and s.graphicalProperties:
            print(f"    GraphicalProperties: {s.graphicalProperties}")
        
    # Check if there are nested chart types (e.g. Pie chart for needle)
    if hasattr(chart, "_charts") and chart._charts:
        for nested_idx, nested_chart in enumerate(chart._charts):
            print(f"    Nested Chart {nested_idx+1}: {nested_chart.__class__.__name__}")
            for ns_idx, ns in enumerate(nested_chart.series):
                print(f"      Nested Series {ns_idx+1}:")
                print(f"        Val Ref: {ns.val.numRef.f if hasattr(ns, 'val') and ns.val and hasattr(ns.val, 'numRef') and ns.val.numRef else 'None'}")
                print(f"        Cat Ref: {ns.cat.strRef.f if hasattr(ns, 'cat') and ns.cat and hasattr(ns.cat, 'strRef') and ns.cat.strRef else 'None'}")

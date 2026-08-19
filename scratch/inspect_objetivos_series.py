import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (32).xlsx", data_only=False)
ws = wb["Objetivos"]

for idx, chart in enumerate(ws._charts):
    title_text = "None"
    if chart.title:
        try:
            if hasattr(chart.title, 'text') and chart.title.text:
                title_text = str(chart.title.text)
            else:
                title_text = "RichText"
        except Exception:
            pass
    print(f"\n--- Chart {idx+1}: {title_text} ---")
    print(f"  Class: {chart.__class__.__name__}")
    print(f"  Anchor: {chart.anchor}")
    print(f"  Width: {chart.width} | Height: {chart.height}")
    print(f"  Grouping: {getattr(chart, 'grouping', None)}")
    print(f"  Overlap: {getattr(chart, 'overlap', None)}")
    print(f"  GapWidth: {getattr(chart, 'gapWidth', None)}")
    
    # Print Series details
    for s_idx, s in enumerate(chart.series):
        print(f"  Series {s_idx+1}:")
        if s.title:
            t_ref = getattr(s.title, "strRef", None) or getattr(s.title, "v", None)
            if t_ref and hasattr(t_ref, 'f'):
                print(f"    Title Ref: {t_ref.f}")
            else:
                print(f"    Title: {s.title.text if hasattr(s.title, 'text') else s.title}")
        if hasattr(s, 'val') and s.val:
            numRef = getattr(s.val, "numRef", None)
            if numRef and hasattr(numRef, 'f'):
                print(f"    Val Ref: {numRef.f}")
            else:
                print(f"    Val: {s.val}")
        if hasattr(s, 'cat') and s.cat:
            strRef = getattr(s.cat, "strRef", None) or getattr(s.cat, "numRef", None)
            if strRef and hasattr(strRef, 'f'):
                print(f"    Cat Ref: {strRef.f}")
            else:
                print(f"    Cat: {s.cat}")
            
    # Check dataLabels
    print(f"  dataLabels: {chart.dataLabels}")
    if chart.dataLabels:
        print(f"    showVal: {chart.dataLabels.showVal}")
        print(f"    showCatName: {chart.dataLabels.showCatName}")
        print(f"    showSerName: {chart.dataLabels.showSerName}")
        print(f"    numFmt: {getattr(chart.dataLabels, 'numFmt', None)}")
        print(f"    showLegendKey: {getattr(chart.dataLabels, 'showLegendKey', None)}")

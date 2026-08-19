import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (22).xlsx")
ws = wb["2012 - 2026"]

for idx in range(11, 16):
    chart = ws._charts[idx]
    print(f"\n--- Chart {idx+1} ({chart.title.text if hasattr(chart.title, 'text') else 'No title'}) ---")
    print(f"Anchor: {chart.anchor if hasattr(chart, 'anchor') else 'None'}")
    
    for s_idx, s in enumerate(chart.series):
        print(f"  Series {s_idx}:")
        print(f"    s.title: {s.title}")
        print(f"    s.values: {s.values}")
        if s.values:
            print(f"      s.values type: {type(s.values)}")
            # Try to see if it has numRef, numCache, strRef, etc.
            for attr in dir(s.values):
                if not attr.startswith('_'):
                    val = getattr(s.values, attr)
                    if val is not None and type(val) in [str, int, float, bool]:
                        print(f"        {attr}: {val}")
            # If it has numRef
            if hasattr(s.values, 'numRef') and s.values.numRef:
                print(f"        numRef.f: {s.values.numRef.f}")
            # If it has strRef
            if hasattr(s.values, 'strRef') and s.values.strRef:
                print(f"        strRef.f: {s.values.strRef.f}")
                
        print(f"    s.categories: {s.categories}")
        if s.categories:
            print(f"      s.categories type: {type(s.categories)}")
            if hasattr(s.categories, 'numRef') and s.categories.numRef:
                print(f"        numRef.f: {s.categories.numRef.f}")
            if hasattr(s.categories, 'strRef') and s.categories.strRef:
                print(f"        strRef.f: {s.categories.strRef.f}")
            if hasattr(s.categories, 'axDataSource') and s.categories.axDataSource:
                print(f"        axDataSource: {s.categories.axDataSource}")

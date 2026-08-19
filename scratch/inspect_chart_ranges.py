import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (22).xlsx")
ws = wb["2012 - 2026"]

for idx in range(11, 16):
    chart = ws._charts[idx]
    title_text = "No Title"
    if chart.title:
        if hasattr(chart.title, 'text'):
            title_text = str(chart.title.text)
        elif hasattr(chart.title, 'tx') and hasattr(chart.title.tx, 'rich'):
            texts = []
            for p in chart.title.tx.rich.p:
                for r in p.r:
                    if hasattr(r, 't'):
                        texts.append(r.t)
            title_text = "".join(texts)
            
    print(f"\nChart {idx+1:02d} | Title: {title_text} | Anchor: {chart.anchor if hasattr(chart, 'anchor') else 'Unknown'}")
    
    if hasattr(chart, 'series') and chart.series:
        for s_idx, s in enumerate(chart.series):
            # Check s.values
            val_ref = "None"
            if hasattr(s, 'values') and s.values:
                if hasattr(s.values, 'numRef') and s.values.numRef:
                    val_ref = s.values.numRef.f
                elif hasattr(s.values, 'strRef') and s.values.strRef:
                    val_ref = s.values.strRef.f
            # Check categories
            cat_ref = "None"
            if hasattr(s, 'categories') and s.categories:
                if hasattr(s.categories, 'numRef') and s.categories.numRef:
                    cat_ref = s.categories.numRef.f
                elif hasattr(s.categories, 'strRef') and s.categories.strRef:
                    cat_ref = s.categories.strRef.f
            print(f"  Series {s_idx} | Values Ref: {val_ref} | Categories Ref: {cat_ref}")

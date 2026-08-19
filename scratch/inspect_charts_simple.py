import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (22).xlsx")
ws = wb["2012 - 2026"]
print(f"Total charts in '2012 - 2026': {len(ws._charts)}")

for idx, chart in enumerate(ws._charts):
    # Try to extract title cleanly
    title_val = "Unknown Title"
    if chart.title:
        try:
            if hasattr(chart.title, 'text'):
                title_val = str(chart.title.text)
            elif hasattr(chart.title, 'tx') and hasattr(chart.title.tx, 'rich'):
                title_val = "".join(r.t for p in chart.title.tx.rich.p for r in p.r if hasattr(r, 't'))
            else:
                title_val = str(chart.title)
        except Exception as e:
            title_val = f"Error extracting title: {e}"
            
    # Try to extract anchor cell cleanly
    anchor_cell = "Unknown"
    if hasattr(chart, 'anchor') and chart.anchor:
        try:
            if hasattr(chart.anchor, '_from') and chart.anchor._from:
                col = chart.anchor._from.col
                row = chart.anchor._from.row
                col_letter = openpyxl.utils.get_column_letter(col + 1)
                anchor_cell = f"{col_letter}{row + 1}"
            else:
                anchor_cell = str(chart.anchor)
        except Exception:
            pass
            
    print(f"\n[Chart {idx+1}]")
    print(f"  Title: {title_val.strip()}")
    print(f"  Type: {chart.__class__.__name__}")
    print(f"  Anchor Cell: {anchor_cell}")
    print(f"  Width: {getattr(chart, 'width', 'Unknown')}, Height: {getattr(chart, 'height', 'Unknown')}")
    
    if hasattr(chart, 'series') and chart.series:
        print(f"  Series ({len(chart.series)}):")
        for s_idx, s in enumerate(chart.series):
            # values reference
            val_ref = "None"
            if hasattr(s, 'values') and s.values:
                try:
                    if hasattr(s.values, 'numRef') and s.values.numRef:
                        val_ref = s.values.numRef.f
                    elif hasattr(s.values, 'strRef') and s.values.strRef:
                        val_ref = s.values.strRef.f
                except Exception:
                    pass
            
            # categories reference
            cat_ref = "None"
            if hasattr(s, 'categories') and s.categories:
                try:
                    if hasattr(s.categories, 'numRef') and s.categories.numRef:
                        cat_ref = s.categories.numRef.f
                    elif hasattr(s.categories, 'strRef') and s.categories.strRef:
                        cat_ref = s.categories.strRef.f
                except Exception:
                    pass
                    
            print(f"    - Series {s_idx}: Values={val_ref}, Categories={cat_ref}")

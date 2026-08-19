import openpyxl
import json

wb = openpyxl.load_workbook("reporte_mensual (22).xlsx")
ws = wb["2012 - 2026"]

charts_info = []
for idx, chart in enumerate(ws._charts):
    info = {
        "index": idx + 1,
        "class": chart.__class__.__name__,
        "width": getattr(chart, "width", None),
        "height": getattr(chart, "height", None),
        "anchor": None
    }
    
    # Extract anchor
    if hasattr(chart, 'anchor') and chart.anchor:
        try:
            if hasattr(chart.anchor, '_from') and chart.anchor._from:
                col = chart.anchor._from.col
                row = chart.anchor._from.row
                col_letter = openpyxl.utils.get_column_letter(col + 1)
                info["anchor"] = f"{col_letter}{row + 1}"
        except Exception:
            pass
            
    # Extract title text safely without triggering repr() on rich text objects
    title_text = None
    if chart.title:
        try:
            if hasattr(chart.title, 'text') and isinstance(chart.title.text, str):
                title_text = chart.title.text
            elif hasattr(chart.title, 'tx') and hasattr(chart.title.tx, 'rich') and chart.title.tx.rich:
                texts = []
                for p in chart.title.tx.rich.p:
                    for r in p.r:
                        if hasattr(r, 't') and isinstance(r.t, str):
                            texts.append(r.t)
                if texts:
                    title_text = "".join(texts)
        except Exception:
            pass
            
    info["title"] = title_text
    
    # Series
    series_info = []
    if hasattr(chart, 'series') and chart.series:
        for s in chart.series:
            val_ref = None
            if hasattr(s, 'values') and s.values:
                try:
                    if hasattr(s.values, 'numRef') and s.values.numRef:
                        val_ref = s.values.numRef.f
                    elif hasattr(s.values, 'strRef') and s.values.strRef:
                        val_ref = s.values.strRef.f
                except Exception:
                    pass
            cat_ref = None
            if hasattr(s, 'categories') and s.categories:
                try:
                    if hasattr(s.categories, 'numRef') and s.categories.numRef:
                        cat_ref = s.categories.numRef.f
                    elif hasattr(s.categories, 'strRef') and s.categories.strRef:
                        cat_ref = s.categories.strRef.f
                except Exception:
                    pass
            series_info.append({"values": val_ref, "categories": cat_ref})
    info["series"] = series_info
    
    charts_info.append(info)

with open("scratch/charts.json", "w") as f:
    json.dump(charts_info, f, indent=2)
print("Successfully wrote scratch/charts.json")

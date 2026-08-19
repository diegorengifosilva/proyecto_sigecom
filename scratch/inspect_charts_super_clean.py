import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (22).xlsx")
ws = wb["2012 - 2026"]
print(f"Total charts in '2012 - 2026': {len(ws._charts)}")

for idx, chart in enumerate(ws._charts):
    title_text = "No text"
    if chart.title:
        try:
            if hasattr(chart.title, 'text') and chart.title.text:
                title_text = str(chart.title.text)
            elif hasattr(chart.title, 'tx') and hasattr(chart.title.tx, 'rich') and chart.title.tx.rich:
                texts = []
                for p in chart.title.tx.rich.p:
                    for r in p.r:
                        if hasattr(r, 't') and r.t:
                            texts.append(r.t)
                if texts:
                    title_text = "".join(texts)
            else:
                title_text = f"Title object ({chart.title.__class__.__name__})"
        except Exception as e:
            title_text = f"Error: {e}"

    anchor_cell = "Unknown"
    if hasattr(chart, 'anchor') and chart.anchor:
        try:
            if hasattr(chart.anchor, '_from') and chart.anchor._from:
                col = int(chart.anchor._from.col)
                row = int(chart.anchor._from.row)
                col_letter = openpyxl.utils.get_column_letter(col + 1)
                anchor_cell = f"{col_letter}{row + 1}"
        except Exception:
            pass

    print(f"Chart {idx+1:02d} | Title: {title_text.strip()} | Type: {chart.__class__.__name__} | Anchor: {anchor_cell} | Size: {chart.width}x{chart.height}")

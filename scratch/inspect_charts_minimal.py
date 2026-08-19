import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (22).xlsx")
ws = wb["2012 - 2026"]
print(f"Total charts: {len(ws._charts)}")
for i, c in enumerate(ws._charts):
    title = "N/A"
    try:
        if c.title and hasattr(c.title, 'text'):
            title = c.title.text
    except Exception:
        pass
    print(f"Chart {i+1:02d}: class={c.__class__.__name__} title={title}")

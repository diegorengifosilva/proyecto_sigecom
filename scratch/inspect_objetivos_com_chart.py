import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (62).xlsx", data_only=True)
ws = wb["Objetivos Com."]
print("Charts in Objetivos Com.:", len(ws._charts))
if len(ws._charts) > 0:
    chart = ws._charts[0]
    print("Chart Type:", type(chart))
    print("Title:", getattr(chart.title, "text", "No Title") if chart.title else "No Title")
    print("Anchor:", chart.anchor)
    print("Width:", chart.width)
    print("Height:", chart.height)
    print("Style:", chart.style)
    print("Grouping:", getattr(chart, "grouping", "No grouping"))
    print("Type attribute:", getattr(chart, "type", "No type"))
    print("Data References:")
    for s in chart.series:
        print("  Series Title:", s.title)
        print("  Values (Y-values):", getattr(s.graphicalProperties, "solidFill", "No solid fill"))
        if hasattr(s, "val") and s.val:
            if getattr(s.val, "numRef", None):
                print("    Val Reference (numRef):", s.val.numRef.f)
            elif getattr(s.val, "numLit", None):
                print("    Val Reference (numLit):", s.val.numLit)
        if hasattr(s, "tx") and s.tx:
            if getattr(s.tx, "strRef", None):
                print("    Tx Reference (strRef):", s.tx.strRef.f)
            elif getattr(s.tx, "v", None):
                print("    Tx Reference (v):", s.tx.v)

    # Check categories
    if hasattr(chart, "categories") and chart.categories:
        print("    Categories (cat):", chart.categories.numRef.f if getattr(chart.categories, "numRef", None) else "No numRef categories")

    # Let's inspect rows around 28 to 45
    print("\n--- Cells in 'Objetivos Com.' rows 25 to 45 ---")
    for r in range(25, 46):
        row_vals = [ws.cell(row=r, column=c).value for c in range(1, 10)]
        print(f"Row {r}: {row_vals}")

import openpyxl

wb = openpyxl.load_workbook("SGC.REG-004 Seguimiento de OC 2026.xlsx", data_only=False)
ws = wb["Admin y Com"]

print(f"Total charts: {len(ws._charts)}")
for idx in [0, 1]:
    if idx < len(ws._charts):
        chart = ws._charts[idx]
        print(f"\n--- Chart {idx+1} ---")
        print("Class:", chart.__class__.__name__)
        print("Title:", getattr(chart.title, "text", "No Title") if chart.title else "No Title")
        print("Anchor:", f"col={chart.anchor._from.col}, row={chart.anchor._from.row}" if chart.anchor else "No anchor")
        print("Width:", chart.width)
        print("Height:", chart.height)
        print("Type:", getattr(chart, "type", "None"))
        print("Grouping:", getattr(chart, "grouping", "None"))
        print("Series count:", len(chart.series))
        for s_idx, s in enumerate(chart.series):
            print(f"  Series {s_idx}:")
            if hasattr(s, "val") and s.val:
                print(f"    Val Ref:", s.val.numRef.f if getattr(s.val, "numRef", None) else "No numRef")
            if hasattr(s, "tx") and s.tx:
                print(f"    Tx Ref:", s.tx.strRef.f if getattr(s.tx, "strRef", None) else "No strRef")
        if hasattr(chart, "categories") and chart.categories:
            print("  Categories Ref:", chart.categories.numRef.f if getattr(chart.categories, "numRef", None) else "No numRef categories")

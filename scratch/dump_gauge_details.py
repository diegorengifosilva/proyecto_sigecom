import openpyxl

wb = openpyxl.load_workbook("SGC.REG-004 Seguimiento de OC 2026.xlsx", data_only=False)
ws = wb["Objetivos"]

with open("scratch/chart_details.txt", "w") as f:
    for chart_idx in [3, 4]:
        chart = ws._charts[chart_idx]
        f.write(f"\n=========================================\n")
        f.write(f"Chart {chart_idx+1}: {chart.__class__.__name__}\n")
        f.write(f"Anchor: {getattr(chart, 'anchor', None)}\n")
        f.write(f"Width: {chart.width}, Height: {chart.height}\n")
        f.write(f"FirstSliceAng: {getattr(chart, 'firstSliceAng', None)}\n")
        f.write(f"HoleSize: {getattr(chart, 'holeSize', None)}\n")
        f.write(f"Style: {chart.style}\n")
        
        # Check subcharts
        if hasattr(chart, "_charts"):
            f.write(f"Subcharts count: {len(chart._charts)}\n")
            for sub_idx, sub in enumerate(chart._charts):
                f.write(f"  Subchart {sub_idx+1}: {sub.__class__.__name__}\n")
                if hasattr(sub, "firstSliceAng"):
                    f.write(f"    firstSliceAng: {sub.firstSliceAng}\n")
                if hasattr(sub, "holeSize"):
                    f.write(f"    holeSize: {sub.holeSize}\n")
                for s_idx, s in enumerate(sub.series):
                    f.write(f"    Series {s_idx+1}:\n")
                    f.write(f"      Val Ref: {s.val.numRef.f if hasattr(s, 'val') and s.val and hasattr(s.val, 'numRef') and s.val.numRef else 'None'}\n")
                    f.write(f"      Cat Ref: {s.cat.strRef.f if hasattr(s, 'cat') and s.cat and hasattr(s.cat, 'strRef') and s.cat.strRef else 'None'}\n")
                    if hasattr(s, "graphicalProperties") and s.graphicalProperties:
                        gp = s.graphicalProperties
                        f.write(f"      SolidFill: {getattr(gp, 'solidFill', 'None')}\n")
                        f.write(f"      Line: {getattr(gp, 'ln', 'None')}\n")
                    # Data points details
                    if hasattr(s, "dPt") and s.dPt:
                        f.write(f"      DataPoints count: {len(s.dPt)}\n")
                        for dp in s.dPt:
                            fill_color = "None"
                            if hasattr(dp, "graphicalProperties") and dp.graphicalProperties:
                                if hasattr(dp.graphicalProperties, "solidFill") and dp.graphicalProperties.solidFill:
                                    fill_color = dp.graphicalProperties.solidFill
                            f.write(f"        DP {dp.idx}: fill={fill_color}\n")
        
        # Main chart series
        f.write(f"Main chart series count: {len(chart.series)}\n")
        for s_idx, s in enumerate(chart.series):
            f.write(f"  Series {s_idx+1}:\n")
            f.write(f"    Val Ref: {s.val.numRef.f if hasattr(s, 'val') and s.val and hasattr(s.val, 'numRef') and s.val.numRef else 'None'}\n")
            f.write(f"    Cat Ref: {s.cat.strRef.f if hasattr(s, 'cat') and s.cat and hasattr(s.cat, 'strRef') and s.cat.strRef else 'None'}\n")
            if hasattr(s, "graphicalProperties") and s.graphicalProperties:
                gp = s.graphicalProperties
                f.write(f"    SolidFill: {getattr(gp, 'solidFill', 'None')}\n")
                f.write(f"    Line: {getattr(gp, 'ln', 'None')}\n")
            if hasattr(s, "dPt") and s.dPt:
                f.write(f"    DataPoints count: {len(s.dPt)}\n")
                for dp in s.dPt:
                    fill_color = "None"
                    if hasattr(dp, "graphicalProperties") and dp.graphicalProperties:
                        if hasattr(dp.graphicalProperties, "solidFill") and dp.graphicalProperties.solidFill:
                            fill_color = dp.graphicalProperties.solidFill
                    f.write(f"      DP {dp.idx}: fill={fill_color}\n")
                    
print("Done writing scratch/chart_details.txt")

import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (50).xlsx", data_only=False)
ws = wb["Objetivos"]

for idx in [3, 4]:
    chart = ws._charts[idx]
    print(f"\nChart {idx+1}: {chart.title.text if chart.title else 'None'} ({chart.__class__.__name__})")
    
    # Check if there are subcharts
    subcharts = getattr(chart, "_charts", [])
    print(f"  Subcharts: {len(subcharts)}")
    for s_idx, sub in enumerate(subcharts):
        print(f"    Subchart {s_idx+1}: {sub.__class__.__name__}")
        for ser_idx, s in enumerate(sub.series):
            print(f"      Series {ser_idx+1}:")
            if hasattr(s, "dPt") and s.dPt:
                print(f"        DataPoints count: {len(s.dPt)}")
                for dp in s.dPt:
                    fill_color = "None"
                    if hasattr(dp, "graphicalProperties") and dp.graphicalProperties:
                        if hasattr(dp.graphicalProperties, "solidFill") and dp.graphicalProperties.solidFill:
                            fill_color = dp.graphicalProperties.solidFill
                    print(f"          DP {dp.idx}: fill={fill_color}")
            else:
                print("        No DataPoints found in series")
                
    # Main series
    for ser_idx, s in enumerate(chart.series):
        print(f"  Main Series {ser_idx+1}:")
        if hasattr(s, "dPt") and s.dPt:
            print(f"    DataPoints count: {len(s.dPt)}")
            for dp in s.dPt:
                fill_color = "None"
                if hasattr(dp, "graphicalProperties") and dp.graphicalProperties:
                    if hasattr(dp.graphicalProperties, "solidFill") and dp.graphicalProperties.solidFill:
                        fill_color = dp.graphicalProperties.solidFill
                print(f"      DP {dp.idx}: fill={fill_color}")
        else:
            print("    No DataPoints found in main series")

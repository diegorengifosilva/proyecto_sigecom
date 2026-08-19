import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (39).xlsx")
ws = wb["Objetivos"]

for idx, chart in enumerate(ws._charts):
    print(f"\n--- Chart {idx+1}: {chart.title.text if hasattr(chart.title, 'text') else 'None'} ---")
    
    # Check 3D view properties
    if hasattr(chart, "view3D") and chart.view3D:
        print("  3D View Properties:")
        print(f"    RotX (Pitch): {getattr(chart.view3D, 'rotX', None)}")
        print(f"    RotY (Yaw): {getattr(chart.view3D, 'rotY', None)}")
        print(f"    rAngAx (Right Angle Axes): {getattr(chart.view3D, 'rAngAx', None)}")
        
    for s_idx, s in enumerate(chart.series):
        print(f"  Series {s_idx+1}:")
        
        # Check individual data points
        if hasattr(s, "dPt") and s.dPt:
            print(f"    Total data points configured: {len(s.dPt)}")
            for dp in s.dPt:
                idx_val = dp.idx
                fill_color = "None"
                if hasattr(dp, "graphicalProperties") and dp.graphicalProperties:
                    gp = dp.graphicalProperties
                    if hasattr(gp, "solidFill") and gp.solidFill:
                        sf = gp.solidFill
                        if hasattr(sf, "srgbClr") and sf.srgbClr:
                            if hasattr(sf.srgbClr, "val"):
                                fill_color = str(sf.srgbClr.val)
                            else:
                                fill_color = str(sf.srgbClr)
                        else:
                            fill_color = str(sf)
                print(f"      DataPoint {idx_val}: Color={fill_color}")

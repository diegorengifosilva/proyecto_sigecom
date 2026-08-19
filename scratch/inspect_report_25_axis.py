import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (25).xlsx")
ws = wb["2012 - 2026"]

for idx in range(11, 16):
    chart = ws._charts[idx]
    print(f"\n--- Chart {idx+1} ---")
    x_ax = chart.x_axis
    print(f"dir(x_axis): {[attr for attr in dir(x_ax) if not attr.startswith('_')]}")
    
    # Check lblRotation
    print(f"lblRotation: {getattr(x_ax, 'lblRotation', None)}")
    
    # Check scaling
    print(f"scaling: {x_ax.scaling}")
    
    # Check txPr
    if hasattr(x_ax, 'txPr') and x_ax.txPr:
        print(f"txPr: {type(x_ax.txPr)}")
        print(f"dir(txPr): {[attr for attr in dir(x_ax.txPr) if not attr.startswith('_')]}")
        if hasattr(x_ax.txPr, 'rot') and x_ax.txPr.rot is not None:
            print(f"  rot: {x_ax.txPr.rot}")
        # check bodyPr or other nested elements
        for attr in dir(x_ax.txPr):
            if not attr.startswith('_'):
                val = getattr(x_ax.txPr, attr)
                if val is not None and type(val) not in [str, int, float, bool]:
                    print(f"  {attr} class: {val.__class__.__name__}")

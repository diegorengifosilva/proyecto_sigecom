import openpyxl
import json

wb = openpyxl.load_workbook("reporte_mensual (25).xlsx")
ws = wb["2012 - 2026"]

print(f"Total charts in '2012 - 2026' (reporte_25): {len(ws._charts)}")

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
            
    # Extract title
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
    
    # Check dataLabels details
    dl_info = {}
    if hasattr(chart, 'dataLabels') and chart.dataLabels:
        dl = chart.dataLabels
        dl_info["showVal"] = getattr(dl, "showVal", None)
        dl_info["showCatName"] = getattr(dl, "showCatName", None)
        dl_info["showSerName"] = getattr(dl, "showSerName", None)
        dl_info["showPercent"] = getattr(dl, "showPercent", None)
    info["dataLabels"] = dl_info
    
    # Check axis properties
    ax_info = {}
    if hasattr(chart, 'x_axis') and chart.x_axis:
        ax_info["x_axis_delete"] = getattr(chart.x_axis, "delete", None)
        # Check text rotation
        if hasattr(chart.x_axis, "txPr") and chart.x_axis.txPr:
            ax_info["x_axis_rot"] = getattr(chart.x_axis.txPr, "rot", None)
    if hasattr(chart, 'y_axis') and chart.y_axis:
        ax_info["y_axis_delete"] = getattr(chart.y_axis, "delete", None)
    info["axis"] = ax_info
    
    # Check legend
    info["legend"] = str(chart.legend) if hasattr(chart, 'legend') and chart.legend else "None"
    
    charts_info.append(info)

with open("scratch/charts_25.json", "w") as f:
    json.dump(charts_info, f, indent=2)
print("Successfully wrote scratch/charts_25.json")

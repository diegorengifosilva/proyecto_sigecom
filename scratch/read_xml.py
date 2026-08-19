import zipfile
import xml.etree.ElementTree as ET

with zipfile.ZipFile("reporte_mensual (50).xlsx") as z:
    # Let's find all chart XML files
    chart_names = [name for name in z.namelist() if "xl/charts/chart" in name]
    print("Chart XML files:", chart_names)
    
    # We want to inspect chart1.xml or chart2.xml or chart3.xml or chart4.xml
    # Let's inspect the one containing the gauge doughnut chart
    for name in chart_names:
        content = z.read(name)
        root = ET.fromstring(content)
        # Check if it has a doughnut chart
        if list(root.iter("{http://schemas.openxmlformats.org/drawingml/2006/chart}doughnutChart")):
            print(f"\n=== Found Gauge Chart XML: {name} ===")
            
            # Let's print the background shape properties (spPr) of the chart space
            # The root element is usually <c:chartSpace>
            spPr_el = root.find("{http://schemas.openxmlformats.org/drawingml/2006/chart}spPr")
            if spPr_el is not None:
                print("ChartSpace spPr XML:")
                print(ET.tostring(spPr_el, encoding="unicode")[:1000])
            else:
                print("ChartSpace spPr is None")
                
            # Let's find txPr (Text properties)
            txPr_el = root.find("{http://schemas.openxmlformats.org/drawingml/2006/chart}txPr")
            if txPr_el is not None:
                print("ChartSpace txPr XML:")
                print(ET.tostring(txPr_el, encoding="unicode")[:1000])
            else:
                print("ChartSpace txPr is None")
                
            # Let's check for any style element
            style_el = root.find("{http://schemas.openxmlformats.org/drawingml/2006/chart}style")
            if style_el is not None:
                print("ChartSpace style XML:")
                print(ET.tostring(style_el, encoding="unicode"))
            else:
                print("ChartSpace style is None")

import zipfile
import xml.etree.ElementTree as ET

namespaces = {
    'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'
}

with zipfile.ZipFile("reporte_mensual (25).xlsx", "r") as z:
    # Find all drawing files
    drawing_files = [name for name in z.namelist() if name.startswith("xl/drawings/drawing") and name.endswith(".xml")]
    for df in sorted(drawing_files):
        print(f"\n=== File: {df} ===")
        drawing_xml = z.read(df)
        root = ET.fromstring(drawing_xml)
        
        # Check if there are anchors
        anchors = root.findall('.//xdr:oneCellAnchor', namespaces) + root.findall('.//xdr:twoCellAnchor', namespaces)
        print(f"Total charts/shapes in drawing: {len(anchors)}")
        
        for idx, anchor in enumerate(anchors):
            from_el = anchor.find('xdr:from', namespaces)
            col = from_el.find('xdr:col', namespaces).text
            row = from_el.find('xdr:row', namespaces).text
            
            ext_el = anchor.find('.//xdr:ext', namespaces)
            if ext_el is not None:
                cx = int(ext_el.attrib['cx'])
                cy = int(ext_el.attrib['cy'])
                width_cm = cx / 360000
                height_cm = cy / 360000
                print(f"  Chart {idx+1:02d} | Anchor Row: {int(row)+1}, Col: {int(col)+1} | Width: {width_cm:.2f} cm | Height: {height_cm:.2f} cm")
            else:
                to_el = anchor.find('xdr:to', namespaces)
                if to_el is not None:
                    to_col = to_el.find('xdr:col', namespaces).text
                    to_row = to_el.find('xdr:row', namespaces).text
                    print(f"  Chart {idx+1:02d} | Anchor From Row: {int(row)+1}, Col: {int(col)+1} to Row: {int(to_row)+1}, Col: {int(to_col)+1}")

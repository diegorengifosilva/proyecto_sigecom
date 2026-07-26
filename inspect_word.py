import zipfile
import re

docx_path = 'cotizaciones_api/templates/reportes/plantilla_word.docx'
try:
    with zipfile.ZipFile(docx_path) as z:
        xml_content = z.read('word/document.xml').decode('utf-8')
    
    print("=== SEARCHING FOR DETALLE ===")
    for m in re.finditer(r'DETALLE', xml_content, re.IGNORECASE):
        start = max(0, m.start() - 100)
        end = min(len(xml_content), m.end() + 100)
        print(f"Match at {m.start()}: {xml_content[start:end]}\n")
        
    print("=== SEARCHING FOR PRESUPUESTO ===")
    for m in re.finditer(r'PRESUPUESTO', xml_content, re.IGNORECASE):
        start = max(0, m.start() - 100)
        end = min(len(xml_content), m.end() + 100)
        print(f"Match at {m.start()}: {xml_content[start:end]}\n")
except Exception as e:
    print("Error:", e)

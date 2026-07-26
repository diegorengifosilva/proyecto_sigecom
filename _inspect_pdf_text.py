import os
import fitz  # PyMuPDF

pdf_path = 'cotizaciones_api/ocfiles/2026000074.pdf'
print("File exists:", os.path.exists(pdf_path))

doc = fitz.open(pdf_path)
print("Total pages:", len(doc))

keywords_service1 = ["INTEGRACION", "SILO", "4000"]
keywords_service2 = ["CABLEADO", "CANALIZADO", "VALVULA", "VORTEX"]

for i, page in enumerate(doc):
    text = page.get_text().upper()
    print(f"\n--- PAGE {i+1} ---")
    print(f"Characters on page: {len(text)}")
    
    found1 = [w for w in keywords_service1 if w in text]
    found2 = [w for w in keywords_service2 if w in text]
    
    print(f"Keywords for Service 1 found: {found1}")
    print(f"Keywords for Service 2 found: {found2}")
    
    # If any keywords are found, show context
    for word in found2:
        idx = text.find(word)
        start = max(0, idx - 50)
        end = min(len(text), idx + 50)
        context = text[start:end].replace('\n', ' ')
        print(f"  Context for '{word}': ...{context}...")

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from cotizaciones_api.views import extract_text_from_file, match_apertura_items

id_registro = 2026000141
pdf_path = 'cotizaciones_api/ocfiles/2026000074.pdf'

text = extract_text_from_file(pdf_path, '.pdf')
print("Extracted text length:", len(text))

supplies, services = match_apertura_items(text, id_registro)
print("Matched supplies:", supplies)
print("Matched services:", services)

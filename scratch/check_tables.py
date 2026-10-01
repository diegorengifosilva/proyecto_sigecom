import os, sys, django
sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from django.db import connections
c = connections['vc_sig'].cursor()
c.execute("SHOW TABLES")
tables = [r[0] for r in c.fetchall()]
proy_tables = [t for t in tables if 'proy' in t or 'ev' in t or 'historial' in t]
print("Matching tables in vc_sig:")
for t in sorted(proy_tables):
    print(t)

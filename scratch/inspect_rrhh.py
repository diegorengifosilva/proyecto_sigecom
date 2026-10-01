import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.db import connections

cur = connections['vc_sig'].cursor()

cur.execute("SHOW TABLES LIKE 'rrhh_%'")
tables = [r[0] for r in cur.fetchall()]
print(f"=== RRHH ({len(tables)} tables) ===")
for t in tables:
    cur.execute(f"DESCRIBE `{t}`")
    cols = [r[0] for r in cur.fetchall()]
    print(f"{t}: {cols}")

cur.close()

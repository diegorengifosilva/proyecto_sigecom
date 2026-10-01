import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.db import connections

cur = connections['vc_sig'].cursor()

for prefix in ['rrhh', 'eme', 'emo', 'seg', 'int']:
    cur.execute(f"SHOW TABLES LIKE '{prefix}_%'")
    tables = [r[0] for r in cur.fetchall()]
    print(f"\n=== PREFIX: {prefix} ({len(tables)} tables) ===")
    for t in tables:
        cur.execute(f"DESCRIBE `{t}`")
        cols = [(r[0], r[1]) for r in cur.fetchall()]
        print(f"  TABLE: {t}")
        for col_name, col_type in cols:
            print(f"    - {col_name}: {col_type}")

cur.close()

import sys
import os
import traceback

sys.path.append(os.path.abspath("."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "proyecto_sigecom.settings")

# try initializing django
try:
    import django
    django.setup()
    print("Django setup successful.")
except Exception as e:
    print("Django setup failed:", e)

try:
    import dashboard_api.views
    print("dashboard_api/views.py compiled and imported successfully with no syntax errors!")
except Exception as e:
    print("Compilation/Import failed:")
    traceback.print_exc()

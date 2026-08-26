import os
import sys
import django
import time

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from users.models import Usuario
from dashboard_api.views import objetivos_anuales, logrado_dashboard, kpis_dashboard, tendencias_dashboard

def test():
    factory = APIRequestFactory()
    user = Usuario.objects.filter(activo='1').first()
    if not user:
        print("No active user found!")
        return
        
    request = factory.get('/api/dashboard/resumen_comercial/', {'anno': '2026', 'mes': '%'})
    force_authenticate(request, user=user)
    
    print("Measuring performance of each dashboard sub-view:")
    print("-" * 50)
    
    try:
        t0 = time.time()
        res_obj = objetivos_anuales(request)
        t1 = time.time()
        print(f"objetivos_anuales took: {(t1 - t0) * 1000:.2f} ms | Status: {res_obj.status_code}")
        
        t0 = time.time()
        res_log = logrado_dashboard(request)
        t1 = time.time()
        print(f"logrado_dashboard took: {(t1 - t0) * 1000:.2f} ms | Status: {res_log.status_code}")
        
        t0 = time.time()
        res_kpis = kpis_dashboard(request)
        t1 = time.time()
        print(f"kpis_dashboard took: {(t1 - t0) * 1000:.2f} ms | Status: {res_kpis.status_code}")
        
        t0 = time.time()
        res_tend = tendencias_dashboard(request)
        t1 = time.time()
        print(f"tendencias_dashboard took: {(t1 - t0) * 1000:.2f} ms | Status: {res_tend.status_code}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test()

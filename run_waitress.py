import os
import sys
import django
from waitress import serve

# Configurar el entorno de Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    # Waitress corre de forma nativa en Windows en modo multi-hilo.
    # Por defecto usaremos 8 hilos para procesar hasta 8 peticiones concurrentemente.
    threads = int(os.environ.get('THREADS', 8))
    
    print("=" * 70)
    print("   SERVIDOR DE PRODUCCIÓN WAITRESS ACTIVO (SIGECOM 5.0)")
    print(f"   Escuchando en: http://0.0.0.0:{port}")
    print(f"   Hilos concurrentes: {threads}")
    print("=" * 70)
    print("Presiona Ctrl+C para detener el servidor.")
    
    serve(application, host='0.0.0.0', port=port, threads=threads)

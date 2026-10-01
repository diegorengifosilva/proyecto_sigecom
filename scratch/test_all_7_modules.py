import urllib.request
import json

endpoints = [
    # 1. HSEQ
    ('/api/hseq/dashboard/summary/', 'HSEQ Dashboard'),
    ('/api/hseq/trainings/', 'HSEQ Capacitaciones'),
    
    # 2. PROYECTOS
    ('/api/proyectos/proyectos/', 'Proyectos Lista'),
    ('/api/proyectos-ev/evaluaciones/evaluaciones/', 'Evaluaciones Estratégicas'),

    # 3. RRHH
    ('/api/rrhh/summary/', 'RRHH Dashboard Summary'),
    ('/api/rrhh/employees/', 'RRHH Colaboradores'),
    ('/api/rrhh/recruitment/summary/', 'RRHH Reclutamiento Summary'),
    ('/api/rrhh/recruitment/processes/', 'RRHH Procesos Selección'),
    ('/api/rrhh/configuration/', 'RRHH Configuración Estructura'),
    ('/api/rrhh/me/', 'RRHH Portal Mi Información'),

    # 4. EMERGENCIAS
    ('/api/emergencias/overview/', 'Emergencias Overview'),
    ('/api/emergencias/members/', 'Emergencias Brigadistas'),
    ('/api/emergencias/candidates/', 'Emergencias Candidatos'),
    ('/api/emergencias/program/', 'Emergencias Programa Simulacros'),
    ('/api/emergencias/reports/', 'Emergencias Reportes'),
    ('/api/emergencias/equipment/', 'Emergencias Equipos'),

    # 5. SALUD OCUPACIONAL (EMO)
    ('/api/salud-ocupacional/summary/', 'Salud Ocupacional Summary'),
    ('/api/salud-ocupacional/cases/', 'Salud Ocupacional Expedientes'),
    ('/api/salud-ocupacional/employees/', 'Salud Ocupacional Colaboradores EMO'),
    ('/api/salud-ocupacional/documents/', 'Salud Ocupacional Documentos'),

    # 6. SEGURIDAD
    ('/api/seguridad/users/', 'Seguridad Usuarios'),
    ('/api/seguridad/modules/', 'Seguridad Módulos'),
    ('/api/seguridad/available-employees/', 'Seguridad Colaboradores sin cuenta'),

    # 7. INTEGRACIÓN
    ('/api/integracion/history/', 'Integración Historial'),
    ('/api/v1/hr-sync/history', 'Integración V1 HR-Sync Historial'),
]

success = 0
failed = 0

for ep, name in endpoints:
    url = f"http://127.0.0.1:8000{ep}"
    try:
        req = urllib.request.urlopen(url)
        code = req.getcode()
        content = req.read().decode('utf-8')
        data = json.loads(content)
        count = len(data) if isinstance(data, list) else ('dict' if isinstance(data, dict) else len(content))
        print(f"[OK] [{code}] {name:38} -> {ep} (Type: {type(data).__name__}, Count: {count})")
        success += 1
    except Exception as e:
        print(f"[FAIL] {name:38} -> {ep} Error: {e}")
        failed += 1

print(f"\n==========================================")
print(f"TOTAL RESULT: {success} exitosos, {failed} fallidos.")
print(f"==========================================")

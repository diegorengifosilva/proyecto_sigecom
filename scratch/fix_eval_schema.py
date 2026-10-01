import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.db import connections

cursor = connections['vc_sig'].cursor()

cursor.execute('DESCRIBE proyectos_ev_evaluacionestrategica')
cols = [r[0] for r in cursor.fetchall()]
print('Existing cols in proyectos_ev_evaluacionestrategica:', cols)

columns_to_add = [
    ('proyecto_asociado_id', 'BIGINT NULL'),
    ('estado', "VARCHAR(50) DEFAULT 'borrador'"),
    ('fecha_evaluacion', 'DATETIME(6) NULL'),
    ('alternativa_recomendada_id', 'BIGINT NULL'),
    ('puntaje_mejor_alternativa', 'DECIMAL(10,2) NULL'),
    ('conclusion_ia', 'LONGTEXT NULL'),
    ('metodos_aplicados', 'JSON NULL'),
    ('usuario_id', 'BIGINT NULL'),
]

for col, col_type in columns_to_add:
    if col not in cols:
        print(f'Adding {col}...')
        cursor.execute(f'ALTER TABLE proyectos_ev_evaluacionestrategica ADD COLUMN {col} {col_type}')

print('proyectos_ev_evaluacionestrategica updated!')

for t in ['proyectos_ev_resultadometodoevaluacion', 'proyectos_ev_escenarioevaluacion', 'proyectos_ev_alternativaproyecto', 'proyectos_ev_criterioevaluacion']:
    try:
        cursor.execute(f'DESCRIBE {t}')
        print(f'{t} cols:', [r[0] for r in cursor.fetchall()])
    except Exception as e:
        print(f'{t} error:', e)

print('Done!')

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.db import connections
from django.apps import apps

cursor = connections['vc_sig'].cursor()

models_to_check = [
    'EscenarioEvaluacion',
    'AlternativaProyecto',
    'EvaluacionEstrategica',
    'ResultadoMetodoEvaluacion',
    'ProyectoEv',
    'TareaEv',
    'CurvaEv',
    'HistorialEv'
]

for model_name in models_to_check:
    try:
        model = apps.get_model('proyectos_api', model_name)
        table = model._meta.db_table
        cursor.execute(f"SHOW TABLES LIKE '{table}'")
        if not cursor.fetchall():
            print(f"Table {table} does not exist!")
            continue
        cursor.execute(f"DESCRIBE `{table}`")
        db_cols = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Check model fields
        for field in model._meta.fields:
            col = field.column
            if col not in db_cols:
                print(f"Missing column in {table}: {col} ({field.get_internal_type()})")
                # Determine SQL type
                t = field.get_internal_type()
                sql_type = 'VARCHAR(255) NULL'
                if 'Integer' in t:
                    sql_type = 'INT NULL'
                elif 'Big' in t:
                    sql_type = 'BIGINT NULL'
                elif 'Decimal' in t:
                    sql_type = f'DECIMAL({getattr(field, "max_digits", 10)}, {getattr(field, "decimal_places", 2)}) NULL'
                elif 'DateTime' in t or 'Date' in t:
                    sql_type = 'DATETIME(6) NULL'
                elif 'Text' in t:
                    sql_type = 'LONGTEXT NULL'
                elif 'JSON' in t:
                    sql_type = 'JSON NULL'
                elif 'Boolean' in t:
                    sql_type = 'TINYINT(1) DEFAULT 0'
                
                print(f"  --> Adding {col} {sql_type} to {table}...")
                cursor.execute(f"ALTER TABLE `{table}` ADD COLUMN `{col}` {sql_type}")
                
        # Check m2m tables
        for m2m in model._meta.many_to_many:
            m2m_table = m2m.m2m_db_table()
            cursor.execute(f"SHOW TABLES LIKE '{m2m_table}'")
            if not cursor.fetchall():
                print(f"Missing m2m table: {m2m_table}, creating it...")
                m2m_sql = f"""
                CREATE TABLE IF NOT EXISTS `{m2m_table}` (
                    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
                    `{m2m.m2m_column_name()}` BIGINT NOT NULL,
                    `{m2m.m2m_reverse_name()}` BIGINT NOT NULL,
                    UNIQUE KEY (`{m2m.m2m_column_name()}`, `{m2m.m2m_reverse_name()}`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """
                cursor.execute(m2m_sql)
                print(f"Created {m2m_table}!")
    except Exception as e:
        print(f"Error checking {model_name}: {e}")

print("Sync columns check completed!")

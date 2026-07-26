"""Inspeccion rapida de las tablas tipo_marca y producto"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import pymysql

HOST, PORT, USER, PASSWORD = "127.0.0.1", 3306, "admin", "270509"

def conectar(db):
    return pymysql.connect(host=HOST, port=PORT, user=USER, password=PASSWORD,
                           database=db, charset="utf8mb4",
                           cursorclass=pymysql.cursors.DictCursor)

conn = conectar("proyecto_sigecom")
with conn.cursor() as cur:
    print("=== DESCRIBE tipo_marca ===")
    cur.execute("DESCRIBE tipo_marca")
    for r in cur.fetchall(): print(r)

    print("\n=== DESCRIBE unidad_medida ===")
    cur.execute("DESCRIBE unidad_medida")
    for r in cur.fetchall(): print(r)

    print("\n=== DESCRIBE producto ===")
    cur.execute("DESCRIBE producto")
    for r in cur.fetchall(): print(r)

    print("\n=== Muestra tipo_marca (10) ===")
    cur.execute("SELECT * FROM tipo_marca LIMIT 10")
    for r in cur.fetchall(): print(r)

    print("\n=== Muestra unidad_medida (10) ===")
    cur.execute("SELECT * FROM unidad_medida LIMIT 10")
    for r in cur.fetchall(): print(r)

conn.close()

conn2 = conectar("db_completa")
with conn2.cursor() as cur:
    print("\n=== Muestra sis_alm_tab_articulos (3) ===")
    cur.execute("SELECT * FROM sis_alm_tab_articulos LIMIT 3")
    for r in cur.fetchall(): print(r)

    print("\n=== Total registros origen ===")
    cur.execute("SELECT COUNT(*) as total FROM sis_alm_tab_articulos")
    print(cur.fetchone())

    print("\n=== Valores distintos de 'det' (marca) ===")
    cur.execute("SELECT DISTINCT det FROM sis_alm_tab_articulos ORDER BY det LIMIT 30")
    for r in cur.fetchall(): print(r)

    print("\n=== Valores distintos de 'um' (unidad medida) ===")
    cur.execute("SELECT DISTINCT um FROM sis_alm_tab_articulos ORDER BY um")
    for r in cur.fetchall(): print(r)

conn2.close()

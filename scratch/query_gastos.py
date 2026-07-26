import pymysql

try:
    conn = pymysql.connect(
        host="127.0.0.1",
        user="admin",
        password="270509",
        database="proyecto_sigecom",
        port=3306
    )
    cursor = conn.cursor()
    cursor.execute("SELECT id_tipo_gasto, codigo, nombre, activo FROM tipo_gasto")
    rows = cursor.fetchall()
    print("--- TIPO GASTO ROWS ---")
    for r in rows:
        print(f"ID: {r[0]}, CODIGO: {r[1]}, NOMBRE: {r[2]}, ACTIVO: {r[3]}")
    conn.close()
except Exception as e:
    print("ERROR:", e)

"""
Script de comparacion:
DB origen:  db_completa  -> sis_alm_tab_articulos
DB destino: proyecto_sigecom -> producto

Muestra cuantos articulos del origen YA existen en destino y cuantos NO.
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import pymysql
import sys

# ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────
HOST     = "127.0.0.1"
PORT     = 3306
USER     = "admin"
PASSWORD = "270509"

DB_ORIGEN  = "db_completa"
TBL_ORIGEN = "sis_alm_tab_articulos"

DB_DESTINO  = "proyecto_sigecom"
TBL_DESTINO = "producto"
# ─────────────────────────────────────────────────────────────────────────────


def conectar(db_name):
    return pymysql.connect(
        host=HOST, port=PORT, user=USER, password=PASSWORD,
        database=db_name, charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor
    )


def mostrar_columnas(conn, tabla):
    with conn.cursor() as cur:
        cur.execute(f"DESCRIBE `{tabla}`")
        cols = cur.fetchall()
    print(f"\n{'─'*60}")
    print(f"  Columnas de [{tabla}]")
    print(f"{'─'*60}")
    for c in cols:
        print(f"  {c['Field']:<30} {c['Type']:<25} {c['Null']}")
    return [c['Field'] for c in cols]


def main():
    print("=" * 60)
    print("  COMPARADOR DE ARTÍCULOS / PRODUCTOS")
    print("=" * 60)

    # ── 1. Conectar a ambas DBs ──────────────────────────────────
    try:
        conn_origen  = conectar(DB_ORIGEN)
        print(f"\n[OK] Conectado a [{DB_ORIGEN}]")
    except Exception as e:
        print(f"\n[ERROR] No se pudo conectar a [{DB_ORIGEN}]: {e}")
        sys.exit(1)

    try:
        conn_destino = conectar(DB_DESTINO)
        print(f"[OK] Conectado a [{DB_DESTINO}]")
    except Exception as e:
        print(f"\n[ERROR] No se pudo conectar a [{DB_DESTINO}]: {e}")
        sys.exit(1)

    # ── 2. Mostrar estructura de ambas tablas ────────────────────
    cols_origen  = mostrar_columnas(conn_origen,  TBL_ORIGEN)
    cols_destino = mostrar_columnas(conn_destino, TBL_DESTINO)

    # ── 3. Traer todos los artículos del ORIGEN ──────────────────
    print(f"\n{'─'*60}")
    print(f"  Leyendo artículos de [{DB_ORIGEN}].{TBL_ORIGEN} ...")
    with conn_origen.cursor() as cur:
        cur.execute(f"SELECT * FROM `{TBL_ORIGEN}`")
        articulos_origen = cur.fetchall()
    print(f"  → {len(articulos_origen)} registros encontrados en origen")

    # ── 4. Traer códigos/nombres del DESTINO para comparar ───────
    print(f"\n  Leyendo productos de [{DB_DESTINO}].{TBL_DESTINO} ...")
    with conn_destino.cursor() as cur:
        cur.execute(f"SELECT * FROM `{TBL_DESTINO}`")
        productos_destino = cur.fetchall()
    print(f"  → {len(productos_destino)} registros encontrados en destino")

    # ── 5. Mostrar primeros registros del ORIGEN para ver campos ─
    print(f"\n{'─'*60}")
    print("  MUESTRA (primeros 5 registros del ORIGEN):")
    print(f"{'─'*60}")
    for i, art in enumerate(articulos_origen[:5]):
        print(f"\n  Registro #{i+1}:")
        for k, v in art.items():
            print(f"    {k:<30}: {v}")

    print(f"\n{'─'*60}")
    print("  MUESTRA (primeros 5 registros del DESTINO):")
    print(f"{'─'*60}")
    for i, prod in enumerate(productos_destino[:5]):
        print(f"\n  Registro #{i+1}:")
        for k, v in prod.items():
            print(f"    {k:<30}: {v}")

    # ── 6. Intentar comparación por código y por nombre ──────────
    print(f"\n{'─'*60}")
    print("  ANÁLISIS DE COINCIDENCIAS")
    print(f"{'─'*60}")

    # Detectar columnas clave del origen
    posibles_codigo_origen = [c for c in cols_origen if 'cod' in c.lower() or 'codigo' in c.lower() or 'art' in c.lower()]
    posibles_nombre_origen = [c for c in cols_origen if 'nom' in c.lower() or 'desc' in c.lower() or 'name' in c.lower()]

    print(f"\n  Columnas candidatas para CÓDIGO en origen : {posibles_codigo_origen}")
    print(f"  Columnas candidatas para NOMBRE en origen : {posibles_nombre_origen}")

    # Extraer nombres/códigos del destino para comparar
    nombres_destino = set()
    codigos_destino = set()
    for p in productos_destino:
        if p.get('nombre'):
            nombres_destino.add(str(p['nombre']).strip().upper())
        if p.get('codigo'):
            codigos_destino.add(str(p['codigo']).strip().upper())

    print(f"\n  Productos en destino — códigos únicos : {len(codigos_destino)}")
    print(f"  Productos en destino — nombres únicos : {len(nombres_destino)}")

    # Comparar por cada columna candidata del origen
    for col_origen in posibles_nombre_origen[:3]:
        valores_origen = set()
        for a in articulos_origen:
            v = a.get(col_origen)
            if v:
                valores_origen.add(str(v).strip().upper())

        coincidencias = valores_origen & nombres_destino
        sin_coincidencia = valores_origen - nombres_destino

        print(f"\n  ── Comparando por campo origen [{col_origen}] vs destino [nombre] ──")
        print(f"     Valores únicos en origen  : {len(valores_origen)}")
        print(f"     ✅ YA EXISTEN en destino  : {len(coincidencias)}")
        print(f"     ❌ NO EXISTEN en destino  : {len(sin_coincidencia)}")

        if len(coincidencias) > 0:
            print(f"\n     Ejemplos que SI coinciden (max 5):")
            for v in list(coincidencias)[:5]:
                print(f"       [SI] {v}")

        if len(sin_coincidencia) > 0:
            print(f"\n     Ejemplos que NO estan en destino (max 10):")
            for v in list(sin_coincidencia)[:10]:
                print(f"       [NO] {v}")

    conn_origen.close()
    conn_destino.close()

    print(f"\n{'='*60}")
    print("  FIN DEL ANÁLISIS")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()

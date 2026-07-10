"""
=============================================================
  MIGRADOR v2: db_completa.sis_alm_tab_articulos
              → proyecto_sigecom.producto
=============================================================
CORRECCIONES v2:
  - FASE 1: Crear todas las marcas nuevas con su propio commit
  - FASE 2: Insertar todos los productos (ya existentes omitidos)
  - nombre NULL → usa cod como fallback o '(SIN NOMBRE)'
  - Sin rollbacks parciales que rompan FKs
=============================================================
"""
import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import pymysql

HOST, PORT, USER, PASSWORD = "127.0.0.1", 3306, "admin", "270509"
DB_ORIGEN  = "db_completa"
TBL_ORIGEN = "sis_alm_tab_articulos"
DB_DESTINO = "proyecto_sigecom"

MODO_SIMULACION = "--ejecutar" not in sys.argv

def es_marca_invalida(valor):
    if not valor: return True
    v = str(valor).strip()
    if not v: return True
    if re.fullmatch(r'[\d\-/]+', v): return True
    if re.fullmatch(r'[A-Z0-9]{2,10}[-/][A-Z0-9\-/]+', v): return True
    INVALIDOS = {'NUEVO','S/C','S/M','SM','ADF','POE','MD16',
                 'JUEGO COMPLETO INCLUYE MALETIN + CARGADOR + 2'}
    if v.upper() in INVALIDOS: return True
    if len(v) > 45: return True
    return False

def conectar(db, autocommit=False):
    return pymysql.connect(
        host=HOST, port=PORT, user=USER, password=PASSWORD,
        database=db, charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=autocommit
    )

def safe_decimal(v, default=0.0):
    try: return float(v) if v is not None else default
    except: return default

def safe_int(v, default=0):
    try: return int(v) if v is not None else default
    except: return default

def safe_str(v, max_len=None):
    if v is None: return None
    s = str(v).strip()
    if not s: return None
    return s[:max_len] if max_len else s


def main():
    modo_txt = "*** SIMULACION ***" if MODO_SIMULACION else "*** EJECUCION REAL ***"
    print("=" * 65)
    print(f"  MIGRADOR v2 sis_alm_tab_articulos → producto")
    print(f"  {modo_txt}")
    print("=" * 65)

    # ─── Leer origen ─────────────────────────────────────────────
    conn_orig = conectar(DB_ORIGEN, autocommit=True)
    cur_orig  = conn_orig.cursor()
    cur_orig.execute(f"SELECT * FROM `{TBL_ORIGEN}`")
    articulos_raw = cur_orig.fetchall()
    cur_orig.close(); conn_orig.close()
    print(f"\n  Leidos del origen: {len(articulos_raw)}")

    # ─── Deduplicar por reg ───────────────────────────────────────
    vistos = {}
    dupes  = 0
    sin_cod = 0
    for art in articulos_raw:
        codigo = safe_str(art.get('reg'), 30)
        if not codigo:
            sin_cod += 1; continue
        if codigo not in vistos:
            vistos[codigo] = art
        else:
            dupes += 1
    articulos = list(vistos.values())
    print(f"  Duplicados omitidos en origen: {dupes}")
    print(f"  Sin codigo omitidos          : {sin_cod}")
    print(f"  Unicos a procesar            : {len(articulos)}")

    # ─── Leer codigos ya en destino ───────────────────────────────
    conn_dest = conectar(DB_DESTINO, autocommit=False)
    cur_dest  = conn_dest.cursor()

    cur_dest.execute("SELECT codigo FROM producto")
    codigos_existentes = {str(r['codigo']).strip() for r in cur_dest.fetchall()}
    print(f"\n  Productos ya en destino: {len(codigos_existentes)}")

    a_insertar = [a for a in articulos
                  if safe_str(a.get('reg'), 30) not in codigos_existentes]
    ya_existian = len(articulos) - len(a_insertar)
    print(f"  Ya existian (omitidos) : {ya_existian}")
    print(f"  NUEVOS a insertar      : {len(a_insertar)}")

    if not a_insertar:
        print("\n  No hay registros nuevos. Fin.")
        conn_dest.close(); return

    # ─── FASE 1: Crear marcas nuevas ─────────────────────────────
    print(f"\n{'─'*65}")
    print("  FASE 1: Procesando marcas...")

    # Cargar marcas existentes en cache
    cur_dest.execute("SELECT id_marca, UPPER(nombre) as nom FROM tipo_marca")
    marca_cache = {r['nom']: r['id_marca'] for r in cur_dest.fetchall()}

    marcas_a_crear  = []
    marcas_invalidas = set()

    for art in a_insertar:
        det = art.get('det')
        if es_marca_invalida(det):
            marcas_invalidas.add(str(det).strip() if det else '(vacio)')
            continue
        nombre_up = str(det).strip().upper()[:45]
        if nombre_up not in marca_cache and nombre_up not in [m for m in marcas_a_crear]:
            marcas_a_crear.append(nombre_up)

    print(f"  Det invalidos → Otros(99): {len(marcas_invalidas)}")
    print(f"  Marcas nuevas a crear    : {len(marcas_a_crear)}")

    if not MODO_SIMULACION and marcas_a_crear:
        for nombre_marca in marcas_a_crear:
            cur_dest.execute(
                "INSERT INTO tipo_marca (nombre, activo) VALUES (%s, '1')",
                (nombre_marca,)
            )
        conn_dest.commit()
        # Recargar cache con los nuevos IDs
        cur_dest.execute("SELECT id_marca, UPPER(nombre) as nom FROM tipo_marca")
        marca_cache = {r['nom']: r['id_marca'] for r in cur_dest.fetchall()}
        print(f"  [OK] {len(marcas_a_crear)} marcas creadas y commiteadas.")
    elif MODO_SIMULACION and marcas_a_crear:
        print(f"  [SIM] Se crearian {len(marcas_a_crear)} marcas:")
        for m in marcas_a_crear[:20]:
            print(f"    + {m}")
        if len(marcas_a_crear) > 20:
            print(f"    ... y {len(marcas_a_crear)-20} mas")

    # ─── Cargar cache de unidades de medida ──────────────────────
    cur_dest.execute("SELECT id_medida, UPPER(codigo) as cod, UPPER(nombre) as nom FROM unidad_medida")
    medida_cache = {}
    for r in cur_dest.fetchall():
        if r['cod']: medida_cache[r['cod']] = r['id_medida']
        if r['nom']: medida_cache[r['nom']] = r['id_medida']

    def get_id_medida(um_raw):
        if not um_raw: return None
        um = str(um_raw).strip().upper()
        return medida_cache.get(um)

    def get_id_marca(det_raw):
        if es_marca_invalida(det_raw):
            return 99
        nombre_up = str(det_raw).strip().upper()[:45]
        return marca_cache.get(nombre_up, 99)

    def get_nombre(art):
        """nombre no puede ser NULL → fallback a cod o placeholder"""
        n = safe_str(art.get('nom'))
        if n: return n
        c = safe_str(art.get('cod'))
        if c: return f"[REF: {c}]"
        return f"[REG: {safe_str(art.get('reg'))}]"

    # ─── FASE 2: Insertar productos ───────────────────────────────
    print(f"\n{'─'*65}")
    print(f"  FASE 2: Insertando {len(a_insertar)} productos...")

    SQL = """
        INSERT INTO producto
            (id_marca, codigo, codigo2, nombre, um, id_medida,
             precio_soles, precio_dolares, cantidad,
             stock_min, stock_max, descuento, proveedor, activo)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """

    insertados = 0
    errores    = 0
    err_lista  = []

    # Preview en simulacion
    if MODO_SIMULACION:
        print(f"\n  PREVIEW primeros 5:")
        for i, art in enumerate(a_insertar[:5]):
            id_marca = get_id_marca(art.get('det'))
            nombre   = get_nombre(art)
            print(f"\n  #{i+1}")
            print(f"    codigo    : {safe_str(art.get('reg'),30)}")
            print(f"    codigo2   : {safe_str(art.get('cod'),60)}")
            print(f"    nombre    : {nombre[:80]}")
            print(f"    id_marca  : {id_marca}  (det='{art.get('det')}')")
            print(f"    soles/dol : {safe_decimal(art.get('sol'))} / {safe_decimal(art.get('dol'))}")
            print(f"    cantidad  : {safe_int(art.get('can'))}")
        insertados = len(a_insertar)

    else:
        BATCH = 500
        for i, art in enumerate(a_insertar):
            try:
                row = (
                    get_id_marca(art.get('det')),
                    safe_str(art.get('reg'), 30),
                    safe_str(art.get('cod'), 60),
                    get_nombre(art),
                    safe_str(art.get('um')),
                    get_id_medida(art.get('um')),
                    safe_decimal(art.get('sol')),
                    safe_decimal(art.get('dol')),
                    safe_int(art.get('can')),
                    safe_int(art.get('min')),
                    safe_int(art.get('max')),
                    safe_decimal(art.get('dct')),
                    safe_str(art.get('pro'), 100),
                    1 if str(art.get('activo','1')) == '1' else 0
                )
                cur_dest.execute(SQL, row)
                insertados += 1

                # Commit cada BATCH registros
                if (i + 1) % BATCH == 0:
                    conn_dest.commit()
                    print(f"    ... commit parcial: {i+1}/{len(a_insertar)}")

            except Exception as e:
                errores += 1
                err_lista.append(f"    reg={art.get('reg')} → {e}")

        # Commit final
        conn_dest.commit()
        print(f"  [OK] Commit final realizado.")

    # ─── Resumen ─────────────────────────────────────────────────
    print(f"\n{'='*65}")
    print(f"  RESUMEN FINAL  {'[SIMULACION]' if MODO_SIMULACION else '[EJECUTADO]'}")
    print(f"{'='*65}")
    print(f"  Leidos del origen              : {len(articulos_raw)}")
    print(f"  Duplicados en origen omitidos  : {dupes}")
    print(f"  Sin codigo omitidos            : {sin_cod}")
    print(f"  Ya existian en destino omitidos: {ya_existian}")
    print(f"  {'Se insertarian' if MODO_SIMULACION else 'Insertados OK':<33}: {insertados}")
    print(f"  Errores                        : {errores}")
    if err_lista:
        print(f"\n  ERRORES ({len(err_lista)}):")
        for e in err_lista[:20]: print(e)
        if len(err_lista) > 20:
            print(f"  ... y {len(err_lista)-20} errores mas")

    if MODO_SIMULACION:
        print(f"\n  Para ejecutar:")
        print(f"  env\\Scripts\\python.exe scratch\\migrar_articulos.py --ejecutar")

    print(f"\n{'='*65}\n")
    cur_dest.close()
    conn_dest.close()


if __name__ == "__main__":
    main()

import pymysql
import json

conn = pymysql.connect(
    host='127.0.0.1',
    port=3306,
    user='admin',
    password='270509',
    database='vc_sig'
)
cur = conn.cursor()
cur.execute("SHOW TABLES LIKE 'hseq_%'")
hseq_tables = [r[0] for r in cur.fetchall()]
cur.execute("SHOW TABLES LIKE 'rrhh_%'")
rrhh_tables = [r[0] for r in cur.fetchall()]

schema = {}
for t in hseq_tables + rrhh_tables:
    cur.execute(f"DESCRIBE {t}")
    schema[t] = [{'field': r[0], 'type': r[1], 'null': r[2], 'key': r[3], 'default': str(r[4])} for r in cur.fetchall()]

with open('scratch/vc_sig_schema.json', 'w', encoding='utf-8') as f:
    json.dump(schema, f, indent=2)

print("Schema saved successfully. Total tables:", len(schema))

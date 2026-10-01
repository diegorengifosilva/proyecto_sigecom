import json

with open('scratch/vc_sig_schema.json', 'r', encoding='utf-8') as f:
    schema = json.load(f)

for table, fields in schema.items():
    if table.startswith('hseq_') or table in ['rrhh_colaborador', 'rrhh_area', 'rrhh_cargo', 'rrhh_competencia', 'rrhh_perfil_competencia']:
        print(f"=== {table} ===")
        for f in fields:
            print(f"  {f['field']}: {f['type']} (key={f['key']}, null={f['null']}, default={f['default']})")

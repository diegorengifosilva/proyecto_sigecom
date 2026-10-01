import re

with open('proyectos_api/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix ForeignKeys
content = content.replace(
    'usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="proyectos")',
    'usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="proyectos_ev", db_constraint=False)'
)

content = content.replace("related_name='cronogramas_creados'", "related_name='cronogramas_proyecto_creados', db_constraint=False")
content = content.replace("related_name='documentos_subidos'", "related_name='documentos_proyecto_subidos', db_constraint=False")
content = content.replace("'usuarios.Usuario'", "settings.AUTH_USER_MODEL, db_constraint=False")
content = content.replace("related_name='informes_generados'", "related_name='informes_proyecto_generados'")

models_list = [
    'ProyectoEv', 'HistorialEv', 'TareaEv', 'CurvaEv', 'GastoReal',
    'HorasHombreReal', 'AvanceFisico', 'AvanceFinanciero', 'MiembroEquipoEv',
    'CronogramaVersion', 'Tarea', 'DocumentoProyecto', 'Riesgo', 'Cambio',
    'RecursoProyecto', 'AsignacionRecursoTarea', 'ChecklistCalidad',
    'ItemChecklist', 'Comunicacion', 'Compra', 'Nota', 'InformeEjecutivo',
    'EscenarioEvaluacion', 'AlternativaProyecto', 'EvaluacionEstrategica',
    'ResultadoMetodoEvaluacion'
]

# We will process each model by finding its definition and injecting managed=False and db_table
for m in models_list:
    table_name = 'proyectos_ev_' + m.lower()
    pattern = f'class {m}(models.Model):'
    idx = content.find(pattern)
    if idx != -1:
        # find where next class starts
        next_match = re.search(r'\nclass\s+[A-Za-z0-9_]+\(', content[idx + len(pattern):])
        if next_match:
            end_idx = idx + len(pattern) + next_match.start()
        else:
            end_idx = len(content)
        
        class_body = content[idx:end_idx]
        if 'class Meta:' in class_body:
            # Check if db_table already there
            if 'db_table' not in class_body:
                meta_pos = class_body.find('class Meta:') + len('class Meta:\n')
                class_body = class_body[:meta_pos] + f'        db_table = "{table_name}"\n        managed = False\n' + class_body[meta_pos:]
        else:
            meta_str = f'\n    class Meta:\n        db_table = "{table_name}"\n        managed = False\n'
            class_body = class_body.rstrip() + meta_str + '\n'
        
        content = content[:idx] + class_body + content[end_idx:]

with open('proyectos_api/models.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Models updated with db_table and managed=False successfully.")

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('proyectos_ev', '0005_tareaev_area_tareaev_rol_tareaev_tipo_responsable'),
    ]

    operations = [
        migrations.AddField(
            model_name='proyectoev',
            name='analisis_ia_cache',
            field=models.JSONField(blank=True, help_text='Último análisis IA generado', null=True),
        ),
        migrations.AddField(
            model_name='proyectoev',
            name='analisis_ia_fecha',
            field=models.DateTimeField(blank=True, help_text='Fecha/hora del último análisis IA', null=True),
        ),
    ]

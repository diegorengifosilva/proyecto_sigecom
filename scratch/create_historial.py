import os, sys, django
sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from django.db import connections

sql = """
CREATE TABLE IF NOT EXISTS `proyectos_ev_historialev` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `fecha_registro` date NOT NULL,
  `porcentaje_avance_fisico` double NOT NULL DEFAULT 0,
  `porcentaje_tiempo_transcurrido` double NOT NULL DEFAULT 0,
  `valor_ganado` double NOT NULL DEFAULT 0,
  `valor_planificado` double NOT NULL DEFAULT 0,
  `costo_real` double NOT NULL DEFAULT 0,
  `desviacion_costo` double NOT NULL DEFAULT 0,
  `desviacion_tiempo` double NOT NULL DEFAULT 0,
  `spi` double NOT NULL DEFAULT 0,
  `cpi` double NOT NULL DEFAULT 0,
  `eac` double NOT NULL DEFAULT 0,
  `etc` double NOT NULL DEFAULT 0,
  `vac` double NOT NULL DEFAULT 0,
  `tcpi` double NOT NULL DEFAULT 0,
  `proyecto_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `proyectos_ev_historialev_proyecto_id_idx` (`proyecto_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""
with connections['vc_sig'].cursor() as c:
    c.execute(sql)
print("Table proyectos_ev_historialev created or verified successfully in vc_sig.")

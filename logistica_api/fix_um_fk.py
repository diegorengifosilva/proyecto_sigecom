"""Repara FK rota: movimiento_detalle.idunidad_medida -> unidad_medida.id_medida."""
import django
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.db import connection


def fix_fk():
    with connection.cursor() as c:
        c.execute(
            """
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'movimiento_detalle'
              AND CONSTRAINT_NAME = 'fk_movimiento_detalle_unidad_medida1'
            """
        )
        if not c.fetchone():
            print("FK ya no existe; nada que reparar.")
            return

        c.execute(
            """
            SELECT REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND CONSTRAINT_NAME = 'fk_movimiento_detalle_unidad_medida1'
            """
        )
        ref_col = c.fetchone()[0]
        if ref_col == "id_medida":
            print("FK ya apunta a id_medida; nada que reparar.")
            return

        print(f"FK actual referencia unidad_medida.{ref_col}; corrigiendo...")

        c.execute(
            "ALTER TABLE movimiento_detalle "
            "DROP FOREIGN KEY fk_movimiento_detalle_unidad_medida1"
        )
        c.execute(
            """
            ALTER TABLE movimiento_detalle
            ADD CONSTRAINT fk_movimiento_detalle_unidad_medida1
            FOREIGN KEY (idunidad_medida) REFERENCES unidad_medida (id_medida)
            ON DELETE NO ACTION ON UPDATE NO ACTION
            """
        )
        print("FK reparada correctamente.")


if __name__ == "__main__":
    fix_fk()

import os
import django
import sys

# Setup django environment
sys.path.append(r"C:\Users\VC-23031\PROYECTOS\SIGECOM_5")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.db import connection

def main():
    print("Checking indexes on 'cotizaciones' table...")
    with connection.cursor() as cursor:
        cursor.execute("SHOW INDEX FROM cotizaciones")
        indexes = cursor.fetchall()
        
        # Check if index on (id_cliente, id_tipo) already exists
        existing_composite = False
        columns_indexed = {}
        for index in indexes:
            key_name = index[2]
            col_name = index[4]
            seq_in_index = index[3]
            print(f"Index: {key_name}, Column: {col_name}, Seq: {seq_in_index}")
            if key_name not in columns_indexed:
                columns_indexed[key_name] = []
            columns_indexed[key_name].append((seq_in_index, col_name))
            
        # Check if any index has id_cliente and id_tipo as prefix
        for key_name, cols in columns_indexed.items():
            sorted_cols = [c[1] for c in sorted(cols)]
            if len(sorted_cols) >= 2 and sorted_cols[0] == "id_cliente" and sorted_cols[1] == "id_tipo":
                existing_composite = True
                print(f"Found existing composite index: {key_name} on {sorted_cols}")
                break
                
        if not existing_composite:
            print("Creating composite index 'idx_coti_cliente_tipo' on cotizaciones(id_cliente, id_tipo)...")
            try:
                cursor.execute("CREATE INDEX idx_coti_cliente_tipo ON cotizaciones (id_cliente, id_tipo)")
                print("Index created successfully!")
            except Exception as e:
                print(f"Error creating index: {e}")
                print("Checking if we need to create separate indexes instead...")
        else:
            print("Composite index already exists or is covered.")

if __name__ == "__main__":
    main()

import shutil
import os

src = "scratch/test_generated_report.xlsx"
dest = "reporte_mensual (63).xlsx"
dest_copy = "reporte_mensual (63)_copia.xlsx"

print(f"Trying to copy {src} to {dest}...")
try:
    if os.path.exists(dest):
        # Try to rename first or overwrite
        shutil.copyfile(src, dest)
        print(f"Successfully copied report to {dest}!")
        if os.path.exists(dest_copy):
            os.remove(dest_copy)
    else:
        shutil.copyfile(src, dest)
        print(f"Successfully created report {dest}!")
except PermissionError:
    print(f"Warning: Permission denied on {dest}. It is probably open in Excel.")
    print(f"Saving a copy as {dest_copy} instead...")
    shutil.copyfile(src, dest_copy)
    print(f"Successfully saved copy to {dest_copy}!")
except Exception as e:
    print(f"Error copying file: {e}")

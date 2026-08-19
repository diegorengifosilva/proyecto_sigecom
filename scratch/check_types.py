from openpyxl.chart._3d import View3D

print("perspective descriptor:", type(View3D.perspective), getattr(View3D.perspective, "expected_type", None))
print("depthPercent descriptor:", type(View3D.depthPercent), getattr(View3D.depthPercent, "expected_type", None))

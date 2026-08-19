from openpyxl.chart._3d import View3D

v3d = View3D()

# Test perspective
try:
    v3d.perspective = 0.1
    print("Accepted float 0.1 for perspective")
except Exception as e:
    print("Failed float 0.1 for perspective:", type(e), e)

try:
    v3d.perspective = 1
    print("Accepted int 1 for perspective")
except Exception as e:
    print("Failed int 1 for perspective:", type(e), e)

try:
    v3d.perspective = 10
    print("Accepted int 10 for perspective")
except Exception as e:
    print("Failed int 10 for perspective:", type(e), e)

# Test depthPercent
try:
    v3d.depthPercent = 130
    print("Accepted int 130 for depthPercent")
except Exception as e:
    print("Failed int 130 for depthPercent:", type(e), e)

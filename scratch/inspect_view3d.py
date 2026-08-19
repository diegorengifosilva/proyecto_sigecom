from openpyxl.chart.bar_chart import BarChart3D
from openpyxl.chart.pie_chart import PieChart3D

b = BarChart3D()
p = PieChart3D()

print("BarChart3D has view3D:", hasattr(b, "view3D"))
print("PieChart3D has view3D:", hasattr(p, "view3D"))

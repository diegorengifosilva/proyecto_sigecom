import openpyxl
from openpyxl.chart import BarChart3D, Reference

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Test"

# Add some dummy data
ws.append(["Area", "Cuota", "Conseguido"])
ws.append(["Mineria", 600000, 400000])
ws.append(["Industria", 200000, 15000])
ws.append(["Petroquimica", 250000, 180000])
ws.append(["Safety", 90000, 0])

chart = BarChart3D()
chart.type = "col"
chart.grouping = "clustered"
chart.title = "Test Chart Color"

data = Reference(ws, min_col=2, min_row=1, max_row=5)
cats = Reference(ws, min_col=1, min_row=2, max_row=5)
chart.add_data(data, titles_from_data=True)
chart.set_categories(cats)

# Let's try styling the series directly
if len(chart.series) > 0:
    chart.series[0].graphicalProperties.solidFill = "8FAADC"
if len(chart.series) > 1:
    chart.series[1].graphicalProperties.solidFill = "237573"

ws.add_chart(chart, "E2")
wb.save("scratch/test_chart_fill.xlsx")
print("Chart fill test workbook saved successfully!")

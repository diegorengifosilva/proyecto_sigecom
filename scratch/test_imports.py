try:
    from openpyxl.chart.pie_chart import DoughnutChart
    print("DoughnutChart imported successfully.")
except ImportError as e:
    print("DoughnutChart import failed:", e)

try:
    from openpyxl.chart.scatter_chart import ScatterChart
    print("ScatterChart imported successfully.")
except ImportError as e:
    print("ScatterChart import failed:", e)

try:
    from openpyxl.chart.series import XYSeries
    print("XYSeries imported successfully.")
except ImportError as e:
    print("XYSeries import failed:", e)

try:
    from openpyxl.chart.series import DataPoint
    print("DataPoint imported successfully.")
except ImportError as e:
    print("DataPoint import failed:", e)

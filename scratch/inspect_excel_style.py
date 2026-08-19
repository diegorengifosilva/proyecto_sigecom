import openpyxl

wb = openpyxl.load_workbook("reporte_mensual (10).xlsx")

for sheetname in wb.sheetnames:
    ws = wb[sheetname]
    print(f"\n===== Sheet: {sheetname} =====")
    # Title row (Row 1)
    cell_a1 = ws["A1"]
    print(f"A1: val={cell_a1.value}, font={cell_a1.font.name if cell_a1.font else None}, size={cell_a1.font.size if cell_a1.font else None}, color={cell_a1.font.color.rgb if cell_a1.font and cell_a1.font.color else None}, fill={cell_a1.fill.start_color.rgb if cell_a1.fill else None}")
    
    # Headers (Row 2)
    headers = [ws.cell(row=2, column=col).value for col in range(1, 13)]
    h_fill = ws.cell(row=2, column=1).fill
    print(f"Row 2 Headers: {headers}")
    print(f"Row 2 Style: fill_color={h_fill.start_color.rgb if h_fill else None}")
    
    # Row 3 (first data row)
    row3_vals = [ws.cell(row=3, column=col).value for col in range(1, 13)]
    print(f"Row 3: {row3_vals}")
    print(f"Row 3 A: font={ws.cell(row=3, column=1).font.name if ws.cell(row=3, column=1).font else None}, size={ws.cell(row=3, column=1).font.size if ws.cell(row=3, column=1).font else None}")

    # Let's inspect rows around the total row
    # Let's find rows containing 'TOTAL'
    for r in range(1, ws.max_row + 1):
        val = ws.cell(row=r, column=1).value
        if val == "TOTAL" or val == "TOTALES":
            print(f"Total row found at Row {r}: {[ws.cell(row=r, column=c).value for c in range(1, 13)]}")
            t_fill = ws.cell(row=r, column=1).fill
            print(f"Total row style: fill_color={t_fill.start_color.rgb if t_fill else None}, font_bold={ws.cell(row=r, column=1).font.bold if ws.cell(row=r, column=1).font else None}")
            
    # Print the right hand tables summary (e.g. Columns M to Q)
    print("Summary tables columns:")
    for r in range(1, 15):
        m_to_q = [ws.cell(row=r, column=c).value for c in range(13, 19)]
        if any(m_to_q):
            print(f"Row {r}: cols 13-18={m_to_q}")

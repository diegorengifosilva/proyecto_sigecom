// utils/excel.js
export const tableToExcel = (tableId, sheetName, filename) => {
  const uri = "data:application/vnd.ms-excel;base64,";
  const template = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8">
  <style>
    table, th, td { border:1px solid #000; border-collapse:collapse; }
    th { background:#008080; color:#fff; font-weight:bold; text-align:center; }
    td { font-size:12px; }
    .text-right { mso-number-format:"#,##0.00"; text-align:right; }
    .text-center { text-align:center; }
  </style>
  </head>
  <body><table>{table}</table></body></html>`;

  const base64 = s => window.btoa(unescape(encodeURIComponent(s)));
  const format = (s, c) => s.replace(/{(\w+)}/g, (m, p) => c[p]);

  const table = document.getElementById(tableId);
  if (!table) return console.warn("Tabla no encontrada", tableId);

  const ctx = { worksheet: sheetName, table: table.innerHTML };
  const link = document.createElement("a");
  link.href = uri + base64(format(template, ctx));
  link.download = filename;
    link.click();
};

export const nombreArchivoReporte = (prefijo, codigo, referencia) => {
  const slug = (value) =>
    String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.\-]+/g, "_")
      .replace(/^_+|_+$/g, "");
  const code = slug(codigo) || "sin_codigo";
  const ref = slug(referencia);
  return ref ? `${prefijo}_${code}_${ref}` : `${prefijo}_${code}`;
};

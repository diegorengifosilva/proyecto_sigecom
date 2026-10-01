import jsQR from "jsqr";

/**
 * Parsea el contenido de texto extraído de un código QR de SUNAT.
 * Formato estándar SUNAT (separado por pipes '|'):
 * [0] RUC Emisor (11 dígitos)
 * [1] Tipo Comprobante (01: Factura, 03: Boleta, 07: NC, 08: ND)
 * [2] Serie (ej: F001, B001, E001)
 * [3] Correlativo / Número (ej: 00001234 o 1234)
 * [4] Monto IGV (ej: 18.00 o 2.09)
 * [5] Monto Total (ej: 118.00 o 23.00)
 * [6] Fecha Emisión (YYYY-MM-DD o DD/MM/YYYY)
 * [7] Tipo Doc Cliente (6: RUC, 1: DNI, -: Sin doc)
 * [8] Número Doc Cliente
 */
export function parseSunatQr(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { success: false, error: "Contenido QR vacío o no válido" };
  }

  const text = rawText.trim();
  const parts = text.split("|").map((p) => p.trim());

  // Debe tener al menos 4 partes (RUC, tipo, serie, correlativo)
  if (parts.length >= 4) {
    const rawRuc = parts[0].replace(/\D/g, "");
    const rawTipo = parts[1];
    const serie = (parts[2] || "").toUpperCase();
    const rawNum = parts[3] || "";

    // Mapeo de Tipo de Comprobante
    let tipo_doc = "FAC";
    if (rawTipo === "01") tipo_doc = "FAC";
    else if (rawTipo === "03") tipo_doc = "BOL";
    else if (rawTipo === "07") tipo_doc = "NC";
    else if (rawTipo === "08") tipo_doc = "ND";
    else if (rawTipo === "R" || rawTipo === "RH") tipo_doc = "RH";
    else if (serie.startsWith("F")) tipo_doc = "FAC";
    else if (serie.startsWith("B")) tipo_doc = "BOL";

    // Número / Correlativo
    let numero = rawNum.replace(/\D/g, "");
    if (numero) {
      numero = numero.padStart(7, "0");
    } else {
      numero = rawNum;
    }

    // IGV y Total
    const rawIgv = parts[4] ? parseFloat(parts[4].replace(",", ".")) : 0;
    const rawTotal = parts[5] ? parseFloat(parts[5].replace(",", ".")) : 0;

    // Calcular tasa de IGV aproximada
    let igvRate = "18.00";
    if (rawTotal > 0 && rawIgv >= 0) {
      const base = rawTotal - rawIgv;
      if (base > 0) {
        const ratio = rawIgv / base;
        if (Math.abs(ratio - 0.18) < 0.02) {
          igvRate = "18.00";
        } else if (Math.abs(ratio - 0.10) < 0.02) {
          igvRate = "10.00";
        } else if (rawIgv === 0) {
          igvRate = "0.00";
        }
      } else if (rawIgv === 0) {
        igvRate = "0.00";
      }
    }

    // Normalizar Fecha
    let fecha = new Date().toISOString().split("T")[0];
    const rawFecha = parts[6] || "";
    if (rawFecha) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawFecha)) {
        fecha = rawFecha;
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawFecha)) {
        const [d, m, y] = rawFecha.split("/");
        fecha = `${y}-${m}-${d}`;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(rawFecha)) {
        const [d, m, y] = rawFecha.split("-");
        fecha = `${y}-${m}-${d}`;
      }
    }

    return {
      success: true,
      tipoQr: "SUNAT_PIPE",
      data: {
        ruc: rawRuc.length === 11 ? rawRuc : parts[0],
        tipo_doc,
        serie,
        numero,
        importe: rawTotal > 0 ? rawTotal.toFixed(2) : "",
        igv: igvRate,
        fecha,
        rawIgvMonto: rawIgv,
      },
      raw: text,
    };
  }

  // Si contiene URL de consulta SUNAT
  if (text.startsWith("http://") || text.startsWith("https://")) {
    try {
      const url = new URL(text);
      const ruc = url.searchParams.get("ruc") || url.searchParams.get("r");
      const tipo = url.searchParams.get("tipo") || url.searchParams.get("t");
      const serie = url.searchParams.get("serie") || url.searchParams.get("s");
      const numero = url.searchParams.get("numero") || url.searchParams.get("n");
      const monto = url.searchParams.get("monto") || url.searchParams.get("m");
      const fecha = url.searchParams.get("fecha") || url.searchParams.get("f");

      if (ruc || serie || monto) {
        return {
          success: true,
          tipoQr: "SUNAT_URL",
          data: {
            ruc: ruc ? ruc.replace(/\D/g, "") : "",
            tipo_doc: tipo === "01" ? "FAC" : tipo === "03" ? "BOL" : "FAC",
            serie: (serie || "").toUpperCase(),
            numero: numero || "",
            importe: monto ? parseFloat(monto).toFixed(2) : "",
            igv: "18.00",
            fecha: fecha || new Date().toISOString().split("T")[0],
          },
          raw: text,
        };
      }
    } catch {
      // Continuar con fallback
    }
  }

  return { success: false, error: "El código QR no coincide con el formato SUNAT", raw: text };
}

/**
 * Escanea un archivo de imagen o elemento canvas buscando un código QR.
 * Soporta BarcodeDetector nativo o librería jsQR con pre-escalado de imagen.
 */
export async function scanQrFromImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("El archivo no es una imagen válida"));
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // 1. Probar BarcodeDetector nativo si está disponible
          if ("BarcodeDetector" in window) {
            try {
              const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
              const barcodes = await detector.detect(img);
              if (barcodes && barcodes.length > 0) {
                const parsed = parseSunatQr(barcodes[0].rawValue);
                return resolve(parsed);
              }
            } catch (errDet) {
              console.warn("[BarcodeDetector] Fallback a jsQR:", errDet);
            }
          }

          // 2. Procesamiento con jsQR en Canvas
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          // Redimensionar para rendimiento si la imagen es gigante (ej: foto 48MP de celular)
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          const maxDim = 1600;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (code && code.data) {
            const parsed = parseSunatQr(code.data);
            return resolve(parsed);
          }

          // Si no detectó a escala reducida y era muy grande, probar un recorte central o resolución nativa
          if (width !== (img.naturalWidth || img.width)) {
            const nativeCanvas = document.createElement("canvas");
            const nativeCtx = nativeCanvas.getContext("2d", { willReadFrequently: true });
            nativeCanvas.width = img.naturalWidth;
            nativeCanvas.height = img.naturalHeight;
            nativeCtx.drawImage(img, 0, 0);
            const nativeData = nativeCtx.getImageData(0, 0, nativeCanvas.width, nativeCanvas.height);
            const nativeCode = jsQR(nativeData.data, nativeData.width, nativeData.height, {
              inversionAttempts: "attemptBoth",
            });
            if (nativeCode && nativeCode.data) {
              const parsed = parseSunatQr(nativeCode.data);
              return resolve(parsed);
            }
          }

          resolve({ success: false, error: "No se detectó ningún código QR en la imagen." });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("No se pudo cargar la imagen para escanear"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Error leyendo archivo"));
    reader.readAsDataURL(file);
  });
}

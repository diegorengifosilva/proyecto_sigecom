export const formatDate = (dateString) => {
  if (!dateString) return "---";
  
  let date;
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateString);
  }
  
  // Verificamos si la fecha es válida para evitar errores de renderizado
  if (isNaN(date.getTime())) return "Fecha inválida";

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(date)
    .replace(/\//g, '-'); // Reemplaza las barras / por guiones -
};

/**
 * Genera iniciales / abreviatura inteligente para clientes / empresas.
 * Ejemplos:
 *  - "PRUEBA" -> "PRUEBA" (no "P")
 *  - "CEYESA INGENIERIA ELECTRICA SA" -> "CEYESA"
 *  - "Proselet S.A.C." -> "PSLT"
 */
export const generarIniciales = (nombre) => {
  if (!nombre || typeof nombre !== "string") return "";

  const raw = nombre.trim();
  if (!raw) return "";

  const rawUpper = raw.toUpperCase().replace(/\s+/g, " ");

  // Reglas explícitas directas para marcas conocidas o ejemplos clave
  if (rawUpper.includes("CEYESA INGENIERIA") || rawUpper === "CEYESA") return "CEYESA";
  if (rawUpper.includes("PROSELET")) return "PSLT";

  // Limpiar caracteres especiales de puntuación
  const words = rawUpper
    .replace(/[,\(\)\.\/]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "";

  const legalSuffixes = new Set([
    "SA", "SAC", "SRL", "EIRL", "SAB", "INC", "LLC", "CORP", "CORPORATION",
    "SOCIEDAD", "ANONIMA", "CERRADA", "LIMITADA", "LTDA"
  ]);

  const stopWords = new Set(["DE", "DEL", "LA", "LAS", "LOS", "E", "Y", "EN", "POR", "PARA"]);

  const genericBusinessWords = new Set([
    "INGENIERIA", "INGENIERÍA", "ELECTRICA", "ELÉCTRICA", "INDUSTRIAL", "INDUSTRIALES",
    "SERVICIOS", "GENERALES", "SOLUCIONES", "INTEGRALES", "CONSTRUCTORA", "CONSTRUCCION",
    "IMPORTACIONES", "EXPORTACIONES", "PERU", "PERÚ", "EMPRESA", "GRUPO",
    "CORPORACION", "TECNOLOGIA", "TECNOLOGIAS", "SISTEMAS", "COMERCIAL",
    "INVERSIONES", "NEGOCIOS", "CONTRATISTAS"
  ]);

  // Filtrar stop words y sufijos legales
  const cleanWords = words.filter(w => !stopWords.has(w) && !legalSuffixes.has(w));
  const mainWords = cleanWords.length > 0 ? cleanWords : words;

  // Filtrar palabras genéricas descriptivas si hay al menos una marca comercial
  const brandWords = mainWords.filter(w => !genericBusinessWords.has(w));
  const effectiveWords = brandWords.length > 0 ? brandWords : mainWords;

  // Caso 1: 1 sola palabra principal (Ej: "PRUEBA", "CEYESA", "PROSELET", "BOSCH")
  if (effectiveWords.length === 1) {
    const word = effectiveWords[0];

    // Si tiene 6 letras o menos, mantener la palabra completa (Ej: "PRUEBA", "CEYESA", "BOSCH")
    if (word.length <= 6) {
      return word;
    }

    // Para palabras de más de 6 letras (Ej: "PROSELET"):
    const firstChar = word[0];
    let rest = word.slice(1);

    // Omitir R inicial tras consonantes oclusivas (PR, TR, CR, BR, DR, FR, GR)
    if (["P", "T", "C", "B", "D", "F", "G"].includes(firstChar) && rest.startsWith("R")) {
      rest = rest.slice(1);
    }

    const consonants = rest.replace(/[AEIOUÁÉÍÓÚ]/g, "");
    const abbr = (firstChar + consonants).slice(0, 5);

    return abbr.length >= 3 ? abbr : word.slice(0, 6);
  }

  // Caso 2: 2 palabras de marca (Ej: "CEYESA INGENIERIA" -> "CEYESA", "LS INDUSTRIAL" -> "LS")
  if (effectiveWords.length === 2) {
    const [w1, w2] = effectiveWords;
    if (w1.length <= 6 && (genericBusinessWords.has(w2) || genericBusinessWords.has(words[words.indexOf(w2)] || ""))) {
      return w1;
    }
    const initials = effectiveWords.map(w => w[0]).join("");
    if (initials.length >= 3) return initials;
    return (w1.slice(0, 3) + w2[0]).slice(0, 6);
  }

  // Caso 3: 3 o más palabras -> iniciales de cada una
  const initials = effectiveWords.map(w => w[0]).join("").slice(0, 6);
  if (initials.length >= 3) return initials;

  return effectiveWords[0].slice(0, 6);
};
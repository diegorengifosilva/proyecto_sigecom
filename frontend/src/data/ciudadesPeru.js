// Catálogo especializado de Ciudades, Aeropuertos (IATA) y Destinos Terrestres del Perú
// Optimizado para búsqueda instantánea en emisión de pasajes aéreos y terrestres

const stripAccents = (str = "") =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

export const CIUDADES_PERU = [
  // AEROPUERTOS PRINCIPALES Y COMERCIALES (IATA)
  {
    codigo: "LIM",
    iata: "LIM",
    nombre: "LIMA",
    departamento: "Lima / Callao",
    aeropuerto: "Aeropuerto Internacional Jorge Chávez",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "CUZ",
    iata: "CUZ",
    nombre: "CUSCO",
    departamento: "Cusco",
    aeropuerto: "Aeropuerto Int. Alejandro Velasco Astete",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "AQP",
    iata: "AQP",
    nombre: "AREQUIPA",
    departamento: "Arequipa",
    aeropuerto: "Aeropuerto Int. Alfredo Rodríguez Ballón",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "TRU",
    iata: "TRU",
    nombre: "TRUJILLO",
    departamento: "La Libertad",
    aeropuerto: "Aeropuerto Int. Cap. FAP Carlos Martínez de Pinillos",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "PIU",
    iata: "PIU",
    nombre: "PIURA",
    departamento: "Piura",
    aeropuerto: "Aeropuerto Int. Cap. FAP Guillermo Concha Iberico",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "IQT",
    iata: "IQT",
    nombre: "IQUITOS",
    departamento: "Loreto",
    aeropuerto: "Aeropuerto Int. Coronel FAP Francisco Secada Vignetta",
    esAereo: true,
    esTerrestre: false,
  },
  {
    codigo: "TPP",
    iata: "TPP",
    nombre: "TARAPOTO",
    departamento: "San Martín",
    aeropuerto: "Aeropuerto Cadete FAP Guillermo del Castillo Paredes",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "CIX",
    iata: "CIX",
    nombre: "CHICLAYO",
    departamento: "Lambayeque",
    aeropuerto: "Aeropuerto Int. Cap. FAP José A. Quiñones",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "JUL",
    iata: "JUL",
    nombre: "JULIACA / PUNO",
    departamento: "Puno",
    aeropuerto: "Aeropuerto Int. Inca Manco Cápac",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "TCQ",
    iata: "TCQ",
    nombre: "TACNA",
    departamento: "Tacna",
    aeropuerto: "Aeropuerto Int. Coronel FAP Carlos Ciriani Santa Rosa",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "PCL",
    iata: "PCL",
    nombre: "PUCALLPA",
    departamento: "Ucayali",
    aeropuerto: "Aeropuerto Int. Cap. FAP David Abensur Rengifo",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "CAY",
    iata: "CAY",
    nombre: "CAJAMARCA",
    departamento: "Cajamarca",
    aeropuerto: "Aeropuerto Mayor General FAP Armando Revoredo Iglesias",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "AYP",
    iata: "AYP",
    nombre: "AYACUCHO",
    departamento: "Ayacucho",
    aeropuerto: "Aeropuerto Coronel FAP Alfredo Mendívil Duarte",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "PEM",
    iata: "PEM",
    nombre: "PUERTO MALDONADO",
    departamento: "Madre de Dios",
    aeropuerto: "Aeropuerto Int. de Puerto Maldonado",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "TBP",
    iata: "TBP",
    nombre: "TUMBES",
    departamento: "Tumbes",
    aeropuerto: "Aeropuerto Cap. FAP Pedro Canga Rodríguez",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "TYL",
    iata: "TYL",
    nombre: "TALARA",
    departamento: "Piura",
    aeropuerto: "Aeropuerto Cap. FAP Víctor Montes Arias",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "JAU",
    iata: "JAU",
    nombre: "JAUJA / HUANCAYO",
    departamento: "Junín",
    aeropuerto: "Aeropuerto Francisco Carlé",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "HUU",
    iata: "HUU",
    nombre: "HUÁNUCO",
    departamento: "Huánuco",
    aeropuerto: "Aeropuerto Alférez FAP David Figueroa Fernandini",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "ATA",
    iata: "ATA",
    nombre: "ANTA / HUARAZ",
    departamento: "Áncash",
    aeropuerto: "Aeropuerto Cmdte. FAP Germán Arias Graziani",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "ILQ",
    iata: "ILQ",
    nombre: "ILO",
    departamento: "Moquegua",
    aeropuerto: "Aeropuerto de Ilo",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "ANS",
    iata: "ANS",
    nombre: "ANDAHUAYLAS",
    departamento: "Apurímac",
    aeropuerto: "Aeropuerto de Andahuaylas",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "CHM",
    iata: "CHM",
    nombre: "CHIMBOTE",
    departamento: "Áncash",
    aeropuerto: "Aeropuerto Tte. FAP Jaime Montreuil Morales",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "YMS",
    iata: "YMS",
    nombre: "YURIMAGUAS",
    departamento: "Loreto",
    aeropuerto: "Aeropuerto Moisés Benzaquén Rengifo",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "TGI",
    iata: "TGI",
    nombre: "TINGO MARÍA",
    departamento: "Huánuco",
    aeropuerto: "Aeropuerto de Tingo María",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "PIO",
    iata: "PIO",
    nombre: "PISCO",
    departamento: "Ica",
    aeropuerto: "Aeropuerto Int. Cap. FAP Renán Elías Olivera",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "CHH",
    iata: "CHH",
    nombre: "CHACHAPOYAS",
    departamento: "Amazonas",
    aeropuerto: "Aeropuerto de Chachapoyas",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "RIJ",
    iata: "RIJ",
    nombre: "RIOJA",
    departamento: "San Martín",
    aeropuerto: "Aeropuerto Juan Simons Vela",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "NZC",
    iata: "NZC",
    nombre: "NAZCA",
    departamento: "Ica",
    aeropuerto: "Aeródromo María Reiche Neuman",
    esAereo: true,
    esTerrestre: true,
  },

  // CIUDADES Y DESTINOS TERRESTRES PRINCIPALES
  {
    codigo: "HCA",
    nombre: "HUANCAYO",
    departamento: "Junín",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "HRZ",
    nombre: "HUARAZ",
    departamento: "Áncash",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "ICA",
    nombre: "ICA",
    departamento: "Ica",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "CHI",
    nombre: "CHINCHA",
    departamento: "Ica",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "PUN",
    nombre: "PUNO",
    departamento: "Puno",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "MOQ",
    nombre: "MOQUEGUA",
    departamento: "Moquegua",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "ABA",
    nombre: "ABANCAY",
    departamento: "Apurímac",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "HCV",
    nombre: "HUANCAVELICA",
    departamento: "Huancavelica",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "PAS",
    nombre: "CERRO DE PASCO",
    departamento: "Pasco",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "MOY",
    nombre: "MOYOBAMBA",
    departamento: "San Martín",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "JAE",
    nombre: "JAÉN",
    departamento: "Cajamarca",
    aeropuerto: "Aeropuerto de Shumba / Jaén",
    esAereo: true,
    esTerrestre: true,
  },
  {
    codigo: "BAG",
    nombre: "BAGUA GRANDE",
    departamento: "Amazonas",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "SUL",
    nombre: "SULLANA",
    departamento: "Piura",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "PAI",
    nombre: "PAITA",
    departamento: "Piura",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "MAN",
    nombre: "MÁNCORA",
    departamento: "Piura",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "ORG",
    nombre: "LOS ÓRGANOS",
    departamento: "Piura",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "CAN",
    nombre: "CAÑETE",
    departamento: "Lima",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "BAR",
    nombre: "BARRANCA",
    departamento: "Lima",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "HUA",
    nombre: "HUACHO",
    departamento: "Lima",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "HRL",
    nombre: "HUARAL",
    departamento: "Lima",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "TAR",
    nombre: "TARMA",
    departamento: "Junín",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "MER",
    nombre: "LA MERCED / CHANCHAMAYO",
    departamento: "Junín",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "SAT",
    nombre: "SATIPO",
    departamento: "Junín",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "OXA",
    nombre: "OXAPAMPA",
    departamento: "Pasco",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "HMY",
    nombre: "HUARMEY",
    departamento: "Áncash",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "CAS",
    nombre: "CASMA",
    departamento: "Áncash",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "CRZ",
    nombre: "CARAZ",
    departamento: "Áncash",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "YNG",
    nombre: "YUNGAY",
    departamento: "Áncash",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "PAC",
    nombre: "PACASMAYO / CHEPÉN",
    departamento: "La Libertad",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "HMC",
    nombre: "HUAMACHUCO",
    departamento: "La Libertad",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "CAM",
    nombre: "CAMANÁ",
    departamento: "Arequipa",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "MOL",
    nombre: "MOLLENDO",
    departamento: "Arequipa",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "ESP",
    nombre: "ESPINAR / YAURI",
    departamento: "Cusco",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "QUI",
    nombre: "QUILLABAMBA",
    departamento: "Cusco",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "URU",
    nombre: "URUBAMBA / VALLE SAGRADO",
    departamento: "Cusco",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "LBM",
    nombre: "CHALLHUAHUACHO / LAS BAMBAS",
    departamento: "Apurímac",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "MAR",
    nombre: "MARCONA",
    departamento: "Ica",
    esAereo: false,
    esTerrestre: true,
  },
  {
    codigo: "CHZ",
    nombre: "CHINCHERO",
    departamento: "Cusco",
    esAereo: false,
    esTerrestre: true,
  },
].map((c) => ({
  ...c,
  nombreNorm: stripAccents(c.nombre),
  departamentoNorm: stripAccents(c.departamento),
  aeropuertoNorm: stripAccents(c.aeropuerto || ""),
}));

/**
 * Busca y puntúa ciudades del Perú por coincidencia de texto
 * @param {string} query Texto buscado (ej: "LIM", "CUZ", "HUAN", "AREQ")
 * @param {string} transporte "A" para aéreo, "T" para terrestre
 * @returns {Array} Lista filtrada y ordenada de sugerencias
 */
export function buscarCiudadesPeru(query = "", transporte = "A") {
  const isAereo = (transporte || "A").toUpperCase() === "A";
  const cleanQ = stripAccents(query.trim());

  if (!cleanQ) {
    // Si no hay texto, retornar las 8 ciudades más frecuentes según medio de transporte
    return CIUDADES_PERU.filter((c) => (isAereo ? c.esAereo : true)).slice(0, 8);
  }

  const results = [];

  for (const item of CIUDADES_PERU) {
    let score = 0;

    // 1. Coincidencia exacta o inicio con código IATA (ej: LIM, CUZ, AQP)
    if (item.iata) {
      if (item.iata === cleanQ) {
        score += 150;
      } else if (item.iata.startsWith(cleanQ)) {
        score += 120;
      }
    }

    // 2. Coincidencia con nombre de ciudad
    if (item.nombreNorm === cleanQ) {
      score += 140;
    } else if (item.nombreNorm.startsWith(cleanQ)) {
      score += 100;
    } else if (item.nombreNorm.includes(cleanQ)) {
      score += 60;
    }

    // 3. Coincidencia con aeropuerto
    if (item.aeropuertoNorm && item.aeropuertoNorm.includes(cleanQ)) {
      score += 40;
    }

    // 4. Coincidencia con departamento
    if (item.departamentoNorm.includes(cleanQ)) {
      score += 30;
    }

    // Si tiene score positivo, evaluar relevancia por tipo de transporte
    if (score > 0) {
      if (isAereo && item.esAereo) {
        score += 50; // Bonificación a aeropuertos en modo aéreo
      } else if (!isAereo && item.esTerrestre) {
        score += 20; // Bonificación a destinos terrestres
      }

      results.push({ item, score });
    }
  }

  // Ordenar por score descendente y retornar hasta 10 opciones
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 10).map((r) => r.item);
}

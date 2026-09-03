/**
 * Diccionario y utilidades de geolocalización para la Península Ibérica e Islas.
 * Proporciona coordenadas geográficas reales [lng, lat] oficiales.
 */

export interface GeoLocation {
  id: string; // 'ES-28', 'PT-lisboa', etc.
  code: string; // '28', '08', 'lisboa', etc.
  name: string;
  region: string;
  country: 'ES' | 'PT';
  lat: number;
  lng: number;
  isCanarias: boolean;
}

// Provincias de España por código postal (01 a 52)
export const SPANISH_PROVINCES: Record<string, Omit<GeoLocation, 'id' | 'code' | 'isCanarias'>> = {
  '01': { name: 'Álava', region: 'País Vasco', country: 'ES', lat: 42.84, lng: -2.67 },
  '02': { name: 'Albacete', region: 'Castilla-La Mancha', country: 'ES', lat: 38.99, lng: -1.85 },
  '03': { name: 'Alicante', region: 'C. Valenciana', country: 'ES', lat: 38.34, lng: -0.48 },
  '04': { name: 'Almería', region: 'Andalucía', country: 'ES', lat: 36.83, lng: -2.46 },
  '05': { name: 'Ávila', region: 'Castilla y León', country: 'ES', lat: 40.65, lng: -4.70 },
  '06': { name: 'Badajoz', region: 'Extremadura', country: 'ES', lat: 38.87, lng: -6.97 },
  '07': { name: 'Baleares', region: 'Islas Baleares', country: 'ES', lat: 39.57, lng: 2.65 },
  '08': { name: 'Barcelona', region: 'Cataluña', country: 'ES', lat: 41.38, lng: 2.17 },
  '09': { name: 'Burgos', region: 'Castilla y León', country: 'ES', lat: 42.34, lng: -3.70 },
  '10': { name: 'Cáceres', region: 'Extremadura', country: 'ES', lat: 39.47, lng: -6.37 },
  '11': { name: 'Cádiz', region: 'Andalucía', country: 'ES', lat: 36.52, lng: -6.28 },
  '12': { name: 'Castellón', region: 'C. Valenciana', country: 'ES', lat: 39.98, lng: -0.05 },
  '13': { name: 'Ciudad Real', region: 'Castilla-La Mancha', country: 'ES', lat: 38.98, lng: -3.92 },
  '14': { name: 'Córdoba', region: 'Andalucía', country: 'ES', lat: 37.88, lng: -4.77 },
  '15': { name: 'A Coruña', region: 'Galicia', country: 'ES', lat: 43.37, lng: -8.41 },
  '16': { name: 'Cuenca', region: 'Castilla-La Mancha', country: 'ES', lat: 40.07, lng: -2.13 },
  '17': { name: 'Girona', region: 'Cataluña', country: 'ES', lat: 41.98, lng: 2.82 },
  '18': { name: 'Granada', region: 'Andalucía', country: 'ES', lat: 37.17, lng: -3.60 },
  '19': { name: 'Guadalajara', region: 'Castilla-La Mancha', country: 'ES', lat: 40.63, lng: -3.16 },
  '20': { name: 'Gipuzkoa', region: 'País Vasco', country: 'ES', lat: 43.31, lng: -1.98 },
  '21': { name: 'Huelva', region: 'Andalucía', country: 'ES', lat: 37.26, lng: -6.94 },
  '22': { name: 'Huesca', region: 'Aragón', country: 'ES', lat: 42.13, lng: -0.40 },
  '23': { name: 'Jaén', region: 'Andalucía', country: 'ES', lat: 37.77, lng: -3.79 },
  '24': { name: 'León', region: 'Castilla y León', country: 'ES', lat: 42.59, lng: -5.57 },
  '25': { name: 'Lleida', region: 'Cataluña', country: 'ES', lat: 41.61, lng: 0.62 },
  '26': { name: 'La Rioja', region: 'La Rioja', country: 'ES', lat: 42.46, lng: -2.44 },
  '27': { name: 'Lugo', region: 'Galicia', country: 'ES', lat: 43.01, lng: -7.55 },
  '28': { name: 'Madrid', region: 'C. de Madrid', country: 'ES', lat: 40.41, lng: -3.70 },
  '29': { name: 'Málaga', region: 'Andalucía', country: 'ES', lat: 36.72, lng: -4.42 },
  '30': { name: 'Murcia', region: 'R. de Murcia', country: 'ES', lat: 37.99, lng: -1.13 },
  '31': { name: 'Navarra', region: 'C.F. de Navarra', country: 'ES', lat: 42.81, lng: -1.64 },
  '32': { name: 'Ourense', region: 'Galicia', country: 'ES', lat: 42.33, lng: -7.86 },
  '33': { name: 'Asturias', region: 'P. de Asturias', country: 'ES', lat: 43.36, lng: -5.85 },
  '34': { name: 'Palencia', region: 'Castilla y León', country: 'ES', lat: 42.01, lng: -4.53 },
  '35': { name: 'Las Palmas', region: 'Canarias', country: 'ES', lat: 28.12, lng: -15.43 },
  '36': { name: 'Pontevedra', region: 'Galicia', country: 'ES', lat: 42.43, lng: -8.64 },
  '37': { name: 'Salamanca', region: 'Castilla y León', country: 'ES', lat: 40.97, lng: -5.66 },
  '38': { name: 'S.C. Tenerife', region: 'Canarias', country: 'ES', lat: 28.46, lng: -16.25 },
  '39': { name: 'Cantabria', region: 'Cantabria', country: 'ES', lat: 43.46, lng: -3.80 },
  '40': { name: 'Segovia', region: 'Castilla y León', country: 'ES', lat: 40.94, lng: -4.11 },
  '41': { name: 'Sevilla', region: 'Andalucía', country: 'ES', lat: 37.38, lng: -5.98 },
  '42': { name: 'Soria', region: 'Castilla y León', country: 'ES', lat: 41.76, lng: -2.46 },
  '43': { name: 'Tarragona', region: 'Cataluña', country: 'ES', lat: 41.11, lng: 1.25 },
  '44': { name: 'Teruel', region: 'Aragón', country: 'ES', lat: 40.34, lng: -1.10 },
  '45': { name: 'Toledo', region: 'Castilla-La Mancha', country: 'ES', lat: 39.86, lng: -4.02 },
  '46': { name: 'Valencia', region: 'C. Valenciana', country: 'ES', lat: 39.46, lng: -0.37 },
  '47': { name: 'Valladolid', region: 'Castilla y León', country: 'ES', lat: 41.65, lng: -4.72 },
  '48': { name: 'Bizkaia', region: 'País Vasco', country: 'ES', lat: 43.26, lng: -2.93 },
  '49': { name: 'Zamora', region: 'Castilla y León', country: 'ES', lat: 41.50, lng: -5.74 },
  '50': { name: 'Zaragoza', region: 'Aragón', country: 'ES', lat: 41.65, lng: -0.88 },
  '51': { name: 'Ceuta', region: 'Ceuta', country: 'ES', lat: 35.88, lng: -5.31 },
  '52': { name: 'Melilla', region: 'Melilla', country: 'ES', lat: 35.29, lng: -2.93 },
};

// Distritos de Portugal
export const PORTUGAL_DISTRICTS: Record<string, Omit<GeoLocation, 'id' | 'code' | 'isCanarias'>> = {
  'lisboa': { name: 'Lisboa', region: 'Lisboa', country: 'PT', lat: 38.72, lng: -9.13 },
  'porto': { name: 'Porto', region: 'Norte', country: 'PT', lat: 41.15, lng: -8.62 },
  'braga': { name: 'Braga', region: 'Norte', country: 'PT', lat: 41.55, lng: -8.42 },
  'aveiro': { name: 'Aveiro', region: 'Centro', country: 'PT', lat: 40.64, lng: -8.65 },
  'coimbra': { name: 'Coimbra', region: 'Centro', country: 'PT', lat: 40.20, lng: -8.41 },
  'leiria': { name: 'Leiria', region: 'Centro', country: 'PT', lat: 39.74, lng: -8.80 },
  'faro': { name: 'Faro', region: 'Algarve', country: 'PT', lat: 37.01, lng: -7.93 },
  'setubal': { name: 'Setúbal', region: 'Lisboa', country: 'PT', lat: 38.52, lng: -8.89 },
  'santarem': { name: 'Santarém', region: 'Alentejo', country: 'PT', lat: 39.23, lng: -8.68 },
  'evora': { name: 'Évora', region: 'Alentejo', country: 'PT', lat: 38.57, lng: -7.90 },
  'beja': { name: 'Beja', region: 'Alentejo', country: 'PT', lat: 38.01, lng: -7.86 },
  'viseu': { name: 'Viseu', region: 'Centro', country: 'PT', lat: 40.65, lng: -7.91 },
  'viana do castelo': { name: 'Viana do Castelo', region: 'Norte', country: 'PT', lat: 41.69, lng: -8.83 },
  'vila real': { name: 'Vila Real', region: 'Norte', country: 'PT', lat: 41.30, lng: -7.74 },
  'braganca': { name: 'Bragança', region: 'Norte', country: 'PT', lat: 41.80, lng: -6.75 },
  'guarda': { name: 'Guarda', region: 'Centro', country: 'PT', lat: 40.53, lng: -7.26 },
  'castelo branco': { name: 'Castelo Branco', region: 'Centro', country: 'PT', lat: 39.82, lng: -7.49 },
  'portalegre': { name: 'Portalegre', region: 'Alentejo', country: 'PT', lat: 39.29, lng: -7.43 },
};

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function buildGeoLocation(code: string, data: Omit<GeoLocation, 'id' | 'code' | 'isCanarias'>): GeoLocation {
  const isCanarias = data.country === 'ES' && (code === '35' || code === '38');
  return {
    id: `${data.country}-${code}`,
    code,
    name: data.name,
    region: data.region,
    country: data.country,
    lat: data.lat,
    lng: data.lng,
    isCanarias,
  };
}

/**
 * Obtiene la geolocalización aproximada para un cliente a partir de sus campos de dirección.
 * Si el cliente pertenece a un país extranjero fuera de España o Portugal, devuelve null.
 */
export function getCustomerGeoLocation(customer: {
  post_code?: string | null;
  city?: string | null;
  county?: string | null;
  country_reg_code?: string | null;
}): GeoLocation | null {
  const rawCountry = (customer.country_reg_code || '').trim().toUpperCase();
  const rawPostCode = (customer.post_code || '').trim();
  const city = (customer.city || '').trim();
  const county = (customer.county || '').trim();

  const isSpain = rawCountry === 'ES' || rawCountry === 'ESP' || rawCountry === 'SPAIN' || rawCountry === 'ESPAÑA' || rawCountry === 'E';
  const isPortugal = rawCountry === 'PT' || rawCountry === 'PRT' || rawCountry === 'PORTUGAL' || rawCountry === 'P';
  const isUnknownCountry = !rawCountry;

  // Si tiene un código de país explícito y NO es España ni Portugal -> ES CLIENTE INTERNACIONAL/EXTRANJERO
  if (!isSpain && !isPortugal && !isUnknownCountry) {
    return null;
  }

  // 1. Caso España
  if (isSpain || isUnknownCountry) {
    if (rawPostCode) {
      // Formato estándar español: 5 dígitos o código con prefijo "ES-" / "ES "
      const cleaned = rawPostCode.replace(/^ES-?/i, '').replace(/\s+/g, '');
      const digits = cleaned.replace(/\D/g, '');
      if (digits.length >= 4 && digits.length <= 5) {
        const prefix = digits.length === 4 ? ('0' + digits[0]) : digits.substring(0, 2);
        if (SPANISH_PROVINCES[prefix]) {
          return buildGeoLocation(prefix, SPANISH_PROVINCES[prefix]);
        }
      }
    }

    // Buscar por coincidencia de ciudad o provincia española
    const searchTarget = normalizeString(`${city} ${county}`);
    if (searchTarget) {
      for (const [code, prov] of Object.entries(SPANISH_PROVINCES)) {
        const normProv = normalizeString(prov.name);
        if (searchTarget.includes(normProv)) {
          return buildGeoLocation(code, prov);
        }
      }
    }
  }

  // 2. Caso Portugal
  if (isPortugal || (isUnknownCountry && (rawPostCode.toLowerCase().startsWith('pt') || normalizeString(`${city} ${county}`).includes('portugal')))) {
    const searchTarget = normalizeString(`${city} ${county}`);
    for (const [key, dist] of Object.entries(PORTUGAL_DISTRICTS)) {
      if (searchTarget.includes(key)) {
        return buildGeoLocation(key, dist);
      }
    }

    if (rawPostCode) {
      const cleanPt = rawPostCode.replace(/^PT-?/i, '').replace(/\D/g, '');
      if (cleanPt.length > 0) {
        const ptPrefix = cleanPt[0];
        const distKey = ptPrefix === '1' || ptPrefix === '2' ? 'lisboa' : ptPrefix === '4' ? 'porto' : ptPrefix === '3' ? 'coimbra' : ptPrefix === '8' ? 'faro' : 'lisboa';
        const dist = PORTUGAL_DISTRICTS[distKey];
        return buildGeoLocation(distKey, dist);
      }
    }
  }

  return null;
}

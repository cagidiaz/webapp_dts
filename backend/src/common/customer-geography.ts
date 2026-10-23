import catalog from './customer-geography-catalog.json';

export interface CustomerGeography { county?: string | null; city?: string | null; post_code?: string | null; country_reg_code?: string | null; }
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const districtId = (code: string) => `PT-${code.replace(/\s+/g, '-')}`;

/** Geographic identity, independent of the language/spelling stored in Business Central. */
export function resolveGeographicTerritory(value: string): string | null {
  const key = normalize(value);
  if (key === 'intl' || key.includes('internacional') || key.includes('export')) return 'INTL';
  for (const [code, names] of Object.entries(catalog.ES)) {
    if (key === `es-${code}` || names.some(name => normalize(name) === key)) return `ES-${code}`;
  }
  for (const [code, name] of Object.entries(catalog.PT)) {
    if (key === districtId(code).toLowerCase() || key === code || key === normalize(name)) return districtId(code);
  }
  return null;
}

/** Same postal-first classification as the map. Never writes or normalizes stored BC data. */
export function getCustomerGeographicId(customer: CustomerGeography): string | null {
  const country = normalize(customer.country_reg_code || '');
  const postCode = (customer.post_code || '').trim();
  const target = normalize(`${(customer.city || '').trim()} ${(customer.county || '').trim()}`);
  const spain = ['es', 'esp', 'spain', 'espana', 'e'].includes(country);
  const portugal = ['pt', 'prt', 'portugal', 'p'].includes(country);
  const unknown = !country;
  if (!spain && !portugal && !unknown) return 'INTL';
  if (spain || unknown) {
    const digits = postCode.replace(/^ES-?/i, '').replace(/\s+/g, '').replace(/\D/g, '');
    if (digits.length >= 4 && digits.length <= 5) {
      const prefix = digits.length === 4 ? `0${digits[0]}` : digits.slice(0, 2);
      if (prefix in catalog.ES) return `ES-${prefix}`;
    }
    if (target) for (const [code, names] of Object.entries(catalog.ES)) {
      if (names.some(name => target.includes(normalize(name)))) return `ES-${code}`;
    }
  }
  if (portugal || (unknown && (postCode.toLowerCase().startsWith('pt') || target.includes('portugal')))) {
    for (const code of Object.keys(catalog.PT)) if (target.includes(code)) return districtId(code);
    if (postCode) {
      const digits = postCode.replace(/^PT-?/i, '').replace(/\D/g, '');
      if (digits) {
        const code = ['1', '2'].includes(digits[0]) ? 'lisboa' : digits[0] === '4' ? 'porto' : digits[0] === '3' ? 'coimbra' : digits[0] === '8' ? 'faro' : 'lisboa';
        return districtId(code);
      }
    }
  }
  return null;
}

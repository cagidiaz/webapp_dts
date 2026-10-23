import { getCustomerGeographicId, resolveGeographicTerritory } from './customer-geography';
import { CustomersService } from '../modules/customers/customers.service';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const frontend: any = {};
const source = readFileSync(resolve(__dirname, '../../../frontend/src/utils/geoCoordinates.ts'), 'utf8');
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(frontend);

describe('Identidad geográfica del mapa y filtro de clientes', () => {
  it.each(['Vizcaya', 'Bizkaia', 'Bizkaia/Vizcaya', 'Viscaya', 'ES-48'])('resuelve %s como Vizcaya', value => {
    expect(resolveGeographicTerritory(value)).toBe('ES-48');
    expect(frontend.getTerritoryZone(value)).toMatchObject({ id: 'ES-48', name: 'Vizcaya' });
  });
  it('mantiene IDs y etiquetas compatibles para todas las provincias, alias y distritos', () => {
    for (const [code, province] of Object.entries(frontend.SPANISH_PROVINCES) as [string, any][]) {
      for (const name of [province.name, ...(frontend.SPANISH_PROVINCE_ALIASES[code] || [])]) {
        expect(resolveGeographicTerritory(name)).toBe(`ES-${code}`);
        expect(getCustomerGeographicId({ county: name, country_reg_code: 'ES' })).toBe(frontend.getCustomerGeoLocation({ county: name, country_reg_code: 'ES' })?.id);
      }
    }
    for (const [code, district] of Object.entries(frontend.PORTUGAL_DISTRICTS) as [string, any][]) {
      const id = `PT-${code.replace(/\s+/g, '-')}`;
      expect(resolveGeographicTerritory(district.name)).toBe(id);
      expect(getCustomerGeographicId({ county: district.name, country_reg_code: 'PT' })).toBe(frontend.getCustomerGeoLocation({ county: district.name, country_reg_code: 'PT' })?.id);
    }
  });
  it.each([
    [{ country_reg_code: 'ES', post_code: 'ES-48001', county: 'Vizcaya' }, 'ES-48'],
    [{ country_reg_code: 'ES', post_code: '28001', county: 'Bizkaia' }, 'ES-28'],
    [{ country_reg_code: 'FR', post_code: '48001', county: 'Vizcaya' }, 'INTL'],
    [{ country_reg_code: 'ESPAÑA', post_code: '48001' }, 'ES-48'],
    [{ country_reg_code: 'PT', county: 'Évora' }, 'PT-evora'],
    [{ country_reg_code: 'PT', county: 'Viana do Castelo' }, 'PT-viana-do-castelo'],
  ])('clasifica dirección %j respetando país y prioridad postal', (customer, id) => {
    expect(getCustomerGeographicId(customer)).toBe(id);
    expect(frontend.isInternationalCustomer(customer) ? 'INTL' : frontend.getCustomerGeoLocation(customer)?.id).toBe(id);
  });
  it('deduplica opciones y mantiene la opción seleccionada al venir del mapa', () => {
    const options = frontend.normalizeTerritoryOptions(['Vizcaya', 'Bizkaia', 'VIZCAYA'], 'ES-48');
    expect(options).toEqual([{ value: 'ES-48', label: 'Vizcaya' }]);
    expect(frontend.normalizeTerritoryOptions([], 'ES-28')).toEqual([{ value: 'ES-28', label: 'Madrid' }]);
  });
});

describe('API de clientes: misma selección antes de paginación, resumen y cartera', () => {
  const rows = [
    { client_id: 'A', country_reg_code: 'ES', post_code: '48001', county: 'Vizcaya', salesperson_code: 'S1', payment_terms_code: '30', shipment_method_code: 'P', total_sales: 100, balance_due_lcy: 10 },
    { client_id: 'B', country_reg_code: 'ES', post_code: '48002', county: 'Bizkaia', salesperson_code: 'S1', payment_terms_code: '60', shipment_method_code: 'P', total_sales: 200, balance_due_lcy: 20 },
    { client_id: 'C', country_reg_code: 'ES', post_code: '28001', county: 'Vizcaya', salesperson_code: 'S1', payment_terms_code: '30', shipment_method_code: 'P', total_sales: 300, balance_due_lcy: 30 },
    { client_id: 'D', country_reg_code: 'FR', post_code: '48001', county: 'Vizcaya', salesperson_code: 'S1', payment_terms_code: '30', shipment_method_code: 'P', total_sales: 400, balance_due_lcy: 40 },
    { client_id: 'E', country_reg_code: 'ES', post_code: null, county: 'Bizkaia', salesperson_code: 'S2', payment_terms_code: '30', shipment_method_code: 'F', total_sales: 500, balance_due_lcy: 50 },
  ];
  let role = 'ADMIN';
  const matches = (row: any, where: any): boolean => Object.entries(where || {}).every(([field, value]: [string, any]) => {
    if (field === 'AND') return value.every((clause: any) => matches(row, clause));
    if (field === 'OR') return value.some((clause: any) => matches(row, clause));
    if (value && typeof value === 'object') {
      if ('in' in value) return value.in.includes(row[field]);
      if ('notIn' in value) return !value.notIn.includes(row[field]);
      if ('gte' in value) return false;
    }
    return row[field] === value;
  });
  const db: any = {
    profiles: { findUnique: jest.fn(async () => ({ is_active: true, code: 'S1', roles: { name: role } })) },
    customers: {
      findMany: jest.fn(async ({ where, skip = 0, take }: any) => rows.filter(row => matches(row, where)).slice(skip, take ? skip + take : undefined)),
      count: jest.fn(async ({ where }: any) => rows.filter(row => matches(row, where)).length),
      aggregate: jest.fn(async ({ where }: any) => ({ _sum: rows.filter(row => matches(row, where)).reduce((sum, row) => ({ total_sales: sum.total_sales + row.total_sales, balance_due_lcy: sum.balance_due_lcy + row.balance_due_lcy }), { total_sales: 0, balance_due_lcy: 0 }) })),
    },
    $queryRawUnsafe: jest.fn(async () => []),
  };
  beforeEach(() => { role = 'ADMIN'; });
  it.each(['Vizcaya', 'Bizkaia', 'ES-48'])('filtra %s y calcula totales para la misma cartera', async territory => {
    const result = await new CustomersService(db).getAll({ territory, take: 1 }, 'user');
    expect(result.data.map(row => row.client_id)).toEqual(['A']);
    expect(result.total).toBe(3);
    expect(result.summary).toMatchObject({ totalSales: 800, totalDebt: 80 });
  });
  it('mantiene pago y portes junto al filtro geográfico', async () => {
    const result = await new CustomersService(db).getAll({ territory: 'ES-48', paymentTerms: '30', shipmentMethod: 'P' }, 'user');
    expect(result.data.map(row => row.client_id)).toEqual(['A']);
    expect(result.total).toBe(1);
  });
  it('un código geográfico nunca amplía la cartera del vendedor', async () => {
    role = 'VENTAS';
    const result = await new CustomersService(db).getAll({ territory: 'ES-48', salesperson: 'S2' }, 'user');
    expect(result.data.map(row => row.client_id)).toEqual(['A', 'B']);
    expect(result.total).toBe(2);
  });
  it('separa Internacional de provincias españolas con el mismo prefijo postal', async () => {
    const result = await new CustomersService(db).getAll({ territory: 'INTL' }, 'user');
    expect(result.data.map(row => row.client_id)).toEqual(['D']);
  });
});

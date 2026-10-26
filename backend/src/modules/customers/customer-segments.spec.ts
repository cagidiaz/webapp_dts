import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CustomerSegmentsService } from './customer-segments.service';
import { SaveCustomerSegmentDto } from './customer-segments.dto';
import catalog from './customer-segments.catalog.json';

describe('Segmentos y potencialidad de clientes', () => {
  const profile = { is_active: true, role_id: 'role', code: 'ACI', roles: { name: 'VENTAS' } };
  const db: any = {
    profiles: { findUnique: jest.fn() }, role_modules: { findMany: jest.fn() },
    customers: { findFirst: jest.fn() }, $queryRaw: jest.fn(),
  };
  const service = new CustomerSegmentsService(db);
  beforeEach(() => {
    jest.resetAllMocks();
    db.profiles.findUnique.mockResolvedValue(profile);
    db.role_modules.findMany.mockResolvedValue(['/crm', '/crm/customers'].map(route_path => ({ can_view: true, module: { route_path } })));
    db.customers.findFirst.mockResolvedValue({ salesperson_code: 'ACI' });
    db.$queryRaw.mockResolvedValue([{ segment_code: 'dtstemp-atex', potential_amount: '12500.00', version: 1 }]);
  });

  it('solo ofrece las doce hojas del catálogo, sin padres seleccionables', () => {
    expect(catalog).toHaveLength(12);
    expect(new Set(catalog.map(option => option.value)).size).toBe(12);
    for (const parent of ['dtstemp', 'dtspres', 'dtsflow']) expect(catalog.some(option => option.value === parent)).toBe(false);
    const sql = readFileSync(resolve(process.cwd(), 'prisma/proposals/2026-10-26-segmentos-potencialidad-clientes.sql'), 'utf8');
    for (const option of catalog) expect(sql).toContain("'" + option.value + "'");
    expect(sql).toContain('PRIMARY KEY (client_id, segment_code)');
    expect(sql).toContain('CHECK (billing_amount IS NULL)');
  });

  it('limita la lectura a la cartera autenticada y permite editar al comercial', async () => {
    expect((await service.list('user', 'client')).canEdit).toBe(true);
    expect(db.customers.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { client_id: 'client', salesperson_code: 'ACI' } }));
  });

  it('impide leer y escribir un cliente ajeno antes de consultar los segmentos', async () => {
    db.customers.findFirst.mockResolvedValue(null);
    await expect(service.list('user', 'foreign')).rejects.toThrow('Cliente no encontrado');
    await expect(service.save('user', 'foreign', 'dtscal', { potential_amount: '100', version: 0 })).rejects.toThrow('Cliente no encontrado');
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('respeta la retirada del permiso de vista incluso para admin', async () => {
    db.profiles.findUnique.mockResolvedValue({ ...profile, roles: { name: 'ADMIN' } });
    db.role_modules.findMany.mockResolvedValue([]);
    await expect(service.list('user', 'client')).rejects.toThrow('No tienes permiso');
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('permite editar globalmente a admin', async () => {
    db.profiles.findUnique.mockResolvedValue({ ...profile, roles: { name: 'ADMIN' } });
    db.customers.findFirst.mockResolvedValue({ salesperson_code: 'OTHER' });
    expect((await service.list('user', 'client')).canEdit).toBe(true);
  });

  it.each(['DIRECCION', 'TESTER', 'PRODUCCION'])('mantiene consulta global sin escritura ajena para %s', async name => {
    db.profiles.findUnique.mockResolvedValue({ ...profile, roles: { name } });
    db.customers.findFirst.mockResolvedValue({ salesperson_code: 'OTHER' });
    expect((await service.list('user', 'client')).canEdit).toBe(false);
    db.$queryRaw.mockClear();
    await expect(service.save('user', 'client', 'dtscal', { version: 0 })).rejects.toThrow('Solo el comercial');
    await expect(service.remove('user', 'client', 'dtscal', 1)).rejects.toThrow('Solo el comercial');
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('rechaza una familia con hijos antes de escribir', async () => {
    await expect(service.save('user', 'client', 'dtstemp', { version: 0 })).rejects.toThrow('segmento válido');
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('crea con importe parametrizado, autor y sin escribir facturación', async () => {
    await service.save('user', 'client', 'dtstemp-atex', { potential_amount: '12500.00', version: 0 });
    const query = db.$queryRaw.mock.calls[0][0];
    expect(query.values).toEqual(['client', 'dtstemp-atex', '12500.00', 'user', 'user']);
    expect(query.sql).toContain('ON CONFLICT');
    expect(query.sql).not.toContain('SET billing_amount');
  });

  it('permite vaciar la estimación sin convertirla en cero', async () => {
    await service.save('user', 'client', 'dtscal', { potential_amount: null, version: 2 });
    expect(db.$queryRaw.mock.calls[0][0].values).toEqual([null, 'user', 'client', 'dtscal', 2]);
  });

  it('usa el código BC sin requerir UUID en lectura, creación, edición y borrado', async () => {
    await service.list('user', 'CLI-001');
    expect(db.customers.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { client_id: 'CLI-001', salesperson_code: 'ACI' } }));
    await service.save('user', 'CLI-001', 'dtscal', { potential_amount: '10', version: 0 });
    await service.save('user', 'CLI-001', 'dtscal', { potential_amount: '20', version: 1 });
    await service.remove('user', 'CLI-001', 'dtscal', 2);
    for (const [query] of db.$queryRaw.mock.calls) {
      expect(query.values).toContain('CLI-001');
      expect(query.sql).toContain('client_id');
      expect(query.sql).not.toContain('customer_id');
      expect(query.sql).not.toContain('WHERE client_id = ?::uuid');
    }
  });

  it('rechaza un código vacío o excesivamente largo', async () => {
    await expect(service.list('user', '')).rejects.toThrow('Código de cliente no válido');
    await expect(service.list('user', 'X'.repeat(51))).rejects.toThrow('Código de cliente no válido');
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('detecta duplicados y ediciones concurrentes', async () => {
    db.$queryRaw.mockResolvedValue([]);
    await expect(service.save('user', 'client', 'dtscal', { version: 0 })).rejects.toThrow('ya existe o ha cambiado');
    await expect(service.save('user', 'client', 'dtscal', { version: 2 })).rejects.toThrow('ya existe o ha cambiado');
    await expect(service.remove('user', 'client', 'dtscal', 2)).rejects.toThrow('ha cambiado');
  });

  it.each(['-1', '1,25', '12.345', 'abc', '1000000000000'])('rechaza importe inválido %s en el contrato HTTP', async potential_amount => {
    const errors = await validate(plainToInstance(SaveCustomerSegmentDto, { potential_amount, version: 0 }));
    expect(errors.some(error => error.property === 'potential_amount')).toBe(true);
  });

  it.each([null, '0.00', '12500.25', '999999999999.99'])('acepta vacío o importe válido %s', async potential_amount => {
    expect(await validate(plainToInstance(SaveCustomerSegmentDto, { potential_amount, version: 0 }))).toHaveLength(0);
  });

  it('no acepta facturación ni propietario enviados por el navegador', async () => {
    const errors = await validate(plainToInstance(SaveCustomerSegmentDto, { version: 0, billing_amount: '99', client_id: 'other' }), { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['billing_amount', 'client_id']));
  });
});

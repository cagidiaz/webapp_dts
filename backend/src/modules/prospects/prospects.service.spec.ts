import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeProspectCompany, ProspectsService } from './prospects.service';

describe('Permisos y convivencia del piloto de Prospección', () => {
  const fields = { company_name: 'Empresa Delta', contact_name: null, email: null, phone: null, phase: 0 };
  const record = { ...fields, id: 'prospect', owner_id: 'pilot', version: 1, updated_at: new Date() };
  let enabled: boolean;
  let role: string;
  let email: string;
  let db: any;
  let service: ProspectsService;

  beforeEach(() => {
    enabled = true; role = 'TESTER'; email = 'aciurans@dtsinstruments.com';
    db = {
      profiles: { findUnique: jest.fn().mockImplementation(() => ({ email, role_id: 'role', code: 'ACI', is_active: true, roles: { name: role } })) },
      role_modules: { findMany: jest.fn().mockResolvedValue(['/crm', '/crm/pipeline'].map(route_path => ({ can_view: true, module: { route_path } }))) },
      customers: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue({ id: 'client', client_id: 'CL001', name: 'Empresa Delta' }) },
      crm_prospects: { findFirst: jest.fn().mockResolvedValue(record), create: jest.fn().mockResolvedValue(record), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue(record) },
      crm_prospect_events: { create: jest.fn() },
      crm_prospect_activities: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'activity' }), findFirst: jest.fn().mockResolvedValue({ id: 'activity', prospect_id: 'prospect', type: 'CALL', created_by: 'pilot', version: 1 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'activity' }) },
      $transaction: jest.fn().mockImplementation(callback => callback(db)),
    };
    const config = { get: (key: string) => key === 'CRM_PROSPECTS_PILOT_ENABLED' ? String(enabled) : undefined };
    service = new ProspectsService(db, config as any, { enabled: () => false, sync: jest.fn() } as any);
  });

  it('el acceso depende del rol y no del antiguo interruptor de piloto', async () => {
    enabled = false;
    expect((await service.access('pilot')).enabled).toBe(true);
    expect(db.profiles.findUnique).toHaveBeenCalled();
  });

  it('Antoni TESTER requiere los permisos de CRM y Oportunidades del panel', async () => {
    expect((await service.access('pilot')).canCreate).toBe(true);
    db.role_modules.findMany.mockResolvedValue([{ can_view: true, module: { route_path: '/crm' } }, { can_view: false, module: { route_path: '/crm/pipeline' } }]);
    expect((await service.access('pilot')).enabled).toBe(false);
    await expect(service.create('pilot', fields)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.crm_prospects.create).not.toHaveBeenCalled();
  });

  it('deniega permisos ausentes y respeta la revocación también para Admin', async () => {
    role='ADMIN';email='admin@example.com';
    db.role_modules.findMany.mockResolvedValue([]);
    await expect(service.detail('admin','prospect')).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.crm_prospects.findFirst).not.toHaveBeenCalled();
  });

  it('el permiso habilita otros testers y comerciales sin lista de emails', async () => {
    email='otrotester@example.com';expect((await service.access('other')).canCreate).toBe(true);
    role='VENTAS';expect((await service.access('other')).canCreate).toBe(true);
    db.role_modules.findMany.mockResolvedValue([]);
    expect((await service.access('other')).enabled).toBe(false);
  });

  it('un comercial autorizado crea solo prospectos propios', async () => {
    email = 'otro@example.com';role='VENTAS';
    await service.create('other', fields);
    expect(db.crm_prospects.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({owner_id:'other'})}));
  });

  it('filtra los IDs consultados por el propietario y no expone registros ajenos', async () => {
    db.crm_prospects.findFirst.mockResolvedValue(null);
    await expect(service.detail('pilot', 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.crm_prospects.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'foreign', owner_id: 'pilot' } }));
  });

  it('Dirección consulta globalmente pero no modifica los prospectos', async () => {
    role = 'DIRECCION'; email = 'direccion@example.com';
    await service.detail('direction', 'prospect');
    expect(db.crm_prospects.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'prospect' } }));
    await expect(service.update('direction', 'prospect', { ...fields, version: 1 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.crm_prospects.updateMany).not.toHaveBeenCalled();
  });

  it('Admin edita prospectos ajenos conservando propiedad y auditando al autor', async () => {
    role = 'ADMIN'; email = 'admin@example.com';
    await service.update('admin', 'prospect', { ...fields, phase: 1, version: 1 });
    const update = db.crm_prospects.updateMany.mock.calls[0][0];
    expect(update.data.owner_id).toBeUndefined();
    expect(update.data.phase).toBe(1);
    expect(db.crm_prospect_events.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ created_by: 'admin', prospect_id: 'prospect' }) }));
    await expect(service.archive('admin', 'prospect', true, 1)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Admin crea sus propios prospectos para probar el piloto sin escribir en BC', async () => {
    role = 'ADMIN'; email = 'admin@example.com';
    expect(await service.access('admin')).toEqual(expect.objectContaining({ canCreate: true, canEditAll: true, canViewAll: true }));
    await service.create('admin', fields);
    expect(db.crm_prospects.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ owner_id: 'admin', events: { create: expect.objectContaining({ created_by: 'admin' }) } }) }));
    expect(db.customers.findFirst).not.toHaveBeenCalled();
    expect(db.customers.findMany).not.toHaveBeenCalled();
  });

  it('la creación de Admin requiere los permisos del panel y el piloto activo', async () => {
    role = 'ADMIN'; email = 'admin@example.com';
    db.role_modules.findMany.mockResolvedValue([]);
    await expect(service.create('admin', fields)).rejects.toBeInstanceOf(ForbiddenException);
    enabled = false;
    await expect(service.create('admin', fields)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.crm_prospects.create).not.toHaveBeenCalled();
  });

  it('Admin archiva y restaura sus propios prospectos de prueba', async () => {
    role = 'ADMIN'; email = 'admin@example.com';
    db.crm_prospects.findFirst.mockResolvedValue({ ...record, owner_id: 'admin' });
    await service.archive('admin', 'prospect', true, 1);
    await service.archive('admin', 'prospect', false, 1);
    expect(db.crm_prospects.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ archived_at: expect.any(Date) }) }));
    expect(db.crm_prospects.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ archived_at: null }) }));
  });

  it('Dirección no obtiene permisos de creación al habilitarlos para Admin', async () => {
    role = 'DIRECCION'; email = 'direccion@example.com';
    expect((await service.access('direction')).canCreate).toBe(false);
    await expect(service.create('direction', fields)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.crm_prospects.create).not.toHaveBeenCalled();
  });

  it('rechaza cambios con una versión antigua antes de registrar historial', async () => {
    db.crm_prospects.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.update('pilot', 'prospect', { ...fields, version: 1 })).rejects.toBeInstanceOf(ConflictException);
    expect(db.crm_prospect_events.create).not.toHaveBeenCalled();
  });

  it('rechaza una versión distinta a la leída antes de iniciar la transacción', async () => {
    await expect(service.update('pilot', 'prospect', { ...fields, version: 2 })).rejects.toBeInstanceOf(ConflictException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('normaliza la empresa y traduce el conflicto de unicidad a un mensaje visible', async () => {
    expect(normalizeProspectCompany('  EMPRESA   Delta  ')).toBe('empresa delta');
    db.crm_prospects.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));
    await expect(service.create('pilot', fields)).rejects.toBeInstanceOf(ConflictException);
  });

  it('el archivo no cambia la fase y conserva el historial', async () => {
    await service.archive('pilot', 'prospect', true, 1);
    const update = db.crm_prospects.updateMany.mock.calls[0][0];
    expect(update.data.phase).toBeUndefined();
    expect(update.data.archived_at).toBeInstanceOf(Date);
    expect(db.crm_prospect_events.create).toHaveBeenCalled();
  });

  it('busca coincidencias solo en la cartera del propietario, sin requerir una oferta', async () => {
    await service.clients('pilot', 'prospect', 'Delta');
    expect(db.customers.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ salesperson_code: 'ACI' }), take: 50 }));
  });

  it('no permite a Admin vincular prospectos ajenos', async () => {
    role = 'ADMIN'; email = 'admin@example.com';
    await expect(service.link('admin', 'prospect', 1, 'client')).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.customers.findFirst).not.toHaveBeenCalled();
  });

  it('rechaza clientes fuera de la cartera sin cambiar el prospecto', async () => {
    db.customers.findFirst.mockResolvedValue(null);
    await expect(service.link('pilot', 'prospect', 1, 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.crm_prospects.updateMany).not.toHaveBeenCalled();
    expect(db.customers.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'foreign', salesperson_code: 'ACI' } }));
  });

  it('convierte sin borrar ni modificar la fase y conserva la trazabilidad', async () => {
    await service.link('pilot', 'prospect', 1, 'client');
    const update = db.crm_prospects.updateMany.mock.calls[0][0];
    expect(update.data.linked_client_id).toBe('client');
    expect(update.data.converted_at).toBeInstanceOf(Date);
    expect(update.data.phase).toBeUndefined();
    expect(db.crm_prospect_events.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ created_by: 'pilot', title: 'Prospecto vinculado a cliente BC' }) }));
  });

  it('deshace la asociación conservando la fase y el historial, sin escribir en BC', async () => {
    db.crm_prospects.findFirst.mockResolvedValue({ ...record, linked_client_id: 'client', converted_at: new Date(), phase: 1 });
    await service.link('pilot', 'prospect', 1, null);
    const update = db.crm_prospects.updateMany.mock.calls[0][0];
    expect(update.data).toEqual(expect.objectContaining({ linked_client_id: null, converted_at: null }));
    expect(update.data.phase).toBeUndefined();
    expect(db.customers.findFirst).not.toHaveBeenCalled();
    expect(db.crm_prospect_events.create).toHaveBeenCalled();
  });

  it('no convierte una ficha que otro usuario acaba de modificar', async () => {
    db.crm_prospects.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.link('pilot', 'prospect', 1, 'client')).rejects.toBeInstanceOf(ConflictException);
    expect(db.crm_prospect_events.create).not.toHaveBeenCalled();
  });

  it('mantiene la fase congelada mientras el prospecto está convertido', async () => {
    db.crm_prospects.findFirst.mockResolvedValue({ ...record, converted_at: new Date() });
    await expect(service.update('pilot', 'prospect', { ...fields, phase: 1, version: 1 })).rejects.toThrow('Desvincula');
    await expect(service.archive('pilot', 'prospect', true, 1)).rejects.toThrow('Desvincula');
    expect(db.crm_prospects.updateMany).not.toHaveBeenCalled();
  });

  it('excluye convertidos de las fases activas y cuenta conversiones en la cartera propia', async () => {
    db.crm_prospects.findMany = jest.fn().mockResolvedValue([]);
    db.crm_prospects.groupBy = jest.fn().mockResolvedValue([{ phase: 1, _count: { _all: 2 } }]);
    db.crm_prospects.count = jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    const result = await service.list('pilot');
    expect(result.counts).toEqual({ phase0: 0, phase1: 2, converted: 3 });
    expect(db.crm_prospects.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { owner_id: 'pilot', archived_at: null, converted_at: null } }));
    expect(db.crm_prospects.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { owner_id: 'pilot', archived_at: null, converted_at: null } }));
    expect(db.crm_prospects.count).toHaveBeenLastCalledWith({ where: { owner_id: 'pilot', converted_at: { not: null } } });
  });

  const call = { type: 'CALL', title: 'Seguimiento', description: null, due_date: '2026-10-16', time_scheduled: '18:00', location: null, conclusions: null, is_completed: false };

  it('guarda una actividad sin cliente BC y registra autor y auditoría', async () => {
    await service.saveActivity('pilot', 'prospect', call);
    expect(db.crm_prospect_activities.create).toHaveBeenCalledWith({ data: expect.objectContaining({ prospect_id: 'prospect', created_by: 'pilot', due_date: new Date('2026-10-16T00:00:00Z'), time_scheduled: '18:00' }) });
    expect(db.crm_prospect_events.create).toHaveBeenCalledWith({ data: expect.objectContaining({ title: 'Actividad del prospecto creada', created_by: 'pilot' }) });
    expect(db.customers.findFirst).not.toHaveBeenCalled();
  });

  it('protege actividades de prospectos ajenos consultados por ID', async () => {
    db.crm_prospects.findFirst.mockResolvedValue(null);
    await expect(service.activities('pilot', 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.crm_prospect_activities.findMany).not.toHaveBeenCalled();
  });

  it('Dirección no crea actividades, aunque consulte globalmente', async () => {
    role = 'DIRECCION'; email = 'direccion@example.com';
    await expect(service.saveActivity('direction', 'prospect', call)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.crm_prospect_activities.create).not.toHaveBeenCalled();
  });

  it('rechaza fechas inexistentes y citas sin fecha, conservando notas sin fecha', async () => {
    await expect(service.saveActivity('pilot', 'prospect', { ...call, due_date: '2026-02-30' })).rejects.toThrow('Fecha');
    await expect(service.saveActivity('pilot', 'prospect', { ...call, due_date: null })).rejects.toThrow('fecha');
    await service.saveActivity('pilot', 'prospect', { ...call, type: 'NOTE', due_date: null });
    expect(db.crm_prospect_activities.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'NOTE', due_date: null, time_scheduled: null }) });
  });

  it('no acepta nuevas actividades si el prospecto se archiva concurrentemente', async () => {
    db.crm_prospects.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.saveActivity('pilot', 'prospect', call)).rejects.toBeInstanceOf(ConflictException);
    expect(db.crm_prospect_activities.create).not.toHaveBeenCalled();
  });

  it('Admin edita manteniendo el autor original y registra su propia auditoría', async () => {
    role = 'ADMIN'; email = 'admin@example.com';
    await service.saveActivity('admin', 'prospect', { ...call, version: 1, conclusions: 'Reunión acordada' }, 'activity');
    const update = db.crm_prospect_activities.updateMany.mock.calls[0][0];
    expect(update.data.created_by).toBeUndefined();
    expect(update.data.is_completed).toBe(true);
    expect(db.crm_prospect_events.create).toHaveBeenCalledWith({ data: expect.objectContaining({ created_by: 'admin' }) });
  });

  it('rechaza cambios de tipo y versiones antiguas de actividades', async () => {
    await expect(service.saveActivity('pilot', 'prospect', { ...call, type: 'TASK', version: 1 }, 'activity')).rejects.toThrow('tipo');
    db.crm_prospect_activities.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.saveActivity('pilot', 'prospect', { ...call, version: 1 }, 'activity')).rejects.toBeInstanceOf(ConflictException);
    expect(db.crm_prospect_events.create).not.toHaveBeenCalled();
  });

  it('no permite editar una actividad de otro prospecto', async () => {
    db.crm_prospect_activities.findFirst.mockResolvedValue(null);
    await expect(service.saveActivity('pilot', 'prospect', { ...call, version: 1 }, 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.crm_prospect_activities.updateMany).not.toHaveBeenCalled();
    expect(db.crm_prospect_activities.findFirst).toHaveBeenCalledWith({ where: { id: 'foreign', prospect_id: 'prospect' } });
  });

  it('el seguimiento del cliente consulta la asociación actual sin copiar actividades', async () => {
    await service.clientActivities('pilot', 'client');
    expect(db.customers.findFirst).toHaveBeenCalledWith({ where: { id: 'client', salesperson_code: 'ACI' }, select: { id: true } });
    expect(db.crm_prospect_activities.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { prospect: { linked_client_id: 'client', converted_at: { not: null }, owner_id: 'pilot' } } }));
    expect(db.crm_prospect_activities.create).not.toHaveBeenCalled();
  });

  it('el cliente no expone seguimiento ajeno aunque el antiguo piloto esté apagado', async () => {
    db.customers.findFirst.mockResolvedValue(null);
    await expect(service.clientActivities('pilot', 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.crm_prospect_activities.findMany).not.toHaveBeenCalled();
    enabled = false;
    await expect(service.clientActivities('pilot', 'client')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.crm_prospect_activities.findMany).not.toHaveBeenCalled();
  });

  it('la agenda comercial ignora un filtro ajeno y usa la cartera propietaria', async () => {
    await service.agenda('pilot', { salespersonId: 'foreign', startDate: '2026-10-12', endDate: '2026-10-18', types: ['CALL'] });
    expect(db.crm_prospect_activities.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      prospect: { owner_id: 'pilot', archived_at: null },
      due_date: { not: null, gte: new Date('2026-10-12T00:00:00Z'), lte: new Date('2026-10-18T00:00:00Z') }, type: { in: ['CALL'] },
    } }));
  });

  it('Admin filtra la agenda por propietario, no por autor de la actividad', async () => {
    role = 'ADMIN'; email = 'admin@example.com';
    await service.agenda('admin', { salespersonId: 'pilot' });
    expect(db.crm_prospect_activities.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ prospect: { owner_id: 'pilot', archived_at: null } }) }));
  });

  it('la agenda conserva origen y autor y limita la edición de Dirección', async () => {
    role = 'DIRECCION'; email = 'direccion@example.com';
    db.crm_prospect_activities.findMany.mockResolvedValue([{ id: 'activity', prospect_id: 'prospect', type: 'CALL', version: 2, created_by: 'pilot', prospect: { owner_id: 'pilot', company_name: 'Empresa Delta', linked_client: null }, author: { id: 'pilot', email: 'aciurans@dtsinstruments.com' } }]);
    const items = await service.agenda('direction');
    expect(items[0]).toEqual(expect.objectContaining({ source: 'PROSPECT', prospect_id: 'prospect', version: 2, created_by: 'pilot', can_edit: false, customer: null, contact: null, client_id: '' }));
    expect(db.crm_prospect_activities.create).not.toHaveBeenCalled();
  });

  it('la agenda rechaza fechas inexistentes y rangos invertidos', async () => {
    await expect(service.agenda('pilot', { startDate: '2026-02-30' })).rejects.toThrow('Fecha');
    await expect(service.agenda('pilot', { startDate: '2026-10-20', endDate: '2026-10-12' })).rejects.toThrow('inicio');
    expect(db.crm_prospect_activities.findMany).not.toHaveBeenCalled();
  });

  it('la agenda no consulta seguimiento cuando se revoca el permiso', async () => {
    db.role_modules.findMany.mockResolvedValue([]);
    expect(await service.agenda('pilot')).toEqual([]);
    expect(db.crm_prospect_activities.findMany).not.toHaveBeenCalled();
  });
});

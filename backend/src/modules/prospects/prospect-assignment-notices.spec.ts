import { ProspectsService } from './prospects.service';

describe('Avisos de asignación de prospectos', () => {
  function fixture(role = 'VENTAS') {
    const db: any = {
      profiles: { findUnique: jest.fn().mockResolvedValue({ is_active: true, role_id: 'role', roles: { name: role } }) },
      role_modules: { findMany: jest.fn().mockResolvedValue(['/crm', '/crm/pipeline'].map(route_path => ({ can_view: true, module: { route_path } }))) },
      crm_prospects: { create: jest.fn().mockImplementation(({ data }) => data), findFirst: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
      crm_prospect_events: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 1 }), create: jest.fn() },
      $transaction: jest.fn().mockImplementation(fn => fn(db)),
    };
    return { db, service: new ProspectsService(db, {} as any, { enabled: () => false } as any) };
  }
  const fields = { company_name: 'Empresa', phase: 0 };
  it('registra el aviso cuando otra persona crea el prospecto para el vendedor', async () => {
    const { db, service } = fixture('ADMIN');
    await service.create('creador', { ...fields, owner_id: 'destinatario' });
    expect(db.crm_prospects.create.mock.calls[0][0].data.events.create).toMatchObject({ type: 'ASIGNACION_PENDIENTE', created_by: 'creador', description: JSON.stringify({ recipient_id: 'destinatario' }) });
  });
  it('no crea aviso al asignarse un prospecto a sí mismo', async () => {
    const { db, service } = fixture();
    await service.create('vendedor', fields);
    expect(db.crm_prospects.create.mock.calls[0][0].data.events.create.type).toBe('AUDIT');
  });
  it('al reasignar cancela avisos anteriores y avisa al nuevo propietario', async () => {
    const { db, service } = fixture('ADMIN');
    db.crm_prospects.findFirst.mockResolvedValue({ ...fields, id: 'p', owner_id: 'anterior', version: 1, archived_at: null, converted_at: null });
    db.crm_prospects.updateMany.mockResolvedValue({ count: 1 });
    await service.update('admin', 'p', { ...fields, owner_id: 'nuevo', version: 1 });
    expect(db.crm_prospect_events.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { prospect_id: 'p', type: 'ASIGNACION_PENDIENTE' }, data: { type: 'ASIGNACION_CANCELADA' } }));
    expect(db.crm_prospect_events.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'ASIGNACION_PENDIENTE', description: JSON.stringify({ recipient_id: 'nuevo' }) }) });
  });
  it('solo muestra avisos del destinatario actual y respeta el filtro', async () => {
    const { db, service } = fixture('ADMIN');
    const prospect = { id: 'p', company_name: 'Empresa', contact_name: null, owner_id: 'actual', owner: {} };
    db.crm_prospect_events.findMany.mockResolvedValue([{ id: '1', prospect, author: {}, description: JSON.stringify({ recipient_id: 'anterior' }) }, { id: '2', prospect, author: {}, description: JSON.stringify({ recipient_id: 'actual' }) }]);
    expect((await service.assignmentNotices('admin', 'ACI')).map(x => x.id)).toEqual(['2']);
    expect(db.crm_prospect_events.findMany.mock.calls[0][0].where.prospect.owner).toEqual({ code: 'ACI' });
  });
  it('solo el propietario puede marcar el aviso leído al abrir', async () => {
    const { db, service } = fixture('ADMIN');
    db.crm_prospects.findFirst.mockResolvedValue({ owner_id: 'propietario', events: [{ id: 'event', type: 'ASIGNACION_PENDIENTE', description: JSON.stringify({ recipient_id: 'propietario' }) }] });
    expect(await service.acknowledgeAssignments('admin', 'p')).toEqual({ acknowledged: 0 });
    expect(db.crm_prospect_events.updateMany).not.toHaveBeenCalled();
    expect(await service.acknowledgeAssignments('propietario', 'p')).toEqual({ acknowledged: 1 });
    expect(db.crm_prospect_events.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ prospect: { owner_id: 'propietario' } }) }));
  });
});

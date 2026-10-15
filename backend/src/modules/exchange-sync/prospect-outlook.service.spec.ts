import { ProspectOutlookService } from './prospect-outlook.service';

describe('Outlook de prospectos sin llamadas reales', () => {
  let enabled: boolean, record: any, db: any, graph: any, service: ProspectOutlookService;
  beforeEach(() => {
    enabled = true;
    record = { id: 'activity', prospect_id: 'prospect', created_by: 'admin', type: 'CALL', title: 'Seguimiento', description: '<texto>', conclusions: null, location: null, due_date: new Date('2026-10-16T00:00:00Z'), time_scheduled: '23:30', version: 1, exchange_sync_status: 'LOCAL', exchange_item_id: null, exchange_synced_version: null, exchange_lock_until: null, exchange_lock_token: null, prospect: { owner_id: 'pilot', company_name: 'Empresa', contact_name: 'Contacto', email: 'contacto@example.com', archived_at: null } };
    const read = jest.fn().mockImplementation(async () => structuredClone(record));
    db = { crm_prospect_activities: { findUnique: read, findUniqueOrThrow: read, findFirst: read, updateMany: jest.fn().mockImplementation(async ({data}) => { Object.assign(record, data); if(data.version?.increment)record.version=2; return {count:1}; }) }, user_exchange_accounts: { findUnique: jest.fn().mockResolvedValue({ calendar_sync_enabled: true, access_token: 'test' }) }, crm_prospect_events: { create: jest.fn() } };
    db.$transaction = jest.fn().mockImplementation(callback => callback(db));
    db.profiles = { findUnique: jest.fn().mockResolvedValue({ role_id: 'role', roles: { name: 'TESTER' }, is_active: true, email: 'aciurans@dtsinstruments.com' }) };
    db.role_modules = { findMany: jest.fn().mockResolvedValue(['/crm', '/crm/pipeline'].map(route_path => ({can_view:true,module:{route_path}}))) };
    graph = { createCalendarEvent: jest.fn().mockResolvedValue({ id: 'remote' }), updateCalendarEvent: jest.fn().mockResolvedValue({ id: 'remote' }) };
    service = new ProspectOutlookService(db, graph, { get: (key: string) => key === 'CRM_PROSPECTS_PILOT_EMAIL' ? undefined : enabled ? 'true' : 'false' } as any);
  });
  it('no consulta tablas ni Graph cuando la conexión del piloto está apagada', async () => {
    enabled = false; await service.sync('activity');
    expect(db.crm_prospect_activities.findUnique).not.toHaveBeenCalled();
    expect(graph.createCalendarEvent).not.toHaveBeenCalled();
  });
  it('las notas permanecen únicamente en CRM', async () => {
    record.type = 'NOTE'; await service.sync('activity');
    expect(graph.createCalendarEvent).not.toHaveBeenCalled();
  });

  it('la revocación desde el panel bloquea también la sincronización Outlook', async () => {
    db.role_modules.findMany.mockResolvedValue([]);
    await service.sync('activity');
    expect(graph.createCalendarEvent).not.toHaveBeenCalled();
    expect(await service.importRemote('pilot', {id:'remote'})).toBe(true);
    expect(db.crm_prospect_events.create).not.toHaveBeenCalled();
  });
  it('usa calendario del propietario, sin asistentes, con fin al día siguiente', async () => {
    await service.sync('activity');
    expect(graph.createCalendarEvent).toHaveBeenCalledWith('pilot', expect.objectContaining({ transactionId: 'activity', startDate: '2026-10-16T23:30:00', endDate: '2026-10-17T00:30:00', attendees: [], isOnlineMeeting: false }));
    expect(graph.createCalendarEvent.mock.calls[0][1].description).toContain('&lt;texto&gt;');
    expect(record.exchange_item_id).toBe('remote'); expect(record.exchange_sync_status).toBe('SYNCED');
  });
  it('guarda el estado sin conexión y conserva la actividad', async () => {
    db.user_exchange_accounts.findUnique.mockResolvedValue(null); await service.sync('activity');
    expect(record.exchange_sync_status).toBe('NO_CONNECTION'); expect(record.id).toBe('activity');
    expect(graph.createCalendarEvent).not.toHaveBeenCalled();
  });
  it('solo las videollamadas llevan destinatario y requieren email', async () => {
    record.type='VIDEOLLAMADA'; record.prospect.email=null; await service.sync('activity');
    expect(record.exchange_sync_status).toBe('NEEDS_EMAIL'); expect(graph.createCalendarEvent).not.toHaveBeenCalled();
    record.prospect.email='contacto@example.com'; await service.sync('activity');
    expect(graph.createCalendarEvent).toHaveBeenCalledWith('pilot', expect.objectContaining({ isOnlineMeeting:true,attendees:[{email:'contacto@example.com',name:'Contacto'}] }));
  });
  it('los reintentos y ediciones conservan el mismo evento', async () => {
    await service.sync('activity'); await service.sync('activity');
    record.version=2; record.is_completed=true; await service.sync('activity');
    expect(graph.createCalendarEvent).toHaveBeenCalledTimes(1);
    expect(graph.updateCalendarEvent).toHaveBeenCalledWith('pilot','remote',expect.objectContaining({categories:['dTS CRM - Completado']}));
  });
  it('una respuesta desconocida no provoca un segundo POST', async () => {
    graph.createCalendarEvent.mockRejectedValue(new Error('timeout')); await service.sync('activity'); await service.sync('activity');
    expect(record.exchange_sync_status).toBe('UNCERTAIN'); expect(record.exchange_create_payload.transactionId).toBe('activity');
    expect(graph.createCalendarEvent).toHaveBeenCalledTimes(1);
  });
  it('no sincroniza mientras otra ejecución mantiene el bloqueo', async () => {
    db.crm_prospect_activities.updateMany.mockResolvedValue({count:0}); await service.sync('activity');
    expect(graph.createCalendarEvent).not.toHaveBeenCalled();
  });
  it('conserva el ID remoto si hay una edición durante la creación', async () => {
    graph.createCalendarEvent.mockImplementation(async()=>{record.version=2;return {id:'remote'};});
    await service.sync('activity'); expect(record.exchange_sync_status).toBe('PENDING'); expect(record.exchange_item_id).toBe('remote');
    await service.sync('activity'); expect(graph.createCalendarEvent).toHaveBeenCalledTimes(1); expect(graph.updateCalendarEvent).toHaveBeenCalledTimes(1);
  });
  it('importa fecha/hora sin reasignar origen y registra el cambio de Outlook', async () => {
    record.exchange_item_id='remote';record.exchange_synced_version=1;
    expect(await service.importRemote('pilot',{id:'remote',start:{dateTime:'2026-10-18T09:30:00.0000000'},location:{displayName:'Sede'}})).toBe(true);
    expect(record.due_date).toEqual(new Date('2026-10-18T00:00:00Z'));expect(record.time_scheduled).toBe('09:30');
    expect(record.prospect_id).toBe('prospect');expect(db.crm_prospect_events.create).toHaveBeenCalled();
  });
  it('la retirada en Outlook conserva registro e ID y no lo recrea', async () => {
    record.exchange_item_id='remote'; await service.importRemote('pilot',{id:'remote','@removed':{}}); await service.sync('activity');
    expect(record.exchange_sync_status).toBe('DELETED');expect(record.exchange_item_id).toBe('remote');expect(graph.createCalendarEvent).not.toHaveBeenCalled();
  });
  it('no sobrescribe cambios locales pendientes con el delta', async () => {
    record.exchange_item_id='remote'; record.exchange_synced_version=0;
    await service.importRemote('pilot',{id:'remote',start:{dateTime:'2026-10-18T09:30:00'}});
    expect(record.time_scheduled).toBe('23:30');expect(db.crm_prospect_events.create).not.toHaveBeenCalled();
  });
});

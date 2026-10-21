import { ConfigService } from '@nestjs/config';
import { ExchangeSyncService } from './exchange-sync.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { CrmActivitiesService } from '../crm-activities/crm-activities.service';

describe('Conclusiones y categoría verde del calendario', () => {
  function fixture() {
    let row: any = { id: 'activity', created_by: 'user', type: 'VISITA', title: 'Visita', due_date: new Date('2026-10-21'), time_scheduled: '10:00', exchange_item_id: 'event', is_completed: false, conclusions: null, exchange_sync_status: 'synced' };
    const db: any = {
      crm_activities: {
        findUnique: jest.fn(async () => ({ ...row })), findFirst: jest.fn(async () => ({ ...row })), findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(async ({ data }) => { row = { ...row, ...data }; return { ...row }; }),
      },
      user_exchange_accounts: { findUnique: jest.fn().mockResolvedValue({ calendar_sync_enabled: true, mail_sync_enabled: false }), update: jest.fn() },
    };
    const graph: any = { updateCalendarEvent: jest.fn().mockResolvedValue({ id: 'event', changeKey: 'v2' }), createCalendarEvent: jest.fn(), getCalendarEventsDelta: jest.fn().mockResolvedValue({ events: [] }) };
    const sync = new ExchangeSyncService(db, graph, { importRemote: jest.fn().mockResolvedValue(false) } as any, {} as any);
    return { db, graph, sync, read: () => row, set: (data: any) => { row = { ...row, ...data }; } };
  }

  it('guarda conclusiones, deja envío pendiente y exporta completado con categoría verde', async () => {
    const { db, graph, sync, read } = fixture();
    const service = new CrmActivitiesService(db, sync, {} as any);
    const updated = await service.update('activity', { conclusions: 'Propuesta aceptada' });
    expect(updated).toMatchObject({ is_completed: true, exchange_sync_status: 'pending' });
    // Esperar a que termine el envío iniciado por el guardado.
    await sync.syncActivityToOutlook('activity');
    for (let i = 0; i < 20 && read().exchange_sync_status !== 'synced'; i++) await Promise.resolve();
    expect(graph.updateCalendarEvent).toHaveBeenCalledWith('user', 'event', expect.objectContaining({ categories: ['dTS CRM - Completado'], description: expect.stringContaining('Propuesta aceptada') }));
  });

  it('relee y exporta el último cambio si se guardan conclusiones durante otro envío', async () => {
    const { sync, graph, set } = fixture();
    let release!: (value: any) => void;
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    graph.updateCalendarEvent.mockImplementationOnce(() => { started(); return new Promise(resolve => { release = resolve; }); });
    const first = sync.syncActivityToOutlook('activity');
    await ready;
    set({ is_completed: true, conclusions: 'Últimas conclusiones', exchange_sync_status: 'pending' });
    await sync.syncActivityToOutlook('activity');
    release({ id: 'event', changeKey: 'v1' });
    await first;
    expect(graph.updateCalendarEvent).toHaveBeenCalledTimes(2);
    expect(graph.updateCalendarEvent.mock.calls[1][2]).toMatchObject({ categories: ['dTS CRM - Completado'], description: expect.stringContaining('Últimas conclusiones') });
    expect(graph.createCalendarEvent).not.toHaveBeenCalled();
  });

  it.each([null, new Error('HTTP 403')])('conserva un fallo sin marcar sincronizado (resultado %s)', async result => {
    const { sync, graph, read } = fixture();
    if (result instanceof Error) graph.updateCalendarEvent.mockRejectedValue(result);
    else graph.updateCalendarEvent.mockResolvedValue(result);
    await sync.syncActivityToOutlook('activity');
    expect(read().exchange_sync_status).toBe('failed');
    expect(graph.createCalendarEvent).not.toHaveBeenCalled();
  });

  it('una lectura del calendario detecta categoría antigua sin sobrescribir las conclusiones', async () => {
    const { sync, graph, read, set } = fixture();
    set({ is_completed: true, conclusions: 'Finalizada' });
    graph.getCalendarEventsDelta.mockResolvedValue({ events: [{ id: 'event', subject: '[dTS CRM] Visita', categories: ['dTS CRM'] }] });
    await sync.syncOutlookToCrm('user');
    expect(read()).toMatchObject({ conclusions: 'Finalizada', is_completed: true, exchange_sync_status: 'out_of_sync' });
    expect(graph.updateCalendarEvent).not.toHaveBeenCalled();
  });

  it('reintenta cambios pendientes de eventos vinculados sin crear otra convocatoria', async () => {
    const { sync, db, graph, read, set } = fixture();
    set({ is_completed: true, conclusions: 'Finalizada', exchange_sync_status: 'failed' });
    db.crm_activities.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'activity' }]);
    graph.getCalendarEventsDelta.mockResolvedValue({ events: [{ id: 'event', categories: ['dTS CRM'] }] });
    await sync.syncOutlookToCrm('user');
    expect(read().exchange_sync_status).toBe('synced');
    expect(graph.updateCalendarEvent).toHaveBeenCalledTimes(1);
    expect(graph.createCalendarEvent).not.toHaveBeenCalled();
  });

  it('no exporta correos como eventos', async () => {
    const { sync, graph, set } = fixture();
    set({ type: 'EMAIL', is_completed: true });
    await sync.syncActivityToOutlook('activity');
    expect(graph.updateCalendarEvent).not.toHaveBeenCalled();
    expect(graph.createCalendarEvent).not.toHaveBeenCalled();
  });
});

describe('Errores Graph de categorías y actualización', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  function graph() {
    const service = new MicrosoftGraphService(new ConfigService({}), {} as any);
    jest.spyOn(service, 'getValidAccessToken').mockResolvedValue('test-token');
    return service;
  }
  it.each([403, 429, 503])('propaga HTTP %s al actualizar evento', async status => {
    const service = graph();
    jest.spyOn(service, 'ensureDtsCategory').mockResolvedValue();
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status }));
    await expect(service.updateCalendarEvent('user', 'event', { categories: ['dTS CRM - Completado'] })).rejects.toThrow(`HTTP ${status}`);
  });
  it('no oculta permisos denegados para consultar categorías', async () => {
    const service = graph();
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 403 }));
    await expect(service.ensureDtsCategories('user')).rejects.toThrow('HTTP 403');
  });
  it.each(['create', 'patch'])('detecta rechazo al escribir la categoría (%s)', async action => {
    const service = graph();
    const value = action === 'patch' ? [{ id: 'one', displayName: 'dTS CRM', color: 'preset0' }] : [];
    global.fetch = jest.fn().mockResolvedValueOnce(new Response(JSON.stringify({ value }))).mockResolvedValueOnce(new Response('{}', { status: 403 }));
    await expect(service.ensureDtsCategories('user')).rejects.toThrow('HTTP 403');
  });
});

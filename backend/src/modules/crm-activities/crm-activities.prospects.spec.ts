import { CrmActivitiesService } from './crm-activities.service';

describe('Convivencia de agenda BC y actividades de prospección', () => {
  let db: any, prospects: any, service: CrmActivitiesService;
  const scheduled = (id: string, date: string, time: string, completed = false) => ({ id, due_date: new Date(date + 'T00:00:00Z'), time_scheduled: time, is_completed: completed });
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-13T12:00:00Z'));
    db = { profiles: { findUnique: jest.fn().mockResolvedValue({ roles: { name: 'VENTAS' } }) }, crm_activities: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(2) } };
    prospects = { agenda: jest.fn().mockResolvedValue([]) };
    service = new CrmActivitiesService(db, {} as any, prospects);
  });
  afterEach(() => jest.useRealTimers());

  it('combina cada origen una sola vez y ordena por día/hora', async () => {
    db.crm_activities.findMany.mockResolvedValue([scheduled('bc', '2026-10-13', '18:00')]);
    prospects.agenda.mockResolvedValue([scheduled('local', '2026-10-13', '10:00')]);
    const rows = await service.getAgenda({ requestingUserId: 'pilot', startDate: '2026-10-12', endDate: '2026-10-18', types: ['CALL'] as any });
    expect(rows.map(row => row.id)).toEqual(['local', 'bc']);
    expect(prospects.agenda).toHaveBeenCalledWith('pilot', { salespersonId: undefined, startDate: '2026-10-12', endDate: '2026-10-18', types: ['CALL'] });
  });

  it('el briefing incluye lo programado hoy y solo los pendientes anteriores', async () => {
    db.crm_activities.findMany.mockResolvedValueOnce([scheduled('bc-today', '2026-10-13', '11:00')]).mockResolvedValueOnce([]);
    prospects.agenda.mockResolvedValue([scheduled('local-today', '2026-10-13', '10:00', true), scheduled('local-past', '2026-10-12', '10:00'), scheduled('local-done', '2026-10-12', '12:00', true)]);
    const briefing = await service.getDailyBriefing('pilot');
    expect(briefing.todayActivities.map(row => row.id)).toEqual(['local-today', 'bc-today']);
    expect(briefing.pendingActivities.map(row => row.id)).toEqual(['local-past']);
    expect(briefing.stats).toEqual(expect.objectContaining({ todayTotal: 2, todayCompleted: 1, todayPending: 1, pastPendingTotal: 1 }));
    expect(prospects.agenda).toHaveBeenCalledWith('pilot', { onlyOwn: true, endDate: '2026-10-13' });
  });

  it('Admin conserva el briefing personal y suma prospectos al indicador de equipo', async () => {
    db.profiles.findUnique.mockResolvedValue({ roles: { name: 'ADMIN' } });
    prospects.agenda.mockResolvedValueOnce([]).mockResolvedValueOnce([scheduled('team-local', '2026-10-13', '10:00')]);
    const briefing = await service.getDailyBriefing('admin');
    expect(briefing.todayActivities).toEqual([]);
    expect(briefing.stats.teamTodayTotal).toBe(3);
    expect(prospects.agenda).toHaveBeenLastCalledWith('admin', { startDate: '2026-10-13', endDate: '2026-10-13' });
  });

  it('con el piloto apagado mantiene las actividades y totales anteriores', async () => {
    db.crm_activities.findMany.mockResolvedValue([scheduled('bc', '2026-10-13', '18:00')]);
    const rows = await service.getAgenda({ requestingUserId: 'other' });
    expect(rows.map(row => row.id)).toEqual(['bc']);
  });

  it('determina el día del briefing en Madrid aunque el servidor use UTC', async () => {
    jest.setSystemTime(new Date('2026-10-12T22:30:00Z'));
    expect((await service.getDailyBriefing('pilot')).todayStr).toBe('2026-10-13');
  });
  it('excluye correos antiguos y nuevos antes de limitar pendientes y contar el equipo', async () => {
    db.profiles.findUnique.mockResolvedValue({ roles: { name: 'ADMIN' } });
    await service.getDailyBriefing('admin');
    expect(db.crm_activities.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ created_by: 'admin', type: { not: 'EMAIL' } }),
    }));
    expect(db.crm_activities.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ created_by: 'admin', type: { not: 'EMAIL' }, is_completed: false }), take: 20,
    }));
    expect(db.crm_activities.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ type: { not: 'EMAIL' } }),
    }));
  });

});

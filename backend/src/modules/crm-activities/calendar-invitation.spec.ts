import { ConfigService } from '@nestjs/config';
import { resolveCalendarInvitation } from './calendar-invitation';
import { CrmActivitiesService } from './crm-activities.service';
import { ExchangeSyncService } from '../exchange-sync/exchange-sync.service';
import { MicrosoftGraphService } from '../exchange-sync/microsoft-graph.service';
import { mergePublicCalendarBody, publicCalendarBody } from '../exchange-sync/calendar-public-body';

const one = '11111111-1111-4111-8111-111111111111', two = '22222222-2222-4222-8222-222222222222';
const config = (patch = {}) => ({ enabled: true, contactIds: [one], externalEmails: [], message: 'Nos vemos en su sede.', durationMinutes: 60, ...patch });
const contacts = [{ id: one, name: 'Uno', email: 'Uno@cliente.com' }, { id: two, name: 'Dos', email: 'dos@cliente.com' }];

describe('Invitados de visitas y videollamadas', () => {
  const db = { contacts: { findMany: jest.fn() } };
  beforeEach(() => db.contacts.findMany.mockResolvedValue(contacts));
  it('resuelve solo contactos de la empresa y elimina emails duplicados entre ambas fuentes', async () => {
    const result = await resolveCalendarInvitation(db, config({ contactIds: [one, two], externalEmails: ['uno@cliente.com', 'EXTERNO@empresa.com', 'externo@empresa.com'] }), 'VIDEOLLAMADA', 'CL1');
    expect(db.contacts.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [one, two] }, client_id: 'CL1' } }));
    expect(result.recipients.map(row => row.email)).toEqual(['uno@cliente.com', 'dos@cliente.com', 'externo@empresa.com']);
  });
  it('rechaza contactos ajenos aunque el navegador suministre emails de sustitución', async () => {
    db.contacts.findMany.mockResolvedValue([contacts[0]]);
    await expect(resolveCalendarInvitation(db, config({ contactIds: [one, two], recipients: [{ email: 'spoof@evil.com' }] }), 'VISITA', 'CL1')).rejects.toThrow('esta empresa');
  });
  it.each(['bad-email', 'a@b.com,b@c.com', 'Name <a@b.com>', 'a@b.com\r\nBcc: x@y.com'])('rechaza dirección inválida: %s', async email => {
    await expect(resolveCalendarInvitation(db, config({ externalEmails: [email] }), 'VIDEOLLAMADA', 'CL1')).rejects.toThrow('no válidas');
  });
  it('rechaza externos en visitas y permite desactivar una invitación sin destinatarios', async () => {
    await expect(resolveCalendarInvitation(db, config({ externalEmails: ['a@b.com'] }), 'VISITA', 'CL1')).rejects.toThrow('solo');
    expect((await resolveCalendarInvitation(db, config({ enabled: false, contactIds: [] }), 'VISITA', 'CL1')).enabled).toBe(false);
    await expect(resolveCalendarInvitation(db, config({ contactIds: [] }), 'VIDEOLLAMADA', 'CL1')).rejects.toThrow('al menos');
  });
  it('rechaza un contacto sin correo y duraciones fuera de rango', async () => {
    db.contacts.findMany.mockResolvedValue([{ ...contacts[0], email: null }]);
    await expect(resolveCalendarInvitation(db, config(), 'VISITA', 'CL1')).rejects.toThrow('email válido');
    await expect(resolveCalendarInvitation(db, config({ durationMinutes: -1 }), 'VISITA', 'CL1')).rejects.toThrow('duración');
  });
});

describe('Cartera y persistencia de la convocatoria', () => {
  function fixture() {
    const row = { id: 'event', created_by: 'user', client_id: 'CL1', type: 'VISITA', due_date: new Date('2026-10-21'), time_scheduled: '10:00' };
    const db: any = {
      profiles: { findUnique: jest.fn().mockResolvedValue({ is_active: true, code: 'ACI', roles: { name: 'VENTAS' } }) },
      customers: { findFirst: jest.fn().mockResolvedValue({ client_id: 'CL1' }), findUnique: jest.fn().mockResolvedValue({ client_id: 'CL1' }) },
      contacts: { findMany: jest.fn().mockResolvedValue([contacts[0]]) },
      crm_activities: { findUnique: jest.fn().mockResolvedValue(row), create: jest.fn(async ({ data }) => ({ ...data, id: 'event' })), update: jest.fn().mockResolvedValue(row), findUniqueOrThrow: jest.fn().mockResolvedValue(row) },
      $executeRaw: jest.fn(),
    };
    db.$transaction = jest.fn(fn => fn(db));
    const sync: any = { syncActivityToOutlook: jest.fn().mockResolvedValue(undefined) };
    return { db, sync, service: new CrmActivitiesService(db, sync, {} as any) };
  }
  it('guarda destinatarios en JSON propio y no modifica clientes ni contactos BC', async () => {
    const { service, db } = fixture();
    await service.create({ clientId: 'CL1', userId: 'user', type: 'VISITA', title: 'Revisión', dueDate: '2026-10-21', timeScheduled: '10:00', calendarInvitation: config() });
    expect(db.crm_activities.create.mock.calls[0][0].data.attendees.calendarInvitation.recipients).toEqual([{ email: 'uno@cliente.com', name: 'Uno' }]);
    expect(db.customers.findFirst.mock.calls[0][0].where).toEqual({ client_id: 'CL1', salesperson_code: 'ACI' });
  });
  it('deniega cartera ajena y cambios de invitados de otro propietario', async () => {
    const { service, db } = fixture();
    db.customers.findFirst.mockResolvedValue(null);
    await expect(service.invitationContacts('user', 'CL2')).rejects.toThrow('cartera');
    db.customers.findFirst.mockResolvedValue({ client_id: 'CL1' });
    await expect(service.update('event', { calendarInvitation: config() }, 'other')).rejects.toThrow('propietario');
    expect(db.crm_activities.update).not.toHaveBeenCalled();
  });
  it('fusiona solo calendarInvitation sin sustituir el JSON de otras funcionalidades', async () => {
    const { service, db } = fixture();
    await service.update('event', { calendarInvitation: config({ message: 'Mensaje actualizado' }) }, 'user');
    expect(JSON.parse(db.$executeRaw.mock.calls[0][1]).calendarInvitation.message).toBe('Mensaje actualizado');
    expect(db.crm_activities.update.mock.calls[0][0].data.attendees).toBeUndefined();
  });
});

describe('Contenido público y enlace de Teams', () => {
  it('sustituye solo el bloque propio y conserva literalmente el contenido Teams', () => {
    const teams = '<div class="me-email-text">Microsoft Teams <a href="https://teams.example/join">Unirse</a></div>';
    expect(mergePublicCalendarBody(publicCalendarBody('Antes') + teams, publicCalendarBody('Después'), true)).toBe(publicCalendarBody('Después') + teams);
  });
  it('retira conclusiones del cuerpo heredado sin perder un bloque Teams reconocible', () => {
    const teams = '<div class="me-email-text">Microsoft Teams <a href="https://teams.example/join">Unirse</a></div>';
    const result = mergePublicCalendarBody('<p>Conclusiones: privadas</p>' + teams, publicCalendarBody('Agenda pública'), true, 'https://teams.example/join');
    expect(result).toBe(publicCalendarBody('Agenda pública') + teams);
    expect(result).not.toContain('privadas');
    expect(() => mergePublicCalendarBody('<p>Conclusiones privadas</p>', publicCalendarBody('Agenda'), true)).toThrow('segura');
  });
  it('escapa HTML proporcionado por el usuario', () => {
    expect(publicCalendarBody('<script>alert(1)</script>')).toContain('&lt;script&gt;');
  });
  it('exporta invitados de visitas/vídeos, omite notas privadas y calcula el fin al día siguiente', async () => {
    const invitation = await resolveCalendarInvitation({ contacts: { findMany: async () => [contacts[0]] } }, config(), 'VISITA', 'CL1');
    for (const type of ['VISITA', 'VIDEOLLAMADA']) {
      const row = { id: 'activity', created_by: 'user', type, title: 'Presentación', due_date: new Date('2026-10-21'), time_scheduled: '23:30', description: 'NOTAS SECRETAS', conclusions: 'CONCLUSIONES SECRETAS', attendees: { calendarInvitation: invitation } };
      const db: any = { crm_activities: { findUnique: jest.fn().mockResolvedValue(row), update: jest.fn() }, user_exchange_accounts: { findUnique: jest.fn().mockResolvedValue({ calendar_sync_enabled: true }) } };
      const graph: any = { createCalendarEvent: jest.fn().mockResolvedValue({ id: 'event', changeKey: 'v1' }) };
      await new ExchangeSyncService(db, graph, {} as any, {} as any).syncActivityToOutlook('activity');
      const payload = graph.createCalendarEvent.mock.calls[0][1];
      expect(payload.attendees).toEqual(invitation.recipients);
      expect(payload.description).not.toMatch(/SECRETAS/);
      expect(payload.endDate).toBe('2026-10-22T00:30:00');
      expect(payload.isOnlineMeeting).toBe(type === 'VIDEOLLAMADA');
    }
  });
  it('al completar una convocatoria solo cambia la categoría sin reenviar cuerpo ni invitados', async () => {
    const originalFetch = global.fetch;
    try {
      const service = new MicrosoftGraphService(new ConfigService({}), {} as any);
      jest.spyOn(service, 'getValidAccessToken').mockResolvedValue('test');
      jest.spyOn(service, 'ensureDtsCategory').mockResolvedValue();
      const body = publicCalendarBody('Agenda');
      const request = jest.fn().mockResolvedValueOnce(new Response(JSON.stringify({ subject: 'Visita', body: { content: body }, attendees: [{ emailAddress: { address: 'uno@cliente.com' } }], categories: ['Personal', 'dTS CRM'] }))).mockResolvedValueOnce(new Response(JSON.stringify({ id: 'event' })));
      global.fetch = request;
      await service.updateCalendarEvent('user', 'event', { publicInvitation: true, title: 'Visita', description: body, attendees: [{ email: 'uno@cliente.com' }], categories: ['dTS CRM - Completado'] });
      expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({ categories: ['Personal', 'dTS CRM - Completado'] });
    } finally { global.fetch = originalFetch; }
  });
});

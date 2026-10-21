import { MicrosoftGraphService } from './microsoft-graph.service';
import { ConfigService } from '@nestjs/config';
import { ExchangeSyncService } from './exchange-sync.service';

describe('tracked outgoing emails', () => {
  let originalFetch: typeof fetch;
  beforeEach(() => { originalFetch = global.fetch; });
  afterEach(() => { global.fetch = originalFetch; });
  it('requests an immutable ID when creating a pilot draft', async () => {
    const graph = new MicrosoftGraphService(new ConfigService({ CRM_EMAIL_IDENTITY_ENABLED: 'true', CRM_EMAIL_IDENTITY_EMAILS: 'tester@test.invalid' }), {
      profiles: { findUnique: jest.fn().mockResolvedValue({ email: 'tester@test.invalid', is_active: true }) },
    } as any);
    jest.spyOn(graph, 'getValidAccessToken').mockResolvedValue('not-logged');
    const request = jest.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'StableDraft', webLink: 'https://outlook.office.com/mail/item/draft' })));
    global.fetch = request;
    const draft = await graph.createDraftMail('user', { to: ['one@test.invalid'], subject: 'Test', body: 'Test' });
    expect(draft.idType).toBe('restImmutableEntryId');
    expect(request.mock.calls[0][1].headers.Prefer).toBe('IdType="ImmutableId"');
  });
  it('makes exactly one send attempt and never falls back to sending a new message', async () => {
    const graph = new MicrosoftGraphService(new ConfigService({}), {} as any);
    jest.spyOn(graph, 'getValidAccessToken').mockResolvedValue('not-logged');
    const request = jest.fn().mockRejectedValue(new Error('network timeout'));
    global.fetch = request;
    await expect(graph.sendDraft('user', 'StableDraft')).rejects.toThrow('Comprueba Outlook');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe('https://graph.microsoft.com/v1.0/me/messages/StableDraft/send');
  });
  function service() {
    const prisma: any = { crm_activities: { update: jest.fn().mockImplementation(async value => ({ id: value.where.id, ...value.data })) } };
    const graph: any = { sendDraft: jest.fn().mockResolvedValue(undefined), sendMail: jest.fn() };
    const identity: any = { enabledFor: jest.fn().mockResolvedValue(true), prepare: jest.fn().mockResolvedValue({ enabled: true, patch: { exchange_resolution_status: 'not_found' } }) };
    const sync = new ExchangeSyncService(prisma, graph, {} as any, identity);
    jest.spyOn(sync, 'createDraftFromCrm').mockResolvedValue({ success: true, draft: { id: 'StableDraft', idType: 'restImmutableEntryId', webLink: 'https://outlook.office.com/mail/item/draft' }, activity: { id: 'activity' } } as any);
    return { sync, prisma, graph };
  }
  it('persists uncertain state before sending and retains propagation delays as pending', async () => {
    const { sync, prisma, graph } = service();
    const result = await sync.sendEmailFromCrm('user', { clientId: 'client', to: ['one@test.invalid'], subject: 'Test', body: 'Test' });
    expect(prisma.crm_activities.update.mock.calls[0][0].data.exchange_sync_status).toBe('send_unconfirmed');
    expect(prisma.crm_activities.update.mock.invocationCallOrder[0]).toBeLessThan(graph.sendDraft.mock.invocationCallOrder[0]);
    expect(result.activity.exchange_sync_status).toBe('sent_pending');
    expect(graph.sendDraft).toHaveBeenCalledTimes(1);
    expect(graph.sendMail).not.toHaveBeenCalled();
  });
  it('retains a tracked uncertain activity when sending fails and does not send again', async () => {
    const { sync, prisma, graph } = service();
    graph.sendDraft.mockRejectedValue(new Error('unconfirmed'));
    await expect(sync.sendEmailFromCrm('user', { clientId: 'client', to: ['one@test.invalid'], subject: 'Test', body: 'Test' })).rejects.toThrow('unconfirmed');
    expect(prisma.crm_activities.update).toHaveBeenCalledTimes(1);
    expect(graph.sendDraft).toHaveBeenCalledTimes(1);
    expect(graph.sendMail).not.toHaveBeenCalled();
  });
  it('registra borradores y correos enviados sin generar actividades pendientes', async () => {
    const prisma: any = { crm_activities: { create: jest.fn(async ({ data }) => ({ id: 'mail', ...data })) } };
    const graph: any = { createDraftMail: jest.fn().mockResolvedValue({ id: 'draft', idType: 'restImmutableEntryId', webLink: 'https://outlook.office.com/mail/item/draft' }), sendMail: jest.fn() };
    const identity: any = { enabledFor: jest.fn().mockResolvedValue(false), prepare: jest.fn().mockResolvedValue({ patch: {} }) };
    const sync = new ExchangeSyncService(prisma, graph, {} as any, identity);
    const payload = { clientId: 'client', to: ['contact@test.invalid'], subject: 'Oferta', body: 'Texto' };
    const draft = await sync.createDraftFromCrm('user', payload);
    expect(draft.activity).toMatchObject({ type: 'EMAIL', is_completed: true, exchange_sync_status: 'draft' });
    expect(graph.sendMail).not.toHaveBeenCalled();
    const sent = await sync.sendEmailFromCrm('user', payload);
    expect(sent.activity).toMatchObject({ type: 'EMAIL', is_completed: true, exchange_sync_status: 'synced' });
    expect(graph.sendMail).toHaveBeenCalledTimes(1);
  });

});

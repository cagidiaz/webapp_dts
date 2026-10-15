import { ConfigService } from '@nestjs/config';
import { EmailOpenService } from './email-open.service';

describe('exact CRM email opening', () => {
  const tenant = '00000000-0000-0000-0000-000000000001';
  const jwt = `x.${Buffer.from(JSON.stringify({ tid: tenant })).toString('base64url')}.x`;
  const message = { id: 'ExactCase', parentFolderId: 'folder-new', internetMessageId: '<one@test.invalid>', isDraft: false, webLink: 'https://outlook.office.com/mail/item/current' };
  const me = { id: 'mailbox', mail: 'tester@test.invalid' };
  const response = (value: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(value), { status, headers });
  let originalFetch: typeof fetch;
  let request: jest.Mock;
  let activity: any;
  let prisma: any;
  let access: any;
  let identities: any;
  let service: EmailOpenService;
  beforeEach(() => {
    originalFetch = global.fetch;
    activity = { id: 'activity', type: 'EMAIL', created_by: 'user', exchange_item_id: 'ews-original', exchange_immutable_id: message.id,
      exchange_mailbox_id: 'mailbox', exchange_tenant_id: tenant, exchange_internet_message_id: message.internetMessageId, exchange_original_id_type: 'ewsId' };
    prisma = { crm_activities: { findFirst: jest.fn(async () => activity), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      user_exchange_accounts: { findUnique: jest.fn().mockResolvedValue({ email: me.mail, microsoft_user_id: me.id }) } };
    access = { actor: jest.fn().mockResolvedValue({ customerScope: { salesperson_code: 'COM' } }) };
    identities = { enabledFor: jest.fn().mockResolvedValue(true) };
    request = jest.fn().mockResolvedValueOnce(response(me)).mockResolvedValueOnce(response(message));
    global.fetch = request;
    service = new EmailOpenService(prisma, { getValidAccessToken: jest.fn().mockResolvedValue(jwt) } as any, identities, access, new ConfigService({ AZURE_TENANT_ID: tenant }));
  });
  afterEach(() => { global.fetch = originalFetch; });
  it('resolves only the authorized activity and obtains the current link after an internal move', async () => {
    expect(await service.resolve('user', 'activity')).toMatchObject({ status: 'resolved', webLink: message.webLink });
    expect(prisma.crm_activities.findFirst.mock.calls[0][0].where).toEqual({ id: 'activity', type: 'EMAIL', customer: { salesperson_code: 'COM' } });
    expect(prisma.crm_activities.updateMany.mock.calls[0][0].data).toMatchObject({ exchange_immutable_id: 'ExactCase', exchange_original_id_type: 'ewsId', exchange_web_link: message.webLink });
    for (const [url, options] of request.mock.calls) {
      expect(options.headers.Prefer).toBe('IdType="ImmutableId"');
      expect(url).not.toContain('subject');
    }
  });
  it('does not cache a stale web link on the next click', async () => {
    await service.resolve('user', 'activity');
    request.mockResolvedValueOnce(response(me)).mockResolvedValueOnce(response({ ...message, webLink: 'https://outlook.office.com/mail/item/moved' }));
    expect((await service.resolve('user', 'activity')).webLink).toContain('/moved');
    expect(request).toHaveBeenCalledTimes(4);
  });
  it('does not query Microsoft for an activity outside the CRM scope', async () => {
    activity = null;
    expect((await service.resolve('user', 'outside')).status).toBe('access_denied');
    expect(request).not.toHaveBeenCalled();
  });
  it('does not use the new flow for a disabled account', async () => {
    identities.enabledFor.mockResolvedValue(false);
    expect((await service.resolve('user', 'activity')).status).toBe('disabled');
    expect(prisma.crm_activities.findFirst).not.toHaveBeenCalled();
  });
  it('honors revoked module permissions before any cached/in-flight result', async () => {
    access.actor.mockRejectedValue(new Error('revoked'));
    await expect(service.resolve('user', 'activity')).rejects.toThrow('revoked');
    expect(request).not.toHaveBeenCalled();
  });
  it('does not give an admin access to another Microsoft mailbox', async () => {
    access.actor.mockResolvedValue({ customerScope: {} });
    activity.exchange_mailbox_id = 'another-mailbox';
    expect((await service.resolve('admin', 'activity')).status).toBe('access_denied');
    expect(request).not.toHaveBeenCalled();
  });
  it('rejects a mismatching tenant before reading messages', async () => {
    activity.exchange_tenant_id = 'different-tenant';
    expect((await service.resolve('user', 'activity')).status).toBe('access_denied');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('does not recover unscoped historical emails for another creator', async () => {
    activity.exchange_mailbox_id = null; activity.exchange_tenant_id = null; activity.created_by = 'other';
    expect((await service.resolve('user', 'activity')).status).toBe('access_denied');
    expect(request).not.toHaveBeenCalled();
  });
  it('leaves unknown historic ID formats for explicit recovery rather than guessing', async () => {
    activity.exchange_immutable_id = null; activity.exchange_original_id_type = null; activity.exchange_internet_message_id = null;
    expect((await service.resolve('user', 'activity')).status).toBe('legacy_unverified');
    expect(request).toHaveBeenCalledTimes(1);
    expect(prisma.crm_activities.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a different internetMessageId even when Graph returns the requested opaque ID', async () => {
    request.mockReset().mockResolvedValueOnce(response(me)).mockResolvedValueOnce(response({ ...message, internetMessageId: '<different@test>' }));
    expect((await service.resolve('user', 'activity')).status).toBe('access_denied');
    expect(prisma.crm_activities.updateMany).not.toHaveBeenCalled();
  });
  it('recovers a single exact internetMessageId only within an already verified mailbox', async () => {
    request.mockReset().mockResolvedValueOnce(response(me)).mockResolvedValueOnce(response({}, 404))
      .mockResolvedValueOnce(response({ value: [{ ...message, id: 'Recovered' }] })).mockResolvedValueOnce(response({ ...message, id: 'Recovered' }));
    expect((await service.resolve('user', 'activity')).status).toBe('resolved');
    expect(decodeURIComponent(request.mock.calls[2][0])).toContain(`internetMessageId eq '${message.internetMessageId}'`);
    expect(prisma.crm_activities.updateMany.mock.calls[0][0].data.exchange_immutable_id).toBe('Recovered');
  });
  it('returns multiple copies for selection and never opens the first automatically', async () => {
    request.mockReset().mockResolvedValueOnce(response(me)).mockResolvedValueOnce(response({}, 404))
      .mockResolvedValueOnce(response({ value: [{ ...message, id: 'one' }, { ...message, id: 'two' }] }))
      .mockResolvedValue(response({ displayName: 'Folder' }));
    const result = await service.resolve('user', 'activity');
    expect(result.status).toBe('ambiguous'); expect(result.candidates).toHaveLength(2); expect(result.webLink).toBeUndefined();
    expect(prisma.crm_activities.updateMany).not.toHaveBeenCalled();
  });
  it('revalidates an explicit copy selection against the exact internetMessageId', async () => {
    request.mockReset().mockResolvedValueOnce(response(me)).mockResolvedValueOnce(response({ value: [{ ...message, id: 'one' }, { ...message, id: 'two' }] }))
      .mockResolvedValueOnce(response({ ...message, id: 'two' }));
    expect((await service.resolve('user', 'activity', 'two')).status).toBe('resolved');
    expect(request.mock.calls[2][0]).toContain('/messages/two?');
  });
  it('never queries an arbitrary message ID supplied as a copy selection', async () => {
    request.mockReset().mockResolvedValueOnce(response(me)).mockResolvedValueOnce(response({ value: [{ ...message, id: 'one' }] }))
      .mockResolvedValueOnce(response({ displayName: 'Folder' }));
    expect((await service.resolve('user', 'activity', 'attacker-selected')).status).toBe('ambiguous');
    expect(request.mock.calls.some(call => call[0].includes('attacker-selected'))).toBe(false);
  });
  it('does not treat a truncated candidate page as a unique match', async () => {
    request.mockReset().mockResolvedValueOnce(response(me)).mockResolvedValueOnce(response({}, 404))
      .mockResolvedValueOnce(response({ value: [message], '@odata.nextLink': 'https://graph.microsoft.com/unused' }))
      .mockResolvedValueOnce(response({ displayName: 'Folder' }));
    const result = await service.resolve('user', 'activity');
    expect(result.status).toBe('ambiguous'); expect(result.truncated).toBe(true);
  });
  it.each([[401, 'reconnect_required'], [403, 'access_denied'], [404, 'not_found'], [500, 'temporary_error']])('distinguishes HTTP %s as %s', async (status, expected) => {
    request.mockReset().mockResolvedValueOnce(response({}, Number(status)));
    expect((await service.resolve('user', 'activity')).status).toBe(expected);
  });
  it('respects Retry-After across clicks without retrying inside the request', async () => {
    request.mockReset().mockResolvedValue(response({}, 429, { 'Retry-After': '60' }));
    const first = await service.resolve('user', 'activity'); const second = await service.resolve('user', 'activity');
    expect(first).toMatchObject({ status: 'temporary_error', retryAfterSeconds: 60 }); expect(second.status).toBe('temporary_error');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('does not open a stale reference after an optimistic concurrency conflict', async () => {
    prisma.crm_activities.updateMany.mockResolvedValue({ count: 0 });
    expect((await service.resolve('user', 'activity')).status).toBe('temporary_error');
  });
  it('deduplicates simultaneous clicks on the same activity', async () => {
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    request.mockReset().mockImplementation(async (url: string) => {
      if (url.includes('/me?')) { await blocked; return response(me); }
      return response(message);
    });
    const first = service.resolve('user', 'activity'); const second = service.resolve('user', 'activity');
    await new Promise<void>(resolve => setImmediate(resolve));
    release();
    expect((await Promise.all([first, second])).map(value => value.status)).toEqual(['resolved', 'resolved']);
    expect(request).toHaveBeenCalledTimes(2);
    expect(prisma.crm_activities.updateMany).toHaveBeenCalledTimes(1);
  });
  it('limits independent in-flight opens to two per authenticated user', async () => {
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    prisma.crm_activities.findFirst.mockImplementation(async ({ where }) => ({ ...activity, id: where.id }));
    request.mockReset().mockImplementation(async (url: string) => {
      if (url.includes('/me?')) { await blocked; return response(me); }
      return response(message);
    });
    const first = service.resolve('user', 'one'); const second = service.resolve('user', 'two');
    await new Promise<void>(resolve => setImmediate(resolve));
    expect((await service.resolve('user', 'three')).status).toBe('busy');
    release(); await Promise.all([first, second]);
    expect(request).toHaveBeenCalledTimes(4);
  });
});

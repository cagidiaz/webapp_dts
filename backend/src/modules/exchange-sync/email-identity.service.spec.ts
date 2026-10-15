import { EmailIdentityService, tenantFromGraphAcceptedToken } from './email-identity.service';

describe('email registration identity', () => {
  const tenant = '00000000-0000-0000-0000-000000000001';
  const token = `x.${Buffer.from(JSON.stringify({ tid: tenant })).toString('base64url')}.x`;
  let originalFetch: typeof fetch;
  let request: jest.Mock;
  let prisma: any;
  let graph: any;
  let config: any;
  let service: EmailIdentityService;
  const message = { id: 'CaseSensitive', isDraft: false, parentFolderId: 'folder', internetMessageId: '<one@test>', webLink: 'https://outlook.office.com/mail/item/one' };
  const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
  beforeEach(() => {
    originalFetch = global.fetch;
    request = jest.fn().mockResolvedValueOnce(response({ id: 'mailbox', mail: 'tester@test.invalid' }))
      .mockResolvedValueOnce(response({ value: [{ sourceId: 'ews-original', targetId: message.id }] }))
      .mockResolvedValueOnce(response(message));
    global.fetch = request;
    prisma = { profiles: { findUnique: jest.fn().mockResolvedValue({ email: 'tester@test.invalid', is_active: true }) },
      user_exchange_accounts: { findUnique: jest.fn().mockResolvedValue({ email: 'tester@test.invalid', microsoft_user_id: 'mailbox' }) } };
    graph = { getValidAccessToken: jest.fn().mockResolvedValue(token) };
    config = { get: jest.fn((key: string) => ({ CRM_EMAIL_IDENTITY_ENABLED: 'true', CRM_EMAIL_IDENTITY_EMAILS: 'tester@test.invalid', AZURE_TENANT_ID: tenant })[key]) };
    service = new EmailIdentityService(prisma, graph, config);
  });
  afterEach(() => { global.fetch = originalFetch; });
  it('stores only server-verified scoped references while preserving case', async () => {
    const result = await service.prepare('user', 'ews-original', 'ewsId');
    expect(result.patch).toMatchObject({ exchange_tenant_id: tenant, exchange_mailbox_id: 'mailbox', exchange_immutable_id: message.id, exchange_internet_message_id: message.internetMessageId, exchange_original_id_type: 'ewsId', exchange_resolution_status: 'resolved' });
    expect(result.isDraft).toBe(false);
    expect(request).toHaveBeenCalledTimes(3);
    expect(Object.keys(result.patch)).toHaveLength(7);
  });
  it.each([false, null])('does not call Graph for an inactive profile %p', async active => {
    prisma.profiles.findUnique.mockResolvedValue({ is_active: active, email: 'tester@test.invalid' });
    expect(await service.prepare('user', 'ews-original', 'ewsId')).toEqual({ enabled: false, patch: {} });
    expect(request).not.toHaveBeenCalled();
  });
  it('does not enable other users when the pilot flag is true', async () => {
    prisma.profiles.findUnique.mockResolvedValue({ is_active: true, email: 'other@test.invalid' });
    expect(await service.enabledFor('other')).toBe(false);
    expect((await service.prepare('other', 'ews-original', 'ewsId')).enabled).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
  it('requires reconnection when OAuth is unavailable', async () => {
    graph.getValidAccessToken.mockResolvedValue(null);
    expect((await service.prepare('user', 'ews-original', 'ewsId')).patch.exchange_resolution_status).toBe('reconnect_required');
    expect(request).not.toHaveBeenCalled();
  });
  it('does not read any message from a different mailbox', async () => {
    request.mockReset().mockResolvedValue(response({ id: 'wrong-mailbox', mail: 'tester@test.invalid' }));
    expect((await service.prepare('user', 'ews-original', 'ewsId')).patch.exchange_resolution_status).toBe('access_denied');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([[401, 'reconnect_required'], [403, 'access_denied'], [404, 'not_found'], [429, 'temporary_error'], [503, 'temporary_error']])('records HTTP %s as %s without approximate lookup', async (status, expected) => {
    request.mockReset().mockResolvedValue(response({}, Number(status)));
    expect((await service.prepare('user', 'ews-original', 'ewsId')).patch.exchange_resolution_status).toBe(expected);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('retains the exact draft reference even without an internetMessageId', async () => {
    request.mockReset().mockResolvedValueOnce(response({ id: 'mailbox', mail: 'tester@test.invalid' }))
      .mockResolvedValueOnce(response({ ...message, isDraft: true, internetMessageId: null }));
    const result = await service.prepare('user', message.id, 'restImmutableEntryId');
    expect(result.patch).toMatchObject({ exchange_immutable_id: message.id, exchange_mailbox_id: 'mailbox', exchange_resolution_status: 'pending' });
    expect(result.patch.exchange_resolved_at).toBeUndefined();
    expect(result.isDraft).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('never considers an unknown draft state to be a sent message', async () => {
    request.mockReset().mockResolvedValueOnce(response({ id: 'mailbox', mail: 'tester@test.invalid' }))
      .mockResolvedValueOnce(response({ ...message, isDraft: undefined }));
    expect((await service.prepare('user', message.id, 'restImmutableEntryId')).patch.exchange_resolution_status).toBe('temporary_error');
  });
  it('rejects unverified or mismatching tenant claims', () => {
    expect(() => tenantFromGraphAcceptedToken('opaque')).toThrow('TENANT_NOT_VERIFIED');
    expect(() => tenantFromGraphAcceptedToken(token, '00000000-0000-0000-0000-000000000002')).toThrow('TENANT_MISMATCH');
    expect(tenantFromGraphAcceptedToken(token, 'common')).toBe(tenant);
  });
});

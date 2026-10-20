import { normalizeAttachments, attachmentState } from './email-attachments';
import { OutlookMessageIdentityClient } from './outlook-message-identity';
import { OutlookAddinService } from './outlook-addin.service';
import { CrmActivitiesService } from '../crm-activities/crm-activities.service';
import { EmailIdentityService } from './email-identity.service';

describe('attachment metadata contract', () => {
  it('keeps duplicate names and strips all fields except name and a valid size', () => {
    const result = normalizeAttachments({ version: 1, status: 'complete', files: [
      { name: 'Oferta.pdf', size: 100, contentBytes: 'secret', url: 'private', id: 'private' },
      { name: 'Oferta.pdf', size: -1 },
    ], token: 'secret' }, 'office');
    expect(result.files).toEqual([{ name: 'Oferta.pdf', size: 100 }, { name: 'Oferta.pdf' }]);
    expect(result.totalKnown).toBe(2);
    expect(JSON.stringify(result)).not.toMatch(/secret|private|contentBytes/);
  });
  it('distinguishes complete empty, failure and pending', () => {
    expect(normalizeAttachments({ version: 1, status: 'complete', files: [] }, 'office')).toMatchObject({ status: 'complete', totalKnown: 0 });
    expect(normalizeAttachments({ version: 1, status: 'complete' }, 'office')).toMatchObject({ status: 'unavailable', totalKnown: null });
    expect(normalizeAttachments(null, 'office').status).toBe('unavailable');
    expect(attachmentState('pending', 'crm')).toMatchObject({ status: 'pending', totalKnown: null, files: [] });
  });
  it('limits names and count, reports partial, and never turns malformed entries into confirmed empty', () => {
    const result = normalizeAttachments({ version: 1, status: 'complete', files: Array.from({ length: 102 }, () => ({ name: 'a'.repeat(600) })) }, 'office');
    expect(result.status).toBe('partial'); expect(result.files).toHaveLength(100); expect(result.files[0].name).toHaveLength(512);
    expect(result.totalKnown).toBeNull();
    expect(normalizeAttachments({ version: 1, status: 'complete', files: [{ name: '\x00' }, null] }, 'office').status).toBe('partial');
  });
});

describe('Graph attachment metadata', () => {
  it('does not fail the verified sent identity when metadata fails, and never fetches metadata by default or for drafts', async () => {
    const tenant = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const acceptedToken = `header.${Buffer.from(JSON.stringify({ tid: tenant })).toString('base64url')}.signature`;
    const db: any = { profiles: { findUnique: async () => ({ email: 'user@test.invalid', is_active: true }) },
      user_exchange_accounts: { findUnique: async () => ({ microsoft_user_id: 'mailbox', email: 'user@test.invalid' }) } };
    const config: any = { get: (key: string) => ({ CRM_EMAIL_IDENTITY_ENABLED: 'true', CRM_EMAIL_IDENTITY_EMAILS: '*', AZURE_TENANT_ID: tenant }[key]) };
    const mailbox = jest.spyOn(OutlookMessageIdentityClient.prototype, 'verifyMailbox').mockResolvedValue({ id: 'mailbox', email: 'user@test.invalid' });
    const message = jest.spyOn(OutlookMessageIdentityClient.prototype, 'readMessage').mockResolvedValue({ immutableId: 'exact', internetMessageId: '<exact>', isDraft: false, parentFolderId: 'folder', webLink: null, observedAt: new Date().toISOString() });
    const metadata = jest.spyOn(OutlookMessageIdentityClient.prototype, 'attachmentMetadata').mockRejectedValue(new Error('Graph unavailable'));
    try {
      const service = new EmailIdentityService(db, { getValidAccessToken: async () => acceptedToken } as any, config);
      expect((await service.prepare('user', 'exact', 'restImmutableEntryId')).patch.exchange_resolution_status).toBe('resolved');
      expect(metadata).not.toHaveBeenCalled();
      const result = await service.prepare('user', 'exact', 'restImmutableEntryId', true);
      expect(result.patch.exchange_resolution_status).toBe('resolved');
      expect(result.attachmentMetadata).toMatchObject({ status: 'unavailable', source: 'graph' });
      message.mockResolvedValueOnce({ immutableId: 'exact', internetMessageId: null, isDraft: true, parentFolderId: 'folder', webLink: null, observedAt: new Date().toISOString() });
      await service.prepare('user', 'exact', 'restImmutableEntryId', true);
      expect(metadata).toHaveBeenCalledTimes(1);
    } finally { mailbox.mockRestore(); message.mockRestore(); metadata.mockRestore(); }
  });
  it('requests only metadata, follows bounded pages, excludes inline only', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(new Response(JSON.stringify({ value: [{ name: 'signature.png', isInline: true }],
      '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages/exact/attachments?$select=name,size,isInline&$skip=1' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: [{ name: 'logo.png', size: 42, contentBytes: 'never-persist' }, { name: 'logo.png' }] })));
    const result = await new OutlookMessageIdentityClient('test-token', fetcher).attachmentMetadata('exact');
    expect(result).toMatchObject({ status: 'complete', totalKnown: 2, files: [{ name: 'logo.png', size: 42 }, { name: 'logo.png' }] });
    for (const [url, options] of fetcher.mock.calls) {
      expect(url).toContain('$select=name,size,isInline'); expect(url).not.toMatch(/contentBytes|\/$value/);
      expect(options.method).toBe('GET');
    }
  });
  it('refuses next pages that change host, message, or projection', async () => {
    for (const next of ['https://evil.invalid/attachments', 'https://graph.microsoft.com/v1.0/me/messages/other/attachments?$select=name,size,isInline', 'https://graph.microsoft.com/v1.0/me/messages/exact/attachments',
      'https://graph.microsoft.com/v1.0/me/messages/exact/attachments?$select=name,size,isInline&$select=contentBytes',
      'https://graph.microsoft.com/v1.0/me/messages/exact/attachments?$select=name,size,isInline&$expand=item']) {
      const fetcher = jest.fn().mockResolvedValue(new Response(JSON.stringify({ value: [], '@odata.nextLink': next })));
      await expect(new OutlookMessageIdentityClient('test-token', fetcher).attachmentMetadata('exact')).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
  it('marks bounded pagination partial without inventing a total', async () => {
    const fetcher = jest.fn(async () => new Response(JSON.stringify({ value: [], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages/exact/attachments?$select=name,size,isInline&$skip=1' })));
    expect(await new OutlookMessageIdentityClient('test-token', fetcher).attachmentMetadata('exact')).toMatchObject({ status: 'partial', totalKnown: null });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});

describe('new email persistence', () => {
  const metadata = { version: 1, status: 'complete', files: [{ name: 'Presupuesto.pdf', downloadUrl: 'secret' }] };
  it('modern registration preserves category, quote and sent date; duplicates leave snapshot untouched', async () => {
    const db: any = { crm_offer_followups: { findUnique: jest.fn().mockResolvedValue(null) }, profiles: {}, contacts: { findFirst: jest.fn().mockResolvedValue({ id: 'contact' }), findUnique: jest.fn().mockResolvedValue({ email: 'contact@test.invalid' }) }, sales_quotes: { findFirst: jest.fn().mockResolvedValue({ id: 'quote' }) },
      crm_activities: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(async ({ data }) => ({ id: 'new', ...data })) },
      sales_quotes_crm: { findUnique: jest.fn().mockResolvedValue({ id: 'quote' }) }, sales_quote_activities: { create: jest.fn() } };
    const access: any = { actor: jest.fn().mockResolvedValue({ profile: { id: 'user' }, customerScope: {} }), company: jest.fn() };
    const identities: any = { prepare: jest.fn().mockResolvedValue({ enabled: false, patch: {} }) };
    const service = new OutlookAddinService(db, { get: () => undefined } as any, identities, access);
    const payload: any = { userEmail: 'user@test.invalid', exchangeItemId: 'exact', clientId: 'client', contactId: 'contact', subject: 'Test', body: 'Body', categoryTag: 'NEGOCIACION', quoteDocumentNo: 'OF1', sentDate: '2026-10-16T12:00:00Z', emailAttachments: metadata };
    await service.logEmail(payload, 'user');
    const saved = db.crm_activities.create.mock.calls[0][0].data.attendees;
    expect(saved).toMatchObject({ categoryTag: 'NEGOCIACION', quoteDocumentNo: 'OF1', sentDate: '2026-10-16T12:00:00.000Z', emailAttachments: { files: [{ name: 'Presupuesto.pdf' }] } });
    db.crm_activities.findFirst.mockResolvedValue({ id: 'old', attendees: { legacy: true } });
    expect((await service.logEmail(payload, 'user')).alreadyExisted).toBe(true);
    expect(db.crm_activities.create).toHaveBeenCalledTimes(1);
  });
  it('static route saves optional sanitized metadata only on EMAIL and keeps it when editing category', async () => {
    const db: any = { customers: { findUnique: jest.fn().mockResolvedValue({ client_id: 'client' }) },
      crm_activities: { create: jest.fn(async ({ data }) => ({ id: 'new', ...data })), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn(async args => args.data) }, $executeRaw: jest.fn() };
    db.$transaction = jest.fn(callback => callback(db));
    const sync: any = { syncActivityToOutlook: jest.fn().mockResolvedValue(null) };
    const service = new CrmActivitiesService(db, sync, {} as any);
    const activity = await service.create({ clientId: 'client', userId: 'user', type: 'EMAIL', title: 'Email', emailAttachments: metadata });
    expect(activity.attendees).toMatchObject({ emailAttachments: { files: [{ name: 'Presupuesto.pdf' }] } });
    db.crm_activities.findUnique.mockResolvedValue(activity);
    db.crm_activities.findUniqueOrThrow.mockResolvedValue(activity);
    await service.update('new', { categoryTag: 'NEGOCIACION', quoteDocumentNo: 'OF1' });
    expect(db.crm_activities.update.mock.calls[0][0].data.attendees).toBeUndefined();
    expect(db.$executeRaw.mock.calls[0][1]).toBe(JSON.stringify({ categoryTag: 'NEGOCIACION', quoteDocumentNo: 'OF1' }));
    await service.create({ clientId: 'client', userId: 'user', type: 'CALL', title: 'Call', emailAttachments: metadata });
    expect(db.crm_activities.create.mock.calls[1][0].data.attendees).toBeUndefined();
  });
});

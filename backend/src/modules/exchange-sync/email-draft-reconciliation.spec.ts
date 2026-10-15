import { ExchangeSyncService } from './exchange-sync.service';

describe('exact draft reconciliation', () => {
  let prisma: any;
  let graph: any;
  let identities: any;
  let service: ExchangeSyncService;
  const draft = (id: string) => ({ id, created_by: 'user', type: 'EMAIL', email: 'same@test.invalid', title: 'Same subject', exchange_sync_status: 'draft', exchange_tenant_id: 'tenant', exchange_mailbox_id: 'mailbox', exchange_immutable_id: id, exchange_original_id_type: 'restId' });
  const resolved = (id: string) => ({ enabled: true, isDraft: false, webLink: `https://outlook.office.com/mail/item/${id}`, patch: { exchange_tenant_id: 'tenant', exchange_mailbox_id: 'mailbox', exchange_immutable_id: id, exchange_resolution_status: 'resolved' } });
  beforeEach(() => {
    prisma = { user_exchange_accounts: { findUnique: jest.fn().mockResolvedValue({ calendar_sync_enabled: false, mail_sync_enabled: true }), update: jest.fn() },
      crm_activities: { findMany: jest.fn().mockResolvedValue([draft('one'), draft('two')]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    graph = { getRecentSentMessages: jest.fn(), sendDraft: jest.fn() };
    identities = { prepare: jest.fn(async (_user, id) => resolved(id)) };
    service = new ExchangeSyncService(prisma, graph, {} as any, identities);
  });
  it('independently follows same-subject same-recipient messages without sending anything', async () => {
    expect((await service.syncOutlookToCrm('user')).syncedEmails).toBe(2);
    expect(identities.prepare.mock.calls).toEqual([['user', 'one', 'restImmutableEntryId'], ['user', 'two', 'restImmutableEntryId']]);
    expect(graph.getRecentSentMessages).not.toHaveBeenCalled();
    expect(graph.sendDraft).not.toHaveBeenCalled();
    for (let index = 0; index < 2; index++) {
      const update = prisma.crm_activities.updateMany.mock.calls[index][0];
      expect(update.where).toMatchObject({ created_by: 'user', type: 'EMAIL', exchange_sync_status: 'draft' });
      expect(update.data.exchange_immutable_id).toBe(index ? 'two' : 'one');
      expect(update.data.exchange_original_id_type).toBe('restId');
      expect(update.data.title).toBeUndefined();
      expect(update.data.description).toBeUndefined();
    }
  });
  it('leaves historical drafts without verified identity untouched', async () => {
    prisma.crm_activities.findMany.mockResolvedValue([{ ...draft('legacy'), exchange_immutable_id: null }]);
    expect((await service.syncOutlookToCrm('user')).syncedEmails).toBe(0);
    expect(identities.prepare).not.toHaveBeenCalled();
    expect(prisma.crm_activities.updateMany).not.toHaveBeenCalled();
  });
  it('cannot reassign a draft after reconnecting to another mailbox', async () => {
    prisma.crm_activities.findMany.mockResolvedValue([draft('one')]);
    identities.prepare.mockResolvedValue({ ...resolved('one'), patch: { ...resolved('one').patch, exchange_mailbox_id: 'different' } });
    expect((await service.syncOutlookToCrm('user')).syncedEmails).toBe(0);
    const data = prisma.crm_activities.updateMany.mock.calls[0][0].data;
    expect(data.exchange_resolution_status).toBe('access_denied');
    expect(data.exchange_mailbox_id).toBeUndefined();
    expect(data.exchange_sync_status).toBeUndefined();
  });
  it.each(['pending', 'not_found', 'temporary_error', 'reconnect_required'])('keeps %s pending rather than selecting another message', async status => {
    prisma.crm_activities.findMany.mockResolvedValue([draft('one')]);
    identities.prepare.mockResolvedValue({ enabled: true, patch: { exchange_resolution_status: status } });
    expect((await service.syncOutlookToCrm('user')).syncedEmails).toBe(0);
    expect(prisma.crm_activities.updateMany.mock.calls[0][0].data).not.toHaveProperty('exchange_sync_status');
  });
  it('does not mark an unsent draft as sent even when it already has an internet ID', async () => {
    prisma.crm_activities.findMany.mockResolvedValue([draft('one')]);
    identities.prepare.mockResolvedValue({ ...resolved('one'), isDraft: true, patch: { ...resolved('one').patch, exchange_resolution_status: 'pending' } });
    expect((await service.syncOutlookToCrm('user')).syncedEmails).toBe(0);
  });
  it('honors an optimistic concurrency conflict without claiming a sync', async () => {
    prisma.crm_activities.updateMany.mockResolvedValue({ count: 0 });
    expect((await service.syncOutlookToCrm('user')).syncedEmails).toBe(0);
  });
});

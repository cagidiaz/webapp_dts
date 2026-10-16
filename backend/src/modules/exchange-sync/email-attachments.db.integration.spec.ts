import { PrismaService } from '../../prisma/prisma.service';
import { CrmActivitiesService } from '../crm-activities/crm-activities.service';
import { ExchangeSyncService } from './exchange-sync.service';
import { attachmentState } from './email-attachments';

let isolated = false;
try {
  const url = new URL(process.env.DATABASE_URL || '');
  isolated = process.env.DTS_REVIEW_API_INTEGRATION === '1' && url.protocol === 'postgresql:'
    && url.hostname === '127.0.0.1' && url.port === '55436' && url.username === 'crm_review'
    && url.password === 'local_review_only' && url.pathname === '/dts_crm_api_review';
} catch { /* Never write to a shared or unknown database. */ }
const integration = isolated ? describe : describe.skip;
integration('attachment JSON operations in isolated PostgreSQL', () => {
  let db: PrismaService;
  const userId = '10000000-0000-4000-8000-000000000001';
  const created: string[] = [];
  beforeAll(async () => { db = new PrismaService(); await db.onModuleInit(); });
  afterAll(async () => { if (db) { await db.crm_activities.deleteMany({ where: { id: { in: created } } }); await db.onModuleDestroy(); } });
  async function activity(pending = true) {
    const row = await db.crm_activities.create({ data: { client_id: 'C-ACI', created_by: userId, type: 'EMAIL', title: 'Attachment integration',
      exchange_immutable_id: 'exact-attachment-message', exchange_tenant_id: 'tenant', exchange_mailbox_id: 'mailbox', exchange_sync_status: 'draft',
      attendees: { categoryTag: 'GENERAL', quoteDocumentNo: 'OF-ACI', sentDate: '2026-10-16T12:00:00Z',
        ...(pending ? { emailAttachments: attachmentState('pending', 'crm') } : {}) } } });
    created.push(row.id); return row;
  }
  async function reconcile(row: any, metadata?: object) {
    const proxy: any = { crm_activities: db.crm_activities,
      user_exchange_accounts: { findUnique: async () => ({ calendar_sync_enabled: false, mail_sync_enabled: true }), update: async () => ({}) },
      $transaction: db.$transaction.bind(db), $executeRaw: db.$executeRaw.bind(db) };
    const identities: any = { prepare: jest.fn().mockResolvedValue({ enabled: true, isDraft: false, attachmentMetadata: metadata,
      patch: { exchange_resolution_status: 'resolved', exchange_mailbox_id: 'mailbox', exchange_tenant_id: 'tenant' } }) };
    await new ExchangeSyncService(proxy, {} as any, {} as any, identities).syncOutlookToCrm(userId);
    return { saved: await db.crm_activities.findUniqueOrThrow({ where: { id: row.id } }), identities };
  }
  it('atomically preserves surrounding JSON through reconciliation and later category/quote edits', async () => {
    const row = await activity();
    const metadata = { version: 1, status: 'complete', source: 'graph', files: [{ name: 'Final.pdf' }], totalKnown: 1 };
    let releaseRead: (value: any) => void;
    const staleRead = new Promise(resolve => { releaseRead = resolve; });
    const editorDb: any = { crm_activities: { findUnique: () => staleRead }, $transaction: db.$transaction.bind(db) };
    const service = new CrmActivitiesService(editorDb, { syncActivityToOutlook: async () => null } as any, {} as any);
    // The editor read the pending snapshot before the sent-message reconciliation.
    const editing = service.update(row.id, { categoryTag: 'NEGOCIACION', quoteDocumentNo: 'OF-NEW' });
    const { saved } = await reconcile(row, metadata);
    expect(saved.attendees).toMatchObject({ categoryTag: 'GENERAL', quoteDocumentNo: 'OF-ACI', emailAttachments: metadata });
    expect(saved.exchange_sync_status).toBe('synced');
    releaseRead!(row);
    const edited = await editing;
    expect(edited.attendees).toMatchObject({ categoryTag: 'NEGOCIACION', quoteDocumentNo: 'OF-NEW', emailAttachments: metadata, sentDate: '2026-10-16T12:00:00Z' });
  });
  it('records unavailable metadata without losing the sent identity or sending again', async () => {
    const { saved } = await reconcile(await activity());
    expect(saved.exchange_sync_status).toBe('synced');
    expect(saved.attendees).toMatchObject({ emailAttachments: { status: 'unavailable', totalKnown: null } });
  });
  it('does not enrich old rows without the new pending marker', async () => {
    const { saved, identities } = await reconcile(await activity(false));
    expect(identities.prepare).toHaveBeenCalledWith(userId, 'exact-attachment-message', 'restImmutableEntryId');
    expect((saved.attendees as any).emailAttachments).toBeUndefined();
  });
});

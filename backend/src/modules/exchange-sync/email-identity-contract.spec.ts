import { assertOwnEmailMailboxAccess, resolvedEmailIdentityPatch, ResolvedEmailIdentity } from './email-identity-contract';

describe('Email identity contract before migration', () => {
  const identity: ResolvedEmailIdentity = { tenantId: 'tenant-A', mailboxId: 'mailbox-A', immutableId: 'OpaqueCaseSensitive', internetMessageId: '<one@example.invalid>', originalIdType: 'ewsId', resolvedAt: new Date('2026-10-15T10:00:00Z') };
  it('stores only the seven identity fields without changing legacy sync or commercial data', () => {
    const patch = resolvedEmailIdentityPatch('EMAIL', { ...identity, access_token: 'secret', title: 'private subject', exchange_item_id: 'legacy' } as any);
    expect(Object.keys(patch)).toHaveLength(7);
    expect(patch.exchange_immutable_id).toBe('OpaqueCaseSensitive');
    for (const key of ['access_token','title','exchange_item_id','exchange_sync_status','type','client_id']) expect(patch).not.toHaveProperty(key);
  });
  it.each(['EVENT','TASK','REUNION','VISITA'])('does not apply message metadata to %s', type => {
    expect(() => resolvedEmailIdentityPatch(type, identity)).toThrow('EMAIL_IDENTITY_ON_NON_EMAIL');
  });
  it.each(['', ' spaces ', 'line\nbreak'])('rejects an invalid immutable ID %p without logging its value', immutableId => {
    expect(() => resolvedEmailIdentityPatch('EMAIL', { ...identity, immutableId })).toThrow('INVALID_EMAIL_IDENTITY');
  });
  it('does not mark an incomplete draft as resolved', () => {
    expect(() => resolvedEmailIdentityPatch('EMAIL', { ...identity, internetMessageId: '' })).toThrow('INVALID_EMAIL_IDENTITY');
  });
  it('rejects an unknown source format and invalid resolution date', () => {
    expect(() => resolvedEmailIdentityPatch('EMAIL', { ...identity, originalIdType: 'guess' } as any)).toThrow('UNKNOWN_EMAIL_ID_FORMAT');
    expect(() => resolvedEmailIdentityPatch('EMAIL', { ...identity, resolvedAt: new Date('invalid') })).toThrow('INVALID_EMAIL_RESOLUTION_DATE');
  });
  it('permits the same mailbox only after the CRM activity scope has been checked', () => {
    expect(() => assertOwnEmailMailboxAccess('EMAIL', true, identity, identity)).not.toThrow();
    expect(() => assertOwnEmailMailboxAccess('EMAIL', false, identity, identity)).toThrow('EMAIL_ACTIVITY_ACCESS_DENIED');
  });
  it.each([{ tenantId: 'other', mailboxId: 'mailbox-A' }, { tenantId: 'tenant-A', mailboxId: 'other' }, { tenantId: 'tenant-A', mailboxId: 'MAILBOX-A' }])('does not grant access to another mailbox or tenant: %p', other => {
    expect(() => assertOwnEmailMailboxAccess('EMAIL', true, identity, other)).toThrow('EMAIL_MAILBOX_ACCESS_DENIED');
  });
});

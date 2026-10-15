/** Stable email identity contract; maps only verified server-side metadata. */
export type EmailSourceIdType = 'ewsId' | 'restId' | 'restImmutableEntryId' | 'entryId' | 'unknown';
export type EmailResolutionStatus = 'pending' | 'resolved' | 'not_found' | 'ambiguous' | 'access_denied' | 'reconnect_required' | 'temporary_error';
export interface EmailMailboxIdentity { tenantId: string; mailboxId: string }
export interface ResolvedEmailIdentity extends EmailMailboxIdentity {
  immutableId: string;
  internetMessageId: string;
  originalIdType: EmailSourceIdType;
  resolvedAt: Date;
}

export class EmailIdentityContractError extends Error {
  constructor(readonly code: string) { super(code); }
}

function reference(value: string, max: number): string {
  if (typeof value !== 'string' || !value || value.trim() !== value || value.length > max || /[\x00-\x1f]/.test(value)) throw new EmailIdentityContractError('INVALID_EMAIL_IDENTITY');
  return value; // IDs are opaque and case-sensitive; never normalize them.
}

/** Internal mapping only. It cannot copy tokens, bodies, customer fields or user-supplied extra keys. */
export function resolvedEmailIdentityPatch(activityType: string, value: ResolvedEmailIdentity) {
  if (activityType !== 'EMAIL') throw new EmailIdentityContractError('EMAIL_IDENTITY_ON_NON_EMAIL');
  if (!['ewsId','restId','restImmutableEntryId','entryId','unknown'].includes(value.originalIdType)) throw new EmailIdentityContractError('UNKNOWN_EMAIL_ID_FORMAT');
  if (!(value.resolvedAt instanceof Date) || !Number.isFinite(value.resolvedAt.getTime())) throw new EmailIdentityContractError('INVALID_EMAIL_RESOLUTION_DATE');
  return {
    exchange_tenant_id: reference(value.tenantId, 255),
    exchange_mailbox_id: reference(value.mailboxId, 255),
    exchange_immutable_id: reference(value.immutableId, 32768),
    exchange_internet_message_id: reference(value.internetMessageId, 32768),
    exchange_original_id_type: value.originalIdType,
    exchange_resolution_status: 'resolved' as const,
    exchange_resolved_at: value.resolvedAt,
  };
}

/** Initial scope: own connected mailbox. CRM roles do not grant Microsoft mailbox delegation. */
export function assertOwnEmailMailboxAccess(activityType: string, canViewActivity: boolean, actor: EmailMailboxIdentity, message: EmailMailboxIdentity) {
  if (!canViewActivity || activityType !== 'EMAIL') throw new EmailIdentityContractError('EMAIL_ACTIVITY_ACCESS_DENIED');
  for (const value of [actor.tenantId, actor.mailboxId, message.tenantId, message.mailboxId]) reference(value, 255);
  if (actor.tenantId !== message.tenantId || actor.mailboxId !== message.mailboxId) throw new EmailIdentityContractError('EMAIL_MAILBOX_ACCESS_DENIED');
}

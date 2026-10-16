import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { OutlookMessageIdentityClient, OutlookIdentityError, type ExchangeIdFormat } from './outlook-message-identity';
import { resolvedEmailIdentityPatch } from './email-identity-contract';
import { emailIdentityEnabled } from './email-identity-settings';
import { attachmentState, type EmailAttachments } from './email-attachments';

/** Call only after the SAME access token has been accepted by Graph /me. Never trusts browser claims. */
export function tenantFromGraphAcceptedToken(token: string, configuredTenant?: string): string {
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let tenant: unknown;
  try { if (token.split('.').length === 3) tenant = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).tid; } catch { /* Opaque or malformed tokens must not yield a guessed tenant. */ }
  if (typeof tenant !== 'string' || !guid.test(tenant)) throw new OutlookIdentityError('TENANT_NOT_VERIFIED');
  if (configuredTenant && guid.test(configuredTenant) && configuredTenant.toLowerCase() !== tenant.toLowerCase()) throw new OutlookIdentityError('TENANT_MISMATCH');
  return tenant.toLowerCase();
}

export type EmailIdentityPatch = Pick<Prisma.crm_activitiesUncheckedCreateInput, 'exchange_tenant_id' | 'exchange_mailbox_id' | 'exchange_immutable_id' | 'exchange_original_id_type' | 'exchange_internet_message_id' | 'exchange_resolution_status' | 'exchange_resolved_at'>;
export interface PreparedEmailIdentity {
  enabled: boolean;
  patch: EmailIdentityPatch;
  webLink?: string | null;
  isDraft?: boolean;
  attachmentMetadata?: EmailAttachments;
}

@Injectable()
export class EmailIdentityService {
  constructor(private readonly prisma: PrismaService, private readonly graph: MicrosoftGraphService, private readonly config: ConfigService) {}

  async enabledFor(userId: string): Promise<boolean> {
    const profile = await this.prisma.profiles.findUnique({ where: { id: userId }, select: { email: true, is_active: true } });
    return !!profile?.is_active && emailIdentityEnabled(this.config, profile.email);
  }

  async prepare(userId: string, originalId: string, source: ExchangeIdFormat, includeAttachments = false): Promise<PreparedEmailIdentity> {
    const profile = await this.prisma.profiles.findUnique({ where: { id: userId }, select: { email: true, is_active: true } });
    if (!profile?.is_active || !emailIdentityEnabled(this.config, profile.email)) return { enabled: false, patch: {} };
    const base: EmailIdentityPatch = { exchange_original_id_type: source, exchange_resolution_status: 'pending' };
    try {
      const account = await this.prisma.user_exchange_accounts.findUnique({ where: { user_id: userId }, select: { email: true, microsoft_user_id: true } });
      const token = await this.graph.getValidAccessToken(userId);
      if (!account?.microsoft_user_id || !token) return { enabled: true, patch: { ...base, exchange_resolution_status: 'reconnect_required' } };
      const client = new OutlookMessageIdentityClient(token);
      await client.verifyMailbox(account.microsoft_user_id, account.email);
      const tenantId = tenantFromGraphAcceptedToken(token, this.config.get<string>('AZURE_TENANT_ID'));
      const message = await client.readMessage(originalId, source);
      const references = { exchange_tenant_id: tenantId, exchange_mailbox_id: account.microsoft_user_id, exchange_immutable_id: message.immutableId };
      if (!message.internetMessageId || message.isDraft) return { enabled: true, patch: { ...base, ...references }, isDraft: message.isDraft, webLink: message.webLink };
      let attachmentMetadata: EmailAttachments | undefined;
      if (includeAttachments) {
        try { attachmentMetadata = await client.attachmentMetadata(message.immutableId); }
        catch { attachmentMetadata = attachmentState('unavailable', 'graph'); }
      }
      return {
        enabled: true, isDraft: false, webLink: message.webLink,
        ...(attachmentMetadata ? { attachmentMetadata } : {}),
        patch: resolvedEmailIdentityPatch('EMAIL', { tenantId, mailboxId: account.microsoft_user_id, immutableId: message.immutableId,
          internetMessageId: message.internetMessageId, originalIdType: source, resolvedAt: new Date(message.observedAt) }),
      };
    } catch (error) {
      const code = error instanceof OutlookIdentityError ? error.code : 'GRAPH_UNAVAILABLE';
      const status = code === 'ACCOUNT_RECONNECT_REQUIRED' ? 'reconnect_required'
        : ['MAILBOX_ACCESS_DENIED','MAILBOX_MISMATCH','TENANT_MISMATCH'].includes(code) ? 'access_denied'
        : code === 'MESSAGE_NOT_FOUND' ? 'not_found' : 'temporary_error';
      return { enabled: true, patch: { ...base, exchange_resolution_status: status } };
    }
  }
}

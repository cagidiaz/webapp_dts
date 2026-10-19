import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailOpenService, type EmailOpenResult } from './email-open.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { tenantFromGraphAcceptedToken } from './email-identity.service';
import { OutlookAddinAccessService } from './outlook-addin-access.service';
import { checkedOutlookWebLink, OutlookMessageIdentityClient, OutlookIdentityError } from './outlook-message-identity';

export type ReplyMode = 'reply' | 'reply_all';
class ReplyClient extends OutlookMessageIdentityClient {
  async draft(id: string, mode: ReplyMode) {
    const draft = await this.graph(`/me/messages/${encodeURIComponent(id)}/${mode === 'reply_all' ? 'createReplyAll' : 'createReply'}`, {});
    if (typeof draft.id !== 'string' || !draft.id || draft.isDraft !== true) throw new OutlookIdentityError('INVALID_REPLY_DRAFT');
    if (draft.webLink) return checkedOutlookWebLink(draft.webLink);
    const verified = await this.readMessage(draft.id, 'restImmutableEntryId');
    if (!verified.isDraft || !verified.webLink) throw new OutlookIdentityError('INVALID_REPLY_DRAFT');
    return verified.webLink;
  }
}

@Injectable()
export class EmailReplyService {
  private readonly inFlight = new Map<string, Promise<EmailOpenResult>>();
  private readonly recent = new Map<string, { until: number; result: EmailOpenResult }>();
  constructor(private readonly prisma: PrismaService, private readonly emails: EmailOpenService,
    private readonly graph: MicrosoftGraphService, private readonly access: OutlookAddinAccessService,
    private readonly config: ConfigService) {}

  async prepare(userId: string, activityId: string, mode: ReplyMode, candidateId?: string): Promise<EmailOpenResult> {
    await this.access.actor(userId);
    const resolved = await this.emails.resolve(userId, activityId, candidateId);
    if (resolved.status !== 'resolved') return resolved;
    const activity = await this.prisma.crm_activities.findUnique({ where: { id: activityId } });
    if (!activity?.exchange_immutable_id || !activity.exchange_mailbox_id || !activity.exchange_tenant_id || !activity.exchange_internet_message_id) return { status: 'pending', message: 'El correo todavía no tiene una referencia completa para responder.' };
    const key = JSON.stringify([userId, activityId, activity.exchange_mailbox_id, activity.exchange_immutable_id, mode]);
    for (const [entry, value] of this.recent) if (value.until < Date.now()) this.recent.delete(entry);
    const existing = this.inFlight.get(key); if (existing) return existing;
    const cached = this.recent.get(key); if (cached) return cached.result;
    if (this.inFlight.size >= 16 || this.recent.size >= 512) return { status: 'busy', message: 'Hay otras respuestas en preparación. Espera un momento.' };
    const work = this.create(userId, activity, mode).then(result => {
      this.recent.set(key, { until: Date.now() + 180000, result }); return result;
    });
    this.inFlight.set(key, work);
    try { return await work; } finally { this.inFlight.delete(key); }
  }
  private async create(userId: string, activity: any, mode: ReplyMode): Promise<EmailOpenResult> {
    let attempted = false;
    try {
      const account = await this.prisma.user_exchange_accounts.findUnique({ where: { user_id: userId } });
      const token = await this.graph.getValidAccessToken(userId);
      if (!account?.microsoft_user_id || !token || account.microsoft_user_id !== activity.exchange_mailbox_id) throw new OutlookIdentityError('MAILBOX_ACCESS_DENIED');
      const client = new ReplyClient(token);
      await client.verifyMailbox(account.microsoft_user_id, account.email);
      if (tenantFromGraphAcceptedToken(token, this.config.get('AZURE_TENANT_ID')) !== activity.exchange_tenant_id) throw new OutlookIdentityError('TENANT_MISMATCH');
      const original = await client.readMessage(activity.exchange_immutable_id, 'restImmutableEntryId');
      if (original.isDraft || original.internetMessageId !== activity.exchange_internet_message_id) throw new OutlookIdentityError('MESSAGE_ID_MISMATCH');
      const actor = await this.access.actor(userId);
      const current = await this.prisma.crm_activities.findFirst({ where: { id: activity.id, type: 'EMAIL', customer: actor.customerScope } });
      const currentAccount = await this.prisma.user_exchange_accounts.findUnique({ where: { user_id: userId } });
      if (!current || current.exchange_immutable_id !== activity.exchange_immutable_id || current.exchange_mailbox_id !== activity.exchange_mailbox_id
        || current.exchange_tenant_id !== activity.exchange_tenant_id || current.exchange_internet_message_id !== activity.exchange_internet_message_id
        || currentAccount?.microsoft_user_id !== account.microsoft_user_id) throw new OutlookIdentityError('MESSAGE_ID_MISMATCH');
      attempted = true;
      const webLink = await client.draft(original.immutableId, mode);
      return { status: 'resolved', message: mode === 'reply_all' ? 'Respuesta a todos preparada en Outlook. Revisa los destinatarios antes de enviar.' : 'Respuesta preparada en Outlook. Revisa el destinatario antes de enviar.', webLink };
    } catch {
      return { status: 'temporary_error', message: attempted
        ? 'No se pudo confirmar el borrador de respuesta. Revisa Borradores en Outlook antes de repetir; no se reintentará automáticamente.'
        : 'No se pudo verificar el correo para responder. Revisa la cuenta y los permisos de Microsoft 365.' };
    }
  }
}

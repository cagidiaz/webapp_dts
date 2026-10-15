import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { EmailIdentityService, tenantFromGraphAcceptedToken } from './email-identity.service';
import { OutlookAddinAccessService } from './outlook-addin-access.service';
import { OutlookIdentityError, OutlookMessageIdentityClient, type ExchangeIdFormat } from './outlook-message-identity';
import { resolvedEmailIdentityPatch, type EmailResolutionStatus } from './email-identity-contract';

export interface EmailOpenResult {
  status: EmailResolutionStatus | 'disabled' | 'legacy_unverified' | 'busy';
  message: string;
  webLink?: string;
  retryAfterSeconds?: number;
  candidates?: Array<{ id: string; folder: string; sentDate: string | null }>;
  truncated?: boolean;
}

@Injectable()
export class EmailOpenService {
  private readonly inFlight = new Map<string, Promise<EmailOpenResult>>();
  private readonly cooldowns = new Map<string, number>();
  constructor(private readonly prisma: PrismaService, private readonly graph: MicrosoftGraphService, private readonly identities: EmailIdentityService,
    private readonly access: OutlookAddinAccessService, private readonly config: ConfigService) {}

  async resolve(userId: string, activityId: string, selectedId?: string): Promise<EmailOpenResult> {
    const actor = await this.access.actor(userId);
    if (!await this.identities.enabledFor(userId)) return { status: 'disabled', message: 'La apertura verificada no está habilitada para esta cuenta.' };
    const activity = await this.prisma.crm_activities.findFirst({ where: { id: activityId, type: 'EMAIL', customer: actor.customerScope } });
    if (!activity) return { status: 'access_denied', message: 'No tienes acceso a este correo del CRM.' };
    const remaining = (this.cooldowns.get(userId) || 0) - Date.now();
    if (remaining > 0) return { status: 'temporary_error', message: 'Microsoft solicita esperar antes de volver a consultar.', retryAfterSeconds: Math.ceil(remaining / 1000) };
    const key = JSON.stringify([userId, activityId, selectedId || null]);
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    if ([...this.inFlight.keys()].filter(value => JSON.parse(value)[0] === userId).length >= 2) return { status: 'busy', message: 'Hay otras aperturas en curso. Espera un momento.' };
    const work = this.resolveMessage(userId, activity, selectedId).catch((error): EmailOpenResult => {
      const code = error instanceof OutlookIdentityError ? error.code : 'GRAPH_UNAVAILABLE';
      if (error instanceof OutlookIdentityError && error.retryAfterSeconds) {
        if (this.cooldowns.size >= 128) this.cooldowns.delete(this.cooldowns.keys().next().value!);
        this.cooldowns.set(userId, Date.now() + error.retryAfterSeconds * 1000);
        return { status: 'temporary_error', message: 'Microsoft solicita esperar antes de volver a consultar.', retryAfterSeconds: error.retryAfterSeconds };
      }
      if (code === 'ACCOUNT_RECONNECT_REQUIRED') return { status: 'reconnect_required', message: 'Reconecta tu cuenta de Microsoft 365 en los ajustes del CRM.' };
      if (['MAILBOX_ACCESS_DENIED', 'MAILBOX_MISMATCH', 'TENANT_MISMATCH'].includes(code)) return { status: 'access_denied', message: 'La cuenta conectada no tiene acceso al buzón de este correo.' };
      if (code === 'MESSAGE_NOT_FOUND') return { status: 'not_found', message: 'No se ha localizado el correo en tu buzón. Puede haberse eliminado o trasladado a otro buzón.' };
      if (code === 'MESSAGE_ID_MISMATCH') return { status: 'access_denied', message: 'La referencia no corresponde al correo guardado. No se ha abierto otro mensaje.' };
      return { status: 'temporary_error', message: 'No se pudo verificar el correo con Microsoft 365. Vuelve a intentarlo más tarde.' };
    });
    this.inFlight.set(key, work);
    try { return await work; } finally { this.inFlight.delete(key); }
  }

  private async resolveMessage(userId: string, activity: any, selectedId?: string): Promise<EmailOpenResult> {
    const account = await this.prisma.user_exchange_accounts.findUnique({ where: { user_id: userId }, select: { email: true, microsoft_user_id: true } });
    if (!account?.microsoft_user_id) throw new OutlookIdentityError('ACCOUNT_RECONNECT_REQUIRED');
    // An unscoped historic activity may only be recovered by its creator.
    if ((!activity.exchange_mailbox_id || !activity.exchange_tenant_id) && activity.created_by !== userId) throw new OutlookIdentityError('MAILBOX_ACCESS_DENIED');
    if (activity.exchange_mailbox_id && activity.exchange_mailbox_id !== account.microsoft_user_id) throw new OutlookIdentityError('MAILBOX_ACCESS_DENIED');
    const token = await this.graph.getValidAccessToken(userId);
    if (!token) throw new OutlookIdentityError('ACCOUNT_RECONNECT_REQUIRED');
    const client = new OutlookMessageIdentityClient(token);
    await client.verifyMailbox(account.microsoft_user_id, account.email);
    const tenant = tenantFromGraphAcceptedToken(token, this.config.get<string>('AZURE_TENANT_ID'));
    if (activity.exchange_tenant_id && activity.exchange_tenant_id !== tenant) throw new OutlookIdentityError('TENANT_MISMATCH');
    const scoped = activity.exchange_mailbox_id === account.microsoft_user_id && activity.exchange_tenant_id === tenant;
    const knownType = ['ewsId','restId','restImmutableEntryId','entryId'].includes(activity.exchange_original_id_type);
    const source: ExchangeIdFormat = activity.exchange_immutable_id ? 'restImmutableEntryId' : activity.exchange_original_id_type;
    const original = activity.exchange_immutable_id || (knownType ? activity.exchange_item_id : null);
    let message: Awaited<ReturnType<OutlookMessageIdentityClient['readMessage']>> | undefined;
    if (original && !selectedId) {
      try { message = await client.readMessage(original, source); }
      catch (error) { if (!(error instanceof OutlookIdentityError) || error.code !== 'MESSAGE_NOT_FOUND' || !scoped || !activity.exchange_internet_message_id) throw error; }
    }
    if (!message && scoped && activity.exchange_internet_message_id) {
      const matches = await client.findByInternetMessageId(activity.exchange_internet_message_id);
      if (!matches.candidates.length) throw new OutlookIdentityError('MESSAGE_NOT_FOUND');
      const choice = selectedId ? matches.candidates.find(value => value.id === selectedId) : matches.candidates.length === 1 && !matches.truncated ? matches.candidates[0] : null;
      if (!choice) {
        const candidates: NonNullable<EmailOpenResult['candidates']> = [];
        const folders = new Map<string, string>();
        for (const value of matches.candidates) {
          if (!folders.has(value.parentFolderId)) folders.set(value.parentFolderId, await client.folderName(value.parentFolderId));
          candidates.push({ id: value.id, folder: folders.get(value.parentFolderId)!, sentDate: value.sentDate });
        }
        return { status: 'ambiguous', message: 'Hay varias copias del correo. Selecciona la carpeta que deseas abrir.', candidates, truncated: matches.truncated };
      }
      message = await client.readMessage(choice.id, 'restImmutableEntryId');
    }
    if (!message) return { status: 'legacy_unverified', message: 'Este correo antiguo aún no tiene una referencia verificable. Su vinculación debe revisarse; no se buscará por asunto.' };
    if (activity.exchange_internet_message_id && activity.exchange_internet_message_id !== message.internetMessageId) throw new OutlookIdentityError('MESSAGE_ID_MISMATCH');
    if (!message.webLink) throw new OutlookIdentityError('INVALID_OUTLOOK_WEB_LINK');
    const patch = message.internetMessageId && !message.isDraft ? resolvedEmailIdentityPatch('EMAIL', {
      tenantId: tenant, mailboxId: account.microsoft_user_id, immutableId: message.immutableId, internetMessageId: message.internetMessageId,
      originalIdType: activity.exchange_original_id_type || source, resolvedAt: new Date(message.observedAt),
    }) : { exchange_tenant_id: tenant, exchange_mailbox_id: account.microsoft_user_id, exchange_immutable_id: message.immutableId,
      exchange_original_id_type: activity.exchange_original_id_type || source, exchange_resolution_status: 'pending' };
    const saved = await this.prisma.crm_activities.updateMany({
      where: { id: activity.id, type: 'EMAIL', exchange_item_id: activity.exchange_item_id, exchange_immutable_id: activity.exchange_immutable_id,
        exchange_mailbox_id: activity.exchange_mailbox_id, exchange_tenant_id: activity.exchange_tenant_id },
      data: { ...patch, exchange_web_link: message.webLink },
    });
    if (saved.count !== 1) return { status: 'temporary_error', message: 'La referencia cambió durante la comprobación. Vuelve a intentarlo.' };
    return { status: 'resolved', message: message.isDraft ? 'Borrador verificado en Microsoft 365.' : 'Correo verificado en Microsoft 365.', webLink: message.webLink };
  }
}

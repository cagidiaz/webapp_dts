import { BadRequestException, ConflictException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailIdentityService, tenantFromGraphAcceptedToken } from './email-identity.service';
import { EmailOpenService } from './email-open.service';
import { OutlookAddinAccessService } from './outlook-addin-access.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { OutlookMessageIdentityClient, exchangeIdToMapiHex } from './outlook-message-identity';
import { CLASSIC_REPLY_VERSIONS, CLASSIC_VERSION, classicProofText, classicPublicKey, equalClassicSecret, hashClassicSecret, verifyClassicSignature, type ClassicProof } from './classic-proof';

@Injectable()
export class OutlookClassicService {
  private readonly pairRates = new Map<string, { count: number; until: number }>();
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly identities: EmailIdentityService,
    private readonly access: OutlookAddinAccessService, private readonly emails: EmailOpenService, private readonly graph: MicrosoftGraphService) {}
  enabled() { return true; }
  private async actor(userId: string) {
    if (!this.enabled() || !await this.identities.enabledFor(userId)) throw new ForbiddenException('La apertura Classic no está habilitada para esta cuenta.');
    return this.access.actor(userId);
  }
  private async rows(sql: Prisma.Sql): Promise<any[]> {
    try { return await this.prisma.$queryRaw<any[]>(sql); }
    catch { throw new ServiceUnavailableException('No se pudo acceder al almacenamiento de Classic. Comprueba que se ha aplicado el SQL de la fase 4 y los permisos del backend.'); }
  }
  private origin() {
    const value = this.config.get<string>('CRM_OUTLOOK_CLASSIC_ORIGIN') || 'https://app.dtsinstruments.com';
    const url = new URL(value);
    if (url.origin !== 'https://app.dtsinstruments.com' || url.pathname !== '/' || url.search || url.hash) throw new ServiceUnavailableException('Origen de Classic no válido.');
    return url.origin;
  }
  async startPair(body: { n: string; e: string; clientNonce: string; signature: string; label: string }, ip: string) {
    if (!this.enabled()) throw new ForbiddenException('Classic no está habilitado.');
    const rate = this.pairRates.get(ip);
    if (rate && rate.until > Date.now() && rate.count >= 8) throw new ServiceUnavailableException('Espera unos minutos antes de volver a vincular equipos.');
    if (this.pairRates.size >= 128) this.pairRates.delete(this.pairRates.keys().next().value!);
    this.pairRates.set(ip, { count: rate && rate.until > Date.now() ? rate.count + 1 : 1, until: rate && rate.until > Date.now() ? rate.until : Date.now() + 600000 });
    const key = classicPublicKey(body.n, body.e);
    if (!/^[A-Za-z0-9_-]{43}$/.test(body.clientNonce)) throw new BadRequestException('Solicitud de vinculación no válida.');
    verifyClassicSignature(key.pem, ['dts-pair-v1', body.clientNonce, body.n, body.e].join('|'), body.signature);
    const id = randomUUID(), secret = randomBytes(32).toString('base64url'), code = randomBytes(5).toString('hex').toUpperCase();
    await this.rows(Prisma.sql`DELETE FROM public.crm_outlook_devices WHERE user_id IS NULL AND pairing_expires_at < now() RETURNING id`);
    const created = await this.rows(Prisma.sql`INSERT INTO public.crm_outlook_devices(id,label,public_key_pem,public_key_sha256,pairing_secret_hash,pairing_code_hash,pairing_expires_at)
      SELECT ${id}::uuid,${body.label},${key.pem},${key.fingerprint},${hashClassicSecret(secret)},${hashClassicSecret(code)},now()+interval '5 minutes'
      WHERE (SELECT count(*) FROM public.crm_outlook_devices WHERE user_id IS NULL AND pairing_expires_at>now())<32 RETURNING id`);
    if (!created.length) throw new ServiceUnavailableException('Hay demasiadas vinculaciones pendientes. Espera unos minutos.');
    return { pairingId: id, secret, code, approvalUrl: `${this.origin()}/outlook-classic?pair=${id}`, expiresInSeconds: 300 };
  }
  async approvePair(userId: string, id: string, code: string) {
    await this.actor(userId);
    const rows = await this.rows(Prisma.sql`UPDATE public.crm_outlook_devices SET pairing_attempts=pairing_attempts+1
      WHERE id=${id}::uuid AND user_id IS NULL AND revoked_at IS NULL AND pairing_expires_at>now() AND pairing_attempts<5 RETURNING *`);
    const device = rows[0];
    const normalized = code.replace(/-/g, '').trim().toUpperCase();
    if (!device || !equalClassicSecret(normalized, device.pairing_code_hash)) throw new UnauthorizedException('Código incorrecto, caducado o ya utilizado.');
    const linked = await this.rows(Prisma.sql`UPDATE public.crm_outlook_devices SET user_id=${userId}::uuid,paired_at=now()
      WHERE id=${id}::uuid AND user_id IS NULL AND revoked_at IS NULL AND pairing_expires_at>now() RETURNING id,label,public_key_sha256`);
    if (!linked.length) throw new ConflictException('La vinculación ya no está disponible.');
    return { deviceId: linked[0].id, label: linked[0].label, fingerprint: linked[0].public_key_sha256 };
  }
  async pairStatus(id: string, secret: string) {
    if (!this.enabled()) throw new ForbiddenException('Classic no está habilitado.');
    const [device] = await this.rows(Prisma.sql`SELECT id,user_id,paired_at,pairing_expires_at,pairing_secret_hash,revoked_at FROM public.crm_outlook_devices WHERE id=${id}::uuid`);
    if (!device || !equalClassicSecret(secret, device.pairing_secret_hash) || device.revoked_at || new Date(device.pairing_expires_at).getTime() < Date.now()) throw new UnauthorizedException('Vinculación caducada.');
    return { status: device.paired_at ? 'paired' : 'pending', deviceId: device.paired_at ? device.id : undefined };
  }
  async devices(userId: string) {
    await this.access.actor(userId);
    if (!this.enabled() || !await this.identities.enabledFor(userId)) return { enabled: false, devices: [] };
    const devices = await this.rows(Prisma.sql`SELECT id,label,paired_at,last_seen_at,helper_version FROM public.crm_outlook_devices WHERE user_id=${userId}::uuid AND paired_at IS NOT NULL AND revoked_at IS NULL ORDER BY paired_at DESC`);
    return { enabled: true, version: CLASSIC_VERSION, devices };
  }
  async revoke(userId: string, id: string) {
    await this.actor(userId);
    await this.rows(Prisma.sql`UPDATE public.crm_outlook_devices SET revoked_at=now() WHERE id=${id}::uuid AND user_id=${userId}::uuid AND revoked_at IS NULL RETURNING id`);
    return { success: true };
  }
  async create(userId: string, activityId: string, deviceId: string, candidateId?: string, action: 'open' | 'reply' | 'reply_all' = 'open') {
    await this.actor(userId);
    if (!['open','reply','reply_all'].includes(action)) throw new BadRequestException('Acción no permitida.');
    const [device] = await this.rows(Prisma.sql`SELECT id,helper_version FROM public.crm_outlook_devices WHERE id=${deviceId}::uuid AND user_id=${userId}::uuid AND paired_at IS NOT NULL AND revoked_at IS NULL`);
    if (!device) return { status: 'device_required', message: 'Vincula este equipo con tu cuenta del CRM para abrir correos en Classic.' };
    if (action !== 'open' && !CLASSIC_REPLY_VERSIONS.includes(device.helper_version || '')) return { status: 'device_required', message: 'Actualiza el componente de Classic a 1.1.0 y abre primero un correo para registrar su versión. Después podrás responder desde el CRM.' };
    const resolution = await this.emails.resolve(userId, activityId, candidateId);
    if (resolution.status !== 'resolved') return resolution;
    const activity = await this.prisma.crm_activities.findUnique({ where: { id: activityId } });
    if (!activity?.exchange_immutable_id || !activity.exchange_internet_message_id || !activity.exchange_tenant_id || !activity.exchange_mailbox_id) return { status: 'pending', message: 'La referencia del correo aún no está completa. Puedes abrirlo en Outlook Web.' };
    const id = randomUUID(), token = randomBytes(32).toString('base64url');
    await this.rows(Prisma.sql`DELETE FROM public.crm_outlook_requests WHERE expires_at<now()-interval '7 days' RETURNING id`);
    const actionColumn = action === 'open' ? Prisma.empty : Prisma.sql`,action`;
    const actionValue = action === 'open' ? Prisma.empty : Prisma.sql`,${action}`;
    const issued = await this.rows(Prisma.sql`INSERT INTO public.crm_outlook_requests(id,user_id,device_id,activity_id,token_hash,tenant_id,mailbox_id,immutable_id,internet_message_id,expires_at${actionColumn})
      SELECT ${id}::uuid,${userId}::uuid,${deviceId}::uuid,${activityId}::uuid,${hashClassicSecret(token)},${activity.exchange_tenant_id},${activity.exchange_mailbox_id},${activity.exchange_immutable_id},${activity.exchange_internet_message_id},now()+interval '90 seconds'${actionValue}
      WHERE (SELECT count(*) FROM public.crm_outlook_requests WHERE user_id=${userId}::uuid AND created_at>now()-interval '1 minute')<12 RETURNING id`);
    if (!issued.length) return { status: 'busy', message: 'Hay varias aperturas recientes. Espera un minuto antes de repetir.' };
    return { status: 'ready', requestId: id, protocolUri: `dts-outlook://v1/open?request=${id}&token=${token}`, expiresInSeconds: 90 };
  }
  private async signedRequest(id: string, proof: ClassicProof, action: 'claim' | 'result', outcome = '', claimNonce = '') {
    if (!this.enabled()) throw new ForbiddenException('Classic no está habilitado.');
    const canonical = classicProofText(action, id, proof, outcome, claimNonce);
    const [row] = await this.rows(Prisma.sql`SELECT r.*,d.public_key_pem,d.revoked_at,d.user_id AS device_user FROM public.crm_outlook_requests r JOIN public.crm_outlook_devices d ON d.id=r.device_id WHERE r.id=${id}::uuid AND d.id=${proof.deviceId}::uuid`);
    if (!row || row.revoked_at || row.device_user !== row.user_id || !equalClassicSecret(proof.token, row.token_hash)) throw new UnauthorizedException('Solicitud de apertura no válida.');
    verifyClassicSignature(row.public_key_pem, canonical, proof.signature);
    await this.actor(row.user_id);
    return row;
  }
  async claim(id: string, proof: ClassicProof) {
    const row = await this.signedRequest(id, proof, 'claim');
    if (!['open','reply','reply_all'].includes(row.action || 'open')) throw new ConflictException('Acción no válida.');
    if (row.action && row.action !== 'open' && (!CLASSIC_REPLY_VERSIONS.includes(proof.version))) throw new ConflictException('Actualiza el componente de Outlook Classic para responder.');
    const claimed = await this.rows(Prisma.sql`UPDATE public.crm_outlook_requests SET state='claiming',claimed_at=now(),helper_version=${proof.version}
      WHERE id=${id}::uuid AND state='pending' AND expires_at>now() AND EXISTS (SELECT 1 FROM public.crm_outlook_devices d WHERE d.id=device_id AND d.revoked_at IS NULL) RETURNING id`);
    if (!claimed.length) throw new ConflictException('La solicitud ya fue utilizada o ha caducado.');
    try {
      const resolved = await this.emails.resolve(row.user_id, row.activity_id);
      if (resolved.status !== 'resolved') throw new Error('RESOLUTION_FAILED');
      const activity = await this.prisma.crm_activities.findUnique({ where: { id: row.activity_id } });
      if (!activity || activity.exchange_immutable_id !== row.immutable_id || activity.exchange_internet_message_id !== row.internet_message_id || activity.exchange_mailbox_id !== row.mailbox_id || activity.exchange_tenant_id !== row.tenant_id) throw new Error('IDENTITY_CHANGED');
      const account = await this.prisma.user_exchange_accounts.findUnique({ where: { user_id: row.user_id } });
      const token = await this.graph.getValidAccessToken(row.user_id);
      if (!token || !account || account.microsoft_user_id !== row.mailbox_id) throw new Error('MAILBOX_CHANGED');
      const client = new OutlookMessageIdentityClient(token);
      await client.verifyMailbox(row.mailbox_id, account.email);
      if (tenantFromGraphAcceptedToken(token, this.config.get('AZURE_TENANT_ID')) !== row.tenant_id) throw new Error('TENANT_CHANGED');
      const entryId = exchangeIdToMapiHex(await client.translate(row.immutable_id, 'restImmutableEntryId', 'entryId'));
      const claimNonce = randomBytes(32).toString('base64url');
      const ready = await this.rows(Prisma.sql`UPDATE public.crm_outlook_requests SET state='claimed',claim_nonce_hash=${hashClassicSecret(claimNonce)} WHERE id=${id}::uuid AND state='claiming' AND expires_at>now() AND EXISTS (SELECT 1 FROM public.crm_outlook_devices d WHERE d.id=device_id AND d.revoked_at IS NULL) RETURNING id`);
      if (!ready.length) throw new Error('EXPIRED');
      await this.rows(Prisma.sql`UPDATE public.crm_outlook_devices SET last_seen_at=now(),helper_version=${proof.version} WHERE id=${proof.deviceId}::uuid AND revoked_at IS NULL RETURNING id`);
      return { action: row.action || 'open', entryId, mailboxEmail: account.email, internetMessageId: row.internet_message_id, claimNonce, expiresAt: new Date(row.expires_at).toISOString() };
    } catch {
      await this.rows(Prisma.sql`UPDATE public.crm_outlook_requests SET state='failed',completed_at=now(),outcome='resolution_failed' WHERE id=${id}::uuid AND state IN ('claiming','claimed') RETURNING id`);
      throw new ConflictException('No se pudo verificar el correo para Classic. La solicitud se ha cerrado; puedes utilizar Outlook Web.');
    }
  }
  async result(id: string, proof: ClassicProof, outcome: string, claimNonce: string) {
    const allowed = ['opened','not_found','mailbox_not_available','identity_mismatch','classic_not_available','error'];
    if (!allowed.includes(outcome)) throw new BadRequestException('Resultado no permitido.');
    const row = await this.signedRequest(id, proof, 'result', outcome, claimNonce);
    if (!row.claim_nonce_hash || !equalClassicSecret(claimNonce, row.claim_nonce_hash)) throw new UnauthorizedException('Confirmación de apertura no válida.');
    const finished = await this.rows(Prisma.sql`UPDATE public.crm_outlook_requests SET state=${outcome === 'opened' ? 'opened' : 'failed'},outcome=${outcome},completed_at=now()
      WHERE id=${id}::uuid AND state='claimed' AND completed_at IS NULL AND expires_at>now()-interval '2 minutes' RETURNING id`);
    if (!finished.length) throw new ConflictException('La confirmación ya fue utilizada o ha caducado.');
    return { success: true };
  }
  async status(userId: string, id: string) {
    await this.actor(userId);
    const [row] = await this.rows(Prisma.sql`SELECT state,outcome,expires_at FROM public.crm_outlook_requests WHERE id=${id}::uuid AND user_id=${userId}::uuid`);
    if (!row) throw new ForbiddenException('Solicitud no disponible.');
    return { state: ['opened','failed'].includes(row.state) ? row.state : new Date(row.expires_at).getTime() < Date.now() ? 'expired' : row.state, outcome: row.outcome };
  }
}

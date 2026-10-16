import { normalizeAttachments, type EmailAttachments } from './email-attachments';
/** Exact Graph identity client. No subject search, mailbox writes or application routes. */
export type ExchangeIdFormat = 'ewsId' | 'restId' | 'restImmutableEntryId' | 'entryId';

export class OutlookIdentityError extends Error {
  constructor(readonly code: string, readonly httpStatus?: number, readonly retryAfterSeconds?: number) { super(code); }
}

export function mapiHexToExchangeId(hex: string): string {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex) || hex.length > 32768) throw new OutlookIdentityError('INVALID_MAPI_ENTRY_ID');
  const encoded = Buffer.from(hex, 'hex').toString('base64');
  const padding = encoded.length - encoded.replace(/=+$/, '').length;
  return encoded.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_') + padding;
}

/** Graph entryId uses Exchange's padding-count encoding, not ordinary base64url. */
export function exchangeIdToMapiHex(value: string): string {
  if (!/^[A-Za-z0-9_-]+[012]$/.test(value) || value.length > 32768) throw new OutlookIdentityError('INVALID_EXCHANGE_ENTRY_ID');
  const base64 = value.slice(0, -1).replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(Number(value.at(-1)));
  const hex = Buffer.from(base64, 'base64').toString('hex').toUpperCase();
  if (!hex || mapiHexToExchangeId(hex) !== value) throw new OutlookIdentityError('INVALID_EXCHANGE_ENTRY_ID');
  return hex;
}

function id(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 32768 || /[\s\x00-\x1f]/.test(value)) throw new OutlookIdentityError('INVALID_MESSAGE_ID');
  return value;
}

export function checkedOutlookWebLink(value: unknown): string {
  try {
    const url = new URL(String(value));
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port
      && ['outlook.office.com', 'outlook.office365.com', 'outlook.cloud.microsoft'].includes(url.hostname)) return url.href;
  } catch { /* Reject URLs outside the Outlook hosts, including missing links. */ }
  throw new OutlookIdentityError('INVALID_OUTLOOK_WEB_LINK');
}

/** Only GET and the non-mutating translateExchangeIds action are exposed. */
export class OutlookMessageIdentityClient {
  constructor(private readonly accessToken: string, private readonly request: typeof fetch = fetch) {}

  protected async graph(path: string, body?: unknown): Promise<any> {
    let response: Response;
    try {
      response = await this.request(`https://graph.microsoft.com/v1.0${path}`, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${this.accessToken}`, Prefer: 'IdType="ImmutableId"',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch { throw new OutlookIdentityError('GRAPH_UNAVAILABLE'); }
    if (!response.ok) {
      const code = ({ 401: 'ACCOUNT_RECONNECT_REQUIRED', 403: 'MAILBOX_ACCESS_DENIED', 404: 'MESSAGE_NOT_FOUND', 429: 'GRAPH_RATE_LIMITED' } as Record<number, string>)[response.status] || 'GRAPH_REQUEST_FAILED';
      const retry = response.headers.get('Retry-After');
      const seconds = retry ? (/^\d+$/.test(retry) ? Number(retry) : Math.ceil((Date.parse(retry) - Date.now()) / 1000)) : NaN;
      throw new OutlookIdentityError(code, response.status, response.status === 429 || response.status === 503 ? (Number.isFinite(seconds) && seconds > 0 ? seconds : 15) : undefined);
    }
    try { return await response.json(); } catch { throw new OutlookIdentityError('INVALID_GRAPH_RESPONSE'); }
  }

  async verifyMailbox(expectedId: string, expectedEmail: string) {
    const account = await this.graph('/me?$select=id,mail,userPrincipalName');
    if (account.id !== expectedId || ![account.mail, account.userPrincipalName].some(value =>
      typeof value === 'string' && value.toLowerCase() === expectedEmail.toLowerCase())) throw new OutlookIdentityError('MAILBOX_MISMATCH');
    return { id: account.id as string, email: expectedEmail };
  }

  async translate(input: string, source: ExchangeIdFormat, target: ExchangeIdFormat): Promise<string> {
    id(input);
    if (!['ewsId', 'restId', 'restImmutableEntryId', 'entryId'].includes(source)
      || !['ewsId', 'restId', 'restImmutableEntryId', 'entryId'].includes(target)) throw new OutlookIdentityError('UNKNOWN_ID_FORMAT');
    if (source === target) return input;
    const result = await this.graph('/me/translateExchangeIds', { inputIds: [input], sourceIdType: source, targetIdType: target });
    if (!Array.isArray(result.value) || result.value.length !== 1 || result.value[0]?.sourceId !== input) throw new OutlookIdentityError('ID_TRANSLATION_FAILED');
    return id(result.value[0].targetId);
  }

  async readMessage(input: string, source: ExchangeIdFormat) {
    const immutableId = await this.translate(input, source, 'restImmutableEntryId');
    const message = await this.graph(`/me/messages/${encodeURIComponent(immutableId)}?$select=id,parentFolderId,internetMessageId,webLink,isDraft`);
    if (typeof message.isDraft !== 'boolean') throw new OutlookIdentityError('INVALID_GRAPH_RESPONSE');
    if (message.id !== immutableId) throw new OutlookIdentityError('MESSAGE_ID_MISMATCH');
    const internetMessageId = typeof message.internetMessageId === 'string' && message.internetMessageId && !/[\r\n\x00]/.test(message.internetMessageId) ? message.internetMessageId : null;
    return {
      immutableId, internetMessageId, isDraft: message.isDraft === true,
      parentFolderId: id(message.parentFolderId), webLink: message.webLink ? checkedOutlookWebLink(message.webLink) : null,
      observedAt: new Date().toISOString(),
    };
  }

  async attachmentMetadata(immutableId: string): Promise<EmailAttachments> {
    const resource = `/me/messages/${encodeURIComponent(id(immutableId))}/attachments`;
    let path = `${resource}?$select=name,size,isInline&$top=100`;
    const files: { name: string; size?: number }[] = [];
    let complete = false;
    for (let page = 0; page < 4; page++) {
      const result = await this.graph(path);
      if (!Array.isArray(result.value)) throw new OutlookIdentityError('INVALID_GRAPH_RESPONSE');
      for (const attachment of result.value) {
        if (attachment?.isInline === true) continue;
        files.push({ name: attachment?.name, size: attachment?.size });
      }
      const next = result['@odata.nextLink'];
      if (!next) { complete = true; break; }
      if (files.length >= 100) break;
      const url = new URL(next);
      if (url.origin !== 'https://graph.microsoft.com' || url.username || url.password
        || url.pathname !== `/v1.0${resource}` || url.hash || url.searchParams.get('$select') !== 'name,size,isInline'
        || [...url.searchParams.keys()].some(key => !['$select', '$top', '$skip', '$skiptoken'].includes(key) || url.searchParams.getAll(key).length !== 1)
        || (url.searchParams.has('$top') && (!/^\d+$/.test(url.searchParams.get('$top')!) || Number(url.searchParams.get('$top')) < 1 || Number(url.searchParams.get('$top')) > 100))) {
        throw new OutlookIdentityError('INVALID_GRAPH_RESPONSE');
      }
      path = resource + url.search;
    }
    return normalizeAttachments({ version: 1, status: complete ? 'complete' : 'partial', files,
      totalKnown: complete ? files.length : null }, 'graph');
  }

  async findByInternetMessageId(internetMessageId: string) {
    if (!internetMessageId || internetMessageId.length > 32768 || /[\r\n\x00]/.test(internetMessageId)) throw new OutlookIdentityError('INVALID_INTERNET_MESSAGE_ID');
    const filter = `internetMessageId eq '${internetMessageId.replace(/'/g, "''")}'`;
    const result = await this.graph(`/me/messages?$filter=${encodeURIComponent(filter)}&$select=id,internetMessageId,parentFolderId,sentDateTime&$top=6`);
    if (!Array.isArray(result.value)) throw new OutlookIdentityError('INVALID_GRAPH_RESPONSE');
    const values: Array<Record<string, unknown>> = result.value;
    if (values.some(value => !value || value.internetMessageId !== internetMessageId)) throw new OutlookIdentityError('MESSAGE_ID_MISMATCH');
    return { candidates: values.slice(0, 5).map(value => ({ id: id(value.id), parentFolderId: id(value.parentFolderId), sentDate: typeof value.sentDateTime === 'string' ? value.sentDateTime : null })), truncated: !!result['@odata.nextLink'] || values.length > 5 };
  }

  async folderName(folderId: string): Promise<string> {
    const folder = await this.graph(`/me/mailFolders/${encodeURIComponent(id(folderId))}?$select=displayName`);
    return typeof folder.displayName === 'string' ? folder.displayName : 'Carpeta sin nombre';
  }
}

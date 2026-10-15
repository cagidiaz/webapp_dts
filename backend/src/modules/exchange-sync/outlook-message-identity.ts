/** Exact Graph identity client. No subject search, mailbox writes or application routes. */
export type ExchangeIdFormat = 'ewsId' | 'restId' | 'restImmutableEntryId' | 'entryId';

export class OutlookIdentityError extends Error {
  constructor(readonly code: string, readonly httpStatus?: number) { super(code); }
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
      throw new OutlookIdentityError(code, response.status);
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
}

/** Phase 0 diagnostic wrapper; not registered as an application endpoint. */
import { OutlookMessageIdentityClient, OutlookIdentityError, exchangeIdToMapiHex, type ExchangeIdFormat } from './outlook-message-identity';
export { checkedOutlookWebLink, exchangeIdToMapiHex, mapiHexToExchangeId, OutlookIdentityError as OutlookProbeError } from './outlook-message-identity';
function checkedReference(value: unknown): string {
  if (typeof value !== 'string' || !value || /[\s\x00-\x1f]/.test(value)) throw new OutlookIdentityError('INVALID_MESSAGE_ID');
  return value;
}
export class OutlookIdentityProbe extends OutlookMessageIdentityClient {
  async recentReference(): Promise<string> {
    const result = await this.graph('/me/messages?$top=1&$select=id&$orderby=receivedDateTime%20desc');
    if (!Array.isArray(result.value) || result.value.length !== 1) throw new OutlookIdentityError('NO_TEST_MESSAGE');
    return checkedReference(result.value[0].id);
  }

  /** Select a challenge pair for the diagnostic only; subject never resolves an open request. */
  async duplicateSubjectReferences(): Promise<string[]> {
    const result = await this.graph('/me/messages?$top=50&$select=id,subject,internetMessageId&$orderby=receivedDateTime%20desc');
    if (!Array.isArray(result.value)) throw new OutlookIdentityError('INVALID_GRAPH_RESPONSE');
    const subjects = new Map<string, { id: string; internetMessageId: string }>();
    for (const message of result.value) {
      if (typeof message.subject !== 'string' || !message.subject.trim() || typeof message.internetMessageId !== 'string' || !message.internetMessageId) continue;
      const previous = subjects.get(message.subject);
      const reference = checkedReference(message.id);
      if (previous && previous.id !== reference && previous.internetMessageId !== message.internetMessageId) return [previous.id, reference];
      subjects.set(message.subject, { id: reference, internetMessageId: message.internetMessageId });
    }
    return [];
  }

  async resolve(input: string, source: ExchangeIdFormat) {
    const message = await this.readMessage(input, source);
    if (!message.internetMessageId) throw new OutlookIdentityError('MISSING_INTERNET_MESSAGE_ID');
    if (!message.webLink) throw new OutlookIdentityError('INVALID_OUTLOOK_WEB_LINK');
    const entryId = await this.translate(message.immutableId, 'restImmutableEntryId', 'entryId');
    return { ...message, mapiEntryId: exchangeIdToMapiHex(entryId) };
  }
}

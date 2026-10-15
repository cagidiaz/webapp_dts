import { checkedOutlookWebLink, exchangeIdToMapiHex, mapiHexToExchangeId, OutlookIdentityProbe } from './outlook-identity-probe';

describe('Outlook phase 0 exact identity probe', () => {
  it.each([['00', 'AA2'], ['0000', 'AAA1'], ['000000', 'AAAA0'], ['FBFFFF', '-___0']])('converts binary %s using Exchange padding counts', (hex, encoded) => {
    expect(mapiHexToExchangeId(hex)).toBe(encoded);
    expect(exchangeIdToMapiHex(encoded)).toBe(hex);
  });
  it.each(['', 'AA==', 'AA0', 'AB2', 'A3', 'https://host', 'AA2\n'])('rejects malformed or noncanonical binary ID %p', value => {
    expect(() => exchangeIdToMapiHex(value)).toThrow('INVALID_EXCHANGE_ENTRY_ID');
  });
  it.each(['F', 'GG', '', '00 01'])('rejects malformed MAPI hex %p', value => {
    expect(() => mapiHexToExchangeId(value)).toThrow('INVALID_MAPI_ENTRY_ID');
  });
  it.each(['http://outlook.office.com/mail', 'https://outlook.office.com.evil.invalid/mail', 'https://evil.invalid', 'https://user@outlook.office.com/mail', 'javascript:alert(1)'])('rejects unsafe web target %s', link => {
    expect(() => checkedOutlookWebLink(link)).toThrow('INVALID_OUTLOOK_WEB_LINK');
  });

  const message = { isDraft: false, id: 'ImmutableCaseSensitive', parentFolderId: 'folder1', internetMessageId: '<exact@example.invalid>', webLink: 'https://outlook.office.com/mail/item/id' };
  function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status }); }
  function setup() {
    const request = jest.fn()
      .mockResolvedValueOnce(response({ value: [{ sourceId: 'ews-original', targetId: message.id }] }))
      .mockResolvedValueOnce(response(message))
      .mockResolvedValueOnce(response({ value: [{ sourceId: message.id, targetId: 'AA2' }] }));
    return { request, probe: new OutlookIdentityProbe('never-log-token', request as typeof fetch) };
  }
  it('resolves EWS to immutable and current MAPI without searching by subject', async () => {
    const { request, probe } = setup();
    expect(await probe.resolve('ews-original', 'ewsId')).toMatchObject({ immutableId: message.id, mapiEntryId: '00', internetMessageId: message.internetMessageId });
    expect(request).toHaveBeenCalledTimes(3);
    for (const [url, options] of request.mock.calls) {
      expect(options.headers.Prefer).toBe('IdType="ImmutableId"');
      expect(options.redirect).toBe('error');
      expect(url).not.toContain('subject');
      expect(['GET', 'POST']).toContain(options.method);
      if (options.method === 'POST') expect(url).toBe('https://graph.microsoft.com/v1.0/me/translateExchangeIds');
    }
  });
  it('rejects a response for a different source ID', async () => {
    const request = jest.fn().mockResolvedValue(response({ value: [{ sourceId: 'different', targetId: message.id }] }));
    await expect(new OutlookIdentityProbe('token', request).resolve('ews-original', 'ewsId')).rejects.toThrow('ID_TRANSLATION_FAILED');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('rejects even case-only differences in the immutable ID', async () => {
    const { request, probe } = setup();
    request.mockReset().mockResolvedValue(response({ ...message, id: message.id.toLowerCase() }));
    await expect(probe.resolve(message.id, 'restImmutableEntryId')).rejects.toThrow('MESSAGE_ID_MISMATCH');
  });
  it.each([[401, 'ACCOUNT_RECONNECT_REQUIRED'], [403, 'MAILBOX_ACCESS_DENIED'], [404, 'MESSAGE_NOT_FOUND'], [429, 'GRAPH_RATE_LIMITED']])('distinguishes HTTP %s without falling back to another message', async (status, code) => {
    const request = jest.fn().mockResolvedValue(response({ error: 'not exposed' }, Number(status)));
    await expect(new OutlookIdentityProbe('token', request).resolve(message.id, 'restImmutableEntryId')).rejects.toThrow(String(code));
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('rejects the wrong Microsoft mailbox before selecting any messages', async () => {
    const request = jest.fn().mockResolvedValue(response({ id: 'wrong', mail: 'wrong@example.invalid' }));
    await expect(new OutlookIdentityProbe('token', request).verifyMailbox('expected', 'tester@example.invalid')).rejects.toThrow('MAILBOX_MISMATCH');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('does not mistake a network failure for a deleted message', async () => {
    const request = jest.fn().mockRejectedValue(new Error('contains private details'));
    await expect(new OutlookIdentityProbe('token', request).resolve(message.id, 'restImmutableEntryId')).rejects.toThrow('GRAPH_UNAVAILABLE');
  });
  it('does not create an exact-open reference without internetMessageId', async () => {
    const request = jest.fn().mockResolvedValue(response({ ...message, internetMessageId: null }));
    await expect(new OutlookIdentityProbe('token', request).resolve(message.id, 'restImmutableEntryId')).rejects.toThrow('MISSING_INTERNET_MESSAGE_ID');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('accepts the verified Microsoft mailbox and Outlook HTTPS target', async () => {
    const request = jest.fn().mockResolvedValue(response({ id: 'expected', mail: 'TESTER@example.invalid' }));
    await expect(new OutlookIdentityProbe('token', request).verifyMailbox('expected', 'tester@example.invalid')).resolves.toEqual({ id: 'expected', email: 'tester@example.invalid' });
    expect(checkedOutlookWebLink(message.webLink)).toBe(message.webLink);
  });
  it('rejects an untyped source ID rather than guessing its format', async () => {
    const request = jest.fn();
    await expect(new OutlookIdentityProbe('token', request).resolve(message.id, 'unknown' as any)).rejects.toThrow('UNKNOWN_ID_FORMAT');
    expect(request).not.toHaveBeenCalled();
  });
  it('selects different messages with the same subject only to construct a challenge pair', async () => {
    const request = jest.fn().mockResolvedValue(response({ value: [
      { id: 'one', subject: 'Repeated', internetMessageId: '<one@test>' },
      { id: 'copy', subject: 'Repeated', internetMessageId: '<one@test>' },
      { id: 'two', subject: 'Repeated', internetMessageId: '<two@test>' },
    ] }));
    expect(await new OutlookIdentityProbe('token', request).duplicateSubjectReferences()).toEqual(['copy', 'two']);
  });
  it('does not invent a repeated-subject test if no suitable pair exists', async () => {
    const request = jest.fn().mockResolvedValue(response({ value: [{ id: 'one', subject: 'Unique', internetMessageId: '<one@test>' }] }));
    expect(await new OutlookIdentityProbe('token', request).duplicateSubjectReferences()).toEqual([]);
  });
  it('an internal folder move preserves the selected message while resolving its new MAPI ID', async () => {
    const request = jest.fn()
      .mockResolvedValueOnce(response(message))
      .mockResolvedValueOnce(response({ value: [{ sourceId: message.id, targetId: 'AA2' }] }))
      .mockResolvedValueOnce(response({ ...message, parentFolderId: 'folder2' }))
      .mockResolvedValueOnce(response({ value: [{ sourceId: message.id, targetId: 'AQ2' }] }));
    const probe = new OutlookIdentityProbe('token', request);
    const first = await probe.resolve(message.id, 'restImmutableEntryId');
    const moved = await probe.resolve(first.immutableId, 'restImmutableEntryId');
    expect(moved.immutableId).toBe(first.immutableId);
    expect(moved.internetMessageId).toBe(first.internetMessageId);
    expect(moved.parentFolderId).not.toBe(first.parentFolderId);
    expect(moved.mapiEntryId).toBe('01');
  });
});

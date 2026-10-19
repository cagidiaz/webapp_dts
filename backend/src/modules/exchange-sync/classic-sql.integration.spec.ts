import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { OutlookClassicService } from './outlook-classic.service';
import { classicProofText, type ClassicProof } from './classic-proof';

const sqlSuite = process.env.DTS_CLASSIC_SQL_TEST === '1' ? describe : describe.skip;
sqlSuite('Classic lifecycle with real isolated PostgreSQL', () => {
  let pool: Pool;
  let service: OutlookClassicService;
  let originalFetch: typeof fetch;
  const owner = randomUUID(), other = randomUUID(), activityId = randomUUID(), tenant = randomUUID();
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = keys.publicKey.export({ format: 'jwk' });
  const account = { email: 'tester@test.invalid', microsoft_user_id: 'mailbox' };
  let activity: any, db: any, access: any, emails: any;
  let pairing: any;
  const nonce = () => randomBytes(32).toString('base64url');
  function proof(id: string, token: string, action: 'claim' | 'result' = 'claim', outcome = '', claimNonce = '', version = '1.0.0'): ClassicProof {
    const value: ClassicProof = { deviceId: pairing.pairingId, token, timestamp: String(Date.now()), nonce: nonce(), version, signature: '' };
    value.signature = sign('RSA-SHA256', Buffer.from(classicProofText(action, id, value, outcome, claimNonce)), keys.privateKey).toString('base64url');
    return value;
  }
  async function createRequest() { return await service.create(owner, activityId, pairing.pairingId) as any; }
  function ticketToken(request: any) { return new URL(request.protocolUri).searchParams.get('token')!; }
  beforeAll(async () => {
    const url = process.env.DTS_CLASSIC_SQL_URL || '';
    if (!/^postgresql:\/\/classic_review@127\.0\.0\.1:55439\/classic_review$/.test(url)) throw new Error('Only the isolated Classic database may be used');
    pool = new Pool({ connectionString: url }); pool.on('error', () => {});
    await pool.query('CREATE TABLE public.profiles(id uuid PRIMARY KEY); CREATE TABLE public.crm_activities(id uuid PRIMARY KEY);');
    const sql = readFileSync(resolve(__dirname, '../../../prisma/proposals/2026-10-15-outlook-classic-dispositivos-solicitudes.sql'), 'utf8');
    await pool.query(sql); await pool.query(sql);
    const replySql=readFileSync(resolve(__dirname, '../../../prisma/proposals/2026-10-16-outlook-respuestas-verificadas.sql'),'utf8');
    await pool.query(replySql);await pool.query(replySql);
    await pool.query('INSERT INTO profiles(id) VALUES($1),($2)', [owner, other]);
    await pool.query('INSERT INTO crm_activities(id) VALUES($1)', [activityId]);
    await pool.query('CREATE ROLE classic_untrusted NOLOGIN');
  });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => {
    await pool.query('TRUNCATE crm_outlook_requests,crm_outlook_devices');
    activity = { id: activityId, exchange_immutable_id: 'ExactCase', exchange_internet_message_id: '<one@test>', exchange_tenant_id: tenant, exchange_mailbox_id: 'mailbox' };
    db = { $queryRaw: async (sql: any) => (await pool.query(sql.text, sql.values)).rows,
      crm_activities: { findUnique: jest.fn(async () => activity) }, user_exchange_accounts: { findUnique: jest.fn().mockResolvedValue(account) } };
    access = { actor: jest.fn().mockResolvedValue({ customerScope: {} }) };
    emails = { resolve: jest.fn().mockResolvedValue({ status: 'resolved' }) };
    service = new OutlookClassicService(db, new ConfigService({ AZURE_TENANT_ID: tenant }), { enabledFor: jest.fn().mockResolvedValue(true) } as any, access, emails,
      { getValidAccessToken: jest.fn().mockResolvedValue(`x.${Buffer.from(JSON.stringify({ tid: tenant })).toString('base64url')}.x`) } as any);
    originalFetch = global.fetch;
    global.fetch = jest.fn(async (url: string | URL | Request) => new Response(JSON.stringify(String(url).includes('translateExchangeIds')
      ? { value: [{ sourceId: 'ExactCase', targetId: 'AA2' }] } : { id: 'mailbox', mail: account.email }))) as any;
    const clientNonce = nonce();
    pairing = await service.startPair({ n: jwk.n!, e: jwk.e!, clientNonce, label: 'TEST-PC', signature: sign('RSA-SHA256', Buffer.from(['dts-pair-v1', clientNonce, jwk.n!, jwk.e!].join('|')), keys.privateKey).toString('base64url') }, 'test');
    await service.approvePair(owner, pairing.pairingId, pairing.code);
  });
  afterEach(() => { global.fetch = originalFetch; });
  it('applies idempotent SQL and prevents direct client access through RLS', async () => {
    const result = await pool.query("SELECT relrowsecurity FROM pg_class WHERE relname IN ('crm_outlook_devices','crm_outlook_requests')");
    expect(result.rows).toHaveLength(2); expect(result.rows.every(value => value.relrowsecurity)).toBe(true);
    const client = await pool.connect();
    try {
      await client.query('SET ROLE classic_untrusted');
      await expect(client.query('SELECT * FROM crm_outlook_devices')).rejects.toThrow('permission denied');
      await expect(client.query('SELECT * FROM crm_outlook_requests')).rejects.toThrow('permission denied');
    } finally { await client.query('RESET ROLE'); client.release(); }
  });
  it('pairs only once and stores no plaintext pairing secrets', async () => {
    expect((await service.pairStatus(pairing.pairingId, pairing.secret)).status).toBe('paired');
    await expect(service.approvePair(other, pairing.pairingId, pairing.code)).rejects.toThrow();
    const row = (await pool.query('SELECT * FROM crm_outlook_devices')).rows[0];
    expect(row.pairing_secret_hash).not.toBe(pairing.secret); expect(row.pairing_code_hash).not.toBe(pairing.code); expect(row.user_id).toBe(owner);
  });
  it('binds requests to the selected device owner and does not put Graph tokens or message IDs in the URI', async () => {
    expect((await service.create(other, activityId, pairing.pairingId)).status).toBe('device_required');
    const request = await createRequest(); expect(request.status).toBe('ready');
    expect(request.protocolUri).not.toContain('ExactCase'); expect(request.protocolUri).not.toContain(account.email); expect(request.protocolUri).not.toContain('subject');
    await expect(service.status(other, request.requestId)).rejects.toThrow();
  });
  it('atomically consumes one request under simultaneous signed claims', async () => {
    const request = await createRequest(), token = ticketToken(request);
    const results = await Promise.allSettled([service.claim(request.requestId, proof(request.requestId, token)), service.claim(request.requestId, proof(request.requestId, token))]);
    expect(results.filter(value => value.status === 'fulfilled')).toHaveLength(1);
    expect((await service.status(owner, request.requestId)).state).toBe('claimed');
  });
  it('requires a signed result with the claim nonce and only accepts it once', async () => {
    const request = await createRequest(), token = ticketToken(request);
    const command = await service.claim(request.requestId, proof(request.requestId, token));
    expect(command.entryId).toBe('00'); expect(command.mailboxEmail).toBe(account.email); expect(command).not.toHaveProperty('access_token');
    const signed = proof(request.requestId, token, 'result', 'opened', command.claimNonce);
    await service.result(request.requestId, signed, 'opened', command.claimNonce);
    expect((await service.status(owner, request.requestId)).state).toBe('opened');
    await expect(service.result(request.requestId, signed, 'opened', command.claimNonce)).rejects.toThrow();
  });
  it('rejects a valid signature with a wrong capability or result nonce', async () => {
    const request = await createRequest(), token = ticketToken(request);
    await expect(service.claim(request.requestId, proof(request.requestId, nonce()))).rejects.toThrow();
    const command = await service.claim(request.requestId, proof(request.requestId, token));
    const wrong = nonce(); await expect(service.result(request.requestId, proof(request.requestId, token, 'result', 'opened', wrong), 'opened', wrong)).rejects.toThrow();
    expect((await service.status(owner, request.requestId)).state).toBe('claimed'); expect(command.claimNonce).not.toBe(wrong);
  });
  it('rejects a signature from another private key before consuming a valid request', async () => {
    const request = await createRequest(); const signed = proof(request.requestId, ticketToken(request));
    const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
    signed.signature = sign('RSA-SHA256', Buffer.from(classicProofText('claim', request.requestId, signed)), otherKey.privateKey).toString('base64url');
    await expect(service.claim(request.requestId, signed)).rejects.toThrow();
    expect((await service.status(owner, request.requestId)).state).toBe('pending');
  });
  it('rejects an expired ticket without returning message references', async () => {
    const request = await createRequest(), token = ticketToken(request);
    await pool.query("UPDATE crm_outlook_requests SET created_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute' WHERE id=$1", [request.requestId]);
    await expect(service.claim(request.requestId, proof(request.requestId, token))).rejects.toThrow();
    expect((await service.status(owner, request.requestId)).state).toBe('expired');
  });
  it('honors device revocation before redemption', async () => {
    const request = await createRequest(); await service.revoke(owner, pairing.pairingId);
    await expect(service.claim(request.requestId, proof(request.requestId, ticketToken(request)))).rejects.toThrow();
  });
  it('honors permission revocation before redemption', async () => {
    const request = await createRequest(); access.actor.mockRejectedValueOnce(new Error('revoked'));
    await expect(service.claim(request.requestId, proof(request.requestId, ticketToken(request)))).rejects.toThrow('revoked');
  });
  it('fails closed if the activity identity changes after issuing the request', async () => {
    const request = await createRequest(); activity.exchange_immutable_id = 'Other';
    await expect(service.claim(request.requestId, proof(request.requestId, ticketToken(request)))).rejects.toThrow();
    expect((await service.status(owner, request.requestId)).state).toBe('failed');
  });
  it('stores each reply action and only releases it to a compatible signed component',async()=>{
    service=new OutlookClassicService(db,new ConfigService({AZURE_TENANT_ID:tenant}),{enabledFor:async()=>true} as any,access,emails,{getValidAccessToken:async()=>`h.${Buffer.from(JSON.stringify({tid:tenant})).toString('base64url')}.s`} as any);
    const before=await service.create(owner,activityId,pairing.pairingId,undefined,'reply_all');expect(before.status).toBe('device_required');
    await pool.query("UPDATE crm_outlook_devices SET helper_version='1.1.0'");
    for(const action of ['reply','reply_all'] as const){
      const ticket:any=await service.create(owner,activityId,pairing.pairingId,undefined,action);expect(ticket.status).toBe('ready');
      const capability=ticketToken(ticket);
      await expect(service.claim(ticket.requestId,proof(ticket.requestId,capability))).rejects.toThrow();
      const command=await service.claim(ticket.requestId,proof(ticket.requestId,capability,'claim','','','1.1.0'));
      expect(command.action).toBe(action);
    }
  });

});

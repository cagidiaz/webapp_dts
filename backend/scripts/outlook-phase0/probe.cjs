// Read-only diagnostic by default. --refresh-token explicitly reuses the app's OAuth refresh.
// Never writes messages or BC data, downloads bodies, or prints tokens.
require('ts-node/register');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { OutlookIdentityProbe, OutlookProbeError } = require('../../src/modules/exchange-sync/outlook-identity-probe');

async function main() {
  const args = process.argv.slice(2);
  const get = flag => { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1]; };
  if (args.includes('--help')) {
    console.log('Desde backend: node scripts/outlook-phase0/probe.cjs --account correo --env-file ruta [--baseline informe.json] [--refresh-token] [--duplicate-subjects]');
    console.log('Lee una referencia técnica y genera un informe local sin cuerpos ni tokens. --baseline verifica el mismo mensaje después de moverlo manualmente.');
    return;
  }
  const account = get('--account');
  if (!account || !/^[^\s@]+@[^\s@]+$/.test(account)) throw new OutlookProbeError('EXPLICIT_ACCOUNT_REQUIRED');
  const root = path.resolve(__dirname, '../../..');
  const envFile = get('--env-file') || path.resolve(__dirname, '../../.env');
  const config = fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile)) : {};
  const connectionString = process.env.DATABASE_URL || config.DATABASE_URL;
  if (!connectionString) throw new OutlookProbeError('DATABASE_CONFIGURATION_REQUIRED');
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000, statement_timeout: 10000 });
  // Supabase may close an idle pooled connection. Never let an EventEmitter print
  // its raw connection object; active query failures are caught and sanitized below.
  pool.on('error', () => {});
  let saved;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      const rows = await client.query(`SELECT a.user_id, a.email, a.microsoft_user_id, a.access_token, a.token_expires_at
        FROM public.user_exchange_accounts a JOIN public.profiles p ON p.id=a.user_id
        WHERE lower(a.email)=lower($1) AND lower(p.email)=lower($1) AND p.is_active=true`, [account]);
      if (rows.rowCount !== 1) throw new OutlookProbeError('CONNECTED_ACCOUNT_NOT_FOUND');
      saved = rows.rows[0];
      await client.query('ROLLBACK');
    } finally { client.release(); }
  } finally { await pool.end(); }
  if (!saved.microsoft_user_id) throw new OutlookProbeError('MICROSOFT_MAILBOX_ID_MISSING');
  const expired = !Number.isFinite(new Date(saved.token_expires_at).getTime()) || new Date(saved.token_expires_at).getTime() < Date.now() + 60000;
  if (expired && args.includes('--refresh-token')) {
    // Only the existing OAuth-account row may be updated by the normal refresh mechanism.
    // Using the application's implementation preserves refresh-token rotation and consent handling.
    require('reflect-metadata');
    const { ConfigService } = require('@nestjs/config');
    const { Logger } = require('@nestjs/common');
    const { PrismaService } = require('../../src/prisma/prisma.service');
    const { MicrosoftGraphService } = require('../../src/modules/exchange-sync/microsoft-graph.service');
    process.env.DATABASE_URL = connectionString;
    Logger.overrideLogger(false);
    const prisma = new PrismaService();
    try {
      saved.access_token = await new MicrosoftGraphService(new ConfigService(config), prisma).getValidAccessToken(saved.user_id);
    } finally { await prisma.onModuleDestroy(); }
  } else if (expired) throw new OutlookProbeError('RECONNECT_MICROSOFT_365_IN_APP');
  if (!saved.access_token || ['AUTH_REQUIRED', 'CONSENT_REQUIRED'].includes(saved.access_token)) throw new OutlookProbeError('RECONNECT_MICROSOFT_365_IN_APP');

  const probe = new OutlookIdentityProbe(saved.access_token);
  const mailbox = await probe.verifyMailbox(saved.microsoft_user_id, account);
  const baselinePath = get('--baseline');
  const baseline = baselinePath ? JSON.parse(fs.readFileSync(baselinePath, 'utf8').replace(/^\uFEFF/, '')) : null;
  if (baseline && (baseline.mailbox?.id !== mailbox.id || baseline.mailbox?.email?.toLowerCase() !== account.toLowerCase())) throw new OutlookProbeError('BASELINE_MAILBOX_MISMATCH');
  // Only select a fresh reference in the initial run; subsequent runs MUST resolve the baseline.
  const input = baseline ? baseline.message.immutableId : await probe.recentReference();
  const message = await probe.resolve(input, 'restImmutableEntryId');
  const ewsId = await probe.translate(message.immutableId, 'restImmutableEntryId', 'ewsId');
  const fromEws = await probe.resolve(ewsId, 'ewsId');
  const restId = await probe.translate(message.immutableId, 'restImmutableEntryId', 'restId');
  const fromRest = await probe.resolve(restId, 'restId');
  if ([fromEws, fromRest].some(value => value.immutableId !== message.immutableId || value.internetMessageId !== message.internetMessageId)) throw new OutlookProbeError('ROUNDTRIP_MESSAGE_MISMATCH');
  if (baseline && (baseline.message.immutableId !== message.immutableId || baseline.message.internetMessageId !== message.internetMessageId)) throw new OutlookProbeError('BASELINE_MESSAGE_MISMATCH');
  let duplicateSubjects = null;
  if (args.includes('--duplicate-subjects')) {
    const references = await probe.duplicateSubjectReferences();
    if (references.length === 2) {
      const first = await probe.resolve(references[0], 'restImmutableEntryId');
      const second = await probe.resolve(references[1], 'restImmutableEntryId');
      if (first.immutableId === second.immutableId || first.internetMessageId === second.internetMessageId || first.mapiEntryId === second.mapiEntryId) throw new OutlookProbeError('DUPLICATE_SUBJECT_COMPARISON_FAILED');
      duplicateSubjects = { pairFound: true, differentMessagesVerified: true, messages: [first, second] };
    } else duplicateSubjects = { pairFound: false, differentMessagesVerified: false };
  }
  const report = {
    schemaVersion: 1, stage: 'phase0', mailbox, message, duplicateSubjects,
    checks: { ewsRoundtrip: true, restRoundtrip: true, mapiBinaryConversion: true,
      folderChanged: baseline ? baseline.message.parentFolderId !== message.parentFolderId : null,
      classicOpened: false, webOpened: false },
  };
  const folder = path.join(root, 'frontend/scratch/outlook-phase0');
  fs.mkdirSync(folder, { recursive: true });
  const reportFile = path.join(folder, `probe-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ result: 'GRAPH_REFERENCE_VERIFIED', account, reportFile, checks: report.checks,
    duplicateSubjectCheck: duplicateSubjects ? { pairFound: duplicateSubjects.pairFound, differentMessagesVerified: duplicateSubjects.differentMessagesVerified } : null }));
}

main().catch(error => {
  // Never print raw pg/fetch errors, request headers, URLs containing IDs or OAuth responses.
  console.error(JSON.stringify({ result: 'FAILED', code: error instanceof OutlookProbeError ? error.code : 'PROBE_FAILED', httpStatus: error instanceof OutlookProbeError ? error.httpStatus : undefined }));
  process.exitCode = 1;
});

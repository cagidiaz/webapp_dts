const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');
const helperModule = { exports: {} };
new Function('module', fs.readFileSync(path.join(__dirname, '../public/email-attachment-metadata.js'), 'utf8'))(helperModule);
const { capture, snapshot, sameItem } = helperModule.exports;

async function main() {
  const files = [{ name: 'firma.png', isInline: true }, { name: 'logo.png', isInline: false, size: 10, contentBytes: 'private' }, { name: 'logo.png' }];
  assert.deepEqual((await capture({ attachments: files })).files, [{ name: 'logo.png', size: 10 }, { name: 'logo.png' }]);
  assert.equal((await capture({ attachments: [] })).status, 'complete');
  assert.equal((await capture({})).status, 'unavailable');
  assert.equal((await capture({ getAttachmentsAsync: callback => callback({ status: 'failed' }) })).status, 'unavailable');
  assert.equal((await capture({ getAttachmentsAsync: callback => callback({ status: 'succeeded', value: files }) })).files.length, 2);
  assert.equal((await capture({ getAttachmentsAsync: () => { throw new Error('Unsupported'); } })).status, 'unavailable');
  assert.equal((await capture({ getAttachmentsAsync: () => {} })).status, 'unavailable');
  assert.equal(snapshot(Array.from({ length: 101 }, () => ({ name: 'a'.repeat(513) }))).status, 'partial');
  assert.equal(snapshot([{ name: '\x00' }]).status, 'partial');
  const first = { itemId: 'one' };
  assert.equal(sameItem(first, { itemId: 'one' }, 'one'), true);
  assert.equal(sameItem(first, { itemId: 'two' }, 'one'), false);
  assert.equal(sameItem({}, {}, undefined), false);
  let finish;
  const composing = { itemId: 'draft', getAttachmentsAsync: callback => { finish = callback; } };
  const pending = capture(composing);
  const nextItem = { itemId: 'other' };
  finish({ status: 'succeeded', value: files });
  await pending;
  assert.equal(sameItem(composing, nextItem, 'draft'), false);

  // Execute the real static registration handler with an isolated Office/HTTP host.
  const page = fs.readFileSync(path.join(__dirname, '../public/outlook-addin/index.html'), 'utf8');
  const handler = page.slice(page.indexOf('    async function postEmailToCRM('), page.lastIndexOf('  </script>'));
  let request;
  const elementsById = new Map();
  const element = id => { if (!elementsById.has(id)) elementsById.set(id, { classList: { add() {}, remove() {} } }); return elementsById.get(id); };
  const selected = { itemId: 'saved', subject: 'Subject', attachments: files, from: { emailAddress: 'sender@test.invalid' } };
  const office = { context: { mailbox: { item: selected, userProfile: { emailAddress: 'user@test.invalid' } } } };
  const parameters = ['Office', 'window', 'loadedMailItem', 'cleanEmailBody', 'localStorage', 'document', 'fetch', 'API_BASE_URL', 'activeContact', 'emailSubject', 'emailDateTime', 'emailSenderAddress', 'handleLogout'];
  const makeHandler = new Function(...parameters, handler + '\nreturn postEmailToCRM;');
  const save = makeHandler(office, { DtsEmailAttachments: helperModule.exports }, selected, x => x, { getItem: () => 'isolated-token' }, { getElementById: element }, async (url, options) => { request = { url, payload: JSON.parse(options.body) }; return { ok: true }; }, '/api', { client_id: 'client', id: 'contact' }, 'Subject', '2026-10-16T12:00:00Z', 'sender@test.invalid', () => {});
  await save('Body', selected, 'saved');
  assert.equal(request.url, '/api/outlook-addin/log-email');
  assert.equal(request.payload.exchangeItemId, 'saved');
  assert.equal(request.payload.emailAttachments.files.length, 2);
  request = undefined;
  office.context.mailbox.item = nextItem;
  await save('Body', selected, 'saved');
  assert.equal(request, undefined);
  assert.ok(element('statusMessage').innerText.includes('Ha cambiado el correo'));
  const unsaved = { subject: {}, attachments: files };
  office.context.mailbox.item = unsaved;
  const saveCompose = makeHandler(office, { DtsEmailAttachments: helperModule.exports }, unsaved, x => x, { getItem: () => 'isolated-token' }, { getElementById: element }, async (url, options) => { request = { url, payload: JSON.parse(options.body) }; return { ok: true }; }, '/api', { client_id: 'client', id: 'contact' }, 'Subject', '2026-10-16T12:00:00Z', 'sender@test.invalid', () => {});
  await saveCompose('Body', unsaved, undefined);
  assert.equal(request.url, '/api/crm-activities');
  assert.equal(request.payload.emailAttachments.files.length, 2);

  const source = fs.readFileSync(path.join(__dirname, '../src/pages/crm/components/EmailAttachments.tsx'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  let expanded = false;
  const loaded = {};
  const customRequire = name => name === 'react' ? { useState: () => [expanded, value => { expanded = value; }] } : require(name);
  new Function('require', 'exports', output)(customRequire, loaded);
  const component = value => loaded.EmailAttachments({ value });
  assert.equal(component(undefined), null);
  assert.equal(component({ version: 1, status: 'complete', files: [] }), null);
  for (const [status, label] of [['pending', 'Pendientes'], ['unavailable', 'Información no disponible'], ['partial', 'Lista parcial']]) {
    assert.ok(renderToStaticMarkup(component({ version: 1, status, files: [], totalKnown: null })).includes(label));
  }
  const value = { version: 1, status: 'complete', files: [{ name: '<img src=x onerror=alert(1)>' }, { name: 'dos.pdf' }, { name: 'tres.pdf' }, { name: 'cuatro.pdf' }], totalKnown: 4 };
  const tree = component(value);
  const html = renderToStaticMarkup(tree);
  assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<img'));
  assert.ok(html.includes('+1 más')); assert.ok(!html.includes('cuatro.pdf'));
  assert.ok(html.includes('dark:bg-gray-800')); assert.ok(!html.includes('<a '));
  function nodes(node) { return !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]; }
  let stopped = false;
  nodes(tree).find(node => node.type === 'button').props.onClick({ stopPropagation: () => { stopped = true; } });
  assert.equal(stopped, true); assert.equal(expanded, true);
  const shown = renderToStaticMarkup(component(value));
  assert.ok(shown.includes('cuatro.pdf')); assert.ok(shown.includes('Mostrar menos')); assert.ok(shown.includes('break-all'));
  console.log('PASS: Office read/compose/error/timeout/selection, inline filtering, limits, safe rendering, expansion and dark mode.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

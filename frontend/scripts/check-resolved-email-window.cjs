const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/resolvedEmailWindow.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exportsForTest = {};
new Function('exports', output)(exportsForTest);
const { resolvedEmailWindow } = exportsForTest;
function popup() {
  const navigations = [];
  return { opener: 'original-opener', closed: false, document: { title: '', body: { textContent: '' } }, location: { replace: url => navigations.push(url) }, close() { this.closed = true; }, navigations };
}
async function main() {
  let called = false;
  global.window = { open: () => null };
  assert.equal((await resolvedEmailWindow(async () => { called = true; })).status, 'popup_blocked');
  assert.equal(called, false);
  let target = popup();
  global.window.open = () => target;
  const correct = { status: 'resolved', message: 'Verified', webLink: 'https://outlook.office.com/mail/item/current' };
  assert.equal((await resolvedEmailWindow(async () => { assert.equal(target.opener, null); return correct; })).status, 'resolved');
  assert.deepEqual(target.navigations, [correct.webLink]);
  for (const link of ['https://evil.invalid/mail', 'http://outlook.office.com/mail', 'https://user@outlook.office.com/mail', 'https://outlook.office.com.evil.invalid', 'javascript:alert(1)']) {
    target = popup();
    assert.equal((await resolvedEmailWindow(async () => ({ ...correct, webLink: link }))).status, 'error');
    assert.equal(target.closed, true); assert.equal(target.navigations.length, 0);
  }
  target = popup();
  assert.equal((await resolvedEmailWindow(async () => ({ status: 'resolved', message: 'Invalid missing link' }))).status, 'error');
  assert.equal(target.closed, true); assert.equal(target.navigations.length, 0);
  target = popup();
  assert.equal((await resolvedEmailWindow(async () => ({ status: 'ambiguous', message: 'Choose' }))).status, 'ambiguous');
  assert.equal(target.closed, true); assert.equal(target.navigations.length, 0);
  target = popup();
  assert.equal((await resolvedEmailWindow(async () => { throw new Error('offline'); })).status, 'error');
  assert.equal(target.closed, true);
  const first = popup(), second = popup(); let index = 0;
  global.window.open = () => [first, second][index++];
  await Promise.all([
    resolvedEmailWindow(async () => ({ ...correct, webLink: 'https://outlook.office.com/mail/item/one' })),
    resolvedEmailWindow(async () => ({ ...correct, webLink: 'https://outlook.office.com/mail/item/two' })),
  ]);
  assert.deepEqual(first.navigations, ['https://outlook.office.com/mail/item/one']);
  assert.deepEqual(second.navigations, ['https://outlook.office.com/mail/item/two']);
  console.log('PASS: popup blocking, opener isolation, exact HTTPS targets, ambiguous/error cleanup and independent concurrent opens.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/api/outlookClassic.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exportsForTest = {};
let receivedState = 'opened', invocations = 0, polls = 0;
const api = { get: async () => { polls++; return { data: { state: receivedState } }; } };
new Function('require', 'exports', output)(name => {
  if (name === './apiClient') return { default: api };
  throw new Error('Unexpected runtime import');
}, exportsForTest);
global.document = { createElement: () => ({ href: '', click() { invocations++; }, remove() {} }), body: { appendChild() {} } };
async function main() {
  const requestId = '00000000-0000-4000-8000-000000000001';
  const request = { status: 'ready', requestId, protocolUri: `dts-outlook://v1/open?request=${requestId}&token=${'a'.repeat(43)}`, expiresInSeconds: 90 };
  assert.equal((await exportsForTest.launchClassicAndWait(request)).state, 'opened');
  assert.equal(invocations, 1); assert.equal(polls, 1);
  receivedState = 'failed';
  assert.equal((await exportsForTest.launchClassicAndWait(request)).state, 'failed');
  assert.equal(invocations, 2);
  for (const protocolUri of ['dts-mail://open?subject=x', request.protocolUri + '&subject=x', 'https://evil.invalid', request.protocolUri.replace(requestId, '00000000-0000-4000-8000-000000000002')]) {
    await assert.rejects(exportsForTest.launchClassicAndWait({ ...request, protocolUri }));
  }
  assert.equal(invocations, 2); assert.equal(polls, 2);
  const realNow = Date.now; let calls = 0;
  try {
    Date.now = () => calls++ ? 50000 : 1000;
    assert.equal((await exportsForTest.launchClassicAndWait(request)).state, 'unconfirmed');
  } finally { Date.now = realNow; }
  assert.equal(invocations, 3); assert.equal(polls, 2);
  console.log('PASS: Classic protocol invoked once, opaque matching request, no subject fallback, authenticated outcome required and timeout remains unconfirmed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
